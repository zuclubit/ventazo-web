'use client';

/**
 * EmailListCompact Component
 *
 * Compact email list optimized for split view layouts.
 * Designed for narrower widths (320-450px) in master-detail patterns.
 *
 * Based on Gmail/Outlook compact view best practices:
 * - Condensed row height
 * - Avatar + Sender + Subject in compact layout
 * - Unread indicator dot
 * - Selected state with amber border
 * - Hover actions
 *
 * v2.0 - Color Intelligence Integration
 * - HCT-based avatar color generation via useAvatarColor
 * - APCA-validated semantic colors via useSemanticColors
 * - Perceptually uniform color calculations
 */

import * as React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Inbox, Mail, Star, RefreshCw } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Email, EmailFolder } from '@/lib/emails';
import { EmailCategoryBadge, parseCategoryFromLabels } from './EmailCategoryBadge';
import { getAvatarColor, getInitials as getAvatarInitials, useSemanticColors } from '../hooks';

// ============================================
// Types
// ============================================

export interface EmailListCompactProps {
  /** List of emails */
  emails: Email[];
  /** Currently selected email */
  selectedEmail?: Email | null;
  /** Current folder */
  currentFolder: EmailFolder;
  /** Handler for email selection */
  onSelectEmail: (email: Email) => void;
  /** Handler for star toggle */
  onToggleStar?: (email: Email) => void;
  /** Handler for refresh */
  onRefresh?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Refreshing state */
  isRefreshing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function formatCompactDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: es });
  }

  if (isYesterday(date)) {
    return 'Ayer';
  }

  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo < 7) {
    return format(date, 'EEE', { locale: es });
  }

  return format(date, 'd MMM', { locale: es });
}

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

// ============================================
// Sub-Components
// ============================================

interface EmailRowCompactProps {
  email: Email;
  isSelected?: boolean;
  onClick?: (email: Email) => void;
  onToggleStar?: (email: Email) => void;
  /** Semantic colors from Color Intelligence */
  semanticColors: ReturnType<typeof useSemanticColors>;
}

function EmailRowCompact({
  email,
  isSelected,
  onClick,
  onToggleStar,
  semanticColors,
}: EmailRowCompactProps) {
  const displayDate = email.receivedAt || email.sentAt || email.createdAt;
  const category = email.labels ? parseCategoryFromLabels(email.labels) : null;

  // Use Color Intelligence for avatar colors (HCT-based)
  const avatarColorInfo = React.useMemo(() => {
    return getAvatarColor(email.from.email || 'unknown@email.com');
  }, [email.from.email]);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(email);
  };

  return (
    <div
      onClick={() => onClick?.(email)}
      className={cn(
        'group flex items-start gap-3 px-4 py-3',
        'cursor-pointer transition-all duration-150',
        'border-l-[3px] border-l-transparent',
        'hover:bg-[var(--email-list-hover)]',
        // Selected state - using semantic star color for border
        isSelected && 'bg-[var(--email-list-active)]',
        // Unread state
        !email.isRead && !isSelected && 'bg-[var(--email-unread-bg)]'
      )}
      style={{
        borderLeftColor: isSelected ? semanticColors.star.color : 'transparent',
      }}
    >
      {/* Unread Dot - using Color Intelligence unread semantic color */}
      <div className="w-2 pt-3 shrink-0 flex justify-center">
        {!email.isRead && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: semanticColors.unread.color }}
          />
        )}
      </div>

      {/* Avatar - using HCT-based color from Color Intelligence */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={undefined} alt={email.from.name || email.from.email} />
        <AvatarFallback
          className="text-xs font-medium"
          style={{
            background: avatarColorInfo.gradient,
            color: avatarColorInfo.textColor,
          }}
        >
          {avatarColorInfo.initials || getInitials(email.from.name, email.from.email)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Row 1: Sender + Date */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              !email.isRead
                ? 'font-semibold text-[var(--email-text-primary)]'
                : 'font-medium text-[var(--email-text-secondary)]'
            )}
          >
            {email.from.name || email.from.email}
          </span>
          <span
            className={cn(
              'text-xs shrink-0',
              !email.isRead
                ? 'font-medium text-[var(--email-text-primary)]'
                : 'text-[var(--email-text-muted)]'
            )}
          >
            {formatCompactDate(displayDate)}
          </span>
        </div>

        {/* Row 2: Category Badge + Subject */}
        <div className="flex items-center gap-2">
          {category && <EmailCategoryBadge category={category} size="sm" />}
          <span
            className={cn(
              'text-sm truncate',
              !email.isRead
                ? 'font-medium text-[var(--email-text-primary)]'
                : 'text-[var(--email-text-secondary)]'
            )}
          >
            {email.subject || '(Sin asunto)'}
          </span>
        </div>

        {/* Row 3: Snippet */}
        {email.snippet && (
          <p className="text-xs text-[var(--email-text-muted)] truncate">
            {email.snippet}
          </p>
        )}
      </div>

      {/* Star - using APCA-validated semantic color */}
      <button
        onClick={handleStarClick}
        className={cn(
          'shrink-0 p-1 rounded-md mt-1',
          'transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          email.isStarred && 'opacity-100'
        )}
        style={{
          color: email.isStarred
            ? semanticColors.star.color
            : semanticColors.star.muted,
        }}
      >
        <Star
          className={cn('h-4 w-4', email.isStarred && 'fill-current')}
        />
      </button>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
}

function SectionHeader({ icon, label, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-[var(--email-surface)] z-10 border-b border-[var(--email-surface-border)]">
      <span className="text-[var(--email-text-muted)]">{icon}</span>
      <span className="text-sm font-semibold text-[var(--email-text-primary)]">
        {label}
      </span>
      <span className="text-sm text-[var(--email-text-muted)]">
        {count}
      </span>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function EmailListCompact({
  emails,
  selectedEmail,
  currentFolder,
  onSelectEmail,
  onToggleStar,
  onRefresh,
  isLoading = false,
  isRefreshing = false,
  className,
}: EmailListCompactProps) {
  // Use Color Intelligence for semantic colors (APCA-validated)
  const semanticColors = useSemanticColors();

  // Group emails by category
  const groups = React.useMemo(() => {
    const inboxEmails: Email[] = [];
    const newsletterEmails: Email[] = [];

    emails.forEach((email) => {
      const category = email.labels ? parseCategoryFromLabels(email.labels) : null;
      if (category === 'newsletter') {
        newsletterEmails.push(email);
      } else {
        inboxEmails.push(email);
      }
    });

    const result: { id: string; label: string; icon: React.ReactNode; emails: Email[]; count: number }[] = [];

    if (inboxEmails.length > 0) {
      result.push({
        id: 'inbox',
        label: 'Inbox',
        icon: <Inbox className="h-4 w-4" />,
        emails: inboxEmails,
        count: inboxEmails.length,
      });
    }

    if (newsletterEmails.length > 0) {
      result.push({
        id: 'newsletter',
        label: 'Newsletters',
        icon: <Mail className="h-4 w-4" />,
        emails: newsletterEmails,
        count: newsletterEmails.length,
      });
    }

    return result;
  }, [emails]);

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-[var(--email-surface)]',
        className
      )}
    >
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          // Loading Skeleton
          <div className="space-y-0">
            {/* Section header skeleton */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--email-surface-border)]">
              <Skeleton className="h-4 w-4 rounded bg-[var(--email-surface-light)]" />
              <Skeleton className="h-4 w-16 bg-[var(--email-surface-light)]" />
              <Skeleton className="h-4 w-8 bg-[var(--email-surface-lighter)]" />
            </div>
            {/* Email row skeletons */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="w-2 pt-3">
                  <Skeleton className="h-2 w-2 rounded-full bg-[var(--email-surface-light)]" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full bg-[var(--email-surface-light)]" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 bg-[var(--email-surface-light)]" />
                    <Skeleton className="h-3 w-12 bg-[var(--email-surface-lighter)]" />
                  </div>
                  <Skeleton className="h-4 w-full bg-[var(--email-surface-lighter)]" />
                  <Skeleton className="h-3 w-3/4 bg-[var(--email-surface-lighter)]" />
                </div>
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-[var(--email-surface-light)] flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-[var(--email-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--email-text-primary)]">
              Sin correos
            </p>
            <p className="text-xs text-[var(--email-text-muted)] mt-1">
              {currentFolder === 'inbox'
                ? 'Tu bandeja está vacía'
                : 'No hay correos en esta carpeta'}
            </p>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="mt-4 text-[var(--email-text-muted)]"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                Actualizar
              </Button>
            )}
          </div>
        ) : (
          // Email List with Section Headers
          <div>
            {groups.map((group) => (
              <div key={group.id}>
                <SectionHeader
                  icon={group.icon}
                  label={group.label}
                  count={group.count}
                />
                <div>
                  {group.emails.map((email) => (
                    <EmailRowCompact
                      key={email.id}
                      email={email}
                      isSelected={selectedEmail?.id === email.id}
                      onClick={onSelectEmail}
                      onToggleStar={onToggleStar}
                      semanticColors={semanticColors}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailListCompact;
