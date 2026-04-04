import { chromium } from "playwright";

const baseUrl = (process.argv[2] || process.env.FLOW_URL || "http://127.0.0.1:3100").replace(/\/$/, "");

const ROUTES = [
  { path: "/", label: "main" },
  { path: "/aurora", label: "aurora" },
  { path: "/atelier", label: "atelier" },
  { path: "/admin/login", label: "admin-login" },
];

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 960, isMobile: false },
  { label: "mobile", width: 393, height: 852, isMobile: true },
];

const errors = [];

function pushError(routeLabel, viewportLabel, message) {
  errors.push(`[${routeLabel}][${viewportLabel}] ${message}`);
}

async function waitForStableShell(page) {
  await page.waitForTimeout(2200);
  await page.locator("body").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
}

async function assertNoCrash(page, routeLabel, viewportLabel) {
  const bodyText = (await page.textContent("body").catch(() => "")) || "";
  if (bodyText.includes("Application error: a client-side exception has occurred")) {
    pushError(routeLabel, viewportLabel, "fallback Next.js detecte");
  }
  if (bodyText.includes("Recuperation Flow") || bodyText.includes("Flow a rencontre un souci cote interface")) {
    pushError(routeLabel, viewportLabel, "ecran de recuperation Flow detecte");
  }
}

async function assertNoHorizontalOverflow(page, routeLabel, viewportLabel) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  }).catch(() => 0);
  if (overflow > 2) {
    pushError(routeLabel, viewportLabel, `overflow horizontal detecte (${overflow}px)`);
  }
}

async function assertLandingVisible(page, routeLabel, viewportLabel) {
  const hasFlow = await page.locator("text=Flow").first().isVisible().catch(() => false);
  const hasAuth = await page.locator(".auth-card").first().isVisible().catch(() => false);
  const hasAppShell = await page.locator(".app, .main").first().isVisible().catch(() => false);
  if (!hasFlow && !hasAuth && !hasAppShell) {
    pushError(routeLabel, viewportLabel, "shell principal introuvable");
  }
}

async function assertAdminLoginVisible(page, routeLabel, viewportLabel) {
  const hasPassword = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
  const hasEmail = await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false);
  if (!hasPassword || !hasEmail) {
    pushError(routeLabel, viewportLabel, "formulaire admin incomplet");
  }
}

async function checkCommandPalette(page, routeLabel, viewportLabel) {
  const shellVisible = await page.locator(".main").first().isVisible().catch(() => false);
  if (!shellVisible) return;

  await page.keyboard.press("Control+KeyK").catch(() => {});
  const paletteVisible = await page.locator(".cp-overlay .cp-shell").first().isVisible({ timeout: 3000 }).catch(() => false);
  if (!paletteVisible) {
    pushError(routeLabel, viewportLabel, "Ctrl+K n'ouvre pas la command palette");
    return;
  }

  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);
  const stillVisible = await page.locator(".cp-overlay .cp-shell").first().isVisible().catch(() => false);
  if (stillVisible) {
    pushError(routeLabel, viewportLabel, "la command palette ne se ferme pas avec Echap");
  }
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        serviceWorkers: "block",
      });
      const page = await context.newPage();

      page.on("pageerror", (error) => {
        pushError(route.label, viewport.label, `pageerror: ${error.message}`);
      });

      page.on("console", (message) => {
        if (message.type() === "error") {
          pushError(route.label, viewport.label, `console: ${message.text()}`);
        }
      });

      const url = `${baseUrl}${route.path}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
      if (!response || !response.ok()) {
        pushError(route.label, viewport.label, `http invalide pour ${url}`);
      }

      await waitForStableShell(page);
      await assertNoCrash(page, route.label, viewport.label);
      await assertNoHorizontalOverflow(page, route.label, viewport.label);

      if (route.path === "/admin/login") {
        await assertAdminLoginVisible(page, route.label, viewport.label);
      } else {
        await assertLandingVisible(page, route.label, viewport.label);
        await checkCommandPalette(page, route.label, viewport.label);
      }

      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`User journey failed for ${baseUrl}`);
  errors.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log(`User journey passed for ${baseUrl}`);
