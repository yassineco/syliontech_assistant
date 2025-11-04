# 🏦 Assistant Sofinco - Démo Interactive

## 📋 Description

Cette démo présente l'Assistant IA Sofinco avec :
- ✅ Page d'accueil fidèle au site officiel Sofinco.fr
- ✅ Simulateur de crédit interactif
- ✅ Assistant IA conversationnel avec base de connaissances
- ✅ Interface moderne et responsive
- ✅ Logo officiel Sofinco intégré

---

## 🚀 Utilisation

### Option 1 : Serveur Python (Recommandé)

```bash
python3 -m http.server 8000
```

Puis ouvrez : http://localhost:8000/sofinco-demo.html

### Option 2 : Serveur Node.js

```bash
npx serve .
```

Suivez l'URL affichée dans le terminal.

### Option 3 : VS Code Live Server

1. Installez l'extension "Live Server" dans VS Code
2. Clic droit sur `sofinco-demo.html`
3. Sélectionnez "Open with Live Server"

### Option 4 : Double-clic (Limité)

⚠️ Vous pouvez double-cliquer sur `sofinco-demo.html`, mais certaines fonctionnalités (comme l'assistant IA) nécessitent un backend API.

---

## 📁 Structure des fichiers

```
export-demo/
├── sofinco-demo.html          # Page principale (point d'entrée)
├── assets/                     # Ressources (CSS, JS, images)
│   ├── index-[hash].css       # Styles compilés
│   └── index-[hash].js        # Application compilée
└── README.md                   # Ce fichier
```

---

## 🔧 Fonctionnalités

### 🏠 Page d'accueil
- Design fidèle au site Sofinco.fr
- Navigation complète avec menu
- Formulaire de simulation intégré
- Bouton assistant flottant avec logo officiel

### 💰 Simulateur de crédit
- Calcul en temps réel
- Multiple options de projets
- Affichage des offres personnalisées
- Recommandations intelligentes

### 🤖 Assistant IA
- Conversation naturelle et empathique
- Base de connaissances Sofinco (FAQ, produits, processus)
- Mémoire conversationnelle
- Suggestions contextuelles

---

## 🌐 Compatibilité

### Navigateurs supportés :
- ✅ Chrome / Edge (version 90+)
- ✅ Firefox (version 88+)
- ✅ Safari (version 14+)

### Résolutions :
- 📱 Mobile : 375px et plus
- 💻 Desktop : 1280px optimisé
- 📺 Large screen : Responsive jusqu'à 1920px

---

## ⚙️ Mode de fonctionnement

### Mode DEMO (actuel) :
- **Assistant IA** : Fonctionne en mode local avec données simulées
- **Simulateur** : Calculs côté client
- **Backend** : ⚠️ Nécessite le serveur API sur port 3001 pour fonctionnalité complète

### Pour activer le backend (développeurs) :

```bash
# Dans le projet principal
cd sofinco-assistant
pnpm install
pnpm dev
```

Le backend démarre sur http://localhost:3001

---

## 📊 Informations techniques

- **Framework** : React 18 + TypeScript
- **Build** : Vite 5.4.21
- **Styling** : CSS-in-JS (inline styles)
- **Icons** : Lucide React
- **State** : React Hooks (useState, useCallback)

---

## 👥 Auteur

Projet développé dans le cadre du prototype Assistant Sofinco
- **Branch** : feat/sofinco-assistant-prototype
- **Repository** : yassineco/sofinco-assistant

---

## 📝 Notes importantes

1. **Backend requis** : Pour que l'assistant IA fonctionne pleinement, le backend doit être actif sur localhost:3001
2. **CORS** : Le backend est configuré pour accepter les ports 5173 et 5174
3. **Données** : Les simulations et réponses sont basées sur des données de démonstration

---

## 🎯 Pour présentation

1. **Lancer un serveur local** (voir options ci-dessus)
2. **Ouvrir sofinco-demo.html** dans un navigateur
3. **Démontrer** :
   - Navigation sur la page d'accueil
   - Utilisation du simulateur
   - Interaction avec l'assistant IA
   - Responsive design (redimensionner la fenêtre)

---

## 📞 Support

Pour toute question ou problème, référez-vous au repository GitHub ou contactez l'équipe de développement.

---

**Version** : 1.0.0  
**Date** : Novembre 2025  
**Status** : ✅ Production Ready
