import type { FastifyPluginAsync } from 'fastify';
import type { AuthenticatedRequest } from '../../middleware/multitenant.js';
import { protectedRoute } from '../../middleware/multitenant.js';
import { generateAnswer, detectIntention } from '../../services/llm.js';
import { searchIndex } from '../../rag/index.js';
import crypto from 'crypto';

// ===========================================
// API V1/CHAT - MULTI-TENANT
// ===========================================

// Types de requête/réponse
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  session?: {
    id?: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    enableRAG?: boolean;
    stream?: boolean;
  };
}

interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finishReason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    intent?: string;
    confidence?: number;
    citations?: Array<{
      source: string;
      title: string;
      url?: string;
    }>;
    processingTime: number;
  };
}

const v1ChatRoute: FastifyPluginAsync = async (fastify) => {
  
  // ===========================================
  // POST /v1/chat - Chat completion multi-tenant
  // ===========================================
  fastify.post<{
    Body: ChatRequest;
    Reply: ChatResponse;
  }>('/v1/chat', {
    ...protectedRoute(['chat'], 'apiCalls', 1),
    schema: {
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string', minLength: 1, maxLength: 4000 },
                timestamp: { type: 'string' },
              },
            },
          },
          session: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              metadata: { type: 'object' },
            },
          },
          options: {
            type: 'object',
            properties: {
              model: { type: 'string' },
              temperature: { type: 'number', minimum: 0, maximum: 2 },
              maxTokens: { type: 'number', minimum: 1, maximum: 4000 },
              enableRAG: { type: 'boolean' },
              stream: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      const { messages, session = {}, options = {} } = request.body;
      const { tenant } = request.tenantContext!;
      
      // Configuration par défaut basée sur le tenant
      const config = {
        model: options.model || 'gemini-1.5-flash',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        enableRAG: options.enableRAG ?? tenant.settings.enableRAG,
        stream: options.stream || false,
      };

      // Dernier message utilisateur
      const userMessage = messages[messages.length - 1];
      if (userMessage.role !== 'user') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_MESSAGE_ORDER',
            message: 'Le dernier message doit être de type "user"',
          },
        });
      }

      // Détection d'intention
      const intent = detectIntention(userMessage.content);
      let citations: any[] = [];
      let ragContext = '';

      // Recherche RAG si activée
      if (config.enableRAG && tenant.settings.enableRAG) {
        console.log(`RAG search for tenant: ${tenant.id}`);
        
        // Recherche dans les documents du tenant
        const ragResults = await searchIndex(userMessage.content, {
          tenantId: tenant.id,
          limit: 5,
          threshold: 0.7,
        });

        if (ragResults.length > 0) {
          ragContext = ragResults.map(r => r.content).join('\n\n');
          citations = ragResults.map(r => ({
            source: r.source || 'Document interne',
            title: r.metadata?.title || 'Document',
            url: r.metadata?.url,
          }));
        }
      }

      // Préparation du contexte de conversation
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Génération de la réponse
      const llmResponse = await generateAnswer(
        userMessage.content,
        conversationHistory,
        {
          ragContext,
          tenantConfig: {
            name: tenant.name,
            domain: tenant.domain,
            branding: tenant.branding,
          },
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        }
      );

      // Sauvegarde de la conversation (si session fournie)
      if (session.id) {
        await saveConversation({
          tenantId: tenant.id,
          sessionId: session.id,
          userId: session.userId,
          messages: [
            ...messages,
            {
              role: 'assistant' as const,
              content: llmResponse.content,
              timestamp: new Date().toISOString(),
            },
          ],
          metadata: {
            intent,
            citations,
            model: config.model,
            ...session.metadata,
          },
        });
      }

      // Enregistrement de l'événement analytics
      await recordEvent({
        tenantId: tenant.id,
        type: 'message_sent',
        properties: {
          intent,
          model: config.model,
          hasRAG: ragContext.length > 0,
          citationsCount: citations.length,
          sessionId: session.id,
          userId: session.userId,
        },
      });

      const processingTime = Date.now() - startTime;

      // Réponse au format OpenAI-compatible
      const response: ChatResponse = {
        id: requestId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: config.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: llmResponse.content,
            },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: llmResponse.usage?.promptTokens || 0,
          completionTokens: llmResponse.usage?.completionTokens || 0,
          totalTokens: llmResponse.usage?.totalTokens || 0,
        },
        metadata: {
          intent,
          confidence: llmResponse.confidence,
          citations,
          processingTime,
        },
      };

      return reply.send(response);

    } catch (error) {
      console.error('Chat error:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: 'Erreur lors de la génération de la réponse',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        meta: {
          requestId,
          timestamp: new Date(),
          tenantId: request.tenantContext?.tenant.id,
        },
      });
    }
  });

  // ===========================================
  // GET /v1/chat/models - Liste des modèles disponibles
  // ===========================================
  fastify.get('/v1/chat/models', {
    ...protectedRoute(['chat']),
  }, async (request: AuthenticatedRequest, reply) => {
    const { tenant } = request.tenantContext!;
    
    const models = [
      {
        id: 'gemini-1.5-flash',
        object: 'model',
        created: 1677610602,
        ownedBy: 'google',
        permission: [],
        root: 'gemini-1.5-flash',
        available: true,
        contextWindow: 128000,
      },
      {
        id: 'gemini-1.5-pro',
        object: 'model', 
        created: 1677610602,
        ownedBy: 'google',
        permission: [],
        root: 'gemini-1.5-pro',
        available: tenant.plan !== 'free',
        contextWindow: 2000000,
      },
    ];

    return reply.send({
      object: 'list',
      data: models.filter(m => m.available),
    });
  });
};

// ===========================================
// FONCTIONS UTILITAIRES
// ===========================================

async function saveConversation(data: {
  tenantId: string;
  sessionId: string;
  userId?: string;
  messages: any[];
  metadata?: any;
}): Promise<void> {
  // TODO: Implémenter avec Firestore
  console.log(`Saving conversation for tenant: ${data.tenantId}, session: ${data.sessionId}`);
}

async function recordEvent(data: {
  tenantId: string;
  type: string;
  properties?: any;
}): Promise<void> {
  // TODO: Implémenter avec Firestore/BigQuery
  console.log(`Recording event: ${data.type} for tenant: ${data.tenantId}`);
}

export default v1ChatRoute;