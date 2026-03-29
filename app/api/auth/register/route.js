import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  hashPassword,
  sessionCookieOptions,
} from "../../../../lib/auth";
import { readStore, writeStore } from "../../../../lib/remote-store";
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

    if (password.length < 6) {
      recordFailure(rateKey);
      return Response.json({ error: "Mot de passe : 6 caractères minimum" }, { status: 400 });
    }

    const store = await readStore();
    if (store.users.some((entry) => entry.email === email)) {
      recordFailure(rateKey);
      return Response.json({ error: "Ce compte existe déjà" }, { status: 409 });
    }

    const { hash, salt, passwordVersion } = hashPassword(password);
    const user = {
      uid: crypto.randomUUID(),
      name,
      email,
      hash,
      salt,
      passwordVersion,
      createdAt: new Date().toISOString(),
    };

    const db = createEmptyDb();
    db.profile = { name, email };

    store.users.push({ ...user, db });
    await writeStore(store);

    const sessionUser = { uid: user.uid, name: user.name, email: user.email };
    const cookieStore = await cookies();
    cookieStore.set("flow_session", createSessionCookieValue(sessionUser), sessionCookieOptions);
    clearFailures(rateKey);

    return Response.json({ user: sessionUser, db });
  } catch (error) {
    const status = error.retryAfterMs ? 429 : 500;
    return Response.json({ error: error.message || "Impossible de créer le compte." }, { status });
  }
}
