'use client';

/**
 * EmailIconNavRight Component
 *
 * Minimal vertical icon-only navigation for the right side.
 * State-of-the-art minimalist design with subtle animations.
 *
 * Features:
 * - Icon-only folder navigation
 * - Tooltip labels on hover (appear on left)
 * - Unread count badges
 * - Settings button at bottom
 * - Dynamic theming support
 * - Glassmorphism effects
 */

import * as React from 'react';
import {
  Archive,
  FileText,
  Inbox,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EmailFolder, EmailStats } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailIconNavRightProps {
  /** Current selected folder */
  currentFolder: EmailFolder;
  /** Handler for folder change */
  onFolderChange: (folder: EmailFolder) => void;
  /** Handler for settings click */
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
  id: EmailFolder;
  icon: React.ElementType;
  label: string;
  showBadge?: boolean;
}

const FOLDERS: FolderConfig[] = [
  { id: 'inbox', icon: Inbox, label: 'Bandeja de entrada', showBadge: true },
  { id: 'starred', icon: Star, label: 'Destacados' },
  { id: 'drafts', icon: FileText, label: 'Borradores', showBadge: true },
  { id: 'archive', icon: Archive, label: 'Archivo' },
  { id: 'trash', icon: Trash2, label: 'Papelera' },
];

// ============================================
// Component
// ============================================

export function EmailIconNavRight({
  currentFolder,
  onFolderChange,
  onSettings,
  stats,
  className,
}: EmailIconNavRightProps) {
  // Get unread count for a folder
  const getUnreadCount = (folder: EmailFolder): number => {
    if (!stats?.folderStats) return 0;
    const folderStats = stats.folderStats.find((f) => f.folder === folder);
    return folderStats?.unread ?? 0;
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'flex flex-col items-center py-4 h-full',
          'bg-[var(--email-icon-nav-bg,rgba(15,23,42,0.6))]',
          'backdrop-blur-xl',
          'border-l border-white/[0.06]',
          'w-[56px] shrink-0',
          className
        )}
      >
        {/* Folder Navigation */}
        <nav className="flex flex-col items-center gap-0.5 flex-1">
          {FOLDERS.map((folder, index) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            const unreadCount = folder.showBadge ? getUnreadCount(folder.id) : 0;

            return (
              <React.Fragment key={folder.id}>
                {/* Separator before Archive */}
                {index === 3 && (
                  <div className="w-6 h-px bg-white/[0.08] my-2" />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onFolderChange(folder.id)}
                      className={cn(
                        'relative flex items-center justify-center',
                        'h-10 w-10 rounded-xl',
                        'transition-all duration-200 ease-out',
                        // Active state
                        isActive && [
                          'bg-white/[0.12]',
                          'text-white',
                          'shadow-[0_0_20px_rgba(255,255,255,0.05)]',
                        ],
                        // Inactive state
                        !isActive && [
                          'text-white/50',
                          'hover:text-white/80',
                          'hover:bg-white/[0.06]',
                        ]
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px]',
                          'transition-transform duration-200',
                          isActive && 'scale-105'
                        )}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />

                      {/* Unread Badge */}
                      {unreadCount > 0 && (
                        <span
                          className={cn(
                            'absolute -top-0.5 -right-0.5',
                            'min-w-[16px] h-[16px] px-1',
                            'flex items-center justify-center',
                            'text-[9px] font-bold text-white',
                            'bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
                            'rounded-full',
                            'shadow-lg shadow-[var(--tenant-primary)]/25',
                            'animate-in fade-in duration-200'
                          )}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}

                      {/* Active indicator line */}
                      {isActive && (
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2',
                            'w-[3px] h-5 rounded-r-full',
                            'bg-gradient-to-b from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
                            'shadow-[0_0_8px_var(--tenant-primary)]',
                            'animate-in slide-in-from-left duration-200'
                          )}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={8}
                    className={cn(
                      'bg-slate-900/95 backdrop-blur-sm',
                      'text-white text-xs font-medium',
                      'border border-white/10',
                      'shadow-xl shadow-black/20',
                      'px-3 py-1.5 rounded-lg'
                    )}
                  >
                    <span>{folder.label}</span>
                    {unreadCount > 0 && (
                      <span className="ml-2 text-[var(--tenant-primary)]">
                        {unreadCount}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="mt-auto pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSettings}
                className={cn(
                  'flex items-center justify-center',
                  'h-10 w-10 rounded-xl',
                  'transition-all duration-200 ease-out',
                  'text-white/40',
                  'hover:text-white/70',
                  'hover:bg-white/[0.06]',
                  'hover:rotate-45'
                )}
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              sideOffset={8}
              className={cn(
                'bg-slate-900/95 backdrop-blur-sm',
                'text-white text-xs font-medium',
                'border border-white/10',
                'shadow-xl shadow-black/20',
                'px-3 py-1.5 rounded-lg'
              )}
            >
              Configuración
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EmailIconNavRight;
