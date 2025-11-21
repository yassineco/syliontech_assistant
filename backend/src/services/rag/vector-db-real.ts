/**
 * Service de base de données vectorielle RÉEL avec Firestore
 * Migration de la simulation vers vraie persistance
 */

import { Firestore, Timestamp } from '@google-cloud/firestore';
import { logger } from '../../logger';
import { DocumentChunk } from './chunking';
import { VectorDocument, SearchResult, SearchOptions, IndexStats } from './vector-db';

/**
 * Service de base de données vectorielle RÉEL pour RAG
 */
export class RealVectorDatabaseService {
  private firestore: Firestore;
  private collectionName: string;

  constructor() {
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    this.firestore = new Firestore({
      projectId: process.env.PROJECT_ID || 'magic-button-demo',
      databaseId: databaseId,
    });
    this.collectionName = process.env.FIRESTORE_VECTORS_COLLECTION || 'rag_vectors';
    
    logger.info({
      action: 'firestore_init',
      projectId: process.env.PROJECT_ID || 'magic-button-demo',
      databaseId: databaseId,
      collection: this.collectionName,
    }, 'Initializing REAL Firestore Vector DB');
  }

  /**
   * Stockage RÉEL d'un chunk avec son embedding
   */
  async storeChunk(chunk: DocumentChunk, embedding: number[]): Promise<void> {
    const vectorDoc: VectorDocument = {
      id: chunk.id,
      documentId: chunk.metadata.documentId,
      chunkId: chunk.id,
      content: chunk.content,
      embedding,
      metadata: {
        ...(chunk.metadata.documentTitle && { documentTitle: chunk.metadata.documentTitle }),
        chunkIndex: chunk.metadata.chunkIndex,
        tokenCount: chunk.metadata.tokenCount,
        wordCount: chunk.metadata.wordCount,
        ...(chunk.metadata.language && { language: chunk.metadata.language }),
        ...(chunk.metadata.section && { section: chunk.metadata.section }),
      },
      createdAt: chunk.createdAt,
      updatedAt: new Date(),
    };

    logger.info({
      action: 'store_vector_chunk_real',
      chunkId: chunk.id,
      documentId: chunk.metadata.documentId,
      embeddingDimension: embedding.length,
      contentLength: chunk.content.length,
    }, 'Storing REAL vector chunk in Firestore');

    try {
      // VRAIE écriture Firestore
      await this.firestore
        .collection(this.collectionName)
        .doc(chunk.id)
        .set({
          ...vectorDoc,
          createdAt: Timestamp.fromDate(vectorDoc.createdAt),
          updatedAt: Timestamp.fromDate(vectorDoc.updatedAt),
        });

      logger.info({
        action: 'vector_chunk_stored_real',
        chunkId: chunk.id,
        documentId: chunk.metadata.documentId,
        collection: this.collectionName,
      }, 'REAL vector chunk stored successfully in Firestore');

    } catch (error) {
      logger.error({
        action: 'store_vector_chunk_error_real',
        chunkId: chunk.id,
        documentId: chunk.metadata.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to store REAL vector chunk');

      throw new Error(`Failed to store vector chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stockage RÉEL en lot de chunks avec embeddings
   */
  async storeBatch(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings arrays must have the same length');
    }

    logger.info({
      action: 'store_vector_batch_real',
      batchSize: chunks.length,
      documentId: chunks[0]?.metadata.documentId,
      collection: this.collectionName,
    }, 'Starting REAL batch vector storage');

    try {
      // Préparer le batch Firestore
      const batch = this.firestore.batch();
      
      chunks.forEach((chunk, index) => {
        const vectorDoc: VectorDocument = {
          id: chunk.id,
          documentId: chunk.metadata.documentId,
          chunkId: chunk.id,
          content: chunk.content,
          embedding: embeddings[index] || [],
          metadata: {
            ...(chunk.metadata.documentTitle && { documentTitle: chunk.metadata.documentTitle }),
            chunkIndex: chunk.metadata.chunkIndex,
            tokenCount: chunk.metadata.tokenCount,
            wordCount: chunk.metadata.wordCount,
            ...(chunk.metadata.language && { language: chunk.metadata.language }),
            ...(chunk.metadata.section && { section: chunk.metadata.section }),
          },
          createdAt: chunk.createdAt,
          updatedAt: new Date(),
        };

        const docRef = this.firestore.collection(this.collectionName).doc(chunk.id);
        batch.set(docRef, {
          ...vectorDoc,
          createdAt: Timestamp.fromDate(vectorDoc.createdAt),
          updatedAt: Timestamp.fromDate(vectorDoc.updatedAt),
        });
      });

      // VRAIE écriture batch Firestore
      await batch.commit();

      logger.info({
        action: 'vector_batch_stored_real',
        batchSize: chunks.length,
        documentId: chunks[0]?.metadata.documentId,
        collection: this.collectionName,
      }, 'REAL vector batch stored successfully in Firestore');

    } catch (error) {
      logger.error({
        action: 'store_vector_batch_error_real',
        batchSize: chunks.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to store REAL vector batch');

      throw new Error(`Failed to store vector batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recherche vectorielle RÉELLE (similarité cosinus)
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    logger.info({
      action: 'vector_search_real',
      embeddingDimension: queryEmbedding.length,
      limit: options.limit,
      threshold: options.threshold,
      collectionName: this.collectionName,
      userId: options.userId,
      documentIds: options.documentIds,
      language: options.language,
    }, 'Starting REAL vector search in Firestore');

    try {
      // VRAIE requête Firestore (récupère tous les documents pour calculer similarité)
      const baseQuery = this.firestore.collection(this.collectionName);
      let query: any = baseQuery;

      // Filtres optionnels
      if (options.userId) {
        logger.info(`Filtering by userId: ${options.userId}`);
        query = query.where('metadata.userId', '==', options.userId);
      }
      if (options.documentIds && options.documentIds.length > 0) {
        logger.info(`Filtering by documentIds: ${options.documentIds.join(', ')}`);
        query = query.where('documentId', 'in', options.documentIds.slice(0, 10)); // Firestore limit
      }
      if (options.language) {
        logger.info(`Filtering by language: ${options.language}`);
        query = query.where('metadata.language', '==', options.language);
      }

      logger.info('Executing Firestore query...');
      const snapshot = await query.get();
      
      logger.info({
        action: 'firestore_query_result',
        snapshotSize: snapshot.size,
        isEmpty: snapshot.empty,
        collectionName: this.collectionName,
      }, 'Firestore query completed');
      
      if (snapshot.empty) {
        logger.warn({
          action: 'no_documents_found',
          collectionName: this.collectionName,
          filters: { userId: options.userId, documentIds: options.documentIds, language: options.language },
        }, 'No documents found in vector search - check if documents are in correct collection');
        return [];
      }

      // Calculer les similarités
      const results: SearchResult[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        const vectorDoc = {
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as VectorDocument;

        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          vectorDoc.embedding
        );

        if (similarity >= options.threshold) {
          results.push({
            document: vectorDoc,
            similarity,
            rank: 0, // Sera défini après tri
          });
        }
      });

      // Trier par similarité décroissante
      results.sort((a, b) => b.similarity - a.similarity);
      
      // Assigner les rangs et limiter
      const limitedResults = results
        .slice(0, options.limit)
        .map((result, index) => ({
          ...result,
          rank: index + 1,
        }));

      logger.info({
        action: 'vector_search_completed_real',
        totalDocuments: snapshot.size,
        resultsFound: limitedResults.length,
        avgSimilarity: limitedResults.length > 0 
          ? limitedResults.reduce((sum, r) => sum + r.similarity, 0) / limitedResults.length 
          : 0,
      }, 'REAL vector search completed');

      return limitedResults;

    } catch (error) {
      logger.error({
        action: 'vector_search_error_real',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to perform REAL vector search');

      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupération RÉELLE des chunks d'un document
   */
  async getDocumentChunks(documentId: string): Promise<VectorDocument[]> {
    logger.info({
      action: 'get_document_chunks_real',
      documentId,
      collection: this.collectionName,
    }, 'Retrieving REAL document chunks from Firestore');

    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('documentId', '==', documentId)
        .orderBy('metadata.chunkIndex')
        .get();

      const chunks: VectorDocument[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        chunks.push({
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as VectorDocument);
      });

      logger.info({
        action: 'document_chunks_retrieved_real',
        documentId,
        chunksCount: chunks.length,
      }, 'REAL document chunks retrieved successfully');

      return chunks;

    } catch (error) {
      logger.error({
        action: 'get_document_chunks_error_real',
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to retrieve REAL document chunks');

      throw new Error(`Failed to retrieve document chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Suppression RÉELLE de tous les chunks d'un document
   */
  async deleteDocument(documentId: string): Promise<void> {
    logger.info({
      action: 'delete_document_vectors_real',
      documentId,
      collection: this.collectionName,
    }, 'Deleting REAL document vectors from Firestore');

    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('documentId', '==', documentId)
        .get();

      if (snapshot.empty) {
        logger.info({
          action: 'no_vectors_to_delete',
          documentId,
        }, 'No vectors found to delete');
        return;
      }

      // Supprimer en batch
      const batch = this.firestore.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info({
        action: 'document_vectors_deleted_real',
        documentId,
        deletedCount: snapshot.size,
      }, 'REAL document vectors deleted successfully');

    } catch (error) {
      logger.error({
        action: 'delete_document_vectors_error_real',
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to delete REAL document vectors');

      throw new Error(`Failed to delete document vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Statistiques RÉELLES de l'index
   */
  async getIndexStats(): Promise<IndexStats> {
    logger.info({
      action: 'get_index_stats_real',
      collection: this.collectionName,
    }, 'Getting REAL index stats from Firestore');

    try {
      const snapshot = await this.firestore.collection(this.collectionName).get();
      
      if (snapshot.empty) {
        return {
          totalDocuments: 0,
          totalChunks: 0,
          averageEmbeddingDimension: 0,
          languages: [],
          oldestDocument: new Date(),
          newestDocument: new Date(),
        };
      }

      const documentIds = new Set<string>();
      const languages = new Set<string>();
      const dates: Date[] = [];
      let totalEmbeddingDimension = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        documentIds.add(data.documentId);
        
        if (data.metadata?.language) {
          languages.add(data.metadata.language);
        }
        
        if (data.createdAt) {
          dates.push(data.createdAt.toDate());
        }
        
        if (data.embedding) {
          totalEmbeddingDimension += data.embedding.length;
        }
      });

      const stats: IndexStats = {
        totalDocuments: documentIds.size,
        totalChunks: snapshot.size,
        averageEmbeddingDimension: snapshot.size > 0 ? Math.round(totalEmbeddingDimension / snapshot.size) : 0,
        languages: Array.from(languages),
        oldestDocument: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(),
        newestDocument: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(),
      };

      logger.info({
        action: 'index_stats_retrieved_real',
        stats,
      }, 'REAL index stats retrieved successfully');

      return stats;

    } catch (error) {
      logger.error({
        action: 'get_index_stats_error_real',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get REAL index stats');

      throw new Error(`Failed to get index stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test de connexion RÉELLE à Firestore
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing REAL Firestore connection');
      
      // Test simple de lecture
      await this.firestore.collection(this.collectionName).limit(1).get();
      
      logger.info('REAL Firestore connection test successful');
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'REAL Firestore connection test failed');
      return false;
    }
  }

  // === Utilitaires ===

  /**
   * Calcul de similarité cosinus RÉEL
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const v1 = vec1[i] || 0;
      const v2 = vec2[i] || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Estimation des coûts Firestore
   */
  getCostEstimation(operations: { reads: number; writes: number; storage_gb: number }): {
    reads: number;
    writes: number;
    storage: number;
    total: number;
  } {
    const COST_PER_100K_READS = 0.36; // $0.36 per 100K reads
    const COST_PER_100K_WRITES = 1.08; // $1.08 per 100K writes  
    const COST_PER_GB_STORAGE = 0.18; // $0.18 per GB per month

    const readsCost = (operations.reads / 100000) * COST_PER_100K_READS;
    const writesCost = (operations.writes / 100000) * COST_PER_100K_WRITES;
    const storageCost = operations.storage_gb * COST_PER_GB_STORAGE;

    return {
      reads: Math.round(readsCost * 100) / 100,
      writes: Math.round(writesCost * 100) / 100,
      storage: Math.round(storageCost * 100) / 100,
      total: Math.round((readsCost + writesCost + storageCost) * 100) / 100,
    };
  }
}

// Instance singleton
export const realVectorDatabaseService = new RealVectorDatabaseService();