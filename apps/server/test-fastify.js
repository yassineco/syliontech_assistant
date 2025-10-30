import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

// Route simple
fastify.get('/test', async (request, reply) => {
  return { hello: 'world', timestamp: new Date().toISOString() };
});

// Démarrage
const start = async () => {
  try {
    console.log('🔧 Démarrage serveur Fastify test...');
    const address = await fastify.listen({
      port: 3002,
      host: '127.0.0.1'
    });
    console.log(`✅ Serveur test sur ${address}`);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
};

start();