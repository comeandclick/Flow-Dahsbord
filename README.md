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

### 1.22.41

- **Date** : 04/04/2026 19:45
- **Résumé** : Flow ajoute une variante publique Aurora sur un lien dédié, sans toucher au site principal ni aux comptes existants.

- **Nouvelle variante Aurora accessible sur un lien dédié** : Le site principal garde sa DA actuelle tandis qu’une seconde entrée publique expose exactement la même app sur `/aurora` avec une identité visuelle distincte.
- **Theme Aurora sombre et clair injecté comme skin** : La variante Aurora applique une nouvelle palette, des rayons plus généreux, des surfaces plus profondes et des états interactifs plus lumineux sans casser les réglages du reste de l’app.
- **Même backend, mêmes comptes, mêmes fonctionnalités** : La nouvelle entrée réutilise la même application Flow et les mêmes APIs, ce qui garde la connexion, les données et les modules alignés entre les deux liens.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
