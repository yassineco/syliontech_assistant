import { z } from 'zod';

// ==========================================
// TYPES RAG - SOFINCO ASSISTANT
// ==========================================

/**
 * Chunk de document avec embedding vectoriel
 */
export const DocChunkSchema = z.object({
  id: z.string(), // ID unique du chunk (docId_chunkIndex)
  docId: z.string(), // ID du document source
  title: z.string(), // Titre du document
  url: z.string().optional(), // URL ou ancre pour référence
  text: z.string(), // Contenu textuel du chunk
  vector: z.array(z.number()).optional(), // Embedding vectoriel
  tokens: z.number().optional(), // Nombre de tokens estimé
});

export type DocChunk = z.infer<typeof DocChunkSchema>;

/**
 * Requête de recherche RAG
 */
export const RagQuerySchema = z.object({
  q: z.string().min(1).max(500), // Question/requête utilisateur
  topK: z.number().min(1).max(20).default(5), // Nombre de résultats souhaités
});

export type RagQuery = z.infer<typeof RagQuerySchema>;

/**
 * Résultat de recherche RAG avec scores
 */
export const RagResultSchema = z.object({
  chunks: z.array(
    DocChunkSchema.extend({
      score: z.number(), // Score de similarité cosinus [0,1]
    })
  ),
});

export type RagResult = z.infer<typeof RagResultSchema>;

/**
 * Citation générée par l'assistant
 */
export const CitationSchema = z.object({
  title: z.string(), // Titre du document source
  anchor: z.string().optional(), // Ancre/section (#section)
  url: z.string().optional(), // URL complète si disponible
});

export type Citation = z.infer<typeof CitationSchema>;

/**
 * Réponse de l'assistant avec citations
 */
export const LLMResponseSchema = z.object({
  reply: z.string(), // Réponse textuelle
  citations: z.array(CitationSchema), // Sources citées
  confidence: z.number().min(0).max(1).optional(), // Niveau de confiance
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

/**
 * Index RAG complet sauvegardé
 */
export const RagIndexSchema = z.object({
  version: z.string(), // Version de l'index
  buildDate: z.string(), // Date de création ISO
  chunks: z.array(DocChunkSchema), // Tous les chunks avec embeddings
  totalDocs: z.number(), // Nombre de documents indexés
  totalChunks: z.number(), // Nombre total de chunks
});

export type RagIndex = z.infer<typeof RagIndexSchema>;

/**
 * Métadonnées d'un document
 */
export const DocumentMetadataSchema = z.object({
  docId: z.string(),
  title: z.string(),
  filePath: z.string(),
  lastModified: z.string(), // ISO timestamp
  size: z.number(), // Taille en bytes
  chunkCount: z.number(), // Nombre de chunks générés
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

/**
 * Statistiques de l'index
 */
export const IndexStatsSchema = z.object({
  totalDocs: z.number(),
  totalChunks: z.number(),
  avgChunkSize: z.number(),
  buildTime: z.number(), // Temps de construction en ms
  lastBuild: z.string(), // ISO timestamp
});

export type IndexStats = z.infer<typeof IndexStatsSchema>;