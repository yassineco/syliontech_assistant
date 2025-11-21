import { z } from 'zod';

// ===========================================
// TYPES MULTI-TENANT SILYONTECH ASSISTANT
// ===========================================

// Tenant Schema
export const TenantSchema = z.object({
  id: z.string().min(1, 'Tenant ID requis'),
  name: z.string().min(1, 'Nom du tenant requis'),
  domain: z.string().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
  status: z.enum(['active', 'suspended', 'inactive']).default('active'),
  settings: z.object({
    maxConversationsPerMonth: z.number().default(100),
    maxDocuments: z.number().default(10),
    maxApiCalls: z.number().default(1000),
    enableVoice: z.boolean().default(true),
    enableRAG: z.boolean().default(true),
    allowedDomains: z.array(z.string()).default([]),
  }),
  branding: z.object({
    primaryColor: z.string().default('#10b981'),
    logo: z.string().optional(),
    customCSS: z.string().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

// API Key Schema  
export const ApiKeySchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1, 'Nom de la clé requis'),
  key: z.string().min(32, 'Clé trop courte'),
  keyHash: z.string().min(1), // Hash de la clé pour sécurité
  permissions: z.array(z.enum(['chat', 'rag', 'events', 'admin'])).default(['chat']),
  rateLimit: z.object({
    requestsPerMinute: z.number().default(60),
    requestsPerDay: z.number().default(1000),
  }),
  isActive: z.boolean().default(true),
  lastUsed: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// Conversation Schema (Multi-tenant)
export const ConversationSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    referrer: z.string().optional(),
    utm: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
    }).optional(),
  }).optional(),
  messages: z.array(z.object({
    id: z.string(),
    type: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.object({
      intent: z.string().optional(),
      confidence: z.number().optional(),
      citations: z.array(z.string()).optional(),
    }).optional(),
  })),
  status: z.enum(['active', 'closed', 'archived']).default('active'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// RAG Document Schema (Multi-tenant)
export const RagDocumentSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1),
  namespace: z.string().default('default'),
  type: z.enum(['pdf', 'url', 'text', 'sitemap']),
  source: z.string().min(1), // URL ou path du fichier
  content: z.string().optional(),
  chunks: z.array(z.object({
    id: z.string(),
    content: z.string(),
    embedding: z.array(z.number()).optional(),
    metadata: z.object({
      page: z.number().optional(),
      section: z.string().optional(),
      url: z.string().optional(),
    }).optional(),
  })),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'error']).default('pending'),
  stats: z.object({
    totalChunks: z.number().default(0),
    totalTokens: z.number().default(0),
    avgChunkSize: z.number().default(0),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RagDocument = z.infer<typeof RagDocumentSchema>;

// Event Schema (Analytics)
export const EventSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  type: z.enum(['page_view', 'widget_open', 'message_sent', 'conversation_start', 'lead_created']),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  properties: z.record(z.any()).optional(),
  timestamp: z.date(),
});

export type Event = z.infer<typeof EventSchema>;

// Usage Stats Schema
export const UsageStatsSchema = z.object({
  tenantId: z.string().min(1),
  period: z.string(), // YYYY-MM format
  stats: z.object({
    conversations: z.number().default(0),
    messages: z.number().default(0),
    apiCalls: z.number().default(0),
    ragQueries: z.number().default(0),
    storageUsed: z.number().default(0), // en bytes
  }),
  limits: z.object({
    maxConversations: z.number(),
    maxApiCalls: z.number(),
    maxStorage: z.number(),
  }),
  updatedAt: z.date(),
});

export type UsageStats = z.infer<typeof UsageStatsSchema>;

// Request Context (pour middleware)
export interface RequestContext {
  tenant: Tenant;
  apiKey: ApiKey;
  usage: UsageStats;
}

// API Response Types
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.date(),
    requestId: z.string(),
    tenantId: z.string(),
  }).optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    tenantId: string;
  };
};

// Configuration Types
export interface MultiTenantConfig {
  defaultTenant: string;
  enableQuotas: boolean;
  enableRateLimit: boolean;
  enableAudit: boolean;
  cacheTTL: number;
}

// Error Types
export class TenantError extends Error {
  constructor(
    message: string,
    public code: string = 'TENANT_ERROR',
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

export class ApiKeyError extends Error {
  constructor(
    message: string,
    public code: string = 'API_KEY_ERROR',
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public resource: string,
    public limit: number,
    public current: number
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}