/**
 * Point d'entrée RAG unifié
 * Exports intelligents (simulation ↔ production)
 */

// ===== SERVICE INTELLIGENT (BASCULE SIMULATION ↔ RÉEL) =====
export { smartRAGService } from './smart-rag';

// ===== SERVICE DE COMPATIBILITÉ =====
export { ragService } from './rag-service-bridge';

// ===== SERVICES RAG (SIMULATION) =====
export { vertexEmbeddingsService } from './embeddings';
export { vectorDatabaseService } from './vector-db';
export { documentChunkingService as chunkingService } from './chunking';
export { documentStorageService } from './storage';

// ===== SERVICES RAG (PRODUCTION RÉELLE) =====
export { VertexEmbeddingsService } from './embeddings-real';
export { realVectorDatabaseService } from './vector-db-real';

// ===== TYPES =====
export type {
  DocumentChunk,
  ChunkingOptions,
} from './chunking';

export type {
  VectorDocument,
  SearchResult,
  SearchOptions,
  IndexStats,
} from './vector-db';

export type {
  DocumentMetadata,
  UploadResult,
} from './storage';