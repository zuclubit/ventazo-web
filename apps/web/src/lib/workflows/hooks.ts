// ============================================
// FASE 5.7 — Workflows & Automations Hooks
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  ActionFormData,
  ExecutionFilters,
  TriggerFormData,
  Workflow,
  WorkflowActionConfig,
  WorkflowExecution,
  WorkflowFilters,
  WorkflowFormData,
  WorkflowStatistics,
  WorkflowTrigger,
} from './types';

// ============================================
// Query Keys
// ============================================

export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters: WorkflowFilters) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  statistics: () => [...workflowKeys.all, 'statistics'] as const,
  triggers: (workflowId: string) => [...workflowKeys.all, 'triggers', workflowId] as const,
  actions: (workflowId: string) => [...workflowKeys.all, 'actions', workflowId] as const,
  executions: (workflowId: string, filters?: ExecutionFilters) =>
    [...workflowKeys.all, 'executions', workflowId, filters] as const,
  allExecutions: (filters?: ExecutionFilters) => [...workflowKeys.all, 'all-executions', filters] as const,
};

// ============================================
// API Functions
// ============================================

const workflowApi = {
  // Workflows CRUD
  list: async (filters?: WorkflowFilters): Promise<{ data: Workflow[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.trigger_type) params.append('trigger_type', filters.trigger_type);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.trigger) params.append('trigger', filters.trigger);

    return apiClient.get<{ data: Workflow[]; total: number }>(`/workflows?${params.toString()}`);
  },

  getById: async (id: string): Promise<Workflow> => {
    return apiClient.get<Workflow>(`/workflows/${id}`);
  },

  create: async (data: WorkflowFormData): Promise<Workflow> => {
    return apiClient.post<Workflow>('/workflows', data);
  },

  update: async (id: string, data: Partial<WorkflowFormData>): Promise<Workflow> => {
    return apiClient.patch<Workflow>(`/workflows/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workflows/${id}`);
  },

  activate: async (id: string): Promise<Workflow> => {
    return apiClient.post<Workflow>(`/workflows/${id}/activate`);
  },

  deactivate: async (id: string): Promise<Workflow> => {
    return apiClient.post<Workflow>(`/workflows/${id}/deactivate`);
  },

  duplicate: async (id: string): Promise<Workflow> => {
    return apiClient.post<Workflow>(`/workflows/${id}/duplicate`);
  },

  // Statistics
  getStatistics: async (): Promise<WorkflowStatistics> => {
    return apiClient.get<WorkflowStatistics>('/workflows/statistics');
  },

  // Triggers
  getTriggers: async (workflowId: string): Promise<WorkflowTrigger[]> => {
    return apiClient.get<WorkflowTrigger[]>(`/workflows/${workflowId}/triggers`);
  },

  addTrigger: async (workflowId: string, data: TriggerFormData): Promise<WorkflowTrigger> => {
    return apiClient.post<WorkflowTrigger>(`/workflows/${workflowId}/triggers`, data);
  },

  updateTrigger: async (
    workflowId: string,
    triggerId: string,
    data: Partial<TriggerFormData>
  ): Promise<WorkflowTrigger> => {
    return apiClient.patch<WorkflowTrigger>(`/workflows/${workflowId}/triggers/${triggerId}`, data);
  },

  deleteTrigger: async (workflowId: string, triggerId: string): Promise<void> => {
    await apiClient.delete(`/workflows/${workflowId}/triggers/${triggerId}`);
  },

  // Actions
  getActions: async (workflowId: string): Promise<WorkflowActionConfig[]> => {
    return apiClient.get<WorkflowActionConfig[]>(`/workflows/${workflowId}/actions`);
  },

  addAction: async (workflowId: string, data: ActionFormData): Promise<WorkflowActionConfig> => {
    return apiClient.post<WorkflowActionConfig>(`/workflows/${workflowId}/actions`, data);
  },

  updateAction: async (
    workflowId: string,
    actionId: string,
    data: Partial<ActionFormData>
  ): Promise<WorkflowActionConfig> => {
    return apiClient.patch<WorkflowActionConfig>(`/workflows/${workflowId}/actions/${actionId}`, data);
  },

  deleteAction: async (workflowId: string, actionId: string): Promise<void> => {
    await apiClient.delete(`/workflows/${workflowId}/actions/${actionId}`);
  },

  reorderActions: async (workflowId: string, actionIds: string[]): Promise<void> => {
    await apiClient.post(`/workflows/${workflowId}/actions/reorder`, { actionIds });
  },

  // Executions
  getExecutions: async (
    workflowId: string,
    filters?: ExecutionFilters
  ): Promise<{ data: WorkflowExecution[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);

    return apiClient.get<{ data: WorkflowExecution[]; total: number }>(
      `/workflows/${workflowId}/executions?${params.toString()}`
    );
  },

  getAllExecutions: async (filters?: ExecutionFilters): Promise<{ data: WorkflowExecution[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.workflow_id) params.append('workflow_id', filters.workflow_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);

    return apiClient.get<{ data: WorkflowExecution[]; total: number }>(
      `/workflows/executions?${params.toString()}`
    );
  },

  retryExecution: async (executionId: string): Promise<WorkflowExecution> => {
    return apiClient.post<WorkflowExecution>(`/workflows/executions/${executionId}/retry`);
  },

  // Test workflow
  testWorkflow: async (workflowId: string, testData?: Record<string, unknown>): Promise<WorkflowExecution> => {
    return apiClient.post<WorkflowExecution>(`/workflows/${workflowId}/test`, { testData });
  },
};

// ============================================
// Query Hooks
// ============================================

export function useWorkflows(filters?: WorkflowFilters) {
  return useQuery({
    queryKey: workflowKeys.list(filters ?? {}),
    queryFn: () => workflowApi.list(filters),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => workflowApi.getById(id),
    enabled: !!id,
  });
}

export function useWorkflowStatistics() {
  return useQuery({
    queryKey: workflowKeys.statistics(),
    queryFn: workflowApi.getStatistics,
  });
}

export function useWorkflowTriggers(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.triggers(workflowId),
    queryFn: () => workflowApi.getTriggers(workflowId),
    enabled: !!workflowId,
  });
}

export function useWorkflowActions(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.actions(workflowId),
    queryFn: () => workflowApi.getActions(workflowId),
    enabled: !!workflowId,
  });
}

export function useWorkflowExecutions(workflowId: string, filters?: ExecutionFilters) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId, filters),
    queryFn: () => workflowApi.getExecutions(workflowId, filters),
    enabled: !!workflowId,
  });
}

export function useAllWorkflowExecutions(filters?: ExecutionFilters) {
  return useQuery({
    queryKey: workflowKeys.allExecutions(filters),
    queryFn: () => workflowApi.getAllExecutions(filters),
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.statistics() });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkflowFormData> }) => workflowApi.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.id) });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.statistics() });
    },
  });
}

export function useActivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.activate,
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.statistics() });
    },
  });
}

export function useDeactivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.deactivate,
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.statistics() });
    },
  });
}

export function useDuplicateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.duplicate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.statistics() });
    },
  });
}

// Trigger mutations
export function useAddWorkflowTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, data }: { workflowId: string; data: TriggerFormData }) =>
      workflowApi.addTrigger(workflowId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.triggers(variables.workflowId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

export function useUpdateWorkflowTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      triggerId,
      data,
    }: {
      workflowId: string;
      triggerId: string;
      data: Partial<TriggerFormData>;
    }) => workflowApi.updateTrigger(workflowId, triggerId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.triggers(variables.workflowId) });
    },
  });
}

export function useDeleteWorkflowTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, triggerId }: { workflowId: string; triggerId: string }) =>
      workflowApi.deleteTrigger(workflowId, triggerId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.triggers(variables.workflowId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

// Action mutations
export function useAddWorkflowAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, data }: { workflowId: string; data: ActionFormData }) =>
      workflowApi.addAction(workflowId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.actions(variables.workflowId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

export function useUpdateWorkflowAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      actionId,
      data,
    }: {
      workflowId: string;
      actionId: string;
      data: Partial<ActionFormData>;
    }) => workflowApi.updateAction(workflowId, actionId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.actions(variables.workflowId) });
    },
  });
}

export function useDeleteWorkflowAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, actionId }: { workflowId: string; actionId: string }) =>
      workflowApi.deleteAction(workflowId, actionId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.actions(variables.workflowId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

export function useReorderWorkflowActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, actionIds }: { workflowId: string; actionIds: string[] }) =>
      workflowApi.reorderActions(workflowId, actionIds),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.actions(variables.workflowId) });
    },
  });
}

// Execution mutations
export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowApi.retryExecution,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

export function useTestWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, testData }: { workflowId: string; testData?: Record<string, unknown> }) =>
      workflowApi.testWorkflow(workflowId, testData),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.executions(variables.workflowId, undefined) });
    },
  });
}

// ============================================
// Composite Hooks
// ============================================

export function useWorkflowManagement() {
  const workflowsQuery = useWorkflows();
  const statisticsQuery = useWorkflowStatistics();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const activateWorkflow = useActivateWorkflow();
  const deactivateWorkflow = useDeactivateWorkflow();
  const duplicateWorkflow = useDuplicateWorkflow();

  return {
    // Data
    workflows: workflowsQuery.data?.data ?? [],
    total: workflowsQuery.data?.total ?? 0,
    statistics: statisticsQuery.data,
    // Loading states
    isLoading: workflowsQuery.isLoading,
    isLoadingStatistics: statisticsQuery.isLoading,
    // Mutations
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    deactivateWorkflow,
    duplicateWorkflow,
    // Refetch
    refetch: workflowsQuery.refetch,
  };
}

export function useWorkflowBuilder(workflowId: string) {
  const workflowQuery = useWorkflow(workflowId);
  const triggersQuery = useWorkflowTriggers(workflowId);
  const actionsQuery = useWorkflowActions(workflowId);
  const executionsQuery = useWorkflowExecutions(workflowId);

  const updateWorkflow = useUpdateWorkflow();
  const activateWorkflow = useActivateWorkflow();
  const deactivateWorkflow = useDeactivateWorkflow();

  const addTrigger = useAddWorkflowTrigger();
  const updateTrigger = useUpdateWorkflowTrigger();
  const deleteTrigger = useDeleteWorkflowTrigger();

  const addAction = useAddWorkflowAction();
  const updateAction = useUpdateWorkflowAction();
  const deleteAction = useDeleteWorkflowAction();
  const reorderActions = useReorderWorkflowActions();

  const testWorkflow = useTestWorkflow();

  return {
    // Data
    workflow: workflowQuery.data,
    triggers: triggersQuery.data ?? [],
    actions: actionsQuery.data ?? [],
    executions: executionsQuery.data?.data ?? [],
    // Loading states
    isLoading: workflowQuery.isLoading,
    isLoadingTriggers: triggersQuery.isLoading,
    isLoadingActions: actionsQuery.isLoading,
    isLoadingExecutions: executionsQuery.isLoading,
    // Workflow mutations
    updateWorkflow,
    activateWorkflow,
    deactivateWorkflow,
    // Trigger mutations
    addTrigger,
    updateTrigger,
    deleteTrigger,
    // Action mutations
    addAction,
    updateAction,
    deleteAction,
    reorderActions,
    // Test
    testWorkflow,
    // Refetch
    refetchWorkflow: workflowQuery.refetch,
    refetchTriggers: triggersQuery.refetch,
    refetchActions: actionsQuery.refetch,
    refetchExecutions: executionsQuery.refetch,
  };
}

export function useWorkflowExecutionHistory(filters?: ExecutionFilters) {
  const executionsQuery = useAllWorkflowExecutions(filters);
  const retryExecution = useRetryExecution();

  return {
    executions: executionsQuery.data?.data ?? [],
    total: executionsQuery.data?.total ?? 0,
    isLoading: executionsQuery.isLoading,
    retryExecution,
    refetch: executionsQuery.refetch,
  };
}
