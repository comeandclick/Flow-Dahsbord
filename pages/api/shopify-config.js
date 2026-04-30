import { normalizeDb } from "../../lib/schema";
import { readSessionCookieValue } from "../../lib/auth";
import { readStore, withStoreLock, writeStore } from "../../lib/remote-store";

function trim(value) {
  return `${value || ""}`.trim();
}

function normalizeStoreDomain(value) {
  return trim(value)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function setCors(req, res) {
  const origin = trim(req.headers.origin);
  const appUrl = trim(process.env.FLOW_APP_URL);
  const allowedOrigin = origin && origin.endsWith(".vercel.app")
    ? origin
    : appUrl || origin || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
}

function readCookieValue(req, name) {
  const source = `${req.headers.cookie || ""}`;
  const match = source.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function requireAccount(req, providedStore = null) {
  const session = readSessionCookieValue(readCookieValue(req, "flow_session"));
  if (!session?.uid) {
    const error = new Error("Non autorise");
    error.status = 401;
    throw error;
  }

  const store = providedStore || await readStore();
  const account = store.users.find((entry) => entry.uid === session.uid);
  if (!account) {
    const error = new Error("Compte introuvable");
    error.status = 404;
    throw error;
  }
  return { session, store, account };
}

function parseCredentialInput(input) {
  const raw = trim(input);
  if (!raw) return { storeDomain: "", accessToken: "" };

  try {
    const parsed = JSON.parse(raw);
    return {
      storeDomain: normalizeStoreDomain(parsed.storeDomain || parsed.domain || parsed.shop || ""),
      accessToken: trim(parsed.accessToken || parsed.token || ""),
    };
  } catch {}

  const firstLine = raw.split(/\r?\n/).find(Boolean) || "";
  if (firstLine.includes("|")) {
    const [storeDomain, accessToken] = firstLine.split("|");
    return {
      storeDomain: normalizeStoreDomain(storeDomain),
      accessToken: trim(accessToken),
    };
  }

  const storeMatch = raw.match(/(?:store|domain|shop)\s*[:=]\s*([^\s]+)/i);
  const tokenMatch = raw.match(/(?:token|access[_ -]?token)\s*[:=]\s*([^\s]+)/i);
  return {
    storeDomain: normalizeStoreDomain(storeMatch?.[1] || ""),
    accessToken: trim(tokenMatch?.[1] || ""),
  };
}

async function validateShopifyCredential(storeDomain, accessToken) {
  const response = await fetch(`https://${storeDomain}/admin/api/2024-01/shop.json`, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.shop?.name) {
    const error = new Error(payload?.errors || payload?.error || "Cle Shopify invalide");
    error.status = response.status || 400;
    throw error;
  }

  return {
    name: payload.shop.name,
    domain: normalizeStoreDomain(payload.shop.domain || storeDomain),
  };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      const { account } = await requireAccount(req);
      const config = account.db?.settings?.shopify || {};
      res.status(200).json({
        connected: Boolean(config.storeDomain && config.accessToken),
        storeDomain: config.storeDomain || "",
        validatedAt: config.validatedAt || "",
        connectedAt: config.connectedAt || "",
      });
      return;
    }

    if (req.method === "DELETE") {
      const result = await withStoreLock(async () => {
        const store = await readStore();
        const { account } = await requireAccount(req, store);
        account.db = normalizeDb({
          ...account.db,
          settings: {
            ...(account.db?.settings || {}),
            shopify: {
              storeDomain: "",
              accessToken: "",
              connectedAt: "",
              validatedAt: "",
            },
          },
        }, account);
        await writeStore(store);
        return account.db;
      });
      res.status(200).json({ ok: true, db: result });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Methode non autorisee" });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const parsed = parseCredentialInput(body.credential);
    const storeDomain = normalizeStoreDomain(body.storeDomain || parsed.storeDomain);
    const accessToken = trim(body.accessToken || parsed.accessToken);

    if (!storeDomain || !accessToken) {
      res.status(400).json({
        error: "Colle la cle au format store.myshopify.com|shpat_xxx ou renseigne la boutique et le token.",
      });
      return;
    }

    const shop = await validateShopifyCredential(storeDomain, accessToken);

      const payload = await withStoreLock(async () => {
      const store = await readStore();
      const { account } = await requireAccount(req, store);
      const nextDb = normalizeDb({
        ...account.db,
        settings: {
          ...(account.db?.settings || {}),
          shopify: {
            storeDomain: shop.domain,
            accessToken,
            connectedAt: account.db?.settings?.shopify?.connectedAt || new Date().toISOString(),
            validatedAt: new Date().toISOString(),
          },
        },
      }, account);
      account.db = nextDb;
      await writeStore(store);
      return nextDb;
    });

    res.status(200).json({
      ok: true,
      shop,
      db: payload,
    });
  } catch (error) {
    res.status(error?.status || 500).json({
      error: error?.message || "Configuration Shopify impossible",
    });
  }
}
