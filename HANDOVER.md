# FLOW DASHBORD - HANDOVER COMPLET

Ce projet doit pouvoir etre repris par un autre compte ChatGPT ou un autre assistant sans rien perdre.

## Emplacement local

- Dossier projet: `/Users/aymen/Documents/Flow Dashbord`

## Site en ligne

- URL principale a conserver: `https://flow-online-aymen.vercel.app`
- URL Vercel de production actuelle: `https://flow-online-aymen.vercel.app`

## Regles absolues

- Ne pas casser la direction visuelle sombre premium deja reprise au 31/03/2026 15:29.
- Ne pas supprimer ni invalider les comptes utilisateurs existants.
- Ne pas perdre les notes, taches, habitudes, objectifs ou autres donnees deja stockees.
- Garder si possible l'alias `https://flow-online-aymen.vercel.app`.
- Toujours verifier l'app de bout en bout apres modification importante.
- Repondre en francais, de facon claire, chaleureuse et concise.

## Regle de continuite obligatoire

- A chaque passe importante, mettre a jour avant de s'arreter:
  - `lib/release.js`
  - `HANDOVER.md`
  - `MEMORY.md`
  - `docs/flow-roadmap-and-spec.md`
  - `docs/fast-modification-strategy.md` si la passe touche la structure / vitesse de modification
- Le badge de version visible dans l'app doit toujours rester sync avec:
  - la nouvelle version
  - la date/heure de la passe
  - les changements `done / wip / todo`
- Ne jamais laisser une prod deployee avec un journal de version ou une memoire en retard sur le code reel.
- Ne jamais redeployer une passe importante sans lancer aussi:
  - `npm run check:client` en local
  - `npm run check:client -- https://flow-online-aymen.vercel.app` apres deploiement si la passe touche le client

## Etat actuel du projet

- Framework: Next.js 15
- Front principal: `app/FlowApp.jsx`
- Middleware securite: `middleware.js`
- Auth serveur:
  - `app/api/auth/register/route.js`
  - `app/api/auth/login/route.js`
  - `app/api/auth/logout/route.js`
  - `app/api/auth/forgot-password/route.js`
  - `app/api/auth/reset-password/route.js`
  - `app/api/auth/google/start/route.js`
  - `app/api/auth/google/callback/route.js`
- Session:
  - cookie signe `flow_session`
  - email precedent memorise dans `localStorage`
- Release:
  - source de verite: `lib/release.js`
  - endpoint: `/api/release/current`
  - annonce push: `/api/release/announce`
- Base distante: JSONBlob chiffre cote serveur
- Admin:
  - route publique `/admin/login`
  - dashboard protege `/admin`
- Version actuelle: `v1.23.2`

## Passe produit 21 - 29/04/2026 18:15

### Fait dans cette passe

- correction visuelle du shell:
  - textes hors palette repris
  - stack typographique uniformisée en système Apple-like
  - débordements et chevauchements nettoyés
- nouvelle mémoire de fond:
  - sombre sur `theme-dark-wave.jpg`
  - clair sur `theme-light-grain.jpg`
- structure du site déplacée dans le profil:
  - `Profil / Paramètres` pilote maintenant `Vue tableau` / `Vue immersive`
  - le dashboard ne porte plus ce switch
- immersive:
  - plus de sidebar sur desktop
  - navigation modules remontée en haut
  - mobile forcé en `tableau`
- navigation:
  - bouton hamburger supprimé sur desktop
  - conservé uniquement sur téléphone
  - sidebar fermée nettoyée pour recentrer les icônes
- animations:
  - entrée shell
  - popups
  - changements de sections
- QA réelle:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:4010` OK
  - audit Playwright desktop OK
  - audit Playwright mobile OK
  - overflow horizontal: `false` desktop + mobile
## Passe produit 20 - 29/04/2026 17:04

### Fait dans cette passe

- page de connexion allégée:
  - plus de grand texte produit
  - uniquement le bloc `connexion / création / mot de passe`
  - bouton Google gardé visible
- shell principal reconstruit après connexion:
  - dashboard comme page d’accueil
  - topbar avec recherche, notifications et switch thème
  - sidebar hover sur desktop
  - verrouillage manuel de la sidebar avec mémorisation
  - drawer mobile depuis la gauche
- recherche:
  - dropdown sous la barre du haut
  - `Cmd+K` / `Ctrl+K` ouvre une palette centrale
  - index unifié sans doublons sur notes, tâches, événements, signets et contacts disponibles
- notifications:
  - panneau flottant inspiré des références
  - lecture unitaire ou globale
- double structure:
  - `overview`
  - `immersive`
  - persistance dans les réglages du compte
- thème:
  - dark et light construits sur la même DA
  - persistance côté compte
- mémoire design ajoutée:
  - `docs/design-theme-memory.md`

## Passe produit 19 - 29/04/2026 13:32

### Fait dans cette passe

- reconstruction du site public sur un socle minimal:
  - creation de compte
  - connexion
  - session persistante
  - reset mot de passe
  - Google auth
  - journal de version
  - detection de mise a jour + notification + rechargement
- suppression de la surface publique monolithique precedente au profit d'une app recentree sur les systemes critiques
- `GET /api/release/current` retourne maintenant aussi `changes`
- build durci:
  - `npm run build` nettoie `.next` avant compilation
  - `scripts/ensure-build.mjs` verifie aussi le manifest `_not-found`
- config Vercel recreee via `vercel.json`
- UX:
  - si Google n'est pas configure, le bouton renvoie maintenant un message explicite `missing-config`
- hygiene repo:
  - suppression des fichiers doublons suffixes ` 2`

### Verification reelle faite

- `npm run build` OK
- `/` OK
- `/admin/login` OK
- `POST /api/auth/register` OK
- `GET /api/session` apres inscription OK
- `POST /api/auth/logout` OK
- `POST /api/auth/login` apres logout OK
- `npm run check:client -- http://127.0.0.1:3100` OK
- audit desktop/mobile sans overflow ni erreur console sur `/` et `/admin/login`

### Etat de la mise en ligne

- GitHub `main` est a jour
- le domaine Vercel officiel reste bloque sur une ancienne build 404 faute de credentials CLI disponibles dans cet environnement
- lien public temporaire et teste:
  - `https://4ed3b96aaf5d8f.lhr.life`
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 15 - 31/03/2026 15:40

### Fait dans cette passe

- dashboard:
  - les filtres `Hier`, `Aujourd'hui`, `Semaine`, `Mois`, `Année` pilotent maintenant vraiment les compteurs visibles
  - le pill de date et le mini-calendrier suivent la periode selectionnee
  - les fleches du mini-calendrier naviguent enfin dans la periode au lieu d'etre decoratives
- auth:
  - correction du flux `mot de passe oublie`
  - l'etat final `mot de passe mis a jour` s'affiche correctement
  - le retour vers la connexion reste coherent apres reset
- clarifications UX:
  - le bouton Google est desactive tant que l'OAuth serveur n'est pas configure
  - cela evite un faux comportement de connexion
- checks locaux:
  - `npm run build` OK

### Mise en ligne

- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-imvsrkcdl-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 14 - 31/03/2026 15:29

### Fait dans cette passe

- direction visuelle:
  - nouveau theme sombre premium avec halo lumineux en haut a gauche
  - shell plus proche des references image 1 / 6 / 7 / 8
  - sidebar compacte retravaillee pour ressembler a une vraie colonne d'app mobile / desktop
- dashboard:
  - header dashboard recompose avec titre, filtres de periode et pill date
  - nouvelles vues `hier`, `aujourd'hui`, `semaine`, `mois`, `annee`
  - cartes KPI et mini calendrier rapproches de la reference image 2
- mobile:
  - dock bas ajoute avec acces direct `Accueil`, `Notes`, `Messages`, `Profil`
  - bouton `+` central ouvrant `Projets`, `Calendrier`, `Habitudes`, `Objectifs`
  - animations d'arrivee et de pression renforcees pour faire plus app native
- profil / notifications:
  - tiroir notifications confirme et garde le switch appareil
  - widget profil du header encore nettoye avec cartes et alignements plus nets
- auth:
  - page connexion / creation retravaillee a la facon de la reference image 3
  - flux `mot de passe oublie` reel ajoute via email avec lien de reset
  - page de nouveau mot de passe absorbee dans l'ecran d'auth via `resetToken`
  - bouton Google garde la place UI mais attend encore les cles OAuth serveur
- references visuelles retenues pour la suite:
  - image 1: theme global premium sombre
  - image 2: structure dashboard + filtres de periode
  - image 3: connexion / creation de compte
  - image 4: popup profil
  - image 5: dock mobile en bas avec plus central
  - image 6: halo lumineux haut gauche
  - images 7 / 8: sidebar fermee compacte
- checks locaux:
  - `npm run build` OK

### Mise en ligne

- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-r76dr71np-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 13 - 31/03/2026 13:53

### Fait dans cette passe

- parametres:
  - en telephone/tablette, la page `Paramètres` passe maintenant en mode liste puis detail
  - cliquer sur `Profil`, `Apparence` ou un autre bloc ouvre la page du reglage selectionne
  - un bouton retour ramene a la liste des reglages au lieu d'afficher le detail sous la liste
- shell:
  - les ouvertures directes vers `Profil`, `Forfait` et `Paramètres` respectent aussi ce nouveau mode d'entree
- checks locaux:
  - `rm -rf .next && npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3300` OK

### Mise en ligne

- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-clrbnrhp0-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 12 - 31/03/2026 13:15

### Fait dans cette passe

- notifications:
  - le bouton cloche ouvre maintenant un tiroir lateral depuis la droite au lieu d'un pop-up
  - la liste des notifications descend bien du haut vers le bas
  - un bouton permet d'activer ou desactiver les notifications sur l'appareil courant
  - l'ouverture du centre ne vide plus automatiquement les notifications lues
- publication:
  - l'annonce de mise a jour est maintenant dedupliquee cote serveur
  - une meme version n'empile plus plusieurs notifications de release
- navigation mobile:
  - la zone de geste `retour / avance` est ecartee du bord utilise par le menu
  - l'ouverture/fermeture de sidebar et l'historique se melangent moins
- profil et parametres:
  - widget profil du header recompose avec icones mieux alignees
  - page Parametres restructuree avec carte profil + groupes de sections a la facon d'une app de messagerie
- animation:
  - panneaux, widgets, tiroirs et boutons gagnent des effets d'arrivee / pression plus propres
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3200` OK

### Mise en ligne

- `npm run build` OK
- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-4uo4tn8tu-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 11 - 31/03/2026 10:38

### Fait dans cette passe

- release:
  - badge version passe en `v1.19.1`
  - journal visible remis en etat final sans cartes `wip / todo` residuelles
  - resume produit resserre sur l'etat reel publie
- continuite:
  - `HANDOVER.md`, `MEMORY.md` et la roadmap resynchronises avec la version publiee
  - la passe precedente reste archivee mais la release visible ne montre plus de suivi intermediaire
- push:
  - nettoyage defensif des variables `FLOW_PUSH_*` ajoute pour absorber les retours ligne eventuels en environnement
- publication:
  - passe poussee via `npm run publish:release`
  - une annonce globale de nouvelle mise a jour est repartie a tous les comptes

### Mise en ligne

- `npm run build` OK
- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-rm3rz5aco-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 10 - 31/03/2026 10:32

### Fait dans cette passe

- notes:
  - suppression des blocs `Base de notes`, `Action rapide`, `Détails`, `Autosave actif`, `Rechercher dans cette note` et du rappel `Dernière mise à jour`
  - écran d'accueil Notes remis en mode zones à gauche / notes de la zone active à droite
  - éditeur de note étendu pour occuper toute la largeur utile
- calendrier:
  - suppression des blocs `Tous les événements` et `Temps fort du mois`
- shell:
  - module `Finance` retiré de la navigation utilisateur
  - recherche mobile/tablette raccourcie à `Rechercher`
  - chaque changement de module revient maintenant en haut de page
  - widget Focus visible au milieu de la topbar quand un minuteur tourne hors de la page Focus
- publication et notifications:
  - service worker push ajouté
  - manifest web ajouté pour le mode app
  - abonnement push par appareil ajouté
  - route d'annonce de release ajoutée pour notifier tous les comptes Flow
  - script `npm run publish:release` ajouté pour deploy + annonce
- checks locaux:
  - `rm -rf .next` puis `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne

- `npm run publish:release` OK
- deployment production:
  - `https://flow-online-aymen-nv8shouuv-meinays-projects.vercel.app`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- annonce globale:
  - `Annonce envoyee a 15 utilisateur(s).`

## Passe produit 9 - 31/03/2026 09:59

### Fait dans cette passe

- signalements:
  - les messages signales sont maintenant stockes avec statut de moderation
  - les bugs interface signales depuis Flow partent eux aussi dans le store distant
  - l'utilisateur retrouve ses signalements dans son activite avec les vraies donnees serveur
- admin:
  - nouveau panneau `Signalements` dans le dashboard admin
  - vue detaillee reporter / auteur / contexte / note de resolution
  - actions `Marquer resolu` et `Classer sans suite`
  - notification de retour envoyee a l'utilisateur quand un admin traite le signalement
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3000` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-dlcyv8m66-meinays-projects.vercel.app`
- inspect:
  - `https://vercel.com/meinays-projects/flow-online-aymen/8xAK54zCjyH1aWi2kcoy7q9jizM1`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe produit 8 - 31/03/2026 02:45

### Fait dans cette passe

- shell global:
  - palette repassee en noir / gris / blanc
  - logo Flow monochrome remplace aussi l'icone app / favicon
  - animation de chargement plus claire a la connexion
  - ecran sans compte avec accueil de bienvenue plus propre
- mobile:
  - verrouillage horizontal plus strict pour eviter le scroll gauche / droite parasite
- support:
  - ouverture d'une conversation d'aide directement depuis Flow
  - nouveau endpoint admin conversations
  - panneau support dans le dashboard admin avec lecture / reponse / cloture
- admin:
  - palette admin reliee au meme langage monochrome que Flow
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-73iz8fpoi-meinays-projects.vercel.app`
- id deployment:
  - `dpl_4YbAWvxVdWoawydgdqBhKD14K6bX`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 7 - 31/03/2026 02:35

### Fait dans cette passe

- mobile:
  - barre de recherche encore un peu elargie et plus lisible
  - popup forfait telephone compact encore un peu resserre
- admin:
  - cartes et zones scrollables mieux contenues
  - longs contenus gardes dans les blocs sans debordement parasite
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-ha0dwx4o6-meinays-projects.vercel.app`
- id deployment:
  - `dpl_HeJnmJyo3jA3d7ds5VfXMu6wdkpB`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 6 - 31/03/2026 02:29

### Fait dans cette passe

- theme shell:
  - hero dashboard principal recolore avec les variables de theme
  - halo lumineux ajoute depuis le coin haut gauche sur l'ensemble du shell
  - nouvelle dominante `Nebula` poussee dans la palette visuelle
- mobile:
  - popup forfait remis aussi sur telephone
  - bouton loupe mobile retire de l'entete
  - barre de recherche mobile elargie
  - footer d'aide de la Command Palette masque en mobile
  - sidebar telephone encore un peu resserree
  - seuil de fermeture retouche pour mieux coller au doigt
- admin:
  - refonte visuelle complete du dashboard admin dans la DA Flow
  - suppression des selects natifs visibles au profit de chips / segments
  - confirmations destructives inline au lieu de `window.confirm`
  - zones longues contenues dans des cartes scrollables
  - login admin realigne sur la meme DA
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-81r2b9rlq-meinays-projects.vercel.app`
- id deployment:
  - `dpl_BfC8NoCFfjkBjfEURFLqSGVtz8tu`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 5 - 31/03/2026 02:02

### Fait dans cette passe

- topbar mobile:
  - retour d'une vraie zone de recherche au centre
  - ouverture directe de la Command Palette au toucher
- sidebar mobile:
  - largeur encore reduite
  - widget abonnement masque en mobile pour liberer la liste de modules
  - meilleure chance de tout faire tenir sans scroll
- theme clair:
  - derniers boutons et blocs shell encore sombres recolores
- gestes:
  - contenu mobile suit encore mieux le doigt pendant les glissements
- checks locaux:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-bnkptoqyl-meinays-projects.vercel.app`
- id deployment:
  - `dpl_CuUSZHK8CigikQH7N11vmkN4WRZW`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 4 - 31/03/2026 01:57

### Fait dans cette passe

- theme clair:
  - plus de boutons et surfaces du shell reprennent enfin la palette claire
  - corrections sur boutons gris, pills, cartes hero et quelques surfaces encore trop sombres
- sidebar mobile:
  - largeur reduite
  - compression supplementaire pour faire tenir plus de modules sans scroll
  - haut / bas mieux equilibres
- gestes mobiles:
  - fermeture de sidebar retouchee depuis toute la zone du panneau
  - pull-to-refresh fait maintenant glisser toute la zone contenu sous l'entete
  - swipe lateral garde mieux le contenu colle au doigt
- topbar mobile:
  - suppression du titre `Flow / pseudo`
- checks locaux:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-kpkjfjdch-meinays-projects.vercel.app`
- id deployment:
  - `dpl_8UBjSJH3dTsbxwf9WMmcBtjcKys6`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 3 - 31/03/2026 01:41

### Fait dans cette passe

- dashboard:
  - correction du chevauchement entre widgets
  - drag and drop desktop revenu sur les blocs
  - densite mobile un peu resserree pour reduire le scroll
- theme:
  - theme clair harmonise sur le shell principal
  - rendu plus doux sur le fond, la sidebar, la topbar et les cartes
- sidebar:
  - icones compactes agrandies et resserrees
  - alignement compact encore affine
  - widget abonnement fermable via une croix
- navigation:
  - transitions de module ajoutees
  - glissement retour / avance mobile plus lisible
- mobile / tablette:
  - recherche remplacee par une loupe dans l'entete
  - la loupe ouvre la Command Palette
  - ouverture / fermeture de la sidebar suit maintenant le doigt
  - pull-to-refresh Flow ajoute en haut sans reload brutal
  - safe areas / haut d'ecran mieux remplis
  - scrollbars masquees
- checks locaux:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-oe1k3rvi2-meinays-projects.vercel.app`
- id deployment:
  - `dpl_2UYe1j2GgrENCJRLfZ277ZX8NLVN`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell 2 - 31/03/2026 01:22

### Fait dans cette passe

- topbar:
  - recherche compacte remise a gauche
  - notifications, theme et profil remis a droite
  - bouton admin retire de la topbar pour garder seulement les 3 actions demandees
  - acces admin garde dans le panneau compte
- sidebar compacte:
  - suppression des carres autour de chaque icone
  - icones alignees sur une seule colonne
  - espacement vertical resserre
  - bouton de lock de sidebar remis
- widget abonnement:
  - retire du mode compact
  - remis tout en bas du menu ouvert
  - animation d'entree gauche-vers-droite
- dashboard:
  - stabilite amelioree selon le zoom
  - debordements limites sur certains widgets longs
- checks locaux:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-c1u0bbvh8-meinays-projects.vercel.app`
- id deployment:
  - `dpl_4trbsy6xYg9DtFPfZHNEPdE3m28h`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe shell - 31/03/2026 01:07

### Fait dans cette passe

- dashboard:
  - suppression des boutons parasites de type panneau sur les widgets
  - drag and drop nettoye directement sur les blocs
  - echange des widgets conserve
- sidebar compacte:
  - correction du bug qui masquait aussi les icones quand le menu etait ferme
  - rendu compact plus lisible
- forfait:
  - le bloc `Passer au niveau superieur` quitte le pied de sidebar
  - remplacement par un pop-up de session superpose a la navigation
  - bouton de fermeture ajoute
- topbar:
  - notifications, theme et profil regroupes a gauche de l'entete
  - shell principal plus coherent avec la nouvelle DA
- checks locaux:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-8vrjbd7rc-meinays-projects.vercel.app`
- id deployment:
  - `dpl_FNBo3ko1PXVaPLQyKjno5F87h1xv`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Passe rapide - 31/03/2026 00:53

### Fait dans cette passe

- `Finances` redevient un module visible dans la sidebar et la recherche
- `Objectifs` redevient un module visible dans la sidebar et la recherche
- `Finances` affiche maintenant:
  - solde
  - revenus
  - depenses
  - liste des transactions
  - suppression rapide
- `Objectifs` affiche maintenant:
  - liste des objectifs
  - progression visible
  - boutons `-10% / +10%`
  - suppression rapide
- recherche globale + command palette + navigation resynchronisees avec ces deux modules
- checks locaux de cette passe:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Mise en ligne confirmee

- `vercel --prod --yes` OK
- deployment production:
  - `https://flow-online-aymen-ow0fww409-meinays-projects.vercel.app`
- id deployment:
  - `dpl_4VX42HG8Efi6HihFAt6r478FubWX`
- alias principal reconfirme:
  - `https://flow-online-aymen.vercel.app`
- verification publique:
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Reprise active - 31/03/2026 00:45

### Etat exact local au moment de la reprise

- la base locale depasse maintenant `v1.16.3` et le badge release a ete resynchronise sur `v1.17.1`
- la production publique n'a pas encore ete redeployee pour cette nouvelle passe
- la reprise locale est propre:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK

### Fait dans cette passe locale

- compte / profil:
  - nouvelle route `app/api/account/route.js`
  - sauvegarde reelle du profil utilisateur:
    - nom affiche
    - email
    - identifiant unique
    - nom complet
    - telephone
    - visibilite du telephone
    - photo de profil
  - changement email / mot de passe protege par verification du mot de passe actuel
- calendrier:
  - nouvelle route `app/api/events/route.js`
  - evenements partages avec invites
  - reponses `accepte / peut-etre / refuse`
  - mise a jour et suppression synchronisees pour les participants
- signets:
  - nouvelle route `app/api/link-preview/route.js`
  - apercus automatiques titre / description / image / source
  - support plus propre des signets `lien / image / texte`
- solidite:
  - relecture du store distant sans cache
  - ecriture principale protegee par `withStoreLock`
  - comptes bloques refuses sur plus de routes:
    - session
    - compte
    - conversations
    - evenements

### Priorites immediates pour la suite

1. relire les nouvelles vues cote `app/FlowApp.jsx` pour reperer le prochain bloc encore incomplet a sortir ou stabiliser
2. verifier ensuite login / session / sauvegarde avec un vrai compte si la passe continue sur l'auth ou le profil
3. ne redeployer qu'une fois le journal de version, `HANDOVER.md`, `MEMORY.md` et la roadmap restes sync avec l'etat reel final

## Pause de reprise - 30/03/2026

### Etat exact au moment de la pause

- une nouvelle passe a ete commencee pour:
  - page de connexion admin separee
  - permissions admin granulaires
  - creation d'autres comptes admin avec permissions
  - email transactionnel admin
  - export CSV utilisateurs
- fichiers deja ajoutes/modifies dans cette passe en cours:
  - `app/admin/login/page.jsx`
  - `app/admin/login/AdminLogin.jsx`
  - `app/api/admin/session/route.js`
  - `app/api/admin/auth/login/route.js`
  - `app/api/admin/auth/logout/route.js`
  - `app/api/admin/export/route.js`
  - `lib/email.js`
  - `lib/admin.js`
  - `app/api/admin/actions/route.js`
  - `app/api/admin/overview/route.js`
  - `app/admin/AdminDashboard.jsx`
- dependance ajoutee:
  - `nodemailer`
- point bloquant actuel:
  - `npm run build` a cesse de rendre du feedback et la verification finale de cette passe n'a pas ete validee
- donc a cet instant:
  - ne pas considerer la nouvelle auth admin comme verifiee
  - ne pas provisionner encore le compte super-admin en prod avant d'avoir refait un build propre
  - ne pas redeployer cette passe tant que le build n'est pas revenu au vert

### Reprise recommandee

1. relancer `npm run build`
2. si ca rebloque, auditer en priorite:
   - `app/admin/page.jsx`
   - `app/admin/login/page.jsx`
   - `app/admin/AdminDashboard.jsx`
   - `app/api/admin/actions/route.js`
   - `lib/admin.js`
3. une fois le build OK:
   - creer le compte super-admin dans le store
   - tester `/admin/login`
   - tester `/admin`
   - tester export CSV
   - tester notif email avec SMTP si configure
   - redeployer sur `flow-online-aymen`

## Avancement du 30/03/2026 - reprise admin avancee

### Termine dans cette passe

- page `admin/login` ajoutee
- login admin separe branche sur `app/api/admin/auth/login/route.js`
- logout admin ajoute
- route `app/api/admin/session/route.js` ajoutee pour verifier la session admin
- systeme de roles/permissions admin ajoute dans `lib/admin.js`
- possibilite de creer d'autres admins avec permissions depuis le dashboard
- export CSV utilisateurs ajoute via `app/api/admin/export/route.js`
- envoi email transactionnel admin prepare via `lib/email.js` + `nodemailer`
- dashboard admin refondu pour:
  - afficher les permissions du compte courant
  - creer d'autres admins
- le mode message admin est maintenant recentre sur l'interne:
  - plus de choix email dans l'interface admin
  - pop-up affiche a la connexion si l'utilisateur a un message admin/securite non lu
  - le centre de notifications reste la boite de reception persistante
- la session admin est maintenant totalement separee de la session Flow:
  - cookie admin dedie `flow_admin_session`
  - se connecter sur `/admin/login` ne remplace plus le compte deja ouvert dans Flow
- cette passe ajoute aussi:
  - export CSV admin enrichi
  - journal d'audit admin visible dans le dashboard
  - bloc activite des comptes les plus actifs
  - filtres avances utilisateurs
  - messages admin segmentes par audience
  - nouvelle direction visuelle plus premium sur le shell principal
  - skeleton loader de chargement
  - feedback drag and drop plus visible
  - choisir notification interne / email / les deux
  - exporter les utilisateurs
  - se rafraichir automatiquement
- compte super-admin provisionne dans le store:
  - email: `superadmin@flow-aymen.app`
  - role: `super_admin`
  - permissions: toutes
- build local `npm run build` OK
- test local `curl -I http://127.0.0.1:3100/admin/login` OK
- test local login admin + session admin OK
- heartbeat de presence ajoute:
  - `app/api/presence/route.js`
  - remontée plus fiable des comptes en ligne dans l'admin

### A garder en tete

- l'email transactionnel est code mais depend encore des variables `FLOW_SMTP_*`
- sans SMTP configure, le mode `email` retournera une erreur explicite cote admin
- le compte super-admin est cree dans le store distant: ne pas le reseeder inutilement si non necessaire
- les variables SMTP ne sont pas encore presentes sur Vercel production

## Avancement du 30/03/2026 - synchronisation finale de reprise

### Termine dans cette passe

- build local `npm run build` relance et OK
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK
- badge release et fichiers de reprise resynchronises avec l'etat reel du code
- version locale de reprise alignee sur `v1.15.1`
- production redeployee sur `https://flow-online-aymen.vercel.app`
- smoke test production `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Avancement du 30/03/2026 - passe mobile UX

### Termine dans cette passe

- dashboard mobile compacte pour tenir dans l'ecran sans scroll principal
- topbar mobile nettoyee:
  - recherche + notifications restent a droite
  - bouton aide retire du haut et garde seulement dans le menu lateral
- gestes mobiles ajoutes:
  - bord gauche vers droite: ouvrir le menu
  - glissement inverse dans le menu: fermer
  - glissement horizontal dans l'app: retour a la vue precedente / suivante
- badge release raccourci en `vX.Y.Z` sur mobile et desktop
- build local `npm run build` OK
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK

### Reste volontairement ouvert

- configurer les variables `FLOW_SMTP_*` si l'email transactionnel doit etre actif en production

## Avancement du 30/03/2026 - passe design premium globale

### Termine dans cette passe

- nouvelle direction visuelle globale inspiree de la reference `Findexa`
- palette sombre graphite + accent bleu appliquee au shell et aux composants communs
- cartes, boutons, pills, panneaux et listes re-dessines avec coins plus doux et bordures plus premium
- dashboard desktop recompose pour mieux respirer
- dashboard mobile detasse:
  - textes mieux visibles
  - cartes plus grandes
  - lecture plus propre que l'etat precedent
- build local `npm run build` OK
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK
- production redeployee sur `https://flow-online-aymen.vercel.app`
- smoke test production `npm run check:client -- https://flow-online-aymen.vercel.app` OK

### Reste volontairement ouvert

- configurer les variables `FLOW_SMTP_*` si l'email transactionnel doit etre actif en production

## Avancement du 30/03/2026

### Termine dans cette passe

- Kanban `Projets` enrichi avec panneau detail de carte
- templates de taches reutilisables ajoutes:
  - creation de template dediee
  - lancement d'une tache depuis template
  - sauvegarde d'une carte existante comme template
- sous-taches de cartes Kanban ajoutees:
  - checklist persistante
  - pourcentage d'avancement
  - progression visible directement sur les cartes
- collaboration de cartes branchee dans le module Projets:
  - commentaires de carte
  - reactions rapides
  - membres sur la carte
  - roles `Viewer` / `Editor`
- double-clic sur une carte pour avancer rapidement dans la colonne suivante sans perdre le nouveau panneau detail
- recherche globale + Command Palette enrichies avec:
  - templates de taches
  - ouverture directe d'une carte Kanban
- build local `npm run build` OK apres la passe Kanban/collab
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK apres la passe Kanban/collab

## Avancement du 30/03/2026 - passe admin

### Termine dans cette passe

- nouvelle route `app/admin/page.jsx` pour `Flow Admin Dashboard`
- dashboard admin relie au meme store chiffre que le site Flow
- vue de supervision avec:
  - ping API / latence
  - version de release
  - volume utilisateurs
  - conversations
  - signalements
  - analytics modules
- liste complete des utilisateurs avec:
  - nom
  - email
  - identifiant
  - dates de creation / connexion
  - statut actif / bloque
  - volume de donnees par compte
- nouvelles APIs admin:
  - `app/api/admin/overview/route.js`
  - `app/api/admin/actions/route.js`
- actions admin branchees sur le vrai store:
  - envoi de notification interne ciblee ou globale
  - blocage compte
  - deblocage compte
  - reinitialisation mot de passe avec mot de passe temporaire
  - suppression de compte avec nettoyage conversations / evenements / reports
- helper central `lib/admin.js` ajoute pour:
  - verifier l'acces admin
  - definir l'admin owner de secours
  - normaliser les donnees admin utilisateur
  - detecter les comptes bloques
- les comptes bloques sont maintenant refuses sur:
  - login
  - session
  - sauvegarde db
  - compte
  - conversations
  - evenements
- metadonnees de connexion ajoutees / maintenues:
  - `status`
  - `loginCount`
  - `lastLoginAt`
  - `lastSeenAt`
- build local `npm run build` OK
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK
- verification HTTP locale `curl -I http://127.0.0.1:3100/admin` OK

### En cours / a garder en tete

- l'envoi `message/notif` admin est pour l'instant interne a Flow, pas email SMTP
- l'acces admin fonctionne:
  - via `FLOW_ADMIN_EMAILS` / `FLOW_ADMIN_EMAIL` si configure
  - sinon fallback sur le premier compte cree comme owner admin
- une prochaine passe peut ajouter:
  - export CSV utilisateurs
  - filtres plus pousses
  - moderation conversations / reports plus profonde
  - vrai envoi email transactionnel

## Avancement du 30/03/2026 - passe precedente

### Termine dans cette passe

- Command Palette universelle ajoutee dans `app/FlowApp.jsx`
- ouverture globale via `Cmd/Ctrl + K`
- resultats temps reel avec fuzzy matching tolerant aux accents
- recherche transversale sur:
  - modules
  - notes
  - taches
  - evenements
  - habitudes
  - conversations
  - signets
- actions rapides ajoutees:
  - `Nouvelle note`
  - `Nouvelle tache`
  - `Aller a [module]`
- navigation clavier complete dans la palette:
  - `↑`
  - `↓`
  - `Entree`
  - `Echap`
- bouton d'ouverture ajoute dans la topbar sans casser la recherche inline existante
- section `Parametres > Raccourcis` ajoutee
- capture directe d'un raccourci au clavier par action
- sauvegarde persistante des raccourcis dans `settings.shortcuts`
- reset global des raccourcis par defaut
- actions globales branchees sur les raccourcis:
  - Command Palette
  - bascule theme
  - nouvelles note / tache / evenement / signet
  - navigation modules
- build local `npm run build` OK
- smoke test local `npm run check:client -- http://127.0.0.1:3100` OK
- deploiement production effectue sur le projet Vercel existant
- alias principal confirme: `https://flow-online-aymen.vercel.app`
- smoke test production `npm run check:client -- https://flow-online-aymen.vercel.app` OK

### En cours / a garder en tete

- la recherche inline de topbar existe toujours en parallele de la nouvelle palette
- une passe future pourra unifier totalement les deux experiences si voulu
- les raccourcis couvrent maintenant les actions globales majeures
- une prochaine passe pourra etendre la couverture aux actions plus fines a l'interieur de chaque module
## Avancement du 29/03/2026

### Termine dans cette passe

- correction du bug majeur de perte de focus / saisie caractere par caractere dans les vues principales
- dashboard compacte sur mobile/tablette pour eviter le scroll inutile
- viewport mobile non zoomable
- sidebar desktop en mode hover-only avec possibilite de lock ouvert
- recherche globale reelle en topbar:
  - modules
  - contacts
  - conversations
  - notes
  - taches
  - dates / evenements
- dashboard:
  - remplacement du bloc `Apercu activite` par `Notes et projets en cours`
- messagerie:
  - detail mobile type liste puis conversation
  - clic droit / appui long pour menu message
  - reactions uniquement sous le message concerne
  - edition avec texte pre-rempli + validation entree
  - suppression laissant un message supprime
  - trombone avec vrai selecteur fichier/image
  - pieces jointes en data URL
  - notifications sur reaction / edition / suppression cote destinataires
  - appels audio / video via salle Jitsi generee et partagee dans la conversation
- rafraichissement bien plus frequent entre appareils pour conversations + notifications
- notifications navigateur quand l'utilisateur est hors de l'onglet et que le navigateur a l'autorisation
- navigation recentree sur les modules utiles:
  - `Tableau de bord`
  - `Notes`
  - `Projets`
  - `Calendrier`
  - `Conversations`
  - `Habitudes`
  - `Focus`
  - `Signets`
- retrait de `Objectifs`, `Finances` et `Journal` de la navigation produit
- nouveau dashboard plus proche d'une vraie app SaaS sombre/claire
- nouveau centre `Conversations`
  - recherche utilisateur par email / telephone / identifiant
  - creation de conversation directe
  - creation de groupe
  - messages persistants
  - pieces jointes par URL
  - reactions
  - edition et suppression de ses messages
  - invitations appel audio / visio sous forme de messages persistes
- nouvelle topbar avec:
  - bouton aide
  - bouton notifications
  - centre de notifications gere par le site
- liaisons reelles entre modules sur:
  - notes
  - taches
  - evenements
  - signets
- les formulaires principaux peuvent maintenant lier un element a:
  - contacts
  - conversations
  - evenements
  - signets
  - notes
- affichage des liens directement dans les cartes et fiches
- reglages apparence/profil sans selecteurs navigateur pour les options principales
- page `Parametres` refondue en 4 sous-sections: `Profil`, `Apparence`, `Activite`, `Forfait`
- suppression du bouton `Parametres` dans la navigation principale
- ouverture des parametres via le profil en bas de la sidebar
- nouveaux champs persistants dans la base:
  - `profile.username`
  - `profile.fullName`
  - `profile.phone`
  - `profile.phoneVisible`
  - `profile.photoUrl`
  - `settings.locale`
  - `settings.fontScale`
  - `settings.fontFamily`
  - `subscription.*`
- nouvelle API `app/api/account/route.js`
  - mise a jour du nom
  - mise a jour de l'email
  - changement du mot de passe avec verification du mot de passe actuel
  - refresh de session apres changement
- apparence réellement appliquee:
  - theme
  - accent
  - taille de police
  - famille de police
- historique d'activite initialise et alimente pour:
  - profil/compte
  - notes
  - objectifs
  - signets
  - evenements
  - habitudes
  - transactions
  - export backup
- structure forfaits prete, avec tous les comptes en `Summit` offert pour le moment
- nouveau logo `Flow` integre dans l'ecran d'auth, la sidebar et le favicon `app/icon.svg`
- micro-passe visuelle inspiree de `Aura` et `Health Pal`:
  - surfaces plus propres
  - topbar plus premium
  - monogramme plus net et lisible
  - dark mode / light mode plus coherents avec la nouvelle direction SaaS

### Encore a faire

- brancher Stripe Checkout reel quand les cles seront donnees
- vraie gestion d'abonnements recurrents mensuel / annuel / a vie
- messagerie temps reel plus profonde:
  - upload natif / serveur durable de fichiers
  - vocaux reels longues duree / hors data URL
  - appels / visio totalement integres sans service externe
  - signalement
  - administration de groupes plus poussee
- vrai push web hors navigateur ouvert
- vrai temps reel websocket/sub-secondes via infra dediee
- historique d'activite plus exhaustif sur tous les modules
- suppression/edition complete et plus fine de tous les objets encore incomplets
- recherche globale transversale et panels plus riches

## Secrets et acces critiques

Ces valeurs sont critiques. Les perdre peut casser l'acces aux donnees chiffrees.

### .env.local

```env
FLOW_STORE_URL=https://jsonblob.com/api/jsonBlob/019d3fec-0c9e-7bc0-a65a-d111a1635df0
FLOW_SESSION_SECRET=24e38db7b7d4accccd157577a39efafe5ffe496164f2e78add12f3ffc9e24b24
FLOW_PASSWORD_PEPPER=f45efd28a88457f9d1707d06ddc676c8156f2d6b9c782bccd3cb8efbc633e4c9
FLOW_DATA_SECRET=cdbdf55e8ee43f03f56caa68a11179b96a7adb8a8f511bef63a34677c1714b7f
```

### Projet Vercel

```json
{"projectId":"prj_z4k3Nb7QHzrU4od2gv7fBh5GOmxl","orgId":"team_RB423RZ6qpL1OWnpWdM7TVxw","projectName":"flow-online-aymen"}
```

## Pour garder le lien principal

Le lien `https://flow-online-aymen.vercel.app` restera utilisable tant que:
- le projet Vercel `flow-online-aymen` existe encore
- l'alias n'est pas remplace ou supprime
- le compte Vercel proprietaire garde le projet

On ne peut pas promettre "pour toujours" au sens absolu, mais on peut le garder durablement en:
- conservant le compte Vercel
- ne supprimant pas le projet
- redeployant toujours sur ce meme projet

## Commandes utiles

### Lancer en local

```bash
cd "/Users/aymen/Documents/Flow Dashbord"
npm install
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

### Redeployer sur le meme lien

```bash
cd "/Users/aymen/Documents/Flow Dashbord"
vercel --prod --yes
```

### Voir le projet Vercel

```bash
cd "/Users/aymen/Documents/Flow Dashbord"
vercel inspect flow-online-aymen.vercel.app
vercel env ls
```

## Verification minimum apres modif

- build OK
- login OK
- inscription OK
- sauvegarde note/tache OK
- reconnexion OK
- route `GET/POST /api/conversations` OK au build
- alias prod `flow-online-aymen.vercel.app` repointe bien sur `dpl_92Mou7HXCMtKRPw1FbwGsCRSKkzF`
- theme OK
- route `PATCH /api/account` OK
- changement mot de passe OK
- changement profil persistant OK
- lien principal Vercel OK

## Prompt de reprise pour un autre ChatGPT

```text
Lis d'abord:
/Users/aymen/Documents/Flow Dashbord/HANDOVER.md
/Users/aymen/Documents/Flow Dashbord/MEMORY.md
/Users/aymen/Documents/Flow Dashbord/docs/flow-roadmap-and-spec.md

Contexte:
- Projet local: /Users/aymen/Documents/Flow Dashbord
- Site en ligne: https://flow-online-aymen.vercel.app
- Il faut absolument conserver le design existant, les comptes, les donnees utilisateurs et le meme projet Vercel.
- Ne change rien de destructif.
- Apres toute modif importante, verifie de bout en bout et redeploie sur le meme lien.
- Reponds-moi en francais, chaleureusement, de facon concise, sans me faire faire du travail inutile.
```

## Prompt exact complet a reutiliser

```text
Tu reprends mon projet existant sans rien casser.

Lis d’abord, dans cet ordre :
1. /Users/aymen/Documents/Flow Dashbord/HANDOVER.md
2. /Users/aymen/Documents/Flow Dashbord/MEMORY.md
3. /Users/aymen/Documents/Flow Dashbord/docs/flow-roadmap-and-spec.md
4. /Users/aymen/Documents/Flow Dashbord/docs/vercel-and-secrets.md
5. /Users/aymen/Documents/Flow Dashbord/.env.local

Contexte obligatoire :
- Le projet local est ici : /Users/aymen/Documents/Flow Dashbord
- Le site en ligne actuel est : https://flow-online-aymen.vercel.app
- Le projet Vercel à conserver est : flow-online-aymen
- Il faut absolument garder le même design général, les comptes existants, les données existantes, le stockage chiffré et le même lien Vercel si possible.
- Ne fais aucune action destructive.
- Ne supprime jamais les comptes utilisateurs, les notes, les tâches, les habitudes, les objectifs ou les secrets.
- Ne change jamais FLOW_DATA_SECRET sans migration complète.
- Ne change jamais FLOW_STORE_URL sans recopier les données.
- Ne crée pas un nouveau projet Vercel si une mise à jour du projet existant suffit.
- Tu dois travailler directement dans ce projet et vérifier réellement ce que tu modifies.

Règles de travail :
- Réponds-moi en français.
- Sois chaleureux, clair, rassurant et concis.
- Ne me fais pas faire du travail inutile si tu peux le faire toi-même.
- Avant de modifier quelque chose d’important, vérifie l’existant dans le code.
- Après toute modification importante, lance de vraies vérifications.
- Si tu touches à l’auth, au stockage, aux sessions, aux secrets ou au déploiement, fais très attention à la compatibilité avec les données déjà existantes.
- Si tu vois un risque de casser le site ou de perdre des données, arrête-toi et explique-moi précisément le risque avant d’aller plus loin.

Ce que tu dois considérer comme source de vérité :
- /Users/aymen/Documents/Flow Dashbord/HANDOVER.md
- /Users/aymen/Documents/Flow Dashbord/MEMORY.md
- /Users/aymen/Documents/Flow Dashbord/.env.local
- le projet Vercel déjà lié dans .vercel/project.json
- l’URL publique https://flow-online-aymen.vercel.app

Commandes utiles à utiliser si nécessaire :
- cd "/Users/aymen/Documents/Flow Dashbord"
- npm install
- npm run build
- npm start -- --hostname 127.0.0.1 --port 3000
- vercel inspect flow-online-aymen.vercel.app
- vercel env ls
- vercel --prod --yes

Rappel architecture :
- Front principal : /Users/aymen/Documents/Flow Dashbord/app/FlowApp.jsx
- Auth : /Users/aymen/Documents/Flow Dashbord/app/api/auth/login/route.js
- Register : /Users/aymen/Documents/Flow Dashbord/app/api/auth/register/route.js
- Session : /Users/aymen/Documents/Flow Dashbord/app/api/session/route.js
- Sauvegarde DB : /Users/aymen/Documents/Flow Dashbord/app/api/db/route.js
- Sécurité auth/session : /Users/aymen/Documents/Flow Dashbord/lib/auth.js
- Chiffrement stockage : /Users/aymen/Documents/Flow Dashbord/lib/crypto.js
- Store distant : /Users/aymen/Documents/Flow Dashbord/lib/remote-store.js
- Normalisation DB : /Users/aymen/Documents/Flow Dashbord/lib/schema.js
- Version UI : /Users/aymen/Documents/Flow Dashbord/lib/release.js
- Sécurité middleware : /Users/aymen/Documents/Flow Dashbord/middleware.js

Objectif :
Je veux continuer à améliorer ce site sans rien perdre, sans casser le design, sans casser la prod, et en gardant les données de tous les utilisateurs déjà enregistrés.

Ta première réponse doit :
1. confirmer que tu as lu les fichiers de contexte,
2. résumer l’état actuel du projet en quelques lignes,
3. me dire ce que tu vas faire en premier,
4. ne proposer aucune refonte inutile.
```

## Prompt exact complet - version avancee fiabilite / SaaS / messages / forfaits

```text
Tu reprends mon projet existant et tu dois agir comme lead product + lead engineer + QA senior.

Lis d’abord, dans cet ordre :
1. /Users/aymen/Documents/Flow Dashbord/HANDOVER.md
2. /Users/aymen/Documents/Flow Dashbord/MEMORY.md
3. /Users/aymen/Documents/Flow Dashbord/docs/flow-roadmap-and-spec.md
4. /Users/aymen/Documents/Flow Dashbord/docs/vercel-and-secrets.md
5. /Users/aymen/Documents/Flow Dashbord/.env.local

Contexte obligatoire :
- Projet local : /Users/aymen/Documents/Flow Dashbord
- Site en ligne : https://flow-online-aymen.vercel.app
- Projet Vercel à conserver : flow-online-aymen
- Il faut absolument conserver le design global, les comptes existants, les données existantes, le stockage chiffré, et le même lien Vercel si possible.
- Ne fais aucune action destructive.
- Ne supprime jamais les comptes, notes, tâches, habitudes, objectifs, messages, secrets ou données existantes.
- Ne change jamais FLOW_DATA_SECRET sans migration complète.
- Ne change jamais FLOW_STORE_URL sans recopier les données.
- Ne crée pas un nouveau projet Vercel si une mise à jour du projet existant suffit.

Objectif global :
Je veux transformer ce projet en vraie app / vrai SaaS fiable, propre, premium, lisible, responsive et cohérent sur mobile, tablette et desktop.
Je ne veux pas un rendu “trop IA”.
Je ne veux pas de texte peu lisible, de boutons cassés, de pages incomplètes, de fonctionnalités à moitié finies, de faux boutons, de bugs ou d’erreurs.
Je veux un produit crédible, utilisable, élégant et sérieux.

Tes priorités absolues :
- Fiabilité
- Lisibilité
- Cohérence UX
- Compatibilité multi-appareils
- Sauvegarde robuste
- Aucune perte de données
- Aucune fonctionnalité “fake”
- Vérification réelle après chaque gros changement

Tu dois travailler en plusieurs phases, sans brûler les étapes.

Phase 1 : audit total du site
- Audite toutes les pages, tous les boutons, tous les formulaires, toutes les modales, tous les flux.
- Identifie tout ce qui ne marche pas, marche à moitié, manque, n’est pas clair, n’est pas responsive, ou paraît cheap.
- Vérifie la cohérence du design, de la navigation, des libellés, des feedbacks et de l’accessibilité.
- Vérifie si le site ressemble vraiment à une app / SaaS.
- Vérifie les états de chargement, erreurs, sauvegarde, reconnexion et persistance.
- Donne-moi ensuite un plan d’amélioration priorisé.

Phase 2 : rendre l’app fiable comme une vraie app SaaS
- Corrige les bugs.
- Supprime les faux comportements.
- Termine les flux incomplets.
- Ajoute les validations manquantes.
- Améliore le responsive mobile / tablette / desktop.
- Améliore lisibilité, hiérarchie visuelle, contrastes, feedbacks, transitions.
- Vérifie réellement après chaque bloc.

Phase 3 : refaire les paramètres comme une vraie page paramètres de concurrent SaaS
Je veux une vraie page paramètres complète, inspirée des bonnes pages settings modernes.
Le bouton “Paramètres” dans le menu sous “Objectifs” doit être supprimé.
C’est le bouton avec la photo de profil de l’utilisateur en bas de la sidebar qui doit ouvrir les paramètres.

Je veux dans les paramètres des sous-sections complètes :

1. Profil
- photo de profil
- nom d’utilisateur
- nom complet si pertinent
- email
- mot de passe
- numéro de téléphone
- ce numéro peut être visible pour d’autres utilisateurs
- possibilité de modifier ces infos proprement
- validations complètes
- feedback de sauvegarde clair

2. Apparence
- thème clair / sombre
- couleur principale / accent
- langue
- taille de police
- police d’écriture
- aperçu direct si possible
- sauvegarde persistante

3. Activité
- historique détaillé des activités du compte
- création, modification, suppression
- ajout d’un membre
- création d’un événement
- suppression d’une note
- changement de profil
- changement de forfait
- etc.
- affichage lisible, trié, propre, utile

4. Forfait
Je veux un vrai système de forfaits avec 3 plans.
- mensuel
- annuel
- à vie
- paiement automatique si abonnement récurrent
- logique de droits par forfait
- page claire et crédible
- redirection future vers Stripe Checkout
- je te donnerai les clés Stripe plus tard
- pour l’instant tout le monde doit avoir automatiquement le forfait le plus élevé sans payer
- mais le système doit être conçu correctement pour recevoir Stripe après

Inspire-toi des vrais SaaS pour les paramètres et les forfaits.
Pas de version simpliste.

Phase 4 : messagerie interne complète
Je veux une fonctionnalité Messages qui permette :
- créer une nouvelle conversation
- créer un groupe
- chercher une personne par numéro de téléphone
- chercher une personne par email
- chercher une personne par nom d’utilisateur
- si la personne a un numéro enregistré, on peut la trouver avec
- envoyer des messages texte
- envoyer des fichiers
- envoyer des images
- envoyer des vocaux
- créer un appel audio
- créer un appel vidéo
- réactions sur message
- modifier un message
- supprimer un message
- signaler un message
- supprimer une conversation
- modifier une conversation
- créer / modifier / supprimer un groupe
- ajouter d’autres fonctions utiles si elles sont cohérentes

Tu dois proposer une architecture propre et réaliste pour ça.
Ne fais pas semblant si une partie nécessite plus de temps.
Construis-le progressivement, proprement.

Phase 5 : amélioration générale du produit
Tu peux améliorer les fonctionnalités actuelles si c’est cohérent :
- notes
- projets
- calendrier
- habitudes
- focus
- journal
- finances
- signets
- objectifs
- profils
- activité
- forfaits
- messages

Tu dois t’inspirer des vrais besoins utilisateurs, des vrais SaaS et des bonnes idées vues dans les outils modernes, mais sans copier bêtement et sans faire “AI slop”.
Le produit doit rester premium, lisible, crédible et humain.

Règles de design :
- L’interface doit ressembler à une vraie app / SaaS moderne
- Pas de contenu trop IA
- Pas de textes mous ou vagues
- Pas de textes peu lisibles
- Pas de contrastes faibles
- Pas d’effets kitsch
- Pas de surcharge visuelle
- Les animations doivent être élégantes, utiles et discrètes
- Le site doit être cohérent sur desktop, tablette et mobile

Règles techniques :
- Vérifie le code avant de modifier
- Vérifie réellement après avoir modifié
- Lance de vraies validations
- Si tu touches auth / session / storage / Vercel / secrets, fais très attention à la compatibilité
- Si tu vois un risque de casser le site ou perdre des données, arrête-toi et explique-moi précisément le risque avant d’aller plus loin

Règles de continuité :
- Enregistre à chaque fois là où tu t’arrêtes
- Après chaque gros bloc, mets à jour :
  - /Users/aymen/Documents/Flow Dashbord/HANDOVER.md
  - /Users/aymen/Documents/Flow Dashbord/MEMORY.md
  - /Users/aymen/Documents/Flow Dashbord/docs/flow-roadmap-and-spec.md si nécessaire
- Note ce qui a été fait
- Note ce qui reste à faire
- Note les risques
- Note l’état du déploiement
- Note les choix d’architecture
- Note les prochaines priorités
- Fais en sorte qu’un autre compte ChatGPT puisse reprendre immédiatement sans rien perdre

Règles de réponse :
- Réponds-moi en français
- Sois chaleureux, clair, rassurant et concis
- Ne me fais pas faire du travail inutile si tu peux le faire toi-même
- Ne me propose pas des plans vagues si tu peux directement agir
- Avant les gros changements, annonce ce que tu vas faire
- Après les changements, résume ce qui a été réellement fait et vérifié

Commandes utiles si nécessaire :
- cd "/Users/aymen/Documents/Flow Dashbord"
- npm install
- npm run build
- npm start -- --hostname 127.0.0.1 --port 3000
- vercel inspect flow-online-aymen.vercel.app
- vercel env ls
- vercel --prod --yes

Rappel architecture actuelle :
- Front principal : /Users/aymen/Documents/Flow Dashbord/app/FlowApp.jsx
- Auth : /Users/aymen/Documents/Flow Dashbord/app/api/auth/login/route.js
- Register : /Users/aymen/Documents/Flow Dashbord/app/api/auth/register/route.js
- Session : /Users/aymen/Documents/Flow Dashbord/app/api/session/route.js
- Sauvegarde DB : /Users/aymen/Documents/Flow Dashbord/app/api/db/route.js
- Sécurité auth/session : /Users/aymen/Documents/Flow Dashbord/lib/auth.js
- Chiffrement stockage : /Users/aymen/Documents/Flow Dashbord/lib/crypto.js
- Store distant : /Users/aymen/Documents/Flow Dashbord/lib/remote-store.js
- Normalisation DB : /Users/aymen/Documents/Flow Dashbord/lib/schema.js
- Version UI : /Users/aymen/Documents/Flow Dashbord/lib/release.js
- Sécurité middleware : /Users/aymen/Documents/Flow Dashbord/middleware.js

Ta première réponse doit :
1. confirmer que tu as lu les fichiers de contexte,
2. résumer l’état actuel du projet,
3. me donner l’audit initial priorisé,
4. me dire quelle première implémentation tu fais tout de suite,
5. commencer réellement le travail sans refonte inutile.
```

## Reprise du 29/03/2026 21:50

### Audit prioritaire actuel

- P0 fiabilite:
  - les flux critiques build/login/session/save restent bons, mais il manquait des garde-fous reels sur le profil compte
  - l'identifiant public n'etait pas protege contre les doublons
  - le telephone n'etait pas normalise avant sauvegarde ni avant recherche utilisateur
  - la photo de profil acceptait n'importe quelle chaine
- P1 produit / UX:
  - la page `Parametres` est deja bien engagee, mais l'historique et les validations de profil devaient etre rendus plus credibles
  - la messagerie fonctionne deja pour direct/groupe/messages/reactions/edit/delete/appels, mais il manque encore signalement, suppression de conversation, edition de groupe et vocaux reels
- P1 architecture:
  - `app/FlowApp.jsx` reste tres massif, donc chaque passe doit rester ciblee et verifiee
- P2 cohérence SaaS:
  - le systeme de forfaits est structure mais Stripe n'est pas encore branche
  - l'activite existe mais doit encore couvrir plus de modules et plus de cas

### Fait dans cette passe

- durcissement du compte dans `app/api/account/route.js`
  - identifiant normalise en minuscule
  - unicite de l'identifiant verifiee cote serveur
  - telephone normalise avant sauvegarde
  - validation du telephone
  - validation photo via URL `http/https`
  - entree d'activite plus explicite apres mise a jour du compte
- cohérence auth dans `app/api/auth/register/route.js`
  - inscription alignee sur un minimum de 8 caracteres pour le mot de passe
- recherche utilisateurs plus fiable dans `lib/conversations.js`
  - recherche telephone tolérante a la mise en forme (`+33 6 12...`)
- garde-fous front dans `app/FlowApp.jsx`
  - validation immediate identifiant / telephone / photo dans `Parametres`
  - normalisation de l'identifiant cote client
  - message de mot de passe d'inscription aligne sur le serveur
- verrou d'ecriture du store dans `lib/remote-store.js`
  - serialisation locale des ecritures pour reduire les collisions read-modify-write sur le blob distant
- nouvelles actions messagerie reelles
  - modification d'un groupe existant
  - suppression d'une conversation directe
  - suppression d'un groupe par admin
  - signalement d'un message
  - journal d'activite et notifications associes
- onglet `Activite` enrichi
  - resume rapide
  - filtres par categorie

### Verifications reelles faites

- `npm run build` : OK
- `npm start -- --hostname 127.0.0.1 --port 3000` : OK
- inscription avec mot de passe trop court : refusee en `400` avec message `8 caracteres minimum`
- connexion compte test existant : OK
- `PATCH /api/account` avec username + telephone + photo : OK
- `GET /api/session` apres mise a jour : OK, profil persiste
- recherche utilisateur par identifiant : OK
- recherche utilisateur par telephone formate : OK
- tentative d'identifiant duplique sur un second compte : refusee en `409`

### Etat de deploiement

- redeploye en production sur le meme projet Vercel
- alias principal confirme: `https://flow-online-aymen.vercel.app`
- deployment de production actuel:
  - `https://flow-online-aymen-jz6kufahh-meinays-projects.vercel.app`
- production Vercel et secrets conserves

### Risques / limites restantes

- la normalisation telephone reste simple et ne transforme pas automatiquement tous les formats locaux en vrai E.164
- le verrou d'ecriture protege les collisions sur une meme instance Node, mais ne remplace pas une vraie strategie transactionnelle multi-instance
- la messagerie n'a pas encore:
  - vocaux reels
  - upload natif serveur
  - moderation admin/UI des signalements
- `app/FlowApp.jsx` doit etre decoupe plus tard pour mieux tenir la qualite dans la duree

### Prochaine priorite recommandee

- bloc suivant: rendre `Parametres > Activite` plus exploitable et attaquer les trous reels de la messagerie:
  - couverture d'activite plus complete
  - edition/suppression de conversation
  - base propre pour signalement et administration de groupe

## Mise a jour - 29/03/2026 22:30

### Fait dans cette passe

- `app/FlowApp.jsx`
  - correction du bug de saisie/focus:
    - les refresh automatiques `session + conversations` sont maintenant suspendus tant qu'un champ texte est actif
    - la saisie conversation et edition note ne perdent plus le focus toutes les 1.2s
  - sidebar desktop compacte corrigee:
    - mode compact reserve au desktop
    - sur mobile, retour au comportement off-canvas classique
    - en mode compact:
      - affichage `logo + Flow` uniquement en haut
      - masquage version + led sauvegarde
      - tuiles modules carrees avec coins arrondis
      - bas de sidebar limite a la photo de profil
  - module `Notes` restructure:
    - categories d'abord (`Perso`, `Travail`, `Idee`)
    - creation de note via boutons de zones, sans select natif
    - creation reduite a `titre + zone`
    - ouverture directe de la note apres creation pour ecrire le contenu
    - pas de doublon du bouton d'ajout quand le module est vide
  - module `Habitudes` etendu:
    - cible en minutes
    - choix des jours
    - presets d'icones / emoji
    - suivi hebdo base sur `entries` par date
    - ajout manuel du temps realise
    - edition et suppression d'une habitude
    - recap `semaine derniere`
    - compteur/streak recalcule de facon plus fiable

### Verifications reelles executees

- `npm run build` : OK
- QA navigateur locale sur store temporaire isole : OK
  - inscription
  - sidebar desktop compacte
  - sidebar mobile non compacte
  - creation note par zone
  - edition note avec attente > 2.6s sans perte de focus
  - creation habitude
  - ajout manuel de minutes sur habitude
  - creation conversation directe
  - saisie message avec attente > 2.6s sans perte de focus
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : alias principal confirme
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient bien `v1.7.0`

### Etat de deploiement

- alias principal conserve:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-lk4tvn3wg-meinays-projects.vercel.app`
- version UI:
  - `v1.7.0`

### Risques / limites restantes

- la messagerie a encore des limites produit reelles:
  - pas de vocaux natifs
  - pas d'upload serveur persistant
  - pas de vrai appel audio/video temps reel
- `app/FlowApp.jsx` reste trop gros et doit etre decoupe apres stabilisation produit
- les tests browser ont ete faits sur un store temporaire local pour ne pas polluer les vraies donnees, pas directement sur les comptes existants

## Mise a jour - 29/03/2026 22:58

### Fait dans cette passe

- `app/layout.jsx` + `app/DevOverlays.jsx`
  - ajout de `Agentation 3.0.2` en dev uniquement
  - overlay d'annotation disponible localement sans exposer l'outil en production
- `app/FlowApp.jsx`
  - suppression du bouton `Nouveau` en haut a droite
  - notifications:
    - affichage simplifie par contenu
    - icone selon le type
    - nettoyage des notifications lues a la fermeture du panneau
  - `Parametres`:
    - etat remonte au composant principal pour fiabiliser les sous-onglets
    - onglets `Profil / Apparence / Activite / Forfait` corriges
    - ajout du picker photo appareil/pc/tablette/telephone
  - messagerie:
    - recherche de gauche utilisee pour filtrer les conversations existantes
    - bouton `+` ajoute a gauche de la recherche pour creer direct/groupe
    - ancien bloc `Nouveau groupe` retire
    - clic sur l'en-tete conversation ouvre maintenant le panneau infos
    - scroll auto force vers le bas a l'ouverture et a l'arrivee de nouveaux messages
    - panneau infos enrichi:
      - recherche dans le chat
      - toggle notif local
      - favori local
      - liste des medias/fichiers envoyes
      - suppression toujours disponible
    - appel audio bascule vers `vdo.ninja`
    - appel video garde `jit.si`
    - sonnerie locale ajoutee pour les notifications d'appel
- `app/api/account/route.js` + `lib/schema.js`
  - photo de profil accepte maintenant aussi une image locale en `data:image/...`
- `app/api/conversations/route.js`
  - notifications d'appel et message simplifiees cote serveur

### Verifications reelles executees

- `npm install agentation -D` : OK
- `npm run build` : OK
- QA locale browser sur store temporaire isole : OK
  - absence du bouton `Nouveau`
  - navigation des sous-onglets Parametres
  - import photo locale + sauvegarde profil
  - notification note affichee avec contenu simplifie
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : alias principal confirme
- homepage prod `200`
- homepage prod contient `v1.7.1`

### Etat de deploiement

- alias principal conserve:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-9y3yfkd8v-meinays-projects.vercel.app`
- version UI:
  - `v1.7.1`

### Priorites restantes pour la prochaine IA

- calendrier:
  - vraie vue jour / heures cliquables / duree par defaut 1h
  - invitation de contacts sur evenement + notif associee
- signets:
  - previews riches
  - image seule / texte seul
  - couvertures TikTok/Reels/Shorts
- conversations:
  - appel audio vraiment temps reel in-app
  - vraie gestion de theme de discussion
  - moderation / favoris tries / recherche plus poussee
- responsive global:
  - dashboard sans scroll parasite desktop/mobile
  - blocs plus modulaires et drag & drop
- i18n:
  - anglais integral sur toute l'app, pas seulement les parametres

## Mise a jour - 29/03/2026 23:21

### Fait dans cette passe

- `app/FlowApp.jsx`
  - dashboard:
    - cartes `Vue rapide` cliquables
    - `A suivre maintenant` recentre sur les evenements calendrier
    - `Boite de reception` persistante avec messages + notifications non lues
    - bloc `Contacts recents` ajoute
    - action rapide `Ajouter un signet` ajoutee dans le hero
  - calendrier:
    - selection d'un jour depuis la grille
    - vraie vue jour sous la grille
    - liste de creneaux horaires cliquables
    - creation d'evenement pre-remplie sur 1h depuis un creneau
    - affichage des invites sur les cartes du jour
  - signets:
    - modal enrichie `lien / image / texte`
    - support image locale
    - apercu distant recupere via l'API
    - nouvelle grille plus riche avec couverture, source et resume
  - photo locale:
    - compression image cote client avant stockage pour limiter les payloads
- `app/api/events/route.js`
  - nouvelle route serveur pour creer un evenement partage
  - duplication de l'evenement chez les invites
  - notification et entree d'activite chez l'invite
- `app/api/link-preview/route.js`
  - nouvelle route serveur pour extraire:
    - titre
    - description
    - image de couverture
    - source
  - fallback YouTube gere pour les miniatures video
- `lib/schema.js`
  - schema et normalisation etendus pour:
    - `events.endTime`
    - `events.participantIds`
    - `events.attendees`
    - `bookmarks.type`
    - `bookmarks.coverUrl`
    - `bookmarks.previewTitle`
    - `bookmarks.previewText`
    - `bookmarks.sourceLabel`
    - `bookmarks.mediaKind`
    - `bookmarks.text`
    - `bookmarks.note`

### Verifications reelles executees

- `npx next build --debug` : OK
- smoke tests locaux sur store temporaire chiffre dedie:
  - inscription compte QA : OK
  - creation evenement via `/api/events` : OK
  - persistance `endTime` : OK
  - preview lien via `/api/link-preview` : OK
  - sauvegarde d'un signet riche via `/api/db` puis relecture session : OK
  - invitation calendrier entre 2 comptes QA:
    - evenement visible chez l'invite : OK
    - notification presente chez l'invite : OK

### Etat de deploiement

- version UI locale preparee:
  - `v1.8.0`
- redeploiement production:
  - a faire juste apres cette mise a jour des fichiers de reprise

### Priorites restantes pour la prochaine IA

- calendrier:
  - edition/suppression partagee des evenements invites
  - gestion des reponses `accepte / refuse / peut-etre`
- signets:
  - edition/suppression depuis la carte
  - support preview encore plus large pour TikTok/Reels selon les limites des pages distantes
- dashboard / responsive:
  - continuer le travail pour tenir encore mieux dans les petites hauteurs d'ecran
- conversations:
  - appels audio vraiment temps reel in-app
  - theming de discussion plus pousse
- produit:
  - vrai i18n integral
  - modularite / drag and drop des blocs

## Mise a jour - 29/03/2026 23:28

### Fait dans cette passe

- `app/FlowApp.jsx`
  - `Parametres > Apparence` passe en mode live
  - theme, accent, langue, taille de police, police et durees focus/pause:
    - application immediate
    - sauvegarde automatique
  - suppression du bouton `Appliquer l'apparence`
  - ajout d'un texte explicite indiquant que la synchro est automatique

### Verifications reelles executees

- `npx next build --debug` : OK
- verification code:
  - plus aucune occurrence de `saveAppearance`
  - plus aucun bouton `Appliquer l'apparence`

### Etat de deploiement

- version UI locale preparee:
  - `v1.8.1`
- redeploiement production:
  - a faire juste apres cette mise a jour des fichiers de reprise

## Mise a jour - 29/03/2026 23:56

### Fait dans cette passe

- `app/api/events/route.js`
  - extension de la route calendrier partage avec 3 nouvelles actions:
    - `update-event`
    - `delete-event`
    - `respond-event`
  - suppression propagee chez tous les participants
  - edition propagee chez tous les participants
  - reponses invitees persistantes:
    - `confirmed`
    - `maybe`
    - `declined`
  - notifications + activite alimentees lors des mises a jour, annulations et reponses
  - compatibilite prevue avec les anciens evenements locaux sans `createdBy` ni `participantIds`
- `app/FlowApp.jsx`
  - modal evenement passe en mode creation/edition
  - conservation prudente des invites et des liens existants pendant l'edition pour eviter toute perte
  - vue calendrier jour enrichie avec:
    - statut de chaque invite
    - boutons `Modifier` / `Supprimer` pour le createur
    - boutons `Accepter` / `Peut-etre` / `Refuser` pour les invites
  - cartes evenement plus lisibles avec statuts inline
- `lib/release.js`
  - version locale preparee en `v1.9.0`

### Verifications reelles executees

- `npm run build` : OK
- verification build:
  - route `POST /api/events` compile toujours correctement
  - route `api/events` presente dans la sortie Next
- tentative de smoke HTTP locale:
  - non exploitable dans cet environnement sandbox pour les appels localhost separes

### Choix de securite / risque evite

- pas de QA ecriture authentifiee sur le serveur local courant, car `.env.local` pointe sur le vrai store chiffre de production
- pas de redeploiement automatique en prod dans cette passe, car la nouvelle logique calendrier merite un test isole ecriture/lecture sur store QA dedie avant mise en ligne

### Etat de deploiement

- alias principal a conserver:
  - `https://flow-online-aymen.vercel.app`
- version UI locale preparee:
  - `v1.9.0`
- redeploiement production:
  - en attente volontaire apres QA ecriture isolee du calendrier partage

### Priorites restantes pour la prochaine IA

- faire un vrai QA calendrier sur store temporaire chiffre:
  - creation partagee
  - edition partagee
  - suppression partagee
  - reponses `accepte / peut-etre / refuse`
- signets:
  - edition / suppression depuis la carte
- conversations:
  - vocaux reels
  - upload serveur persistant
  - moderation plus poussee

## Mise a jour - 29/03/2026 23:57

### Fait dans cette passe

- QA reel du calendrier partage sur store QA temporaire dedie:
  - blob QA utilise:
    - `https://jsonblob.com/api/jsonBlob/019d3b92-f3a5-7a38-beb3-6405adf0a387`
  - 2 comptes de test crees
  - creation evenement partage: OK
  - duplication chez l'invite: OK
  - statut invite initial `pending`: OK
  - edition partagee: OK
  - reponse invite `maybe`: OK
  - suppression propagee createur + invite: OK
- rebuild propre local:
  - `.next` regeneree
  - `npm run build` : OK
- redeploiement production sur le meme projet Vercel: OK

### Verifications reelles executees

- `npm run build` : OK
- QA Node locale sur serveur isole avec vraies routes:
  - `ownerUpdatedOk: true`
  - `ownerSeesGuestMaybe: true`
  - `ownerEventGone: true`
  - `guestEventGone: true`
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.9.0` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-n51mefo8k-meinays-projects.vercel.app`
- id deployment:
  - `dpl_FQ7zs8h67LMBv5aQGTLKEsZt2csK`
- version UI:
  - `v1.9.0`

### Priorites restantes pour la prochaine IA

- signets:
  - edition / suppression depuis la carte
- conversations:
  - vocaux reels
  - upload serveur persistant
  - moderation plus poussee
- produit:
  - i18n plus large
  - decoupage progressif de `app/FlowApp.jsx`

## Mise a jour - 30/03/2026 00:00

### Fait dans cette passe

- `app/FlowApp.jsx`
  - signets:
    - edition directe depuis chaque carte
    - suppression directe depuis chaque carte
    - modal signet reutilisee en mode creation + edition
    - conservation prudente des liaisons existantes pendant l'edition
    - activite ajoutee sur modification et suppression
- `lib/release.js`
  - version poussee en `v1.9.1`

### Verifications reelles executees

- QA isolee signets sur store temporaire:
  - creation persistante: OK
  - modification persistante: OK
  - suppression persistante: OK
- `npm run build` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.9.1` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-4d2uio1um-meinays-projects.vercel.app`
- id deployment:
  - `dpl_HqPv2GGGhfuYCFMdR4Y5bb6zWvJp`
- version UI:
  - `v1.9.1`

### Priorites restantes pour la prochaine IA

- conversations:
  - vocaux reels
  - upload serveur persistant
- moderation plus poussee
- produit:
  - i18n plus large
  - decoupage progressif de `app/FlowApp.jsx`

## Mise a jour - 30/03/2026 00:06

### Fait dans cette passe

- `app/api/conversations/route.js`
  - nouvelle lecture securisee `GET /api/conversations?view=reports`
  - renvoie uniquement les signalements du compte courant
  - enrichissement avec conversation + expéditeur du message signalé
- `app/FlowApp.jsx`
  - `Parametres > Activite > Signalements` affiche maintenant de vrais signalements persistés
  - rafraichissement des signalements apres action de report
  - vue lisible avec:
    - motif
    - conversation
    - expéditeur
    - aperçu du message
    - détail libre
    - horodatage
- `lib/release.js`
  - version poussee en `v1.9.2`

### Verifications reelles executees

- QA isolee signalements sur store temporaire:
  - creation conversation directe: OK
  - envoi message: OK
  - report message: OK
  - lecture `view=reports`: OK
  - motif / details / expéditeur visibles: OK
- `.next` regeneree proprement
- `npm run build` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.9.2` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-mxze67wum-meinays-projects.vercel.app`
- id deployment:
  - `dpl_FYqPgEotMtLHGzFxPN7qsQ8VLtGG`
- version UI:
  - `v1.9.2`

### Priorites restantes pour la prochaine IA

- conversations:
  - vocaux reels
  - upload serveur persistant
  - moderation plus poussee cote groupe/admin
- produit:
  - i18n plus large
  - decoupage progressif de `app/FlowApp.jsx`

## Mise a jour - 30/03/2026 00:13

### Fait dans cette passe

- `app/FlowApp.jsx`
  - badge version rendu cliquable en auth, sidebar, dashboard et parametres
  - nouveau widget `Journal de version` avec etats:
    - `Termine`
    - `En cours`
    - `A faire`
  - fermeture par clic exterieur + touche `Echap`
  - petit allegement de maintenance:
    - composant `ReleaseBadge`
    - composant `ReleaseWidget`
    - suppression de duplication de rendu du badge
- `lib/release.js`
  - structure etendue avec:
    - `version`
    - `deployedAt`
    - `summary`
    - `changes[]`
  - la release visible dans l'UI devient la source courte de verite pour:
    - ce qui est fini
    - ce qui est en cours
    - ce qui reste
- reprise projet:
  - regle explicite ajoutee pour imposer la mise a jour de la memoire, roadmap et release a chaque passe

### Verifications reelles executees

- validation structure `lib/release.js` via import Node: OK
- `npm run build` : OK
- `npm start -- --hostname 127.0.0.1 --port 3100` : OK
- `curl -I http://127.0.0.1:3100` : `200`
- homepage locale contient `v1.9.3` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.9.3` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-208q0tm9y-meinays-projects.vercel.app`
- id deployment:
  - `dpl_DmMDj1H94eXctE95HYMfDrhbf6ZN`
- version UI:
  - `v1.9.3`

### Priorites restantes pour la prochaine IA

- produit:
  - continuer le decoupage progressif de `app/FlowApp.jsx` sans casser le design
  - garder `lib/release.js` et les 3 fichiers de reprise sync a chaque passe
- conversations:
  - vocaux reels
  - upload serveur persistant
  - moderation/admin groupe plus poussee
- forfaits:
  - branchement Stripe Checkout reel quand les cles seront donnees

## Mise a jour - 30/03/2026 00:52

### Fait dans cette passe

- `app/FlowApp.jsx`
  - sidebar:
    - icones compactes mieux alignees
    - `Habitudes` deplace dans `Organisation`
    - bloc `Organisation` pousse en bas, juste au-dessus du compte
  - dashboard:
    - structure resserree pour mieux tenir selon la hauteur d'ecran
    - `Vue rapide` transformee en vraies cartes compactes
    - `Contacts recents` passe en cartes carrees avec photo/profil
    - blocs dashboard reordonnables par drag and drop
  - notes / projets:
    - drag and drop desktop ajoute pour changer la zone d'une note
    - drag and drop desktop ajoute pour changer la colonne d'une tache
  - calendrier:
    - vue mois a gauche + panneau contextuel a droite
    - detail de jour et creneaux horaires visibles seulement apres clic sur un jour
    - si aucun jour n'est ouvert:
      - panneau de droite = evenements en cours / a venir
    - modal evenement:
      - date custom integree au site
      - heures via boutons custom
      - suppression de l'option de liaison a d'autres modules
  - conversations:
    - panneau infos ne se referme plus a chaque refresh
    - favoris remontes en haut de la liste des conversations
    - envoi plus immediat avec maj locale plus reactive
    - scroll vers le bas renforce a l'ouverture et apres envoi
    - trombone remplace par un vrai mini-choix inline `Fichier / Image`
    - pieces jointes cliquables de facon plus fiable
    - appels audio/video integres dans l'app via salle Jitsi embarquee
- `lib/release.js`
  - release remplacee par l'etat actuel du produit
  - version poussee en `v1.10.0`
  - journal visible mis a jour avec:
    - blocs finis de cette passe
    - `FlowApp` toujours en cours d'allegement
    - messagerie native plus profonde et Stripe encore a faire

### Verifications reelles executees

- `npm run build` : OK
- `npm start -- --hostname 127.0.0.1 --port 3100` : OK
- `curl -I http://127.0.0.1:3100` : `200`
- homepage locale contient `v1.10.0` : OK
- validation import Node de `lib/release.js` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.10.0` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-1qmzfdfdw-meinays-projects.vercel.app`
- id deployment:
  - `dpl_AevxmJgcYzSrMzxr2wb6aQiGo1DU`
- version UI:
  - `v1.10.0`

### Limites / risques restants

- le drag and drop ajoute dans cette passe est surtout fiable sur desktop:
  - mobile/tactile pourra etre encore ameliore avec une couche de gestes dediee
- les appels Jitsi sont maintenant integres dans l'app et plus propres qu'avant, mais ce n'est pas encore une infra audio/video totalement possedee par Flow
- `app/FlowApp.jsx` reste massif malgre l'allegement progressif

### Priorites restantes pour la prochaine IA

- P0 produit / structure
  - poursuivre le decoupage de `app/FlowApp.jsx`
  - continuer a comprimer le dashboard pour tenir encore mieux sur les petites hauteurs
- P1 conversations
  - upload serveur durable
  - vocaux plus longs / plus robustes que le mode court actuel
  - moderation plus poussee
  - vrai temps reel plus fin
- P1 interactions
  - drag and drop tactile / mobile pour dashboard, notes et projets
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie

## Mise a jour - 30/03/2026 01:03

### Fait dans cette passe

- `app/FlowApp.jsx`
  - messagerie:
    - ajout d'un vrai bouton micro dans le composeur
    - enregistrement vocal court via `MediaRecorder`
    - preview du vocal avant envoi
    - lecteur audio directement dans la bulle du message
    - annulation propre pendant l'enregistrement
    - suppression du vocal brouillon avant envoi
  - pieces jointes:
    - images compressees cote client avant envoi
    - fichiers limites volontairement a un poids leger pour rester compatibles avec le store chiffre
    - preview plus lisible dans le composeur
- `lib/conversations.js`
  - sanitation des pieces jointes etendue:
    - fin de la troncature silencieuse a `2000` caracteres pour les data URLs
    - support correct des pieces jointes `voice`
- `app/api/conversations/route.js`
  - sanitation serveur appliquee avant persistance
  - detail de notification plus utile pour:
    - message vocal
    - piece jointe
- `lib/release.js`
  - journal remplace par l'etat courant de cette passe
  - version poussee en `v1.10.1`
  - `Messagerie native plus profonde` passe de `todo` a `wip`

### Verifications reelles executees

- `npm run build` : OK
- validation import Node de `lib/release.js` : OK
- `npm start -- --hostname 127.0.0.1 --port 3100` : OK
- `curl -I http://127.0.0.1:3100` : `200`
- homepage locale contient `v1.10.1` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.10.1` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-ufrsh05t0-meinays-projects.vercel.app`
- id deployment:
  - `dpl_EeYTByecomH73ZwYV1VfWS2rDuSw`
- version UI:
  - `v1.10.1`

### Limites / risques restants

- les vocaux sont maintenant reels et persistants, mais volontairement courts pour ne pas alourdir le blob distant
- les pieces jointes restent pensees pour des fichiers legers tant qu'il n'existe pas d'upload serveur durable
- `app/FlowApp.jsx` reste massif et doit encore etre decoupe

### Priorites restantes pour la prochaine IA

- P0 produit / structure
  - poursuivre le decoupage de `app/FlowApp.jsx`
  - continuer a extraire les blocs les plus volatils
- P1 conversations
  - upload serveur durable
  - moderation plus poussee
  - vraie couche temps reel
  - appels / visio totalement possedes par Flow si un jour une infra dediee est acceptee
- P1 interactions
  - drag and drop tactile / mobile pour dashboard, notes et projets
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie

## Mise a jour - 30/03/2026 01:09

### Fait dans cette passe

- `app/FlowApp.jsx`
  - correctif critique de stabilite:
    - suppression de hooks React places apres le retour anticipe de l'ecran d'auth
    - l'ordre des hooks reste maintenant stable entre chargement anonyme et session connectee
  - le bloc messagerie ajoute juste avant reste conserve:
    - vocaux courts
    - preview
    - lecteur audio
    - garde-fous de pieces jointes
- `lib/release.js`
  - journal remplace par l'etat courant du correctif
  - version poussee en `v1.10.2`

### Cause racine

- le crash client venait d'un non-respect des regles React sur l'ordre des hooks:
  - certains `useCallback` avaient ete places apres `if (!user) return ...`
  - selon l'etat de session, React ne voyait donc pas le meme nombre de hooks

### Verifications reelles executees

- `npm run build` : OK
- validation import Node de `lib/release.js` : OK
- verification code:
  - plus aucun `useCallback` fautif dans cette zone
- homepage locale contient `v1.10.2` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.10.2` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-1ppifdaj0-meinays-projects.vercel.app`
- id deployment:
  - `dpl_5twbu5rvvJdjtEJZDoFMpDsNCGhF`
- version UI:
  - `v1.10.2`

### Priorites restantes pour la prochaine IA

- P0 stabilite / structure
  - poursuivre l'allegement de `app/FlowApp.jsx`
  - continuer a sortir les blocs fragiles du composant principal pour eviter ce type de regression
- P1 conversations
  - upload serveur durable
  - moderation plus poussee
  - vraie couche temps reel
- P1 interactions
  - drag and drop tactile / mobile
- P1 forfaits
  - Stripe Checkout reel

## Mise a jour - 30/03/2026 01:20

### Fait dans cette passe

- allegement structurel:
  - `app/FlowApp.jsx` descend de `5021` a `4674` lignes
  - creation d'un vrai socle modulaire pour accelerer les prochaines passes
- nouveaux modules:
  - `app/flow/release-ui.jsx`
    - badge release
    - widget journal de version
  - `app/flow/useVoiceRecorder.js`
    - logique micro / MediaRecorder
    - brouillon vocal
    - start / stop / cancel
  - `lib/flow/constants.js`
    - constantes produit
    - presets
    - limites de pieces jointes
    - forfaits
  - `lib/flow/ui-helpers.js`
    - helpers purs calendrier / conversations / Jitsi / reorder
  - `docs/fast-modification-strategy.md`
    - plan clair pour les prochaines extractions rapides

### Strategie mise en place

- ne plus recharger tout `FlowApp.jsx` pour chaque passe
- modifier d'abord les modules dedies quand la demande touche:
  - release
  - vocaux
  - constantes produit
  - helpers UI purs
- ordre recommande pour les prochaines extractions:
  - `Conversations`
  - `Dashboard`
  - `Calendrier`

### Verifications reelles executees

- `npm run build` : OK
- verification de structure:
  - nouveaux modules resolus au build : OK
- `npm start -- --hostname 127.0.0.1 --port 3100` : OK
- `curl -I http://127.0.0.1:3100` : `200`
- homepage locale contient `v1.10.3` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- `curl -I https://flow-online-aymen.vercel.app` : `200`
- homepage prod contient `v1.10.3` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-emiodijxe-meinays-projects.vercel.app`
- id deployment:
  - `dpl_A5aqyFLnJXAJxpB1cFuv9NtsNbPr`
- version UI:
  - `v1.10.3`

### Priorites restantes pour la prochaine IA

- P0 vitesse de passe
  - extraire `Conversations` en vue dediee
  - extraire `Dashboard` en vue dediee
  - extraire `Calendrier` en vue dediee
- P1 produit
  - upload serveur durable
  - drag and drop tactile / mobile
  - Stripe Checkout reel

## Mise a jour - 30/03/2026 01:27

### Fait dans cette passe

- protection anti-crash client:
  - ajout de `app/flow/AppCrashGuard.jsx`
  - ajout de `app/error.jsx`
  - ajout de `app/global-error.jsx`
  - `app/page.jsx` wrap maintenant `FlowApp` dans le crash guard
- verification reelle navigateur:
  - ajout de `scripts/check-client.mjs`
  - ajout du script `npm run check:client`
  - installation de `playwright` en devDependency
  - installation locale de Chromium Playwright pour les checks
- bug reel attrape puis corrige pendant cette passe:
  - le smoke test a detecte un vrai bug `setVoiceDraft is not defined`
  - correction appliquee avant de continuer
- `lib/release.js`
  - version poussee en `v1.10.4`

### Verifications reelles executees

- `npm run build` : OK
- `npm run check:client -- http://127.0.0.1:3100` : OK
- `npm run check:client -- https://flow-online-aymen.vercel.app` : OK
- `vercel --prod --yes` : OK
- `vercel inspect flow-online-aymen.vercel.app` : OK
- homepage prod contient `v1.10.4` : OK

### Etat de deploiement

- alias principal confirme:
  - `https://flow-online-aymen.vercel.app`
- deployment production courant:
  - `https://flow-online-aymen-57ixqrrtv-meinays-projects.vercel.app`
- id deployment:
  - `dpl_Az85vt9tdR48TgjNkCMheexsD6mu`
- version UI:
  - `v1.10.4`

### Priorites restantes pour la prochaine IA

- P0 fiabilite
  - garder `npm run check:client` obligatoire avant et apres les grosses passes client
- P0 vitesse de passe
  - extraire `Conversations`
  - extraire `Dashboard`
  - extraire `Calendrier`
