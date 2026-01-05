'use client';

/**
 * useTeamSettings Hook
 *
 * Provides API operations for team management:
 * - Fetch team members with filters
 * - Fetch pending invitations
 * - CRUD operations for members and invitations
 *
 * Uses the BFF (Backend-for-Frontend) proxy pattern for secure API calls.
 *
 * @module settings/team/hooks
 */

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// ============================================
// Types
// ============================================

export type UserRole = 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer';
export type MemberStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: MemberStatus;
  isActive: boolean;
  joinedAt?: string;
  lastActiveAt?: string;
  invitedBy?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  inviterName?: string;
  customMessage?: string;
  expiresAt: string;
  createdAt: string;
}

export interface TeamStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  byRole: Record<UserRole, number>;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
  message?: string;
}

export interface UpdateMemberRequest {
  role?: UserRole;
  isActive?: boolean;
}

// ============================================
// Constants
// ============================================

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gerente',
  sales_rep: 'Vendedor',
  viewer: 'Observador',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Control total del tenant y facturación',
  admin: 'Gestión completa del equipo y configuración',
  manager: 'Supervisa equipos y aprueba operaciones',
  sales_rep: 'Gestiona leads, oportunidades y clientes',
  viewer: 'Solo lectura de datos del CRM',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sales_rep: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
};

export const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Error message mappings for better UX
export const ERROR_MESSAGES: Record<string, string> = {
  'Session expired': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  'Failed to fetch team members': 'No se pudieron cargar los miembros del equipo.',
  'Failed to send invitation': 'No se pudo enviar la invitación.',
  'Failed to resend invitation': 'No se pudo reenviar la invitación.',
  'Failed to cancel invitation': 'No se pudo cancelar la invitación.',
  'Failed to update member': 'No se pudo actualizar el miembro.',
  'Failed to remove member': 'No se pudo eliminar el miembro.',
  'Email already has pending invitation': 'Ya existe una invitación pendiente para este email.',
  'Email already belongs to a team member': 'Este email ya pertenece a un miembro del equipo.',
  'Cannot modify owner': 'No puedes modificar al propietario del equipo.',
  'Insufficient permissions': 'No tienes permisos suficientes para esta acción.',
};

// ============================================
// API Functions (using BFF proxy pattern)
// ============================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return ERROR_MESSAGES[error.message] || error.message;
  }
  return 'Ha ocurrido un error inesperado.';
}

// Backend response type - has nested user object
interface BackendMember {
  id: string;
  userId: string;
  tenantId: string;
  role: UserRole;
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  isActive: boolean;
  status?: MemberStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

// Map backend response to frontend TeamMember type
function mapMember(member: BackendMember): TeamMember {
  return {
    id: member.id,
    userId: member.userId,
    email: member.user?.email || '',
    fullName: member.user?.fullName || '',
    avatarUrl: member.user?.avatarUrl,
    role: member.role,
    status: member.status || (member.isActive ? 'active' : 'suspended'),
    isActive: member.isActive,
    joinedAt: member.acceptedAt,
    invitedBy: member.invitedBy,
  };
}

async function fetchTeamMembers(): Promise<{ data: TeamMember[]; meta: { total: number } }> {
  const response = await fetch('/api/proxy/members', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    throw new Error('Failed to fetch team members');
  }

  const result = await response.json();

  // Normalize response - backend may return array directly or { data, meta }
  let members: BackendMember[] = [];
  if (Array.isArray(result)) {
    members = result;
  } else if (result.data) {
    members = result.data;
  }

  // Map backend format to frontend format
  const mappedMembers = members.map(mapMember);

  return { data: mappedMembers, meta: { total: mappedMembers.length } };
}

async function fetchMemberCounts(): Promise<Record<string, number>> {
  const response = await fetch('/api/proxy/members/counts', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    throw new Error('Failed to fetch member counts');
  }

  return response.json();
}

async function fetchInvitations(): Promise<Invitation[]> {
  const response = await fetch('/api/proxy/invitations', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    throw new Error('Failed to fetch invitations');
  }

  const result = await response.json();
  return Array.isArray(result) ? result : result.data || [];
}

async function inviteMember(data: InviteMemberRequest): Promise<Invitation> {
  const response = await fetch('/api/proxy/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    if (response.status === 409) throw new Error('Email already has pending invitation');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to send invitation');
  }

  return response.json();
}

async function resendInvitation(invitationId: string): Promise<Invitation> {
  const response = await fetch(`/api/proxy/invitations/${invitationId}/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}), // Backend expects empty object for validation
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    if (response.status === 404) throw new Error('Invitation not found');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to resend invitation');
  }

  return response.json();
}

async function cancelInvitation(invitationId: string): Promise<void> {
  const response = await fetch(`/api/proxy/invitations/${invitationId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    if (response.status === 404) throw new Error('Invitation not found');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to cancel invitation');
  }
}

async function updateMember(memberId: string, data: UpdateMemberRequest): Promise<TeamMember> {
  const response = await fetch(`/api/proxy/members/${memberId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    if (response.status === 403) throw new Error('Insufficient permissions');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update member');
  }

  return response.json();
}

async function removeMember(memberId: string): Promise<void> {
  const response = await fetch(`/api/proxy/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired');
    if (response.status === 403) throw new Error('Insufficient permissions');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to remove member');
  }
}

// ============================================
// Query Keys
// ============================================

export const teamQueryKeys = {
  all: ['team'] as const,
  members: () => [...teamQueryKeys.all, 'members'] as const,
  memberCounts: () => [...teamQueryKeys.all, 'counts'] as const,
  invitations: () => [...teamQueryKeys.all, 'invitations'] as const,
};

// ============================================
// Hook
// ============================================

export interface UseTeamSettingsReturn {
  // Members
  members: TeamMember[];
  totalMembers: number;
  isMembersLoading: boolean;
  membersError: Error | null;
  refetchMembers: () => Promise<void>;

  // Member Counts
  memberCounts: Record<string, number> | undefined;
  isCountsLoading: boolean;

  // Invitations
  invitations: Invitation[];
  isInvitationsLoading: boolean;
  invitationsError: Error | null;
  refetchInvitations: () => Promise<void>;

  // Mutations
  inviteMemberAsync: (data: InviteMemberRequest) => Promise<Invitation>;
  isInviting: boolean;
  inviteError: Error | null;

  resendInvitationAsync: (invitationId: string) => Promise<Invitation>;
  isResending: boolean;
  resendingId: string | null;

  cancelInvitationAsync: (invitationId: string) => Promise<void>;
  isCancelling: boolean;
  cancellingId: string | null;

  updateMemberAsync: (memberId: string, data: UpdateMemberRequest) => Promise<TeamMember>;
  isUpdating: boolean;
  updatingMemberId: string | null;

  removeMemberAsync: (memberId: string) => Promise<void>;
  isRemoving: boolean;
  removingMemberId: string | null;

  // Computed Stats
  stats: TeamStats;

  // Validation helpers
  isEmailPendingInvitation: (email: string) => boolean;
  isEmailAlreadyMember: (email: string) => boolean;
}

export function useTeamSettings(): UseTeamSettingsReturn {
  const queryClient = useQueryClient();

  // Track which specific item is being processed
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

  // Query: Team Members
  const membersQuery = useQuery({
    queryKey: teamQueryKeys.members(),
    queryFn: fetchTeamMembers,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Query: Member Counts
  const countsQuery = useQuery({
    queryKey: teamQueryKeys.memberCounts(),
    queryFn: fetchMemberCounts,
    staleTime: 2 * 60 * 1000,
  });

  // Query: Invitations
  const invitationsQuery = useQuery({
    queryKey: teamQueryKeys.invitations(),
    queryFn: fetchInvitations,
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation: Invite Member
  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: (newInvitation) => {
      toast({
        title: '✅ Invitación enviada',
        description: `Se ha enviado un email de invitación a ${newInvitation.email}. La invitación expira en 7 días.`,
      });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al enviar invitación',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // Mutation: Resend Invitation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      setResendingId(invitationId);
      return resendInvitation(invitationId);
    },
    onSuccess: (updatedInvitation) => {
      toast({
        title: '✅ Invitación reenviada',
        description: `Se ha enviado un nuevo enlace a ${updatedInvitation.email}. La nueva fecha de expiración es en 7 días.`,
      });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al reenviar invitación',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setResendingId(null);
    },
  });

  // Mutation: Cancel Invitation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      setCancellingId(invitationId);
      return cancelInvitation(invitationId);
    },
    onMutate: async (invitationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamQueryKeys.invitations() });

      // Snapshot the previous value
      const previousInvitations = queryClient.getQueryData<Invitation[]>(teamQueryKeys.invitations());

      // Get the cancelled invitation for undo
      const cancelledInvitation = previousInvitations?.find((inv) => inv.id === invitationId);

      // Optimistically remove the invitation
      queryClient.setQueryData<Invitation[]>(teamQueryKeys.invitations(), (old) =>
        old?.filter((inv) => inv.id !== invitationId) || []
      );

      return { previousInvitations, cancelledInvitation };
    },
    onSuccess: (_data, _invitationId, context) => {
      const email = context?.cancelledInvitation?.email;
      toast({
        title: '✅ Invitación cancelada',
        description: email
          ? `La invitación a ${email} ha sido cancelada.`
          : 'La invitación ha sido cancelada exitosamente.',
      });
    },
    onError: (error: Error, _invitationId, context) => {
      // Rollback on error
      if (context?.previousInvitations) {
        queryClient.setQueryData(teamQueryKeys.invitations(), context.previousInvitations);
      }
      toast({
        title: 'Error al cancelar invitación',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setCancellingId(null);
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations() });
    },
  });

  // Mutation: Update Member
  const updateMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: UpdateMemberRequest }) => {
      setUpdatingMemberId(memberId);
      return updateMember(memberId, data);
    },
    onSuccess: (updatedMember, variables) => {
      let title = '✅ Miembro actualizado';
      let description = 'Los cambios se han guardado correctamente.';

      if (variables.data.role) {
        title = '✅ Rol actualizado';
        description = `${updatedMember.fullName || updatedMember.email} ahora es ${ROLE_LABELS[variables.data.role]}.`;
      } else if (variables.data.isActive === false) {
        title = '⏸️ Miembro suspendido';
        description = `${updatedMember.fullName || updatedMember.email} ha sido suspendido y no podrá acceder al CRM.`;
      } else if (variables.data.isActive === true) {
        title = '✅ Miembro reactivado';
        description = `${updatedMember.fullName || updatedMember.email} ha sido reactivado y puede acceder nuevamente.`;
      }

      toast({ title, description });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.members() });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.memberCounts() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar miembro',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUpdatingMemberId(null);
    },
  });

  // Mutation: Remove Member
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      setRemovingMemberId(memberId);
      return removeMember(memberId);
    },
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: teamQueryKeys.members() });
      const previousMembers = queryClient.getQueryData<{ data: TeamMember[]; meta: { total: number } }>(
        teamQueryKeys.members()
      );

      // Get removed member for message
      const removedMember = previousMembers?.data.find((m) => m.id === memberId);

      // Optimistically remove the member
      queryClient.setQueryData<{ data: TeamMember[]; meta: { total: number } }>(
        teamQueryKeys.members(),
        (old) => old ? {
          data: old.data.filter((m) => m.id !== memberId),
          meta: { total: old.meta.total - 1 },
        } : { data: [], meta: { total: 0 } }
      );

      return { previousMembers, removedMember };
    },
    onSuccess: (_data, _memberId, context) => {
      const name = context?.removedMember?.fullName || context?.removedMember?.email;
      toast({
        title: '✅ Miembro eliminado',
        description: name
          ? `${name} ha sido removido del equipo.`
          : 'El miembro ha sido removido del equipo.',
      });
    },
    onError: (error: Error, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(teamQueryKeys.members(), context.previousMembers);
      }
      toast({
        title: 'Error al eliminar miembro',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setRemovingMemberId(null);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.members() });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.memberCounts() });
    },
  });

  // Compute stats from members
  const stats = React.useMemo<TeamStats>(() => {
    const members = membersQuery.data?.data || [];
    const byRole: Record<UserRole, number> = {
      owner: 0,
      admin: 0,
      manager: 0,
      sales_rep: 0,
      viewer: 0,
    };

    let active = 0;
    let pending = 0;
    let suspended = 0;

    members.forEach((m) => {
      if (m.role in byRole) {
        byRole[m.role as UserRole]++;
      }
      if (m.status === 'active') active++;
      else if (m.status === 'pending') pending++;
      else if (m.status === 'suspended') suspended++;
    });

    return {
      total: members.length,
      active,
      pending,
      suspended,
      byRole,
    };
  }, [membersQuery.data]);

  // Validation helpers
  const isEmailPendingInvitation = React.useCallback((email: string): boolean => {
    if (!email) return false;
    const normalizedEmail = email.toLowerCase().trim();
    return (invitationsQuery.data || []).some(
      (inv) => inv.email?.toLowerCase() === normalizedEmail && inv.status === 'pending'
    );
  }, [invitationsQuery.data]);

  const isEmailAlreadyMember = React.useCallback((email: string): boolean => {
    if (!email) return false;
    const normalizedEmail = email.toLowerCase().trim();
    return (membersQuery.data?.data || []).some(
      (member) => member.email?.toLowerCase() === normalizedEmail
    );
  }, [membersQuery.data]);

  return {
    // Members
    members: membersQuery.data?.data || [],
    totalMembers: membersQuery.data?.meta?.total || 0,
    isMembersLoading: membersQuery.isLoading,
    membersError: membersQuery.error as Error | null,
    refetchMembers: async () => {
      await membersQuery.refetch();
    },

    // Member Counts
    memberCounts: countsQuery.data,
    isCountsLoading: countsQuery.isLoading,

    // Invitations
    invitations: invitationsQuery.data || [],
    isInvitationsLoading: invitationsQuery.isLoading,
    invitationsError: invitationsQuery.error as Error | null,
    refetchInvitations: async () => {
      await invitationsQuery.refetch();
    },

    // Mutations
    inviteMemberAsync: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error as Error | null,

    resendInvitationAsync: resendMutation.mutateAsync,
    isResending: resendMutation.isPending,
    resendingId,

    cancelInvitationAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancellingId,

    updateMemberAsync: async (memberId: string, data: UpdateMemberRequest) => {
      return updateMutation.mutateAsync({ memberId, data });
    },
    isUpdating: updateMutation.isPending,
    updatingMemberId,

    removeMemberAsync: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    removingMemberId,

    // Stats
    stats,

    // Validation helpers
    isEmailPendingInvitation,
    isEmailAlreadyMember,
  };
}

export default useTeamSettings;
