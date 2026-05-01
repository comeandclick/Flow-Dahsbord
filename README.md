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

### 1.24.3

- **Date** : 01/05/2026 15:41
- **Résumé** : Flow ajoute maintenant un vrai journal de version dédié, renforce encore le fond animé commun et améliore la tenue mobile de la sidebar sans toucher aux comptes ni au store.

- **Réorganisation du dashboard** : Les cartes principales, les blocs de focus et les mini-blocs du dashboard peuvent maintenant être déplacés sans trous, avec persistance sur le compte.
- **Matière visuelle renforcée** : Les cartes partagent maintenant un rendu plus uniforme en gradient, opacité, glow et blur sur le shell, le dashboard et Shopify.
- **Thème clair assombri** : Le mode clair reste lumineux mais ne bascule plus vers un blanc trop froid, avec une base plus minérale et plus cohérente avec le dark.
- **Mobile bloc par bloc** : La sidebar mobile et la densité générale tiennent mieux dans le viewport, mais il reste encore des ajustements fins à faire sur certains panneaux, tables et hauteurs de contenu.
- **Journal de version dédié** : Chaque push important laisse maintenant aussi une trace lisible dans un fichier dédié, en plus du popup et du README.
- **Nettoyage final et mémoire IA** : Quand la todo produit sera vraiment finie, il faudra trier les fichiers inutiles et finaliser une mémoire compacte pour la prochaine IA.

Ce bloc est régénéré automatiquement depuis `/Users/aymen/Documents/Flow Dashbord/lib/release.js` via `/Users/aymen/Documents/Flow Dashbord/scripts/sync-readme.mjs`.

Journal détaillé : [/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md](/Users/aymen/Documents/Flow Dashbord/docs/version-journal.md)

## Déploiement

- Production : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- Build local : `npm run build`
- Publication release : `npm run publish:release`

## Lien admin

[https://flow-core-public-04291307.vercel.app/admin/login](https://flow-core-public-04291307.vercel.app/admin/login)
