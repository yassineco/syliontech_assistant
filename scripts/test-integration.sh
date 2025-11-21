#!/bin/bash

echo "=== Test d'intégration SylionTech Assistant ==="
echo

# Attendre que le serveur soit prêt
echo "🔍 Vérification du backend..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend prêt"
        break
    fi
    echo "⏳ Tentative $i/10..."
    sleep 1
done

echo
echo "🧪 Test API Health Check:"
curl -s http://localhost:3001/health | python3 -m json.tool

echo
echo "🧪 Test API Info:"
curl -s http://localhost:3001/info | python3 -m json.tool

echo
echo "🧪 Test Simulation de crédit:"
curl -s -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session-123" \
  -d '{
    "amount": 15000,
    "duration": 48,
    "downPayment": 0,
    "income": 3000,
    "employment": "salarie"
  }' | python3 -m json.tool

echo
echo "🧪 Test Assistant IA (mode mock):"
curl -s -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session-123" \
  -d '{
    "sessionId": "test-session-123",
    "message": "Bonjour, je voudrais un crédit de 20000 euros"
  }' | python3 -m json.tool

echo
echo "✅ Tests d'intégration terminés"