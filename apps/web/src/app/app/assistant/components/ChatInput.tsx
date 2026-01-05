'use client';

/**
 * ChatInput Component
 *
 * Text input for sending messages to the AI Assistant.
 * Supports Enter to send and Shift+Enter for new line.
 *
 * @module app/assistant/components/ChatInput
 */

import * as React from 'react';

import { Loader2, Mic, Send, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

// ============================================
// Suggested Prompts
// ============================================

const SUGGESTED_PROMPTS = [
  { icon: Sparkles, label: 'Analizar leads', prompt: 'Analiza mis leads actuales y dame recomendaciones' },
  { icon: Sparkles, label: 'Generar email', prompt: 'Genera un email de seguimiento profesional' },
  { icon: Sparkles, label: 'Resumen del día', prompt: '¿Cuál es el resumen de actividad de hoy?' },
];

// ============================================
// Main Component
// ============================================

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Escribe tu mensaje...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = React.useCallback(() => {
    if (!message.trim() || isLoading || disabled) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isLoading, disabled, onSend]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading || disabled) return;
    onSend(prompt);
  };

  return (
    <div className="space-y-3">
      {/* Suggested Prompts */}
      {!message && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestedPrompt(item.prompt)}
              disabled={isLoading || disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'text-xs font-medium',
                'bg-[var(--tenant-primary)]/10 border border-[var(--tenant-primary)]/20',
                'text-[var(--chart-accent)]',
                'hover:bg-[var(--tenant-primary)]/20 hover:border-[var(--tenant-primary)]/30',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div
        className={cn(
          'relative flex items-end gap-2',
          'rounded-2xl',
          'bg-white/[0.03] backdrop-blur-xl',
          'border border-white/[0.08]',
          'p-2',
          'focus-within:border-[var(--tenant-primary)]/50',
          'focus-within:ring-2 focus-within:ring-[var(--tenant-primary)]/10',
          'transition-all duration-200'
        )}
      >
        {/* Voice Input Button (Future) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-[var(--chart-accent)] hover:bg-white/10"
          disabled
          title="Entrada de voz (próximamente)"
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className={cn(
            'flex-1 min-h-[40px] max-h-[200px] resize-none',
            'bg-transparent border-0 focus-visible:ring-0',
            'placeholder:text-muted-foreground/50',
            'text-sm'
          )}
          rows={1}
        />

        {/* Send Button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || isLoading || disabled}
          className={cn(
            'shrink-0 h-9 w-9 rounded-xl',
            'bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-primary-light)]',
            'hover:opacity-90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-center text-muted-foreground/50">
        Presiona Enter para enviar, Shift+Enter para nueva línea
      </p>
    </div>
  );
}

ChatInput.displayName = 'ChatInput';
