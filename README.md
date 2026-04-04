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

### 1.22.43

- **Date** : 04/04/2026 22:54
- **Résumé** : Flow ajoute `/atelier`, une nouvelle variante premium repartie du brief produit, tout en renforçant la QA utilisateur et la fiabilité du chargement client.

- **Nouvelle route publique `/atelier`** : La variante Atelier repart du brief produit et du code fonctionnel existant pour proposer un environnement visuel totalement distinct, sans changer les comptes, les données ni les modules.
- **Thème Atelier entièrement séparé** : Sidebar, shell, cartes, topbar, auth et composants principaux ont reçu une identité plus chaleureuse et habitable, indépendante des variantes déjà créées.
- **QA utilisateur renforcée et bug middleware corrigé** : Un script `check:ux` et le skill `flow-user-qa` valident les routes clés en desktop/mobile, tandis que le middleware n’intercepte plus les chunks statiques Next.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
