import fastify from 'fastify';
import { config } from './config/env';

async function start() {
  const server = fastify({
    logger: true
  });

  // Route de santé simple
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Route principale
  server.get('/', async () => {
    return { 
      name: 'Magic Button API',
      version: '1.0.0',
      status: 'running'
    };
  });

  // Route test pour GenAI (réponse simulée pour commencer)
  server.post('/api/genai/process', async (request) => {
    const body = request.body as any;
    
    // Réponse simulée rapide
    return {
      result: `Résultat simulé pour action: ${body.action || 'unknown'}`,
      action: body.action || 'unknown',
      processingTime: 150
    };
  });

  try {
    const port = parseInt(String(config.PORT || '8080'));
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();