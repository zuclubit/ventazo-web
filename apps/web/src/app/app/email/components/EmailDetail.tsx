'use client';

/**
 * EmailDetail Component
 *
 * Displays email content with thread view and quick actions.
 * Follows the same pattern as LeadDetailSheet.
 */

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Download,
  Forward,
  MoreVertical,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Email, Attachment } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailDetailProps {
  /** Email to display */
  email: Email | null;
  /** Handler for reply */
  onReply?: (email: Email) => void;
  /** Handler for reply all */
  onReplyAll?: (email: Email) => void;
  /** Handler for forward */
  onForward?: (email: Email) => void;
  /** Handler for archive */
  onArchive?: (email: Email) => void;
  /** Handler for delete */
  onDelete?: (email: Email) => void;
  /** Handler for star toggle */
  onToggleStar?: (email: Email) => void;
  /** Handler for back (mobile) */
  onBack?: () => void;
  /** Handler for mark as read */
  onMarkAsRead?: (email: Email) => void;
  /** Show back button (mobile) */
  showBackButton?: boolean;
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
  return email?.charAt(0).toUpperCase() || 'U';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// Sub-Components
// ============================================

interface AttachmentItemProps {
  attachment: Attachment;
  onDownload?: (attachment: Attachment) => void;
}

function AttachmentItem({ attachment, onDownload }: AttachmentItemProps) {
  return (
    <button
      onClick={() => onDownload?.(attachment)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'border border-[var(--email-surface-border)] bg-[var(--email-surface-light)]',
        'hover:bg-[var(--email-surface-hover)] hover:border-[var(--tenant-primary)]/50 transition-colors text-left'
      )}
    >
      <Paperclip className="h-4 w-4 text-[var(--email-text-muted)] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-[var(--email-text-primary)]">{attachment.filename}</p>
        <p className="text-xs text-[var(--email-text-muted)]">{formatFileSize(attachment.size)}</p>
      </div>
      <Download className="h-4 w-4 text-[var(--email-text-secondary)]" />
    </button>
  );
}

// ============================================
// Component
// ============================================

export function EmailDetail({
  email,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onToggleStar,
  onBack,
  onMarkAsRead,
  showBackButton = false,
  className,
}: EmailDetailProps) {
  const [showFullHeaders, setShowFullHeaders] = React.useState(false);

  // Mark as read when email changes
  React.useEffect(() => {
    if (email && !email.isRead) {
      onMarkAsRead?.(email);
    }
  }, [email?.id]);

  if (!email) {
    return (
      <div className={cn('flex-1 flex items-center justify-center bg-[var(--email-detail-bg)]', className)}>
        <div className="text-center px-6">
          <div className="h-16 w-16 rounded-full bg-[var(--email-surface-light)] flex items-center justify-center mx-auto mb-4">
            <Reply className="h-8 w-8 text-[var(--email-text-muted)]" />
          </div>
          <p className="text-lg font-medium text-[var(--email-text-primary)]">Selecciona un correo</p>
          <p className="text-sm text-[var(--email-text-secondary)] mt-1 max-w-xs mx-auto">
            Haz clic en un correo para ver su contenido
          </p>
        </div>
      </div>
    );
  }

  const displayDate = email.receivedAt || email.sentAt || email.createdAt;
  const hasMultipleRecipients = (email.to?.length || 0) > 1 || email.cc?.length;

  return (
    <div className={cn('relative flex-1 flex flex-col bg-[var(--email-detail-bg)] overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[var(--email-detail-border)] bg-[var(--email-detail-header-bg)]">
        {/* Back Button (Mobile) */}
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)] hover:bg-[var(--email-surface-hover)]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={() => onReply?.(email)} className="text-[var(--email-text-secondary)] hover:text-[var(--email-action-reply)] hover:bg-[var(--email-surface-hover)]">
            <Reply className="h-4 w-4" />
          </Button>
          {hasMultipleRecipients && (
            <Button variant="ghost" size="icon" onClick={() => onReplyAll?.(email)} className="text-[var(--email-text-secondary)] hover:text-[var(--email-action-reply)] hover:bg-[var(--email-surface-hover)]">
              <ReplyAll className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onForward?.(email)} className="text-[var(--email-text-secondary)] hover:text-[var(--email-action-forward)] hover:bg-[var(--email-surface-hover)]">
            <Forward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleStar?.(email)}
            className={cn(
              'hover:bg-[var(--email-surface-hover)]',
              email.isStarred ? 'text-[var(--email-star-active)]' : 'text-[var(--email-text-secondary)] hover:text-[var(--email-star-active)]'
            )}
          >
            <Star className={cn('h-4 w-4', email.isStarred && 'fill-current')} />
          </Button>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)] hover:bg-[var(--email-surface-hover)]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--email-surface-light)] border-[var(--email-surface-border)]">
              <DropdownMenuItem onClick={() => onArchive?.(email)} className="text-[var(--email-text-primary)] focus:bg-[var(--email-surface-hover)] focus:text-[var(--email-text-primary)]">
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--email-surface-border)]" />
              <DropdownMenuItem
                onClick={() => onDelete?.(email)}
                className="text-destructive focus:text-destructive focus:bg-[var(--email-surface-hover)]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold text-[var(--email-text-primary)]">{email.subject || '(Sin asunto)'}</h1>

          {/* Sender Info */}
          <Collapsible open={showFullHeaders} onOpenChange={setShowFullHeaders}>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-[var(--tenant-primary-light)] text-[var(--tenant-primary)]">
                  {getInitials(email.from.name, email.from.email)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--email-text-primary)]">{email.from.name || email.from.email}</p>
                  {email.from.name && (
                    <span className="text-sm text-[var(--email-text-muted)]">
                      &lt;{email.from.email}&gt;
                    </span>
                  )}
                </div>

                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1 text-sm text-[var(--email-text-secondary)] hover:text-[var(--email-text-primary)]">
                    <span>para {email.to?.[0]?.name || email.to?.[0]?.email || 'mí'}</span>
                    {(email.to?.length || 0) > 1 && (
                      <span>y {email.to!.length - 1} más</span>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        showFullHeaders && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
              </div>

              <p className="text-sm text-[var(--email-text-muted)] shrink-0">
                {format(new Date(displayDate), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>

            <CollapsibleContent className="mt-3 pl-13">
              <div className="text-sm space-y-1 bg-[var(--email-surface-light)] rounded-lg p-3 border border-[var(--email-surface-border)]">
                <div className="flex">
                  <span className="text-[var(--email-text-muted)] w-16">De:</span>
                  <span className="text-[var(--email-text-secondary)]">{email.from.email}</span>
                </div>
                <div className="flex">
                  <span className="text-[var(--email-text-muted)] w-16">Para:</span>
                  <span className="text-[var(--email-text-secondary)]">{email.to?.map((r) => r.email).join(', ')}</span>
                </div>
                {email.cc && email.cc.length > 0 && (
                  <div className="flex">
                    <span className="text-[var(--email-text-muted)] w-16">CC:</span>
                    <span className="text-[var(--email-text-secondary)]">{email.cc.map((r) => r.email).join(', ')}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="text-[var(--email-text-muted)] w-16">Fecha:</span>
                  <span className="text-[var(--email-text-secondary)]">
                    {format(new Date(displayDate), "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="bg-[var(--email-surface-border)]" />

          {/* Body */}
          <div className="prose prose-sm max-w-none prose-invert prose-p:text-[var(--email-text-secondary)] prose-headings:text-[var(--email-text-primary)] prose-a:text-[var(--tenant-primary)]">
            {email.bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                className="email-body"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-[var(--email-text-secondary)]">{email.body}</pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <>
              <Separator className="bg-[var(--email-surface-border)]" />
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--email-text-primary)]">
                  {email.attachments.length} archivo{email.attachments.length > 1 ? 's' : ''}{' '}
                  adjunto{email.attachments.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {email.attachments.map((attachment) => (
                    <AttachmentItem key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Related Entity */}
          {email.relatedEntity && (
            <>
              <Separator className="bg-[var(--email-surface-border)]" />
              <div className="flex items-center gap-2 p-3 bg-[var(--tenant-primary-lighter)] rounded-lg border border-[var(--tenant-primary)]/20">
                <User className="h-4 w-4 text-[var(--tenant-primary)]" />
                <span className="text-sm text-[var(--email-text-secondary)]">
                  Relacionado con{' '}
                  <span className="font-medium text-[var(--tenant-primary)]">
                    {email.relatedEntity.name}
                  </span>{' '}
                  ({email.relatedEntity.type === 'customer' ? 'Cliente' : 'Lead'})
                </span>
              </div>
            </>
          )}

          {/* Bottom padding to account for FAB */}
          <div className="h-20" />
        </div>
      </ScrollArea>

      {/* FAB - Reply Button */}
      <button
        onClick={() => onReply?.(email)}
        className={cn(
          'absolute bottom-6 right-6 z-10',
          'h-14 w-14 rounded-full',
          'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]',
          'text-white shadow-lg shadow-[var(--tenant-primary)]/30',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:ring-offset-2 focus:ring-offset-[var(--email-surface)]'
        )}
        aria-label="Responder"
      >
        <Reply className="h-6 w-6" />
      </button>
    </div>
  );
}

export default EmailDetail;
