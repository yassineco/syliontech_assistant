import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuration Firebase pour l'Admin Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialisation Firebase (éviter les doublons)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Services Firebase
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const firebaseApp: FirebaseApp = app;

// Types pour TypeScript
export type { 
  DocumentReference,
  DocumentData,
  QuerySnapshot,
  CollectionReference 
} from 'firebase/firestore';

export type { User } from 'firebase/auth';

// Helpers pour multi-tenant
export const getTenantCollection = (tenantId: string, collectionName: string) => {
  return `tenants/${tenantId}/${collectionName}`;
};

export const getTenantDocumentRef = (tenantId: string) => {
  return `tenants/${tenantId}`;
};