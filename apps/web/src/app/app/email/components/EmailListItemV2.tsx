'use client';

/**
 * EmailListItemV2 Component
 *
 * Modern email list item with enhanced visual design.
 * Matches the reference design with category badges, attachment indicators,
 * and selection states.
 *
 * Features:
 * - Avatar with sender initials
 * - Category badge (Design, Product, etc.)
 * - Attachment count indicator (+2)
 * - Selection highlight (gold left border)
 * - Unread dot indicator
 * - Star toggle with animation
 * - Dynamic theming
 */

import * as React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Paperclip, Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Email } from '@/lib/emails';
import {
  EmailCategoryBadge,
  parseCategoryFromLabels,
  type EmailCategoryType,
} from './EmailCategoryBadge';

// ============================================
// Types
// ============================================

export interface EmailListItemV2Props {
  /** Email data */
  email: Email;
  /** Whether this email is actively selected/viewing */
  isActive?: boolean;
  /** Whether this email is selected for bulk actions */
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

export function EmailListItemV2({
  email,
  isActive = false,
  isSelected = false,
  isSelectMode = false,
  onClick,
  onSelect,
  onToggleStar,
  className,
}: EmailListItemV2Props) {
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
  const category = email.labels ? parseCategoryFromLabels(email.labels) : null;
  const attachmentCount = email.attachments?.length || 0;
  const avatarColor = getAvatarColor(email.from.email || 'unknown@email.com');

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3',
        'cursor-pointer transition-all duration-200',
        'border-l-[3px] border-l-transparent',
        // Active state (selected for viewing)
        isActive && [
          'bg-[var(--email-list-active)]',
          'border-l-[var(--tenant-accent)]',
        ],
        // Multi-select selected state
        isSelected && !isActive && 'bg-[var(--email-list-selected)]',
        // Hover state
        !isActive && !isSelected && 'hover:bg-[var(--email-list-hover)]',
        // Unread state
        !email.isRead && 'bg-[var(--email-unread-bg)]',
        className
      )}
    >
      {/* Checkbox (in select mode) */}
      {isSelectMode && (
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="border-[var(--email-text-muted)] data-[state=checked]:bg-[var(--tenant-primary)] data-[state=checked]:border-[var(--tenant-primary)]"
          />
        </div>
      )}

      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={undefined} alt={email.from.name || email.from.email} />
        <AvatarFallback
          className={cn('text-white text-sm font-medium bg-gradient-to-br', avatarColor)}
        >
          {getInitials(email.from.name, email.from.email)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Top Row: Sender + Date */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Unread Indicator */}
            {!email.isRead && (
              <span className="h-2 w-2 rounded-full bg-[var(--tenant-primary)] shrink-0" />
            )}

            {/* Sender Name */}
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

          {/* Date */}
          <span
            className={cn(
              'text-xs shrink-0',
              !email.isRead
                ? 'font-medium text-[var(--email-text-primary)]'
                : 'text-[var(--email-text-muted)]'
            )}
          >
            {formatEmailDate(displayDate)}
          </span>
        </div>

        {/* Subject */}
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

        {/* Snippet */}
        {email.snippet && (
          <p className="text-xs text-[var(--email-text-muted)] truncate line-clamp-1">
            {email.snippet}
          </p>
        )}

        {/* Bottom Row: Category + Attachments */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Category Badge */}
          {category && <EmailCategoryBadge category={category} size="sm" />}

          {/* Attachment Count */}
          {attachmentCount > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                'px-1.5 py-0.5 rounded',
                'text-[10px] font-medium',
                'bg-[var(--email-surface-light)]',
                'text-[var(--email-text-muted)]'
              )}
            >
              <Paperclip className="h-3 w-3" />
              {attachmentCount > 1 && `+${attachmentCount}`}
            </span>
          )}
        </div>
      </div>

      {/* Star Button */}
      <button
        onClick={handleStarClick}
        className={cn(
          'shrink-0 p-1.5 rounded-lg mt-0.5',
          'transition-all duration-200',
          'opacity-0 group-hover:opacity-100',
          email.isStarred && 'opacity-100',
          email.isStarred
            ? 'text-[var(--email-star-active)]'
            : 'text-[var(--email-text-muted)] hover:text-[var(--email-star-active)]',
          'hover:bg-[var(--email-surface-hover)]'
        )}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            email.isStarred && 'fill-current scale-110'
          )}
        />
      </button>
    </div>
  );
}

export default EmailListItemV2;
