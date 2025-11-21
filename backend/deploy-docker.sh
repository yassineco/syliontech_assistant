#!/bin/bash
set -e

# Change to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Deploying SylionTech Assistant API to Cloud Run"
echo "=========================================="
echo "Working directory: $(pwd)"
echo ""

# Variables
PROJECT_ID="sylion-tech-assistant"
REGION="europe-west1"
SERVICE_NAME="syliontech-assistant-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Build locally
echo "📦 Building Docker image locally..."
docker build -t ${IMAGE_NAME}:latest .

# Push to GCR
echo "⬆️  Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}:latest

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production,PROJECT_ID=sylion-tech-assistant,REGION=europe-west1,VERTEX_LOCATION=europe-west1,GENAI_MODEL=gemini-2.5-flash,BUCKET_NAME=sylion-tech-assistant-documents,HMAC_SECRET=production-secret-key-very-long-and-secure-for-cloud-run-deployment-2025,EMBEDDING_MODEL=text-embedding-004,FIRESTORE_DATABASE_ID=(default),LOG_LEVEL=info,USE_REAL_EMBEDDINGS=true,USE_REAL_VECTOR_DB=true" \
  --project ${PROJECT_ID}

echo "✅ Deployment complete!"
echo "Service URL: https://${SERVICE_NAME}-374140035541.${REGION}.run.app"
