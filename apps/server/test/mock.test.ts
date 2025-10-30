import { describe, it, expect, beforeEach } from 'vitest';
import { processAssistantRequest, resetSession, getSessionStatus } from '../src/services/mock.js';
import type { AssistantRequest } from '../src/types/schemas.js';

describe('Service Mock', () => {
  const sessionId = 'test-session';

  beforeEach(() => {
    resetSession(sessionId);
  });

  describe('Machine à états de conversation', () => {
    it('démarre avec un message d\'accueil', async () => {
      const request: AssistantRequest = {
        sessionId,
        message: 'Bonjour',
      };

      const response = await processAssistantRequest(request);
      
      expect(response.intent).toBe('welcome');
      expect(response.reply).toContain('assistant Sofinco');
      expect(response.nextAction).toBe('collect_amount');
    });

    it('collecte le montant depuis le message', async () => {
      const request: AssistantRequest = {
        sessionId,
        message: 'Je veux emprunter 15000 euros',
      };

      const response = await processAssistantRequest(request);
      
      expect(response.slots.amount).toBe(15000);
      expect(response.nextAction).toBe('collect_duration');
    });

    it('collecte la durée et passe à l\'étape suivante', async () => {
      // D'abord le montant
      await processAssistantRequest({
        sessionId,
        message: 'Je veux 15000 euros',
      });

      // Puis la durée
      const response = await processAssistantRequest({
        sessionId,
        message: 'Sur 48 mois',
      });

      expect(response.slots.duration).toBe(48);
      expect(response.nextAction).toBe('collect_income');
    });

    it('propose des offres après collecte complète', async () => {
      // Simulation d'une conversation complète
      const steps = [
        { message: 'Je veux 15000 euros', expectedSlot: 'amount' },
        { message: 'Sur 48 mois', expectedSlot: 'duration' },
        { message: 'Je gagne 2500 euros', expectedSlot: 'income' },
        { message: 'Je suis salarié', expectedSlot: 'employment' },
      ];

      let lastResponse;
      for (const step of steps) {
        lastResponse = await processAssistantRequest({
          sessionId,
          message: step.message,
        });
      }

      expect(lastResponse?.intent).toBe('propose_offers');
      expect(lastResponse?.offers).toBeDefined();
      expect(lastResponse?.offers).toHaveLength(2);
      expect(lastResponse?.offers?.[0].label).toContain('Standard');
      expect(lastResponse?.offers?.[1].label).toContain('Sérénité');
    });
  });

  describe('Extraction d\'informations', () => {
    it('extrait les montants correctement', async () => {
      const testCases = [
        { message: '15000 euros', expected: 15000 },
        { message: '25 000 €', expected: 25000 },
        { message: 'quinze mille euros', expected: null }, // Pas de parsing textuel
      ];

      for (const testCase of testCases) {
        resetSession(sessionId);
        const response = await processAssistantRequest({
          sessionId,
          message: testCase.message,
        });

        if (testCase.expected) {
          expect(response.slots.amount).toBe(testCase.expected);
        } else {
          expect(response.slots.amount).toBeUndefined();
        }
      }
    });

    it('extrait les durées en mois et années', async () => {
      const testCases = [
        { message: '48 mois', expected: 48 },
        { message: '4 ans', expected: 48 },
        { message: '3 années', expected: 36 },
      ];

      for (const testCase of testCases) {
        resetSession(sessionId);
        const response = await processAssistantRequest({
          sessionId,
          message: testCase.message,
        });

        expect(response.slots.duration).toBe(testCase.expected);
      }
    });

    it('extrait le statut professionnel', async () => {
      const testCases = [
        { message: 'Je suis salarié', expected: 'salarie' },
        { message: 'indépendant', expected: 'independant' },
        { message: 'auto-entrepreneur', expected: 'independant' },
      ];

      for (const testCase of testCases) {
        resetSession(sessionId);
        const response = await processAssistantRequest({
          sessionId,
          message: testCase.message,
        });

        expect(response.slots.employment).toBe(testCase.expected);
      }
    });
  });

  describe('Gestion des erreurs et tentatives', () => {
    it('gère les tentatives multiples', async () => {
      // Session spécifique pour ce test
      const tentativeSessionId = 'tentative-session';
      
      // Première tentative - réponse peu claire
      let response = await processAssistantRequest({
        sessionId: tentativeSessionId,
        message: 'Je veux un crédit',
      });
      expect(response.slots.amount).toBeUndefined();

      // Deuxième tentative
      response = await processAssistantRequest({
        sessionId: tentativeSessionId,
        message: 'Pour ma voiture',
      });
      expect(response.slots.amount).toBeUndefined();

      // Troisième tentative - devrait demander clarification
      response = await processAssistantRequest({
        sessionId: tentativeSessionId,
        message: 'C\'est urgent',
      });
      expect(response.intent).toBe('clarify_amount');
    });

    it('retourne une erreur pour critères invalides', async () => {
      const request: AssistantRequest = {
        sessionId,
        message: 'Test',
        slots: {
          amount: 100000, // Trop élevé
          duration: 48,
        },
      };

      const response = await processAssistantRequest(request);
      expect(response.intent).toBe('criteria_error');
      expect(response.reply).toContain('Montant maximum');
    });
  });

  describe('Gestion de session', () => {
    it('permet de récupérer le statut de session', async () => {
      await processAssistantRequest({
        sessionId,
        message: 'Je veux 15000 euros',
      });

      const status = getSessionStatus(sessionId);
      expect(status).toBeDefined();
      expect(status?.slots.amount).toBe(15000);
      expect(status?.state).toBe('collect_duration');
    });

    it('gère les sessions multiples indépendamment', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      await processAssistantRequest({
        sessionId: session1,
        message: 'Je veux 10000 euros',
      });

      await processAssistantRequest({
        sessionId: session2,
        message: 'Je veux 20000 euros',
      });

      const status1 = getSessionStatus(session1);
      const status2 = getSessionStatus(session2);

      expect(status1?.slots.amount).toBe(10000);
      expect(status2?.slots.amount).toBe(20000);
    });
  });
});