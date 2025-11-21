// Configuration API Magic Button
// Basculer entre développement et production

const isDevelopment = false; // ✅ MODE PRODUCTION - API Cloud Run avec gemini-2.5-flash

export const API_CONFIG = {
  // URLs
  BASE_URL: isDevelopment 
    ? 'http://localhost:8080' 
    : 'https://magic-button-api-374140035541.europe-west1.run.app',
  
  // Endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    PROCESS: '/api/genai/process', // Route qui utilise Vertex AI
    DEMO_STATUS: '/demo/status',
    RAG_DOCUMENTS: '/rag/documents',
    RAG_SEARCH: '/rag/search',
    RAG_GENERATE: '/rag/generate'
  },

  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  },

  // Timeout en millisecondes
  TIMEOUT: 30000
};

// Helper pour construire les URLs complètes
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Configuration pour logs
export const LOG_CONFIG = {
  enabled: isDevelopment,
  prefix: '🚀 Magic Button API'
};

export default API_CONFIG;