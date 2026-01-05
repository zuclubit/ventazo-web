/**
 * User Tags Types
 * For group labels that can be assigned to users for @mentions
 */

// =============================================================================
// User Tag Entity
// =============================================================================

export interface UserTag {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  isActive: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagMember {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  assignedAt: string;
  assignedBy: string;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateTagRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateTagRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface AssignMembersRequest {
  userIds: string[];
}

// =============================================================================
// Response Types
// =============================================================================

export interface TagsListResponse {
  data: UserTag[];
  meta: {
    total: number;
  };
}

export interface TagMembersResponse {
  data: TagMember[];
  meta: {
    total: number;
  };
}

// =============================================================================
// Query Options
// =============================================================================

export interface ListTagsOptions {
  includeInactive?: boolean;
  search?: string;
}

// =============================================================================
// Mention Format Types
// =============================================================================

export interface MentionOption {
  type: 'user' | 'group';
  id: string;
  name: string;
  label: string;
  description?: string;
  avatarUrl?: string;
  color?: string;
  icon?: string;
}
