import type { DocChunk } from './types.js';

// ==========================================
// SERVICE CHUNKING MARKDOWN
// ==========================================

/**
 * Configuration du chunking
 */
const CHUNK_CONFIG = {
  maxTokens: 800, // Taille maximale d'un chunk en tokens (approximatif)
  minTokens: 50, // Taille minimale d'un chunk (réduite pour FAQ courtes)
  overlapTokens: 100, // Chevauchement entre chunks
  wordsPerToken: 0.75, // Approximation: 1 token ≈ 0.75 mots en français
};

/**
 * Estime le nombre de tokens d'un texte
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / CHUNK_CONFIG.wordsPerToken);
}

/**
 * Extrait les sections d'un markdown (H1, H2, H3)
 */
function extractSections(markdown: string): Array<{ title: string; content: string; level: number; anchor: string }> {
  const lines = markdown.split('\n');
  const sections: Array<{ title: string; content: string; level: number; anchor: string }> = [];
  let currentSection: { title: string; content: string; level: number; anchor: string } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    
    if (headerMatch) {
      // Sauvegarder la section précédente
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Créer une nouvelle section
      const level = headerMatch[1]?.length || 1;
      const title = headerMatch[2]?.trim() || 'Section sans titre';
      const anchor = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      currentSection = {
        title,
        level,
        anchor,
        content: '',
      };
    } else if (currentSection) {
      // Ajouter du contenu à la section courante
      currentSection.content += line + '\n';
    }
  }

  // Ajouter la dernière section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections.filter(section => section.content.trim().length > 0);
}

/**
 * Découpe un texte en chunks de taille appropriée
 */
function splitTextIntoChunks(text: string, maxTokens: number, overlapTokens: number): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    // Si la phrase seule dépasse la limite, on la garde quand même
    if (sentenceTokens > maxTokens && currentChunk === '') {
      chunks.push(sentence.trim());
      continue;
    }
    
    // Si ajouter cette phrase dépasse la limite
    if (currentTokens + sentenceTokens > maxTokens && currentChunk !== '') {
      chunks.push(currentChunk.trim());
      
      // Démarrer un nouveau chunk avec chevauchement
      const lastSentences = currentChunk.split(/[.!?]+/).slice(-2);
      currentChunk = lastSentences.join('. ') + '. ' + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      // Ajouter la phrase au chunk courant
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  // Ajouter le dernier chunk s'il n'est pas vide
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const filteredChunks = chunks.filter(chunk => {
    const tokens = estimateTokens(chunk);
    return tokens >= CHUNK_CONFIG.minTokens;
  });
  
  return filteredChunks;
}

/**
 * Génère des chunks à partir d'un fichier markdown
 */
export function chunkMarkdown(
  markdown: string, 
  docId: string, 
  title: string, 
  baseUrl?: string
): DocChunk[] {
  const sections = extractSections(markdown);
  const chunks: DocChunk[] = [];
  let chunkIndex = 0;

  // Si pas de sections détectées, traiter le document entier
  if (sections.length === 0) {
    const textChunks = splitTextIntoChunks(markdown, CHUNK_CONFIG.maxTokens, CHUNK_CONFIG.overlapTokens);
    
    textChunks.forEach((textChunk) => {
      chunks.push({
        id: `${docId}_${chunkIndex++}`,
        docId,
        title,
        url: baseUrl ? `${baseUrl}#document` : undefined,
        text: textChunk,
        tokens: estimateTokens(textChunk),
      });
    });

    return chunks;
  }

  // Traiter chaque section
  for (const section of sections) {
    const sectionText = `${section.title}\n\n${section.content}`;
    const textChunks = splitTextIntoChunks(sectionText, CHUNK_CONFIG.maxTokens, CHUNK_CONFIG.overlapTokens);
    
    textChunks.forEach((textChunk, idx) => {
      chunks.push({
        id: `${docId}_${chunkIndex++}`,
        docId,
        title: `${title} - ${section.title}`,
        url: baseUrl ? `${baseUrl}#${section.anchor}` : `#${section.anchor}`,
        text: textChunk,
        tokens: estimateTokens(textChunk),
      });
    });
  }

  return chunks;
}

/**
 * Nettoie et normalise le texte markdown
 */
export function cleanMarkdownText(markdown: string): string {
  return markdown
    // Supprimer les liens markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Supprimer les emphases
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Supprimer les codes inline
    .replace(/`([^`]+)`/g, '$1')
    // Normaliser les espaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valide qu'un chunk est de qualité suffisante
 */
export function validateChunk(chunk: DocChunk): boolean {
  // Vérifier la taille minimale
  if (!chunk.text || chunk.text.trim().length < 30) {
    return false;
  }

  // Vérifier le nombre de tokens
  if (chunk.tokens && chunk.tokens < CHUNK_CONFIG.minTokens) {
    return false;
  }

  // Vérifier qu'il y a du contenu informatif
  const words = chunk.text.trim().split(/\s+/).length;
  if (words < 10) {
    return false;
  }

  return true;
}

/**
 * Post-traite les chunks pour optimiser la qualité
 */
export function postProcessChunks(chunks: DocChunk[]): DocChunk[] {
  return chunks
    .map(chunk => ({
      ...chunk,
      text: cleanMarkdownText(chunk.text),
    }))
    .filter(validateChunk)
    .map((chunk, index) => ({
      ...chunk,
      id: `${chunk.docId}_${index}`, // Renumérote après filtrage
    }));
}