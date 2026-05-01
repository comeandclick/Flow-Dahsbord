import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../../lib/auth";
import { ADMIN_SESSION_COOKIE_NAME, isAdminAccessBlocked, isAdminAccount } from "../../../../../lib/admin";
import { readStore, writeStore } from "../../../../../lib/remote-store";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = `${body?.email || ""}`.trim().toLowerCase();
    const password = `${body?.password || ""}`;

    if (!email || !password) {
      return Response.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const store = await readStore();
    const account = store.users.find((entry) => entry.email === email);
    if (!account) {
      return Response.json({ error: "Compte administrateur introuvable" }, { status: 404 });
    }

    if (!isAdminAccount(account, store)) {
      return Response.json({ error: "Ce compte n'a pas d'accès admin" }, { status: 403 });
    }

    if (isAdminAccessBlocked(account)) {
      return Response.json({ error: "Accès admin bloqué" }, { status: 423 });
    }

    const version = account.passwordVersion || 1;
    if (!verifyPassword(password, account.salt, account.hash, version)) {
      return Response.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const now = new Date().toISOString();
    account.lastLoginAt = now;
    account.lastSeenAt = now;
    account.loginCount = (Number(account.loginCount) || 0) + 1;
    await writeStore(store);

    const sessionUser = { uid: account.uid, name: account.name, email: account.email };
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE_NAME, createSessionCookieValue(sessionUser), sessionCookieOptions);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "Connexion admin impossible" }, { status: error.status || 500 });
  }
}
