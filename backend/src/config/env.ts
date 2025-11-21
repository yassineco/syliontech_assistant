import { z } from 'zod';
import pino from 'pino';

// Schema de validation pour les variables d'environnement
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  PROJECT_ID: z.string().min(1, 'PROJECT_ID is required'),
  REGION: z.string().default('us-central1'),
  VERTEX_LOCATION: z.string().default('us-central1'),
  GENAI_MODEL: z.string().default('gemini-2.5-flash'),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  BUCKET_NAME: z.string().min(1, 'BUCKET_NAME is required'),
  FIRESTORE_DATABASE_ID: z.string().default('(default)'),
  HMAC_SECRET: z.string().min(32, 'HMAC_SECRET must be at least 32 characters'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Validation et parsing des variables d'environnement
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

// Configuration exportée
export const config = validateEnv();

// Validation au startup
if (config.NODE_ENV === 'production') {
  // Validations supplémentaires pour la production
  if (!config.PROJECT_ID.includes('magic-button')) {
    console.warn('⚠️  PROJECT_ID should contain "magic-button" for this project');
  }
  
  if (config.HMAC_SECRET.length < 64) {
    console.warn('⚠️  Consider using a longer HMAC_SECRET for production');
  }
}

// Export des types
export type Config = z.infer<typeof envSchema>;