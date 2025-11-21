# 🔧 Guide de Débogage Extension Magic Button

## 🚨 Problème Actuel : Extension plante après Upload/Recherche

### Symptômes
- ✅ Upload fonctionne (document uploadé)
- ❌ Recherche fait planter l'UI (écran blanc ou freeze)
- ❌ Console peut afficher erreur JavaScript

---

## 📋 Solution Implémentée (Niveau Professionnel)

### 1. **Validation Stricte des Données**
```typescript
// Normalisation defensive avec fallbacks multiples
const normalized = (Array.isArray(data.results) ? data.results : []).map((r: any, idx: number) => {
  try {
    const content = r?.document?.content || r?.content || '';
    const similarity = typeof r?.similarity === 'number' ? r.similarity : 0;
    
    return {
      content: String(content),
      similarity: similarity,
      rank: r?.rank || idx + 1,
      document: r?.document || { content }
    };
  } catch (err) {
    console.error('Error normalizing result:', err);
    return { content: '', similarity: 0, rank: idx + 1 };
  }
});
```

### 2. **Logging Complet**
Chaque opération log maintenant :
- `📤 [RAG] Starting upload` - Début upload
- `✅ [RAG] Upload successful` - Upload OK
- `🔍 [RAG] Starting search` - Début recherche
- `🔍 [RAG] Response data` - Données reçues
- `❌ [RAG] Error` - Erreurs capturées

### 3. **Try-Catch Partout**
- Dans `uploadDocument()`
- Dans `searchDocuments()`
- Dans chaque `onClick` handler
- Dans le rendu des résultats (`.map()`)

### 4. **Affichage Défensif**
```typescript
{ragState.searchResults.map((result: any, index: number) => {
  try {
    const content = result?.content || result?.document?.content || '';
    const similarity = result?.similarity || 0;
    const displayContent = String(content).substring(0, 100);
    // ... rendu safe
  } catch (err) {
    return <div>Erreur affichage résultat {index + 1}</div>;
  }
})}
```

---

## 🔍 Procédure de Débogage

### Étape 1 : Recharger l'Extension
```bash
1. Ouvrir Chrome → chrome://extensions/
2. Activer "Mode développeur" (en haut à droite)
3. Trouver "Magic Button"
4. Cliquer sur l'icône ⟳ (Recharger)
```

### Étape 2 : Ouvrir la Console de Debug
```bash
1. Sur chrome://extensions/
2. Trouver "Magic Button"
3. Cliquer "Inspect views" → "popup.html" OU "background page"
4. La console DevTools s'ouvre
```

### Étape 3 : Reproduire le Bug avec Logging
```bash
1. Ouvrir l'extension (cliquer sur l'icône)
2. Aller dans l'onglet "RAG"
3. Sélectionner du texte sur une page
4. Cliquer "Upload Sélection"
5. OBSERVER LA CONSOLE → chercher les logs 📤 [RAG]
6. Taper une requête (ex: "france")
7. Cliquer "Chercher"
8. OBSERVER LA CONSOLE → chercher les logs 🔍 [RAG]
```

### Étape 4 : Analyser les Logs
Vous devriez voir dans la console :

**Upload réussi** :
```
📤 [RAG] Starting upload: selection_1234.txt 500 chars
📤 [RAG] Upload response status: 200
📤 [RAG] Upload response: {"success":true,"documentId":"doc_...
✅ [RAG] Upload successful: doc_1234567890
```

**Recherche réussie** :
```
🔍 [RAG] Starting search for: france
🔍 [RAG] Response status: 200
🔍 [RAG] Response data: {"success":true,"results":[{"similarity":0.42...
🔍 [RAG] Normalized results: 1 items
```

**Si erreur** :
```
❌ [RAG] Upload error: TypeError: Cannot read property 'content' of undefined
❌ [RAG] Search error: NetworkError: Failed to fetch
```

---

## 🐛 Problèmes Fréquents & Solutions

### Problème 1 : "Cannot read property 'content' of undefined"
**Cause** : Format réponse backend inattendu  
**Solution** : Déjà corrigé avec normalisation défensive  
**Vérifier** : Logs `🔍 [RAG] Response data` montrent la structure

### Problème 2 : "Failed to fetch" ou "NetworkError"
**Cause** : API backend injoignable ou CORS  
**Solution** :
```bash
# Test API depuis terminal
curl https://magic-button-api-374140035541.europe-west1.run.app/health

# Si erreur CORS, vérifier backend/src/server.ts :
fastify.register(cors, {
  origin: ['chrome-extension://*'],
  credentials: true
});
```

### Problème 3 : Extension freeze sans erreur console
**Cause** : Boucle infinie dans state update ou re-render  
**Solution** : Vérifier React DevTools (Profiler)  
**Workaround** : Désactiver/réactiver extension

### Problème 4 : "Unexpected end of JSON input"
**Cause** : Réponse API non-JSON (500 error, HTML error page)  
**Solution** :
```typescript
// Déjà implémenté :
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

---

## 📊 Checklist Débogage Professionnel

- [ ] **Console popup ouverte** avant de reproduire le bug
- [ ] **Console background ouverte** aussi (pour voir requêtes réseau)
- [ ] **Onglet Network** ouvert pour voir les appels `/rag/search`
- [ ] **React DevTools** installé (optionnel, utile pour state)
- [ ] **Logs backend** accessible (Cloud Logging si besoin)

### Commandes Utiles

**Test API direct** :
```bash
# Health check
curl https://magic-button-api-374140035541.europe-west1.run.app/health

# Test upload
curl -X POST https://magic-button-api-374140035541.europe-west1.run.app/rag/documents \
  -H 'Content-Type: application/json' \
  -d '{"content":"test","fileName":"test.txt","mimeType":"text/plain"}'

# Test search
curl 'https://magic-button-api-374140035541.europe-west1.run.app/rag/search?q=test&limit=5'
```

**Rebuild extension** :
```bash
cd extension
npm run build
# Puis recharger dans chrome://extensions/
```

**Logs backend** :
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=magic-button-api" \
  --limit=50 --project=magic-button-demo --format="value(timestamp,severity,jsonPayload.msg)"
```

---

## 🎯 Prochaines Étapes si Problème Persiste

### Si l'extension plante toujours :
1. **Copier TOUS les logs** de la console popup + background
2. **Copier la stacktrace** complète de l'erreur
3. **Noter** à quelle étape précise ça plante (Upload OK ? Search click ? Après response ?)
4. **Screenshot** de l'onglet Network (requête `/rag/search`)

### Informations à collecter :
```
- Version Chrome : chrome://version/
- Logs console popup : [copier/coller]
- Logs console background : [copier/coller]
- Requête réseau (Network tab) : Status, Response Headers, Response Body
- État React (si React DevTools) : ragState.searchResults avant/après
```

### Escalade si nécessaire :
- Vérifier si autre utilisateur reproduit (test autre machine)
- Tester en mode incognito (désactive autres extensions)
- Tester version non-minified (build dev : `npm run dev`)

---

## ✅ Améliorations Apportées

### Code Quality
- ✅ Logging professionnel avec préfixes emoji
- ✅ Try-catch sur TOUS les handlers async
- ✅ Validation stricte des données backend
- ✅ Fallbacks multiples (content || document.content || '')
- ✅ Type coercion (String(), typeof checks)
- ✅ Array.isArray() checks avant .map()

### User Experience
- ✅ Messages d'erreur explicites
- ✅ Notifications avec contexte (documentId, nb résultats)
- ✅ Boutons disabled pendant loading
- ✅ Affichage graceful des erreurs de rendu

### Debugging
- ✅ Console logs pour chaque étape
- ✅ JSON stringifié pour inspection
- ✅ Stacktrace préservée (throw error)
- ✅ Index des résultats en cas d'erreur rendu

---

## 🔐 Configuration Requise

### API Backend
```env
URL: https://magic-button-api-374140035541.europe-west1.run.app
CORS: chrome-extension://* allowed
Endpoints:
  - POST /rag/documents
  - GET /rag/search?q=...&limit=5
  - POST /rag/generate
```

### Extension
```json
// manifest.json
"permissions": [
  "activeTab",
  "storage"
],
"host_permissions": [
  "https://magic-button-api-374140035541.europe-west1.run.app/*"
]
```

---

**Version** : 1.0.0  
**Dernière mise à jour** : 27 octobre 2025  
**Révision backend** : magic-button-api-00027-kg5  
**Status** : 🔧 Debug en cours
