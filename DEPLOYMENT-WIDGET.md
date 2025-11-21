# Guide de Déploiement Widget

## 🚀 Déploiement Production

### 1. Build et Préparation

```bash
# Root du projet
cd /media/yassine/IA/Projects/SylionTech/assistant

# Build du widget
pnpm build:widget

# Vérifier les fichiers générés
ls -la apps/widget/dist/
```

### 2. Déploiement Vercel CDN

```bash
# Configuration Vercel (première fois)
cd apps/widget
pnpm install -g vercel
vercel login

# Lier le projet
vercel link

# Déploiement
vercel --prod
```

### 3. Configuration DNS

#### Domaine principal : `cdn.syliontech.ai`

```bash
# Dans Vercel Dashboard > Domains
# Ajouter : cdn.syliontech.ai
# CNAME: cdn.syliontech.ai -> cname.vercel-dns.com
```

#### URLs finales :
- **Production** : `https://cdn.syliontech.ai/assistant.js`
- **Staging** : `https://cdn-staging.syliontech.ai/assistant.js`
- **Démo** : `https://cdn.syliontech.ai/demo`

### 4. Test de Déploiement

```html
<!-- Test d'intégration -->
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="test"
        data-debug="true"></script>
```

## 🔧 Variables d'Environnement

### Vercel Environment Variables

```bash
# Production
VERCEL_ENV=production
API_URL=https://api.syliontech.ai
WIDGET_VERSION=1.0.0

# Staging  
VERCEL_ENV=preview
API_URL=https://api-staging.syliontech.ai
WIDGET_VERSION=1.0.0-staging
```

## 📊 Monitoring

### Analytics Vercel

- **Bandwidth** : Consommation CDN
- **Requests** : Nombre de chargements
- **Geographic** : Distribution géographique
- **Performance** : Temps de chargement

### Headers de Cache

```http
# Cache optimisé (1 an)
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/javascript
Access-Control-Allow-Origin: *
```

## 🚀 Workflow CI/CD

### GitHub Actions (Future)

```yaml
# .github/workflows/widget.yml
name: Deploy Widget
on:
  push:
    branches: [main]
    paths: ['apps/widget/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build:widget
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: apps/widget
```

## 🔍 Tests de Validation

### Test d'Intégration Automatisé

```javascript
// Test du widget
async function testWidget() {
  // Charger le script
  const script = document.createElement('script')
  script.src = 'https://cdn.syliontech.ai/assistant.js'
  script.dataset.tenantId = 'test'
  document.head.appendChild(script)
  
  // Attendre l'initialisation
  await new Promise(resolve => {
    script.onload = () => {
      setTimeout(resolve, 1000)
    }
  })
  
  // Vérifier l'API globale
  console.assert(window.SylionTechAssistant, 'API globale disponible')
  console.assert(typeof window.SylionTechAssistant.open === 'function', 'Méthode open disponible')
  
  // Test d'ouverture
  window.SylionTechAssistant.open()
  
  console.log('✅ Widget test passed')
}
```

### Test Multi-navigateur

```bash
# Playwright tests
npx playwright test widget.spec.js --project=chromium
npx playwright test widget.spec.js --project=firefox  
npx playwright test widget.spec.js --project=webkit
```

## 📈 Métriques de Performance

### Objectifs
- **Taille** : < 50KB (gzip)
- **Chargement** : < 500ms (3G)
- **FCP** : < 1s
- **TTI** : < 2s

### Optimisations
- Tree-shaking automatique
- Code splitting par thème
- Lazy loading du chat
- Service Worker (future)

## 🔐 Sécurité

### Content Security Policy

```http
# Headers recommandés pour les sites clients
Content-Security-Policy: script-src 'self' https://cdn.syliontech.ai
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### Rate Limiting

```javascript
// Côté widget (protection DDoS)
const rateLimiter = {
  requests: 0,
  window: 60000, // 1 minute
  limit: 100,    // 100 req/min
  
  check() {
    if (this.requests >= this.limit) {
      throw new Error('Rate limit exceeded')
    }
    this.requests++
  }
}
```

## 🔄 Rollback

### Procédure de Rollback

```bash
# 1. Identifier la version précédente
vercel ls

# 2. Promouvoir l'ancien déploiement
vercel promote <deployment-url> --scope=syliontech

# 3. Vérifier le rollback
curl -I https://cdn.syliontech.ai/assistant.js
```

### Version Pinning

```html
<!-- Version spécifique (recommandé production) -->
<script src="https://cdn.syliontech.ai/v1.0.0/assistant.js"></script>

<!-- Latest (développement uniquement) -->
<script src="https://cdn.syliontech.ai/assistant.js"></script>
```

## 📚 Documentation Client

### Intégration Guide

Voir [Widget README](apps/widget/README.md) pour :
- Configuration complète
- Exemples d'usage
- API JavaScript
- Troubleshooting

### Support Integration

```javascript
// Debug helper pour les clients
window.SylionTechAssistant?.widget?.config?.debug && console.log({
  version: '1.0.0',
  config: window.SylionTechAssistant.widget.config,
  status: 'loaded'
})
```