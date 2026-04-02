import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3100";
const email = process.argv[3] || "superadmin@flow-aymen.app";
const password = process.argv[4] || "FlowAdmin!k0ql3mA7";
const stamp = `audit-${Date.now()}`;

const findings = [];
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

function record(area, status, detail) {
  findings.push({ area, status, detail });
}

async function clickNav(page, label) {
  const textMatch = page.locator(".sb .ni").filter({ hasText: label }).first();
  if (await textMatch.isVisible().catch(() => false)) {
    await textMatch.click();
    return;
  }
  const titleMatch = page.locator(`.sb .ni[title="${label}"]`).first();
  await titleMatch.click();
}

async function expectVisible(page, selector, area, detail) {
  const visible = await page.locator(selector).first().isVisible().catch(() => false);
  record(area, visible ? "ok" : "fail", detail);
  return visible;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => {
    return Boolean(document.querySelector("#a-email"))
      || document.body.innerText.includes("Tableau de bord")
      || document.body.innerText.includes("Connexion")
      || document.body.innerText.includes("Flow");
  }, { timeout: 15000 }).catch(() => {});

  const loginVisible = await page.locator("#a-email").isVisible({ timeout: 5000 }).catch(() => false);
  if (loginVisible) {
    await page.fill("#a-email", email);
    await page.fill("#a-pwd", password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForTimeout(1200);
  }

  const loggedIn = await page.locator("text=Tableau de bord").first().isVisible({ timeout: 5000 }).catch(() => false);
  record("auth.login", loggedIn ? "ok" : "fail", loggedIn ? "Connexion réussie" : "Impossible de se connecter");
  if (!loggedIn) {
    const authError = await page.locator(".auth-err").textContent().catch(() => "");
    const bodyText = ((await page.textContent("body").catch(() => "")) || "").slice(0, 800);
    throw new Error(`Login failed. authErr=${authError} body=${bodyText}`);
  }

  const modules = ["Notes", "Projets", "Calendrier", "Habitudes", "Journal", "Objectifs", "Focus", "Signets", "Finances"];
  for (const label of modules) {
    const visible = await page.locator(".sb .ni").filter({ hasText: label }).first().isVisible().catch(() => false);
    record(`nav.${label.toLowerCase()}`, visible ? "ok" : "fail", visible ? "Module visible dans la navigation" : "Module absent de la navigation");
  }

  await clickNav(page, "Notes");
  await page.getByRole("button", { name: /Nouvelle note/i }).click();
  await page.fill("#m-n-title", `Note ${stamp}`);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForTimeout(500);
  const noteEditorVisible = await page.locator("#ne-t").isVisible().catch(() => false);
  record("notes.create", noteEditorVisible ? "ok" : "fail", noteEditorVisible ? "Création de note ouvre bien l'éditeur" : "La note ne s'ouvre pas après création");
  await page.reload({ waitUntil: "domcontentloaded" });
  await clickNav(page, "Notes");
  const notePersisted = await page.locator(`text=Note ${stamp}`).first().isVisible().catch(() => false);
  record("notes.persistence", notePersisted ? "ok" : "fail", notePersisted ? "La note persiste après refresh" : "La note disparaît après refresh");

  await clickNav(page, "Projets");
  await page.getByRole("button", { name: /Nouvelle tâche/i }).click();
  await page.fill("#m-t-title", `Tache ${stamp}`);
  await page.fill("#m-t-desc", "Audit automatique");
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForTimeout(700);
  const taskVisible = await page.locator(`text=Tache ${stamp}`).first().isVisible().catch(() => false);
  record("kanban.create", taskVisible ? "ok" : "fail", taskVisible ? "La tâche apparaît dans le kanban" : "La tâche n'apparaît pas dans le kanban");

  await clickNav(page, "Calendrier");
  await page.locator(".cal-cell.today").first().click();
  await page.locator(".day-slot-body").first().click();
  await page.fill("#m-e-title", `Event ${stamp}`);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForTimeout(900);
  const eventVisible = await page.locator(`text=Event ${stamp}`).first().isVisible().catch(() => false);
  record("calendar.create", eventVisible ? "ok" : "fail", eventVisible ? "L'événement apparaît dans la vue jour" : "L'événement n'apparaît pas après création");

  await clickNav(page, "Habitudes");
  await page.getByRole("button", { name: /Habitude|Créer une habitude/i }).first().click();
  await page.fill("#m-h-name", `Habitude ${stamp}`);
  await page.getByRole("button", { name: /Ajouter/i }).click();
  await page.waitForTimeout(600);
  const habitVisible = await page.locator(`text=Habitude ${stamp}`).first().isVisible().catch(() => false);
  record("habits.create", habitVisible ? "ok" : "fail", habitVisible ? "L'habitude est visible" : "L'habitude n'apparaît pas");

  await clickNav(page, "Journal");
  await page.getByRole("button", { name: /Entrée|Écrire aujourd'hui/i }).first().click();
  await page.fill("#j-text", `Journal ${stamp}`);
  await page.fill("#j-gratitude", "Gratitude test");
  await page.waitForTimeout(700);
  await page.reload({ waitUntil: "domcontentloaded" });
  await clickNav(page, "Journal");
  const journalVisible = await page.locator(`text=Journal ${stamp}`).first().isVisible().catch(() => false);
  record("journal.persistence", journalVisible ? "ok" : "fail", journalVisible ? "L'entrée de journal persiste après refresh" : "L'entrée de journal disparaît après refresh");

  await clickNav(page, "Objectifs");
  await page.getByRole("button", { name: /Objectif|Créer un objectif/i }).first().click();
  await page.fill("#m-gl-title", `Objectif ${stamp}`);
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForTimeout(600);
  const goalVisible = await page.locator(`text=Objectif ${stamp}`).first().isVisible().catch(() => false);
  record("goals.create", goalVisible ? "ok" : "fail", goalVisible ? "L'objectif apparaît" : "L'objectif n'apparaît pas");

  await clickNav(page, "Focus");
  const focusVisible = await expectVisible(page, ".focus-display", "focus.load", "Le minuteur Focus doit s'afficher");
  if (focusVisible) {
    await page.locator(".focus-btn-main").click();
    await page.waitForTimeout(1200);
    const running = await page.locator("text=EN COURS").isVisible().catch(() => false);
    record("focus.start", running ? "ok" : "fail", running ? "Le minuteur démarre" : "Le minuteur ne démarre pas");
  }

  await clickNav(page, "Signets");
  await page.getByRole("button", { name: /Signet|Créer un signet/i }).first().click();
  await page.getByRole("button", { name: "Texte" }).click();
  await page.fill("#m-bm-title", `Bookmark ${stamp}`);
  await page.fill("#m-bm-text", "Contenu de test");
  await page.getByRole("button", { name: /Ajouter/i }).click();
  await page.waitForTimeout(700);
  const bookmarkVisible = await page.locator(`text=Bookmark ${stamp}`).first().isVisible().catch(() => false);
  record("bookmarks.create", bookmarkVisible ? "ok" : "fail", bookmarkVisible ? "Le signet apparaît" : "Le signet n'apparaît pas");

  await clickNav(page, "Finances");
  await page.getByRole("button", { name: /Transaction|Ajouter une transaction/i }).first().click();
  await page.fill("#m-tx-desc", `Finance ${stamp}`);
  await page.fill("#m-tx-amt", "42");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await page.waitForTimeout(700);
  const financeVisible = await page.locator(`text=Finance ${stamp}`).first().isVisible().catch(() => false);
  record("finance.create", financeVisible ? "ok" : "fail", financeVisible ? "La transaction apparaît" : "La transaction n'apparaît pas");
} finally {
  await browser.close();
}

for (const finding of findings) {
  console.log(`[${finding.status.toUpperCase()}] ${finding.area}: ${finding.detail}`);
}

if (consoleErrors.length) {
  console.log(`\nConsole errors (${consoleErrors.length})`);
  consoleErrors.slice(0, 20).forEach((entry) => console.log(`- ${entry}`));
}

if (pageErrors.length) {
  console.log(`\nPage errors (${pageErrors.length})`);
  pageErrors.slice(0, 20).forEach((entry) => console.log(`- ${entry}`));
}

if (networkErrors.length) {
  console.log(`\nNetwork errors (${networkErrors.length})`);
  [...new Set(networkErrors)].slice(0, 20).forEach((entry) => console.log(`- ${entry}`));
}

const hasFailure = findings.some((finding) => finding.status === "fail") || consoleErrors.length || pageErrors.length;
process.exit(hasFailure ? 1 : 0);
