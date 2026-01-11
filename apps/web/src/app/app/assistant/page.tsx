'use client';

/**
 * AI Assistant Page - Premium Streaming Experience
 *
 * Chat interface with real-time streaming responses, professional markdown
 * rendering, and enhanced progress indicators.
 *
 * Integrates with zuclubit-bot-helper multi-provider LLM service.
 *
 * @module app/app/assistant/page
 * @version 3.0.0 - Streaming + Markdown + Enhanced UX
 */

import * as React from 'react';
import {
  AlertCircle,
  Bot,
  Database,
  History,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  User,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIHealth, useCrmContext, type AIChatMessage } from '@/lib/ai-assistant';
import { useStreamingAssistant, type CrmContextInfo } from '@/lib/ai-assistant/streaming';
import { cn } from '@/lib/utils';

import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ConversationHistorySidebar } from './components/ConversationHistorySidebar';
import { ToolResultsDisplay } from './components/ToolResultsDisplay';

// ============================================
// Types
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

type StreamingStatus = 'idle' | 'thinking' | 'searching' | 'analyzing' | 'writing' | 'executing';

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
// Streaming Status Indicator
// ============================================

interface StatusIndicatorProps {
  status: StreamingStatus;
  isStreaming: boolean;
}

function StatusIndicator({ status, isStreaming }: StatusIndicatorProps) {
  const statusConfig = {
    idle: { icon: Sparkles, text: '', color: '' },
    thinking: { icon: Sparkles, text: 'Pensando...', color: 'text-purple-400' },
    searching: { icon: Search, text: 'Buscando datos...', color: 'text-blue-400' },
    analyzing: { icon: Database, text: 'Analizando información...', color: 'text-emerald-400' },
    executing: { icon: Zap, text: 'Ejecutando acciones CRM...', color: 'text-amber-400' },
    writing: { icon: MessageSquare, text: 'Escribiendo respuesta...', color: 'text-[var(--tenant-primary)]' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'idle' || !isStreaming) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full animate-in fade-in">
      <Icon className={cn('h-3.5 w-3.5 animate-pulse', config.color)} />
      <span className={cn('text-xs font-medium', config.color)}>{config.text}</span>
    </div>
  );
}

// ============================================
// Types for Suggested Actions
// ============================================

interface SuggestedActionItem {
  label: string;
  prompt: string;
  icon: string;
}

// ============================================
// Message Bubble Component
// ============================================

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showCursor = isLatest && message.isStreaming && message.content.length > 0;
  const isEmptyStreaming = isLatest && message.isStreaming && message.content.length === 0;

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
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-md',
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
          'flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3',
          isUser
            ? 'bg-[var(--tenant-primary)] text-white'
            : 'bg-card border border-border shadow-sm'
        )}
      >
        {isEmptyStreaming ? (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[var(--tenant-primary)] rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-[var(--tenant-primary)] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-[var(--tenant-primary)] rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} isStreaming={showCursor} />
        )}

        {/* Timestamp */}
        {!isEmptyStreaming && (
          <span
            className={cn(
              'text-[10px] mt-1',
              isUser ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {message.timestamp.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  onSuggest: (prompt: string) => void;
  suggestedActions: SuggestedActionItem[];
  hasContext?: boolean;
}

function EmptyState({ onSuggest, suggestedActions, hasContext }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)] blur-3xl opacity-20 rounded-full scale-150" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)] shadow-xl">
          <Bot className="h-12 w-12 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Asistente IA</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Tu asistente personal de CRM con respuestas en <span className="text-[var(--tenant-primary)] font-medium">tiempo real</span>.
        {hasContext ? (
          <span className="block mt-1 text-[var(--tenant-primary)]">
            Puedo ayudarte con acciones relacionadas a la página actual.
          </span>
        ) : (
          ' Gestiona leads, tareas, oportunidades y más con lenguaje natural.'
        )}
      </p>

      {/* Suggested Actions */}
      <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
        {suggestedActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-4 px-4 text-left justify-start hover:bg-[var(--tenant-primary)]/10 hover:border-[var(--tenant-primary)]/40 transition-all group"
            onClick={() => onSuggest(action.prompt)}
          >
            <span className="text-xl mr-2 group-hover:scale-110 transition-transform">{action.icon}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Features */}
      <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Respuestas instantáneas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-emerald-400" />
          <span>Datos en tiempo real</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function AssistantPage() {
  const [input, setInput] = React.useState('');
  const [streamingStatus, setStreamingStatus] = React.useState<StreamingStatus>('idle');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // CRM Context - detects current page/entity
  const crmContext = useCrmContext();

  // AI Hooks - integrate with bot-helper backend
  const { data: health, isLoading: healthLoading } = useAIHealth();
  const {
    messages: aiMessages,
    conversationId,
    isLoading,
    isStreaming,
    isExecutingTools,
    isLoadingConversation,
    error,
    pendingConfirmation,
    executedActions,
    sendMessage,
    confirmAction,
    startNewConversation,
    cancelStream,
    loadConversation,
  } = useStreamingAssistant();

  // Convert AI messages to local format
  const messages: Message[] = React.useMemo(() => {
    return aiMessages.map((msg, idx) => ({
      id: `${msg.role}-${idx}`,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      isStreaming: isStreaming && idx === aiMessages.length - 1 && msg.role === 'assistant',
    }));
  }, [aiMessages, isStreaming]);

  // Update streaming status based on content and tool execution
  React.useEffect(() => {
    if (!isLoading && !isStreaming && !isExecutingTools) {
      setStreamingStatus('idle');
      return;
    }

    // Check if executing tools
    if (isExecutingTools) {
      setStreamingStatus('executing');
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';

    if (content.length === 0) {
      setStreamingStatus('thinking');
    } else if (content.length < 50) {
      setStreamingStatus('analyzing');
    } else {
      setStreamingStatus('writing');
    }
  }, [isLoading, isStreaming, isExecutingTools, messages]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build context info for AI
  const buildContextInfo = React.useCallback((): CrmContextInfo | undefined => {
    if (!crmContext.hasEntityContext) return undefined;

    const entity = crmContext.entity;
    const contextInfo: CrmContextInfo = {
      contextPrompt: crmContext.contextPrompt,
    };

    // Map entity type to expected format
    if (entity.type && ['lead', 'customer', 'opportunity', 'task', 'quote'].includes(entity.type)) {
      contextInfo.entityType = entity.type as CrmContextInfo['entityType'];
    }

    if (entity.id) {
      contextInfo.entityId = entity.id;
    }

    return contextInfo;
  }, [crmContext]);

  const handleSend = React.useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setStreamingStatus('thinking');

    try {
      const contextInfo = buildContextInfo();
      await sendMessage(text, contextInfo);
    } catch (err) {
      console.error('Failed to send message:', err);
      setStreamingStatus('idle');
    }
  }, [input, isLoading, sendMessage, buildContextInfo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleNewChat = () => {
    startNewConversation();
    setStreamingStatus('idle');
    inputRef.current?.focus();
  };

  const handleConfirm = React.useCallback(() => {
    void confirmAction('confirm');
  }, [confirmAction]);

  const handleCancel = React.useCallback(() => {
    void confirmAction('cancel');
  }, [confirmAction]);

  const handleStopStreaming = () => {
    cancelStream();
    setStreamingStatus('idle');
  };

  // Service health status
  const isHealthy = health?.status === 'healthy' || health?.status === 'degraded';
  const isDegraded = health?.status === 'degraded';

  // Handle conversation selection from sidebar
  const handleSelectConversation = React.useCallback(
    async (id: string) => {
      await loadConversation(id);
    },
    [loadConversation]
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height,64px)-var(--bottom-bar-height,0px))]">
      {/* Conversation History Sidebar */}
      <ConversationHistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar button */}
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1"
                onClick={() => setSidebarOpen(true)}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)] shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-lg font-semibold">Asistente IA</h1>
                <p className="text-xs text-muted-foreground">
                  Respuestas en tiempo real
                </p>
              </div>
              {/* Service Status */}
              {healthLoading ? (
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">
                  <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                  Conectando
                </Badge>
              ) : isDegraded ? (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px]">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                  Degradado
                </Badge>
              ) : isHealthy ? (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px]">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                  En línea
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px]">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive mr-1.5" />
                  Sin conexión
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva</span>
            </Button>
          </div>
        </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState
            onSuggest={(prompt) => handleSend(prompt)}
            suggestedActions={crmContext.suggestedActions}
            hasContext={crmContext.hasEntityContext}
          />
        ) : (
          <div className="space-y-4 pb-4 max-w-4xl mx-auto">
            {messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLatest={idx === messages.length - 1}
              />
            ))}

            {/* Tool Execution Results */}
            {(executedActions.length > 0 || isExecutingTools) && (
              <ToolResultsDisplay
                executedActions={executedActions.map((action) => ({
                  sequence: parseInt(action.id, 10) || 0,
                  toolName: action.name,
                  parameters: action.parameters,
                  success: action.status === 'success',
                  result: action.result,
                  error: action.error,
                  executionTimeMs: action.executionTimeMs || 0,
                }))}
                isExecuting={isExecutingTools}
              />
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

      {/* Streaming Status */}
      {(isLoading || isStreaming) && (
        <div className="flex justify-center py-2">
          <StatusIndicator status={streamingStatus} isStreaming={isLoading || isStreaming} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            disabled={isLoading}
            className="flex-1"
          />
          {isStreaming ? (
            <Button
              onClick={handleStopStreaming}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
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
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Presiona Enter para enviar • El asistente puede cometer errores
        </p>
      </div>

      {/* Loading Conversation Overlay */}
      {isLoadingConversation && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--tenant-primary)]" />
            <p className="text-sm text-muted-foreground">Cargando conversación...</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
