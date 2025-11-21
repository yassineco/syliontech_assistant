# 🔧 Configuration d'Environnement - Variables DEV

Ce fichier contient les variables d'environnement pour l'environnement de développement.

## 📋 Variables API (Cloud Run)

```bash
# Configuration Node.js
NODE_ENV=production
PORT=8080

# Configuration Firebase
FIREBASE_PROJECT_ID=sylion-tech-assistant
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Configuration LLM (optionnel)
OPENAI_API_KEY=your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here

# Configuration RAG
RAG_NAMESPACE=syliontech
RAG_CHUNK_SIZE=1000
```

## 🔐 Variables Admin Console (Next.js)

```bash
# Configuration Firebase Web
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sylion-tech-assistant.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sylion-tech-assistant

# Configuration API
NEXT_PUBLIC_API_URL=https://syliontech-api-dev-xxxxx-ew.a.run.app
```

## 📝 Configuration des Secrets GCP

### Création des secrets

```bash
# Secret pour Firebase Service Account
gcloud secrets create firebase-service-account --data-file=path/to/service-account.json

# Secret pour OpenAI (optionnel)
echo "your-openai-key" | gcloud secrets create openai-api-key --data-file=-

# Secret pour Gemini (optionnel)
echo "your-gemini-key" | gcloud secrets create gemini-api-key --data-file=-
```

### Configuration Cloud Run avec secrets

```bash
gcloud run deploy syliontech-api-dev \
  --set-env-vars FIREBASE_PROJECT_ID=sylion-tech-assistant \
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account:latest \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest
```

## 🌍 URLs d'Environnement

| Service | URL DEV | Description |
|---------|---------|-------------|
| API Backend | `https://syliontech-api-dev-xxxxx-ew.a.run.app` | API REST avec /v1/chat |
| Admin Console | `https://syliontech-admin-dev.web.app` | Interface d'administration |
| Demo Widget | `https://syliontech-demo-dev.web.app` | Page de démonstration |

## 🔑 Configuration API Keys

### Tenant de démonstration

```json
{
  "tenantId": "syliontech-demo",
  "apiKey": "demo-key-123",
  "name": "SylionTech Demo",
  "status": "active",
  "defaultLang": "fr",
  "ragNamespace": "syliontech"
}
```

### Test de l'API

```bash
curl -X POST https://syliontech-api-dev-xxxxx-ew.a.run.app/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-key-123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Bonjour, que fait SylionTech ?"
      }
    ],
    "session": {
      "userId": "demo-user",
      "lang": "fr",
      "channel": "web-widget"
    }
  }'
```

## 📊 Monitoring et Logs

### Logs Cloud Run

```bash
# Logs en temps réel
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=syliontech-api-dev"

# Logs récents
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=syliontech-api-dev" --limit=50
```

### Métriques Firebase

```bash
# Status des sites Firebase
firebase hosting:sites:list --project sylion-tech-assistant

# Logs Firebase Functions (si utilisées)
firebase functions:log --project sylion-tech-assistant
```

## 🚨 Troubleshooting

### Problèmes courants

1. **Service Cloud Run inaccessible**
   ```bash
   # Vérifier le déploiement
   gcloud run services describe syliontech-api-dev --region europe-west1
   
   # Vérifier les permissions IAM
   gcloud run services add-iam-policy-binding syliontech-api-dev \
     --member="allUsers" \
     --role="roles/run.invoker" \
     --region=europe-west1
   ```

2. **Admin Console ne se charge pas**
   ```bash
   # Vérifier le build Next.js
   cd apps/admin && pnpm run build:prod
   
   # Redéployer
   firebase deploy --only hosting:admin --project sylion-tech-assistant
   ```

3. **Widget non fonctionnel dans la démo**
   ```bash
   # Recompiler le widget
   cd apps/widget && pnpm build
   
   # Copier dans la démo
   cp apps/widget/dist/assistant.js apps/demo/
   
   # Redéployer la démo
   cd apps/demo && firebase deploy --only hosting:demo
   ```

## 🔄 Scripts de Déploiement

### Déploiement complet

```bash
# Déploiement de toute l'infrastructure DEV
./scripts/deploy-dev.sh
```

### Déploiements individuels

```bash
# API seulement
cd apps/server && bash deploy-api.sh

# Admin Console seulement
cd apps/admin && pnpm run deploy:firebase

# Démo seulement
cd apps/demo && firebase deploy --only hosting:demo
```

### Validation

```bash
# Tests automatiques de l'infrastructure
./scripts/validate-deployment.sh
```