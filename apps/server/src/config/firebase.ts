import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

let app;
let db;

try {
  // Vérifier si une app Firebase existe déjà
  if (getApps().length === 0) {
    // Charger la clé de service
    const serviceAccount = require('./firebase-admin-key.json');
    
    // Initialiser Firebase Admin
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: 'syliontech-assistant'
    });
    
    console.log('✅ Firebase Admin initialisé avec succès');
  } else {
    app = getApps()[0];
    console.log('✅ Firebase Admin déjà initialisé');
  }

  // Obtenir la référence Firestore
  db = getFirestore(app);
  
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
  console.error('❌ Erreur lors de l\'initialisation Firebase:', errorMessage);
  console.log('📝 Mode fallback - utilisation des mocks');
  
  // Mode fallback sans Firebase
  db = null;
}

export { db };
export default db;