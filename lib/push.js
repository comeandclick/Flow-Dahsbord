import webpush from "web-push";

const FLOW_PUSH_PUBLIC_KEY = `${process.env.FLOW_PUSH_PUBLIC_KEY || ""}`.trim();
const FLOW_PUSH_PRIVATE_KEY = `${process.env.FLOW_PUSH_PRIVATE_KEY || ""}`.trim();
const FLOW_PUSH_CONTACT = `${process.env.FLOW_PUSH_CONTACT || "mailto:flow@local.app"}`.trim();

let vapidConfigured = false;

export function isPushConfigured() {
  return Boolean(FLOW_PUSH_PUBLIC_KEY && FLOW_PUSH_PRIVATE_KEY);
}

export function getPublicPushKey() {
  return FLOW_PUSH_PUBLIC_KEY;
}

function ensureVapidConfig() {
  if (vapidConfigured || !isPushConfigured()) return;
  webpush.setVapidDetails(FLOW_PUSH_CONTACT, FLOW_PUSH_PUBLIC_KEY, FLOW_PUSH_PRIVATE_KEY);
  vapidConfigured = true;
}

function clampText(value, max = 4000) {
  return `${value || ""}`.slice(0, max);
}

export function sanitizePushSubscription(input) {
  if (!input || typeof input !== "object") return null;
  const endpoint = clampText(input.endpoint, 2000);
  const auth = clampText(input.keys?.auth, 400);
  const p256dh = clampText(input.keys?.p256dh, 400);
  if (!endpoint || !auth || !p256dh) return null;

  return {
    endpoint,
    expirationTime: Number.isFinite(Number(input.expirationTime)) ? Number(input.expirationTime) : null,
    keys: { auth, p256dh },
  };
}

export function upsertPushSubscription(account, input, meta = {}) {
  const subscription = sanitizePushSubscription(input);
  if (!subscription) return false;

  const existing = Array.isArray(account.pushSubscriptions) ? account.pushSubscriptions : [];
  const next = {
    ...subscription,
    userAgent: clampText(meta.userAgent, 240),
    platform: clampText(meta.platform, 120),
    createdAt: new Date().toISOString(),
  };

  const index = existing.findIndex((entry) => `${entry?.endpoint || ""}` === subscription.endpoint);
  if (index >= 0) {
    existing[index] = { ...existing[index], ...next };
  } else {
    existing.unshift(next);
  }

  account.pushSubscriptions = existing.slice(0, 8);
  account.__pendingPushes = [];
  return true;
}

export function removePushSubscription(account, endpoint) {
  if (!endpoint) return;
  account.pushSubscriptions = (Array.isArray(account.pushSubscriptions) ? account.pushSubscriptions : [])
    .filter((entry) => `${entry?.endpoint || ""}` !== `${endpoint}`);
}

export function queuePushNotification(account, payload = {}) {
  const title = clampText(payload.title, 160);
  if (!title) return;

  account.__pendingPushes = [{
    title,
    body: clampText(payload.body || payload.detail, 240) || "Nouvelle activité sur Flow",
    url: clampText(payload.url, 400) || "/",
    tag: clampText(payload.tag, 120) || "flow-update",
    kind: clampText(payload.kind || payload.type, 40) || "generic",
  }];
}

export function getAccountsWithPendingPushes(store) {
  return (Array.isArray(store?.users) ? store.users : [])
    .filter((account) => Array.isArray(account?.__pendingPushes) && account.__pendingPushes.length && Array.isArray(account?.pushSubscriptions) && account.pushSubscriptions.length);
}

export async function flushPendingPushNotifications(accounts = []) {
  if (!accounts.length || !isPushConfigured()) return;
  ensureVapidConfig();

  await Promise.all(accounts.flatMap((account) => {
    const pushes = Array.isArray(account.__pendingPushes) ? account.__pendingPushes : [];
    const subscriptions = (Array.isArray(account.pushSubscriptions) ? account.pushSubscriptions : [])
      .map(sanitizePushSubscription)
      .filter(Boolean);

    account.__pendingPushes = [];
    if (!pushes.length || !subscriptions.length) return [];

    return subscriptions.flatMap((subscription) => pushes.map(async (payload) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url,
          tag: payload.tag,
          kind: payload.kind,
        }));
      } catch {}
    }));
  }));
}
