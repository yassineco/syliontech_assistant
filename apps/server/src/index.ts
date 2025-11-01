import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import assistantRoute from './routes/assistant.js';
import simulateRoute from './routes/simulate.js';
import ragRoute from './routes/rag.js';
import { buildIndexFromFolder } from './rag/index.js';
import path from 'path';

// ==========================================
// SERVEUR FASTIFY - SOFINCO ASSISTANT API
// ==========================================

/**
 * Configuration et démarrage du serveur Fastify
 */
async function createServer() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    bodyLimit: 1048576, // 1MB limit
    trustProxy: true, // Pour récupérer la vraie IP derrière un proxy
  });

  // ==========================================
  // MIDDLEWARE ET PLUGINS
  // ==========================================

  // CORS pour permettre les requêtes depuis le frontend
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    credentials: true,
  });

  // Plugin pour parser JSON avec gestion d'erreurs
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      (error as any).statusCode = 400;
      done(error, undefined);
    }
  });

  // ==========================================
  // ROUTES DE SANTÉ ET INFORMATION
  // ==========================================

  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Vérification de l\'état du serveur',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            mode: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: env.USE_MOCK ? 'mock' : 'live',
      uptime: process.uptime(),
    };
  });

  // Information sur l'API
  fastify.get('/info', {
    schema: {
      description: 'Informations sur l\'API Sofinco Assistant',
      tags: ['info'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            mode: { type: 'string' },
            capabilities: { type: 'object' },
            endpoints: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      name: 'Sofinco Assistant API',
      version: '1.0.0',
      description: 'API pour l\'assistant IA Sofinco - Simulation et conseil en crédit',
      mode: env.USE_MOCK ? 'mock' : 'live',
      capabilities: {
        simulation: true,
        assistant: true,
        voiceReady: true,
        audit: true,
      },
      endpoints: [
        { path: '/api/assistant', method: 'POST', description: 'Assistant conversationnel IA' },
        { path: '/api/assistant/session', method: 'POST', description: 'Démarrage de session' },
        { path: '/api/simulate', method: 'POST', description: 'Simulation de crédit' },
        { path: '/health', method: 'GET', description: 'État du serveur' },
        { path: '/info', method: 'GET', description: 'Informations API' },
      ],
    };
  });

  // Route racine avec redirection vers la documentation
  fastify.get('/', async (request, reply) => {
    return reply.redirect('/info');
  });

  // ==========================================
  // ENREGISTREMENT DES ROUTES MÉTIER
  // ==========================================

  // Routes de l'assistant IA
  await fastify.register(assistantRoute);

  // Routes de simulation
  await fastify.register(simulateRoute);

  // Routes RAG
  await fastify.register(ragRoute);

  // ==========================================
  // INITIALISATION SYSTÈME RAG
  // ==========================================

  try {
    fastify.log.info('🧠 Initialisation du système RAG...');
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    const stats = await buildIndexFromFolder(knowledgeDir);
    fastify.log.info(`✅ Index RAG construit: ${stats.totalDocs} documents, ${stats.totalChunks} chunks`);
  } catch (ragError) {
    fastify.log.warn({ error: ragError }, '⚠️ Erreur initialisation RAG - Fonctionnement en mode dégradé');
  }

  // ==========================================
  // GESTION D'ERREURS GLOBALE
  // ==========================================

  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error({
      error: error,
      url: request.url,
      method: request.method,
      headers: request.headers,
    });

    // Erreurs de validation
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation échouée',
        details: error.validation,
        message: 'Les données fournies ne respectent pas le format attendu',
      });
    }

    // Erreurs de parsing JSON
    if (error.statusCode === 400 && error.message.includes('JSON')) {
      return reply.code(400).send({
        error: 'Format JSON invalide',
        message: 'Le contenu de la requête n\'est pas un JSON valide',
      });
    }

    // Erreurs 404
    if (error.statusCode === 404) {
      return reply.code(404).send({
        error: 'Endpoint non trouvé',
        message: `L'endpoint ${request.method} ${request.url} n'existe pas`,
      });
    }

    // Erreurs serveur (500)
    return reply.code(error.statusCode || 500).send({
      error: 'Erreur serveur',
      message: env.NODE_ENV === 'development' ? error.message : 'Une erreur interne s\'est produite',
      ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // Handler pour routes non trouvées
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      error: 'Route non trouvée',
      message: `L'endpoint ${request.method} ${request.url} n'existe pas`,
      availableEndpoints: [
        'GET /health',
        'GET /info',
        'POST /api/assistant',
        'POST /api/assistant/session',
        'POST /api/simulate',
      ],
    });
  });

  return fastify;
}

/**
 * Démarrage du serveur
 */
async function start() {
  try {
    const server = await createServer();

    // Hook de démarrage pour afficher les informations
    server.addHook('onReady', async () => {
      console.log('🏦 Sofinco Assistant API');
      console.log('========================');
      console.log(`🚀 Serveur démarré sur le port ${env.PORT}`);
      console.log(`🌍 Mode: ${env.USE_MOCK ? 'MOCK (démo)' : 'LIVE (Gemini)'}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health`);
      console.log(`📊 Informations: http://localhost:${env.PORT}/info`);
      console.log('========================');
    });

    // Démarrage du serveur
    const address = await server.listen({
      port: env.PORT,
      host: '127.0.0.1', // Localhost uniquement pour le dev
    });

    console.log(`✅ Serveur écoute sur ${address}`);

    // Gestion propre de l'arrêt
    const shutdown = async (signal: string) => {
      console.log(`\n📢 Signal ${signal} reçu, arrêt du serveur...`);
      try {
        await server.close();
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erreur lors de l\'arrêt:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

// Démarrage si le fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createServer, start };