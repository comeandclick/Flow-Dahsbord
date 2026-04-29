import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const appPathsManifest = join(process.cwd(), ".next", "server", "app-paths-manifest.json");
const pagesManifest = join(process.cwd(), ".next", "server", "pages-manifest.json");

function hasValidBuild() {
  return existsSync(appPathsManifest) && existsSync(pagesManifest);
}

if (!hasValidBuild()) {
  console.log("Build Next incomplet detecte, regeneration de .next...");
  rmSync(join(process.cwd(), ".next"), { recursive: true, force: true });
  execSync("npx -y node@22 ./node_modules/next/dist/bin/next build", {
    stdio: "inherit",
  });
}
