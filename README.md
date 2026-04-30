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

### 1.23.6

- **Date** : 30/04/2026 00:14
- **Résumé** : Le shell Flow bloque désormais la page dans le viewport, densifie le dashboard utilisateur, assombrit le thème clair et donne à Shopify des filtres période plus propres.

- **Shell verrouillé et couches nettoyées** : La page principale ne scrolle plus, les popups restent au premier plan et la sidebar fermée desktop n'affiche plus que la photo ou l'initiale.
- **Dashboard recentré sur le compte** : Les cartes du haut deviennent cliquables, parlent des données utilisateur et le contenu du dashboard enlève une bonne partie des textes inutiles.
- **Shopify piloté par période** : Les filtres Aujourd'hui, Hier, 7 jours, 1 mois, 1 an et Depuis toujours pilotent maintenant le widget dashboard, les KPI, le graphique et les dernières commandes.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
