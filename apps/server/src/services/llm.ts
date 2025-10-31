import { z } from 'zod';
import type { DocChunk, Citation, LLMResponse } from '../rag/types.js';
import { LLMResponseSchema } from '../rag/types.js';
import { env } from '../config/env.js';
import { isGeminiAvailable } from '../services/gemini.js';

// ==========================================
// SERVICE LLM - GEMINI + FALLBACK LOCAL
// ==========================================

/**
 * Prompt système pour l'assistant Sofinco avec RAG
 */
const RAG_SYSTEM_PROMPT = `Tu es l'Assistant Crédit Sofinco, un conseiller virtuel spécialisé dans le crédit personnel et automobile.

RÔLE ET MISSION:
- Aide les clients avec leurs questions sur les crédits Sofinco
- Réponds uniquement aux questions liées au crédit et aux services Sofinco
- Utilise EXCLUSIVEMENT les informations fournies dans le contexte
- Cite tes sources de manière claire et précise

RÈGLES DE RÉPONSE:
1. TOUJOURS utiliser le vouvoiement
2. Être bienveillant, professionnel et empathique
3. Répondre de manière concise mais complète (maximum 200 mots)
4. Citer OBLIGATOIREMENT les sources utilisées
5. Si l'information n'est pas dans le contexte, le dire honnêtement

GUARDRAILS STRICTS:
- Ne jamais inventer d'informations non présentes dans le contexte
- Rappeler que c'est un "Prototype - informations non contractuelles"
- Rediriger vers un conseiller pour les cas complexes
- Refuser poliment les sujets hors crédit

FORMAT DE RÉPONSE:
- Réponse claire et structurée
- Citations sous forme de liste [Source: Titre]
- Ton professionnel mais accessible

IMPORTANT: Si tu ne trouves pas l'information dans le contexte fourni, dis-le clairement et propose de contacter un conseiller.`;

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
    
    // Réponse simulée basée sur le contexte
    const contextSummary = retrievedChunks.slice(0, 2).map(chunk => 
      chunk.text.split('.')[0] + '.'
    ).join(' ');
    
    const simulatedReply = `Selon les informations Sofinco, ${contextSummary} 

*Prototype - Ces informations sont non contractuelles. Pour des détails précis, contactez un conseiller au 0 800 767 000.*`;
    
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
 * Réponse locale extractive (mode MOCK)
 */
export function answerLocally(
  query: string, 
  retrievedChunks: DocChunk[]
): LLMResponse {
  try {
    if (retrievedChunks.length === 0) {
      return {
        reply: 'Je n\'ai pas trouvé d\'information pertinente pour répondre à votre question. N\'hésitez pas à contacter un conseiller Sofinco au 0 800 767 000 pour une assistance personnalisée.',
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
    
    // Construire la réponse extractive
    let reply = 'Voici les informations que j\'ai trouvées :\n\n';
    
    bestChunks.forEach((item, index) => {
      if (item.score > 0) {
        // Extraire les phrases les plus pertinentes
        const sentences = item.chunk.text.split(/[.!?]+/);
        const relevantSentences = sentences.filter(sentence => 
          queryKeywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
          )
        ).slice(0, 2);
        
        if (relevantSentences.length > 0) {
          reply += `${relevantSentences.join('. ')}.`;
          if (index < bestChunks.length - 1) reply += '\n\n';
        }
      }
    });
    
    // Si pas de contenu pertinent trouvé
    if (reply === 'Voici les informations que j\'ai trouvées :\n\n') {
      reply = 'Je dispose d\'informations sur ce sujet mais elles ne correspondent pas exactement à votre question. Pour une réponse précise, je vous recommande de contacter un conseiller Sofinco.';
    }
    
    reply += '\n\n*Prototype - Informations non contractuelles*';
    
    return {
      reply,
      citations: generateCitationsFromChunks(retrievedChunks),
      confidence: Math.min(bestChunks[0]?.score || 0, 10) / 10,
    };
    
  } catch (error) {
    console.error('❌ Erreur réponse locale:', error);
    
    return {
      reply: 'Je rencontre une difficulté technique pour traiter votre demande. Veuillez contacter un conseiller Sofinco au 0 800 767 000.',
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