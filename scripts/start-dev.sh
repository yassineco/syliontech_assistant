#!/bin/bash

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage Sofinco Assistant${NC}"
echo "=================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "apps/server" ] || [ ! -d "apps/web" ]; then
    echo -e "${RED}❌ Erreur: ce script doit être exécuté depuis la racine du projet${NC}"
    exit 1
fi

# Créer le répertoire de logs
mkdir -p logs

echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
pnpm install

echo -e "${YELLOW}🔧 Démarrage du backend (port 3001)...${NC}"
pnpm --filter @syliontech/server run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${YELLOW}🌐 Démarrage du frontend (port 5173)...${NC}"
pnpm --filter @syliontech/web run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo -e "${BLUE}⏳ Attente de démarrage des services...${NC}"
sleep 5

# Fonction pour vérifier si un service est prêt
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -m 2 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name prêt${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ $name - tentative $attempt/$max_attempts${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name non accessible après $max_attempts tentatives${NC}"
    return 1
}

# Vérifier les services
echo -e "${BLUE}🔍 Vérification des services...${NC}"

if check_service "http://localhost:3001/health" "Backend API"; then
    echo -e "${GREEN}📊 Backend logs:${NC}"
    tail -n 5 logs/backend.log
fi

if check_service "http://localhost:5173" "Frontend"; then
    echo -e "${GREEN}🌐 Frontend accessible sur: http://localhost:5173${NC}"
fi

echo
echo -e "${GREEN}🎉 Services démarrés !${NC}"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo
echo -e "${BLUE}📋 Commandes utiles:${NC}"
echo "  - Logs backend:  tail -f logs/backend.log"
echo "  - Logs frontend: tail -f logs/frontend.log"
echo "  - Arrêter:       kill $BACKEND_PID $FRONTEND_PID"
echo
echo -e "${YELLOW}🌍 Ouvrir l'application: http://localhost:5173${NC}"

# Garder le script actif
echo -e "${BLUE}✋ Appuyez sur Ctrl+C pour arrêter les services${NC}"

# Fonction de nettoyage
cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Services arrêtés${NC}"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup INT

# Attendre
wait