/**
 * User Tags Service
 * Manages user tags (group labels) for notification and mention systems
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import type {
  UserTag,
  UserTagAssignment,
  TagMember,
  CreateUserTagRequest,
  UpdateUserTagRequest,
  ListUserTagsOptions,
  MentionableTag,
} from './types';

// Helper to create URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@injectable()
export class UserTagsService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  // ============================================================================
  // Tag CRUD Operations
  // ============================================================================

  /**
   * Create a new user tag
   */
  async createTag(
    tenantId: string,
    userId: string,
    request: CreateUserTagRequest
  ): Promise<Result<UserTag>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const slug = slugify(request.name);

      // Check for duplicate slug
      const existingResult = await this.pool.query(
        `SELECT id FROM user_tags WHERE tenant_id = $1 AND slug = $2`,
        [tenantId, slug]
      );

      if (existingResult.isFailure) {
        return Result.fail('Failed to check for existing tag');
      }

      if (existingResult.value && existingResult.value.rows.length > 0) {
        return Result.fail(`A tag with the name "${request.name}" already exists`);
      }

      const query = `
        INSERT INTO user_tags (
          id, tenant_id, name, slug, description, color, icon,
          is_active, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.name,
        slug,
        request.description || null,
        request.color || '#6366f1',
        request.icon || null,
        true,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to create tag');
      }

      return Result.ok(this.mapRowToTag(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a tag by ID
   */
  async getTagById(tenantId: string, tagId: string): Promise<Result<UserTag | null>> {
    try {
      const query = `
        SELECT t.*,
          (SELECT COUNT(*) FROM user_tag_assignments WHERE tag_id = t.id) as member_count
        FROM user_tags t
        WHERE t.id = $1 AND t.tenant_id = $2
      `;

      const result = await this.pool.query(query, [tagId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch tag');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToTag(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all tags for a tenant
   */
  async listTags(
    tenantId: string,
    options: ListUserTagsOptions = {}
  ): Promise<Result<{ data: UserTag[]; total: number }>> {
    try {
      const { page = 1, pageSize = 50, includeInactive = false, search } = options;
      const offset = (page - 1) * pageSize;

      let whereClause = 'WHERE t.tenant_id = $1';
      const params: (string | boolean | number)[] = [tenantId];
      let paramIndex = 2;

      if (!includeInactive) {
        whereClause += ` AND t.is_active = $${paramIndex}`;
        params.push(true);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) as total FROM user_tags t ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count tags');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Data query
      const dataQuery = `
        SELECT t.*,
          (SELECT COUNT(*) FROM user_tag_assignments WHERE tag_id = t.id) as member_count
        FROM user_tags t
        ${whereClause}
        ORDER BY t.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataResult = await this.pool.query(dataQuery, [...params, pageSize, offset]);

      if (dataResult.isFailure || !dataResult.value) {
        return Result.fail('Failed to list tags');
      }

      const tags = dataResult.value.rows.map((row: Record<string, unknown>) => this.mapRowToTag(row));

      return Result.ok({ data: tags, total });
    } catch (error) {
      return Result.fail(`Failed to list tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a tag
   */
  async updateTag(
    tenantId: string,
    tagId: string,
    request: UpdateUserTagRequest
  ): Promise<Result<UserTag>> {
    try {
      const now = new Date();
      const updates: string[] = ['updated_at = $3'];
      const params: (string | boolean | Date)[] = [tagId, tenantId, now];
      let paramIndex = 4;

      if (request.name !== undefined) {
        const newSlug = slugify(request.name);

        // Check for duplicate slug (excluding current tag)
        const existingResult = await this.pool.query(
          `SELECT id FROM user_tags WHERE tenant_id = $1 AND slug = $2 AND id != $3`,
          [tenantId, newSlug, tagId]
        );

        if (existingResult.value && existingResult.value.rows.length > 0) {
          return Result.fail(`A tag with the name "${request.name}" already exists`);
        }

        updates.push(`name = $${paramIndex}`);
        params.push(request.name);
        paramIndex++;

        updates.push(`slug = $${paramIndex}`);
        params.push(newSlug);
        paramIndex++;
      }

      if (request.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(request.description);
        paramIndex++;
      }

      if (request.color !== undefined) {
        updates.push(`color = $${paramIndex}`);
        params.push(request.color);
        paramIndex++;
      }

      if (request.icon !== undefined) {
        updates.push(`icon = $${paramIndex}`);
        params.push(request.icon);
        paramIndex++;
      }

      if (request.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        params.push(request.isActive);
        paramIndex++;
      }

      const query = `
        UPDATE user_tags
        SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, params);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to update tag or tag not found');
      }

      return Result.ok(this.mapRowToTag(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(tenantId: string, tagId: string): Promise<Result<void>> {
    try {
      const query = `DELETE FROM user_tags WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [tagId, tenantId]);

      if (result.isFailure) {
        return Result.fail('Failed to delete tag');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  /**
   * Get members of a tag
   */
  async getTagMembers(tenantId: string, tagId: string): Promise<Result<TagMember[]>> {
    try {
      const query = `
        SELECT
          u.id as user_id,
          u.full_name,
          u.email,
          u.avatar_url,
          a.assigned_at,
          a.assigned_by
        FROM user_tag_assignments a
        JOIN users u ON a.user_id = u.id
        WHERE a.tag_id = $1 AND a.tenant_id = $2
        ORDER BY u.full_name ASC
      `;

      const result = await this.pool.query(query, [tagId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch tag members');
      }

      const members: TagMember[] = result.value.rows.map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        fullName: row.full_name as string || row.email as string,
        email: row.email as string,
        avatarUrl: row.avatar_url as string | null,
        assignedAt: new Date(row.assigned_at as string),
        assignedBy: row.assigned_by as string,
      }));

      return Result.ok(members);
    } catch (error) {
      return Result.fail(`Failed to get tag members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign users to a tag
   */
  async assignMembers(
    tenantId: string,
    tagId: string,
    userIds: string[],
    assignedBy: string
  ): Promise<Result<{ assigned: number; skipped: number }>> {
    try {
      let assigned = 0;
      let skipped = 0;

      for (const userId of userIds) {
        const id = uuidv4();
        const now = new Date();

        const query = `
          INSERT INTO user_tag_assignments (id, tag_id, user_id, tenant_id, assigned_by, assigned_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tag_id, user_id) DO NOTHING
        `;

        const result = await this.pool.query(query, [id, tagId, userId, tenantId, assignedBy, now]);

        if (result.isSuccess && result.value?.rowCount === 1) {
          assigned++;
        } else {
          skipped++;
        }
      }

      return Result.ok({ assigned, skipped });
    } catch (error) {
      return Result.fail(`Failed to assign members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a user from a tag
   */
  async removeMember(tenantId: string, tagId: string, userId: string): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM user_tag_assignments
        WHERE tag_id = $1 AND user_id = $2 AND tenant_id = $3
      `;

      const result = await this.pool.query(query, [tagId, userId, tenantId]);

      if (result.isFailure) {
        return Result.fail('Failed to remove member');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all tags for a specific user
   */
  async getUserTags(tenantId: string, userId: string): Promise<Result<UserTag[]>> {
    try {
      const query = `
        SELECT t.*,
          (SELECT COUNT(*) FROM user_tag_assignments WHERE tag_id = t.id) as member_count
        FROM user_tags t
        JOIN user_tag_assignments a ON t.id = a.tag_id
        WHERE a.user_id = $1 AND t.tenant_id = $2 AND t.is_active = true
        ORDER BY t.name ASC
      `;

      const result = await this.pool.query(query, [userId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch user tags');
      }

      const tags = result.value.rows.map((row: Record<string, unknown>) => this.mapRowToTag(row));

      return Result.ok(tags);
    } catch (error) {
      return Result.fail(`Failed to get user tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // For Mention System
  // ============================================================================

  /**
   * Get all active tags for mention autocomplete
   */
  async getMentionableTags(tenantId: string): Promise<Result<MentionableTag[]>> {
    try {
      const query = `
        SELECT
          t.id,
          t.name,
          t.slug,
          t.color,
          t.icon,
          (SELECT COUNT(*) FROM user_tag_assignments WHERE tag_id = t.id) as member_count
        FROM user_tags t
        WHERE t.tenant_id = $1 AND t.is_active = true
        ORDER BY t.name ASC
      `;

      const result = await this.pool.query(query, [tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch mentionable tags');
      }

      const tags: MentionableTag[] = result.value.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        color: row.color as string,
        icon: row.icon as string | null,
        memberCount: parseInt(row.member_count as string || '0', 10),
      }));

      return Result.ok(tags);
    } catch (error) {
      return Result.fail(`Failed to get mentionable tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all user IDs for a tag (for group mention notifications)
   */
  async getTagMemberIds(tenantId: string, tagId: string): Promise<Result<string[]>> {
    try {
      const query = `
        SELECT user_id FROM user_tag_assignments
        WHERE tag_id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [tagId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch tag member IDs');
      }

      const userIds = result.value.rows.map((row: Record<string, unknown>) => row.user_id as string);

      return Result.ok(userIds);
    } catch (error) {
      return Result.fail(`Failed to get tag member IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private mapRowToTag(row: Record<string, unknown>): UserTag {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | null,
      color: row.color as string,
      icon: row.icon as string | null,
      isActive: row.is_active as boolean,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      memberCount: row.member_count !== undefined ? parseInt(row.member_count as string, 10) : undefined,
    };
  }
}
