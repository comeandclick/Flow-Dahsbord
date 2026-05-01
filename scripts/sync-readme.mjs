import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RELEASE } from "../lib/release.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const readmePath = join(repoRoot, "README.md");
const versionJournalPath = join(repoRoot, "docs", "version-journal.md");
const SITE_URL = "https://flow-core-public-04291307.vercel.app";

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const latestChanges = (Array.isArray(RELEASE.changes) ? RELEASE.changes : [])
  .map((change) => `- **${change.title}** : ${change.subtitle}`)
  .join("\n");

const statusLines = (Array.isArray(RELEASE.changes) ? RELEASE.changes : [])
  .map((change) => {
    const label = change.status === "done" ? "Terminé" : change.status === "wip" ? "En cours" : "À faire";
    return `- **${label}** · ${change.title} : ${change.subtitle}`;
  })
  .join("\n");

const readme = `# Flow Dashbord

Site principal : [${SITE_URL}](${SITE_URL})

## But du projet

Flow Dashbord est un SaaS de productivité tout-en-un pensé pour centraliser un workspace personnel et collaboratif dans une seule interface premium.

Le projet regroupe :
- un espace utilisateur Flow complet
- un dashboard admin relié au même backend
- une authentification classique + Google
- des réglages de compte et de thème
- la persistance distante chiffrée
- une base d’abonnement Stripe
- une logique PWA, notifications et modules métier

## Modules principaux

- Dashboard
- Notes
- Projects / Kanban
- Calendar
- Discussions
- Habits
- Goals
- Focus Timer
- Bookmarks
- Settings / Account
- Admin Dashboard

## Fonctionnalités

- application responsive PC / tablette / téléphone
- dark mode et light mode
- animation d’entrée Flow
- création de compte, connexion, déconnexion
- mot de passe oublié par email
- connexion Google
- sauvegarde distante du workspace
- paramètres de profil, photo, pseudo, langue, thème
- backup export / import
- notifications et push
- gestion admin des comptes, conversations et signalements
- facturation et portail client Stripe

## Stack

- Next.js
- React
- Vercel
- Stripe
- Brevo SMTP
- Web Push
- JSONBlob chiffré côté serveur

## Journal de version

### ${RELEASE.version}

- **Date** : ${formatDate(RELEASE.deployedAt)}
- **Résumé** : ${RELEASE.summary}

${latestChanges}

Ce bloc est régénéré automatiquement depuis \`/Users/aymen/Documents/Flow Dashbord/lib/release.js\` via \`/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs\`.

Journal détaillé : [/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md](/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md)

## Déploiement

- Production : [${SITE_URL}](${SITE_URL})
- Build local : \`npm run build\`
- Publication release : \`npm run publish:release\`

## Lien admin

[${SITE_URL}/admin/login](${SITE_URL}/admin/login)
`;

const versionJournal = `# Journal de version

Ce fichier est mis à jour à chaque push significatif et chaque mise en ligne.

## Version actuelle

- **Version** : ${RELEASE.version}
- **Date** : ${formatDate(RELEASE.deployedAt)}
- **Site** : [${SITE_URL}](${SITE_URL})
- **Résumé** : ${RELEASE.summary}

## État de la passe

${statusLines}

## Règles

- Toujours mettre à jour ce fichier avant un push important.
- Toujours garder cohérents \`lib/release.js\`, \`README.md\`, \`HANDOVER.md\`, \`MEMORY.md\` et la roadmap.
- Ne jamais perdre les comptes ni les données utilisateurs pendant une mise à jour.
`;

writeFileSync(readmePath, readme, "utf8");
writeFileSync(versionJournalPath, versionJournal, "utf8");
console.log("README.md et version-journal.md synchronisés.");
