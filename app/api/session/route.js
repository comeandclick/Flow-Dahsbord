import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { isAccountBlocked, isAdminAccount } from "../../../lib/admin";
import { readStore } from "../../../lib/remote-store";
import { normalizeDb } from "../../../lib/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);

    if (!session) {
      return Response.json({ user: null, db: null });
    }

    const store = await readStore();
    const account = store.users.find((entry) => entry.uid === session.uid);

    if (!account) {
      return Response.json({ user: null, db: null });
    }

    if (isAccountBlocked(account)) {
      return Response.json({ user: null, db: null, error: "Compte bloqué" }, { status: 423 });
    }

    const user = { uid: account.uid, name: account.name, email: account.email };
    return Response.json({ user, db: normalizeDb(account.db, user), admin: isAdminAccount(account, store) });
  } catch (error) {
    return Response.json(
      { user: null, db: null, error: error.message || "Session indisponible" },
      { status: error.status || 500 },
    );
  }
}
