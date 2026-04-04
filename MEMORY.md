# FLOW DASHBORD - MEMOIRE PROJET

## Etat courant prioritaire

- variante publique supplementaire ajoutee:
  - route `/atelier`
  - theme completement distinct des variantes precedentes
  - meme logique produit, memes comptes et memes donnees
- routine QA utilisateur ajoutee:
  - script repo: `scripts/check-user-journey.mjs`
  - commande: `npm run check:ux -- <url>`
  - skill local: `/Users/aymen/.codex/skills/flow-user-qa/`
- bug structurel corrige:
  - `middleware.js` n'intercepte plus les chunks `/_next/static`
  - le chargement client et l'hydratation des routes publiques redeviennent sains

## Ce que fait le code

Flow Dashbord est une application workspace personnelle multi-modules:
- notes
- projets / kanban
- calendrier
- conversations
- habitudes
- focus timer
- signets
- parametres

Cette passe ajoute aussi un back-office separe:
- `Flow Admin Dashboard`
- route: `/admin`
- meme store chiffre que l'app principale

Cette passe ajoute aussi au module `Projets`:
- `taskTemplates`
- `subtasks`
- `comments`
- `reactions`
- `members` avec roles `viewer/editor`

Une passe suivante a ete entamee puis mise en pause pour l'admin avance:
- login admin separe
- session admin dediee via routes admin
- permissions admin granulaires
- creation d'autres admins
- export CSV
- SMTP transactionnel via `nodemailer`

Cette passe est maintenant reprise et validee localement pour:
- `admin/login`
- super-admin provisionne
- export CSV admin
- creation d'autres admins depuis le dashboard
- messages admin internes avec pop-up a la connexion
- session admin dediee separee de la session Flow
- export CSV enrichi + journal d'audit admin
- filtres avances + messages admin segmentes
- nouvelle passe visuelle shell principal + skeleton + drag feedback
- passe de synchronisation finale validee localement:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release + docs de reprise remis a niveau
- mise en ligne `v1.15.1` validee en production:
  - alias principal conserve: `https://flow-online-aymen.vercel.app`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- passe mobile UX validee localement:
  - dashboard mobile compresse pour eviter le scroll principal
  - swipes lateraux ajoutes pour menu + navigation entre vues
  - bouton aide retire de la topbar mobile
  - badge release raccourci a `vX.Y.Z`
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe design premium globale validee:
  - palette et composants rapproches de la reference Findexa
  - dashboard desktop recompose
  - dashboard mobile detasse et plus lisible
  - production redeployee et smoke test public OK
- passe shell/admin `v1.17.7` validee localement:
  - hero dashboard et surfaces claires enfin synchronises
  - popup forfait remis sur telephone
  - recherche mobile elargie et connectee a la Command Palette avec focus direct
  - footer de la palette masque en mobile
  - nouvelle dominante `Nebula` + halo lumineux global
  - dashboard admin + login admin re-dessines dans la meme DA Flow
  - selects natifs retires du dashboard admin au profit de chips
  - longues listes admin contenues dans des cartes scrollables
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- micro-passe `v1.17.8`:
  - barre de recherche mobile encore plus lisible
  - popup forfait mobile plus compact
  - cartes admin et zones scrollables encore mieux fermees contre les debordements
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe `v1.18.0`:
  - shell global repasse en palette monochrome
  - logo Flow monochrome reutilise dans l'app et en favicon / icone
  - chargement de connexion et ecran sans compte plus mis en scene
  - conversation support utilisateur -> admin ajoutee
  - endpoint admin conversations ajoute
  - dashboard admin peut maintenant lire / repondre / cloturer les demandes d'aide
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
- passe `v1.18.1`:
  - signalements messages stockes avec statut `open / resolved / dismissed`
  - bug reports interface envoyes aussi dans le store distant au lieu d'un simple faux local
  - dashboard admin recoit une vraie vue `Signalements`
  - un admin peut maintenant resoudre ou classer un signalement avec note
  - l'utilisateur recoit un retour dans Flow quand son signalement est traite
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3000` OK
  - production redeployee:
    - `https://flow-online-aymen-dlcyv8m66-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- passe `v1.19.0`:
  - accueil Notes refait avec zones a gauche et notes de la zone active a droite
  - blocs secondaires Notes supprimes pour laisser la saisie prendre la page
  - blocs `Tous les événements` et `Temps fort du mois` retires du Calendrier
  - module `Finance` retire de la navigation utilisateur
  - widget Focus global ajoute dans la topbar quand un chrono tourne hors de Focus
  - recherche mobile raccourcie a `Rechercher`
  - chaque navigation de module remonte maintenant en haut
  - service worker push ajoute
  - manifest app ajoute
  - abonnement push par appareil ajoute via API
  - annonce de release ajoutee pour prevenir tous les utilisateurs a la publication
  - script `npm run publish:release` ajoute pour deploy + annonce
  - `rm -rf .next` puis `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - production redeployee:
    - `https://flow-online-aymen-nv8shouuv-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.19.1`:
  - badge release passe en `v1.19.1`
  - journal visible remis en etat final sans items `wip / todo` restants
  - summary release resserree sur l'etat reel publie
  - `HANDOVER.md`, `MEMORY.md` et la roadmap resynchronises avec cette cloture
  - nettoyage defensif des variables `FLOW_PUSH_*` ajoute pour absorber les retours ligne eventuels
  - `npm run build` OK
  - production redeployee:
    - `https://flow-online-aymen-rm3rz5aco-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.20.0`:
  - centre de notifications remplace par un tiroir lateral depuis la droite
  - activation / desactivation des notifications ajoutee pour l'appareil courant
  - deduplication des notifications de release ajoutee cote serveur
  - gestes mobile retour / avance eloignes du bord du menu lateral
  - widget profil du header recompose avec icones mieux alignees
  - page Parametres restructuree en carte profil + groupes de sections
  - animations d'arrivee / pression affinees sur widgets, panneaux et boutons
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3200` OK
  - production redeployee:
    - `https://flow-online-aymen-4uo4tn8tu-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.20.1`:
  - Parametres passent en mode liste puis detail sur telephone/tablette
  - chaque bloc de reglage ouvre sa propre page au lieu d'etendre le contenu sous la liste
  - les ouvertures directes vers `Profil`, `Forfait` et `Paramètres` respectent aussi ce mode compact
  - `rm -rf .next && npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3300` OK
  - production redeployee:
    - `https://flow-online-aymen-clrbnrhp0-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.21.0`:
  - refonte visuelle globale plus premium:
    - theme sombre profond
    - halo haut gauche
    - shell et surfaces plus proches des references
  - dashboard recompose:
    - cartes KPI
    - mini calendrier
    - filtres `hier / aujourd'hui / semaine / mois / annee`
  - dock mobile ajoute:
    - `Accueil`
    - `Notes`
    - `Messages`
    - `Profil`
    - bouton `+` central pour `Projets`, `Calendrier`, `Habitudes`, `Objectifs`
  - sidebar compacte retravaillee pour ressembler davantage a une colonne d'app premium
  - popup profil et centre notifications encore nettoyes visuellement
  - auth recompose:
    - ecran connexion / inscription dans la nouvelle DA
    - mot de passe oublie relie a un vrai flux email
    - reset mot de passe via `resetToken`
    - bouton Google garde l'emplacement UI mais attend encore les secrets OAuth
  - references visuelles memorisees pour les prochaines passes:
    - image 1: theme principal
    - image 2: dashboard et filtres
    - image 3: auth
    - image 4: popup profil
    - image 5: dock mobile
    - image 6: halo haut gauche
    - images 7 / 8: sidebar compacte
  - `npm run build` OK
  - publication:
    - `npm run publish:release` OK
    - `https://flow-online-aymen-r76dr71np-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.21.1`:
  - les filtres dashboard pilotent maintenant vraiment les compteurs et le resume de periode
  - les fleches du mini calendrier naviguent dans la periode active
  - correction du flux `mot de passe oublie`:
    - etat final visible
    - retour a la connexion propre
  - bouton Google desactive tant que l'OAuth n'est pas configure pour eviter un faux login
  - `npm run build` OK
  - publication:
    - `npm run publish:release` OK
    - `https://flow-online-aymen-imvsrkcdl-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`
- passe `v1.22.0`:
  - palette principale rapprochee du noir/gris/blanc de l'image 1
  - reset mot de passe:
    - plus d'erreur bloquante si le SMTP manque
    - un lien direct de reset est fourni en secours
  - Google OAuth:
    - routes `start` et `callback` ajoutees
    - creation / rattachement de session Google cote serveur ajoute
    - activation reelle encore dependante de `FLOW_GOOGLE_CLIENT_ID` et `FLOW_GOOGLE_CLIENT_SECRET`
  - `.env.example` enrichi avec les variables Google / SMTP / app URL
  - `npm run build` OK
  - publication:
    - `npm run publish:release` OK
    - `https://flow-online-aymen-9lqk7d3ip-meinays-projects.vercel.app`
    - alias `https://flow-online-aymen.vercel.app` OK
    - `curl -I https://flow-online-aymen.vercel.app` : `200`
    - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
    - `POST /api/auth/forgot-password` retourne bien `delivery: direct` + `resetUrl` sans SMTP
    - `GET /api/auth/google/start` retourne bien `authGoogle=missing-config` tant que les secrets manquent
  - annonce globale de release:
    - `Annonce envoyee a 15 utilisateur(s).`

## Regle de continuite obligatoire

- Ne jamais terminer une passe importante sans mettre a jour:
  - `lib/release.js`
  - `HANDOVER.md`
  - `MEMORY.md`
  - `docs/flow-roadmap-and-spec.md`
  - `docs/fast-modification-strategy.md` si la passe touche la structure
- `lib/release.js` est maintenant la source de verite courte pour le badge visible dans l'app:
  - version
  - date/heure
  - resume
  - liste `done / wip / todo`
- Le contenu du widget de release doit etre remplace a chaque passe importante par l'etat actuel du produit:
  - pas un historique infini
  - oui a une photo fidele de ce qui est fini / en cours / a faire maintenant
- Une prochaine IA doit pouvoir reprendre en lisant d'abord ces fichiers plutot qu'en re-auditant tout le projet.
- Le smoke test navigateur `npm run check:client` fait maintenant partie des checks obligatoires pour les passes importantes.

Le front est concentre surtout dans `app/FlowApp.jsx`.

## Architecture

- `app/FlowApp.jsx`
  - interface complete
  - styles inline via string CSS
  - appels API auth/session/db
  - animations et badge de release
  - centre conversations
  - topbar aide + notifications
  - pop-up de connexion pour messages admin non lus
  - liaisons entre modules

- `app/api/auth/register/route.js`
  - inscription
  - hachage mot de passe
  - creation session
  - creation base vide

- `app/api/auth/login/route.js`
  - connexion
  - verification mot de passe
  - upgrade transparent des anciens hashes si besoin

- `app/api/db/route.js`
  - sauvegarde de la base utilisateur
  - nettoyage et taille max

- `app/api/session/route.js`
  - restauration session + donnees

- `app/admin/AdminDashboard.jsx`
  - interface admin complete
  - supervision, analytics et centre d'actions comptes
  - refonte visuelle Flow:
    - sidebar et hero dans la meme DA que l'app principale
    - chips au lieu de selects natifs
    - confirmations inline au lieu de popups navigateur
    - longues listes contenues avec scroll interne

- `app/admin/login/AdminLogin.jsx`
  - ecran de connexion admin separe
  - maintenant aligne visuellement sur la DA Flow

- `app/api/admin/auth/login/route.js`
  - login admin dedie

- `app/api/admin/auth/logout/route.js`
  - logout admin dedie

- `app/api/admin/session/route.js`
  - lecture session admin

- `app/api/admin/export/route.js`
  - export CSV utilisateurs

- `app/api/presence/route.js`
  - heartbeat de presence utilisateur
  - alimente mieux les stats `en ligne` / `actif recemment`

- `app/api/admin/overview/route.js`
  - KPIs globaux
  - ping / latence
  - liste utilisateurs
  - analytics de base

- `app/api/admin/actions/route.js`
  - notifications admin
  - blocage / deblocage
  - reset mot de passe
  - suppression compte

- `app/api/conversations/route.js`
  - recherche d'utilisateurs
  - creation de discussions directes / groupes
  - envoi de messages, reactions, edition, suppression
  - sanitation serveur des pieces jointes
  - notifications de message

- `lib/auth.js`
  - signature session
  - TTL session
  - scrypt + pepper

- `lib/crypto.js`
  - chiffrement/dechiffrement AES-256-GCM du coffre distant

- `lib/remote-store.js`
  - lecture/ecriture du store distant
  - anti-cache sur lecture

- `lib/schema.js`
  - base vide
  - normalisation des donnees
  - sanitation
  - notifications
  - liens entre modules

- `lib/conversations.js`
  - normalisation des conversations globales
  - enrichissement participants/messages
  - notifications ciblees

- `lib/admin.js`
  - verification admin
  - detection compte bloque
  - sanitation des donnees admin utilisateur
  - fallback owner admin sur le premier compte cree si aucun email admin n'est configure
  - une extension locale est en cours pour:
    - permissions admin
    - role `super_admin`
    - assertions de permissions

- `lib/email.js`
  - envoi SMTP admin via `nodemailer`
  - depend de variables `FLOW_SMTP_*`

- `lib/schema.js`
  - normalise maintenant aussi:
    - `taskTemplates`
    - `tasks[].subtasks`
    - `tasks[].comments`
    - `tasks[].reactions`
    - `tasks[].members`

- `lib/release.js`
  - version visible dans l'UI
  - date de release
  - journal court des changements du badge cliquable

- `middleware.js`
  - headers de securite

## Stockage et persistance

- Le stockage utilisateur n'est plus en clair.
- Les donnees sont chiffrees avant d'etre envoyees au store distant.
- Le store distant actuel:
  - `https://jsonblob.com/api/jsonBlob/019d3fec-0c9e-7bc0-a65a-d111a1635df0`
- L'ancien store a servi de migration:
  - `https://jsonblob.com/api/jsonBlob/019d3a80-c814-7f55-8c6a-5b3674bc36e5`
- Il ne faut pas changer `FLOW_DATA_SECRET` sans migrer toutes les donnees.

## Vercel

- Nom du projet: `flow-online-aymen`
- Alias principal a conserver: `https://flow-online-aymen.vercel.app`
- Il faut continuer a redeployer sur ce meme projet.

## Preferences utilisateur a respecter

- Repondre en francais.
- Ton chaleureux, simple, rassurant, collaboratif.
- Ne pas faire modifier l'utilisateur si on peut le faire nous-memes.
- Verifier les changements au lieu de s'arreter a la theorie.
- Garder le design, ne pas faire de refonte brutale.
- Le rendu doit tendre vers une vraie app SaaS premium, lisible, sombre/claire.
- Si on ajoute des effets visuels, ils doivent rester elegants et coherents.
- Toujours proteger les donnees existantes.
- Si un choix risque de casser le lien public ou la persistance, prevenir clairement.

## Choses a ne pas casser

- Le domaine `flow-online-aymen.vercel.app`
- Les secrets `.env.local`
- Les variables d'environnement Vercel de production
- Le chiffrement du store distant
- La compatibilite avec les comptes deja crees

## Etat de verification connu

- Build local OK
- route `/admin` build OK
- route `/admin/login` build OK
- module `Projets` enrichi build OK
- passe admin avancee en cours:
  - login separe valide localement
  - super-admin provisionne
  - redeploiement encore a faire dans cette reprise
- Login local OK
- Sauvegarde locale via API OK
- Rechargement session OK
- Login prod OK apres redeploiement final
- Badge version visible dans le HTML rendu
- favicon `app/icon.svg` OK en production
- nouveau monogramme Flow en haut a gauche de l'auth + sidebar OK
- nouveau dashboard SaaS + conversations + notifications + aide OK au build
- version code locale actuelle: `v1.17.6`
- version production verifiee apres cette passe:
  - `v1.16.0`
  - smoke test public OK sur `https://flow-online-aymen.vercel.app`
- reprise locale du 31/03/2026 00:45 reverifiee:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local resynchronise sur `v1.17.0`
- passe rapide du 31/03/2026 00:53 reverifiee:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.1`
- passe shell du 31/03/2026 01:07 reverifiee:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.2`
- passe shell du 31/03/2026 01:22 reverifiee:
  - `npm run build` OK
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.3`
- passe shell du 31/03/2026 01:22 mise en ligne:
  - alias principal `https://flow-online-aymen.vercel.app`
  - url deployment `https://flow-online-aymen-c1u0bbvh8-meinays-projects.vercel.app`
  - deployment id `dpl_4trbsy6xYg9DtFPfZHNEPdE3m28h`
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- passe shell du 31/03/2026 01:41 reverifiee:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.4`
- passe shell du 31/03/2026 01:41 mise en ligne:
  - alias principal `https://flow-online-aymen.vercel.app`
  - url deployment `https://flow-online-aymen-oe1k3rvi2-meinays-projects.vercel.app`
  - deployment id `dpl_2UYe1j2GgrENCJRLfZ277ZX8NLVN`
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- passe shell du 31/03/2026 01:57 reverifiee:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.5`
- passe shell du 31/03/2026 01:57 mise en ligne:
  - alias principal `https://flow-online-aymen.vercel.app`
  - url deployment `https://flow-online-aymen-kpkjfjdch-meinays-projects.vercel.app`
  - deployment id `dpl_8UBjSJH3dTsbxwf9WMmcBtjcKys6`
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- passe shell du 31/03/2026 02:02 reverifiee:
  - `npm run build` OK
  - redemarrage propre du serveur local apres build
  - `npm run check:client -- http://127.0.0.1:3100` OK
  - badge release local pousse en `v1.17.6`
- passe shell du 31/03/2026 02:02 mise en ligne:
  - alias principal `https://flow-online-aymen.vercel.app`
  - url deployment `https://flow-online-aymen-bnkptoqyl-meinays-projects.vercel.app`
  - deployment id `dpl_CuUSZHK8CigikQH7N11vmkN4WRZW`
  - `curl -I https://flow-online-aymen.vercel.app` : `200`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK
- nouvelles briques deja presentes localement au-dessus de `v1.16.3`:
  - `app/api/account/route.js`
    - profil compte vraiment persisté
    - email / mot de passe changes cote serveur
    - identifiant unique
    - telephone + visibilite
    - photo de profil
  - `app/api/events/route.js`
    - invitations calendrier
    - reponses participant
    - update/delete synchronises
  - `app/api/link-preview/route.js`
    - apercus de liens pour les signets
  - `lib/remote-store.js`
    - lecture `no-store`
    - ecriture seriee avec verrou local
  - `lib/schema.js`
    - profil / evenements / signets enrichis et normalises

## Mise a jour memoire - 31/03/2026 00:45

### Ce qui a ete repris et remis d'aplomb

- la continuite projet etait en retard sur le code reel local
- `lib/release.js` a ete resynchronise sur `v1.17.0`
- la passe locale en cours est maintenant decrite explicitement dans la memoire et le handover

### Ce que cette passe locale apporte deja

- compte:
  - profil synchronise cote serveur
  - changement sensible protege par mot de passe actuel
- calendrier:
  - evenements partages avec invites et reponses
- signets:
  - apercus automatiques de liens
- infrastructure:
  - store distant relu sans cache
  - ecriture serialisee pour limiter les collisions

### Point important a retenir

- cette reprise est validee localement mais pas encore annoncee comme deployee en production
- avant un futur redeploiement, garder ensemble:
  - `lib/release.js`
  - `HANDOVER.md`
  - `MEMORY.md`
  - `docs/flow-roadmap-and-spec.md`

## Mise a jour memoire - 31/03/2026 00:53

### Ce qui a ete ajoute / corrige

- `Finances` redevient un vrai module accessible:
  - sidebar
  - recherche globale
  - command palette
  - vue liste avec suppression
- `Objectifs` redevient un vrai module accessible:
  - sidebar
  - recherche globale
  - command palette
  - progression rapide `-10% / +10%`
  - suppression
- la todo produit a ete resynchronisee pour ne plus laisser croire que transactions/objectifs/signets/habitudes n'avaient pas de suppression

### Point important a retenir

- pour le smoke test local, relancer `next start` apres un nouveau build sinon les chunks statiques peuvent repondre `400` avec un faux negatif Playwright
- cette passe `v1.17.1` est maintenant en production sur:
  - `https://flow-online-aymen.vercel.app`
- deployment verifie:
  - `https://flow-online-aymen-ow0fww409-meinays-projects.vercel.app`
  - id `dpl_4VX42HG8Efi6HihFAt6r478FubWX`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Mise a jour memoire - 31/03/2026 01:07

### Ce qui a ete ajoute / corrige

- correction du shell principal:
  - dashboard draggable nettoye
  - faux boutons panneau retires
  - topbar realignee
  - sidebar compacte avec icones visibles
- le bloc premium sort du pied de sidebar et devient un pop-up de session refermable

### Point important a retenir

- le bug principal de la sidebar compacte venait du selecteur CSS `.sb.compact .ni span` qui masquait aussi `ni-icon`
- cette passe `v1.17.2` est maintenant en production sur:
  - `https://flow-online-aymen.vercel.app`
- deployment verifie:
  - `https://flow-online-aymen-8vrjbd7rc-meinays-projects.vercel.app`
  - id `dpl_FNBo3ko1PXVaPLQyKjno5F87h1xv`
  - `npm run check:client -- https://flow-online-aymen.vercel.app` OK

## Mise a jour memoire - 31/03/2026 01:22

### Ce qui a ete ajoute / corrige

- recherche compacte remise a gauche
- notifications / theme / profil remis a droite
- lock sidebar remis
- icones compactes sans carre individuel
- widget abonnement replace tout en bas du menu ouvert
- stabilite dashboard amelioree pour mieux tenir selon le zoom

### Point important a retenir

- le bouton admin n'est plus en topbar, mais reste accessible depuis le panneau compte pour garder l'entete plus propre
- correction du bug de remount/focus sur les vues principales
- sidebar hover/lock + recherche globale + conversations mobile/context menu OK au build
- appels Jitsi + notifications navigateur de base + viewport anti-zoom en prod
- Command Palette universelle `Cmd/Ctrl + K` ajoutee localement:
  - fuzzy matching
  - navigation clavier complete
  - actions rapides `Nouvelle note` / `Nouvelle tache` / `Aller a ...`
  - build local OK
- raccourcis clavier configurables ajoutes:
  - section `Parametres > Raccourcis`
  - capture clavier directe
  - reset global
  - persistance via `settings.shortcuts`
- smoke tests OK:
  - `npm run check:client -- http://127.0.0.1:3100`
- verification HTTP locale:
  - `curl -I http://127.0.0.1:3100/admin`
- verification HTTP locale:
  - `curl -I http://127.0.0.1:3100/admin/login`
- verification login admin locale:
  - `POST /api/admin/auth/login` OK
  - `GET /api/admin/session` OK apres login
- redeploiement prod non effectue dans cette passe

## Fichiers de contexte a lire en priorite

1. `HANDOVER.md`
2. `MEMORY.md`
3. `docs/flow-roadmap-and-spec.md`
4. `.env.local`

## Regle pour toute reprise

Avant une modification importante:
- lire le contexte
- verifier les secrets et le projet Vercel
- evaluer le risque de perte de donnees

Apres la modification:
- lancer build
- tester login/session/sauvegarde
- redeployer sur le meme projet si necessaire

## Prompt exact complet pour reprise sur un autre compte ChatGPT

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

## Mise a jour memoire - 29/03/2026 21:50

### Ce qui a ete renforce

- `app/api/account/route.js`
  - verifie maintenant l'unicite de `profile.username`
  - normalise `profile.username` en minuscule
  - normalise `profile.phone`
  - valide le telephone
  - valide `profile.photoUrl` en `http/https`
  - ajoute une entree d'activite plus utile apres sauvegarde compte

- `app/api/auth/register/route.js`
  - mot de passe minimum passe a 8 caracteres

- `lib/conversations.js`
  - recherche utilisateur plus robuste sur le telephone meme si la requete contient espaces/signes

- `lib/remote-store.js`
  - ajoute un verrou d'ecriture local via `withStoreLock`
  - objectif: limiter les ecrasements lors de deux writes proches sur le blob distant

- `app/FlowApp.jsx`
  - page `Parametres` garde maintenant les memes regles de validation que le serveur pour username / telephone / photo
  - message d'inscription aligne sur la contrainte 8 caracteres
  - messagerie:
    - gestion de groupe inline
    - suppression de conversation
    - signalement de message
  - `Parametres > Activite`:
    - resume
    - filtres

### Choix d'architecture pris

- priorite a la fiabilite du profil et de la recherche utilisateur avant d'ajouter plus de surface fonctionnelle
- validation critique du profil faite cote serveur d'abord, puis miroir cote client pour le feedback
- le store JSONBlob est un point de concurrence sensible: toute mutation importante passe maintenant par un verrou d'ecriture cote serveur
- pas de changement de secret, pas de changement de store, pas de changement de projet Vercel

### Etat QA connu apres cette passe

- build local OK
- serveur local OK
- inscription mot de passe court KO comme attendu
- connexion compte existant OK
- mise a jour profil avec username/telephone/photo OK
- session apres update OK
- recherche par username OK
- recherche par telephone formate OK
- identifiant duplique KO comme attendu
- create/update/delete conversation OK
- signalement message OK
- deploiement prod sur le meme alias OK

### Sujets suivants conseilles

- enrichir `Parametres > Activite`
- ajouter vocaux reels et upload natif cote serveur
- ajouter une vraie vue admin/moderation des signalements
- preparer proprement le futur branchement Stripe sans faux bouton

## Mise a jour memoire - 29/03/2026 22:30

### Ce qui a ete corrige

- bug de focus pendant la saisie:
  - les polls auto ne s'executent plus pendant qu'un `input/textarea/select` a le focus
  - corrige concretement la saisie message + edition note qui perdaient le focus apres la premiere lettre
- sidebar:
  - compact desktop uniquement
  - mobile garde le comportement precedent
  - compact = `logo + Flow` en haut, avatar seul en bas, sans version/led/theme/logout
  - tuiles modules compactes carrees et mieux alignees
- notes:
  - categories en premier
  - boutons de zones generes dans l'UI
  - plus de select natif pour la categorie note
  - creation `titre + zone`, puis ouverture immediate de la note
  - bouton d'ajout du topbar masque quand le module est vide
- habitudes:
  - nouvelle structure supportee:
    - `targetMinutes`
    - `days`
    - `entries`
  - compatibilite conservee avec les anciennes habitudes basees sur `done`
  - ajout manuel de minutes
  - streak recalcule a partir des jours planifies
  - edition/suppression depuis la carte habitude

### QA reelle de cette passe

- build local OK
- QA browser locale OK sur store temporaire separe
  - note: creation + edition stable apres attente > 2.6s
  - habitude: creation + journalisation manuelle OK
  - conversation: creation + saisie stable apres attente > 2.6s
  - sidebar mobile non compacte OK
  - sidebar desktop compacte OK
- redeploiement prod OK sur le meme alias
- prod homepage `200`
- prod version visible `v1.7.0`

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment courant: `https://flow-online-aymen-lk4tvn3wg-meinays-projects.vercel.app`
- version: `v1.7.0`

## Mise a jour memoire - 29/03/2026 22:58

### Ce qui a ete ajoute / corrige

- `agentation@3.0.2` ajoute en devDependency
- `app/DevOverlays.jsx` cree
  - injecte `Agentation` uniquement en dev
  - utile pour annoter visuellement l'interface et produire un prompt plus exploitable pour l'agent
- topbar:
  - bouton `Nouveau` retire
- notifications:
  - panneau simplifie a partir du contenu utile
  - icones selon le type
  - suppression des notifications lues a la fermeture
- parametres:
  - etat remonte au niveau principal
  - sous-onglets plus stables
  - picker photo local ajoute
  - backend accepte maintenant aussi les `data:image`
- conversations:
  - recherche sidebar = conversations existantes
  - creation directe/groupe deplacee derriere un bouton `+`
  - panneau infos ouvre via l'en-tete conversation
  - recherche locale dans le chat
  - medias / fichiers listables
  - notif locale / favori local par conversation
  - auto-scroll en bas sur ouverture / nouveau message
  - audio provider remplace par `vdo.ninja`
  - video garde `jit.si`
  - sonnerie locale ajoutee pour les appels

### QA reelle de cette passe

- build local OK
- smoke browser local OK sur store QA temporaire
  - plus de bouton `Nouveau`
  - sous-onglets Parametres cliquables
  - upload photo locale OK
  - notification note simplifiee OK
- redeploiement prod OK
- prod `200`
- prod version `v1.7.1`

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment courant: `https://flow-online-aymen-9y3yfkd8v-meinays-projects.vercel.app`
- version: `v1.7.1`

## Mise a jour memoire - 29/03/2026 23:21

### Ce qui a ete ajoute / corrige

- calendrier:
  - nouvelle vue jour sous la grille mensuelle
  - slots horaires de `07:00` a `21:00`
  - creation evenement pre-remplie sur 1h depuis un slot
  - invites visibles dans la vue jour
- partage evenement:
  - nouvelle route `app/api/events/route.js`
  - cree un evenement chez le createur
  - duplique l'evenement chez les invites
  - ajoute une notification cote invite
- signets:
  - nouveau modele `link / image / text`
  - metadata:
    - `coverUrl`
    - `previewTitle`
    - `previewText`
    - `sourceLabel`
    - `mediaKind`
    - `note`
  - grille signets plus premium
  - import image locale compressee cote client
  - route `app/api/link-preview/route.js` pour recuperer les previews distantes
- dashboard:
  - cartes de synthese cliquables
  - `A suivre maintenant` = evenements seulement
  - `Boite de reception` persistante
  - `Contacts recents` ajoute
  - hero avec action rapide signet

### QA reelle de cette passe

- `npx next build --debug` OK
- smoke local sur store JSONBlob temporaire chiffre:
  - register QA OK
  - create event OK
  - `endTime` persiste OK
  - link preview YouTube OK
  - bookmark riche persiste OK
  - invitation evenement inter-comptes OK
  - notification invite OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod: pas encore redeploye pour cette passe
- version locale prete: `v1.8.0`

## Mise a jour memoire - 29/03/2026 23:28

### Ce qui a ete ajoute / corrige

- `Parametres > Apparence`
  - plus de bouton d'application
  - mise a jour immediate des reglages:
    - theme
    - accent
    - langue
    - taille de police
    - famille de police
    - durees focus/pause
  - sauvegarde automatique via l'etat `appearanceDraft`
  - pas d'ajout d'activite parasite a chaque micro-changement

### QA reelle de cette passe

- `npx next build --debug` OK
- verification texte/code OK
  - `saveAppearance` supprime
  - aucun bouton `Appliquer l'apparence`

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod: pas encore redeploye pour cette passe
- version locale prete: `v1.8.1`

## Mise a jour memoire - 29/03/2026 23:56

### Ce qui a ete ajoute / corrige

- calendrier partage:
  - edition d'un evenement existant depuis la vue jour
  - suppression propagee chez tous les participants
  - reponses invite:
    - accepte
    - peut-etre
    - refuse
  - statuts participants visibles directement dans les cartes evenement
  - compatibilite garde-fou pour anciens evenements locaux sans metadata de partage
- modal evenement:
  - mode creation + mode edition
  - en edition, invites et liens existants conserves volontairement pour eviter une perte accidentelle
- route `app/api/events/route.js`:
  - actions supportees:
    - `create-event`
    - `update-event`
    - `delete-event`
    - `respond-event`
  - activite + notifications mises a jour pour createur et invites

### QA reelle de cette passe

- `npm run build` OK
- sortie Next:
  - `api/events` compile et reste exposee
- smoke HTTP local separe:
  - non concluant dans le sandbox actuel pour `localhost`
- pas de QA ecriture authentifiee:
  - evite volontairement car le serveur local lit le vrai store chiffre de prod

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod: volontairement non lance apres cette passe
- version locale prete: `v1.9.0`

### Prochaine etape recommande

- lancer un QA ecriture/lecture sur store temporaire chiffre dedie avant tout redeploiement prod du bloc calendrier partage

## Mise a jour memoire - 29/03/2026 23:57

### Ce qui a ete verifie en reel

- scenario calendrier partage valide sur un store QA JSONBlob dedie:
  - register de 2 comptes QA
  - create event partage
  - duplication chez l'invite
  - status invite initial `pending`
  - update event partage
  - response invite `maybe`
  - delete event partage
  - disparition chez createur et invite
- build propre refait apres regeneration de `.next`
- redeploiement prod termine sur le projet `flow-online-aymen`

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-n51mefo8k-meinays-projects.vercel.app`
- deployment id: `dpl_FQ7zs8h67LMBv5aQGTLKEsZt2csK`
- version prod verifiee: `v1.9.0`

### Point important a retenir

- le bloc calendrier partage est maintenant verifie de bout en bout avant mise en prod
- la route `app/api/events/route.js` est deployee et active en production

## Mise a jour memoire - 30/03/2026 00:00

### Ce qui a ete ajoute / corrige

- signets:
  - edition depuis la carte
  - suppression depuis la carte
  - modal unique create/edit
  - liaisons existantes conservees en edition pour eviter une perte
  - activite `Signet modifie` / `Signet supprime`

### QA reelle de cette passe

- store QA isole:
  - bookmark create OK
  - bookmark update OK
  - bookmark delete OK
- build local OK
- redeploiement prod OK
- alias prod OK
- prod version `v1.9.1` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-4d2uio1um-meinays-projects.vercel.app`
- deployment id: `dpl_HqPv2GGGhfuYCFMdR4Y5bb6zWvJp`
- version prod verifiee: `v1.9.1`

## Mise a jour memoire - 30/03/2026 00:06

### Ce qui a ete ajoute / corrige

- signalements conversations:
  - lecture serveur dediee des signalements du compte courant
  - panneau `Parametres > Activite > Signalements` maintenant reel
  - affichage de:
    - motif
    - détails
    - aperçu message
    - conversation source
    - expéditeur
    - horodatage

### QA reelle de cette passe

- store QA isole:
  - create direct conversation OK
  - send message OK
  - report message OK
  - list reports OK
  - sender/motif/details visibles OK
- rebuild propre `.next` OK
- build local OK
- redeploiement prod OK
- alias prod OK
- prod version `v1.9.2` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-mxze67wum-meinays-projects.vercel.app`
- deployment id: `dpl_FYqPgEotMtLHGzFxPN7qsQ8VLtGG`
- version prod verifiee: `v1.9.2`

## Mise a jour memoire - 30/03/2026 00:13

### Ce qui a ete ajoute / corrige

- badge release:
  - cliquable depuis auth, sidebar, dashboard et parametres
  - ouvre un widget de suivi des changements
  - statuts supportes:
    - `done`
    - `wip`
    - `todo`
- petit allegement de `app/FlowApp.jsx`:
  - rendu du badge factorise dans `ReleaseBadge`
  - rendu du journal factorise dans `ReleaseWidget`
- `lib/release.js` devient une vraie mini-source de reprise produit:
  - version
  - date/heure
  - resume
  - changements visibles cote UI
- consigne de continuite ajoutee dans la doc:
  - toujours synchroniser release + handover + memory + roadmap

### QA reelle de cette passe

- validation import Node de `lib/release.js`:
  - structure `changes[]` OK
  - statuts `done / wip / todo` OK
- build local OK
- serveur local `npm start -- --hostname 127.0.0.1 --port 3100` OK
- `curl -I http://127.0.0.1:3100` OK
- homepage locale version `v1.9.3` OK
- redeploiement prod OK
- alias prod OK
- homepage prod version `v1.9.3` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-208q0tm9y-meinays-projects.vercel.app`
- deployment id: `dpl_DmMDj1H94eXctE95HYMfDrhbf6ZN`
- version prod verifiee: `v1.9.3`

### Point important a retenir

- pour les prochaines passes, le badge de version doit etre mis a jour en meme temps que la memoire projet
- `lib/release.js` doit rester court, exact et exploitable visuellement par l'utilisateur final

## Mise a jour memoire - 30/03/2026 00:52

### Ce qui a ete ajoute / corrige

- navigation:
  - sidebar compacte mieux alignee
  - `Habitudes` bascule dans `Organisation`
  - `Organisation` placee en bas de sidebar
- dashboard:
  - cartes plus compactes
  - `Vue rapide` en cartes
  - `Contacts recents` en cartes carrees photo
  - ordre des blocs dashboard draggable en desktop
- notes / projets:
  - note draggable vers une autre zone
  - tache draggable vers une autre colonne kanban
- calendrier:
  - structure simplifiee:
    - mois a gauche
    - panneau contextuel a droite
  - detail jour + creneaux seulement apres clic jour
  - create/edit evenement avec date custom et heures custom
  - option de liaisons module retiree du flux evenement
- conversations:
  - panneau infos ne se ferme plus a chaque refresh
  - favoris epingles en haut
  - envoi plus reactif grace a la maj locale + refresh force
  - scroll bas renforce
  - trombone converti en vrai mini-choix inline
  - appel audio / video integre dans l'app via Jitsi embarque

### QA reelle de cette passe

- build local OK
- serveur local `npm start -- --hostname 127.0.0.1 --port 3100` OK
- `curl -I http://127.0.0.1:3100` OK
- homepage locale version `v1.10.0` OK
- validation structure `lib/release.js` OK
- redeploiement prod OK
- alias prod OK
- homepage prod version `v1.10.0` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-1qmzfdfdw-meinays-projects.vercel.app`
- deployment id: `dpl_AevxmJgcYzSrMzxr2wb6aQiGo1DU`
- version prod verifiee: `v1.10.0`

### Point important a retenir

- le drag and drop de cette passe est surtout desktop
- pour le tactile/mobile, une couche gestuelle dediee reste a faire
- les appels sont maintenant integres dans l'app avec Jitsi, ce qui remplace l'ancien comportement plus fragile en onglet externe

## Mise a jour memoire - 30/03/2026 01:03

### Ce qui a ete ajoute / corrige

- conversations:
  - vocaux courts reels via `MediaRecorder`
  - preview avant envoi
  - lecteur audio directement dans les messages
  - bouton d'annulation pendant l'enregistrement
- pieces jointes:
  - images compressees cote client
  - fichiers legerement limites pour rester compatibles avec le blob distant
  - fin de la troncature silencieuse des data URLs cote conversation
- release / continuite:
  - `lib/release.js` passe en `v1.10.1`
  - `Messagerie native plus profonde` est maintenant `wip`

### QA reelle de cette passe

- build local OK
- validation import Node de `lib/release.js` OK
- serveur local `npm start -- --hostname 127.0.0.1 --port 3100` OK
- `curl -I http://127.0.0.1:3100` OK
- homepage locale version `v1.10.1` OK
- redeploiement prod OK
- alias prod OK
- homepage prod version `v1.10.1` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-ufrsh05t0-meinays-projects.vercel.app`
- deployment id: `dpl_EeYTByecomH73ZwYV1VfWS2rDuSw`
- version prod verifiee: `v1.10.1`

### Point important a retenir

- les vocaux existent maintenant, mais restent volontairement courts tant qu'il n'y a pas d'upload serveur durable
- la priorite messagerie n'est plus `ajouter des vocaux reels`, mais:
  - fiabiliser l'upload durable
  - approfondir la moderation
  - ajouter une vraie couche temps reel

## Mise a jour memoire - 30/03/2026 01:09

### Ce qui a ete ajoute / corrige

- correctif critique:
  - erreur client au chargement supprimee
  - cause:
    - hooks React declares apres le retour anticipe `if (!user)`
  - correction:
    - ces callbacks ne sont plus des hooks dans cette zone
    - l'ordre des hooks de `FlowApp` reste stable
- important:
  - le bloc vocaux ajoute juste avant n'a pas ete retire
  - il a seulement ete stabilise

### QA reelle de cette passe

- build local OK
- validation import Node de `lib/release.js` OK
- verification code:
  - plus de `useCallback` fautif dans cette zone sensible
- homepage locale version `v1.10.2` OK
- redeploiement prod OK
- alias prod OK
- homepage prod version `v1.10.2` OK

### Etat de deploiement courant

- alias principal: `https://flow-online-aymen.vercel.app`
- deployment prod courant: `https://flow-online-aymen-1ppifdaj0-meinays-projects.vercel.app`
- deployment id: `dpl_5twbu5rvvJdjtEJZDoFMpDsNCGhF`
- version prod verifiee: `v1.10.2`

### Point important a retenir

- apres toute passe rapide dans `app/FlowApp.jsx`, re-verifier specialement:
  - qu'aucun hook React n'a ete ajoute apres un retour conditionnel
  - que le badge release affiche bien la nouvelle version en local puis en prod

## Mise a jour memoire - 30/03/2026 01:20

### Ce qui a ete ajoute / corrige

- allegement reel de la base front:
  - `FlowApp.jsx` passe de `5021` a `4674` lignes
- modules extraits:
  - `app/flow/release-ui.jsx`
  - `app/flow/useVoiceRecorder.js`
  - `lib/flow/constants.js`
  - `lib/flow/ui-helpers.js`
- nouvelle doc de strategie:
  - `docs/fast-modification-strategy.md`

### Point important a retenir

- pour aller vite sur les prochaines passes:
  - si la demande touche les vocaux:
    - lire `app/flow/useVoiceRecorder.js`
  - si la demande touche le badge/journal:
    - lire `app/flow/release-ui.jsx`
  - si la demande touche presets / limites / forfaits:
    - lire `lib/flow/constants.js`
  - si la demande touche tri / calendrier / salles d'appel:
    - lire `lib/flow/ui-helpers.js`
- cette passe est en prod:
  - alias principal: `https://flow-online-aymen.vercel.app`
  - deployment prod courant: `https://flow-online-aymen-emiodijxe-meinays-projects.vercel.app`
  - deployment id: `dpl_A5aqyFLnJXAJxpB1cFuv9NtsNbPr`
  - version prod verifiee: `v1.10.3`

## Mise a jour memoire - 30/03/2026 01:27

### Ce qui a ete ajoute / corrige

- nouveau filet de securite client:
  - `app/flow/AppCrashGuard.jsx`
  - `app/error.jsx`
  - `app/global-error.jsx`
- nouveau check obligatoire:
  - `npm run check:client`
  - charge reellement la page avec Playwright
  - echoue si une exception client ou un `console.error` remonte
- point important:
  - cette passe a deja prouve son utilite en attrapant un vrai bug `setVoiceDraft is not defined`

### Point important a retenir

- pour ne plus revoir l'erreur generique de type:
  - `Application error: a client-side exception has occurred`
- il faut maintenant garder ensemble:
  - crash guard applicatif
  - `app/error.jsx`
  - `app/global-error.jsx`
  - `npm run check:client`
- cette passe est en prod:
  - alias principal: `https://flow-online-aymen.vercel.app`
  - deployment prod courant: `https://flow-online-aymen-57ixqrrtv-meinays-projects.vercel.app`
  - deployment id: `dpl_Az85vt9tdR48TgjNkCMheexsD6mu`
  - version prod verifiee: `v1.10.4`
