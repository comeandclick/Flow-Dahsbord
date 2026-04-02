import Stripe from "stripe";
import {
  FLOW_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from "./server-config.js";

const PLAN_CATALOG = {
  starter: {
    name: "Starter",
    description: "Pour une organisation personnelle propre et simple.",
    prices: {
      monthly: { amount: 1200, mode: "subscription", interval: "month" },
      yearly: { amount: 12000, mode: "subscription", interval: "year" },
      lifetime: { amount: 24900, mode: "payment" },
    },
  },
  pro: {
    name: "Pro",
    description: "Pour un usage intensif avec plus de personnalisation.",
    prices: {
      monthly: { amount: 2400, mode: "subscription", interval: "month" },
      yearly: { amount: 24000, mode: "subscription", interval: "year" },
      lifetime: { amount: 44900, mode: "payment" },
    },
  },
  summit: {
    name: "Summit",
    description: "Le niveau le plus complet de Flow.",
    prices: {
      monthly: { amount: 4900, mode: "subscription", interval: "month" },
      yearly: { amount: 49000, mode: "subscription", interval: "year" },
      lifetime: { amount: 89900, mode: "payment" },
    },
  },
};

let stripeSingleton = null;
const productCache = new Map();
const priceCache = new Map();

export function getStripe() {
  if (!STRIPE_SECRET_KEY) {
    const error = new Error("Stripe n'est pas configuré côté serveur.");
    error.status = 503;
    throw error;
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeSingleton;
}

export function isStripeConfigured() {
  return Boolean(STRIPE_SECRET_KEY && NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripePublishableKey() {
  return NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export function getStripeWebhookSecret() {
  return STRIPE_WEBHOOK_SECRET;
}

export function getAppUrl(request) {
  try {
    if (request?.url) {
      return new URL(request.url).origin;
    }
  } catch {}
  return FLOW_APP_URL;
}

export function getPlanCatalog() {
  return PLAN_CATALOG;
}

export function resolvePlanPrice(planKey, cycleKey) {
  const plan = PLAN_CATALOG[planKey];
  const cycle = plan?.prices?.[cycleKey];
  if (!plan || !cycle) {
    const error = new Error("Forfait Stripe introuvable.");
    error.status = 400;
    throw error;
  }
  return { plan, cycle };
}

export function mapStripeSubscriptionStatus(status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  if (status === "canceled" || status === "incomplete_expired" || status === "paused") return "canceled";
  return "complimentary";
}

export async function ensureStripeCustomer(stripe, account, db) {
  const currentId = `${db?.subscription?.stripeCustomerId || ""}`;
  if (currentId) {
    const customer = await stripe.customers.update(currentId, {
      email: account.email || undefined,
      name: account.name || undefined,
      metadata: {
        flow_uid: account.uid,
        flow_email: account.email || "",
      },
    });
    return customer;
  }

  return stripe.customers.create({
    email: account.email || undefined,
    name: account.name || undefined,
    metadata: {
      flow_uid: account.uid,
      flow_email: account.email || "",
    },
  });
}

async function listProducts(stripe) {
  const entries = [];
  let startingAfter = undefined;
  for (;;) {
    const page = await stripe.products.list({ limit: 100, starting_after: startingAfter, active: true });
    entries.push(...page.data);
    if (!page.has_more || !page.data.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return entries;
}

export async function ensurePlanProduct(stripe, planKey) {
  if (productCache.has(planKey)) return productCache.get(planKey);
  const plan = PLAN_CATALOG[planKey];
  if (!plan) {
    throw new Error("Produit Stripe inconnu.");
  }

  const products = await listProducts(stripe);
  let product = products.find((entry) => entry.metadata?.flow_plan === planKey) || null;
  if (!product) {
    product = await stripe.products.create({
      name: `Flow ${plan.name}`,
      description: plan.description,
      metadata: {
        flow_app: "flow",
        flow_plan: planKey,
      },
    });
  }
  productCache.set(planKey, product);
  return product;
}

export async function ensurePlanPrice(stripe, planKey, cycleKey) {
  const cacheKey = `${planKey}:${cycleKey}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);
  const { cycle } = resolvePlanPrice(planKey, cycleKey);
  const product = await ensurePlanProduct(stripe, planKey);

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  let price = prices.data.find((entry) => (
    `${entry.currency || ""}` === "eur"
    && Number(entry.unit_amount || 0) === cycle.amount
    && `${entry.metadata?.flow_cycle || ""}` === cycleKey
  )) || null;

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: cycle.amount,
      metadata: {
        flow_app: "flow",
        flow_plan: planKey,
        flow_cycle: cycleKey,
      },
      ...(cycle.mode === "subscription"
        ? { recurring: { interval: cycle.interval } }
        : {}),
    });
  }

  priceCache.set(cacheKey, price);
  return price;
}

export function derivePlanFromPrice(price) {
  const plan = `${price?.metadata?.flow_plan || ""}`;
  const cycle = `${price?.metadata?.flow_cycle || ""}`;
  if (PLAN_CATALOG[plan] && PLAN_CATALOG[plan].prices[cycle]) {
    return { plan, cycle };
  }
  return { plan: "summit", cycle: "lifetime" };
}
