import pino from 'pino';
import { config } from './config/env';

// Configuration du logger avec Pino
const loggerConfig: pino.LoggerOptions = {
  level: config.LOG_LEVEL,
  
  // Configuration pour différents environnements
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  
  // Production: JSON structuré pour Cloud Logging
  ...(config.NODE_ENV === 'production' && {
    formatters: {
      level: (label: string) => ({ severity: label.toUpperCase() }),
      log: (object: Record<string, unknown>) => ({
        ...object,
        // Ajouter des métadonnées GCP
        project: config.PROJECT_ID,
        service: 'magic-button-api',
        version: process.env.npm_package_version || '1.0.0',
      }),
    },
  }),

  // Redaction pour éviter de logger des données sensibles
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'headers.authorization',
      'headers.cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },

  // Serializers personnalisés
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.headers?.['content-type'],
      },
    }),
    err: pino.stdSerializers.err,
  },
};

// Création de l'instance logger
export const logger = pino(loggerConfig);

// Helper pour logger les performances
export function createPerformanceLogger(operation: string) {
  const start = process.hrtime.bigint();
  
  return {
    end: (additionalInfo?: Record<string, unknown>) => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      
      logger.info({
        operation,
        duration: `${duration.toFixed(2)}ms`,
        ...additionalInfo,
      }, `${operation} completed`);
    },
    
    error: (error: Error, additionalInfo?: Record<string, unknown>) => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000;
      
      logger.error({
        operation,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
        stack: error.stack,
        ...additionalInfo,
      }, `${operation} failed`);
    },
  };
}

// Helper pour créer un logger enfant avec contexte
export function createContextLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

// Export du logger par défaut
export default logger;