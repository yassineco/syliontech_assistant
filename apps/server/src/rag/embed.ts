import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../config/env.js';

// ==========================================
// SERVICE EMBEDDINGS - MOCK + VERTEX AI
// ==========================================

/**
 * Interface pour le service d'embeddings
 */
export interface EmbeddingService {
  embedTexts(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
}

/**
 * Service TF-IDF simplifié pour le mode MOCK
 */
class MockEmbeddingService implements EmbeddingService {
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private vectorDimension: number = 384; // Dimension fixe pour compatibilité

  /**
   * Construit le vocabulaire et calcule les scores IDF
   */
  private buildVocabulary(texts: string[]): void {
    const documentFreq = new Map<string, number>();
    const totalDocs = texts.length;

    // Compter la fréquence des mots dans les documents
    texts.forEach(text => {
      const words = new Set(this.tokenize(text));
      words.forEach(word => {
        documentFreq.set(word, (documentFreq.get(word) || 0) + 1);
      });
    });

    // Construire le vocabulaire et calculer IDF
    let vocabIndex = 0;
    documentFreq.forEach((freq, word) => {
      this.vocabulary.set(word, vocabIndex++);
      this.idfScores.set(word, Math.log(totalDocs / freq));
    });
  }

  /**
   * Tokenise un texte (simple)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Calcule le vecteur TF-IDF d'un texte
   */
  private computeTfIdf(text: string): number[] {
    const words = this.tokenize(text);
    const termFreq = new Map<string, number>();

    // Calculer TF
    words.forEach(word => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });

    // Normaliser TF
    const totalWords = words.length;
    termFreq.forEach((freq, word) => {
      termFreq.set(word, freq / totalWords);
    });

    // Construire le vecteur TF-IDF
    const vector = new Array(this.vectorDimension).fill(0);
    
    termFreq.forEach((tf, word) => {
      const vocabIndex = this.vocabulary.get(word);
      const idf = this.idfScores.get(word) || 0;
      
      if (vocabIndex !== undefined && vocabIndex < this.vectorDimension) {
        vector[vocabIndex] = tf * idf;
      }
    });

    // Normalisation L2
    return this.normalizeVector(vector);
  }

  /**
   * Normalise un vecteur (L2)
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map(val => val / norm) : vector;
  }

  /**
   * Génère des embeddings pour plusieurs textes
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    // Construire le vocabulaire si nécessaire
    if (this.vocabulary.size === 0) {
      this.buildVocabulary(texts);
    }

    // Calculer les embeddings TF-IDF
    return texts.map(text => this.computeTfIdf(text));
  }

  /**
   * Génère un embedding pour un seul texte
   */
  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embedTexts([text]);
    return results[0] || new Array(this.vectorDimension).fill(0);
  }
}

/**
 * Service Vertex AI pour les embeddings en mode LIVE
 */
class VertexEmbeddingService implements EmbeddingService {
  private vertexAI: VertexAI | null = null;
  private modelName: string;

  constructor() {
    this.modelName = env.EMBED_MODEL || 'text-embedding-004';
    this.initializeVertex();
  }

  /**
   * Initialise Vertex AI
   */
  private initializeVertex(): void {
    try {
      if (!env.GCP_PROJECT_ID || !env.GEMINI_LOCATION) {
        throw new Error('Configuration Vertex AI manquante');
      }

      this.vertexAI = new VertexAI({
        project: env.GCP_PROJECT_ID,
        location: env.GEMINI_LOCATION,
      });

      console.log(`✅ Vertex AI Embeddings initialisé (${this.modelName})`);
    } catch (error) {
      console.error('❌ Erreur initialisation Vertex AI Embeddings:', error);
      this.vertexAI = null;
    }
  }

  /**
   * Vérifie si Vertex AI est disponible
   */
  private isAvailable(): boolean {
    return this.vertexAI !== null;
  }

  /**
   * Génère des embeddings via Vertex AI
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('Vertex AI non disponible');
    }

    try {
      const model = this.vertexAI!.getGenerativeModel({
        model: this.modelName,
      });

      // Traiter par batch pour éviter les timeouts
      const batchSize = 10;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Note: Pour l'instant, utilise un embedding factice
        // TODO: Implémenter l'API Vertex AI embeddings quand disponible
        const batchResults = batch.map(() => {
          // Générer un vecteur aléatoire normalisé comme placeholder
          const vector = Array.from({ length: 768 }, () => Math.random() - 0.5);
          return this.normalizeVector(vector);
        });

        results.push(...batchResults);
      }

      // Normaliser tous les vecteurs
      return results.map(vector => this.normalizeVector(vector));
    } catch (error) {
      console.error('❌ Erreur génération embeddings Vertex AI:', error);
      throw new Error('Échec génération embeddings');
    }
  }

  /**
   * Génère un embedding pour un seul texte
   */
  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embedTexts([text]);
    return results[0] || [];
  }

  /**
   * Normalise un vecteur (L2)
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map(val => val / norm) : vector;
  }
}

/**
 * Factory pour créer le service d'embeddings approprié
 */
function createEmbeddingService(): EmbeddingService {
  if (env.USE_MOCK) {
    console.log('🎭 Mode MOCK - Utilisation TF-IDF local pour embeddings');
    return new MockEmbeddingService();
  } else {
    console.log('🤖 Mode LIVE - Utilisation Vertex AI pour embeddings');
    return new VertexEmbeddingService();
  }
}

// Instance singleton
let embeddingService: EmbeddingService | null = null;

/**
 * Obtient l'instance du service d'embeddings
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = createEmbeddingService();
  }
  return embeddingService;
}

/**
 * Fonction utilitaire pour embedder des textes
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const service = getEmbeddingService();
  return service.embedTexts(texts);
}

/**
 * Fonction utilitaire pour embedder un seul texte
 */
export async function embedSingle(text: string): Promise<number[]> {
  const service = getEmbeddingService();
  return service.embedSingle(text);
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vecteurs de tailles différentes');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Vérifie si le service d'embeddings est disponible
 */
export function isEmbeddingServiceAvailable(): boolean {
  try {
    const service = getEmbeddingService();
    return service !== null;
  } catch {
    return false;
  }
}