# Journal de version

Ce fichier est mis à jour à chaque push significatif et chaque mise en ligne.

## Version actuelle

- **Version** : 1.25.3
- **Date** : 02/05/2026 01:27
- **Site** : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- **Résumé** : Flow remet les notifications et la recherche en vrais popups opaques au premier plan, sans pousser la page, et simplifie l’admin avec une navigation plus directe et sans panneaux bloqués.

## État de la passe

- **Terminé** · Refonte glassmorphism complète : Tous les éléments du site adoptent maintenant le design glassmorphism : sidebar, dashboard, boutons, inputs, cartes, panneaux et topbar dans une cohérence visuelle totale.
- **Terminé** · Nouvelle palette de couleurs : Remplacement complet de l'ancienne palette par le système sombre premium avec surfaces homogènes, coins arrondis et meilleure tenue du thème clair.
- **Terminé** · Unification des effets visuels : Backdrop-filter, shadows, glow et animations sont appliqués uniformément, avec un halo immersif lissé pour éviter les traits et le rendu pixelisé.
- **Terminé** · Design responsive glassmorphism : La DA reste cohérente sur mobile, tablette et desktop, avec sidebar, blocs et Shopify ajustés pour mieux tenir dans le viewport.
- **Terminé** · Shopify simplifié : La connexion Shopify se fait maintenant en deux champs séparés et le module guide l’utilisateur pour récupérer son domaine et son token Admin API.
- **Terminé** · Blocage Flow séparé de l’admin : Bloquer un compte Flow n’empêche plus la connexion admin du même compte, et les comptes existants ont été débloqués côté Flow.
- **Terminé** · Popups Flow corrigés : Les notifications et la recherche s’ouvrent maintenant au premier plan, sous leurs boutons, avec un fond opaque et sans déplacer le site.
- **Terminé** · Admin simplifié : Le dashboard admin ouvre une seule section à la fois avec des raccourcis d’accueil pour éviter les superpositions et les zones bloquées.

## Règles

- Toujours mettre à jour ce fichier avant un push important.
- Toujours garder cohérents `lib/release.js`, `README.md`, `HANDOVER.md`, `MEMORY.md` et la roadmap.
- Ne jamais perdre les comptes ni les données utilisateurs pendant une mise à jour.
