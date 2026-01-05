/**
 * User Tags Types
 * Types and interfaces for the user tagging system
 */

// ============================================================================
// Domain Types
// ============================================================================

export interface UserTag {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  memberCount?: number;
}

export interface UserTagAssignment {
  id: string;
  tagId: string;
  userId: string;
  tenantId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface TagMember {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  assignedAt: Date;
  assignedBy: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateUserTagRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateUserTagRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface AssignTagMembersRequest {
  userIds: string[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface UserTagWithMembers extends UserTag {
  members: TagMember[];
}

export interface UserTagsListResponse {
  data: UserTag[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface TagMembersResponse {
  data: TagMember[];
  meta: {
    total: number;
  };
}

// ============================================================================
// Query Options
// ============================================================================

export interface ListUserTagsOptions {
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  search?: string;
}

// ============================================================================
// For Mentions - Simplified Tag Info
// ============================================================================

export interface MentionableTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string | null;
  memberCount: number;
}
