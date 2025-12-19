// ============================================
// User Management Hooks - FASE 5.1
// React Query hooks for user operations
// ============================================

'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  useApiQuery,
  useApiMutation,
  useImageUpload,
} from '@/lib/api';
import { useAuthStore } from '@/store';

import type {
  UserProfile,
  UpdateProfileData,
  TeamMember,
  TeamMembersResponse,
  InviteMemberData,
  UpdateMemberRoleData,
  Invitation,
  InvitationsResponse,
  AuditLogsResponse,
  AuditLogFilters,
} from './types';

// ============================================
// Query Keys
// ============================================

export const userQueryKeys = {
  all: ['users'] as const,
  profile: () => [...userQueryKeys.all, 'profile'] as const,
  me: () => [...userQueryKeys.all, 'me'] as const,
  tenants: () => [...userQueryKeys.all, 'tenants'] as const,
  teamMembers: () => [...userQueryKeys.all, 'team'] as const,
  teamMembersList: (filters?: Record<string, unknown>) =>
    [...userQueryKeys.teamMembers(), 'list', filters] as const,
  teamMember: (id: string) => [...userQueryKeys.teamMembers(), id] as const,
  invitations: () => [...userQueryKeys.all, 'invitations'] as const,
  auditLogs: () => [...userQueryKeys.all, 'audit'] as const,
  auditLogsList: (filters?: AuditLogFilters) =>
    [...userQueryKeys.auditLogs(), 'list', filters] as const,
  userAuditLogs: (userId: string) =>
    [...userQueryKeys.auditLogs(), 'user', userId] as const,
};

// ============================================
// Profile Hooks
// ============================================

/**
 * Get current user's profile
 */
export function useCurrentUserProfile() {
  return useApiQuery<UserProfile>(
    userQueryKeys.me(),
    '/users/me',
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// ============================================
// Tenant Hooks
// ============================================

export interface UserTenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  logoUrl?: string | null;
  role: string;
  isActive: boolean;
}

/**
 * Get user's tenant memberships
 */
export function useUserTenants() {
  return useApiQuery<UserTenantMembership[]>(
    userQueryKeys.tenants(),
    '/auth/tenants',
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // This query doesn't require a tenant ID since it returns all tenants for the user
      skipTenantCheck: true,
      config: {
        skipTenant: true,
      },
    }
  );
}

/**
 * Update current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUserInStore = useAuthStore((state) => state.user);

  return useApiMutation<UserProfile, UpdateProfileData>(
    async (data, client) => {
      return client.patch<UserProfile>('/users/me', data);
    },
    {
      onSuccess: (updatedProfile) => {
        // Update cache
        queryClient.setQueryData(userQueryKeys.me(), updatedProfile);

        // Invalidate related queries
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });

        // Update auth store user if needed
        if (updateUserInStore) {
          useAuthStore.setState((state) => ({
            user: state.user ? {
              ...state.user,
              fullName: updatedProfile.fullName,
              avatarUrl: updatedProfile.avatarUrl,
              phone: updatedProfile.phone,
            } : null,
          }));
        }
      },
    }
  );
}

/**
 * Upload avatar using standardized file upload
 * @deprecated Use useImageUpload hook directly for more control
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useApiMutation<{ avatarUrl: string }, FormData>(
    async (formData, _client) => {
      // For file upload, we need custom handling
      const response = await fetch('/users/me/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      return response.json() as Promise<{ avatarUrl: string }>;
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.me() });
      },
    }
  );
}

/**
 * Upload avatar using standardized image upload hook
 * Recommended over useUploadAvatar for better progress tracking
 */
export function useAvatarUpload() {
  return useImageUpload<{ avatarUrl: string }>({
    endpoint: '/users/me/avatar',
    fieldName: 'avatar',
    invalidateKeys: [userQueryKeys.me()],
    successMessage: 'Avatar actualizado exitosamente',
    errorMessage: 'Error al actualizar el avatar',
    maxSize: 2 * 1024 * 1024, // 2MB for avatars
  });
}

// ============================================
// Team Members Hooks
// ============================================

interface TeamMembersFilters {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'pending' | 'suspended';
  role?: string;
  search?: string;
}

/**
 * Get team members list
 */
export function useTeamMembers(filters?: TeamMembersFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.page) queryParams.set('page', String(filters.page));
  if (filters?.pageSize) queryParams.set('pageSize', String(filters.pageSize));
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.role) queryParams.set('role', filters.role);
  if (filters?.search) queryParams.set('search', filters.search);

  const endpoint = `/tenant/members${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<TeamMembersResponse>(
    userQueryKeys.teamMembersList(filters as Record<string, unknown>),
    endpoint,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

/**
 * Get single team member
 */
export function useTeamMember(memberId: string) {
  return useApiQuery<TeamMember>(
    userQueryKeys.teamMember(memberId),
    `/tenant/members/${memberId}`,
    {
      enabled: !!memberId,
    }
  );
}

/**
 * Update member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useApiMutation<TeamMember, UpdateMemberRoleData>(
    async ({ memberId, role }, client) => {
      return client.patch<TeamMember>(`/tenant/members/${memberId}/role`, { role });
    },
    {
      onSuccess: (updatedMember, variables) => {
        // Update specific member in cache
        queryClient.setQueryData(
          userQueryKeys.teamMember(variables.memberId),
          updatedMember
        );

        // Invalidate list
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });
      },
    }
  );
}

/**
 * Remove member from tenant
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>(
    async (memberId, client) => {
      return client.delete(`/tenant/members/${memberId}`);
    },
    {
      onSuccess: (_, memberId) => {
        // Remove from cache
        queryClient.removeQueries({ queryKey: userQueryKeys.teamMember(memberId) });

        // Invalidate list
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });
      },
    }
  );
}

/**
 * Suspend member
 */
export function useSuspendMember() {
  const queryClient = useQueryClient();

  return useApiMutation<TeamMember, string>(
    async (memberId, client) => {
      return client.patch<TeamMember>(`/tenant/members/${memberId}/suspend`);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });
      },
    }
  );
}

/**
 * Reactivate member
 */
export function useReactivateMember() {
  const queryClient = useQueryClient();

  return useApiMutation<TeamMember, string>(
    async (memberId, client) => {
      return client.patch<TeamMember>(`/tenant/members/${memberId}/reactivate`);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });
      },
    }
  );
}

// ============================================
// Invitation Hooks
// ============================================

/**
 * Get pending invitations
 */
export function useInvitations() {
  return useApiQuery<InvitationsResponse>(
    userQueryKeys.invitations(),
    '/tenant/invitations',
    {
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Send invitation to new member
 */
export function useInviteMember() {
  const queryClient = useQueryClient();

  return useApiMutation<Invitation, InviteMemberData>(
    async (data, client) => {
      return client.post<Invitation>('/tenant/members/invite', data);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.invitations() });
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.teamMembers() });
      },
    }
  );
}

/**
 * Resend invitation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useApiMutation<Invitation, string>(
    async (invitationId, client) => {
      return client.post<Invitation>(`/tenant/invitations/${invitationId}/resend`);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.invitations() });
      },
    }
  );
}

/**
 * Cancel invitation
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>(
    async (invitationId, client) => {
      return client.delete(`/tenant/invitations/${invitationId}`);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: userQueryKeys.invitations() });
      },
    }
  );
}

// ============================================
// Audit Log Hooks
// ============================================

/**
 * Get audit logs with filters
 */
export function useAuditLogs(filters?: AuditLogFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.userId) queryParams.set('userId', filters.userId);
  if (filters?.action) queryParams.set('action', filters.action);
  if (filters?.entityType) queryParams.set('entityType', filters.entityType);
  if (filters?.entityId) queryParams.set('entityId', filters.entityId);
  if (filters?.startDate) queryParams.set('startDate', filters.startDate);
  if (filters?.endDate) queryParams.set('endDate', filters.endDate);
  if (filters?.page) queryParams.set('page', String(filters.page));
  if (filters?.pageSize) queryParams.set('pageSize', String(filters.pageSize));

  const endpoint = `/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<AuditLogsResponse>(
    userQueryKeys.auditLogsList(filters),
    endpoint,
    {
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

/**
 * Get audit logs for current user
 */
export function useMyAuditLogs(filters?: Omit<AuditLogFilters, 'userId'>) {
  const user = useAuthStore((state) => state.user);

  return useAuditLogs({
    ...filters,
    userId: user?.id,
  });
}

/**
 * Get audit logs for a specific user
 */
export function useUserAuditLogs(userId: string, filters?: Omit<AuditLogFilters, 'userId'>) {
  return useAuditLogs({
    ...filters,
    userId,
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Hook that provides all user management functionality
 */
export function useUserManagement() {
  const profile = useCurrentUserProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  return {
    // Profile data
    profile: profile.data,
    isProfileLoading: profile.isLoading,
    profileError: profile.error,

    // Profile mutations
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    isUpdatingProfile: updateProfile.isPending,
    updateProfileError: updateProfile.error,

    // Avatar
    uploadAvatar: uploadAvatar.mutate,
    uploadAvatarAsync: uploadAvatar.mutateAsync,
    isUploadingAvatar: uploadAvatar.isPending,

    // Refresh
    refetchProfile: profile.refetch,
  };
}

/**
 * Hook that provides team management functionality
 */
export function useTeamManagement(filters?: TeamMembersFilters) {
  const members = useTeamMembers(filters);
  const invitations = useInvitations();
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const deleteMember = useDeleteMember();
  const suspendMember = useSuspendMember();
  const reactivateMember = useReactivateMember();
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  return {
    // Data
    members: members.data?.data ?? [],
    membersMeta: members.data?.meta,
    invitations: invitations.data?.data ?? [],
    invitationsMeta: invitations.data?.meta,

    // Loading states
    isMembersLoading: members.isLoading,
    isInvitationsLoading: invitations.isLoading,

    // Errors
    membersError: members.error,
    invitationsError: invitations.error,

    // Mutations
    inviteMember: inviteMember.mutate,
    inviteMemberAsync: inviteMember.mutateAsync,
    isInviting: inviteMember.isPending,
    inviteError: inviteMember.error,

    updateMemberRole: updateRole.mutate,
    updateMemberRoleAsync: updateRole.mutateAsync,
    isUpdatingRole: updateRole.isPending,

    deleteMember: deleteMember.mutate,
    deleteMemberAsync: deleteMember.mutateAsync,
    isDeleting: deleteMember.isPending,

    suspendMember: suspendMember.mutate,
    isSupending: suspendMember.isPending,

    reactivateMember: reactivateMember.mutate,
    isReactivating: reactivateMember.isPending,

    resendInvitation: resendInvitation.mutate,
    isResending: resendInvitation.isPending,

    cancelInvitation: cancelInvitation.mutate,
    isCancelling: cancelInvitation.isPending,

    // Refresh
    refetchMembers: members.refetch,
    refetchInvitations: invitations.refetch,
  };
}
