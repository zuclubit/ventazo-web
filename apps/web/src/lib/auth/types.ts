// ============================================
// Auth Types - FASE 5.10
// ============================================

// User roles matching backend RBAC system
export type UserRole = 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer';

// Permissions matching backend permission system
export type Permission =
  // Lead permissions
  | 'LEAD_CREATE'
  | 'LEAD_READ'
  | 'LEAD_READ_ALL'
  | 'LEAD_UPDATE'
  | 'LEAD_UPDATE_ALL'
  | 'LEAD_DELETE'
  | 'LEAD_ASSIGN'
  | 'LEAD_QUALIFY'
  | 'LEAD_EXPORT'
  | 'LEAD_IMPORT'
  | 'LEAD_BULK'
  // Customer permissions
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_READ'
  | 'CUSTOMER_READ_ALL'
  | 'CUSTOMER_UPDATE'
  | 'CUSTOMER_UPDATE_ALL'
  | 'CUSTOMER_DELETE'
  | 'CUSTOMER_EXPORT'
  // Opportunity permissions
  | 'OPPORTUNITY_CREATE'
  | 'OPPORTUNITY_READ'
  | 'OPPORTUNITY_READ_ALL'
  | 'OPPORTUNITY_UPDATE'
  | 'OPPORTUNITY_UPDATE_ALL'
  | 'OPPORTUNITY_DELETE'
  | 'OPPORTUNITY_ASSIGN'
  | 'OPPORTUNITY_EXPORT'
  // Task permissions
  | 'TASK_CREATE'
  | 'TASK_READ'
  | 'TASK_READ_ALL'
  | 'TASK_UPDATE'
  | 'TASK_UPDATE_ALL'
  | 'TASK_DELETE'
  | 'TASK_ASSIGN'
  // Service permissions
  | 'SERVICE_CREATE'
  | 'SERVICE_READ'
  | 'SERVICE_UPDATE'
  | 'SERVICE_DELETE'
  // Workflow permissions
  | 'WORKFLOW_CREATE'
  | 'WORKFLOW_READ'
  | 'WORKFLOW_UPDATE'
  | 'WORKFLOW_DELETE'
  | 'WORKFLOW_EXECUTE'
  | 'WORKFLOW_MANAGE'
  // Stats & Analytics permissions
  | 'STATS_VIEW'
  | 'STATS_EXPORT'
  | 'ANALYTICS_VIEW'
  | 'ANALYTICS_VIEW_ALL'
  | 'ANALYTICS_EXPORT'
  | 'REPORTS_CREATE'
  | 'REPORTS_VIEW'
  | 'REPORTS_EXPORT'
  // User management
  | 'USER_INVITE'
  | 'USER_MANAGE'
  | 'USER_VIEW'
  | 'ROLE_MANAGE'
  // Team management
  | 'TEAM_CREATE'
  | 'TEAM_READ'
  | 'TEAM_UPDATE'
  | 'TEAM_DELETE'
  | 'TEAM_MANAGE'
  // Tenant
  | 'TENANT_SETTINGS'
  | 'TENANT_BILLING'
  | 'TENANT_INTEGRATIONS'
  // Messaging
  | 'MESSAGE_SEND'
  | 'MESSAGE_TEMPLATE_MANAGE'
  | 'NOTIFICATION_MANAGE';

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: readonly UserRole[] = [
  'viewer',
  'sales_rep',
  'manager',
  'admin',
  'owner',
] as const;

// Role-Permission mapping (matches backend)
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [
    // All Lead permissions
    'LEAD_CREATE', 'LEAD_READ', 'LEAD_READ_ALL', 'LEAD_UPDATE', 'LEAD_UPDATE_ALL',
    'LEAD_DELETE', 'LEAD_ASSIGN', 'LEAD_QUALIFY', 'LEAD_EXPORT', 'LEAD_IMPORT', 'LEAD_BULK',
    // All Customer permissions
    'CUSTOMER_CREATE', 'CUSTOMER_READ', 'CUSTOMER_READ_ALL', 'CUSTOMER_UPDATE',
    'CUSTOMER_UPDATE_ALL', 'CUSTOMER_DELETE', 'CUSTOMER_EXPORT',
    // All Opportunity permissions
    'OPPORTUNITY_CREATE', 'OPPORTUNITY_READ', 'OPPORTUNITY_READ_ALL', 'OPPORTUNITY_UPDATE',
    'OPPORTUNITY_UPDATE_ALL', 'OPPORTUNITY_DELETE', 'OPPORTUNITY_ASSIGN', 'OPPORTUNITY_EXPORT',
    // All Task permissions
    'TASK_CREATE', 'TASK_READ', 'TASK_READ_ALL', 'TASK_UPDATE', 'TASK_UPDATE_ALL',
    'TASK_DELETE', 'TASK_ASSIGN',
    // All Service permissions
    'SERVICE_CREATE', 'SERVICE_READ', 'SERVICE_UPDATE', 'SERVICE_DELETE',
    // All Workflow permissions
    'WORKFLOW_CREATE', 'WORKFLOW_READ', 'WORKFLOW_UPDATE', 'WORKFLOW_DELETE',
    'WORKFLOW_EXECUTE', 'WORKFLOW_MANAGE',
    // All Analytics permissions
    'STATS_VIEW', 'STATS_EXPORT', 'ANALYTICS_VIEW', 'ANALYTICS_VIEW_ALL', 'ANALYTICS_EXPORT',
    'REPORTS_CREATE', 'REPORTS_VIEW', 'REPORTS_EXPORT',
    // All User permissions
    'USER_INVITE', 'USER_MANAGE', 'USER_VIEW', 'ROLE_MANAGE',
    // All Team permissions
    'TEAM_CREATE', 'TEAM_READ', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_MANAGE',
    // All Tenant permissions
    'TENANT_SETTINGS', 'TENANT_BILLING', 'TENANT_INTEGRATIONS',
    // All Messaging permissions
    'MESSAGE_SEND', 'MESSAGE_TEMPLATE_MANAGE', 'NOTIFICATION_MANAGE',
  ],
  admin: [
    // All Lead permissions except BULK
    'LEAD_CREATE', 'LEAD_READ', 'LEAD_READ_ALL', 'LEAD_UPDATE', 'LEAD_UPDATE_ALL',
    'LEAD_DELETE', 'LEAD_ASSIGN', 'LEAD_QUALIFY', 'LEAD_EXPORT', 'LEAD_IMPORT',
    // All Customer permissions
    'CUSTOMER_CREATE', 'CUSTOMER_READ', 'CUSTOMER_READ_ALL', 'CUSTOMER_UPDATE',
    'CUSTOMER_UPDATE_ALL', 'CUSTOMER_DELETE', 'CUSTOMER_EXPORT',
    // All Opportunity permissions
    'OPPORTUNITY_CREATE', 'OPPORTUNITY_READ', 'OPPORTUNITY_READ_ALL', 'OPPORTUNITY_UPDATE',
    'OPPORTUNITY_UPDATE_ALL', 'OPPORTUNITY_DELETE', 'OPPORTUNITY_ASSIGN', 'OPPORTUNITY_EXPORT',
    // All Task permissions
    'TASK_CREATE', 'TASK_READ', 'TASK_READ_ALL', 'TASK_UPDATE', 'TASK_UPDATE_ALL',
    'TASK_DELETE', 'TASK_ASSIGN',
    // All Service permissions
    'SERVICE_CREATE', 'SERVICE_READ', 'SERVICE_UPDATE', 'SERVICE_DELETE',
    // Workflow permissions (no MANAGE)
    'WORKFLOW_CREATE', 'WORKFLOW_READ', 'WORKFLOW_UPDATE', 'WORKFLOW_DELETE', 'WORKFLOW_EXECUTE',
    // Analytics permissions
    'STATS_VIEW', 'STATS_EXPORT', 'ANALYTICS_VIEW', 'ANALYTICS_VIEW_ALL', 'ANALYTICS_EXPORT',
    'REPORTS_CREATE', 'REPORTS_VIEW', 'REPORTS_EXPORT',
    // User permissions (no ROLE_MANAGE)
    'USER_INVITE', 'USER_MANAGE', 'USER_VIEW',
    // Team permissions
    'TEAM_CREATE', 'TEAM_READ', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_MANAGE',
    // Messaging
    'MESSAGE_SEND', 'MESSAGE_TEMPLATE_MANAGE', 'NOTIFICATION_MANAGE',
  ],
  manager: [
    // Lead permissions (team scope)
    'LEAD_CREATE', 'LEAD_READ', 'LEAD_READ_ALL', 'LEAD_UPDATE', 'LEAD_UPDATE_ALL',
    'LEAD_DELETE', 'LEAD_ASSIGN', 'LEAD_QUALIFY', 'LEAD_EXPORT',
    // Customer permissions (team scope)
    'CUSTOMER_CREATE', 'CUSTOMER_READ', 'CUSTOMER_READ_ALL', 'CUSTOMER_UPDATE',
    'CUSTOMER_UPDATE_ALL', 'CUSTOMER_DELETE',
    // Opportunity permissions (team scope)
    'OPPORTUNITY_CREATE', 'OPPORTUNITY_READ', 'OPPORTUNITY_READ_ALL', 'OPPORTUNITY_UPDATE',
    'OPPORTUNITY_UPDATE_ALL', 'OPPORTUNITY_DELETE', 'OPPORTUNITY_ASSIGN',
    // Task permissions (team scope)
    'TASK_CREATE', 'TASK_READ', 'TASK_READ_ALL', 'TASK_UPDATE', 'TASK_UPDATE_ALL',
    'TASK_DELETE', 'TASK_ASSIGN',
    // Service permissions
    'SERVICE_CREATE', 'SERVICE_READ', 'SERVICE_UPDATE',
    // Workflow permissions (limited)
    'WORKFLOW_CREATE', 'WORKFLOW_READ', 'WORKFLOW_UPDATE', 'WORKFLOW_EXECUTE',
    // Analytics permissions
    'STATS_VIEW', 'STATS_EXPORT', 'ANALYTICS_VIEW', 'ANALYTICS_VIEW_ALL',
    'REPORTS_VIEW', 'REPORTS_EXPORT',
    // User permissions (limited)
    'USER_VIEW',
    // Team permissions (limited)
    'TEAM_READ',
    // Messaging
    'MESSAGE_SEND',
  ],
  sales_rep: [
    // Lead permissions (own only)
    'LEAD_CREATE', 'LEAD_READ', 'LEAD_UPDATE', 'LEAD_QUALIFY',
    // Customer permissions (own only)
    'CUSTOMER_CREATE', 'CUSTOMER_READ', 'CUSTOMER_UPDATE',
    // Opportunity permissions (own only)
    'OPPORTUNITY_CREATE', 'OPPORTUNITY_READ', 'OPPORTUNITY_UPDATE',
    // Task permissions (own only)
    'TASK_CREATE', 'TASK_READ', 'TASK_UPDATE',
    // Service permissions (read only)
    'SERVICE_READ',
    // Workflow permissions (execute only)
    'WORKFLOW_READ', 'WORKFLOW_EXECUTE',
    // Analytics (limited)
    'STATS_VIEW', 'ANALYTICS_VIEW', 'REPORTS_VIEW',
    // Messaging
    'MESSAGE_SEND',
  ],
  viewer: [
    'LEAD_READ', 'CUSTOMER_READ', 'OPPORTUNITY_READ', 'TASK_READ',
    'SERVICE_READ', 'WORKFLOW_READ', 'STATS_VIEW', 'ANALYTICS_VIEW', 'REPORTS_VIEW',
  ],
} as const;

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  leads: ['LEAD_CREATE', 'LEAD_READ', 'LEAD_READ_ALL', 'LEAD_UPDATE', 'LEAD_UPDATE_ALL',
    'LEAD_DELETE', 'LEAD_ASSIGN', 'LEAD_QUALIFY', 'LEAD_EXPORT', 'LEAD_IMPORT', 'LEAD_BULK'] as Permission[],
  customers: ['CUSTOMER_CREATE', 'CUSTOMER_READ', 'CUSTOMER_READ_ALL', 'CUSTOMER_UPDATE',
    'CUSTOMER_UPDATE_ALL', 'CUSTOMER_DELETE', 'CUSTOMER_EXPORT'] as Permission[],
  opportunities: ['OPPORTUNITY_CREATE', 'OPPORTUNITY_READ', 'OPPORTUNITY_READ_ALL', 'OPPORTUNITY_UPDATE',
    'OPPORTUNITY_UPDATE_ALL', 'OPPORTUNITY_DELETE', 'OPPORTUNITY_ASSIGN', 'OPPORTUNITY_EXPORT'] as Permission[],
  tasks: ['TASK_CREATE', 'TASK_READ', 'TASK_READ_ALL', 'TASK_UPDATE', 'TASK_UPDATE_ALL',
    'TASK_DELETE', 'TASK_ASSIGN'] as Permission[],
  services: ['SERVICE_CREATE', 'SERVICE_READ', 'SERVICE_UPDATE', 'SERVICE_DELETE'] as Permission[],
  workflows: ['WORKFLOW_CREATE', 'WORKFLOW_READ', 'WORKFLOW_UPDATE', 'WORKFLOW_DELETE',
    'WORKFLOW_EXECUTE', 'WORKFLOW_MANAGE'] as Permission[],
  analytics: ['STATS_VIEW', 'STATS_EXPORT', 'ANALYTICS_VIEW', 'ANALYTICS_VIEW_ALL', 'ANALYTICS_EXPORT',
    'REPORTS_CREATE', 'REPORTS_VIEW', 'REPORTS_EXPORT'] as Permission[],
  users: ['USER_INVITE', 'USER_MANAGE', 'USER_VIEW', 'ROLE_MANAGE'] as Permission[],
  teams: ['TEAM_CREATE', 'TEAM_READ', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_MANAGE'] as Permission[],
  tenant: ['TENANT_SETTINGS', 'TENANT_BILLING', 'TENANT_INTEGRATIONS'] as Permission[],
  messaging: ['MESSAGE_SEND', 'MESSAGE_TEMPLATE_MANAGE', 'NOTIFICATION_MANAGE'] as Permission[],
} as const;

// Permission labels for UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  LEAD_CREATE: 'Crear Leads',
  LEAD_READ: 'Ver Leads Propios',
  LEAD_READ_ALL: 'Ver Todos los Leads',
  LEAD_UPDATE: 'Editar Leads Propios',
  LEAD_UPDATE_ALL: 'Editar Todos los Leads',
  LEAD_DELETE: 'Eliminar Leads',
  LEAD_ASSIGN: 'Asignar Leads',
  LEAD_QUALIFY: 'Calificar Leads',
  LEAD_EXPORT: 'Exportar Leads',
  LEAD_IMPORT: 'Importar Leads',
  LEAD_BULK: 'Operaciones Masivas',
  CUSTOMER_CREATE: 'Crear Clientes',
  CUSTOMER_READ: 'Ver Clientes Propios',
  CUSTOMER_READ_ALL: 'Ver Todos los Clientes',
  CUSTOMER_UPDATE: 'Editar Clientes Propios',
  CUSTOMER_UPDATE_ALL: 'Editar Todos los Clientes',
  CUSTOMER_DELETE: 'Eliminar Clientes',
  CUSTOMER_EXPORT: 'Exportar Clientes',
  OPPORTUNITY_CREATE: 'Crear Oportunidades',
  OPPORTUNITY_READ: 'Ver Oportunidades Propias',
  OPPORTUNITY_READ_ALL: 'Ver Todas las Oportunidades',
  OPPORTUNITY_UPDATE: 'Editar Oportunidades Propias',
  OPPORTUNITY_UPDATE_ALL: 'Editar Todas las Oportunidades',
  OPPORTUNITY_DELETE: 'Eliminar Oportunidades',
  OPPORTUNITY_ASSIGN: 'Asignar Oportunidades',
  OPPORTUNITY_EXPORT: 'Exportar Oportunidades',
  TASK_CREATE: 'Crear Tareas',
  TASK_READ: 'Ver Tareas Propias',
  TASK_READ_ALL: 'Ver Todas las Tareas',
  TASK_UPDATE: 'Editar Tareas Propias',
  TASK_UPDATE_ALL: 'Editar Todas las Tareas',
  TASK_DELETE: 'Eliminar Tareas',
  TASK_ASSIGN: 'Asignar Tareas',
  SERVICE_CREATE: 'Crear Servicios',
  SERVICE_READ: 'Ver Servicios',
  SERVICE_UPDATE: 'Editar Servicios',
  SERVICE_DELETE: 'Eliminar Servicios',
  WORKFLOW_CREATE: 'Crear Workflows',
  WORKFLOW_READ: 'Ver Workflows',
  WORKFLOW_UPDATE: 'Editar Workflows',
  WORKFLOW_DELETE: 'Eliminar Workflows',
  WORKFLOW_EXECUTE: 'Ejecutar Workflows',
  WORKFLOW_MANAGE: 'Administrar Workflows',
  STATS_VIEW: 'Ver Estadisticas',
  STATS_EXPORT: 'Exportar Estadisticas',
  ANALYTICS_VIEW: 'Ver Analytics Propios',
  ANALYTICS_VIEW_ALL: 'Ver Todos los Analytics',
  ANALYTICS_EXPORT: 'Exportar Analytics',
  REPORTS_CREATE: 'Crear Reportes',
  REPORTS_VIEW: 'Ver Reportes',
  REPORTS_EXPORT: 'Exportar Reportes',
  USER_INVITE: 'Invitar Usuarios',
  USER_MANAGE: 'Administrar Usuarios',
  USER_VIEW: 'Ver Usuarios',
  ROLE_MANAGE: 'Administrar Roles',
  TEAM_CREATE: 'Crear Equipos',
  TEAM_READ: 'Ver Equipos',
  TEAM_UPDATE: 'Editar Equipos',
  TEAM_DELETE: 'Eliminar Equipos',
  TEAM_MANAGE: 'Administrar Equipos',
  TENANT_SETTINGS: 'Configuracion del Tenant',
  TENANT_BILLING: 'Facturacion',
  TENANT_INTEGRATIONS: 'Integraciones',
  MESSAGE_SEND: 'Enviar Mensajes',
  MESSAGE_TEMPLATE_MANAGE: 'Administrar Plantillas',
  NOTIFICATION_MANAGE: 'Administrar Notificaciones',
};

// Role labels for UI
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gerente',
  sales_rep: 'Representante de Ventas',
  viewer: 'Solo Lectura',
};

// Auth User interface
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  role: UserRole;
  permissions: Permission[];
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

// ============================================
// Plan Types
// ============================================

/** Available subscription plan tiers */
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

/** Plan tier hierarchy for feature comparison */
export const PLAN_HIERARCHY: readonly PlanTier[] = ['free', 'starter', 'pro', 'enterprise'] as const;

// ============================================
// Tenant Branding Types
// ============================================

/** Valid hex color pattern (3, 4, 6, or 8 characters) */
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

/** Valid URL pattern for logos/assets */
export const ASSET_URL_REGEX = /^(https?:\/\/|\/)[^\s<>"{}|\\^`[\]]*$/;

/**
 * Tenant branding configuration
 * Stores visual customization settings for white-labeling
 */
/**
 * Tenant Branding Configuration
 *
 * Supports 2-4 colors with semantic roles:
 * - sidebarColor: Navigation/sidebar background (required, dark professional tone)
 * - primaryColor: Main brand color for buttons, CTAs, active states (required)
 * - accentColor: Highlights, links, hover effects (optional, derived from primary if not set)
 * - surfaceColor: Cards, dropdowns, secondary backgrounds (optional, derived from sidebar if not set)
 *
 * @example Cuervo palette:
 * {
 *   sidebarColor: '#002050',  // Dark navy - professional sidebar
 *   primaryColor: '#D4A574',  // Warm gold - main actions
 *   accentColor: '#8B6914',   // Amber - highlights
 *   surfaceColor: '#0A1628',  // Darker navy - surfaces
 * }
 */
export interface TenantBranding {
  /** Sidebar/navigation background color (dark, professional tone) */
  sidebarColor?: string;
  /** Main brand color for buttons, CTAs, active states */
  primaryColor?: string;
  /** Accent color for highlights, links, hover effects */
  accentColor?: string;
  /** Surface color for cards, dropdowns, secondary backgrounds */
  surfaceColor?: string;
  /** @deprecated Use sidebarColor instead. Kept for backward compatibility */
  secondaryColor?: string;
  /** Logo path or URL (relative or absolute) */
  logo?: string;
  /** Alternative logo URL field (for compatibility) */
  logoUrl?: string;
  /** Favicon path or URL */
  favicon?: string;
}

/**
 * Business hours schedule for a single day
 */
export interface BusinessDaySchedule {
  open: string;  // Format: "HH:mm"
  close: string; // Format: "HH:mm"
}

/**
 * Tenant metadata structure
 * Contains configuration, preferences, and feature flags
 */
export interface TenantMetadata {
  /** Branding customization settings */
  branding?: TenantBranding;
  /** Enabled modules/features map */
  modules?: Record<string, boolean>;
  /** Business hours configuration */
  businessHours?: {
    timezone?: string;
    schedule?: Record<string, BusinessDaySchedule>;
  };
  /** Whether onboarding flow is completed */
  onboardingCompleted?: boolean;
  /** Extensible for future metadata */
  [key: string]: unknown;
}

/**
 * Tenant entity representing a customer organization
 * Supports multi-tenant SaaS architecture
 */
export interface Tenant {
  /** Unique tenant identifier (UUID) */
  id: string;
  /** Display name of the organization */
  name: string;
  /** URL-friendly slug for routing */
  slug: string;
  /** Current subscription plan */
  plan: PlanTier;
  /** Whether tenant account is active */
  isActive: boolean;
  /** Legacy settings object (deprecated, use metadata) */
  settings?: Record<string, unknown>;
  /** Structured metadata with branding, modules, etc. */
  metadata?: TenantMetadata;
  /** ISO timestamp of tenant creation */
  createdAt: string;
}

// ============================================
// Type Guards & Validators
// ============================================

/**
 * Validates if a string is a valid hex color
 * @param color - Color string to validate
 * @returns True if valid hex color format
 */
export function isValidHexColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_COLOR_REGEX.test(color);
}

/**
 * Validates if a string is a valid asset URL
 * @param url - URL string to validate
 * @returns True if valid URL format for assets
 */
export function isValidAssetUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false;
  return ASSET_URL_REGEX.test(url);
}

/**
 * Type guard for TenantBranding
 * @param obj - Object to validate
 * @returns True if object matches TenantBranding shape
 */
export function isTenantBranding(obj: unknown): obj is TenantBranding {
  if (!obj || typeof obj !== 'object') return false;
  const branding = obj as Record<string, unknown>;

  // All fields are optional, but if present must be valid
  if (branding['primaryColor'] !== undefined && !isValidHexColor(branding['primaryColor'])) {
    return false;
  }
  if (branding['secondaryColor'] !== undefined && !isValidHexColor(branding['secondaryColor'])) {
    return false;
  }
  if (branding['logo'] !== undefined && !isValidAssetUrl(branding['logo'])) {
    return false;
  }
  if (branding['logoUrl'] !== undefined && !isValidAssetUrl(branding['logoUrl'])) {
    return false;
  }

  return true;
}

/**
 * Sanitizes a hex color string for safe usage
 * @param color - Color string to sanitize
 * @param fallback - Fallback color if invalid
 * @returns Sanitized hex color or fallback
 */
export function sanitizeHexColor(color: unknown, fallback: string): string {
  if (isValidHexColor(color)) {
    return color.toUpperCase();
  }
  return fallback;
}

/**
 * Sanitizes a URL for safe usage in src attributes
 * @param url - URL to sanitize
 * @param fallback - Fallback URL if invalid
 * @returns Sanitized URL or fallback
 */
export function sanitizeAssetUrl(url: unknown, fallback: string): string {
  if (isValidAssetUrl(url)) {
    return url;
  }
  return fallback;
}

// Tenant membership
export interface TenantMembership {
  id: string;
  tenantId: string;
  tenant: Tenant;
  role: UserRole;
  isActive: boolean;
  invitedAt?: string;
  acceptedAt?: string;
}

// Auth tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  expiresIn: number; // Seconds
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Login response from Supabase
export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
  tenants: TenantMembership[];
}

// Register credentials
export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

// Auth state
export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  tenants: TenantMembership[];
  currentTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth error codes
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
}

// Auth error class
export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
