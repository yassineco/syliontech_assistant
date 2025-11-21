#!/bin/bash

echo ""
echo "================================================"
echo "   DÉMO ASSISTANT SOFINCO"
echo "   Lancement en cours..."
echo "================================================"
echo ""

# Chercher Python
if command -v python3 &> /dev/null; then
    echo "[OK] Python3 trouvé"
    echo ""
    echo "Démo disponible sur: http://localhost:8000"
    echo ""
    echo "Appuyez sur CTRL+C pour arrêter le serveur"
    echo ""
    
    # Ouvrir le navigateur après 2 secondes
    (sleep 2 && xdg-open http://localhost:8000 2>/dev/null || open http://localhost:8000 2>/dev/null) &
    
    # Lancer le serveur
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "[OK] Python trouvé"
    echo ""
    echo "Démo disponible sur: http://localhost:8000"
    echo ""
    echo "Appuyez sur CTRL+C pour arrêter le serveur"
    echo ""
    
    # Ouvrir le navigateur après 2 secondes
    (sleep 2 && xdg-open http://localhost:8000 2>/dev/null || open http://localhost:8000 2>/dev/null) &
    
    # Lancer le serveur
    python -m http.server 8000
else
    echo "[ERREUR] Python n'est pas installé"
    echo ""
    echo "Veuillez installer Python depuis: https://www.python.org/downloads/"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
fi
