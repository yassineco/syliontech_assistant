/**
 * Test de traduction avec la même configuration que le serveur backend
 * Date: 27 octobre 2025
 */

// Charger la configuration comme le serveur
require('dotenv').config();

const { VertexAI } = require('@google-cloud/vertexai');

const PROBLEMATIC_TEXT = `Cette indication, forte en sens, est révélatrice de l'attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'installation d'un plus grand nombre de personnes, de même que l'augmentation du taux de natalité.`;

class ServerConfigTester {
  constructor() {
    console.log('🔧 Configuration utilisée:');
    console.log('- PROJECT_ID:', process.env.PROJECT_ID);
    console.log('- VERTEX_AI_LOCATION:', process.env.VERTEX_AI_LOCATION || 'europe-west1');
    console.log('- GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    this.vertexAI = new VertexAI({
      project: process.env.PROJECT_ID || 'magic-button-demo',
      location: 'us-central1' // La plupart des modèles Gemini sont en us-central1
    });
    
    // Utilisons le modèle stable gemini-2.5-flash
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  async testSingleTranslation() {
    console.log('🚀 TEST TRADUCTION SIMPLE');
    console.log('📝 Texte:', PROBLEMATIC_TEXT.substring(0, 80) + '...');
    
    const prompt = `
Translate this French text to perfect English. Use only English words:

"${PROBLEMATIC_TEXT}"

English translation:`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 1024,
          candidateCount: 1,
        }
      });

      console.log('📦 Réponse brute:', JSON.stringify(result.response, null, 2));
      
      if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
        throw new Error('Aucune réponse du modèle');
      }

      const translation = result.response.candidates[0].content.parts[0].text.trim();
      
      console.log('✅ Traduction reçue:');
      console.log(translation);
      
      // Vérification des mots français (en tant que mots entiers uniquement)
      const frenchWords = ['qui', 'que', 'avec', 'dans', 'pour', 'sur', 'par', 'comme', 'mais', 'installation', 'attractivité', 'révélatrice', 'favorisent', 'personnes', 'même', 'nombre', 'plus', 'grand', 'fait', 'sens', 'forte'];
      
      const foundFrench = frenchWords.filter(word => {
        // Recherche de mots entiers uniquement (avec word boundaries)
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(translation);
      });
      
      if (foundFrench.length === 0) {
        console.log('🎉 SUCCÈS! Aucun mot français détecté');
      } else {
        console.log('⚠️ Mots français trouvés:', foundFrench);
      }
      
      return translation;
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      if (error.message.includes('404')) {
        console.log('💡 Le modèle gemini-1.5-flash n\'est pas disponible');
        console.log('💡 Essayons avec un autre modèle...');
        return this.testWithAlternativeModel();
      }
      throw error;
    }
  }

  async testWithAlternativeModel() {
    console.log('🔄 Test avec modèle alternatif...');
    
    // Essayons avec un modèle plus basique
    this.model = this.vertexAI.getGenerativeModel({
      model: 'text-bison@001', // Modèle PaLM qui devrait être disponible
    });

    const prompt = `Translate to English: ${PROBLEMATIC_TEXT}`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 1024,
        }
      });

      const translation = result.response.candidates[0].content.parts[0].text.trim();
      console.log('✅ Traduction avec modèle alternatif:', translation);
      return translation;
      
    } catch (error) {
      console.error('❌ Erreur avec modèle alternatif:', error.message);
      throw error;
    }
  }
}

async function runTest() {
  try {
    const tester = new ServerConfigTester();
    await tester.testSingleTranslation();
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
  }
}

runTest();