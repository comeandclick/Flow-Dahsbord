import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcryptjs";
import {
  FLOW_PASSWORD_PEPPER,
  FLOW_SESSION_SECRET,
  assertServerConfig,
} from "./server-config.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const PASSWORD_RESET_CODE_TTL_MS = 1000 * 60 * 15;
const OAUTH_STATE_TTL_MS = 1000 * 60 * 15;
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
  if (`${expectedHash || ""}`.startsWith("$2")) {
    return bcrypt.compareSync(password, expectedHash);
  }

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

export function createPasswordResetToken(email) {
  const payload = JSON.stringify({
    v: 1,
    type: "password-reset",
    email: `${email || ""}`.trim().toLowerCase(),
    iat: Date.now(),
    exp: Date.now() + PASSWORD_RESET_TTL_MS,
  });
  const body = base64url(payload);
  return `${body}.${sign(`reset:${body}`)}`;
}

export function createPasswordResetCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export function hashPasswordResetCode(email, code) {
  return sign(`reset-code:${`${email || ""}`.trim().toLowerCase()}:${`${code || ""}`.trim()}`);
}

export function createPasswordResetCodeRecord(email, code = createPasswordResetCode()) {
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  return {
    code,
    record: {
      email: normalizedEmail,
      hash: hashPasswordResetCode(normalizedEmail, code),
      iat: Date.now(),
      exp: Date.now() + PASSWORD_RESET_CODE_TTL_MS,
      tries: 0,
    },
  };
}

export function verifyPasswordResetCodeRecord(record, email, code) {
  if (!record?.hash || !record?.exp) return false;
  const normalizedEmail = `${email || ""}`.trim().toLowerCase();
  if (!normalizedEmail || record.exp < Date.now()) return false;
  const expected = hashPasswordResetCode(normalizedEmail, code);
  try {
    return timingSafeEqual(Buffer.from(`${record.hash}`), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function readPasswordResetToken(value) {
  if (!value) return null;

  const [body, signature] = `${value}`.split(".");
  if (!body || !signature) return null;

  const expected = sign(`reset:${body}`);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (parsed?.type !== "password-reset" || !parsed?.email || !parsed?.exp) return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createOAuthStateToken(provider, returnTo = "/") {
  const payload = JSON.stringify({
    v: 1,
    type: "oauth-state",
    provider: `${provider || ""}`.trim().toLowerCase(),
    returnTo: `${returnTo || "/"}`.trim() || "/",
    iat: Date.now(),
    exp: Date.now() + OAUTH_STATE_TTL_MS,
  });
  const body = base64url(payload);
  return `${body}.${sign(`oauth:${body}`)}`;
}

export function readOAuthStateToken(value) {
  if (!value) return null;

  const [body, signature] = `${value}`.split(".");
  if (!body || !signature) return null;

  const expected = sign(`oauth:${body}`);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (parsed?.type !== "oauth-state" || !parsed?.provider || !parsed?.exp) return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
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
