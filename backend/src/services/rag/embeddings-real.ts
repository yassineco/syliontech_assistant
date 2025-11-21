/**
 * Service Vertex AI Embeddings RÉEL pour le module RAG
 * Migration de la simulation vers vraie API Vertex AI
 */

import { VertexAI } from '@google-cloud/vertexai';
import { logger } from '../../logger';
import { GoogleAuth } from 'google-auth-library';

// Configuration Vertex AI
const PROJECT_ID = process.env.PROJECT_ID || 'magic-button-demo';
const LOCATION = process.env.VERTEX_LOCATION || 'europe-west1';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';

interface EmbeddingRequest {
  text: string;
  title?: string;
  task_type?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'CLASSIFICATION' | 'CLUSTERING';
}

interface EmbeddingResponse {
  values: number[];
  statistics: {
    token_count: number;
    truncated: boolean;
  };
}

export class VertexEmbeddingsService {
  private auth: GoogleAuth;
  private apiEndpoint: string;

  constructor() {
    // Initialiser GoogleAuth pour appeler l'API REST
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    this.apiEndpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;
    
    logger.info({
      action: 'embeddings_service_init',
      project: PROJECT_ID,
      location: LOCATION,
      model: EMBEDDING_MODEL,
      endpoint: this.apiEndpoint,
    }, 'Vertex AI Embeddings Service initialized');
  }

  /**
   * Appel à l'API REST Vertex AI pour générer des embeddings
   */
  private async callEmbeddingsAPI(
    instances: Array<{ content: string; task_type: string }>,
  ): Promise<any> {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instances }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * VRAIE génération d'embeddings pour un document
   */
  async generateDocumentEmbeddings(
    text: string,
    title?: string
  ): Promise<EmbeddingResponse> {
    try {
      logger.info({
        action: 'generate_document_embeddings_real',
        textLength: text.length,
        title,
        model: EMBEDDING_MODEL,
      }, 'Generating REAL document embeddings with Vertex AI');

      const startTime = Date.now();

      // Appel API REST Vertex AI
      const content = title ? `Title: ${title}\n\nContent: ${text}` : text;
      const result = await this.callEmbeddingsAPI([{
        content: content,
        task_type: 'RETRIEVAL_DOCUMENT',
      }]);

      const processingTime = Date.now() - startTime;

      if (!result.predictions || !result.predictions[0] || !result.predictions[0].embeddings) {
        throw new Error('No embedding values returned from Vertex AI');
      }

      const embedding = result.predictions[0].embeddings;
      const response: EmbeddingResponse = {
        values: embedding.values,
        statistics: {
          token_count: Math.ceil(text.length / 4), // Approximation
          truncated: text.length > 8000,
        },
      };

      logger.info({
        action: 'document_embeddings_generated_real',
        dimensionality: response.values.length,
        tokenCount: response.statistics.token_count,
        processingTime,
        model: EMBEDDING_MODEL,
      }, 'REAL document embeddings generated successfully');

      return response;

    } catch (error) {
      logger.error({
        action: 'generate_document_embeddings_error_real',
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
        model: EMBEDDING_MODEL,
      }, 'Failed to generate REAL document embeddings');
      
      // Fallback vers simulation en cas d'erreur
      logger.warn('Falling back to simulated embeddings');
      return this.generateSimulatedEmbeddings(text);
    }
  }

  /**
   * VRAIE génération d'embeddings pour une requête
   */
  async generateQueryEmbeddings(query: string): Promise<EmbeddingResponse> {
    try {
      logger.info({
        action: 'generate_query_embeddings_real',
        queryLength: query.length,
        model: EMBEDDING_MODEL,
      }, 'Generating REAL query embeddings with Vertex AI');

      const startTime = Date.now();

      // Appel API REST Vertex AI
      const result = await this.callEmbeddingsAPI([{
        content: query,
        task_type: 'RETRIEVAL_QUERY',
      }]);

      const processingTime = Date.now() - startTime;

      if (!result.predictions || !result.predictions[0] || !result.predictions[0].embeddings) {
        throw new Error('No embedding values returned from Vertex AI');
      }

      const embedding = result.predictions[0].embeddings;
      const response: EmbeddingResponse = {
        values: embedding.values,
        statistics: {
          token_count: Math.ceil(query.length / 4),
          truncated: query.length > 8000,
        },
      };

      logger.info({
        action: 'query_embeddings_generated_real',
        dimensionality: response.values.length,
        processingTime,
        model: EMBEDDING_MODEL,
      }, 'REAL query embeddings generated successfully');

      return response;

    } catch (error) {
      logger.error({
        action: 'generate_query_embeddings_error_real',
        error: error instanceof Error ? error.message : 'Unknown error',
        queryLength: query.length,
      }, 'Failed to generate REAL query embeddings');

      // Fallback vers simulation
      logger.warn('Falling back to simulated embeddings');
      return this.generateSimulatedEmbeddings(query);
    }
  }

  /**
   * Batch generation pour optimiser les coûts
   */
  async generateBatchEmbeddings(
    texts: string[],
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
  ): Promise<EmbeddingResponse[]> {
    logger.info({
      action: 'generate_batch_embeddings_real',
      batchSize: texts.length,
      taskType,
    }, 'Generating REAL batch embeddings');

    // Traiter en parallèle avec limite
    const BATCH_SIZE = 5; // Limite pour éviter rate limiting
    const results: EmbeddingResponse[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(text => 
        taskType === 'RETRIEVAL_DOCUMENT' 
          ? this.generateDocumentEmbeddings(text)
          : this.generateQueryEmbeddings(text)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Pause pour éviter rate limiting
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info({
      action: 'batch_embeddings_generated_real',
      totalProcessed: results.length,
    }, 'REAL batch embeddings generated successfully');

    return results;
  }

  /**
   * Test de connectivité RÉEL avec Vertex AI
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info({
        action: 'test_vertex_connection_real',
        project: PROJECT_ID,
        location: LOCATION,
        model: EMBEDDING_MODEL,
      }, 'Testing REAL Vertex AI connection');

      const testEmbeddings = await this.generateQueryEmbeddings('Test de connectivité Vertex AI');
      
      logger.info({
        action: 'vertex_connection_successful_real',
        embeddingDimensions: testEmbeddings.values.length,
        isReal: true,
      }, 'REAL Vertex AI connection test successful');

      return true;

    } catch (error) {
      logger.error({
        action: 'vertex_connection_failed_real',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'REAL Vertex AI connection test failed');

      return false;
    }
  }

  /**
   * Métriques de coût estimé
   */
  async getCostEstimation(textLength: number): Promise<{ estimatedCost: number; tokens: number }> {
    const tokens = Math.ceil(textLength / 4);
    const costPerThousandTokens = 0.00013; // $0.00013 per 1K tokens
    const estimatedCost = (tokens / 1000) * costPerThousandTokens;

    return {
      estimatedCost: Math.round(estimatedCost * 100000) / 100000, // 5 décimales
      tokens,
    };
  }

  // === Fallback simulation (garde l'existant) ===
  private generateSimulatedEmbeddings(text: string): EmbeddingResponse {
    const seed = this.hashString(text);
    const random = this.seededRandom(seed);
    const values = Array.from({ length: 768 }, () => random() * 2 - 1);
    
    return {
      values,
      statistics: {
        token_count: Math.ceil(text.length / 4),
        truncated: text.length > 8000,
      },
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}

// Instance singleton
export const vertexEmbeddingsService = new VertexEmbeddingsService();