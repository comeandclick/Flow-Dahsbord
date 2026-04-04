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

### 1.22.42

- **Date** : 04/04/2026 19:45
- **Résumé** : Flow transforme `/aurora` en vraie variante Apple-like, avec une refonte visuelle complète sans changer les fonctionnalités ni les comptes.

- **La route `/aurora` devient une variante Apple-like** : Le lien dédié garde exactement les mêmes modules et le même backend, mais bascule désormais sur une identité visuelle beaucoup plus proche d’une app Apple.
- **Shell, sidebar et surfaces complètement refondus** : La variante abandonne l’ancien rendu Aurora pour des matériaux verre, des contrastes plus doux, des formes plus organiques et des composants repensés dans un langage Apple-like.
- **Compatibilité fonctionnelle conservée** : La refonte reste purement visuelle: les comptes, les données, les APIs et les fonctionnalités restent identiques entre le site principal et la variante `/aurora`.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
