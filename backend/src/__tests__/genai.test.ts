import { FastifyInstance } from 'fastify';
import { TestHelper } from './helpers';

describe('GenAI Processing API', () => {
  let server: FastifyInstance;
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = TestHelper.getInstance();
    server = await testHelper.getServer();
  });

  afterAll(async () => {
    await testHelper.closeServer();
  });

  describe('POST /api/genai/process', () => {
    const baseRequest = {
      action: 'corriger' as const,
      text: 'Ce texte contient des erreurs de frappe et de grammaire.'
    };

    it('should process text correction request', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: baseRequest
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('result');
      expect(body).toHaveProperty('action', 'corriger');
      expect(body).toHaveProperty('processingTime');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.result).toBe('string');
      expect(body.result.length).toBeGreaterThan(0);
    });

    it('should process text summarization request', async () => {
      const request = {
        action: 'résumer' as const,
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: request
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.action).toBe('résumer');
      expect(body.result).toContain('Résumé');
      expect(body.result).toContain('Points clés');
    });

    it('should process translation request with target language', async () => {
      const request = {
        action: 'traduire' as const,
        text: 'Antonio Guterres a également évoqué les résultats du recensement.',
        options: {
          targetLanguage: 'en'
        }
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: request
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.action).toBe('traduire');
      expect(body.result).toContain('English Translation');
      expect(body.result).toContain('Antonio Guterres also mentioned');
    });

    it('should process translation request for Spanish', async () => {
      const request = {
        action: 'traduire' as const,
        text: 'Les résultats du recensement sont importants.',
        options: {
          targetLanguage: 'es'
        }
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: request
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toContain('Traducción al Español');
    });

    it('should process text optimization request', async () => {
      const request = {
        action: 'optimiser' as const,
        text: 'Ce texte peut être amélioré pour plus de clarté et d\'impact.'
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: request
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.action).toBe('optimiser');
      expect(body.result).toContain('optimisé');
    });

    describe('Validation', () => {
      it('should reject request without action', async () => {
        const request = {
          text: 'Some text'
        };

        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: request
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject request without text', async () => {
        const request = {
          action: 'corriger'
        };

        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: request
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject request with invalid action', async () => {
        const request = {
          action: 'invalid_action',
          text: 'Some text'
        };

        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: request
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject request with empty text', async () => {
        const request = {
          action: 'corriger',
          text: ''
        };

        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: request
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject request with text too long', async () => {
        const request = {
          action: 'corriger',
          text: 'a'.repeat(10001) // Dépasse la limite de 10000 caractères
        };

        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: request
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('Performance', () => {
      it('should respond within reasonable time', async () => {
        const startTime = Date.now();
        
        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: baseRequest
        });

        const responseTime = Date.now() - startTime;
        
        expect(response.statusCode).toBe(200);
        expect(responseTime).toBeLessThan(5000); // Moins de 5 secondes
      });
    });
  });
});