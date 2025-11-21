#!/bin/bash

# Script de test de l'assistant avec RAG

echo "🚀 Démarrage du serveur backend..."
cd /media/yassine/IA/Projects/SylionTech/syliontech_assistant/apps/server

# Démarrer le serveur en arrière-plan
npm run dev > /tmp/sofinco-server.log 2>&1 &
SERVER_PID=$!

echo "⏳ Attente du démarrage du serveur (10 secondes)..."
sleep 10

# Vérifier que le serveur est démarré
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Erreur: Le serveur n'a pas démarré correctement"
    echo "📋 Logs:"
    tail -20 /tmp/sofinco-server.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Serveur démarré avec succès"
echo ""

# Test 1: Health check
echo "========================================="
echo "🧪 TEST 1: Health Check"
echo "========================================="
curl -s http://localhost:3001/health | python3 -m json.tool
echo ""

# Test 2: Statut RAG
echo "========================================="
echo "🧪 TEST 2: Statut de l'index RAG"
echo "========================================="
curl -s http://localhost:3001/api/rag/status | python3 -m json.tool
echo ""

# Test 3: Question FAQ (devrait utiliser RAG)
echo "========================================="
echo "🧪 TEST 3: Question FAQ → RAG"
echo "Question: 'Quelles sont les conditions pour obtenir un crédit ?'"
echo "========================================="
curl -s -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-rag-001",
    "message": "Quelles sont les conditions pour obtenir un crédit ?"
  }' | python3 -m json.tool
echo ""

# Test 4: Demande de simulation (devrait utiliser les services existants)
echo "========================================="
echo "🧪 TEST 4: Demande de simulation → Services"
echo "Question: 'Je voudrais simuler un crédit de 15000 euros'"
echo "========================================="
curl -s -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-rag-002",
    "message": "Je voudrais simuler un crédit de 15000 euros"
  }' | python3 -m json.tool
echo ""

# Test 5: Requête RAG directe
echo "========================================="
echo "🧪 TEST 5: Requête RAG directe"
echo "Query: 'prêt auto conditions'"
echo "========================================="
curl -s -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "q": "prêt auto conditions",
    "topK": 3
  }' | python3 -m json.tool
echo ""

echo "========================================="
echo "✅ Tests terminés"
echo "========================================="

# Arrêter le serveur
echo "🛑 Arrêt du serveur..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Script de test terminé"
