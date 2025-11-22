import { ragDocumentsService, type RagChunk } from './ragDocuments.js';
import { embedTexts } from '../rag/embed.js';

// ==========================================
// SERVICE DE RECHERCHE RAG
// ==========================================

export interface RagSearchResult {
  chunks: Array<{
    text: string;
    score: number;
    metadata: {
      documentId: string;
      fileName: string;
      chunkIndex: number;
    };
  }>;
  totalResults: number;
  query: string;
}

export interface RagSearchOptions {
  limit?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

/**
 * Service de recherche dans les documents RAG
 */
export class RagSearchService {
  private static instance: RagSearchService | null = null;
  
  static getInstance(): RagSearchService {
    if (!RagSearchService.instance) {
      RagSearchService.instance = new RagSearchService();
    }
    return RagSearchService.instance;
  }

  /**
   * Recherche sémantique dans les documents d'un tenant
   */
  async searchDocuments(
    tenantId: string, 
    query: string, 
    options: RagSearchOptions = {}
  ): Promise<RagSearchResult> {
    const { 
      limit = 10, 
      minScore = 0.3,
      includeMetadata = true 
    } = options;

    console.log(`🔍 Recherche RAG pour tenant: ${tenantId}, query: "${query}"`);

    try {
      // Générer l'embedding de la requête
      const [queryEmbedding] = await embedTexts([query]);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('⚠️ Impossible de générer l\'embedding pour la requête');
        return {
          chunks: [],
          totalResults: 0,
          query,
        };
      }

      // Rechercher les chunks les plus similaires
      const chunks = await ragDocumentsService.searchChunks(tenantId, queryEmbedding, limit * 2); // Récupérer plus pour filtrer
      
      if (chunks.length === 0) {
        console.log('📭 Aucun chunk trouvé pour ce tenant');
        return {
          chunks: [],
          totalResults: 0,
          query,
        };
      }

      // Recalculer les scores et obtenir les métadonnées des documents
      const resultsWithMetadata = await Promise.all(
        chunks.map(async (chunk) => {
          const score = this.calculateScore(queryEmbedding, chunk.embedding || []);
          
          let fileName = 'Document inconnu';
          
          if (includeMetadata) {
            try {
              const document = await ragDocumentsService.getDocument(tenantId, chunk.documentId);
              if (document) {
                fileName = document.fileName;
              }
            } catch (error) {
              console.warn(`⚠️ Erreur récupération métadonnées document ${chunk.documentId}:`, error);
            }
          }

          return {
            text: chunk.text,
            score,
            metadata: {
              documentId: chunk.documentId,
              fileName,
              chunkIndex: chunk.metadata.chunkIndex,
            },
          };
        })
      );

      // Filtrer par score minimum et trier
      const filteredResults = resultsWithMetadata
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      console.log(`✅ Recherche terminée: ${filteredResults.length} résultats trouvés`);

      return {
        chunks: filteredResults,
        totalResults: filteredResults.length,
        query,
      };

    } catch (error) {
      console.error('❌ Erreur recherche RAG:', error);
      throw new Error(`Erreur lors de la recherche: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Recherche rapide avec mise en cache (pour les requêtes fréquentes)
   */
  async quickSearch(tenantId: string, query: string, topK: number = 5): Promise<RagSearchResult> {
    return this.searchDocuments(tenantId, query, {
      limit: topK,
      minScore: 0.2, // Score plus permissif pour la recherche rapide
      includeMetadata: true,
    });
  }

  /**
   * Recherche avec contexte étendu (pour les conversations longues)
   */
  async searchWithContext(
    tenantId: string, 
    query: string, 
    previousQueries: string[] = [],
    topK: number = 8
  ): Promise<RagSearchResult> {
    try {
      // Si on a des requêtes précédentes, les combiner avec la requête actuelle
      let enhancedQuery = query;
      
      if (previousQueries.length > 0) {
        // Prendre les 3 dernières requêtes pour le contexte
        const recentQueries = previousQueries.slice(-3);
        enhancedQuery = `${recentQueries.join(' ')} ${query}`;
        console.log(`🔗 Recherche avec contexte: "${enhancedQuery}"`);
      }

      const results = await this.searchDocuments(tenantId, enhancedQuery, {
        limit: topK,
        minScore: 0.25,
        includeMetadata: true,
      });

      // Si la recherche avec contexte ne donne pas assez de résultats, 
      // faire une recherche simple
      if (results.chunks.length < topK / 2) {
        console.log('🔄 Recherche avec contexte insuffisante, fallback vers recherche simple');
        const fallbackResults = await this.searchDocuments(tenantId, query, {
          limit: topK,
          minScore: 0.2,
          includeMetadata: true,
        });
        
        // Combiner et dédupliquer les résultats
        const combinedChunks = [...results.chunks];
        const existingDocIds = new Set(results.chunks.map(c => `${c.metadata.documentId}-${c.metadata.chunkIndex}`));
        
        for (const chunk of fallbackResults.chunks) {
          const key = `${chunk.metadata.documentId}-${chunk.metadata.chunkIndex}`;
          if (!existingDocIds.has(key)) {
            combinedChunks.push(chunk);
            existingDocIds.add(key);
          }
        }

        return {
          chunks: combinedChunks.slice(0, topK),
          totalResults: combinedChunks.length,
          query: enhancedQuery,
        };
      }

      return results;

    } catch (error) {
      console.error('❌ Erreur recherche avec contexte:', error);
      // Fallback vers une recherche simple
      return this.quickSearch(tenantId, query, topK);
    }
  }

  /**
   * Obtient des documents similaires à un document donné
   */
  async findSimilarDocuments(
    tenantId: string, 
    documentId: string, 
    limit: number = 5
  ): Promise<RagSearchResult> {
    try {
      // Récupérer quelques chunks du document de référence
      const referenceChunks = await ragDocumentsService.getDocumentChunks(tenantId, documentId);
      
      if (referenceChunks.length === 0) {
        return {
          chunks: [],
          totalResults: 0,
          query: `Document similaire à ${documentId}`,
        };
      }

      // Utiliser le premier chunk comme requête de référence
      const firstChunk = referenceChunks[0];
      if (!firstChunk) {
        return {
          chunks: [],
          totalResults: 0,
          query: `Document similaire à ${documentId}`,
        };
      }
      
      const referenceText = firstChunk.text;
      
      const results = await this.searchDocuments(tenantId, referenceText, {
        limit: limit * 2, // Récupérer plus pour filtrer le document source
        minScore: 0.3,
        includeMetadata: true,
      });

      // Filtrer pour exclure les chunks du document source
      const filteredResults = results.chunks.filter(
        chunk => chunk.metadata.documentId !== documentId
      ).slice(0, limit);

      return {
        chunks: filteredResults,
        totalResults: filteredResults.length,
        query: `Documents similaires à ${documentId}`,
      };

    } catch (error) {
      console.error('❌ Erreur recherche documents similaires:', error);
      throw new Error(`Erreur lors de la recherche de documents similaires: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Calcule le score de similarité (wrapper pour cosineSimilarity)
   */
  private calculateScore(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Obtient des statistiques sur les documents d'un tenant
   */
  async getSearchStats(tenantId: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    averageChunksPerDocument: number;
  }> {
    try {
      const documents = await ragDocumentsService.getDocuments(tenantId);
      const readyDocuments = documents.filter(doc => doc.status === 'ready');
      
      const totalChunks = readyDocuments.reduce((sum, doc) => sum + doc.chunks, 0);
      const averageChunks = readyDocuments.length > 0 ? totalChunks / readyDocuments.length : 0;

      return {
        totalDocuments: readyDocuments.length,
        totalChunks,
        averageChunksPerDocument: Math.round(averageChunks * 100) / 100,
      };

    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        averageChunksPerDocument: 0,
      };
    }
  }
}

// Export de l'instance singleton
export const ragSearchService = RagSearchService.getInstance();