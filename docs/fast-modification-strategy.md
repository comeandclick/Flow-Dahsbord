# Strategie de modification rapide - Flow

Objectif:
- rendre les prochaines passes plus rapides
- reduire le risque de regression dans `app/FlowApp.jsx`
- permettre a une autre IA de modifier un bloc sans recharger tout le contexte mental du fichier

## Regles de travail

- toujours commencer par regarder:
  - `lib/release.js`
  - `HANDOVER.md`
  - `MEMORY.md`
  - `docs/flow-roadmap-and-spec.md`
- si une passe touche un bloc volatil, essayer d'extraire en meme temps sa logique vers un module dedie
- ne plus ajouter de hooks React dans `FlowApp.jsx` apres un retour conditionnel
- toute passe importante doit finir avec:
  - build
  - `npm run check:client` sur l'url locale
  - verification locale
  - mise a jour des 4 fichiers de reprise
  - redeploiement sur le meme projet Vercel si le changement est pret
  - `npm run check:client -- https://flow-online-aymen.vercel.app` si la passe est deployee

## Architecture cible a court terme

### Deja extrait

- `app/flow/release-ui.jsx`
  - badge de version
  - widget journal de version
- `app/admin/AdminDashboard.jsx`
  - back-office admin separe de `FlowApp.jsx`
  - supervision, analytics et actions comptes sans gonfler le front principal
- `app/flow/useVoiceRecorder.js`
  - logique micro / MediaRecorder
  - brouillon vocal
  - start / stop / cancel
- `lib/flow/constants.js`
  - constantes produit, limites, presets, forfaits
- `lib/flow/ui-helpers.js`
  - helpers purs UI:
    - calendrier
    - tri conversations
    - salles Jitsi
    - reordonnancement
    - format duree

### Prochaine extraction recommandee

1. `app/flow/views/conversations.jsx`
- rendre le centre conversations autonome
- isoler:
  - liste conversations
  - thread
  - info panel
  - composeur

2. `app/flow/views/dashboard.jsx`
- isoler:
  - hero
  - quick cards
  - inbox
  - contacts recents
  - drag and drop widgets

3. `app/flow/views/calendar.jsx`
- isoler:
  - vue mois
  - panneau droit
  - jour detaille
  - modal evenement

4. `lib/flow/module-actions.js`
- centraliser les operations pures:
  - notes
  - taches
  - habitudes
  - activite

## Strategie pratique pour des passes ultra rapides

### Si la demande touche la messagerie

- lire d'abord:
  - `app/flow/useVoiceRecorder.js`
  - `lib/conversations.js`
  - `app/api/conversations/route.js`
- ne modifier `FlowApp.jsx` que pour le wiring UI minimal
- pour les signalements:
  - relire aussi `app/api/admin/actions/route.js`
  - et `app/api/admin/overview/route.js` pour la moderation / restitution admin

### Si la demande touche le dashboard

- viser des composants d'affichage purs
- garder la persistence d'ordre dans `db.settings.dashboardOrder`
- pour la DA en cours, conserver les references memorisees:
  - image 1 / 6 pour le theme et le halo
  - image 2 pour la structure dashboard
  - image 7 / 8 pour la sidebar compacte
- ne pas laisser un filtre visuel sans impact reel:
  - si un bouton de periode existe, il doit modifier les compteurs ou la navigation visible

### Si la demande touche le calendrier

- modifier les helpers purs dans `lib/flow/ui-helpers.js` avant de toucher au JSX
- garder le flux:
  - mois
  - clic jour
  - detail jour

### Si la demande touche les settings / apparence

- privilegier les constantes dans `lib/flow/constants.js`
- eviter de re-disperser les presets dans `FlowApp.jsx`

### Si la demande touche les notifications / la publication

- relire d'abord:
  - `lib/push.js`
  - `app/api/push/subscribe/route.js`
  - `app/api/release/announce/route.js`
  - `public/sw.js`
- si la demande touche l'auth:
  - relire aussi `app/api/auth/forgot-password/route.js`
  - `app/api/auth/google/start/route.js`
  - `app/api/auth/google/callback/route.js`
  - `app/api/auth/reset-password/route.js`
  - `lib/auth.js`
  - `lib/google-auth.js`
- detail important:
  - l'annonce release doit conserver une seule notification `update` par version pour eviter les doublons
- pour publier + prevenir tout le monde:
  - preferer `npm run publish:release`

## Definition d'une bonne passe

- un bloc produit est modifie
- le bloc devient plus simple a relire qu'avant
- le journal de version visible dans l'app est mis a jour
- la memoire projet est sync
- la prochaine IA sait immediatement ou modifier
- l'app ne remonte aucune exception client pendant `npm run check:client`
