# ===========================================
# DOCKERFILE - SILYONTECH ASSISTANT API
# ===========================================

FROM node:22-alpine AS base

# Installation de dépendances système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json pnpm-lock.yaml ./
COPY apps/server/package*.json ./apps/server/

# Installation de pnpm et des dépendances
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile --prod

# Étape de build
FROM base AS builder

WORKDIR /app

# Copie du code source
COPY . .

# Build du serveur
RUN pnpm --filter @silyontech/server build

# Étape de production
FROM node:22-alpine AS runner

WORKDIR /app

# Création d'un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 silyontech

# Copie des fichiers nécessaires
COPY --from=builder --chown=silyontech:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=silyontech:nodejs /app/apps/server/node_modules ./node_modules
COPY --from=builder --chown=silyontech:nodejs /app/apps/server/package.json ./package.json

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Exposition du port
EXPOSE 8080

# Changement d'utilisateur
USER silyontech

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 8080, path: '/health', timeout: 2000 }; \
    const req = http.get(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => { req.destroy(); process.exit(1); });"

# Commande de démarrage
CMD ["node", "dist/index.js"]