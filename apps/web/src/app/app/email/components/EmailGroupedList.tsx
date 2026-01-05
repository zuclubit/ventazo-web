'use client';

/**
 * EmailGroupedList Component
 *
 * Groups emails by category/folder with collapsible sections.
 * Follows the reference design with section headers showing counts.
 *
 * Features:
 * - Collapsible category sections
 * - Count badges per category
 * - Bulk selection support
 * - Search and filter integration
 * - Smooth animations
 * - Dynamic theming
 */

import * as React from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  CheckSquare,
  Archive,
  Trash2,
  ChevronDown,
  Inbox,
  Mail,
  Star,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Email, EmailFolder } from '@/lib/emails';
import { EmailListItemV2 } from './EmailListItemV2';
import { parseCategoryFromLabels, type EmailCategoryType } from './EmailCategoryBadge';

// ============================================
// Types
// ============================================

export interface EmailGroupedListProps {
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
  /** Handler for bulk archive */
  onBulkArchive?: (emails: Email[]) => void;
  /** Handler for bulk delete */
  onBulkDelete?: (emails: Email[]) => void;
  /** Handler for refresh */
  onRefresh?: () => void;
  /** Handler for search */
  onSearch?: (query: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Refreshing state */
  isRefreshing?: boolean;
  /** Enable grouping by category */
  enableGrouping?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface EmailGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  emails: Email[];
  count: number;
  unreadCount: number;
}

// ============================================
// Helpers
// ============================================

function groupEmailsByCategory(emails: Email[]): EmailGroup[] {
  // Use arrays directly instead of Record to avoid index signature issues
  const inboxEmails: Email[] = [];
  const starredEmails: Email[] = [];
  const newsletterEmails: Email[] = [];

  emails.forEach((email) => {
    if (email.isStarred) {
      starredEmails.push(email);
      return;
    }

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
      label: 'Bandeja de entrada',
      icon: <Inbox className="h-4 w-4" />,
      emails: inboxEmails,
      count: inboxEmails.length,
      unreadCount: inboxEmails.filter((e) => !e.isRead).length,
    });
  }

  if (starredEmails.length > 0) {
    result.push({
      id: 'starred',
      label: 'Destacados',
      icon: <Star className="h-4 w-4 fill-current text-amber-400" />,
      emails: starredEmails,
      count: starredEmails.length,
      unreadCount: starredEmails.filter((e) => !e.isRead).length,
    });
  }

  if (newsletterEmails.length > 0) {
    result.push({
      id: 'newsletter',
      label: 'Newsletters',
      icon: <Mail className="h-4 w-4" />,
      emails: newsletterEmails,
      count: newsletterEmails.length,
      unreadCount: newsletterEmails.filter((e) => !e.isRead).length,
    });
  }

  return result;
}

// ============================================
// Sub-Components
// ============================================

interface GroupHeaderProps {
  group: EmailGroup;
  isOpen: boolean;
  onToggle: () => void;
}

function GroupHeader({ group, isOpen, onToggle }: GroupHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5',
          'text-left transition-colors duration-150',
          'hover:bg-[var(--email-surface-hover)]',
          'border-b border-[var(--email-list-border)]'
        )}
      >
        <span className="text-[var(--email-text-secondary)]">{group.icon}</span>

        <span className="flex-1 text-sm font-medium text-[var(--email-text-primary)]">
          {group.label}
        </span>

        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            group.unreadCount > 0
              ? 'bg-[var(--tenant-primary)] text-white'
              : 'bg-[var(--email-surface-light)] text-[var(--email-text-muted)]'
          )}
        >
          {group.count}
        </span>

        <ChevronDown
          className={cn(
            'h-4 w-4 text-[var(--email-text-muted)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
    </CollapsibleTrigger>
  );
}

// ============================================
// Component
// ============================================

export function EmailGroupedList({
  emails,
  activeEmail,
  currentFolder,
  onSelectEmail,
  onToggleStar,
  onBulkArchive,
  onBulkDelete,
  onRefresh,
  onSearch,
  isLoading = false,
  isRefreshing = false,
  enableGrouping = true,
  className,
}: EmailGroupedListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set(['inbox', 'starred']));

  // Filter emails by search
  const filteredEmails = React.useMemo(() => {
    if (!searchQuery.trim()) return emails;

    const query = searchQuery.toLowerCase();
    return emails.filter(
      (email) =>
        email.subject?.toLowerCase().includes(query) ||
        email.from.email.toLowerCase().includes(query) ||
        email.from.name?.toLowerCase().includes(query) ||
        email.snippet?.toLowerCase().includes(query)
    );
  }, [emails, searchQuery]);

  // Group emails
  const groups = React.useMemo(() => {
    if (!enableGrouping) return null;
    return groupEmailsByCategory(filteredEmails);
  }, [filteredEmails, enableGrouping]);

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  // Toggle select mode
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedIds(new Set());
    }
  };

  // Handle individual selection
  const handleSelect = (email: Email, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(email.id);
    } else {
      newSelected.delete(email.id);
    }
    setSelectedIds(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredEmails.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Toggle group open/close
  const toggleGroup = (groupId: string) => {
    const newOpen = new Set(openGroups);
    if (newOpen.has(groupId)) {
      newOpen.delete(groupId);
    } else {
      newOpen.add(groupId);
    }
    setOpenGroups(newOpen);
  };

  // Get selected emails
  const selectedEmails = emails.filter((e) => selectedIds.has(e.id));

  // Handle bulk actions
  const handleBulkArchive = () => {
    onBulkArchive?.(selectedEmails);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleBulkDelete = () => {
    onBulkDelete?.(selectedEmails);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // Render email item
  const renderEmailItem = (email: Email) => (
    <EmailListItemV2
      key={email.id}
      email={email}
      isActive={activeEmail?.id === email.id}
      isSelected={selectedIds.has(email.id)}
      isSelectMode={isSelectMode}
      onClick={onSelectEmail}
      onSelect={handleSelect}
      onToggleStar={onToggleStar}
    />
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-[var(--email-list-bg)]',
        className
      )}
    >
      {/* Header with Search & Actions */}
      <div className="p-3 space-y-3 border-b border-[var(--email-list-border)]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--email-text-muted)]" />
          <Input
            placeholder="Buscar en esta carpeta..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={cn(
              'pl-9',
              'bg-[var(--email-input-bg)]',
              'border-[var(--email-input-border)]',
              'text-[var(--email-text-primary)]',
              'placeholder:text-[var(--email-text-muted)]',
              'focus:border-[var(--tenant-primary)]/50',
              'focus:ring-[var(--tenant-primary)]/20'
            )}
          />
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleSelectMode}
            className={cn(
              'gap-1.5',
              'text-[var(--email-text-secondary)]',
              'hover:text-[var(--email-text-primary)]',
              'hover:bg-[var(--email-surface-hover)]'
            )}
          >
            <CheckSquare className="h-4 w-4" />
            {isSelectMode ? 'Cancelar' : 'Seleccionar'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              'ml-auto',
              'text-[var(--email-text-secondary)]',
              'hover:text-[var(--email-text-primary)]',
              'hover:bg-[var(--email-surface-hover)]'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Bulk Actions */}
        {isSelectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--email-list-border)]">
            <Checkbox
              checked={selectedIds.size === filteredEmails.length}
              onCheckedChange={handleSelectAll}
              className="border-[var(--email-text-muted)]"
            />
            <span className="text-sm text-[var(--email-text-secondary)]">
              {selectedIds.size} seleccionados
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBulkArchive}
                className="text-[var(--email-text-secondary)] hover:bg-[var(--email-surface-hover)]"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBulkDelete}
                className="hover:bg-[var(--email-surface-hover)]"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // Loading Skeleton
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full bg-[var(--email-surface-light)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-[var(--email-surface-light)]" />
                  <Skeleton className="h-3 w-48 bg-[var(--email-surface-lighter)]" />
                  <Skeleton className="h-3 w-24 bg-[var(--email-surface-lighter)]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-14 w-14 rounded-full bg-[var(--email-surface-light)] flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-[var(--email-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--email-text-primary)]">
              {searchQuery ? 'Sin resultados' : 'Sin correos'}
            </p>
            <p className="text-xs text-[var(--email-text-muted)] mt-1 max-w-xs">
              {searchQuery
                ? `No se encontraron correos para "${searchQuery}"`
                : currentFolder === 'inbox'
                  ? 'Tu bandeja de entrada está vacía'
                  : `No hay correos en esta carpeta`}
            </p>
          </div>
        ) : enableGrouping && groups ? (
          // Grouped View
          <div>
            {groups.map((group) => (
              <Collapsible
                key={group.id}
                open={openGroups.has(group.id)}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <GroupHeader
                  group={group}
                  isOpen={openGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                />
                <CollapsibleContent>
                  <div className="border-b border-[var(--email-list-border)]">
                    {group.emails.map(renderEmailItem)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          // Flat List
          <div>{filteredEmails.map(renderEmailItem)}</div>
        )}
      </ScrollArea>
    </div>
  );
}

export default EmailGroupedList;
