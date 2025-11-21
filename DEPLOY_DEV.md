# 🚀 Guide de Déploiement DEV - SylionTech Assistant

Ce guide détaille la mise en place d'un environnement cloud "dev" fonctionnel pour SylionTech Assistant.

## 📋 Vue d'ensemble

**Environnement cible :**
- **Project ID GCP** : `sylion-tech-assistant`
- **API Backend** : Cloud Run (`syliontech-api-dev`)
- **Admin Console** : Firebase Hosting (`syliontech-admin-dev`)
- **Demo Widget** : Firebase Hosting (`syliontech-demo-dev`)

## 🎯 Pré-requis GCP

### 1. Configuration du projet GCP

```bash
# Définir le projet
gcloud config set project sylion-tech-assistant

# Vérifier la configuration
gcloud config get-value project
```

### 2. Activation des APIs nécessaires

```bash
# APIs Cloud Run & Build
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# APIs Firebase & Firestore
gcloud services enable firebase.googleapis.com
gcloud services enable firestore.googleapis.com

# APIs additionnelles
gcloud services enable iamcredentials.googleapis.com
gcloud services enable cloudfunctions.googleapis.com

# Vérifier l'activation
gcloud services list --enabled --filter="name:(run.googleapis.com OR cloudbuild.googleapis.com OR firebase.googleapis.com)"
```

### 3. Configuration de l'authentification

```bash
# Authentification locale pour les déploiements
gcloud auth login
gcloud auth application-default login

# Définir le projet par défaut pour ADC
gcloud auth application-default set-quota-project sylion-tech-assistant
```

## 🔥 1. Déploiement Cloud Run (API Backend)

### Structure existante

Le projet possède déjà :
- `infra/cloudrun/Dockerfile` : Dockerfile optimisé Node.js 22
- Configuration multi-stage build avec utilisateur non-root
- Healthcheck intégré sur `/health`

### Script de déploiement

Créer le script `apps/server/deploy-api.sh` :

```bash
#!/bin/bash
set -e

# Configuration
PROJECT_ID="sylion-tech-assistant"
SERVICE_NAME="syliontech-api-dev"
REGION="europe-west1"

echo "🚀 Déploiement API SylionTech sur Cloud Run"
echo "============================================"

# Déploiement via source
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --timeout 300 \
  --concurrency 80

# Récupérer l'URL de service
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo "✅ API déployée : $SERVICE_URL"
echo "🔍 Test endpoint : $SERVICE_URL/v1/chat"
```

### Test de l'API déployée

```bash
# Test de santé
curl -X GET https://syliontech-api-dev-xxxxx-ew.a.run.app/health

# Test endpoint /v1/chat
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

## 🏗️ 2. Déploiement Firebase Hosting (Admin Console)

### Configuration Next.js pour Firebase

Le projet `apps/admin` est déjà configuré avec Next.js. Adaptation pour Firebase Hosting :

#### Mise à jour `apps/admin/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'dist',
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  }
};

module.exports = nextConfig;
```

#### Configuration Firebase

**`apps/admin/.firebaserc`**
```json
{
  "projects": {
    "default": "sylion-tech-assistant"
  },
  "targets": {
    "sylion-tech-assistant": {
      "hosting": {
        "admin": ["syliontech-admin-dev"]
      }
    }
  }
}
```

**`apps/admin/firebase.json`**
```json
{
  "hosting": {
    "target": "admin",
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

### Scripts de déploiement

**`apps/admin/package.json`** (ajouts) :

```json
{
  "scripts": {
    "build:prod": "npm run build",
    "deploy:firebase": "npm run build:prod && firebase deploy --only hosting:admin",
    "deploy:dev": "npm run deploy:firebase"
  }
}
```

### Commandes de déploiement

```bash
cd apps/admin

# Installation des dépendances
pnpm install

# Build production
pnpm run build:prod

# Initialisation Firebase (première fois seulement)
firebase login
firebase use sylion-tech-assistant

# Création du site Firebase Hosting
firebase hosting:sites:create syliontech-admin-dev

# Déploiement
pnpm run deploy:firebase
```

**URL résultante :** `https://syliontech-admin-dev.web.app`

## 🎨 3. Démo Widget (Optionnel)

### Structure du projet démo

Créer `apps/demo/` :

```
apps/demo/
├── index.html
├── style.css
├── firebase.json
├── .firebaserc
└── assistant.js (copie du widget)
```

#### `apps/demo/index.html`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SylionTech Assistant - Démo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>🤖 SylionTech Assistant - Démo</h1>
        <p>Testez notre assistant IA intégré</p>
    </header>

    <main>
        <section class="demo-section">
            <h2>Interface de Test</h2>
            <div class="test-controls">
                <button id="trigger-assistant">🎯 Ouvrir l'Assistant</button>
                <button id="test-voice">🎤 Test Vocal</button>
            </div>
        </section>

        <section class="config-section">
            <h3>Configuration</h3>
            <div class="config-item">
                <label>API Endpoint:</label>
                <input type="url" id="api-endpoint" value="https://syliontech-api-dev-xxxxx-ew.a.run.app" readonly>
            </div>
            <div class="config-item">
                <label>Tenant ID:</label>
                <input type="text" id="tenant-id" value="syliontech-demo" readonly>
            </div>
        </section>
    </main>

    <!-- Widget SylionTech -->
    <script>
        window.SylionTechConfig = {
            apiUrl: 'https://syliontech-api-dev-xxxxx-ew.a.run.app',
            apiKey: 'demo-key-123',
            tenantId: 'syliontech-demo',
            theme: 'blue',
            position: 'bottom-right'
        };
    </script>
    <script src="assistant.js" defer></script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('trigger-assistant').addEventListener('click', function() {
                if (window.SylionTechAssistant) {
                    window.SylionTechAssistant.open();
                }
            });

            document.getElementById('test-voice').addEventListener('click', function() {
                if (window.SylionTechAssistant && window.SylionTechAssistant.voice) {
                    window.SylionTechAssistant.voice.startListening();
                }
            });
        });
    </script>
</body>
</html>
```

#### Configuration Firebase pour la démo

**`apps/demo/.firebaserc`**
```json
{
  "projects": {
    "default": "sylion-tech-assistant"
  },
  "targets": {
    "sylion-tech-assistant": {
      "hosting": {
        "demo": ["syliontech-demo-dev"]
      }
    }
  }
}
```

**`apps/demo/firebase.json`**
```json
{
  "hosting": {
    "target": "demo",
    "public": ".",
    "ignore": [
      "firebase.json",
      ".firebaserc",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

### Déploiement de la démo

```bash
cd apps/demo

# Copier le widget compilé
cp ../widget/dist/assistant.js .

# Créer le site Firebase
firebase hosting:sites:create syliontech-demo-dev

# Déployer
firebase use sylion-tech-assistant
firebase deploy --only hosting:demo
```

**URL résultante :** `https://syliontech-demo-dev.web.app`

## 🔧 Scripts Automatisés

### Script de déploiement global

**`scripts/deploy-dev.sh`**

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement complet DEV - SylionTech Assistant"
echo "================================================"

# Configuration
PROJECT_ID="sylion-tech-assistant"
REGION="europe-west1"

# 1. Déploiement API
echo "📡 Déploiement de l'API..."
cd apps/server
bash deploy-api.sh
cd ../..

# 2. Build et déploiement Admin Console
echo "🏗️ Déploiement Admin Console..."
cd apps/admin
pnpm run deploy:firebase
cd ../..

# 3. Déploiement démo (optionnel)
echo "🎨 Déploiement Démo..."
cd apps/demo
cp ../widget/dist/assistant.js .
firebase deploy --only hosting:demo --project $PROJECT_ID
cd ../..

echo "✅ Déploiement DEV terminé !"
echo "🔗 URLs disponibles :"
echo "   API: https://syliontech-api-dev-xxxxx-ew.a.run.app"
echo "   Admin: https://syliontech-admin-dev.web.app"
echo "   Demo: https://syliontech-demo-dev.web.app"
```

## 🔍 Vérification et Tests

### Tests des services déployés

```bash
# Test API Health
curl -f https://syliontech-api-dev-xxxxx-ew.a.run.app/health

# Test API Chat
curl -X POST https://syliontech-api-dev-xxxxx-ew.a.run.app/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-key-123" \
  -d '{"messages":[{"role":"user","content":"Test"}],"session":{"userId":"test","lang":"fr","channel":"web-widget"}}'

# Test Admin Console (accessible via navigateur)
open https://syliontech-admin-dev.web.app

# Test Demo Widget (accessible via navigateur)
open https://syliontech-demo-dev.web.app
```

### Monitoring et logs

```bash
# Logs Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=syliontech-api-dev" --limit=50

# Métriques Firebase Hosting
firebase hosting:status --project sylion-tech-assistant

# Vérification des sites Firebase
firebase hosting:sites:list --project sylion-tech-assistant
```

## 🚨 Troubleshooting

### Problèmes courants

1. **Erreur d'authentification GCP**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Site Firebase déjà existant**
   ```bash
   firebase hosting:sites:list
   firebase hosting:sites:delete SITE_ID
   ```

3. **Build Next.js qui échoue**
   ```bash
   # Vérifier la configuration next.config.js
   # Assurez-vous que output: 'export' est défini
   ```

4. **API Cloud Run inaccessible**
   ```bash
   # Vérifier les permissions IAM
   gcloud run services add-iam-policy-binding syliontech-api-dev \
     --member="allUsers" \
     --role="roles/run.invoker" \
     --region=europe-west1
   ```

## 🔐 Variables d'Environnement

### Cloud Run (API)

```bash
# Configuration minimale
NODE_ENV=production
PORT=8080

# Configuration étendue (à ajouter selon besoins)
OPENAI_API_KEY=secret://openai-api-key
FIREBASE_PROJECT_ID=sylion-tech-assistant
FIREBASE_PRIVATE_KEY=secret://firebase-service-account
```

### Firebase (Admin Console)

```bash
# Variables Next.js
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sylion-tech-assistant.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sylion-tech-assistant
```

---

**🎯 Objectif atteint :** Environnement DEV fonctionnel avec API, Admin Console et démo déployés sur GCP/Firebase.