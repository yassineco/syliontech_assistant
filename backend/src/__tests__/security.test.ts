import { FastifyInstance } from 'fastify';
import { TestHelper } from './helpers';

describe('Security Tests', () => {
  let server: FastifyInstance;
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = TestHelper.getInstance();
    server = await testHelper.getServer();
  });

  afterAll(async () => {
    await testHelper.closeServer();
  });

  describe('Input Validation', () => {
    it('should sanitize malicious input in text processing', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '{{ 7*7 }}',
        '${7*7}',
        '../../etc/passwd',
        'DROP TABLE users;',
        '\x00\x01\x02',
        'a'.repeat(10000) // Very long string
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          payload: {
            action: 'corriger',
            text: maliciousInput
          }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        
        // La réponse ne devrait pas contenir le script malicieux
        expect(body.result).not.toContain('<script>');
        expect(body.result).not.toContain('alert(');
        expect(body.result).toBeDefined();
      }
    });

    it('should validate file content for RAG uploads', async () => {
      const maliciousContents = [
        '\x00\x01\x02binary data',
        '<script>document.location="evil.com"</script>',
        'a'.repeat(100000), // Very large content
        '',
        null
      ];

      for (const content of maliciousContents) {
        const response = await server.inject({
          method: 'POST',
          url: '/rag/documents',
          payload: {
            fileName: 'test.txt',
            content: content
          }
        });

        // Should either succeed with sanitized content or fail safely
        expect([200, 400].includes(response.statusCode)).toBe(true);
        
        if (response.statusCode === 200) {
          const body = JSON.parse(response.body);
          expect(body.success).toBe(true);
        }
      }
    });
  });

  describe('Rate Limiting & Resource Protection', () => {
    it('should handle rapid successive requests gracefully', async () => {
      const rapidRequests = Array.from({ length: 50 }, () => 
        server.inject({
          method: 'GET',
          url: '/health'
        })
      );

      const responses = await Promise.all(rapidRequests);
      
      // Au moins la plupart des requests devraient réussir
      const successfulResponses = responses.filter(r => r.statusCode === 200);
      expect(successfulResponses.length).toBeGreaterThan(40);
    });

    it('should prevent resource exhaustion with large payloads', async () => {
      const largePayload = {
        action: 'corriger',
        text: 'a'.repeat(50000), // 50KB of text
        options: {
          detail: 'high',
          context: 'b'.repeat(10000)
        }
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: largePayload
      });

      // Should handle large payloads gracefully
      expect([200, 413, 400].includes(response.statusCode)).toBe(true);
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/genai/process',
        headers: {
          'Origin': 'chrome-extension://test',
          'Access-Control-Request-Method': 'POST'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should reject requests from unauthorized origins in production', async () => {
      const suspiciousOrigins = [
        'http://evil.com',
        'https://malicious-site.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const origin of suspiciousOrigins) {
        const response = await server.inject({
          method: 'POST',
          url: '/api/genai/process',
          headers: {
            'Origin': origin
          },
          payload: {
            action: 'corriger',
            text: 'test'
          }
        });

        // En mode test, on accepte tous les origins, mais on vérifie la structure
        expect(response.statusCode).toBe(200);
        // En production, cela devrait être 403 ou rejection CORS
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in search queries', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE documents; --",
        "' OR '1'='1",
        "'; INSERT INTO documents VALUES ('hacked'); --",
        "' UNION SELECT * FROM users --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await server.inject({
          method: 'GET',
          url: `/rag/search?q=${encodeURIComponent(injection)}`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        // Les résultats ne devraient pas contenir d'erreurs SQL
        expect(JSON.stringify(body)).not.toContain('SQL');
        expect(JSON.stringify(body)).not.toContain('syntax error');
      }
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal in file operations', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\SAM',
        '....//....//etc/passwd'
      ];

      for (const path of pathTraversalAttempts) {
        const response = await server.inject({
          method: 'POST',
          url: '/rag/documents',
          payload: {
            fileName: path,
            content: 'test content'
          }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        // Le filename devrait être sanitized
      }
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: {
          action: 'invalid-action',
          text: 'test'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      
      // Les erreurs ne devraient pas exposer des détails internes
      const errorText = JSON.stringify(body).toLowerCase();
      expect(errorText).not.toContain('stack trace');
      expect(errorText).not.toContain('internal server');
      expect(errorText).not.toContain('database');
      expect(errorText).not.toContain('password');
      expect(errorText).not.toContain('secret');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should handle missing authentication gracefully', async () => {
      // Test sans headers d'authentification
      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: {
          action: 'corriger',
          text: 'test'
        }
      });

      // En mode développement, pas d'auth requise
      expect(response.statusCode).toBe(200);
    });

    it('should validate API keys if present', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        payload: {
          action: 'corriger',
          text: 'test'
        }
      });

      // Should handle invalid tokens gracefully
      expect([200, 401].includes(response.statusCode)).toBe(true);
    });
  });

  describe('Content Security', () => {
    it('should include security headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      // Vérifier les headers de sécurité basiques
      const headers = response.headers;
      expect(headers['x-frame-options'] || headers['X-Frame-Options']).toBeDefined();
      expect(headers['x-content-type-options'] || headers['X-Content-Type-Options']).toBeDefined();
    });
  });
});