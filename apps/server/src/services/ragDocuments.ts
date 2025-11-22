import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { env } from '../config/env.js';

// ==========================================
// SERVICE RAG DOCUMENTS FIRESTORE
// ==========================================

export interface RagDocument {
  documentId: string;
  tenantId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunks: number;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  filePath?: string; // Chemin de stockage du fichier
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface RagChunk {
  chunkId: string;
  documentId: string;
  tenantId: string;
  text: string;
  embedding?: number[];
  metadata: {
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
  };
  createdAt: string;
}

let isInitialized = false;
let firestoreDb: FirebaseFirestore.Firestore | null = null;

/**
 * Initialise Firestore si pas déjà fait
 */
function initializeFirestore(): void {
  if (isInitialized) return;

  try {
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
      console.warn('⚠️ Clés Firebase manquantes - Service RAG Documents non disponible');
      return;
    }

    // Utiliser l'app Firebase existante ou en créer une nouvelle
    try {
      const admin = require('firebase-admin');
      if (admin.apps.length === 0) {
        const serviceAccount: ServiceAccount = {
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        initializeApp({
          credential: cert(serviceAccount),
          projectId: env.FIREBASE_PROJECT_ID,
        });
      }
    } catch (error) {
      // App déjà initialisée, continuer
    }

    firestoreDb = getFirestore();
    isInitialized = true;

    console.log('✅ Service RAG Documents initialisé avec Firestore');
  } catch (error) {
    console.error('❌ Erreur initialisation service RAG Documents:', error);
    firestoreDb = null;
  }
}

/**
 * Service de gestion des documents RAG
 */
export class RagDocumentsService {
  private static instance: RagDocumentsService | null = null;
  
  constructor() {
    if (!isInitialized) {
      initializeFirestore();
    }
  }

  static getInstance(): RagDocumentsService {
    if (!RagDocumentsService.instance) {
      RagDocumentsService.instance = new RagDocumentsService();
    }
    return RagDocumentsService.instance;
  }

  /**
   * Vérifie si Firestore est disponible
   */
  isAvailable(): boolean {
    return firestoreDb !== null;
  }

  /**
   * Récupère tous les documents pour un tenant
   */
  async getDocuments(tenantId: string): Promise<RagDocument[]> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      const snapshot = await firestoreDb!
        .collection('rag_documents')
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      const documents: RagDocument[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        documents.push({
          documentId: doc.id,
          tenantId: data.tenantId,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          chunks: data.chunks || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          status: data.status,
          errorMessage: data.errorMessage,
          filePath: data.filePath,
          metadata: data.metadata,
        });
      });

      return documents;
    } catch (error) {
      console.error('❌ Erreur récupération documents RAG:', error);
      throw new Error('Erreur lors de la récupération des documents');
    }
  }

  /**
   * Récupère un document spécifique
   */
  async getDocument(tenantId: string, documentId: string): Promise<RagDocument | null> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      const doc = await firestoreDb!
        .collection('rag_documents')
        .doc(documentId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data()!;
      
      // Vérifier que le document appartient au bon tenant
      if (data.tenantId !== tenantId) {
        return null;
      }

      return {
        documentId: doc.id,
        tenantId: data.tenantId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        chunks: data.chunks || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        status: data.status,
        errorMessage: data.errorMessage,
        filePath: data.filePath,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('❌ Erreur récupération document RAG:', error);
      throw new Error('Erreur lors de la récupération du document');
    }
  }

  /**
   * Crée un nouveau document
   */
  async createDocument(document: Omit<RagDocument, 'documentId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      const now = new Date().toISOString();
      const docRef = await firestoreDb!
        .collection('rag_documents')
        .add({
          ...document,
          createdAt: now,
          updatedAt: now,
        });

      console.log(`✅ Document RAG créé: ${docRef.id} pour tenant: ${document.tenantId}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur création document RAG:', error);
      throw new Error('Erreur lors de la création du document');
    }
  }

  /**
   * Met à jour un document
   */
  async updateDocument(
    tenantId: string,
    documentId: string,
    updates: Partial<Omit<RagDocument, 'documentId' | 'tenantId' | 'createdAt'>>
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      // Vérifier que le document existe et appartient au tenant
      const existingDoc = await this.getDocument(tenantId, documentId);
      if (!existingDoc) {
        throw new Error('Document non trouvé');
      }

      await firestoreDb!
        .collection('rag_documents')
        .doc(documentId)
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        });

      console.log(`✅ Document RAG mis à jour: ${documentId} pour tenant: ${tenantId}`);
    } catch (error) {
      console.error('❌ Erreur mise à jour document RAG:', error);
      throw new Error('Erreur lors de la mise à jour du document');
    }
  }

  /**
   * Supprime un document (suppression logique)
   */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      // Vérifier que le document existe et appartient au tenant
      const existingDoc = await this.getDocument(tenantId, documentId);
      if (!existingDoc) {
        throw new Error('Document non trouvé');
      }

      // Option 1: Suppression logique (recommandé)
      await firestoreDb!
        .collection('rag_documents')
        .doc(documentId)
        .update({
          status: 'deleted' as any,
          updatedAt: new Date().toISOString(),
        });

      // Option 2: Suppression physique (décommentez si préféré)
      // await firestoreDb!
      //   .collection('rag_documents')
      //   .doc(documentId)
      //   .delete();

      // Supprimer aussi les chunks associés
      await this.deleteDocumentChunks(tenantId, documentId);

      console.log(`✅ Document RAG supprimé: ${documentId} pour tenant: ${tenantId}`);
    } catch (error) {
      console.error('❌ Erreur suppression document RAG:', error);
      throw new Error('Erreur lors de la suppression du document');
    }
  }

  /**
   * Stocke les chunks d'un document
   */
  async storeChunks(tenantId: string, documentId: string, chunks: Omit<RagChunk, 'chunkId' | 'createdAt'>[]): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      const batch = firestoreDb!.batch();
      const now = new Date().toISOString();

      chunks.forEach(chunk => {
        const chunkRef = firestoreDb!.collection('rag_chunks').doc();
        batch.set(chunkRef, {
          ...chunk,
          chunkId: chunkRef.id,
          createdAt: now,
        });
      });

      await batch.commit();
      console.log(`✅ ${chunks.length} chunks stockés pour document: ${documentId}`);
    } catch (error) {
      console.error('❌ Erreur stockage chunks:', error);
      throw new Error('Erreur lors du stockage des chunks');
    }
  }

  /**
   * Récupère les chunks d'un document
   */
  async getDocumentChunks(tenantId: string, documentId: string): Promise<RagChunk[]> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      const snapshot = await firestoreDb!
        .collection('rag_chunks')
        .where('tenantId', '==', tenantId)
        .where('documentId', '==', documentId)
        .orderBy('metadata.chunkIndex', 'asc')
        .get();

      const chunks: RagChunk[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        chunks.push({
          chunkId: doc.id,
          documentId: data.documentId,
          tenantId: data.tenantId,
          text: data.text,
          embedding: data.embedding,
          metadata: data.metadata,
          createdAt: data.createdAt,
        });
      });

      return chunks;
    } catch (error) {
      console.error('❌ Erreur récupération chunks:', error);
      throw new Error('Erreur lors de la récupération des chunks');
    }
  }

  /**
   * Supprime tous les chunks d'un document
   */
  private async deleteDocumentChunks(tenantId: string, documentId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const snapshot = await firestoreDb!
        .collection('rag_chunks')
        .where('tenantId', '==', tenantId)
        .where('documentId', '==', documentId)
        .get();

      const batch = firestoreDb!.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Chunks supprimés pour document: ${documentId}`);
    } catch (error) {
      console.error('❌ Erreur suppression chunks:', error);
    }
  }

  /**
   * Recherche de chunks par similarité (pour un tenant spécifique)
   */
  async searchChunks(tenantId: string, embedding: number[], limit: number = 10): Promise<RagChunk[]> {
    if (!this.isAvailable()) {
      throw new Error('Service RAG Documents non disponible');
    }

    try {
      // Note: Firestore ne supporte pas la recherche vectorielle native
      // Cette implémentation basique récupère tous les chunks et calcule la similarité côté serveur
      // Pour un vrai environnement de production, utilisez un vector database comme Pinecone, Weaviate, etc.
      
      const snapshot = await firestoreDb!
        .collection('rag_chunks')
        .where('tenantId', '==', tenantId)
        .get();

      const chunksWithSimilarity: Array<{ chunk: RagChunk; similarity: number }> = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.embedding && data.embedding.length > 0) {
          const similarity = this.cosineSimilarity(embedding, data.embedding);
          
          chunksWithSimilarity.push({
            chunk: {
              chunkId: doc.id,
              documentId: data.documentId,
              tenantId: data.tenantId,
              text: data.text,
              embedding: data.embedding,
              metadata: data.metadata,
              createdAt: data.createdAt,
            },
            similarity,
          });
        }
      });

      // Trier par similarité décroissante et limiter
      return chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.chunk);
        
    } catch (error) {
      console.error('❌ Erreur recherche chunks:', error);
      throw new Error('Erreur lors de la recherche de chunks');
    }
  }

  /**
   * Calcule la similarité cosinus entre deux vecteurs
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

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
}

// Export de l'instance singleton
export const ragDocumentsService = RagDocumentsService.getInstance();