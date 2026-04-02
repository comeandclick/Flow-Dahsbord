import { getRequestContext, sanitizeAdminUser } from "../../../../lib/admin";
import { normalizeConversation } from "../../../../lib/conversations";

export const runtime = "nodejs";

function escapeCsv(value) {
  const raw = `${value ?? ""}`;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

export async function GET() {
  try {
    const { store, account } = await getRequestContext({ requireAdmin: true, requirePermission: "exports.csv" });
    const userMap = new Map();
    (Array.isArray(store.conversations) ? store.conversations : [])
      .map(normalizeConversation)
      .forEach((conversation) => {
        (conversation.participantIds || []).forEach((uid) => {
          userMap.set(uid, (userMap.get(uid) || 0) + 1);
        });
      });

    const rows = [
      [
        "uid",
        "name",
        "email",
        "status",
        "blocked_reason",
        "admin_role",
        "permissions",
        "plan",
        "plan_status",
        "created_at",
        "last_login_at",
        "last_seen_at",
        "login_count",
        "must_change_password",
        "username",
        "full_name",
        "phone",
        "notes",
        "tasks",
        "events",
        "habits",
        "bookmarks",
        "goals",
        "notifications",
        "unread_notifications",
        "activity_entries",
        "conversations",
      ],
      ...store.users.map((entry) => {
        const user = sanitizeAdminUser(entry, store);
        return [
          user.uid,
          user.name,
          user.email,
          user.status,
          user.blockedReason,
          user.admin?.role || "user",
          (user.admin?.permissions || []).join("|"),
          user.plan,
          user.planStatus,
          user.createdAt,
          user.lastLoginAt,
          user.lastSeenAt,
          user.loginCount,
          user.mustChangePassword ? "yes" : "no",
          user.profile?.username || "",
          user.profile?.fullName || "",
          user.profile?.phone || "",
          user.metrics.notes,
          user.metrics.tasks,
          user.metrics.events,
          user.metrics.habits,
          user.metrics.bookmarks,
          user.metrics.goals,
          user.metrics.notifications,
          user.metrics.unreadNotifications,
          user.metrics.activity,
          userMap.get(user.uid) || 0,
        ];
      }),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="flow-admin-users-${new Date().toISOString().slice(0, 10)}.csv"`,
        "X-Admin-Exporter": account.uid,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "Export CSV impossible" }, { status: error.status || 500 });
  }
}
