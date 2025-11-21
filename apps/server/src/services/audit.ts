import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { AuditLog } from '../types/schemas.js';
import { env } from '../config/env.js';

// ==========================================
// SERVICE D'AUDIT FIRESTORE
// ==========================================

let isInitialized = false;
let firestoreDb: FirebaseFirestore.Firestore | null = null;

/**
 * Initialise Firebase Admin SDK si les clés sont disponibles
 */
function initializeFirestore(): void {
  if (isInitialized) return;

  try {
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
      console.warn('⚠️ Clés Firebase manquantes - Audit non disponible');
      return;
    }

    // Configuration du service account
    const serviceAccount: ServiceAccount = {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    // Initialisation de Firebase Admin
    initializeApp({
      credential: cert(serviceAccount),
      projectId: env.FIREBASE_PROJECT_ID,
    });

    firestoreDb = getFirestore();
    isInitialized = true;

    console.log('✅ Firebase Firestore initialisé pour audit');
  } catch (error) {
    console.error('❌ Erreur initialisation Firestore:', error);
    firestoreDb = null;
  }
}

/**
 * Enregistre un événement d'audit dans Firestore
 */
export async function logSession(
  sessionId: string,
  event: AuditLog['event'],
  payload: Record<string, any>,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  // Initialisation différée
  if (!isInitialized) {
    initializeFirestore();
  }

  // Si Firestore n'est pas disponible, log en console seulement
  if (!firestoreDb) {
    console.log('📊 AUDIT (console):', {
      sessionId,
      event,
      timestamp: new Date().toISOString(),
      payload,
    });
    return;
  }

  try {
    const auditLog: AuditLog = {
      sessionId,
      event,
      timestamp: new Date().toISOString(),
      payload,
      userAgent,
      ipAddress,
    };

    // Enregistrement dans Firestore
    await firestoreDb
      .collection('audit_logs')
      .doc()
      .set(auditLog);

    // Log de session séparé pour analytics
    await firestoreDb
      .collection('sessions')
      .doc(sessionId)
      .set(
        {
          lastActivity: new Date().toISOString(),
          lastEvent: event,
          messageCount: FieldValue.increment(1),
        },
        { merge: true }
      );

    console.log(`📊 AUDIT: ${event} pour session ${sessionId}`);
  } catch (error) {
    console.error('❌ Erreur audit Firestore:', error);
    
    // Fallback: log en console
    console.log('📊 AUDIT (fallback):', {
      sessionId,
      event,
      payload,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Enregistre un message utilisateur
 */
export async function logUserMessage(
  sessionId: string,
  message: string,
  slots?: Record<string, any>,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  await logSession(
    sessionId,
    'user_message',
    { message, slots },
    userAgent,
    ipAddress
  );
}

/**
 * Enregistre une réponse de l'assistant
 */
export async function logAssistantReply(
  sessionId: string,
  reply: string,
  intent: string,
  offers?: any[],
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  await logSession(
    sessionId,
    'assistant_reply',
    { reply, intent, offers },
    userAgent,
    ipAddress
  );
}

/**
 * Enregistre une demande de simulation
 */
export async function logSimulationRequest(
  sessionId: string,
  params: Record<string, any>,
  result: Record<string, any>,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  await logSession(
    sessionId,
    'simulation_request',
    { params, result },
    userAgent,
    ipAddress
  );
}

/**
 * Enregistre la présentation d'offres
 */
export async function logOfferPresented(
  sessionId: string,
  offers: any[],
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  await logSession(
    sessionId,
    'offer_presented',
    { offers, offerCount: offers.length },
    userAgent,
    ipAddress
  );
}

/**
 * Démarre le tracking d'une nouvelle session
 */
export async function logSessionStart(
  sessionId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  await logSession(
    sessionId,
    'session_start',
    { startedAt: new Date().toISOString() },
    userAgent,
    ipAddress
  );
}

/**
 * Récupère les stats d'une session (si disponible)
 */
export async function getSessionStats(sessionId: string): Promise<any> {
  if (!firestoreDb) {
    return null;
  }

  try {
    const sessionDoc = await firestoreDb
      .collection('sessions')
      .doc(sessionId)
      .get();

    return sessionDoc.exists ? sessionDoc.data() : null;
  } catch (error) {
    console.error('❌ Erreur récupération stats session:', error);
    return null;
  }
}

/**
 * Nettoie les logs anciens (optionnel - pour éviter l'accumulation)
 */
export async function cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
  if (!firestoreDb) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldLogs = await firestoreDb
      .collection('audit_logs')
      .where('timestamp', '<', cutoffDate.toISOString())
      .limit(100) // Traitement par batch
      .get();

    const batch = firestoreDb.batch();
    oldLogs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`🧹 ${oldLogs.size} anciens logs supprimés`);
  } catch (error) {
    console.error('❌ Erreur nettoyage logs:', error);
  }
}

/**
 * Vérifie si Firestore est disponible
 */
export function isFirestoreAvailable(): boolean {
  return firestoreDb !== null;
}