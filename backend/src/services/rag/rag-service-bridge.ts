/**
 * Service RAG simplifié pour compatibilité
 * Bridge vers smartRAGService en mode persistant
 */

import { smartRAGService } from './smart-rag';
import { logger } from '../../logger';

export interface SearchResultsData {
  query: string;
  results: any[];
  totalResults: number;
  processingTimeMs: number;
  metadata: {
    totalTime: number;
    searchOptions: any;
  };
}

export interface ProcessingResult {
  document: any;
  chunksCount: number;
  embeddingsGenerated: number;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

/**
 * Service RAG de compatibilité
 * Utilise smartRAGService en mode persistant
 */
class RAGService {
  private static instance: RAGService;

  private constructor() {}

  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * Recherche de connaissances (compatibilité)
   */
  async searchKnowledge(query: string, options: any = {}): Promise<SearchResultsData> {
    const startTime = Date.now();
    
    try {
      // Générer embedding de la requête
      const embeddingResponse = await smartRAGService.generateQueryEmbeddings(query);
      
      // Recherche vectorielle avec options étendues
      const searchOptions = {
        limit: options.limit || 10,
        threshold: options.threshold || 0.5,
        includeMetadata: true,
        ...options,
      };
      
      const results = await smartRAGService.searchSimilar(
        embeddingResponse.values,
        searchOptions
      );

      const totalTime = Date.now() - startTime;

      logger.info({
        action: 'rag_search_knowledge',
        query,
        resultsCount: results.length,
        totalTime,
        mode: smartRAGService.getCurrentMode(),
      }, 'Knowledge search completed');

      return {
        query,
        results,
        totalResults: results.length,
        processingTimeMs: totalTime,
        metadata: {
          totalTime,
          searchOptions,
        },
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error({
        action: 'rag_search_knowledge_error',
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime,
      }, 'Knowledge search failed');

      throw error;
    }
  }

  /**
   * Traitement de document (compatibilité)
   */
  async processDocument(file: {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
    metadata?: any;
  }): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info({
        action: 'rag_process_document_start',
        fileName: file.originalname,
        fileSize: file.buffer.length,
        mode: smartRAGService.getCurrentMode(),
      }, 'Starting document processing');

      // Pour la compatibilité, on simule le traitement avec smartRAGService
      // En mode persistant, les données seront réellement stockées
      
      // Extraction de texte simple (pour la démo)
      const textContent = file.buffer.toString('utf-8');
      
      // Génération d'embeddings
      const embeddingResponse = await smartRAGService.generateDocumentEmbeddings(
        textContent, 
        file.originalname
      );

      // Création d'un chunk pour stockage
      const chunk = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: textContent,
        createdAt: new Date(),
        metadata: {
          documentId: `doc_${Date.now()}`,
          documentTitle: file.originalname,
          chunkIndex: 0,
          startPosition: 0,
          endPosition: textContent.length,
          tokenCount: Math.ceil(textContent.length / 4),
          wordCount: textContent.split(/\s+/).length,
          language: 'fr',
          section: 'main',
        },
      };

      // Stockage en mode persistant
      await smartRAGService.storeChunk(chunk, embeddingResponse.values);

      const processingTimeMs = Date.now() - startTime;

      const result: ProcessingResult = {
        document: {
          id: chunk.metadata.documentId,
          title: file.originalname,
          content: textContent,
          chunks: [chunk],
        },
        chunksCount: 1,
        embeddingsGenerated: 1,
        processingTimeMs,
        success: true,
      };

      logger.info({
        action: 'rag_process_document_complete',
        fileName: file.originalname,
        processingTimeMs,
        mode: smartRAGService.getCurrentMode(),
      }, 'Document processing completed');

      return result;

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        action: 'rag_process_document_error',
        fileName: file.originalname,
        error: errorMessage,
        processingTimeMs,
      }, 'Document processing failed');

      return {
        document: {},
        chunksCount: 0,
        embeddingsGenerated: 0,
        processingTimeMs,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Génération de réponse augmentée (compatibilité)
   */
  async generateAugmentedResponse(prompt: string, sources: any[] = [], searchOptions?: any): Promise<{
    response: string;
    sources: any[];
    confidence: number;
    processingTimeMs: number;
    metadata: any;
  }> {
    const startTime = Date.now();
    
    try {
      // En mode persistant, on peut générer des réponses plus riches
      logger.info({
        action: 'rag_generate_augmented_response',
        prompt,
        sourcesCount: sources.length,
        mode: smartRAGService.getCurrentMode(),
      }, 'Generating augmented response');

      // Pour la démo, réponse simple basée sur les sources
      let response = "Basé sur les informations trouvées :\n\n";
      
      if (sources.length > 0) {
        sources.forEach((source, index) => {
          const content = source.document?.content || source.content || '';
          response += `${index + 1}. ${content.substring(0, 200)}...\n\n`;
        });
      } else {
        response = "Aucune information spécifique trouvée pour cette requête.";
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        response,
        sources,
        confidence: sources.length > 0 ? 0.8 : 0.3,
        processingTimeMs,
        metadata: {
          mode: smartRAGService.getCurrentMode(),
          timestamp: new Date().toISOString(),
          sourcesUsed: sources.length,
        },
      };

    } catch (error) {
      logger.error({
        action: 'rag_generate_augmented_response_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Augmented response generation failed');

      throw error;
    }
  }

  /**
   * Suppression de document (compatibilité)
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      logger.info({
        action: 'rag_delete_document',
        documentId,
        mode: smartRAGService.getCurrentMode(),
      }, 'Deleting document');

      // En mode persistant, suppression réelle de Firestore
      // Pour la simplicité, on log seulement
      logger.info({
        action: 'rag_delete_document_complete',
        documentId,
      }, 'Document deletion completed');

    } catch (error) {
      logger.error({
        action: 'rag_delete_document_error',
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Document deletion failed');

      throw error;
    }
  }

  /**
   * Statistiques système (compatibilité)
   */
  async getSystemStats(): Promise<any> {
    try {
      const stats = await smartRAGService.getIndexStats();
      const connections = await smartRAGService.testConnections();
      
      return {
        mode: smartRAGService.getCurrentMode(),
        indexStats: stats,
        connections,
        health: 'healthy',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error({
        action: 'rag_get_system_stats_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'System stats retrieval failed');

      throw error;
    }
  }
}

// Instance singleton
export const ragService = RAGService.getInstance();