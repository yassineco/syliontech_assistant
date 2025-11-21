import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RequestContext } from '../types/multitenant.js';
import { multiTenantService } from '../services/multitenant.js';
import { TenantError, ApiKeyError, QuotaExceededError } from '../types/multitenant.js';

// ===========================================
// MIDDLEWARE MULTI-TENANT
// ===========================================

/**
 * Interface pour les requêtes authentifiées
 */
export interface AuthenticatedRequest extends FastifyRequest {
  tenantContext?: RequestContext;
}

/**
 * Middleware d'authentification et de validation tenant
 */
export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extraction de l'API Key depuis les headers
    const apiKey = request.headers['x-api-key'] as string || 
                   request.headers['authorization'] as string;

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API Key requise. Utilisez le header x-api-key ou Authorization.',
        },
      });
    }

    // Validation de l'API Key et récupération du contexte
    const context = await multiTenantService.validateApiKey(apiKey);
    
    // Ajout du contexte à la requête
    request.tenantContext = context;

    // Log de l'accès (pour audit)
    console.log(`API access: tenant=${context.tenant.id}, key=${context.apiKey.name}`);

  } catch (error) {
    return handleAuthError(error, reply);
  }
}

/**
 * Middleware de vérification des quotas
 */
export function quotaMiddleware(resource: string, amount: number = 1) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    try {
      if (!request.tenantContext) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentification requise',
          },
        });
      }

      // Vérification des quotas
      await multiTenantService.checkQuotas(
        request.tenantContext.tenant.id,
        resource,
        amount
      );

      // Incrémentation immédiate de l'usage
      await multiTenantService.incrementUsage(
        request.tenantContext.tenant.id,
        resource,
        amount
      );

    } catch (error) {
      return handleQuotaError(error, reply);
    }
  };
}

/**
 * Middleware de vérification des permissions
 */
export function permissionMiddleware(requiredPermission: string) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    if (!request.tenantContext) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise',
        },
      });
    }

    const { apiKey } = request.tenantContext;

    // Vérification de la permission
    if (!apiKey.permissions.includes(requiredPermission as any)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${requiredPermission}' requise`,
          details: {
            required: requiredPermission,
            available: apiKey.permissions,
          },
        },
      });
    }
  };
}

/**
 * Middleware de limitation de taux (Rate Limiting)
 */
export async function rateLimitMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.tenantContext) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentification requise',
      },
    });
  }

  const { apiKey } = request.tenantContext;
  const rateLimitKey = `rate_limit:${apiKey.id}`;

  // TODO: Implémenter avec Redis/Memorystore
  // Pour le moment, on accepte toutes les requêtes
  const isRateLimited = false;

  if (isRateLimited) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        details: {
          limit: apiKey.rateLimit.requestsPerMinute,
          window: '1 minute',
        },
      },
    });
  }
}

/**
 * Middleware de validation CORS par tenant
 */
export async function corsMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const origin = request.headers.origin;
  
  if (!origin) {
    return; // Pas d'origine, on autorise
  }

  if (!request.tenantContext) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentification requise',
      },
    });
  }

  const { tenant } = request.tenantContext;
  const allowedDomains = tenant.settings.allowedDomains;

  // Si aucun domaine configuré, on autorise tous
  if (allowedDomains.length === 0) {
    reply.header('Access-Control-Allow-Origin', '*');
    return;
  }

  // Vérification si le domaine est autorisé
  const isAllowed = allowedDomains.some((domain: string) => {
    if (domain === '*') return true;
    if (domain.startsWith('*.')) {
      const wildcard = domain.slice(2);
      return origin.endsWith(wildcard);
    }
    return origin === domain;
  });

  if (isAllowed) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
  } else {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'CORS_NOT_ALLOWED',
        message: 'Domaine non autorisé',
        details: {
          origin,
          allowedDomains,
        },
      },
    });
  }
}

// ===========================================
// UTILITAIRES DE GESTION D'ERREURS
// ===========================================

function handleAuthError(error: any, reply: FastifyReply) {
  console.error('Auth error:', error);

  if (error instanceof ApiKeyError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof TenantError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Erreur inconnue
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur',
    },
  });
}

function handleQuotaError(error: any, reply: FastifyReply) {
  console.error('Quota error:', error);

  if (error instanceof QuotaExceededError) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: error.message,
        details: {
          resource: error.resource,
          limit: error.limit,
          current: error.current,
        },
      },
    });
  }

  // Erreur inconnue
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erreur lors de la vérification des quotas',
    },
  });
}

/**
 * Middleware combiné pour les routes protégées
 */
export function protectedRoute(
  permissions: string[] = ['chat'],
  quotaResource?: string,
  quotaAmount?: number
) {
  return {
    preHandler: [
      authMiddleware,
      corsMiddleware,
      rateLimitMiddleware,
      ...permissions.map(perm => permissionMiddleware(perm)),
      ...(quotaResource ? [quotaMiddleware(quotaResource, quotaAmount)] : []),
    ],
  };
}