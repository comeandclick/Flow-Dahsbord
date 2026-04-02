import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { getAdminSpec, isAccountBlocked } from "../../../lib/admin";
import {
  createConversation,
  enrichConversation,
  findSearchMatches,
  normalizeConversation,
  pushNotification,
  sanitizeAttachments,
} from "../../../lib/conversations";
import { flushPendingPushNotifications, getAccountsWithPendingPushes } from "../../../lib/push";
import { normalizeDb } from "../../../lib/schema";
import { readStore, withStoreLock, writeStore } from "../../../lib/remote-store";

export const runtime = "nodejs";

function addAccountActivity(account, entry) {
  const db = normalizeDb(account.db, account);
  db.activity = [
    {
      id: crypto.randomUUID(),
      type: `${entry?.type || "conversation"}`.slice(0, 40),
      title: `${entry?.title || "Activité conversation"}`.slice(0, 140),
      detail: `${entry?.detail || ""}`.slice(0, 240),
      createdAt: new Date().toISOString(),
    },
    ...(Array.isArray(db.activity) ? db.activity : []),
  ].slice(0, 120);
  account.db = db;
}

function buildReportResponse(entry, store) {
  const userMap = new Map((Array.isArray(store?.users) ? store.users : []).map((item) => [item.uid, item]));
  const conversation = (Array.isArray(store?.conversations) ? store.conversations : [])
    .map(normalizeConversation)
    .find((item) => item.id === entry?.conversationId);
  const sender = userMap.get(entry?.senderId);
  const resolver = userMap.get(entry?.resolvedBy);

  return {
    id: `${entry?.id || ""}`,
    type: `${entry?.type || "message"}`,
    status: `${entry?.status || "open"}`,
    reason: `${entry?.reason || ""}`,
    details: `${entry?.details || ""}`,
    messagePreview: `${entry?.messagePreview || ""}`,
    createdAt: `${entry?.createdAt || ""}`,
    conversationId: `${entry?.conversationId || ""}`,
    conversationTitle: conversation?.title || (entry?.type === "bug" ? "Interface Flow" : "Conversation"),
    messageId: `${entry?.messageId || ""}`,
    resolutionNote: `${entry?.resolutionNote || ""}`,
    resolvedAt: `${entry?.resolvedAt || ""}`,
    sender: sender
      ? {
          uid: sender.uid,
          name: sender.name,
          email: sender.email,
          username: sender.db?.profile?.username || "",
        }
      : null,
    resolver: resolver
      ? {
          uid: resolver.uid,
          name: resolver.name,
          email: resolver.email,
        }
      : null,
  };
}

function findConversation(store, conversationId) {
  return store.conversations.map(normalizeConversation).find((entry) => entry.id === conversationId);
}

function persistConversation(store, conversation) {
  const index = store.conversations.findIndex((entry) => entry.id === conversation.id);
  if (index >= 0) {
    store.conversations[index] = conversation;
  } else {
    store.conversations.push(conversation);
  }
}

function addSystemMessage(conversation, senderId, body) {
  const createdAt = new Date().toISOString();
  conversation.messages.push({
    id: crypto.randomUUID(),
    type: "system",
    senderId,
    body,
    createdAt,
    editedAt: "",
    deletedAt: "",
    callMode: "",
    attachments: [],
    reactions: {},
  });
  conversation.updatedAt = createdAt;
  conversation.lastMessageAt = createdAt;
}

async function getSessionAccount() {
  const cookieStore = await cookies();
  const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
  if (!session) return { session: null, store: null, account: null };

  const store = await readStore();
  const account = store.users.find((entry) => entry.uid === session.uid);
  if (account && isAccountBlocked(account)) return { session: null, store: null, account: null };
  return { session, store, account };
}

export async function GET(request) {
  try {
    const { session, store, account } = await getSessionAccount();
    if (!session || !store || !account) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(request.url);
    const view = `${url.searchParams.get("view") || ""}`;

    if (view === "reports") {
      const reports = (Array.isArray(store.reports) ? store.reports : [])
        .filter((entry) => entry?.reporterId === session.uid)
        .slice(0, 100)
        .map((entry) => buildReportResponse(entry, store));

      return Response.json({ reports });
    }

    const conversations = store.conversations
      .map(normalizeConversation)
      .filter((conversation) => conversation.participantIds.includes(session.uid))
      .map((conversation) => enrichConversation(conversation, store.users, session.uid))
      .sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

    return Response.json({ conversations });
  } catch (error) {
    return Response.json({ error: error.message || "Chargement impossible" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = `${body?.action || ""}`;

    if (action === "search-users") {
      const store = await readStore();
      const searchAccount = store.users.find((entry) => entry.uid === session.uid);
      if (!searchAccount || isAccountBlocked(searchAccount)) {
        return Response.json({ error: "Compte bloqué" }, { status: 423 });
      }
      return Response.json({ users: findSearchMatches(store.users, session.uid, body?.query) });
    }

    return await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);
      if (!account) {
        return Response.json({ error: "Compte introuvable" }, { status: 404 });
      }
      if (isAccountBlocked(account)) {
        return Response.json({ error: "Compte bloqué" }, { status: 423 });
      }
      account.lastSeenAt = new Date().toISOString();
      const flushPendingPushes = async () => flushPendingPushNotifications(getAccountsWithPendingPushes(store));

      if (action === "create-direct") {
        const participantId = `${body?.participantId || ""}`;
        if (!participantId || participantId === session.uid) {
          return Response.json({ error: "Participant invalide" }, { status: 400 });
        }

        const existing = store.conversations
          .map(normalizeConversation)
          .find((conversation) =>
            conversation.type === "direct"
            && conversation.participantIds.length === 2
            && conversation.participantIds.includes(session.uid)
            && conversation.participantIds.includes(participantId),
          );

        const direct = existing || createConversation({
          type: "direct",
          participantIds: [session.uid, participantId],
          createdBy: session.uid,
        });

        if (!existing) {
          store.conversations.push(direct);
          await writeStore(store);
          await flushPendingPushes();
        }

        return Response.json({
          conversation: enrichConversation(normalizeConversation(direct), store.users, session.uid),
        });
      }

      if (action === "open-support") {
        const adminRecipients = store.users.filter((entry) => {
          if (entry.uid === session.uid) return false;
          return getAdminSpec(entry, store).enabled;
        });

        if (!adminRecipients.length) {
          return Response.json({ error: "Aucun admin disponible pour le support" }, { status: 404 });
        }

        const existing = store.conversations
          .map(normalizeConversation)
          .find((conversation) => conversation.support && conversation.participantIds.includes(session.uid));

        if (existing) {
          return Response.json({
            conversation: enrichConversation(existing, store.users, session.uid),
          });
        }

        const participantIds = [...new Set([session.uid, ...adminRecipients.map((entry) => entry.uid)])];
        const conversation = createConversation({
          type: "group",
          title: `Support Flow · ${account.name}`,
          participantIds,
          createdBy: session.uid,
          support: true,
          supportStatus: "open",
        });

        addSystemMessage(conversation, session.uid, `${account.name} a ouvert une conversation d'aide avec l'equipe Flow.`);
        store.conversations.push(conversation);

        adminRecipients.forEach((recipient) => {
          pushNotification(recipient, {
            type: "support",
            title: `Nouvelle demande d'aide · ${account.name}`,
            detail: "Une nouvelle conversation support attend une reponse admin.",
            href: "conversations",
            entityId: conversation.id,
          });
        });

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({
          conversation: enrichConversation(normalizeConversation(conversation), store.users, session.uid),
        });
      }

      if (action === "create-group") {
      const memberIds = Array.isArray(body?.participantIds) ? body.participantIds.map((item) => `${item}`) : [];
      const participantIds = [...new Set([session.uid, ...memberIds])].slice(0, 20);
      if (participantIds.length < 3) {
        return Response.json({ error: "Un groupe a besoin d'au moins 3 membres" }, { status: 400 });
      }

      const conversation = createConversation({
        type: "group",
        title: `${body?.title || ""}`.trim() || "Nouveau groupe",
        participantIds,
        createdBy: session.uid,
      });
      store.conversations.push(conversation);

      participantIds.forEach((uid) => {
        if (uid === session.uid) return;
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          pushNotification(recipient, {
            type: "message",
            title: `Ajout au groupe ${conversation.title}`,
            detail: `${account.name} vous a ajouté à un nouveau groupe.`,
            href: "conversations",
            entityId: conversation.id,
          });
        }
      });

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({
        conversation: enrichConversation(normalizeConversation(conversation), store.users, session.uid),
      });
    }

      if (action === "send-message") {
      const conversationId = `${body?.conversationId || ""}`;
      const text = `${body?.text || ""}`.trim();
      const messageType = ["text", "call", "system"].includes(body?.messageType) ? body.messageType : "text";
      const callMode = ["audio", "video"].includes(body?.callMode) ? body.callMode : "";
      const attachments = sanitizeAttachments(body?.attachments);
      const conversation = findConversation(store, conversationId);

      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }

      if (!text && !attachments.length && messageType !== "call") {
        return Response.json({ error: "Message vide" }, { status: 400 });
      }

      const message = {
        id: crypto.randomUUID(),
        type: messageType,
        senderId: session.uid,
        body: text,
        createdAt: new Date().toISOString(),
        editedAt: "",
        deletedAt: "",
        callMode,
        attachments,
        reactions: {},
      };

      conversation.messages.push(message);
      conversation.updatedAt = message.createdAt;
      conversation.lastMessageAt = message.createdAt;
      conversation.readState = {
        ...(conversation.readState || {}),
        [session.uid]: message.createdAt,
      };

      persistConversation(store, conversation);

      conversation.participantIds.forEach((uid) => {
        if (uid === session.uid) return;
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          const hasVoiceAttachment = attachments.some((attachment) => attachment.type === "voice");
          const hasFileAttachment = attachments.some((attachment) => ["file", "image"].includes(attachment.type));
          const notificationDetail = messageType === "call"
            ? `${account.name} vous appelle en ${callMode === "video" ? "vidéo" : "audio"}.`
            : text || (hasVoiceAttachment ? "Message vocal" : hasFileAttachment ? "Pièce jointe" : "Message sans texte");
          pushNotification(recipient, {
            type: messageType === "call" ? "call" : "message",
            title: messageType === "call" ? `${account.name} vous appelle` : `${account.name}`,
            detail: notificationDetail,
            href: "conversations",
            entityId: conversation.id,
          });
        }
      });

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({
        conversation: enrichConversation(conversation, store.users, session.uid),
      });
    }

      if (action === "react-message") {
      const conversationId = `${body?.conversationId || ""}`;
      const messageId = `${body?.messageId || ""}`;
      const emoji = `${body?.emoji || ""}`.slice(0, 8);
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }
      const message = conversation.messages.find((entry) => entry.id === messageId);
      if (!message) {
        return Response.json({ error: "Message introuvable" }, { status: 404 });
      }
      const reactions = { ...(message.reactions || {}) };
      if (reactions[session.uid] === emoji) {
        delete reactions[session.uid];
      } else {
        reactions[session.uid] = emoji;
      }
      message.reactions = reactions;
      persistConversation(store, conversation);

      conversation.participantIds.forEach((uid) => {
        if (uid === session.uid) return;
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          pushNotification(recipient, {
            type: "reaction",
            title: `${account.name} a réagi à un message`,
            detail: `Réaction ${emoji || "mise à jour"} dans ${enrichConversation(conversation, store.users, session.uid).title}`,
            href: "conversations",
            entityId: conversation.id,
          });
        }
      });
      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ conversation: enrichConversation(conversation, store.users, session.uid) });
    }

      if (action === "edit-message" || action === "delete-message") {
      const conversationId = `${body?.conversationId || ""}`;
      const messageId = `${body?.messageId || ""}`;
      const nextText = `${body?.text || ""}`.trim();
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }
      const message = conversation.messages.find((entry) => entry.id === messageId);
      if (!message || message.senderId !== session.uid) {
        return Response.json({ error: "Message non modifiable" }, { status: 403 });
      }

      if (action === "delete-message") {
        message.deletedAt = new Date().toISOString();
        message.body = "Le message a été supprimé";
        message.attachments = [];
      } else {
        if (!nextText) return Response.json({ error: "Texte requis" }, { status: 400 });
        message.body = nextText;
        message.editedAt = new Date().toISOString();
      }

      persistConversation(store, conversation);

      conversation.participantIds.forEach((uid) => {
        if (uid === session.uid) return;
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          pushNotification(recipient, {
            type: action === "delete-message" ? "message" : "message",
            title: action === "delete-message" ? `${account.name} a supprimé un message` : `${account.name} a modifié un message`,
            detail: action === "delete-message" ? "Un message a été retiré de la conversation." : nextText,
            href: "conversations",
            entityId: conversation.id,
          });
        }
      });
      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ conversation: enrichConversation(conversation, store.users, session.uid) });
    }

      if (action === "mark-read") {
      const conversationId = `${body?.conversationId || ""}`;
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }
      conversation.readState = {
        ...(conversation.readState || {}),
        [session.uid]: new Date().toISOString(),
      };
      persistConversation(store, conversation);

      account.db = normalizeDb({
        ...account.db,
        notifications: (account.db?.notifications || []).map((item) =>
          item?.entityId === conversation.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item,
        ),
      }, account);

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ ok: true });
    }

      if (action === "update-group") {
      const conversationId = `${body?.conversationId || ""}`;
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }
      if (conversation.type !== "group") {
        return Response.json({ error: "Seuls les groupes sont modifiables ici" }, { status: 400 });
      }
      if (!conversation.adminIds.includes(session.uid)) {
        return Response.json({ error: "Seul un administrateur peut modifier ce groupe" }, { status: 403 });
      }

      const title = `${body?.title || ""}`.trim().slice(0, 160) || "Nouveau groupe";
      const requestedIds = Array.isArray(body?.participantIds) ? body.participantIds.map((item) => `${item}`) : [];
      const participantIds = [...new Set([session.uid, ...requestedIds])]
        .filter((uid) => store.users.some((entry) => entry.uid === uid))
        .slice(0, 20);

      if (participantIds.length < 3) {
        return Response.json({ error: "Un groupe doit contenir au moins 3 membres" }, { status: 400 });
      }

      const previousTitle = conversation.title || "Groupe";
      const previousParticipants = new Set(conversation.participantIds);
      const nextParticipants = new Set(participantIds);
      const addedMembers = participantIds.filter((uid) => !previousParticipants.has(uid));
      const removedMembers = conversation.participantIds.filter((uid) => !nextParticipants.has(uid));

      conversation.title = title;
      conversation.participantIds = participantIds;
      conversation.adminIds = [...new Set([session.uid, ...(conversation.adminIds || []).filter((uid) => participantIds.includes(uid))])];
      addSystemMessage(
        conversation,
        session.uid,
        `Groupe mis à jour par ${account.name}${previousTitle !== title ? ` · nouveau nom: ${title}` : ""}${addedMembers.length ? ` · ${addedMembers.length} membre(s) ajouté(s)` : ""}${removedMembers.length ? ` · ${removedMembers.length} membre(s) retiré(s)` : ""}`,
      );
      persistConversation(store, conversation);

      addedMembers.forEach((uid) => {
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          pushNotification(recipient, {
            type: "message",
            title: `Ajout au groupe ${conversation.title}`,
            detail: `${account.name} vous a ajouté au groupe.`,
            href: "conversations",
            entityId: conversation.id,
          });
        }
      });

      addAccountActivity(account, {
        type: "conversation",
        title: "Groupe modifié",
        detail: `${title}${addedMembers.length ? ` · +${addedMembers.length}` : ""}${removedMembers.length ? ` · -${removedMembers.length}` : ""}`,
      });

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ conversation: enrichConversation(conversation, store.users, session.uid) });
    }

      if (action === "delete-conversation") {
      const conversationId = `${body?.conversationId || ""}`;
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }

      if (conversation.type === "group" && !conversation.adminIds.includes(session.uid)) {
        return Response.json({ error: "Seul un administrateur peut supprimer ce groupe" }, { status: 403 });
      }

      conversation.participantIds.forEach((uid) => {
        if (uid === session.uid) return;
        const recipient = store.users.find((entry) => entry.uid === uid);
        if (recipient) {
          pushNotification(recipient, {
            type: "message",
            title: "Conversation supprimée",
            detail: `${account.name} a supprimé ${conversation.type === "group" ? `le groupe ${conversation.title}` : "la conversation directe"}.`,
            href: "conversations",
            entityId: "",
          });
        }
      });

      store.conversations = store.conversations.filter((entry) => entry.id !== conversation.id);
      addAccountActivity(account, {
        type: "conversation",
        title: conversation.type === "group" ? "Groupe supprimé" : "Conversation supprimée",
        detail: conversation.title || "Conversation",
      });

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ ok: true, deletedConversationId: conversation.id });
    }

      if (action === "report-message") {
      const conversationId = `${body?.conversationId || ""}`;
      const messageId = `${body?.messageId || ""}`;
      const reason = `${body?.reason || ""}`.trim().slice(0, 120) || "Signalement utilisateur";
      const details = `${body?.details || ""}`.trim().slice(0, 500);
      const conversation = findConversation(store, conversationId);
      if (!conversation || !conversation.participantIds.includes(session.uid)) {
        return Response.json({ error: "Conversation introuvable" }, { status: 404 });
      }
      const message = conversation.messages.find((entry) => entry.id === messageId);
      if (!message || message.deletedAt) {
        return Response.json({ error: "Message introuvable" }, { status: 404 });
      }
      if (message.senderId === session.uid) {
        return Response.json({ error: "Impossible de signaler votre propre message" }, { status: 400 });
      }

      store.reports = [
        {
          id: crypto.randomUUID(),
          type: "message",
          conversationId: conversation.id,
          messageId: message.id,
          reporterId: session.uid,
          senderId: message.senderId,
          reason,
          details,
          messagePreview: `${message.body || ""}`.slice(0, 240),
          createdAt: new Date().toISOString(),
          status: "open",
          resolutionNote: "",
          resolvedAt: "",
          resolvedBy: "",
        },
        ...(Array.isArray(store.reports) ? store.reports : []),
      ].slice(0, 500);

      addAccountActivity(account, {
        type: "report",
        title: "Message signalé",
        detail: `${conversation.title || "Conversation"} · ${reason}`,
      });

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ ok: true });
    }

    if (action === "report-issue") {
      const reason = `${body?.reason || ""}`.trim().slice(0, 120) || "Bug signalé";
      const details = `${body?.details || ""}`.trim().slice(0, 1000);

      store.reports = [
        {
          id: crypto.randomUUID(),
          type: "bug",
          conversationId: "",
          messageId: "",
          reporterId: session.uid,
          senderId: "",
          reason,
          details,
          messagePreview: details.slice(0, 240),
          createdAt: new Date().toISOString(),
          status: "open",
          resolutionNote: "",
          resolvedAt: "",
          resolvedBy: "",
        },
        ...(Array.isArray(store.reports) ? store.reports : []),
      ].slice(0, 500);

      addAccountActivity(account, {
        type: "report",
        title: "Bug signalé",
        detail: details || reason,
      });

      await writeStore(store);
      return Response.json({ ok: true });
    }

      return Response.json({ error: "Action inconnue" }, { status: 400 });
    });
  } catch (error) {
    return Response.json({ error: error.message || "Action impossible" }, { status: 500 });
  }
}
