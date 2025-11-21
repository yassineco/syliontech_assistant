# ⚖️ Décisions techniques - Magic Button

## Vue d'ensemble

Ce document recense les principales décisions techniques prises pendant le développement de Magic Button, avec les justifications et alternatives considérées.

## Architecture générale

### 1. Architecture serverless avec Cloud Run

**Décision** : Utiliser Cloud Run pour héberger l'API backend  
**Alternatives considérées** : Compute Engine, GKE, App Engine  

**Justifications** :
- ✅ **Scalabilité automatique** : Scale à 0, pas de coûts quand inutilisé
- ✅ **Simplicité opérationnelle** : Pas de gestion infrastructure
- ✅ **Performance** : Démarrage rapide, latence faible
- ✅ **Coût optimisé** : Pay-per-use, idéal pour MVP
- ✅ **Intégration GCP** : Service Account natif, accès direct aux autres services

**Compromis** :
- ❌ Moins de contrôle sur l'infrastructure
- ❌ Cold start possible (mais minimal avec gen2)

### 2. Extension Chrome MV3 plutôt qu'application web

**Décision** : Extension Chrome Manifest V3  
**Alternatives considérées** : Application web, bookmarklet, extension browser générique

**Justifications** :
- ✅ **Intégration native** : Accès direct au contenu des pages
- ✅ **UX optimale** : Sélection de texte et action immédiate
- ✅ **Sécurité** : Sandboxing Chrome, permissions granulaires
- ✅ **Distribution** : Chrome Web Store pour distribution
- ✅ **Performance** : Pas de rechargement de page

**Compromis** :
- ❌ Limité à Chrome (pour l'instant)
- ❌ Complexité MV3 vs MV2

## Stack technologique

### 3. TypeScript pour frontend et backend

**Décision** : TypeScript strict pour tout le code  
**Alternatives considérées** : JavaScript pur, Flow

**Justifications** :
- ✅ **Type safety** : Détection erreurs à la compilation
- ✅ **Refactoring** : Outils IDE avancés
- ✅ **Documentation** : Types servent de documentation
- ✅ **Productivité** : Autocomplétion et IntelliSense
- ✅ **Maintenabilité** : Code plus robuste sur long terme

**Compromis** :
- ❌ Courbe d'apprentissage
- ❌ Compilation supplémentaire

### 4. Fastify plutôt qu'Express pour le backend

**Décision** : Fastify comme framework web  
**Alternatives considérées** : Express, Koa, NestJS, Hapi

**Justifications** :
- ✅ **Performance** : 2-3x plus rapide qu'Express
- ✅ **TypeScript natif** : Support officiel et excellent
- ✅ **Validation** : Schema validation intégrée (JSON Schema)
- ✅ **Plugins** : Écosystème riche et modulaire
- ✅ **Logging** : Pino intégré (structured logging)
- ✅ **Moderne** : Async/await first, pas de callback hell

**Compromis** :
- ❌ Écosystème plus petit qu'Express
- ❌ Moins de ressources/tutorials

### 5. React + Vite pour l'extension frontend

**Décision** : React 18 + Vite + Tailwind CSS  
**Alternatives considérées** : Vue.js, Svelte, Vanilla JS, Webpack

**Justifications** :
- ✅ **Écosystème** : Très large communauté et ressources
- ✅ **Hooks** : Gestion d'état moderne et élégante
- ✅ **Performance Vite** : HMR ultra-rapide, build optimisé
- ✅ **TypeScript** : Support excellent avec Vite
- ✅ **Tailwind** : CSS utilitaire, cohérence design
- ✅ **Chrome Extensions** : Exemples nombreux avec React

**Compromis** :
- ❌ Bundle size plus large que Svelte
- ❌ Complexité pour une extension simple

## Services GCP

### 6. Vertex AI Gemini plutôt qu'OpenAI

**Décision** : Vertex AI Gemini 1.5 Pro  
**Alternatives considérées** : OpenAI GPT-4, Anthropic Claude, Azure OpenAI

**Justifications** :
- ✅ **Intégration GCP** : Authentification native, facturation unifiée
- ✅ **Latence** : Région europe-west1 disponible
- ✅ **Multimodal** : Support texte + images natif
- ✅ **Contexte** : 1M tokens context window
- ✅ **Coût** : Compétitif vs OpenAI
- ✅ **Compliance** : GDPR compliant par défaut

**Compromis** :
- ❌ Écosystème moins mature qu'OpenAI
- ❌ Disponibilité régions limitée

### 7. Firestore pour le stockage NoSQL

**Décision** : Firestore en mode natif  
**Alternatives considérées** : Cloud SQL, BigQuery, MongoDB Atlas, Vector DB spécialisée

**Justifications** :
- ✅ **Serverless** : Pas de gestion serveur
- ✅ **Scalabilité** : Horizontale automatique
- ✅ **Real-time** : Updates temps réel (si besoin futur)
- ✅ **Intégration** : SDK GCP natif
- ✅ **Simplicité** : Requêtes simples pour MVP
- ✅ **Vector search** : Support recherche vectorielle (preview)

**Compromis** :
- ❌ Pas optimisé pour recherche vectorielle à grande échelle
- ❌ Coût peut être élevé avec beaucoup d'opérations

### 8. Cloud Storage pour les fichiers

**Décision** : Cloud Storage pour PDF/TXT  
**Alternatives considérées** : Firestore (stockage direct), Cloud SQL (blobs)

**Justifications** :
- ✅ **Optimisé fichiers** : Conçu pour le stockage de fichiers
- ✅ **Coût** : Très économique pour stockage
- ✅ **Durabilité** : 99.999999999% durability
- ✅ **Intégration** : SDK simple, streaming
- ✅ **Versioning** : Support versioning natif

**Compromis** :
- ❌ Latence accès vs base de données
- ❌ Pas de requêtes complexes sur contenu

## Sécurité

### 9. Authentification HMAC plutôt qu'OAuth

**Décision** : HMAC-SHA256 avec timestamp  
**Alternatives considérées** : OAuth 2.0, JWT, API Keys simples

**Justifications** :
- ✅ **Simplicité** : Pas de flow OAuth complexe pour MVP
- ✅ **Sécurité** : Signature cryptographique forte
- ✅ **Stateless** : Pas de gestion de sessions
- ✅ **Performance** : Validation rapide côté serveur
- ✅ **Replay protection** : Timestamp évite replay attacks

**Compromis** :
- ❌ Pas de gestion utilisateurs individuels
- ❌ Révocation difficile (faut changer clé globale)

### 10. Secret Manager pour les clés

**Décision** : Google Secret Manager  
**Alternatives considérées** : Variables d'environnement, HashiCorp Vault

**Justifications** :
- ✅ **Intégration** : Natif GCP, IAM integration
- ✅ **Sécurité** : Chiffrement au repos et en transit
- ✅ **Audit** : Logs d'accès automatiques
- ✅ **Rotation** : Support rotation automatique
- ✅ **Simplicité** : Pas d'infrastructure supplémentaire

**Compromis** :
- ❌ Coût par secret (minimal mais existant)
- ❌ Latence accès vs env vars

## Développement et déploiement

### 11. GitHub Actions pour CI/CD

**Décision** : GitHub Actions  
**Alternatives considérées** : Cloud Build, GitLab CI, Jenkins

**Justifications** :
- ✅ **Intégration** : Natif GitHub, workflow simple
- ✅ **Gratuit** : 2000 minutes/mois pour projets publics
- ✅ **Marketplace** : Actions prêtes pour GCP
- ✅ **Matrix builds** : Tests multi-environnements
- ✅ **Secrets** : Gestion secrets intégrée

**Compromis** :
- ❌ Moins flexible que Cloud Build pour GCP
- ❌ Dépendance à GitHub

### 12. Jest pour les tests

**Décision** : Jest + Testing Library  
**Alternatives considérées** : Vitest, Mocha+Chai, Playwright Test

**Justifications** :
- ✅ **Écosystème** : Standard de facto React/Node.js
- ✅ **Snapshots** : Tests UI components faciles
- ✅ **Coverage** : Intégré, pas de config supplémentaire
- ✅ **Mocking** : Powerful mocking capabilities
- ✅ **Watch mode** : Feedback immédiat pendant dev

**Compromis** :
- ❌ Plus lent que Vitest
- ❌ Configuration parfois complexe

### 13. Terraform pour Infrastructure as Code

**Décision** : Terraform  
**Alternatives considérées** : Cloud Deployment Manager, Pulumi, CDK

**Justifications** :
- ✅ **Multi-cloud** : Portabilité si besoin futur
- ✅ **Maturité** : Provider GCP très complet
- ✅ **Communauté** : Large adoption, ressources nombreuses
- ✅ **State management** : Gestion état robuste
- ✅ **Plan/Apply** : Preview des changements

**Compromis** :
- ❌ Syntaxe HCL à apprendre
- ❌ State file à gérer

## Performance et optimisation

### 14. IndexedDB pour cache extension

**Décision** : IndexedDB pour cache local  
**Alternatives considérées** : localStorage, Chrome Storage API

**Justifications** :
- ✅ **Capacité** : Stockage important (>50MB)
- ✅ **Performance** : Async, pas de blocking UI
- ✅ **Structuré** : Requêtes complexes possibles
- ✅ **Persistance** : Survit fermeture browser
- ✅ **Standard** : API standard web

**Compromis** :
- ❌ API plus complexe que localStorage
- ❌ Support navigateurs (mais Chrome only)

### 15. Pas de vector database spécialisée pour MVP

**Décision** : Recherche vectorielle avec Firestore  
**Alternatives considérées** : Pinecone, Weaviate, Chroma

**Justifications** :
- ✅ **Simplicité** : Une seule base de données
- ✅ **Coût** : Pas de service supplémentaire
- ✅ **MVP** : Performance suffisante pour prototype
- ✅ **Intégration** : Même SDK que le reste

**Compromis** :
- ❌ Performance recherche vectorielle sous-optimale
- ❌ Scalabilité limitée pour large dataset

## Monitoring et observabilité

### 16. Structured logging avec Pino

**Décision** : Pino pour structured logging  
**Alternatives considérées** : Winston, console.log, Google Cloud Logging client

**Justifications** :
- ✅ **Performance** : Le plus rapide des loggers Node.js
- ✅ **Structured** : JSON natif, queryable dans Cloud Logging
- ✅ **Fastify** : Intégration native
- ✅ **Niveaux** : Debug, info, warn, error
- ✅ **Redaction** : Masquage automatique données sensibles

**Compromis** :
- ❌ JSON moins lisible en développement
- ❌ Configuration requise pour pretty-print

## Évolutions futures

### Décisions à reconsidérer pour la production

1. **Vector Database** : Migrer vers Pinecone/Weaviate pour performance
2. **Authentification** : Implémenter OAuth pour multi-utilisateurs
3. **Cache** : Ajouter Redis pour cache distribué
4. **CDN** : CloudFlare pour assets statiques
5. **Monitoring** : Datadog/New Relic pour APM avancé

### Métriques pour valider les décisions

- **Performance** : Latence API <2s, extension <500ms
- **Coût** : <$20/mois pour usage MVP
- **Maintenabilité** : Time to fix bugs <1h
- **Sécurité** : Pas de vulnérabilités critiques
- **Developer Experience** : Setup local <30min

Cette approche décisionnelle permet de rester agile tout en documentant le raisonnement pour les futurs développeurs du projet.