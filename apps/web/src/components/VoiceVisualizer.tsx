import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

interface VoiceVisualizerProps {
  isActive: boolean;
  mode: 'listening' | 'speaking' | 'idle';
}

export function VoiceVisualizer({ isActive, mode }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [bars] = useState(() => Array.from({ length: 30 }, () => Math.random()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barCount = 30;
    const barWidth = width / barCount - 2;

    let phase = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (isActive) {
        phase += 0.05;

        for (let i = 0; i < barCount; i++) {
          const baseHeight = bars[i] * 20;
          const waveHeight = Math.sin(phase + i * 0.5) * 30;
          const randomness = mode === 'speaking' ? Math.random() * 20 : 0;
          const barHeight = baseHeight + waveHeight + randomness;

          const x = i * (barWidth + 2);
          const y = (height - Math.abs(barHeight)) / 2;

          // Gradient basé sur le mode
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          if (mode === 'listening') {
            gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)'); // orange
            gradient.addColorStop(1, 'rgba(251, 146, 60, 0.4)');
          } else {
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // blue
            gradient.addColorStop(1, 'rgba(96, 165, 250, 0.4)');
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, Math.abs(barHeight));
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, mode, bars]);

  return (
    <div className="relative w-full h-24 flex items-center justify-center">
      {isActive ? (
        <canvas
          ref={canvasRef}
          width={600}
          height={96}
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gray-300 rounded-full transition-all duration-300"
              style={{ height: '8px' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AssistantAvatarProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function AssistantAvatar({ state }: AssistantAvatarProps) {
  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          color: 'from-orange-500 to-orange-600',
          icon: <Mic className="w-8 h-8 text-white" />,
          pulse: true,
          glow: 'shadow-orange-500/50',
        };
      case 'thinking':
        return {
          color: 'from-blue-500 to-purple-500',
          icon: (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          ),
          pulse: false,
          glow: 'shadow-blue-500/50',
        };
      case 'speaking':
        return {
          color: 'from-blue-500 to-blue-600',
          icon: (
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full bg-white opacity-80 animate-ping" />
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          ),
          pulse: true,
          glow: 'shadow-blue-500/50',
        };
      default:
        return {
          color: 'from-gray-400 to-gray-500',
          icon: <div className="w-4 h-4 bg-white rounded-full" />,
          pulse: false,
          glow: 'shadow-gray-500/30',
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className="relative flex items-center justify-center">
      {/* Cercles de pulse */}
      {config.pulse && (
        <>
          <div className={`absolute w-32 h-32 rounded-full bg-gradient-to-br ${config.color} opacity-20 animate-ping`} />
          <div className={`absolute w-28 h-28 rounded-full bg-gradient-to-br ${config.color} opacity-30 animate-pulse`} />
        </>
      )}
      
      {/* Avatar principal */}
      <div
        className={`
          relative w-24 h-24 rounded-full 
          bg-gradient-to-br ${config.color}
          flex items-center justify-center
          shadow-2xl ${config.glow}
          transition-all duration-300
          ${config.pulse ? 'scale-110' : 'scale-100'}
        `}
      >
        {config.icon}
      </div>

      {/* Particules flottantes */}
      {state === 'speaking' && (
        <div className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-50"
              style={{
                top: '50%',
                left: '50%',
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
                transform: `rotate(${i * 45}deg) translateX(40px)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface VoiceStatusBadgeProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function VoiceStatusBadge({ state }: VoiceStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'listening':
        return {
          text: 'Écoute en cours...',
          color: 'bg-orange-500',
          icon: '🎤',
        };
      case 'thinking':
        return {
          text: 'Je réfléchis...',
          color: 'bg-purple-500',
          icon: '🤔',
        };
      case 'speaking':
        return {
          text: 'Je parle...',
          color: 'bg-blue-500',
          icon: '💬',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  return (
    <div className="flex items-center justify-center">
      <div
        className={`
          ${config.color} text-white px-4 py-2 rounded-full
          shadow-lg backdrop-blur-sm
          flex items-center space-x-2
          animate-slide-up
        `}
      >
        <span className="text-lg animate-bounce">{config.icon}</span>
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </div>
  );
}
