import { z } from 'zod';
import type { 
  AssistantRequest, 
  AssistantReply, 
  ConversationState, 
  SessionContext,
  LoanParams 
} from '../types/schemas.js';
import { LoanParamsSchema } from '../types/schemas.js';
import { generateStandardOffers, validateLoanCriteria } from './finance.js';

// ==========================================
// SERVICE MOCK - RÉPONSES DÉTERMINISTES
// ==========================================

// Stockage en mémoire des sessions (en production: Redis/Database)
const sessions = new Map<string, SessionContext>();

/**
 * Machine à états pour la conversation de prêt
 */
class LoanConversationFSM {
  
  /**
   * Traite un message utilisateur et retourne la réponse
   */
  async processMessage(request: AssistantRequest): Promise<AssistantReply> {
    const { sessionId, message } = request;
    
    // Récupère ou initialise la session
    let session = sessions.get(sessionId);
    if (!session) {
      session = this.initializeSession();
      sessions.set(sessionId, session);
    }
    
    // Merge des slots fournis en premier
    if (request.slots) {
      session.slots = { ...session.slots, ...request.slots };
    }
    
    // Si on a déjà assez d'infos pour générer des offres, on y va directement
    if (session.slots.amount && session.slots.duration) {
      const validation = validateLoanCriteria(session.slots.amount, session.slots.duration, session.slots.income);
      if (!validation.isValid) {
        return {
          intent: 'criteria_error',
          slots: session.slots,
          reply: `Je ne peux pas vous proposer d'offre : ${validation.errors.join(', ')}. Souhaitez-vous ajuster vos critères ?`,
          nextAction: 'collect_amount',
        };
      }
      
      // Générer les offres directement
      return this.generateOffers(session);
    }
    
    // Traite le message selon l'état actuel
    const response = await this.handleState(session, message, request.slots);
    
    // Met à jour la session
    sessions.set(sessionId, session);
    
    return response;
  }
  
  /**
   * Initialise une nouvelle session
   */
  private initializeSession(): SessionContext {
    return {
      state: 'initial',
      slots: {},
      attempts: 0,
      startedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Traite l'état actuel de la conversation
   */
  private async handleState(
    session: SessionContext, 
    message: string, 
    providedSlots?: AssistantRequest['slots']
  ): Promise<AssistantReply> {
    
    // Merge des slots fournis
    if (providedSlots) {
      session.slots = { ...session.slots, ...providedSlots };
    }
    
    // Extraction d'informations du message
    this.extractInfoFromMessage(session, message);
    
    switch (session.state) {
      case 'initial':
        // Première interaction - passer directement à la collecte
        session.state = 'collect_amount';
        return this.handleCollectAmount(session, message);
      
      case 'collect_amount':
        return this.handleCollectAmount(session, message);
      
      case 'collect_duration':
        return this.handleCollectDuration(session, message);
      
      case 'collect_income':
        return this.handleCollectIncome(session, message);
      
      case 'collect_employment':
        return this.handleCollectEmployment(session, message);
      
      case 'propose_offers':
        return this.generateOffers(session);
      
      case 'completed':
        return this.handleCompleted(session, message);
      
      default:
        return this.handleError(session);
    }
  }
  
  /**
   * Extraction simple d'informations depuis le message
   */
  private extractInfoFromMessage(session: SessionContext, message: string): void {
    const text = message.toLowerCase();
    
    // Extraction du montant (€, euros)
    const amountMatch = text.match(/(\d+(?:\s*\d+)*)\s*(?:€|euros?|eur)/);
    if (amountMatch?.[1]) {
      const amount = parseInt(amountMatch[1].replace(/\s/g, ''));
      if (amount >= 1000 && amount <= 75000) {
        session.slots.amount = amount;
      }
    }
    
    // Extraction de la durée (mois, ans)
    const durationMatch = text.match(/(\d+)\s*(?:mois|ans?)/);
    if (durationMatch?.[1]) {
      let duration = parseInt(durationMatch[1]);
      if (text.includes('an')) duration *= 12; // Conversion ans -> mois
      if (duration >= 6 && duration <= 84) {
        session.slots.duration = duration;
      }
    }
    
    // Extraction des revenus
    const incomeMatch = text.match(/(?:gagne|revenus?|salaire)\s*(?:de)?\s*(\d+(?:\s*\d+)*)/);
    if (incomeMatch?.[1]) {
      const income = parseInt(incomeMatch[1].replace(/\s/g, ''));
      if (income > 0) {
        session.slots.income = income;
      }
    }
    
    // Statut professionnel
    if (text.includes('salarié') || text.includes('salarie') || text.includes('employé')) {
      session.slots.employment = 'salarie';
    } else if (text.includes('indépendant') || text.includes('freelance') || text.includes('auto-entrepreneur')) {
      session.slots.employment = 'independant';
    }
  }
  
  /**
   * Collecte du montant
   */
  private handleCollectAmount(session: SessionContext, message: string): AssistantReply {
    if (!session.slots.amount) {
      session.attempts++;
      
      // Premier message de bienvenue
      if (session.attempts === 1 && (message.toLowerCase().includes('bonjour') || message.toLowerCase().includes('salut'))) {
        return {
          intent: 'welcome',
          slots: session.slots,
          reply: 'Bonjour ! Je suis votre assistant Sofinco. Pour vous proposer les meilleures offres de crédit, quel montant souhaitez-vous emprunter ?',
          nextAction: 'collect_amount',
        };
      }
      
      if (session.attempts > 2) {
        return {
          intent: 'clarify_amount',
          slots: session.slots,
          reply: 'Je n\'ai pas bien compris le montant. Pouvez-vous me dire combien vous souhaitez emprunter ? Par exemple : "15 000 euros".',
          nextAction: 'collect_amount',
        };
      }
      
      return {
        intent: 'request_amount',
        slots: session.slots,
        reply: 'Pouvez-vous me préciser le montant que vous souhaitez emprunter ? Nous proposons des crédits de 1 000 à 75 000 euros.',
        nextAction: 'collect_amount',
      };
    }
    
    session.state = 'collect_duration';
    session.attempts = 0;
    
    return {
      intent: 'amount_confirmed',
      slots: session.slots,
      reply: `Parfait, ${session.slots.amount} euros. Sur combien de temps souhaitez-vous rembourser ce crédit ?`,
      nextAction: 'collect_duration',
    };
  }
  
  /**
   * Collecte de la durée
   */
  private handleCollectDuration(session: SessionContext, message: string): AssistantReply {
    if (!session.slots.duration) {
      session.attempts++;
      
      if (session.attempts > 2) {
        return {
          intent: 'clarify_duration',
          slots: session.slots,
          reply: 'Pouvez-vous préciser la durée de remboursement ? Par exemple : "36 mois" ou "3 ans".',
          nextAction: 'collect_duration',
        };
      }
      
      return {
        intent: 'request_duration',
        slots: session.slots,
        reply: 'Sur quelle durée souhaitez-vous rembourser ? Nous proposons de 6 mois à 7 ans.',
        nextAction: 'collect_duration',
      };
    }
    
    session.state = 'collect_income';
    session.attempts = 0;
    
    return {
      intent: 'duration_confirmed',
      slots: session.slots,
      reply: `Très bien, ${session.slots.duration} mois. Pour finaliser votre simulation, quels sont vos revenus mensuels nets ?`,
      nextAction: 'collect_income',
    };
  }
  
  /**
   * Collecte des revenus
   */
  private handleCollectIncome(session: SessionContext, message: string): AssistantReply {
    if (!session.slots.income) {
      session.attempts++;
      
      if (session.attempts > 2) {
        // Passer à l'étape suivante même sans revenus
        session.state = 'collect_employment';
        return {
          intent: 'skip_income',
          slots: session.slots,
          reply: 'Pas de problème. Quel est votre statut professionnel ? Salarié, indépendant, ou autre ?',
          nextAction: 'collect_employment',
        };
      }
      
      return {
        intent: 'request_income',
        slots: session.slots,
        reply: 'Pouvez-vous me dire vos revenus mensuels nets ? Cela m\'aide à vous proposer les meilleures conditions.',
        nextAction: 'collect_income',
      };
    }
    
    session.state = 'collect_employment';
    session.attempts = 0;
    
    return {
      intent: 'income_confirmed',
      slots: session.slots,
      reply: `Merci, ${session.slots.income} euros nets par mois. Quel est votre statut professionnel ?`,
      nextAction: 'collect_employment',
    };
  }
  
  /**
   * Collecte du statut professionnel
   */
  private handleCollectEmployment(session: SessionContext, message: string): AssistantReply {
    if (!session.slots.employment) {
      session.attempts++;
      
      if (session.attempts > 2) {
        // Finaliser même sans statut
        session.slots.employment = 'autre';
      } else {
        return {
          intent: 'request_employment',
          slots: session.slots,
          reply: 'Êtes-vous salarié, indépendant, ou avez-vous un autre statut ?',
          nextAction: 'collect_employment',
        };
      }
    }
    
    session.state = 'propose_offers';
    session.attempts = 0;
    
    return this.generateOffers(session);
  }
  
  /**
   * Génère et propose les offres
   */
  private generateOffers(session: SessionContext): AssistantReply {
    const { amount, duration } = session.slots;
    
    if (!amount || !duration) {
      return this.handleError(session);
    }
    
    // Validation des critères
    const validation = validateLoanCriteria(amount, duration, session.slots.income);
    if (!validation.isValid) {
      return {
        intent: 'criteria_error',
        slots: session.slots,
        reply: `Je ne peux pas vous proposer d'offre : ${validation.errors.join(', ')}. Souhaitez-vous ajuster vos critères ?`,
        nextAction: 'collect_amount',
      };
    }
    
    // Génération des offres
    const offers = generateStandardOffers(
      amount, 
      duration, 
      session.slots.income, 
      session.slots.employment
    );
    
    session.state = 'completed';
    
    return {
      intent: 'propose_offers',
      slots: session.slots,
      reply: `Parfait ! Voici vos deux meilleures offres pour ${amount} euros sur ${duration} mois. L'offre Standard à ${offers.standard.monthly} euros par mois, ou l'offre Sérénité avec assurance à ${offers.insured.monthly} euros par mois.`,
      offers: [offers.standard, offers.insured],
      nextAction: 'completed',
      confidence: 0.95,
    };
  }
  
  /**
   * Conversation terminée
   */
  private handleCompleted(session: SessionContext, message: string): AssistantReply {
    return {
      intent: 'conversation_complete',
      slots: session.slots,
      reply: 'Votre simulation est terminée. Souhaitez-vous faire une nouvelle simulation ou avez-vous d\'autres questions ?',
      nextAction: 'restart',
    };
  }
  
  /**
   * Gestion d'erreur
   */
  private handleError(session: SessionContext): AssistantReply {
    return {
      intent: 'error',
      slots: session.slots,
      reply: 'Je rencontre une difficulté. Pouvons-nous reprendre depuis le début ? Quel montant souhaitez-vous emprunter ?',
      nextAction: 'collect_amount',
    };
  }
}

// Instance globale de la FSM
const fsm = new LoanConversationFSM();

/**
 * Point d'entrée principal du service Mock
 */
export async function processAssistantRequest(request: AssistantRequest): Promise<AssistantReply> {
  try {
    return await fsm.processMessage(request);
  } catch (error) {
    console.error('Erreur Mock Service:', error);
    
    return {
      intent: 'system_error',
      slots: {},
      reply: 'Je rencontre un problème technique. Pouvez-vous réessayer ?',
      nextAction: 'restart',
    };
  }
}

/**
 * Utilitaire pour réinitialiser une session
 */
export function resetSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Utilitaire pour obtenir le statut d'une session
 */
export function getSessionStatus(sessionId: string): SessionContext | null {
  return sessions.get(sessionId) || null;
}