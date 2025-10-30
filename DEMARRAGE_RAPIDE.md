# 🚀 Guide de Démarrage Rapide - Sofinco Assistant

## ⚡ Démarrage en 3 minutes

### 1. Installation

```bash
# Cloner et accéder au projet
git clone https://github.com/yassineco/sofinco-assistant.git
cd sofinco-assistant

# Installer les dépendances
pnpm install
```

### 2. Configuration

Le prototype fonctionne en **mode MOCK** par défaut (aucune configuration requise).

```bash
# Vérifier la configuration
cat apps/server/.env
# USE_MOCK=true ✅
```

### 3. Démarrage

```bash
# Démarrer backend + frontend
pnpm run dev

# Ou séparément
pnpm run dev:server  # http://localhost:3001
pnpm run dev:web     # http://localhost:5173
```

### 4. Test

1. **Ouvrir** : http://localhost:5173
2. **Simuler** : 15 000€ sur 48 mois pour véhicule
3. **Parler** : Cliquer sur 🎤 et dire "Bonjour"
4. **Explorer** : Naviguer entre Simulateur/Offres/Assistant

## 🎯 Scénarios de Démonstration

### Scenario 1 : Simulation Simple
```
1. Montant : 15 000€
2. Durée : 48 mois
3. Projet : Véhicule
4. Valider → Voir 3 offres personnalisées
```

### Scenario 2 : Assistant Vocal
```
1. Aller dans "Assistant"
2. Cliquer sur 🎤
3. Dire : "Je veux un crédit de 20000 euros"
4. Continuer la conversation
```

### Scenario 3 : Navigation Complète
```
1. Simulateur → Saisir paramètres
2. Mes offres → Consulter résultats
3. Assistant → Poser questions
4. Retour Simulateur → Nouveau calcul
```

## 🔧 Dépannage Express

### Backend ne démarre pas
```bash
# Vérifier le port 3001
ss -tlnp | grep 3001

# Si occupé, changer le port
echo "PORT=3002" >> apps/server/.env
```

### Frontend ne charge pas
```bash
# Rebuild
pnpm --filter @sofinco/web run build

# Vérifier les dépendances
pnpm --filter @sofinco/web install
```

### API ne répond pas
```bash
# Test manuel
curl http://localhost:3001/health

# Logs en temps réel
tail -f logs/backend.log
```

## 📊 Validation Fonctionnelle

### ✅ Check-list Démo

- [ ] Backend démarre sur port 3001
- [ ] Frontend accessible sur port 5173  
- [ ] Simulateur affiche le formulaire
- [ ] Calcul génère 3 offres
- [ ] Assistant répond aux messages
- [ ] Microphone fonctionne (Chrome/Edge)
- [ ] Navigation entre pages fluide
- [ ] Bannière légale visible

### 🧪 Tests API Rapides

```bash
# Health check
curl http://localhost:3001/health

# Simulation test
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"amount":15000,"duration":48,"project":"auto"}'

# Assistant test  
curl -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"Bonjour"}'
```

## 🎨 Personnalisation Rapide

### Changer les couleurs
```css
/* apps/web/src/index.css */
:root {
  --color-primary: #00a86b; /* Vert principal */
  --color-secondary: #f0f9ff; /* Bleu clair */
}
```

### Modifier les montants
```typescript
// apps/web/src/components/LoanSimulator.tsx
const AMOUNT_STEPS = [1000, 5000, 10000, 20000, 50000];
```

### Ajuster les durées
```typescript
// apps/web/src/components/LoanSimulator.tsx  
const DURATION_STEPS = [12, 24, 36, 48, 60, 72];
```

## 🚀 Mise en Production (Futur)

### 1. Configuration GCP
```bash
# apps/server/.env
USE_MOCK=false
GCP_PROJECT_ID=votre-projet
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### 2. Build Production
```bash
pnpm run build
```

### 3. Déploiement
```bash
# Docker
docker build -t sofinco-assistant .
docker run -p 3001:3001 sofinco-assistant

# Cloud Run / Vercel / Netlify
# Suivre la documentation spécifique
```

---

## 💡 Prochaines Étapes

1. **Tester** toutes les fonctionnalités
2. **Personnaliser** les messages et design  
3. **Intégrer** avec les systèmes existants
4. **Déployer** en environnement de test
5. **Former** les équipes utilisatrices

**🎯 Objectif** : Démonstration fonctionnelle en < 5 minutes !