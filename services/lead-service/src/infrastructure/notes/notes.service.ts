/**
 * Notes Service
 * Manages notes and comments for CRM entities with threading support
 * Includes notification system for @mentions (users and groups)
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  ListNotesOptions,
  PaginatedNotesResponse,
  ThreadSummary,
  NoteEntityType,
  NoteMention,
  NoteReactions,
  SUPPORTED_REACTIONS,
} from './types';
import { NotificationOrchestrator, NotificationRecipient, NotificationPayload } from '../messaging';
import { UserTagsService } from '../user-tags';

// Simple markdown to HTML conversion (for basic cases)
function markdownToHtml(content: string): string {
  let html = content;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Mentions (convert @[name](userId) to span)
  html = html.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '<span class="mention" data-user-id="$2">@$1</span>');

  return html;
}

// Types for parsed mentions
interface ParsedMention {
  type: 'user' | 'group';
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

// Extract mentions from content (both users and groups)
function extractMentions(content: string): NoteMention[] {
  const mentions: NoteMention[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      userId: match[2],
      userName: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

// Extract and categorize mentions (user vs group)
function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  // Matches both @[Name](userId) and @[GroupName](tag:tagId)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const idOrTag = match[2];
    const name = match[1];

    // Check if it's a group mention (starts with "tag:")
    if (idOrTag.startsWith('tag:')) {
      mentions.push({
        type: 'group',
        id: idOrTag.replace('tag:', ''),
        name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    } else {
      mentions.push({
        type: 'user',
        id: idOrTag,
        name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return mentions;
}

@injectable()
export class NotesService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    private readonly notificationOrchestrator?: NotificationOrchestrator,
    private readonly userTagsService?: UserTagsService
  ) {}

  /**
   * Create a new note
   */
  async createNote(
    tenantId: string,
    userId: string,
    request: CreateNoteRequest
  ): Promise<Result<Note>> {
    try {
      const id = uuidv4();
      const now = new Date();

      // Process content
      const contentType = request.contentType || 'text';
      let contentHtml: string | null = null;

      if (contentType === 'markdown') {
        contentHtml = markdownToHtml(request.content);
      } else if (contentType === 'html') {
        contentHtml = request.content;
      }

      // Extract mentions if not provided
      const mentions = request.mentions || extractMentions(request.content);

      // Determine thread ID
      let threadId = id; // New notes are their own thread root
      if (request.parentId) {
        // Get parent's thread ID
        const parentResult = await this.pool.query(
          `SELECT thread_id FROM notes WHERE id = $1 AND tenant_id = $2`,
          [request.parentId, tenantId]
        );

        if (parentResult.isFailure || !parentResult.value || !parentResult.value.rows[0]) {
          return Result.fail('Parent note not found');
        }

        threadId = parentResult.value.rows[0].thread_id;
      }

      const query = `
        INSERT INTO notes (
          id, tenant_id, entity_type, entity_id,
          parent_id, thread_id, content, content_html, content_type,
          mentions, note_type, is_pinned, is_private,
          reactions, is_edited, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.entityType,
        request.entityId,
        request.parentId || null,
        threadId,
        request.content,
        contentHtml,
        contentType,
        JSON.stringify(mentions),
        request.noteType || 'note',
        false,
        request.isPrivate || false,
        JSON.stringify({}),
        false,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to create note');
      }

      const createdNote = this.mapRowToNote(result.value.rows[0]);

      // Get author name for notifications
      const authorResult = await this.pool.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [userId]
      );
      const authorName = authorResult.value?.rows[0]?.full_name || 'Usuario';

      // Send mention notifications asynchronously (don't block the response)
      this.sendMentionNotifications(tenantId, createdNote, userId, authorName).catch((err) => {
        console.error('Error sending mention notifications:', err);
      });

      return Result.ok(createdNote);
    } catch (error) {
      return Result.fail(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a note by ID
   */
  async getNoteById(tenantId: string, noteId: string): Promise<Result<Note | null>> {
    try {
      const query = `
        SELECT n.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM notes WHERE parent_id = n.id AND deleted_at IS NULL) as reply_count,
               (SELECT COUNT(*) FROM attachments WHERE entity_type = 'note' AND entity_id = n.id AND deleted_at IS NULL) as attachment_count
        FROM notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1 AND n.tenant_id = $2 AND n.deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [noteId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch note');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToNote(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a note
   */
  async updateNote(
    tenantId: string,
    noteId: string,
    userId: string,
    request: UpdateNoteRequest
  ): Promise<Result<Note>> {
    try {
      // Check if user is the author
      const existingResult = await this.getNoteById(tenantId, noteId);
      if (existingResult.isFailure) {
        return Result.fail(existingResult.error || 'Failed to get note');
      }

      if (!existingResult.value) {
        return Result.fail('Note not found');
      }

      const existing = existingResult.value;

      // Only author can edit content (admins can pin/unpin)
      if (request.content !== undefined && existing.createdBy !== userId) {
        return Result.fail('Only the author can edit the note content');
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(request.content);

        // Update HTML if markdown
        const contentType = request.contentType || existing.contentType;
        if (contentType === 'markdown') {
          updates.push(`content_html = $${paramIndex++}`);
          values.push(markdownToHtml(request.content));
        }

        updates.push(`is_edited = true`);
        updates.push(`edited_at = NOW()`);

        // Update mentions
        const mentions = request.mentions || extractMentions(request.content);
        updates.push(`mentions = $${paramIndex++}`);
        values.push(JSON.stringify(mentions));
      }

      if (request.contentType !== undefined) {
        updates.push(`content_type = $${paramIndex++}`);
        values.push(request.contentType);
      }

      if (request.isPinned !== undefined) {
        updates.push(`is_pinned = $${paramIndex++}`);
        values.push(request.isPinned);
      }

      if (request.isPrivate !== undefined) {
        updates.push(`is_private = $${paramIndex++}`);
        values.push(request.isPrivate);
      }

      if (updates.length === 0) {
        return Result.ok(existing);
      }

      updates.push('updated_at = NOW()');

      const query = `
        UPDATE notes
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
      `;

      values.push(noteId, tenantId);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to update note');
      }

      return Result.ok(this.mapRowToNote(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(
    tenantId: string,
    noteId: string,
    userId: string
  ): Promise<Result<void>> {
    try {
      // Check if user is the author
      const existingResult = await this.getNoteById(tenantId, noteId);
      if (existingResult.isFailure) {
        return Result.fail(existingResult.error || 'Failed to get note');
      }

      if (!existingResult.value) {
        return Result.fail('Note not found');
      }

      // Note: In production, also allow admins to delete
      if (existingResult.value.createdBy !== userId) {
        return Result.fail('Only the author can delete the note');
      }

      const query = `
        UPDATE notes
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [noteId, tenantId]);

      if (result.isFailure) {
        return Result.fail('Failed to delete note');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List notes with filtering and pagination
   */
  async listNotes(
    tenantId: string,
    options: ListNotesOptions
  ): Promise<Result<PaginatedNotesResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['n.tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (!options.includeDeleted) {
        conditions.push('n.deleted_at IS NULL');
      }

      if (options.entityType) {
        conditions.push(`n.entity_type = $${paramIndex++}`);
        values.push(options.entityType);
      }

      if (options.entityId) {
        conditions.push(`n.entity_id = $${paramIndex++}`);
        values.push(options.entityId);
      }

      if (options.noteType) {
        conditions.push(`n.note_type = $${paramIndex++}`);
        values.push(options.noteType);
      }

      if (options.isPinned !== undefined) {
        conditions.push(`n.is_pinned = $${paramIndex++}`);
        values.push(options.isPinned);
      }

      if (options.threadId) {
        conditions.push(`n.thread_id = $${paramIndex++}`);
        values.push(options.threadId);
      }

      if (options.parentId === null) {
        conditions.push('n.parent_id IS NULL');
      } else if (options.parentId) {
        conditions.push(`n.parent_id = $${paramIndex++}`);
        values.push(options.parentId);
      }

      if (options.createdBy) {
        conditions.push(`n.created_by = $${paramIndex++}`);
        values.push(options.createdBy);
      }

      if (options.search) {
        conditions.push(`n.content ILIKE $${paramIndex++}`);
        values.push(`%${options.search}%`);
      }

      const whereClause = conditions.join(' AND ');

      // Sort order
      let orderBy = 'n.created_at DESC';
      if (options.sortBy === 'updatedAt') {
        orderBy = `n.updated_at ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      } else if (options.sortBy === 'isPinned') {
        orderBy = `n.is_pinned DESC, n.created_at ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      } else if (options.sortOrder === 'asc') {
        orderBy = 'n.created_at ASC';
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM notes n WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count notes');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get notes
      const query = `
        SELECT n.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM notes WHERE parent_id = n.id AND deleted_at IS NULL) as reply_count,
               (SELECT COUNT(*) FROM attachments WHERE entity_type = 'note' AND entity_id = n.id AND deleted_at IS NULL) as attachment_count
        FROM notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list notes');
      }

      const notes = result.value.rows.map((row: Record<string, unknown>) => this.mapRowToNote(row));

      // Optionally include replies
      if (options.includeReplies) {
        for (const note of notes) {
          if (note.replyCount && note.replyCount > 0) {
            const repliesResult = await this.getReplies(tenantId, note.id);
            if (repliesResult.isSuccess && repliesResult.value) {
              note.replies = repliesResult.value;
            }
          }
        }
      }

      return Result.ok({
        notes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get replies to a note
   */
  async getReplies(tenantId: string, noteId: string): Promise<Result<Note[]>> {
    try {
      const query = `
        SELECT n.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM notes WHERE parent_id = n.id AND deleted_at IS NULL) as reply_count,
               (SELECT COUNT(*) FROM attachments WHERE entity_type = 'note' AND entity_id = n.id AND deleted_at IS NULL) as attachment_count
        FROM notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.parent_id = $1 AND n.tenant_id = $2 AND n.deleted_at IS NULL
        ORDER BY n.created_at ASC
      `;

      const result = await this.pool.query(query, [noteId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to get replies');
      }

      return Result.ok(result.value.rows.map((row: Record<string, unknown>) => this.mapRowToNote(row)));
    } catch (error) {
      return Result.fail(`Failed to get replies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a reaction to a note
   */
  async addReaction(
    tenantId: string,
    noteId: string,
    userId: string,
    emoji: string
  ): Promise<Result<Note>> {
    try {
      // Validate emoji
      if (!SUPPORTED_REACTIONS.includes(emoji as typeof SUPPORTED_REACTIONS[number])) {
        return Result.fail(`Unsupported reaction: ${emoji}`);
      }

      // Get current reactions
      const existingResult = await this.getNoteById(tenantId, noteId);
      if (existingResult.isFailure || !existingResult.value) {
        return Result.fail(existingResult.error || 'Note not found');
      }

      const reactions = existingResult.value.reactions || {};

      // Add user to reaction
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      if (!reactions[emoji].includes(userId)) {
        reactions[emoji].push(userId);
      }

      // Update note
      const query = `
        UPDATE notes
        SET reactions = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        JSON.stringify(reactions),
        noteId,
        tenantId,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to add reaction');
      }

      return Result.ok(this.mapRowToNote(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to add reaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a reaction from a note
   */
  async removeReaction(
    tenantId: string,
    noteId: string,
    userId: string,
    emoji: string
  ): Promise<Result<Note>> {
    try {
      // Get current reactions
      const existingResult = await this.getNoteById(tenantId, noteId);
      if (existingResult.isFailure || !existingResult.value) {
        return Result.fail(existingResult.error || 'Note not found');
      }

      const reactions = existingResult.value.reactions || {};

      // Remove user from reaction
      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      // Update note
      const query = `
        UPDATE notes
        SET reactions = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        JSON.stringify(reactions),
        noteId,
        tenantId,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to remove reaction');
      }

      return Result.ok(this.mapRowToNote(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to remove reaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pin/unpin a note
   */
  async togglePin(
    tenantId: string,
    noteId: string,
    isPinned: boolean
  ): Promise<Result<Note>> {
    try {
      const query = `
        UPDATE notes
        SET is_pinned = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [isPinned, noteId, tenantId]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to update pin status');
      }

      return Result.ok(this.mapRowToNote(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to toggle pin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get thread summary
   */
  async getThreadSummary(tenantId: string, threadId: string): Promise<Result<ThreadSummary | null>> {
    try {
      // Get root note
      const rootQuery = `
        SELECT n.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar
        FROM notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1 AND n.tenant_id = $2 AND n.deleted_at IS NULL
      `;

      const rootResult = await this.pool.query(rootQuery, [threadId, tenantId]);

      if (rootResult.isFailure || !rootResult.value || !rootResult.value.rows[0]) {
        return Result.ok(null);
      }

      // Get thread stats
      const statsQuery = `
        SELECT
          COUNT(*) as reply_count,
          MAX(created_at) as last_reply_at,
          array_agg(DISTINCT created_by) as participant_ids
        FROM notes
        WHERE thread_id = $1 AND tenant_id = $2 AND parent_id IS NOT NULL AND deleted_at IS NULL
      `;

      const statsResult = await this.pool.query(statsQuery, [threadId, tenantId]);

      const stats = statsResult.value?.rows[0] || { reply_count: 0, last_reply_at: null, participant_ids: [] };

      // Get participant details
      let participants: Array<{ id: string; name: string; avatarUrl?: string }> = [];
      if (stats.participant_ids && stats.participant_ids.length > 0 && stats.participant_ids[0] !== null) {
        const participantsQuery = `
          SELECT id, full_name as name, avatar_url
          FROM users
          WHERE id = ANY($1)
        `;

        const participantsResult = await this.pool.query(participantsQuery, [stats.participant_ids]);
        if (participantsResult.isSuccess && participantsResult.value) {
          participants = participantsResult.value.rows.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            name: row.name as string,
            avatarUrl: row.avatar_url as string | undefined,
          }));
        }
      }

      return Result.ok({
        threadId,
        rootNote: this.mapRowToNote(rootResult.value.rows[0]),
        replyCount: parseInt(stats.reply_count, 10) || 0,
        lastReplyAt: stats.last_reply_at ? new Date(stats.last_reply_at) : undefined,
        participants,
      });
    } catch (error) {
      return Result.fail(`Failed to get thread summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get notes for entity
   */
  async getNotesForEntity(
    tenantId: string,
    entityType: NoteEntityType,
    entityId: string,
    options?: Partial<ListNotesOptions>
  ): Promise<Result<PaginatedNotesResponse>> {
    return this.listNotes(tenantId, {
      ...options,
      entityType,
      entityId,
      parentId: undefined, // Only get root notes
    });
  }

  /**
   * Get pinned notes for entity
   */
  async getPinnedNotes(
    tenantId: string,
    entityType: NoteEntityType,
    entityId: string
  ): Promise<Result<Note[]>> {
    try {
      const query = `
        SELECT n.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM notes WHERE parent_id = n.id AND deleted_at IS NULL) as reply_count
        FROM notes n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.entity_type = $1 AND n.entity_id = $2 AND n.tenant_id = $3
              AND n.is_pinned = true AND n.deleted_at IS NULL
        ORDER BY n.created_at DESC
      `;

      const result = await this.pool.query(query, [entityType, entityId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to get pinned notes');
      }

      return Result.ok(result.value.rows.map((row: Record<string, unknown>) => this.mapRowToNote(row)));
    } catch (error) {
      return Result.fail(`Failed to get pinned notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to Note object
   */
  private mapRowToNote(row: Record<string, unknown>): Note {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      entityType: row.entity_type as NoteEntityType,
      entityId: row.entity_id as string,
      parentId: row.parent_id as string | undefined,
      threadId: row.thread_id as string | undefined,
      replyCount: row.reply_count ? parseInt(row.reply_count as string, 10) : undefined,
      content: row.content as string,
      contentHtml: row.content_html as string | undefined,
      contentType: (row.content_type as 'text' | 'markdown' | 'html') || 'text',
      mentions: (typeof row.mentions === 'string' ? JSON.parse(row.mentions) : row.mentions) as NoteMention[] || [],
      noteType: (row.note_type as 'note' | 'comment' | 'internal' | 'system') || 'note',
      isPinned: row.is_pinned as boolean || false,
      isPrivate: row.is_private as boolean || false,
      reactions: (typeof row.reactions === 'string' ? JSON.parse(row.reactions) : row.reactions) as NoteReactions || {},
      isEdited: row.is_edited as boolean || false,
      editedAt: row.edited_at ? new Date(row.edited_at as string) : undefined,
      author: row.author_name
        ? {
            id: row.created_by as string,
            name: row.author_name as string,
            email: row.author_email as string,
            avatarUrl: row.author_avatar as string | undefined,
          }
        : undefined,
      attachmentCount: row.attachment_count ? parseInt(row.attachment_count as string, 10) : undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : undefined,
    };
  }

  /**
   * Send notifications for @mentions in a note
   * Handles both individual user mentions and group mentions
   */
  private async sendMentionNotifications(
    tenantId: string,
    note: Note,
    authorId: string,
    authorName: string
  ): Promise<void> {
    // Early exit if notification orchestrator is not available
    if (!this.notificationOrchestrator) {
      return;
    }

    try {
      // Parse mentions to distinguish users vs groups
      const mentions = parseMentions(note.content);
      if (mentions.length === 0) {
        return;
      }

      // Get entity name for notification context
      const entityName = await this.getEntityName(tenantId, note.entityType, note.entityId);

      // Create comment preview (first 100 chars)
      const commentPreview = note.content
        .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1') // Replace mention markup with plain @name
        .substring(0, 100)
        .trim() + (note.content.length > 100 ? '...' : '');

      // Get base URL for action links
      const baseUrl = process.env.APP_URL || 'https://crm.zuclubit.com';
      const actionUrl = `${baseUrl}/app/${note.entityType}s/${note.entityId}`;

      // Separate user mentions from group mentions
      const userMentions = mentions.filter(m => m.type === 'user');
      const groupMentions = mentions.filter(m => m.type === 'group');

      // Process individual user mentions
      for (const mention of userMentions) {
        // Skip if mentioning self
        if (mention.id === authorId) {
          continue;
        }

        // Get user details for notification
        const userResult = await this.pool.query(
          `SELECT id, full_name, email, phone FROM users WHERE id = $1`,
          [mention.id]
        );

        if (userResult.isSuccess && userResult.value?.rows[0]) {
          const user = userResult.value.rows[0];

          const recipient: NotificationRecipient = {
            userId: user.id,
            role: 'mentioned_user' as 'team', // Cast to allowed role type
            name: user.full_name || mention.name,
            email: user.email,
            phone: user.phone,
          };

          // Send notification
          await this.notificationOrchestrator.notify(
            tenantId,
            'comment.mention',
            recipient,
            {
              recipientName: recipient.name,
              mentionedBy: authorName,
              commentPreview,
              entityType: this.getEntityTypeDisplay(note.entityType),
              entityName,
              commentDate: new Date().toLocaleString('es-MX', {
                dateStyle: 'medium',
                timeStyle: 'short'
              }),
              actionUrl,
              appName: 'Ventazo CRM',
            },
            note.entityType as NotificationPayload['entityType'],
            note.entityId
          );
        }
      }

      // Process group mentions
      if (groupMentions.length > 0 && this.userTagsService) {
        for (const mention of groupMentions) {
          // Get all members of the tag/group
          const membersResult = await this.userTagsService.getTagMembers(tenantId, mention.id);

          if (membersResult.isSuccess && membersResult.value) {
            const members = membersResult.value; // Direct array of TagMember

            // Notify each group member
            for (const member of members) {
              // Skip if mentioning self
              if (member.userId === authorId) {
                continue;
              }

              const recipient: NotificationRecipient = {
                userId: member.userId,
                role: 'team',
                name: member.fullName,
                email: member.email,
              };

              // Send group mention notification
              await this.notificationOrchestrator.notify(
                tenantId,
                'comment.group_mention',
                recipient,
                {
                  recipientName: recipient.name,
                  mentionedBy: authorName,
                  groupName: mention.name,
                  commentPreview,
                  entityType: this.getEntityTypeDisplay(note.entityType),
                  entityName,
                  commentDate: new Date().toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }),
                  actionUrl,
                  appName: 'Ventazo CRM',
                },
                note.entityType as NotificationPayload['entityType'],
                note.entityId
              );
            }
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the note creation
      console.error('Failed to send mention notifications:', error);
    }
  }

  /**
   * Get entity name for notification context
   */
  private async getEntityName(tenantId: string, entityType: NoteEntityType, entityId: string): Promise<string> {
    try {
      let query = '';
      let nameField = 'name';

      switch (entityType) {
        case 'lead':
          query = `SELECT company_name as name FROM leads WHERE id = $1 AND tenant_id = $2`;
          break;
        case 'customer':
          query = `SELECT company_name as name FROM customers WHERE id = $1 AND tenant_id = $2`;
          break;
        case 'opportunity':
          query = `SELECT name FROM opportunities WHERE id = $1 AND tenant_id = $2`;
          break;
        case 'task':
          query = `SELECT title as name FROM tasks WHERE id = $1 AND tenant_id = $2`;
          break;
        case 'contact':
          query = `SELECT CONCAT(first_name, ' ', last_name) as name FROM lead_contacts WHERE id = $1 AND tenant_id = $2`;
          break;
        default:
          return entityType;
      }

      const result = await this.pool.query(query, [entityId, tenantId]);

      if (result.isSuccess && result.value?.rows[0]) {
        return result.value.rows[0].name || entityType;
      }

      return entityType;
    } catch {
      return entityType;
    }
  }

  /**
   * Get display name for entity type
   */
  private getEntityTypeDisplay(entityType: NoteEntityType): string {
    const displays: Record<NoteEntityType, string> = {
      lead: 'Lead',
      customer: 'Cliente',
      opportunity: 'Oportunidad',
      task: 'Tarea',
      contact: 'Contacto',
      quote: 'Cotización',
    };
    return displays[entityType] || entityType;
  }
}
