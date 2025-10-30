# 🏦 Sofinco Assistant IA - Prototype

## 📋 Vue d'ensemble

Ce projet est une **branche dérivée** du projet Magic Button, spécifiquement adaptée pour créer un prototype d'assistant IA pour Sofinco.

### 🔄 Historique de dérivation

- **Repository source** : [yassineco/MB](https://github.com/yassineco/MB) (Magic Button)
- **Repository cible** : [yassineco/sofinco-assistant](https://github.com/yassineco/sofinco-assistant)
- **Branche de travail** : `feat/sofinco-assistant-prototype`
- **Date de création** : 30 octobre 2025

### 🎯 Objectif du prototype

Développer un assistant IA interactif pour Sofinco avec :
- 🗣️ **Interface vocale** pour l'interaction utilisateur
- 👁️ **Interface visuelle** moderne et intuitive
- 🧠 **Intelligence artificielle** basée sur Vertex AI/Gemini
- 🌐 **Application web** responsive

### 🛠️ Stack technique conservé

- **Frontend** : React + TypeScript + Tailwind CSS + Vite
- **Backend** : Fastify + TypeScript + Node.js
- **IA** : Google Cloud Vertex AI + Gemini
- **Infrastructure** : Google Cloud Run
- **Extension** : Chrome Extension MV3

### 🚀 Commandes de développement

```bash
# Installer toutes les dépendances
npm run install:all

# Démarrer en mode développement
npm run dev

# Backend seul
npm run dev:backend

# Extension seule
npm run dev:extension

# Build complet
npm run build

# Tests
npm run test
```

### 📂 Structure du projet

```
sofinco-assistant/
├── backend/          # API Fastify + Vertex AI
├── extension/        # Chrome Extension React
├── infra/           # Infrastructure Terraform
├── docs/            # Documentation
└── scripts/         # Scripts utilitaires
```

### 🔗 Configuration Git

- **origin** : https://github.com/yassineco/sofinco-assistant (pour les commits)
- **upstream** : https://github.com/yassineco/MB (pour les mises à jour du projet source)

### 📝 Prochaines étapes

1. Adapter l'interface pour le contexte Sofinco
2. Intégrer les fonctionnalités vocales
3. Personnaliser l'assistant IA
4. Déployer le prototype

---

*Basé sur Magic Button v1.0.0 - Adapté pour Sofinco Assistant*