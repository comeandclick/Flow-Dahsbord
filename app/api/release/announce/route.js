import { flushPendingPushNotifications, getAccountsWithPendingPushes } from "../../../../lib/push";
import { RELEASE } from "../../../../lib/release";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";

export const runtime = "nodejs";

function isAuthorized(request) {
  const token = request.headers.get("x-flow-release-token") || "";
  return token && token === (process.env.FLOW_SESSION_SECRET || "");
}

function buildAnnouncement(body = {}) {
  const version = `${body.version || RELEASE.version}`;
  const deployedAt = `${body.deployedAt || RELEASE.deployedAt}`;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deployedAt)).replace(",", " à");

  return {
    title: `${body.title || "Flow Dashbord"}`.slice(0, 160),
    detail: `${body.detail || "Nouvelle Mise à Jour !"}`.slice(0, 240),
    href: "/",
    type: "update",
    entityId: version,
    version,
    deployedAt,
    meta: dateLabel,
  };
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const announcement = buildAnnouncement(body);

    try {
      return await withStoreLock(async () => {
        const store = await readStore();
        const users = Array.isArray(store.users) ? store.users : [];

        users.forEach((account) => {
          account.__pendingPushes = [{
            title: announcement.title,
            body: announcement.detail,
            url: announcement.href,
            tag: `flow-update-${announcement.version}`,
            kind: "update",
            version: announcement.version,
          }];
        });

        await writeStore(store);
        await flushPendingPushNotifications(getAccountsWithPendingPushes(store));

        return Response.json({ ok: true, delivered: users.length, title: announcement.title });
      });
    } catch (error) {
      if (`${error?.message || ""}`.includes("Store read failed (404)") || `${error?.message || ""}`.includes("Store write failed (404)")) {
        return Response.json({ ok: true, delivered: 0, title: announcement.title, skipped: true });
      }
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error.message || "Annonce release impossible" }, { status: error.status || 500 });
  }
}
