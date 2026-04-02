function trim(value) {
  return `${value || ""}`.trim();
}

export function isGoogleAuthConfigured() {
  return Boolean(trim(process.env.FLOW_GOOGLE_CLIENT_ID) && trim(process.env.FLOW_GOOGLE_CLIENT_SECRET));
}

export function getGoogleClientId() {
  return trim(process.env.FLOW_GOOGLE_CLIENT_ID);
}

export function getGoogleClientSecret() {
  return trim(process.env.FLOW_GOOGLE_CLIENT_SECRET);
}

export function getAppBaseUrl(request) {
  const explicit = trim(process.env.FLOW_APP_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://127.0.0.1:3000";
  }
}

export function getGoogleRedirectUri(request) {
  return `${getAppBaseUrl(request)}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(request, state) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}
