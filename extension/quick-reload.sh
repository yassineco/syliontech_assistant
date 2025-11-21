#!/bin/bash

echo "🔄 Magic Button Extension - Rechargement Rapide"
echo "================================================"

# Build l'extension
echo "📦 Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Extension rechargée et prête à tester !"
    echo ""
    echo "📋 Instructions pour recharger dans Chrome:"
    echo "1. Aller à chrome://extensions/"
    echo "2. Cliquer sur 🔄 à côté de 'Magic Button'"
    echo "3. Rafraîchir la page de test"
    echo ""
    echo "🆕 Nouvelles fonctionnalités UX:"
    echo "• ✨ Bouton flottant persistant (coin supérieur droit)"
    echo "• 🎛️ Interface rétractable avec contrôles on/off"
    echo "• 💾 Sauvegarde automatique de l'état"
    echo "• 📱 Design responsive et accessible"
    echo "• 🎨 Animations fluides et feedback visuel"
    echo ""
    echo "🧪 Test recommandé:"
    echo "1. Sélectionner du texte sur une page"
    echo "2. Cliquer sur le bouton flottant ✨"
    echo "3. Tester les actions: Corriger, Résumer, Traduire, Optimiser"
    echo "4. Utiliser le bouton ⚡/💤 pour activer/désactiver"
    echo "5. Utiliser le bouton × pour réduire l'interface"
else
    echo "❌ Build failed!"
    exit 1
fi