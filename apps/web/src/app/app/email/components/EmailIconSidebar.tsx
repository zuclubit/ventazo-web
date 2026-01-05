'use client';

/**
 * EmailIconSidebar Component
 *
 * Minimal vertical sidebar with icon-only navigation.
 * Follows the modern email client design pattern.
 *
 * Features:
 * - User avatar at top
 * - Icon-only folder navigation
 * - Tooltip labels on hover
 * - Unread count badges
 * - Dynamic theming support
 */

import * as React from 'react';
import {
  Archive,
  CheckCircle2,
  FileText,
  Inbox,
  Send,
  Star,
  Trash2,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EmailFolder, EmailStats, EmailAccount } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailIconSidebarProps {
  /** Current selected folder */
  currentFolder: EmailFolder;
  /** Handler for folder change */
  onFolderChange: (folder: EmailFolder) => void;
  /** Email statistics */
  stats?: EmailStats | null;
  /** Connected accounts */
  accounts?: EmailAccount[];
  /** User name for avatar fallback */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Folder Configuration
// ============================================

interface FolderConfig {
  icon: React.ElementType;
  label: string;
  showBadge?: boolean;
}

const FOLDER_CONFIG: Record<EmailFolder, FolderConfig> = {
  inbox: { icon: Inbox, label: 'Bandeja de entrada', showBadge: true },
  sent: { icon: Send, label: 'Enviados' },
  drafts: { icon: FileText, label: 'Borradores', showBadge: true },
  starred: { icon: Star, label: 'Destacados' },
  archive: { icon: Archive, label: 'Archivo' },
  trash: { icon: Trash2, label: 'Papelera' },
};

const MAIN_FOLDERS: EmailFolder[] = ['inbox', 'sent', 'drafts', 'trash'];

// ============================================
// Component
// ============================================

export function EmailIconSidebar({
  currentFolder,
  onFolderChange,
  stats,
  accounts = [],
  userName = 'User',
  userAvatar,
  className,
}: EmailIconSidebarProps) {
  // Get unread count for a folder
  const getUnreadCount = (folder: EmailFolder): number => {
    if (!stats?.folderStats) return 0;
    const folderStats = stats.folderStats.find((f) => f.folder === folder);
    return folderStats?.unread ?? 0;
  };

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get default account email for avatar
  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex flex-col items-center py-4 h-full',
          'bg-gradient-to-b from-[var(--email-icon-sidebar-bg)] to-[var(--email-icon-sidebar-bg-end)]',
          'border-r border-[var(--email-surface-border)]',
          'w-[72px]',
          className
        )}
      >
        {/* User Avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mb-6 relative group">
              <Avatar className="h-11 w-11 ring-2 ring-white/10 transition-all group-hover:ring-[var(--tenant-primary)]/30">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)] text-white font-medium text-sm">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--email-icon-sidebar-bg)]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[var(--email-tooltip-bg)] text-white border-0">
            <p className="font-medium">{userName}</p>
            {defaultAccount && (
              <p className="text-xs text-white/70">{defaultAccount.email}</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Folder Navigation */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {MAIN_FOLDERS.map((folder) => {
            const config = FOLDER_CONFIG[folder];
            const Icon = config.icon;
            const isActive = currentFolder === folder;
            const unreadCount = config.showBadge ? getUnreadCount(folder) : 0;

            return (
              <Tooltip key={folder}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onFolderChange(folder)}
                    className={cn(
                      'relative flex items-center justify-center',
                      'h-11 w-11 rounded-xl',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-white/15 text-white shadow-lg shadow-white/5'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-[var(--tenant-accent)]')} />

                    {/* Unread Badge */}
                    {unreadCount > 0 && (
                      <span
                        className={cn(
                          'absolute -top-0.5 -right-0.5',
                          'min-w-[18px] h-[18px] px-1',
                          'flex items-center justify-center',
                          'text-[10px] font-semibold text-white',
                          'bg-[var(--tenant-primary)] rounded-full',
                          'shadow-sm shadow-[var(--tenant-primary)]/30'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[var(--email-tooltip-bg)] text-white border-0">
                  <p>{config.label}</p>
                  {unreadCount > 0 && (
                    <p className="text-xs text-white/70">{unreadCount} sin leer</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Archive/Trash at bottom */}
        <div className="flex flex-col items-center gap-1 mt-auto pt-4 border-t border-white/10">
          {(['archive'] as EmailFolder[]).map((folder) => {
            const config = FOLDER_CONFIG[folder];
            const Icon = config.icon;
            const isActive = currentFolder === folder;

            return (
              <Tooltip key={folder}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onFolderChange(folder)}
                    className={cn(
                      'flex items-center justify-center',
                      'h-10 w-10 rounded-xl',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[var(--email-tooltip-bg)] text-white border-0">
                  {config.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EmailIconSidebar;
