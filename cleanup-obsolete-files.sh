#!/bin/bash

echo "🧹 Nettoyage des fichiers obsolètes - Magic Button Project"
echo "========================================================="

# Créer un dossier archive
mkdir -p .archive/old-reports
mkdir -p .archive/test-files
mkdir -p .archive/sessions

echo ""
echo "📦 Archivage des anciens rapports..."
mv ACTIVATION_VERTEX_AI.md .archive/old-reports/ 2>/dev/null
mv INDEX_RAPPORTS.md .archive/old-reports/ 2>/dev/null
mv PROJECT_SUMMARY.md .archive/old-reports/ 2>/dev/null
mv PROJET_FINAL.md .archive/old-reports/ 2>/dev/null
mv RAPPORT_CONSOLIDE_25OCT2025.md .archive/old-reports/ 2>/dev/null
mv README-old.md .archive/old-reports/ 2>/dev/null
mv RESUME_FINAL.md .archive/old-reports/ 2>/dev/null
mv SOLUTION_DEFINITIVE.md .archive/old-reports/ 2>/dev/null
mv STATUS_VERTEX_AI.md .archive/old-reports/ 2>/dev/null
mv URGENT_FIX.md .archive/old-reports/ 2>/dev/null

echo "📦 Archivage des fichiers de test temporaires..."
mv debug-extension.html .archive/test-files/ 2>/dev/null
mv test-extension.html .archive/test-files/ 2>/dev/null
mv test-page.html .archive/test-files/ 2>/dev/null
mv test-vertex-ai.sh .archive/test-files/ 2>/dev/null
mv check-deployment.sh .archive/test-files/ 2>/dev/null

echo "📦 Archivage des rapports de sessions redondants..."
mv reports/2025-10-27_rag_configuration.md .archive/sessions/ 2>/dev/null
mv reports/MAGIC_BUTTON_CONSOLIDATED_REPORT.md .archive/sessions/ 2>/dev/null
mv reports/sessions/*.md .archive/sessions/ 2>/dev/null

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "📊 Statistiques :"
echo "  - Rapports archivés : $(ls -1 .archive/old-reports/ 2>/dev/null | wc -l)"
echo "  - Tests archivés : $(ls -1 .archive/test-files/ 2>/dev/null | wc -l)"
echo "  - Sessions archivées : $(ls -1 .archive/sessions/ 2>/dev/null | wc -l)"
echo ""
echo "📁 Fichiers archivés dans : .archive/"
echo "💡 Pour supprimer définitivement : rm -rf .archive/"
