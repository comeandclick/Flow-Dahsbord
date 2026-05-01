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

### 1.24.4

- **Date** : 01/05/2026 23:32
- **Résumé** : Refinement UI des pages de login admin et page d'accueil principale, avec améliorations de la charte graphique sombre et cohérence visuelle cross-app.

- **Refinement page login admin** : Mise à jour de la charte graphique et de la cohérence visuelle sur /admin/login avec le reste de l'application.
- **Refinement page d'accueil** : Amélioration de la présentation de la page principale avec alignement visual et matière premium sombre.
- **Cohérence visuelle cross-app** : Unification des composants, gradients et effets visuels entre la page d'accueil, le login admin et le dashboard principal.
- **Responsivité mobile améliorée** : Optimisation de la densité et de l'adaptation mobile sur toutes les pages publiques et authentifiées.
- **Journal de version à jour** : Synchronisation du journal de version avec les changements réels et les modifications apportées.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

Journal détaillé : [/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md](/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md)

## Déploiement

- Production : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-core-public-04291307.vercel.app/admin/login](https://flow-core-public-04291307.vercel.app/admin/login)
