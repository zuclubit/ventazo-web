// ============================================
// Leads Hooks Tests - FASE 5.11
// Unit tests for leads data hooks
// ============================================

import * as React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { leadKeys, useLeadSelection } from './hooks';

// Create wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

// ============================================
// Lead Keys Tests
// ============================================

describe('leadKeys', () => {
  describe('base keys', () => {
    it('generates correct all key', () => {
      expect(leadKeys.all).toEqual(['leads']);
    });

    it('generates correct lists key', () => {
      expect(leadKeys.lists()).toEqual(['leads', 'list']);
    });

    it('generates correct details key', () => {
      expect(leadKeys.details()).toEqual(['leads', 'detail']);
    });
  });

  describe('parameterized keys', () => {
    it('generates correct list key with params', () => {
      const params = { page: 1, limit: 10 };
      expect(leadKeys.list(params)).toEqual(['leads', 'list', params]);
    });

    it('generates correct detail key', () => {
      expect(leadKeys.detail('lead-123')).toEqual(['leads', 'detail', 'lead-123']);
    });

    it('generates correct notes key', () => {
      expect(leadKeys.notes('lead-123')).toEqual(['leads', 'notes', 'lead-123']);
    });

    it('generates correct activity key', () => {
      expect(leadKeys.activity('lead-123')).toEqual(['leads', 'activity', 'lead-123']);
    });
  });

  describe('stats keys', () => {
    it('generates correct stats key', () => {
      expect(leadKeys.stats()).toEqual(['leads', 'stats']);
    });
  });

  describe('pipeline keys', () => {
    it('generates correct pipeline key', () => {
      expect(leadKeys.pipeline()).toEqual(['leads', 'pipeline']);
    });

    it('generates correct pipeline stages key', () => {
      expect(leadKeys.pipelineStages()).toEqual(['leads', 'pipeline', 'stages']);
    });

    it('generates correct pipeline view key', () => {
      expect(leadKeys.pipelineView()).toEqual(['leads', 'pipeline', 'view']);
    });
  });
});

// ============================================
// useLeadSelection Tests
// ============================================

describe('useLeadSelection', () => {
  it('initializes with empty selection', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    expect(result.current.selectedLeads).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('toggles lead selection on', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleLead('lead-1');
    });

    expect(result.current.selectedLeads).toContain('lead-1');
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.hasSelection).toBe(true);
  });

  it('toggles lead selection off', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleLead('lead-1');
    });

    act(() => {
      result.current.toggleLead('lead-1');
    });

    expect(result.current.selectedLeads).not.toContain('lead-1');
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('selects multiple leads', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleLead('lead-1');
      result.current.toggleLead('lead-2');
      result.current.toggleLead('lead-3');
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.selectedLeads).toContain('lead-1');
    expect(result.current.selectedLeads).toContain('lead-2');
    expect(result.current.selectedLeads).toContain('lead-3');
  });

  it('selects all leads at once', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectAll(['lead-1', 'lead-2', 'lead-3']);
    });

    expect(result.current.selectedCount).toBe(3);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectAll(['lead-1', 'lead-2', 'lead-3']);
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('checks if lead is selected', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleLead('lead-1');
    });

    expect(result.current.isSelected('lead-1')).toBe(true);
    expect(result.current.isSelected('lead-2')).toBe(false);
  });

  it('maintains selection across rerenders', () => {
    const { result, rerender } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleLead('lead-1');
    });

    rerender();

    expect(result.current.isSelected('lead-1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);
  });

  it('returns selected leads as array', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectAll(['lead-1', 'lead-2']);
    });

    expect(Array.isArray(result.current.selectedLeads)).toBe(true);
    expect(result.current.selectedLeads.length).toBe(2);
  });

  it('replaces selection when selectAll is called', () => {
    const { result } = renderHook(() => useLeadSelection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectAll(['lead-1', 'lead-2']);
    });

    act(() => {
      result.current.selectAll(['lead-3', 'lead-4', 'lead-5']);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected('lead-1')).toBe(false);
    expect(result.current.isSelected('lead-3')).toBe(true);
  });
});

// ============================================
// Mock API Client for Hook Tests
// ============================================

// Note: Full integration tests for useLeads, useCreateLead, etc.
// would require mocking the API client and tenant store.
// Those tests are better suited for integration tests.

describe('Lead Hooks Integration', () => {
  it('exports all expected hooks', async () => {
    // Dynamic import to check exports
    const hooksModule = await import('./hooks');

    expect(hooksModule.useLeads).toBeDefined();
    expect(hooksModule.useLead).toBeDefined();
    expect(hooksModule.useLeadStats).toBeDefined();
    expect(hooksModule.useCreateLead).toBeDefined();
    expect(hooksModule.useUpdateLead).toBeDefined();
    expect(hooksModule.useDeleteLead).toBeDefined();
    expect(hooksModule.useChangeLeadStatus).toBeDefined();
    expect(hooksModule.useUpdateLeadScore).toBeDefined();
    expect(hooksModule.useAssignLead).toBeDefined();
    expect(hooksModule.useUpdateLeadStage).toBeDefined();
    expect(hooksModule.useQualifyLead).toBeDefined();
    expect(hooksModule.useConvertLead).toBeDefined();
    expect(hooksModule.useScheduleFollowUp).toBeDefined();
    expect(hooksModule.useLeadNotes).toBeDefined();
    expect(hooksModule.useAddLeadNote).toBeDefined();
    expect(hooksModule.useUpdateLeadNote).toBeDefined();
    expect(hooksModule.useDeleteLeadNote).toBeDefined();
    expect(hooksModule.useLeadActivity).toBeDefined();
    expect(hooksModule.usePipelineStages).toBeDefined();
    expect(hooksModule.usePipelineView).toBeDefined();
    expect(hooksModule.useCreatePipelineStage).toBeDefined();
    expect(hooksModule.useLeadDetail).toBeDefined();
    expect(hooksModule.useLeadsManagement).toBeDefined();
    expect(hooksModule.useLeadNotesManagement).toBeDefined();
    expect(hooksModule.useBulkAssignLeads).toBeDefined();
    expect(hooksModule.useBulkDeleteLeads).toBeDefined();
    expect(hooksModule.useBulkUpdateStatus).toBeDefined();
    expect(hooksModule.useBulkUpdateStage).toBeDefined();
    expect(hooksModule.useBulkExportLeads).toBeDefined();
    expect(hooksModule.useBulkTagLeads).toBeDefined();
    expect(hooksModule.useBulkLeadOperations).toBeDefined();
    expect(hooksModule.useLeadsAdvanced).toBeDefined();
    expect(hooksModule.useLeadSelection).toBeDefined();
  });
});
