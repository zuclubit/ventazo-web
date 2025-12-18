'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Settings,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiMutation } from '@/lib/api';
import { useUserTenants, type UserTenantMembership } from '@/lib/users/hooks';
import { cn } from '@/lib/utils';
import { useAuthStore, useCurrentTenantId, useTenants as useAuthTenants } from '@/store/auth.store';

// ============================================
// Types
// ============================================

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  role: string;
}

interface TenantSwitcherProps {
  className?: string;
}

// ============================================
// Hook: useTenants (Using Auth Store - Secure)
// ============================================

function useTenants() {
  const [isSwitching, setIsSwitching] = React.useState(false);

  // Use auth store for secure tenant management (no localStorage for tenant ID)
  const currentTenantId = useCurrentTenantId();
  const authTenants = useAuthTenants();
  const switchTenantAction = useAuthStore((state) => state.switchTenant);

  // Also fetch fresh data from API for logos and additional info
  const { data: memberships, isLoading, error } = useUserTenants();

  // Transform memberships to tenant format, merging API data with auth store
  const tenants: Tenant[] = React.useMemo(() => {
    // Prefer API data if available for fresh info
    if (memberships && memberships.length > 0) {
      return memberships.map((m: UserTenantMembership) => ({
        id: m.tenantId,
        name: m.tenantName,
        slug: m.tenantSlug || m.tenantName.toLowerCase().replace(/\s+/g, '-'),
        logo_url: m.logoUrl,
        role: m.role,
      }));
    }
    // Fallback to auth store tenants
    return authTenants.map((t) => ({
      id: t.tenantId,
      name: t.tenant?.name || '',
      slug: t.tenant?.slug || '',
      logo_url: null,
      role: t.role,
    }));
  }, [memberships, authTenants]);

  // Get current tenant from the secure store
  const currentTenant: Tenant | null = React.useMemo(() => {
    if (!currentTenantId || tenants.length === 0) return null;
    return tenants.find((t) => t.id === currentTenantId) || tenants[0] || null;
  }, [currentTenantId, tenants]);

  // Mutation for logging tenant switch (audit trail)
  const logTenantSwitch = useApiMutation<void, { tenantId: string; tenantName: string }>(
    async ({ tenantId, tenantName }, client) => {
      return client.post('/api/v1/audit/log', {
        action: 'tenant_switched',
        entityType: 'tenant',
        entityId: tenantId,
        newValues: {
          tenantId,
          tenantName,
          switchedAt: new Date().toISOString(),
        },
      }, { tenantId });
    }
  );

  // Secure tenant switch using auth store (validates access server-side)
  const switchTenant = React.useCallback(async (tenant: Tenant) => {
    if (isSwitching) return;

    setIsSwitching(true);
    try {
      // Use auth store's secure switch (validates access server-side)
      const success = await switchTenantAction(tenant.id);

      if (success) {
        // Log tenant switch for audit (non-blocking)
        logTenantSwitch.mutate({ tenantId: tenant.id, tenantName: tenant.name });

        // Reload page to refresh data for new tenant
        window.location.reload();
      }
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, switchTenantAction, logTenantSwitch]);

  return {
    tenants,
    currentTenant,
    isLoading: isLoading || isSwitching,
    error,
    switchTenant,
    isSwitching,
  };
}

// ============================================
// Component: TenantSwitcher
// ============================================

export function TenantSwitcher({ className }: TenantSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { tenants, currentTenant, isLoading, switchTenant, isSwitching } = useTenants();

  const handleSelectTenant = (tenant: Tenant) => {
    if (tenant.id !== currentTenant?.id && !isSwitching) {
      void switchTenant(tenant);
      setOpen(false);
    }
  };

  const handleCreateNew = () => {
    setOpen(false);
    router.push('/onboarding/create-business');
  };

  const handleSettings = () => {
    setOpen(false);
    router.push('/settings/organization');
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="hidden space-y-1 sm:block">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <Button
        className={className}
        size="sm"
        variant="outline"
        onClick={handleCreateNew}
      >
        <Plus className="mr-2 h-4 w-4" />
        Crear negocio
      </Button>
    );
  }

  return (
    <Popover open={open && !isSwitching} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label="Seleccionar negocio"
          className={cn(
            'flex h-auto items-center gap-2 px-2 py-1.5',
            className
          )}
          disabled={isSwitching}
          role="combobox"
          variant="ghost"
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">
                  Cambiando...
                </p>
                <p className="text-xs text-muted-foreground">
                  Por favor espera
                </p>
              </div>
            </>
          ) : (
            <>
              <Avatar className="h-8 w-8 rounded-lg">
                {currentTenant.logo_url ? (
                  <AvatarImage
                    alt={currentTenant.name}
                    src={currentTenant.logo_url}
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {currentTenant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">
                  {currentTenant.name}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {currentTenant.role.replace('_', ' ')}
                </p>
              </div>

              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar negocio..." />
          <CommandList>
            <CommandEmpty>No se encontraron negocios.</CommandEmpty>

            <CommandGroup heading="Tus negocios">
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  className="flex items-center gap-2"
                  value={tenant.name}
                  onSelect={() => handleSelectTenant(tenant)}
                >
                  <Avatar className="h-6 w-6 rounded-md">
                    {tenant.logo_url ? (
                      <AvatarImage alt={tenant.name} src={tenant.logo_url} />
                    ) : null}
                    <AvatarFallback className="rounded-md bg-muted text-xs">
                      {tenant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="text-sm font-medium">{tenant.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {tenant.role.replace('_', ' ')}
                    </p>
                  </div>

                  {currentTenant?.id === tenant.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup>
              <CommandItem className="gap-2" onSelect={handleSettings}>
                <Settings className="h-4 w-4" />
                Configuración del negocio
              </CommandItem>

              <CommandItem className="gap-2" onSelect={handleCreateNew}>
                <Plus className="h-4 w-4" />
                Crear nuevo negocio
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Export Hook for External Use
// ============================================

export { useTenants };
export type { Tenant };
