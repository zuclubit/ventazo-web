'use client';

/**
 * ChatMessage Component
 *
 * Individual chat message bubble for the AI Assistant.
 * Supports user and assistant messages with different styling.
 *
 * @module app/assistant/components/ChatMessage
 */

import * as React from 'react';

import { Bot, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import type { AIChatMessage } from '@/lib/ai-assistant';

// ============================================
// Types
// ============================================

interface ChatMessageProps {
  message: AIChatMessage;
  isLoading?: boolean;
}

// ============================================
// Main Component
// ============================================

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Don't render system messages
  if (isSystem) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <Avatar
        className={cn(
          'h-8 w-8 shrink-0',
          isUser
            ? 'bg-[var(--tenant-primary)]/20 border border-[var(--tenant-primary)]/30'
            : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30'
        )}
      >
        <AvatarFallback
          className={cn(
            'text-xs',
            isUser ? 'text-[var(--tenant-primary)]' : 'text-purple-400'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          'backdrop-blur-sm',
          isUser
            ? 'bg-[var(--tenant-primary)]/20 border border-[var(--tenant-primary)]/30 text-foreground'
            : 'bg-white/[0.05] border border-white/[0.08] text-foreground'
        )}
      >
        {/* Content */}
        {isLoading ? (
          <div className="flex items-center gap-1">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && !isLoading && (
          <div
            className={cn(
              'text-[10px] mt-1.5 opacity-50',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

ChatMessage.displayName = 'ChatMessage';
