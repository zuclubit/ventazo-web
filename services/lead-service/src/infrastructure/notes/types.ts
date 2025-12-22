/**
 * Notes/Comments Module Types
 * Types for threaded notes and comments on CRM entities
 */

/**
 * Entity types that can have notes attached
 */
export type NoteEntityType = 'lead' | 'customer' | 'opportunity' | 'task' | 'contact';

/**
 * Note content types
 */
export type NoteContentType = 'text' | 'markdown' | 'html';

/**
 * Note types for categorization
 */
export type NoteType = 'note' | 'comment' | 'internal' | 'system';

/**
 * Mention in a note
 */
export interface NoteMention {
  userId: string;
  userName?: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Reactions on a note (like GitHub reactions)
 */
export interface NoteReactions {
  [emoji: string]: string[]; // emoji -> array of user IDs
}

/**
 * Note entity
 */
export interface Note {
  id: string;
  tenantId: string;
  entityType: NoteEntityType;
  entityId: string;

  // Threading
  parentId?: string;
  threadId?: string;
  replyCount?: number;

  // Content
  content: string;
  contentHtml?: string;
  contentType: NoteContentType;

  // Mentions
  mentions: NoteMention[];

  // Classification
  noteType: NoteType;
  isPinned: boolean;
  isPrivate: boolean;

  // Reactions
  reactions: NoteReactions;

  // Edit tracking
  isEdited: boolean;
  editedAt?: Date;

  // Author info (populated from joins)
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };

  // Attachments count (from join)
  attachmentCount?: number;

  // Replies (for threaded view)
  replies?: Note[];

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Request to create a note
 */
export interface CreateNoteRequest {
  entityType: NoteEntityType;
  entityId: string;
  parentId?: string;
  content: string;
  contentType?: NoteContentType;
  noteType?: NoteType;
  isPrivate?: boolean;
  mentions?: NoteMention[];
}

/**
 * Request to update a note
 */
export interface UpdateNoteRequest {
  content?: string;
  contentType?: NoteContentType;
  isPinned?: boolean;
  isPrivate?: boolean;
  mentions?: NoteMention[];
}

/**
 * Request to add a reaction
 */
export interface AddReactionRequest {
  emoji: string;
}

/**
 * Query options for listing notes
 */
export interface ListNotesOptions {
  entityType?: NoteEntityType;
  entityId?: string;
  noteType?: NoteType;
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

/**
 * Paginated notes response
 */
export interface PaginatedNotesResponse {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Thread summary
 */
export interface ThreadSummary {
  threadId: string;
  rootNote: Note;
  replyCount: number;
  lastReplyAt?: Date;
  participants: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
}

/**
 * Activity on a note (for real-time updates)
 */
export interface NoteActivity {
  type: 'created' | 'updated' | 'deleted' | 'reaction_added' | 'reaction_removed' | 'replied';
  noteId: string;
  threadId?: string;
  userId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

/**
 * Supported reactions (for UI)
 */
export const SUPPORTED_REACTIONS = [
  '👍', // thumbs up
  '👎', // thumbs down
  '❤️', // heart
  '🎉', // celebration
  '😄', // smile
  '😕', // confused
  '👀', // eyes
  '🚀', // rocket
] as const;

export type SupportedReaction = typeof SUPPORTED_REACTIONS[number];

/**
 * Markdown parser options
 */
export interface MarkdownOptions {
  sanitize?: boolean;
  linkify?: boolean;
  mentions?: boolean;
  emoji?: boolean;
}
