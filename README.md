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

### 1.22.40

- **Date** : 04/04/2026 16:58
- **Résumé** : Flow adopte une nouvelle direction visuelle, stabilise le menu latéral et nettoie enfin la recherche Ctrl+K.

- **Shell premium retravaillé sur tout le site** : Le fond, les cartes, la sidebar et la topbar passent sur un rendu plus premium et plus stable, sans halo agressif ni effet d’ampoule défectueuse.
- **Sidebar hover / lock fiabilisée et mémorisée** : Le menu ne se ferme plus au clic en mode desktop ouvert, se referme seulement à la sortie du hover, et retient maintenant l’état verrouillé ou déverrouillé entre les visites.
- **Command palette animée et résultats épurés** : Ctrl+K gagne une animation d’entrée et de sortie, retire les doublons de navigation et affiche des aperçus plus utiles dans les résultats.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

## Déploiement

- Production : [https://flow-online-aymen.vercel.app](https://flow-online-aymen.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-online-aymen.vercel.app/admin/login](https://flow-online-aymen.vercel.app/admin/login)
