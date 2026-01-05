/**
 * User Tags React Query Hooks
 * Hooks for managing group labels/tags that can be assigned to users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import type {
  UserTag,
  TagMember,
  CreateTagRequest,
  UpdateTagRequest,
  AssignMembersRequest,
  TagsListResponse,
  TagMembersResponse,
  ListTagsOptions,
  MentionOption,
} from './types';

// =============================================================================
// Query Keys
// =============================================================================

export const userTagsKeys = {
  all: ['user-tags'] as const,
  lists: () => [...userTagsKeys.all, 'list'] as const,
  list: (options?: ListTagsOptions) => [...userTagsKeys.lists(), options] as const,
  details: () => [...userTagsKeys.all, 'detail'] as const,
  detail: (id: string) => [...userTagsKeys.details(), id] as const,
  members: (tagId: string) => [...userTagsKeys.all, 'members', tagId] as const,
  userTags: (userId: string) => [...userTagsKeys.all, 'user', userId] as const,
  mentionOptions: () => [...userTagsKeys.all, 'mentions'] as const,
};

// =============================================================================
// List Tags
// =============================================================================

export function useUserTags(options?: ListTagsOptions) {
  return useQuery({
    queryKey: userTagsKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.includeInactive) params.append('includeInactive', 'true');
      if (options?.search) params.append('search', options.search);

      const queryString = params.toString();
      const url = `/user-tags${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<TagsListResponse>(url);
      return response;
    },
  });
}

// =============================================================================
// Get Tag by ID
// =============================================================================

export function useUserTag(tagId: string | undefined) {
  return useQuery({
    queryKey: userTagsKeys.detail(tagId || ''),
    queryFn: async () => {
      if (!tagId) return null;
      const response = await apiClient.get<UserTag>(`/user-tags/${tagId}`);
      return response;
    },
    enabled: !!tagId,
  });
}

// =============================================================================
// Create Tag
// =============================================================================

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest) => {
      const response = await apiClient.post<UserTag>('/user-tags', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userTagsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.mentionOptions() });
    },
  });
}

// =============================================================================
// Update Tag
// =============================================================================

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagRequest }) => {
      const response = await apiClient.put<UserTag>(`/user-tags/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userTagsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.mentionOptions() });
    },
  });
}

// =============================================================================
// Delete Tag
// =============================================================================

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      await apiClient.delete(`/user-tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userTagsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.mentionOptions() });
    },
  });
}

// =============================================================================
// Get Tag Members
// =============================================================================

export function useTagMembers(tagId: string | undefined) {
  return useQuery({
    queryKey: userTagsKeys.members(tagId || ''),
    queryFn: async () => {
      if (!tagId) return { data: [], meta: { total: 0 } };
      const response = await apiClient.get<TagMembersResponse>(`/user-tags/${tagId}/members`);
      return response;
    },
    enabled: !!tagId,
  });
}

// =============================================================================
// Assign Members to Tag
// =============================================================================

export function useAssignTagMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId, userIds }: { tagId: string; userIds: string[] }) => {
      const response = await apiClient.post<{ assignedCount: number }>(
        `/user-tags/${tagId}/members`,
        { userIds }
      );
      return response;
    },
    onSuccess: (_, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: userTagsKeys.members(tagId) });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.detail(tagId) });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.lists() });
    },
  });
}

// =============================================================================
// Remove Member from Tag
// =============================================================================

export function useRemoveTagMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tagId, userId }: { tagId: string; userId: string }) => {
      await apiClient.delete(`/user-tags/${tagId}/members/${userId}`);
    },
    onSuccess: (_, { tagId }) => {
      queryClient.invalidateQueries({ queryKey: userTagsKeys.members(tagId) });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.detail(tagId) });
      queryClient.invalidateQueries({ queryKey: userTagsKeys.lists() });
    },
  });
}

// =============================================================================
// Get User's Tags
// =============================================================================

export function useUserAssignedTags(userId: string | undefined) {
  return useQuery({
    queryKey: userTagsKeys.userTags(userId || ''),
    queryFn: async () => {
      if (!userId) return { data: [], meta: { total: 0 } };
      const response = await apiClient.get<TagsListResponse>(`/users/${userId}/tags`);
      return response;
    },
    enabled: !!userId,
  });
}

// =============================================================================
// Mention Options (Combined Users + Groups)
// =============================================================================

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export function useMentionOptions() {
  const { data: tagsData } = useUserTags({ includeInactive: false });

  // Get team members from the members API
  const { data: membersData } = useQuery({
    queryKey: ['members', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: TeamMember[] }>('/members');
      return response;
    },
  });

  // Combine users and groups into mention options
  const mentionOptions: MentionOption[] = [];

  // Add users
  if (membersData?.data) {
    for (const member of membersData.data) {
      mentionOptions.push({
        type: 'user',
        id: member.id,
        name: member.fullName,
        label: member.fullName,
        description: member.email,
        avatarUrl: member.avatarUrl || undefined,
      });
    }
  }

  // Add groups
  if (tagsData?.data) {
    for (const tag of tagsData.data) {
      if (tag.isActive) {
        mentionOptions.push({
          type: 'group',
          id: tag.id,
          name: tag.name,
          label: tag.name,
          description: `${tag.memberCount} miembro${tag.memberCount !== 1 ? 's' : ''}`,
          color: tag.color,
          icon: tag.icon || undefined,
        });
      }
    }
  }

  return {
    options: mentionOptions,
    users: mentionOptions.filter(o => o.type === 'user'),
    groups: mentionOptions.filter(o => o.type === 'group'),
    isLoading: !tagsData && !membersData,
  };
}

// =============================================================================
// Format Mention for Insertion
// =============================================================================

export function formatMention(option: MentionOption): string {
  if (option.type === 'group') {
    return `@[${option.name}](tag:${option.id})`;
  }
  return `@[${option.name}](${option.id})`;
}
