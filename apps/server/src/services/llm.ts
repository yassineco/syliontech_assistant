import { z } from 'zod';
import type { DocChunk, Citation, LLMResponse } from '../rag/types.js';
import { LLMResponseSchema } from '../rag/types.js';
import { env } from '../config/env.js';
import { isGeminiAvailable } from '../services/gemini.js';

// ==========================================
// SERVICE LLM - GEMINI + FALLBACK LOCAL
// ==========================================

/**
 * Prompt système pour l'assistant Sofinco avec RAG - Version conversationnelle
 */
const RAG_SYSTEM_PROMPT = `Tu es l'Assistant Crédit Sofinco, un conseiller virtuel spécialisé qui privilégie une conversation naturelle.

RÔLE:
- Aide les clients avec leurs questions sur les crédits Sofinco
- Maintiens une conversation fluide et personnalisée
- Utilise UNIQUEMENT les informations fournies dans le contexte
- Adapte tes réponses selon l'historique de conversation

STYLE CONVERSATIONNEL:
1. Utilise le vouvoiement mais de manière chaleureuse
2. Reconnais les éléments déjà discutés ("Comme nous avons vu...", "Pour revenir à...")
3. Pose des questions de clarification naturelles
4. Utilise des transitions fluides entre les sujets
5. Exprime de l'empathie pour les besoins du client ("Je comprends que...", "C'est tout à fait normal de...")
6. Maximum 150 mots, mais privilégie la clarté

GESTION DU CONTEXTE:
- Si c'est le début de conversation : sois accueillant
- Si la conversation continue : référence les éléments précédents
- Si le client change de sujet : fais une transition naturelle
- Si le client semble confus : reformule avec bienveillance

INTERDICTIONS:
- Pas de formules robotiques ou répétitives
- Pas de sur-politesse excessive
- Pas d'invention - uniquement le contexte fourni
- Pas de mention "prototype", "démo", "informations non contractuelles"

IMPORTANT: Créé une véritable relation conseiller-client, comme dans une agence physique.`;

/**
 * Schéma pour valider la réponse de Gemini
 */
const GeminiResponseSchema = z.object({
  reply: z.string(),
  citations: z.array(z.object({
    title: z.string(),
    anchor: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Détecte l'intention de la requête utilisateur
 */
export function detectIntention(query: string): 'simulation' | 'faq' | 'other' {
  const lowerQuery = query.toLowerCase();
  
  // Mots-clés pour questions FAQ (prioritaires)
  const faqKeywords = [
    'comment', 'pourquoi', 'qu\'est-ce', 'quelle', 'quel', 'quels', 'quelles',
    'qui peut', 'conditions', 'documents', 'justificatifs', 'délai', 'délais',
    'procédure', 'étapes', 'comment faire', 'c\'est quoi', 'différence',
    'avantages', 'inconvénients', 'éligible', 'éligibilité', 'autorisé'
  ];
  
  // Vérifier d'abord les questions FAQ
  const hasFaqKeywords = faqKeywords.some(keyword => 
    lowerQuery.includes(keyword)
  );
  
  if (hasFaqKeywords) {
    return 'faq';
  }
  
  // Mots-clés pour simulation (actions concrètes)
  const simulationKeywords = [
    'simuler', 'simulation', 'mensualité', 'calculer',
    'emprunter', 'financer', 'je veux', 'je voudrais',
    'j\'ai besoin', 'besoin de'
  ];
  
  // Vérifier si la requête contient des mots-clés de simulation
  const hasSimulationKeywords = simulationKeywords.some(keyword => 
    lowerQuery.includes(keyword)
  );
  
  // Vérifier si la requête contient des chiffres (montant ou durée)
  const hasNumbers = /\d+/.test(query);
  
  // Si mots-clés de simulation + chiffres = simulation claire
  if (hasSimulationKeywords && hasNumbers) {
    return 'simulation';
  }
  
  // Si juste des mots-clés de simulation sans chiffres
  if (hasSimulationKeywords) {
    return 'simulation';
  }
  
  // Par défaut, considérer comme FAQ
  return 'faq';
}

/**
 * Extrait les paramètres de simulation d'une requête
 */
export function extractSimulationParams(query: string): {
  amount?: number;
  duration?: number;
  hasParams: boolean;
} {
  const result = { hasParams: false };
  
  // Rechercher un montant en euros
  const amountMatch = query.match(/(\d+(?:\s*\d{3})*)\s*€?/);
  if (amountMatch && amountMatch[1]) {
    const amount = parseInt(amountMatch[1].replace(/\s/g, ''));
    if (amount >= 1000 && amount <= 75000) {
      (result as any).amount = amount;
      result.hasParams = true;
    }
  }
  
  // Rechercher une durée en mois
  const durationMatch = query.match(/(\d+)\s*mois/);
  if (durationMatch && durationMatch[1]) {
    const duration = parseInt(durationMatch[1]);
    if (duration >= 6 && duration <= 84) {
      (result as any).duration = duration;
      result.hasParams = true;
    }
  }
  
  return result;
}

/**
 * Génère des citations à partir des chunks
 */
function generateCitationsFromChunks(chunks: DocChunk[]): Citation[] {
  const citationMap = new Map<string, Citation>();
  
  chunks.forEach(chunk => {
    // Utiliser le titre du document comme clé unique
    const key = chunk.title;
    
    if (!citationMap.has(key)) {
      citationMap.set(key, {
        title: chunk.title,
        url: chunk.url,
        anchor: chunk.url?.includes('#') ? chunk.url.split('#')[1] : undefined,
      });
    }
  });
  
  return Array.from(citationMap.values());
}

/**
 * Réponse avec Gemini (mode LIVE) - Version conversationnelle
 */
export async function answerWithGemini(
  query: string, 
  retrievedChunks: DocChunk[],
  conversationHistory?: Array<{role: string, message: string}>
): Promise<LLMResponse> {
  try {
    if (!isGeminiAvailable()) {
      throw new Error('Gemini non disponible');
    }
    
    // Préparer le contexte à partir des chunks
    const context = retrievedChunks.map((chunk, index) => 
      `[Source ${index + 1}: ${chunk.title}]\n${chunk.text}`
    ).join('\n\n');
    
    // Construire l'historique de conversation pour le contexte
    const historyContext = conversationHistory && conversationHistory.length > 0 
      ? `\n\nHISTORIQUE DE CONVERSATION RÉCENTE:\n${conversationHistory
          .slice(-4) // Garder seulement les 4 derniers échanges
          .map(h => `${h.role.toUpperCase()}: ${h.message}`)
          .join('\n')}\n`
      : '';
    
    // Construire le prompt avec contexte
    const prompt = `${RAG_SYSTEM_PROMPT}

CONTEXTE FOURNI:
${context}${historyContext}

QUESTION CLIENT ACTUELLE: ${query}

RÉPONSE (format JSON attendu):
{
  "reply": "Votre réponse conversationnelle en utilisant le vouvoiement",
  "citations": [{"title": "Titre de la source", "anchor": "section-si-applicable"}],
  "confidence": 0.8
}`;

    // Pour l'instant, on simule la réponse Gemini en mode LIVE
    // TODO: Implémenter l'intégration Gemini complète
    console.log('🤖 Simulation réponse Gemini avec contexte:', context.substring(0, 200) + '...');
    
    // Réponse simulée basée sur le contexte - Plus conversationnelle
    const contextSummary = retrievedChunks.slice(0, 2).map(chunk => 
      chunk.text.split('.')[0] + '.'
    ).join(' ');
    
    const simulatedReply = contextSummary;
    
    return {
      reply: simulatedReply,
      citations: generateCitationsFromChunks(retrievedChunks),
      confidence: 0.8,
    };
    
  } catch (error) {
    console.error('❌ Erreur Gemini:', error);
    
    // Fallback vers la réponse locale
    return answerLocally(query, retrievedChunks, conversationHistory);
  }
}

/**
 * Phrases d'introduction conversationnelles (adaptées au contexte)
 */
const CONVERSATIONAL_INTROS = [
  '',  // Réponse directe
  'Bien sûr, ',
  'Absolument, ',
  'Je comprends votre question. ',
  'C\'est une excellente question. ',
  'Laissez-moi vous expliquer cela. ',
  'D\'accord, ',
  'Très bonne question. ',
];

/**
 * Phrases d'introduction pour continuation de conversation
 */
const CONTINUATION_INTROS = [
  'Pour revenir à votre projet, ',
  'Comme nous avons vu, ',
  'En complément de ce que nous avons discuté, ',
  'Pour préciser davantage, ',
  'Dans votre situation, ',
];

/**
 * Phrases empathiques pour humaniser les réponses
 */
const EMPATHETIC_PHRASES = [
  'Je comprends que ce soit important pour vous. ',
  'C\'est tout à fait normal de se poser cette question. ',
  'Votre préoccupation est légitime. ',
  'Je vois que vous souhaitez bien vous informer. ',
  'C\'est une démarche très réfléchie de votre part. ',
];

/**
 * Suggestions contextuelles pour terminer naturellement - Version enrichie
 */
const CONTEXTUAL_SUGGESTIONS: Record<string, string[]> = {
  'conditions': [
    ' Si vous le souhaitez, je peux vous expliquer la procédure de demande en détail.',
    ' Je peux également vous aider à estimer votre capacité d\'emprunt.',
    ' Voulez-vous en savoir plus sur les documents nécessaires ?',
    ' N\'hésitez pas à me dire quels points vous préoccupent le plus.'
  ],
  'documents': [
    ' Je peux aussi vous expliquer comment préparer votre dossier.',
    ' Souhaitez-vous connaître les délais de traitement habituels ?',
    ' Je reste disponible pour toute précision sur la procédure.',
    ' Si certains documents vous posent problème, dites-le moi.'
  ],
  'taux': [
    ' Je peux vous aider à simuler votre crédit pour voir les mensualités.',
    ' Voulez-vous connaître les différentes options de remboursement ?',
    ' N\'hésitez pas si vous avez d\'autres questions sur le financement.',
    ' Souhaitez-vous que je vous explique ce qui influence le taux ?'
  ],
  'montant': [
    ' Je peux également vous expliquer comment sont calculées les mensualités.',
    ' Souhaitez-vous en savoir plus sur les conditions d\'éligibilité ?',
    ' Je reste à votre disposition pour affiner votre projet.',
    ' Voulez-vous que nous regardions ensemble les options possibles ?'
  ],
  'délai': [
    ' Je peux vous guider dans la constitution de votre dossier si besoin.',
    ' Voulez-vous connaître les étapes détaillées de la demande ?',
    ' N\'hésitez pas pour toute autre question.',
    ' Y a-t-il un calendrier particulier qui vous préoccupe ?'
  ],
  'simulation': [
    ' Voulez-vous que nous lancions une simulation ensemble ?',
    ' Je peux vous expliquer les différents paramètres à considérer.',
    ' Avez-vous déjà une idée du montant souhaité ?',
    ' Quel type de projet souhaitez-vous financer ?'
  ],
  'default': [
    ' Je reste à votre disposition pour toute autre question.',
    ' N\'hésitez pas si vous avez besoin de précisions.',
    ' Je peux vous en dire plus si vous le souhaitez.',
    ' Y a-t-il autre chose qui vous intéresse ?'
  ]
};

/**
 * Sélectionne une introduction adaptée au contexte de conversation
 */
function getConversationalIntro(query: string, isFirstMessage: boolean = true): string {
  if (!isFirstMessage) {
    // Pour les messages de continuation, utiliser des intros contextuelles
    const continuationIntros = CONTINUATION_INTROS;
    if (Math.random() < 0.3) { // 30% de chance d'utiliser une intro de continuation
      return continuationIntros[Math.floor(Math.random() * continuationIntros.length)] || '';
    }
  }
  
  // Utiliser des intros empathiques pour certains types de questions
  const lowerQuery = query.toLowerCase();
  const hasUncertainty = lowerQuery.includes('je ne sais pas') || lowerQuery.includes('pas sûr') || 
                        lowerQuery.includes('hésiter') || lowerQuery.includes('comprends pas');
  
  if (hasUncertainty && Math.random() < 0.4) {
    return EMPATHETIC_PHRASES[Math.floor(Math.random() * EMPATHETIC_PHRASES.length)] || '';
  }
  
  // Intros conversationnelles standard
  return CONVERSATIONAL_INTROS[Math.floor(Math.random() * CONVERSATIONAL_INTROS.length)] || '';
}
/**
 * Sélectionne une suggestion contextuelle basée sur la requête
 */
function getContextualSuggestion(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Chercher le contexte le plus pertinent
  for (const [key, suggestions] of Object.entries(CONTEXTUAL_SUGGESTIONS)) {
    if (key !== 'default' && lowerQuery.includes(key)) {
      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      return suggestion || '';
    }
  }
  
  // Fallback : suggestion par défaut
  const defaultSuggestions = CONTEXTUAL_SUGGESTIONS['default'];
  if (defaultSuggestions) {
    return defaultSuggestions[Math.floor(Math.random() * defaultSuggestions.length)] || '';
  }
  
  return '';
}

/**
 * Réponse locale extractive (mode MOCK) - Version conversationnelle
 */
export function answerLocally(
  query: string, 
  retrievedChunks: DocChunk[],
  conversationHistory?: Array<{role: string, message: string}>
): LLMResponse {
  try {
    if (retrievedChunks.length === 0) {
      return {
        reply: 'Je n\'ai pas l\'information précise pour répondre à cette question. Je vous invite à contacter directement un conseiller au 0 800 767 000.',
        citations: [],
        confidence: 0.1,
      };
    }
    
    // Analyser l'historique pour détecter les patterns de conversation
    const isFirstMessage = !conversationHistory || conversationHistory.length === 0;
    const lastUserMessages = conversationHistory?.filter(h => h.role === 'user').slice(-2) || [];
    const firstQueryWord = query.toLowerCase().split(' ')[0] || '';
    const hasAskedSimilarBefore = lastUserMessages.some(msg => 
      firstQueryWord && msg.message.toLowerCase().includes(firstQueryWord)
    );
    
    // Extraire les mots-clés de la requête
    const queryKeywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Scorer les chunks par pertinence
    const scoredChunks = retrievedChunks.map(chunk => {
      const text = chunk.text.toLowerCase();
      const score = queryKeywords.reduce((acc, keyword) => {
        const count = (text.match(new RegExp(keyword, 'g')) || []).length;
        return acc + count;
      }, 0);
      
      return { chunk, score };
    });
    
    // Trier par score et prendre les meilleurs
    scoredChunks.sort((a, b) => b.score - a.score);
    const bestChunks = scoredChunks.slice(0, 3);
    
    // Intro conversationnelle adaptée
    let intro = getConversationalIntro(query, isFirstMessage);
    
    // Adapter l'intro si question similaire déjà posée
    if (hasAskedSimilarBefore) {
      intro = 'Pour compléter ce que nous avons vu, ';
    }
    
    let reply: string = intro;
    
    // Construire une réponse naturelle
    const contentParts: string[] = [];
    
    bestChunks.forEach((item) => {
      if (item.score > 0) {
        // Extraire les phrases les plus pertinentes
        const sentences = item.chunk.text.split(/[.!?]+/);
        const relevantSentences = sentences
          .filter(sentence => {
            const lower = sentence.toLowerCase();
            return queryKeywords.some(keyword => lower.includes(keyword));
          })
          .map(s => s.trim())
          .filter(s => s.length > 10)
          .slice(0, 2);
        
        if (relevantSentences.length > 0) {
          contentParts.push(relevantSentences.join('. '));
        }
      }
    });
    
        if (contentParts.length > 0) {
          // Joindre les parties avec des connecteurs naturels
          reply += contentParts.join('. ') + '.';
          
          // Nettoyer les répétitions et les artefacts
          reply = reply
            .replace(/\s+/g, ' ')  // Espaces multiples
            .replace(/\.+/g, '.')  // Points multiples
            .replace(/\.\s*\./g, '.') // Point point
            .trim();
          
          // Ajouter des éléments conversationnels selon le contexte
          if (conversationHistory && conversationHistory.length > 2) {
            // Conversation avancée - références subtiles au passé
            if (Math.random() < 0.2) {
              const contextualPhrases = [
                'Comme nous en parlions, ',
                'Pour compléter ce que je vous disais, ',
                'Dans la continuité de notre échange, '
              ];
              const randomPhrase = contextualPhrases[Math.floor(Math.random() * contextualPhrases.length)];
              if (randomPhrase) {
                reply = randomPhrase + reply.charAt(0).toLowerCase() + reply.slice(1);
              }
            }
          }
          
          // Ajouter une suggestion contextuelle naturelle
          const suggestion = getContextualSuggestion(query);
          if (suggestion) {
            reply += suggestion;
          }
          
        } else {
          reply += 'Les informations disponibles ne correspondent pas exactement à votre question.';
          
          // Ajouter de l'empathie pour les cas sans réponse
          if (hasAskedSimilarBefore) {
            reply += ' Je vois que cette question vous préoccupe vraiment.';
          }
          
          reply += ' Un conseiller pourra vous apporter une réponse plus précise.';
        }    // Pas de mention "prototype" - le prospect sait que c'est une démo
    
    return {
      reply,
      citations: generateCitationsFromChunks(retrievedChunks),
      confidence: Math.min(bestChunks[0]?.score || 0, 10) / 10,
    };
    
  } catch (error) {
    console.error('❌ Erreur réponse locale:', error);
    
    return {
      reply: 'Je rencontre une difficulté technique. Veuillez contacter un conseiller au 0 800 767 000.',
      citations: [],
      confidence: 0.1,
    };
  }
}

/**
 * Point d'entrée principal pour générer une réponse conversationnelle
 */
export async function generateAnswer(
  query: string, 
  retrievedChunks: DocChunk[],
  conversationHistory?: Array<{role: string, message: string}>
): Promise<LLMResponse> {
  console.log(`🧠 Génération de réponse conversationnelle pour: "${query}" avec ${retrievedChunks.length} chunks`);
  
  try {
    let response: LLMResponse;
    
    if (env.USE_MOCK) {
      console.log('🎭 Mode MOCK - Utilisation réponse locale conversationnelle');
      response = answerLocally(query, retrievedChunks, conversationHistory);
    } else {
      console.log('🤖 Mode LIVE - Tentative Gemini conversationnelle');
      response = await answerWithGemini(query, retrievedChunks, conversationHistory);
    }
    
    // Valider la réponse
    const validatedResponse = LLMResponseSchema.parse(response);
    
    console.log(`✅ Réponse générée (${validatedResponse.citations.length} citations)`);
    return validatedResponse;
    
  } catch (error) {
    console.error('❌ Erreur génération réponse:', error);
    
    // Réponse d'erreur de fallback
    return {
      reply: 'Je rencontre une difficulté technique. Veuillez réessayer ou contacter un conseiller Sofinco au 0 800 767 000.',
      citations: [],
      confidence: 0.1,
    };
  }
}

/**
 * Optimise la requête pour la recherche RAG
 */
export function optimizeQueryForRAG(query: string): string {
  return query
    // Supprimer les mots vides fréquents
    .replace(/\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|des|du|de|et|ou|mais|donc|or|ni|car)\b/gi, ' ')
    // Normaliser les espaces
    .replace(/\s+/g, ' ')
    .trim();
}