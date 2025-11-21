import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// ===========================================
// TYPES FIRESTORE - ADMIN CONSOLE MVP
// ===========================================

/**
 * Collection `tenants` - Modèle de données tenant
 */
export const TenantSchema = z.object({
  id: z.string().min(1), // "syliontech-demo"
  name: z.string().min(1), // "SylionTech Demo"
  status: z.enum(['active', 'inactive']),
  defaultLang: z.string().min(2), // "fr"
  ragNamespace: z.string().min(1), // "syliontech"
  createdAt: z.any(), // Timestamp Firestore
  updatedAt: z.any(), // Timestamp Firestore
});

export type Tenant = z.infer<typeof TenantSchema>;

/**
 * Collection `apiKeys` - Modèle de données API keys
 */
export const ApiKeySchema = z.object({
  id: z.string().min(1), // doc id interne
  tenantId: z.string().min(1),
  hashedKey: z.string().min(1), // valeur hashée, pas la clé en clair
  prefix: z.string().min(1), // ex: "ak_live_abcd"
  status: z.enum(['active', 'revoked']),
  createdAt: z.any(), // Timestamp Firestore
  lastUsedAt: z.any().nullable().optional(), // Timestamp Firestore ou null
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * Collection `usage_daily` - Métriques d'usage quotidiennes
 */
export const UsageDailySchema = z.object({
  id: z.string().min(1), // `${tenantId}_${date}`
  tenantId: z.string().min(1),
  date: z.string().min(1), // "2025-11-21"
  requests: z.number().min(0),
  lastUpdatedAt: z.any(), // Timestamp Firestore
});

export type UsageDaily = z.infer<typeof UsageDailySchema>;

// ===========================================
// TYPES UI - FORMULAIRES ET AFFICHAGE
// ===========================================

/**
 * Formulaire de création/édition tenant
 */
export const TenantFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  defaultLang: z.string().min(2, 'La langue doit faire au moins 2 caractères'),
  ragNamespace: z.string().min(1, 'Le namespace RAG est requis'),
  status: z.enum(['active', 'inactive']),
});

export type TenantFormData = z.infer<typeof TenantFormSchema>;

/**
 * Tenant avec métadonnées enrichies pour l'UI
 */
export type TenantWithMetrics = Tenant & {
  totalRequests?: number;
  requestsLast24h?: number;
  lastRequestAt?: Date | null;
  apiKeysCount?: number;
};

/**
 * Statistiques globales dashboard
 */
export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalRequests: number;
  requestsLast24h: number;
  topTenants: Array<{
    tenantId: string;
    tenantName: string;
    requests: number;
  }>;
  requestsByDay: Array<{
    date: string;
    requests: number;
  }>;
}

/**
 * Configuration Firebase pour l'admin
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

/**
 * Réponse API pour la génération d'API key
 */
export interface GenerateApiKeyResponse {
  keyId: string;
  prefix: string;
  fullKey: string; // Montré une seule fois
  tenantId: string;
}

/**
 * Filtre pour la liste des tenants
 */
export interface TenantsFilter {
  status?: 'all' | 'active' | 'inactive';
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'requests';
  sortOrder?: 'asc' | 'desc';
}