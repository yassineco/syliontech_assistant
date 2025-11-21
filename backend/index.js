const fastify = require('fastify');

async function start() {
  const server = fastify({
    logger: true
  });

  // Route de santé
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Route principale
  server.get('/', async () => {
    return { 
      name: 'Magic Button API',
      version: '1.0.0',
      status: 'running',
      environment: process.env.NODE_ENV
    };
  });

  // Route test pour GenAI
  server.post('/api/genai/process', async (request) => {
    const body = request.body;
    
    // Réponse simulée
    return {
      result: `Résultat simulé pour action: ${body.action || 'unknown'}`,
      action: body.action || 'unknown',
      processingTime: 150,
      timestamp: new Date().toISOString()
    };
  });

  try {
    const port = parseInt(process.env.PORT || '8080');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Magic Button API running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();