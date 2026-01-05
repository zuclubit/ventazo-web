'use client';

/**
 * useBrandingSettings Hook
 *
 * Provides API operations for tenant branding management:
 * - Fetch current branding
 * - Update branding colors and logo
 * - Upload logo with color extraction
 *
 * Uses the BFF (Backend-for-Frontend) proxy pattern for secure API calls.
 *
 * @module settings/branding/hooks
 */

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantStore } from '@/store/tenant.store';

// ============================================
// Types
// ============================================

export interface TenantBrandingData {
  logo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  sidebarColor?: string;
  surfaceColor?: string;
  companyDisplayName?: string;
  favicon?: string | null;
}

export interface UpdateBrandingRequest {
  logo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  sidebarColor?: string;
  surfaceColor?: string;
  companyDisplayName?: string;
  favicon?: string | null;
}

export interface UploadLogoResponse {
  success: boolean;
  data: {
    url: string;
  };
}

// ============================================
// API Functions (using BFF proxy pattern)
// ============================================

/**
 * Fetch current tenant branding via BFF proxy
 * Uses /api/proxy/tenant/branding (singular 'tenant')
 */
async function fetchBranding(): Promise<TenantBrandingData> {
  const response = await fetch('/api/proxy/tenant/branding', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired');
    }
    throw new Error('Failed to fetch branding');
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Update tenant branding via BFF proxy
 * Uses /api/proxy/tenant/branding (singular 'tenant')
 */
async function updateBranding(data: UpdateBrandingRequest): Promise<TenantBrandingData> {
  const response = await fetch('/api/proxy/tenant/branding', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update branding');
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Upload tenant logo via BFF proxy
 * Uses /api/proxy/tenant/logo
 */
async function uploadLogo(file: File): Promise<UploadLogoResponse> {
  const formData = new FormData();
  formData.append('logo', file);

  const response = await fetch('/api/proxy/tenant/logo', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired');
    }
    throw new Error('Failed to upload logo');
  }

  return response.json();
}

// ============================================
// Hook
// ============================================

export interface UseBrandingSettingsReturn {
  /** Current branding data */
  branding: TenantBrandingData | undefined;
  /** Whether branding is being fetched */
  isLoading: boolean;
  /** Error from fetching branding */
  error: Error | null;
  /** Refetch branding data */
  refetch: () => Promise<void>;
  /** Update branding */
  updateBrandingAsync: (data: UpdateBrandingRequest) => Promise<TenantBrandingData>;
  /** Whether update is in progress */
  isUpdating: boolean;
  /** Upload logo */
  uploadLogoAsync: (file: File) => Promise<UploadLogoResponse>;
  /** Whether logo upload is in progress */
  isUploadingLogo: boolean;
}

export function useBrandingSettings(): UseBrandingSettingsReturn {
  const queryClient = useQueryClient();
  const { updateSettings } = useTenantStore();

  // Query for fetching branding
  const {
    data: branding,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating branding
  const updateMutation = useMutation({
    mutationFn: updateBranding,
    onSuccess: (data) => {
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });

      // Update local store
      updateSettings({
        logo: data.logo ?? undefined,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        sidebarColor: data.sidebarColor || data.secondaryColor,
        surfaceColor: data.surfaceColor,
      });
    },
  });

  // Mutation for uploading logo
  const uploadMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
    },
  });

  return {
    branding,
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    },
    updateBrandingAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    uploadLogoAsync: uploadMutation.mutateAsync,
    isUploadingLogo: uploadMutation.isPending,
  };
}

export default useBrandingSettings;
