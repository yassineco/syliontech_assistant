/**
 * Endpoint de démonstration RAG
 * Configuration à chaud pour présentation N+1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { smartRAGService } from '../services/rag';
import { logger } from '../logger';

interface DemoRequest {
  Body: {
    query?: string;
    mode?: 'production';
    action?: 'search' | 'toggle_mode' | 'status' | 'test_connections' | 'cost_analysis';
  };
}

export const demoRoutes = async (fastify: FastifyInstance) => {
  // Prefix pour tous les endpoints de démo
  await fastify.register(async function (fastify) {
    // Status de la démo
    fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await smartRAGService.getIndexStats();
        const connections = await smartRAGService.testConnections();
        
        return {
          success: true,
          data: {
            currentMode: smartRAGService.getCurrentMode(),
            statistics: stats,
            connections,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        logger.error('Demo status error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Test de connectivité
    fastify.get('/test-connections', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const connections = await smartRAGService.testConnections();
        
        return {
          success: true,
          data: connections,
        };
      } catch (error) {
        logger.error('Demo connections test error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Bascule de mode en temps réel
    fastify.post('/toggle-mode', async (request: FastifyRequest<DemoRequest>, reply: FastifyReply) => {
      try {
        const { mode = 'production' } = request.body;
        
        // Force le mode production uniquement
        if (mode !== 'production') {
          return reply.status(400).send({
            success: false,
            error: 'Only production mode is supported. Simulation modes have been removed.',
          });
        }

        const result = await smartRAGService.demoToggleMode(mode);
        
        logger.info({
          action: 'demo_mode_toggle',
          previousMode: result.previousMode,
          newMode: result.newMode,
        }, 'Demo mode toggled');

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Demo mode toggle error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Recherche de démonstration
    fastify.post('/search', async (request: FastifyRequest<DemoRequest>, reply: FastifyReply) => {
      try {
        const { query } = request.body;
        
        if (!query) {
          return reply.status(400).send({
            success: false,
            error: 'Query is required',
          });
        }

        const startTime = Date.now();
        
        // Générer embedding
        const embeddingResponse = await smartRAGService.generateQueryEmbeddings(query);
        
        // Recherche vectorielle
        const searchResults = await smartRAGService.searchSimilar(
          embeddingResponse.values,
          {
            limit: 5,
            threshold: 0.3,
            includeMetadata: true,
          }
        );

        const processingTime = Date.now() - startTime;

        logger.info({
          action: 'demo_search',
          query,
          mode: smartRAGService.getCurrentMode(),
          resultsCount: searchResults.length,
          processingTime,
        }, 'Demo search completed');

        return {
          success: true,
          data: {
            query,
            mode: smartRAGService.getCurrentMode(),
            results: searchResults,
            metadata: {
              processingTime,
              embeddingDimension: embeddingResponse.values.length,
              tokenCount: embeddingResponse.statistics.token_count,
              truncated: embeddingResponse.statistics.truncated,
            },
          },
        };
      } catch (error) {
        logger.error('Demo search error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Analyse des coûts en temps réel
    fastify.get('/cost-analysis', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await smartRAGService.getIndexStats();
        const currentMode = smartRAGService.getCurrentMode();

        // Estimation basée sur les stats actuelles
        const estimatedUsage = {
          chunks: stats.totalChunks || 100,
          searches_per_day: 50,
          embeddings_per_day: 10,
        };

        // Calculs de coûts (mode production uniquement)
        const costAnalysis = {
          currentMode,
          estimatedUsage,
          monthlyCosts: {
            production: {
              embeddings: estimatedUsage.embeddings_per_day * 30 * 0.0001, // $0.0001 per 1K tokens
              storage: (estimatedUsage.chunks * 0.001) * 0.18, // $0.18 per GB/month
              operations: (estimatedUsage.searches_per_day * 30) * 0.0006, // $0.0006 per read
              total: 0,
            },
          },
          roi: 'Immediate value through real Vertex AI persistence',
        };

        // Calculer totaux
        costAnalysis.monthlyCosts.production.total = 
          costAnalysis.monthlyCosts.production.embeddings +
          costAnalysis.monthlyCosts.production.storage +
          costAnalysis.monthlyCosts.production.operations;

        return {
          success: true,
          data: costAnalysis,
        };
      } catch (error) {
        logger.error('Demo cost analysis error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Pipeline de démonstration complet
    fastify.post('/demo-pipeline', async (request: FastifyRequest<{ Body: { text: string; title?: string } }>, reply: FastifyReply) => {
      try {
        const { text, title = 'Demo Document' } = request.body;
        
        if (!text) {
          return reply.status(400).send({
            success: false,
            error: 'Text content is required',
          });
        }

        const startTime = Date.now();
        const currentMode = smartRAGService.getCurrentMode();

        logger.info({
          action: 'demo_pipeline_start',
          mode: currentMode,
          textLength: text.length,
        }, 'Starting demo pipeline');

        // Étape 1: Génération d'embeddings
        const embeddingResponse = await smartRAGService.generateDocumentEmbeddings(text, title);
        
        // Étape 2: Création d'un chunk de démo
        const demoChunk = {
          id: `demo_${Date.now()}`,
          content: text,
          createdAt: new Date(),
          metadata: {
            documentId: `demo_doc_${Date.now()}`,
            documentTitle: title,
            chunkIndex: 0,
            startPosition: 0,
            endPosition: text.length,
            tokenCount: Math.ceil(text.length / 4), // Estimation
            wordCount: text.split(/\s+/).length,
            language: 'fr',
            section: 'demo',
          },
        };

        // Étape 3: Stockage
        await smartRAGService.storeChunk(demoChunk, embeddingResponse.values);

        // Étape 4: Test de recherche
        const searchResults = await smartRAGService.searchSimilar(
          embeddingResponse.values,
          { limit: 3, threshold: 0.1, includeMetadata: true }
        );

        const processingTime = Date.now() - startTime;

        logger.info({
          action: 'demo_pipeline_complete',
          mode: currentMode,
          processingTime,
          searchResultsCount: searchResults.length,
        }, 'Demo pipeline completed');

        return {
          success: true,
          data: {
            mode: currentMode,
            steps: {
              '1_embedding': {
                dimension: embeddingResponse.values.length,
                tokenCount: embeddingResponse.statistics.token_count,
                truncated: embeddingResponse.statistics.truncated,
              },
              '2_storage': {
                chunkId: demoChunk.id,
                stored: true,
              },
              '3_search': {
                resultsFound: searchResults.length,
                topSimilarity: searchResults[0]?.similarity || 0,
              },
            },
            processingTime,
            recommendations: currentMode === 'PRODUCTION_READY' 
              ? ['✅ Production ready!', '💰 Cost: ~$3.50/year', '🚀 Real persistence active']
              : ['🧪 Development mode', '🔄 Switch to production for real persistence'],
          },
        };
      } catch (error) {
        logger.error('Demo pipeline error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

  }, { prefix: '/demo' });
};