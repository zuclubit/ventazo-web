'use client';

/**
 * EmailTableList Component
 *
 * Email list with table-like row layout and inline section headers.
 * Matches the reference design with "Inbox 348" and "Newsletters 84" headers.
 *
 * Features:
 * - Inline section headers with icons and counts
 * - Table-row email items
 * - Smooth scrolling
 * - Loading skeletons
 * - Empty state
 */

import * as React from 'react';
import { Inbox, Mail, RefreshCw, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Email, EmailFolder } from '@/lib/emails';
import { EmailTableRow } from './EmailTableRow';
import { parseCategoryFromLabels } from './EmailCategoryBadge';

// ============================================
// Types
// ============================================

export interface EmailTableListProps {
  /** List of emails */
  emails: Email[];
  /** Currently active/viewing email */
  activeEmail?: Email | null;
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

interface EmailGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  emails: Email[];
  count: number;
}

// ============================================
// Helpers
// ============================================

function groupEmails(emails: Email[]): EmailGroup[] {
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

  const result: EmailGroup[] = [];

  if (inboxEmails.length > 0) {
    result.push({
      id: 'inbox',
      label: 'Inbox',
      icon: <Inbox className="h-5 w-5" />,
      emails: inboxEmails,
      count: inboxEmails.length,
    });
  }

  if (newsletterEmails.length > 0) {
    result.push({
      id: 'newsletter',
      label: 'Newsletters',
      icon: <Mail className="h-5 w-5" />,
      emails: newsletterEmails,
      count: newsletterEmails.length,
    });
  }

  return result;
}

// ============================================
// Sub-Components
// ============================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
}

function SectionHeader({ icon, label, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-[var(--email-surface)] z-10">
      <span className="text-[var(--email-text-muted)]">{icon}</span>
      <span className="text-base font-semibold text-[var(--email-text-primary)]">
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

export function EmailTableList({
  emails,
  activeEmail,
  currentFolder,
  onSelectEmail,
  onToggleStar,
  onRefresh,
  isLoading = false,
  isRefreshing = false,
  className,
}: EmailTableListProps) {
  // Group emails by category
  const groups = React.useMemo(() => {
    return groupEmails(emails);
  }, [emails]);

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-[var(--email-surface)]',
        className
      )}
    >
      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // Loading Skeleton
          <div className="space-y-0">
            {/* Fake section header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-5 w-5 rounded bg-[var(--email-surface-light)]" />
              <Skeleton className="h-5 w-16 bg-[var(--email-surface-light)]" />
              <Skeleton className="h-4 w-8 bg-[var(--email-surface-lighter)]" />
            </div>
            {/* Fake email rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-2 w-2 rounded-full bg-[var(--email-surface-light)]" />
                <Skeleton className="h-9 w-9 rounded-full bg-[var(--email-surface-light)]" />
                <Skeleton className="h-4 w-28 bg-[var(--email-surface-light)]" />
                <Skeleton className="h-5 w-16 rounded-full bg-[var(--email-surface-lighter)]" />
                <Skeleton className="h-4 flex-1 bg-[var(--email-surface-lighter)]" />
                <Skeleton className="h-4 w-20 bg-[var(--email-surface-lighter)]" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-14 w-14 rounded-full bg-[var(--email-surface-light)] flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-[var(--email-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--email-text-primary)]">
              Sin correos
            </p>
            <p className="text-xs text-[var(--email-text-muted)] mt-1 max-w-xs">
              {currentFolder === 'inbox'
                ? 'Tu bandeja de entrada está vacía'
                : `No hay correos en esta carpeta`}
            </p>
          </div>
        ) : (
          // Grouped Email List with Section Headers
          <div>
            {groups.map((group) => (
              <div key={group.id}>
                {/* Section Header */}
                <SectionHeader
                  icon={group.icon}
                  label={group.label}
                  count={group.count}
                />
                {/* Email Rows */}
                <div className="border-b border-[var(--email-surface-border)]">
                  {group.emails.map((email) => (
                    <EmailTableRow
                      key={email.id}
                      email={email}
                      isActive={activeEmail?.id === email.id}
                      onClick={onSelectEmail}
                      onToggleStar={onToggleStar}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default EmailTableList;
