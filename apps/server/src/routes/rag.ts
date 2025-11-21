import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RagQuerySchema } from '../rag/types.js';
import { buildIndexFromFolder, searchIndex, getRagIndexManager } from '../rag/index.js';
import { validateKnowledgeDirectory } from '../rag/knowledge-loader.js';

// ==========================================
// ROUTES RAG - ENDPOINTS RECHERCHE
// ==========================================

/**
 * Schéma pour la requête de reindex
 */
const ReindexRequestSchema = z.object({
  knowledgeDir: z.string().optional().default('knowledge'),
  force: z.boolean().optional().default(false),
});

/**
 * Schéma pour la réponse de reindex
 */
const ReindexResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  stats: z.object({
    totalDocs: z.number(),
    totalChunks: z.number(),
    avgChunkSize: z.number(),
    buildTime: z.number(),
    lastBuild: z.string(),
  }).optional(),
  errors: z.array(z.string()).optional(),
});

/**
 * Routes RAG
 */
export async function ragRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/rag/reindex
   * Reconstruit l'index RAG à partir du dossier de connaissances
   */
  fastify.post<{
    Body: z.infer<typeof ReindexRequestSchema>;
    Reply: z.infer<typeof ReindexResponseSchema>;
  }>('/api/rag/reindex', {
    schema: {
      body: {
        type: 'object',
        properties: {
          knowledgeDir: { 
            type: 'string', 
            default: 'knowledge',
            description: 'Dossier contenant les fichiers de connaissance' 
          },
          force: { 
            type: 'boolean', 
            default: false,
            description: 'Forcer la reconstruction même si un index existe' 
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                totalDocs: { type: 'number' },
                totalChunks: { type: 'number' },
                avgChunkSize: { type: 'number' },
                buildTime: { type: 'number' },
                lastBuild: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ReindexRequestSchema.parse(request.body);
      const { knowledgeDir, force } = body;

      fastify.log.info(`🔨 Début reindex RAG: dossier=${knowledgeDir}, force=${force}`);

      // Valider le dossier de connaissances
      const validation = await validateKnowledgeDirectory(knowledgeDir);
      
      if (!validation.isValid) {
        return reply.code(400).send({
          success: false,
          message: `Dossier de connaissances invalide: ${validation.error}`,
          errors: [validation.error || 'Dossier inaccessible'],
        });
      }

      // Vérifier si un index existe déjà
      const manager = getRagIndexManager();
      const indexExists = await manager.indexExists();
      
      if (indexExists && !force) {
        const stats = manager.getIndexStats();
        return reply.code(200).send({
          success: true,
          message: 'Index existant trouvé (utilisez force=true pour reconstruire)',
          stats: stats || undefined,
        });
      }

      // Construire l'index
      const stats = await buildIndexFromFolder(knowledgeDir);

      fastify.log.info({ stats }, '✅ Index RAG reconstruit avec succès');

      return reply.code(200).send({
        success: true,
        message: `Index reconstruit: ${stats.totalChunks} chunks de ${stats.totalDocs} documents`,
        stats,
      });

    } catch (error) {
      fastify.log.error({ error }, 'Erreur reindex RAG');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Paramètres invalides',
          errors: error.errors.map(e => e.message),
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Erreur lors de la reconstruction de l\'index',
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
      });
    }
  });

  /**
   * POST /api/rag/query
   * Recherche dans l'index RAG
   */
  fastify.post<{
    Body: z.infer<typeof RagQuerySchema>;
    Reply: { success: boolean; results?: any; message?: string; error?: string };
  }>('/api/rag/query', {
    schema: {
      body: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { 
            type: 'string', 
            minLength: 1, 
            maxLength: 500,
            description: 'Question ou requête de recherche' 
          },
          topK: { 
            type: 'number', 
            minimum: 1, 
            maximum: 20, 
            default: 5,
            description: 'Nombre maximum de résultats' 
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: {
              type: 'object',
              properties: {
                chunks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      docId: { type: 'string' },
                      title: { type: 'string' },
                      text: { type: 'string' },
                      score: { type: 'number' },
                      url: { type: 'string' },
                    },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = RagQuerySchema.parse(request.body);

      fastify.log.info(`🔍 Recherche RAG: "${query.q}" (topK=${query.topK})`);

      // Vérifier que l'index est disponible
      const manager = getRagIndexManager();
      
      if (!manager.isIndexAvailable()) {
        // Essayer de charger l'index
        const loaded = await manager.loadIndex();
        
        if (!loaded) {
          return reply.code(404).send({
            success: false,
            message: 'Index RAG non disponible. Exécutez /api/rag/reindex d\'abord.',
            error: 'INDEX_NOT_FOUND',
          });
        }
      }

      // Effectuer la recherche
      const results = await searchIndex(query.q, query.topK);

      fastify.log.info(`✅ Recherche terminée: ${results.chunks.length} résultats`);

      return reply.code(200).send({
        success: true,
        results,
        message: `${results.chunks.length} résultat(s) trouvé(s)`,
      });

    } catch (error) {
      fastify.log.error({ error }, 'Erreur recherche RAG');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Paramètres de recherche invalides',
          error: 'INVALID_QUERY',
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Erreur lors de la recherche',
        error: 'SEARCH_FAILED',
      });
    }
  });

  /**
   * GET /api/rag/status
   * Statut de l'index RAG
   */
  fastify.get('/api/rag/status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalDocs: { type: 'number' },
                totalChunks: { type: 'number' },
                avgChunkSize: { type: 'number' },
                lastBuild: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const manager = getRagIndexManager();
      
      // Essayer de charger l'index s'il n'est pas en mémoire
      if (!manager.isIndexAvailable()) {
        await manager.loadIndex();
      }
      
      const available = manager.isIndexAvailable();
      const stats = manager.getIndexStats();

      return reply.code(200).send({
        available,
        stats: stats || undefined,
        message: available 
          ? 'Index RAG disponible et opérationnel'
          : 'Index RAG non disponible - exécutez /api/rag/reindex',
      });

    } catch (error) {
      fastify.log.error({ error }, 'Erreur statut RAG');

      return reply.code(500).send({
        available: false,
        message: 'Erreur lors de la vérification du statut',
      });
    }
  });

  /**
   * DELETE /api/rag/index
   * Supprime l'index RAG
   */
  fastify.delete('/api/rag/index', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const manager = getRagIndexManager();
      await manager.deleteIndex();

      fastify.log.info('🗑️ Index RAG supprimé');

      return reply.code(200).send({
        success: true,
        message: 'Index RAG supprimé avec succès',
      });

    } catch (error) {
      fastify.log.error({ error }, 'Erreur suppression RAG');

      return reply.code(500).send({
        success: false,
        message: 'Erreur lors de la suppression de l\'index',
      });
    }
  });
}

export default ragRoutes;