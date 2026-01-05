'use client';

/**
 * EmailSidebar Component
 *
 * Navigation sidebar for the email module.
 * Shows folders, accounts, and compose button.
 */

import * as React from 'react';
import {
  Archive,
  Edit,
  Inbox,
  Loader2,
  Mail,
  Plus,
  Send,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EmailFolder, EmailStats, EmailAccount } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailSidebarProps {
  /** Current selected folder */
  currentFolder: EmailFolder;
  /** Handler for folder change */
  onFolderChange: (folder: EmailFolder) => void;
  /** Handler for compose click */
  onCompose: () => void;
  /** Email statistics */
  stats?: EmailStats | null;
  /** Connected accounts */
  accounts?: EmailAccount[];
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Folder Configuration
// ============================================

const FOLDER_CONFIG: Record<EmailFolder, { icon: React.ReactNode; label: string }> = {
  inbox: { icon: <Inbox className="h-4 w-4" />, label: 'Bandeja de entrada' },
  sent: { icon: <Send className="h-4 w-4" />, label: 'Enviados' },
  drafts: { icon: <Edit className="h-4 w-4" />, label: 'Borradores' },
  starred: { icon: <Star className="h-4 w-4" />, label: 'Destacados' },
  archive: { icon: <Archive className="h-4 w-4" />, label: 'Archivo' },
  trash: { icon: <Trash2 className="h-4 w-4" />, label: 'Papelera' },
};

const MAIN_FOLDERS: EmailFolder[] = ['inbox', 'sent', 'drafts', 'starred'];
const SECONDARY_FOLDERS: EmailFolder[] = ['archive', 'trash'];

// ============================================
// Component
// ============================================

export function EmailSidebar({
  currentFolder,
  onFolderChange,
  onCompose,
  stats,
  accounts = [],
  isLoading = false,
  className,
}: EmailSidebarProps) {
  // Get unread count for a folder
  const getUnreadCount = (folder: EmailFolder): number => {
    if (!stats?.folderStats) return 0;
    const folderStats = stats.folderStats.find((f) => f.folder === folder);
    return folderStats?.unread ?? 0;
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r border-[var(--email-surface-border)] overflow-hidden',
        'bg-[var(--email-sidebar-bg)]',
        className
      )}
    >
      {/* Compose Button */}
      <div className="p-4">
        <Button
          onClick={onCompose}
          className={cn(
            'w-full gap-2',
            'bg-[var(--email-compose-bg)] hover:bg-[var(--email-compose-hover)]',
            'text-[var(--email-compose-text)]',
            'shadow-lg shadow-[var(--email-compose-shadow)]'
          )}
        >
          <Plus className="h-4 w-4" />
          Redactar
        </Button>
      </div>

      <Separator className="bg-[var(--email-surface-border)]" />

      {/* Folders */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Main Folders */}
          {MAIN_FOLDERS.map((folder) => {
            const config = FOLDER_CONFIG[folder];
            const unread = getUnreadCount(folder);
            const isActive = currentFolder === folder;

            return (
              <button
                key={folder}
                onClick={() => onFolderChange(folder)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'text-[var(--email-sidebar-text)]',
                  isActive
                    ? 'bg-[var(--email-sidebar-active)] text-[var(--email-sidebar-active-text)]'
                    : 'hover:bg-[var(--email-sidebar-hover)]'
                )}
              >
                <span className={cn(isActive && 'text-[var(--email-sidebar-active-text)]')}>
                  {config.icon}
                </span>
                <span className="flex-1 text-left text-sm font-medium">{config.label}</span>
                {unread > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs px-2 min-w-[1.5rem] justify-center',
                      isActive && 'bg-[var(--tenant-primary)] text-white'
                    )}
                  >
                    {unread > 99 ? '99+' : unread}
                  </Badge>
                )}
              </button>
            );
          })}

          <Separator className="my-2 bg-[var(--email-surface-border)]" />

          {/* Secondary Folders */}
          {SECONDARY_FOLDERS.map((folder) => {
            const config = FOLDER_CONFIG[folder];
            const isActive = currentFolder === folder;

            return (
              <button
                key={folder}
                onClick={() => onFolderChange(folder)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'text-[var(--email-sidebar-text-muted)]',
                  isActive
                    ? 'bg-[var(--email-sidebar-active)] text-[var(--email-sidebar-active-text)]'
                    : 'hover:bg-[var(--email-sidebar-hover)]'
                )}
              >
                {config.icon}
                <span className="flex-1 text-left text-sm">{config.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <>
          <Separator className="bg-[var(--email-surface-border)]" />
          <div className="p-3">
            <p className="text-xs text-[var(--email-sidebar-text-muted)] mb-2 px-1">Cuentas</p>
            {accounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                  'text-[var(--email-sidebar-text)]'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    account.isConnected ? 'bg-green-400' : 'bg-red-400'
                  )}
                />
                <Mail className="h-3 w-3 opacity-50" />
                <span className="truncate text-xs">{account.email}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4 text-[var(--email-sidebar-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}

export default EmailSidebar;
