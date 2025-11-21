import { FastifyInstance } from 'fastify';
import { TestHelper } from './helpers';

describe('Integration Tests - Full Workflows', () => {
  let server: FastifyInstance;
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = TestHelper.getInstance();
    server = await testHelper.getServer();
  });

  afterAll(async () => {
    await testHelper.closeServer();
  });

  describe('Complete RAG Workflow', () => {
    it('should handle full document upload and query cycle', async () => {
      // 1. Upload a document
      const documentContent = 'Antonio Guterres a évoqué les résultats du recensement marocain de septembre 2024. La population a augmenté significativement dans les Provinces du Sud.';
      
      const uploadResponse = await server.inject({
        method: 'POST',
        url: '/rag/documents',
        payload: {
          fileName: 'test-integration.txt',
          content: documentContent
        }
      });

      expect(uploadResponse.statusCode).toBe(200);
      const uploadBody = JSON.parse(uploadResponse.body);
      expect(uploadBody.success).toBe(true);

      // 2. Search for content
      const searchResponse = await server.inject({
        method: 'GET',
        url: '/rag/search?q=antonio'
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchBody = JSON.parse(searchResponse.body);
      expect(searchBody.success).toBe(true);
      expect(searchBody.results.length).toBeGreaterThan(0);

      // 3. Generate augmented response
      const generateResponse = await server.inject({
        method: 'POST',
        url: '/rag/generate',
        payload: {
          query: 'antonio'
        }
      });

      expect(generateResponse.statusCode).toBe(200);
      const generateBody = JSON.parse(generateResponse.body);
      expect(generateBody.success).toBe(true);
      expect(generateBody.response).toContain('Antonio Guterres');
    });
  });

  describe('Translation Workflow', () => {
    it('should handle complete translation workflow for multiple languages', async () => {
      const frenchText = 'Antonio Guterres a également évoqué les résultats du recensement';
      
      const languages = [
        { code: 'en', expectedContent: 'English Translation' },
        { code: 'es', expectedContent: 'Traducción al Español' },
        { code: 'de', expectedContent: 'Deutsche Übersetzung' },
        { code: 'it', expectedContent: 'Traduzione Italiana' }
      ];

      for (const lang of languages) {
        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: {
            action: 'traduire',
            text: frenchText,
            options: {
              targetLanguage: lang.code
            }
          }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.result).toContain(lang.expectedContent);
      }
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle chain of invalid requests gracefully', async () => {
      // Test séquence d'erreurs pour vérifier la stabilité
      const invalidRequests = [
        {
          method: 'POST',
          url: '/api/genai/process',
          payload: { /* missing required fields */ }
        },
        {
          method: 'GET',
          url: '/rag/search'
          // missing query parameter
        },
        {
          method: 'POST',
          url: '/rag/generate',
          payload: { /* missing query */ }
        }
      ];

      for (const request of invalidRequests) {
        const response = await server.inject(request as any);
        expect(response.statusCode).toBe(400);
        
        // Vérifier que le serveur continue à fonctionner après l'erreur
        const healthResponse = await server.inject({
          method: 'GET',
          url: '/health'
        });
        expect(healthResponse.statusCode).toBe(200);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: {
            action: 'corriger',
            text: `Test text number ${i} with some errors to correct.`
          }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // Tous les requests doivent réussir
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Le temps total ne devrait pas être excessif
      expect(totalTime).toBeLessThan(15000); // Moins de 15 secondes pour 10 requests
    });
  });

  describe('System Health Validation', () => {
    it('should maintain system health through various operations', async () => {
      // Effectuer plusieurs opérations différentes
      const operations = [
        { method: 'GET', url: '/health' },
        { method: 'POST', url: '/api/genai/process', payload: { action: 'corriger', text: 'test' } },
        { method: 'GET', url: '/rag/health' },
        { method: 'GET', url: '/rag/stats' },
        { method: 'POST', url: '/rag/documents', payload: { content: 'test content' } },
        { method: 'GET', url: '/rag/search?q=test' },
        { method: 'POST', url: '/rag/generate', payload: { query: 'test' } }
      ];

      for (const operation of operations) {
        const response = await server.inject(operation as any);
        expect([200, 201].includes(response.statusCode)).toBe(true);
        
        // Vérifier la santé après chaque opération
        const healthCheck = await server.inject({
          method: 'GET',
          url: '/health'
        });
        expect(healthCheck.statusCode).toBe(200);
        
        const healthBody = JSON.parse(healthCheck.body);
        expect(healthBody.status).toBe('running');
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent responses for identical requests', async () => {
      const request = {
        method: 'POST',
        url: '/api/genai/process',
        payload: {
          action: 'corriger',
          text: 'Ce texte contient des erreurs.'
        }
      };

      const responses = await Promise.all([
        server.inject(request as any),
        server.inject(request as any),
        server.inject(request as any)
      ]);

      // Tous les responses doivent avoir le même action
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.action).toBe('corriger');
        expect(body.result).toBeDefined();
      });

      // Les résultats devraient être identiques (simulation déterministe)
      const results = responses.map(r => JSON.parse(r.body).result);
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });
});