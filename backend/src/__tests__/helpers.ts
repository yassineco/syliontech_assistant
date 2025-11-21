import { FastifyInstance } from 'fastify';
import { createServer } from '../server';

export class TestHelper {
  private static instance: TestHelper;
  private server: FastifyInstance | null = null;
  private port: number = 0;

  static getInstance(): TestHelper {
    if (!TestHelper.instance) {
      TestHelper.instance = new TestHelper();
    }
    return TestHelper.instance;
  }

  async getServer(): Promise<FastifyInstance> {
    if (!this.server) {
      this.server = await createServer();
      // Utiliser un port dynamique pour les tests
      await this.server.listen({ port: 0, host: '127.0.0.1' });
      this.port = (this.server.server.address() as any)?.port || 0;
    }
    return this.server!; // Non-null assertion après vérification
  }

  getPort(): number {
    return this.port;
  }

  async closeServer(): Promise<void> {
    if (this.server) {
      await this.server.close();
      this.server = null;
      this.port = 0;
    }
  }

  // Helper pour créer des requêtes de test
  createTestRequest(action: string, text: string, options?: any) {
    return {
      action,
      text,
      options: options || {}
    };
  }

  // Helper pour créer des requêtes RAG
  createRAGRequest(query: string, documents?: string[]) {
    return {
      query,
      documents: documents || []
    };
  }

  // Mock responses communes
  getMockAIResponse(action: string, text: string) {
    return {
      result: `Processed ${action} for text: ${text.substring(0, 50)}...`,
      action,
      processingTime: 100,
      timestamp: new Date().toISOString()
    };
  }

  getMockRAGResponse(query: string) {
    return {
      success: true,
      response: `Mock response for query: ${query}`,
      sources: [
        {
          id: 'test_chunk_1',
          content: 'Test content chunk',
          similarity: 0.85,
          metadata: {
            documentId: 'test_doc_1',
            fileName: 'test.txt'
          }
        }
      ],
      processingTimeMs: 500,
      tokensUsed: 100
    };
  }
}