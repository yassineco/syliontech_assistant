import { z } from 'zod';

// ==========================================
// SCHEMAS POUR L'API SOFINCO ASSISTANT
// ==========================================

// Paramètres d'un prêt
export const LoanParamsSchema = z.object({
  amount: z.number().min(1000).max(75000), // Montant entre 1k et 75k€
  duration: z.number().min(6).max(84), // Durée en mois (6 mois à 7 ans)
  downPayment: z.number().min(0).optional(), // Apport personnel
  income: z.number().min(0).optional(), // Revenus mensuels
  employment: z.enum(['salarie', 'independant', 'autre']).optional(), // Statut professionnel
});

export type LoanParams = z.infer<typeof LoanParamsSchema>;

// Offre de crédit
export const OfferSchema = z.object({
  label: z.string(), // Ex: "Offre Standard", "Offre Premium"
  monthly: z.number(), // Mensualité
  apr: z.number(), // Taux Annuel Effectif Global (TAEG)
  withInsurance: z.boolean().optional().default(false), // Assurance incluse
  totalCost: z.number().optional(), // Coût total du crédit
  description: z.string().optional(), // Description de l'offre
});

export type Offer = z.infer<typeof OfferSchema>;

// Réponse de l'assistant IA
export const AssistantReplySchema = z.object({
  intent: z.string(), // Ex: "collect_amount", "propose_offers", "clarify_duration"
  slots: LoanParamsSchema.partial(), // Paramètres collectés/mis à jour
  reply: z.string(), // Réponse textuelle pour TTS
  offers: z.array(OfferSchema).optional(), // Offres proposées (si intent = "propose_offers")
  nextAction: z.string().optional(), // Action suivante suggérée
  confidence: z.number().min(0).max(1).optional(), // Niveau de confiance
});

export type AssistantReply = z.infer<typeof AssistantReplySchema>;

// Requête vers l'assistant
export const AssistantRequestSchema = z.object({
  sessionId: z.string().min(1), // ID de session utilisateur
  message: z.string().min(1).max(500), // Message utilisateur
  context: z.record(z.any()).optional(), // Contexte additionnel
  slots: LoanParamsSchema.partial().optional(), // Paramètres déjà collectés
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    message: z.string(),
    timestamp: z.string().optional(),
  })).optional(), // Historique de conversation pour contexte
});

export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;

// Réponse de simulation de prêt
export const SimulationResponseSchema = z.object({
  monthly: z.number(), // Mensualité calculée
  apr: z.number(), // TAEG estimé
  totalCost: z.number(), // Coût total
  options: z.array(OfferSchema), // 1-2 offres alternatives
  legalNote: z.string(), // Mention légale obligatoire
  calculationDate: z.string(), // Date de calcul
});

export type SimulationResponse = z.infer<typeof SimulationResponseSchema>;

// Log d'audit Firestore
export const AuditLogSchema = z.object({
  sessionId: z.string(),
  event: z.enum(['session_start', 'user_message', 'assistant_reply', 'simulation_request', 'offer_presented']),
  timestamp: z.string(), // ISO string
  payload: z.record(z.any()),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// États de la machine à états (Mock Service)
export const ConversationStateSchema = z.enum([
  'initial', // État initial
  'collect_amount', // Collecte du montant
  'collect_duration', // Collecte de la durée
  'collect_income', // Collecte des revenus
  'collect_employment', // Collecte du statut professionnel
  'propose_offers', // Proposition d'offres
  'completed', // Conversation terminée
]);

export type ConversationState = z.infer<typeof ConversationStateSchema>;

// Contexte de session (Mock Service)
export const SessionContextSchema = z.object({
  state: ConversationStateSchema,
  slots: LoanParamsSchema.partial(),
  attempts: z.number().default(0), // Nombre de tentatives pour l'état actuel
  lastIntent: z.string().optional(),
  startedAt: z.string(), // ISO timestamp
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

// ==========================================
// HELPERS DE VALIDATION
// ==========================================

export function validateLoanParams(data: unknown): LoanParams {
  return LoanParamsSchema.parse(data);
}

export function validateAssistantRequest(data: unknown): AssistantRequest {
  return AssistantRequestSchema.parse(data);
}

export function validateAssistantReply(data: unknown): AssistantReply {
  return AssistantReplySchema.parse(data);
}

// ==========================================
// CONSTANTES MÉTIER
// ==========================================

export const LOAN_CONSTANTS = {
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 75000,
  MIN_DURATION: 6, // mois
  MAX_DURATION: 84, // mois
  BASE_APR: 6.1, // TAEG de base
  INSURANCE_APR: 7.3, // TAEG avec assurance
  LEGAL_NOTICE: 'Prototype - simulation non contractuelle. Données fictives. TAEG fixe, hors assurance facultative.'
} as const;