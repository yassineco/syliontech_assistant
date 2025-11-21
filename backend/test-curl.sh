#!/bin/bash

echo "🔍 Test direct de l'API de traduction avec logs détaillés"
echo "----------------------------------------"

curl -X POST http://localhost:8080/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "action": "translate",
    "text": "Cette indication, forte en sens, est révélatrice de l'\''attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'\''installation d'\''un plus grand nombre de personnes.",
    "options": {
      "targetLanguage": "English"
    }
  }' \
  --verbose \
  --connect-timeout 30 \
  --max-time 60

echo ""
echo "✅ Test terminé - Vérifiez les logs du serveur pour les détails"