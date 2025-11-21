# ===========================================
# DOCKERFILE - SYLIONTECH ASSISTANT API
# ===========================================

FROM node:22-alpine AS base

# Installation de dépendances système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm@8.15.0

# ===========================================
# ÉTAPE BUILD
# ===========================================
FROM base AS builder

WORKDIR /app

# Copie des fichiers de configuration (monorepo)
COPY package*.json pnpm-lock.yaml ./
COPY apps/server/package*.json ./apps/server/

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY apps/server ./apps/server

# Build du serveur
WORKDIR /app/apps/server
RUN pnpm build

# ===========================================
# ÉTAPE PRODUCTION
# ===========================================
FROM base AS runner

WORKDIR /app

# Création d'un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 syliontech

# Copie des fichiers nécessaires depuis le builder
COPY --from=builder --chown=syliontech:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=syliontech:nodejs /app/apps/server/package.json ./package.json
COPY --from=builder --chown=syliontech:nodejs /app/apps/server/node_modules ./node_modules

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Exposition du port Cloud Run
EXPOSE 8080

# Changement d'utilisateur
USER syliontech

# Healthcheck pour Cloud Run
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