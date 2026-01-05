'use client';

/**
 * EmailFolderNav Component
 *
 * Refined folder navigation panel positioned on the right side.
 * Clean, minimal design matching modern email clients.
 *
 * Features:
 * - Compact folder list with icons and labels
 * - Unread count badges
 * - Active folder highlight with accent color
 * - Settings access
 * - Dynamic theming
 *
 * v2.0 - Color Intelligence Integration
 * - APCA-validated semantic colors via useSemanticColors
 * - OKLCH alpha blending for hover states
 */

import * as React from 'react';
import {
  Archive,
  FileText,
  Inbox,
  Send,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EmailFolder, EmailStats } from '@/lib/emails';
import { useSemanticColors } from '../hooks';

// ============================================
// Types
// ============================================

export interface EmailFolderNavProps {
  /** Current selected folder */
  currentFolder: EmailFolder;
  /** Handler for folder change */
  onFolderChange: (folder: EmailFolder) => void;
  /** Handler for settings */
  onSettings?: () => void;
  /** Email statistics */
  stats?: EmailStats | null;
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
  starred: { icon: Star, label: 'Destacados' },
  sent: { icon: Send, label: 'Enviados' },
  drafts: { icon: FileText, label: 'Borradores', showBadge: true },
  archive: { icon: Archive, label: 'Archivo' },
  trash: { icon: Trash2, label: 'Papelera' },
};

const MAIN_FOLDERS: EmailFolder[] = ['inbox', 'starred', 'sent', 'drafts'];
const SECONDARY_FOLDERS: EmailFolder[] = ['archive', 'trash'];

// ============================================
// Component
// ============================================

export function EmailFolderNav({
  currentFolder,
  onFolderChange,
  onSettings,
  stats,
  className,
}: EmailFolderNavProps) {
  // Use Color Intelligence for APCA-validated semantic colors
  const semanticColors = useSemanticColors();

  // Get unread count for a folder
  const getUnreadCount = (folder: EmailFolder): number => {
    if (!stats?.folderStats) return 0;
    const folderStats = stats.folderStats.find((f) => f.folder === folder);
    return folderStats?.unread ?? 0;
  };

  // Render folder item
  const renderFolderItem = (folder: EmailFolder) => {
    const config = FOLDER_CONFIG[folder];
    const Icon = config.icon;
    const isActive = currentFolder === folder;
    const unreadCount = config.showBadge ? getUnreadCount(folder) : 0;

    return (
      <button
        key={folder}
        onClick={() => onFolderChange(folder)}
        className={cn(
          'group flex items-center gap-3 w-full px-3 py-2 rounded-lg',
          'text-left transition-all duration-150',
          isActive
            ? 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
            : 'text-[var(--email-nav-text)] hover:bg-[var(--email-nav-hover)]'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isActive && folder === 'starred' && 'fill-current'
          )}
          style={
            isActive && folder === 'starred'
              ? { color: semanticColors.star.color }
              : undefined
          }
        />
        <span className="flex-1 text-[13px] font-medium">{config.label}</span>
        {unreadCount > 0 && (
          <span
            className={cn(
              'min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'text-[10px] font-semibold rounded-full',
              isActive
                ? 'bg-[var(--tenant-primary)] text-white'
                : 'bg-[var(--email-nav-badge-bg)] text-[var(--email-nav-badge-text)]'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full w-[200px] shrink-0',
        'bg-[var(--email-nav-bg)]',
        'border-l border-[var(--email-nav-border)]',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--email-nav-border)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--email-nav-text-muted)]">
          Carpetas
        </h3>
      </div>

      {/* Main Folders */}
      <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {MAIN_FOLDERS.map(renderFolderItem)}

        {/* Divider */}
        <div className="my-2 mx-2 border-t border-[var(--email-nav-border)]" />

        {SECONDARY_FOLDERS.map(renderFolderItem)}
      </div>

      {/* Settings */}
      <div className="p-2 border-t border-[var(--email-nav-border)]">
        <button
          onClick={onSettings}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg',
            'text-[var(--email-nav-text-muted)]',
            'hover:bg-[var(--email-nav-hover)] hover:text-[var(--email-nav-text)]',
            'transition-colors duration-150'
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="text-[13px] font-medium">Configuración</span>
        </button>
      </div>
    </div>
  );
}

export default EmailFolderNav;
