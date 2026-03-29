import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  FLOW_PASSWORD_PEPPER,
  FLOW_SESSION_SECRET,
  assertServerConfig,
} from "./server-config.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const CURRENT_PASSWORD_VERSION = 2;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  assertServerConfig();
  return createHmac("sha256", FLOW_SESSION_SECRET).update(value).digest("base64url");
}

function getPasswordMaterial(password, version) {
  if (version >= 2) {
    return `${password}:${FLOW_PASSWORD_PEPPER}`;
  }

  return password;
}

export function hashPassword(
  password,
  salt = randomBytes(16).toString("hex"),
  version = CURRENT_PASSWORD_VERSION,
) {
  const hash = scryptSync(getPasswordMaterial(password, version), salt, 64).toString("hex");
  return { salt, hash, passwordVersion: version };
}

export function verifyPassword(password, salt, expectedHash, version = 1) {
  const actualHash = scryptSync(getPasswordMaterial(password, version), salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

export function createSessionCookieValue(user) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = JSON.stringify({
    v: 2,
    uid: user.uid,
    name: user.name,
    email: user.email,
    iat: Date.now(),
    exp,
  });
  const body = base64url(payload);
  return `${body}.${sign(body)}`;
}

export function readSessionCookieValue(value) {
  if (!value) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed?.uid || !parsed?.email || !parsed?.exp) return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
