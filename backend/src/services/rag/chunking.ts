/**
 * Service de chunking intelligent pour documents RAG
 * Divise les documents en chunks optimaux pour recherche sémantique
 */

import { logger } from '../../logger';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentTitle?: string;
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    tokenCount: number;
    wordCount: number;
    language?: string;
    section?: string;
  };
  embedding?: number[];
  createdAt: Date;
}

export interface ChunkingOptions {
  maxTokens: number;        // Taille maximale en tokens
  overlap: number;          // Chevauchement entre chunks (en tokens)
  preserveSentences: boolean; // Préserver les phrases complètes
  preserveParagraphs: boolean; // Préserver les paragraphes
  minChunkSize: number;     // Taille minimale acceptable
}

export class DocumentChunkingService {
  private defaultOptions: ChunkingOptions = {
    maxTokens: 500,          // Optimal pour embeddings
    overlap: 50,             // 10% de chevauchement
    preserveSentences: true,
    preserveParagraphs: true,
    minChunkSize: 100,       // Éviter chunks trop petits
  };

  /**
   * Divise un document en chunks optimaux
   */
  async chunkDocument(
    documentId: string,
    content: string,
    title?: string,
    options?: Partial<ChunkingOptions>
  ): Promise<DocumentChunk[]> {
    const chunkingOptions = { ...this.defaultOptions, ...options };
    
    logger.info({
      action: 'chunk_document',
      documentId,
      contentLength: content.length,
      title,
      options: chunkingOptions,
    }, 'Starting document chunking');

    try {
      // Nettoyage initial du contenu
      const cleanedContent = this.cleanContent(content);
      
      // Détection de la langue (simple heuristique)
      const language = this.detectLanguage(cleanedContent);
      
      // Chunking avec préservation des structures
      const chunks = this.createChunks(
        documentId,
        cleanedContent,
        title,
        language,
        chunkingOptions
      );

      logger.info({
        action: 'document_chunked',
        documentId,
        chunksCreated: chunks.length,
        averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length,
        totalTokens: chunks.reduce((sum, chunk) => sum + chunk.metadata.tokenCount, 0),
      }, 'Document chunking completed');

      return chunks;

    } catch (error) {
      logger.error({
        action: 'chunk_document_error',
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to chunk document');
      
      throw new Error(`Failed to chunk document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Nettoyage du contenu avant chunking
   */
  private cleanContent(content: string): string {
    return content
      // Normaliser les espaces
      .replace(/\s+/g, ' ')
      // Supprimer espaces en début/fin
      .trim()
      // Normaliser les retours à la ligne
      .replace(/\n\s*\n/g, '\n\n')
      // Supprimer caractères de contrôle
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Détection simple de la langue
   */
  private detectLanguage(content: string): string {
    const sample = content.substring(0, 1000).toLowerCase();
    
    // Mots communs français
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'avoir', 'que', 'pour'];
    // Mots communs anglais
    const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it'];
    
    const frenchScore = frenchWords.reduce((score, word) => 
      score + (sample.includes(` ${word} `) ? 1 : 0), 0);
    const englishScore = englishWords.reduce((score, word) => 
      score + (sample.includes(` ${word} `) ? 1 : 0), 0);
    
    return frenchScore > englishScore ? 'fr' : 'en';
  }

  /**
   * Création des chunks avec préservation des structures
   */
  private createChunks(
    documentId: string,
    content: string,
    title: string | undefined,
    language: string,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Diviser par paragraphes si option activée
    const paragraphs = options.preserveParagraphs 
      ? content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
      : [content];

    let currentChunk = '';
    let currentTokens = 0;
    let startPosition = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);
      
      // Si le paragraphe seul dépasse la limite, le diviser par phrases
      if (paragraphTokens > options.maxTokens) {
        // Finaliser le chunk actuel si nécessaire
        if (currentChunk.trim().length > 0) {
          chunks.push(this.createChunk(
            documentId,
            currentChunk.trim(),
            title,
            language,
            chunkIndex++,
            startPosition,
            startPosition + currentChunk.length,
            currentTokens
          ));
          
          startPosition += currentChunk.length - this.getOverlapLength(currentChunk, options.overlap);
          currentChunk = '';
          currentTokens = 0;
        }

        // Diviser le paragraphe par phrases
        const sentences = this.splitIntoSentences(paragraph, language);
        
        for (const sentence of sentences) {
          const sentenceTokens = this.estimateTokens(sentence);
          
          if (currentTokens + sentenceTokens > options.maxTokens && currentChunk.trim().length > 0) {
            // Créer le chunk actuel
            chunks.push(this.createChunk(
              documentId,
              currentChunk.trim(),
              title,
              language,
              chunkIndex++,
              startPosition,
              startPosition + currentChunk.length,
              currentTokens
            ));
            
            // Préparer le chunk suivant avec overlap
            const overlapText = this.getOverlapText(currentChunk, options.overlap);
            startPosition += currentChunk.length - overlapText.length;
            currentChunk = overlapText + sentence;
            currentTokens = this.estimateTokens(currentChunk);
          } else {
            currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else {
        // Le paragraphe tient dans la limite
        if (currentTokens + paragraphTokens > options.maxTokens && currentChunk.trim().length > 0) {
          // Créer le chunk actuel
          chunks.push(this.createChunk(
            documentId,
            currentChunk.trim(),
            title,
            language,
            chunkIndex++,
            startPosition,
            startPosition + currentChunk.length,
            currentTokens
          ));
          
          // Préparer le chunk suivant avec overlap
          const overlapText = this.getOverlapText(currentChunk, options.overlap);
          startPosition += currentChunk.length - overlapText.length;
          currentChunk = overlapText + paragraph;
          currentTokens = this.estimateTokens(currentChunk);
        } else {
          currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
          currentTokens += paragraphTokens;
        }
      }
    }

    // Finaliser le dernier chunk
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push(this.createChunk(
        documentId,
        currentChunk.trim(),
        title,
        language,
        chunkIndex,
        startPosition,
        startPosition + currentChunk.length,
        currentTokens
      ));
    }

    return chunks;
  }

  /**
   * Créer un objet chunk
   */
  private createChunk(
    documentId: string,
    content: string,
    title: string | undefined,
    language: string,
    chunkIndex: number,
    startPosition: number,
    endPosition: number,
    tokenCount: number
  ): DocumentChunk {
    return {
      id: `${documentId}_chunk_${chunkIndex}`,
      content,
      metadata: {
        documentId,
        ...(title && { documentTitle: title }),
        chunkIndex,
        startPosition,
        endPosition,
        tokenCount,
        wordCount: content.split(/\s+/).length,
        language,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Division en phrases selon la langue
   */
  private splitIntoSentences(text: string, language: string): string[] {
    // Patterns de fin de phrase selon la langue
    const sentenceEnders = language === 'fr' 
      ? /[.!?;]\s+/g
      : /[.!?]\s+/g;
    
    const sentences = text.split(sentenceEnders).filter(s => s.trim().length > 0);
    
    // Reconstituer la ponctuation
    const matches = text.match(sentenceEnders) || [];
    const result: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]?.trim();
      if (!sentence) continue;
      
      const punctuation = matches[i] || '';
      result.push(sentence + punctuation.trim());
    }
    
    return result.filter(s => s.length > 0);
  }

  /**
   * Estimation du nombre de tokens (approximation)
   */
  private estimateTokens(text: string): number {
    // Approximation : 1 token ≈ 4 caractères pour les langues européennes
    return Math.ceil(text.length / 4);
  }

  /**
   * Obtenir le texte de chevauchement
   */
  private getOverlapText(text: string, overlapTokens: number): string {
    const overlapChars = overlapTokens * 4; // Approximation
    return text.length > overlapChars 
      ? text.substring(text.length - overlapChars)
      : text;
  }

  /**
   * Obtenir la longueur de chevauchement
   */
  private getOverlapLength(text: string, overlapTokens: number): number {
    const overlapChars = overlapTokens * 4;
    return Math.min(overlapChars, text.length);
  }
}

// Instance singleton
export const documentChunkingService = new DocumentChunkingService();