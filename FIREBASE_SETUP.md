# Configuration Firebase - SylionTech Admin Console

## Build et déploiement

### Commandes de déploiement
```bash
# Build de l'Admin Console
cd apps/admin
npm run build
npm run export

# Déploiement
cd ../..
firebase deploy --only hosting:admin --project prod

# Ou avec alias
firebase use prod
firebase deploy --only hosting
```

### Scripts package.json recommandés
```json
{
  "scripts": {
    "deploy:admin:dev": "npm run build:admin && firebase deploy --only hosting:admin --project dev",
    "deploy:admin:prod": "npm run build:admin && firebase deploy --only hosting:admin --project prod",
    "build:admin": "cd apps/admin && npm run build && npm run export"
  }
}
```

## Firebase Auth Configuration

### Méthodes d'auth activées
- Email/Password (admin uniquement)
- Google (optionnel, pour votre équipe)

### Users autorisés
- admin@syliontech.com
- yassine@syliontech.com
- (ajoutez manuellement via Firebase Console)

## Domaines autorisés
- localhost (dev)
- syliontech-admin.web.app
- admin.syliontech.com (custom domain)