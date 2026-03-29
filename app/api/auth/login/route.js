import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  CURRENT_PASSWORD_VERSION,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/auth";
import { readStore, writeStore } from "../../../../lib/remote-store";
import { normalizeDb } from "../../../../lib/schema";
import {
  assertRateLimit,
  clearFailures,
  getClientIp,
  recordFailure,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = `${body?.email || ""}`.trim().toLowerCase();
    const password = `${body?.password || ""}`;
    const rateKey = `login:${getClientIp(request)}:${email}`;

    assertRateLimit(rateKey);

    if (!email || !password) {
      recordFailure(rateKey);
      return Response.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const store = await readStore();
    const account = store.users.find((entry) => entry.email === email);

    if (!account) {
      recordFailure(rateKey);
      return Response.json({ error: "Compte introuvable" }, { status: 404 });
    }

    const passwordVersion = account.passwordVersion || 1;
    if (!verifyPassword(password, account.salt, account.hash, passwordVersion)) {
      recordFailure(rateKey);
      return Response.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    if (passwordVersion < CURRENT_PASSWORD_VERSION) {
      const upgraded = hashPassword(password);
      account.hash = upgraded.hash;
      account.salt = upgraded.salt;
      account.passwordVersion = upgraded.passwordVersion;
      await writeStore(store);
    }

    const sessionUser = { uid: account.uid, name: account.name, email: account.email };
    const db = normalizeDb(account.db, sessionUser);

    const cookieStore = await cookies();
    cookieStore.set("flow_session", createSessionCookieValue(sessionUser), sessionCookieOptions);
    clearFailures(rateKey);

    return Response.json({ user: sessionUser, db });
  } catch (error) {
    const status = error.retryAfterMs ? 429 : 500;
    return Response.json({ error: error.message || "Connexion impossible." }, { status });
  }
}
