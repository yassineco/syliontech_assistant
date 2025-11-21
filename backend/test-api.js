const axios = require('axios');

async function testViaAPI() {
  console.log('🔍 Test via API serveur');
  
  const testText = `Cette indication, forte en sens, est révélatrice de l'attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'installation d'un plus grand nombre de personnes, de même que l'augmentation du taux de natalité.`;
  
  try {
    console.log('📤 Envoi de la requête de traduction...');
    
    const response = await axios.post('http://localhost:8080/api/ai/process', {
      action: 'translate',
      text: testText,
      options: {
        targetLanguage: 'English'
      }
    });
    
    console.log('📥 Réponse reçue:');
    console.log('Status:', response.status);
    console.log('Résultat:', response.data.result);
    
    // Vérification des mots français
    const result = response.data.result;
    const frenchWords = ['qui', 'que', 'avec', 'dans', 'pour', 'sur', 'par', 'comme', 'mais', 'ou', 'et', 'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'fait', 'plus', 'grand', 'nombre', 'personnes', 'même', 'installation', 'révélatrice', 'attractivité', 'favorisent', 'sens'];
    
    const foundFrenchWords = frenchWords.filter(word => 
      result.toLowerCase().includes(` ${word} `) || 
      result.toLowerCase().includes(`${word} `) ||
      result.toLowerCase().includes(` ${word}`) ||
      result.toLowerCase().includes(`'${word}`) ||
      result.toLowerCase().includes(`"${word}`)
    );
    
    console.log('\n🔍 Mots français détectés:', foundFrenchWords);
    
    if (foundFrenchWords.length > 0) {
      console.log('⚠️ PROBLÈME CONFIRMÉ: La traduction contient encore du français');
      console.log('💡 Mots problématiques trouvés:', foundFrenchWords.join(', '));
    } else {
      console.log('✅ SUCCÈS: Aucun mot français détecté!');
    }
    
    console.log('\n📊 Statistiques:');
    console.log('- Temps de traitement:', response.data.processingTime, 'ms');
    console.log('- Longueur originale:', response.data.originalLength);
    console.log('- Longueur résultat:', response.data.resultLength);
    
  } catch (error) {
    console.error('❌ Erreur API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testViaAPI();