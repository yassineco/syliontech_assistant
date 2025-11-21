#!/bin/bash
set -e

# ===========================================
# DÉPLOIEMENT API SYLIONTECH SUR CLOUD RUN
# ===========================================

# Configuration
PROJECT_ID="sylion-tech-assistant"
SERVICE_NAME="syliontech-api-dev"
REGION="europe-west1"
API_PORT="8080"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

echo "🚀 Déploiement API SylionTech sur Cloud Run"
echo "============================================"

# Vérification des prérequis
log_info "Vérification des prérequis..."

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI n'est pas installé"
    exit 1
fi

# Vérification de l'authentification
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
    log_error "Aucune authentification gcloud active"
    log_info "Exécutez: gcloud auth login"
    exit 1
fi

# Configuration du projet
log_info "Configuration du projet GCP: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Vérification que le projet existe
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    log_error "Le projet $PROJECT_ID n'existe pas ou n'est pas accessible"
    exit 1
fi

log_success "Projet configuré"

# Activation des APIs nécessaires
log_info "Vérification des APIs..."

REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        log_info "Activation de $api..."
        gcloud services enable $api
    fi
done

log_success "APIs vérifiées"

# Build et déploiement
log_info "Déploiement en cours..."

# Déploiement via source avec configuration optimisée
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port $API_PORT \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars "NODE_ENV=production,PORT=$API_PORT" \
  --execution-environment gen2 \
  --cpu-boost \
  --session-affinity || {
    log_error "Échec du déploiement"
    exit 1
  }

# Récupération de l'URL de service
log_info "Récupération des informations de déploiement..."

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    log_error "Impossible de récupérer l'URL du service"
    exit 1
fi

log_success "API déployée avec succès !"
echo
echo "🔗 Informations de déploiement :"
echo "   📡 Service: $SERVICE_NAME"
echo "   🌐 URL: $SERVICE_URL"
echo "   📍 Région: $REGION"
echo "   🎯 Endpoints disponibles:"
echo "      • Health: $SERVICE_URL/health"
echo "      • Chat API: $SERVICE_URL/v1/chat"
echo

# Tests de santé
log_info "Test de connectivité..."

# Attendre que le service soit disponible
sleep 10

if curl -s -f "$SERVICE_URL/health" > /dev/null; then
    log_success "Service accessible et en bonne santé"
else
    log_warning "Le service pourrait ne pas être encore prêt. Réessayez dans quelques minutes."
fi

echo
log_info "🧪 Commande de test de l'API :"
echo "curl -X POST $SERVICE_URL/v1/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"x-api-key: demo-key-123\" \\"
echo "  -d '{"
echo "    \"messages\": [{"
echo "      \"role\": \"user\","
echo "      \"content\": \"Bonjour, que fait SylionTech ?\""
echo "    }],"
echo "    \"session\": {"
echo "      \"userId\": \"demo-user\","
echo "      \"lang\": \"fr\","
echo "      \"channel\": \"web-widget\""
echo "    }"
echo "  }'"

echo
log_success "🎉 Déploiement terminé !"