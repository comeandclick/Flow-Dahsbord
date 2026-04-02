import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { removePushSubscription, upsertPushSubscription } from "../../../../lib/push";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    return await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);
      if (!account) return Response.json({ error: "Compte introuvable" }, { status: 404 });
      if (isAccountBlocked(account)) return Response.json({ error: "Compte bloqué" }, { status: 423 });

      const ok = upsertPushSubscription(account, body?.subscription, {
        userAgent: request.headers.get("user-agent") || "",
        platform: body?.platform || "",
      });
      if (!ok) {
        return Response.json({ error: "Abonnement push invalide" }, { status: 400 });
      }

      await writeStore(store);
      return Response.json({ ok: true, count: (account.pushSubscriptions || []).length });
    });
  } catch (error) {
    return Response.json({ error: error.message || "Abonnement push impossible" }, { status: error.status || 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    return await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);
      if (!account) return Response.json({ error: "Compte introuvable" }, { status: 404 });

      removePushSubscription(account, body?.endpoint || "");
      await writeStore(store);
      return Response.json({ ok: true, count: (account.pushSubscriptions || []).length });
    });
  } catch (error) {
    return Response.json({ error: error.message || "Désabonnement push impossible" }, { status: error.status || 500 });
  }
}
