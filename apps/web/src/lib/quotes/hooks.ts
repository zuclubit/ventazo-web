'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { useTenantValidation } from '@/lib/tenant';

import type {
  Quote,
  QuoteTemplate,
  QuoteActivity,
  QuoteAnalytics,
  QuotesListResponse,
  QuoteTemplatesResponse,
  QuoteActivityResponse,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  SendQuoteRequest,
  AcceptQuoteRequest,
  RejectQuoteRequest,
  QuotesQueryParams,
  QuoteStats,
} from './types';

// ============================================
// Query Keys
// ============================================

export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (params: QuotesQueryParams) => [...quoteKeys.lists(), params] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
  activity: (id: string) => [...quoteKeys.all, 'activity', id] as const,
  stats: () => [...quoteKeys.all, 'stats'] as const,
  analytics: () => [...quoteKeys.all, 'analytics'] as const,
  templates: () => [...quoteKeys.all, 'templates'] as const,
  template: (id: string) => [...quoteKeys.templates(), id] as const,
};

// ============================================
// Quote Queries
// ============================================

// Backend response type (different from frontend expected format)
interface BackendQuotesResponse {
  quotes: Array<{
    id: string;
    tenantId: string;
    quoteNumber: string;
    customerId: string | null;
    leadId: string | null;
    opportunityId: string | null;
    title: string;
    description: string | null;
    status: string;
    version: number;
    parentQuoteId: string | null;
    issueDate: string;
    expirationDate: string;
    acceptedAt?: string;
    sentAt?: string;
    viewedAt?: string;
    rejectedAt?: string;
    currency: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    billingAddress: Record<string, unknown>;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    companyName: string | null;
    terms: string | null;
    notes: string | null;
    internalNotes: string | null;
    signatureRequired: boolean;
    signatureName: string | null;
    signatureEmail: string | null;
    signatureDate?: string;
    signatureIp: string | null;
    paymentTerms: string | null;
    paymentDueDays: number | null;
    depositRequired: boolean;
    depositPercentage: number | null;
    depositAmount: number | null;
    attachmentUrls: string[] | null;
    pdfUrl: string | null;
    publicUrl: string | null;
    publicToken: string;
    viewCount: number;
    lastViewedBy: string | null;
    tags: string[];
    customFields: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdBy: string;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}

// Transform backend quote to frontend Quote type
function transformQuote(backendQuote: BackendQuotesResponse['quotes'][0]): Quote {
  return {
    id: backendQuote.id,
    tenantId: backendQuote.tenantId,
    quoteNumber: backendQuote.quoteNumber,
    title: backendQuote.title,
    description: backendQuote.description ?? undefined,
    status: backendQuote.status as Quote['status'],
    leadId: backendQuote.leadId ?? undefined,
    customerId: backendQuote.customerId ?? undefined,
    opportunityId: backendQuote.opportunityId ?? undefined,
    contactEmail: backendQuote.contactEmail ?? undefined,
    issueDate: backendQuote.issueDate,
    expiryDate: backendQuote.expirationDate, // Map expirationDate -> expiryDate
    sentAt: backendQuote.sentAt,
    viewedAt: backendQuote.viewedAt,
    acceptedAt: backendQuote.acceptedAt,
    rejectedAt: backendQuote.rejectedAt,
    currency: backendQuote.currency,
    subtotal: backendQuote.subtotal,
    discountAmount: backendQuote.discountTotal,
    taxAmount: backendQuote.taxTotal,
    total: backendQuote.total,
    items: [], // Line items loaded separately if needed
    terms: backendQuote.terms ?? undefined,
    notes: backendQuote.notes ?? undefined,
    internalNotes: backendQuote.internalNotes ?? undefined,
    createdBy: backendQuote.createdBy,
    publicToken: backendQuote.publicToken,
    publicUrl: backendQuote.publicUrl ?? undefined,
    version: backendQuote.version,
    parentQuoteId: backendQuote.parentQuoteId ?? undefined,
    createdAt: backendQuote.createdAt,
    updatedAt: backendQuote.updatedAt,
  };
}

/**
 * Hook to fetch quotes with filters and pagination
 */
export function useQuotes(params: QuotesQueryParams = {}) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: quoteKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      // Backend uses 'offset' not 'page', and limit max is 100
      const limit = Math.min(params.limit || 20, 100);
      const page = params.page || 1;
      const offset = (page - 1) * limit;

      searchParams.set('limit', String(limit));
      if (offset > 0) searchParams.set('offset', String(offset));

      // Backend uses 'search' not 'searchTerm'
      if (params.searchTerm) searchParams.set('search', params.searchTerm);
      if (params.status) searchParams.set('status', params.status);
      if (params.leadId) searchParams.set('leadId', params.leadId);
      if (params.customerId) searchParams.set('customerId', params.customerId);
      if (params.opportunityId) searchParams.set('opportunityId', params.opportunityId);
      if (params.assignedTo) searchParams.set('createdBy', params.assignedTo); // Backend uses createdBy
      if (params.minTotal !== undefined) searchParams.set('minTotal', String(params.minTotal));
      if (params.maxTotal !== undefined) searchParams.set('maxTotal', String(params.maxTotal));
      // Backend uses createdFrom/createdTo format
      if (params.createdFrom) searchParams.set('createdFrom', params.createdFrom);
      if (params.createdTo) searchParams.set('createdTo', params.createdTo);
      // Backend uses expirationFrom/expirationTo (not expiryFrom)
      if (params.expiryFrom) searchParams.set('expirationFrom', params.expiryFrom);
      if (params.expiryTo) searchParams.set('expirationTo', params.expiryTo);
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      // Backend returns { quotes: [], total: N }
      const response = await apiClient.get<BackendQuotesResponse>(
        `/quotes?${searchParams.toString()}`,
        { tenantId: tenantId! }
      );

      // Transform to frontend expected format
      const transformedQuotes = response.quotes.map(transformQuote);

      return {
        data: transformedQuotes,
        meta: {
          page,
          limit,
          total: response.total,
          totalPages: Math.ceil(response.total / limit),
        },
      } as QuotesListResponse;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch a single quote by ID
 */
export function useQuote(quoteId: string) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: quoteKeys.detail(quoteId),
    queryFn: async () => {
      const response = await apiClient.get<Quote>(`/quotes/${quoteId}`, { tenantId: tenantId! });
      return response;
    },
    enabled: isValid && !!tenantId && !!quoteId,
  });
}

/**
 * Hook to fetch quote statistics
 * Uses dedicated /quotes/stats endpoint that calculates stats server-side
 */
export function useQuoteStats() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: quoteKeys.stats(),
    queryFn: async () => {
      // Backend /quotes/stats returns stats directly
      const stats = await apiClient.get<QuoteStats>(
        '/quotes/stats',
        { tenantId: tenantId! }
      );
      return stats;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch quote analytics
 */
export function useQuoteAnalytics(startDate?: string, endDate?: string) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: [...quoteKeys.analytics(), { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await apiClient.get<QuoteAnalytics>(
        `/quotes/analytics?${params.toString()}`,
        { tenantId: tenantId! }
      );
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch quote activity
 */
export function useQuoteActivity(quoteId: string, page = 1, limit = 20) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: [...quoteKeys.activity(quoteId), { page, limit }],
    queryFn: async () => {
      const response = await apiClient.get<QuoteActivityResponse>(
        `/quotes/${quoteId}/activity?page=${page}&limit=${limit}`,
        { tenantId: tenantId! }
      );
      return response;
    },
    enabled: isValid && !!tenantId && !!quoteId,
  });
}

// ============================================
// Template Queries
// ============================================

/**
 * Hook to fetch quote templates
 */
export function useQuoteTemplates() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: quoteKeys.templates(),
    queryFn: async () => {
      const response = await apiClient.get<QuoteTemplatesResponse>('/quotes/templates', {
        tenantId: tenantId!,
      });
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch a single template
 */
export function useQuoteTemplate(templateId: string) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: quoteKeys.template(templateId),
    queryFn: async () => {
      const response = await apiClient.get<QuoteTemplate>(`/quotes/templates/${templateId}`, {
        tenantId: tenantId!,
      });
      return response;
    },
    enabled: isValid && !!tenantId && !!templateId,
  });
}

// ============================================
// Quote Mutations
// ============================================

/**
 * Hook to create a new quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateQuoteRequest) => {
      const response = await apiClient.post<Quote>('/quotes', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.analytics() });
    },
  });
}

/**
 * Hook to update a quote
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: UpdateQuoteRequest }) => {
      const response = await apiClient.patch<Quote>(`/quotes/${quoteId}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });
}

/**
 * Hook to delete a quote
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      await apiClient.delete(`/quotes/${quoteId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.analytics() });
    },
  });
}

/**
 * Hook to send a quote via email/SMS
 */
export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: SendQuoteRequest }) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/send`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.activity(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });
}

/**
 * Hook to mark quote as viewed
 */
export function useMarkQuoteViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/viewed`, {});
      return response;
    },
    onSuccess: (_, quoteId) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.activity(quoteId) });
    },
  });
}

/**
 * Hook to accept a quote
 */
export function useAcceptQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data?: AcceptQuoteRequest }) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/accept`, data || {});
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.activity(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.analytics() });
      // Also invalidate opportunities if linked
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

/**
 * Hook to reject a quote
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data?: RejectQuoteRequest }) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/reject`, data || {});
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.activity(variables.quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });
}

/**
 * Hook to revise (create new version of) a quote
 */
export function useReviseQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/revise`, {});
      return response;
    },
    onSuccess: (_, quoteId) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });
}

/**
 * Hook to duplicate a quote
 */
export function useDuplicateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiClient.post<Quote>(`/quotes/${quoteId}/duplicate`, {});
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.stats() });
    },
  });
}

/**
 * Hook to generate PDF for a quote
 * Returns the PDF as a Blob for direct download
 */
export function useGenerateQuotePdf() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (quoteId: string): Promise<Blob> => {
      // Get the PDF as blob using raw fetch
      const response = await apiClient.getBlob(`/quotes/${quoteId}/pdf`, {
        tenantId: tenantId!,
      });
      return response;
    },
  });
}

// ============================================
// Template Mutations
// ============================================

/**
 * Hook to create a quote template
 */
export function useCreateQuoteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<QuoteTemplate>) => {
      const response = await apiClient.post<QuoteTemplate>('/quotes/templates', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.templates() });
    },
  });
}

/**
 * Hook to update a quote template
 */
export function useUpdateQuoteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<QuoteTemplate> }) => {
      const response = await apiClient.patch<QuoteTemplate>(`/quotes/templates/${templateId}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.templates() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.template(variables.templateId) });
    },
  });
}

/**
 * Hook to delete a quote template
 */
export function useDeleteQuoteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`/quotes/templates/${templateId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.templates() });
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for quote management
 */
export function useQuotesManagement(params: QuotesQueryParams = {}) {
  const quotes = useQuotes(params);
  const stats = useQuoteStats();

  return {
    quotes: quotes.data?.data || [],
    meta: quotes.data?.meta,
    stats: stats.data,
    isLoading: quotes.isLoading,
    isStatsLoading: stats.isLoading,
    error: quotes.error,
    statsError: stats.error,
    refetchQuotes: quotes.refetch,
    refetchStats: stats.refetch,
  };
}

/**
 * Combined hook for quote detail page
 */
export function useQuoteDetail(quoteId: string) {
  const quote = useQuote(quoteId);
  const activity = useQuoteActivity(quoteId);
  const templates = useQuoteTemplates();

  return {
    quote: quote.data,
    activities: activity.data?.data || [],
    activityMeta: activity.data?.meta,
    templates: templates.data?.data || [],
    isLoading: quote.isLoading,
    isActivityLoading: activity.isLoading,
    quoteError: quote.error,
    refetchQuote: quote.refetch,
    refetchActivity: activity.refetch,
  };
}

/**
 * Combined hook for all quote mutations
 */
export function useQuoteMutations() {
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const sendQuote = useSendQuote();
  const acceptQuote = useAcceptQuote();
  const rejectQuote = useRejectQuote();
  const reviseQuote = useReviseQuote();
  const duplicateQuote = useDuplicateQuote();
  const generatePdf = useGenerateQuotePdf();

  const isLoading =
    createQuote.isPending ||
    updateQuote.isPending ||
    deleteQuote.isPending ||
    sendQuote.isPending ||
    acceptQuote.isPending ||
    rejectQuote.isPending ||
    reviseQuote.isPending ||
    duplicateQuote.isPending ||
    generatePdf.isPending;

  return {
    create: createQuote.mutateAsync,
    update: updateQuote.mutateAsync,
    delete: deleteQuote.mutateAsync,
    send: sendQuote.mutateAsync,
    accept: acceptQuote.mutateAsync,
    reject: rejectQuote.mutateAsync,
    revise: reviseQuote.mutateAsync,
    duplicate: duplicateQuote.mutateAsync,
    generatePdf: generatePdf.mutateAsync,
    isLoading,
    createState: createQuote,
    updateState: updateQuote,
    deleteState: deleteQuote,
    sendState: sendQuote,
    acceptState: acceptQuote,
    rejectState: rejectQuote,
    reviseState: reviseQuote,
    duplicateState: duplicateQuote,
    pdfState: generatePdf,
  };
}
