import type { FastifyPluginAsync } from 'fastify';
import { validateAssistantRequest, type AssistantRequest, type AssistantReply } from '../types/schemas.js';
import { processAssistantRequest } from '../services/mock.js';
import { processGeminiRequest, isGeminiAvailable } from '../services/gemini.js';
import { logUserMessage, logAssistantReply, logSessionStart } from '../services/audit.js';
import { env } from '../config/env.js';
import { generateAnswer, detectIntention } from '../services/llm.js';
import { searchIndex } from '../rag/index.js';

// ==========================================
// ROUTE /api/assistant - ASSISTANT IA
// ==========================================

const assistantRoute: FastifyPluginAsync = async (fastify) => {
  
  fastify.post<{
    Body: AssistantRequest;
    Reply: AssistantReply;
  }>('/api/assistant', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'message'],
        properties: {
          sessionId: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1, maxLength: 500 },
          context: { type: 'object' },
          slots: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              duration: { type: 'number' },
              income: { type: 'number' },
              employment: { type: 'string' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            intent: { type: 'string' },
            slots: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                duration: { type: 'number' },
                income: { type: 'number' },
                employment: { type: 'string' },
              },
            },
            reply: { type: 'string' },
            offers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  monthly: { type: 'number' },
                  apr: { type: 'number' },
                  withInsurance: { type: 'boolean' },
                  totalCost: { type: 'number' },
                  description: { type: 'string' },
                },
              },
            },
            nextAction: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Validation des paramètres
      const assistantRequest = validateAssistantRequest(request.body);
      
      // Headers pour audit
      const userAgent = request.headers['user-agent'];
      const ipAddress = request.ip;
      
      // Log du message utilisateur
      try {
        await logUserMessage(
          assistantRequest.sessionId,
          assistantRequest.message,
          assistantRequest.slots,
          userAgent,
          ipAddress
        );
      } catch (auditError) {
        fastify.log.warn({ error: auditError }, 'Erreur audit message utilisateur');
      }
      
      // Traitement avec intégration RAG
      let response: AssistantReply;
      
      // DEBUG: Afficher le message reçu
      console.log(`📥 Message reçu dans assistant.ts: "${assistantRequest.message}"`);
      console.log(`📦 AssistantRequest complet:`, JSON.stringify(assistantRequest, null, 2));
      
      // 1. Détection d'intention pour orienter le traitement
      const intention = detectIntention(assistantRequest.message);
      fastify.log.info(`🧠 Intention détectée: ${intention}`);
      
      try {
        if (intention === 'faq') {
          // 2. Questions FAQ -> Utiliser le système RAG
          fastify.log.info('📚 Mode RAG - Recherche dans la base de connaissances');
          
          // Recherche vectorielle dans l'index RAG
          const ragResult = await searchIndex(assistantRequest.message, 3);
          
          if (ragResult.chunks.length === 0) {
            // Aucun résultat précis trouvé pour répondre directement
            response = {
              intent: 'information',
              slots: assistantRequest.slots || {},
              reply: 'Je n\'ai pas trouvé d\'éléments précis pour répondre à votre question. Je peux vous expliquer la démarche ou vous aider à lancer une simulation si vous le souhaitez.',
              offers: [],
              nextAction: 'clarify',
              confidence: 0.3
            };
          } else {
            // Génération de la réponse avec les chunks trouvés
            const ragResponse = await generateAnswer(assistantRequest.message, ragResult.chunks);
            
            response = {
              intent: 'information',
              slots: assistantRequest.slots || {},
              reply: ragResponse.reply,
              offers: [],
              nextAction: 'continue',
              confidence: ragResponse.confidence || 0.8,
              // Ajout des citations pour l'UI
              ...(ragResponse.citations && { citations: ragResponse.citations })
            };
          }
          
        } else if (intention === 'simulation') {
          // 3. Demandes de simulation -> Services existants
          fastify.log.info('🧮 Mode Simulation - Utilisation des services de crédit');
          
          if (env.USE_MOCK) {
            response = await processAssistantRequest(assistantRequest);
          } else {
            if (!isGeminiAvailable()) {
              throw new Error('Gemini indisponible pour simulation');
            }
            response = await processGeminiRequest(assistantRequest);
          }
          
        } else {
          // 4. Autres intentions -> Services existants avec fallback RAG
          fastify.log.info('🔄 Mode Hybride - Services existants avec possibilité RAG');
          
          if (env.USE_MOCK) {
            response = await processAssistantRequest(assistantRequest);
          } else {
            if (!isGeminiAvailable()) {
              fastify.log.warn('⚠️ Gemini indisponible, tentative avec RAG');
              // Fallback vers RAG en cas d'indisponibilité
              const ragResult = await searchIndex(assistantRequest.message, 2);
              
              if (ragResult.chunks.length === 0) {
                response = {
                  intent: 'error',
                  slots: {},
                  reply: 'Je ne peux pas traiter votre demande actuellement. Veuillez réessayer plus tard.',
                  offers: [],
                  nextAction: 'retry',
                  confidence: 0.2
                };
              } else {
                const ragResponse = await generateAnswer(assistantRequest.message, ragResult.chunks);
                
                response = {
                  intent: 'information',
                  slots: assistantRequest.slots || {},
                  reply: ragResponse.reply,
                  offers: [],
                  nextAction: 'continue',
                  confidence: 0.6,
                  ...(ragResponse.citations && { citations: ragResponse.citations })
                };
              }
            } else {
              response = await processGeminiRequest(assistantRequest);
            }
          }
        }
        
      } catch (ragError) {
        fastify.log.error({ error: ragError }, 'Erreur traitement RAG, fallback vers services existants');
        
        // Fallback vers les services existants en cas d'erreur RAG
        if (env.USE_MOCK) {
          response = await processAssistantRequest(assistantRequest);
        } else {
          if (!isGeminiAvailable()) {
            return reply.code(503).send({
              intent: 'error',
              slots: {},
              reply: 'L\'assistant IA est temporairement indisponible. Veuillez réessayer plus tard.',
            });
          }
          response = await processGeminiRequest(assistantRequest);
        }
      }
      
      // Log de la réponse assistant
      try {
        await logAssistantReply(
          assistantRequest.sessionId,
          response.reply,
          response.intent,
          response.offers,
          userAgent,
          ipAddress
        );
      } catch (auditError) {
        fastify.log.warn({ error: auditError }, 'Erreur audit réponse assistant');
      }
      
      // Ajout de métadonnées de debug en mode développement
      if (env.NODE_ENV === 'development') {
        (response as any)._debug = {
          mode: env.USE_MOCK ? 'mock' : 'live',
          timestamp: new Date().toISOString(),
          sessionId: assistantRequest.sessionId,
        };
      }
      
      return response;
      
    } catch (error) {
      fastify.log.error({ error }, 'Erreur assistant');
      
      if (error instanceof Error && error.message.includes('Validation')) {
        return reply.status(400).send({
          intent: 'error',
          slots: {},
          reply: 'Je n\'ai pas compris votre demande. Pouvez-vous reformuler ?',
        });
      }
      
      return reply.code(500).send({
        intent: 'error',
        slots: {},
        reply: 'L\'assistant rencontre une difficulté technique.',
      });
    }
  });
  
  // Route pour démarrer une nouvelle session
  fastify.post<{
    Body: { sessionId: string };
    Reply: { status: string; sessionId: string; mode: string };
  }>('/api/assistant/session', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            sessionId: { type: 'string' },
            mode: { type: 'string' },
            capabilities: {
              type: 'object',
              properties: {
                voiceEnabled: { type: 'boolean' },
                mockMode: { type: 'boolean' },
                geminiAvailable: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { sessionId } = request.body;
      
      // Log du démarrage de session
      try {
        const userAgent = request.headers['user-agent'];
        const ipAddress = request.ip;
        
        await logSessionStart(sessionId, userAgent, ipAddress);
      } catch (auditError) {
        fastify.log.warn({ error: auditError }, 'Erreur audit démarrage session');
      }
      
      return {
        status: 'session_started',
        sessionId,
        mode: env.USE_MOCK ? 'mock' : 'live',
        capabilities: {
          voiceEnabled: true, // Web Speech API côté client
          mockMode: env.USE_MOCK,
          geminiAvailable: !env.USE_MOCK && isGeminiAvailable(),
        },
      };
      
    } catch (error) {
      fastify.log.error({ error }, 'Erreur démarrage session');
      return reply.code(500).send({
        status: 'error',
        sessionId: '',
        mode: 'unavailable',
      });
    }
  });
  
  // Route de test pour vérifier l'assistant
  fastify.get('/api/assistant/test', {
    schema: {
      description: 'Test de l\'assistant avec message par défaut',
      tags: ['assistant', 'test'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            mode: { type: 'string' },
            testResult: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const testRequest: AssistantRequest = {
        sessionId: 'test-session',
        message: 'Bonjour, je voudrais un crédit de 15000 euros',
      };
      
      let response: AssistantReply;
      
      if (env.USE_MOCK) {
        response = await processAssistantRequest(testRequest);
      } else {
        if (!isGeminiAvailable()) {
          return reply.code(503).send({
            status: 'error',
            mode: 'live',
            message: 'Gemini non disponible pour le test',
          });
        }
        response = await processGeminiRequest(testRequest);
      }
      
      return {
        status: 'success',
        mode: env.USE_MOCK ? 'mock' : 'live',
        testResult: {
          request: testRequest,
          response,
          message: 'Test assistant réussi',
        },
      };
      
    } catch (error) {
      fastify.log.error({ error }, 'Erreur test assistant');
      return reply.code(500).send({
        status: 'error',
        message: 'Test assistant échoué',
      });
    }
  });
};

export default assistantRoute;