# Flow - Todo, Spec fonctionnelle et pistes d'amelioration

## Backlog prioritaire - 01/05/2026

### Termine

- Continuité de données:
  - ne jamais supprimer les comptes utilisateurs existants
  - ne jamais réinitialiser le store à cause d'une mise à jour visuelle ou produit
  - garder la connexion multi-appareils via le compte unique et le store distant
  - en production, ne jamais recréer automatiquement un store vide si l'URL distante disparaît
  - si le stockage comptes est indisponible, remonter une vraie erreur au lieu de faire croire que le compte n'existe plus
- Shopify:
  - module Shopify ajouté sans casser l'auth existante
  - proxy Shopify branché côté serveur
  - callback OAuth Shopify ajouté
  - widget Shopify présent sur le dashboard d'accueil
  - configuration Shopify maintenant gérée par compte utilisateur
  - écran commandes dédié avec recherche et tri
- Shopify périodes:
  - filtres `Aujourd'hui / Hier / 7 jours / 1 mois / 1 an / Depuis toujours`
  - le widget dashboard, les KPI, le graphique et les commandes suivent la période
  - les commandes traitées de plus de 3 jours sortent de la liste
  - les commandes annulées sortent du CA, du non fulfillé, du top produits et du widget dashboard
- Fond utilisateur:
  - l'utilisateur peut importer une image locale comme fond du thème actif
  - l'utilisateur peut retirer son image et revenir au fond par défaut
- Développement:
  - bouton de remplissage de démo présent dans la topbar
  - injecte des données cohérentes dans le compte courant
  - n'écrase pas une vraie boutique Shopify déjà connectée
- Shell et couches:
  - shell principal verrouillé dans le viewport, sans scroll global de page
  - recherche et notifications passent au premier plan
  - sidebar fermée desktop réduite à la photo ou à l'initiale
  - lock de sidebar désactivé sur téléphone
- Dashboard d'accueil:
  - les cartes hautes sont cliquables
  - le contenu commence à se recentrer sur les données du compte
  - la hiérarchie du dashboard avance vers un vrai résumé utilisateur
  - premier drag and drop persistant sur les zones clés du dashboard

### En cours

- Dashboard d'accueil:
  - rapprocher l'organisation des blocs du niveau de densité et d'alignement déjà atteint dans Shopify
  - pousser encore le tri visuel et les résumés du jour
- Paramètres:
  - pousser encore la page vers une vraie structure `settings app`
  - finir les comportements liés au billing, à la confidentialité et aux raccourcis
- Matière visuelle globale:
  - pousser encore plus loin la cohérence entre tous les panneaux
  - continuer à affiner les profondeurs et halos entre dark et light
- Nettoyage UX:
  - retirer les derniers textes inutiles ou trop “produit Flow”
  - remplacer les derniers boutons secondaires décoratifs quand le bloc entier doit être cliquable
- Fonds animés:
  - remplacer les images statiques actuelles par de vrais fonds dark/light maison animés
- Drag and drop des blocs:
  - préparer une grille sans trous
  - définir le comportement du maintien, du tremblement et du réagencement

### A ameliorer

- Thème clair:
  - continuer à l’éclaircir sans retomber dans un blanc froid
  - garder une ambiance premium minérale
- Mobile:
  - adapter plus finement la hauteur et la densité des blocs
  - la barre latérale doit tenir dans l'écran sans forcer un long scroll
- Shopify mobile:
  - terminé pour les 4 KPI du haut
  - garder ce bloc compact cohérent pendant les prochaines évolutions
  - empêcher tout débordement des textes, notamment dans `Top 5 produits du mois`
- Shopify connecté utilisateur:
  - guider proprement la saisie de clé
  - remonter des erreurs de validation claires si la clé ou la boutique sont invalides

### A faire
- Cartes dashboard:
  - terminé pour la carte Shopify du dashboard et les cartes hautes principales
  - continuer à réorganiser les informations internes, supprimer le bruit et améliorer la hiérarchie
- Dashboard d'accueil orienté utilisateur:
  - afficher des données utiles au compte connecté
  - ne plus afficher de contenu lié au fait que le site Flow existe ou a été créé
- Vue immersive:
  - continuer à la garder desktop only
  - faire vivre toute la navigation modules en haut
  - maintenir les deux structures `tableau / immersive` en parallèle
- Journal de version:
  - l'ouvrir en popup
  - afficher clairement les états `fait / en cours / pas encore fait`
- Déplacement des blocs:
  - terminé sur le dashboard d'accueil
  - étendre plus tard à Shopify et aux futurs modules si ça reste utile
- Shopify filtres:
  - terminé
- Shopify commandes:
  - terminé
- Shopify actions:
  - terminé pour le bouton `Rafraîchir`

## 0. Regle de synchronisation obligatoire

- A chaque mise a jour importante du produit, synchroniser tout de suite:
  - `lib/release.js`
  - `HANDOVER.md`
  - `MEMORY.md`
  - ce fichier roadmap/spec
- Le badge de version visible dans l'app doit toujours afficher:
  - la bonne version
  - la bonne date/heure
  - un widget de changements `termine / en cours / a faire`
- A chaque nouvelle passe, remplacer le contenu du widget par l'etat actuel:
  - ne pas accumuler un historique trop long dans le badge
  - garder l'historique detaille dans `HANDOVER.md` et `MEMORY.md`
- Objectif:
  - qu'une prochaine IA reprenne vite sans re-auditer ce qui a deja ete fait

## 1. Objectif produit

Phase actuelle:
- repartir d'une base technique propre
- garder les comptes existants
- garder l'admin
- garder les integrations critiques
- reconstruire ensuite les modules un par un

Le socle actif doit donc rester simple, beau et rapide, avec:
- un compte unique accessible depuis plusieurs appareils
- une sauvegarde fiable et quasi invisible
- une authentification classique + Google
- une session persistante
- un journal de version fiable
- une notification de mise a jour qui peut relancer la page
- une direction visuelle sobre sur le shell principal et l'admin
- une DA dark/light guidée par `docs/design-theme-memory.md`

## 1.b Routes publiques a conserver

- `/` = experience Flow principale
- `/admin/login` = entree admin

Ces routes doivent garder:
- les memes comptes
- le meme backend
- les memes modules
- les memes donnees

## 2. Inventaire des pages

### Authentification
- Connexion
- Inscription

### Espace principal actuel
- Bloc de connexion minimal
- Bloc d'inscription minimal
- Bloc de reset mot de passe minimal
- Dashboard d’accueil après connexion
- Sidebar hover + lock
- Recherche topbar + palette clavier
- Panneau notifications
- Double structure `overview / immersive`
- Vue immersive desktop sans sidebar
- Vue mobile verrouillée en `overview`
- Profil / Paramètres qui pilote la structure du shell
- Module Shopify
- Journal de version

### Espace principal plus tard
- Tableau de bord
- Notes
- Projets
- Calendrier
- Habitudes
- Focus
- Journal
- Finances
- Signets
- Objectifs
- Parametres

### Administration
- Flow Admin Dashboard
  - sante du service
  - ping / latence
  - version / release
  - analytics globales
  - liste utilisateurs
  - moderation comptes
  - login admin separe
  - creation d'autres admins
  - permissions fines
  - export CSV
  - messages internes admin avec pop-up a la connexion
  - meme DA que Flow
  - filtres chips sans selects natifs visibles
  - longues listes gardees dans des blocs scrollables internes
  - aucune carte ne doit laisser sortir son contenu hors bloc
  - conversations support avec les utilisateurs Flow
  - moderation des signalements messages + bugs interface
  - diffusion d'une notification de nouvelle version a tous les utilisateurs

## 3. Inventaire des boutons et comportements attendus

### Global
- `Nouveau`
  - ouvre le bon modal selon la page courante
  - fallback sur creation de note si la page n'a pas de creation specifique
- `Changer theme`
  - alterne clair/sombre
  - sauvegarde immediatement dans les parametres du compte
- `Changer structure`
  - vit dans `Profil / Paramètres`
  - change toute la structure desktop du site
  - ne doit jamais proposer `immersive` sur téléphone
- `Deconnexion`
  - force une derniere synchro si des changements ne sont pas encore pousses
  - supprime la session
  - renvoie sur l'ecran d'auth
- `Verrouiller la sidebar`
  - laisse la barre ouverte sur desktop
  - l'etat doit être mémorisé entre les visites
- `Recherche topbar`
  - ouvre un dropdown sous l'input
  - ne retourne pas de doublons
  - cherche au minimum notes, contacts, événements, tâches
- `Cmd+K / Ctrl+K`
  - ouvre une palette flottante au centre
  - partage le même index que la recherche du haut
- `Notifications`
  - ouvre un panneau flottant aligné à droite de la topbar
  - permet de lire une notification ou tout marquer lu
- `Rafraîchir Shopify`
  - recharge manuellement les données Shopify
  - si `SHOPIFY_ACCESS_TOKEN` n'est pas encore branché, l'écran affiche un état d'indisponibilité propre sans erreur console bruyante
- `Fond personnalisé`
  - import d'une image locale depuis le profil
  - stockage dans `db.settings.customBackgrounds`
  - suppression possible pour revenir au fond par défaut
  - n'écrit rien en localStorage
  - garde un état de loading et d'erreur propre
- `Notification de mise a jour`
  - doit pouvoir etre envoyee a tous les comptes apres publication
  - doit remonter dans le centre de notifications Flow
  - quand le push web est autorise sur l'appareil, doit aussi pouvoir sortir hors page

### Admin
- `Connexion admin`
  - authentifie uniquement un vrai compte admin
  - aucun flux de creation publique ici
  - reprend maintenant la meme DA visuelle que Flow
- `Rafraichir`
  - recharge les analytics, le ping et la liste utilisateurs
- `Envoyer la notification`
  - pousse un message interne a un utilisateur ou a tous
  - le message doit ensuite etre visible dans Flow et via un pop-up de connexion si non lu
- `Bloquer le compte`
  - marque le compte comme bloque
  - empeche les connexions et operations protegees
- `Debloquer le compte`
  - restaure l'acces au compte
- `Reinitialiser le mot de passe`
  - genere un mot de passe temporaire
  - force la rotation cote securite
- `Supprimer le compte`
  - retire l'utilisateur et nettoie les objets relies
  - la confirmation doit rester dans la carte admin, pas dans un popup natif navigateur
- `Creer l'admin`
  - cree un autre compte admin
  - applique ses permissions
- `Export CSV`
  - exporte les utilisateurs et leurs indicateurs
- `Marquer resolu`
  - cloture un signalement utilisateur
  - conserve une note de resolution visible cote admin
- `Classer sans suite`
  - ferme un signalement sans correction
  - renvoie quand meme un retour lisible a l'utilisateur dans Flow

### Auth
- `Connexion`
  - valide email + mot de passe
  - charge toutes les donnees du compte
  - restaure le theme et l'etat utilisateur
- `Inscription`
  - cree le compte
  - initialise une base vide
  - connecte directement l'utilisateur

### Tableau de bord
- le hero principal doit suivre le theme actif, y compris en mode clair
- `Voir tout` sur taches
  - ouvre `Projets`
- `Voir tout` sur evenements
  - ouvre `Calendrier`

### Shell mobile
- la barre de recherche mobile doit ouvrir la Command Palette avec focus direct sur l'input
- le libelle de recherche doit rester lisible sans etre coupe
- le footer d'aide clavier de la palette reste masque en mobile
- le popup forfait doit exister aussi sur telephone
- ouverture et fermeture de sidebar doivent suivre le doigt
- le site ne doit jamais permettre un scroll horizontal parasite

### Notes
- `Nouvelle note`
  - ouvre le modal note
- `Retour`
  - quitte l'edition
- `Enregistrer`
  - persiste le titre et le contenu
- `Supprimer`
  - demande confirmation
  - retire la note

### Projets
- `Nouvelle tache`
  - ouvre le modal tache
- clic sur une tache
  - ouvre le detail de carte
  - le double-clic fait avancer la tache dans la colonne suivante
- `+ Tache`
  - ouvre le modal tache
- `Template`
  - ouvre la creation de template reutilisable
- detail de carte
  - gere sous-taches
  - gere commentaires
  - gere reactions
  - gere roles `Viewer` / `Editor`

### Calendrier
- `‹` et `›`
  - changent de mois
- `Aujourd'hui`
  - revient au mois courant
- `Evenement`
  - ouvre le modal evenement

### Habitudes
- `Habitude`
  - ouvre le modal habitude
- clic sur un jour
  - toggle fait/pas fait pour la semaine

### Focus
- `Play/Pause`
  - lance ou stoppe le timer
- `Reset`
  - remet le mode courant a sa duree initiale
- `Suivant`
  - passe du focus a la pause, ou de la pause au focus
- `Focus/Pause/Pause longue`
  - change le mode si le timer n'est pas en cours

### Journal
- `Aujourd'hui`
  - ouvre l'entree du jour si elle existe
  - la cree sinon
- `Retour`
  - revient a la liste
- clic sur humeur
  - met a jour l'emoji du jour

### Finances
- `Transaction`
  - ouvre le modal transaction

### Signets
- `Signet`
  - ouvre le modal signet
- clic sur une carte
  - ouvre le lien dans un nouvel onglet

### Objectifs
- `Objectif`
  - ouvre le modal objectif
- clic sur un objectif
  - augmente la progression de 10%
  - plafonne a 100%

### Parametres
- `Theme`
  - sauvegarde immediatement
- `Duree focus`
  - met a jour la configuration du minuteur
- `Exporter`
  - telecharge un JSON complet
- `Tout supprimer`
  - demande confirmation
  - reinitialise uniquement les donnees du compte
  - conserve nom, email et acces au compte

## 4. Fonctionnement systeme de A a Z

### Compte
1. l'utilisateur cree un compte
2. le mot de passe est hache cote serveur
3. le profil est cree avec une base vide
4. une session signee est renvoyee en cookie
5. la session recharge automatiquement le workspace au retour

### Sauvegarde
1. l'utilisateur modifie une donnee
2. le front met a jour l'UI instantanement
3. une synchro differee part cote serveur
4. si l'onglet se ferme vite, un `sendBeacon` tente la derniere sauvegarde
5. a la prochaine connexion sur n'importe quel appareil, les donnees reviennent

### Administration
1. l'admin ouvre `/admin`
2. si aucune session admin dediee n'existe, il est redirige vers `/admin/login`
3. la session admin est verifiee via un cookie dedie `flow_admin_session`
4. le dashboard lit le meme store chiffre que Flow
5. l'acces admin passe soit par `FLOW_ADMIN_EMAILS`, soit par le premier compte cree en fallback
6. les actions admin ecrivent dans le store sans dupliquer de base

### Synchronisation
1. le cookie identifie la session
2. l'API charge les donnees du compte
3. le client remplit l'etat local
4. chaque modification remonte vers le stockage distant

### Securite
1. les sessions sont signees et expirees
2. les mots de passe sont haches avec `scrypt`
3. les nouvelles versions utilisent un pepper cote serveur
4. le coffre distant est chiffre cote serveur
5. un limiteur freine les tentatives de login/register abusives
6. les payloads trop gros sont rejetes
7. les champs principaux sont nettoyes et limites

## 5. Todo produit complete

### A ajouter
- filtres par categorie, date, priorite, statut
- suppression rapide des taches
- gestion de projets nommes, pas seulement des colonnes kanban
- rappels et notifications
- import de sauvegarde JSON
- mode hors ligne avec resynchronisation
- corbeille avec restauration
- templates de notes et de journaling
- stats hebdo et mensuelles plus riches

### A ameliorer
- ergonomie mobile des tableaux et cartes
- feedback de synchro plus explicite
- edition inline sur plus de modules
- gestion des erreurs reseau avec retry intelligent
- historique d'activite exploitable
- affichage de deadlines en retard plus visible
- personnalisation accent/couleurs
- onboarding du premier lancement

### Fait recemment
- passe auth/theme `v1.22.0`:
  - palette sombre rapprochee de l'image 1
  - reset mot de passe avec lien direct de secours sans SMTP
  - routes Google OAuth ajoutees cote serveur
- passe stabilisation `v1.21.1`:
  - filtres dashboard enfin relies aux donnees affichees
  - mini calendrier navigable
  - flux de reset mot de passe corrige jusqu'a l'etat final
- passe visuelle `v1.21.0`:
  - nouvelle direction dark premium avec halo haut gauche
  - dashboard remonte des filtres `hier / aujourd'hui / semaine / mois / annee`
  - dock mobile bas avec bouton plus central
  - auth redesign + reset mot de passe par email
- passe navigation `v1.20.1`:
  - Parametres passent en mode liste puis detail sur telephone/tablette
  - chaque bloc de reglage ouvre une page de detail dediee avec retour
- passe interface `v1.20.0`:
  - tiroir notifications a droite avec switch appareil
  - gestes retour / avance mieux separes de la sidebar mobile
  - widget profil et page Parametres restructures
  - notifications de release dedupliquees cote serveur
- passe de cloture `v1.19.1`:
  - journal de version visible remis en etat final
  - docs de reprise resynchronisees avec la version publiee
  - publication de release standardisee via `npm run publish:release`
  - envoi push fiabilise meme si une variable VAPID contient un retour ligne parasite
- passe de reprise `v1.15.1` validee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release et docs de continuites resynchronises
- mise en ligne sur le lien principal validee:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe mobile UX `v1.15.2` validee localement:
  - dashboard mobile compacte sans scroll principal
  - glissements lateraux pour menu et historique de vues
  - bouton aide retire de la topbar mobile
  - badge release reduit a la version seule
- passe mobile UX `v1.15.2` mise en ligne et reverifiee:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe design premium `v1.16.0` validee et mise en ligne:
  - direction visuelle globale alignee sur la reference design
  - dashboard desktop mieux organise
  - dashboard mobile plus lisible et moins serre
  - smoke test public OK
- `Flow Admin Dashboard` ajoute:
  - supervision service
  - liste utilisateurs
  - notifications admin
  - blocage / deblocage
  - reset mot de passe
  - suppression compte
- admin avance ajoute:
  - login admin separe
  - session admin dediee
  - permissions granulaires
  - creation d'autres admins
  - export CSV enrichi
  - journal d'audit
  - presence / comptes en ligne plus fiable
- Kanban `Projets` enrichi:
  - templates de taches reutilisables
  - sous-taches par carte
  - commentaires de carte
  - reactions rapides
  - membres et roles `Viewer` / `Editor`
- comptes bloques refuses sur:
  - login
  - session
  - sauvegarde
  - compte
  - conversations
  - evenements
- reprise locale `v1.17.0` reverifiee:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe rapide `v1.17.1` reverifiee:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe rapide `v1.17.1` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe shell `v1.17.2` reverifiee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe shell `v1.17.2` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe shell `v1.17.3` reverifiee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- shell affine:
  - recherche compacte a gauche
  - actions topbar a droite
  - lock sidebar revenu
  - icones compactes sans carre
  - widget abonnement replace en bas du menu ouvert
- passe shell `v1.17.3` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe shell `v1.17.4` reverifiee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe shell `v1.17.4` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe shell `v1.17.5` reverifiee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe shell `v1.17.5` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- passe shell `v1.17.6` reverifiee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe shell `v1.17.6` mise en ligne:
  - alias `https://flow-online-aymen.vercel.app` conserve
  - smoke test public OK
- topbar mobile finie:
  - vraie zone de recherche centrale
- sidebar mobile encore allegee:
  - largeur reduite
  - widget abonnement masque pour laisser les modules visibles
- shell clair nettoye:
  - derniers boutons et blocs shell harmonises
- finition shell claire:
  - plus de blocs et boutons du shell reprennent enfin les surfaces claires
- sidebar mobile compacte:
  - largeur reduite
  - compression supplementaire pour mieux tenir sans scroll
- gestes mobiles retouches:
  - fermeture de sidebar
  - pull-to-refresh avec contenu qui suit le doigt
  - glissement lateral plus colle au doigt
- shell mobile affine:
  - sidebar qui suit le doigt
  - loupe d'entete qui ouvre la Command Palette
  - pull-to-refresh Flow sans reload complet
- dashboard recompacte:
  - chevauchements corriges
  - drag and drop desktop revenu
  - densite mobile reduite
- theme clarifie:
  - shell clair plus coherent
- transitions ajoutees:
  - changement de module plus fluide
  - retour / avance mobile plus lisible
- dashboard shell corrige:
  - widgets drag and drop plus propres
  - faux boutons panneau retires
- sidebar compacte corrigee:
  - icones modules visibles quand le menu est ferme
- topbar corrigee:
  - notifications, theme et profil regroupes a droite
- bloc forfait corrige:
  - widget abonnement reserve a la sidebar ouverte
  - animation d'entree sur le bas du menu
- `Finances` expose maintenant une vraie vue:
  - solde
  - revenus
  - depenses
  - suppression transaction
- `Objectifs` expose maintenant une vraie vue:
  - progression visible
  - ajustement `-10% / +10%`
  - suppression objectif
- navigation, recherche globale et command palette resynchronisees avec `Finances` et `Objectifs`
- profil compte enrichi:
  - identifiant unique
  - nom complet
  - telephone prive/public
  - photo de profil
  - changement email / mot de passe avec verification
- calendrier enrichi:
  - creation d'evenements partages avec invites
  - reponses participant `accepte / peut-etre / refuse`
  - edition et suppression synchronisees
- signets enrichis:
  - apercu automatique des liens
  - mode lien / image / texte plus propre
- store distant plus robuste:
  - lecture `no-store`
  - ecriture serialisee avec verrou local
- recherche globale topbar deja en place
- Command Palette clavier `Cmd/Ctrl + K` en place:
  - recherche temps reel avec fuzzy matching
  - ouverture notes, taches, evenements, habitudes, conversations, signets et modules
  - actions rapides `Nouvelle note`, `Nouvelle tache`, `Aller a ...`
- raccourcis clavier configurables en place:
  - capture directe dans `Parametres > Raccourcis`
  - navigation modules + creations rapides + theme + palette
  - reset complet des raccourcis par defaut

### A modifier
- `Projets` doit gerer de vrais projets et pas seulement une liste de taches
- `Calendrier` doit permettre edition/suppression rapide
- `Journal` peut ajouter tags, humeur multiple et prompts
- `Finances` peut gagner des filtres par mois/categorie
- `Objectifs` peut gagner sous-etapes et milestones

### A supprimer ou simplifier
- etats inutilises comme `projects` tant qu'il n'y a pas de vraie UI associee
- champs systeme non exploites en front si aucune roadmap court terme
- elements purement decoratifs qui n'apportent pas de feedback utile

## 6. Idees produit inspirees des besoins frequents des utilisateurs

### Besoins recurrentement attendus
- tout retrouver vite
- ne rien perdre entre mobile et desktop
- comprendre ce qui est prioritaire aujourd'hui
- avoir moins de friction pour capturer une idee
- retrouver une sensation de progression
- pouvoir personnaliser sans casser la simplicite

### Idees fortes
- page `Inbox` universelle pour notes rapides, liens, idees, brouillons
- vue `Today` qui combine taches, habitudes et evenements du jour
- vue `Weekly Review` qui resume la semaine en 2 minutes
- commentaires personnels sur les taches et evenements
- reactions rapides type `utile`, `urgent`, `a revoir`
- favoris / pin sur notes et objectifs importants
- systeme de suggestions automatiques:
  - convertir une note en tache
  - convertir une tache en objectif
  - convertir un evenement en rappel
- mode communaute plus tard:
  - templates publics
  - bibliotheque de routines
  - prompts de journal populaires

## 7. Definition du niveau "premium"

Flow doit donner l'impression:
- d'etre instantane
- d'etre rassurant
- d'etre elegant sans etre surcharge
- d'etre personnel
- d'etre plus proche d'un cockpit calme que d'un tableau complique

## 8. Verification a faire a chaque mise a jour

- creation de compte
- connexion
- deconnexion
- theme clair/sombre
- creation note
- edition note
- suppression note
- creation tache
- avancement kanban
- creation evenement
- creation habitude
- toggle habitude semaine
- timer focus start/pause/reset
- creation entree journal
- creation transaction
- creation signet
- creation objectif
- export JSON
- reset complet du workspace
- persistance apres refresh
- persistance apres reconnexion
- persistance sur un second appareil

## 9. Audit prioritaire du 29/03/2026

### P0
- fiabiliser totalement `Parametres > Profil`
- garder une validation serveur reelle sur identifiant, telephone, photo et mot de passe
- eliminer tout comportement trompeur ou semi-fini sur les flux critiques

### P1
- rendre `Parametres > Activite` vraiment utile et plus exhaustive
- fermer les trous de la messagerie:
  - suppression de conversation
  - edition de conversation/groupe
  - signalement
  - vocaux reels
  - uploads serveur natifs

### P2
- decouper progressivement le gros fichier `app/FlowApp.jsx` en blocs plus maintenables
- rendre les forfaits plus credibles en preparant les etats et droits avant Stripe

## 10. Passe realisee le 29/03/2026 21:50

- identifiant de profil maintenant unique et normalise
- telephone de profil maintenant normalise pour mieux servir la recherche utilisateur
- photo de profil validee en vraie URL web
- inscription alignee sur 8 caracteres minimum
- recherche utilisateur par telephone amelioree
- ecriture du store serialisee cote serveur pour reduire le risque d'ecrasement
- messagerie:
  - update groupe
  - delete conversation/groupe
  - report message
- page activite:
  - resume
  - filtres
- verifications reelles executees:
  - build
  - serveur local
  - login
  - update profil
  - session
  - recherche identifiant / telephone
  - refus identifiant duplique
  - create/update/delete conversation
  - report message
  - redeploiement prod sur le meme alias

## 11. Passe realisee le 29/03/2026 22:30

- stabilisation UX critique:
  - suspension des refresh auto pendant la saisie texte
  - correction reelle du bug de focus en note et conversation
- sidebar:
  - compact desktop seulement
  - mobile garde le mode precedent
  - compact nettoye visuellement:
    - logo + `Flow` en haut
    - avatar seul en bas
    - tuiles modules carrees
- notes:
  - categories avant la liste de notes
  - creation `titre + zone`
  - plus de select natif pour la zone note
  - ouverture immediate de la note apres creation
  - topbar d'ajout masque quand le module est vide
- habitudes:
  - duree cible en minutes
  - jours planifies
  - presets visuels
  - ajout manuel de temps
  - edition / suppression
  - recap semaine precedente
  - streak plus fiable
- verifications reelles executees:
  - build local
  - QA navigateur locale sur store temporaire isole
  - deploiement prod sur le meme alias
  - verification homepage prod `200`
  - verification version prod `v1.7.0`

## 12. Passe realisee le 29/03/2026 22:58

- ajout de `Agentation` en dev:
  - annotation visuelle des zones UI
  - support de feedback plus precis pour les prochaines passes
- suppression du bouton `Nouveau` du topbar
- notifications:
  - presentation plus compacte basee sur le contenu
  - icones par type
  - nettoyage des notifications lues a la fermeture
- parametres:
  - sous-onglets stabilises
  - import photo locale possible
  - backend compatible `data:image`
- conversations:
  - recherche de gauche reservee aux conversations existantes
  - creation direct/groupe derriere un bouton `+`
  - panneau infos via l'en-tete
  - auto-scroll bas
  - recherche locale dans le chat
  - medias / fichiers listables
  - audio via `vdo.ninja`
  - video conserve `jit.si`
  - sonnerie locale sur appel
- verifications reelles executees:
  - install `agentation`
  - build local
  - smoke browser local sur store isole
  - redeploiement prod sur le meme alias
  - verification version prod `v1.7.1`

## 13. Passe realisee le 29/03/2026 23:21

- dashboard:
  - `Vue rapide` cliquable
  - `A suivre maintenant` limite aux evenements calendrier
  - bloc `Boite de reception` plus utile et persistant
  - bloc `Contacts recents` ajoute
- calendrier:
  - selection de jour depuis la vue mois
  - vue jour detaillee ajoutee sous la grille
  - clic sur un creneau horaire = prefill evenement de 1h
  - invites affiches dans les cartes du jour
- partage evenement:
  - nouvelle route `POST /api/events`
  - creation d'evenement cote createur
  - duplication cote invite
  - notification cote invite
- signets:
  - nouvelle structure `link / image / text`
  - support image locale
  - nouvelle route `GET /api/link-preview`
  - recuperation metadata distante + fallback YouTube
  - cartes signets plus riches
- verifications reelles executees:
  - `npx next build --debug`
  - smoke sur store temporaire chiffre:
    - register
    - create event
    - persistance signet riche
    - preview lien
    - invitation evenement entre 2 comptes

## 14. Passe realisee le 29/03/2026 23:28

- parametres:
  - section `Apparence` convertie en mode live
  - suppression du bouton d'application
  - sauvegarde automatique des reglages visuels
- verifications reelles executees:
  - `npx next build --debug`
  - verification de la disparition de `saveAppearance`
  - verification de la disparition du bouton `Appliquer l'apparence`

## 15. Passe realisee le 29/03/2026 23:56

- calendrier partage:
  - edition d'un evenement existant
  - suppression propagee chez tous les participants
  - reponses invite persistantes:
    - accepte
    - peut-etre
    - refuse
  - statuts participants visibles dans la vue jour
- route `POST /api/events` etendue:
  - `update-event`
  - `delete-event`
  - `respond-event`
  - activite + notifications sur modification / annulation / reponse
  - compatibilite minimale gardee pour anciens evenements locaux sans metadata de partage
- modal evenement:
  - mode creation + edition
  - conservation prudente des invites et liens existants pendant l'edition
- verifications reelles executees:
  - `npm run build`
  - confirmation que `api/events` reste exposee au build
- decision de prudence:
  - pas de redeploiement prod dans cette passe
  - raison:
    - environnement local pointe sur le vrai store chiffre
    - la logique partagee doit encore etre testee en ecriture sur un store QA dedie avant mise en prod

## 16. Passe realisee le 29/03/2026 23:57

- QA isolee calendrier partage:
  - 2 comptes QA reels
  - create / update / respond / delete verifies
  - propagation invite reelle verifiee
- build propre relance apres nettoyage de `.next`
- redeploiement production effectue sur le projet Vercel existant
- alias principal `flow-online-aymen.vercel.app` confirme
- version prod servie:
  - `v1.9.0`

## 17. Passe realisee le 30/03/2026 00:00

- signets:
  - edition directe depuis la grille
  - suppression directe depuis la grille
  - modal create/edit unifiee
  - conservation prudente des liaisons existantes en edition
- verification reelle:
  - create / update / delete signet sur store QA isole
  - `npm run build`
  - redeploiement prod
  - alias principal confirme
  - version prod servie:
    - `v1.9.1`

## 18. Passe realisee le 30/03/2026 00:13

- release / continuite:
  - badge version cliquable en auth, sidebar, dashboard et parametres
  - widget `Journal de version` avec statuts:
    - termine
    - en cours
    - a faire
  - `lib/release.js` etendu pour piloter:
    - version
    - date/heure
    - resume
    - liste des changements
  - regle de synchronisation ajoutee dans la doc de reprise
- maintenance:
  - duplication reduite dans `app/FlowApp.jsx` avec:
    - `ReleaseBadge`
    - `ReleaseWidget`
- verifications reelles executees:
  - validation Node de la structure `lib/release.js`
  - `npm run build`
  - `npm start -- --hostname 127.0.0.1 --port 3100`
  - `curl -I http://127.0.0.1:3100`
  - homepage locale version `v1.9.3`
  - redeploiement prod
  - alias principal confirme
  - homepage prod version `v1.9.3`

## 19. Priorites actives apres `v1.9.3`

- P0 maintenance durable
  - continuer le decoupage progressif de `app/FlowApp.jsx`
  - garder `lib/release.js` et la doc de reprise sync a chaque passe
- P1 conversations
  - vocaux reels
  - upload serveur persistant
  - moderation / admin groupe plus poussee
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie
- P2 produit
  - i18n plus large
  - enrichissement progressif du journal d'activite

## 20. Passe realisee le 30/03/2026 00:52

- sidebar:
  - rangement compact corrige
  - `Habitudes` deplace dans `Organisation`
  - `Organisation` descendue en bas de la barre
- dashboard:
  - cartes plus compactes
  - `Vue rapide` en vraies cartes
  - `Contacts recents` en cartes carrees photo
  - blocs du dashboard reordonnables en drag and drop desktop
- notes / projets:
  - note deplacable vers une autre zone
  - tache deplacable vers une autre colonne
- calendrier:
  - mois principal conserve
  - detail jour + creneaux seulement apres clic
  - panneau droit = evenements en cours tant qu'aucun jour n'est ouvert
  - modal evenement avec date custom + heures custom
  - option de liaisons retiree du flux evenement
- conversations:
  - panneau infos stabilise
  - favoris remontes en haut
  - envoi plus reactif
  - scroll bas renforce
  - pieces jointes plus fiables
  - appels / visio integres via Jitsi embarque
- verifications reelles executees:
  - `npm run build`
  - `npm start -- --hostname 127.0.0.1 --port 3100`
  - `curl -I http://127.0.0.1:3100`
  - homepage locale version `v1.10.0`
  - `vercel --prod --yes`
  - alias principal confirme
  - homepage prod version `v1.10.0`

## 21. Todo active apres `v1.10.0`

- P0 architecture / vitesse de passe
  - poursuivre l'allegement progressif de `app/FlowApp.jsx`
  - continuer a extraire les blocs les plus volatils
- P0 dashboard / responsive
  - continuer a faire tenir encore mieux le dashboard sur petites hauteurs desktop/mobile
- P1 drag and drop
  - couche tactile / mobile pour dashboard, notes et projets
- P1 messagerie
  - upload serveur persistant
  - moderation plus poussee
  - temps reel plus fin
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie

## 22. Passe realisee le 30/03/2026 01:03

- conversations:
  - enregistrement vocal court via micro
  - preview avant envoi
  - lecteur audio embarque dans les bulles
  - annulation et suppression du brouillon vocal
- pieces jointes:
  - images compressees avant envoi
  - fichiers limites a un poids plus realiste pour le store chiffre
  - sanitation serveur corrigee pour les data URLs longues
  - notifications plus claires pour vocal / piece jointe
- release:
  - `lib/release.js` remplace le journal par l'etat courant de cette passe
  - version `v1.10.1`
- verifications reelles executees:
  - `npm run build`
  - validation import Node de `lib/release.js`
  - `npm start -- --hostname 127.0.0.1 --port 3100`
  - `curl -I http://127.0.0.1:3100`
  - homepage locale version `v1.10.1`
  - `vercel --prod --yes`
  - `vercel inspect flow-online-aymen.vercel.app`
  - homepage prod version `v1.10.1`

## 23. Todo active apres `v1.10.1`

- P0 architecture / vitesse de passe
  - poursuivre l'allegement progressif de `app/FlowApp.jsx`
  - continuer a extraire les blocs les plus volatils
- P0 dashboard / responsive
  - continuer a faire tenir encore mieux le dashboard sur petites hauteurs desktop/mobile
- P1 drag and drop
  - couche tactile / mobile pour dashboard, notes et projets
- P1 messagerie
  - upload serveur persistant
  - moderation plus poussee
  - temps reel plus fin
  - appels / visio totalement possedes par Flow si une infra dediee est acceptee
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie

## 24. Passe realisee le 30/03/2026 01:09

- correctif critique:
  - suppression d'un crash client au chargement
  - cause racine:
    - hooks React places apres le retour conditionnel de l'ecran d'auth
  - correction:
    - callbacks de cette zone repasses en fonctions simples
    - ordre des hooks stabilise
- produit:
  - le bloc vocaux courts de `v1.10.1` est conserve
  - les garde-fous de pieces jointes sont conserves
- verifications reelles executees:
  - `npm run build`
  - validation import Node de `lib/release.js`
  - verification code des hooks fautifs
  - homepage locale version `v1.10.2`
  - `vercel --prod --yes`
  - `vercel inspect flow-online-aymen.vercel.app`
  - homepage prod version `v1.10.2`

## 25. Todo active apres `v1.10.2`

- P0 stabilite / architecture
  - poursuivre l'allegement progressif de `app/FlowApp.jsx`
  - sortir les blocs fragiles du composant principal
- P0 dashboard / responsive
  - continuer a faire tenir encore mieux le dashboard sur petites hauteurs desktop/mobile
- P1 drag and drop
  - couche tactile / mobile pour dashboard, notes et projets
- P1 messagerie
  - upload serveur persistant
  - moderation plus poussee
  - temps reel plus fin
  - appels / visio totalement possedes par Flow si une infra dediee est acceptee
- P1 forfaits
  - Stripe Checkout reel
  - abonnements mensuel / annuel / a vie

## 26. Passe realisee le 30/03/2026 01:20

- allegement structurel:
  - extraction du badge / widget release dans `app/flow/release-ui.jsx`
  - extraction du hook vocal dans `app/flow/useVoiceRecorder.js`
  - extraction des constantes produit dans `lib/flow/constants.js`
  - extraction des helpers purs dans `lib/flow/ui-helpers.js`
- impact:
  - `app/FlowApp.jsx` passe de `5021` a `4674` lignes
  - prochaines passes plus rapides sur les zones volatiles
- doc:
  - nouvelle feuille de route structurelle:
    - `docs/fast-modification-strategy.md`
- verifications reelles executees:
  - `npm run build`
  - `npm start -- --hostname 127.0.0.1 --port 3100`
  - `curl -I http://127.0.0.1:3100`
  - homepage locale version `v1.10.3`
  - `vercel --prod --yes`
  - `vercel inspect flow-online-aymen.vercel.app`
  - homepage prod version `v1.10.3`

## 27. Todo active apres `v1.10.3`

- P0 vitesse de passe
  - extraire `Conversations` en vue dediee
  - extraire `Dashboard` en vue dediee
  - extraire `Calendrier` en vue dediee
- P1 produit
  - upload serveur persistant
  - drag and drop tactile / mobile
  - Stripe Checkout reel

## 28. Passe realisee le 30/03/2026 01:27

- fiabilite client:
  - ajout de `AppCrashGuard`
  - ajout de `app/error.jsx`
  - ajout de `app/global-error.jsx`
  - wrap de `FlowApp` au niveau de `app/page.jsx`
- QA reelle navigateur:
  - ajout de `scripts/check-client.mjs`
  - ajout de `npm run check:client`
  - installation de `playwright`
  - le check a detecte un vrai bug client puis a repasse au vert apres correction
- verifications reelles executees:
  - `npm run build`
  - `npm run check:client -- http://127.0.0.1:3100`
  - `npm run check:client -- https://flow-online-aymen.vercel.app`
  - `vercel --prod --yes`
  - `vercel inspect flow-online-aymen.vercel.app`

## 29. Todo active apres `v1.10.4`

- P0 fiabilite
  - garder `npm run check:client` obligatoire
- P0 vitesse de passe
  - extraire `Conversations`
  - extraire `Dashboard`
  - extraire `Calendrier`
- P1 produit
  - upload serveur persistant
  - drag and drop tactile / mobile
  - Stripe Checkout reel
