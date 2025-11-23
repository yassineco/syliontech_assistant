# ✅ Checklist Firebase SylionTech SaaS

## 🔧 Configuration initiale
- [ ] Projet Firebase créé (syliontech-assistant)
- [ ] Services activés (Firestore, Hosting, Storage, Auth)
- [ ] Environnements configurés (.firebaserc)
- [ ] Règles de sécurité déployées (firestore.rules)

## 🔐 Firebase Auth
- [ ] Email/Password activé
- [ ] Admin users créés (admin@syliontech.com)
- [ ] Domaines autorisés configurés
- [ ] Test de connexion admin réussi

## 💾 Firestore
- [ ] Structure multi-tenant créée
- [ ] Collections tenants/ configurées
- [ ] Règles de sécurité testées
- [ ] Index créés pour les requêtes

## 🌐 Firebase Hosting
- [ ] Build Next.js réussi (apps/admin/out)
- [ ] Déploiement admin.syliontech.com
- [ ] HTTPS et domaine custom configurés
- [ ] Redirection SPA (/**/index.html) fonctionnelle

## 🧪 Tests fonctionnels

### Test Firebase Backend
```bash
# Test de connexion Firestore
cd apps/server
npm test test-firebase.js
```

### Test Admin Console
```bash
# Test build et déploiement
cd apps/admin
npm run build
npm run export
firebase deploy --only hosting:admin
```

### Test upload RAG
```bash
# Test upload document
curl -X POST "http://localhost:3001/admin/tenants/test/rag/upload" \
  -F "file=@test-doc.pdf"

# Vérification Firestore
# → Document visible dans tenants/test/ragDocuments/
```

### Test Admin Console complet
- [ ] Connexion admin réussie
- [ ] Liste des tenants chargée
- [ ] Upload document RAG fonctionnel
- [ ] Édition prompt système
- [ ] Test RAG en temps réel

## 🚀 Déploiement production
- [ ] Variables d'environnement configurées
- [ ] Script deploy-admin.sh testé
- [ ] Monitoring et logs configurés
- [ ] Backup Firestore activé

## 🔒 Sécurité
- [ ] Pas de clés API exposées côté client
- [ ] Isolation tenants validée
- [ ] CORS configuré correctement
- [ ] Règles Firestore restrictives

## ⚡ Performance
- [ ] Index Firestore optimisés
- [ ] CDN Firebase Hosting
- [ ] Build Next.js optimisé
- [ ] Lazy loading des composants

## 📊 Architecture finale

```
SylionTech SaaS
├── Firebase Hosting (admin.syliontech.com)
│   └── Admin Console Next.js
├── Firebase Firestore
│   ├── tenants/{id}/ragDocuments/
│   ├── tenants/{id}/settings/
│   └── adminUsers/
├── Firebase Auth (admins uniquement)
├── Cloud Run Backend (API /v1/chat)
└── Client Widget (pas de Firebase)
```

## 🎯 Points cruciaux
✅ **Clients n'utilisent JAMAIS Firebase**
✅ **Une seule configuration Firebase pour tout le SaaS**
✅ **Multi-tenant complet avec isolation des données**
✅ **Admin Console déployée et sécurisée**
✅ **Backend RAG connecté à Firebase**