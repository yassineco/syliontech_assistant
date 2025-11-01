import { z } from 'zod';
import type { DocChunk, Citation, LLMResponse } from '../rag/types.js';
import { LLMResponseSchema } from '../rag/types.js';
import { env } from '../config/env.js';
import { isGeminiAvailable } from '../services/gemini.js';

// ==========================================
// SERVICE LLM - GEMINI + FALLBACK LOCAL
// ==========================================

/**
 * Prompt système pour l'assistant Sofinco avec RAG - Version naturelle
 */
const RAG_SYSTEM_PROMPT = `Tu es l'Assistant Crédit Sofinco, un conseiller virtuel spécialisé.

RÔLE:
- Aide les clients avec leurs questions sur les crédits Sofinco
- Réponds de manière naturelle et conversationnelle
- Utilise UNIQUEMENT les informations fournies dans le contexte

STYLE DE RÉPONSE:
1. Utilise le vouvoiement
2. Sois direct et concis (évite "Voici les informations que j'ai trouvées")
3. Réponds naturellement comme un conseiller humain
4. Maximum 150 mots
5. Ne mentionne JAMAIS que c'est un prototype ou une démo

INTERDICTIONS:
- Pas de formules artificielles comme "Voici...", "Je vous informe que..."
- Pas de mention "prototype", "démo", "informations non contractuelles"
- Pas d'invention - uniquement le contexte fourni
- Pas de sur-politesse excessive

IMPORTANT: Le client sait déjà qu'il parle à un assistant virtuel, sois simplement naturel et efficace.`;

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
 * Réponse avec Gemini (mode LIVE)
 */
export async function answerWithGemini(
  query: string, 
  retrievedChunks: DocChunk[]
): Promise<LLMResponse> {
  try {
    if (!isGeminiAvailable()) {
      throw new Error('Gemini non disponible');
    }
    
    // Préparer le contexte à partir des chunks
    const context = retrievedChunks.map((chunk, index) => 
      `[Source ${index + 1}: ${chunk.title}]\n${chunk.text}`
    ).join('\n\n');
    
    // Construire le prompt avec contexte
    const prompt = `${RAG_SYSTEM_PROMPT}

CONTEXTE FOURNI:
${context}

QUESTION CLIENT: ${query}

RÉPONSE (format JSON attendu):
{
  "reply": "Votre réponse détaillée en utilisant le vouvoiement",
  "citations": [{"title": "Titre de la source", "anchor": "section-si-applicable"}],
  "confidence": 0.8
}`;

    // Pour l'instant, on simule la réponse Gemini en mode LIVE
    // TODO: Implémenter l'intégration Gemini complète
    console.log('🤖 Simulation réponse Gemini avec contexte:', context.substring(0, 200) + '...');
    
    // Réponse simulée basée sur le contexte - Plus naturelle
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
    return answerLocally(query, retrievedChunks);
  }
}

/**
 * Phrases d'introduction naturelles (variées)
 */
const NATURAL_INTROS = [
  '',  // Réponse directe sans intro
  'Bien sûr. ',
  'Absolument. ',
  'Je peux vous répondre. ',
  'Laissez-moi vous expliquer. ',
];

/**
 * Réponse locale extractive (mode MOCK) - Version naturelle
 */
export function answerLocally(
  query: string, 
  retrievedChunks: DocChunk[]
): LLMResponse {
  try {
    if (retrievedChunks.length === 0) {
      return {
        reply: 'Je n\'ai pas l\'information précise pour répondre à cette question. Je vous invite à contacter directement un conseiller au 0 800 767 000.',
        citations: [],
        confidence: 0.1,
      };
    }
    
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
    
    // Intro naturelle aléatoire
    const intro = NATURAL_INTROS[Math.floor(Math.random() * NATURAL_INTROS.length)] || '';
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
        
    } else {
      reply += 'Les informations disponibles ne correspondent pas exactement à votre question. Un conseiller pourra vous apporter une réponse plus précise.';
    }
    
    // Pas de mention "prototype" - le prospect sait que c'est une démo
    
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
 * Point d'entrée principal pour générer une réponse
 */
export async function generateAnswer(
  query: string, 
  retrievedChunks: DocChunk[]
): Promise<LLMResponse> {
  console.log(`🧠 Génération de réponse pour: "${query}" avec ${retrievedChunks.length} chunks`);
  
  try {
    let response: LLMResponse;
    
    if (env.USE_MOCK) {
      console.log('🎭 Mode MOCK - Utilisation réponse locale');
      response = answerLocally(query, retrievedChunks);
    } else {
      console.log('🤖 Mode LIVE - Tentative Gemini');
      response = await answerWithGemini(query, retrievedChunks);
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