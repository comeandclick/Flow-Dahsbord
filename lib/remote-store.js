import { decryptJson, encryptJson } from "./crypto.js";
import { FLOW_STORE_URL, assertServerConfig } from "./server-config.js";

export async function readStore() {
  assertServerConfig();
  const url = new URL(FLOW_STORE_URL);
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
    throw new Error(`Store read failed (${response.status})`);
  }

  const raw = await response.json();
  const data = decryptJson(raw);
  return {
    users: Array.isArray(data?.users) ? data.users : [],
  };
}

export async function writeStore(store) {
  assertServerConfig();
  const encrypted = encryptJson(store);

  const response = await fetch(FLOW_STORE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(encrypted),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Store write failed (${response.status})`);
  }
}
