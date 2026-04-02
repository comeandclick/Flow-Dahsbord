function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export const FLOW_STORE_URL = requireEnv("FLOW_STORE_URL");
export const FLOW_SESSION_SECRET = requireEnv("FLOW_SESSION_SECRET");
export const FLOW_PASSWORD_PEPPER = requireEnv("FLOW_PASSWORD_PEPPER");
export const FLOW_DATA_SECRET = requireEnv("FLOW_DATA_SECRET");

export function getOptionalEnv(name, fallback = "") {
  const value = process.env[name];
  return value ? `${value}` : fallback;
}

export const FLOW_APP_URL = getOptionalEnv("FLOW_APP_URL", "https://flow-online-aymen.vercel.app");
export const STRIPE_SECRET_KEY = getOptionalEnv("STRIPE_SECRET_KEY");
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = getOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
export const STRIPE_WEBHOOK_SECRET = getOptionalEnv("STRIPE_WEBHOOK_SECRET");

export function assertServerConfig() {
  return true;
}
