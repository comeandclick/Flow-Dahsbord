import { readFileSync } from "node:fs";

const ENV_PATH = new URL("../.env.local", import.meta.url);

function parseEnv(raw) {
  return raw
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .reduce((acc, line) => {
      const idx = line.indexOf("=");
      acc[line.slice(0, idx)] = line.slice(idx + 1);
      return acc;
    }, {});
}

const env = parseEnv(readFileSync(ENV_PATH, "utf8"));
const oldStoreUrl = "https://jsonblob.com/api/jsonBlob/019d3a80-c814-7f55-8c6a-5b3674bc36e5";

process.env.FLOW_STORE_URL = env.FLOW_STORE_URL;
process.env.FLOW_SESSION_SECRET = env.FLOW_SESSION_SECRET;
process.env.FLOW_PASSWORD_PEPPER = env.FLOW_PASSWORD_PEPPER;
process.env.FLOW_DATA_SECRET = env.FLOW_DATA_SECRET;

const [{ writeStore }, { normalizeDb }] = await Promise.all([
  import("../lib/remote-store.js"),
  import("../lib/schema.js"),
]);

const response = await fetch(oldStoreUrl, {
  cache: "no-store",
  headers: { Accept: "application/json" },
});

if (!response.ok) {
  throw new Error(`Unable to read legacy store (${response.status})`);
}

const legacy = await response.json();
const users = Array.isArray(legacy?.users) ? legacy.users : [];

const migrated = {
  users: users.map((user) => ({
    ...user,
    passwordVersion: user.passwordVersion || 1,
    db: normalizeDb(user.db, user),
  })),
};

await writeStore(migrated);
console.log(`Migrated ${migrated.users.length} users to encrypted store.`);
