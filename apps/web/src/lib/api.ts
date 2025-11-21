// Types pour l'API Sofinco Assistant
export interface SimulationRequest {
  amount: number;
  duration: number;
  project: string;
  downPayment?: number;
  income?: number;
  employment?: 'salarie' | 'independant' | 'autre';
}

export interface LoanParams {
  amount: number;
  duration: number;
  downPayment?: number;
  income?: number;
  employment?: 'salarie' | 'independant' | 'autre';
}

export interface Offer {
  label: string;
  monthly: number;
  apr: number;
  withInsurance?: boolean;
  totalCost?: number;
  description?: string;
  recommended?: boolean;
}

export interface SimulationResponse {
  monthly: number;
  apr: number;
  totalCost: number;
  offers: Offer[];
  legalNote: string;
  calculationDate: string;
  warnings?: string[];
}

export interface AssistantRequest {
  sessionId: string;
  message: string;
  context?: Record<string, any>;
  slots?: Partial<LoanParams>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp?: string;
  }>;
}

export interface AssistantReply {
  intent: string;
  slots: Partial<LoanParams>;
  reply: string;
  offers?: Offer[];
  nextAction?: string;
  confidence?: number;
}

export interface SessionInfo {
  status: string;
  sessionId: string;
  mode: string;
  capabilities: {
    voiceEnabled: boolean;
    mockMode: boolean;
    geminiAvailable: boolean;
  };
}

// Configuration de l'API
const API_BASE_URL = '/api';

/**
 * Génère un ID de session unique
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Classe pour gérer les appels à l'API
 */
class ApiClient {
  private sessionId: string;
  
  constructor(sessionId?: string) {
    this.sessionId = sessionId || generateSessionId();
  }

  /**
   * Méthode générique pour les requêtes HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': this.sessionId,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur réseau inconnue');
    }
  }

  /**
   * Met à jour l'ID de session
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Récupère l'ID de session actuel
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Démarre une nouvelle session
   */
  public async startSession(): Promise<SessionInfo> {
    return this.request<SessionInfo>('/session', {
      method: 'POST',
      body: JSON.stringify({ sessionId: this.sessionId }),
    });
  }

  /**
   * Simule un crédit
   */
  public async simulateLoan(params: LoanParams): Promise<SimulationResponse> {
    return this.request<SimulationResponse>('/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Envoie un message à l'assistant
   */
  public async sendMessage(
    message: string,
    context?: Record<string, any>,
    slots?: Partial<LoanParams>,
    conversationHistory?: Array<{role: 'user' | 'assistant', message: string, timestamp?: string}>
  ): Promise<AssistantReply> {
    const payload: AssistantRequest = {
      sessionId: this.sessionId,
      message,
      ...(context && { context }),
      ...(slots && { slots }),
      ...(conversationHistory && { conversationHistory }),
    };

    return this.request<AssistantReply>('/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Vérifie la santé de l'API
   */
  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  /**
   * Récupère les informations de l'API
   */
  public async getApiInfo(): Promise<{ version: string; mode: string; capabilities: string[] }> {
    return this.request<{ version: string; mode: string; capabilities: string[] }>('/');
  }
}

// Instance par défaut du client API
const apiClient = new ApiClient();

// Export des fonctions principales
export const simulateLoan = async (params: SimulationRequest): Promise<SimulationResponse> => {
  return apiClient.simulateLoan({
    amount: params.amount,
    duration: params.duration,
    downPayment: params.downPayment,
    income: params.income,
    employment: params.employment
  });
};

export const sendMessage = async (
  message: string, 
  context?: any,
  slots?: Partial<LoanParams>,
  conversationHistory?: Array<{role: 'user' | 'assistant', message: string, timestamp?: string}>
): Promise<AssistantReply> => {
  return apiClient.sendMessage(message, context, slots, conversationHistory);
};

// API publique pour l'application
export const api = {
  /**
   * Démarre une session
   */
  startSession: (sessionId?: string) => {
    if (sessionId) {
      apiClient.setSessionId(sessionId);
    }
    return apiClient.startSession();
  },

  /**
   * Envoie un message à l'assistant
   */
  sendMessage: (
    message: string, 
    context?: Record<string, any>, 
    slots?: Partial<LoanParams>,
    conversationHistory?: Array<{role: 'user' | 'assistant', message: string, timestamp?: string}>
  ) => apiClient.sendMessage(message, context, slots, conversationHistory),

  /**
   * Simule un crédit
   */
  simulateLoan: (params: LoanParams) => apiClient.simulateLoan(params),

  /**
   * Vérifie la santé de l'API
   */
  health: () => apiClient.healthCheck(),

  /**
   * Obtient les infos de l'API
   */
  info: () => apiClient.getApiInfo(),

  /**
   * Obtient l'ID de session actuel
   */
  getSessionId: () => apiClient.getSessionId(),

  /**
   * Crée un nouveau client avec un ID de session spécifique
   */
  withSession: (sessionId: string) => new ApiClient(sessionId),
};

export default api;