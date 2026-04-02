import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import { normalizeDb } from "../../../../lib/schema";
import { ensureStripeCustomer, getAppUrl, getStripe, isStripeConfigured } from "../../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!isStripeConfigured()) {
      return Response.json({ error: "Stripe n'est pas configuré." }, { status: 503 });
    }

    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(request);

    const payload = await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);

      if (!account) {
        const error = new Error("Compte introuvable");
        error.status = 404;
        throw error;
      }
      if (isAccountBlocked(account)) {
        const error = new Error("Compte bloqué");
        error.status = 423;
        throw error;
      }

      const db = normalizeDb(account.db, account);
      const customer = await ensureStripeCustomer(stripe, account, db);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${appUrl}/?view=settings&open=billing`,
      });

      account.db = normalizeDb({
        ...db,
        subscription: {
          ...db.subscription,
          stripeCustomerId: customer.id,
        },
      }, account);
      await writeStore(store);

      return { url: portal.url };
    });

    return Response.json({ ok: true, url: payload.url });
  } catch (error) {
    return Response.json({ error: error.message || "Portail client Stripe impossible" }, { status: error.status || 500 });
  }
}
