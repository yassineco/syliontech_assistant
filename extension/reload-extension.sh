#!/bin/bash

# 🚀 Script de rechargement de l'extension Magic Button

echo "🔧 RÉSOLUTION DE L'ERREUR 'Failed to fetch'"
echo "=============================================="
echo ""

echo "✅ ÉTAPE 1/4 - Vérification de la compilation"
if [ -f "dist/manifest.json" ]; then
    echo "   ✓ Extension compilée trouvée"
    if grep -q "magic-button-api-374140035541.europe-west1.run.app" dist/manifest.json; then
        echo "   ✓ Permissions API de production configurées"
    else
        echo "   ❌ Permissions API manquantes - Recompiler nécessaire"
        exit 1
    fi
else
    echo "   ❌ Extension non compilée - Exécuter 'npm run build' d'abord"
    exit 1
fi

echo ""
echo "🌐 ÉTAPE 2/4 - Test de l'API de production"
echo "   Test de connectivité..."
if curl -s --connect-timeout 5 https://magic-button-api-374140035541.europe-west1.run.app/health > /dev/null; then
    echo "   ✓ API de production accessible"
else
    echo "   ❌ API de production inaccessible"
    exit 1
fi

echo ""
echo "🔄 ÉTAPE 3/4 - ACTIONS MANUELLES REQUISES"
echo "   VOUS DEVEZ MAINTENANT :"
echo ""
echo "   1. Ouvrir Chrome"
echo "   2. Aller à : chrome://extensions/"
echo "   3. Activer le 'Mode développeur' (toggle en haut à droite)"
echo "   4. Localiser 'Magic Button' dans la liste"
echo "   5. Cliquer sur le bouton ⟳ (rechargement)"
echo ""
echo "   OU SI L'EXTENSION N'EST PAS INSTALLÉE :"
echo "   1. Cliquer 'Charger l'extension non empaquetée'"
echo "   2. Sélectionner le dossier : $(pwd)/dist/"
echo ""

echo "🧪 ÉTAPE 4/4 - Test après rechargement"
echo "   1. Aller sur n'importe quelle page web"
echo "   2. Sélectionner du texte"
echo "   3. Cliquer sur l'icône Magic Button"
echo "   4. Essayer 'Traduire' → L'erreur 'Failed to fetch' devrait disparaître"
echo ""

echo "🔍 DEBUGGING SI L'ERREUR PERSISTE :"
echo "   1. Clic droit sur l'icône Magic Button → 'Inspecter le popup'"
echo "   2. Dans Console, vérifier les logs d'erreur"
echo "   3. Vérifier que l'URL utilisée est bien :"
echo "      https://magic-button-api-374140035541.europe-west1.run.app"
echo ""

echo "✅ L'extension est maintenant prête !"
echo "   Configuration : API de production"
echo "   Status API     : Opérationnelle"
echo "   Permissions    : Configurées"
echo ""