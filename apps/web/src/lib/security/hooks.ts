'use client';

/**
 * Security Hooks
 * React Query hooks for security operations (2FA, sessions, policies)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantValidation } from '@/lib/tenant';

import type {
  TwoFactorStatus,
  Enable2FAResponse,
  Verify2FARequest,
  Verify2FAResponse,
  Disable2FARequest,
  SessionsResponse,
  PasswordPolicy,
  UpdatePasswordPolicyRequest,
  SessionSettings,
  UpdateSessionSettingsRequest,
  SecurityStats,
  SecurityEventsResponse,
} from './types';

// ============================================
// Query Keys
// ============================================

export const securityKeys = {
  all: ['security'] as const,
  twoFactor: () => [...securityKeys.all, '2fa'] as const,
  twoFactorStatus: () => [...securityKeys.twoFactor(), 'status'] as const,
  sessions: () => [...securityKeys.all, 'sessions'] as const,
  passwordPolicy: () => [...securityKeys.all, 'password-policy'] as const,
  sessionSettings: () => [...securityKeys.all, 'session-settings'] as const,
  stats: () => [...securityKeys.all, 'stats'] as const,
  events: () => [...securityKeys.all, 'events'] as const,
};

// ============================================
// Two-Factor Authentication
// ============================================

/**
 * Hook to fetch 2FA status
 */
export function use2FAStatus() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: securityKeys.twoFactorStatus(),
    queryFn: async () => {
      const response = await apiClient.get<TwoFactorStatus>('/security/2fa/status');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to enable 2FA
 */
export function useEnable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (method: 'totp' | 'sms' | 'email' = 'totp') => {
      const response = await apiClient.post<Enable2FAResponse>('/security/2fa/enable', { method });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.twoFactorStatus() });
      void queryClient.invalidateQueries({ queryKey: securityKeys.stats() });
    },
  });
}

/**
 * Hook to verify 2FA code
 */
export function useVerify2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Verify2FARequest) => {
      const response = await apiClient.post<Verify2FAResponse>('/security/2fa/verify', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.twoFactorStatus() });
      void queryClient.invalidateQueries({ queryKey: securityKeys.stats() });
    },
  });
}

/**
 * Hook to disable 2FA
 */
export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Disable2FARequest) => {
      const response = await apiClient.post<{ success: boolean }>('/security/2fa/disable', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.twoFactorStatus() });
      void queryClient.invalidateQueries({ queryKey: securityKeys.stats() });
    },
  });
}

/**
 * Hook to regenerate backup codes
 */
export function useRegenerateBackupCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.post<{ backupCodes: string[] }>('/security/2fa/backup-codes', { code });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.twoFactorStatus() });
    },
  });
}

// ============================================
// Sessions
// ============================================

/**
 * Hook to fetch active sessions
 */
export function useSessions() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: securityKeys.sessions(),
    queryFn: async () => {
      const response = await apiClient.get<SessionsResponse>('/security/sessions');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to revoke a session
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.delete<{ success: boolean }>(`/security/sessions/${sessionId}`);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: securityKeys.stats() });
    },
  });
}

/**
 * Hook to revoke all sessions except current
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{ success: boolean; revokedCount: number }>('/security/sessions');
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: securityKeys.stats() });
    },
  });
}

// ============================================
// Password Policy
// ============================================

/**
 * Hook to fetch password policy
 */
export function usePasswordPolicy() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: securityKeys.passwordPolicy(),
    queryFn: async () => {
      const response = await apiClient.get<PasswordPolicy>('/security/password-policy');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to update password policy
 */
export function useUpdatePasswordPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePasswordPolicyRequest) => {
      const response = await apiClient.put<PasswordPolicy>('/security/password-policy', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.passwordPolicy() });
    },
  });
}

// ============================================
// Session Settings
// ============================================

/**
 * Hook to fetch session settings
 */
export function useSessionSettings() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: securityKeys.sessionSettings(),
    queryFn: async () => {
      const response = await apiClient.get<SessionSettings>('/security/session-settings');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to update session settings
 */
export function useUpdateSessionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSessionSettingsRequest) => {
      const response = await apiClient.put<SessionSettings>('/security/session-settings', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessionSettings() });
    },
  });
}

// ============================================
// Security Stats & Events
// ============================================

/**
 * Hook to fetch security stats
 */
export function useSecurityStats() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: securityKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get<SecurityStats>('/security/stats');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to fetch security events
 */
export function useSecurityEvents(limit = 20) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: [...securityKeys.events(), { limit }],
    queryFn: async () => {
      const response = await apiClient.get<SecurityEventsResponse>(`/security/events?limit=${limit}`);
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for security settings page
 */
export function useSecurityManagement() {
  const twoFactor = use2FAStatus();
  const sessions = useSessions();
  const passwordPolicy = usePasswordPolicy();
  const sessionSettings = useSessionSettings();
  const stats = useSecurityStats();

  return {
    // 2FA
    twoFactorStatus: twoFactor.data,
    isTwoFactorLoading: twoFactor.isLoading,

    // Sessions
    sessions: sessions.data?.sessions || [],
    sessionsTotal: sessions.data?.total || 0,
    isSessionsLoading: sessions.isLoading,

    // Password Policy
    passwordPolicy: passwordPolicy.data,
    isPasswordPolicyLoading: passwordPolicy.isLoading,

    // Session Settings
    sessionSettings: sessionSettings.data,
    isSessionSettingsLoading: sessionSettings.isLoading,

    // Stats
    stats: stats.data,
    isStatsLoading: stats.isLoading,

    // Combined loading
    isLoading:
      twoFactor.isLoading ||
      sessions.isLoading ||
      passwordPolicy.isLoading ||
      sessionSettings.isLoading ||
      stats.isLoading,

    // Refetch functions
    refetchAll: () => {
      void twoFactor.refetch();
      void sessions.refetch();
      void passwordPolicy.refetch();
      void sessionSettings.refetch();
      void stats.refetch();
    },
  };
}
