import { z } from 'zod';
import dotenv from 'dotenv';

// Charger les variables d'environnement depuis la racine du projet
dotenv.config({ path: '../../.env' });

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Feature flags
  USE_MOCK: z.coerce.boolean().default(true),
  
  // GCP & Vertex AI
  GCP_PROJECT_ID: z.string().optional(),
  GEMINI_LOCATION: z.string().default('us-central1'),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  EMBED_MODEL: z.string().default('text-embedding-004'),
  
  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Configuration invalide:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  
  // Validation conditionnelle pour le mode LIVE
  if (!result.data.USE_MOCK) {
    const required = ['GCP_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missing = required.filter(key => !result.data[key as keyof Env]);
    
    if (missing.length > 0) {
      console.error(`❌ Mode LIVE nécessite ces variables: ${missing.join(', ')}`);
      console.error('💡 Conseil: activez USE_MOCK=true pour la démo sans clés');
      process.exit(1);
    }
  }
  
  return result.data;
}

export const env = validateEnv();

// Log de la configuration (sans secrets)
console.log('📊 Configuration serveur:', {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  useMock: env.USE_MOCK,
  corsOrigin: env.CORS_ORIGIN,
  logLevel: env.LOG_LEVEL,
  ...(env.USE_MOCK ? {} : { 
    gcpProject: env.GCP_PROJECT_ID,
    geminiLocation: env.GEMINI_LOCATION,
    geminiModel: env.GEMINI_MODEL,
  }),
});