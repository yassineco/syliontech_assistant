import { describe, it, expect } from 'vitest';
import { calcMonthly, estimateAPR, generateStandardOffers, validateLoanCriteria } from '../src/services/finance.js';

describe('Service Finance', () => {
  describe('calcMonthly', () => {
    it('calcule correctement une mensualité avec taux', () => {
      const monthly = calcMonthly(15000, 48, 6.1);
      expect(monthly).toBeCloseTo(352.24, 1); // Tolérance 0.1€
    });

    it('calcule correctement avec taux zéro', () => {
      const monthly = calcMonthly(12000, 48, 0);
      expect(monthly).toBe(250); // 12000 / 48
    });

    it('lève une erreur pour paramètres invalides', () => {
      expect(() => calcMonthly(-1000, 48, 6.1)).toThrow();
      expect(() => calcMonthly(15000, -48, 6.1)).toThrow();
      expect(() => calcMonthly(15000, 48, -1)).toThrow();
    });
  });

  describe('estimateAPR', () => {
    it('retourne le TAEG de base par défaut', () => {
      const apr = estimateAPR(15000, 48);
      expect(apr).toBeGreaterThanOrEqual(3.9);
      expect(apr).toBeLessThanOrEqual(12.9);
    });

    it('ajuste le taux selon le montant', () => {
      const aprSmall = estimateAPR(5000, 48);
      const aprLarge = estimateAPR(25000, 48);
      expect(aprLarge).toBeLessThan(aprSmall); // Montant plus élevé = meilleur taux
    });

    it('ajuste selon les revenus', () => {
      const aprLowIncome = estimateAPR(15000, 48, 1500);
      const aprHighIncome = estimateAPR(15000, 48, 5000);
      expect(aprHighIncome).toBeLessThan(aprLowIncome);
    });
  });

  describe('generateStandardOffers', () => {
    it('génère deux offres avec la seconde plus chère', () => {
      const offers = generateStandardOffers(15000, 48, 2500, 'salarie');
      
      expect(offers.standard).toBeDefined();
      expect(offers.insured).toBeDefined();
      
      expect(offers.insured.monthly).toBeGreaterThan(offers.standard.monthly);
      expect(offers.insured.apr).toBeGreaterThan(offers.standard.apr);
      expect(offers.insured.withInsurance).toBe(true);
      expect(offers.standard.withInsurance).toBe(false);
    });
  });

  describe('validateLoanCriteria', () => {
    it('valide un prêt conforme', () => {
      const result = validateLoanCriteria(15000, 48, 2500);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejette un montant trop faible', () => {
      const result = validateLoanCriteria(500, 48);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Montant minimum: 1000€');
    });

    it('rejette un montant trop élevé', () => {
      const result = validateLoanCriteria(100000, 48);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Montant maximum: 75000€');
    });

    it('avertit sur taux d\'endettement élevé', () => {
      const result = validateLoanCriteria(15000, 24, 1000); // Mensualité ~650€ pour 1000€ revenus
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('endettement'))).toBe(true);
    });
  });
});