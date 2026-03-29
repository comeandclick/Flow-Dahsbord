import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { FLOW_DATA_SECRET } from "./server-config.js";

const ALGO = "aes-256-gcm";

function getKey() {
  return createHash("sha256").update(FLOW_DATA_SECRET).digest();
}

export function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 2,
    encrypted: true,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: encrypted.toString("base64url"),
  };
}

export function decryptJson(value) {
  if (!value?.encrypted) {
    return value;
  }

  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(value.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
