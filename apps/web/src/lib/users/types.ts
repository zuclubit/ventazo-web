// ============================================
// User Management Types - FASE 5.1
// ============================================

import type { UserRole, Permission } from '@/lib/auth';

// ============================================
// User Profile Types
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

// ============================================
// Team Member Types
// ============================================

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  status: 'active' | 'pending' | 'suspended';
  invitedAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMemberData {
  email: string;
  role: UserRole;
  message?: string;
}

export interface UpdateMemberRoleData {
  memberId: string;
  role: UserRole;
}

// ============================================
// Invitation Types
// ============================================

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  inviterName?: string;
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

// ============================================
// Audit Log Types
// ============================================

export type AuditEntityType =
  | 'user'
  | 'profile'
  | 'member'
  | 'invitation'
  | 'tenant'
  | 'lead'
  | 'opportunity'
  | 'customer'
  | 'settings';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description?: string;
  details?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditAction =
  // Auth actions
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'password_change'
  | 'password_reset'
  // Profile actions
  | 'profile_updated'
  | 'avatar_updated'
  // Team actions
  | 'member_invited'
  | 'member_joined'
  | 'member_removed'
  | 'member_role_changed'
  | 'member_suspended'
  | 'member_reactivated'
  // Tenant actions
  | 'tenant_created'
  | 'tenant_updated'
  | 'tenant_settings_changed'
  | 'tenant_switched'
  // Lead actions (for future)
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'lead_qualified'
  | 'lead_converted'
  // Generic
  | 'other';

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// API Response Types
// ============================================

export interface TeamMembersResponse {
  data: TeamMember[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface InvitationsResponse {
  data: Invitation[];
  meta: {
    total: number;
    pending: number;
  };
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================
// Role Display Helpers
// ============================================

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gerente',
  sales_rep: 'Vendedor',
  viewer: 'Observador',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Control total del sistema, incluyendo facturación y configuración',
  admin: 'Gestión de usuarios y configuración del sistema',
  manager: 'Supervisión de equipo y acceso a todos los leads',
  sales_rep: 'Gestión de leads propios y actividades de venta',
  viewer: 'Solo lectura de información',
};

// Role colors - Using semantic colors with dark mode support
export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-500 dark:bg-purple-600',
  admin: 'bg-blue-500 dark:bg-blue-600',
  manager: 'bg-green-500 dark:bg-green-600',
  sales_rep: 'bg-amber-500 dark:bg-amber-600',
  viewer: 'bg-gray-500 dark:bg-gray-600',
};

export const STATUS_LABELS: Record<TeamMember['status'], string> = {
  active: 'Activo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
};

// Team member status colors with dark mode support
export const STATUS_COLORS: Record<TeamMember['status'], string> = {
  active: 'bg-green-500 dark:bg-green-600',
  pending: 'bg-amber-500 dark:bg-amber-600',
  suspended: 'bg-red-500 dark:bg-red-600',
};

// ============================================
// Audit Action Labels
// ============================================

// Audit action colors with dark mode support
export const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  user_login: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  user_logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  user_signup: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  password_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  password_reset: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  profile_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  avatar_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  member_invited: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  member_joined: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  member_removed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  member_role_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  member_suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  member_reactivated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  tenant_created: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  tenant_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  tenant_settings_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  tenant_switched: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  lead_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lead_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  lead_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  lead_assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  lead_status_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  lead_qualified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lead_converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  user_login: 'Inicio de sesión',
  user_logout: 'Cierre de sesión',
  user_signup: 'Registro de usuario',
  password_change: 'Cambio de contraseña',
  password_reset: 'Restablecimiento de contraseña',
  profile_updated: 'Perfil actualizado',
  avatar_updated: 'Avatar actualizado',
  member_invited: 'Miembro invitado',
  member_joined: 'Miembro se unió',
  member_removed: 'Miembro eliminado',
  member_role_changed: 'Rol de miembro cambiado',
  member_suspended: 'Miembro suspendido',
  member_reactivated: 'Miembro reactivado',
  tenant_created: 'Tenant creado',
  tenant_updated: 'Tenant actualizado',
  tenant_settings_changed: 'Configuración cambiada',
  tenant_switched: 'Cambio de tenant',
  lead_created: 'Lead creado',
  lead_updated: 'Lead actualizado',
  lead_deleted: 'Lead eliminado',
  lead_assigned: 'Lead asignado',
  lead_status_changed: 'Estado de lead cambiado',
  lead_qualified: 'Lead calificado',
  lead_converted: 'Lead convertido',
  other: 'Otra acción',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  profile: 'Perfil',
  member: 'Miembro',
  invitation: 'Invitación',
  tenant: 'Empresa',
  lead: 'Lead',
  opportunity: 'Oportunidad',
  customer: 'Cliente',
  settings: 'Configuración',
};
