#!/bin/bash
set -e

# ============================================================
# KALIMAT — Script d'installation automatique
# Usage: curl -fsSL https://raw.githubusercontent.com/comeandclick/Flow-Dahsbord/claude/arabic-learning-app-NBR1P/kalimat/setup.sh | bash
# ============================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   KALIMAT — Installation automatique${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ── 1. Vérifications ──────────────────────────────────────
echo -e "${YELLOW}[1/6] Vérification des outils...${NC}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}Node.js n'est pas installé. Installe-le sur nodejs.org${NC}"
  exit 1
fi
if ! command -v git &>/dev/null; then
  echo -e "${RED}Git n'est pas installé.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node $(node -v), Git $(git --version | cut -d' ' -f3)${NC}"

# ── 2. Clone du projet ────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/6] Téléchargement du projet...${NC}"

DEST="$HOME/Desktop/kalimat"
if [ -d "$DEST" ]; then
  echo -e "${YELLOW}Dossier existant détecté — suppression...${NC}"
  rm -rf "$DEST"
fi

git clone -b claude/arabic-learning-app-NBR1P --single-branch \
  https://github.com/comeandclick/Flow-Dahsbord /tmp/kalimat-tmp 2>/dev/null
cp -r /tmp/kalimat-tmp/kalimat "$DEST"
rm -rf /tmp/kalimat-tmp
cd "$DEST"
echo -e "${GREEN}✓ Projet téléchargé dans ~/Desktop/kalimat${NC}"

# ── 3. Variables d'environnement ──────────────────────────
echo ""
echo -e "${YELLOW}[3/6] Configuration des variables d'environnement...${NC}"

cat > "$DEST/.env.local" << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://lzbcltsxfshfguivgcji.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6YmNsdHN4ZnNoZmd1aXZnY2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTgxNjMsImV4cCI6MjA5NDQ5NDE2M30.dEuLnyLlhUccPrVKMy_2xMP2EcnsG6-JTVXz_APg4iE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6YmNsdHN4ZnNoZmd1aXZnY2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxODE2MywiZXhwIjoyMDk0NDk0MTYzfQ.O_WYG9k9hTJI9dmlU8ok6TdX2LmwcFSpVNc_OCFzcec
ENVEOF

echo -e "${GREEN}✓ .env.local créé${NC}"

# ── 4. Installation des dépendances ───────────────────────
echo ""
echo -e "${YELLOW}[4/6] Installation des dépendances npm...${NC}"
cd "$DEST"
npm install --silent
echo -e "${GREEN}✓ Dépendances installées${NC}"

# ── 5. GitHub ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/6] Création du repo GitHub...${NC}"

cd "$DEST"
git init -b main
git add .
git commit -m "Initial commit — Kalimat Arabic learning app" --quiet

if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  gh repo create kalimat --public --source=. --remote=origin --push --description "Application d'apprentissage de l'arabe — Next.js 14, Supabase" 2>/dev/null && \
    echo -e "${GREEN}✓ Repo GitHub créé : https://github.com/$(gh api user -q .login)/kalimat${NC}" || \
    echo -e "${YELLOW}⚠ Repo GitHub déjà existant ou erreur — continue sans push${NC}"
else
  echo -e "${YELLOW}⚠ GitHub CLI non connecté. Pour créer le repo plus tard :${NC}"
  echo -e "   gh repo create kalimat --public --source=. --remote=origin --push"
fi

# ── 6. Déploiement Vercel ─────────────────────────────────
echo ""
echo -e "${YELLOW}[6/6] Déploiement sur Vercel...${NC}"

if command -v vercel &>/dev/null || npx vercel --version &>/dev/null 2>&1; then
  echo -e "${BLUE}Lancement de Vercel (connecte-toi si demandé)...${NC}"
  cd "$DEST"
  npx vercel --yes 2>&1 | tee /tmp/vercel-output.txt
  VERCEL_URL=$(grep -o 'https://[^ ]*\.vercel\.app' /tmp/vercel-output.txt | head -1)
  if [ -n "$VERCEL_URL" ]; then
    echo ""
    echo -e "${GREEN}✓ Déployé sur Vercel !${NC}"
    echo -e "${GREEN}  URL : $VERCEL_URL${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Vercel CLI non disponible. Pour déployer :${NC}"
  echo -e "   cd ~/Desktop/kalimat && npx vercel"
fi

# ── Résumé ────────────────────────────────────────────────
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Installation terminée !${NC}"
echo ""
echo -e "  Projet local : ${BLUE}~/Desktop/kalimat${NC}"
echo -e "  Lancer en local : ${BLUE}cd ~/Desktop/kalimat && npm run dev${NC}"
echo -e "  → http://localhost:3000"
echo ""
echo -e "${YELLOW}Dernière étape — Base de données Supabase :${NC}"
echo -e "  1. Va sur https://supabase.com/dashboard/project/lzbcltsxfshfguivgcji/sql/new"
echo -e "  2. Colle le contenu de ${BLUE}~/Desktop/kalimat/supabase/schema.sql${NC} → Run"
echo -e "  3. Colle le contenu de ${BLUE}~/Desktop/kalimat/supabase/seed.sql${NC} → Run"
echo -e "${BLUE}============================================${NC}"
echo ""
