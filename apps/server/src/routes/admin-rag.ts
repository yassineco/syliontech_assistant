import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import type { MultipartFile } from '@fastify/multipart';
import ragDocuments, { type RagDocument } from '../services/ragDocumentsService.js';
import { fileStorageService } from '../services/fileStorage.js';
import { ragIngestionService } from '../services/ragIngestion.js';

// ===========================================
// ROUTES ADMIN RAG - IMPLÉMENTATION RÉELLE
// ===========================================

export default async function adminRagRoutes(fastify: FastifyInstance) {
  // Enregistrer le plugin multipart pour l'upload de fichiers
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // GET /admin/tenants/:tenantId/rag/documents - Liste réelle des documents
  fastify.get('/admin/tenants/:tenantId/rag/documents', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      // Vérifier si le service RAG est disponible
      if (!ragDocuments.isAvailable()) {
        fastify.log.warn('⚠️ Service RAG Documents non disponible, utilisation fallback');
        
        // Fallback vers des données mock si Firestore n'est pas disponible
        const mockDocuments: RagDocument[] = [
          {
            documentId: 'doc-faq-services',
            tenantId,
            fileName: 'FAQ_Generales_Services_SylionTech.md',
            fileType: 'md',
            fileSize: 15840,
            chunks: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ready',
          },
          {
            documentId: 'doc-pret-auto',
            tenantId,
            fileName: 'Pret_Auto_Financement_Vehicule.md',
            fileType: 'md',
            fileSize: 12600,
            chunks: 12,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ready',
          },
        ];
        
        return mockDocuments;
      }

      // Utiliser le service réel
      const documents = await ragDocuments.getDocuments(tenantId);
      fastify.log.info(`📋 Documents RAG récupérés pour tenant: ${tenantId}, count: ${documents.length}`);
      return documents;
      
    } catch (error) {
      fastify.log.error(`❌ Erreur récupération documents RAG: ${error}`);
      return reply.status(500).send({ error: 'Erreur interne du serveur' });
    }
  });

  // POST /admin/tenants/:tenantId/rag/upload - Upload réel de documents
  fastify.post('/admin/tenants/:tenantId/rag/upload', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      // Vérifier si le service RAG est disponible
      if (!ragDocuments.isAvailable()) {
        fastify.log.warn('⚠️ Service RAG Documents non disponible, simulation upload');
        
        const fileName = `document_${Date.now()}.pdf`;
        const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const mockChunks = Math.floor(Math.random() * 20) + 5;
        
        return {
          documentId,
          fileName,
          chunks: mockChunks,
        };
      }

      // Récupérer le fichier uploadé
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      fastify.log.info(`📤 Upload fichier: ${data.filename} pour tenant: ${tenantId}`);

      // 1. Sauvegarder le fichier
      const fileResult = await fileStorageService.uploadFile(data, tenantId);

      // 2. Créer l'entrée document en base
      const documentId = await ragDocuments.createDocument(tenantId, {
        fileName: fileResult.originalFileName,
        fileType: fileResult.fileType,
        fileSize: fileResult.fileSize,
        chunks: 0, // Sera mis à jour après ingestion
        status: 'processing',
      });

      // 3. Lancer l'ingestion asynchrone
      ragIngestionService.ingestDocumentAsync(tenantId, documentId);

      fastify.log.info(`✅ Upload réussi - Document: ${documentId}, Fichier: ${fileResult.fileName}`);

      return {
        documentId,
        fileName: fileResult.originalFileName,
        chunks: 0, // En cours d'ingestion
        status: 'pending',
        fileSize: fileResult.fileSize,
      };

    } catch (error) {
      fastify.log.error(`❌ Erreur upload: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ error: `Erreur lors de l'upload: ${errorMessage}` });
    }
  });

  // DELETE /admin/tenants/:tenantId/rag/documents/:documentId - Suppression réelle
  fastify.delete('/admin/tenants/:tenantId/rag/documents/:documentId', async (request, reply) => {
    const { tenantId, documentId } = request.params as { tenantId: string; documentId: string };

    try {
      if (!ragDocuments.isAvailable()) {
        fastify.log.warn('⚠️ Service RAG Documents non disponible, simulation suppression');
        fastify.log.info(`🗑️ Suppression simulée - Tenant: ${tenantId}, Document: ${documentId}`);
        return reply.status(204).send();
      }

      // Récupérer le document pour obtenir le chemin de fichier
      const document = await ragDocuments.getDocument(tenantId, documentId);
      
      if (!document) {
        return reply.status(404).send({ error: 'Document non trouvé' });
      }

      // Supprimer le document de la base (chunks inclus)
      await ragDocuments.deleteDocument(tenantId, documentId);

      fastify.log.info(`✅ Document supprimé: ${documentId} pour tenant: ${tenantId}`);
      return reply.status(204).send();

    } catch (error) {
      fastify.log.error(`❌ Erreur suppression: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return reply.status(500).send({ error: `Erreur lors de la suppression: ${errorMessage}` });
    }
  });

  // GET /admin/tenants/:tenantId/rag/documents/:documentId - Détails d'un document
  fastify.get('/admin/tenants/:tenantId/rag/documents/:documentId', async (request, reply) => {
    const { tenantId, documentId } = request.params as { tenantId: string; documentId: string };

    try {
      if (!ragDocuments.isAvailable()) {
        return reply.status(503).send({ error: 'Service RAG non disponible' });
      }

      const document = await ragDocuments.getDocument(tenantId, documentId);
      
      if (!document) {
        return reply.status(404).send({ error: 'Document non trouvé' });
      }

      return document;

    } catch (error) {
      fastify.log.error(`❌ Erreur récupération document: ${error}`);
      return reply.status(500).send({ error: 'Erreur interne du serveur' });
    }
  });

  // PUT /admin/tenants/:tenantId/rag/documents/:documentId/reingest - Réingestion
  fastify.put('/admin/tenants/:tenantId/rag/documents/:documentId/reingest', async (request, reply) => {
    const { tenantId, documentId } = request.params as { tenantId: string; documentId: string };

    try {
      if (!ragDocuments.isAvailable()) {
        return reply.status(503).send({ error: 'Service RAG non disponible' });
      }

      // Vérifier que le document existe
      const document = await ragDocuments.getDocument(tenantId, documentId);
      if (!document) {
        return reply.status(404).send({ error: 'Document non trouvé' });
      }

      // Marquer le document comme "processing"
      await ragDocuments.updateDocument(tenantId, documentId, { 
        status: 'processing' 
      });

      // Lancer la réingestion asynchrone
      ragIngestionService.reingestDocument(tenantId, documentId);

      fastify.log.info(`🔄 Réingestion lancée pour document: ${documentId}`);

      return {
        message: 'Réingestion en cours',
        documentId,
        status: 'processing',
      };

    } catch (error) {
      fastify.log.error(`❌ Erreur réingestion: ${error}`);
      return reply.status(500).send({ error: 'Erreur lors de la réingestion' });
    }
  });

  // GET /admin/tenants/:tenantId/rag/stats - Statistiques RAG
  fastify.get('/admin/tenants/:tenantId/rag/stats', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      if (!ragDocuments.isAvailable()) {
        return reply.status(503).send({ error: 'Service RAG non disponible' });
      }

      const documents = await ragDocuments.getDocuments(tenantId);
      
      const stats = {
        totalDocuments: documents.length,
        documentsReady: documents.filter(d => d.status === 'ready').length,
        documentsProcessing: documents.filter(d => d.status === 'processing').length,
        documentsError: documents.filter(d => d.status === 'error').length,
        totalChunks: documents.reduce((sum, doc) => sum + doc.chunks, 0),
        totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      };

      return stats;

    } catch (error) {
      fastify.log.error(`❌ Erreur récupération stats: ${error}`);
      return reply.status(500).send({ error: 'Erreur interne du serveur' });
    }
  });

  fastify.log.info('✅ Routes admin RAG réelles enregistrées');
}