import { LOAN_CONSTANTS } from '../types/schemas.js';

// ==========================================
// SERVICE DE CALCULS FINANCIERS
// ==========================================

/**
 * Calcule la mensualité d'un prêt selon la formule d'amortissement constant
 * Formule: M = C * (t * (1+t)^n) / ((1+t)^n - 1)
 * où M = mensualité, C = capital, t = taux mensuel, n = nombre de mois
 */
export function calcMonthly(
  amount: number,
  durationMonths: number,
  annualRate: number
): number {
  // Validation des entrées
  if (amount <= 0 || durationMonths <= 0 || annualRate < 0) {
    throw new Error('Paramètres de calcul invalides');
  }

  // Taux mensuel
  const monthlyRate = annualRate / 100 / 12;
  
  // Si taux = 0, mensualité = capital / durée
  if (monthlyRate === 0) {
    return Math.round((amount / durationMonths) * 100) / 100;
  }

  // Formule d'amortissement constant
  const factor = Math.pow(1 + monthlyRate, durationMonths);
  const monthly = amount * (monthlyRate * factor) / (factor - 1);
  
  return Math.round(monthly * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Estime le TAEG en fonction des paramètres du prêt
 * Pour la démo, utilise une logique simplifiée
 */
export function estimateAPR(
  amount: number,
  durationMonths: number,
  income?: number,
  employment?: string
): number {
  let baseAPR = LOAN_CONSTANTS.BASE_APR;
  
  // Ajustement selon le montant (plus le montant est élevé, meilleur le taux)
  if (amount >= 20000) {
    baseAPR -= 0.3;
  } else if (amount >= 10000) {
    baseAPR -= 0.1;
  }
  
  // Ajustement selon la durée (plus long = taux plus élevé)
  if (durationMonths > 60) {
    baseAPR += 0.4;
  } else if (durationMonths > 36) {
    baseAPR += 0.2;
  }
  
  // Ajustement selon les revenus (revenus élevés = meilleur taux)
  if (income && income >= 4000) {
    baseAPR -= 0.2;
  } else if (income && income >= 2500) {
    baseAPR -= 0.1;
  }
  
  // Ajustement selon le statut professionnel
  if (employment === 'salarie') {
    baseAPR -= 0.1;
  } else if (employment === 'independant') {
    baseAPR += 0.2;
  }
  
  // Seuil minimum et maximum
  return Math.max(3.9, Math.min(12.9, Math.round(baseAPR * 10) / 10));
}

/**
 * Calcule le coût total du crédit
 */
export function calcTotalCost(
  amount: number,
  monthly: number,
  durationMonths: number
): number {
  const totalPaid = monthly * durationMonths;
  return Math.round((totalPaid - amount) * 100) / 100;
}

/**
 * Génère les deux offres standards pour la simulation
 */
export function generateStandardOffers(
  amount: number,
  durationMonths: number,
  income?: number,
  employment?: string
) {
  const baseAPR = estimateAPR(amount, durationMonths, income, employment);
  
  // Offre 1: Standard (sans assurance)
  const standardMonthly = calcMonthly(amount, durationMonths, baseAPR);
  const standardTotalCost = calcTotalCost(amount, standardMonthly, durationMonths);
  
  // Offre 2: Avec assurance (TAEG + 1.2%)
  const insuredAPR = baseAPR + 1.2;
  const insuredMonthly = calcMonthly(amount, durationMonths, insuredAPR);
  const insuredTotalCost = calcTotalCost(amount, insuredMonthly, durationMonths);
  
  return {
    standard: {
      label: 'Offre Standard',
      monthly: standardMonthly,
      apr: baseAPR,
      totalCost: standardTotalCost,
      withInsurance: false,
      description: 'Taux préférentiel sans assurance',
    },
    insured: {
      label: 'Offre Sérénité',
      monthly: insuredMonthly,
      apr: insuredAPR,
      totalCost: insuredTotalCost,
      withInsurance: true,
      description: 'Avec assurance décès-invalidité incluse',
    },
  };
}

/**
 * Valide les paramètres de prêt selon les critères Sofinco
 */
export function validateLoanCriteria(
  amount: number,
  durationMonths: number,
  income?: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Vérifications obligatoires
  if (amount < LOAN_CONSTANTS.MIN_AMOUNT) {
    errors.push(`Montant minimum: ${LOAN_CONSTANTS.MIN_AMOUNT}€`);
  }
  if (amount > LOAN_CONSTANTS.MAX_AMOUNT) {
    errors.push(`Montant maximum: ${LOAN_CONSTANTS.MAX_AMOUNT}€`);
  }
  if (durationMonths < LOAN_CONSTANTS.MIN_DURATION) {
    errors.push(`Durée minimum: ${LOAN_CONSTANTS.MIN_DURATION} mois`);
  }
  if (durationMonths > LOAN_CONSTANTS.MAX_DURATION) {
    errors.push(`Durée maximum: ${LOAN_CONSTANTS.MAX_DURATION} mois`);
  }
  
  // Vérifications de cohérence (warnings)
  if (income) {
    const estimatedMonthly = calcMonthly(amount, durationMonths, LOAN_CONSTANTS.BASE_APR);
    const debtRatio = (estimatedMonthly / income) * 100;
    
    if (debtRatio > 33) {
      warnings.push(`Taux d'endettement élevé: ${Math.round(debtRatio)}% (>33%)`);
    }
    
    if (income < 1200) {
      warnings.push('Revenus inférieurs au seuil habituel');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}