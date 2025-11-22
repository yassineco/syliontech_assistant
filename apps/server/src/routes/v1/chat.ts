import type { FastifyPluginAsync } from 'fastify';
import type { AuthenticatedRequest } from '../../middleware/multitenant.js';
import { protectedRoute } from '../../middleware/multitenant.js';
import { generateAnswer, detectIntention } from '../../services/llm.js';
import { ragSearchService } from '../../services/ragSearch.js';
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
      const { messages, session = {}, options = {} } = request.body as ChatRequest;
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
      if (!userMessage || userMessage.role !== 'user') {
        const errorResponse: ChatResponse = {
          id: requestId,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: config.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Erreur: Le dernier message doit être de type "user"',
              },
              finishReason: 'stop',
            },
          ],
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          metadata: {
            intent: 'error',
            confidence: 0,
            citations: [],
            processingTime: Date.now() - startTime,
          },
        };
        
        return reply.status(400).send(errorResponse);
      }

      // Détection d'intention
      const intent = detectIntention(userMessage.content);
      let citations: any[] = [];
      let ragChunks: any[] = [];

      // Recherche RAG si activée
      if (config.enableRAG && tenant.settings.enableRAG) {
        console.log(`🔍 Recherche RAG pour tenant: ${tenant.id}`);
        
        try {
          // Recherche dans les documents du tenant avec le nouveau service
          const ragResults = await ragSearchService.quickSearch(
            tenant.id,
            userMessage.content,
            5
          );

          if (ragResults.chunks.length > 0) {
            // Convertir les chunks RAG au format attendu par generateAnswer
            ragChunks = ragResults.chunks.map(chunk => ({
              id: `${chunk.metadata.documentId}-${chunk.metadata.chunkIndex}`,
              content: chunk.text,
              metadata: {
                source: chunk.metadata.fileName,
                title: `Document: ${chunk.metadata.fileName}`,
                score: chunk.score,
                documentId: chunk.metadata.documentId,
                chunkIndex: chunk.metadata.chunkIndex,
              }
            }));
            
            citations = ragResults.chunks.map(chunk => ({
              source: chunk.metadata.fileName,
              title: `Document: ${chunk.metadata.fileName}`,
              snippet: chunk.text.length > 200 
                ? chunk.text.substring(0, 200) + '...' 
                : chunk.text,
              score: chunk.score,
              documentId: chunk.metadata.documentId,
            }));
            
            console.log(`✅ RAG trouvé ${ragResults.chunks.length} chunks pertinents`);
          } else {
            console.log(`📭 Aucun contenu RAG trouvé pour la requête`);
          }
        } catch (error) {
          console.error('❌ Erreur recherche RAG:', error);
          // Continuer sans RAG en cas d'erreur
        }
      }

      // Préparation du contexte de conversation
      const conversationHistory = messages.slice(-10).map((msg: any) => ({
        role: msg.role,
        message: msg.content,
      }));

      // Génération de la réponse avec les chunks RAG
      const llmResponse = await generateAnswer(
        userMessage.content,
        ragChunks, // Passer les chunks au lieu du contexte texte
        conversationHistory
      );

      // Sauvegarde de la conversation (si session fournie)
      if (session.id) {
        const conversationData: Parameters<typeof saveConversation>[0] = {
          tenantId: tenant.id,
          sessionId: session.id,
          messages: [
            ...messages,
            {
              role: 'assistant' as const,
              content: llmResponse.reply, // Utiliser reply au lieu de content
              timestamp: new Date().toISOString(),
            },
          ],
          metadata: {
            intent,
            citations,
            model: config.model,
            ...session.metadata,
          },
        };

        // N'inclure userId que s'il existe
        if (session.userId) {
          conversationData.userId = session.userId;
        }

        await saveConversation(conversationData);
      }

      // Enregistrement de l'événement analytics
      await recordEvent({
        tenantId: tenant.id,
        type: 'message_sent',
        properties: {
          intent,
          model: config.model,
          hasRAG: ragChunks.length > 0, // Utiliser ragChunks au lieu de ragContext
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
              content: llmResponse.reply, // Utiliser reply au lieu de content
            },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: 0, // Pas d'info d'usage dans LLMResponse actuel
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          intent,
          confidence: llmResponse.confidence || 0, // Gérer le cas undefined
          citations,
          processingTime,
        },
      };

      return reply.send(response);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Retourner une réponse d'erreur au format ChatResponse
      const errorResponse: ChatResponse = {
        id: requestId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'error',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Je rencontre une difficulté technique. Veuillez réessayer ou contacter un conseiller Sofinco au 0 800 767 000.',
            },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          intent: 'error',
          confidence: 0,
          citations: [],
          processingTime: Date.now() - startTime,
        },
      };
      
      return reply.status(500).send(errorResponse);
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