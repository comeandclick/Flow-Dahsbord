import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../../lib/auth";
import { isAccountBlocked } from "../../../../lib/admin";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import { normalizeDb } from "../../../../lib/schema";
import { getStripe, isStripeConfigured, mapStripeSubscriptionStatus } from "../../../../lib/stripe";

export const runtime = "nodejs";

export async function POST() {
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
      const subscriptionId = `${db.subscription?.stripeSubscriptionId || ""}`;
      if (!subscriptionId) {
        const error = new Error("Aucun abonnement récurrent actif à annuler.");
        error.status = 400;
        throw error;
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      account.db = normalizeDb({
        ...db,
        subscription: {
          ...db.subscription,
          status: mapStripeSubscriptionStatus(subscription.status || ""),
          renewsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : db.subscription?.renewsAt || "",
        },
      }, account);
      account.lastSeenAt = new Date().toISOString();
      await writeStore(store);
      return { db: account.db };
    });

    return Response.json({ ok: true, db: payload.db });
  } catch (error) {
    return Response.json({ error: error.message || "Annulation Stripe impossible" }, { status: error.status || 500 });
  }
}
