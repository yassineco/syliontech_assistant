FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.prod.json ./

# Installer les dépendances incluant TypeScript
RUN npm ci

# Copier le code source
COPY src/ src/

# Builder l'application TypeScript
RUN npm run build

# Stage de production
FROM node:18-alpine AS production

WORKDIR /app

# Copier package.json pour les dépendances production
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier le code compilé depuis le stage builder
COPY --from=builder /app/dist ./dist

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

# Changer vers l'utilisateur non-root
USER fastify

# Exposer le port
EXPOSE 8080

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=8080

# Démarrer l'application
CMD ["node", "dist/server.js"]