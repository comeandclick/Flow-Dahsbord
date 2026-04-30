import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const appPathsManifest = join(process.cwd(), ".next", "server", "app-paths-manifest.json");
const pagesManifest = join(process.cwd(), ".next", "server", "pages-manifest.json");
const middlewareManifest = join(process.cwd(), ".next", "server", "middleware-manifest.json");

function hasValidBuild() {
  return existsSync(appPathsManifest) && existsSync(pagesManifest) && existsSync(middlewareManifest);
}

if (!hasValidBuild()) {
  console.log("Build Next incomplet detecte, regeneration de .next...");
  execSync("rm -rf .next", {
    stdio: "inherit",
  });
  execSync("npm run build", {
    stdio: "inherit",
  });
}
