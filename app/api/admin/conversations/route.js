import { getRequestContext } from "../../../../lib/admin";
import { normalizeConversation, enrichConversation } from "../../../../lib/conversations";
import { writeStore } from "../../../../lib/remote-store";

export const runtime = "nodejs";

function findConversation(store, conversationId) {
  return (Array.isArray(store.conversations) ? store.conversations : [])
    .map(normalizeConversation)
    .find((entry) => entry.id === conversationId);
}

export async function GET() {
  try {
    const { account, store } = await getRequestContext({ requireAdmin: true, requirePermission: "dashboard.read" });
    const conversations = (Array.isArray(store.conversations) ? store.conversations : [])
      .map(normalizeConversation)
      .filter((conversation) => conversation.support || conversation.participantIds.includes(account.uid))
      .map((conversation) => enrichConversation(conversation, store.users, account.uid))
      .sort((a, b) => `${b.lastMessageAt || ""}`.localeCompare(`${a.lastMessageAt || ""}`))
      .slice(0, 80);

    return Response.json({ conversations });
  } catch (error) {
    return Response.json({ error: error.message || "Chargement conversations admin impossible" }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = `${body?.action || ""}`;
    const { account, store } = await getRequestContext({ requireAdmin: true, requirePermission: "messages.send" });
    const conversationId = `${body?.conversationId || ""}`;
    const conversation = findConversation(store, conversationId);

    if (!conversation) {
      return Response.json({ error: "Conversation introuvable" }, { status: 404 });
    }
    if (!conversation.participantIds.includes(account.uid)) {
      return Response.json({ error: "Acces refuse" }, { status: 403 });
    }

    if (action === "send-message") {
      const text = `${body?.text || ""}`.trim().slice(0, 8000);
      if (!text) {
        return Response.json({ error: "Message vide" }, { status: 400 });
      }

      const now = new Date().toISOString();
      conversation.messages.push({
        id: crypto.randomUUID(),
        type: "text",
        senderId: account.uid,
        body: text,
        createdAt: now,
        editedAt: "",
        deletedAt: "",
        callMode: "",
        attachments: [],
        reactions: {},
      });
      conversation.updatedAt = now;
      conversation.lastMessageAt = now;
      conversation.readState = {
        ...(conversation.readState || {}),
        [account.uid]: now,
      };

      const index = store.conversations.findIndex((entry) => `${entry?.id || ""}` === conversation.id);
      if (index >= 0) store.conversations[index] = conversation;
      await writeStore(store);
      return Response.json({ conversation: enrichConversation(conversation, store.users, account.uid) });
    }

    if (action === "mark-read") {
      const now = new Date().toISOString();
      conversation.readState = {
        ...(conversation.readState || {}),
        [account.uid]: now,
      };
      const index = store.conversations.findIndex((entry) => `${entry?.id || ""}` === conversation.id);
      if (index >= 0) store.conversations[index] = conversation;
      await writeStore(store);
      return Response.json({ ok: true });
    }

    if (action === "toggle-support-status") {
      conversation.supportStatus = conversation.supportStatus === "closed" ? "open" : "closed";
      conversation.updatedAt = new Date().toISOString();
      const index = store.conversations.findIndex((entry) => `${entry?.id || ""}` === conversation.id);
      if (index >= 0) store.conversations[index] = conversation;
      await writeStore(store);
      return Response.json({ conversation: enrichConversation(conversation, store.users, account.uid) });
    }

    return Response.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || "Action conversation admin impossible" }, { status: error.status || 500 });
  }
}
