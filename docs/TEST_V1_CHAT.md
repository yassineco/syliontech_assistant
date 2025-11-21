# Test API v1/chat SylionTech Assistant

## Test de la route POST /v1/chat

### Prérequis
- Serveur backend démarré sur http://localhost:3001
- API key valide pour authentification multi-tenant

### Test 1: Requête basique
```bash
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: syliontech-demo-key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Bonjour, que fait SylionTech ?"
      }
    ],
    "session": {
      "userId": "visitor-123",
      "lang": "fr",
      "channel": "web-widget"
    }
  }'
```

### Test 2: API key invalide
```bash
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Test"
      }
    ]
  }'
```

### Test 3: Payload invalide
```bash
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: syliontech-demo-key" \
  -d '{
    "messages": []
  }'
```

### Réponse attendue (Test 1)
```json
{
  "reply": "Bonjour, je suis l'assistant SylionTech...",
  "intent": "faq",
  "citations": [
    {
      "title": "Présentation SylionTech",
      "url": "https://example.com/docs/presentation",
      "snippet": "Court extrait de la source..."
    }
  ],
  "meta": {
    "tenantId": "syliontech-demo",
    "latencyMs": 120,
    "model": "gemini-1.5-flash"
  }
}
```

### Notes
- La route utilise le middleware multi-tenant avec authentification par API key
- RAG activé automatiquement si configuré pour le tenant
- Validation stricte des messages avec schémas Fastify
- Gestion d'erreurs HTTP propres (400, 401, 500)
- Logging structuré pour monitoring