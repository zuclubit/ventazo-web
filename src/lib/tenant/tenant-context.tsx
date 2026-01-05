'use client';

import * as React from 'react';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  primaryColor?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
  features?: TenantFeatures;
}

export interface TenantFeatures {
  whatsapp?: boolean;
  cfdi?: boolean;
  analytics?: boolean;
  workflows?: boolean;
  customFields?: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  setTenant: (tenant: Tenant) => void;
}

const TenantContext = React.createContext<TenantContextType | undefined>(
  undefined
);

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant;
}

export function TenantProvider({ children, initialTenant }: TenantProviderProps) {
  const [tenant, setTenant] = React.useState<Tenant | null>(
    initialTenant ?? null
  );
  const [isLoading, setIsLoading] = React.useState(!initialTenant);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (initialTenant) {
      setTenant(initialTenant);
      setIsLoading(false);
      return;
    }

    // In production, this would fetch tenant info from the API
    // based on subdomain, path, or token
    const loadTenant = () => {
      try {
        setIsLoading(true);
        // Simulate tenant loading - in production, call API
        // const response = await fetch('/api/tenant');
        // const data = await response.json();

        // Default demo tenant for development
        const demoTenant: Tenant = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Demo Company',
          slug: 'demo',
          settings: {
            currency: 'MXN',
            locale: 'es-MX',
            timezone: 'America/Mexico_City',
            features: {
              whatsapp: true,
              cfdi: true,
              analytics: true,
              workflows: true,
              customFields: true,
            },
          },
        };

        setTenant(demoTenant);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to load tenant')
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadTenant();
  }, [initialTenant]);

  const value = React.useMemo(
    () => ({
      tenant,
      isLoading,
      error,
      setTenant,
    }),
    [tenant, isLoading, error]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = React.useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useTenantId() {
  const { tenant } = useTenant();
  if (!tenant) {
    throw new Error('Tenant not loaded');
  }
  return tenant.id;
}

export function useFeatureFlag(feature: keyof TenantFeatures): boolean {
  const { tenant } = useTenant();
  return tenant?.settings.features?.[feature] ?? false;
}
