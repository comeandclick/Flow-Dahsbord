import { chromium } from "playwright";

const targetUrl = process.argv[2] || process.env.FLOW_URL || "http://127.0.0.1:3100";
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("pageerror", (error) => {
  errors.push(`pageerror: ${error.message}`);
});

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});

try {
  const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response || !response.ok()) {
    errors.push(`http: chargement invalide pour ${targetUrl}`);
  }

  await page.waitForTimeout(1500);
  const bodyText = (await page.textContent("body")) || "";
  if (bodyText.includes("Application error: a client-side exception has occurred")) {
    errors.push("fallback: message d'exception client detecte dans la page");
  }
  if (bodyText.includes("Recuperation Flow") || bodyText.includes("Flow a rencontre un souci cote interface")) {
    errors.push("fallback: ecran de recuperation Flow detecte dans la page");
  }

  const hasFlow = await page.locator("text=Flow").first().isVisible().catch(() => false);
  if (!hasFlow) {
    errors.push("ui: le mot Flow n'est pas visible apres chargement");
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`Client smoke failed for ${targetUrl}`);
  errors.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log(`Client smoke passed for ${targetUrl}`);
