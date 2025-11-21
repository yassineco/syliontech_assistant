#!/bin/bash

echo "=== Test de connectivité API SylionTech Assistant ==="
echo

# Test backend sur port 3001
echo "🔍 Test Backend (port 3001):"
if curl -s -m 5 http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend accessible"
    echo "📊 Health check:"
    curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/health
    echo
    echo "📋 Info API:"
    curl -s http://localhost:3001/info | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/info
else
    echo "❌ Backend non accessible"
fi

echo
echo "🔍 Test Frontend (port 5173):"
if curl -s -m 5 http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend non accessible"
fi

echo
echo "🔍 Processus actifs:"
ps aux | grep -E "(node|tsx|vite)" | grep -v grep

echo
echo "🔍 Ports ouverts:"
ss -tlnp | grep -E "(3001|5173)" || echo "Aucun port trouvé"