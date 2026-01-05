// ============================================
// Onboarding Types - FASE 3
// Types for the onboarding flow
// ============================================

// ============================================
// Enums (matching database)
// ============================================

export type BusinessType =
  | 'dental'
  | 'medical'
  | 'automotive'
  | 'real_estate'
  | 'beauty_salon'
  | 'education'
  | 'professional_services'
  | 'retail'
  | 'restaurant'
  | 'fitness'
  | 'other';

export type BusinessSize =
  | 'solo'
  | '2_5'
  | '6_10'
  | '11_25'
  | '26_50'
  | '51_100'
  | '100_plus';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type OnboardingStatus =
  | 'not_started'
  | 'profile_created'
  | 'business_created'
  | 'setup_completed'
  | 'team_invited'
  | 'completed';

// ============================================
// Business Type Labels
// ============================================

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  dental: 'Consultorio Dental',
  medical: 'Consultorio Médico',
  automotive: 'Taller Automotriz',
  real_estate: 'Inmobiliaria',
  beauty_salon: 'Salón de Belleza / Estética',
  education: 'Escuela / Academia',
  professional_services: 'Servicios Profesionales',
  retail: 'Comercio / Tienda',
  restaurant: 'Restaurante / Cafetería',
  fitness: 'Gimnasio / Fitness',
  other: 'Otro',
};

export const BUSINESS_SIZE_LABELS: Record<BusinessSize, string> = {
  solo: 'Solo yo',
  '2_5': '2-5 empleados',
  '6_10': '6-10 empleados',
  '11_25': '11-25 empleados',
  '26_50': '26-50 empleados',
  '51_100': '51-100 empleados',
  '100_plus': 'Más de 100 empleados',
};

// ============================================
// Arrays for Select Options
// ============================================

export const BUSINESS_TYPES: Array<{ value: BusinessType; label: string; icon?: string }> = [
  { value: 'dental', label: 'Consultorio Dental', icon: '🦷' },
  { value: 'medical', label: 'Consultorio Médico', icon: '⚕️' },
  { value: 'automotive', label: 'Taller Automotriz', icon: '🚗' },
  { value: 'real_estate', label: 'Inmobiliaria', icon: '🏠' },
  { value: 'beauty_salon', label: 'Salón de Belleza / Estética', icon: '💇' },
  { value: 'education', label: 'Escuela / Academia', icon: '📚' },
  { value: 'professional_services', label: 'Servicios Profesionales', icon: '💼' },
  { value: 'retail', label: 'Comercio / Tienda', icon: '🛒' },
  { value: 'restaurant', label: 'Restaurante / Cafetería', icon: '🍽️' },
  { value: 'fitness', label: 'Gimnasio / Fitness', icon: '💪' },
  { value: 'other', label: 'Otro', icon: '📋' },
];

export const BUSINESS_SIZES: Array<{ value: BusinessSize; label: string; description?: string }> = [
  { value: 'solo', label: 'Solo yo', description: 'Emprendedor individual' },
  { value: '2_5', label: '2-5 empleados', description: 'Equipo pequeño' },
  { value: '6_10', label: '6-10 empleados', description: 'Equipo mediano' },
  { value: '11_25', label: '11-25 empleados', description: 'Empresa en crecimiento' },
  { value: '26_50', label: '26-50 empleados', description: 'Empresa establecida' },
  { value: '51_100', label: '51-100 empleados', description: 'Empresa grande' },
  { value: '100_plus', label: 'Más de 100 empleados', description: 'Corporativo' },
];

export type CRMModuleKey = keyof CRMModules;

export const CRM_MODULES: Array<{ value: CRMModuleKey; label: string; description: string; icon?: string }> = [
  { value: 'leads', label: 'Leads', description: 'Gestión de prospectos', icon: '🎯' },
  { value: 'customers', label: 'Clientes', description: 'Base de datos de clientes', icon: '👥' },
  { value: 'opportunities', label: 'Oportunidades', description: 'Pipeline de ventas', icon: '💰' },
  { value: 'tasks', label: 'Tareas', description: 'Gestión de actividades', icon: '✅' },
  { value: 'calendar', label: 'Calendario', description: 'Citas y eventos', icon: '📅' },
  { value: 'invoicing', label: 'Facturación', description: 'Cotizaciones y facturas', icon: '📄' },
  { value: 'products', label: 'Productos', description: 'Catálogo de productos', icon: '📦' },
  { value: 'teams', label: 'Equipos', description: 'Gestión de equipos', icon: '👔' },
  { value: 'pipelines', label: 'Pipelines', description: 'Flujos personalizados', icon: '🔄' },
  { value: 'marketing', label: 'Marketing', description: 'Campañas y automatizaciones', icon: '📣' },
  { value: 'whatsapp', label: 'WhatsApp', description: 'Integración WhatsApp', icon: '💬' },
  { value: 'reports', label: 'Reportes', description: 'Análisis y reportes', icon: '📊' },
];

// ============================================
// CRM Modules
// ============================================

export interface CRMModules {
  leads: boolean;
  customers: boolean;
  opportunities: boolean;
  tasks: boolean;
  calendar: boolean;
  invoicing: boolean;
  products: boolean;
  teams: boolean;
  pipelines: boolean;
  marketing: boolean;
  whatsapp: boolean;
  reports: boolean;
}

export const CRM_MODULE_LABELS: Record<keyof CRMModules, { name: string; description: string }> = {
  leads: {
    name: 'Leads',
    description: 'Gestión de prospectos y oportunidades de venta',
  },
  customers: {
    name: 'Clientes',
    description: 'Base de datos de clientes y contactos',
  },
  opportunities: {
    name: 'Oportunidades',
    description: 'Pipeline de ventas y seguimiento de deals',
  },
  tasks: {
    name: 'Tareas',
    description: 'Gestión de tareas y actividades',
  },
  calendar: {
    name: 'Calendario',
    description: 'Citas y eventos programados',
  },
  invoicing: {
    name: 'Facturación',
    description: 'Cotizaciones y facturas (CFDI)',
  },
  products: {
    name: 'Productos/Servicios',
    description: 'Catálogo de productos y servicios',
  },
  teams: {
    name: 'Equipos',
    description: 'Gestión de equipos y territorios',
  },
  pipelines: {
    name: 'Pipelines',
    description: 'Flujos de trabajo personalizados',
  },
  marketing: {
    name: 'Marketing',
    description: 'Campañas y automatizaciones',
  },
  whatsapp: {
    name: 'WhatsApp',
    description: 'Integración con WhatsApp Business',
  },
  reports: {
    name: 'Reportes',
    description: 'Análisis y reportes avanzados',
  },
};

// Default modules by business type
export const DEFAULT_MODULES_BY_TYPE: Record<BusinessType, Partial<CRMModules>> = {
  dental: {
    leads: true,
    customers: true,
    calendar: true,
    tasks: true,
  },
  medical: {
    leads: true,
    customers: true,
    calendar: true,
    tasks: true,
  },
  automotive: {
    leads: true,
    customers: true,
    tasks: true,
    products: true,
    invoicing: true,
  },
  real_estate: {
    leads: true,
    customers: true,
    opportunities: true,
    pipelines: true,
    tasks: true,
  },
  beauty_salon: {
    leads: true,
    customers: true,
    calendar: true,
    tasks: true,
    products: true,
  },
  education: {
    leads: true,
    customers: true,
    calendar: true,
    tasks: true,
  },
  professional_services: {
    leads: true,
    customers: true,
    opportunities: true,
    tasks: true,
    invoicing: true,
  },
  retail: {
    customers: true,
    products: true,
    invoicing: true,
    tasks: true,
  },
  restaurant: {
    customers: true,
    calendar: true,
    tasks: true,
  },
  fitness: {
    leads: true,
    customers: true,
    calendar: true,
    tasks: true,
  },
  other: {
    leads: true,
    customers: true,
    tasks: true,
  },
};

// ============================================
// Business Hours
// ============================================

export interface DayHours {
  open: string;
  close: string;
  enabled: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export const DAY_LABELS: Record<keyof BusinessHours, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// ============================================
// Tenant Settings
// ============================================

export interface TenantSettings {
  id: string;
  tenantId: string;
  businessType: BusinessType;
  businessSize: BusinessSize;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  companyEmail?: string;
  modules: CRMModules;
  businessHours: BusinessHours;
  notifications: NotificationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  email_new_lead: boolean;
  email_task_reminder: boolean;
  email_appointment: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
}

// ============================================
// User Invitation
// ============================================

export interface UserInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'viewer';
  token: string;
  status: InvitationStatus;
  invitedBy?: string;
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

// ============================================
// User Onboarding
// ============================================

export interface UserOnboarding {
  id: string;
  userId: string;
  status: OnboardingStatus;
  currentStep: number;
  completedSteps: string[];
  metadata: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Form Data Types
// ============================================

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateBusinessFormData {
  businessName: string;
  businessType: BusinessType;
  businessSize: BusinessSize;
  phone: string;
  country: string;
  city: string;
  timezone: string;
}

export interface BrandingFormData {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  subdomain?: string;
}

export interface ModulesFormData {
  modules: CRMModules;
}

export interface BusinessHoursFormData {
  businessHours: BusinessHours;
  timezone: string;
}

export interface InviteTeamFormData {
  invitations: Array<{
    email: string;
    role: 'admin' | 'manager' | 'sales_rep' | 'viewer';
  }>;
}

// ============================================
// Onboarding Steps
// ============================================

export type OnboardingStep =
  | 'signup'
  | 'create-business'
  | 'branding'
  | 'modules'
  | 'business-hours'
  | 'invite-team'
  | 'complete';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'signup',
  'create-business',
  'branding',
  'modules',
  'business-hours',
  'invite-team',
  'complete',
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  'signup': 'Crear cuenta',
  'create-business': 'Tu negocio',
  'branding': 'Marca',
  'modules': 'Módulos',
  'business-hours': 'Horarios',
  'invite-team': 'Equipo',
  'complete': 'Completado',
};
