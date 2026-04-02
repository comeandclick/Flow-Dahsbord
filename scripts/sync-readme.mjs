import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RELEASE } from "../lib/release.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const readmePath = join(repoRoot, "README.md");

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

const readme = `# Flow Dashbord

Site principal : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)

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

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : \`npm run build\`
- Publication release : \`npm run publish:release\`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
`;

writeFileSync(readmePath, readme, "utf8");
console.log("README.md synchronisé.");
