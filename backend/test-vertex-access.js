/**
 * Test d'accès Vertex AI via REST API
 * Date: 27 octobre 2025
 */

const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

async function testVertexAIAccess() {
  console.log('🔐 Test d\'accès Vertex AI avec authentification Google');
  
  try {
    const auth = new GoogleAuth({
      keyFile: '/media/yassine/IA/Projects/konecta/magic_button_formation/backend/.credentials/google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const projectId = 'magic-button-demo';
    const location = 'us-central1';
    const model = 'gemini-1.0-pro';
    
    console.log('📍 Configuration:');
    console.log('- Project:', projectId);
    console.log('- Location:', location);
    console.log('- Model:', model);
    
    const accessToken = await client.getAccessToken();
    console.log('✅ Access token obtenu');
    
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
    
    console.log('🌐 Endpoint:', endpoint);
    
    const testPrompt = 'Translate to English: Bonjour le monde';
    
    const response = await axios.post(
      endpoint,
      {
        contents: [{
          role: 'user',
          parts: [{ text: testPrompt }]
        }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 256,
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('✅ Réponse reçue de Vertex AI:');
    const result = response.data.candidates[0].content.parts[0].text;
    console.log('📝 Résultat:', result);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('1. Ouvrez: https://console.cloud.google.com/vertex-ai/generative?project=magic-button-demo');
      console.log('2. Acceptez les conditions d\'utilisation de Vertex AI');
      console.log('3. Attendez 2-3 minutes que les permissions se propagent');
      console.log('4. Relancez ce test');
    }
    
    if (error.response?.status === 404) {
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('Le modèle n\'est pas disponible dans cette région.');
      console.log('Essayons une autre région...');
      return testWithDifferentRegions();
    }
    
    return false;
  }
}

async function testWithDifferentRegions() {
  const regions = ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'];
  const models = ['gemini-1.0-pro', 'gemini-1.5-flash', 'gemini-pro'];
  
  console.log('🔄 Test avec différentes combinaisons région/modèle...');
  
  for (const region of regions) {
    for (const model of models) {
      console.log(`\n📍 Test: ${region} / ${model}`);
      
      try {
        const auth = new GoogleAuth({
          keyFile: '/media/yassine/IA/Projects/konecta/magic_button_formation/backend/.credentials/google-credentials.json',
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/magic-button-demo/locations/${region}/publishers/google/models/${model}:generateContent`;
        
        const response = await axios.post(
          endpoint,
          {
            contents: [{
              role: 'user',
              parts: [{ text: 'Hello' }]
            }],
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 10,
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000
          }
        );
        
        console.log(`✅ SUCCÈS avec ${region} / ${model}`);
        console.log(`📝 Réponse:`, response.data.candidates[0].content.parts[0].text);
        return { region, model };
        
      } catch (error) {
        console.log(`❌ Échec: ${error.response?.status || error.message}`);
      }
    }
  }
  
  return null;
}

async function run() {
  console.log('🚀 Démarrage test d\'accès Vertex AI\n');
  const result = await testVertexAIAccess();
  
  if (!result) {
    console.log('\n⚠️ Test principal échoué');
  }
}

run();