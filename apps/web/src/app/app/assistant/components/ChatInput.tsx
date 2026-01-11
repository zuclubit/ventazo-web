'use client';

/**
 * Enhanced ChatInput Component
 *
 * Text input for sending messages to the AI Assistant with:
 * - Dynamic context-aware suggestions
 * - Slash command support
 * - Autocomplete dropdown
 *
 * @module app/assistant/components/ChatInput
 */

import * as React from 'react';

import {
  Loader2,
  Mic,
  Send,
  Sparkles,
  Command,
  Users,
  Target,
  CheckSquare,
  FileText,
  Building2,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Dynamic suggested prompts from CRM context */
  suggestedPrompts?: SuggestedPrompt[];
  /** Whether context is available */
  hasContext?: boolean;
}

// ============================================
// Slash Commands
// ============================================

interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ElementType;
  prompt: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/leads',
    label: 'Buscar leads',
    description: 'Buscar y listar leads',
    icon: Users,
    prompt: 'Muéstrame mis leads ',
  },
  {
    command: '/lead',
    label: 'Crear lead',
    description: 'Crear un nuevo lead',
    icon: Users,
    prompt: 'Crea un nuevo lead con nombre: ',
  },
  {
    command: '/oportunidades',
    label: 'Ver oportunidades',
    description: 'Listar oportunidades activas',
    icon: Target,
    prompt: 'Muéstrame las oportunidades activas',
  },
  {
    command: '/tarea',
    label: 'Crear tarea',
    description: 'Crear una nueva tarea',
    icon: CheckSquare,
    prompt: 'Crea una tarea para ',
  },
  {
    command: '/tareas',
    label: 'Mis tareas',
    description: 'Ver tareas pendientes',
    icon: CheckSquare,
    prompt: 'Muéstrame mis tareas pendientes de hoy',
  },
  {
    command: '/cotizar',
    label: 'Crear cotización',
    description: 'Generar una cotización',
    icon: FileText,
    prompt: 'Genera una cotización para ',
  },
  {
    command: '/clientes',
    label: 'Buscar clientes',
    description: 'Buscar en clientes',
    icon: Building2,
    prompt: 'Busca clientes que ',
  },
  {
    command: '/email',
    label: 'Redactar email',
    description: 'Generar un email profesional',
    icon: Sparkles,
    prompt: 'Redacta un email de seguimiento para ',
  },
  {
    command: '/buscar',
    label: 'Buscar en CRM',
    description: 'Búsqueda general',
    icon: Search,
    prompt: 'Busca en el CRM: ',
  },
];

// ============================================
// Icon Mapper
// ============================================

function getIconForSuggestion(icon: string): React.ElementType {
  const iconMap: Record<string, React.ElementType> = {
    '📋': Users,
    '✅': CheckSquare,
    '📊': Target,
    '🔥': Sparkles,
    '🔍': Search,
    '📝': FileText,
    '✉️': Sparkles,
    '🎯': Target,
    '📈': Target,
    '🚀': Sparkles,
    '📄': FileText,
    '📜': FileText,
    '💰': Target,
    '📅': CheckSquare,
    '👥': Users,
    '⚡': Sparkles,
    '⚠️': Sparkles,
    '➡️': Target,
    '⏰': CheckSquare,
    '↩️': Sparkles,
    '📬': Sparkles,
    '⚙️': Command,
    '🔐': Command,
    '🗓️': CheckSquare,
    '🎉': Sparkles,
    '🔮': Sparkles,
    '💵': Target,
  };
  return iconMap[icon] || Sparkles;
}

// ============================================
// Main Component
// ============================================

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Escribe tu mensaje o usa / para comandos...',
  disabled = false,
  suggestedPrompts,
  hasContext,
}: ChatInputProps) {
  const [message, setMessage] = React.useState('');
  const [showCommands, setShowCommands] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter slash commands based on input
  const filteredCommands = React.useMemo(() => {
    if (!message.startsWith('/')) return [];
    const search = message.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.command.toLowerCase().startsWith(search) ||
        cmd.label.toLowerCase().includes(search.slice(1))
    );
  }, [message]);

  // Show commands dropdown when typing /
  React.useEffect(() => {
    setShowCommands(message.startsWith('/') && filteredCommands.length > 0);
    setSelectedIndex(0);
  }, [message, filteredCommands.length]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowCommands(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = React.useCallback(() => {
    if (!message.trim() || isLoading || disabled) return;

    onSend(message.trim());
    setMessage('');
    setShowCommands(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isLoading, disabled, onSend]);

  const handleSelectCommand = React.useCallback((cmd: SlashCommand) => {
    setMessage(cmd.prompt);
    setShowCommands(false);
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showCommands) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelectCommand(filteredCommands[selectedIndex]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowCommands(false);
        }
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showCommands, selectedIndex, filteredCommands, handleSelectCommand, handleSend]
  );

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading || disabled) return;
    onSend(prompt);
  };

  // Use dynamic suggestions if available, otherwise show slash command hint
  const displaySuggestions = suggestedPrompts && suggestedPrompts.length > 0;

  return (
    <div className="space-y-3">
      {/* Suggested Prompts */}
      {!message && displaySuggestions && (
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.slice(0, 4).map((item, index) => {
            const Icon = getIconForSuggestion(item.icon);
            return (
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
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Context Indicator */}
      {hasContext && !message && (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--tenant-primary)]">
          <Sparkles className="h-3 w-3" />
          <span>Contexto de página detectado - sugerencias personalizadas</span>
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
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

        {/* Slash Commands Dropdown */}
        {showCommands && (
          <div
            ref={dropdownRef}
            className={cn(
              'absolute bottom-full left-0 right-0 mb-2',
              'rounded-xl border border-border/50',
              'bg-popover/95 backdrop-blur-xl',
              'shadow-xl',
              'overflow-hidden',
              'animate-in fade-in slide-in-from-bottom-2 duration-200',
              'z-50'
            )}
          >
            <div className="p-2">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-muted-foreground">
                <Command className="h-3 w-3" />
                <span>Comandos rápidos</span>
              </div>
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.command}
                    type="button"
                    onClick={() => handleSelectCommand(cmd)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                      'text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-[var(--tenant-primary)]/20 text-[var(--tenant-primary)]'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        index === selectedIndex
                          ? 'bg-[var(--tenant-primary)]/20'
                          : 'bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {cmd.command}
                        </span>
                        <span className="font-medium text-sm">{cmd.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {cmd.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-center text-muted-foreground/50">
        Presiona Enter para enviar • Shift+Enter para nueva línea • Escribe{' '}
        <span className="font-mono text-[var(--tenant-primary)]">/</span> para
        comandos
      </p>
    </div>
  );
}

ChatInput.displayName = 'ChatInput';
