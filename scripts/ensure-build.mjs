import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const appPathsManifest = join(process.cwd(), ".next", "server", "app-paths-manifest.json");
const pagesManifest = join(process.cwd(), ".next", "server", "pages-manifest.json");
const middlewareManifest = join(process.cwd(), ".next", "server", "middleware-manifest.json");
const notFoundTrace = join(process.cwd(), ".next", "server", "app", "_not-found", "page.js.nft.json");

function hasValidBuild() {
  return existsSync(appPathsManifest) && existsSync(pagesManifest) && existsSync(middlewareManifest) && existsSync(notFoundTrace);
}

if (!hasValidBuild()) {
  console.log("Build Next incomplet detecte, regeneration de .next...");
  rmSync(join(process.cwd(), ".next"), { recursive: true, force: true });
  execSync("npm run build", {
    stdio: "inherit",
  });
}
