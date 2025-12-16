// ============================================
// FASE 5.9 — Messaging & Notifications Hooks
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  BulkMessageRequest,
  BulkMessageResult,
  CreateTemplateRequest,
  Message,
  MessageFilters,
  MessageStats,
  MessageTemplate,
  Notification,
  NotificationFilters,
  NotificationPreferences,
  NotificationStats,
  SendMessageRequest,
  TemplatePreviewRequest,
  TemplatePreviewResult,
  UpdatePreferencesRequest,
  UpdateTemplateRequest,
} from './types';

// ============================================
// Query Keys
// ============================================

export const messagingKeys = {
  all: ['messaging'] as const,

  // Notifications
  notifications: () => [...messagingKeys.all, 'notifications'] as const,
  notificationList: (filters?: NotificationFilters) =>
    [...messagingKeys.notifications(), 'list', filters] as const,
  notificationStats: () => [...messagingKeys.notifications(), 'stats'] as const,
  unreadCount: () => [...messagingKeys.notifications(), 'unread-count'] as const,

  // Messages
  messages: () => [...messagingKeys.all, 'messages'] as const,
  messageList: (filters?: MessageFilters) => [...messagingKeys.messages(), 'list', filters] as const,
  messageStats: () => [...messagingKeys.messages(), 'stats'] as const,
  messageDetail: (id: string) => [...messagingKeys.messages(), 'detail', id] as const,

  // Templates
  templates: () => [...messagingKeys.all, 'templates'] as const,
  templateList: (channel?: string) => [...messagingKeys.templates(), 'list', channel] as const,
  templateDetail: (id: string) => [...messagingKeys.templates(), 'detail', id] as const,

  // Preferences
  preferences: () => [...messagingKeys.all, 'preferences'] as const,
};

// ============================================
// API Functions
// ============================================

const notificationsApi = {
  list: async (filters?: NotificationFilters): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.unreadOnly) params.append('unreadOnly', 'true');
    if (filters?.relatedType) params.append('relatedType', filters.relatedType);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    return apiClient.get<Notification[]>(`/notifications?${params.toString()}`);
  },

  getStats: async (): Promise<NotificationStats> => {
    return apiClient.get<NotificationStats>('/notifications/stats');
  },

  getUnreadCount: async (): Promise<number> => {
    const result = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return result.count;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return apiClient.patch<Notification>(`/notifications/${id}/read`, {});
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    return apiClient.patch<{ count: number }>('/notifications/read-all', {});
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/notifications/${id}`);
  },

  deleteAll: async (): Promise<{ count: number }> => {
    return apiClient.delete('/notifications');
  },
};

const messagesApi = {
  list: async (filters?: MessageFilters): Promise<Message[]> => {
    const params = new URLSearchParams();
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    return apiClient.get<Message[]>(`/messages?${params.toString()}`);
  },

  getById: async (id: string): Promise<Message> => {
    return apiClient.get<Message>(`/messages/${id}`);
  },

  getStats: async (): Promise<MessageStats> => {
    return apiClient.get<MessageStats>('/messages/stats');
  },

  send: async (request: SendMessageRequest): Promise<Message> => {
    return apiClient.post<Message>('/messages/send', request);
  },

  sendBulk: async (request: BulkMessageRequest): Promise<BulkMessageResult> => {
    return apiClient.post<BulkMessageResult>('/messages/send-bulk', request);
  },

  retry: async (id: string): Promise<Message> => {
    return apiClient.post<Message>(`/messages/${id}/retry`, {});
  },
};

const templatesApi = {
  list: async (channel?: string): Promise<MessageTemplate[]> => {
    const params = channel ? `?channel=${channel}` : '';
    return apiClient.get<MessageTemplate[]>(`/message-templates${params}`);
  },

  getById: async (id: string): Promise<MessageTemplate> => {
    return apiClient.get<MessageTemplate>(`/message-templates/${id}`);
  },

  create: async (request: CreateTemplateRequest): Promise<MessageTemplate> => {
    return apiClient.post<MessageTemplate>('/message-templates', request);
  },

  update: async (id: string, request: UpdateTemplateRequest): Promise<MessageTemplate> => {
    return apiClient.patch<MessageTemplate>(`/message-templates/${id}`, request);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/message-templates/${id}`);
  },

  preview: async (request: TemplatePreviewRequest): Promise<TemplatePreviewResult> => {
    return apiClient.post<TemplatePreviewResult>('/message-templates/preview', request);
  },

  duplicate: async (id: string): Promise<MessageTemplate> => {
    return apiClient.post<MessageTemplate>(`/message-templates/${id}/duplicate`, {});
  },
};

const preferencesApi = {
  get: async (): Promise<NotificationPreferences> => {
    return apiClient.get<NotificationPreferences>('/notification-preferences');
  },

  update: async (request: UpdatePreferencesRequest): Promise<NotificationPreferences> => {
    return apiClient.patch<NotificationPreferences>('/notification-preferences', request);
  },

  reset: async (): Promise<NotificationPreferences> => {
    return apiClient.post<NotificationPreferences>('/notification-preferences/reset', {});
  },
};

// ============================================
// Notification Hooks
// ============================================

export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: messagingKeys.notificationList(filters),
    queryFn: () => notificationsApi.list(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: messagingKeys.notificationStats(),
    queryFn: () => notificationsApi.getStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: messagingKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.notifications() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.notifications() });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.notifications() });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.notifications() });
    },
  });
}

// ============================================
// Message Hooks
// ============================================

export function useMessages(filters?: MessageFilters) {
  return useQuery({
    queryKey: messagingKeys.messageList(filters),
    queryFn: () => messagesApi.list(filters),
    staleTime: 60 * 1000,
  });
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: messagingKeys.messageDetail(id),
    queryFn: () => messagesApi.getById(id),
    enabled: !!id,
  });
}

export function useMessageStats() {
  return useQuery({
    queryKey: messagingKeys.messageStats(),
    queryFn: () => messagesApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendMessageRequest) => messagesApi.send(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.messages() });
    },
  });
}

export function useSendBulkMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkMessageRequest) => messagesApi.sendBulk(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.messages() });
    },
  });
}

export function useRetryMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => messagesApi.retry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.messages() });
    },
  });
}

// ============================================
// Template Hooks
// ============================================

export function useMessageTemplates(channel?: string) {
  return useQuery({
    queryKey: messagingKeys.templateList(channel),
    queryFn: () => templatesApi.list(channel),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMessageTemplate(id: string) {
  return useQuery({
    queryKey: messagingKeys.templateDetail(id),
    queryFn: () => templatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTemplateRequest) => templatesApi.create(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...request }: UpdateTemplateRequest & { id: string }) =>
      templatesApi.update(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.templates() });
    },
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: (request: TemplatePreviewRequest) => templatesApi.preview(request),
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.duplicate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.templates() });
    },
  });
}

// ============================================
// Preferences Hooks
// ============================================

export function useNotificationPreferences() {
  return useQuery({
    queryKey: messagingKeys.preferences(),
    queryFn: () => preferencesApi.get(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdatePreferencesRequest) => preferencesApi.update(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.preferences() });
    },
  });
}

export function useResetNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => preferencesApi.reset(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagingKeys.preferences() });
    },
  });
}

// ============================================
// Composite Hooks
// ============================================

export function useMessagingDashboard() {
  const notifications = useNotifications({ limit: 5 });
  const unreadCount = useUnreadNotificationCount();
  const messageStats = useMessageStats();

  return {
    notifications: notifications.data ?? [],
    unreadCount: unreadCount.data ?? 0,
    messageStats: messageStats.data,
    isLoading: notifications.isLoading || unreadCount.isLoading || messageStats.isLoading,
    refetch: () => {
      void notifications.refetch();
      void unreadCount.refetch();
      void messageStats.refetch();
    },
  };
}
