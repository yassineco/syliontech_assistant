import { FastifyInstance } from 'fastify';
import { TestHelper } from './helpers';

describe('API Health and Basic Functionality', () => {
  let server: FastifyInstance;
  let testHelper: TestHelper;

  beforeAll(async () => {
    testHelper = TestHelper.getInstance();
    server = await testHelper.getServer();
  });

  afterAll(async () => {
    await testHelper.closeServer();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('version');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/non-existent-route'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle invalid JSON in POST requests', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/genai/process',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('CORS', () => {
    describe('CORS', () => {
    it('should include CORS headers for Chrome extensions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Origin': 'chrome-extension://test-extension-id'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight for Chrome extensions', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/genai/process',
        headers: {
          'Origin': 'chrome-extension://test-extension-id',
          'Access-Control-Request-Method': 'POST'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
  });
});