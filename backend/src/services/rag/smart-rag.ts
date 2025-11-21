/**
 * Service de bascule entre simulation et persistance réelle
 * Configuration flexible pour démonstration N+1
 */

import { logger } from '../../logger';
import { DocumentChunk } from './chunking';
import { VectorDocument, SearchResult, SearchOptions, IndexStats } from './vector-db';

// Services
import { vertexEmbeddingsService } from './embeddings';
import { VertexEmbeddingsService } from './embeddings-real';
import { vectorDatabaseService } from './vector-db';
import { realVectorDatabaseService } from './vector-db-real';

// Configuration via variables d'environnement
const USE_REAL_EMBEDDINGS = process.env.USE_REAL_EMBEDDINGS === 'true';
const USE_REAL_VECTOR_DB = process.env.USE_REAL_VECTOR_DB === 'true';

// Mode démo : permet de basculer à chaud
let DEMO_MODE_REAL_EMBEDDINGS = USE_REAL_EMBEDDINGS;
let DEMO_MODE_REAL_VECTOR_DB = USE_REAL_VECTOR_DB;

interface EmbeddingResponse {
  values: number[];
  statistics: {
    token_count: number;
    truncated: boolean;
  };
}

export class SmartRAGService {
  private realEmbeddingsService: VertexEmbeddingsService;

  constructor() {
    this.realEmbeddingsService = new VertexEmbeddingsService();
    
    logger.info({
      action: 'smart_rag_service_init',
      realEmbeddings: DEMO_MODE_REAL_EMBEDDINGS,
      realVectorDB: DEMO_MODE_REAL_VECTOR_DB,
      mode: this.getCurrentMode(),
    }, 'Smart RAG Service initialized');
  }

  /**
   * Configuration à chaud pour démo
   */
  setDemoMode(realEmbeddings: boolean, realVectorDB: boolean): void {
    DEMO_MODE_REAL_EMBEDDINGS = realEmbeddings;
    DEMO_MODE_REAL_VECTOR_DB = realVectorDB;
    
    logger.info({
      action: 'demo_mode_changed',
      realEmbeddings: DEMO_MODE_REAL_EMBEDDINGS,
      realVectorDB: DEMO_MODE_REAL_VECTOR_DB,
      mode: this.getCurrentMode(),
    }, 'Demo mode configuration changed');
  }

  /**
   * Récupère le mode actuel
   */
  getCurrentMode(): string {
    if (DEMO_MODE_REAL_EMBEDDINGS && DEMO_MODE_REAL_VECTOR_DB) {
      return 'PRODUCTION_READY';
    } else if (DEMO_MODE_REAL_EMBEDDINGS && !DEMO_MODE_REAL_VECTOR_DB) {
      return 'HYBRID_REAL_EMBEDDINGS';
    } else if (!DEMO_MODE_REAL_EMBEDDINGS && DEMO_MODE_REAL_VECTOR_DB) {
      return 'HYBRID_REAL_STORAGE';
    } else {
      return 'DEVELOPMENT_SIMULATION';
    }
  }

  /**
   * Génération d'embeddings intelligente
   */
  async generateDocumentEmbeddings(text: string, title?: string): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      let result: EmbeddingResponse;
      
      if (DEMO_MODE_REAL_EMBEDDINGS) {
        logger.info('Using REAL Vertex AI embeddings');
        result = await this.realEmbeddingsService.generateDocumentEmbeddings(text, title);
      } else {
        logger.info('Using SIMULATED embeddings');
        result = await vertexEmbeddingsService.generateDocumentEmbeddings(text, title);
      }

      const processingTime = Date.now() - startTime;
      
      logger.info({
        action: 'smart_embeddings_generated',
        mode: DEMO_MODE_REAL_EMBEDDINGS ? 'REAL' : 'SIMULATED',
        textLength: text.length,
        embeddingDimension: result.values.length,
        processingTime,
      }, 'Smart embeddings generated');

      return result;

    } catch (error) {
      logger.error({
        action: 'smart_embeddings_error',
        mode: DEMO_MODE_REAL_EMBEDDINGS ? 'REAL' : 'SIMULATED',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Smart embeddings generation failed');

      // Fallback vers simulation en cas d'erreur
      if (DEMO_MODE_REAL_EMBEDDINGS) {
        logger.warn('Falling back to simulated embeddings');
        return await vertexEmbeddingsService.generateDocumentEmbeddings(text, title);
      }
      
      throw error;
    }
  }

  /**
   * Génération d'embeddings de requête intelligente
   */
  async generateQueryEmbeddings(query: string): Promise<EmbeddingResponse> {
    try {
      if (DEMO_MODE_REAL_EMBEDDINGS) {
        return await this.realEmbeddingsService.generateQueryEmbeddings(query);
      } else {
        return await vertexEmbeddingsService.generateQueryEmbeddings(query);
      }
    } catch (error) {
      if (DEMO_MODE_REAL_EMBEDDINGS) {
        logger.warn('Falling back to simulated query embeddings');
        return await vertexEmbeddingsService.generateQueryEmbeddings(query);
      }
      throw error;
    }
  }

  /**
   * Stockage intelligent de chunks
   */
  async storeChunk(chunk: DocumentChunk, embedding: number[]): Promise<void> {
    try {
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.info('Using REAL Firestore storage');
        await realVectorDatabaseService.storeChunk(chunk, embedding);
      } else {
        logger.info('Using SIMULATED storage');
        await vectorDatabaseService.storeChunk(chunk, embedding);
      }

      logger.info({
        action: 'smart_chunk_stored',
        mode: DEMO_MODE_REAL_VECTOR_DB ? 'REAL' : 'SIMULATED',
        chunkId: chunk.id,
        documentId: chunk.metadata.documentId,
      }, 'Smart chunk storage completed');

    } catch (error) {
      logger.error({
        action: 'smart_chunk_storage_error',
        mode: DEMO_MODE_REAL_VECTOR_DB ? 'REAL' : 'SIMULATED',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Smart chunk storage failed');

      // Fallback vers simulation
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.warn('Falling back to simulated storage');
        await vectorDatabaseService.storeChunk(chunk, embedding);
      } else {
        throw error;
      }
    }
  }

  /**
   * Stockage en batch intelligent
   */
  async storeBatch(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    try {
      if (DEMO_MODE_REAL_VECTOR_DB) {
        await realVectorDatabaseService.storeBatch(chunks, embeddings);
      } else {
        await vectorDatabaseService.storeBatch(chunks, embeddings);
      }

      logger.info({
        action: 'smart_batch_stored',
        mode: DEMO_MODE_REAL_VECTOR_DB ? 'REAL' : 'SIMULATED',
        batchSize: chunks.length,
      }, 'Smart batch storage completed');

    } catch (error) {
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.warn('Falling back to simulated batch storage');
        await vectorDatabaseService.storeBatch(chunks, embeddings);
      } else {
        throw error;
      }
    }
  }

  /**
   * Recherche vectorielle intelligente
   */
  async searchSimilar(queryEmbedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    try {
      let results: SearchResult[];
      
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.info('Using REAL vector search');
        results = await realVectorDatabaseService.searchSimilar(queryEmbedding, options);
      } else {
        logger.info('Using SIMULATED vector search');
        results = await vectorDatabaseService.searchSimilar(queryEmbedding, options);
      }

      logger.info({
        action: 'smart_search_completed',
        mode: DEMO_MODE_REAL_VECTOR_DB ? 'REAL' : 'SIMULATED',
        resultsCount: results.length,
        avgSimilarity: results.length > 0 ? 
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length : 0,
      }, 'Smart vector search completed');

      return results;

    } catch (error) {
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.warn('Falling back to simulated search');
        return await vectorDatabaseService.searchSimilar(queryEmbedding, options);
      }
      throw error;
    }
  }

  /**
   * Statistiques intelligentes
   */
  async getIndexStats(): Promise<IndexStats & { mode: string; costEstimation?: any }> {
    try {
      let stats: IndexStats;
      
      if (DEMO_MODE_REAL_VECTOR_DB) {
        stats = await realVectorDatabaseService.getIndexStats();
      } else {
        stats = await vectorDatabaseService.getIndexStats();
      }

      // Ajouter estimation des coûts si mode réel
      let costEstimation;
      if (DEMO_MODE_REAL_VECTOR_DB && DEMO_MODE_REAL_EMBEDDINGS) {
        // Estimation basée sur les stats
        const estimatedReads = stats.totalChunks * 2; // Recherches typiques
        const estimatedWrites = stats.totalChunks; // Écritures une fois
        const estimatedStorage = stats.totalChunks * 0.001; // ~1KB per chunk

        costEstimation = realVectorDatabaseService.getCostEstimation({
          reads: estimatedReads,
          writes: estimatedWrites,
          storage_gb: estimatedStorage,
        });
      }

      return {
        ...stats,
        mode: this.getCurrentMode(),
        costEstimation,
      };

    } catch (error) {
      if (DEMO_MODE_REAL_VECTOR_DB) {
        logger.warn('Falling back to simulated stats');
        const stats = await vectorDatabaseService.getIndexStats();
        return {
          ...stats,
          mode: 'FALLBACK_SIMULATION',
        };
      }
      throw error;
    }
  }

  /**
   * Test de connectivité intelligent
   */
  async testConnections(): Promise<{
    embeddings: { real: boolean; simulated: boolean };
    vectorDB: { real: boolean; simulated: boolean };
    currentMode: string;
    recommendations: string[];
  }> {
    const results = {
      embeddings: {
        real: false,
        simulated: false,
      },
      vectorDB: {
        real: false,
        simulated: false,
      },
      currentMode: this.getCurrentMode(),
      recommendations: [] as string[],
    };

    // Test embeddings
    try {
      results.embeddings.real = await this.realEmbeddingsService.testConnection();
    } catch (error) {
      logger.warn('Real embeddings test failed');
    }

    try {
      results.embeddings.simulated = await vertexEmbeddingsService.testConnection();
    } catch (error) {
      logger.warn('Simulated embeddings test failed');
    }

    // Test vector DB
    try {
      results.vectorDB.real = await realVectorDatabaseService.testConnection();
    } catch (error) {
      logger.warn('Real vector DB test failed');
    }

    try {
      results.vectorDB.simulated = await vectorDatabaseService.getIndexStats() !== null;
    } catch (error) {
      logger.warn('Simulated vector DB test failed');
    }

    // Recommandations
    if (results.embeddings.real && results.vectorDB.real) {
      results.recommendations.push('✅ Ready for FULL PRODUCTION mode');
      results.recommendations.push('💰 Estimated cost: $3.50/month for MVP');
    } else if (results.embeddings.real && !results.vectorDB.real) {
      results.recommendations.push('⚡ Ready for HYBRID mode (real embeddings)');
      results.recommendations.push('💰 Estimated cost: $0.10/month');
    } else if (!results.embeddings.real && results.vectorDB.real) {
      results.recommendations.push('🔧 Storage ready, configure Vertex AI');
    } else {
      results.recommendations.push('🧪 Development mode - simulation working');
      results.recommendations.push('📚 Perfect for learning and testing');
    }

    return results;
  }

  /**
   * Endpoint pour démo : bascule en temps réel
   */
  async demoToggleMode(mode: 'simulation' | 'hybrid_embeddings' | 'hybrid_storage' | 'production'): Promise<{
    previousMode: string;
    newMode: string;
    message: string;
  }> {
    const previousMode = this.getCurrentMode();

    switch (mode) {
      case 'simulation':
        this.setDemoMode(false, false);
        break;
      case 'hybrid_embeddings':
        this.setDemoMode(true, false);
        break;
      case 'hybrid_storage':
        this.setDemoMode(false, true);
        break;
      case 'production':
        this.setDemoMode(true, true);
        break;
    }

    const newMode = this.getCurrentMode();
    
    return {
      previousMode,
      newMode,
      message: `Switched from ${previousMode} to ${newMode}`,
    };
  }
}

// Instance singleton
export const smartRAGService = new SmartRAGService();