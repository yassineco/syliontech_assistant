import type { FastifyPluginAsync } from 'fastify';
import type { AuthenticatedRequest } from '../../middleware/multitenant.js';
import { protectedRoute } from '../../middleware/multitenant.js';
import { generateAnswer, detectIntention } from '../../services/llm.js';
import { searchIndex } from '../../rag/index.js';
import type { DocChunk } from '../../rag/types.js';

// ===========================================
// API V1/CHAT - MULTI-TENANT
// ===========================================

// Types selon le prompt.md
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  session?: {
    userId?: string;
    lang?: string;
    channel?: string;
  };
}

interface ChatResponse {
  reply: string;
  intent: string;
  citations: Array<{
    title: string;
    url?: string;
    snippet?: string;
  }>;
  meta: {
    tenantId: string;
    latencyMs: number;
    model: string;
  };
}

const v1ChatRoute: FastifyPluginAsync = async (fastify) => {
  
  // ===========================================
  // POST /v1/chat - Chat completion multi-tenant
  // ===========================================
  fastify.post<{
    Body: ChatRequest;
  }>('/v1/chat', {
    ...protectedRoute(['chat'], 'apiCalls', 1),
    schema: {
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string', minLength: 1, maxLength: 4000 },
              },
            },
          },
          session: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              lang: { type: 'string' },
              channel: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request: AuthenticatedRequest, reply) => {
    const startTime = Date.now();
    
    try {
      const body = request.body as ChatRequest;
      const { messages, session = {} } = body;
      const { tenant } = request.tenantContext!;
      
      // Validation : au moins un message
      if (!messages || messages.length === 0) {
        return reply.status(400).send({
          error: 'invalid_request',
          message: 'Au moins un message est requis'
        });
      }
      
      // Dernier message utilisateur
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        return reply.status(400).send({
          error: 'invalid_request',
          message: 'Le dernier message doit être de type "user"'
        });
      }

      // Détection d'intention
      const intent = detectIntention(lastMessage.content);
      
      let citations: Array<{title: string; url?: string; snippet?: string}> = [];
      let retrievedChunks: DocChunk[] = [];

      // Recherche RAG si activée pour le tenant
      if (tenant.settings.enableRAG) {
        try {
          const ragResults = await searchIndex(lastMessage.content, 5);
          if (ragResults.chunks.length > 0) {
            retrievedChunks = ragResults.chunks;
            citations = ragResults.chunks.map(chunk => ({
              title: chunk.title,
              ...(chunk.url ? { url: chunk.url } : {}),
              snippet: chunk.text.substring(0, 100) + '...'
            }));
          }
        } catch (ragError) {
          console.warn('RAG search failed:', ragError);
        }
      }

      // Préparation de l'historique de conversation
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.role,
        message: msg.content,
      }));

      // Génération de la réponse
      const llmResponse = await generateAnswer(
        lastMessage.content,
        retrievedChunks,
        conversationHistory
      );

      const latencyMs = Date.now() - startTime;

      // Réponse selon le format du prompt.md
      const response: ChatResponse = {
        reply: llmResponse.reply,
        intent,
        citations,
        meta: {
          tenantId: tenant.id,
          latencyMs,
          model: 'gemini-1.5-flash',
        },
      };

      return reply.send(response);

    } catch (error) {
      console.error('Chat error:', error);
      
      return reply.status(500).send({
        error: 'internal_error',
        message: 'Temporary unavailable'
      });
    }
  });
};

export default v1ChatRoute;