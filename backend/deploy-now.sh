#!/bin/bash

echo "🚀 Déploiement Magic Button API avec Routes RAG"
echo "================================================"

gcloud run deploy magic-button-api \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production,PROJECT_ID=magic-button-demo,REGION=europe-west1,VERTEX_LOCATION=europe-west1,GENAI_MODEL=gemini-2.5-flash,BUCKET_NAME=magic-button-documents,HMAC_SECRET=production-secret-key-very-long-and-secure-for-cloud-run-deployment-2025,EMBEDDING_MODEL=text-embedding-004,FIRESTORE_DATABASE_ID=(default),LOG_LEVEL=info"

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "Test de la route RAG:"
echo "curl 'https://magic-button-api-374140035541.europe-west1.run.app/rag/search?q=test&limit=5'"
