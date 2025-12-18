// ============================================
// Test Utilities - FASE 5.11
// Reusable test helpers and wrappers
// ============================================

import * as React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

// ============================================
// Query Client for Tests
// ============================================

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================
// All Providers Wrapper
// ============================================

interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================
// Custom Render
// ============================================

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// ============================================
// Mock Factories
// ============================================

export function createMockLead(overrides?: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  score: number;
}>) {
  return {
    id: 'lead-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Acme Inc',
    status: 'new',
    score: 50,
    tenantId: 'tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockOpportunity(overrides?: Partial<{
  id: string;
  name: string;
  value: number;
  status: string;
  probability: number;
}>) {
  return {
    id: 'opp-1',
    name: 'Enterprise Deal',
    value: 50000,
    status: 'open',
    probability: 50,
    tenantId: 'tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<{
  id: string;
  email: string;
  fullName: string;
  role: string;
}>) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'Test User',
    role: 'admin',
    tenantId: 'tenant-1',
    permissions: ['LEAD_READ', 'LEAD_CREATE', 'LEAD_UPDATE'],
    ...overrides,
  };
}

// ============================================
// Async Helpers
// ============================================

export function waitForLoadingToFinish() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

// ============================================
// Event Helpers
// ============================================

export function createMockEvent<T extends Record<string, unknown>>(
  overrides?: T
): React.SyntheticEvent & T {
  return {
    preventDefault: () => {},
    stopPropagation: () => {},
    ...overrides,
  } as unknown as React.SyntheticEvent & T;
}
