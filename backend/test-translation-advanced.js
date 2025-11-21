/**
 * Test isolé de la traduction renforcée 3 étapes
 * Date: 27 octobre 2025
 * Objectif: Résoudre définitivement le problème de mélange français/anglais
 */

// Configuration des credentials Google Cloud
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/media/yassine/IA/Projects/konecta/magic_button_formation/backend/.credentials/google-credentials.json';

const { VertexAI } = require('@google-cloud/vertexai');

const PROBLEMATIC_TEXT = `Cette indication, forte en sens, est révélatrice de l'attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'installation d'un plus grand nombre de personnes, de même que l'augmentation du taux de natalité.`;

class TranslationTester {
  constructor() {
    this.vertexAI = new VertexAI({
      project: 'magic-button-demo',
      location: 'europe-west1'
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-pro', // Modèle de base plus largement disponible
    });
  }

  async generateContent(prompt, options = {}) {
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.0,
        maxOutputTokens: options.maxOutputTokens ?? 1024,
        candidateCount: 1,
      }
    });

    return result.response.candidates[0].content.parts[0].text.trim();
  }

  async test3StepTranslation(text, targetLanguage = 'English') {
    console.log('🚀 DÉMARRAGE TEST TRADUCTION 3 ÉTAPES');
    console.log('📝 Texte original:', text);
    console.log('🎯 Langue cible:', targetLanguage);
    console.log('=' .repeat(80));

    // ÉTAPE 1: Traduction directe ultra-stricte
    const step1Prompt = `
URGENT TRANSLATION TASK - ZERO TOLERANCE FOR FRENCH

You are the world's best French to ${targetLanguage} translator.
Your reputation depends on producing PERFECT ${targetLanguage} with NO FRENCH WORDS.

CRITICAL RULES:
- TRANSLATE EVERY SINGLE WORD TO ${targetLanguage}
- ABSOLUTELY NO FRENCH WORDS IN OUTPUT
- NO MIXED LANGUAGES ALLOWED
- IF ANY FRENCH REMAINS, YOU HAVE COMPLETELY FAILED

French text to translate:
"${text}"

Perfect ${targetLanguage} translation:`;

    console.log('🔄 ÉTAPE 1: Traduction directe...');
    const step1Result = await this.generateContent(step1Prompt, {
      temperature: 0.0,
      maxOutputTokens: text.length * 3,
    });
    console.log('✅ Étape 1 terminée:', step1Result);
    console.log('-'.repeat(50));

    // ÉTAPE 2: Détection et élimination forcée du français
    const step2Prompt = `
FRENCH ELIMINATION PROTOCOL - EMERGENCY CLEANUP

The text below may contain hidden French words. Your mission: ELIMINATE ALL FRENCH.

DETECTION TARGETS:
- French articles: le, la, les, un, une, des, du, de, d', l'
- French conjunctions: qui, que, avec, dans, pour, sur, par, comme, mais, ou, et, si
- French words: installation, attractivité, révélatrice, favorisent, personnes, même, nombre, plus, grand, fait, sens, forte
- French contractions: n', s', c', j', m', t'

TEXT TO CLEAN:
"${step1Result}"

INSTRUCTIONS:
1. Identify ANY French words (list them)
2. Replace each with perfect ${targetLanguage} equivalent
3. Output ONLY the cleaned ${targetLanguage} text

French words found: [list here]
Clean ${targetLanguage} text: [clean text here]`;

    console.log('🔄 ÉTAPE 2: Détection et nettoyage...');
    const step2Result = await this.generateContent(step2Prompt, {
      temperature: 0.0,
      maxOutputTokens: step1Result.length * 2,
    });
    console.log('✅ Étape 2 terminée:', step2Result);
    console.log('-'.repeat(50));

    // ÉTAPE 3: Validation finale et polissage
    const cleanText = step2Result.includes('Clean ') ? 
      step2Result.split('Clean ')[1].split(':')[1] || step2Result : 
      step2Result;

    const step3Prompt = `
FINAL QUALITY ASSURANCE - PERFECTION REQUIRED

Review this text and ensure it's PERFECT ${targetLanguage}:

"${cleanText.trim()}"

QUALITY CHECKLIST:
✓ Is every word in ${targetLanguage}? 
✓ Is the grammar perfect?
✓ Is it natural and professional?
✓ Are there ANY French remnants?

If perfect: output the text as-is
If issues found: output corrected version

Final perfect ${targetLanguage} text:`;

    console.log('🔄 ÉTAPE 3: Validation finale...');
    const finalResult = await this.generateContent(step3Prompt, {
      temperature: 0.1,
      maxOutputTokens: cleanText.length * 2,
    });
    console.log('✅ Étape 3 terminée:', finalResult);
    console.log('=' .repeat(80));

    // ANALYSE FINALE
    console.log('📊 ANALYSE FINALE:');
    console.log('📝 Original:', text.substring(0, 80) + '...');
    console.log('🥇 Final:', finalResult);
    
    // Détection de mots français résiduels
    const frenchWords = ['qui', 'que', 'avec', 'dans', 'pour', 'sur', 'par', 'comme', 'mais', 'ou', 'et', 'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'installation', 'attractivité', 'révélatrice', 'favorisent', 'personnes', 'même', 'nombre', 'plus', 'grand', 'fait', 'sens', 'forte'];
    const foundFrench = frenchWords.filter(word => 
      finalResult.toLowerCase().includes(word.toLowerCase())
    );
    
    if (foundFrench.length === 0) {
      console.log('🎉 SUCCÈS! Aucun mot français détecté');
      console.log('✅ TRADUCTION PARFAITE RÉALISÉE');
    } else {
      console.log('⚠️ PROBLÈME: Mots français encore présents:', foundFrench);
      console.log('❌ TRADUCTION INCOMPLÈTE');
    }

    return finalResult;
  }
}

async function runTest() {
  try {
    const tester = new TranslationTester();
    await tester.test3StepTranslation(PROBLEMATIC_TEXT, 'English');
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  }
}

runTest();