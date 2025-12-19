// ============================================
// Tasks Module Hooks - FASE 5.5
// React Query hooks for task operations
// ============================================

'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  useApiQuery,
  useApiMutation,
} from '@/lib/api';

import type {
  Task,
  TaskComment,
  TasksResponse,
  TaskCommentsResponse,
  TaskActivityResponse,
  TaskStatistics,
  TaskFilters,
  TaskSort,
  TaskActivityFilters,
  CreateTaskData,
  UpdateTaskData,
  CompleteTaskData,
  CancelTaskData,
  AssignTaskData,
  DeferTaskData,
  CreateTaskCommentData,
  UpdateTaskCommentData,
  UpcomingTasks,
  BulkTaskOperation,
  BulkTaskResult,
} from './types';

// ============================================
// Query Keys
// ============================================

export const taskQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskQueryKeys.all, 'list'] as const,
  list: (filters?: TaskFilters & TaskSort & { page?: number; limit?: number }) =>
    [...taskQueryKeys.lists(), filters] as const,
  details: () => [...taskQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskQueryKeys.details(), id] as const,
  statistics: (userId?: string) => [...taskQueryKeys.all, 'statistics', userId] as const,
  upcoming: (userId?: string) => [...taskQueryKeys.all, 'upcoming', userId] as const,
  // Comments
  comments: (taskId: string) => [...taskQueryKeys.all, taskId, 'comments'] as const,
  commentsList: (taskId: string, filters?: { page?: number; limit?: number }) =>
    [...taskQueryKeys.comments(taskId), 'list', filters] as const,
  // Activity
  activity: (taskId: string) => [...taskQueryKeys.all, taskId, 'activity'] as const,
  activityList: (taskId: string, filters?: TaskActivityFilters & { page?: number; limit?: number }) =>
    [...taskQueryKeys.activity(taskId), 'list', filters] as const,
  // Entity-specific tasks
  byEntity: (entityType: string, entityId: string) =>
    [...taskQueryKeys.all, 'entity', entityType, entityId] as const,
};

// ============================================
// Task List & CRUD Hooks
// ============================================

interface UseTasksOptions extends TaskFilters, TaskSort {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Get tasks list with filters
 */
export function useTasks(options: UseTasksOptions = {}) {
  const { enabled = true, ...filters } = options;
  const queryParams = new URLSearchParams();

  // Build query params
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
  if (filters.searchTerm) queryParams.set('searchTerm', filters.searchTerm);
  if (filters.assignedTo) queryParams.set('assignedTo', filters.assignedTo);
  if (filters.createdBy) queryParams.set('createdBy', filters.createdBy);
  if (filters.leadId) queryParams.set('leadId', filters.leadId);
  if (filters.customerId) queryParams.set('customerId', filters.customerId);
  if (filters.opportunityId) queryParams.set('opportunityId', filters.opportunityId);
  if (filters.dueDateFrom) queryParams.set('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) queryParams.set('dueDateTo', filters.dueDateTo);
  if (filters.isOverdue !== undefined) queryParams.set('isOverdue', String(filters.isOverdue));
  if (filters.includeCompleted !== undefined) queryParams.set('includeCompleted', String(filters.includeCompleted));

  // Handle array filters
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach((s) => queryParams.append('status', s));
  }
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    priorities.forEach((p) => queryParams.append('priority', p));
  }
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    types.forEach((t) => queryParams.append('type', t));
  }
  if (filters.tags) {
    filters.tags.forEach((t) => queryParams.append('tags', t));
  }

  const endpoint = `/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<TasksResponse>(
    taskQueryKeys.list(filters as Record<string, unknown>),
    endpoint,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled,
    }
  );
}

/**
 * Get single task by ID
 */
export function useTask(taskId: string) {
  return useApiQuery<Task>(
    taskQueryKeys.detail(taskId),
    `/tasks/${taskId}`,
    {
      enabled: !!taskId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Get task statistics
 */
export function useTaskStatistics(userId?: string) {
  const queryParams = new URLSearchParams();
  if (userId) queryParams.set('userId', userId);

  const endpoint = `/tasks/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<TaskStatistics>(
    taskQueryKeys.statistics(userId),
    endpoint,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Get upcoming tasks for user
 */
export function useUpcomingTasks(userId?: string) {
  return useApiQuery<UpcomingTasks>(
    taskQueryKeys.upcoming(userId),
    '/tasks/upcoming',
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

/**
 * Get tasks by entity (lead, customer, opportunity)
 */
export function useTasksByEntity(
  entityType: 'lead' | 'customer' | 'opportunity',
  entityId: string,
  options?: { includeCompleted?: boolean }
) {
  const queryParams = new URLSearchParams();
  queryParams.set('entityType', entityType);
  queryParams.set('entityId', entityId);
  if (options?.includeCompleted !== undefined) {
    queryParams.set('includeCompleted', String(options.includeCompleted));
  }

  return useApiQuery<{ tasks: Task[] }>(
    taskQueryKeys.byEntity(entityType, entityId),
    `/tasks/by-entity?${queryParams.toString()}`,
    {
      enabled: !!entityId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, CreateTaskData>(
    async (data, client) => {
      return client.post<Task>('/tasks', data);
    },
    {
      onSuccess: (newTask) => {
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
        // Invalidate entity-specific queries
        if (newTask.leadId) {
          void queryClient.invalidateQueries({ queryKey: taskQueryKeys.byEntity('lead', newTask.leadId) });
        }
        if (newTask.customerId) {
          void queryClient.invalidateQueries({ queryKey: taskQueryKeys.byEntity('customer', newTask.customerId) });
        }
        if (newTask.opportunityId) {
          void queryClient.invalidateQueries({ queryKey: taskQueryKeys.byEntity('opportunity', newTask.opportunityId) });
        }
      },
    }
  );
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, { taskId: string; data: UpdateTaskData }>(
    async ({ taskId, data }, client) => {
      return client.patch<Task>(`/tasks/${taskId}`, data);
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>(
    async (taskId, client) => {
      return client.delete(`/tasks/${taskId}`);
    },
    {
      onSuccess: (_, taskId) => {
        queryClient.removeQueries({ queryKey: taskQueryKeys.detail(taskId) });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
      },
    }
  );
}

// ============================================
// Task Action Hooks
// ============================================

/**
 * Complete a task
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, { taskId: string; data?: CompleteTaskData }>(
    async ({ taskId, data }, client) => {
      return client.post<Task>(`/tasks/${taskId}/complete`, data ?? {});
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Cancel a task
 */
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, { taskId: string; data?: CancelTaskData }>(
    async ({ taskId, data }, client) => {
      return client.post<Task>(`/tasks/${taskId}/cancel`, data ?? {});
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Assign a task
 */
export function useAssignTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, { taskId: string; data: AssignTaskData }>(
    async ({ taskId, data }, client) => {
      return client.patch<Task>(`/tasks/${taskId}`, { assignedTo: data.assignedTo });
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Defer a task
 */
export function useDeferTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, { taskId: string; data: DeferTaskData }>(
    async ({ taskId, data }, client) => {
      return client.patch<Task>(`/tasks/${taskId}`, {
        status: 'deferred',
        dueDate: data.deferTo,
        metadata: data.reason ? { deferReason: data.reason } : undefined,
      });
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Reopen a completed/cancelled task
 */
export function useReopenTask() {
  const queryClient = useQueryClient();

  return useApiMutation<Task, string>(
    async (taskId, client) => {
      return client.patch<Task>(`/tasks/${taskId}`, { status: 'pending' });
    },
    {
      onSuccess: (updatedTask) => {
        queryClient.setQueryData(taskQueryKeys.detail(updatedTask.id), updatedTask);
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(updatedTask.id) });
      },
    }
  );
}

/**
 * Bulk task operations
 */
export function useBulkTaskOperation() {
  const queryClient = useQueryClient();

  return useApiMutation<BulkTaskResult, BulkTaskOperation>(
    async (data, client) => {
      return client.post<BulkTaskResult>('/tasks/bulk', data);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.upcoming() });
      },
    }
  );
}

// ============================================
// Task Comments Hooks
// ============================================

interface UseTaskCommentsOptions {
  page?: number;
  limit?: number;
}

/**
 * Get task comments
 */
export function useTaskComments(taskId: string, options: UseTaskCommentsOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));

  const endpoint = `/tasks/${taskId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<TaskCommentsResponse>(
    taskQueryKeys.commentsList(taskId, options),
    endpoint,
    {
      enabled: !!taskId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Add a comment to a task
 */
export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useApiMutation<TaskComment, { taskId: string; data: CreateTaskCommentData }>(
    async ({ taskId, data }, client) => {
      return client.post<TaskComment>(`/tasks/${taskId}/comments`, data);
    },
    {
      onSuccess: (_, { taskId }) => {
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(taskId) });
      },
    }
  );
}

/**
 * Update a task comment
 */
export function useUpdateTaskComment() {
  const queryClient = useQueryClient();

  return useApiMutation<TaskComment, { taskId: string; commentId: string; data: UpdateTaskCommentData }>(
    async ({ taskId, commentId, data }, client) => {
      return client.patch<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, data);
    },
    {
      onSuccess: (_, { taskId }) => {
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) });
      },
    }
  );
}

/**
 * Delete a task comment
 */
export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useApiMutation<void, { taskId: string; commentId: string }>(
    async ({ taskId, commentId }, client) => {
      return client.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    {
      onSuccess: (_, { taskId }) => {
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.comments(taskId) });
        void queryClient.invalidateQueries({ queryKey: taskQueryKeys.activity(taskId) });
      },
    }
  );
}

// ============================================
// Task Activity Hooks
// ============================================

interface UseTaskActivityOptions extends TaskActivityFilters {
  page?: number;
  limit?: number;
}

/**
 * Get task activity log
 */
export function useTaskActivity(taskId: string, options: UseTaskActivityOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));
  if (options.action) queryParams.set('action', options.action);
  if (options.startDate) queryParams.set('startDate', options.startDate);
  if (options.endDate) queryParams.set('endDate', options.endDate);

  const endpoint = `/tasks/${taskId}/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<TaskActivityResponse>(
    taskQueryKeys.activityList(taskId, options as Record<string, unknown>),
    endpoint,
    {
      enabled: !!taskId,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Hook that provides task detail with comments and activity
 */
export function useTaskDetail(taskId: string) {
  const task = useTask(taskId);
  const comments = useTaskComments(taskId, { limit: 10 });
  const activity = useTaskActivity(taskId, { limit: 20 });

  return {
    // Task data
    task: task.data,
    isTaskLoading: task.isLoading,
    taskError: task.error,

    // Comments
    comments: comments.data?.data ?? [],
    isCommentsLoading: comments.isLoading,
    commentsMeta: comments.data?.meta,

    // Activity
    activity: activity.data?.data ?? [],
    isActivityLoading: activity.isLoading,
    activityMeta: activity.data?.meta,

    // Combined loading
    isLoading: task.isLoading || comments.isLoading || activity.isLoading,

    // Refresh
    refetchTask: task.refetch,
    refetchComments: comments.refetch,
    refetchActivity: activity.refetch,
  };
}

/**
 * Hook that provides task list management
 */
export function useTaskManagement(options: UseTasksOptions = {}) {
  const tasks = useTasks(options);
  const statistics = useTaskStatistics();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();

  return {
    // Data
    tasks: tasks.data?.data ?? [],
    meta: tasks.data?.meta,
    statistics: statistics.data,

    // Loading states
    isLoading: tasks.isLoading,
    isStatisticsLoading: statistics.isLoading,

    // Errors
    tasksError: tasks.error,
    statisticsError: statistics.error,

    // Mutations
    createTask: createTask.mutate,
    createTaskAsync: createTask.mutateAsync,
    isCreating: createTask.isPending,

    updateTask: updateTask.mutate,
    updateTaskAsync: updateTask.mutateAsync,
    isUpdating: updateTask.isPending,

    deleteTask: deleteTask.mutate,
    deleteTaskAsync: deleteTask.mutateAsync,
    isDeleting: deleteTask.isPending,

    completeTask: completeTask.mutate,
    completeTaskAsync: completeTask.mutateAsync,
    isCompleting: completeTask.isPending,

    cancelTask: cancelTask.mutate,
    cancelTaskAsync: cancelTask.mutateAsync,
    isCancelling: cancelTask.isPending,

    // Refresh
    refetchTasks: tasks.refetch,
    refetchStatistics: statistics.refetch,
  };
}

/**
 * Hook that provides task comments management
 */
export function useTaskCommentsManagement(taskId: string) {
  const comments = useTaskComments(taskId);
  const addComment = useAddTaskComment();
  const updateComment = useUpdateTaskComment();
  const deleteComment = useDeleteTaskComment();

  return {
    // Data
    comments: comments.data?.data ?? [],
    meta: comments.data?.meta,

    // Loading states
    isLoading: comments.isLoading,

    // Mutations
    addComment: (data: CreateTaskCommentData) => addComment.mutate({ taskId, data }),
    addCommentAsync: (data: CreateTaskCommentData) => addComment.mutateAsync({ taskId, data }),
    isAdding: addComment.isPending,

    updateComment: (commentId: string, data: UpdateTaskCommentData) =>
      updateComment.mutate({ taskId, commentId, data }),
    updateCommentAsync: (commentId: string, data: UpdateTaskCommentData) =>
      updateComment.mutateAsync({ taskId, commentId, data }),
    isUpdatingComment: updateComment.isPending,

    deleteComment: (commentId: string) => deleteComment.mutate({ taskId, commentId }),
    deleteCommentAsync: (commentId: string) => deleteComment.mutateAsync({ taskId, commentId }),
    isDeletingComment: deleteComment.isPending,

    // Refresh
    refetchComments: comments.refetch,
  };
}

/**
 * Hook for getting tasks related to an entity
 */
export function useEntityTasks(
  entityType: 'lead' | 'customer' | 'opportunity',
  entityId: string
) {
  const tasks = useTasksByEntity(entityType, entityId, { includeCompleted: false });
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();

  const entityKey = entityType === 'lead' ? 'leadId' : entityType === 'customer' ? 'customerId' : 'opportunityId';

  return {
    // Data
    tasks: tasks.data?.tasks ?? [],

    // Loading states
    isLoading: tasks.isLoading,

    // Quick actions
    addTask: (data: Omit<CreateTaskData, 'leadId' | 'customerId' | 'opportunityId'>) =>
      createTask.mutate({ ...data, [entityKey]: entityId }),
    addTaskAsync: (data: Omit<CreateTaskData, 'leadId' | 'customerId' | 'opportunityId'>) =>
      createTask.mutateAsync({ ...data, [entityKey]: entityId }),
    isAdding: createTask.isPending,

    completeTask: (taskId: string) => completeTask.mutate({ taskId }),
    completeTaskAsync: (taskId: string) => completeTask.mutateAsync({ taskId }),
    isCompleting: completeTask.isPending,

    // Refresh
    refetchTasks: tasks.refetch,
  };
}
