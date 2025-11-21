# 🎓 Plan Pédagogique Magic Button

## Vue d'ensemble de la formation

Ce projet Magic Button est conçu comme un parcours d'apprentissage complet pour maîtriser l'écosystème Google Cloud Platform appliqué à l'intelligence artificielle, avec un focus sur Vertex AI et l'architecture serverless.

## 🎯 Objectifs d'apprentissage

### Compétences techniques visées

#### 1. Architecture Cloud-Native GCP
- ✅ **Conception serverless** : Cloud Run, gestion auto-scaling
- ✅ **Services managés** : Vertex AI, Firestore, Cloud Storage
- ✅ **Sécurité enterprise** : IAM, Service Accounts, Secret Manager
- ✅ **Infrastructure as Code** : Terraform pour reproductibilité

#### 2. Intelligence Artificielle avec Vertex AI
- ✅ **API Gemini** : Text generation, paramètres avancés
- ✅ **Embeddings** : Représentation vectorielle, recherche sémantique
- ✅ **RAG (Retrieval Augmented Generation)** : Pipeline complet
- ✅ **Optimisation prompts** : Techniques de prompt engineering

#### 3. Développement Full-Stack moderne
- ✅ **Extension Chrome MV3** : Manifest V3, Service Workers
- ✅ **API Backend** : Node.js/TypeScript, Fastify, architecture REST
- ✅ **Frontend React** : Hooks, composants modernes, TypeScript
- ✅ **Base de données NoSQL** : Firestore, modélisation documents

#### 4. DevOps et automatisation
- ✅ **CI/CD** : GitHub Actions, déploiement automatisé
- ✅ **Tests** : Jest, Playwright, couverture de code
- ✅ **Qualité code** : ESLint, Prettier, conventions
- ✅ **Monitoring** : Logs structurés, métriques GCP

## 📚 Ressources d'apprentissage

### Documentation officielle GCP
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Chrome Extensions MV3](https://developer.chrome.com/docs/extensions/mv3/)

### Guides spécialisés
- [Vertex AI Gemini API Guide](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Text Embeddings API](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings)
- [RAG with Vertex AI](https://cloud.google.com/vertex-ai/docs/generative-ai/rag-overview)

### Formations complémentaires
- [Google Cloud Skills Boost](https://www.cloudskillsboost.google/)
- [Vertex AI Learning Path](https://www.cloudskillsboost.google/paths/183)

## 🗓️ Programme HeurroDaga (5 jours)

### Jour 1 : Infrastructure et Bootstrap
**Objectifs** : Maîtriser le setup GCP et l'infrastructure de base

#### Matin (4h)
- **09h00-10h30** : Setup projet et configuration GCP
  - Activation APIs (Vertex AI, Firestore, Cloud Storage)
  - Création Service Account et permissions IAM
  - Configuration gcloud CLI et authentification
- **10h45-12h15** : Infrastructure as Code avec Terraform
  - Écriture main.tf pour tous les services
  - Déploiement infrastructure complète
  - Validation connectivity entre services

#### Après-midi (4h)
- **13h30-15h00** : Scripts d'automatisation
  - Script bootstrap-gcp.sh pour setup complet
  - Configuration .env et variables d'environnement
  - Documentation setup dans README
- **15h15-16h45** : DevContainer et environnement de dev
  - Configuration VS Code avec extensions GCP
  - Setup debugging pour Node.js et Chrome extension
  - Premier déploiement test sur Cloud Run

**Livrables J1** :
- ✅ Infrastructure GCP opérationnelle
- ✅ Scripts d'automatisation
- ✅ Documentation setup
- ✅ Environnement de développement configuré

### Jour 2 : Backend API et Vertex AI
**Objectifs** : Développer l'API backend avec intégration Vertex AI

#### Matin (4h)
- **09h00-10h30** : Architecture backend Fastify
  - Setup TypeScript, structure du projet
  - Configuration logging avec Pino
  - Middleware de sécurité HMAC
- **10h45-12h15** : Client Vertex AI et premiers appels
  - SDK @google-cloud/vertexai
  - Endpoint /api/genai/action
  - Tests unitaires avec Jest

#### Après-midi (4h)
- **13h30-15h00** : Implémentation actions IA
  - Prompts pour corriger, résumer, traduire
  - Gestion des erreurs et timeouts
  - Validation des réponses Gemini
- **15h15-16h45** : Déploiement et tests
  - Dockerfile optimisé pour production
  - Déploiement Cloud Run avec secrets
  - Tests d'intégration API

**Livrables J2** :
- ✅ API backend fonctionnelle
- ✅ Intégration Vertex AI Gemini
- ✅ Tests unitaires >80% coverage
- ✅ Déploiement Cloud Run

### Jour 3 : Extension Chrome et Interface
**Objectifs** : Créer l'extension Chrome avec interface React moderne

#### Matin (4h)
- **09h00-10h30** : Setup extension Chrome MV3
  - Manifest.json, permissions, content scripts
  - Architecture React avec Vite
  - Configuration TypeScript et Tailwind CSS
- **10h45-12h15** : Composants React principaux
  - Popup.tsx avec design moderne
  - ActionPanel.tsx pour boutons IA
  - ResultView.tsx pour affichage résultats

#### Après-midi (4h)
- **13h30-15h00** : Logique métier extension
  - Hook useGenAI pour appels API
  - Gestion cache IndexedDB
  - Signature HMAC côté client
- **15h15-16h45** : Intégration et tests
  - Connection API backend
  - Tests fonctionnels avec Playwright
  - Build et packaging extension

**Livrables J3** :
- ✅ Extension Chrome fonctionnelle
- ✅ Interface utilisateur moderne
- ✅ Intégration API complète
- ✅ Tests end-to-end

### Jour 4 : Module RAG et base de connaissance
**Objectifs** : Implémenter le système RAG complet avec embeddings

#### Matin (4h)
- **09h00-10h30** : Upload et stockage documents
  - Endpoint /api/knowledge/upload
  - Intégration Cloud Storage
  - Parsing PDF/TXT et extraction texte
- **10h45-12h15** : Pipeline embeddings
  - Appels Vertex AI Text Embeddings API
  - Chunking intelligent des documents
  - Stockage vecteurs dans Firestore

#### Après-midi (4h)
- **13h30-15h00** : Recherche vectorielle
  - Algorithme similarité cosinus
  - Endpoint /api/knowledge/query
  - Contextualization des prompts
- **15h15-16h45** : Interface RAG dans extension
  - Upload UI pour documents
  - Search UI pour questions
  - Historique des conversations

**Livrables J4** :
- ✅ Pipeline RAG complet
- ✅ Recherche vectorielle opérationnelle
- ✅ Interface upload/search
- ✅ Base de connaissance fonctionnelle

### Jour 5 : Finalisation et documentation
**Objectifs** : CI/CD, documentation et préparation démo

#### Matin (4h)
- **09h00-10h30** : CI/CD GitHub Actions
  - Pipeline build/test/deploy
  - Tests automatisés sur PR
  - Déploiement automatique Cloud Run
- **10h45-12h15** : Monitoring et observabilité
  - Logs structurés avec Pino
  - Métriques Cloud Run
  - Alerting sur erreurs

#### Après-midi (4h)
- **13h30-15h00** : Documentation finale
  - README professionnel avec captures
  - Guide Vertex AI détaillé
  - Rapport d'apprentissage hebdomadaire
- **15h15-16h45** : Préparation démo
  - Script de démonstration
  - Dataset de test pour RAG
  - Présentation pour tuteur

**Livrables J5** :
- ✅ CI/CD fonctionnelle
- ✅ Documentation complète
- ✅ Démo préparée
- ✅ Projet production-ready

## 📊 Métriques de réussite

### Critères techniques
- ✅ **Fonctionnalités** : Toutes les features spécifiées fonctionnent
- ✅ **Performance** : API répond en <2s, extension réactive
- ✅ **Qualité code** : Coverage >80%, lint passing, TypeScript strict
- ✅ **Sécurité** : HMAC auth, IAM proper, secrets management
- ✅ **Déploiement** : CI/CD automatisé, infrastructure reproductible

### Critères pédagogiques
- ✅ **Compréhension** : Peut expliquer chaque service GCP utilisé
- ✅ **Autonomie** : Capable de debug et résoudre problèmes
- ✅ **Documentation** : README et docs de qualité professionnelle
- ✅ **Présentation** : Démo fluide et convaincante

## 🎨 Bonus pour portfolio

### Fonctionnalités supplémentaires
- **Mode offline** : Cache intelligent pour les 10 dernières réponses
- **Multilingue** : Support FR/EN dans l'interface
- **Analytics** : Tracking usage anonyme avec Google Analytics
- **Export** : Sauvegarde conversations en PDF/JSON

### Aspects techniques avancés
- **Streaming responses** : Réponses IA en temps réel
- **Fine-tuning** : Entraînement modèle Vertex AI custom
- **Vector database** : Migration vers Pinecone ou Weaviate
- **Edge functions** : Déploiement sur Cloudflare Workers

## 📝 Livrables pédagogiques

### Documentation technique
1. **README.md** : Guide complet d'installation et utilisation
2. **architecture.md** : Diagrammes et explications techniques
3. **vertexai-guide.md** : Guide pratique Vertex AI avec exemples
4. **decisions.md** : Justifications des choix techniques

### Journal d'apprentissage
1. **heurrodaga-log.md** : Journal quotidien détaillé
2. **weekly-report.md** : Rapport de progression hebdomadaire
3. **lessons-learned.md** : Retour d'expérience et apprentissages

### Démo et présentation
1. **demo-script.md** : Script de démonstration structuré
2. **presentation.md** : Slides pour présentation tuteur
3. **video-demo.mp4** : Capture vidéo de la démo

Cette formation représente **40 heures** d'apprentissage intensif couvrant l'ensemble de l'écosystème GCP pour l'IA, avec un projet concret et déployable en production.