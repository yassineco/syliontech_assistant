import { db } from '../config/firebase.js';
import type { CollectionReference, DocumentData } from 'firebase-admin/firestore';

// Forcer l'initialisation Firebase
console.log('🔥 RagDocumentsService: Firebase db =', !!db);

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
  // Métadonnées SaaS
  uploadedBy?: string;
  tags?: string[];
  description?: string;
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

  isAvailable(): boolean {
    return !!this.documentsCollection && !!this.chunksCollection;
  }

  async createDocument(tenantId: string, documentData: Partial<RagDocument>): Promise<string> {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const document: RagDocument = {
      documentId,
      tenantId,
      fileName: documentData.fileName || 'unknown',
      fileType: documentData.fileType || 'unknown', 
      fileSize: documentData.fileSize || 0,
      chunks: documentData.chunks || 0,
      status: documentData.status || 'ready',
      createdAt: now,
      updatedAt: now,
      ...documentData
    };

    if (this.documentsCollection) {
      try {
        await this.documentsCollection.doc(documentId).set(document);
        console.log(`✅ Document ${documentId} créé dans Firebase`);
        return documentId;
      } catch (error) {
        console.error('❌ Erreur création document Firebase:', error);
        return documentId;
      }
    } else {
      console.log(`📝 Simulation création document ${documentId}`);
      return documentId;
    }
  }

  async getDocuments(tenantId: string): Promise<RagDocument[]> {
    if (this.documentsCollection) {
      try {
        const query = this.documentsCollection.where('tenantId', '==', tenantId);
        const snapshot = await query.get();
        
        const documents = snapshot.docs.map(doc => doc.data() as RagDocument);
        console.log(`✅ ${documents.length} documents Firebase récupérés pour ${tenantId}`);
        return documents;
      } catch (error) {
        console.error('❌ Erreur récupération documents Firebase:', error);
        return this.getFallbackDocuments(tenantId);
      }
    } else {
      return this.getFallbackDocuments(tenantId);
    }
  }

  async getDocument(tenantId: string, documentId: string): Promise<RagDocument | null> {
    if (this.documentsCollection) {
      try {
        const doc = await this.documentsCollection.doc(documentId).get();
        if (doc.exists) {
          const data = doc.data() as RagDocument;
          if (data.tenantId === tenantId) {
            return data;
          }
        }
        return null;
      } catch (error) {
        console.error('❌ Erreur récupération document Firebase:', error);
        return null;
      }
    } else {
      const documents = this.getFallbackDocuments(tenantId);
      return documents.find(doc => doc.documentId === documentId) || null;
    }
  }

  async updateDocument(tenantId: string, documentId: string, updates: Partial<RagDocument>): Promise<boolean> {
    if (this.documentsCollection) {
      try {
        await this.documentsCollection.doc(documentId).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Document ${documentId} mis à jour dans Firebase`);
        return true;
      } catch (error) {
        console.error('❌ Erreur mise à jour document Firebase:', error);
        return false;
      }
    } else {
      console.log(`📝 Simulation mise à jour document ${documentId}`);
      return true;
    }
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<boolean> {
    if (this.documentsCollection && this.chunksCollection) {
      try {
        await this.documentsCollection.doc(documentId).delete();
        console.log(`✅ Document ${documentId} supprimé de Firebase`);
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

  // Méthodes fallback
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
}

export default new RagDocumentsService();