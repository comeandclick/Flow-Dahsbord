import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = resolve(fileURLToPath(import.meta.url), "..", "..", "scripts");
const envPath = resolve(__dirname, "..", ".env.production.local");

function parseEnv(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return acc;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      acc[key] = value.replace(/(^"|"$)/g, "");
      return acc;
    }, {});
}

function normalizeEmail(email) {
  return `${email || ""}`.trim().toLowerCase();
}

async function main() {
  const raw = await readFile(envPath, "utf8");
  const env = parseEnv(raw);
  Object.assign(process.env, env);

  const { hashPassword } = await import("../lib/auth.js");
  const { readStore, writeStore } = await import("../lib/remote-store.js");
  const { createEmptyDb } = await import("../lib/schema.js");

  const email = normalizeEmail("aymenfadil264@gmail.com");
  const password = "10122009.2644.Aymen";
  const name = "Aymen Fadil";

  function normalizePermissionList(list) {
    return [...new Set((Array.isArray(list) ? list : []).filter((item) => {
      const value = `${item || ""}`;
      return [
        "dashboard.read",
        "users.read",
        "users.manage",
        "messages.send",
        "accounts.block",
        "accounts.reset_password",
        "accounts.delete",
        "admins.read",
        "admins.create",
        "admins.manage",
        "email.send",
        "exports.csv",
      ].includes(value);
    }))];
  }

  function buildAdminSpec(input = {}) {
    const role = `${input?.role || "admin"}` === "super_admin" ? "super_admin" : "admin";
    return {
      enabled: true,
      role,
      permissions: role === "super_admin"
        ? [
            "dashboard.read",
            "users.read",
            "users.manage",
            "messages.send",
            "accounts.block",
            "accounts.reset_password",
            "accounts.delete",
            "admins.read",
            "admins.create",
            "admins.manage",
            "email.send",
            "exports.csv",
          ]
        : normalizePermissionList(input?.permissions),
      grantedAt: new Date().toISOString(),
      grantedBy: `${input?.grantedBy || "system"}`.slice(0, 80),
    };
  }

  if (!email || !password) {
    throw new Error("Missing email or password for admin creation.");
  }

  const store = await readStore();
  let account = store.users.find((entry) => normalizeEmail(entry.email) === email);

  const hashed = hashPassword(password);

  if (account) {
    console.log(`Compte existant trouvé pour ${email}, mise à jour des droits admin et du mot de passe.`);
    account.name = name;
    account.hash = hashed.hash;
    account.salt = hashed.salt;
    account.passwordVersion = hashed.passwordVersion;
    account.status = "active";
    account.admin = buildAdminSpec({ role: "super_admin", grantedBy: "system" });
    account.lastSeenAt = new Date().toISOString();
  } else {
    const uid = randomUUID();
    const now = new Date().toISOString();
    account = {
      uid,
      name,
      email,
      hash: hashed.hash,
      salt: hashed.salt,
      passwordVersion: hashed.passwordVersion,
      status: "active",
      loginCount: 0,
      createdAt: now,
      lastLoginAt: "",
      lastSeenAt: now,
      db: createEmptyDb(),
      admin: buildAdminSpec({ role: "super_admin", grantedBy: "system" }),
    };
    account.db.profile = {
      ...account.db.profile,
      name,
      email,
      fullName: name,
    };
    store.users.push(account);
    console.log(`Nouveau compte admin créé pour ${email}.`);
  }

  await writeStore(store);
  console.log("Compte admin enregistré avec succès.");
  console.log(`UID: ${account.uid}`);
  console.log(`Email: ${account.email}`);
  console.log(`Role: ${account.admin.role}`);
}

main().catch((error) => {
  console.error("Erreur lors de la création de l’admin:\n", error);
  process.exit(1);
});