# Ressource - Refonte Design (Supression Orange) - 01/05/2026

## Changements Effectués

### Objectif Principal
Appliquer le design complet du bloc "Control" (variante `bright` + accent `flare`) à l'entièreté du site et supprimer tous les effets lumineux orange (en haut à gauche du site et de chaque bloc).

### Fichiers Modifiés

#### 1. **app/FlowApp.jsx** (Variables CSS + Gradients)
- ✅ Remplacé `--orange: #ff9a6c` par `--orange: #ffffff` (blanc)
- ✅ Remplacé `--accent-glow: rgba(255, 132, 78, 0.18)` par `rgba(255, 255, 255, 0.08)`
- ✅ Remplacé `--topbar-glow: rgba(255, 115, 70, 0.22)` par `rgba(255, 255, 255, 0.08)`
- ✅ Supprimé tous les gradients radial orange en haut à gauche:
  - `radial-gradient(circle at 17% 16%, rgba(255, 140, 96, 0.14), transparent 26%)` (theme-dark)
  - `radial-gradient(circle at 84% 18%, rgba(255, 156, 108, 0.1), transparent 20%)` (theme-dark)
  - `radial-gradient(circle at 18% 18%, rgba(255, 172, 142, 0.16), transparent 24%)` (theme-light)
  - Et 3 autres en theme-light

- ✅ Supprimé les gradients orange des `--surface-layer`:
  - `radial-gradient(circle at 0% 0%, rgba(255, 126, 74, 0.16), transparent 32%)`
  - `radial-gradient(circle at 0% 0%, rgba(255, 137, 92, 0.14), transparent 40%)`
  - `radial-gradient(circle at 0% 0%, rgba(255, 144, 100, 0.08), transparent 36%)`

- ✅ Supprimé gradient orange de notification-card:
  - `radial-gradient(circle at 0% 0%, rgba(162, 94, 81, 0.16), transparent 36%)`

#### 2. **app/preview/page.jsx** (Blocs Unifié)
- ✅ Tous les 5 blocs passés à variante `bright` (au lieu de rich/soft/haze/softest)
- ✅ Tous les 5 blocs passés à accent `flare` (au lieu de orange/glow/amber/smoke)
- ✅ Supprimé le `::before` avec gradients orange de `.glass-card`:
  ```css
  /* AVANT */
  background: radial-gradient(circle at 35% 18%, rgba(255, 148, 108, 0.18), transparent 22%),
              radial-gradient(circle at 72% 16%, rgba(255, 98, 70, 0.1), transparent 16%);
  
  /* APRÈS */
  /* Vide - pas de lumière en haut à gauche */
  ```

- ✅ Harmonisé les variantes soft/haze/softest vers le style `bright` unifié
- ✅ Remplacé tous les accents glow/amber/smoke vers `flare` unifié

#### 3. **app/flow/release-ui.jsx** (Statuts Release)
- ✅ Remplacé tint/border pour statuts `done` et `wip`:
  - AVANT: `rgba(255,146,113,.14)` / `rgba(224,110,94,.24)`
  - APRÈS: `rgba(255,255,255,.14)` / `rgba(255,255,255,.24)` (blanc)

### Résultats Visuels

#### Avant
- Blocs avec 5 variantes différentes (rich/soft/haze/softest/bright)
- Blocs avec 5 accents différents (orange/glow/amber/smoke/flare)
- Effets lumineux orange radial en haut à gauche du site
- Effets lumineux orange radial en haut à gauche de chaque bloc
- Variables theme orange actives

#### Après
- Tous les blocs identiques: variante `bright` + accent `flare`
- Pas d'effets lumineux orange nulle part
- Fond et surfaces plus neutre (blanc/gris)
- Site plus cohérent et épuré
- Pas de boutons orange visibles

### Détails Techniques

#### Variante Bright (Appliquée Partout)
```css
.glass-card.bright {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.32);
}
```

#### Accent Flare (Appliqué Partout)
```css
.status-pill.flare {
  background: rgba(255, 102, 64, 0.14);
  border-color: rgba(255, 102, 64, 0.18);
}
```

### Checklist de Suppression Orange
- [x] Variables CSS `--orange` → blanc
- [x] Glow variables → blanc/neutre
- [x] Gradient radial top-left site dark
- [x] Gradient radial top-left site light
- [x] Gradient radial top-left blocs
- [x] Surface-layer gradients orange
- [x] Notification card glow
- [x] Release statuts orange
- [x] Toutes les variantes de blocs → bright
- [x] Tous les accents → flare

### Notes pour les Prochaines IA
- Site maintenant unifié en design "bright + flare"
- Plus aucune lumière orange en haut à gauche
- Variables CSS changées définitivement
- Si besoin de remettre de l'orange: remplacer `#ffffff` dans `--orange` et re-ajouter les gradients radial
- Design du bloc "Control" est maintenant le standard global
