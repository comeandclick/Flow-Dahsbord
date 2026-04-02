import { headers } from "next/headers";
import { normalizeDb } from "../../../../lib/schema";
import { readStore, withStoreLock, writeStore } from "../../../../lib/remote-store";
import {
  derivePlanFromPrice,
  getStripe,
  getStripeWebhookSecret,
  mapStripeSubscriptionStatus,
} from "../../../../lib/stripe";

export const runtime = "nodejs";

function findUserByStripeCustomer(store, customerId) {
  return (Array.isArray(store.users) ? store.users : []).find((entry) => {
    const db = normalizeDb(entry.db, entry);
    return `${db.subscription?.stripeCustomerId || ""}` === `${customerId || ""}`;
  }) || null;
}

function applySubscriptionState(account, subscription, { fallbackPlan = "", fallbackCycle = "" } = {}) {
  const db = normalizeDb(account.db, account);
  const firstItem = subscription?.items?.data?.[0] || null;
  const price = firstItem?.price || null;
  const derived = price ? derivePlanFromPrice(price) : { plan: fallbackPlan || db.subscription?.plan || "summit", cycle: fallbackCycle || db.subscription?.billingCycle || "monthly" };

  account.db = normalizeDb({
    ...db,
    subscription: {
      ...db.subscription,
      plan: derived.plan,
      status: mapStripeSubscriptionStatus(subscription?.status || ""),
      billingCycle: derived.cycle || "monthly",
      startedAt: subscription?.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : db.subscription?.startedAt || "",
      renewsAt: subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : "",
      stripeCustomerId: `${subscription?.customer || db.subscription?.stripeCustomerId || ""}`,
      stripeSubscriptionId: `${subscription?.id || ""}`,
      stripePriceId: `${price?.id || db.subscription?.stripePriceId || ""}`,
    },
  }, account);
}

function applyLifetimeState(account, session) {
  const db = normalizeDb(account.db, account);
  const plan = `${session?.metadata?.flow_plan || db.subscription?.plan || "summit"}`;
  account.db = normalizeDb({
    ...db,
    subscription: {
      ...db.subscription,
      plan,
      status: "active",
      billingCycle: "lifetime",
      startedAt: session?.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
      renewsAt: "",
      stripeCustomerId: `${session?.customer || db.subscription?.stripeCustomerId || ""}`,
      stripeSubscriptionId: "",
      stripePriceId: `${session?.metadata?.price_id || db.subscription?.stripePriceId || ""}`,
      stripeCheckoutSessionId: `${session?.id || ""}`,
    },
  }, account);
}

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return Response.json({ error: "Webhook Stripe non configuré." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    return Response.json({ error: error.message || "Signature Stripe invalide." }, { status: 400 });
  }

  try {
    await withStoreLock(async () => {
      const store = await readStore();

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const customerId = `${session?.customer || ""}`;
        const uid = `${session?.client_reference_id || session?.metadata?.flow_uid || ""}`;
        const account = (Array.isArray(store.users) ? store.users : []).find((entry) => entry.uid === uid) || findUserByStripeCustomer(store, customerId);
        if (account) {
          if (session.mode === "subscription" && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(`${session.subscription}`, {
              expand: ["items.data.price"],
            });
            applySubscriptionState(account, subscription, {
              fallbackPlan: `${session?.metadata?.flow_plan || ""}`,
              fallbackCycle: `${session?.metadata?.flow_cycle || ""}`,
            });
          } else if (session.mode === "payment" && session.payment_status === "paid") {
            applyLifetimeState(account, session);
          }
        }
      }

      if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const account = findUserByStripeCustomer(store, subscription?.customer);
        if (account) {
          applySubscriptionState(account, subscription, {
            fallbackPlan: `${subscription?.metadata?.flow_plan || ""}`,
            fallbackCycle: `${subscription?.metadata?.flow_cycle || ""}`,
          });
        }
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;
        const account = findUserByStripeCustomer(store, invoice?.customer);
        if (account) {
          const db = normalizeDb(account.db, account);
          account.db = normalizeDb({
            ...db,
            subscription: {
              ...db.subscription,
              status: "past_due",
              stripeCustomerId: `${invoice?.customer || db.subscription?.stripeCustomerId || ""}`,
            },
          }, account);
        }
      }

      await writeStore(store);
    });

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message || "Traitement webhook Stripe impossible." }, { status: 500 });
  }
}
