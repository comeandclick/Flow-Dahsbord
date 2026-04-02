import { normalizeDb } from "./schema";
import { queuePushNotification } from "./push";

function clampText(value, max = 4000) {
  return `${value || ""}`.slice(0, max);
}

function normalizePhone(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  return raw.startsWith("+")
    ? `+${raw.slice(1).replace(/\D/g, "")}`
    : raw.replace(/\D/g, "");
}

export function sanitizeAttachments(input) {
  return Array.isArray(input)
    ? input.slice(0, 4).map((item) => {
        const type = clampText(item?.type, 40);
        const maxUrlLength = /^data:/i.test(`${item?.url || ""}`) || ["file", "image", "voice"].includes(type) ? 360000 : 6000;
        return {
          id: clampText(item?.id, 80),
          name: clampText(item?.name, 140),
          type,
          url: clampText(item?.url, maxUrlLength),
        };
      })
    : [];
}

export function createConversation({
  type = "direct",
  title = "",
  participantIds = [],
  createdBy = "",
  support = false,
  supportStatus = "open",
}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type,
    title: clampText(title, 160),
    participantIds: [...new Set(participantIds)].slice(0, 20),
    adminIds: type === "group" ? [createdBy] : [],
    createdBy,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messages: [],
    readState: {},
    support: Boolean(support),
    supportStatus: ["open", "closed"].includes(supportStatus) ? supportStatus : "open",
  };
}

export function normalizeConversation(input) {
  const now = new Date().toISOString();
  const conversation = input && typeof input === "object" ? input : {};
  const messages = Array.isArray(conversation.messages) ? conversation.messages.slice(-200) : [];

  return {
    id: clampText(conversation.id, 80),
    type: ["direct", "group"].includes(conversation.type) ? conversation.type : "direct",
    title: clampText(conversation.title, 160),
    participantIds: Array.isArray(conversation.participantIds)
      ? [...new Set(conversation.participantIds.map((item) => clampText(item, 80)).filter(Boolean))].slice(0, 20)
      : [],
    adminIds: Array.isArray(conversation.adminIds)
      ? [...new Set(conversation.adminIds.map((item) => clampText(item, 80)).filter(Boolean))].slice(0, 20)
      : [],
    createdBy: clampText(conversation.createdBy, 80),
    createdAt: clampText(conversation.createdAt || now, 40),
    updatedAt: clampText(conversation.updatedAt || now, 40),
    lastMessageAt: clampText(conversation.lastMessageAt || conversation.updatedAt || now, 40),
    readState: conversation.readState && typeof conversation.readState === "object" ? conversation.readState : {},
    support: Boolean(conversation.support),
    supportStatus: ["open", "closed"].includes(conversation.supportStatus) ? conversation.supportStatus : "open",
    messages: messages.map((message) => ({
      id: clampText(message?.id, 80),
      type: ["text", "call", "system"].includes(message?.type) ? message.type : "text",
      senderId: clampText(message?.senderId, 80),
      body: clampText(message?.body, 8000),
      createdAt: clampText(message?.createdAt || now, 40),
      editedAt: clampText(message?.editedAt, 40),
      deletedAt: clampText(message?.deletedAt, 40),
      callMode: ["audio", "video"].includes(message?.callMode) ? message.callMode : "",
      attachments: sanitizeAttachments(message?.attachments),
      reactions: message?.reactions && typeof message.reactions === "object" ? message.reactions : {},
    })),
  };
}

export function enrichConversation(conversation, users, currentUserId) {
  const userMap = new Map(users.map((entry) => [entry.uid, entry]));
  const participants = conversation.participantIds
    .map((uid) => userMap.get(uid))
    .filter(Boolean)
    .map((entry) => ({
      uid: entry.uid,
      name: entry.name,
      email: entry.email,
      username: entry.db?.profile?.username || "",
      phone: entry.db?.profile?.phoneVisible ? entry.db?.profile?.phone || "" : "",
      photoUrl: entry.db?.profile?.photoUrl || "",
    }));

  const messages = conversation.messages.map((message) => {
    const sender = userMap.get(message.senderId);
    return {
      ...message,
      sender: sender
        ? {
            uid: sender.uid,
            name: sender.name,
            email: sender.email,
            username: sender.db?.profile?.username || "",
            photoUrl: sender.db?.profile?.photoUrl || "",
          }
        : null,
    };
  });

  const title = conversation.type === "group"
    ? conversation.title || "Groupe"
    : participants.filter((item) => item.uid !== currentUserId).map((item) => item.name).join(", ") || "Conversation";

  const lastMessage = messages[messages.length - 1] || null;
  const unreadCount = messages.filter((message) => {
    const lastReadAt = conversation.readState?.[currentUserId];
    return message.senderId !== currentUserId && !message.deletedAt && (!lastReadAt || message.createdAt > lastReadAt);
  }).length;

  return {
    ...conversation,
    title,
    participants,
    messages,
    lastMessage,
    unreadCount,
  };
}

export function findSearchMatches(users, currentUserId, query) {
  const needle = `${query || ""}`.trim().toLowerCase();
  const normalizedNeedlePhone = normalizePhone(query);
  if (!needle) return [];

  return users
    .filter((entry) => entry.uid !== currentUserId)
    .map((entry) => ({
      uid: entry.uid,
      name: entry.name,
      email: entry.email,
      username: entry.db?.profile?.username || "",
      phone: entry.db?.profile?.phoneVisible ? entry.db?.profile?.phone || "" : "",
      photoUrl: entry.db?.profile?.photoUrl || "",
    }))
    .filter((entry) => {
      const textMatch = [entry.name, entry.email, entry.username, entry.phone].some((field) => `${field || ""}`.toLowerCase().includes(needle));
      const phoneMatch = normalizedNeedlePhone && normalizePhone(entry.phone).includes(normalizedNeedlePhone);
      return textMatch || phoneMatch;
    })
    .slice(0, 12);
}

export function pushNotification(account, notification) {
  const db = normalizeDb(account.db, account);
  db.notifications = [
    {
      id: crypto.randomUUID(),
      type: clampText(notification?.type, 40),
      title: clampText(notification?.title, 160),
      detail: clampText(notification?.detail, 240),
      createdAt: new Date().toISOString(),
      readAt: "",
      href: clampText(notification?.href, 80),
      entityId: clampText(notification?.entityId, 80),
    },
    ...db.notifications,
  ].slice(0, 120);
  account.db = db;
  queuePushNotification(account, {
    title: clampText(notification?.title, 160),
    detail: clampText(notification?.detail, 240),
    url: notification?.href ? `/?open=${notification.href}` : "/",
    tag: `flow-${clampText(notification?.type, 40) || "update"}`,
    kind: clampText(notification?.type, 40) || "generic",
  });
}
