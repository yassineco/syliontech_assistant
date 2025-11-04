import crypto from 'crypto';
import type { 
  Tenant, 
  ApiKey, 
  RequestContext, 
  UsageStats
} from '../types/multitenant.js';
import {
  TenantError,
  ApiKeyError,
  QuotaExceededError 
} from '../types/multitenant.js';

// ===========================================
// SERVICE MULTI-TENANT CORE
// ===========================================

/**
 * Service principal pour la gestion multi-tenant
 */
export class MultiTenantService {
  private tenantCache = new Map<string, Tenant>();
  private apiKeyCache = new Map<string, ApiKey>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Valide et récupère un tenant par son API Key
   */
  async validateApiKey(apiKey: string): Promise<RequestContext> {
    // Extraction de l'API key depuis le header
    const cleanKey = this.extractApiKey(apiKey);
    
    // Recherche de la clé API
    const keyData = await this.findApiKey(cleanKey);
    if (!keyData) {
      throw new ApiKeyError('API Key invalide', 'INVALID_API_KEY', 401);
    }

    // Vérification de l'état de la clé
    if (!keyData.isActive) {
      throw new ApiKeyError('API Key désactivée', 'DISABLED_API_KEY', 401);
    }

    // Vérification de l'expiration
    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      throw new ApiKeyError('API Key expirée', 'EXPIRED_API_KEY', 401);
    }

    // Récupération du tenant
    const tenant = await this.findTenant(keyData.tenantId);
    if (!tenant) {
      throw new TenantError('Tenant introuvable', 'TENANT_NOT_FOUND', 404);
    }

    // Vérification de l'état du tenant
    if (tenant.status !== 'active') {
      throw new TenantError(`Tenant ${tenant.status}`, 'TENANT_INACTIVE', 403);
    }

    // Récupération des statistiques d'usage
    const usage = await this.getUsageStats(tenant.id);

    // Mise à jour de la dernière utilisation
    await this.updateApiKeyLastUsed(keyData.id);

    return {
      tenant,
      apiKey: keyData,
      usage
    };
  }

  /**
   * Génère une nouvelle API Key pour un tenant
   */
  async generateApiKey(
    tenantId: string, 
    name: string,
    permissions: string[] = ['chat'],
    rateLimit?: { requestsPerMinute?: number; requestsPerDay?: number }
  ): Promise<ApiKey> {
    const tenant = await this.findTenant(tenantId);
    if (!tenant) {
      throw new TenantError('Tenant introuvable', 'TENANT_NOT_FOUND', 404);
    }

    // Génération de la clé API sécurisée
    const apiKey = this.generateSecureKey();
    const keyHash = this.hashApiKey(apiKey);

    const apiKeyData: ApiKey = {
      id: crypto.randomUUID(),
      tenantId,
      name,
      key: apiKey,
      keyHash,
      permissions: permissions as any,
      rateLimit: {
        requestsPerMinute: rateLimit?.requestsPerMinute || 60,
        requestsPerDay: rateLimit?.requestsPerDay || 1000,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Sauvegarde en base (Firestore)
    await this.saveApiKey(apiKeyData);
    
    return apiKeyData;
  }

  /**
   * Crée un nouveau tenant
   */
  async createTenant(
    name: string,
    domain?: string,
    plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free'
  ): Promise<Tenant> {
    const tenantId = this.generateTenantId(name);

    const tenant: Tenant = {
      id: tenantId,
      name,
      domain,
      plan,
      status: 'active',
      settings: {
        maxConversationsPerMonth: this.getPlanLimits(plan).conversations,
        maxDocuments: this.getPlanLimits(plan).documents,
        maxApiCalls: this.getPlanLimits(plan).apiCalls,
        enableVoice: true,
        enableRAG: plan !== 'free',
        allowedDomains: domain ? [domain] : [],
      },
      branding: {
        primaryColor: '#10b981',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Sauvegarde en base
    await this.saveTenant(tenant);

    // Génération de la première API Key
    await this.generateApiKey(tenantId, 'Default API Key', ['chat', 'rag', 'events']);

    return tenant;
  }

  /**
   * Vérifie les quotas d'usage pour un tenant
   */
  async checkQuotas(tenantId: string, resource: string, amount: number = 1): Promise<void> {
    const usage = await this.getUsageStats(tenantId);
    const tenant = await this.findTenant(tenantId);
    
    if (!tenant) {
      throw new TenantError('Tenant introuvable', 'TENANT_NOT_FOUND', 404);
    }

    switch (resource) {
      case 'conversations':
        if (usage.stats.conversations + amount > usage.limits.maxConversations) {
          throw new QuotaExceededError(
            'Limite de conversations atteinte',
            resource,
            usage.limits.maxConversations,
            usage.stats.conversations
          );
        }
        break;

      case 'apiCalls':
        if (usage.stats.apiCalls + amount > usage.limits.maxApiCalls) {
          throw new QuotaExceededError(
            'Limite d\'appels API atteinte',
            resource,
            usage.limits.maxApiCalls,
            usage.stats.apiCalls
          );
        }
        break;

      case 'storage':
        if (usage.stats.storageUsed + amount > usage.limits.maxStorage) {
          throw new QuotaExceededError(
            'Limite de stockage atteinte',
            resource,
            usage.limits.maxStorage,
            usage.stats.storageUsed
          );
        }
        break;
    }
  }

  /**
   * Incrémente les statistiques d'usage
   */
  async incrementUsage(
    tenantId: string, 
    resource: string, 
    amount: number = 1
  ): Promise<void> {
    const period = this.getCurrentPeriod();
    
    // Mise à jour atomique des stats en Firestore
    await this.updateUsageStats(tenantId, period, resource, amount);
  }

  // ===========================================
  // MÉTHODES PRIVÉES
  // ===========================================

  private extractApiKey(authHeader: string): string {
    if (!authHeader) {
      throw new ApiKeyError('API Key manquante', 'MISSING_API_KEY', 401);
    }

    // Support pour Bearer token et x-api-key
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    return authHeader;
  }

  private generateSecureKey(): string {
    const prefix = 'sk_';
    const randomBytes = crypto.randomBytes(32);
    return prefix + randomBytes.toString('hex');
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private generateTenantId(name: string): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${sanitized}-${suffix}`;
  }

  private getPlanLimits(plan: string) {
    const limits = {
      free: { conversations: 100, documents: 5, apiCalls: 1000, storage: 50 * 1024 * 1024 },
      starter: { conversations: 500, documents: 20, apiCalls: 5000, storage: 200 * 1024 * 1024 },
      pro: { conversations: 2000, documents: 100, apiCalls: 20000, storage: 1024 * 1024 * 1024 },
      enterprise: { conversations: 10000, documents: 500, apiCalls: 100000, storage: 5 * 1024 * 1024 * 1024 },
    };
    
    return limits[plan as keyof typeof limits] || limits.free;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ===========================================
  // MÉTHODES D'ACCÈS DONNÉES (À implémenter avec Firestore)
  // ===========================================

  private async findTenant(tenantId: string): Promise<Tenant | null> {
    // Cache check
    if (this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }

    // TODO: Implémenter avec Firestore
    // const doc = await firestore.collection('tenants').doc(tenantId).get();
    console.log(`Finding tenant: ${tenantId}`);
    return null;
  }

  private async findApiKey(apiKey: string): Promise<ApiKey | null> {
    const keyHash = this.hashApiKey(apiKey);
    
    // Cache check
    if (this.apiKeyCache.has(keyHash)) {
      return this.apiKeyCache.get(keyHash)!;
    }

    // TODO: Implémenter avec Firestore
    // const query = await firestore.collection('apiKeys').where('keyHash', '==', keyHash).get();
    console.log(`Finding API key: ${keyHash}`);
    return null;
  }

  private async saveTenant(tenant: Tenant): Promise<void> {
    // TODO: Implémenter avec Firestore
    console.log(`Saving tenant: ${tenant.id}`);
    this.tenantCache.set(tenant.id, tenant);
  }

  private async saveApiKey(apiKey: ApiKey): Promise<void> {
    // TODO: Implémenter avec Firestore
    console.log(`Saving API key: ${apiKey.id}`);
    this.apiKeyCache.set(apiKey.keyHash, apiKey);
  }

  private async getUsageStats(tenantId: string): Promise<UsageStats> {
    const period = this.getCurrentPeriod();
    
    // TODO: Implémenter avec Firestore
    console.log(`Getting usage stats for tenant: ${tenantId}, period: ${period}`);
    
    // Retour de stats par défaut pour le moment
    const tenant = await this.findTenant(tenantId);
    const limits = tenant ? this.getPlanLimits(tenant.plan) : this.getPlanLimits('free');
    
    return {
      tenantId,
      period,
      stats: {
        conversations: 0,
        messages: 0,
        apiCalls: 0,
        ragQueries: 0,
        storageUsed: 0,
      },
      limits: {
        maxConversations: limits.conversations,
        maxApiCalls: limits.apiCalls,
        maxStorage: limits.storage,
      },
      updatedAt: new Date(),
    };
  }

  private async updateApiKeyLastUsed(keyId: string): Promise<void> {
    // TODO: Implémenter avec Firestore
    console.log(`Updating last used for API key: ${keyId}`);
  }

  private async updateUsageStats(
    tenantId: string, 
    period: string, 
    resource: string, 
    amount: number
  ): Promise<void> {
    // TODO: Implémenter avec Firestore atomic update
    console.log(`Updating usage stats: ${tenantId}, ${resource}: +${amount}`);
  }
}

// Instance singleton
export const multiTenantService = new MultiTenantService();