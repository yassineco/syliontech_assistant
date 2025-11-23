import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, getTenantCollection } from '@/lib/firebase';

export interface RagDocument {
  id: string;
  documentId: string;
  tenantId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunks: number;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string;
  tags?: string[];
  description?: string;
}

export interface SystemPromptSettings {
  tenantId: string;
  systemPrompt: string;
  lastUpdated: string;
  updatedBy: string;
}

class FirebaseRagService {
  // Documents RAG
  async getDocuments(tenantId: string): Promise<RagDocument[]> {
    try {
      const collectionPath = getTenantCollection(tenantId, 'ragDocuments');
      const q = query(
        collection(db, collectionPath), 
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RagDocument[];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    try {
      const collectionPath = getTenantCollection(tenantId, 'ragDocuments');
      await deleteDoc(doc(db, collectionPath, documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // System Prompt
  async getSystemPrompt(tenantId: string): Promise<SystemPromptSettings | null> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/settings/systemPrompt`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as SystemPromptSettings;
      }
      return null;
    } catch (error) {
      console.error('Error fetching system prompt:', error);
      throw error;
    }
  }

  async updateSystemPrompt(tenantId: string, systemPrompt: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/settings/systemPrompt`);
      const data = {
        tenantId,
        systemPrompt,
        lastUpdated: new Date().toISOString(),
        updatedBy: userId
      };
      
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('Error updating system prompt:', error);
      throw error;
    }
  }

  // Upload via Backend API (pas directement Firebase)
  async uploadDocument(tenantId: string, file: File): Promise<RagDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/admin/tenants/${tenantId}/rag/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  }

  // Test RAG
  async testRag(tenantId: string, question: string) {
    const response = await fetch(`/api/admin/tenants/${tenantId}/rag/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error('RAG test failed');
    }

    return await response.json();
  }
}

export const firebaseRagService = new FirebaseRagService();