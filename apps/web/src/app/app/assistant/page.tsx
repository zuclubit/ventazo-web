'use client';

/**
 * AI Assistant Page
 *
 * Chat interface for the AI Agent that helps users manage
 * leads, customers, tasks, opportunities, and quotes via natural language.
 *
 * Integrates with zuclubit-bot-helper multi-provider LLM service.
 *
 * @module app/app/assistant/page
 * @version 2.0.0
 */

import * as React from 'react';
import {
  AlertCircle,
  Bot,
  History,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAIAssistant, useAIHealth, type AIChatMessage } from '@/lib/ai-assistant';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

// ============================================
// Confirmation Card Component
// ============================================

interface ConfirmationCardProps {
  action: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmationCard({
  action,
  description,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationCardProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 animate-in fade-in slide-in-from-bottom-2">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-amber-500/20 p-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h4 className="font-medium text-amber-400 text-sm">Confirmación Requerida</h4>
            <p className="text-sm font-medium mt-1">{action}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Suggested Actions
// ============================================

const SUGGESTED_ACTIONS = [
  { label: 'Ver mis leads', prompt: 'Muéstrame mis leads activos' },
  { label: 'Crear tarea', prompt: 'Crea una tarea de seguimiento para mañana' },
  { label: 'Resumen del día', prompt: '¿Cuál es el resumen de mi día?' },
  { label: 'Leads calientes', prompt: 'Muéstrame los leads con score mayor a 70' },
];

// ============================================
// Message Bubble Component
// ============================================

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-[var(--tenant-primary)]'
            : 'bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3',
          isUser
            ? 'bg-[var(--tenant-primary)] text-white'
            : 'bg-card border border-border'
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Pensando...</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        <span
          className={cn(
            'text-[10px]',
            isUser ? 'text-white/70' : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState({ onSuggest }: { onSuggest: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)] blur-2xl opacity-20 rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]">
          <Bot className="h-10 w-10 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Asistente IA</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Soy tu asistente de CRM. Puedo ayudarte a gestionar leads, crear tareas,
        consultar oportunidades y mucho más. ¿En qué puedo ayudarte?
      </p>

      {/* Suggested Actions */}
      <div className="grid grid-cols-2 gap-2 max-w-md w-full">
        {SUGGESTED_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 px-4 text-left justify-start hover:bg-[var(--tenant-primary)]/10 hover:border-[var(--tenant-primary)]/30 transition-colors"
            onClick={() => onSuggest(action.prompt)}
          >
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function AssistantPage() {
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // AI Hooks - integrate with bot-helper backend
  const { data: health, isLoading: healthLoading } = useAIHealth();
  const {
    messages: aiMessages,
    isLoading,
    error,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    startNewConversation,
    clearConversation,
  } = useAIAssistant();

  // Convert AI messages to local format
  const messages: Message[] = React.useMemo(() => {
    return aiMessages.map((msg, idx) => ({
      id: `${msg.role}-${idx}`,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }));
  }, [aiMessages]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = React.useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');

    try {
      await sendMessage(text);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleNewChat = () => {
    startNewConversation();
    inputRef.current?.focus();
  };

  const handleConfirm = React.useCallback(() => {
    void confirmAction('confirm');
  }, [confirmAction]);

  const handleCancel = React.useCallback(() => {
    void confirmAction('cancel');
  }, [confirmAction]);

  // Service health status
  const isHealthy = health?.status === 'healthy' || health?.status === 'degraded';
  const isDegraded = health?.status === 'degraded';

  return (
    <div className="flex h-[calc(100vh-var(--header-height,64px)-var(--bottom-bar-height,0px))] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-lg font-semibold">Asistente IA</h1>
              <p className="text-xs text-muted-foreground">
                Powered by zuclubit-bot-helper
              </p>
            </div>
            {/* Service Status */}
            {healthLoading ? (
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">
                Conectando...
              </Badge>
            ) : isDegraded ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px]">
                Degradado
              </Badge>
            ) : isHealthy ? (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px]">
                En línea
              </Badge>
            ) : (
              <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px]">
                Sin conexión
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva conversación</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState onSuggest={(prompt) => handleSend(prompt)} />
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex max-w-[80%] items-center gap-2 rounded-2xl bg-card border border-border px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}

            {/* Pending Confirmation */}
            {pendingConfirmation && (
              <ConfirmationCard
                action={pendingConfirmation.action}
                description={pendingConfirmation.description}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          El asistente puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}

