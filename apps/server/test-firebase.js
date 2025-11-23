import { db } from './src/config/firebase.ts';

console.log('🔥 Test Firebase direct:', {
  connected: !!db,
  type: typeof db
});

if (db) {
  console.log('✅ Firebase initialisé');
} else {
  console.log('❌ Firebase non initialisé');
}