import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  CURRENT_PASSWORD_VERSION,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/auth";
import { isAccountBlocked, isAdminAccount } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
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

    const { account, sessionUser, isAdmin } = await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.email === email);

      if (!account) {
        recordFailure(rateKey);
        const error = new Error("Compte introuvable");
        error.status = 404;
        throw error;
      }

      if (isAccountBlocked(account)) {
        recordFailure(rateKey);
        const error = new Error("Compte bloqué. Contactez l'administrateur.");
        error.status = 423;
        throw error;
      }

      if (!account.hash) {
        recordFailure(rateKey);
        const error = new Error(account.authProvider === "google"
          ? "Ce compte utilise Google. Connectez-vous avec Google ou redefinissez un mot de passe."
          : "Connexion par mot de passe indisponible pour ce compte"
        );
        error.status = 400;
        throw error;
      }

      const passwordVersion = account.passwordVersion || 1;
      if (!verifyPassword(password, account.salt, account.hash, passwordVersion)) {
        recordFailure(rateKey);
        const error = new Error("Mot de passe incorrect");
        error.status = 401;
        throw error;
      }

      const now = new Date().toISOString();
      account.lastLoginAt = now;
      account.lastSeenAt = now;
      account.loginCount = (Number(account.loginCount) || 0) + 1;
      account.mustChangePassword = Boolean(account.mustChangePassword);

      if (passwordVersion < CURRENT_PASSWORD_VERSION) {
        const upgraded = hashPassword(password);
        account.hash = upgraded.hash;
        account.salt = upgraded.salt;
        account.passwordVersion = upgraded.passwordVersion;
      }

      await writeStore(store);
      return {
        account,
        sessionUser: { uid: account.uid, name: account.name, email: account.email },
        isAdmin: isAdminAccount(account, store),
      };
    });

    const db = normalizeDb(account.db, sessionUser);

    const cookieStore = await cookies();
    cookieStore.set("flow_session", createSessionCookieValue(sessionUser), sessionCookieOptions);
    clearFailures(rateKey);

    return Response.json({ user: sessionUser, db, admin: isAdmin });
  } catch (error) {
    const status = error.retryAfterMs ? 429 : error.status || 500;
    return Response.json({ error: error.message || "Connexion impossible." }, { status });
  }
}
