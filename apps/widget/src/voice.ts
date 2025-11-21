import type { VoiceRecognition, VoiceSynthesis, VoiceSynthesisOptions } from './types.js'
import './speech-types.js'

export class VoiceManager {
  private recognition: VoiceRecognition | null = null
  private synthesis: VoiceSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private recognitionInstance: any | null = null
  private isInitialized = false

  constructor(private config: {
    lang: string
    rate?: number
    pitch?: number
    volume?: number
    debug?: boolean
  }) {
    this.init()
  }

  private init(): void {
    this.initRecognition()
    this.initSynthesis()
    this.isInitialized = true

    if (this.config.debug) {
      console.log('VoiceManager initialized:', {
        recognition: this.recognition?.isSupported,
        synthesis: this.synthesis?.isSupported,
        lang: this.config.lang
      })
    }
  }

  private initRecognition(): void {
    // Support pour différents navigateurs
    const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      this.recognition = {
        isListening: false,
        isSupported: false,
        language: this.config.lang,
        start: () => Promise.reject(new Error('Speech recognition not supported')),
        stop: () => {},
        onResult: () => {},
        onError: () => {}
      }
      return
    }

    this.recognitionInstance = new SpeechRecognition()
    this.recognitionInstance.continuous = true
    this.recognitionInstance.interimResults = true
    this.recognitionInstance.lang = this.getRecognitionLanguage()

    let resultCallback: ((text: string, isFinal: boolean) => void) | null = null
    let errorCallback: ((error: string) => void) | null = null

    this.recognitionInstance.onresult = (event: any) => {
      if (!resultCallback) return

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        const isFinal = result.isFinal

        resultCallback(text, isFinal)
      }
    }

    this.recognitionInstance.onerror = (event: any) => {
      if (errorCallback) {
        errorCallback(event.error)
      }
    }

    this.recognitionInstance.onend = () => {
      if (this.recognition) {
        this.recognition.isListening = false
      }
    }

    this.recognition = {
      isListening: false,
      isSupported: true,
      language: this.config.lang,
      
      start: async () => {
        if (!this.recognitionInstance || this.recognition!.isListening) return
        
        try {
          this.recognitionInstance.start()
          this.recognition!.isListening = true
        } catch (error) {
          throw new Error(`Failed to start recognition: ${error}`)
        }
      },
      
      stop: () => {
        if (this.recognitionInstance && this.recognition!.isListening) {
          this.recognitionInstance.stop()
          this.recognition!.isListening = false
        }
      },
      
      onResult: (callback) => {
        resultCallback = callback
      },
      
      onError: (callback) => {
        errorCallback = callback
      }
    }
  }

  private initSynthesis(): void {
    if (!('speechSynthesis' in window)) {
      this.synthesis = {
        isSupported: false,
        isSpeaking: false,
        voices: [],
        speak: () => Promise.reject(new Error('Speech synthesis not supported')),
        stop: () => {},
        getVoices: () => []
      }
      return
    }

    this.synthesis = {
      isSupported: true,
      isSpeaking: false,
      voices: [],
      
      speak: async (text: string, options?: VoiceSynthesisOptions) => {
        return new Promise((resolve, reject) => {
          if (!window.speechSynthesis) {
            reject(new Error('Speech synthesis not available'))
            return
          }

          // Arrêter la synthèse précédente
          this.synthesis!.stop()

          const utterance = new SpeechSynthesisUtterance(text)
          this.currentUtterance = utterance

          // Configuration
          utterance.lang = options?.lang || this.getSynthesisLanguage()
          utterance.rate = options?.rate || this.config.rate || 1
          utterance.pitch = options?.pitch || this.config.pitch || 1
          utterance.volume = options?.volume || this.config.volume || 1

          // Sélection de la voix
          if (options?.voice) {
            utterance.voice = options.voice
          } else {
            const voices = this.synthesis!.getVoices()
            const preferredVoice = this.findBestVoice(voices, utterance.lang)
            if (preferredVoice) {
              utterance.voice = preferredVoice
            }
          }

          utterance.onstart = () => {
            this.synthesis!.isSpeaking = true
          }

          utterance.onend = () => {
            this.synthesis!.isSpeaking = false
            this.currentUtterance = null
            resolve()
          }

          utterance.onerror = (event) => {
            this.synthesis!.isSpeaking = false
            this.currentUtterance = null
            reject(new Error(`Speech synthesis error: ${event.error}`))
          }

          window.speechSynthesis.speak(utterance)
        })
      },
      
      stop: () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
          this.synthesis!.isSpeaking = false
          this.currentUtterance = null
        }
      },
      
      getVoices: () => {
        return window.speechSynthesis ? window.speechSynthesis.getVoices() : []
      }
    }

    // Charger les voix disponibles
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.synthesis!.voices = this.synthesis!.getVoices()
      }
    }
  }

  private getRecognitionLanguage(): string {
    const langMap: Record<string, string> = {
      'fr': 'fr-FR',
      'en': 'en-US',
      'es': 'es-ES',
      'ar': 'ar-SA'
    }
    return langMap[this.config.lang] || 'fr-FR'
  }

  private getSynthesisLanguage(): string {
    const langMap: Record<string, string> = {
      'fr': 'fr-FR',
      'en': 'en-US',
      'es': 'es-ES',
      'ar': 'ar-SA'
    }
    return langMap[this.config.lang] || 'fr-FR'
  }

  private findBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
    // Chercher une voix qui correspond exactement à la langue
    let voice = voices.find(v => v.lang === lang)
    
    // Si pas trouvé, chercher par code de langue
    if (!voice) {
      const langCode = lang.split('-')[0]
      voice = voices.find(v => v.lang.startsWith(langCode))
    }
    
    // Si toujours pas trouvé, prendre la voix par défaut
    if (!voice) {
      voice = voices.find(v => v.default)
    }
    
    return voice || voices[0] || null
  }

  // API publique
  public async startListening(): Promise<void> {
    if (!this.recognition?.isSupported) {
      throw new Error('Speech recognition not supported')
    }
    return this.recognition.start()
  }

  public stopListening(): void {
    this.recognition?.stop()
  }

  public onRecognitionResult(callback: (text: string, isFinal: boolean) => void): void {
    this.recognition?.onResult(callback)
  }

  public onRecognitionError(callback: (error: string) => void): void {
    this.recognition?.onError(callback)
  }

  public async speak(text: string, options?: VoiceSynthesisOptions): Promise<void> {
    if (!this.synthesis?.isSupported) {
      throw new Error('Speech synthesis not supported')
    }
    return this.synthesis.speak(text, options)
  }

  public stopSpeaking(): void {
    this.synthesis?.stop()
  }

  public isListening(): boolean {
    return this.recognition?.isListening || false
  }

  public isSpeaking(): boolean {
    return this.synthesis?.isSpeaking || false
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || []
  }

  public isVoiceSupported(): boolean {
    return Boolean(this.recognition?.isSupported && this.synthesis?.isSupported)
  }

  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.recognitionInstance && newConfig.lang) {
      this.recognitionInstance.lang = this.getRecognitionLanguage()
    }
  }

  public destroy(): void {
    this.stopListening()
    this.stopSpeaking()
    this.recognitionInstance = null
    this.recognition = null
    this.synthesis = null
    this.currentUtterance = null
  }
}