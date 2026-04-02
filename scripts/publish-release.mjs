import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const PROD_ALIAS = "https://flow-online-aymen.vercel.app";

if (existsSync(".env.local")) {
  const rawEnv = readFileSync(".env.local", "utf8");
  rawEnv.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  });
}

const token = process.env.FLOW_SESSION_SECRET;

if (!token) {
  console.error("FLOW_SESSION_SECRET manquant.");
  process.exit(1);
}

try {
  execSync("node scripts/sync-readme.mjs", { stdio: "inherit" });
  execSync("vercel --prod --yes", { stdio: "inherit" });

  const response = await fetch(`${PROD_ALIAS}/api/release/announce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-flow-release-token": token,
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Annonce release impossible");
  }

  console.log(`Annonce envoyee a ${payload.delivered} utilisateur(s).`);
} catch (error) {
  console.error(error.message || "Publication release impossible");
  process.exit(1);
}
