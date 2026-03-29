import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { readStore, writeStore } from "../../../lib/remote-store";
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
    const store = await readStore();
    const account = store.users.find((entry) => entry.uid === session.uid);

    if (!account) {
      return Response.json({ error: "Compte introuvable" }, { status: 404 });
    }

    if (JSON.stringify(payload.db || {}).length > 1024 * 1024) {
      return Response.json({ error: "Base trop volumineuse" }, { status: 413 });
    }

    account.db = normalizeDb(payload.db, account);
    await writeStore(store);

    return Response.json({ ok: true, db: account.db });
  } catch {
    return Response.json({ error: "Sauvegarde impossible" }, { status: 500 });
  }
}
