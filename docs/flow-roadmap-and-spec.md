# Flow - Todo, Spec fonctionnelle et pistes d'amelioration

## 1. Objectif produit

Flow doit rester une workspace app simple, belle et rapide, avec:
- un compte unique accessible depuis plusieurs appareils
- une sauvegarde fiable et quasi invisible
- des modules clairs: notes, projets, calendrier, habitudes, focus, journal, finances, signets, objectifs, parametres
- une sensation premium sans complexifier l'interface

## 2. Inventaire des pages

### Authentification
- Connexion
- Inscription

### Espace principal
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

## 3. Inventaire des boutons et comportements attendus

### Global
- `Nouveau`
  - ouvre le bon modal selon la page courante
  - fallback sur creation de note si la page n'a pas de creation specifique
- `Changer theme`
  - alterne clair/sombre
  - sauvegarde immediatement dans les parametres du compte
- `Deconnexion`
  - force une derniere synchro si des changements ne sont pas encore pousses
  - supprime la session
  - renvoie sur l'ecran d'auth

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
- `Voir tout` sur taches
  - ouvre `Projets`
- `Voir tout` sur evenements
  - ouvre `Calendrier`

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
  - fait avancer la tache dans la colonne suivante
- `+ Tache`
  - ouvre le modal tache

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
- recherche globale reelle dans notes, taches, evenements et signets
- filtres par categorie, date, priorite, statut
- edition des evenements depuis le calendrier
- suppression des taches, habitudes, transactions, objectifs et signets
- gestion de projets nommes, pas seulement des colonnes kanban
- rappels et notifications
- avatar ou photo de profil
- import de sauvegarde JSON
- mode hors ligne avec resynchronisation
- corbeille avec restauration
- templates de notes et de journaling
- stats hebdo et mensuelles plus riches

### A ameliorer
- ergonomie mobile des tableaux et cartes
- feedback de synchro plus explicite
- recherche clavier `Cmd/Ctrl + K`
- edition inline sur plus de modules
- gestion des erreurs reseau avec retry intelligent
- historique d'activite exploitable
- affichage de deadlines en retard plus visible
- personnalisation accent/couleurs
- onboarding du premier lancement

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
