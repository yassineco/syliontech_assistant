import { useState, useEffect, useCallback, useRef } from 'react';

// Types pour Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type SpeechState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface UseSpeechReturn {
  // État
  state: SpeechState;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  
  // Actions
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  clearTranscript: () => void;
  
  // Configuration
  setLanguage: (lang: string) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  
  // Informations
  availableVoices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
}

/**
 * Hook pour gérer la Web Speech API (STT + TTS)
 */
export function useSpeech(): UseSpeechReturn {
  // États
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [language, setLanguage] = useState('fr-FR');
  
  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isListeningRef = useRef(false);
  
  // Vérification du support
  const isSupported = Boolean(
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition) &&
    window.speechSynthesis
  );

  /**
   * Initialise la reconnaissance vocale
   */
  const initializeRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;
    
    recognition.onstart = () => {
      setState('listening');
      setError(null);
      isListeningRef.current = true;
    };
    
    recognition.onend = () => {
      setState('idle');
      isListeningRef.current = false;
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        setState('idle');
      } else {
        setTranscript(interimTranscript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
      
      let errorMessage = 'Erreur de reconnaissance vocale';
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone non autorisé. Veuillez autoriser l\'accès au microphone.';
          break;
        case 'no-speech':
          errorMessage = 'Aucune parole détectée. Réessayez en parlant plus fort.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone non disponible.';
          break;
        case 'network':
          errorMessage = 'Erreur réseau pour la reconnaissance vocale.';
          break;
      }
      
      setError(errorMessage);
      setState('error');
      isListeningRef.current = false;
    };
    
    return recognition;
  }, [isSupported, language]);

  /**
   * Charge les voix disponibles
   */
  const loadVoices = useCallback(() => {
    if (!isSupported) return;
    
    const voices = speechSynthesis.getVoices();
    setAvailableVoices(voices);
    
    // Sélectionne la meilleure voix française disponible
    // Priorité : Google Premium > Microsoft Neural > Autres
    const frenchVoice = 
      // 1. Voix Google Premium (très naturelles)
      voices.find(voice => 
        voice.lang.startsWith('fr') && 
        (voice.name.includes('Google') || voice.name.includes('premium')) &&
        (voice.name.includes('Female') || voice.name.includes('Amélie') || voice.name.includes('Clara'))
      ) ||
      // 2. Voix Microsoft Neural (qualité élevée)
      voices.find(voice => 
        voice.lang.startsWith('fr') && 
        voice.name.includes('Microsoft') &&
        (voice.name.includes('Denise') || voice.name.includes('Neural'))
      ) ||
      // 3. Voix Apple (bonne qualité sur Safari/Mac)
      voices.find(voice => 
        voice.lang.startsWith('fr') && 
        (voice.name.includes('Amélie') || voice.name.includes('Thomas'))
      ) ||
      // 4. N'importe quelle voix française féminine
      voices.find(voice => 
        voice.lang.startsWith('fr') && 
        (voice.name.includes('Female') || voice.name.includes('femme'))
      ) ||
      // 5. Fallback : première voix française
      voices.find(voice => voice.lang.startsWith('fr'));
    
    if (frenchVoice && !currentVoice) {
      setCurrentVoice(frenchVoice);
      console.log('🎤 Voix sélectionnée:', frenchVoice.name, '-', frenchVoice.lang);
    }
  }, [isSupported, currentVoice]);

  /**
   * Démarre l'écoute
   */
  const startListening = useCallback(() => {
    if (!isSupported || isListeningRef.current) return;
    
    try {
      if (!recognitionRef.current) {
        recognitionRef.current = initializeRecognition();
      }
      
      if (recognitionRef.current) {
        setTranscript('');
        setError(null);
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Erreur démarrage reconnaissance:', error);
      setError('Impossible de démarrer la reconnaissance vocale');
      setState('error');
    }
  }, [isSupported, initializeRecognition]);

  /**
   * Arrête l'écoute
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  /**
   * Synthèse vocale
   */
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!isSupported || !text.trim()) return;
    
    return new Promise((resolve, reject) => {
      try {
        // Arrête toute synthèse en cours
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        // Configuration de la voix
        if (currentVoice) {
          utterance.voice = currentVoice;
        }
        utterance.lang = language;
        
        // Paramètres optimisés pour une voix plus naturelle
        utterance.rate = 0.95;  // Légèrement ralenti pour plus de clarté
        utterance.pitch = 1.05; // Légèrement plus aigu pour un ton plus agréable
        utterance.volume = 0.9; // Volume un peu plus fort
        
        utterance.onstart = () => {
          setState('speaking');
        };
        
        utterance.onend = () => {
          setState('idle');
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Erreur synthèse vocale:', event);
          setState('error');
          setError('Erreur de synthèse vocale');
          reject(new Error('Erreur synthèse vocale'));
        };
        
        speechSynthesis.speak(utterance);
        
      } catch (error) {
        console.error('Erreur speak:', error);
        setState('error');
        setError('Impossible de lire le texte');
        reject(error);
      }
    });
  }, [isSupported, currentVoice, language]);

  /**
   * Arrête la synthèse vocale
   */
  const stopSpeaking = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setState('idle');
    }
  }, []);

  /**
   * Efface le transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  /**
   * Change la voix
   */
  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
  }, []);

  // Effets
  useEffect(() => {
    if (isSupported) {
      loadVoices();
      
      // Écoute les changements de voix (certains navigateurs chargent les voix de façon asynchrone)
      speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [isSupported, loadVoices]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.abort();
      }
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    // État
    state,
    isSupported,
    transcript,
    error,
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    
    // Actions
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    
    // Configuration
    setLanguage,
    setVoice,
    
    // Informations
    availableVoices,
    currentVoice,
  };
}