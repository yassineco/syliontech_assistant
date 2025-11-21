#!/bin/bash

# ===========================================
# ACTIVATION DES APIS - SYLION-TECH-ASSISTANT
# ===========================================

set -e

PROJECT_ID="sylion-tech-assistant"
REGION="europe-west1"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo "🚀 Configuration du projet GCP: $PROJECT_ID"
echo "=============================================="

# Vérification de gcloud
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI n'est pas installé"
    exit 1
fi

# Configuration du projet
log_info "Configuration du projet GCP..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Vérification de l'authentification
log_info "Vérification de l'authentification..."
gcloud auth list

# Activation des APIs nécessaires
log_info "Activation des APIs Google Cloud..."

APIS=(
    "compute.googleapis.com"
    "container.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "aiplatform.googleapis.com"
    "firestore.googleapis.com"
    "storage.googleapis.com"
    "firebase.googleapis.com"
    "secretmanager.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "logging.googleapis.com"
    "monitoring.googleapis.com"
)

for api in "${APIS[@]}"; do
    log_info "Activation de $api..."
    gcloud services enable $api
done

log_success "Toutes les APIs ont été activées !"

# Création du bucket Cloud Storage
log_info "Création du bucket Cloud Storage..."
BUCKET_NAME="sylion-tech-assistant-documents"
gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME || log_warning "Bucket existe peut-être déjà"

# Configuration Firestore
log_info "Configuration de Firestore..."
gcloud firestore databases create --region=$REGION --type=firestore-native || log_warning "Firestore existe peut-être déjà"

# Affichage des informations de configuration
echo ""
echo "🎯 CONFIGURATION TERMINÉE"
echo "========================="
echo "Projet GCP        : $PROJECT_ID"
echo "Région            : $REGION"
echo "Bucket Storage    : gs://$BUCKET_NAME"
echo "Firestore         : Activé"
echo "APIs              : Toutes activées ✅"
echo ""
echo "🔗 PROCHAINES ÉTAPES:"
echo "1. Tester la connectivité backend"
echo "2. Créer les credentials Firebase"
echo "3. Déployer les services"

log_success "Projet GCP $PROJECT_ID prêt pour SylionTech Assistant !"