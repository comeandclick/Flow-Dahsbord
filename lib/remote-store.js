import { decryptJson, encryptJson } from "./crypto.js";
import { FLOW_STORE_URL, assertServerConfig } from "./server-config.js";

let storeWriteQueue = Promise.resolve();
let resolvedStoreUrl = FLOW_STORE_URL;

function getStoreUrl() {
  return `${resolvedStoreUrl || FLOW_STORE_URL || ""}`.trim();
}

function setStoreUrl(nextUrl) {
  resolvedStoreUrl = `${nextUrl || ""}`.trim() || FLOW_STORE_URL;
}

async function persistStoreUrlForLocalDev(nextUrl) {
  if (process.env.NODE_ENV === "production") return;

  try {
    const { readFile, writeFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const envPath = resolve(process.cwd(), ".env.local");
    const current = await readFile(envPath, "utf8");

    if (!current.includes("FLOW_STORE_URL=")) return;

    const updated = current.replace(
      /^FLOW_STORE_URL=.*$/m,
      `FLOW_STORE_URL=${nextUrl}`,
    );

    if (updated !== current) {
      await writeFile(envPath, updated, "utf8");
    }
  } catch {}
}

function getJsonBlobCreateUrl(storeUrl) {
  try {
    const parsed = new URL(storeUrl);
    if (parsed.hostname !== "jsonblob.com") return null;
    if (!parsed.pathname.startsWith("/api/jsonBlob")) return null;
    return `${parsed.origin}/api/jsonBlob`;
  } catch {
    return null;
  }
}

async function createJsonBlobStore(store) {
  const createUrl = getJsonBlobCreateUrl(getStoreUrl());
  if (!createUrl) {
    throw new Error("Store introuvable et fournisseur non auto-reparable.");
  }

  const encrypted = encryptJson(store);
  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(encrypted),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Store bootstrap failed (${response.status})`);
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Store bootstrap failed (location manquante)");
  }

  const nextUrl = new URL(location, createUrl).toString();
  setStoreUrl(nextUrl);
  await persistStoreUrlForLocalDev(nextUrl);
  return nextUrl;
}

export async function readStore() {
  assertServerConfig();
  const url = new URL(getStoreUrl());
  url.searchParams.set("_ts", `${Date.now()}`);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { users: [], conversations: [], reports: [] };
    }
    throw new Error(`Store read failed (${response.status})`);
  }

  const raw = await response.json();
  const data = decryptJson(raw);
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    conversations: Array.isArray(data?.conversations) ? data.conversations : [],
    reports: Array.isArray(data?.reports) ? data.reports : [],
  };
}

export async function writeStore(store) {
  assertServerConfig();
  const encrypted = encryptJson(store);
  let targetUrl = getStoreUrl();

  let response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(encrypted),
    cache: "no-store",
  });

  if (response.status === 404) {
    targetUrl = await createJsonBlobStore(store);
    response = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(encrypted),
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(`Store write failed (${response.status})`);
  }
}

export async function withStoreLock(task) {
  const previous = storeWriteQueue;
  let releaseCurrent = () => {};

  storeWriteQueue = new Promise((resolve) => {
    releaseCurrent = resolve;
  });

  await previous;

  try {
    return await task();
  } finally {
    releaseCurrent();
  }
}
