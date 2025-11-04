// Types pour le widget assistant
export interface AssistantConfig {
  tenantId: string
  apiKey?: string
  theme?: 'light' | 'dark' | 'auto'
  lang?: 'fr' | 'en' | 'es' | 'ar'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  apiUrl?: string
  primaryColor?: string
  accentColor?: string
  borderRadius?: string
  fontFamily?: string
  welcomeMessage?: string
  placeholder?: string
  triggerIcon?: string
  width?: string
  height?: string
  zIndex?: number
  debug?: boolean
  
  // Fonctionnalités vocales
  enableVoice?: boolean
  voiceLanguage?: string
  voiceRate?: number
  voicePitch?: number
  voiceVolume?: number
  autoSpeak?: boolean
  speechToText?: boolean
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
  metadata?: Record<string, any>
}

export interface AssistantWidget {
  config: AssistantConfig
  isOpen: boolean
  container: HTMLElement | null
  chatContainer: HTMLElement | null
  messages: ChatMessage[]
  
  // Méthodes publiques
  open(): void
  close(): void
  toggle(): void
  sendMessage(content: string): Promise<void>
  setConfig(config: Partial<AssistantConfig>): void
  destroy(): void
  
  // Méthodes vocales
  startListening(): Promise<void>
  stopListening(): void
  speak(text: string): Promise<void>
  stopSpeaking(): void
}

// Interface pour l'API
export interface ChatResponse {
  id: string
  content: string
  role: 'assistant'
  timestamp: number
  metadata?: Record<string, any>
}

// Types pour la reconnaissance vocale
export interface VoiceRecognition {
  isListening: boolean
  isSupported: boolean
  language: string
  
  start(): Promise<void>
  stop(): void
  onResult(callback: (text: string, isFinal: boolean) => void): void
  onError(callback: (error: string) => void): void
}

// Types pour la synthèse vocale
export interface VoiceSynthesis {
  isSupported: boolean
  isSpeaking: boolean
  voices: SpeechSynthesisVoice[]
  
  speak(text: string, options?: VoiceSynthesisOptions): Promise<void>
  stop(): void
  getVoices(): SpeechSynthesisVoice[]
}

export interface VoiceSynthesisOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voice?: SpeechSynthesisVoice
}