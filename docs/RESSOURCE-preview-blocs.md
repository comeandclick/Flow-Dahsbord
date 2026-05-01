# Ressource Preview - Blocs Différents

## Page: `/preview`
Route: `app/preview/page.jsx`

### Description
Page de preview affichant 5 blocs différents avec des effets de verre dépoli (glassmorphism) et des variantes de transparence. Chaque bloc a des interactions au survol.

### Structure des 5 Blocs

| # | Titre | Subtitle | Variante | Accent | Status | Label | Button |
|---|-------|----------|----------|--------|--------|-------|--------|
| 1 | Voice dialing | Connection stable | rich | orange | READY | VOICE DIALING... | Apply |
| 2 | KSampler | Latent | soft | glow | Optimized | AI flow | Optimize |
| 3 | Video preview | Ready to push | haze | amber | Live | Play now | Play |
| 4 | Motion blur | Soft edges | softest | smoke | Subtle | Adjust | Update |
| 5 | Control | Hover to feel | bright | flare | Calm | Touch | Sync |

### Variantes de Style CSS
- **rich**: Style par défaut avec effets de lueur orange
- **soft**: Transparence accrue `rgba(255, 255, 255, 0.07)`
- **haze**: Bordure teintée avec inset shadow
- **softest**: Transparence minimale avec glow intérieur
- **bright**: Bordure blanche avec ombre accentuée

### Accents de Couleur (Status Pills)
- **orange**: `rgba(255, 148, 108, 0.18)`
- **glow**: `rgba(255, 136, 82, 0.18)`
- **amber**: `rgba(255, 176, 112, 0.18)`
- **smoke**: `rgba(255, 255, 255, 0.06)`
- **flare**: `rgba(255, 102, 64, 0.14)`

### Interactions
- **Hover**: Translate Y(-2px), bordure plus visible, ombre augmentée
- **Pointer Glow**: Au survol, gradient radial blanc apparaît au curseur
- **Card Action**: Translate Y(-1px) au survol

### Responsive
- Desktop: 5 colonnes (220px min)
- Tablet (920px): Grille auto-fit
- Mobile (620px): Full width, footer en colonne

### Fichier Source
```
app/preview/page.jsx
```

### Notes Techniques
- Component Client (`"use client"`)
- Grid CSS avec `repeat(auto-fit, minmax(220px, 1fr))`
- CSS Variables pour le pointer tracking (`--pointer-x`, `--pointer-y`)
- Backdrop filter: `blur(30px) saturate(190%)`
- Backdrop color: `rgba(18, 20, 28, 0.22)`
