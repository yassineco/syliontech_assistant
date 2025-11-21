import { 
  initializeApp, 
  getApps, 
  FirebaseApp 
} from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { 
  getAuth, 
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import type { 
  Tenant, 
  ApiKey, 
  UsageDaily,
  TenantFormData,
  TenantWithMetrics,
  DashboardStats
} from '@/types/admin';

// ===========================================
// CONFIGURATION FIREBASE
// ===========================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialisation Firebase (singleton)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

export function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  db = getFirestore(app);
  auth = getAuth(app);
  
  return { app, db, auth };
}

// ===========================================
// SERVICE TENANTS
// ===========================================

export class TenantsService {
  private db: Firestore;

  constructor() {
    const { db: firestore } = initializeFirebase();
    this.db = firestore;
  }

  /**
   * Récupérer tous les tenants
   */
  async getAllTenants(): Promise<TenantWithMetrics[]> {
    try {
      const tenantsQuery = query(
        collection(this.db, 'tenants'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(tenantsQuery);
      const tenants: TenantWithMetrics[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data() as Tenant;
        const metrics = await this.getTenantMetrics(data.id);
        
        tenants.push({
          ...data,
          ...metrics
        });
      }
      
      return tenants;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw new Error('Impossible de charger les tenants');
    }
  }

  /**
   * Récupérer un tenant par ID
   */
  async getTenant(tenantId: string): Promise<TenantWithMetrics | null> {
    try {
      const docRef = doc(this.db, 'tenants', tenantId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const tenant = docSnap.data() as Tenant;
      const metrics = await this.getTenantMetrics(tenantId);
      
      return {
        ...tenant,
        ...metrics
      };
    } catch (error) {
      console.error('Error fetching tenant:', error);
      throw new Error('Impossible de charger le tenant');
    }
  }

  /**
   * Créer un nouveau tenant
   */
  async createTenant(data: TenantFormData): Promise<string> {
    try {
      // Générer un ID unique basé sur le nom
      const tenantId = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const now = Timestamp.now();
      
      const tenant: Tenant = {
        id: tenantId,
        name: data.name,
        status: data.status,
        defaultLang: data.defaultLang,
        ragNamespace: data.ragNamespace,
        createdAt: now,
        updatedAt: now,
      };
      
      await setDoc(doc(this.db, 'tenants', tenantId), tenant);
      
      return tenantId;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw new Error('Impossible de créer le tenant');
    }
  }

  /**
   * Mettre à jour un tenant
   */
  async updateTenant(tenantId: string, data: Partial<TenantFormData>): Promise<void> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };
      
      await updateDoc(doc(this.db, 'tenants', tenantId), updateData);
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw new Error('Impossible de mettre à jour le tenant');
    }
  }

  /**
   * Récupérer les métriques d'un tenant
   */
  private async getTenantMetrics(tenantId: string): Promise<{
    totalRequests: number;
    requestsLast24h: number;
    lastRequestAt: Date | null;
    apiKeysCount: number;
  }> {
    try {
      // Compter les API keys
      const apiKeysQuery = query(
        collection(this.db, 'apiKeys'),
        where('tenantId', '==', tenantId),
        where('status', '==', 'active')
      );
      const apiKeysSnap = await getDocs(apiKeysQuery);
      const apiKeysCount = apiKeysSnap.size;

      // Récupérer les statistiques d'usage
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const usageQuery = query(
        collection(this.db, 'usage_daily'),
        where('tenantId', '==', tenantId)
      );
      const usageSnap = await getDocs(usageQuery);
      
      let totalRequests = 0;
      let requestsLast24h = 0;
      let lastRequestAt: Date | null = null;

      usageSnap.docs.forEach(doc => {
        const usage = doc.data() as UsageDaily;
        totalRequests += usage.requests;
        
        if (usage.date >= yesterdayStr) {
          requestsLast24h += usage.requests;
        }
        
        if (usage.lastUpdatedAt) {
          const requestDate = usage.lastUpdatedAt.toDate();
          if (!lastRequestAt || requestDate > lastRequestAt) {
            lastRequestAt = requestDate;
          }
        }
      });

      return {
        totalRequests,
        requestsLast24h,
        lastRequestAt,
        apiKeysCount,
      };
    } catch (error) {
      console.error('Error fetching tenant metrics:', error);
      return {
        totalRequests: 0,
        requestsLast24h: 0,
        lastRequestAt: null,
        apiKeysCount: 0,
      };
    }
  }
}

// ===========================================
// SERVICE API KEYS
// ===========================================

export class ApiKeysService {
  private db: Firestore;

  constructor() {
    const { db: firestore } = initializeFirebase();
    this.db = firestore;
  }

  /**
   * Récupérer les API keys d'un tenant
   */
  async getApiKeys(tenantId: string): Promise<ApiKey[]> {
    try {
      const apiKeysQuery = query(
        collection(this.db, 'apiKeys'),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(apiKeysQuery);
      return snapshot.docs.map(doc => doc.data() as ApiKey);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      throw new Error('Impossible de charger les clés API');
    }
  }

  /**
   * Générer une nouvelle API key
   */
  async generateApiKey(tenantId: string): Promise<{ keyId: string; fullKey: string; prefix: string }> {
    try {
      // Générer la clé
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      const fullKey = `ak_live_${timestamp}_${random}`;
      const prefix = fullKey.substring(0, 12);
      
      // Hash de la clé (simulation, en prod utiliser crypto.createHash)
      const hashedKey = Buffer.from(fullKey).toString('base64');
      
      const apiKey: Omit<ApiKey, 'id'> = {
        tenantId,
        hashedKey,
        prefix,
        status: 'active',
        createdAt: Timestamp.now(),
        lastUsedAt: null,
      };
      
      const docRef = await addDoc(collection(this.db, 'apiKeys'), apiKey);
      
      return {
        keyId: docRef.id,
        fullKey,
        prefix,
      };
    } catch (error) {
      console.error('Error generating API key:', error);
      throw new Error('Impossible de générer la clé API');
    }
  }

  /**
   * Révoquer une API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'apiKeys', keyId), {
        status: 'revoked',
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw new Error('Impossible de révoquer la clé API');
    }
  }
}

// ===========================================
// SERVICE DASHBOARD
// ===========================================

export class DashboardService {
  private db: Firestore;

  constructor() {
    const { db: firestore } = initializeFirebase();
    this.db = firestore;
  }

  /**
   * Récupérer les statistiques globales
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Compter les tenants
      const tenantsSnap = await getDocs(collection(this.db, 'tenants'));
      const totalTenants = tenantsSnap.size;
      const activeTenants = tenantsSnap.docs.filter(
        doc => (doc.data() as Tenant).status === 'active'
      ).length;

      // Récupérer les statistiques d'usage
      const usageSnap = await getDocs(collection(this.db, 'usage_daily'));
      let totalRequests = 0;
      let requestsLast24h = 0;
      const tenantRequestsMap = new Map<string, number>();
      const requestsByDay = new Map<string, number>();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      usageSnap.docs.forEach(doc => {
        const usage = doc.data() as UsageDaily;
        totalRequests += usage.requests;
        
        if (usage.date >= yesterdayStr) {
          requestsLast24h += usage.requests;
        }

        // Agréger par tenant pour le top
        const current = tenantRequestsMap.get(usage.tenantId) || 0;
        tenantRequestsMap.set(usage.tenantId, current + usage.requests);

        // Agréger par jour
        const dayRequests = requestsByDay.get(usage.date) || 0;
        requestsByDay.set(usage.date, dayRequests + usage.requests);
      });

      // Top 5 tenants
      const topTenantEntries = Array.from(tenantRequestsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const topTenants = await Promise.all(
        topTenantEntries.map(async ([tenantId, requests]) => {
          const tenantDoc = await getDoc(doc(this.db, 'tenants', tenantId));
          const tenantName = tenantDoc.exists() 
            ? (tenantDoc.data() as Tenant).name 
            : tenantId;
          
          return {
            tenantId,
            tenantName,
            requests,
          };
        })
      );

      // Requests par jour (7 derniers jours)
      const requestsByDayArray = Array.from(requestsByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([date, requests]) => ({ date, requests }));

      return {
        totalTenants,
        activeTenants,
        totalRequests,
        requestsLast24h,
        topTenants,
        requestsByDay: requestsByDayArray,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Impossible de charger les statistiques');
    }
  }
}

// ===========================================
// SERVICE AUTH
// ===========================================

export class AuthService {
  private auth: Auth;

  constructor() {
    const { auth } = initializeFirebase();
    this.auth = auth;
  }

  /**
   * Connexion administrateur
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw new Error('Identifiants incorrects');
    }
  }

  /**
   * Déconnexion
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  }

  /**
   * Écouter les changements d'authentification
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }
}

// ===========================================
// EXPORT DES SERVICES
// ===========================================

export const tenantsService = new TenantsService();
export const apiKeysService = new ApiKeysService();
export const dashboardService = new DashboardService();
export const authService = new AuthService();