import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
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

    const user = { uid: account.uid, name: account.name, email: account.email };
    return Response.json({ user, db: normalizeDb(account.db, user) });
  } catch {
    return Response.json({ user: null, db: null });
  }
}
