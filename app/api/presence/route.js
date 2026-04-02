import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { isAccountBlocked } from "../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../lib/remote-store";

export const runtime = "nodejs";

const MIN_HEARTBEAT_INTERVAL_MS = 15 * 1000;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ ok: false }, { status: 401 });
    }

    return await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);
      if (!account) {
        return Response.json({ ok: false }, { status: 404 });
      }
      if (isAccountBlocked(account)) {
        return Response.json({ ok: false }, { status: 423 });
      }

      const now = Date.now();
      const lastSeen = new Date(account.lastSeenAt || 0).getTime();
      if (!lastSeen || (now - lastSeen) >= MIN_HEARTBEAT_INTERVAL_MS) {
        account.lastSeenAt = new Date(now).toISOString();
        await writeStore(store);
      }

      return Response.json({ ok: true, lastSeenAt: account.lastSeenAt });
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || "Heartbeat impossible" }, { status: error.status || 500 });
  }
}
