'use client';

/**
 * CommentSection Component
 * Unified comments section for CRM entities
 *
 * @module components/comments/CommentSection
 */

import * as React from 'react';
import { Loader2, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type {
  Comment,
  CommentEntityType,
  CommentMention,
  SupportedReaction,
} from '@/lib/comments/types';
import {
  useCommentManagement,
  useCommentReplies,
} from '@/lib/comments/hooks';
import { useAuthStore } from '@/store/auth.store';
import { CommentCard } from './CommentCard';
import { CommentInput } from './CommentInput';

// ============================================
// Types
// ============================================

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  allowReplies?: boolean;
  allowReactions?: boolean;
  allowMentions?: boolean;
  allowMarkdown?: boolean;
  allowPin?: boolean;
  maxDepth?: number;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
  maxHeight?: string | number;
  className?: string;
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

interface CommentWithRepliesProps {
  comment: Comment;
  currentUserId: string;
  isAdmin: boolean;
  allowReply: boolean;
  allowReactions: boolean;
  allowPin: boolean;
  maxDepth: number;
  entityType: CommentEntityType;
  entityId: string;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  onTogglePin: (comment: Comment, pinned: boolean) => void;
  onAddReaction: (commentId: string, emoji: SupportedReaction) => void;
  onRemoveReaction: (commentId: string, emoji: SupportedReaction) => void;
  depth?: number;
}

// ============================================
// Sub-components
// ============================================

function CommentWithReplies({
  comment,
  currentUserId,
  isAdmin,
  allowReply,
  allowReactions,
  allowPin,
  maxDepth,
  entityType,
  entityId,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onAddReaction,
  onRemoveReaction,
  depth = 0,
}: CommentWithRepliesProps) {
  const [repliesExpanded, setRepliesExpanded] = React.useState(false);
  const [loadedReplies, setLoadedReplies] = React.useState<Comment[]>([]);

  // Fetch replies when expanded
  const { data: replies, isLoading: isLoadingReplies } = useCommentReplies(
    comment.id,
    { enabled: repliesExpanded && (comment.replyCount ?? 0) > 0 }
  );

  React.useEffect(() => {
    if (replies) {
      setLoadedReplies(replies);
    }
  }, [replies]);

  const handleToggleReplies = () => {
    setRepliesExpanded(!repliesExpanded);
  };

  return (
    <CommentCard
      comment={comment}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      showReplies={true}
      allowReply={allowReply}
      allowReactions={allowReactions}
      allowPin={allowPin}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onTogglePin={onTogglePin}
      onAddReaction={onAddReaction}
      onRemoveReaction={onRemoveReaction}
      onToggleReplies={handleToggleReplies}
      repliesExpanded={repliesExpanded}
      replies={loadedReplies}
      isLoadingReplies={isLoadingReplies}
      depth={depth}
      maxDepth={maxDepth}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground max-w-[200px]">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 py-4">
      {/* Skeleton comments */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="comment-skeleton comment-card flex gap-3">
          <div className="avatar h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="text text-short h-4" />
            <div className="text text-long h-3" />
            <div className="text text-medium h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Error al cargar los comentarios</span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// ============================================
// Main Component
// ============================================

export function CommentSection({
  entityType,
  entityId,
  allowReplies = true,
  allowReactions = true,
  allowMentions = true,
  allowMarkdown = true,
  allowPin = false,
  maxDepth = 3,
  title = 'Comentarios',
  placeholder = 'Escribe un comentario...',
  emptyMessage = 'No hay comentarios aun. Se el primero en comentar.',
  maxHeight,
  className,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) {
  const [replyingTo, setReplyingTo] = React.useState<Comment | null>(null);
  const [editingComment, setEditingComment] = React.useState<Comment | null>(null);

  // Get current user
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  // Comment management hook
  const {
    comments,
    pinnedComments,
    total,
    isLoading,
    isError,
    isCreating,
    addComment,
    editComment,
    removeComment,
    react,
    unreact,
    togglePin,
    refresh,
  } = useCommentManagement(entityType, entityId, {
    includeReplies: false,
    enabled: !!entityId,
  });

  // Get top-level comments (no parent)
  const topLevelComments = React.useMemo(() => {
    return comments.filter((c) => !c.parentId);
  }, [comments]);

  // Handle submit new comment
  const handleSubmit = async (content: string, mentions: CommentMention[]) => {
    try {
      const newComment = await addComment({
        content,
        mentions: mentions.length > 0 ? mentions : undefined,
        parentId: replyingTo?.id,
      });

      setReplyingTo(null);
      onCommentAdded?.(newComment);
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  };

  // Handle edit comment
  const handleEdit = async (content: string, mentions: CommentMention[]) => {
    if (!editingComment) return;

    try {
      await editComment(editingComment.id, {
        content,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setEditingComment(null);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  // Handle delete comment
  const handleDelete = async (comment: Comment) => {
    try {
      await removeComment(comment.id, comment.parentId);
      onCommentDeleted?.(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (comment: Comment, pinned: boolean) => {
    try {
      await togglePin(comment.id, pinned);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Handle add reaction
  const handleAddReaction = async (commentId: string, emoji: SupportedReaction) => {
    try {
      await react(commentId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Handle remove reaction
  const handleRemoveReaction = async (commentId: string, emoji: SupportedReaction) => {
    try {
      await unreact(commentId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  // Handle reply
  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
  };

  // Handle start editing
  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      {title && (
        <>
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {title}
              {total > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({total})
                </span>
              )}
            </h3>
            {!isLoading && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={refresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Separator className="mb-4" />
        </>
      )}

      {/* Pinned Comments */}
      {pinnedComments.length > 0 && (
        <div className="mb-4 space-y-3">
          {pinnedComments.map((comment) => (
            <CommentWithReplies
              key={`pinned-${comment.id}`}
              comment={comment}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              allowReply={allowReplies}
              allowReactions={allowReactions}
              allowPin={allowPin}
              maxDepth={maxDepth}
              entityType={entityType}
              entityId={entityId}
              onReply={handleReply}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          ))}
          <Separator className="my-4" />
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refresh} />
      ) : topLevelComments.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ScrollArea
          className={cn('pr-4', maxHeight && `max-h-[${maxHeight}]`)}
          style={maxHeight ? { maxHeight } : undefined}
        >
          <div className="space-y-4">
            {topLevelComments.map((comment) => (
              <CommentWithReplies
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                allowReply={allowReplies}
                allowReactions={allowReactions}
                allowPin={allowPin}
                maxDepth={maxDepth}
                entityType={entityType}
                entityId={entityId}
                onReply={handleReply}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Input Area */}
      <div className="mt-4 pt-4 border-t">
        {editingComment ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Editando comentario</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
            </div>
            <CommentInput
              placeholder="Editar comentario..."
              allowMentions={allowMentions}
              allowMarkdown={allowMarkdown}
              onSubmit={handleEdit}
              isSubmitting={isCreating}
              autoFocus
            />
          </div>
        ) : (
          <CommentInput
            placeholder={placeholder}
            allowMentions={allowMentions}
            allowMarkdown={allowMarkdown}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            onSubmit={handleSubmit}
            isSubmitting={isCreating}
          />
        )}
      </div>
    </div>
  );
}

export default CommentSection;
