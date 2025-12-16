// ============================================
// FASE 5.8 — Dashboard & Analytics Hooks
// Enhanced with Advanced Reports - FASE 5.10
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  AnalyticsFilters,
  CustomerAnalytics,
  DashboardConfig,
  ExportResult,
  LeadAnalytics,
  OpportunityAnalytics,
  OverviewKPIs,
  ReportConfig,
  ReportExecution,
  ReportType,
  SavedReport,
  ScheduledExport,
  ServiceAnalytics,
  TaskAnalytics,
  WorkflowAnalytics,
} from './types';

// ============================================
// Query Keys
// ============================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'overview', filters] as const,
  leads: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'leads', filters] as const,
  opportunities: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'opportunities', filters] as const,
  customers: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'customers', filters] as const,
  tasks: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'tasks', filters] as const,
  services: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'services', filters] as const,
  workflows: (filters: AnalyticsFilters) => [...analyticsKeys.all, 'workflows', filters] as const,
};

// ============================================
// API Functions
// ============================================

const buildQueryParams = (filters: AnalyticsFilters): string => {
  const params = new URLSearchParams();
  params.append('dateRange', filters.dateRange);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.tags?.length) params.append('tags', filters.tags.join(','));
  if (filters.stageId) params.append('stageId', filters.stageId);
  if (filters.status) params.append('status', filters.status);
  return params.toString();
};

const analyticsApi = {
  getOverview: async (filters: AnalyticsFilters): Promise<OverviewKPIs> => {
    return apiClient.get<OverviewKPIs>(`/analytics/overview?${buildQueryParams(filters)}`);
  },

  getLeads: async (filters: AnalyticsFilters): Promise<LeadAnalytics> => {
    return apiClient.get<LeadAnalytics>(`/analytics/leads?${buildQueryParams(filters)}`);
  },

  getOpportunities: async (filters: AnalyticsFilters): Promise<OpportunityAnalytics> => {
    return apiClient.get<OpportunityAnalytics>(`/analytics/opportunities?${buildQueryParams(filters)}`);
  },

  getCustomers: async (filters: AnalyticsFilters): Promise<CustomerAnalytics> => {
    return apiClient.get<CustomerAnalytics>(`/analytics/customers?${buildQueryParams(filters)}`);
  },

  getTasks: async (filters: AnalyticsFilters): Promise<TaskAnalytics> => {
    return apiClient.get<TaskAnalytics>(`/analytics/tasks?${buildQueryParams(filters)}`);
  },

  getServices: async (filters: AnalyticsFilters): Promise<ServiceAnalytics> => {
    return apiClient.get<ServiceAnalytics>(`/analytics/services?${buildQueryParams(filters)}`);
  },

  getWorkflows: async (filters: AnalyticsFilters): Promise<WorkflowAnalytics> => {
    return apiClient.get<WorkflowAnalytics>(`/analytics/workflows?${buildQueryParams(filters)}`);
  },
};

// ============================================
// Default Filters
// ============================================

export const defaultFilters: AnalyticsFilters = {
  dateRange: 'month',
};

// ============================================
// Query Hooks
// ============================================

export function useAnalyticsOverview(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.overview(filters),
    queryFn: () => analyticsApi.getOverview(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAnalyticsLeads(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.leads(filters),
    queryFn: () => analyticsApi.getLeads(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsOpportunities(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.opportunities(filters),
    queryFn: () => analyticsApi.getOpportunities(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsCustomers(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.customers(filters),
    queryFn: () => analyticsApi.getCustomers(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsTasks(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.tasks(filters),
    queryFn: () => analyticsApi.getTasks(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsServices(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.services(filters),
    queryFn: () => analyticsApi.getServices(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsWorkflows(filters: AnalyticsFilters = defaultFilters) {
  return useQuery({
    queryKey: analyticsKeys.workflows(filters),
    queryFn: () => analyticsApi.getWorkflows(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Composite Hook for Dashboard
// ============================================

export function useDashboardAnalytics(filters: AnalyticsFilters = defaultFilters) {
  const overview = useAnalyticsOverview(filters);
  const leads = useAnalyticsLeads(filters);
  const opportunities = useAnalyticsOpportunities(filters);
  const tasks = useAnalyticsTasks(filters);

  return {
    overview: overview.data,
    leads: leads.data,
    opportunities: opportunities.data,
    tasks: tasks.data,
    isLoading: overview.isLoading || leads.isLoading || opportunities.isLoading || tasks.isLoading,
    isError: overview.isError || leads.isError || opportunities.isError || tasks.isError,
    refetch: () => {
      void overview.refetch();
      void leads.refetch();
      void opportunities.refetch();
      void tasks.refetch();
    },
  };
}

// ============================================
// Advanced Reports - FASE 5.10
// ============================================

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (type?: ReportType) => [...reportKeys.lists(), type] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
  executions: (reportId: string) => [...reportKeys.all, 'executions', reportId] as const,
  saved: () => [...reportKeys.all, 'saved'] as const,
  scheduled: () => [...reportKeys.all, 'scheduled'] as const,
};

const reportsApi = {
  list: async (type?: ReportType): Promise<{ data: SavedReport[]; total: number }> => {
    const params = type ? `?type=${type}` : '';
    return apiClient.get<{ data: SavedReport[]; total: number }>(`/reports${params}`);
  },

  getById: async (id: string): Promise<SavedReport> => {
    return apiClient.get<SavedReport>(`/reports/${id}`);
  },

  create: async (data: Omit<ReportConfig, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<SavedReport> => {
    return apiClient.post<SavedReport>('/reports', data);
  },

  update: async (id: string, data: Partial<ReportConfig>): Promise<SavedReport> => {
    return apiClient.patch<SavedReport>(`/reports/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/reports/${id}`);
  },

  execute: async (id: string, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<ReportExecution> => {
    return apiClient.post<ReportExecution>(`/reports/${id}/execute`, { format });
  },

  getExecutions: async (reportId: string): Promise<ReportExecution[]> => {
    return apiClient.get<ReportExecution[]>(`/reports/${reportId}/executions`);
  },

  toggleFavorite: async (id: string): Promise<SavedReport> => {
    return apiClient.post<SavedReport>(`/reports/${id}/favorite`);
  },

  duplicate: async (id: string): Promise<SavedReport> => {
    return apiClient.post<SavedReport>(`/reports/${id}/duplicate`);
  },
};

export function useSavedReports(type?: ReportType) {
  return useQuery({
    queryKey: reportKeys.list(type),
    queryFn: () => reportsApi.list(type),
  });
}

export function useSavedReport(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReportConfig> }) => reportsApi.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: reportKeys.detail(variables.id) });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

export function useExecuteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, format }: { id: string; format?: 'csv' | 'xlsx' | 'pdf' }) => reportsApi.execute(id, format),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.executions(variables.id) });
    },
  });
}

export function useReportExecutions(reportId: string) {
  return useQuery({
    queryKey: reportKeys.executions(reportId),
    queryFn: () => reportsApi.getExecutions(reportId),
    enabled: !!reportId,
  });
}

export function useToggleReportFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.toggleFavorite,
    onSuccess: (updatedReport) => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.setQueryData(reportKeys.detail(updatedReport.id), updatedReport);
    },
  });
}

export function useDuplicateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.duplicate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

// ============================================
// Custom Dashboards - FASE 5.10
// ============================================

export const dashboardKeys = {
  all: ['dashboards'] as const,
  lists: () => [...dashboardKeys.all, 'list'] as const,
  details: () => [...dashboardKeys.all, 'detail'] as const,
  detail: (id: string) => [...dashboardKeys.details(), id] as const,
  default: () => [...dashboardKeys.all, 'default'] as const,
};

const dashboardsApi = {
  list: async (): Promise<{ data: DashboardConfig[]; total: number }> => {
    return apiClient.get<{ data: DashboardConfig[]; total: number }>('/dashboards');
  },

  getById: async (id: string): Promise<DashboardConfig> => {
    return apiClient.get<DashboardConfig>(`/dashboards/${id}`);
  },

  getDefault: async (): Promise<DashboardConfig | null> => {
    return apiClient.get<DashboardConfig | null>('/dashboards/default');
  },

  create: async (data: Omit<DashboardConfig, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<DashboardConfig> => {
    return apiClient.post<DashboardConfig>('/dashboards', data);
  },

  update: async (id: string, data: Partial<DashboardConfig>): Promise<DashboardConfig> => {
    return apiClient.patch<DashboardConfig>(`/dashboards/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/dashboards/${id}`);
  },

  setDefault: async (id: string): Promise<DashboardConfig> => {
    return apiClient.post<DashboardConfig>(`/dashboards/${id}/set-default`);
  },

  duplicate: async (id: string): Promise<DashboardConfig> => {
    return apiClient.post<DashboardConfig>(`/dashboards/${id}/duplicate`);
  },
};

export function useCustomDashboards() {
  return useQuery({
    queryKey: dashboardKeys.lists(),
    queryFn: dashboardsApi.list,
  });
}

export function useCustomDashboard(id: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: () => dashboardsApi.getById(id),
    enabled: !!id,
  });
}

export function useDefaultDashboard() {
  return useQuery({
    queryKey: dashboardKeys.default(),
    queryFn: dashboardsApi.getDefault,
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dashboardsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DashboardConfig> }) => dashboardsApi.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(variables.id) });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dashboardsApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}

export function useSetDefaultDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dashboardsApi.setDefault,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.default() });
    },
  });
}

export function useDuplicateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dashboardsApi.duplicate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}

// ============================================
// Export Analytics - FASE 5.10
// ============================================

const exportApi = {
  exportAnalytics: async (
    section: 'overview' | 'leads' | 'opportunities' | 'customers' | 'tasks' | 'services' | 'workflows',
    filters: AnalyticsFilters,
    format: 'csv' | 'xlsx' | 'pdf'
  ): Promise<ExportResult> => {
    return apiClient.post<ExportResult>(`/analytics/${section}/export`, { filters, format });
  },

  getScheduledExports: async (): Promise<ScheduledExport[]> => {
    return apiClient.get<ScheduledExport[]>('/analytics/exports/scheduled');
  },

  createScheduledExport: async (data: Omit<ScheduledExport, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>): Promise<ScheduledExport> => {
    return apiClient.post<ScheduledExport>('/analytics/exports/scheduled', data);
  },

  deleteScheduledExport: async (id: string): Promise<void> => {
    await apiClient.delete(`/analytics/exports/scheduled/${id}`);
  },
};

export function useExportAnalytics() {
  return useMutation({
    mutationFn: ({
      section,
      filters,
      format,
    }: {
      section: 'overview' | 'leads' | 'opportunities' | 'customers' | 'tasks' | 'services' | 'workflows';
      filters: AnalyticsFilters;
      format: 'csv' | 'xlsx' | 'pdf';
    }) => exportApi.exportAnalytics(section, filters, format),
  });
}

export function useScheduledExports() {
  return useQuery({
    queryKey: ['scheduled-exports'],
    queryFn: exportApi.getScheduledExports,
  });
}

export function useCreateScheduledExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exportApi.createScheduledExport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scheduled-exports'] });
    },
  });
}

export function useDeleteScheduledExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exportApi.deleteScheduledExport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scheduled-exports'] });
    },
  });
}

// ============================================
// Combined Dashboard Management Hook - FASE 5.10
// ============================================

export function useDashboardManagement() {
  const dashboards = useCustomDashboards();
  const defaultDashboard = useDefaultDashboard();
  const createDashboard = useCreateDashboard();
  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const setDefaultDashboard = useSetDefaultDashboard();
  const duplicateDashboard = useDuplicateDashboard();

  return {
    // Data
    dashboards: dashboards.data?.data ?? [],
    total: dashboards.data?.total ?? 0,
    defaultDashboard: defaultDashboard.data,

    // Loading states
    isLoading: dashboards.isLoading,
    isLoadingDefault: defaultDashboard.isLoading,

    // Mutations
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setDefaultDashboard,
    duplicateDashboard,

    // Refetch
    refetch: dashboards.refetch,
  };
}

// ============================================
// Combined Reports Management Hook - FASE 5.10
// ============================================

export function useReportsManagement(type?: ReportType) {
  const reports = useSavedReports(type);
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const deleteReport = useDeleteReport();
  const executeReport = useExecuteReport();
  const toggleFavorite = useToggleReportFavorite();
  const duplicateReport = useDuplicateReport();

  return {
    // Data
    reports: reports.data?.data ?? [],
    total: reports.data?.total ?? 0,

    // Loading states
    isLoading: reports.isLoading,

    // Mutations
    createReport,
    updateReport,
    deleteReport,
    executeReport,
    toggleFavorite,
    duplicateReport,

    // Refetch
    refetch: reports.refetch,
  };
}
