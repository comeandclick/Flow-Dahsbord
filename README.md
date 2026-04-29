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

### 1.23.5

- **Date** : 29/04/2026 21:12
- **Résumé** : Le shell Flow allège son auth, garde la continuité des comptes, ajoute un fond importable par thème et enrichit le dashboard plus Shopify sans casser le store utilisateur.

- **Auth et démarrage allégés** : La session hydrate d’abord le compte puis charge le reste en arrière-plan, avec un écran d’attente réduit et sans réinitialiser les données utilisateurs.
- **Fond personnalisable par thème** : Depuis Profil / Paramètres, l’utilisateur peut importer un fond pour le thème actif puis le retirer pour revenir au fond de base.
- **Dashboard et Shopify enrichis** : Ajout d’actions rapides, filtres 7/30 jours, filtres commandes, rafraîchissement manuel et rendu plus dense sur les cartes et panneaux.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
