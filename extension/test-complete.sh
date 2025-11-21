#!/bin/bash

echo "🧪 TEST COMPLET - Magic Button Extension"
echo "======================================="
echo ""

# Test 1: Vérification API
echo "📡 TEST 1/4 - API de Production"
echo "Testage de l'API..."
API_RESPONSE=$(curl -s -w "%{http_code}" https://magic-button-api-374140035541.europe-west1.run.app/health -o /tmp/api_test.json)
if [ "$API_RESPONSE" = "200" ]; then
    echo "   ✅ API répond correctement (200 OK)"
    echo "   📄 Réponse: $(cat /tmp/api_test.json)"
else
    echo "   ❌ API ne répond pas (Code: $API_RESPONSE)"
    exit 1
fi

echo ""

# Test 2: Test traduction
echo "🌍 TEST 2/4 - Endpoint Traduction"
TRANSLATE_RESPONSE=$(curl -s -w "%{http_code}" -X POST https://magic-button-api-374140035541.europe-west1.run.app/api/genai/process \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "action": "traduire",
    "text": "Test de traduction",
    "options": {"targetLanguage": "en"}
  }' -o /tmp/translate_test.json)

if [ "$TRANSLATE_RESPONSE" = "200" ]; then
    echo "   ✅ Endpoint traduction fonctionnel"
    echo "   📄 Résultat: $(cat /tmp/translate_test.json | jq -r '.result' 2>/dev/null || cat /tmp/translate_test.json)"
else
    echo "   ❌ Endpoint traduction échoue (Code: $TRANSLATE_RESPONSE)"
    exit 1
fi

echo ""

# Test 3: Vérification extension compilée
echo "🔧 TEST 3/4 - Extension Compilée"
if [ -f "dist/manifest.json" ]; then
    echo "   ✅ Extension compilée trouvée"
    
    if grep -q "magic-button-api-374140035541.europe-west1.run.app" dist/manifest.json; then
        echo "   ✅ Permissions API de production présentes"
    else
        echo "   ❌ Permissions API de production manquantes"
        exit 1
    fi
    
    if [ -f "dist/background.js" ]; then
        echo "   ✅ Background script compilé"
    else
        echo "   ❌ Background script manquant"
        exit 1
    fi
    
    if [ -f "dist/popup.js" ]; then
        echo "   ✅ Popup script compilé"
    else
        echo "   ❌ Popup script manquant"
        exit 1
    fi
else
    echo "   ❌ Extension non compilée - Exécuter 'npm run build'"
    exit 1
fi

echo ""

# Test 4: Instructions finales
echo "🚀 TEST 4/4 - Instructions Finales"
echo "   Tout est prêt côté technique !"
echo ""
echo "   ACTIONS MANUELLES REQUISES:"
echo "   1. Aller à chrome://extensions/"
echo "   2. SUPPRIMER l'ancienne extension Magic Button"
echo "   3. Cliquer 'Charger l'extension non empaquetée'"
echo "   4. Sélectionner le dossier: $(pwd)/dist/"
echo "   5. Tester la traduction"
echo ""

echo "🎯 POINTS DE CONTRÔLE APRÈS INSTALLATION:"
echo "   - Console background doit montrer: 'API Configuration: https://magic-button-api...'"
echo "   - Test traduction doit afficher le résultat sans erreur"
echo "   - Logs détaillés doivent être visibles"
echo ""

echo "✅ TESTS TECHNIQUES RÉUSSIS - Extension prête pour installation !"

# Cleanup
rm -f /tmp/api_test.json /tmp/translate_test.json