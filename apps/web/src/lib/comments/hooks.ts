/**
 * Comments Module Hooks
 * React Query hooks for comments management
 *
 * @module lib/comments/hooks
 */

import { useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryResult,
  type UseMutationResult,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import type {
  Comment,
  CommentEntityType,
  CreateCommentRequest,
  UpdateCommentRequest,
  PaginatedCommentsResponse,
  ListCommentsOptions,
  SupportedReaction,
  ThreadSummary,
} from './types';

// ============================================
// Query Keys
// ============================================

export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (options: ListCommentsOptions) => [...commentKeys.lists(), options] as const,
  entity: (entityType: CommentEntityType, entityId: string) =>
    [...commentKeys.all, 'entity', entityType, entityId] as const,
  entityPinned: (entityType: CommentEntityType, entityId: string) =>
    [...commentKeys.entity(entityType, entityId), 'pinned'] as const,
  detail: (id: string) => [...commentKeys.all, 'detail', id] as const,
  replies: (id: string) => [...commentKeys.all, 'replies', id] as const,
  thread: (id: string) => [...commentKeys.all, 'thread', id] as const,
  reactions: () => [...commentKeys.all, 'reactions'] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  options?: { includeReplies?: boolean; page?: number; limit?: number }
): Promise<PaginatedCommentsResponse> {
  const params = new URLSearchParams();
  if (options?.includeReplies) params.append('includeReplies', 'true');
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = `/notes/entity/${entityType}/${entityId}${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<PaginatedCommentsResponse>(url);
  return response;
}

async function fetchPinnedComments(
  entityType: CommentEntityType,
  entityId: string
): Promise<Comment[]> {
  const response = await apiClient.get<Comment[]>(
    `/notes/entity/${entityType}/${entityId}/pinned`
  );
  return response;
}

async function fetchCommentById(id: string): Promise<Comment> {
  const response = await apiClient.get<Comment>(`/notes/${id}`);
  return response;
}

async function fetchReplies(commentId: string): Promise<Comment[]> {
  const response = await apiClient.get<Comment[]>(`/notes/${commentId}/replies`);
  return response;
}

async function fetchThread(threadId: string): Promise<ThreadSummary> {
  const response = await apiClient.get<ThreadSummary>(`/notes/thread/${threadId}`);
  return response;
}

async function createComment(data: CreateCommentRequest): Promise<Comment> {
  const response = await apiClient.post<Comment>('/notes', data);
  return response;
}

async function updateComment(id: string, data: UpdateCommentRequest): Promise<Comment> {
  const response = await apiClient.patch<Comment>(`/notes/${id}`, data);
  return response;
}

async function deleteComment(id: string): Promise<void> {
  await apiClient.delete(`/notes/${id}`);
}

async function addReaction(commentId: string, emoji: string): Promise<Comment> {
  const response = await apiClient.post<Comment>(`/notes/${commentId}/reactions`, { emoji });
  return response;
}

async function removeReaction(commentId: string, emoji: string): Promise<Comment> {
  const response = await apiClient.delete<Comment>(`/notes/${commentId}/reactions/${encodeURIComponent(emoji)}`);
  return response;
}

async function pinComment(commentId: string): Promise<Comment> {
  const response = await apiClient.post<Comment>(`/notes/${commentId}/pin`, {});
  return response;
}

async function unpinComment(commentId: string): Promise<Comment> {
  const response = await apiClient.delete<Comment>(`/notes/${commentId}/pin`);
  return response;
}

async function fetchSupportedReactions(): Promise<string[]> {
  const response = await apiClient.get<{ reactions: string[] }>('/notes/reactions/supported');
  return response.reactions;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Get comments for a specific entity
 */
export function useEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  options?: {
    includeReplies?: boolean;
    page?: number;
    limit?: number;
    enabled?: boolean;
  }
): UseQueryResult<PaginatedCommentsResponse> {
  return useQuery({
    queryKey: commentKeys.entity(entityType, entityId),
    queryFn: () => fetchEntityComments(entityType, entityId, options),
    enabled: options?.enabled !== false && !!entityType && !!entityId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get comments with infinite scroll
 */
export function useInfiniteEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  options?: {
    includeReplies?: boolean;
    limit?: number;
    enabled?: boolean;
  }
): UseInfiniteQueryResult<PaginatedCommentsResponse> {
  return useInfiniteQuery({
    queryKey: [...commentKeys.entity(entityType, entityId), 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      fetchEntityComments(entityType, entityId, {
        ...options,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: options?.enabled !== false && !!entityType && !!entityId,
    staleTime: 30000,
  });
}

/**
 * Get pinned comments for an entity
 */
export function usePinnedComments(
  entityType: CommentEntityType,
  entityId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Comment[]> {
  return useQuery({
    queryKey: commentKeys.entityPinned(entityType, entityId),
    queryFn: () => fetchPinnedComments(entityType, entityId),
    enabled: options?.enabled !== false && !!entityType && !!entityId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get a single comment by ID
 */
export function useComment(
  commentId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Comment> {
  return useQuery({
    queryKey: commentKeys.detail(commentId),
    queryFn: () => fetchCommentById(commentId),
    enabled: options?.enabled !== false && !!commentId,
  });
}

/**
 * Get replies to a comment
 */
export function useCommentReplies(
  commentId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Comment[]> {
  return useQuery({
    queryKey: commentKeys.replies(commentId),
    queryFn: () => fetchReplies(commentId),
    enabled: options?.enabled !== false && !!commentId,
  });
}

/**
 * Get thread summary
 */
export function useThreadSummary(
  threadId: string,
  options?: { enabled?: boolean }
): UseQueryResult<ThreadSummary> {
  return useQuery({
    queryKey: commentKeys.thread(threadId),
    queryFn: () => fetchThread(threadId),
    enabled: options?.enabled !== false && !!threadId,
  });
}

/**
 * Get supported reactions
 */
export function useSupportedReactions(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: commentKeys.reactions(),
    queryFn: fetchSupportedReactions,
    staleTime: Infinity, // Never refetch
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new comment
 */
export function useCreateComment(): UseMutationResult<
  Comment,
  Error,
  CreateCommentRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (newComment) => {
      // Invalidate entity comments
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(newComment.entityType, newComment.entityId),
      });

      // If this is a reply, invalidate parent's replies
      if (newComment.parentId) {
        queryClient.invalidateQueries({
          queryKey: commentKeys.replies(newComment.parentId),
        });
        queryClient.invalidateQueries({
          queryKey: commentKeys.thread(newComment.threadId || newComment.parentId),
        });
      }
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment(): UseMutationResult<
  Comment,
  Error,
  { id: string; data: UpdateCommentRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateComment(id, data),
    onSuccess: (updatedComment) => {
      // Update cache directly
      queryClient.setQueryData(
        commentKeys.detail(updatedComment.id),
        updatedComment
      );

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(updatedComment.entityType, updatedComment.entityId),
      });

      // If pinned status changed, invalidate pinned list
      if (updatedComment.isPinned !== undefined) {
        queryClient.invalidateQueries({
          queryKey: commentKeys.entityPinned(updatedComment.entityType, updatedComment.entityId),
        });
      }
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment(): UseMutationResult<
  void,
  Error,
  { id: string; entityType: CommentEntityType; entityId: string; parentId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => deleteComment(id),
    onSuccess: (_, variables) => {
      // Invalidate entity comments
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(variables.entityType, variables.entityId),
      });

      // If this was a reply, invalidate parent's replies
      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: commentKeys.replies(variables.parentId),
        });
      }

      // Remove from cache
      queryClient.removeQueries({
        queryKey: commentKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Add reaction to a comment
 */
export function useAddReaction(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; emoji: SupportedReaction; entityType: CommentEntityType; entityId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, emoji }) => addReaction(commentId, emoji),
    onSuccess: (updatedComment, variables) => {
      // Update cache directly
      queryClient.setQueryData(
        commentKeys.detail(updatedComment.id),
        updatedComment
      );

      // Invalidate entity comments to refresh reactions
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(variables.entityType, variables.entityId),
      });
    },
  });
}

/**
 * Remove reaction from a comment
 */
export function useRemoveReaction(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; emoji: SupportedReaction; entityType: CommentEntityType; entityId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, emoji }) => removeReaction(commentId, emoji),
    onSuccess: (updatedComment, variables) => {
      // Update cache directly
      queryClient.setQueryData(
        commentKeys.detail(updatedComment.id),
        updatedComment
      );

      // Invalidate entity comments
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(variables.entityType, variables.entityId),
      });
    },
  });
}

/**
 * Toggle pin on a comment
 */
export function useTogglePin(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; pinned: boolean; entityType: CommentEntityType; entityId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, pinned }) =>
      pinned ? pinComment(commentId) : unpinComment(commentId),
    onSuccess: (updatedComment, variables) => {
      // Update cache
      queryClient.setQueryData(
        commentKeys.detail(updatedComment.id),
        updatedComment
      );

      // Invalidate pinned list
      queryClient.invalidateQueries({
        queryKey: commentKeys.entityPinned(variables.entityType, variables.entityId),
      });

      // Invalidate entity comments
      queryClient.invalidateQueries({
        queryKey: commentKeys.entity(variables.entityType, variables.entityId),
      });
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for full comment management
 */
export function useCommentManagement(
  entityType: CommentEntityType,
  entityId: string,
  options?: {
    includeReplies?: boolean;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();

  const commentsQuery = useEntityComments(entityType, entityId, options);
  const pinnedQuery = usePinnedComments(entityType, entityId, options);
  const createMutation = useCreateComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();
  const togglePinMutation = useTogglePin();

  const addComment = useCallback(
    async (data: Omit<CreateCommentRequest, 'entityType' | 'entityId'>) => {
      return createMutation.mutateAsync({
        ...data,
        entityType,
        entityId,
      });
    },
    [createMutation, entityType, entityId]
  );

  const editComment = useCallback(
    async (commentId: string, data: UpdateCommentRequest) => {
      return updateMutation.mutateAsync({ id: commentId, data });
    },
    [updateMutation]
  );

  const removeComment = useCallback(
    async (commentId: string, parentId?: string) => {
      return deleteMutation.mutateAsync({
        id: commentId,
        entityType,
        entityId,
        parentId,
      });
    },
    [deleteMutation, entityType, entityId]
  );

  const react = useCallback(
    async (commentId: string, emoji: SupportedReaction) => {
      return addReactionMutation.mutateAsync({
        commentId,
        emoji,
        entityType,
        entityId,
      });
    },
    [addReactionMutation, entityType, entityId]
  );

  const unreact = useCallback(
    async (commentId: string, emoji: SupportedReaction) => {
      return removeReactionMutation.mutateAsync({
        commentId,
        emoji,
        entityType,
        entityId,
      });
    },
    [removeReactionMutation, entityType, entityId]
  );

  const togglePin = useCallback(
    async (commentId: string, pinned: boolean) => {
      return togglePinMutation.mutateAsync({
        commentId,
        pinned,
        entityType,
        entityId,
      });
    },
    [togglePinMutation, entityType, entityId]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: commentKeys.entity(entityType, entityId),
    });
  }, [queryClient, entityType, entityId]);

  return {
    // Data
    comments: commentsQuery.data?.notes ?? [],
    pinnedComments: pinnedQuery.data ?? [],
    total: commentsQuery.data?.total ?? 0,
    hasMore: commentsQuery.data?.hasMore ?? false,

    // Loading states
    isLoading: commentsQuery.isLoading,
    isLoadingPinned: pinnedQuery.isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Error states
    isError: commentsQuery.isError,
    error: commentsQuery.error,

    // Actions
    addComment,
    editComment,
    removeComment,
    react,
    unreact,
    togglePin,
    refresh,
  };
}

/**
 * Hook for managing a single comment's replies
 */
export function useCommentThread(commentId: string, options?: { enabled?: boolean }) {
  const repliesQuery = useCommentReplies(commentId, options);
  const threadQuery = useThreadSummary(commentId, options);

  return {
    replies: repliesQuery.data ?? [],
    thread: threadQuery.data,
    isLoading: repliesQuery.isLoading || threadQuery.isLoading,
    isError: repliesQuery.isError || threadQuery.isError,
  };
}
