'use client';

import * as React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { AuthProvider } from '@/components/auth';
import { DynamicBrandingSync } from '@/components/branding';
import { TooltipProvider } from '@/components/ui/tooltip';
import { registerTenantGetter } from '@/lib/api';
import { I18nProvider } from '@/lib/i18n/context';
import { TenantProvider } from '@/lib/tenant/tenant-context';
import { TenantThemeProvider } from '@/lib/theme';
import { useTenantStore } from '@/store';

// ============================================
// Query Client Configuration
// ============================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status === 401 || status === 403) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// ============================================
// Tenant API Initializer
// ============================================

/**
 * Component that registers the tenant getter for API requests.
 * This ensures all API calls include the x-tenant-id header.
 */
function TenantApiInitializer({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Register the tenant getter with the API client
    registerTenantGetter(() => {
      const state = useTenantStore.getState();
      return state.currentTenant?.id ?? null;
    });
  }, []);

  return <>{children}</>;
}

// ============================================
// Providers Component
// ============================================

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TenantProvider>
            <TenantApiInitializer>
              <TenantThemeProvider>
                <NextThemesProvider
                  disableTransitionOnChange
                  enableSystem
                  attribute="class"
                  defaultTheme="system"
                >
                  <DynamicBrandingSync />
                  <TooltipProvider delayDuration={0}>
                    {children}
                  </TooltipProvider>
                </NextThemesProvider>
              </TenantThemeProvider>
            </TenantApiInitializer>
          </TenantProvider>
        </AuthProvider>
      </I18nProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
