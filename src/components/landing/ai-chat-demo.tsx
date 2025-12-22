'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import Image from 'next/image';

import {
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * AI Chat Demo Component
 *
 * Following Ventazo Design System v1.0:
 * - Teal Base: #0F766E
 * - Teal Profundo: #0A2540
 * - Teal Luminoso: #14B8A6
 * - Coral Elevation: #F97316
 * - Airy spacing (8, 12, 16, 24px scale)
 * - Soft shadows, rounded borders, tech-friendly aesthetic
 */

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  typing?: boolean;
  metrics?: {
    icon: React.ElementType;
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  actions?: {
    label: string;
    primary?: boolean;
  }[];
}

// Demo conversations showcasing AI capabilities with LATAM context
const demoConversations: ChatMessage[][] = [
  // Scenario 1: Lead Scoring
  [
    {
      id: '1a',
      type: 'user',
      content: 'Analiza el lead de María García, CEO de TechCorp. Tiene 12 emails abiertos y pidió demo.',
    },
    {
      id: '1b',
      type: 'ai',
      content: '',
      typing: true,
    },
    {
      id: '1c',
      type: 'ai',
      content: 'Lead de alta prioridad detectado. María tiene perfil ejecutivo con engagement excepcional. Recomiendo contacto inmediato.',
      metrics: [
        { icon: Gauge, label: 'Score', value: '92', trend: 'up' },
        { icon: TrendingUp, label: 'Cierre', value: '87%', trend: 'up' },
        { icon: Zap, label: 'Urgencia', value: 'Alta', trend: 'neutral' },
      ],
      actions: [
        { label: 'Agendar llamada', primary: true },
        { label: 'Ver perfil' },
      ],
    },
  ],
  // Scenario 2: Email Generation
  [
    {
      id: '2a',
      type: 'user',
      content: 'Genera un email de seguimiento para el prospecto que preguntó sobre precios.',
    },
    {
      id: '2b',
      type: 'ai',
      content: '',
      typing: true,
    },
    {
      id: '2c',
      type: 'ai',
      content: 'Email listo. Tono profesional con propuesta de valor clara y llamada a la acción para agendar demo personalizada.',
      metrics: [
        { icon: Mail, label: 'Tono', value: 'Pro', trend: 'neutral' },
        { icon: Sparkles, label: 'Personal', value: '95%', trend: 'up' },
        { icon: CheckCircle2, label: 'CTA', value: 'Incluido', trend: 'neutral' },
      ],
      actions: [
        { label: 'Enviar ahora', primary: true },
        { label: 'Editar' },
      ],
    },
  ],
  // Scenario 3: Sentiment Analysis
  [
    {
      id: '3a',
      type: 'user',
      content: '¿Cuál es el sentimiento en las conversaciones con ACME Corp?',
    },
    {
      id: '3b',
      type: 'ai',
      content: '',
      typing: true,
    },
    {
      id: '3c',
      type: 'ai',
      content: 'Sentimiento positivo con tendencia ascendente. El cliente muestra interés pero menciona preocupación por timeline de implementación.',
      metrics: [
        { icon: MessageSquare, label: 'Sentimiento', value: '+82%', trend: 'up' },
        { icon: TrendingUp, label: 'Tendencia', value: 'Subiendo', trend: 'up' },
        { icon: Zap, label: 'Señal', value: 'Timeline', trend: 'neutral' },
      ],
      actions: [
        { label: 'Ver análisis', primary: true },
        { label: 'Respuesta IA' },
      ],
    },
  ],
  // Scenario 4: Revenue Forecast
  [
    {
      id: '4a',
      type: 'user',
      content: '¿Cómo va el forecast de ventas para este trimestre?',
    },
    {
      id: '4b',
      type: 'ai',
      content: '',
      typing: true,
    },
    {
      id: '4c',
      type: 'ai',
      content: 'Pipeline saludable. Proyectamos $1.2M para Q1 con alta confianza. 3 oportunidades críticas requieren seguimiento esta semana.',
      metrics: [
        { icon: TrendingUp, label: 'Forecast', value: '$1.2M', trend: 'up' },
        { icon: Gauge, label: 'Confianza', value: '92%', trend: 'up' },
        { icon: Zap, label: 'Críticos', value: '3', trend: 'neutral' },
      ],
      actions: [
        { label: 'Ver pipeline', primary: true },
        { label: 'Alertas' },
      ],
    },
  ],
];

export function AIChatDemo() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Typing animation effect - smooth and natural
  const typeText = useCallback((text: string, onComplete: () => void) => {
    let index = 0;
    setTypingText('');
    setIsTyping(true);

    const typeChar = () => {
      if (index < text.length) {
        setTypingText(text.slice(0, index + 1));
        index++;
        timeoutRef.current = setTimeout(typeChar, 20 + Math.random() * 10);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    timeoutRef.current = setTimeout(typeChar, 80);
  }, []);

  // Show messages one by one with premium animations
  const showScenario = useCallback((scenarioIndex: number) => {
    const scenario = demoConversations[scenarioIndex];
    if (!scenario) return;

    let messageIndex = 0;
    setVisibleMessages([]);
    setTypingText('');

    const showNextMessage = () => {
      if (messageIndex < scenario.length) {
        const message = scenario[messageIndex];
        if (!message) {
          messageIndex++;
          showNextMessage();
          return;
        }

        if (message.typing) {
          const typingMessage: ChatMessage = { ...message, content: '' };
          setVisibleMessages(prev => [...prev, typingMessage]);
          timeoutRef.current = setTimeout(() => {
            setVisibleMessages(prev => prev.filter(m => m.id !== message.id));
            messageIndex++;
            showNextMessage();
          }, 1000);
        } else if (message.type === 'ai' && messageIndex > 0) {
          const aiMessage: ChatMessage = { ...message, content: '' };
          setVisibleMessages(prev => [...prev, aiMessage]);
          typeText(message.content, () => {
            setVisibleMessages(prev =>
              prev.map(m => m.id === message.id ? message : m)
            );
            messageIndex++;
            timeoutRef.current = setTimeout(showNextMessage, 600);
          });
        } else {
          setVisibleMessages(prev => [...prev, message]);
          messageIndex++;
          timeoutRef.current = setTimeout(showNextMessage, 800);
        }
      } else {
        timeoutRef.current = setTimeout(() => {
          setCurrentScenario((prev) => (prev + 1) % demoConversations.length);
        }, 4500);
      }
    };

    showNextMessage();
  }, [typeText]);

  useEffect(() => {
    showScenario(currentScenario);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentScenario, showScenario]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages, typingText]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Ambient glow behind chat - Ventazo style */}
      <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-br from-ventazo-500/20 via-transparent to-coral-500/10 blur-2xl" />

      {/* Chat Window - Premium card with Ventazo palette */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A2540] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)]">

        {/* Header - Ventazo gradient accent */}
        <div className="relative border-b border-white/[0.06] bg-gradient-to-r from-[#0F766E]/20 to-[#14B8A6]/10 px-6 py-5">
          {/* Subtle top glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ventazo-400/30 to-transparent" />

          <div className="flex items-center gap-4">
            {/* Bot Avatar - AI Assistant Image */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] shadow-lg shadow-ventazo-600/25">
                <Image
                  alt="Ventazo AI"
                  className="h-full w-full object-cover"
                  height={48}
                  src="/images/ai/ai-assistant.png"
                  width={48}
                />
              </div>
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-[#0A2540] bg-emerald-400" />
            </div>

            <div className="flex-1">
              <h4 className="font-semibold tracking-tight text-white">Ventazo AI</h4>
              <p className="text-[13px] text-white/40">Asistente de ventas inteligente</p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400">Activo</span>
            </div>
          </div>
        </div>

        {/* Messages Container - Airy spacing */}
        <div
          ref={chatContainerRef}
          className="h-[340px] space-y-5 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5"
        >
          {visibleMessages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 animate-fade-in-up',
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-[#F97316]/20 to-[#FB923C]/10'
                    : 'bg-gradient-to-br from-[#0F766E]/20 to-[#14B8A6]/10'
                )}
              >
                {message.type === 'user' ? (
                  <User className="h-4 w-4 text-[#FB923C]" strokeWidth={2} />
                ) : (
                  <Sparkles className="h-4 w-4 text-[#14B8A6]" strokeWidth={2} />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3',
                  message.type === 'user'
                    ? 'rounded-br-lg bg-gradient-to-br from-[#F97316]/15 to-[#FB923C]/10 text-white'
                    : 'rounded-bl-lg bg-white/[0.04] text-white/90'
                )}
              >
                {/* Typing indicator or content */}
                {message.content === '' && message.type === 'ai' ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#14B8A6] [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#14B8A6] [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#14B8A6] [animation-delay:300ms]" />
                  </div>
                ) : (
                  <>
                    <p className="text-[14px] leading-relaxed">
                      {message.id === visibleMessages[visibleMessages.length - 1]?.id &&
                       message.type === 'ai' &&
                       isTyping
                        ? typingText
                        : message.content}
                      {message.id === visibleMessages[visibleMessages.length - 1]?.id &&
                       message.type === 'ai' &&
                       isTyping && (
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#14B8A6]" />
                      )}
                    </p>

                    {/* Metrics badges - Ventazo style */}
                    {message.metrics && !isTyping && message.content !== '' && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.metrics.map((metric, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2"
                          >
                            <metric.icon
                              className={cn(
                                'h-3.5 w-3.5',
                                metric.trend === 'up' ? 'text-emerald-400' : 'text-[#14B8A6]'
                              )}
                              strokeWidth={2}
                            />
                            <span className="text-[11px] text-white/40">{metric.label}</span>
                            <span className={cn(
                              'text-[12px] font-semibold',
                              metric.trend === 'up' ? 'text-emerald-400' : 'text-white'
                            )}>
                              {metric.value}
                            </span>
                            {metric.trend === 'up' && (
                              <ArrowUpRight className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons - Ventazo CTA style */}
                    {message.actions && !isTyping && message.content !== '' && (
                      <div className="mt-4 flex gap-2">
                        {message.actions.map((action, i) => (
                          <button
                            key={i}
                            className={cn(
                              'rounded-xl px-4 py-2 text-[12px] font-medium transition-all',
                              action.primary
                                ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-lg shadow-ventazo-600/20 hover:shadow-xl hover:shadow-ventazo-500/25'
                                : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white'
                            )}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area - Decorative */}
        <div className="border-t border-white/[0.06] bg-[#071B2F] p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl bg-white/[0.04] px-4 py-3.5 text-[14px] text-white/25">
              Escribe tu pregunta...
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-lg shadow-ventazo-600/25 transition-transform hover:scale-105 active:scale-95">
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Scenario navigation dots */}
      <div className="mt-6 flex justify-center gap-2">
        {demoConversations.map((_, i) => (
          <button
            key={i}
            aria-label={`Escenario ${i + 1}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              currentScenario === i
                ? 'w-8 bg-gradient-to-r from-[#0F766E] to-[#14B8A6]'
                : 'w-2 bg-white/15 hover:bg-white/25'
            )}
            onClick={() => setCurrentScenario(i)}
          />
        ))}
      </div>

      {/* Capability pills - Ventazo style */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[
          { icon: Gauge, label: 'Lead Scoring', color: 'from-[#0F766E] to-[#14B8A6]' },
          { icon: Mail, label: 'Emails IA', color: 'from-[#F97316] to-[#FB923C]' },
          { icon: MessageSquare, label: 'Análisis', color: 'from-[#0F766E] to-[#14B8A6]' },
          { icon: TrendingUp, label: 'Forecast', color: 'from-[#F97316] to-[#FB923C]' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2"
          >
            <div className={cn('flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br', item.color)}>
              <item.icon className="h-3 w-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-[12px] font-medium text-white/50">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
