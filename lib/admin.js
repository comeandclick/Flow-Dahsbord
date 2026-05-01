import { cookies } from "next/headers";
import { readSessionCookieValue } from "./auth";
import { normalizeDb } from "./schema";
import { readStore } from "./remote-store";
import { queuePushNotification } from "./push";

export const ADMIN_SESSION_COOKIE_NAME = "flow_admin_session";

export const ADMIN_PERMISSION_KEYS = [
  "dashboard.read",
  "users.read",
  "users.manage",
  "messages.send",
  "accounts.block",
  "accounts.reset_password",
  "accounts.delete",
  "admins.read",
  "admins.create",
  "admins.manage",
  "email.send",
  "exports.csv",
];

export const FULL_ADMIN_PERMISSIONS = [...ADMIN_PERMISSION_KEYS];

function parseAdminEmails() {
  return new Set(
    `${process.env.FLOW_ADMIN_EMAILS || process.env.FLOW_ADMIN_EMAIL || ""}`
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getEarliestAccount(store) {
  return [...(Array.isArray(store?.users) ? store.users : [])]
    .filter((entry) => entry?.uid)
    .sort((a, b) => `${a?.createdAt || ""}`.localeCompare(`${b?.createdAt || ""}`))[0] || null;
}

function hasExplicitAdminOwner(store) {
  const configured = parseAdminEmails();
  return (Array.isArray(store?.users) ? store.users : []).some((entry) => {
    const explicit = entry?.admin && typeof entry.admin === "object" ? entry.admin : null;
    if (explicit?.enabled) return true;
    return configured.size && configured.has(`${entry?.email || ""}`.trim().toLowerCase());
  });
}

export function isFlowAccountBlocked(account) {
  return `${account?.status || "active"}` === "blocked";
}

export function isAdminAccessBlocked(account) {
  return Boolean(account?.admin && typeof account.admin === "object" && account.admin.blocked === true);
}

export function isAccountBlocked(account) {
  return isFlowAccountBlocked(account);
}

export function getAccountStatusLabel(account) {
  return isFlowAccountBlocked(account) ? "blocked" : "active";
}

function normalizePermissionList(list) {
  return [...new Set((Array.isArray(list) ? list : []).filter((item) => ADMIN_PERMISSION_KEYS.includes(item)))];
}

export function getAdminSpec(account, store) {
  if (!account?.email) return { enabled: false, role: "", permissions: [] };
  const explicit = account?.admin && typeof account.admin === "object" ? account.admin : null;
  if (explicit?.enabled) {
    return {
      enabled: true,
      role: `${explicit.role || "admin"}`,
      permissions: normalizePermissionList(explicit.permissions),
    };
  }

  const configured = parseAdminEmails();
  if (configured.size && configured.has(`${account.email}`.trim().toLowerCase())) {
    return { enabled: true, role: "super_admin", permissions: [...FULL_ADMIN_PERMISSIONS] };
  }
  if (!hasExplicitAdminOwner(store)) {
    const fallbackOwner = getEarliestAccount(store);
    if (fallbackOwner?.uid === account.uid) {
      return { enabled: true, role: "super_admin", permissions: [...FULL_ADMIN_PERMISSIONS] };
    }
  }

  return { enabled: false, role: "", permissions: [] };
}

export function isAdminAccount(account, store) {
  return getAdminSpec(account, store).enabled;
}

export function hasAdminPermission(account, store, permission) {
  const spec = getAdminSpec(account, store);
  if (!spec.enabled) return false;
  if (spec.role === "super_admin") return true;
  return spec.permissions.includes(permission);
}

export function assertAdminPermission(account, store, permission) {
  if (!hasAdminPermission(account, store, permission)) {
    const error = new Error("Permission administrateur insuffisante");
    error.status = 403;
    throw error;
  }
}

export function buildAdminSpec(input = {}) {
  const role = `${input?.role || "admin"}` === "super_admin" ? "super_admin" : "admin";
  return {
    enabled: true,
    role,
    permissions: role === "super_admin"
      ? [...FULL_ADMIN_PERMISSIONS]
      : normalizePermissionList(input?.permissions),
    grantedAt: new Date().toISOString(),
    grantedBy: `${input?.grantedBy || "system"}`.slice(0, 80),
  };
}

export function sanitizeAdminUser(account, store = null) {
  const db = normalizeDb(account?.db, account);
  const admin = getAdminSpec(account, store || { users: [account] });
  return {
    uid: account?.uid || "",
    name: account?.name || "Utilisateur",
    email: account?.email || "",
    createdAt: account?.createdAt || "",
    lastLoginAt: account?.lastLoginAt || "",
    lastSeenAt: account?.lastSeenAt || "",
    status: getAccountStatusLabel(account),
    blockedAt: account?.blockedAt || "",
    blockedReason: account?.blockedReason || "",
    loginCount: Number(account?.loginCount) || 0,
    mustChangePassword: Boolean(account?.mustChangePassword),
    plan: db.subscription?.plan || "summit",
    planStatus: db.subscription?.status || "complimentary",
    profile: {
      username: db.profile?.username || "",
      fullName: db.profile?.fullName || account?.name || "",
      phone: db.profile?.phone || "",
      phoneVisible: Boolean(db.profile?.phoneVisible),
      photoUrl: db.profile?.photoUrl || "",
    },
    admin: {
      enabled: admin.enabled,
      role: admin.role || "user",
      permissions: admin.permissions,
    },
    metrics: {
      notes: Array.isArray(db.notes) ? db.notes.length : 0,
      tasks: Array.isArray(db.tasks) ? db.tasks.length : 0,
      events: Array.isArray(db.events) ? db.events.length : 0,
      habits: Array.isArray(db.habits) ? db.habits.length : 0,
      bookmarks: Array.isArray(db.bookmarks) ? db.bookmarks.length : 0,
      goals: Array.isArray(db.goals) ? db.goals.length : 0,
      notifications: Array.isArray(db.notifications) ? db.notifications.length : 0,
      unreadNotifications: Array.isArray(db.notifications)
        ? db.notifications.filter((entry) => !entry?.readAt).length
        : 0,
      activity: Array.isArray(db.activity) ? db.activity.length : 0,
    },
  };
}

export async function getRequestContext(options = {}) {
  const { requireAdmin = false, requirePermission = "" } = options;
  const cookieStore = await cookies();
  const session = readSessionCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value);

  if (!session) {
    const error = new Error("Non autorisé");
    error.status = 401;
    throw error;
  }

  const store = await readStore();
  const account = store.users.find((entry) => entry.uid === session.uid);

  if (!account) {
    const error = new Error("Compte introuvable");
    error.status = 404;
    throw error;
  }

  if (isAdminAccessBlocked(account)) {
    const error = new Error("Accès admin bloqué");
    error.status = 423;
    throw error;
  }

  const admin = isAdminAccount(account, store);
  if (requireAdmin && !admin) {
    const error = new Error("Accès administrateur requis");
    error.status = 403;
    throw error;
  }
  if (requirePermission) {
    assertAdminPermission(account, store, requirePermission);
  }

  return { session, store, account, admin };
}

export function appendAdminNotification(account, payload) {
  const db = normalizeDb(account?.db, account);
  db.notifications = [
    {
      id: crypto.randomUUID(),
      type: `${payload?.type || "admin"}`.slice(0, 40),
      title: `${payload?.title || "Message admin"}`.slice(0, 160),
      detail: `${payload?.detail || ""}`.slice(0, 240),
      createdAt: new Date().toISOString(),
      readAt: "",
      href: `${payload?.href || "settings"}`.slice(0, 80),
      entityId: `${payload?.entityId || ""}`.slice(0, 80),
    },
    ...(Array.isArray(db.notifications) ? db.notifications : []),
  ].slice(0, 120);
  db.activity = [
    {
      id: crypto.randomUUID(),
      type: "admin",
      title: `${payload?.activityTitle || payload?.title || "Action admin"}`.slice(0, 140),
      detail: `${payload?.activityDetail || payload?.detail || ""}`.slice(0, 240),
      createdAt: new Date().toISOString(),
    },
    ...(Array.isArray(db.activity) ? db.activity : []),
  ].slice(0, 120);
  account.db = db;
  queuePushNotification(account, {
    title: `${payload?.title || "Message admin"}`.slice(0, 160),
    detail: `${payload?.detail || ""}`.slice(0, 240),
    url: payload?.href ? `/?open=${payload.href}` : "/",
    tag: `flow-${`${payload?.type || "admin"}`.slice(0, 40)}`,
    kind: `${payload?.type || "admin"}`.slice(0, 40),
  });
}
