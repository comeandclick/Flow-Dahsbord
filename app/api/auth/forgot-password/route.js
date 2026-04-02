import { createPasswordResetCodeRecord } from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { sendTransactionalAdminEmail, isEmailConfigured } from "../../../../lib/email";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import {
  assertRateLimit,
  clearFailures,
  getClientIp,
  recordFailure,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${value || ""}`.trim());
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = `${body?.email || ""}`.trim().toLowerCase();
    const rateKey = `forgot-password:${getClientIp(request)}:${email}`;

    assertRateLimit(rateKey);

    if (!isEmail(email)) {
      recordFailure(rateKey);
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      const error = new Error("Réinitialisation par email indisponible pour le moment");
      error.status = 503;
      throw error;
    }

    let sent = false;

    await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.email === email);

      if (account && !isAccountBlocked(account)) {
        const { code, record } = createPasswordResetCodeRecord(email);
        account.passwordReset = record;

        await sendTransactionalAdminEmail({
          to: email,
          subject: "Flow · Code de réinitialisation",
          text: [
            `Bonjour ${account.name || "sur Flow"},`,
            "",
            "Voici votre code de réinitialisation Flow :",
            "",
            code,
            "",
            "Ce code reste valable 15 minutes.",
            "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
          ].join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
              <p>Bonjour ${account.name || "sur Flow"},</p>
              <p>Voici votre code de réinitialisation Flow :</p>
              <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</p>
              <p>Ce code reste valable 15 minutes.</p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
            </div>
          `,
        });
        sent = true;
        await writeStore(store);
      }
    });

    clearFailures(rateKey);
    return Response.json({
      ok: true,
      sent,
      message: sent
        ? "Code envoyé par email"
        : "Si un compte existe pour cet email, un message sera envoyé.",
    });
  } catch (error) {
    const rawMessage = error?.message || "Envoi impossible";
    const message = rawMessage.includes("SMTP account is not yet activated")
      ? "L'envoi email est bloqué : le compte SMTP Brevo n'est pas encore activé."
      : rawMessage;
    const status = error.retryAfterMs ? 429 : error.status || 500;
    return Response.json({ error: message }, { status });
  }
}
