'use client';

/**
 * EmailTableRow Component
 *
 * Horizontal table-like row for email display.
 * Matches the reference design with inline layout:
 * unread dot | avatar | name | category badge | subject | snippet | attachments | date
 *
 * Features:
 * - Single line horizontal layout
 * - Fixed width columns for alignment
 * - Gold left border for selected state
 * - Unread indicator dot
 * - Category badges (Design, Product, Management, Newsletter)
 * - Attachment count badge
 */

import * as React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Paperclip, Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Email } from '@/lib/emails';
import {
  EmailCategoryBadge,
  parseCategoryFromLabels,
} from './EmailCategoryBadge';

// ============================================
// Types
// ============================================

export interface EmailTableRowProps {
  /** Email data */
  email: Email;
  /** Whether this email is actively selected/viewing */
  isActive?: boolean;
  /** Handler for click */
  onClick?: (email: Email) => void;
  /** Handler for star toggle */
  onToggleStar?: (email: Email) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: es });
  }

  if (isYesterday(date)) {
    return 'Ayer';
  }

  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo < 7) {
    return format(date, 'EEEE', { locale: es });
  }

  // Format as "Jan 20, 2025"
  return format(date, 'MMM d, yyyy', { locale: es });
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
  return email?.charAt(0).toUpperCase() || 'U';
}

// Generate consistent color for avatar based on email
function getAvatarColor(email: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-orange-500 to-orange-600',
    'from-green-500 to-green-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-rose-500 to-rose-600',
  ] as const;
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % colors.length;
  return colors[index] ?? 'from-blue-500 to-blue-600';
}

// ============================================
// Component
// ============================================

export function EmailTableRow({
  email,
  isActive = false,
  onClick,
  onToggleStar,
  className,
}: EmailTableRowProps) {
  const handleClick = () => {
    onClick?.(email);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(email);
  };

  const displayDate = email.receivedAt || email.sentAt || email.createdAt;
  const category = email.labels ? parseCategoryFromLabels(email.labels) : null;
  const attachmentCount = email.attachments?.length || 0;
  const avatarColor = getAvatarColor(email.from.email || 'unknown@email.com');

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3',
        'cursor-pointer transition-all duration-150',
        'border-l-[3px] border-l-transparent',
        'hover:bg-[var(--email-list-hover)]',
        // Active state - gold/amber left border
        isActive && [
          'bg-[var(--email-list-active)]',
          'border-l-amber-400',
        ],
        // Unread background
        !email.isRead && !isActive && 'bg-[var(--email-unread-bg)]',
        className
      )}
    >
      {/* Unread Indicator Dot */}
      <div className="w-2 shrink-0 flex justify-center">
        {!email.isRead && (
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={undefined} alt={email.from.name || email.from.email} />
        <AvatarFallback
          className={cn('text-white text-xs font-medium bg-gradient-to-br', avatarColor)}
        >
          {getInitials(email.from.name, email.from.email)}
        </AvatarFallback>
      </Avatar>

      {/* Sender Name - Fixed Width */}
      <div className="w-[140px] shrink-0">
        <p
          className={cn(
            'text-sm truncate',
            !email.isRead
              ? 'font-semibold text-[var(--email-text-primary)]'
              : 'font-medium text-[var(--email-text-secondary)]'
          )}
        >
          {email.from.name || email.from.email}
        </p>
      </div>

      {/* Category Badge - Fixed Width */}
      <div className="w-[100px] shrink-0">
        {category && <EmailCategoryBadge category={category} size="sm" />}
      </div>

      {/* Subject + Snippet - Flexible */}
      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        <span
          className={cn(
            'text-sm truncate shrink-0 max-w-[45%]',
            !email.isRead
              ? 'font-semibold text-[var(--email-text-primary)]'
              : 'font-medium text-[var(--email-text-secondary)]'
          )}
        >
          {email.subject || '(Sin asunto)'}
        </span>
        {email.snippet && (
          <span className="text-sm text-[var(--email-text-muted)] truncate">
            {email.snippet}
          </span>
        )}
      </div>

      {/* Attachment Count Badge */}
      <div className="w-[50px] shrink-0 flex justify-center">
        {attachmentCount > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              'px-2 py-0.5 rounded-full',
              'text-xs font-medium',
              'bg-slate-100 text-slate-600',
              'dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            <Paperclip className="h-3 w-3" />
            {attachmentCount > 1 && `+${attachmentCount}`}
          </span>
        )}
      </div>

      {/* Date - Fixed Width */}
      <div className="w-[100px] shrink-0 text-right">
        <span
          className={cn(
            'text-sm',
            !email.isRead
              ? 'font-medium text-[var(--email-text-primary)]'
              : 'text-[var(--email-text-muted)]'
          )}
        >
          {formatEmailDate(displayDate)}
        </span>
      </div>

      {/* Star Button - Shows on Hover */}
      <button
        onClick={handleStarClick}
        className={cn(
          'shrink-0 p-1 rounded-md',
          'transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          email.isStarred && 'opacity-100',
          email.isStarred
            ? 'text-amber-400'
            : 'text-slate-400 hover:text-amber-400'
        )}
      >
        <Star
          className={cn(
            'h-4 w-4',
            email.isStarred && 'fill-current'
          )}
        />
      </button>
    </div>
  );
}

export default EmailTableRow;
