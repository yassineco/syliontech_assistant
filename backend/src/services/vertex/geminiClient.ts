import { VertexAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { config } from '../../config/env';
import { logger, createPerformanceLogger } from '../../logger';

/**
 * Client Vertex AI pour Magic Button
 * Gère les appels à Gemini pour génération de texte
 * 
 * Dernière mise à jour : 25 octobre 2025 - 19:35 UTC
 * Améliorations : Traduction renforcée en 3 étapes pour éliminer le mélange français/anglais
 */

// Types pour les actions IA
export type AIAction = 'correct' | 'summarize' | 'translate' | 'optimize' | 'analyze';

export interface AIRequest {
  action: AIAction;
  text: string;
  options?: {
    targetLanguage?: string;
    maxLength?: number;
    style?: string;
    context?: string;
  };
}

export interface AIResponse {
  result: string;
  action: AIAction;
  originalLength: number;
  resultLength: number;
  processingTime: number;
}

// Configuration des filtres de sécurité Vertex AI
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

class GeminiClient {
  private vertexAI: VertexAI;
  private model: GenerativeModel;

  constructor() {
    this.vertexAI = new VertexAI({
      project: config.PROJECT_ID,
      location: config.VERTEX_LOCATION,
    });

    this.model = this.vertexAI.getGenerativeModel({
      model: config.GENAI_MODEL,
    });

    logger.info('🤖 Gemini client initialized', {
      project: config.PROJECT_ID,
      location: config.VERTEX_LOCATION,
      model: config.GENAI_MODEL,
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }

  /**
   * Génère une réponse avec Gemini
   */
  private async generateContent(prompt: string, options: {
    temperature?: number;
    maxOutputTokens?: number;
  } = {}): Promise<string> {
    const perfLogger = createPerformanceLogger('gemini-generate');

    logger.info('🚀 Calling Vertex AI', {
      promptLength: prompt.length,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxOutputTokens ?? 1024,
      model: config.GENAI_MODEL,
      location: config.VERTEX_LOCATION
    });

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
          candidateCount: 1,
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const response = result.response;
      
      if (!response.candidates || response.candidates.length === 0) {
        logger.error('❌ No response candidates from Gemini', { response });
        throw new Error('No response candidates from Gemini');
      }

      const candidate = response.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        logger.error('❌ Invalid response structure from Gemini', { candidate });
        throw new Error('Invalid response structure from Gemini');
      }

      const text = candidate.content.parts[0]?.text;
      if (!text) {
        logger.error('❌ Empty text response from Gemini', { candidate });
        throw new Error('Empty text response from Gemini');
      }

      logger.info('✅ Vertex AI response received', {
        responseLength: text.length,
        responsePreview: text.substring(0, 100) + '...'
      });

      perfLogger.end({
        promptLength: prompt.length,
        responseLength: text.length,
        temperature: options.temperature,
      });

      return text.trim();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Vertex AI call failed', {
        error: errorMessage,
        promptLength: prompt.length,
        options,
      });
      perfLogger.error(error as Error, {
        promptLength: prompt.length,
        options,
      });
      throw error;
    }
  }

  /**
   * Corrige le texte (grammaire, orthographe, style)
   */
  async correctText(text: string): Promise<string> {
    const prompt = `
CORRECT ALL ERRORS IN THIS TEXT.

RULES:
- FIX spelling mistakes
- FIX grammar errors  
- IMPROVE sentence structure
- KEEP original meaning
- RETURN ONLY THE CORRECTED TEXT

Text to correct: "${text}"

Corrected text:`;

    return this.generateContent(prompt, {
      temperature: 0.1,
      maxOutputTokens: text.length * 2,
    });
  }

  /**
   * Résume le texte
   */
  async summarizeText(text: string, maxLength: number = 80): Promise<string> {
    // Calculer la longueur du texte source pour adapter le résumé
    const sourceWords = text.split(/\s+/).length;
    const targetWords = Math.min(maxLength, Math.max(20, Math.floor(sourceWords * 0.4))); // Max 40% du texte original
    
    const prompt = `Tu es un assistant qui crée de VRAIS résumés (plus courts que l'original).

TEXTE ORIGINAL (${sourceWords} mots) :
${text}

INSTRUCTIONS STRICTES :
- Crée un VRAI résumé de maximum ${targetWords} mots (BEAUCOUP plus court que l'original)
- Garde UNIQUEMENT les 2-3 idées les plus importantes
- SUPPRIME les détails, exemples, et informations secondaires
- Utilise la MÊME langue que le texte original
- Une ou deux phrases maximum
- Le résumé DOIT être significativement plus court que l'original

RÉSUMÉ (max ${targetWords} mots) :`;

    return this.generateContent(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024, // Fixe pour éviter les troncatures
    });
  }


  /**
   * Traduit le texte - VERSION SIMPLIFIÉE (1 étape) pour gemini-2.5-flash
   */
  async translateText(text: string, targetLanguage: string = 'English'): Promise<string> {
    logger.info('🌍 Starting translation (SIMPLIFIED - 1 step)', {
      textLength: text.length,
      targetLanguage,
      textPreview: text.substring(0, 100) + '...'
    });

    const translationPrompt = `
You are a professional translator. Translate the following French text into perfect ${targetLanguage}.

CRITICAL REQUIREMENTS:
- Translate EVERY word from French to ${targetLanguage}
- Output ONLY ${targetLanguage} - absolutely NO French words allowed
- Maintain the original meaning and professional tone
- Do NOT add explanations or comments

French text to translate:
"${text}"

Your ${targetLanguage} translation:`;

    logger.info('📤 Sending translation request to Gemini');
    const result = await this.generateContent(translationPrompt, {
      temperature: 0.1,
      maxOutputTokens: Math.max(2048, text.length * 4),
    });

    logger.info('✅ Translation completed', {
      originalLength: text.length,
      resultLength: result.length,
      resultPreview: result.substring(0, 100) + '...',
      targetLanguage
    });

    return result;
  }

  /**
   * Nettoie la traduction pour éliminer les mots français résiduels
   */
  private async cleanUpTranslation(translation: string, targetLanguage: string): Promise<string> {
    // Détection élargie des mots et constructions françaises
    const frenchPatterns = [
      // Articles français
      /\bl[ae]s?\b/gi, /\bun[e]?\b/gi, /\bdes?\b/gi, /\bdu\b/gi,
      // Mots de liaison français
      /\bqui\b/gi, /\bque\b/gi, /\bavec\b/gi, /\bdans\b/gi, /\bpour\b/gi, /\bsur\b/gi, /\bpar\b/gi,
      /\bcomme\b/gi, /\bmais\b/gi, /\bet\b/gi, /\bou\b/gi, /\bsi\b/gi,
      // Mots problématiques spécifiques du texte
      /\binstallation\b/gi, /\battractivité\b/gi, /\brévélatrice\b/gi, /\bfavorisent\b/gi,
      /\bpersonnes\b/gi, /\bmême\b/gi, /\bnombre\b/gi, /\bplus\b/gi, /\bgrand\b/gi,
      /\bfait\b/gi, /\bsens\b/gi, /\bforte\b/gi,
      // Apostrophes françaises
      /\bl'/gi, /\bd'/gi, /\bn'/gi, /\bs'/gi, /\bc'/gi, /\bj'/gi, /\bm'/gi, /\bt'/gi,
      // Patterns spécifiques
      /\bd'un\b/gi, /\bd'une\b/gi, /\bd'a\b/gi
    ];

    const hasFrenchContent = frenchPatterns.some(pattern => pattern.test(translation));

    logger.info('Translation cleanup check', {
      hasFrenchContent,
      originalText: translation.substring(0, 100) + '...',
      targetLanguage
    });

    if (hasFrenchContent) {
      logger.warn('French content detected, applying cleanup', {
        translation: translation.substring(0, 200) + '...'
      });

      const cleanupPrompt = `
EMERGENCY TRANSLATION CLEANUP REQUIRED!

The following text contains French words/phrases mixed with English. 
YOU MUST REWRITE IT COMPLETELY IN PURE ENGLISH.

CRITICAL REQUIREMENTS:
- REMOVE ALL FRENCH WORDS AND PHRASES
- TRANSLATE EVERYTHING TO PERFECT ENGLISH
- NO APOSTROPHES WITH FRENCH WORDS (l', d', n', etc.)
- NO FRENCH ARTICLES (le, la, les, un, une, des, du, de)
- NO FRENCH LINKING WORDS (qui, que, avec, dans, pour, etc.)
- ENSURE 100% ENGLISH OUTPUT

CONTAMINATED TEXT:
"${translation}"

PURE ENGLISH VERSION (NO FRENCH ALLOWED):`;

      const cleanedTranslation = await this.generateContent(cleanupPrompt, {
        temperature: 0.0,
        maxOutputTokens: translation.length * 2,
      });

      logger.info('Translation cleaned', {
        before: translation.substring(0, 100) + '...',
        after: cleanedTranslation.substring(0, 100) + '...'
      });

      return cleanedTranslation;
    }

    return translation;
  }

  /**
   * Optimise le contenu pour un objectif spécifique
   */
  async optimizeContent(text: string, purpose: string = 'clarté et impact'): Promise<string> {
    const prompt = `Tu es un expert en rédaction qui optimise les textes pour les rendre plus professionnels.

TEXTE À OPTIMISER :
${text}

INSTRUCTIONS :
- Améliore la clarité, l'impact et la lisibilité
- Préserve EXACTEMENT le sens et le message original
- Rends le style plus professionnel et engageant
- Améliore la structure et le flow des phrases
- Garde la MÊME langue que le texte original
- Retourne UNIQUEMENT le texte optimisé

TEXTE OPTIMISÉ :`;

    return this.generateContent(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });
  }

  /**
   * Analyse le texte (sentiment, style, etc.)
   */
  async analyzeText(text: string): Promise<string> {
    const prompt = `
TASK: ANALYZE TEXT COMPREHENSIVELY

INSTRUCTIONS:
1. ANALYZE sentiment (positive/negative/neutral) with percentage confidence
2. IDENTIFY writing style and tone
3. LIST strengths and weaknesses
4. PROVIDE specific improvement suggestions
5. BE concise and actionable
6. USE structured format with clear sections

FORMAT YOUR RESPONSE AS:
📊 SENTIMENT: [sentiment] ([confidence]%)
✍️ STYLE: [description]
💪 STRENGTHS: [list]
⚠️ WEAKNESSES: [list]
🎯 SUGGESTIONS: [actionable recommendations]

TEXT TO ANALYZE:
"${text}"

ANALYSIS:`;

    return this.generateContent(prompt, {
      temperature: 0.1, // Très précis pour analyse
      maxOutputTokens: 512,
    });
  }

  /**
   * Point d'entrée principal pour traiter les requêtes IA
   */
  async processAIRequest(request: AIRequest): Promise<AIResponse> {
    const perfLogger = createPerformanceLogger(`ai-${request.action}`);
    const startTime = Date.now();

    try {
      let result: string;

      switch (request.action) {
        case 'correct':
          result = await this.correctText(request.text);
          break;

        case 'summarize':
          result = await this.summarizeText(
            request.text,
            request.options?.maxLength
          );
          break;

        case 'translate':
          // Mapping des codes de langues vers noms complets
          const languageMap: { [key: string]: string } = {
            'en': 'English',
            'es': 'Spanish', 
            'de': 'German',
            'it': 'Italian',
            'fr': 'French',
            'ar': 'Arabic',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese'
          };
          
          const targetLang = request.options?.targetLanguage || 'en';
          const fullLanguageName = languageMap[targetLang] || targetLang;
          
          logger.info(`Translation request - Code: ${targetLang} -> Language: ${fullLanguageName}`);
          
          result = await this.translateText(
            request.text,
            fullLanguageName
          );
          break;

        case 'optimize':
          result = await this.optimizeContent(
            request.text,
            request.options?.context
          );
          break;

        case 'analyze':
          result = await this.analyzeText(request.text);
          break;

        default:
          throw new Error(`Unsupported AI action: ${request.action}`);
      }

      const processingTime = Date.now() - startTime;

      perfLogger.end({
        originalLength: request.text.length,
        resultLength: result.length,
        processingTime,
      });

      return {
        result,
        action: request.action,
        originalLength: request.text.length,
        resultLength: result.length,
        processingTime,
      };

    } catch (error) {
      perfLogger.error(error as Error);
      throw error;
    }
  }

  /**
   * Test de connectivité avec Vertex AI
   */
  async healthCheck(): Promise<{ status: string; model: string; timestamp: string }> {
    try {
      const testResult = await this.generateContent(
        'Réponds simplement "OK" pour confirmer que tu fonctionnes.',
        { temperature: 0, maxOutputTokens: 10 }
      );

      return {
        status: testResult.includes('OK') ? 'healthy' : 'partial',
        model: config.GENAI_MODEL,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Vertex AI health check failed', { error });
      throw error;
    }
  }
}

// Instance singleton
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient();
  }
  return geminiClient;
}

// Export pour tests
export { GeminiClient };