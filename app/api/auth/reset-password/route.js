import {
  CURRENT_PASSWORD_VERSION,
  hashPassword,
  verifyPasswordResetCodeRecord,
} from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import {
  assertRateLimit,
  clearFailures,
  getClientIp,
  recordFailure,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

function normalizeEmail(value) {
  return `${value || ""}`.trim().toLowerCase();
}

async function getAccountByEmail(email) {
  const store = await readStore();
  return {
    store,
    account: store.users.find((entry) => entry.email === email),
  };
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const code = `${body?.code || ""}`.trim();
    const rateKey = `reset-password-verify:${getClientIp(request)}:${email || "unknown"}`;

    assertRateLimit(rateKey);

    if (!email || !code) {
      recordFailure(rateKey);
      return Response.json({ error: "Email et code requis" }, { status: 400 });
    }

    const { account } = await getAccountByEmail(email);
    if (!account || isAccountBlocked(account) || !verifyPasswordResetCodeRecord(account.passwordReset, email, code)) {
      if (account?.passwordReset) account.passwordReset.tries = (Number(account.passwordReset.tries) || 0) + 1;
      recordFailure(rateKey);
      return Response.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    clearFailures(rateKey);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error.retryAfterMs ? 429 : error.status || 500;
    return Response.json({ error: error.message || "Vérification impossible" }, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const code = `${body?.code || ""}`.trim();
    const password = `${body?.password || ""}`;
    const rateKey = `reset-password:${getClientIp(request)}:${email || "unknown"}`;

    assertRateLimit(rateKey);

    if (!email || !code) {
      recordFailure(rateKey);
      return Response.json({ error: "Email et code requis" }, { status: 400 });
    }

    if (password.length < 8) {
      recordFailure(rateKey);
      return Response.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
    }

    await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.email === email);

      if (!account || isAccountBlocked(account)) {
        const error = new Error("Compte introuvable");
        error.status = 404;
        throw error;
      }

      if (!verifyPasswordResetCodeRecord(account.passwordReset, email, code)) {
        account.passwordReset = {
          ...(account.passwordReset || {}),
          tries: (Number(account.passwordReset?.tries) || 0) + 1,
        };
        const error = new Error("Code invalide ou expiré");
        error.status = 400;
        throw error;
      }

      const upgraded = hashPassword(password, undefined, CURRENT_PASSWORD_VERSION);
      account.hash = upgraded.hash;
      account.salt = upgraded.salt;
      account.passwordVersion = upgraded.passwordVersion;
      account.mustChangePassword = false;
      account.lastSeenAt = new Date().toISOString();
      delete account.passwordReset;

      await writeStore(store);
    });

    clearFailures(rateKey);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error.retryAfterMs ? 429 : error.status || 500;
    return Response.json({ error: error.message || "Réinitialisation impossible" }, { status });
  }
}
