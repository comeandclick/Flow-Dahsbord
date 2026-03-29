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

export function assertServerConfig() {
  return true;
}
