import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: any;
let db: Firestore | null = null;

try {
  // Vérifier si une app Firebase existe déjà
  if (getApps().length === 0) {
    // Charger la clé de service avec chemin absolu
    const keyPath = path.join(__dirname, 'firebase-admin-key.json');
    console.log('🔍 Tentative de chargement Firebase depuis:', keyPath);
    
    // Lecture synchrone pour ES modules
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('✅ Clé Firebase chargée, projet:', serviceAccount.project_id);
    
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
  db = app ? getFirestore(app) : null;
  
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
  console.error('❌ Erreur lors de l\'initialisation Firebase:', errorMessage);
  console.log('📝 Mode fallback - utilisation des mocks');
  
  // Mode fallback sans Firebase
  db = null;
}

export { db };
export default db;