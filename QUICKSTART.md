# 🚀 Guide de Démarrage Rapide - Magic Button

## Installation en 5 minutes

### Prérequis
- Node.js 18+
- Compte GCP avec facturation activée
- gcloud CLI installé
- Git

### 1. Clone et setup
```bash
git clone <your-repo-url>
cd magic-button
cp .env.example .env
# Éditer .env avec vos valeurs GCP
```

### 2. Bootstrap GCP (automatique)
```bash
./scripts/bootstrap-gcp.sh
```

### 3. Développement local
```bash
./scripts/dev-start.sh
```

### 4. Installation extension Chrome
1. Ouvrir `chrome://extensions/`
2. Activer "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `extension/dist`

### 5. Test
1. Aller sur n'importe quelle page web
2. Sélectionner du texte
3. Cliquer sur l'icône Magic Button
4. Choisir une action (Corriger, Résumer, etc.)

## Commandes utiles

```bash
# Développement
npm run dev                 # Lance tous les services
npm run build              # Build complet
npm run test               # Tous les tests

# Déploiement
npm run deploy:backend     # Déploie sur Cloud Run
npm run deploy:infra       # Applique Terraform

# Maintenance
npm run lint               # Vérification code
npm run type-check         # Vérification TypeScript
npm run clean              # Nettoyage complet
```

## Architecture rapide

```
Chrome Extension → Cloud Run API → Vertex AI (Gemini)
                     ↓
                 Firestore + Cloud Storage
```

## Dépannage

### Extension ne se charge pas
- Vérifier que `extension/dist` existe
- Relancer `npm run build:extension`
- Vérifier les erreurs dans Chrome DevTools

### API backend ne répond pas
- Vérifier `.env` (PROJECT_ID, HMAC_SECRET)
- Vérifier les logs : `tail -f .dev/backend.log`
- Test health check : `curl http://localhost:8080/health`

### Erreurs Vertex AI
- Vérifier que l'API Vertex AI est activée
- Vérifier les permissions du Service Account
- Vérifier la région (us-central1 pour Vertex AI)

### Erreurs de déploiement
- Vérifier `gcloud auth list`
- Vérifier `gcloud config get-value project`
- Vérifier les quotas GCP

## Support

- 📖 Documentation complète : `docs/`
- 🏗️ Architecture : `docs/architecture.md`
- 🧠 Guide Vertex AI : `docs/vertexai-guide.md`
- 📝 Journal apprentissage : `docs/heurrodaga-log.md`
- 🎬 Script démo : `docs/demo-script.md`

---

**Next Steps** : Une fois le MVP fonctionnel, consultez le plan pédagogique pour implémenter le module RAG complet (Jour 4).