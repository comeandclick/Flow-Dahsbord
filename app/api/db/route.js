import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { isAccountBlocked } from "../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../lib/remote-store";
import { normalizeDb } from "../../../lib/schema";

export const runtime = "nodejs";

async function readPayload(request) {
  const raw = await request.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);

    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await readPayload(request);
    if (JSON.stringify(payload.db || {}).length > 1024 * 1024) {
      return Response.json({ error: "Base trop volumineuse" }, { status: 413 });
    }

    const db = await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);

      if (!account) {
        const error = new Error("Compte introuvable");
        error.status = 404;
        throw error;
      }

      if (isAccountBlocked(account)) {
        const error = new Error("Compte bloqué");
        error.status = 423;
        throw error;
      }

      account.db = normalizeDb(payload.db, account);
      account.lastSeenAt = new Date().toISOString();
      await writeStore(store);
      return account.db;
    });

    return Response.json({ ok: true, db });
  } catch (error) {
    return Response.json({ error: error.message || "Sauvegarde impossible" }, { status: error.status || 500 });
  }
}
