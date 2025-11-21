import 'dotenv/config';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { ragRoutes } from './routes/rag';
import { getGeminiClient } from './services/vertex/geminiClient'; // ACTIVÉ pour utiliser Vertex AI

// Configuration simple pour commencer
const config = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT || '8080'),
  PROJECT_ID: process.env.PROJECT_ID || 'magic-button-demo',
  API_VERSION: '1.0.0'
};

// Types pour les requêtes GenAI
interface AIRequest {
  action: 'corriger' | 'résumer' | 'traduire' | 'optimiser';
  text: string;
  options?: {
    targetLanguage?: string;
    maxLength?: number;
    style?: string;
  };
}

interface AIResponse {
  result: string;
  action: string;
  processingTime: number;
  timestamp: string;
}

async function createServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: false,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    },
    trustProxy: true
  });

  // Sécurité avec Helmet
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    }
  });

  // CORS pour extensions Chrome
  await server.register(cors, {
    origin: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
      // Autoriser les extensions Chrome et développement local
      if (!origin || 
          origin.startsWith('chrome-extension://') || 
          origin.includes('localhost') ||
          config.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature']
  });

  // Routes de base
  server.get('/health', async (): Promise<{ status: string; timestamp: string; version: string }> => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.API_VERSION
    };
  });

  server.get('/', async (): Promise<object> => {
    return {
      name: 'Magic Button API',
      version: config.API_VERSION,
      status: 'running',
      environment: config.NODE_ENV,
      project: config.PROJECT_ID,
      endpoints: {
        health: '/health',
        genai: '/api/genai/process',
        rag: {
          upload: '/rag/documents',
          search: '/rag/search',
          generate: '/rag/generate',
          stats: '/rag/stats',
          health: '/rag/health'
        }
      }
    };
  });

  // Enregistrement des routes RAG
  await server.register(ragRoutes);

  // Route GenAI principale
  server.post<{ Body: AIRequest }>('/api/genai/process', {
    schema: {
      body: {
        type: 'object',
        required: ['action', 'text'],
        properties: {
          action: {
            type: 'string',
            enum: ['corriger', 'résumer', 'traduire', 'optimiser', 'analyser', 'resumer', 'correct', 'summarize', 'translate', 'optimize', 'analyze']
          },
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 10000
          },
          options: {
            type: 'object',
            properties: {
              targetLanguage: { type: 'string' },
              maxLength: { type: 'number' },
              style: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: AIRequest }>, reply: FastifyReply): Promise<AIResponse> => {
    const startTime = Date.now();
    const { action, text, options } = request.body;

    server.log.info(`Processing AI request: ${action}, text length: ${text.length}`);

    try {
      let result: string;
      
      // Mapping des actions françaises vers anglaises
      const actionMap: { [key: string]: string } = {
        'corriger': 'correct',
        'resumer': 'summarize',
        'traduire': 'translate',
        'optimiser': 'optimize',
        'analyser': 'analyze'
      };
      
      const mappedAction = actionMap[action] || action;
      
      // MODE PERSISTANT : Utilisation du vrai client Gemini Vertex AI
      server.log.info(`🚀 MODE PERSISTANT - Processing with Vertex AI: ${action} -> ${mappedAction}`);
      
      // Import dynamique du client Gemini
      const { getGeminiClient } = await import('./services/vertex/geminiClient');
      const geminiClient = getGeminiClient();
      
      const aiRequest = {
        action: mappedAction as any,
        text,
        options: options || {}
      };
      
      const geminiResponse = await geminiClient.processAIRequest(aiRequest);
      result = geminiResponse.result;

      const processingTime = Date.now() - startTime;
      const response: AIResponse = {
        result,
        action,
        processingTime,
        timestamp: new Date().toISOString()
      };

      server.log.info(`✅ VERTEX AI request completed: ${action} in ${processingTime}ms`);

      return response;

    } catch (error) {
      server.log.error(`AI processing error: ${error instanceof Error ? error.message : error}`);
      reply.code(500);
      throw new Error('Erreur lors du traitement IA');
    }
  });

  // Gestion d'erreurs globale
  server.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    server.log.error(error);

    const statusCode = (error as any).statusCode || 500;
    const message = config.NODE_ENV === 'development' ? error.message : 'Internal Server Error';

    reply.code(statusCode).send({
      error: true,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    });
  });

  return server;
}

// Export pour les tests
export { createServer };

async function start(): Promise<void> {
  try {
    const server = await createServer();
    
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0'
    });

    server.log.info(`🚀 Magic Button API started successfully`);
    server.log.info(`📍 Port: ${config.PORT}`);
    server.log.info(`🌍 Environment: ${config.NODE_ENV}`);
    server.log.info(`🎯 Project: ${config.PROJECT_ID}`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully`);
        await server.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Démarrage du serveur
start();