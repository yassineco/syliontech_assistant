# 🚀 Guide de Déploiement - SylionTech Assistant

## 📋 Prérequis

### Outils nécessaires
```bash
# Installation Google Cloud CLI
curl https://sdk.cloud.google.com | bash
gcloud auth login
gcloud auth application-default login

# Installation Firebase CLI
npm install -g firebase-tools
firebase login

# Installation Vercel CLI
npm install -g vercel
vercel login
```

### Comptes requis
- [x] Compte Google Cloud Platform
- [x] Compte Firebase (lié au GCP)
- [x] Compte Vercel
- [x] Domaine `silyontech.com` configuré

---

## 🏗️ Setup Infrastructure

### 1. Exécution du script de setup
```bash
cd /media/yassine/IA/Projects/SylionTech/assistant
./infra/setup-infrastructure.sh
```

### 2. Configuration manuelle Firebase
```bash
# Projet Production
firebase use --add
# Sélectionner: silyontech-assistant-prod
# Alias: production

# Projet Development  
firebase use --add
# Sélectionner: silyontech-assistant-dev
# Alias: development
```

### 3. Configuration des secrets GCP
```bash
# Service Account Firebase
gcloud secrets create firebase-service-account \
  --data-file=path/to/firebase-service-account.json

# API Keys (optionnel pour démarrage)
echo "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
```

---

## 📦 Déploiement par Environnement

### **Production**

#### Backend (Cloud Run)
```bash
# Build et déploiement automatique via Cloud Build
gcloud builds submit --config=infra/cloudrun/cloudbuild.yaml

# Ou déploiement manuel
docker build -f infra/cloudrun/Dockerfile -t gcr.io/silyontech-assistant-prod/api .
docker push gcr.io/silyontech-assistant-prod/api
gcloud run deploy silyontech-assistant-api \
  --image gcr.io/silyontech-assistant-prod/api \
  --region europe-west1 \
  --allow-unauthenticated
```

#### Frontend (Firebase Hosting)
```bash
# Build des applications
pnpm build

# Déploiement Firebase
firebase use production
firebase deploy --only hosting
```

#### Widget (Vercel)
```bash
# Dans le dossier packages/widget
cd packages/widget
vercel --prod
vercel alias set widget-xxx.vercel.app cdn.silyontech.com
```

### **Development**

#### Backend
```bash
gcloud config set project silyontech-assistant-dev
# Même procédure avec le projet dev
```

#### Frontend
```bash
firebase use development
firebase deploy --only hosting
```

---

## 🌐 Configuration DNS

### Enregistrements requis
```dns
# Sous-domaines à configurer dans votre registrar
api.silyontech.com      CNAME   ghs.googlehosted.com
admin.silyontech.com    CNAME   silyontech-assistant-prod.web.app
docs.silyontech.com     CNAME   silyontech-assistant-prod.web.app  
cdn.silyontech.com      CNAME   cname.vercel-dns.com
```

### Certificats SSL
- **Firebase Hosting** : Automatique
- **Cloud Run** : Automatique avec domaine personnalisé
- **Vercel** : Automatique

---

## 🔧 Variables d'Environnement

### Production
```env
# Cloud Run
NODE_ENV=production
GCP_PROJECT_ID=silyontech-assistant-prod
FIREBASE_PROJECT_ID=silyontech-assistant-prod
VERTEX_AI_LOCATION=europe-west1
GEMINI_MODEL=gemini-1.5-flash

# Firebase Hosting
VITE_API_BASE_URL=https://api.silyontech.com
VITE_ENVIRONMENT=production

# Vercel
NEXT_PUBLIC_API_URL=https://api.silyontech.com
NEXT_PUBLIC_CDN_URL=https://cdn.silyontech.com
```

---

## 📊 Monitoring et Logs

### Cloud Monitoring
```bash
# Création d'alertes
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/api-latency-alert.yaml

# Dashboard custom
gcloud alpha monitoring dashboards create \
  --config-from-file=monitoring/dashboard.json
```

### Firebase Analytics
- Activé automatiquement avec le déploiement
- Dashboard disponible dans Console Firebase

### Vercel Analytics
- Activé dans le dashboard Vercel
- Métriques de performance CDN

---

## 🔐 Sécurité

### IAM Roles
```bash
# Service account pour Cloud Run
gcloud iam service-accounts create silyontech-assistant-api

# Permissions minimales
gcloud projects add-iam-policy-binding silyontech-assistant-prod \
  --member="serviceAccount:silyontech-assistant-api@silyontech-assistant-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Firestore Security
- Règles multi-tenant déjà configurées
- Isolation par `tenantId`
- Validation des données automatique

---

## 🚀 CI/CD

### GitHub Actions
```yaml
# Workflow automatique déjà configuré
# Déclenché sur push vers main
# Deploy: API → Frontend → Widget
```

### Environnements
- **Development** : Push vers `develop`
- **Staging** : Pull Request vers `main`
- **Production** : Merge vers `main`

---

## ✅ Checklist de Déploiement

### Pré-déploiement
- [ ] Scripts d'infrastructure exécutés
- [ ] Secrets configurés dans GCP Secret Manager
- [ ] DNS configuré pour tous les sous-domaines
- [ ] Firebase projects configurés

### Déploiement
- [ ] API déployée sur Cloud Run
- [ ] Frontend déployé sur Firebase Hosting
- [ ] Widget déployé sur Vercel CDN
- [ ] Tests end-to-end en production

### Post-déploiement
- [ ] Monitoring activé et alertes configurées
- [ ] Tests de performance validés
- [ ] Documentation mise à jour
- [ ] Équipe formée sur l'admin console

---

## 🆘 Dépannage

### Erreurs communes
```bash
# Permissions insuffisantes
gcloud auth application-default login

# Firebase déploiement échoué
firebase deploy --debug

# Cloud Run timeout
gcloud run services update silyontech-assistant-api \
  --timeout=300 --memory=2Gi
```

### Logs
```bash
# Cloud Run
gcloud logs read "resource.type=cloud_run_revision"

# Firebase Functions
firebase functions:log

# Vercel
vercel logs
```

---

**Infrastructure prête pour le déploiement ! 🎉**