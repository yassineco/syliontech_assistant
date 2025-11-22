import { ragDocumentsService, type RagDocument, type RagChunk } from './ragDocuments.js';
import { fileStorageService } from './fileStorage.js';
import { embedTexts } from '../rag/embed.js';
import crypto from 'crypto';

// ==========================================
// SERVICE D'INGESTION RAG
// ==========================================

export interface IngestionResult {
  documentId: string;
  totalChunks: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

/**
 * Configuration du chunking
 */
const CHUNK_CONFIG = {
  maxChunkSize: 1000, // Taille maximale d'un chunk en caractères
  chunkOverlap: 100,  // Chevauchement entre chunks
  minChunkSize: 50,   // Taille minimale d'un chunk
};

/**
 * Service d'ingestion et de traitement des documents RAG
 */
export class RagIngestionService {
  private static instance: RagIngestionService | null = null;
  
  static getInstance(): RagIngestionService {
    if (!RagIngestionService.instance) {
      RagIngestionService.instance = new RagIngestionService();
    }
    return RagIngestionService.instance;
  }

  /**
   * Ingère un document complet : chunking + embeddings + stockage
   */
  async ingestDocument(tenantId: string, documentId: string): Promise<IngestionResult> {
    console.log(`🔄 Début ingestion document: ${documentId} pour tenant: ${tenantId}`);

    try {
      // Récupérer les métadonnées du document
      const document = await ragDocumentsService.getDocument(tenantId, documentId);
      if (!document) {
        throw new Error('Document non trouvé');
      }

      if (!document.filePath) {
        throw new Error('Chemin de fichier manquant');
      }

      // Marquer le document comme "processing"
      await ragDocumentsService.updateDocument(tenantId, documentId, { 
        status: 'processing' 
      });

      // Lire le contenu du fichier
      const content = await fileStorageService.readFileContent(document.filePath);
      if (!content || content.trim().length === 0) {
        throw new Error('Fichier vide ou illisible');
      }

      // Découper en chunks
      const textChunks = this.chunkText(content);
      console.log(`✂️ Document découpé en ${textChunks.length} chunks`);

      if (textChunks.length === 0) {
        throw new Error('Aucun chunk généré à partir du document');
      }

      // Générer les embeddings
      console.log('🧠 Génération des embeddings...');
      const embeddings = await embedTexts(textChunks);
      
      if (embeddings.length !== textChunks.length) {
        throw new Error('Nombre d\'embeddings différent du nombre de chunks');
      }

      // Préparer les chunks avec leurs embeddings
      const chunks: Omit<RagChunk, 'chunkId' | 'createdAt'>[] = textChunks.map((text, index) => ({
        documentId,
        tenantId,
        text,
        embedding: embeddings[index] || [],
        metadata: {
          chunkIndex: index,
          startOffset: 0, // À calculer si nécessaire
          endOffset: text.length,
        },
      }));

      // Stocker les chunks dans Firestore
      await ragDocumentsService.storeChunks(tenantId, documentId, chunks);

      // Mettre à jour le document avec le succès
      await ragDocumentsService.updateDocument(tenantId, documentId, {
        status: 'ready',
        chunks: chunks.length,
      });

      console.log(`✅ Ingestion réussie: ${documentId} - ${chunks.length} chunks`);

      return {
        documentId,
        totalChunks: chunks.length,
        status: 'success',
      };

    } catch (error) {
      console.error(`❌ Erreur ingestion document ${documentId}:`, error);

      // Marquer le document comme en erreur
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      await ragDocumentsService.updateDocument(tenantId, documentId, {
        status: 'error',
        errorMessage,
      }).catch(updateError => {
        console.error('❌ Erreur mise à jour statut erreur:', updateError);
      });

      return {
        documentId,
        totalChunks: 0,
        status: 'error',
        errorMessage,
      };
    }
  }

  /**
   * Découpe un texte en chunks avec chevauchement
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    
    // Nettoyer et normaliser le texte
    const cleanText = text.trim().replace(/\r\n/g, '\n');
    
    if (cleanText.length <= CHUNK_CONFIG.maxChunkSize) {
      // Si le texte est déjà assez petit, retourner tel quel
      return [cleanText];
    }

    // Découper par paragraphes d'abord
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      if (!trimmedParagraph) continue;

      // Si le paragraphe seul est trop long, le découper
      if (trimmedParagraph.length > CHUNK_CONFIG.maxChunkSize) {
        // Finaliser le chunk actuel s'il existe
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // Découper le long paragraphe
        const subChunks = this.splitLongParagraph(trimmedParagraph);
        chunks.push(...subChunks);
        continue;
      }

      // Vérifier si ajouter ce paragraphe dépasserait la limite
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${trimmedParagraph}` : trimmedParagraph;
      
      if (potentialChunk.length > CHUNK_CONFIG.maxChunkSize) {
        // Finaliser le chunk actuel
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        
        // Commencer un nouveau chunk avec ce paragraphe
        currentChunk = trimmedParagraph;
      } else {
        // Ajouter le paragraphe au chunk actuel
        currentChunk = potentialChunk;
      }
    }

    // Ajouter le dernier chunk s'il existe
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Filtrer les chunks trop petits
    const filteredChunks = chunks.filter(chunk => 
      chunk.length >= CHUNK_CONFIG.minChunkSize
    );

    return filteredChunks;
  }

  /**
   * Découpe un paragraphe trop long en sous-chunks
   */
  private splitLongParagraph(paragraph: string): string[] {
    const chunks: string[] = [];
    
    // Découper par phrases d'abord
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
    
    if (sentences.length <= 1) {
      // Si c'est une seule très longue phrase, découper arbitrairement
      return this.splitByWords(paragraph);
    }

    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const sentenceWithPunctuation = trimmedSentence + '.';
      const potentialChunk = currentChunk ? `${currentChunk} ${sentenceWithPunctuation}` : sentenceWithPunctuation;
      
      if (potentialChunk.length > CHUNK_CONFIG.maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentenceWithPunctuation;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Découpe par mots quand tout le reste échoue
   */
  private splitByWords(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const word of words) {
      const potentialChunk = currentChunk ? `${currentChunk} ${word}` : word;
      
      if (potentialChunk.length > CHUNK_CONFIG.maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Traite un document en mode asynchrone (pour les gros fichiers)
   */
  async ingestDocumentAsync(tenantId: string, documentId: string): Promise<void> {
    // Cette fonction pourrait être appelée par un job queue en production
    // Pour l'instant, on appelle directement ingestDocument
    setTimeout(async () => {
      await this.ingestDocument(tenantId, documentId);
    }, 100); // Petit délai pour libérer le thread principal
  }

  /**
   * Réingère un document (par exemple après modification)
   */
  async reingestDocument(tenantId: string, documentId: string): Promise<IngestionResult> {
    console.log(`🔄 Réingestion document: ${documentId}`);

    // Supprimer les anciens chunks
    try {
      const oldChunks = await ragDocumentsService.getDocumentChunks(tenantId, documentId);
      // Note: la suppression des chunks est gérée dans ragDocumentsService.storeChunks
      console.log(`🗑️ ${oldChunks.length} anciens chunks à remplacer`);
    } catch (error) {
      console.warn('⚠️ Erreur récupération anciens chunks:', error);
    }

    // Relancer l'ingestion
    return this.ingestDocument(tenantId, documentId);
  }
}

// Export de l'instance singleton
export const ragIngestionService = RagIngestionService.getInstance();