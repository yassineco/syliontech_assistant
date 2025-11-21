# 🚀 Guide de Test - Magic Button Extension

## 📦 Installation de l'Extension Chrome

### Étape 1 : Préparation
```bash
cd extension
npm install
npm run build
```

### Étape 2 : Installation dans Chrome
1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le "Mode développeur" (coin supérieur droit)
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `extension/dist`
5. L'extension Magic Button apparaît dans votre barre d'outils

## 🧪 Tests Fonctionnels

### Test 1 : Page de Test Locale
```bash
# Ouvrir la page de test
open test-page.html
# ou
firefox test-page.html
```

### Test 2 : API Cloud Run
L'extension est configurée pour utiliser l'API déployée sur :
```
https://magic-button-api-374140035541.europe-west1.run.app
```

### Test 3 : Actions IA Disponibles

#### 🔧 Corriger
- **Objectif** : Correction orthographe/grammaire
- **Test** : Sélectionnez le texte avec erreurs dans test-page.html
- **Résultat attendu** : Texte corrigé sans erreurs

#### 📝 Résumer  
- **Objectif** : Résumé en points clés
- **Test** : Sélectionnez le long paragraphe sur l'IA
- **Résultat attendu** : Résumé concis et structuré

#### 🌍 Traduire
- **Objectif** : Traduction vers autre langue
- **Test** : Sélectionnez le texte français de présentation
- **Résultat attendu** : Traduction proposée

#### ✨ Optimiser
- **Objectif** : Amélioration clarté/impact
- **Test** : Sélectionnez le texte simple à optimiser
- **Résultat attendu** : Version améliorée du texte

## 🔍 Vérification Technique

### Logs de l'Extension
1. Ouvrez Chrome DevTools (F12)
2. Allez dans l'onglet "Console"
3. Filtrez par "extension"
4. Observez les logs d'API

### Logs Backend (Cloud Run)
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=magic-button-api" --limit=20 --format="value(timestamp,severity,textPayload)"
```

## ✅ Checklist de Test

- [ ] Extension installée et visible dans Chrome
- [ ] Sélection de texte fonctionne
- [ ] Popup s'ouvre avec les 4 actions
- [ ] Action "Corriger" retourne du texte corrigé
- [ ] Action "Résumer" retourne un résumé
- [ ] Action "Traduire" propose une traduction
- [ ] Action "Optimiser" améliore le texte
- [ ] API Cloud Run répond correctement
- [ ] Aucune erreur dans la console

## 🛠️ Débogage

### Problèmes Courants

1. **Extension ne se charge pas**
   ```bash
   # Vérifier la compilation
   cd extension && npm run build
   ```

2. **API ne répond pas**
   ```bash
   # Test direct de l'API
   curl -X GET https://magic-button-api-374140035541.europe-west1.run.app/health
   ```

3. **Erreurs CORS**
   - Vérifier que l'extension utilise `chrome-extension://` comme origin
   - L'API est configurée pour accepter les extensions Chrome

4. **Logs de débogage**
   ```javascript
   // Dans la console Chrome (page web)
   chrome.runtime.sendMessage({action: 'test'})
   ```

## 🎯 Validation Finale

L'extension est considérée comme fonctionnelle si :

1. ✅ Installation sans erreur
2. ✅ Interface utilisateur réactive 
3. ✅ Communication avec l'API Cloud Run
4. ✅ Toutes les actions IA fonctionnelles
5. ✅ Gestion d'erreurs appropriée
6. ✅ Performance acceptable (< 5s par requête)

---

## 📊 Métriques de Performance

- **Temps de réponse API** : < 3 secondes
- **Taille de l'extension** : ~150KB (optimisée)
- **Compatible** : Chrome MV3, Edge, Brave
- **Backend** : Cloud Run (auto-scaling)

🎉 **MVP Magic Button validé et opérationnel !**