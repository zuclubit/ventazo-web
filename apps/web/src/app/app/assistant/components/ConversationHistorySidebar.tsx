'use client';

/**
 * Conversation History Sidebar
 *
 * Displays a list of past conversations with the ability to:
 * - View and select past conversations
 * - Start a new conversation
 * - Archive or delete conversations
 *
 * @module app/app/assistant/components/ConversationHistorySidebar
 */

import * as React from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAIConversations,
  useArchiveConversation,
  useDeleteConversation,
  type ConversationSummary,
} from '@/lib/ai-assistant';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ConversationHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

// ============================================
// Conversation Item Component
// ============================================

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const timeAgo = React.useMemo(() => {
    return formatDistanceToNow(new Date(conversation.updatedAt), {
      addSuffix: true,
      locale: es,
    });
  }, [conversation.updatedAt]);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
        'hover:bg-muted/50',
        isActive && 'bg-[var(--tenant-primary)]/10 border border-[var(--tenant-primary)]/30'
      )}
      onClick={onSelect}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          isActive
            ? 'bg-[var(--tenant-primary)]/20 text-[var(--tenant-primary)]'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <MessagesSquare className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isActive && 'text-[var(--tenant-primary)]'
          )}
        >
          {conversation.title || 'Conversación sin título'}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{conversation.lastMessage || 'Sin mensajes'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo}</p>
      </div>

      {/* Actions Menu */}
      <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(true);
            }}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            <Archive className="h-3.5 w-3.5 mr-2" />
            Archivar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ConversationHistorySidebar({
  isOpen,
  onToggle,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationHistorySidebarProps) {
  // Fetch conversations
  const { data, isLoading, refetch } = useAIConversations({ limit: 50 });
  const archiveMutation = useArchiveConversation();
  const deleteMutation = useDeleteConversation();

  const conversations = data?.conversations || [];

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
    void refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    void refetch();
    if (activeConversationId === id) {
      onNewConversation();
    }
  };

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute left-2 top-3 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r bg-background/50 backdrop-blur-sm transition-all duration-300',
          isOpen ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b">
          <h2 className="text-sm font-semibold">Historial</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* New Conversation Button */}
        <div className="p-3 border-b">
          <Button
            onClick={onNewConversation}
            className="w-full gap-2 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Nueva conversación
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessagesSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay conversaciones aún
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Inicia una nueva conversación con el asistente
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => onSelectConversation(conv.id)}
                  onArchive={() => handleArchive(conv.id)}
                  onDelete={() => handleDelete(conv.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with count */}
        {conversations.length > 0 && (
          <div className="px-3 py-2 border-t text-xs text-muted-foreground text-center">
            {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
    </>
  );
}
