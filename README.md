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

### 1.24.0

- **Date** : 01/05/2026 11:06
- **Résumé** : Flow pousse maintenant un shell plus propre avec paramètres structurés, Shopify par compte et un mode de remplissage de démo pour accélérer le développement sans toucher aux vraies boutiques.

- **Paramètres et shell structurés** : La page Paramètres est réorganisée en sections stables, les couches du shell restent devant et les parcours profil / apparence / intégrations sont regroupés proprement.
- **Shopify par compte** : Chaque utilisateur peut maintenant brancher sa propre boutique, voir son état de connexion et utiliser un écran commandes séparé sans dépendre d'une configuration globale.
- **Remplissage de démo contrôlé** : Un bouton de développement peut injecter des données cohérentes pour accélérer les tests visuels, sans écraser une vraie boutique Shopify déjà connectée.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-core-public-04291307.vercel.app/admin/login](https://flow-core-public-04291307.vercel.app/admin/login)
