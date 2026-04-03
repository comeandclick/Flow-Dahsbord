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

### 1.22.33

- **Date** : 03/04/2026 12:15
- **Résumé** : Flow nettoie le périmètre visible, stabilise l’entrée admin et rend le dashboard admin plus lisible avec une vraie zone données live.

- **Périmètre visible resserré** : Journal et Finance sortent du routing visible Flow sans suppression des données stockées ni des backups existants.
- **Zone données live admin** : Le dashboard admin expose maintenant un panneau dédié au compte sélectionné avec profil, sécurité, forfait, activité et volumes module par module.
- **Entrée admin stabilisée** : La page de connexion admin ne dépend plus du traducteur DOM pour ses textes critiques et reste plus stable côté focus et rendu.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
