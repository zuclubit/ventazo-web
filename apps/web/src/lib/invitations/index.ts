/**
 * Invitations Module
 * Handles team invitation operations
 */

import { apiClient, API_BASE_URL } from '@/lib/api/api-client';

// ============================================
// Types
// ============================================

export type UserRole = 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName?: string;
  customMessage?: string;
}

export interface InvitationDetails extends Invitation {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName: string;
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  fullName?: string;
  message?: string;
}

export interface BulkInvitationInput {
  invitations: CreateInvitationInput[];
}

export interface BulkInvitationResult {
  successful: Invitation[];
  failed: Array<{
    email: string;
    error: string;
  }>;
}

export interface AcceptInvitationResult {
  message: string;
  membership: {
    userId: string;
    tenantId: string;
    role: UserRole;
  };
}

// ============================================
// Role Configuration
// ============================================

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; description: string; level: number }
> = {
  owner: {
    label: 'Propietario',
    description: 'Acceso total a todas las funciones',
    level: 5,
  },
  admin: {
    label: 'Administrador',
    description: 'Acceso total excepto facturación',
    level: 4,
  },
  manager: {
    label: 'Gerente',
    description: 'Gestión de equipo y reportes',
    level: 3,
  },
  sales_rep: {
    label: 'Vendedor',
    description: 'Gestión de leads y clientes propios',
    level: 2,
  },
  viewer: {
    label: 'Visualizador',
    description: 'Solo lectura',
    level: 1,
  },
};

/**
 * Get available roles for invitation based on inviter's role
 */
export function getAvailableRolesForInvitation(inviterRole: UserRole): UserRole[] {
  const inviterLevel = ROLE_CONFIG[inviterRole].level;
  return (Object.keys(ROLE_CONFIG) as UserRole[]).filter(
    (role) => ROLE_CONFIG[role].level < inviterLevel
  );
}

// ============================================
// API Functions
// ============================================

/**
 * Get invitation details by token (public endpoint)
 */
export async function getInvitationByToken(
  token: string
): Promise<InvitationDetails> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/token/${token}`
  );

  if (response.status === 404) {
    throw new Error('Invitación no encontrada');
  }

  if (response.status === 410) {
    const data = await response.json();
    if (data.message?.includes('expired')) {
      throw new Error('La invitación ha expirado');
    }
    if (data.message?.includes('already been accepted')) {
      throw new Error('La invitación ya fue aceptada');
    }
    if (data.message?.includes('cancelled')) {
      throw new Error('La invitación fue cancelada');
    }
    throw new Error('La invitación ya no está disponible');
  }

  if (!response.ok) {
    throw new Error('Error al obtener la invitación');
  }

  return response.json();
}

/**
 * Get pending invitations for current tenant
 */
export async function getPendingInvitations(): Promise<Invitation[]> {
  return apiClient.get<Invitation[]>('/invitations');
}

/**
 * Get invitations sent to the current user
 */
export async function getMyPendingInvitations(): Promise<Invitation[]> {
  return apiClient.get<Invitation[]>('/invitations/my-invitations');
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  data: CreateInvitationInput
): Promise<Invitation> {
  return apiClient.post<Invitation>('/invitations', data);
}

/**
 * Create bulk invitations
 */
export async function createBulkInvitations(
  data: BulkInvitationInput
): Promise<BulkInvitationResult> {
  return apiClient.post<BulkInvitationResult>('/invitations/bulk', data);
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  return apiClient.post<AcceptInvitationResult>('/invitations/accept', {
    token,
  });
}

/**
 * Resend an invitation
 */
export async function resendInvitation(id: string): Promise<Invitation> {
  return apiClient.post<Invitation>(`/invitations/${id}/resend`);
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(id: string): Promise<void> {
  return apiClient.delete<void>(`/invitations/${id}`);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if an invitation is expired
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date() > new Date(invitation.expiresAt);
}

/**
 * Get time remaining until expiration
 */
export function getTimeUntilExpiration(invitation: Invitation): {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, expired: false };
}

/**
 * Format expiration time for display
 */
export function formatExpirationTime(invitation: Invitation): string {
  const { days, hours, minutes, expired } = getTimeUntilExpiration(invitation);

  if (expired) {
    return 'Expirada';
  }

  if (days > 0) {
    return `Expira en ${days} día${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `Expira en ${hours} hora${hours > 1 ? 's' : ''}`;
  }

  return `Expira en ${minutes} minuto${minutes > 1 ? 's' : ''}`;
}
