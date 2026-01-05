'use client';

/**
 * CommentCard Component
 * Individual comment display with reactions, replies, and actions
 *
 * Features:
 * - Dynamic avatar colors based on user name
 * - Styled @mentions for users and groups
 * - Modern card/bubble design with theme support
 * - Responsive layout with mobile optimizations
 *
 * @module components/comments/CommentCard
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MoreHorizontal,
  Reply,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Lock,
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
import { Badge } from '@/components/ui/badge';
import { cn, getAvatarStyle, renderContentWithMentions } from '@/lib/utils';
import type { Comment, SupportedReaction } from '@/lib/comments/types';
import { ReactionBar } from './ReactionBar';

// ============================================
// Types
// ============================================

interface CommentCardProps {
  comment: Comment;
  currentUserId: string;
  isAdmin?: boolean;
  showReplies?: boolean;
  allowReply?: boolean;
  allowReactions?: boolean;
  allowPin?: boolean;
  onReply?: (comment: Comment) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (comment: Comment) => void;
  onTogglePin?: (comment: Comment, pinned: boolean) => void;
  onAddReaction?: (commentId: string, emoji: SupportedReaction) => void;
  onRemoveReaction?: (commentId: string, emoji: SupportedReaction) => void;
  onToggleReplies?: (commentId: string) => void;
  repliesExpanded?: boolean;
  replies?: Comment[];
  isLoadingReplies?: boolean;
  depth?: number;
  maxDepth?: number;
  className?: string;
}

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Render comment content with styled mentions
 * Converts @[Name](id) to styled HTML spans
 */
function renderContent(content: string, contentHtml?: string | null): React.ReactNode {
  // If we have pre-rendered HTML, use it
  if (contentHtml) {
    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    );
  }

  // Parse mentions and render with styling
  const renderedHtml = renderContentWithMentions(content);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_.mention]:inline-flex [&_.mention]:items-center [&_.mention]:px-1.5 [&_.mention]:py-0.5 [&_.mention]:mx-0.5 [&_.mention]:rounded-md [&_.mention]:font-medium [&_.mention]:text-sm [&_.mention]:cursor-pointer [&_.mention]:transition-all [&_.mention-user]:bg-blue-500/15 [&_.mention-user]:text-blue-600 [&_.mention-user]:dark:bg-blue-500/20 [&_.mention-user]:dark:text-blue-400 [&_.mention-group]:bg-violet-500/15 [&_.mention-group]:text-violet-600 [&_.mention-group]:dark:bg-violet-500/20 [&_.mention-group]:dark:text-violet-400"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

// ============================================
// Component
// ============================================

export function CommentCard({
  comment,
  currentUserId,
  isAdmin = false,
  showReplies = true,
  allowReply = true,
  allowReactions = true,
  allowPin = false,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onAddReaction,
  onRemoveReaction,
  onToggleReplies,
  repliesExpanded = false,
  replies = [],
  isLoadingReplies = false,
  depth = 0,
  maxDepth = 3,
  className,
}: CommentCardProps) {
  const isAuthor = comment.createdBy === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin && allowPin;
  const hasReplies = (comment.replyCount ?? 0) > 0 || replies.length > 0;
  const isNested = depth > 0;

  // Check if current user has reacted
  const userReactions = React.useMemo(() => {
    const reacted: string[] = [];
    if (comment.reactions) {
      Object.entries(comment.reactions).forEach(([emoji, userIds]) => {
        if (userIds.includes(currentUserId)) {
          reacted.push(emoji);
        }
      });
    }
    return reacted;
  }, [comment.reactions, currentUserId]);

  const handleReaction = (emoji: SupportedReaction) => {
    if (userReactions.includes(emoji)) {
      onRemoveReaction?.(comment.id, emoji);
    } else {
      onAddReaction?.(comment.id, emoji);
    }
  };

  // Get dynamic avatar colors based on author name or ID
  const avatarIdentifier = comment.author?.name || comment.createdBy || 'unknown';
  const avatarStyles = getAvatarStyle(avatarIdentifier);

  return (
    <div
      className={cn(
        'group relative',
        // Responsive nesting: less margin on mobile
        isNested && 'ml-4 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-border/50',
        className
      )}
    >
      {/* Main Comment Card - Modern bubble design */}
      <div
        className={cn(
          'comment-card',
          comment.isPinned && 'pinned',
          'flex gap-2 sm:gap-3'
        )}
      >
        {/* Avatar with dynamic colors - smaller on mobile */}
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 ring-2 ring-background shadow-sm">
          <AvatarImage src={comment.author?.avatarUrl} alt={comment.author?.name} />
          <AvatarFallback
            className="text-xs font-semibold"
            style={avatarStyles}
          >
            {comment.author?.name ? getInitials(comment.author.name) : '??'}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-sm"
              style={{ color: avatarStyles.backgroundColor }}
            >
              {comment.author?.name || 'Usuario'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground/70 italic">
                (editado)
              </span>
            )}
            {comment.isPinned && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-xs gap-1 border-primary/30 bg-primary/5 text-primary"
              >
                <Pin className="h-3 w-3" />
                Fijado
              </Badge>
            )}
            {comment.isPrivate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
                      <Lock className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Solo visible para ti</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Content Body with mention styling */}
          <div className="mt-1.5">
            {renderContent(comment.content, comment.contentHtml)}
          </div>

          {/* Actions Bar - responsive layout */}
          <div className="flex items-center gap-0.5 sm:gap-1 mt-2 -ml-1 sm:-ml-2 flex-wrap">
            {/* Reactions */}
            {allowReactions && (
              <ReactionBar
                reactions={comment.reactions}
                userReactions={userReactions}
                onReact={handleReaction}
                size="sm"
              />
            )}

            {/* Reply Button - icon only on mobile */}
            {allowReply && depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply?.(comment)}
              >
                <Reply className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Responder</span>
              </Button>
            )}

            {/* Expand Replies - compact on mobile */}
            {showReplies && hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onToggleReplies?.(comment.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-0.5 sm:mr-1" />
                <span className="hidden xs:inline sm:hidden">
                  {comment.replyCount ?? replies.length}
                </span>
                <span className="hidden sm:inline">
                  {comment.replyCount ?? replies.length}{' '}
                  {(comment.replyCount ?? replies.length) === 1 ? 'respuesta' : 'respuestas'}
                </span>
                {repliesExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-0.5 sm:ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-0.5 sm:ml-1" />
                )}
              </Button>
            )}

            {/* More Actions - always visible on touch devices */}
            {(canEdit || canDelete || canPin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(comment)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canPin && (
                    <DropdownMenuItem
                      onClick={() => onTogglePin?.(comment, !comment.isPinned)}
                    >
                      {comment.isPinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Desfijar
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Fijar
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {(canEdit || canPin) && canDelete && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete?.(comment)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && repliesExpanded && (
        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          {isLoadingReplies ? (
            <div className="ml-4 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-border/50">
              <div className="comment-skeleton comment-card flex gap-2 sm:gap-3">
                <div className="avatar h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text text-short" />
                  <div className="text text-medium" />
                  <div className="text text-long" />
                </div>
              </div>
            </div>
          ) : (
            replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                showReplies={showReplies}
                allowReply={allowReply}
                allowReactions={allowReactions}
                allowPin={allowPin}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default CommentCard;
