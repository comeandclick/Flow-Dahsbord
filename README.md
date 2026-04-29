# Flow Dashbord

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

### 1.23.4

- **Date** : 29/04/2026 20:32
- **Résumé** : Le shell Flow unifie mieux sa matière visuelle et stabilise le module Shopify avec des routes Vercel propres, un état de config silencieux et le même écran dédié.

- **Matière visuelle unifiée sur tous les blocs** : Les cartes, panneaux et surfaces utilisent maintenant une même couche gradient / opacité / blur plus proche de la référence trafic sombre.
- **Nouveau module Shopify isolé du reste** : Ajout d’une entrée Shopify dans la navigation, d’un widget dashboard et d’un écran dédié avec KPIs, graphique, commandes récentes et top produits.
- **Routes Shopify stabilisées pour Vercel** : Le callback OAuth et le proxy Shopify passent maintenant par des handlers Next API sans conflit de route, avec état de configuration propre avant l’ajout du token.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
