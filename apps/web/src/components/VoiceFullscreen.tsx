import React from 'react';
import { X } from 'lucide-react';
import { AssistantAvatar, VoiceVisualizer, VoiceStatusBadge } from './VoiceVisualizer';

interface VoiceFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  voiceMode: 'idle' | 'listening' | 'thinking' | 'speaking';
  transcript?: string;
  lastMessage?: string;
}

export function VoiceFullscreen({ 
  isOpen, 
  onClose, 
  voiceMode, 
  transcript,
  lastMessage 
}: VoiceFullscreenProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-500/95 via-purple-500/95 to-pink-500/95 backdrop-blur-xl">
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Contenu centré */}
      <div className="h-full flex flex-col items-center justify-center space-y-8 p-8">
        {/* Avatar principal - Très grand */}
        <div className="transform scale-150">
          <AssistantAvatar state={voiceMode} />
        </div>

        {/* Badge de statut */}
        <div className="transform scale-125">
          <VoiceStatusBadge state={voiceMode} />
        </div>

        {/* Visualiseur audio */}
        {(voiceMode === 'listening' || voiceMode === 'speaking') && (
          <div className="w-full max-w-2xl">
            <VoiceVisualizer 
              isActive={true} 
              mode={voiceMode === 'listening' ? 'listening' : 'speaking'} 
            />
          </div>
        )}

        {/* Transcription en temps réel */}
        {voiceMode === 'listening' && transcript && (
          <div className="max-w-2xl text-center px-8">
            <p className="text-3xl text-white font-medium animate-pulse drop-shadow-lg">
              "{transcript}"
            </p>
          </div>
        )}

        {/* Dernier message utilisateur */}
        {voiceMode === 'thinking' && lastMessage && (
          <div className="max-w-2xl text-center px-8">
            <p className="text-2xl text-white/90 font-medium drop-shadow-lg">
              "{lastMessage}"
            </p>
          </div>
        )}

        {/* Instructions */}
        {voiceMode === 'idle' && (
          <div className="text-center space-y-4">
            <p className="text-xl text-white/80">
              Prêt à vous écouter
            </p>
            <p className="text-sm text-white/60">
              Cliquez sur le micro pour commencer
            </p>
          </div>
        )}
      </div>

      {/* Effet de particules en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
