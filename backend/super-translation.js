/**
 * Solution de traduction ultra-renforcée
 * Approche en 3 passes pour éliminer complètement le français
 */

async function superTranslation(text, targetLanguage = 'English') {
  // ÉTAPE 1: Traduction directe avec prompt agressif
  const step1Prompt = `
URGENT TRANSLATION TASK - NO EXCEPTIONS ALLOWED

You are a professional translator. Your ONLY job is to translate the following French text into perfect ${targetLanguage}.

CRITICAL RULES:
- TRANSLATE EVERY WORD
- NO FRENCH ALLOWED IN OUTPUT
- NO MIXED LANGUAGES
- IF ANY FRENCH REMAINS, YOU HAVE FAILED

French text to translate:
"${text}"

${targetLanguage} translation:`;

  const step1Result = await callGemini(step1Prompt, { temperature: 0.0 });

  // ÉTAPE 2: Vérification et nettoyage automatique
  const step2Prompt = `
CLEANUP TASK - REMOVE ALL FRENCH WORDS

The text below may contain French words mixed with ${targetLanguage}. 
Your job is to rewrite it in PURE ${targetLanguage} ONLY.

Rules:
- Replace ANY French word with its ${targetLanguage} equivalent
- Remove French articles (le, la, les, un, une, des, du, de, d')
- Remove French conjunctions (qui, que, avec, dans, pour, etc.)
- Ensure 100% ${targetLanguage} output

Text to clean:
"${step1Result}"

Pure ${targetLanguage} version:`;

  const step2Result = await callGemini(step2Prompt, { temperature: 0.0 });

  // ÉTAPE 3: Validation finale et polissage
  const step3Prompt = `
FINAL QUALITY CHECK

Please verify this text is in perfect ${targetLanguage} and improve its quality:

"${step2Result}"

Requirements:
- Ensure no French words remain
- Improve grammar and flow
- Make it professional and natural

Final ${targetLanguage} text:`;

  const finalResult = await callGemini(step3Prompt, { temperature: 0.1 });

  return finalResult;
}

// Test avec votre texte problématique
const testText = "Cette indication, forte en sens, est révélatrice de l'attractivité et de la qualité de vie dans ces Provinces marocaines, qui favorisent l'installation d'un plus grand nombre de personnes, de même que l'augmentation du taux de natalité.";

console.log("🔄 Testing super translation...");
superTranslation(testText, 'English').then(result => {
  console.log("✅ Final result:", result);
}).catch(err => {
  console.error("❌ Error:", err);
});