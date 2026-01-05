/**
 * Comments Module Types
 * Unified types for threaded comments across all CRM entities
 *
 * @module lib/comments/types
 */

// ============================================
// Entity Types
// ============================================

export const COMMENT_ENTITY_TYPES = [
  'lead',
  'customer',
  'opportunity',
  'task',
  'contact',
  'quote',
] as const;

export type CommentEntityType = typeof COMMENT_ENTITY_TYPES[number];

// ============================================
// Content Types
// ============================================

export const COMMENT_CONTENT_TYPES = ['text', 'markdown', 'html'] as const;
export type CommentContentType = typeof COMMENT_CONTENT_TYPES[number];

export const COMMENT_NOTE_TYPES = ['note', 'comment', 'internal', 'system'] as const;
export type CommentNoteType = typeof COMMENT_NOTE_TYPES[number];

// ============================================
// Reactions
// ============================================

export const SUPPORTED_REACTIONS = [
  '\u{1F44D}', // thumbs up
  '\u{1F44E}', // thumbs down
  '\u{2764}\u{FE0F}', // heart
  '\u{1F389}', // celebration
  '\u{1F604}', // smile
  '\u{1F615}', // confused
  '\u{1F440}', // eyes
  '\u{1F680}', // rocket
] as const;

export type SupportedReaction = typeof SUPPORTED_REACTIONS[number];

export type CommentReactions = Record<string, string[]>; // emoji -> userIds

// ============================================
// Mention Types
// ============================================

export interface CommentMention {
  userId: string;
  userName?: string;
  startIndex: number;
  endIndex: number;
  /** Type of mention: 'user' for individual, 'group' for user tag/group */
  type?: 'user' | 'group';
}

// ============================================
// Author Types
// ============================================

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ============================================
// Comment Entity
// ============================================

export interface Comment {
  id: string;
  tenantId: string;
  entityType: CommentEntityType;
  entityId: string;

  // Threading
  parentId?: string;
  threadId?: string;
  replyCount?: number;

  // Content
  content: string;
  contentHtml?: string;
  contentType: CommentContentType;

  // Mentions
  mentions: CommentMention[];

  // Classification
  noteType: CommentNoteType;
  isPinned: boolean;
  isPrivate: boolean;

  // Reactions
  reactions: CommentReactions;

  // Edit tracking
  isEdited: boolean;
  editedAt?: string;

  // Author (populated)
  author?: CommentAuthor;

  // Attachments count
  attachmentCount?: number;

  // Nested replies (for threaded view)
  replies?: Comment[];

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================
// Request Types
// ============================================

export interface CreateCommentRequest {
  entityType: CommentEntityType;
  entityId: string;
  parentId?: string;
  content: string;
  contentType?: CommentContentType;
  noteType?: CommentNoteType;
  isPrivate?: boolean;
  mentions?: CommentMention[];
}

export interface UpdateCommentRequest {
  content?: string;
  contentType?: CommentContentType;
  isPinned?: boolean;
  isPrivate?: boolean;
  mentions?: CommentMention[];
}

export interface AddReactionRequest {
  emoji: SupportedReaction;
}

// ============================================
// Query Options
// ============================================

export interface ListCommentsOptions {
  entityType?: CommentEntityType;
  entityId?: string;
  noteType?: CommentNoteType;
  isPinned?: boolean;
  includeReplies?: boolean;
  includeDeleted?: boolean;
  threadId?: string;
  parentId?: string;
  createdBy?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'isPinned';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// Response Types
// ============================================

export interface PaginatedCommentsResponse {
  notes: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ThreadSummary {
  threadId: string;
  rootNote: Comment;
  replyCount: number;
  lastReplyAt?: string;
  participants: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
}

// ============================================
// WebSocket Event Types
// ============================================

export interface CommentCreatedEvent {
  entityType: CommentEntityType;
  entityId: string;
  comment: Comment;
}

export interface CommentUpdatedEvent {
  entityType: CommentEntityType;
  entityId: string;
  commentId: string;
  changes: Partial<Comment>;
}

export interface CommentDeletedEvent {
  entityType: CommentEntityType;
  entityId: string;
  commentId: string;
}

export interface CommentReactionEvent {
  commentId: string;
  userId: string;
  emoji: string;
  action: 'added' | 'removed';
}

export interface CommentMentionedEvent {
  commentId: string;
  entityType: CommentEntityType;
  entityId: string;
  mentionedUserId: string;
  mentionedByUserId: string;
  mentionedByName: string;
}

// ============================================
// UI Display Labels (Spanish)
// ============================================

export const ENTITY_TYPE_LABELS: Record<CommentEntityType, string> = {
  lead: 'Lead',
  customer: 'Cliente',
  opportunity: 'Oportunidad',
  task: 'Tarea',
  contact: 'Contacto',
  quote: 'Cotizacion',
};

export const NOTE_TYPE_LABELS: Record<CommentNoteType, string> = {
  note: 'Nota',
  comment: 'Comentario',
  internal: 'Interno',
  system: 'Sistema',
};

export const REACTION_LABELS: Record<string, string> = {
  '\u{1F44D}': 'Me gusta',
  '\u{1F44E}': 'No me gusta',
  '\u{2764}\u{FE0F}': 'Me encanta',
  '\u{1F389}': 'Celebrar',
  '\u{1F604}': 'Feliz',
  '\u{1F615}': 'Confundido',
  '\u{1F440}': 'Visto',
  '\u{1F680}': 'Increible',
};

// ============================================
// Utility Types
// ============================================

export interface CommentSectionState {
  comments: Comment[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  hasMore: boolean;
  page: number;
}

export interface CommentInputState {
  content: string;
  mentions: CommentMention[];
  isSubmitting: boolean;
  replyingTo?: Comment;
}
