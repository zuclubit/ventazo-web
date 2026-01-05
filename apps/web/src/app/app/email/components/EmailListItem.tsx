'use client';

/**
 * EmailListItem Component
 *
 * Individual email row in the email list.
 * Shows sender, subject, snippet, date, and status.
 */

import * as React from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Paperclip, Star } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Email } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailListItemProps {
  /** Email data */
  email: Email;
  /** Whether this email is selected */
  isSelected?: boolean;
  /** Whether multi-select mode is active */
  isSelectMode?: boolean;
  /** Handler for click */
  onClick?: (email: Email) => void;
  /** Handler for selection toggle */
  onSelect?: (email: Email, selected: boolean) => void;
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

  return format(date, 'd MMM', { locale: es });
}

// ============================================
// Component
// ============================================

export function EmailListItem({
  email,
  isSelected = false,
  isSelectMode = false,
  onClick,
  onSelect,
  onToggleStar,
  className,
}: EmailListItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      onSelect?.(email, !isSelected);
    } else {
      onClick?.(email);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(email, checked);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(email);
  };

  const displayDate = email.receivedAt || email.sentAt || email.createdAt;

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b',
        'border-[var(--email-list-border)]',
        isSelected
          ? 'bg-[var(--email-list-selected)] border-l-2 border-l-[var(--email-list-selected-border)]'
          : 'hover:bg-[var(--email-list-hover)]',
        !email.isRead && 'bg-[var(--email-unread-bg)]',
        className
      )}
    >
      {/* Checkbox (in select mode) */}
      {isSelectMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Star */}
      <button
        onClick={handleStarClick}
        className={cn(
          'shrink-0 p-1 rounded hover:bg-[var(--email-surface-hover)] transition-colors',
          email.isStarred
            ? 'text-[var(--email-star-active)]'
            : 'text-[var(--email-star-inactive)] hover:text-[var(--email-star-active)]'
        )}
      >
        <Star className={cn('h-4 w-4', email.isStarred && 'fill-current')} />
      </button>

      {/* Unread Indicator */}
      {!email.isRead && (
        <div className="h-2 w-2 rounded-full bg-[var(--email-unread-dot)] shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* From */}
        <p
          className={cn(
            'text-sm truncate',
            !email.isRead
              ? 'font-semibold text-[var(--email-text-primary)]'
              : 'text-[var(--email-text-secondary)]'
          )}
        >
          {email.from.name || email.from.email}
        </p>

        {/* Subject & Snippet */}
        <div className="flex items-baseline gap-1.5">
          <p
            className={cn(
              'text-sm truncate',
              !email.isRead
                ? 'font-medium text-[var(--email-text-primary)]'
                : 'text-[var(--email-text-secondary)]'
            )}
          >
            {email.subject || '(Sin asunto)'}
          </p>
          {email.snippet && (
            <>
              <span className="text-[var(--email-text-muted)] shrink-0">—</span>
              <p className="text-sm text-[var(--email-text-muted)] truncate">{email.snippet}</p>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Attachment Icon */}
        {email.hasAttachments && (
          <Paperclip className="h-4 w-4 text-[var(--email-text-muted)]" />
        )}

        {/* Date */}
        <span
          className={cn(
            'text-xs whitespace-nowrap',
            !email.isRead
              ? 'font-medium text-[var(--email-text-primary)]'
              : 'text-[var(--email-text-muted)]'
          )}
        >
          {formatEmailDate(displayDate)}
        </span>
      </div>
    </div>
  );
}

export default EmailListItem;
