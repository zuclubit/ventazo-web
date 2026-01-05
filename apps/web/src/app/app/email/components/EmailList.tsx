'use client';

/**
 * EmailList Component
 *
 * Scrollable list of emails with search, filters, and bulk actions.
 * Follows the same pattern as LeadsListView.
 */

import * as React from 'react';
import { Search, Filter, RefreshCw, CheckSquare, Archive, Trash2, Star } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Email, EmailFolder } from '@/lib/emails';
import { EmailListItem } from './EmailListItem';

// ============================================
// Types
// ============================================

export interface EmailListProps {
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
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function EmailList({
  emails,
  selectedEmail,
  currentFolder,
  onSelectEmail,
  onToggleStar,
  onBulkArchive,
  onBulkDelete,
  onRefresh,
  onSearch,
  isLoading = false,
  isRefreshing = false,
  className,
}: EmailListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = React.useState(false);

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
      setSelectedIds(new Set(emails.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
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

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-[var(--email-list-bg)] border-r border-[var(--email-list-border)]',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--email-list-border)] space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--email-text-muted)]" />
          <Input
            placeholder="Buscar correos..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 bg-[var(--email-input-bg)] border-[var(--email-input-border)] text-[var(--email-text-primary)] placeholder:text-[var(--email-text-muted)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Select Mode Toggle */}
          <Button
            variant={isSelectMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleSelectMode}
            className="gap-1.5 text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)] hover:bg-[var(--email-surface-hover)]"
          >
            <CheckSquare className="h-4 w-4" />
            {isSelectMode ? 'Cancelar' : 'Seleccionar'}
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ml-auto text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)] hover:bg-[var(--email-surface-hover)]"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          {/* Filter Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)] hover:bg-[var(--email-surface-hover)]">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--email-surface-light)] border-[var(--email-surface-border)]">
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">Todos</DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">No leídos</DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">Con archivos</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--email-surface-border)]" />
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">Esta semana</DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">Este mes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk Actions (when in select mode) */}
        {isSelectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--email-list-border)]">
            <Checkbox
              checked={selectedIds.size === emails.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-[var(--email-text-secondary)]">
              {selectedIds.size} seleccionados
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="icon" onClick={handleBulkArchive} className="text-[var(--email-text-secondary)] hover:bg-[var(--email-surface-hover)]">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleBulkDelete} className="hover:bg-[var(--email-surface-hover)]">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton className="h-4 w-4 rounded bg-[var(--email-surface-light)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-[var(--email-surface-light)]" />
                  <Skeleton className="h-3 w-48 bg-[var(--email-surface-lighter)]" />
                </div>
                <Skeleton className="h-3 w-12 bg-[var(--email-surface-lighter)]" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-[var(--email-surface-light)] flex items-center justify-center mb-3">
              <Star className="h-6 w-6 text-[var(--email-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--email-text-primary)]">Sin correos</p>
            <p className="text-xs text-[var(--email-text-muted)] mt-1">
              {currentFolder === 'inbox'
                ? 'Tu bandeja de entrada está vacía'
                : `No hay correos en ${currentFolder}`}
            </p>
          </div>
        ) : (
          // Email items
          <div>
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmail?.id === email.id || selectedIds.has(email.id)}
                isSelectMode={isSelectMode}
                onClick={onSelectEmail}
                onSelect={handleSelect}
                onToggleStar={onToggleStar}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default EmailList;
