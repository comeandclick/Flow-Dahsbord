# Flow Dashbord

Site principal : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)

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

### 1.24.1

- **Date** : 01/05/2026 11:43
- **Résumé** : Flow rend maintenant le dashboard plus utile au compte connecté, densifie la page Paramètres et garde Shopify pilotable par utilisateur sans casser l’auth ni la persistance.

- **Dashboard recentré sur le compte** : Les cartes et panneaux parlent davantage des tâches, événements, notifications, notes et signaux réels du compte au lieu du produit Flow lui-même.
- **Paramètres densifiés** : La page Paramètres couvre maintenant compte, apparence, sécurité, intégrations, billing, notifications, langue, raccourcis et options avancées dans une structure plus proche d’une vraie settings app.
- **Shopify par compte gardé intact** : Le statut vide, la connexion boutique et le flux commandes restent cohérents par utilisateur, sans toucher aux boutiques déjà reliées ni aux données persistées.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-core-public-04291307.vercel.app/admin/login](https://flow-core-public-04291307.vercel.app/admin/login)
