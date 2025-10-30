import fs from 'fs/promises';
import path from 'path';
import type { DocChunk, RagIndex, RagQuery, RagResult, IndexStats } from './types.js';
import { RagIndexSchema } from './types.js';
import { loadKnowledgeDocuments } from './knowledge-loader.js';
import { chunkMarkdown, postProcessChunks } from './chunk.js';
import { embedTexts, cosineSimilarity } from './embed.js';

// ==========================================
// SERVICE INDEX VECTORIEL RAG
// ==========================================

/**
 * Configuration de l'index
 */
const INDEX_CONFIG = {
  dataDir: 'data',
  indexFile: 'rag_index.json',
  version: '1.0.0',
  maxResults: 20,
  minSimilarityScore: 0.1,
};

/**
 * Gestionnaire de l'index RAG
 */
export class RagIndexManager {
  private index: RagIndex | null = null;
  private vectorMatrix: number[][] = [];
  private dataDir: string;
  private indexPath: string;

  constructor(dataDir = INDEX_CONFIG.dataDir) {
    this.dataDir = path.resolve(dataDir);
    this.indexPath = path.join(this.dataDir, INDEX_CONFIG.indexFile);
  }

  /**
   * Construit l'index à partir du dossier de connaissances
   */
  async buildIndexFromFolder(knowledgeDir = 'knowledge'): Promise<IndexStats> {
    const startTime = Date.now();
    console.log(`🔨 Construction de l'index RAG depuis ${knowledgeDir}...`);

    try {
      // Créer le dossier data s'il n'existe pas
      await fs.mkdir(this.dataDir, { recursive: true });

      // Charger tous les documents
      const documents = await loadKnowledgeDocuments(knowledgeDir);
      console.log(`📚 ${documents.length} documents trouvés`);

      if (documents.length === 0) {
        throw new Error('Aucun document trouvé dans le dossier de connaissances');
      }

      // Générer les chunks
      let allChunks: DocChunk[] = [];
      
      for (const doc of documents) {
        const chunks = chunkMarkdown(
          doc.content,
          doc.docId,
          doc.title,
          doc.url
        );
        allChunks.push(...chunks);
      }

      // Post-traitement des chunks
      allChunks = postProcessChunks(allChunks);
      console.log(`✂️ ${allChunks.length} chunks générés après filtrage`);

      if (allChunks.length === 0) {
        throw new Error('Aucun chunk valide généré');
      }

      // Générer les embeddings
      console.log('🧠 Génération des embeddings...');
      const texts = allChunks.map(chunk => chunk.text);
      const embeddings = await embedTexts(texts);

      // Ajouter les embeddings aux chunks
      const chunksWithEmbeddings = allChunks.map((chunk, index) => ({
        ...chunk,
        vector: embeddings[index] || [],
      }));

      // Créer l'index
      const index: RagIndex = {
        version: INDEX_CONFIG.version,
        buildDate: new Date().toISOString(),
        chunks: chunksWithEmbeddings,
        totalDocs: documents.length,
        totalChunks: chunksWithEmbeddings.length,
      };

      // Sauvegarder l'index
      await this.saveIndex(index);
      
      // Charger l'index en mémoire
      await this.loadIndex();

      const buildTime = Date.now() - startTime;
      console.log(`✅ Index construit en ${buildTime}ms`);

      return {
        totalDocs: documents.length,
        totalChunks: chunksWithEmbeddings.length,
        avgChunkSize: Math.round(
          chunksWithEmbeddings.reduce((sum, chunk) => sum + chunk.text.length, 0) / 
          chunksWithEmbeddings.length
        ),
        buildTime,
        lastBuild: index.buildDate,
      };

    } catch (error) {
      console.error('❌ Erreur lors de la construction de l\'index:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde l'index sur disque
   */
  private async saveIndex(index: RagIndex): Promise<void> {
    try {
      // Valider l'index avec Zod
      const validatedIndex = RagIndexSchema.parse(index);
      
      const jsonData = JSON.stringify(validatedIndex, null, 2);
      await fs.writeFile(this.indexPath, jsonData, 'utf8');
      
      console.log(`💾 Index sauvegardé: ${this.indexPath}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde index:', error);
      throw new Error('Impossible de sauvegarder l\'index');
    }
  }

  /**
   * Charge l'index depuis le disque
   */
  async loadIndex(): Promise<boolean> {
    try {
      const jsonData = await fs.readFile(this.indexPath, 'utf8');
      const indexData = JSON.parse(jsonData);
      
      // Valider avec Zod
      this.index = RagIndexSchema.parse(indexData);
      
      // Préparer la matrice vectorielle pour les recherches
      this.vectorMatrix = this.index.chunks.map(chunk => chunk.vector || []);
      
      console.log(`📖 Index chargé: ${this.index.totalChunks} chunks`);
      return true;
    } catch (error) {
      console.warn('⚠️ Impossible de charger l\'index:', error);
      this.index = null;
      this.vectorMatrix = [];
      return false;
    }
  }

  /**
   * Vérifie si l'index est disponible
   */
  isIndexAvailable(): boolean {
    return this.index !== null && this.index.chunks.length > 0;
  }

  /**
   * Recherche dans l'index
   */
  async searchIndex(query: RagQuery): Promise<RagResult> {
    if (!this.isIndexAvailable()) {
      console.warn('⚠️ Index non disponible pour la recherche');
      return { chunks: [] };
    }

    try {
      // Générer l'embedding de la requête
      const [queryEmbedding] = await embedTexts([query.q]);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('⚠️ Impossible de générer l\'embedding pour la requête');
        return { chunks: [] };
      }

      // Calculer les similarités
      const similarities: Array<{ chunk: DocChunk; score: number }> = [];
      
      this.index!.chunks.forEach((chunk, index) => {
        const chunkVector = this.vectorMatrix[index];
        
        if (chunkVector && chunkVector.length > 0) {
          const score = cosineSimilarity(queryEmbedding, chunkVector);
          
          if (score >= INDEX_CONFIG.minSimilarityScore) {
            similarities.push({ chunk, score });
          }
        }
      });

      // Trier par score décroissant
      similarities.sort((a, b) => b.score - a.score);

      // Limiter les résultats
      const topResults = similarities
        .slice(0, Math.min(query.topK || 5, INDEX_CONFIG.maxResults))
        .map(item => ({
          ...item.chunk,
          score: item.score,
        }));

      console.log(`🔍 Recherche "${query.q}": ${topResults.length} résultats`);
      
      return { chunks: topResults };

    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      return { chunks: [] };
    }
  }

  /**
   * Obtient les statistiques de l'index
   */
  getIndexStats(): IndexStats | null {
    if (!this.isIndexAvailable()) {
      return null;
    }

    const chunks = this.index!.chunks;
    const avgChunkSize = chunks.length > 0 
      ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / chunks.length)
      : 0;

    return {
      totalDocs: this.index!.totalDocs,
      totalChunks: this.index!.totalChunks,
      avgChunkSize,
      buildTime: 0, // Non stocké dans l'index
      lastBuild: this.index!.buildDate,
    };
  }

  /**
   * Supprime l'index
   */
  async deleteIndex(): Promise<void> {
    try {
      await fs.unlink(this.indexPath);
      this.index = null;
      this.vectorMatrix = [];
      console.log('🗑️ Index supprimé');
    } catch (error) {
      console.warn('⚠️ Erreur suppression index:', error);
    }
  }

  /**
   * Vérifie si l'index existe sur le disque
   */
  async indexExists(): Promise<boolean> {
    try {
      await fs.access(this.indexPath);
      return true;
    } catch {
      return false;
    }
  }
}

// Instance singleton
let ragIndexManager: RagIndexManager | null = null;

/**
 * Obtient l'instance du gestionnaire d'index
 */
export function getRagIndexManager(): RagIndexManager {
  if (!ragIndexManager) {
    ragIndexManager = new RagIndexManager();
  }
  return ragIndexManager;
}

/**
 * Fonction utilitaire pour construire l'index
 */
export async function buildIndexFromFolder(knowledgeDir = 'knowledge'): Promise<IndexStats> {
  const manager = getRagIndexManager();
  return manager.buildIndexFromFolder(knowledgeDir);
}

/**
 * Fonction utilitaire pour rechercher dans l'index
 */
export async function searchIndex(query: string, topK = 5): Promise<RagResult> {
  const manager = getRagIndexManager();
  
  // Charger l'index s'il n'est pas déjà en mémoire
  if (!manager.isIndexAvailable()) {
    await manager.loadIndex();
  }
  
  return manager.searchIndex({ q: query, topK });
}

/**
 * Fonction utilitaire pour vérifier la disponibilité
 */
export async function isRagIndexAvailable(): Promise<boolean> {
  const manager = getRagIndexManager();
  
  if (manager.isIndexAvailable()) {
    return true;
  }
  
  // Essayer de charger l'index
  return manager.loadIndex();
}