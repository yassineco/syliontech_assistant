import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, Send, VolumeX } from 'lucide-react';
import { sendMessage } from '../lib/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SimpleVoiceAssistantProps {
  onMessage?: (message: string) => Promise<string>;
}

export function SimpleVoiceAssistant({ onMessage }: SimpleVoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  // Refs pour la reconnaissance vocale
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const autoRestartTimerRef = useRef<number | null>(null);
  
  // Support navigateur avec détection avancée
  const isSupported = Boolean(
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition) &&
    window.speechSynthesis
  );

  // Détection des capacités du navigateur
  const browserCapabilities = useMemo(() => {
    if (typeof window === 'undefined') return { name: 'unknown', features: [] };
    
    const userAgent = navigator.userAgent;
    const features = [];
    
    if (window.SpeechRecognition) features.push('native-speech');
    if (window.webkitSpeechRecognition) features.push('webkit-speech');
    if (window.speechSynthesis) features.push('speech-synthesis');
    if ((window as any).AudioContext || (window as any).webkitAudioContext) features.push('audio-context');
    
    const browser = userAgent.includes('Chrome') ? 'chrome' :
                   userAgent.includes('Firefox') ? 'firefox' :
                   userAgent.includes('Safari') ? 'safari' :
                   userAgent.includes('Edge') ? 'edge' : 'unknown';
    
    return { name: browser, features };
  }, []);

  console.log('🌐 Capacités navigateur:', browserCapabilities);

  // Feedback audio pour les actions utilisateur (DÉSACTIVÉ temporairement)
  const playFeedbackSound = useCallback((type: 'start' | 'stop' | 'send' | 'error') => {
    // Désactivé pour éviter les bips intempestifs
    return;
    
    try {
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configuration selon le type de feedback
      switch (type) {
        case 'start':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          break;
        case 'stop':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          break;
        case 'send':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(900, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          break;
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log(`🔊 Feedback audio: ${type}`);
    } catch (error) {
      // Feedback audio optionnel - pas critique
      console.log('⚠️ Feedback audio non disponible');
    }
  }, []);

  // Vérification des permissions microphone
  const checkMicrophonePermissions = useCallback(async () => {
    try {
      console.log('🔍 Vérification permissions microphone...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('❌ Media Devices API non supporté par ce navigateur');
        setMicrophoneStatus('denied');
        return false;
      }

      // Vérifier les permissions
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎤 Permission microphone:', permission.state);
        setMicrophoneStatus(permission.state as any);

        if (permission.state === 'denied') {
          setErrorMessage('❌ Accès microphone refusé. Autorisez dans les paramètres du navigateur.');
          return false;
        }
      }

      // Test d'accès au microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Accès microphone accordé');
        setMicrophoneStatus('granted');
        setErrorMessage('');
        
        // Arrêter le stream immédiatement
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error: any) {
        console.error('❌ Erreur accès microphone:', error);
        setMicrophoneStatus('denied');
        
        if (error.name === 'NotAllowedError') {
          setErrorMessage('❌ Accès microphone refusé. Cliquez sur l\'icône 🔒 dans la barre d\'adresse.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('❌ Aucun microphone détecté sur cet appareil.');
        } else {
          setErrorMessage(`❌ Erreur microphone: ${error.message}`);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
      setErrorMessage('❌ Impossible de vérifier les permissions microphone');
      setMicrophoneStatus('denied');
      return false;
    }
  }, []);

  // Initialisation de la reconnaissance vocale
  const initRecognition = useCallback(() => {
    if (!isSupported) {
      console.error('❌ Speech Recognition non supporté');
      setErrorMessage('❌ Reconnaissance vocale non supportée par ce navigateur');
      return null;
    }

    console.log('🔧 Initialisation Speech Recognition...');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition() as any;
    
    // Configuration optimisée pour sensibilité maximale
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 10; // Plus d'alternatives pour meilleure précision
    
    // Paramètres avancés si disponibles (webkit)
    if (recognition.serviceURI) {
      recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
    }
    
    // Configuration audio avancée si supportée
    try {
      // Forcer l'utilisation de contraintes audio optimales
      recognition.audioTrack = true;
      recognition.noiseSuppressionConstraint = true;
      recognition.echoCancellationConstraint = true;
    } catch (error) {
      console.log('⚠️ Paramètres audio avancés non supportés');
    }
    
    console.log('⚙️ Configuration Speech Recognition optimisée:', {
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      lang: recognition.lang,
      maxAlternatives: recognition.maxAlternatives,
      audioOptimized: true
    });

    recognition.onstart = () => {
      console.log('🎤 ✅ Enregistrement démarré avec succès');
      setIsRecording(true);
      setErrorMessage('');
    };

    recognition.onend = () => {
      console.log('🎤 ⏹️ Enregistrement terminé');
      setIsRecording(false);
    };

    recognition.onaudiostart = () => {
      console.log('🎵 Audio capturé');
    };

    recognition.onaudioend = () => {
      console.log('🎵 Fin capture audio');
    };

    recognition.onsoundstart = () => {
      console.log('🔊 Son détecté');
    };

    recognition.onsoundend = () => {
      console.log('🔇 Fin du son');
    };

    recognition.onspeechstart = () => {
      console.log('🗣️ Parole détectée !');
    };

    recognition.onspeechend = () => {
      console.log('🗣️ Fin de parole');
    };

      recognition.onresult = (event: any) => {
        console.log('📝 Résultat reçu:', event);
        
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0;
          maxConfidence = Math.max(maxConfidence, confidence);
          
          if (result.isFinal) {
            finalTranscript += transcript;
            console.log('✅ Texte final:', transcript, `(confiance: ${confidence.toFixed(2)})`);
          } else {
            interimTranscript += transcript;
            console.log('⏳ Texte interim:', transcript, `(confiance: ${confidence.toFixed(2)})`);
          }
        }
        
        // Mise à jour du transcript affiché
        const fullTranscript = finalTranscript || interimTranscript;
        setCurrentTranscript(fullTranscript);
        setInputText(fullTranscript);
        
        // Logique d'auto-envoi adaptative
        const wordCount = fullTranscript.trim().split(/\s+/).length;
        const isSignificant = wordCount >= 2; // Seuil réduit de 3 à 2 mots
        const hasGoodConfidence = maxConfidence > 0.5 || finalTranscript; // Confiance > 50% ou texte final
        
        // Si on a un texte final significatif avec bonne confiance
        if (finalTranscript && isSignificant && hasGoodConfidence) {
          console.log('🚀 Auto-envoi activé:', {
            text: finalTranscript,
            wordCount,
            confidence: maxConfidence.toFixed(2)
          });
          
          // Arrêter le timer de silence s'il existe
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          
          // Envoyer le message automatiquement
          setTimeout(() => {
            triggerAutoSend(finalTranscript.trim());
            setCurrentTranscript('');
            
            // Redémarrer l'écoute après envoi si en mode auto
            if (isAutoMode && !isSpeaking) {
              autoRestartTimerRef.current = setTimeout(() => {
                startListening(true); // Silent restart
              }, 1500);
            }
          }, 100);
        }
        // Si on a un texte interim significatif, démarrer le timer de silence adaptatif
        else if (interimTranscript && wordCount >= 2) {
          console.log('⏱️ Timer silence adaptatif...', {
            text: interimTranscript,
            wordCount,
            confidence: maxConfidence.toFixed(2)
          });
          
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Timer adaptatif selon la longueur du texte
          const silenceDuration = wordCount <= 3 ? 2500 : 2000; // 2.5s pour phrases courtes, 2s pour longues
          
          silenceTimerRef.current = setTimeout(() => {
            if (currentTranscript.trim() && wordCount >= 2) {
              console.log('⏰ Timeout silence adaptatif - envoi auto:', {
                text: currentTranscript,
                wordCount,
                duration: silenceDuration
              });
              triggerAutoSend(currentTranscript.trim());
              setCurrentTranscript('');
              
              if (isAutoMode && !isSpeaking) {
                autoRestartTimerRef.current = setTimeout(() => {
                  startListening(true); // Silent auto-restart
                }, 1500);
              }
            }
          }, silenceDuration);
        }
      };    recognition.onerror = (event: any) => {
      console.error('❌ Erreur Speech Recognition:', event);
      console.error('🔍 Détails erreur:', {
        error: event.error,
        message: event.message,
        timeStamp: event.timeStamp,
        type: event.type
      });
      
      setIsRecording(false);
      
      const errorMap: Record<string, string> = {
        'not-allowed': '❌ Accès microphone refusé. Cliquez sur l\'icône 🔒 dans la barre d\'adresse pour autoriser.',
        'no-speech': '⚠️ Aucune parole détectée. Parlez plus fort ou vérifiez votre microphone.',
        'audio-capture': '❌ Impossible de capturer l\'audio. Vérifiez que votre microphone fonctionne.',
        'network': '❌ Erreur réseau. Vérifiez votre connexion Internet.',
        'service-not-allowed': '❌ Service de reconnaissance vocale non autorisé.',
        'bad-grammar': '❌ Erreur de grammaire dans la reconnaissance.',
        'language-not-supported': '❌ Langue française non supportée.',
        'aborted': '⚠️ Reconnaissance interrompue.',
        'not-supported': '❌ Reconnaissance vocale non supportée.'
      };
      
      const userMessage = errorMap[event.error] || `❌ Erreur inconnue: ${event.error}`;
      setErrorMessage(userMessage);
      
      // Tentative de redémarrage automatique pour certaines erreurs
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setTimeout(() => {
          console.log('🔄 Tentative de redémarrage automatique...');
          if (!isRecording && recognitionRef.current) { 
            try {
              recognitionRef.current.start();
            } catch (restartError) {
              console.error('❌ Échec redémarrage auto:', restartError);
            }
          }
        }, 2000);
      }
    };

    console.log('✅ Speech Recognition initialisé');
    return recognition;
  }, [isSupported]);

  // Fonction pour démarrer l'écoute automatique
  const startListening = useCallback(async (silent = false) => {
    if (!isSupported) {
      setErrorMessage('❌ Reconnaissance vocale non supportée');
      return;
    }

    // Vérifier les permissions
    const hasPermission = await checkMicrophonePermissions();
    if (!hasPermission) {
      return;
    }

    // Si déjà en cours, arrêter d'abord
    if (isRecording) {
      stopListening();
      return;
    }

    try {
      console.log('🎯 Démarrage écoute automatique...');
      setErrorMessage('🎤 Écoute en cours - Parlez naturellement...');
      
      // Feedback audio uniquement si action manuelle (pas silent)
      if (!silent) {
        playFeedbackSound('start');
      }
      
      const recognition = initRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('❌ Erreur démarrage écoute:', error);
      setErrorMessage('❌ Impossible de démarrer l\'écoute');
    }
  }, [isSupported, isRecording, checkMicrophonePermissions, initRecognition, playFeedbackSound]);

  // Fonction pour arrêter l'écoute
  const stopListening = useCallback(() => {
    console.log('🛑 Arrêt écoute...');
    
    // Feedback audio d'arrêt
    playFeedbackSound('stop');
    
    // Arrêter tous les timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (autoRestartTimerRef.current) {
      clearTimeout(autoRestartTimerRef.current);
      autoRestartTimerRef.current = null;
    }
    
    // Arrêter la reconnaissance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error('Erreur arrêt recognition:', error);
      }
    }
    
    setIsRecording(false);
    setCurrentTranscript('');
    setErrorMessage('✅ Prêt ! Activez le mode auto pour une écoute continue');
  }, [playFeedbackSound]);

  // Toggle mode automatique
  const toggleAutoMode = useCallback(async () => {
    const newAutoMode = !isAutoMode;
    setIsAutoMode(newAutoMode);
    
    if (newAutoMode) {
      console.log('🔄 Activation mode automatique');
      setErrorMessage('🔄 Mode automatique activé - Démarrage...');
      await startListening(false); // Avec bip car action manuelle
    } else {
      console.log('⏸️ Désactivation mode automatique');
      stopListening();
      setErrorMessage('⏸️ Mode automatique désactivé');
    }
  }, [isAutoMode, startListening, stopListening]);

  // Démarrer/arrêter l'enregistrement vocal - Version simplifiée
  const toggleRecording = useCallback(async () => {
    console.log('🎤 Toggle Recording appelé - État actuel:', { isRecording, isSupported, microphoneStatus });
    
    if (!isSupported) {
      alert('❌ Reconnaissance vocale non supportée par ce navigateur');
      return;
    }

    if (isRecording) {
      // Arrêter l'enregistrement
      console.log('🛑 Arrêt enregistrement');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
          setIsRecording(false);
        } catch (error) {
          console.error('Erreur arrêt:', error);
        }
      }
      return;
    }

    // Démarrer l'enregistrement
    try {
      console.log('� Démarrage enregistrement...');
      setErrorMessage('🎤 Préparation...');
      
      // Créer une nouvelle instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition() as any;
      
      // Configuration améliorée pour meilleure détection
      recognition.lang = 'fr-FR';
      recognition.continuous = true; // Changé à true pour écouter plus longtemps
      recognition.interimResults = true; // Changé à true pour voir les résultats partiels
      recognition.maxAlternatives = 3;
      
      console.log('⚙️ Config reconnaissance:', {
        lang: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults
      });
      
      // Event handlers améliorés
      recognition.onstart = () => {
        console.log('✅ Reconnaissance démarrée');
        setIsRecording(true);
        setErrorMessage('🔴 Je vous écoute - Parlez FORT et CLAIREMENT !');
      };
      
      recognition.onaudiostart = () => {
        console.log('🎵 Audio capture démarrée');
      };
      
      recognition.onsoundstart = () => {
        console.log('🔊 Son détecté !');
        setErrorMessage('🔊 Son détecté - continuez à parler...');
      };
      
      recognition.onspeechstart = () => {
        console.log('🗣️ PAROLE DÉTECTÉE !');
        setErrorMessage('🗣️ Parole détectée - parfait !');
      };
      
      recognition.onspeechend = () => {
        console.log('🗣️ Fin de parole détectée');
        setErrorMessage('🗣️ Fin de parole - traitement...');
      };
      
      recognition.onsoundend = () => {
        console.log('🔇 Fin du son');
      };
      
      recognition.onaudioend = () => {
        console.log('🎵 Fin capture audio');
      };
      
      recognition.onend = () => {
        console.log('⏹️ Reconnaissance terminée');
        setIsRecording(false);
        setErrorMessage('✅ Prêt ! Cliquez pour parler à nouveau');
      };
      
      recognition.onresult = (event: any) => {
        console.log('📊 Event result reçu:', event);
        console.log('📊 Nombre de résultats:', event.results.length);
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript.trim();
          const confidence = result[0].confidence;
          
          console.log(`📝 Résultat ${i}:`, {
            text,
            confidence,
            isFinal: result.isFinal
          });
          
          // Mise à jour en temps réel
          setInputText(text);
          
          if (result.isFinal) {
            console.log('✅ Résultat final:', text);
            setErrorMessage(`✅ Reconnu: "${text}"`);
            
            // Auto-envoi si assez de mots
            if (text && text.split(' ').length >= 3) {
              console.log('🚀 Auto-envoi déclenché pour:', text);
              setTimeout(() => triggerAutoSend(text), 100);
              // Arrêter la reconnaissance après envoi
              recognition.stop();
            }
          } else {
            setErrorMessage(`🎤 En cours: "${text}..."`);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('❌ Erreur recognition:', event.error);
        setIsRecording(false);
        setErrorMessage(`❌ Erreur: ${event.error}`);
      };
      
      // Stocker et démarrer
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('❌ Erreur création recognition:', error);
      setErrorMessage(`❌ Erreur: ${error}`);
      setIsRecording(false);
    }
  }, [isRecording, isSupported]);

  // Auto-démarrage de l'écoute vocale au montage du composant
  useEffect(() => {
    // Version simplifiée - pas d'auto-démarrage pour éviter les conflits
    console.log('🎤 Composant monté - prêt pour interaction manuelle');
    
    // Simple vérification des permissions au montage
    if (isSupported) {
      checkMicrophonePermissions().then(hasPermission => {
        if (hasPermission) {
          setErrorMessage('✅ Prêt ! Cliquez sur le microphone pour parler');
        } else {
          setErrorMessage('🎤 Cliquez sur le microphone pour autoriser l\'accès');
        }
      }).catch(() => {
        setErrorMessage('⚠️ Problème permissions - utilisez le bouton microphone');
      });
    }
  }, []); // Pas de dépendances pour éviter les re-renders

  // Synthèse vocale optimisée avec gestion des interruptions
  const speak = useCallback((text: string) => {
    if (!text.trim() || isSpeaking) return;

    // Nettoyer le texte pour une prononciation optimale
    const cleanText = text
      .replace(/\*\*/g, '') // Supprimer le markdown
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\bcrédits?\b/gi, 'crédi') // crédit -> crédi (évite épellation)
      .replace(/TAEG/gi, 'T.A.E.G.') // Épeler l'acronyme
      .replace(/APR/gi, 'A.P.R.')
      .replace(/\b(\d+)\s*€/gi, '$1 euros')
      .replace(/\b(\d+)\s*%/gi, '$1 pour cent')
      .replace(/24h/gi, '24 heures')
      .replace(/\n+/g, '. ') // Remplacer les retours ligne par des points
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim();

    console.log('🔊 Démarrage synthèse vocale optimisée:', cleanText.substring(0, 50) + '...');
    setIsSpeaking(true);

    // Sélectionner la meilleure voix française
    const voices = speechSynthesis.getVoices();
    const frenchVoice = voices.find(voice => 
      voice.lang.startsWith('fr') && (voice.name.includes('Google') || voice.name.includes('Amélie'))
    ) || voices.find(voice => voice.lang.startsWith('fr'));

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = frenchVoice || null;
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85; // Légèrement plus lent pour clarté
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Gestion interruption par nouvelle parole utilisateur
    utterance.onstart = () => {
      console.log('🔊 Synthèse démarrée - écoute des interruptions...');
      
      // Écouter pour interruptions si en mode auto
      if (isAutoMode && !isRecording) {
        setTimeout(() => {
          // Démarrer une écoute discrète pendant la synthèse
          const interruptionRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          interruptionRecognition.continuous = false;
          interruptionRecognition.interimResults = true;
          interruptionRecognition.lang = 'fr-FR';
          
          interruptionRecognition.onresult = (event: any) => {
            if (event.results.length > 0) {
              const transcript = event.results[0][0].transcript.trim();
              if (transcript.length > 3) {
                console.log('🛑 Interruption détectée:', transcript);
                speechSynthesis.cancel();
                setIsSpeaking(false);
                
                // Traiter la nouvelle demande
                if (transcript.split(/\s+/).length >= 2) {
                  setTimeout(() => {
                    triggerAutoSend(transcript);
                  }, 300);
                }
              }
            }
          };
          
          interruptionRecognition.onerror = () => {
            // Erreur silencieuse - pas critique
          };
          
          try {
            interruptionRecognition.start();
          } catch (error) {
            // Pas critique
          }
        }, 500);
      }
    };

    utterance.onend = () => {
      console.log('🔊 Synthèse terminée');
      setIsSpeaking(false);
      
      // Redémarrer l'écoute automatiquement si en mode auto
      if (isAutoMode && !isRecording) {
        setTimeout(() => {
          startListening(true); // Silent auto-restart après synthèse
        }, 800);
      }
    };

    utterance.onerror = (error) => {
      console.error('❌ Erreur synthèse:', error);
      setIsSpeaking(false);
      
      // Redémarrer l'écoute même en cas d'erreur
      if (isAutoMode && !isRecording) {
        setTimeout(() => {
          startListening(true); // Silent auto-restart après erreur
        }, 1000);
      }
    };

    speechSynthesis.cancel(); // Arrêter toute synthèse en cours
    speechSynthesis.speak(utterance);
  }, [isSpeaking, isAutoMode, isRecording, startListening]);

  // Arrêter la synthèse vocale avec redémarrage intelligent
  const stopSpeaking = useCallback(() => {
    console.log('🛑 Arrêt manuel synthèse');
    speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Redémarrer l'écoute si en mode auto
    if (isAutoMode && !isRecording) {
      setTimeout(() => {
        startListening(true); // Silent auto-restart après arrêt manuel
      }, 500);
    }
  }, [isAutoMode, isRecording, startListening]);

  // Ajouter un message
  const addMessage = useCallback((type: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Auto-envoi après reconnaissance vocale
  const triggerAutoSend = useCallback(async (text: string) => {
    if (!text || isProcessing) return;

    console.log('📤 Auto-envoi:', text);
    
    // Feedback audio d'envoi
    playFeedbackSound('send');
    
    setIsProcessing(true);

    // Ajouter le message utilisateur
    addMessage('user', text);

    try {
      let response: string;
      
      if (onMessage) {
        // Utiliser la fonction personnalisée si fournie
        response = await onMessage(text);
      } else {
        // Utiliser l'API Sofinco par défaut
        const conversationHistory = messages.map(msg => ({
          role: msg.type as 'user' | 'assistant',
          message: msg.content,
          timestamp: msg.timestamp.toISOString()
        }));
        
        const apiResponse = await sendMessage(text, undefined, undefined, conversationHistory);
        response = apiResponse.reply || 'Désolé, je n\'ai pas pu traiter votre demande.';
      }
      
      if (response) {
        // Ajouter la réponse
        addMessage('assistant', response);
        
        // Lire automatiquement la réponse
        setTimeout(() => {
          speak(response);
        }, 500); // Petit délai pour éviter les conflits
      }
    } catch (error) {
      console.error('Erreur API:', error);
      const errorMsg = 'Désolé, je rencontre un problème technique.';
      addMessage('assistant', errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
      // Vider le champ de texte après l'envoi automatique
      setInputText('');
    }
  }, [isProcessing, addMessage, onMessage, speak, messages]);

  // Envoyer un message
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    console.log('📤 Envoi:', text);
    setIsProcessing(true);
    setInputText('');

    // Ajouter le message utilisateur
    addMessage('user', text);

    try {
      let response: string;
      
      if (onMessage) {
        // Utiliser la fonction personnalisée si fournie
        response = await onMessage(text);
      } else {
        // Utiliser l'API Sofinco par défaut
        const conversationHistory = messages.map(msg => ({
          role: msg.type as 'user' | 'assistant',
          message: msg.content,
          timestamp: msg.timestamp.toISOString()
        }));
        
        const apiResponse = await sendMessage(text, undefined, undefined, conversationHistory);
        response = apiResponse.reply || 'Désolé, je n\'ai pas pu traiter votre demande.';
      }
      
      if (response) {
        // Ajouter la réponse
        addMessage('assistant', response);
        
        // Lire automatiquement la réponse
        setTimeout(() => {
          speak(response);
        }, 500); // Petit délai pour éviter les conflits
      }
    } catch (error) {
      console.error('Erreur API:', error);
      const errorMsg = 'Désolé, je rencontre un problème technique.';
      addMessage('assistant', errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, addMessage, onMessage, speak, messages]);

  // Gestion du formulaire
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  // Effet d'initialisation automatique
  useEffect(() => {
    const initializeAutoMode = async () => {
      // Attendre un peu pour que le composant soit monté
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isSupported && microphoneStatus === 'unknown') {
        console.log('🚀 Initialisation automatique...');
        const hasPermission = await checkMicrophonePermissions();
        
        if (hasPermission) {
          console.log('🔄 Activation mode automatique initial');
          setIsAutoMode(true);
          setErrorMessage('🔄 Mode automatique activé - Parlez naturellement !');
          
          // Démarrer l'écoute après un petit délai (silencieux au démarrage)
          setTimeout(() => {
            startListening(true); // Silent initial start
          }, 1000);
        }
      }
    };
    
    initializeAutoMode();
  }, [isSupported, microphoneStatus, checkMicrophonePermissions, startListening]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      // Nettoyer tous les timers et ressources
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (autoRestartTimerRef.current) {
        clearTimeout(autoRestartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Erreur nettoyage:', error);
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* En-tête simplifié */}
      <div className="bg-green-600 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold">🎤 Assistant Vocal SylionTech</h1>
        
        {/* Message principal */}
        <p className="text-green-100 text-sm mt-2">
          {errorMessage || (isRecording ? '🔴 Je vous écoute...' : '🎤 Cliquez sur le microphone pour parler')}
        </p>
        
        {/* Statut simple */}
        <div className="text-green-200 text-xs mt-2 flex items-center gap-4">
          <span>✨ Version simplifiée</span>
          {isProcessing && <span className="animate-pulse">⏳ Traitement...</span>}
        </div>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">🎤</div>
            <p className="text-lg font-medium">Bonjour ! Je suis votre assistant SylionTech.</p>
            <p className="text-sm mt-2">Cliquez sur le microphone et parlez-moi de votre projet de financement.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Je réfléchis...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="border-t bg-gray-50 p-4">
        <form onSubmit={handleSubmit}>
        <div className="flex items-center space-x-2">
          {/* Bouton mode automatique */}
          <button
            type="button"
            onClick={toggleAutoMode}
            disabled={isProcessing || !isSupported}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isAutoMode
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAutoMode ? 'Désactiver mode automatique' : 'Activer mode automatique'}
          >
            {isAutoMode ? '🔄 AUTO' : '⏸️ MANUEL'}
          </button>

          {/* Bouton microphone */}
          <button
            type="button"
            onClick={isAutoMode ? stopListening : toggleRecording}
            disabled={isProcessing || !isSupported}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={
              isAutoMode 
                ? (isRecording ? 'Écoute automatique en cours' : 'Redémarrer écoute auto')
                : (isRecording ? 'Arrêter l\'enregistrement' : 'Commencer à parler')
            }
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Bouton diagnostic */}
          <button
            type="button"
            onClick={async () => {
              console.log('🔧 DIAGNOSTIC FORCÉ...');
              console.log('🔧 Support navigateur:', isSupported);
              console.log('🔧 État microphone:', microphoneStatus);
              console.log('🔧 Reconnaissance actuelle:', recognitionRef.current);
              
              // Test permissions
              const hasPermission = await checkMicrophonePermissions();
              console.log('🔧 Test permissions résultat:', hasPermission);
              
              // Test Speech Recognition
              if (isSupported) {
                try {
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                  const testRecognition = new SpeechRecognition() as any;
                  console.log('🔧 Nouvelle instance SpeechRecognition créée:', testRecognition);
                  
                  testRecognition.lang = 'fr-FR';
                  testRecognition.continuous = false;
                  testRecognition.interimResults = false;
                  
                  testRecognition.onstart = () => console.log('🔧 TEST: Recognition started');
                  testRecognition.onend = () => console.log('🔧 TEST: Recognition ended');
                  testRecognition.onresult = (e: any) => console.log('🔧 TEST: Result:', e);
                  testRecognition.onerror = (e: any) => console.log('🔧 TEST: Error:', e);
                  
                  testRecognition.start();
                  console.log('🔧 Test recognition démarré');
                } catch (error) {
                  console.error('🔧 TEST ERROR:', error);
                }
              }
            }}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            title="Diagnostic complet"
          >
            🔧
          </button>

          {/* Champ de saisie */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Discussion vocale active - Parlez ou tapez..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
            disabled={isProcessing}
          />

          {/* Bouton envoi */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Envoi manuel (ou auto après vocal)"
          >
            <Send className="w-5 h-5" />
          </button>

          {/* Bouton arrêter synthèse */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Arrêter la lecture"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {/* Indicateurs d'état */}
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div className="flex space-x-4">
          {isRecording && (
            <span className="text-red-500 animate-pulse">🔴 Enregistrement...</span>
          )}
          {isSpeaking && (
            <span className="text-green-500">🔊 Lecture en cours...</span>
          )}
          {isProcessing && (
            <span className="text-blue-500">⏳ Traitement...</span>
          )}
        </div>
        
        {!isSupported && (
          <span className="text-red-500">❌ Reconnaissance vocale non supportée</span>
        )}
      </div>
    </div>
    </div>
  );
}