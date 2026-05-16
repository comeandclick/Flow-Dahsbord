#!/bin/bash
set -e

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

echo -e "${YELLOW}[1/6] Vérification des outils...${NC}"
if ! command -v node &>/dev/null; then echo -e "${RED}Node.js non installé — nodejs.org${NC}"; exit 1; fi
if ! command -v git &>/dev/null; then echo -e "${RED}Git non installé.${NC}"; exit 1; fi
echo -e "${GREEN}✓ Node $(node -v), Git OK${NC}"

echo ""
echo -e "${YELLOW}[2/6] Téléchargement du projet...${NC}"
DEST="$HOME/Desktop/kalimat"
[ -d "$DEST" ] && rm -rf "$DEST"
git clone -b claude/arabic-learning-app-NBR1P --single-branch https://github.com/comeandclick/Flow-Dahsbord /tmp/kalimat-tmp 2>/dev/null
cp -r /tmp/kalimat-tmp/kalimat "$DEST"
rm -rf /tmp/kalimat-tmp
cd "$DEST"
echo -e "${GREEN}✓ Projet dans ~/Desktop/kalimat${NC}"

echo ""
echo -e "${YELLOW}[3/6] Configuration .env.local...${NC}"
cat > "$DEST/.env.local" << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://lzbcltsxfshfguivgcji.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6YmNsdHN4ZnNoZmd1aXZnY2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTgxNjMsImV4cCI6MjA5NDQ5NDE2M30.dEuLnyLlhUccPrVKMy_2xMP2EcnsG6-JTVXz_APg4iE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6YmNsdHN4ZnNoZmd1aXZnY2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxODE2MywiZXhwIjoyMDk0NDk0MTYzfQ.O_WYG9k9hTJI9dmlU8ok6TdX2LmwcFSpVNc_OCFzcec
ENVEOF
echo -e "${GREEN}✓ .env.local créé${NC}"

echo ""
echo -e "${YELLOW}[4/6] Installation npm...${NC}"
npm install --silent
echo -e "${GREEN}✓ Dépendances installées${NC}"

echo ""
echo -e "${YELLOW}[5/6] GitHub...${NC}"
git init -b main && git add . && git commit -m 'Initial commit — Kalimat' --quiet
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  gh repo create kalimat --public --source=. --remote=origin --push --description "Application apprentissage arabe" 2>/dev/null && \
    echo -e "${GREEN}✓ Repo GitHub : https://github.com/$(gh api user -q .login)/kalimat${NC}" || \
    echo -e "${YELLOW}⚠ Repo existant ou erreur GitHub${NC}"
else
  echo -e "${YELLOW}⚠ gh CLI non dispo — pour créer le repo : gh repo create kalimat --public --source=. --remote=origin --push${NC}"
fi

echo ""
echo -e "${YELLOW}[6/6] Déploiement Vercel...${NC}"
npx vercel --yes 2>&1 | tee /tmp/vercel-out.txt
VERCEL_URL=$(grep -o 'https://[^ ]*\.vercel\.app' /tmp/vercel-out.txt | head -1)
[ -n "$VERCEL_URL" ] && echo -e "${GREEN}✓ Live : $VERCEL_URL${NC}"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}Terminé ! Projet dans ~/Desktop/kalimat${NC}"
echo -e "Local : cd ~/Desktop/kalimat && npm run dev"
echo ""
echo -e "${YELLOW}Base de données — 2 min :${NC}"
echo -e "  → https://supabase.com/dashboard/project/lzbcltsxfshfguivgcji/sql/new"
echo -e "  Colle schema.sql → Run, puis seed.sql → Run"
echo -e "${BLUE}============================================${NC}"
