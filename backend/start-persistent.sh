#!/bin/bash
cd /media/yassine/IA/Projects/konecta/magic_button_formation/backend
echo "🚀 Démarrage du serveur Magic Button en mode PERSISTANT"
echo "📁 Répertoire: $(pwd)"
echo "🔧 Configuration: Mode Production avec Vertex AI et Firestore"
echo ""
npx tsx src/server-simple.ts