/**
 * Utilitaires de calcul financier côté client
 * Miroir des calculs côté serveur pour preview instantané
 */

/**
 * Calcule la mensualité d'un prêt selon la formule d'amortissement
 */
export function calculateMonthly(
  amount: number,
  durationMonths: number,
  annualRate: number
): number {
  if (amount <= 0 || durationMonths <= 0 || annualRate < 0) {
    return 0;
  }

  const monthlyRate = annualRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return Math.round((amount / durationMonths) * 100) / 100;
  }

  const factor = Math.pow(1 + monthlyRate, durationMonths);
  const monthly = amount * (monthlyRate * factor) / (factor - 1);
  
  return Math.round(monthly * 100) / 100;
}

/**
 * Calcule le coût total du crédit
 */
export function calculateTotalCost(
  amount: number,
  monthly: number,
  durationMonths: number
): number {
  const totalPaid = monthly * durationMonths;
  return Math.round((totalPaid - amount) * 100) / 100;
}

/**
 * Estime un TAEG de base (simplifié pour preview)
 */
export function estimateBaseAPR(amount: number, durationMonths: number): number {
  let baseAPR = 6.1; // TAEG de base
  
  // Ajustements simplifiés
  if (amount >= 20000) baseAPR -= 0.3;
  else if (amount >= 10000) baseAPR -= 0.1;
  
  if (durationMonths > 60) baseAPR += 0.4;
  else if (durationMonths > 36) baseAPR += 0.2;
  
  return Math.max(3.9, Math.min(12.9, Math.round(baseAPR * 10) / 10));
}

/**
 * Génère un aperçu rapide des offres
 */
export function generateQuickPreview(amount: number, durationMonths: number) {
  const baseAPR = estimateBaseAPR(amount, durationMonths);
  const insuredAPR = baseAPR + 1.2;
  
  const standardMonthly = calculateMonthly(amount, durationMonths, baseAPR);
  const insuredMonthly = calculateMonthly(amount, durationMonths, insuredAPR);
  
  return {
    standard: {
      monthly: standardMonthly,
      apr: baseAPR,
      totalCost: calculateTotalCost(amount, standardMonthly, durationMonths),
    },
    insured: {
      monthly: insuredMonthly,
      apr: insuredAPR,
      totalCost: calculateTotalCost(amount, insuredMonthly, durationMonths),
    },
  };
}

/**
 * Valide les paramètres de prêt
 */
export function validateLoanParams(
  amount: number,
  duration: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (amount < 1000) errors.push('Montant minimum : 1 000€');
  if (amount > 75000) errors.push('Montant maximum : 75 000€');
  if (duration < 6) errors.push('Durée minimum : 6 mois');
  if (duration > 84) errors.push('Durée maximum : 84 mois');
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)} %`;
}

/**
 * Formate une durée en mois/années
 */
export function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} mois`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} ${years > 1 ? 'ans' : 'an'}`;
  }
  
  return `${years} ${years > 1 ? 'ans' : 'an'} ${remainingMonths} mois`;
}

/**
 * Calcule le taux d'endettement
 */
export function calculateDebtRatio(monthlyPayment: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.round((monthlyPayment / monthlyIncome) * 100);
}

/**
 * Génère des options de durée communes
 */
export function getDurationOptions(): Array<{ value: number; label: string }> {
  const options = [
    12, 18, 24, 36, 48, 60, 72, 84
  ];
  
  return options.map(months => ({
    value: months,
    label: formatDuration(months),
  }));
}

/**
 * Génère des options de montant communes
 */
export function getAmountOptions(): Array<{ value: number; label: string }> {
  const amounts = [
    5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000
  ];
  
  return amounts.map(amount => ({
    value: amount,
    label: formatCurrency(amount),
  }));
}