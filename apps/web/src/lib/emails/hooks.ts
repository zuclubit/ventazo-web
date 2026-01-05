/**
 * Email Module Hooks
 *
 * React Query hooks for email operations including:
 * - Email CRUD operations
 * - Account management (Gmail/Outlook)
 * - Sync operations
 * - Composition
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  Email,
  EmailThread,
  EmailAccount,
  EmailStats,
  EmailsListResponse,
  EmailThreadsListResponse,
  EmailAccountsListResponse,
  EmailQueryParams,
  SendEmailRequest,
  SendEmailResult,
  CreateDraftRequest,
  UpdateDraftRequest,
  ConnectEmailRequest,
  ConnectEmailResult,
  SyncEmailRequest,
  SyncEmailResult,
  RecipientSearchResult,
  EmailFolder,
} from './types';

// ============================================
// Query Keys
// ============================================

export const emailKeys = {
  all: ['emails'] as const,
  lists: () => [...emailKeys.all, 'list'] as const,
  list: (params: EmailQueryParams) => [...emailKeys.lists(), params] as const,
  infinite: (params: EmailQueryParams) => [...emailKeys.all, 'infinite', params] as const,
  details: () => [...emailKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailKeys.details(), id] as const,
  threads: () => [...emailKeys.all, 'threads'] as const,
  threadList: (params: EmailQueryParams) => [...emailKeys.threads(), 'list', params] as const,
  thread: (id: string) => [...emailKeys.threads(), id] as const,
  stats: () => [...emailKeys.all, 'stats'] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  account: (id: string) => [...emailKeys.accounts(), id] as const,
  recipients: (query: string) => [...emailKeys.all, 'recipients', query] as const,
};

// ============================================
// API Functions
// ============================================

// ============================================
// Response Wrapper Types (Backend format)
// ============================================

interface BackendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Gmail uses uppercase folder names, frontend uses lowercase
const FOLDER_MAP: Record<string, string> = {
  inbox: 'INBOX',
  sent: 'SENT',
  drafts: 'DRAFT',
  trash: 'TRASH',
  archive: 'ARCHIVE',
  starred: 'STARRED',
  spam: 'SPAM',
};

const emailsApi = {
  // Emails
  list: async (params: EmailQueryParams): Promise<EmailsListResponse> => {
    const searchParams = new URLSearchParams();
    // Map lowercase folder to uppercase Gmail label
    if (params.folder) searchParams.set('folder', FOLDER_MAP[params.folder] || params.folder.toUpperCase());
    if (params.accountId) searchParams.set('accountId', params.accountId);
    if (params.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
    if (params.isStarred !== undefined) searchParams.set('isStarred', String(params.isStarred));
    if (params.hasAttachments !== undefined) searchParams.set('hasAttachments', String(params.hasAttachments));
    if (params.search) searchParams.set('search', params.search);
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    // Backend returns { success: true, data: { emails, total, ... } }
    const response = await apiClient.get<BackendResponse<EmailsListResponse>>(`/email-sync/emails?${searchParams.toString()}`);
    return response.data || { emails: [], total: 0, page: 1, limit: 50, hasMore: false };
  },

  getById: async (id: string): Promise<Email> => {
    const response = await apiClient.get<BackendResponse<Email>>(`/email-sync/emails/${id}`);
    return response.data;
  },

  getStats: async (): Promise<EmailStats> => {
    const response = await apiClient.get<BackendResponse<EmailStats>>('/email-sync/stats');
    return response.data || {
      totalEmails: 0,
      unreadCount: 0,
      sentToday: 0,
      receivedToday: 0,
      draftCount: 0,
      folderStats: [],
    };
  },

  send: async (request: SendEmailRequest): Promise<SendEmailResult> => {
    const response = await apiClient.post<BackendResponse<SendEmailResult>>('/email-sync/send', request);
    return response.data;
  },

  reply: async (emailId: string, request: SendEmailRequest): Promise<SendEmailResult> => {
    const response = await apiClient.post<BackendResponse<SendEmailResult>>(`/email-sync/emails/${emailId}/reply`, request);
    return response.data;
  },

  forward: async (emailId: string, request: SendEmailRequest): Promise<SendEmailResult> => {
    const response = await apiClient.post<BackendResponse<SendEmailResult>>(`/email-sync/emails/${emailId}/forward`, request);
    return response.data;
  },

  markAsRead: async (id: string): Promise<Email> => {
    const response = await apiClient.patch<BackendResponse<Email>>(`/email-sync/emails/${id}/read`, { isRead: true });
    return response.data;
  },

  markAsUnread: async (id: string): Promise<Email> => {
    const response = await apiClient.patch<BackendResponse<Email>>(`/email-sync/emails/${id}/read`, { isRead: false });
    return response.data;
  },

  toggleStar: async (id: string, isStarred: boolean): Promise<Email> => {
    const response = await apiClient.patch<BackendResponse<Email>>(`/email-sync/emails/${id}/star`, { isStarred });
    return response.data;
  },

  moveToFolder: async (id: string, folder: EmailFolder): Promise<Email> => {
    const mappedFolder = FOLDER_MAP[folder] || folder.toUpperCase();
    const response = await apiClient.patch<BackendResponse<Email>>(`/email-sync/emails/${id}/move`, { folder: mappedFolder });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/email-sync/emails/${id}`);
  },

  bulkDelete: async (ids: string[]): Promise<{ deletedCount: number }> => {
    const response = await apiClient.post<BackendResponse<{ deletedCount: number }>>('/email-sync/emails/bulk-delete', { ids });
    return response.data;
  },

  bulkMarkAsRead: async (ids: string[], isRead: boolean): Promise<{ updatedCount: number }> => {
    const response = await apiClient.post<BackendResponse<{ updatedCount: number }>>('/email-sync/emails/bulk-read', { ids, isRead });
    return response.data;
  },

  // Threads
  getThreads: async (params: EmailQueryParams): Promise<EmailThreadsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.folder) searchParams.set('folder', FOLDER_MAP[params.folder] || params.folder.toUpperCase());
    if (params.accountId) searchParams.set('accountId', params.accountId);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const response = await apiClient.get<BackendResponse<EmailThreadsListResponse>>(`/email-sync/threads?${searchParams.toString()}`);
    return response.data || { threads: [], total: 0, page: 1, limit: 50, hasMore: false };
  },

  getThread: async (threadId: string): Promise<EmailThread> => {
    const response = await apiClient.get<BackendResponse<EmailThread>>(`/email-sync/threads/${threadId}`);
    return response.data;
  },

  // Drafts
  createDraft: async (request: CreateDraftRequest): Promise<Email> => {
    const response = await apiClient.post<BackendResponse<Email>>('/email-sync/drafts', request);
    return response.data;
  },

  updateDraft: async (id: string, request: UpdateDraftRequest): Promise<Email> => {
    const response = await apiClient.patch<BackendResponse<Email>>(`/email-sync/drafts/${id}`, request);
    return response.data;
  },

  deleteDraft: async (id: string): Promise<void> => {
    await apiClient.delete(`/email-sync/drafts/${id}`);
  },

  // Recipients
  searchRecipients: async (query: string): Promise<RecipientSearchResult> => {
    const response = await apiClient.get<BackendResponse<RecipientSearchResult>>(`/email-sync/recipients?q=${encodeURIComponent(query)}`);
    return response.data || { suggestions: [], hasMore: false };
  },
};

// ============================================
// OAuth Provider Mapping
// ============================================

// Map frontend provider names to backend provider names
const OAUTH_PROVIDER_MAP: Record<string, 'google' | 'microsoft'> = {
  gmail: 'google',
  google: 'google',
  outlook: 'microsoft',
  microsoft: 'microsoft',
};

// ============================================
// Accounts API
// ============================================

const accountsApi = {
  /**
   * Get OAuth authorization URL for connecting email account
   * This initiates the OAuth flow by returning a URL to redirect the user to
   */
  getAuthUrl: async (provider: 'gmail' | 'outlook' | 'google' | 'microsoft'): Promise<{ authUrl: string }> => {
    const oauthProvider = OAUTH_PROVIDER_MAP[provider] || 'google';
    // Backend returns { success: true, data: { authUrl: string, provider: string } }
    const response = await apiClient.get<{ success: boolean; data: { authUrl: string; provider: string } }>(
      `/email-sync/auth/url?provider=${oauthProvider}`
    );
    return { authUrl: response.data?.authUrl || '' };
  },

  list: async (): Promise<EmailAccountsListResponse> => {
    // Backend returns { success: true, data: [...accounts...] }
    const response = await apiClient.get<BackendResponse<EmailAccount[]>>('/email-sync/accounts');
    // Wrap the array in the expected format
    return { accounts: response.data || [] };
  },

  getById: async (id: string): Promise<EmailAccount> => {
    const response = await apiClient.get<BackendResponse<EmailAccount>>(`/email-sync/accounts/${id}`);
    return response.data;
  },

  /**
   * Connect email account using OAuth auth code
   * This should be called after the OAuth callback with the received auth code
   */
  connect: async (request: ConnectEmailRequest & { authCode?: string }): Promise<ConnectEmailResult> => {
    // Map frontend provider to backend provider
    const oauthProvider = OAUTH_PROVIDER_MAP[request.provider] || request.provider;
    const response = await apiClient.post<BackendResponse<ConnectEmailResult>>('/email-sync/accounts/connect', {
      ...request,
      provider: oauthProvider,
    });
    return response.data;
  },

  disconnect: async (id: string): Promise<void> => {
    await apiClient.delete(`/email-sync/accounts/${id}`);
  },

  sync: async (request: SyncEmailRequest): Promise<SyncEmailResult> => {
    const response = await apiClient.post<BackendResponse<SyncEmailResult>>(`/email-sync/accounts/${request.accountId}/sync`, request);
    return response.data;
  },

  getSyncStatus: async (id: string): Promise<{ status: string; lastSyncAt?: string; error?: string }> => {
    const response = await apiClient.get<BackendResponse<{ status: string; lastSyncAt?: string; error?: string }>>(`/email-sync/accounts/${id}/status`);
    return response.data;
  },

  setDefault: async (id: string): Promise<EmailAccount> => {
    const response = await apiClient.patch<BackendResponse<EmailAccount>>(`/email-sync/accounts/${id}/default`, {});
    return response.data;
  },

  updateSettings: async (id: string, settings: Partial<EmailAccount['settings']>): Promise<EmailAccount> => {
    const response = await apiClient.patch<BackendResponse<EmailAccount>>(`/email-sync/accounts/${id}/settings`, settings);
    return response.data;
  },
};

// ============================================
// Email Hooks
// ============================================

export function useEmails(params: EmailQueryParams = {}) {
  return useQuery({
    queryKey: emailKeys.list(params),
    queryFn: () => emailsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useInfiniteEmails(params: EmailQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: emailKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      emailsApi.list({ ...params, page: pageParam, limit: params.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
  });
}

export function useEmail(emailId: string) {
  return useQuery({
    queryKey: emailKeys.detail(emailId),
    queryFn: () => emailsApi.getById(emailId),
    enabled: !!emailId,
  });
}

export function useEmailStats() {
  return useQuery({
    queryKey: emailKeys.stats(),
    queryFn: () => emailsApi.getStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useEmailThreads(params: EmailQueryParams = {}) {
  return useQuery({
    queryKey: emailKeys.threadList(params),
    queryFn: () => emailsApi.getThreads(params),
    staleTime: 30 * 1000,
  });
}

export function useEmailThread(threadId: string) {
  return useQuery({
    queryKey: emailKeys.thread(threadId),
    queryFn: () => emailsApi.getThread(threadId),
    enabled: !!threadId,
  });
}

// ============================================
// Email Mutation Hooks
// ============================================

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendEmailRequest) => emailsApi.send(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useReplyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, request }: { emailId: string; request: SendEmailRequest }) =>
      emailsApi.reply(emailId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.threads() });
    },
  });
}

export function useForwardEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, request }: { emailId: string; request: SendEmailRequest }) =>
      emailsApi.forward(emailId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}

export function useMarkEmailAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) => emailsApi.markAsRead(emailId),
    onSuccess: (updatedEmail) => {
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useMarkEmailAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) => emailsApi.markAsUnread(emailId),
    onSuccess: (updatedEmail) => {
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useToggleEmailStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, isStarred }: { emailId: string; isStarred: boolean }) =>
      emailsApi.toggleStar(emailId, isStarred),
    onSuccess: (updatedEmail) => {
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}

export function useMoveEmailToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, folder }: { emailId: string; folder: EmailFolder }) =>
      emailsApi.moveToFolder(emailId, folder),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) => emailsApi.delete(emailId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useBulkDeleteEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => emailsApi.bulkDelete(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useBulkMarkEmailsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, isRead }: { ids: string[]; isRead: boolean }) =>
      emailsApi.bulkMarkAsRead(ids, isRead),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

// ============================================
// Draft Hooks
// ============================================

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDraftRequest) => emailsApi.createDraft(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateDraftRequest }) =>
      emailsApi.updateDraft(id, request),
    onSuccess: (updatedDraft) => {
      queryClient.setQueryData(emailKeys.detail(updatedDraft.id), updatedDraft);
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailsApi.deleteDraft(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

// ============================================
// Account Hooks
// ============================================

/**
 * Hook to get OAuth authorization URL for connecting email account
 * Usage: call mutate('gmail') to get the auth URL, then redirect user to it
 */
export function useGetEmailAuthUrl() {
  return useMutation({
    mutationFn: (provider: 'gmail' | 'outlook' | 'google' | 'microsoft') =>
      accountsApi.getAuthUrl(provider),
  });
}

export function useEmailAccounts() {
  return useQuery({
    queryKey: emailKeys.accounts(),
    queryFn: () => accountsApi.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEmailAccount(accountId: string) {
  return useQuery({
    queryKey: emailKeys.account(accountId),
    queryFn: () => accountsApi.getById(accountId),
    enabled: !!accountId,
  });
}

export function useConnectEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConnectEmailRequest) => accountsApi.connect(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    },
  });
}

export function useDisconnectEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => accountsApi.disconnect(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}

export function useSyncEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SyncEmailRequest) => accountsApi.sync(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

export function useSetDefaultEmailAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => accountsApi.setDefault(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    },
  });
}

export function useUpdateEmailAccountSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, settings }: { accountId: string; settings: Partial<EmailAccount['settings']> }) =>
      accountsApi.updateSettings(accountId, settings),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(emailKeys.account(updatedAccount.id), updatedAccount);
      void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    },
  });
}

// ============================================
// Recipient Search Hook
// ============================================

export function useRecipientSearch(query: string) {
  return useQuery({
    queryKey: emailKeys.recipients(query),
    queryFn: () => emailsApi.searchRecipients(query),
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// Composite Hooks
// ============================================

export function useEmailDashboard() {
  const stats = useEmailStats();
  const accounts = useEmailAccounts();
  const inbox = useEmails({ folder: 'inbox', limit: 10 });

  return {
    stats: stats.data,
    accounts: accounts.data?.accounts ?? [],
    recentEmails: inbox.data?.emails ?? [],
    isLoading: stats.isLoading || accounts.isLoading || inbox.isLoading,
    refetch: () => {
      void stats.refetch();
      void accounts.refetch();
      void inbox.refetch();
    },
  };
}

export function useEmailFolder(folder: EmailFolder, params: Omit<EmailQueryParams, 'folder'> = {}) {
  const emails = useEmails({ ...params, folder });
  const stats = useEmailStats();

  const folderStats = stats.data?.folderStats.find((f) => f.folder === folder);

  return {
    emails: emails.data?.emails ?? [],
    total: emails.data?.total ?? 0,
    hasMore: emails.data?.hasMore ?? false,
    unreadCount: folderStats?.unread ?? 0,
    isLoading: emails.isLoading,
    isFetching: emails.isFetching,
    refetch: emails.refetch,
  };
}

// ============================================
// Aliases (for convenience)
// ============================================

/**
 * Alias for useMarkEmailAsRead
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId }: { emailId: string }) => emailsApi.markAsRead(emailId),
    onSuccess: (updatedEmail) => {
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: emailKeys.stats() });
    },
  });
}

/**
 * Alias for useToggleEmailStar
 */
export function useToggleStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, starred }: { emailId: string; starred: boolean }) =>
      emailsApi.toggleStar(emailId, starred),
    onSuccess: (updatedEmail) => {
      queryClient.setQueryData(emailKeys.detail(updatedEmail.id), updatedEmail);
      void queryClient.invalidateQueries({ queryKey: emailKeys.lists() });
    },
  });
}
