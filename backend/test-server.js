const http = require('http');

const express = require('express');
const app = express();
const port = 8080;

// CORS pour Chrome extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

// Route health simple
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route de test pour extension
app.post('/api/genai/process', (req, res) => {
  console.log('Extension request:', req.body);
  
  const { action, text, options } = req.body;
  
  // Simulation de traduction simple
  if (action === 'translate') {
    const fakeTranslation = `This is a simple translation of: ${text.substring(0, 50)}...`;
    res.json({
      success: true,
      result: fakeTranslation,
      action: 'translate',
      metadata: {
        originalLength: text.length,
        resultLength: fakeTranslation.length,
        processingTime: 100
      }
    });
  } else {
    res.json({
      success: true,
      result: `Processed ${action}: ${text.substring(0, 50)}...`,
      action: action,
      metadata: {
        originalLength: text.length,
        resultLength: 50,
        processingTime: 50
      }
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:${port}`);
});

const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      port: 8081
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 8081; // Port différent pour éviter les conflits
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Test server running on http://127.0.0.1:${PORT}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`✅ Test health: curl http://127.0.0.1:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('error', (err) => {
  console.error('❌ Erreur serveur:', err);
});

server.listen(8080, '127.0.0.1', () => {
  console.log('✅ Serveur test démarré sur http://127.0.0.1:8080');
});