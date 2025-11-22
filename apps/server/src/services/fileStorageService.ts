import { db } from '../config/firebase';

export class FileStorageService {
  private uploadsPath = '/tmp/rag-files';

  async uploadFile(file: any, tenantId: string): Promise<{
    documentId: string;
    fileName: string;
    chunks: number;
  }> {
    try {
      // Générer un ID unique pour le document
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Si Firebase est disponible, créer le document
      if (db) {
        await db.collection('rag_documents').doc(documentId).set({
          documentId,
          tenantId,
          fileName: file.filename || 'uploaded_file',
          fileType: this.getFileExtension(file.filename || ''),
          fileSize: file.file?.length || 0,
          chunks: Math.floor(Math.random() * 30) + 5, // Simulation
          status: 'ready',
          createdAt: now,
          updatedAt: now
        });
        
        console.log(`✅ Document ${documentId} créé dans Firebase pour tenant ${tenantId}`);
      } else {
        console.log(`📝 Mode fallback - simulation upload pour tenant ${tenantId}`);
      }

      // Simuler le processing et retourner le résultat
      return {
        documentId,
        fileName: file.filename || 'document.pdf', 
        chunks: Math.floor(Math.random() * 30) + 5
      };
      
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      throw new Error('Erreur lors de l\'upload du fichier');
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'unknown';
  }

  validateFile(file: any): boolean {
    const allowedTypes = ['pdf', 'txt', 'md', 'docx', 'doc', 'csv'];
    const extension = this.getFileExtension(file.filename || '');
    return allowedTypes.includes(extension);
  }
}

export default new FileStorageService();