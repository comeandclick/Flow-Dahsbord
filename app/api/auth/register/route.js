import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  hashPassword,
  sessionCookieOptions,
} from "../../../../lib/auth";
import { isAdminAccount } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import { createEmptyDb } from "../../../../lib/schema";
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
    const name = `${body?.name || ""}`.trim();
    const email = `${body?.email || ""}`.trim().toLowerCase();
    const password = `${body?.password || ""}`;
    const rateKey = `register:${getClientIp(request)}:${email}`;

    assertRateLimit(rateKey);

    if (!name) {
      recordFailure(rateKey);
      return Response.json({ error: "Nom requis" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      recordFailure(rateKey);
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }

    if (password.length < 8) {
      recordFailure(rateKey);
      return Response.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
    }

    const { user, db, admin } = await withStoreLock(async () => {
      const store = await readStore();
      if (store.users.some((entry) => entry.email === email)) {
        recordFailure(rateKey);
        throw new Error("Ce compte existe déjà");
      }

      const { hash, salt, passwordVersion } = hashPassword(password);
      const user = {
        uid: crypto.randomUUID(),
        name,
        email,
        hash,
        salt,
        passwordVersion,
        status: "active",
        loginCount: 1,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };

      const db = createEmptyDb();
      db.profile = {
        ...db.profile,
        name,
        email,
        fullName: name,
      };

      store.users.push({ ...user, db });
      await writeStore(store);
      return { user, db, admin: isAdminAccount(user, store) };
    });

    const sessionUser = { uid: user.uid, name: user.name, email: user.email };
    const cookieStore = await cookies();
    cookieStore.set("flow_session", createSessionCookieValue(sessionUser), sessionCookieOptions);
    clearFailures(rateKey);

    return Response.json({ user: sessionUser, db, admin });
  } catch (error) {
    const status = error.retryAfterMs
      ? 429
      : error.message === "Ce compte existe déjà"
        ? 409
        : error.status || 500;
    return Response.json({ error: error.message || "Impossible de créer le compte." }, { status });
  }
}
