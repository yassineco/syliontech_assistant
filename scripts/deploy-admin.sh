#!/bin/bash

# Script de déploiement SylionTech Admin Console
# Usage: ./deploy-admin.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "🚀 Déploiement Admin Console - Environnement: $ENVIRONMENT"

# 1. Vérification des prérequis
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI non installé. Installez avec: npm install -g firebase-tools"
    exit 1
fi

if ! firebase projects:list | grep -q syliontech-assistant; then
    echo "❌ Projet Firebase non configuré. Lancez: firebase login && firebase use --add"
    exit 1
fi

# 2. Build de l'Admin Console
echo "📦 Build de l'Admin Console..."
cd apps/admin

# Installation des dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📥 Installation des dépendances..."
    npm install
fi

# Build Next.js
echo "🔨 Compilation Next.js..."
npm run build
npm run export

cd ../..

# 3. Vérification du build
if [ ! -d "apps/admin/out" ]; then
    echo "❌ Build failed - dossier out/ non trouvé"
    exit 1
fi

# 4. Déploiement Firebase
echo "☁️ Déploiement sur Firebase..."

case $ENVIRONMENT in
    "prod")
        firebase use syliontech-assistant
        firebase deploy --only hosting:admin
        echo "✅ Déployé sur: https://admin.syliontech.com"
        ;;
    "staging")
        firebase use syliontech-assistant-staging
        firebase deploy --only hosting:admin
        echo "✅ Déployé sur: https://staging-admin.syliontech.com"
        ;;
    "dev")
        firebase use syliontech-assistant-dev
        firebase deploy --only hosting:admin
        echo "✅ Déployé sur: https://dev-admin.syliontech.com"
        ;;
    *)
        echo "❌ Environnement non reconnu: $ENVIRONMENT"
        echo "Usage: ./deploy-admin.sh [dev|staging|prod]"
        exit 1
        ;;
esac

echo "🎉 Déploiement terminé avec succès!"