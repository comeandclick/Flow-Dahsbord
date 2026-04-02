import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import { normalizeDb } from "../../../../lib/schema";
import {
  ensurePlanPrice,
  ensureStripeCustomer,
  getAppUrl,
  getStripe,
  isStripeConfigured,
  resolvePlanPrice,
} from "../../../../lib/stripe";

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

    const body = await request.json().catch(() => ({}));
    const planKey = `${body?.plan || ""}`;
    const cycleKey = `${body?.cycle || ""}`;
    const { cycle } = resolvePlanPrice(planKey, cycleKey);
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
      const price = await ensurePlanPrice(stripe, planKey, cycleKey);
      const checkout = await stripe.checkout.sessions.create({
        mode: cycle.mode,
        customer: customer.id,
        allow_promotion_codes: true,
        client_reference_id: account.uid,
        success_url: `${appUrl}/?view=settings&open=billing&billing=success`,
        cancel_url: `${appUrl}/?view=settings&open=billing&billing=cancel`,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          flow_uid: account.uid,
          flow_plan: planKey,
          flow_cycle: cycleKey,
        },
        ...(cycle.mode === "subscription"
          ? {
              subscription_data: {
                metadata: {
                  flow_uid: account.uid,
                  flow_plan: planKey,
                  flow_cycle: cycleKey,
                },
              },
            }
          : {}),
      });

      account.db = normalizeDb({
        ...db,
        subscription: {
          ...db.subscription,
          stripeCustomerId: customer.id,
          stripePriceId: price.id,
          stripeCheckoutSessionId: checkout.id,
        },
      }, account);
      account.lastSeenAt = new Date().toISOString();
      await writeStore(store);

      return { url: checkout.url };
    });

    return Response.json({ ok: true, url: payload.url });
  } catch (error) {
    return Response.json({ error: error.message || "Checkout Stripe impossible" }, { status: error.status || 500 });
  }
}
