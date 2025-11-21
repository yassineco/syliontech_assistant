import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { getGeminiClient, AIRequest, AIResponse, AIAction } from '@/services/vertex/geminiClient';
import { logger, createPerformanceLogger } from '@/logger';

// Schémas de validation Zod
const aiRequestSchema = z.object({
  action: z.enum(['correct', 'summarize', 'translate', 'optimize', 'analyze']),
  text: z.string().min(1, 'Text cannot be empty').max(10000, 'Text too long (max 10000 characters)'),
  options: z.object({
    targetLanguage: z.string().optional(),
    maxLength: z.number().min(50).max(2000).optional(),
    style: z.string().optional(),
    context: z.string().optional(),
  }).optional(),
});

const healthCheckResponseSchema = z.object({
  status: z.string(),
  model: z.string(),
  timestamp: z.string(),
});

type AIRequestBody = z.infer<typeof aiRequestSchema>;

/**
 * Routes pour les actions IA (Gemini)
 */
export async function genaiRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Middleware de validation pour toutes les routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Log de la requête (sans le body complet pour éviter les logs trop longs)
    fastify.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      contentType: request.headers['content-type'],
      bodySize: JSON.stringify(request.body || {}).length,
    }, 'Incoming GenAI request');
  });

  /**
   * POST /api/genai/action
   * Traite une action IA (corriger, résumer, traduire, etc.)
   */
  fastify.post<{ Body: AIRequestBody }>('/action', {
    schema: {
      body: {
        type: 'object',
        required: ['action', 'text'],
        properties: {
          action: {
            type: 'string',
            enum: ['correct', 'summarize', 'translate', 'optimize', 'analyze'],
            description: 'Type of AI action to perform',
          },
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 10000,
            description: 'Text to process',
          },
          options: {
            type: 'object',
            properties: {
              targetLanguage: {
                type: 'string',
                description: 'Target language for translation (e.g., "français", "English")',
              },
              maxLength: {
                type: 'number',
                minimum: 50,
                maximum: 2000,
                description: 'Maximum length for summaries (words)',
              },
              style: {
                type: 'string',
                description: 'Style preference for optimization',
              },
              context: {
                type: 'string',
                description: 'Additional context for the action',
              },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                result: { type: 'string' },
                action: { type: 'string' },
                originalLength: { type: 'number' },
                resultLength: { type: 'number' },
                processingTime: { type: 'number' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
            details: { type: 'array' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const perfLogger = createPerformanceLogger('genai-action-endpoint');

    try {
      // Validation du body avec Zod
      const validatedBody = aiRequestSchema.parse(request.body);

      logger.info('🎯 GenAI action received', {
        action: validatedBody.action,
        textLength: validatedBody.text.length,
        textPreview: validatedBody.text.substring(0, 100) + '...',
        options: validatedBody.options
      });

      // Validation spécifique selon l'action
      if (validatedBody.action === 'translate' && !validatedBody.options?.targetLanguage) {
        logger.warn('❌ Translation without target language');
        return reply.code(400).send({
          error: true,
          message: 'Target language is required for translation',
          details: ['options.targetLanguage must be provided for translate action'],
        });
      }

      // Traitement avec Gemini
      const geminiClient = getGeminiClient();
      const aiRequest: AIRequest = {
        action: validatedBody.action,
        text: validatedBody.text,
        options: validatedBody.options as any,
      };

      logger.info('🚀 Calling Gemini client', { action: validatedBody.action });

      const result: AIResponse = await geminiClient.processAIRequest(aiRequest);

      logger.info('✅ Gemini processing completed', {
        action: result.action,
        originalLength: result.originalLength,
        resultLength: result.resultLength,
        processingTime: result.processingTime,
        resultPreview: result.result.substring(0, 100) + '...'
      });

      perfLogger.end({
        action: result.action,
        originalLength: result.originalLength,
        resultLength: result.resultLength,
        processingTime: result.processingTime,
      });

      return reply.code(200).send({
        success: true,
        data: result,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Erreur de validation
        const details = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );

        perfLogger.error(error, { validationErrors: details });
        
        return reply.code(400).send({
          error: true,
          message: 'Invalid request data',
          details,
        });
      }

      // Erreur Vertex AI ou autre
      fastify.log.error(`GenAI processing error: ${error instanceof Error ? error.message : error}`);

      perfLogger.error(error as Error);

      return reply.code(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  /**
   * GET /api/genai/health
   * Health check pour Vertex AI
   */
  fastify.get('/health', {
    schema: {
      description: 'Health check for Vertex AI integration',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                model: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const geminiClient = getGeminiClient();
      const healthStatus = await geminiClient.healthCheck();

      return reply.code(200).send({
        success: true,
        data: healthStatus,
      });

    } catch (error) {
      fastify.log.error(`Vertex AI health check failed: ${error instanceof Error ? error.message : error}`);

      return reply.code(500).send({
        success: false,
        error: 'Vertex AI health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/genai/models
   * Liste des modèles et actions disponibles
   */
  fastify.get('/models', {
    schema: {
      description: 'List available AI models and actions',
      tags: ['Info'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                currentModel: { type: 'string' },
                actions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                capabilities: {
                  type: 'object',
                  properties: {
                    maxTextLength: { type: 'number' },
                    supportedLanguages: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.code(200).send({
      success: true,
      data: {
        currentModel: 'text-bison',
        actions: ['correct', 'summarize', 'translate', 'optimize', 'analyze'],
        capabilities: {
          maxTextLength: 10000,
          supportedLanguages: [
            'français',
            'English',
            'español',
            'deutsch',
            'italiano',
            'português',
            '中文',
            '日本語',
            'العربية',
          ],
        },
      },
    });
  });

  /**
   * POST /api/genai/process
   * Route de compatibilité pour l'extension Chrome
   * Redirige vers la route /action avec le bon format
   */
  fastify.post('/process', {
    schema: {
      description: 'Process AI request (Chrome extension compatibility)',
      body: {
        type: 'object',
        required: ['action', 'text'],
        properties: {
          action: {
            type: 'string',
            enum: ['correct', 'summarize', 'translate', 'optimize', 'analyze', 'corriger', 'resumer', 'traduire', 'optimiser', 'analyser'],
            description: 'AI action to perform',
          },
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 10000,
            description: 'Text to process',
          },
          options: {
            type: 'object',
            properties: {
              targetLanguage: { type: 'string' },
              maxLength: { type: 'number' },
              style: { type: 'string' },
              context: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const perfLogger = createPerformanceLogger('genai-process-endpoint');

    try {
      const body = request.body as any;
      
      logger.info('🎯 Extension request received', {
        action: body.action,
        textLength: body.text.length,
        textPreview: body.text.substring(0, 100) + '...',
        options: body.options
      });
      
      // Mapping des actions françaises vers anglaises
      const actionMap: { [key: string]: AIAction } = {
        'corriger': 'correct',
        'resumer': 'summarize',
        'traduire': 'translate',
        'optimiser': 'optimize',
        'analyser': 'analyze'
      };

      const mappedAction = actionMap[body.action] || body.action;

      logger.info('🔄 Action mapping', {
        original: body.action,
        mapped: mappedAction
      });

      // Validation spécifique selon l'action
      if ((mappedAction === 'translate' || body.action === 'traduire') && !body.options?.targetLanguage) {
        return reply.code(400).send({
          error: true,
          message: 'Target language is required for translation',
        });
      }

      // Traitement avec Gemini
      const geminiClient = getGeminiClient();
      const aiRequest: AIRequest = {
        action: mappedAction,
        text: body.text,
        options: body.options,
      };

      logger.info('🚀 Calling Gemini for extension', {
        action: mappedAction,
        textLength: body.text.length
      });

      const result = await geminiClient.processAIRequest(aiRequest);
      
      logger.info('✅ Extension processing completed', {
        action: result.action,
        originalLength: result.originalLength,
        resultLength: result.resultLength,
        processingTime: result.processingTime,
        resultPreview: result.result.substring(0, 100) + '...'
      });
      
      perfLogger.end();

      // Format de réponse pour l'extension (différent de l'API)
      return reply.send({
        success: true,
        result: result.result,
        action: result.action,
        metadata: {
          originalLength: result.originalLength,
          resultLength: result.resultLength,
          processingTime: result.processingTime,
        },
      });

    } catch (error) {
      perfLogger.end();
      fastify.log.error({ error }, 'Error processing extension AI request');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: true,
          message: 'Invalid request data',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        error: true,
        message: 'Internal server error during AI processing',
      });
    }
  });

  fastify.log.info('GenAI routes registered');
}