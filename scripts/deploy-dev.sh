#!/bin/bash
set -e

# ===========================================
# DÉPLOIEMENT COMPLET DEV - SYLIONTECH ASSISTANT
# ===========================================

# Configuration
PROJECT_ID="sylion-tech-assistant"
REGION="europe-west1"
API_SERVICE="syliontech-api-dev"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

echo "🌟 Déploiement Complet DEV - SylionTech Assistant"
echo "================================================="
echo

# Vérification des prérequis
log_info "Vérification des prérequis..."

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI n'est pas installé"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    log_error "firebase CLI n'est pas installé"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    log_error "pnpm n'est pas installé"
    exit 1
fi

# Configuration du projet
log_info "Configuration du projet GCP: $PROJECT_ID"
gcloud config set project $PROJECT_ID

log_success "Prérequis validés"
echo

# ===========================================
# ÉTAPE 1: DÉPLOIEMENT API SUR CLOUD RUN
# ===========================================

log_step "ÉTAPE 1/4: Déploiement de l'API Backend"
echo

cd apps/server
log_info "📡 Construction et déploiement de l'API..."

# Vérification que l'API compile
log_info "Compilation de l'API..."
pnpm install --frozen-lockfile
pnpm build

# Déploiement
bash deploy-api.sh

# Récupération de l'URL
API_URL=$(gcloud run services describe $API_SERVICE --region $REGION --format 'value(status.url)')

cd ../..
log_success "API déployée: $API_URL"
echo

# ===========================================
# ÉTAPE 2: DÉPLOIEMENT ADMIN CONSOLE
# ===========================================

log_step "ÉTAPE 2/4: Déploiement Admin Console"
echo

cd apps/admin
log_info "🏗️ Construction de l'Admin Console..."

# Vérification de Firebase CLI
if ! firebase projects:list | grep -q "$PROJECT_ID"; then
    log_error "Projet Firebase $PROJECT_ID non trouvé"
    log_info "Exécutez: firebase login"
    exit 1
fi

# Build de l'application
log_info "Build Next.js en cours..."
pnpm install --frozen-lockfile
pnpm run build:prod

# Création du site si nécessaire
if ! firebase hosting:sites:list --project $PROJECT_ID | grep -q "syliontech-admin-dev"; then
    log_info "Création du site Firebase: syliontech-admin-dev"
    firebase hosting:sites:create syliontech-admin-dev --project $PROJECT_ID
fi

# Déploiement
log_info "Déploiement sur Firebase Hosting..."
firebase deploy --only hosting:admin --project $PROJECT_ID

cd ../..
ADMIN_URL="https://syliontech-admin-dev.web.app"
log_success "Admin Console déployée: $ADMIN_URL"
echo

# ===========================================
# ÉTAPE 3: PRÉPARATION DU WIDGET
# ===========================================

log_step "ÉTAPE 3/4: Préparation du Widget"
echo

cd apps/widget
log_info "🎨 Build du widget..."

# Build du widget si nécessaire
if [ -d "dist" ] && [ -f "dist/assistant.js" ]; then
    log_info "Widget déjà compilé"
else
    log_info "Compilation du widget..."
    pnpm install --frozen-lockfile
    pnpm build
fi

cd ../..
log_success "Widget préparé"
echo

# ===========================================
# ÉTAPE 4: DÉPLOIEMENT PAGE DÉMO
# ===========================================

log_step "ÉTAPE 4/4: Déploiement Page Démo"
echo

cd apps/demo
log_info "🎭 Préparation de la démo..."

# Copie du widget compilé
if [ -f "../widget/dist/assistant.js" ]; then
    cp ../widget/dist/assistant.js .
    log_info "Widget copié dans la démo"
else
    log_warning "Widget non trouvé, démo sans assistant intégré"
    # Créer un fichier placeholder
    echo "console.log('Widget SylionTech non disponible');" > assistant.js
fi

# Mise à jour de l'URL de l'API dans la démo
if [ ! -z "$API_URL" ]; then
    log_info "Mise à jour de l'URL API: $API_URL"
    sed -i.bak "s|https://syliontech-api-dev-xxxxx-ew.a.run.app|$API_URL|g" index.html
    rm -f index.html.bak 2>/dev/null || true
fi

# Création du site si nécessaire
if ! firebase hosting:sites:list --project $PROJECT_ID | grep -q "syliontech-demo-dev"; then
    log_info "Création du site Firebase: syliontech-demo-dev"
    firebase hosting:sites:create syliontech-demo-dev --project $PROJECT_ID
fi

# Déploiement
log_info "Déploiement de la démo..."
firebase deploy --only hosting:demo --project $PROJECT_ID

cd ../..
DEMO_URL="https://syliontech-demo-dev.web.app"
log_success "Démo déployée: $DEMO_URL"
echo

# ===========================================
# RÉCAPITULATIF
# ===========================================

log_step "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo
echo "🔗 URLs Disponibles :"
echo "   📡 API Backend:    $API_URL"
echo "   🏛️ Admin Console:  $ADMIN_URL"
echo "   🎭 Démo Widget:    $DEMO_URL"
echo
echo "🧪 Tests Rapides :"
echo "   • Health Check: curl $API_URL/health"
echo "   • Chat API:     curl -X POST $API_URL/v1/chat -H \"Content-Type: application/json\" -H \"x-api-key: demo-key-123\" -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Test\"}],\"session\":{\"userId\":\"test\",\"lang\":\"fr\",\"channel\":\"web-widget\"}}'"
echo "   • Admin:        Ouvrir $ADMIN_URL"
echo "   • Demo:         Ouvrir $DEMO_URL"
echo
echo "📋 Prochaines étapes :"
echo "   1. Tester les endpoints API"
echo "   2. Configurer l'authentification Admin Console"
echo "   3. Ajouter des tenants via l'interface d'administration"
echo "   4. Tester le widget sur la page de démo"
echo

log_success "Infrastructure DEV prête pour le développement !"