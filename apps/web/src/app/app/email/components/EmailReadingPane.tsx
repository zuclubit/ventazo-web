'use client';

/**
 * EmailReadingPane Component
 *
 * Standard email reading pane following Gmail/Outlook best practices.
 * Based on research from:
 * - Gmail Preview Pane patterns
 * - Microsoft Outlook Reading Pane
 * - Master-Detail layout standards
 *
 * Structure:
 * 1. Toolbar Header: Back, Reply count, Forward, Star, More actions
 * 2. Sender Info: Avatar, Name, Email, Recipient
 * 3. Email Content: Scrollable HTML content
 * 4. Floating Reply Button: Quick action FAB
 *
 * v2.0 - Color Intelligence Integration
 * - HCT-based avatar color generation via getAvatarColor
 * - APCA-validated semantic colors via useSemanticColors
 * - Perceptually uniform color calculations
 */

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  MoreHorizontal,
  Trash2,
  Archive,
  Mail,
  MailOpen,
  Printer,
  Download,
  Flag,
  ChevronDown,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Email } from '@/lib/emails';
import { getAvatarColor, getInitials as getAvatarInitials, useSemanticColors, type SemanticColors } from '../hooks';

// ============================================
// Types
// ============================================

export interface EmailReadingPaneProps {
  /** Email to display */
  email: Email | null;
  /** Handler for back/close action */
  onBack?: () => void;
  /** Handler for reply */
  onReply?: (email: Email) => void;
  /** Handler for reply all */
  onReplyAll?: (email: Email) => void;
  /** Handler for forward */
  onForward?: (email: Email) => void;
  /** Handler for star toggle */
  onToggleStar?: (email: Email) => void;
  /** Handler for delete */
  onDelete?: (email: Email) => void;
  /** Handler for archive */
  onArchive?: (email: Email) => void;
  /** Handler for mark as read/unread */
  onToggleRead?: (email: Email) => void;
  /** Thread count (for reply indicator) */
  threadCount?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return getAvatarInitials(email || 'U');
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

// ============================================
// Sub-Components
// ============================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'default' | 'destructive';
  /** Semantic colors from Color Intelligence */
  semanticColors?: SemanticColors;
  /** Custom active color (hex) */
  activeColor?: string;
}

function ToolbarButton({ icon, label, onClick, active, variant, semanticColors, activeColor }: ToolbarButtonProps) {
  // Use Color Intelligence semantic colors when available
  const activeStyle = React.useMemo(() => {
    if (!active) return {};
    if (activeColor) return { color: activeColor };
    if (semanticColors) return { color: semanticColors.star.color };
    return {};
  }, [active, activeColor, semanticColors]);

  const destructiveStyle = React.useMemo(() => {
    if (variant !== 'destructive') return {};
    if (semanticColors) {
      return {
        '--hover-color': semanticColors.delete.color,
        '--hover-bg': semanticColors.delete.background,
      } as React.CSSProperties;
    }
    return {};
  }, [variant, semanticColors]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
              'h-9 w-9 rounded-lg',
              'text-[var(--email-text-muted)] hover:text-[var(--email-text-primary)]',
              'hover:bg-[var(--email-surface-hover)]',
              variant === 'destructive' && !semanticColors && 'hover:text-red-400 hover:bg-red-500/10'
            )}
            style={{
              ...activeStyle,
              ...destructiveStyle,
            }}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-[var(--email-tooltip-bg)] text-[var(--email-text-primary)] border-[var(--email-surface-border)]"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Component
// ============================================

export function EmailReadingPane({
  email,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onToggleStar,
  onDelete,
  onArchive,
  onToggleRead,
  threadCount = 0,
  className,
}: EmailReadingPaneProps) {
  // Use Color Intelligence for semantic colors (APCA-validated)
  const semanticColors = useSemanticColors();

  // Empty state
  if (!email) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full',
          'bg-[var(--email-detail-bg)]',
          'text-[var(--email-text-muted)]',
          className
        )}
      >
        <Mail className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-sm">Selecciona un correo para leerlo</p>
      </div>
    );
  }

  const displayDate = email.receivedAt || email.sentAt || email.createdAt;
  // Use Color Intelligence for HCT-based avatar colors
  const avatarColorInfo = getAvatarColor(email.from.email || 'unknown@email.com');
  const recipients = email.to?.map((r) => r.name || r.email).join(', ') || '';

  return (
    <div className={cn(
      'relative flex flex-col h-full overflow-hidden',
      'bg-[var(--email-detail-bg)]',
      className
    )}>
      {/* ========== TOOLBAR HEADER ========== */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-4 py-2',
          'border-b border-[var(--email-detail-border)]',
          'bg-[var(--email-detail-header-bg)]'
        )}
      >
        {/* Left: Back + Reply Count */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<ArrowLeft className="h-5 w-5" />}
            label="Volver"
            onClick={onBack}
          />
          {threadCount > 0 && (
            <span className="ml-2 text-sm text-[var(--email-text-muted)]">
              {threadCount}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<Reply className="h-5 w-5" />}
            label="Responder"
            onClick={() => onReply?.(email)}
          />
          <ToolbarButton
            icon={<Forward className="h-5 w-5" />}
            label="Reenviar"
            onClick={() => onForward?.(email)}
          />
          <ToolbarButton
            icon={
              <Star
                className={cn('h-5 w-5', email.isStarred && 'fill-current')}
                style={email.isStarred ? { color: semanticColors.star.color } : undefined}
              />
            }
            label={email.isStarred ? 'Quitar estrella' : 'Agregar estrella'}
            onClick={() => onToggleStar?.(email)}
            active={email.isStarred}
            semanticColors={semanticColors}
          />

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-lg',
                  'text-[var(--email-text-muted)] hover:text-[var(--email-text-primary)]',
                  'hover:bg-[var(--email-surface-hover)]'
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-[var(--email-surface)] border-[var(--email-surface-border)]"
            >
              <DropdownMenuItem
                onClick={() => onReplyAll?.(email)}
                className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]"
              >
                <ReplyAll className="h-4 w-4 mr-2" />
                Responder a todos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleRead?.(email)}
                className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]"
              >
                {email.isRead ? (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Marcar como no leído
                  </>
                ) : (
                  <>
                    <MailOpen className="h-4 w-4 mr-2" />
                    Marcar como leído
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]">
                <Flag className="h-4 w-4 mr-2" />
                Marcar con bandera
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--email-surface-border)]" />
              <DropdownMenuItem
                onClick={() => onArchive?.(email)}
                className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)]">
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--email-surface-border)]" />
              <DropdownMenuItem
                onClick={() => onDelete?.(email)}
                className="focus:bg-opacity-10"
                style={{
                  color: semanticColors.delete.color,
                  // @ts-expect-error - CSS custom property
                  '--tw-bg-opacity': 0.1,
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ========== EMAIL CONTENT ========== */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold text-[var(--email-text-primary)] mb-6">
            {email.subject || '(Sin asunto)'}
          </h1>

          {/* Sender Info Block */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarImage src={undefined} alt={email.from.name || email.from.email} />
              <AvatarFallback
                className="text-sm font-medium"
                style={{
                  background: avatarColorInfo.gradient,
                  color: avatarColorInfo.textColor,
                }}
              >
                {avatarColorInfo.initials || getInitials(email.from.name, email.from.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--email-text-primary)]">
                  {email.from.name || email.from.email}
                </span>
                <span className="text-sm text-[var(--email-text-muted)]">
                  &lt;{email.from.email}&gt;
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-[var(--email-text-muted)]">para</span>
                <button className="inline-flex items-center gap-1 text-sm text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)]">
                  {recipients || 'mí'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Date */}
            <span className="text-sm text-[var(--email-text-muted)] shrink-0">
              {formatEmailDate(displayDate)}
            </span>
          </div>

          {/* Email Body - Using Color Intelligence for link colors */}
          <div
            className={cn(
              'prose prose-invert max-w-none',
              'prose-headings:text-[var(--email-text-primary)]',
              'prose-p:text-[var(--email-text-secondary)]',
              'prose-a:text-[var(--email-link-color)] hover:prose-a:text-[var(--email-link-hover)]',
              'prose-strong:text-[var(--email-text-primary)]',
              'prose-img:rounded-lg'
            )}
            style={{
              // Use Color Intelligence info semantic color for links (APCA-validated)
              '--email-link-color': semanticColors.info.color,
              '--email-link-hover': semanticColors.info.hover,
            } as React.CSSProperties}
          >
            {email.bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                className="email-content"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-[var(--email-text-secondary)]">
                {email.body || email.snippet || 'Sin contenido'}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--email-detail-border)]">
              <h3 className="text-sm font-medium text-[var(--email-text-primary)] mb-3">
                Adjuntos ({email.attachments.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((attachment, index) => (
                  <button
                    key={index}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg',
                      'bg-[var(--email-surface-light)]',
                      'border border-[var(--email-surface-border)]',
                      'hover:bg-[var(--email-surface-hover)]',
                      'text-sm text-[var(--email-text-secondary)]',
                      'transition-colors'
                    )}
                  >
                    <Download className="h-4 w-4" />
                    <span className="truncate max-w-[150px]">{attachment.filename}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== FLOATING REPLY BUTTON ========== */}
      <div className="absolute bottom-6 right-6">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                onClick={() => onReply?.(email)}
                className={cn(
                  'h-14 w-14 rounded-full shadow-lg',
                  'bg-[var(--email-compose-bg)] hover:bg-[var(--email-compose-hover)]',
                  'text-white'
                )}
              >
                <Reply className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-[var(--email-tooltip-bg)] text-[var(--email-text-primary)] border-[var(--email-surface-border)]"
            >
              Responder
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default EmailReadingPane;
