import { getAdminSpec, getRequestContext, sanitizeAdminUser } from "../../../../lib/admin";
import { normalizeConversation } from "../../../../lib/conversations";
import { RELEASE } from "../../../../lib/release";
import { normalizeDb } from "../../../../lib/schema";

export const runtime = "nodejs";

function isoRecentSince(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function getLatestTimestamp(...values) {
  return values
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function buildAuditEntries(users) {
  return users
    .flatMap((entry) => {
      const db = normalizeDb(entry.db, entry);
      return (Array.isArray(db.activity) ? db.activity : [])
        .filter((item) => `${item?.type || ""}` === "admin")
        .map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          detail: item.detail,
          createdAt: item.createdAt,
          actor: {
            uid: entry.uid,
            name: entry.name || "Admin",
            email: entry.email || "",
            role: getAdminSpec(entry, { users }).role || "admin",
          },
        }));
    })
    .sort((a, b) => getLatestTimestamp(b.createdAt) - getLatestTimestamp(a.createdAt))
    .slice(0, 16);
}

function buildReportEntries(reports, users, conversations) {
  const userMap = new Map(users.map((entry) => [entry.uid, entry]));
  const conversationMap = new Map(conversations.map((entry) => [entry.id, entry]));

  return reports
    .map((entry) => {
      const reporter = userMap.get(entry?.reporterId);
      const sender = userMap.get(entry?.senderId);
      const resolver = userMap.get(entry?.resolvedBy);
      const conversation = conversationMap.get(entry?.conversationId);
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
        reporter: reporter ? sanitizeAdminUser(reporter, { users }) : null,
        sender: sender ? sanitizeAdminUser(sender, { users }) : null,
        resolver: resolver ? sanitizeAdminUser(resolver, { users }) : null,
      };
    })
    .sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      return getLatestTimestamp(b.createdAt, b.resolvedAt) - getLatestTimestamp(a.createdAt, a.resolvedAt);
    })
    .slice(0, 80);
}

export async function GET() {
  const startedAt = Date.now();

  try {
    const { account, store } = await getRequestContext({ requireAdmin: true, requirePermission: "dashboard.read" });
    const users = Array.isArray(store.users) ? store.users : [];
    const conversations = (Array.isArray(store.conversations) ? store.conversations : []).map(normalizeConversation);
    const reports = Array.isArray(store.reports) ? store.reports : [];
    const now = Date.now();
    const last2m = now - (2 * 60 * 1000);
    const last5m = now - (5 * 60 * 1000);
    const last24h = isoRecentSince(1);
    const last7d = isoRecentSince(7);

    const aggregate = users.reduce((acc, entry) => {
      const db = normalizeDb(entry.db, entry);
      acc.notes += db.notes.length;
      acc.tasks += db.tasks.length;
      acc.events += db.events.length;
      acc.habits += db.habits.length;
      acc.bookmarks += db.bookmarks.length;
      acc.goals += db.goals.length;
      acc.notifications += db.notifications.length;
      acc.activities += db.activity.length;
      return acc;
    }, {
      notes: 0,
      tasks: 0,
      events: 0,
      habits: 0,
      bookmarks: 0,
      goals: 0,
      notifications: 0,
      activities: 0,
    });

    const usersSummary = users
      .map((entry) => sanitizeAdminUser(entry, store))
      .sort((a, b) => {
        const latestA = getLatestTimestamp(a.lastSeenAt, a.lastLoginAt, a.createdAt);
        const latestB = getLatestTimestamp(b.lastSeenAt, b.lastLoginAt, b.createdAt);
        return latestB - latestA;
      });
    const auditTrail = buildAuditEntries(users);
    const reportEntries = buildReportEntries(reports, users, conversations);
    const topActiveUsers = usersSummary
      .slice()
      .sort((a, b) => (
        (b.metrics.notes + b.metrics.tasks + b.metrics.events + b.metrics.bookmarks + b.metrics.goals)
        - (a.metrics.notes + a.metrics.tasks + a.metrics.events + a.metrics.bookmarks + a.metrics.goals)
      ))
      .slice(0, 8);

    return Response.json({
      admin: sanitizeAdminUser(account, store),
      permissions: getAdminSpec(account, store).permissions,
      capabilities: {
        canManageUsers: getAdminSpec(account, store).permissions.includes("users.manage") || getAdminSpec(account, store).role === "super_admin",
        canManageAdmins: getAdminSpec(account, store).permissions.includes("admins.manage") || getAdminSpec(account, store).role === "super_admin",
        canCreateAdmins: getAdminSpec(account, store).permissions.includes("admins.create") || getAdminSpec(account, store).role === "super_admin",
        canSendEmail: getAdminSpec(account, store).permissions.includes("email.send") || getAdminSpec(account, store).role === "super_admin",
        canExportCsv: getAdminSpec(account, store).permissions.includes("exports.csv") || getAdminSpec(account, store).role === "super_admin",
        canModerateReports: getAdminSpec(account, store).permissions.includes("users.manage") || getAdminSpec(account, store).role === "super_admin",
      },
      release: RELEASE,
      health: {
        status: "healthy",
        checkedAt: new Date(now).toISOString(),
        latencyMs: Date.now() - startedAt,
        storeUsers: users.length,
        storeConversations: conversations.length,
        storeReports: reports.length,
      },
      stats: {
        usersTotal: users.length,
        onlineNow: usersSummary.filter((entry) => getLatestTimestamp(entry.lastSeenAt) >= last2m).length,
        active5m: usersSummary.filter((entry) => getLatestTimestamp(entry.lastSeenAt) >= last5m).length,
        active24h: usersSummary.filter((entry) => getLatestTimestamp(entry.lastSeenAt, entry.lastLoginAt) >= last24h).length,
        active7d: usersSummary.filter((entry) => getLatestTimestamp(entry.lastSeenAt, entry.lastLoginAt) >= last7d).length,
        blockedUsers: usersSummary.filter((entry) => entry.status === "blocked").length,
        newUsers7d: usersSummary.filter((entry) => new Date(entry.createdAt || 0).getTime() >= last7d).length,
        conversations: conversations.length,
        directConversations: conversations.filter((entry) => entry.type === "direct").length,
        groupConversations: conversations.filter((entry) => entry.type === "group").length,
        reportsOpen: reports.filter((entry) => `${entry?.status || "open"}` === "open").length,
        ...aggregate,
      },
      analytics: {
        dailyConnections: usersSummary
          .filter((entry) => entry.lastLoginAt)
          .slice(0, 12)
          .map((entry) => ({
            uid: entry.uid,
            name: entry.name,
            email: entry.email,
            lastLoginAt: entry.lastLoginAt,
            loginCount: entry.loginCount,
          })),
        recentSignups: usersSummary
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 8),
        usersByPlan: {
          starter: usersSummary.filter((entry) => entry.plan === "starter").length,
          pro: usersSummary.filter((entry) => entry.plan === "pro").length,
          summit: usersSummary.filter((entry) => entry.plan === "summit").length,
        },
        topActiveUsers,
        auditTrail,
      },
      users: usersSummary,
      reports: reportEntries,
      fakeInfoMode: Boolean(store.fakeInfoMode),
    });
  } catch (error) {
    return Response.json({ error: error.message || "Chargement admin impossible" }, { status: error.status || 500 });
  }
}
