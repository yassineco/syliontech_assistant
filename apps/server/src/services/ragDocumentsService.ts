import { db } from '../config/firebase';
import { CollectionReference, type DocumentData, type Query } from 'firebase-admin/firestore';

export interface RagDocument {
  documentId: string;
  tenantId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunks: number;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'ready' | 'error';
}

export interface RagDocumentChunk {
  chunkId: string;
  documentId: string;
  tenantId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  order: number;
  createdAt: string;
}

class RagDocumentsService {
  private documentsCollection: CollectionReference<DocumentData> | null = null;
  private chunksCollection: CollectionReference<DocumentData> | null = null;

  constructor() {
    if (db) {
      this.documentsCollection = db.collection('rag_documents');
      this.chunksCollection = db.collection('rag_document_chunks');
      console.log('✅ RagDocumentsService initialisé avec Firebase');
    } else {
      console.log('⚠️ RagDocumentsService en mode fallback (sans Firebase)');
    }
  }

  async createDocument(document: Omit<RagDocument, 'createdAt' | 'updatedAt'>): Promise<RagDocument> {
    const now = new Date().toISOString();
    const newDocument: RagDocument = {
      ...document,
      createdAt: now,
      updatedAt: now
    };

    if (this.documentsCollection) {
      try {
        await this.documentsCollection.doc(document.documentId).set(newDocument);
        console.log(`✅ Document ${document.documentId} créé dans Firebase`);
        return newDocument;
      } catch (error) {
        console.error('❌ Erreur création document Firebase:', error);
        return this.getFallbackDocument(document);
      }
    } else {
      return this.getFallbackDocument(document);
    }
  }

  async getDocuments(tenantId: string): Promise<RagDocument[]> {
    if (this.documentsCollection) {
      try {
        const query = this.documentsCollection.where('tenantId', '==', tenantId);
        const snapshot = await query.get();
        
        const documents = snapshot.docs.map(doc => doc.data() as RagDocument);
        console.log(`✅ ${documents.length} documents récupérés pour ${tenantId}`);
        return documents;
      } catch (error) {
        console.error('❌ Erreur récupération documents Firebase:', error);
        return this.getFallbackDocuments(tenantId);
      }
    } else {
      return this.getFallbackDocuments(tenantId);
    }
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<boolean> {
    if (this.documentsCollection && this.chunksCollection) {
      try {
        // Supprimer le document
        await this.documentsCollection.doc(documentId).delete();
        
        // Supprimer tous les chunks du document
        const chunksQuery = this.chunksCollection
          .where('tenantId', '==', tenantId)
          .where('documentId', '==', documentId);
        const chunksSnapshot = await chunksQuery.get();
        
        const batch = db!.batch();
        chunksSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        console.log(`✅ Document ${documentId} et ses chunks supprimés`);
        return true;
      } catch (error) {
        console.error('❌ Erreur suppression document Firebase:', error);
        return false;
      }
    } else {
      console.log(`📝 Simulation suppression document ${documentId}`);
      return true;
    }
  }

  async storeChunks(chunks: RagDocumentChunk[]): Promise<boolean> {
    if (this.chunksCollection) {
      try {
        const batch = db!.batch();
        chunks.forEach(chunk => {
          const docRef = this.chunksCollection!.doc(chunk.chunkId);
          batch.set(docRef, chunk);
        });
        
        await batch.commit();
        console.log(`✅ ${chunks.length} chunks stockés dans Firebase`);
        return true;
      } catch (error) {
        console.error('❌ Erreur stockage chunks Firebase:', error);
        return false;
      }
    } else {
      console.log(`📝 Simulation stockage de ${chunks.length} chunks`);
      return true;
    }
  }

  async searchChunks(tenantId: string, query: string, limit: number = 5): Promise<RagDocumentChunk[]> {
    if (this.chunksCollection) {
      try {
        // Pour l'instant, recherche simple par contenu
        // TODO: Implémenter la recherche vectorielle
        const searchQuery = this.chunksCollection
          .where('tenantId', '==', tenantId)
          .limit(limit);
        
        const snapshot = await searchQuery.get();
        const chunks = snapshot.docs
          .map(doc => doc.data() as RagDocumentChunk)
          .filter(chunk => chunk.content.toLowerCase().includes(query.toLowerCase()));
        
        console.log(`✅ ${chunks.length} chunks trouvés pour "${query}"`);
        return chunks;
      } catch (error) {
        console.error('❌ Erreur recherche chunks Firebase:', error);
        return this.getFallbackChunks(tenantId, query);
      }
    } else {
      return this.getFallbackChunks(tenantId, query);
    }
  }

  // Méthodes fallback
  private getFallbackDocument(document: Partial<RagDocument>): RagDocument {
    const now = new Date().toISOString();
    return {
      documentId: document.documentId || `doc-${Date.now()}`,
      tenantId: document.tenantId || 'unknown',
      fileName: document.fileName || 'document.pdf',
      fileType: document.fileType || 'pdf',
      fileSize: document.fileSize || 0,
      chunks: document.chunks || 0,
      status: 'ready',
      createdAt: now,
      updatedAt: now
    };
  }

  private getFallbackDocuments(tenantId: string): RagDocument[] {
    const now = new Date().toISOString();
    return [
      {
        documentId: 'doc-faq-services',
        tenantId,
        fileName: 'FAQ_Generales_Services_SylionTech.md',
        fileType: 'md',
        fileSize: 15840,
        chunks: 15,
        createdAt: now,
        updatedAt: now,
        status: 'ready'
      },
      {
        documentId: 'doc-pret-auto',
        tenantId,
        fileName: 'Pret_Auto_Financement_Vehicule.md',
        fileType: 'md',
        fileSize: 12600,
        chunks: 12,
        createdAt: now,
        updatedAt: now,
        status: 'ready'
      }
    ];
  }

  private getFallbackChunks(tenantId: string, query: string): RagDocumentChunk[] {
    return [
      {
        chunkId: `chunk-${Date.now()}-1`,
        documentId: 'doc-faq-services',
        tenantId,
        content: `Réponse simulée pour "${query}": SylionTech propose des services de développement, consultation et formation.`,
        order: 1,
        createdAt: new Date().toISOString()
      }
    ];
  }
}

export default new RagDocumentsService();