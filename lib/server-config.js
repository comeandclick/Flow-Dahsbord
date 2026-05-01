function getEnv(name) {
  return `${process.env[name] || ""}`.trim();
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export const FLOW_STORE_URL = getEnv("FLOW_STORE_URL");
export const FLOW_SESSION_SECRET = getEnv("FLOW_SESSION_SECRET");
export const FLOW_PASSWORD_PEPPER = getEnv("FLOW_PASSWORD_PEPPER");
export const FLOW_DATA_SECRET = getEnv("FLOW_DATA_SECRET");

export function getOptionalEnv(name, fallback = "") {
  const value = getEnv(name);
  return value || fallback;
}

export const FLOW_APP_URL = getOptionalEnv("FLOW_APP_URL", "https://flow-online-aymen.vercel.app");
export const STRIPE_SECRET_KEY = getOptionalEnv("STRIPE_SECRET_KEY");
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = getOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
export const STRIPE_WEBHOOK_SECRET = getOptionalEnv("STRIPE_WEBHOOK_SECRET");

export function assertServerConfig() {
  if (!FLOW_STORE_URL || !FLOW_SESSION_SECRET || !FLOW_PASSWORD_PEPPER || !FLOW_DATA_SECRET) {
    throw new Error("Server configuration incomplete. Please set FLOW_STORE_URL, FLOW_SESSION_SECRET, FLOW_PASSWORD_PEPPER, and FLOW_DATA_SECRET.");
  }
  return true;
}
