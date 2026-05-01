# Journal de version

Ce fichier est mis à jour à chaque push significatif et chaque mise en ligne.

## Version actuelle

- **Version** : 1.24.3
- **Date** : 01/05/2026 15:41
- **Site** : [https://flow-core-public-04291307.vercel.app](https://flow-core-public-04291307.vercel.app)
- **Résumé** : Flow ajoute maintenant un vrai journal de version dédié, renforce encore le fond animé commun et améliore la tenue mobile de la sidebar sans toucher aux comptes ni au store.

## État de la passe

- **Terminé** · Réorganisation du dashboard : Les cartes principales, les blocs de focus et les mini-blocs du dashboard peuvent maintenant être déplacés sans trous, avec persistance sur le compte.
- **Terminé** · Matière visuelle renforcée : Les cartes partagent maintenant un rendu plus uniforme en gradient, opacité, glow et blur sur le shell, le dashboard et Shopify.
- **Terminé** · Thème clair assombri : Le mode clair reste lumineux mais ne bascule plus vers un blanc trop froid, avec une base plus minérale et plus cohérente avec le dark.
- **En cours** · Mobile bloc par bloc : La sidebar mobile et la densité générale tiennent mieux dans le viewport, mais il reste encore des ajustements fins à faire sur certains panneaux, tables et hauteurs de contenu.
- **Terminé** · Journal de version dédié : Chaque push important laisse maintenant aussi une trace lisible dans un fichier dédié, en plus du popup et du README.
- **En cours** · Authentification et stockage : corriger la création/connexion de compte et s'assurer que les données utilisateurs persistent entre les mises à jour.
- **À faire** · Nettoyage final et mémoire IA : Quand la todo produit sera vraiment finie, il faudra trier les fichiers inutiles et finaliser une mémoire compacte pour la prochaine IA.

## Règles

- Toujours mettre à jour ce fichier avant un push important.
- Toujours garder cohérents `lib/release.js`, `README.md`, `HANDOVER.md`, `MEMORY.md` et la roadmap.
- Ne jamais perdre les comptes ni les données utilisateurs pendant une mise à jour.
