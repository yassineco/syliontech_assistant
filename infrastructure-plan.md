# 🚀 Plan de Déploiement - SylionTech Assistant

## 📋 Infrastructure Cloud

### 🔥 **Firebase (Frontend & Data)**
- **Hosting** : Apps web (demo, admin console)
- **Firestore** : Base de données multi-tenant
- **Authentication** : Gestion utilisateurs et API keys
- **Storage** : Documents RAG et assets
- **Functions** : Webhooks et événements

### ☁️ **Google Cloud Platform (Backend)**
- **Cloud Run** : API serveur containerisé
- **Vertex AI** : Gemini 1.5 Flash/Pro pour LLM
- **Secret Manager** : Clés API et configurations
- **Cloud Build** : CI/CD automatisé
- **Cloud Storage** : Backup et embeddings

### ⚡ **Vercel (CDN & Frontend)**
- **CDN Global** : Widget `assistant.js` 
- **Edge Functions** : Optimisations géographiques
- **Analytics** : Performance monitoring
- **Preview Deployments** : Review Apps par PR

---

## 🏗️ Étapes de Setup

### 1. **Création Projet GCP**
```bash
# Créer nouveau projet
gcloud projects create silyontech-assistant-prod
gcloud projects create silyontech-assistant-dev

# Activer APIs nécessaires
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  firebase.googleapis.com
```

### 2. **Configuration Firebase**
```bash
# Initialiser Firebase
firebase init hosting firestore functions storage

# Structure Firebase
silyontech-assistant/
├── firebase.json
├── firestore.rules
├── storage.rules
└── functions/
    ├── index.js
    └── package.json
```

### 3. **Setup Vercel**
```bash
# Déploiement widget CDN
vercel --prod
vercel alias set widget-xxx.vercel.app cdn.silyontech.com
```

---

## 🔧 Configuration par Environnement

### **Production**
- **GCP Project** : `silyontech-assistant-prod`
- **Firebase** : `silyontech-assistant-prod`
- **Vercel** : `cdn.silyontech.com`
- **Domaines** :
  - API : `api.silyontech.com`
  - Admin : `admin.silyontech.com`
  - Docs : `docs.silyontech.com`
  - Widget : `cdn.silyontech.com/assistant.js`

### **Development**
- **GCP Project** : `silyontech-assistant-dev`
- **Firebase** : `silyontech-assistant-dev`
- **Vercel** : `cdn-dev.silyontech.com`

---

## 📁 Structure de Déploiement

```
silyontech-assistant/
├── infra/
│   ├── firebase/
│   │   ├── firestore.rules
│   │   ├── storage.rules
│   │   └── firebase.json
│   ├── cloudrun/
│   │   ├── Dockerfile
│   │   └── cloudbuild.yaml
│   └── vercel/
│       ├── vercel.json
│       └── cdn/
├── apps/
│   ├── api/              # → Cloud Run
│   ├── admin/            # → Firebase Hosting
│   └── web/              # → Firebase Hosting
└── packages/
    ├── widget/           # → Vercel CDN
    └── react-sdk/        # → NPM Registry
```

---

## 🔑 Variables d'Environnement

### **Cloud Run (API)**
```env
NODE_ENV=production
GCP_PROJECT_ID=silyontech-assistant-prod
FIREBASE_PROJECT_ID=silyontech-assistant-prod
VERTEX_AI_LOCATION=europe-west1
GEMINI_MODEL=gemini-1.5-flash
FIREBASE_SERVICE_ACCOUNT_KEY=projects/xxx/secrets/firebase-key
```

### **Firebase (Frontend)**
```env
VITE_API_BASE_URL=https://api.silyontech.com
VITE_FIREBASE_CONFIG={"projectId":"..."}
VITE_ENVIRONMENT=production
```

### **Vercel (Widget)**
```env
NEXT_PUBLIC_API_URL=https://api.silyontech.com
NEXT_PUBLIC_CDN_URL=https://cdn.silyontech.com
```

---

## 🚀 Pipeline CI/CD

### **GitHub Actions**

#### `.github/workflows/deploy-production.yml`
```yaml
name: Deploy Production
on:
  push:
    branches: [main]
jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloud Run
        run: gcloud run deploy api --source=apps/api
  
  deploy-frontend:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Firebase
        run: firebase deploy --only hosting:admin,hosting:web
  
  deploy-widget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: vercel deploy --prod packages/widget
```

---

## 💰 Estimation Coûts (Démarrage)

### **GCP (par mois)**
- **Cloud Run** : ~€15-30 (trafic modéré)
- **Vertex AI** : ~€50-100 (1M tokens/mois)
- **Firestore** : ~€10-20 (100k ops/jour)
- **Storage** : ~€5-10 (10GB)
- **Total GCP** : ~€80-160/mois

### **Vercel (par mois)**
- **Pro Plan** : ~€20/mois
- **Bandwidth** : Inclus jusqu'à 1TB
- **Edge Functions** : Inclus jusqu'à 500k invocations

### **Total estimé** : €100-180/mois (démarrage)

---

## 📊 Monitoring & Analytics

### **Cloud Monitoring**
- Latence API < 2s (p95)
- Uptime > 99.9%
- Erreurs < 0.1%

### **Firebase Analytics**
- Conversions par tenant
- Usage widget par domaine
- Performance RAG

### **Vercel Analytics**
- Performance CDN
- Cache hit rate
- Geographic distribution

---

## 🔐 Sécurité

### **IAM Roles**
```json
{
  "bindings": [
    {
      "role": "roles/run.invoker",
      "members": ["allUsers"]
    },
    {
      "role": "roles/aiplatform.user", 
      "members": ["serviceAccount:api@silyontech-assistant.iam.gserviceaccount.com"]
    }
  ]
}
```

### **Firestore Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Multi-tenant isolation
    match /tenants/{tenantId}/conversations/{conversationId} {
      allow read, write: if request.auth != null 
        && request.auth.token.tenantId == tenantId;
    }
  }
}
```

---

## ✅ Checklist de Déploiement

### **Pré-déploiement**
- [ ] Créer projets GCP (dev + prod)
- [ ] Configurer Firebase Authentication
- [ ] Setup domaines DNS
- [ ] Générer certificats SSL
- [ ] Configurer secrets dans Secret Manager

### **Déploiement**
- [ ] Deploy API sur Cloud Run
- [ ] Deploy admin/web sur Firebase Hosting
- [ ] Deploy widget sur Vercel CDN
- [ ] Configurer CORS et domaines autorisés
- [ ] Tests end-to-end en production

### **Post-déploiement**
- [ ] Configurer monitoring et alertes
- [ ] Setup budgets et quotas
- [ ] Documentation mise à jour
- [ ] Formation équipe sur admin console

---

## 🎯 Timeline de Déploiement

**Semaine 1** : Setup infrastructure (GCP + Firebase + Vercel)
**Semaine 2** : Configuration CI/CD et secrets
**Semaine 3** : Déploiement staging et tests
**Semaine 4** : Go-live production et monitoring

**Prêt pour commencer le setup ?** 🚀