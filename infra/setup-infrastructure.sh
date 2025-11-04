#!/bin/bash

# ===========================================
# SETUP INFRASTRUCTURE SILYONTECH ASSISTANT
# ===========================================

set -e

echo "🚀 Setup Infrastructure SylionTech Assistant"
echo "=============================================="

# Configuration
PROJECT_PREFIX="silyontech-assistant"
REGION="europe-west1"
DOMAIN_BASE="silyontech.com"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier gcloud
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI n'est pas installé"
        exit 1
    fi
    
    # Vérifier firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_error "firebase CLI n'est pas installé"
        exit 1
    fi
    
    # Vérifier vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_error "vercel CLI n'est pas installé"
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits"
}

# Création des projets GCP
create_gcp_projects() {
    log_info "Création des projets GCP..."
    
    # Projet Production
    PROD_PROJECT_ID="${PROJECT_PREFIX}-prod"
    DEV_PROJECT_ID="${PROJECT_PREFIX}-dev"
    
    log_info "Création du projet production: $PROD_PROJECT_ID"
    gcloud projects create $PROD_PROJECT_ID --name="SylionTech Assistant Production" || log_warning "Projet existe déjà"
    
    log_info "Création du projet développement: $DEV_PROJECT_ID"
    gcloud projects create $DEV_PROJECT_ID --name="SylionTech Assistant Development" || log_warning "Projet existe déjà"
    
    # Configuration du projet par défaut
    gcloud config set project $PROD_PROJECT_ID
    
    log_success "Projets GCP créés"
}

# Activation des APIs
enable_gcp_apis() {
    log_info "Activation des APIs GCP..."
    
    APIS=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "secretmanager.googleapis.com"
        "aiplatform.googleapis.com"
        "firebase.googleapis.com"
        "firestore.googleapis.com"
        "storage.googleapis.com"
        "cloudresourcemanager.googleapis.com"
    )
    
    for api in "${APIS[@]}"; do
        log_info "Activation de $api"
        gcloud services enable $api
    done
    
    log_success "APIs activées"
}

# Configuration Firebase
setup_firebase() {
    log_info "Configuration Firebase..."
    
    # Initialisation Firebase
    firebase projects:list
    
    log_info "Déploiement des règles Firestore..."
    firebase deploy --only firestore:rules,firestore:indexes --project $PROD_PROJECT_ID
    
    log_info "Déploiement des règles Storage..."
    firebase deploy --only storage --project $PROD_PROJECT_ID
    
    log_success "Firebase configuré"
}

# Configuration des secrets
setup_secrets() {
    log_info "Configuration des secrets..."
    
    # Firebase Service Account (à remplir manuellement)
    log_warning "Créez manuellement la clé de service Firebase:"
    log_warning "1. Allez dans Console Firebase > Paramètres projet > Comptes de service"
    log_warning "2. Générez une nouvelle clé privée"
    log_warning "3. Stockez-la dans Secret Manager avec le nom 'firebase-service-account'"
    
    # Placeholder pour OpenAI (optionnel)
    echo "placeholder-openai-key" | gcloud secrets create openai-api-key --data-file=- || log_warning "Secret existe déjà"
    
    log_success "Structure des secrets créée"
}

# Configuration domaines (placeholder)
setup_domains() {
    log_info "Configuration des domaines..."
    log_warning "Configuration manuelle requise:"
    log_warning "1. api.$DOMAIN_BASE → Cloud Run URL"
    log_warning "2. admin.$DOMAIN_BASE → Firebase Hosting"
    log_warning "3. docs.$DOMAIN_BASE → Firebase Hosting" 
    log_warning "4. cdn.$DOMAIN_BASE → Vercel"
    log_success "Domaines documentés"
}

# Fonction principale
main() {
    echo
    log_info "Démarrage du setup infrastructure..."
    echo
    
    check_prerequisites
    echo
    
    create_gcp_projects
    echo
    
    enable_gcp_apis
    echo
    
    setup_firebase
    echo
    
    setup_secrets
    echo
    
    setup_domains
    echo
    
    log_success "🎉 Setup infrastructure terminé!"
    echo
    log_info "Prochaines étapes:"
    log_info "1. Configurer les clés de service Firebase"
    log_info "2. Configurer les domaines DNS"
    log_info "3. Déployer avec: ./deploy.sh"
    echo
}

# Gestion des erreurs
trap 'log_error "Erreur détectée à la ligne $LINENO"' ERR

# Exécution
main "$@"