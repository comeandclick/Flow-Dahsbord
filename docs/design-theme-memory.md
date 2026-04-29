# Flow - Mémoire de direction visuelle

## Références actives à conserver

- structure dashboard de référence:
  - vue tableau:
    - sidebar gauche
    - header supérieur léger
    - contenu principal avec résumé des données
  - vue immersive:
    - plus de sidebar desktop
    - modules remontés en haut du site
    - panneaux flottants sur fond atmosphérique
- langage visuel principal:
  - noir / graphite / fumé
  - surfaces translucides et légèrement minérales
  - verre sombre doux
  - halos olive / minéraux très subtils
  - grands rayons et coins très arrondis
  - panneaux flottants plus qu’un simple dashboard plat
  - police système Apple / SF Pro like
- variation claire:
  - même structure
  - même hiérarchie
  - mêmes rayons
  - couleurs minérales claires et ivoire
  - garder l’effet premium, ne pas tomber dans un blanc technique froid
  - utiliser le fond granuleux clair comme base

## Fonds à conserver

- sombre:
  - `/public/theme-dark-wave.jpg`
- clair:
  - `/public/theme-light-grain.jpg`

## Règles produit pour la suite

- la page de connexion doit rester minimale:
  - uniquement le bloc d’accès
  - pas de grand texte marketing
  - pas de mur de fonctionnalités
- après connexion, l’utilisateur entre directement dans le dashboard
- deux structures doivent coexister et rester entretenues:
  - `overview`
  - `immersive`
- le choix de structure doit vivre dans `Profil / Paramètres`
- la sidebar desktop:
  - fermée par défaut
  - ouverture au hover
  - verrouillage manuel possible
  - l’état de verrouillage doit être mémorisé
- mobile:
  - ouverture depuis l’extrême gauche
  - drawer latéral
  - toujours forcer la vue `overview`
  - aucun overflow horizontal

## Composants shell déjà demandés

- barre de recherche en haut
- dropdown de recherche
- `Cmd+K` / `Ctrl+K` ouvre une palette centrale
- bouton notifications à droite
- bouton thème tout à droite
- pas d’emojis
- pas de blocs natifs laids laissés au navigateur

## Ce qu’il ne faut plus refaire

- ne pas remettre de grande page d’introduction sur `/`
- ne pas revenir à un thème bleu SaaS générique
- ne pas utiliser des cartes carrées ou des bords trop secs
- ne pas mélanger plusieurs styles de dashboard sans contrôle
- ne pas créer une version claire sans personnalité
