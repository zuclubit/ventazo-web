'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { useTenantValidation } from '@/lib/tenant';

import type {
  ProposalTemplate,
  ProposalTemplatesListResponse,
  CreateProposalTemplateRequest,
  UpdateProposalTemplateRequest,
  ProposalSection,
  ProposalStyles,
} from './types';

// Re-export for convenience
export type { ProposalTemplate, ProposalSection, ProposalStyles };

// ============================================
// Query Keys
// ============================================

export const proposalTemplateKeys = {
  all: ['proposal-templates'] as const,
  lists: () => [...proposalTemplateKeys.all, 'list'] as const,
  list: () => [...proposalTemplateKeys.lists()] as const,
  details: () => [...proposalTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...proposalTemplateKeys.details(), id] as const,
  default: () => [...proposalTemplateKeys.all, 'default'] as const,
  preview: (id: string) => [...proposalTemplateKeys.all, 'preview', id] as const,
};

// ============================================
// Queries
// ============================================

// Backend response format
interface BackendTemplatesResponse {
  templates: ProposalTemplate[];
}

/**
 * Hook to fetch all proposal templates
 */
export function useProposalTemplates() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: proposalTemplateKeys.list(),
    queryFn: async () => {
      // Backend returns { templates: [...] }
      const response = await apiClient.get<BackendTemplatesResponse>(
        '/proposal-templates',
        { tenantId: tenantId! }
      );
      // Transform to expected format
      return {
        data: response.templates || [],
        meta: { total: response.templates?.length || 0 },
      } as ProposalTemplatesListResponse;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch a single proposal template by ID
 */
export function useProposalTemplate(templateId: string | undefined) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: proposalTemplateKeys.detail(templateId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<ProposalTemplate>(
        `/proposal-templates/${templateId}`,
        { tenantId: tenantId! }
      );
      return response;
    },
    enabled: isValid && !!tenantId && !!templateId,
  });
}

/**
 * Hook to fetch the default proposal template
 */
export function useDefaultProposalTemplate() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: proposalTemplateKeys.default(),
    queryFn: async () => {
      const response = await apiClient.get<ProposalTemplate>(
        '/proposal-templates/default',
        { tenantId: tenantId! }
      );
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Hook to create a new proposal template
 */
export function useCreateProposalTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (data: CreateProposalTemplateRequest) => {
      const response = await apiClient.post<ProposalTemplate>(
        '/proposal-templates',
        data,
        { tenantId: tenantId! }
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.default() });
    },
  });
}

/**
 * Hook to update an existing proposal template
 */
export function useUpdateProposalTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateProposalTemplateRequest;
    }) => {
      const response = await apiClient.patch<ProposalTemplate>(
        `/proposal-templates/${templateId}`,
        data,
        { tenantId: tenantId! }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: proposalTemplateKeys.detail(variables.templateId),
      });
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.default() });
    },
  });
}

/**
 * Hook to delete a proposal template
 */
export function useDeleteProposalTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`/proposal-templates/${templateId}`, {
        tenantId: tenantId!,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.default() });
    },
  });
}

/**
 * Hook to duplicate a proposal template
 */
export function useDuplicateProposalTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiClient.post<ProposalTemplate>(
        `/proposal-templates/${templateId}/duplicate`,
        {},
        { tenantId: tenantId! }
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.lists() });
    },
  });
}

/**
 * Hook to set a template as default
 */
export function useSetDefaultProposalTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiClient.post<ProposalTemplate>(
        `/proposal-templates/${templateId}/set-default`,
        {},
        { tenantId: tenantId! }
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: proposalTemplateKeys.default() });
    },
  });
}

/**
 * Hook to generate a preview image for a template
 * Returns a preview thumbnail URL
 */
export function useGenerateTemplatePreview() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      templateId,
      sections,
      styles,
    }: {
      templateId: string;
      sections?: ProposalSection[];
      styles?: ProposalStyles;
    }): Promise<Blob> => {
      const body = sections || styles ? { sections, styles } : {};
      const response = await apiClient.postBlob(
        `/proposal-templates/${templateId}/preview`,
        body,
        { tenantId: tenantId! }
      );
      return response;
    },
  });
}

/**
 * Hook to generate a quote PDF with a specific template
 */
export function useGenerateQuoteWithTemplate() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      quoteId,
      templateId,
    }: {
      quoteId: string;
      templateId?: string;
    }): Promise<Blob> => {
      // Backend uses GET with query params: /quotes/:id/pdf?templateId=xxx
      const params = new URLSearchParams();
      if (templateId) params.set('templateId', templateId);
      const queryString = params.toString();
      const url = `/quotes/${quoteId}/pdf${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.getBlob(url, { tenantId: tenantId! });
      return response;
    },
  });
}

/**
 * Hook to preview a quote with a specific template
 * For now, uses the same endpoint as PDF generation
 */
export function usePreviewQuoteWithTemplate() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      quoteId,
      templateId,
    }: {
      quoteId: string;
      templateId?: string;
    }): Promise<Blob> => {
      // Backend uses GET with query params for PDF generation
      // Preview uses the same endpoint for now
      const params = new URLSearchParams();
      if (templateId) params.set('templateId', templateId);
      const queryString = params.toString();
      const url = `/quotes/${quoteId}/pdf${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.getBlob(url, { tenantId: tenantId! });
      return response;
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for template list management
 */
export function useProposalTemplatesManagement() {
  const templates = useProposalTemplates();
  const defaultTemplate = useDefaultProposalTemplate();

  return {
    templates: templates.data?.data || [],
    total: templates.data?.meta?.total ?? 0,
    defaultTemplate: defaultTemplate.data,
    isLoading: templates.isLoading || defaultTemplate.isLoading,
    error: templates.error || defaultTemplate.error,
    refetch: templates.refetch,
  };
}

/**
 * Combined hook for all template mutations
 */
export function useProposalTemplateMutations() {
  const createTemplate = useCreateProposalTemplate();
  const updateTemplate = useUpdateProposalTemplate();
  const deleteTemplate = useDeleteProposalTemplate();
  const duplicateTemplate = useDuplicateProposalTemplate();
  const setDefault = useSetDefaultProposalTemplate();
  const generatePreview = useGenerateTemplatePreview();

  const isLoading =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    deleteTemplate.isPending ||
    duplicateTemplate.isPending ||
    setDefault.isPending ||
    generatePreview.isPending;

  return {
    create: createTemplate.mutateAsync,
    update: updateTemplate.mutateAsync,
    delete: deleteTemplate.mutateAsync,
    duplicate: duplicateTemplate.mutateAsync,
    setDefault: setDefault.mutateAsync,
    generatePreview: generatePreview.mutateAsync,
    isLoading,
    createState: createTemplate,
    updateState: updateTemplate,
    deleteState: deleteTemplate,
    duplicateState: duplicateTemplate,
    setDefaultState: setDefault,
    previewState: generatePreview,
  };
}

/**
 * Hook for template editor
 * Provides template data and all mutation capabilities
 */
export function useProposalTemplateEditor(templateId?: string) {
  const template = useProposalTemplate(templateId);
  const mutations = useProposalTemplateMutations();

  return {
    template: template.data,
    isTemplateLoading: template.isLoading,
    error: template.error,
    refetch: template.refetch,
    ...mutations,
  };
}

/**
 * Hook for PDF generation with templates
 */
export function useProposalPdfGeneration() {
  const generatePdf = useGenerateQuoteWithTemplate();
  const generatePreview = usePreviewQuoteWithTemplate();

  return {
    generatePdf: generatePdf.mutateAsync,
    generatePreview: generatePreview.mutateAsync,
    isPdfLoading: generatePdf.isPending,
    isPreviewLoading: generatePreview.isPending,
    pdfError: generatePdf.error,
    previewError: generatePreview.error,
  };
}
