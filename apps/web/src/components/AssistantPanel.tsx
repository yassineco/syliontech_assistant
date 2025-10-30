import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send, User, Bot } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssistantPanelProps {
  onMessage?: (message: string) => Promise<string>;
  disabled?: boolean;
}

export function AssistantPanel({ onMessage, disabled }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    speak,
    isSpeaking,
    stopSpeaking,
    error: speechError
  } = useSpeech();

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Traiter le transcript quand il change
  useEffect(() => {
    if (transcript && !isListening) {
      setInputText(transcript);
    }
  }, [transcript, isListening]);

  const addMessage = (type: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isProcessing || disabled) return;

    setIsProcessing(true);
    setInputText('');

    // Ajouter le message utilisateur
    addMessage('user', messageText);

    try {
      // Envoyer à l'assistant
      const response = await onMessage?.(messageText);
      
      if (response) {
        // Ajouter la réponse de l'assistant
        addMessage('assistant', response);
        
        // Lire la réponse à voix haute
        if (isSupported && !isSpeaking) {
          speak(response);
        }
      }
    } catch (error) {
      console.error('Erreur assistant:', error);
      addMessage('assistant', 'Désolé, je rencontre un problème technique. Pouvez-vous reformuler votre question ?');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  return (
    <div className="card h-full flex flex-col">
      {/* En-tête */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Assistant Sofinco</h3>
              <p className="text-sm text-text-muted">
                {disabled ? 'Non disponible' : 'Posez-moi vos questions'}
              </p>
            </div>
          </div>
          
          {/* Contrôles vocaux */}
          {isSupported && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleSpeaking}
                disabled={!isSpeaking}
                className={`p-2 rounded-full transition-colors ${
                  isSpeaking 
                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                    : 'text-text-muted hover:bg-gray-100'
                }`}
                title={isSpeaking ? 'Arrêter la lecture' : 'Pas de lecture en cours'}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
        
        {speechError && (
          <div className="mt-2 text-xs text-error bg-error/10 rounded px-2 py-1">
            {speechError}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-text-light" />
            <p className="text-sm">
              Bonjour ! Je suis là pour vous aider avec vos questions sur le crédit.
            </p>
            <p className="text-xs mt-2">
              {isSupported ? 'Écrivez ou parlez-moi.' : 'Écrivez-moi votre question.'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-text-muted'
                }`}>
                  {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-white/70' : 'text-text-light'
                  }`}>
                    {message.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-text-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                disabled 
                  ? 'Assistant non disponible' 
                  : isListening 
                    ? 'Parlez maintenant...' 
                    : 'Tapez votre message...'
              }
              disabled={disabled || isProcessing}
              className={`input-primary min-h-[44px] max-h-32 resize-none ${
                isListening ? 'ring-2 ring-orange-300 border-orange-300' : ''
              }`}
              rows={1}
            />
          </div>
          
          {/* Bouton micro */}
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled || isProcessing}
              className={`p-3 rounded-full transition-colors ${
                isListening
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? 'Arrêter l\'écoute' : 'Commencer l\'écoute vocale'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          
          {/* Bouton envoyer */}
          <button
            type="submit"
            disabled={disabled || isProcessing || !inputText.trim()}
            className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Envoyer le message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        
        {isListening && (
          <p className="text-xs text-orange-600 mt-2 text-center">
            🎤 Écoute en cours... Parlez maintenant
          </p>
        )}
      </div>
    </div>
  );
}