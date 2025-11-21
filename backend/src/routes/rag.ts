/**
 * Endpoints API pour le système RAG
 * Routes pour upload, traitement, recherche et gestion des documents
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { smartRAGService, ragService } from '../services/rag';
import { logger } from '../logger';

// Types pour les requêtes
interface UploadDocumentRequest {
  Body: {
    content: string;
    fileName: string;
    mimeType: string;
    title?: string;
    description?: string;
    tags?: string[];
    language?: string;
  };
}

interface SearchRequest {
  Querystring: {
    q: string;
    limit?: string;
    threshold?: string;
    userId?: string;
    documentIds?: string;
    language?: string;
  };
}

interface GenerateResponseRequest {
  Body: {
    query: string;
    maxContextChunks?: number;
    searchOptions?: {
      limit?: number;
      threshold?: number;
      userId?: string;
      documentIds?: string[];
      language?: string;
    };
  };
}

interface DeleteDocumentRequest {
  Params: {
    documentId: string;
  };
}

/**
 * Enregistrement des routes RAG
 */
export async function ragRoutes(fastify: FastifyInstance) {
  
  // Upload et traitement d'un document (version JSON)
  fastify.post<UploadDocumentRequest>(
    '/rag/documents',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1 },
            fileName: { type: 'string', minLength: 1 },
            mimeType: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            language: { type: 'string', enum: ['en', 'fr', 'es', 'de'] },
          },
          required: ['content', 'fileName', 'mimeType'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              documentId: { type: 'string' },
              fileName: { type: 'string' },
              chunksCount: { type: 'number' },
              embeddingsGenerated: { type: 'number' },
              processingTimeMs: { type: 'number' },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<UploadDocumentRequest>, reply: FastifyReply) => {
      const requestId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_upload_request',
        requestId,
        fileName: request.body.fileName,
        mimeType: request.body.mimeType,
        contentLength: request.body.content.length,
      }, 'Processing document upload request');

      try {
        // Validation du type de fichier
        const allowedMimeTypes = [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/html',
          'application/json',
        ];

        if (!allowedMimeTypes.includes(request.body.mimeType)) {
          return reply.status(400).send({
            success: false,
            error: 'INVALID_FILE_TYPE',
            message: `File type ${request.body.mimeType} is not supported`,
          });
        }

        // Validation de la taille du contenu
        if (request.body.content.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'EMPTY_CONTENT',
            message: 'Document content is empty',
          });
        }

        // Limitation de taille (1MB pour le JSON)
        if (request.body.content.length > 1024 * 1024) {
          return reply.status(400).send({
            success: false,
            error: 'CONTENT_TOO_LARGE',
            message: 'Document content exceeds 1MB limit',
          });
        }

        // Conversion du contenu en Buffer
        const fileBuffer = Buffer.from(request.body.content, 'utf-8');

        // Préparation des métadonnées
        const metadata = {
          ...(request.body.title && { title: request.body.title }),
          ...(request.body.description && { description: request.body.description }),
          ...(request.body.tags && { tags: request.body.tags }),
          ...(request.body.language && { language: request.body.language }),
        };

        // Traitement du document via RAG
        const processingResult = await ragService.processDocument({
          originalname: request.body.fileName,
          buffer: fileBuffer,
          mimetype: request.body.mimeType,
          metadata
        });

        if (!processingResult.success) {
          return reply.status(500).send({
            success: false,
            error: 'PROCESSING_FAILED',
            message: processingResult.error || 'Document processing failed',
          });
        }

        logger.info({
          action: 'rag_upload_success',
          requestId,
          documentId: processingResult.document.id,
          chunksCount: processingResult.chunksCount,
          processingTimeMs: processingResult.processingTimeMs,
        }, 'Document upload and processing completed successfully');

        return reply.send({
          success: true,
          documentId: processingResult.document.id,
          fileName: processingResult.document.fileName,
          chunksCount: processingResult.chunksCount,
          embeddingsGenerated: processingResult.embeddingsGenerated,
          processingTimeMs: processingResult.processingTimeMs,
          message: 'Document processed successfully',
        });

      } catch (error) {
        logger.error({
          action: 'rag_upload_error',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Document upload failed');

        return reply.status(500).send({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Internal server error during document processing',
        });
      }
    }
  );

  // Recherche sémantique
  fastify.get<SearchRequest>(
    '/rag/search',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
            threshold: { type: 'string', pattern: '^0\\.[0-9]+$|^1\\.0$' },
            userId: { type: 'string' },
            documentIds: { type: 'string' },
            language: { type: 'string' },
          },
          required: ['q'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              query: { type: 'string' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    similarity: { type: 'number' },
                    rank: { type: 'number' },
                    document: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        metadata: { type: 'object' },
                      },
                    },
                  },
                },
              },
              totalResults: { type: 'number' },
              processingTimeMs: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<SearchRequest>, reply: FastifyReply) => {
      const requestId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_search_request',
        requestId,
        query: request.query.q,
        querystring: request.query,
      }, 'Processing search request');

      try {
        const searchOptions = {
          ...(request.query.limit && { limit: parseInt(request.query.limit) }),
          ...(request.query.threshold && { threshold: parseFloat(request.query.threshold) }),
          ...(request.query.userId && { userId: request.query.userId }),
          ...(request.query.documentIds && { documentIds: request.query.documentIds.split(',') }),
          ...(request.query.language && { language: request.query.language }),
        };

        const searchResult = await ragService.searchKnowledge(request.query.q, searchOptions);

        logger.info({
          action: 'rag_search_success',
          requestId,
          resultsCount: searchResult.totalResults,
          processingTimeMs: searchResult.processingTimeMs,
        }, 'Search completed successfully');

        return reply.send({
          success: true,
          query: searchResult.query,
          results: searchResult.results,
          totalResults: searchResult.totalResults,
          processingTimeMs: searchResult.processingTimeMs,
        });

      } catch (error) {
        logger.error({
          action: 'rag_search_error',
          requestId,
          query: request.query.q,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Search failed');

        return reply.status(500).send({
          success: false,
          error: 'SEARCH_FAILED',
          message: 'Search request failed',
        });
      }
    }
  );

  // Génération de réponse augmentée
  fastify.post<GenerateResponseRequest>(
    '/rag/generate',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1 },
            maxContextChunks: { type: 'number', minimum: 1, maximum: 20 },
            searchOptions: {
              type: 'object',
              properties: {
                limit: { type: 'number', minimum: 1, maximum: 50 },
                threshold: { type: 'number', minimum: 0, maximum: 1 },
                userId: { type: 'string' },
                documentIds: { type: 'array', items: { type: 'string' } },
                language: { type: 'string' },
              },
            },
          },
          required: ['query'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              query: { type: 'string' },
              response: { type: 'string' },
              confidence: { type: 'number' },
              sourcesCount: { type: 'number' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    similarity: { type: 'number' },
                    rank: { type: 'number' },
                    document: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        documentId: { type: 'string' },
                        content: { type: 'string' },
                        metadata: { type: 'object' },
                      },
                    },
                  },
                },
              },
              processingTimeMs: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<GenerateResponseRequest>, reply: FastifyReply) => {
      const requestId = `generate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_generate_request',
        requestId,
        query: request.body.query,
        maxContextChunks: request.body.maxContextChunks,
      }, 'Processing response generation request');

      try {
        // Étape 1: Rechercher les documents pertinents
        const searchResults = await ragService.searchKnowledge(
          request.body.query,
          request.body.searchOptions || {}
        );

        logger.info({
          action: 'rag_generate_search_complete',
          requestId,
          resultsFound: searchResults.results.length,
        }, 'Search completed for generation');

        // Étape 2: Générer la réponse avec les sources trouvées
        const result = await ragService.generateAugmentedResponse(
          request.body.query,
          searchResults.results,
          request.body.searchOptions
        );

        logger.info({
          action: 'rag_generate_success',
          requestId,
          confidence: result.confidence,
          sourcesCount: result.sources.length,
          processingTimeMs: result.processingTimeMs,
        }, 'Response generation completed successfully');

        return reply.send({
          success: true,
          query: request.body.query,
          response: result.response,
          confidence: result.confidence,
          sourcesCount: result.sources.length,
          sources: result.sources,
          processingTimeMs: result.processingTimeMs,
        });

      } catch (error) {
        logger.error({
          action: 'rag_generate_error',
          requestId,
          query: request.body.query,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Response generation failed');

        return reply.status(500).send({
          success: false,
          error: 'GENERATION_FAILED',
          message: 'Response generation failed',
        });
      }
    }
  );

  // Suppression d'un document
  fastify.delete<DeleteDocumentRequest>(
    '/rag/documents/:documentId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            documentId: { type: 'string', minLength: 1 },
          },
          required: ['documentId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              documentId: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<DeleteDocumentRequest>, reply: FastifyReply) => {
      const requestId = `delete_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_delete_request',
        requestId,
        documentId: request.params.documentId,
      }, 'Processing document deletion request');

      try {
        await ragService.deleteDocument(request.params.documentId);

        logger.info({
          action: 'rag_delete_success',
          requestId,
          documentId: request.params.documentId,
        }, 'Document deletion completed successfully');

        return reply.send({
          success: true,
          documentId: request.params.documentId,
          message: 'Document deleted successfully',
        });

      } catch (error) {
        logger.error({
          action: 'rag_delete_error',
          requestId,
          documentId: request.params.documentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Document deletion failed');

        return reply.status(500).send({
          success: false,
          error: 'DELETION_FAILED',
          message: 'Document deletion failed',
        });
      }
    }
  );

  // Statistiques du système RAG
  fastify.get(
    '/rag/stats',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              stats: {
                type: 'object',
                properties: {
                  totalDocuments: { type: 'number' },
                  totalChunks: { type: 'number' },
                  totalEmbeddings: { type: 'number' },
                  processingQueue: { type: 'number' },
                  indexHealth: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
                  lastUpdate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = `stats_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_stats_request',
        requestId,
      }, 'Processing stats request');

      try {
        const stats = await ragService.getSystemStats();

        logger.info({
          action: 'rag_stats_success',
          requestId,
          stats,
        }, 'Stats retrieval completed successfully');

        return reply.send({
          success: true,
          stats,
        });

      } catch (error) {
        logger.error({
          action: 'rag_stats_error',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Stats retrieval failed');

        return reply.status(500).send({
          success: false,
          error: 'STATS_FAILED',
          message: 'Stats retrieval failed',
        });
      }
    }
  );

  // Test de santé des services RAG
  fastify.get(
    '/rag/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              services: {
                type: 'object',
                properties: {
                  embeddings: { type: 'boolean' },
                  storage: { type: 'object' },
                  vectorDb: { type: 'boolean' },
                },
              },
              overallHealth: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = `health_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      logger.info({
        action: 'rag_health_request',
        requestId,
      }, 'Processing health check request');

      try {
        // Test des services directement via les singletons
        const [embeddingsTest, storageTest, vectorDbTest] = await Promise.allSettled([
          import('../services/rag/embeddings').then(m => m.vertexEmbeddingsService.testConnection()),
          import('../services/rag/storage').then(m => m.documentStorageService.testConnection()),
          import('../services/rag/vector-db').then(m => m.vectorDatabaseService.getIndexStats()),
        ]);

        const services = {
          embeddings: embeddingsTest.status === 'fulfilled' && embeddingsTest.value,
          storage: storageTest.status === 'fulfilled' ? storageTest.value : { success: false },
          vectorDb: vectorDbTest.status === 'fulfilled',
        };

        // Calcul de la santé globale
        let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
        
        const healthyServices = [
          services.embeddings,
          services.storage.success,
          services.vectorDb,
        ].filter(Boolean).length;

        if (healthyServices === 0) {
          overallHealth = 'critical';
        } else if (healthyServices < 3) {
          overallHealth = 'degraded';
        }

        logger.info({
          action: 'rag_health_success',
          requestId,
          services,
          overallHealth,
        }, 'Health check completed successfully');

        return reply.send({
          success: true,
          services,
          overallHealth,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error({
          action: 'rag_health_error',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Health check failed');

        return reply.status(500).send({
          success: false,
          error: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
        });
      }
    }
  );
}