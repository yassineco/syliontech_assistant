const { VertexAI } = require('@google-cloud/vertexai');

async function testTranslation() {
  console.log('🔍 Test de diagnostic de traduction');
  
  const testText = `Cette indication, forte en sens, est révélatrice de l'attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'installation d'un plus grand nombre de personnes, de même que l'augmentation du taux de natalité.`;
  
  const vertex_ai = new VertexAI({
    project: 'magic-button-demo',
    location: 'europe-west1'
  });
  
  const model = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const prompt = `
YOU ARE A PROFESSIONAL TRANSLATOR. YOUR TASK IS TO TRANSLATE THE ENTIRE TEXT TO ENGLISH.

MANDATORY REQUIREMENTS:
- TRANSLATE EVERY SINGLE WORD
- ZERO FRENCH WORDS IN THE OUTPUT
- ZERO MIXED LANGUAGES
- IF YOU SEE ANY FRENCH WORD IN YOUR RESPONSE, YOU HAVE FAILED
- REWRITE EVERYTHING IN PERFECT ENGLISH
- MAINTAIN THE ORIGINAL MEANING AND STRUCTURE

FORBIDDEN: Any word in French, any untranslated phrase, any mixed content

INPUT TEXT (in French):
"${testText}"

YOUR COMPLETE ENGLISH TRANSLATION:`;

  console.log('📤 Prompt envoyé:', prompt);
  console.log('\n📥 Réponse reçue:');
  
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: testText.length * 3,
      }
    });
    
    const response = result.response.candidates[0].content.parts[0].text;
    console.log(response);
    
    // Vérification des mots français
    const frenchWords = ['qui', 'que', 'avec', 'dans', 'pour', 'sur', 'par', 'comme', 'mais', 'ou', 'et', 'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'fait', 'plus', 'grand', 'nombre', 'personnes', 'même', 'installation', 'révélatrice', 'attractivité', 'favorisent'];
    
    const foundFrenchWords = frenchWords.filter(word => 
      response.toLowerCase().includes(` ${word} `) || 
      response.toLowerCase().includes(`${word} `) ||
      response.toLowerCase().includes(` ${word}`) ||
      response.toLowerCase().includes(`'${word}`)
    );
    
    console.log('\n🔍 Mots français détectés:', foundFrenchWords);
    
    if (foundFrenchWords.length > 0) {
      console.log('\n⚠️ PROBLÈME DÉTECTÉ: La traduction contient encore du français');
      console.log('🔧 Test de la fonction de nettoyage...');
      
      const cleanupPrompt = `
CRITICAL: The following text contains French words mixed with English. 
REWRITE IT COMPLETELY IN PURE ENGLISH ONLY.

RULES:
- REMOVE ALL FRENCH WORDS
- TRANSLATE ANY REMAINING FRENCH TO ENGLISH
- ENSURE 100% ENGLISH OUTPUT
- NO MIXED LANGUAGES ALLOWED

TEXT TO CLEAN:
"${response}"

PURE ENGLISH VERSION:`;

      const cleanResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: cleanupPrompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: response.length * 2,
        }
      });
      
      const cleanResponse = cleanResult.response.candidates[0].content.parts[0].text;
      console.log('\n🧹 Après nettoyage:');
      console.log(cleanResponse);
      
      const stillFrenchWords = frenchWords.filter(word => 
        cleanResponse.toLowerCase().includes(` ${word} `) || 
        cleanResponse.toLowerCase().includes(`${word} `) ||
        cleanResponse.toLowerCase().includes(` ${word}`) ||
        cleanResponse.toLowerCase().includes(`'${word}`)
      );
      
      console.log('\n🔍 Mots français encore présents:', stillFrenchWords);
    } else {
      console.log('\n✅ SUCCÈS: Aucun mot français détecté!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testTranslation();