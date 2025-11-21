# Widget SylionTech Assistant

Widget CDN intégrable pour l'assistant IA SylionTech. Permet aux clients d'ajouter un assistant conversationnel à leur site en une seule ligne de code.

## 🚀 Intégration Rapide

```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="YOUR_TENANT_ID"
        data-api-key="YOUR_API_KEY"></script>
```

## 📋 Configuration

### Attributs Data Requis

- `data-tenant-id`: ID unique du tenant (requis)
- `data-api-key`: Clé API d'authentification (optionnel si publique)

### Attributs Data Optionnels

| Attribut | Type | Défaut | Description |
|----------|------|--------|-------------|
| `data-theme` | `light\|dark\|auto` | `auto` | Thème de l'interface |
| `data-lang` | `fr\|en\|es\|ar` | `fr` | Langue de l'interface |
| `data-position` | `bottom-right\|bottom-left\|top-right\|top-left` | `bottom-right` | Position du widget |
| `data-api-url` | string | `https://api.syliontech.ai` | URL de l'API |
| `data-primary-color` | string | `#3B82F6` | Couleur principale |
| `data-accent-color` | string | `#1D4ED8` | Couleur d'accent |
| `data-border-radius` | string | `12px` | Rayon de bordure |
| `data-font-family` | string | `system-ui` | Police de caractères |
| `data-welcome-message` | string | | Message d'accueil personnalisé |
| `data-placeholder` | string | | Placeholder du champ de saisie |
| `data-trigger-icon` | string | `💬` | Icône du bouton trigger |
| `data-width` | string | `380px` | Largeur du chat |
| `data-height` | string | `600px` | Hauteur du chat |
| `data-z-index` | number | `999999` | Z-index du widget |
| `data-debug` | boolean | `false` | Mode debug |

## 🎨 Exemples d'Intégration

### Configuration Basique
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="demo"></script>
```

### Configuration Avancée
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="acme-corp"
        data-api-key="ak_live_..."
        data-theme="dark"
        data-lang="en"
        data-position="bottom-left"
        data-primary-color="#10B981"
        data-accent-color="#059669"
        data-welcome-message="Hello! How can I help you today?"
        data-placeholder="Type your message..."
        data-width="400px"
        data-height="650px"></script>
```

### Personnalisation Marque
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="startup-xyz"
        data-primary-color="#7C3AED"
        data-accent-color="#5B21B6"
        data-border-radius="16px"
        data-font-family="Inter, sans-serif"
        data-trigger-icon="🤖"
        data-welcome-message="Salut ! Je suis l'assistant StartupXYZ 👋"></script>
```

## 🔧 API JavaScript

Le widget expose une API globale `window.SylionTechAssistant` :

```javascript
// Ouvrir l'assistant
window.SylionTechAssistant.open()

// Fermer l'assistant
window.SylionTechAssistant.close()

// Toggle l'assistant
window.SylionTechAssistant.toggle()

// Modifier la configuration
window.SylionTechAssistant.setConfig({
  theme: 'dark',
  primaryColor: '#FF6B6B'
})

// Détruire le widget
window.SylionTechAssistant.destroy()

// Accéder à l'instance widget
const widget = window.SylionTechAssistant.widget
```

## 🎯 Cas d'Usage

### E-commerce
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="shopify-store"
        data-welcome-message="Besoin d'aide pour vos achats ? 🛍️"
        data-primary-color="#00D4AA"></script>
```

### SaaS B2B
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="saas-platform"
        data-theme="dark"
        data-welcome-message="Support technique disponible 24/7 💻"
        data-position="bottom-left"></script>
```

### Site Corporate
```html
<script src="https://cdn.syliontech.ai/assistant.js" 
        data-tenant-id="corporate-site"
        data-lang="en"
        data-primary-color="#1F2937"
        data-welcome-message="How can we help you today?"
        data-font-family="Corporate Sans, sans-serif"></script>
```

## 📱 Responsive Design

Le widget s'adapte automatiquement :
- **Desktop** : Taille configurée (défaut 380x600px)
- **Mobile** : Pleine largeur avec hauteur adaptée
- **Thème** : Suit le thème système si `auto`

## 🔒 Sécurité

- Authentification par API key
- Isolation par tenant
- Validation des données côté serveur
- Rate limiting automatique
- CORS configuré

## ⚡ Performance

- **Taille** : < 50KB compressé (gzip)
- **Chargement** : Asynchrone, non-bloquant
- **CDN** : Distribution globale via Vercel
- **Cache** : Headers optimisés (1 an)
- **Lazy Loading** : Interface chargée à la demande

## 🛠️ Développement

### Installation
```bash
cd apps/widget
pnpm install
```

### Développement
```bash
pnpm dev
# Ouvre http://localhost:5173
```

### Build
```bash
pnpm build
# Génère dist/assistant.js
```

### Démo
```bash
# Après build
python -m http.server 8000
# Ouvre demo.html
```

### Déploiement
```bash
pnpm deploy
# Déploie sur Vercel CDN
```

## 🔗 URLs de Déploiement

- **Production** : `https://cdn.syliontech.ai/assistant.js`
- **Staging** : `https://cdn-staging.syliontech.ai/assistant.js`
- **Dev** : `http://localhost:5173/src/assistant.ts`

## 📊 Analytics

Le widget track automatiquement :
- Ouvertures/fermetures
- Messages envoyés
- Erreurs API
- Performance de chargement

Données disponibles dans l'Admin Console.

## 🐛 Debug

Activez le mode debug :
```html
<script src="..." data-debug="true"></script>
```

Console logs disponibles :
- Initialisation widget
- Configuration appliquée
- Appels API
- Erreurs runtime

## 📖 Documentation API

Voir [API Documentation](../server/README.md) pour :
- Endpoints disponibles
- Format des messages
- Gestion des erreurs
- Rate limiting

## 🤝 Support

- **Email** : support@syliontech.ai
- **Documentation** : https://docs.syliontech.ai
- **Status** : https://status.syliontech.ai