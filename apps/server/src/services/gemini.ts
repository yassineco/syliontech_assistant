import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import type { AssistantRequest, AssistantReply } from '../types/schemas.js';
import { validateAssistantReply } from '../types/schemas.js';
import { env } from '../config/env.js';

// ==========================================
// SERVICE GEMINI - VERTEX AI
// ==========================================

/**
 * Prompt système pour Gemini avec guardrails Sofinco
 */
const SYSTEM_PROMPT = `
Tu es l'Assistant Sofinco, un conseiller en crédit bienveillant et professionnel.

RÔLE ET MISSION:
- Aide les clients à simuler un crédit personnel de 1 000€ à 75 000€
- Collecte poliment: montant, durée, revenus, statut professionnel
- Propose ensuite 1-2 offres adaptées
- TOUJOURS utiliser le vouvoiement et rester empathique

GUARDRAILS STRICTS:
1. Tu ne peux que parler de crédit personnel Sofinco
2. Aucun engagement contractuel - c'est un PROTOTYPE de simulation
3. Toujours rappeler "simulation non contractuelle" si demandé
4. Refuser poliment les sujets hors crédit (météo, politique, etc.)
5. Pas de conseil financier ou fiscal - juste la simulation

INFORMATIONS À COLLECTER (dans l'ordre):
1. Montant souhaité (1 000€ - 75 000€)
2. Durée de remboursement (6 mois - 84 mois)
3. Revenus mensuels nets (optionnel mais recommandé)
4. Statut professionnel: salarié/indépendant/autre (optionnel)

RÉPONSES:
- Phrases courtes et directes (max 2 phrases)
- Adaptées à la synthèse vocale (éviter abréviations)
- Ton professionnel mais chaleureux
- Utiliser "euros" plutôt que "€" pour la TTS

FORMAT DE SORTIE OBLIGATOIRE:
Tu dois répondre UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "intent": "string (ex: collect_amount, collect_duration, propose_offers)",
  "slots": {
    "amount": number_or_null,
    "duration": number_or_null, 
    "income": number_or_null,
    "employment": "string_or_null"
  },
  "reply": "string (réponse pour TTS)",
  "nextAction": "string (prochaine étape)",
  "confidence": number_between_0_and_1
}

Si tu as assez d'informations, ajoute le champ "offers" mais PAS de calculs - juste indiquer que tu vas proposer des offres.

EXEMPLES DE RÉPONSES:
{
  "intent": "collect_amount",
  "slots": {"amount": null, "duration": null, "income": null, "employment": null},
  "reply": "Bonjour ! Quel montant souhaitez-vous emprunter ?",
  "nextAction": "collect_amount",
  "confidence": 0.9
}

RAPPEL CRITIQUE: 
- Réponse UNIQUEMENT en JSON valide
- Pas de texte libre en dehors du JSON
- Phrases courtes pour la TTS
`;

/**
 * Classe pour gérer les interactions avec Vertex AI Gemini
 */
class GeminiService {
  private vertexAI: VertexAI | null = null;
  private model: any = null;

  constructor() {
    this.initializeVertexAI();
  }

  /**
   * Initialise Vertex AI si les clés sont disponibles
   */
  private initializeVertexAI(): void {
    try {
      if (!env.GCP_PROJECT_ID) {
        console.warn('⚠️ GCP_PROJECT_ID manquant - Gemini non disponible');
        return;
      }

      this.vertexAI = new VertexAI({
        project: env.GCP_PROJECT_ID,
        location: env.GEMINI_LOCATION,
      });

      this.model = this.vertexAI.getGenerativeModel({
        model: env.GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3, // Réponses cohérentes pour un assistant bancaire
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      console.log('✅ Vertex AI Gemini initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation Vertex AI:', error);
      this.vertexAI = null;
      this.model = null;
    }
  }

  /**
   * Traite une requête via Gemini
   */
  async processRequest(request: AssistantRequest): Promise<AssistantReply> {
    if (!this.model) {
      throw new Error('Vertex AI non initialisé - vérifiez les clés GCP');
    }

    try {
      // Construction du prompt avec contexte
      const userPrompt = this.buildUserPrompt(request);
      
      // Appel à Gemini
      const result = await this.model.generateContent([
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ]);

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('Réponse vide de Gemini');
      }

      // Parse et validation de la réponse JSON
      const parsedResponse = this.parseGeminiResponse(responseText);
      return validateAssistantReply(parsedResponse);

    } catch (error) {
      console.error('❌ Erreur Gemini:', error);
      
      // Fallback en cas d'erreur
      return {
        intent: 'gemini_error',
        slots: request.slots || {},
        reply: 'Je rencontre une difficulté technique. Pouvez-vous reformuler votre demande ?',
        nextAction: 'retry',
        confidence: 0.1,
      };
    }
  }

  /**
   * Construit le prompt utilisateur avec contexte
   */
  private buildUserPrompt(request: AssistantRequest): string {
    const { message, slots = {}, context = {} } = request;
    
    let prompt = `MESSAGE UTILISATEUR: "${message}"\n\n`;
    
    // Ajout du contexte de session si disponible
    if (Object.keys(slots).length > 0) {
      prompt += `INFORMATIONS DÉJÀ COLLECTÉES:\n`;
      if (slots.amount) prompt += `- Montant: ${slots.amount} euros\n`;
      if (slots.duration) prompt += `- Durée: ${slots.duration} mois\n`;
      if (slots.income) prompt += `- Revenus: ${slots.income} euros/mois\n`;
      if (slots.employment) prompt += `- Statut: ${slots.employment}\n`;
      prompt += '\n';
    }
    
    // Contexte additionnel
    if (context.conversationStep) {
      prompt += `ÉTAPE ACTUELLE: ${context.conversationStep}\n\n`;
    }
    
    prompt += `Réponds en JSON valide selon le format spécifié dans les instructions système.`;
    
    return prompt;
  }

  /**
   * Parse la réponse JSON de Gemini avec nettoyage
   */
  private parseGeminiResponse(responseText: string): any {
    try {
      // Nettoyage de la réponse (suppression markdown, etc.)
      let cleanText = responseText.trim();
      
      // Suppression des blocs markdown
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // Extraction du JSON si encapsulé
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }
      
      return JSON.parse(cleanText);
      
    } catch (error) {
      console.error('❌ Erreur parsing JSON Gemini:', error);
      console.error('Réponse brute:', responseText);
      
      // Réponse de fallback en cas d'erreur de parsing
      return {
        intent: 'parse_error',
        slots: {},
        reply: 'Je ne comprends pas bien. Pouvez-vous reformuler ?',
        nextAction: 'retry',
        confidence: 0.1,
      };
    }
  }

  /**
   * Vérifie si Gemini est disponible
   */
  isAvailable(): boolean {
    return this.model !== null;
  }
}

// Instance globale du service
const geminiService = new GeminiService();

/**
 * Point d'entrée principal pour traiter une requête via Gemini
 */
export async function processGeminiRequest(request: AssistantRequest): Promise<AssistantReply> {
  return await geminiService.processRequest(request);
}

/**
 * Vérifie la disponibilité de Gemini
 */
export function isGeminiAvailable(): boolean {
  return geminiService.isAvailable();
}