import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { config } from '@/config/env';
import { logger } from '@/logger';
import { validateSignature } from '@/services/security/sign';
import { genaiRoutes } from '@/routes/genai';
import { knowledgeRoutes } from '@/routes/knowledge';

async function createServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: logger as any,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB pour uploads
  });

  // Security middleware
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // Configuration CORS
  await server.register(cors, {
    origin: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
      // En production, limiter aux domaines autorisés
      if (config.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
      
      // Liste des origins autorisées (extensions Chrome)
      const allowedOrigins = [
        'chrome-extension://*',
        // Ajouter autres origins si nécessaire
      ];
      
      if (!origin || allowedOrigins.some(pattern => 
        origin.match(pattern.replace('*', '.*'))
      )) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-mb-timestamp', 'x-mb-signature'],
  });

  // Security middleware pour validation HMAC
  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip validation pour routes de santé
    if (request.url === '/health' || request.url === '/') {
      return;
    }

    // Validation signature HMAC
    const isValid = await validateSignature(request);
    if (!isValid) {
      reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
      return;
    }
  });

  // Routes
  await server.register(genaiRoutes, { prefix: '/api/genai' });
  await server.register(knowledgeRoutes, { prefix: '/api/knowledge' });

  // Health check
  server.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  }));

  server.get('/', async () => ({
    name: 'Magic Button API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Chrome Extension + Vertex AI Backend',
    endpoints: {
      health: '/health',
      genai: '/api/genai/*',
      knowledge: '/api/knowledge/*',
    },
  }));

  // Error Handler global
  server.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    server.log.error(error);
    
    const statusCode = (error as any).statusCode || 500;
    const message = config.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal Server Error';

    reply.code(statusCode).send({
      error: true,
      message,
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  return server;
}

async function startServer(): Promise<void> {
  try {
    const server = await createServer();
    
    const address = await server.listen({
      port: config.PORT,
      host: '0.0.0.0', // Important pour Cloud Run
    });

    server.log.info(`Server listening at ${address}`);
    server.log.info(`Environment: ${config.NODE_ENV}`);
    server.log.info(`Project ID: ${config.PROJECT_ID}`);
    
    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully`);
        await server.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Start server si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

export { createServer, startServer };