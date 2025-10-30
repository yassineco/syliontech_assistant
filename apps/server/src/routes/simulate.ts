import type { FastifyPluginAsync } from 'fastify';
import { validateLoanParams, type LoanParams, type SimulationResponse, LOAN_CONSTANTS } from '../types/schemas.js';
import { generateStandardOffers, validateLoanCriteria } from '../services/finance.js';
import { logSimulationRequest } from '../services/audit.js';

// ==========================================
// ROUTE /api/simulate - SIMULATION DE PRÊT
// ==========================================

const simulateRoute: FastifyPluginAsync = async (fastify) => {
  
  fastify.post<{
    Body: LoanParams;
    Reply: SimulationResponse;
  }>('/api/simulate', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'duration'],
        properties: {
          amount: { type: 'number', minimum: 1000, maximum: 75000 },
          duration: { type: 'number', minimum: 6, maximum: 84 },
          downPayment: { type: 'number', minimum: 0 },
          income: { type: 'number', minimum: 0 },
          employment: { type: 'string', enum: ['salarie', 'independant', 'autre'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            monthly: { type: 'number' },
            apr: { type: 'number' },
            totalCost: { type: 'number' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  monthly: { type: 'number' },
                  apr: { type: 'number' },
                  withInsurance: { type: 'boolean' },
                  totalCost: { type: 'number' },
                  description: { type: 'string' },
                },
              },
            },
            legalNote: { type: 'string' },
            calculationDate: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Validation des paramètres
      const params = validateLoanParams(request.body);
      
      // Vérification des critères métier
      const validation = validateLoanCriteria(params.amount, params.duration, params.income);
      
      if (!validation.isValid) {
        return reply.code(400).send({
          options: [],
          monthly: 0,
          apr: 0,
          totalCost: 0,
          legalNote: validation.errors.join('. '),
          calculationDate: new Date().toISOString(),
        });
      }
      
      // Génération des offres
      const offers = generateStandardOffers(
        params.amount,
        params.duration,
        params.income,
        params.employment
      );
      
      // Construction de la réponse
      const response: SimulationResponse = {
        monthly: offers.standard.monthly,
        apr: offers.standard.apr,
        totalCost: offers.standard.totalCost!,
        options: [offers.standard, offers.insured],
        legalNote: LOAN_CONSTANTS.LEGAL_NOTICE,
        calculationDate: new Date().toISOString(),
      };
      
      // Audit (avec gestion d'erreur silencieuse)
      try {
        const sessionId = request.headers['x-session-id'] as string || 'anonymous';
        const userAgent = request.headers['user-agent'];
        const ipAddress = request.ip;
        
        await logSimulationRequest(
          sessionId,
          params,
          response,
          userAgent,
          ipAddress
        );
      } catch (auditError) {
        // Log d'erreur mais ne pas faire échouer la requête
        fastify.log.warn({ error: auditError }, 'Erreur audit simulation');
      }
      
      // Ajout de warnings si présents
      if (validation.warnings.length > 0) {
        (response as any).warnings = validation.warnings;
      }
      
      return response;
      
    } catch (error) {
      fastify.log.error({ error }, 'Erreur simulation');
      
      if (error instanceof Error && error.message.includes('Paramètres')) {
        return reply.code(400).send({
          options: [],
          monthly: 0,
          apr: 0,
          totalCost: 0,
          legalNote: error.message,
          calculationDate: new Date().toISOString(),
        });
      }
      
      return reply.code(500).send({
        options: [],
        monthly: 0,
        apr: 0,
        totalCost: 0,
        legalNote: 'Impossible de calculer la simulation',
        calculationDate: new Date().toISOString(),
      });
    }
  });
  
  // Route de test pour vérifier le service
  fastify.get('/api/simulate/test', {
    schema: {
      description: 'Test de la simulation avec paramètres par défaut',
      tags: ['simulation', 'test'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            testResult: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const testParams: LoanParams = {
        amount: 15000,
        duration: 48,
        income: 2500,
        employment: 'salarie',
      };
      
      const offers = generateStandardOffers(
        testParams.amount,
        testParams.duration,
        testParams.income,
        testParams.employment
      );
      
      return {
        status: 'success',
        testResult: {
          params: testParams,
          offers: [offers.standard, offers.insured],
          message: 'Simulation test réussie',
        },
      };
    } catch (error) {
      fastify.log.error({ error }, 'Erreur test simulation');
      return reply.code(500).send({
        status: 'error',
        message: 'Test simulation échoué',
      });
    }
  });
};

export default simulateRoute;