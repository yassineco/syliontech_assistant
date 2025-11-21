/**
 * Service Vertex AI Embeddings pour le module RAG
 * Génération d'embeddings vectoriels pour recherche sémantique
 */

import { logger } from '../../logger';

// Configuration Vertex AI
const PROJECT_ID = process.env.PROJECT_ID || 'magic-button-demo';
const LOCATION = 'us-central1'; // Vertex AI disponible uniquement dans certaines régions

// Modèle d'embeddings recommandé pour texte multilingue
const EMBEDDING_MODEL = 'text-embedding-004';

interface EmbeddingRequest {
  text: string;
  title?: string | undefined;
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
  private projectId: string;
  private location: string;
  private model: string;

  constructor() {
    this.projectId = PROJECT_ID;
    this.location = LOCATION;
    this.model = EMBEDDING_MODEL;
  }

  /**
   * Génère des embeddings pour un document (chunking + vectorisation)
   * TODO: Remplacer par vraie intégration Vertex AI
   */
  async generateDocumentEmbeddings(
    text: string,
    title?: string
  ): Promise<EmbeddingResponse> {
    try {
      logger.info({
        action: 'generate_document_embeddings',
        textLength: text.length,
        title,
      }, 'Generating document embeddings');

      // Simulation temporaire - à remplacer par vraie API Vertex AI
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call

      const embeddings = this.generateSimulatedEmbeddings(text);
      
      logger.info({
        action: 'document_embeddings_generated',
        dimensionality: embeddings.values.length,
        tokenCount: embeddings.statistics.token_count,
      }, 'Document embeddings generated successfully');

      return embeddings;

    } catch (error) {
      logger.error({
        action: 'generate_document_embeddings_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
      }, 'Failed to generate document embeddings');
      
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Génère des embeddings pour une requête de recherche
   * TODO: Remplacer par vraie intégration Vertex AI
   */
  async generateQueryEmbeddings(query: string): Promise<EmbeddingResponse> {
    try {
      logger.info({
        action: 'generate_query_embeddings',
        queryLength: query.length,
      }, 'Generating query embeddings');

      // Simulation temporaire - à remplacer par vraie API Vertex AI
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call

      const embeddings = this.generateSimulatedEmbeddings(query);
      
      logger.info({
        action: 'query_embeddings_generated',
        dimensionality: embeddings.values.length,
      }, 'Query embeddings generated successfully');

      return embeddings;

    } catch (error) {
      logger.error({
        action: 'generate_query_embeddings_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        queryLength: query.length,
      }, 'Failed to generate query embeddings');
      
      throw new Error(`Failed to generate query embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcule la similarité cosinus entre deux vecteurs d'embeddings
   */
  static calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[]
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensionality');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i];
      const b = vectorB[i];
      if (a !== undefined && b !== undefined) {
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
      }
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Génère des embeddings simulés pour développement
   * TODO: Remplacer par vraie intégration Vertex AI
   */
  private generateSimulatedEmbeddings(text: string): EmbeddingResponse {
    // Utilise le texte pour générer des embeddings déterministes
    const seed = this.hashString(text);
    const random = this.seededRandom(seed);
    
    // Génère 768 dimensions (standard pour text-embedding-004)
    const values = Array.from({ length: 768 }, () => random() * 2 - 1);
    
    return {
      values,
      statistics: {
        token_count: Math.ceil(text.length / 4), // Approximation tokens
        truncated: text.length > 8000,
      },
    };
  }

  /**
   * Hash simple pour seed déterministe
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Générateur pseudo-aléatoire avec seed
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Test de connectivité avec Vertex AI
   * TODO: Implémenter vraie vérification quand API Vertex AI activée
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info({
        action: 'test_vertex_connection',
        project: this.projectId,
        location: this.location,
        model: this.model,
      }, 'Testing Vertex AI connection');

      const testEmbeddings = await this.generateQueryEmbeddings('Test de connectivité Vertex AI');
      
      logger.info({
        action: 'vertex_connection_successful',
        embeddingDimensions: testEmbeddings.values.length,
      }, 'Vertex AI connection test successful');

      return true;

    } catch (error) {
      logger.error({
        action: 'vertex_connection_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Vertex AI connection test failed');

      return false;
    }
  }
}

// Instance singleton
export const vertexEmbeddingsService = new VertexEmbeddingsService();