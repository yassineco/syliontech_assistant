#!/bin/bash

echo "🚀 DÉPLOIEMENT VERTEX AI - Magic Button Backend"
echo "==============================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier backend"
    exit 1
fi

echo "🔧 Vérification de la configuration..."
if [ ! -f "tsconfig.prod.json" ]; then
    echo "❌ Fichier tsconfig.prod.json manquant"
    exit 1
fi

echo "📦 Compilation TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur de compilation"
    exit 1
fi

echo "✅ Compilation réussie"
echo ""

echo "🌐 Informations de déploiement:"
echo "   - API: https://magic-button-api-374140035541.europe-west1.run.app"
echo "   - Mode: Vertex AI activé (plus de simulation)"
echo "   - Route: /api/genai/process"
echo ""

echo "🚀 Déploiement Cloud Run..."
echo "   Note: Le déploiement se fait automatiquement via CI/CD"
echo "   Le code sera déployé lors du prochain push sur main"
echo ""

echo "🧪 Test local possible avec:"
echo "   npm start"
echo ""

echo "📋 PROCHAINES ÉTAPES:"
echo "   1. Commit et push des changements"
echo "   2. Attendre le déploiement automatique (2-3 minutes)"  
echo "   3. Tester l'extension avec Vertex AI"
echo "   4. Vérifier que 'corriger' utilise maintenant le vrai modèle"
echo ""

echo "✅ Backend prêt pour le déploiement Vertex AI !"