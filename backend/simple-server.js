const http = require('http');

console.log('🚀 Serveur ultra-simple pour extension...');

const server = http.createServer((req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);
  
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/demo/status') {
    const response = {
      success: true,
      data: { currentMode: 'WORKING' }
    };
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }
  
  if (req.url === '/api/genai/process' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('✅ Données reçues:', JSON.stringify(data, null, 2));
        
        const response = {
          success: true,
          result: `🎉 EXTENSION FONCTIONNE!\n\nAction: ${data.action}\nTexte traité: "${data.text?.substring(0, 100)}..."\n\n✅ Mode persistant actif\n🚀 Connexion extension ↔ serveur OK!`
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('❌ Erreur parsing JSON:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON', details: error.message }));
      }
    });
    return;
  }
  
  // Autres routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Route non trouvée' }));
});

server.on('error', (err) => {
  console.error('❌ ERREUR SERVEUR:', err);
  if (err.code === 'EADDRINUSE') {
    console.log('Port 8080 déjà utilisé, essai port 8081...');
    server.listen(8081, () => {
      console.log('✅ Serveur démarré sur http://localhost:8081');
    });
  }
});

// Tentative sur port 8080 d'abord
server.listen(8080, () => {
  console.log('✅ Serveur prêt sur http://localhost:8080');
  console.log('🔗 Test: curl http://localhost:8080/demo/status');
});