#!/bin/bash

# Magic Button - Bootstrap GCP Infrastructure
# Ce script configure automatiquement tous les services GCP nécessaires

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-magic-button-demo}"
REGION="${REGION:-europe-west1}"
VERTEX_LOCATION="${VERTEX_LOCATION:-us-central1}"
SERVICE_ACCOUNT_NAME="magic-button-api"

echo -e "${BLUE}🪄 Magic Button - Bootstrap GCP Infrastructure${NC}"
echo "=================================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Vertex AI Location: $VERTEX_LOCATION"
echo ""

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform not found. Please install Terraform."
        exit 1
    fi
    
    log_success "All dependencies found"
}

setup_gcloud() {
    log_info "Setting up gcloud configuration..."
    
    # Set project
    gcloud config set project "$PROJECT_ID"
    
    # Set default region
    gcloud config set compute/region "$REGION"
    
    # Verify authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_warning "No active authentication found. Running gcloud auth login..."
        gcloud auth login
    fi
    
    log_success "gcloud configured for project $PROJECT_ID"
}

enable_apis() {
    log_info "Enabling required GCP APIs..."
    
    local apis=(
        "cloudbuild.googleapis.com"
        "cloudrun.googleapis.com"
        "aiplatform.googleapis.com"
        "firestore.googleapis.com"
        "storage.googleapis.com"
        "secretmanager.googleapis.com"
        "iam.googleapis.com"
        "cloudresourcemanager.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        echo -n "  Enabling $api... "
        if gcloud services enable "$api" --quiet; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            log_error "Failed to enable $api"
            exit 1
        fi
        sleep 2  # Avoid rate limiting
    done
    
    log_success "All APIs enabled"
}

create_service_account() {
    log_info "Creating service account..."
    
    local sa_email="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" &>/dev/null; then
        log_warning "Service account $sa_email already exists"
    else
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --display-name="Magic Button API Service Account" \
            --description="Service account for Magic Button API on Cloud Run"
        log_success "Service account created: $sa_email"
    fi
    
    # Grant necessary roles
    local roles=(
        "roles/aiplatform.user"
        "roles/datastore.user"
        "roles/storage.objectAdmin"
        "roles/secretmanager.secretAccessor"
    )
    
    for role in "${roles[@]}"; do
        echo -n "  Granting $role... "
        if gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$sa_email" \
            --role="$role" --quiet &>/dev/null; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
        fi
    done
    
    log_success "Service account configured with required permissions"
}

setup_secrets() {
    log_info "Setting up secrets in Secret Manager..."
    
    # Generate HMAC secret if not provided
    if [ -z "${HMAC_SECRET:-}" ]; then
        HMAC_SECRET=$(openssl rand -base64 32)
        log_warning "Generated new HMAC secret"
    fi
    
    # Create HMAC secret
    if gcloud secrets describe "hmac-secret" &>/dev/null; then
        log_warning "HMAC secret already exists, updating..."
        echo -n "$HMAC_SECRET" | gcloud secrets versions add "hmac-secret" --data-file=-
    else
        echo -n "$HMAC_SECRET" | gcloud secrets create "hmac-secret" --data-file=-
        log_success "HMAC secret created"
    fi
    
    # Give service account access to secret
    gcloud secrets add-iam-policy-binding "hmac-secret" \
        --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" --quiet
    
    log_success "Secrets configured"
}

create_storage_bucket() {
    log_info "Creating Cloud Storage bucket..."
    
    local bucket_name="${PROJECT_ID}-documents"
    
    if gsutil ls "gs://$bucket_name" &>/dev/null; then
        log_warning "Bucket gs://$bucket_name already exists"
    else
        gsutil mb -l "$REGION" "gs://$bucket_name"
        log_success "Created bucket: gs://$bucket_name"
    fi
    
    # Set bucket permissions
    gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin" "gs://$bucket_name"
    
    log_success "Storage bucket configured"
}

setup_firestore() {
    log_info "Setting up Firestore database..."
    
    # Check if Firestore is already enabled
    if gcloud firestore databases describe --format="value(name)" 2>/dev/null | grep -q "projects/$PROJECT_ID"; then
        log_warning "Firestore database already exists"
    else
        gcloud firestore databases create --location="$REGION" --type=firestore-native
        log_success "Firestore database created"
    fi
    
    log_success "Firestore configured"
}

run_terraform() {
    log_info "Running Terraform to create remaining infrastructure..."
    
    cd infra/terraform
    
    # Initialize Terraform
    terraform init
    
    # Set Terraform variables
    export TF_VAR_project_id="$PROJECT_ID"
    export TF_VAR_region="$REGION"
    export TF_VAR_vertex_location="$VERTEX_LOCATION"
    
    # Plan and apply
    terraform plan -out=tfplan
    terraform apply tfplan
    
    cd ../..
    
    log_success "Terraform infrastructure deployed"
}

create_env_file() {
    log_info "Creating .env file..."
    
    cat > .env << EOF
# GCP Configuration
PROJECT_ID=$PROJECT_ID
REGION=$REGION
SERVICE_NAME=magic-button-api
VERTEX_LOCATION=$VERTEX_LOCATION

# Vertex AI Models
GENAI_MODEL=gemini-1.5-pro
EMBEDDING_MODEL=text-embedding-004

# Security
HMAC_SECRET=$HMAC_SECRET

# Cloud Storage
BUCKET_NAME=${PROJECT_ID}-documents

# Firestore
FIRESTORE_DATABASE_ID=(default)

# Development
NODE_ENV=development
PORT=8080
LOG_LEVEL=info
EOF
    
    log_success ".env file created"
}

verify_setup() {
    log_info "Verifying setup..."
    
    # Check if APIs are enabled
    echo -n "  Vertex AI API: "
    if gcloud services list --enabled --filter="name:aiplatform.googleapis.com" --format="value(name)" | grep -q aiplatform; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
    
    # Check service account
    echo -n "  Service Account: "
    if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
    
    # Check storage bucket
    echo -n "  Storage Bucket: "
    if gsutil ls "gs://${PROJECT_ID}-documents" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
    
    log_success "Setup verification completed"
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 GCP Infrastructure Bootstrap Complete!${NC}"
    echo "=================================================="
    echo ""
    echo "Next steps:"
    echo "1. Install dependencies: npm run install:all"
    echo "2. Start development: npm run dev"
    echo "3. Deploy backend: npm run deploy:backend"
    echo ""
    echo "Useful commands:"
    echo "- View logs: gcloud run logs tail magic-button-api"
    echo "- Open Cloud Console: gcloud console"
    echo "- Check quotas: gcloud compute project-info describe"
    echo ""
    echo "Configuration saved in .env file"
    echo ""
}

# Main execution
main() {
    check_dependencies
    setup_gcloud
    enable_apis
    create_service_account
    setup_secrets
    create_storage_bucket
    setup_firestore
    create_env_file
    verify_setup
    print_next_steps
}

# Run main function
main "$@"