// ============================================
// Customer Management Types - FASE 5.2
// FASE 6.4 — Updated with financial fields alignment
// ============================================

// ============================================
// Enums
// ============================================

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
}

export enum CustomerType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
}

export enum CustomerTier {
  ENTERPRISE = 'enterprise',
  PREMIUM = 'premium',
  STANDARD = 'standard',
  BASIC = 'basic',
}

// ============================================
// FASE 6.4 — Priority enum (aligned with Opportunities)
// ============================================

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ============================================
// Customer Types
// ============================================

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  leadId?: string;

  // FASE 6.4 — Unified naming fields
  companyName: string;
  displayName?: string; // For UI display (computed or manual)
  fullName?: string; // Primary contact full name
  name?: string; // Backwards compatibility

  email: string;
  phone?: string;
  website?: string;
  address?: CustomerAddress;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;

  type: CustomerType;
  status: CustomerStatus;
  tier: CustomerTier;

  accountManagerId?: string;
  accountManagerName?: string;

  // FASE 6.4 — Financial fields aligned with backend
  contractValue: number;
  contractStartDate?: string;
  contractEndDate?: string;
  mrr: number; // Monthly Recurring Revenue
  totalRevenue: number;
  lifetimeValue: number;
  lastPurchaseDate?: string;
  renewalDate?: string;
  churnedAt?: string;

  notes?: string;
  customFields: Record<string, unknown>;
  tags: string[];

  convertedAt: string;
  createdAt: string;
  updatedAt: string;

  // Computed counts
  opportunityCount?: number;
  taskCount?: number;
}

export interface CreateCustomerData {
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
  address?: CustomerAddress;
  type?: CustomerType;
  tier?: CustomerTier;
  accountManagerId?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  // FASE 6.4 — Financial fields
  contractValue?: number;
  mrr?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  // FASE 6.4 — Additional fields
  displayName?: string;
  fullName?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
}

export interface UpdateCustomerData {
  companyName?: string;
  email?: string;
  phone?: string | null;
  website?: string | null;
  address?: CustomerAddress | null;
  type?: CustomerType;
  status?: CustomerStatus;
  tier?: CustomerTier;
  accountManagerId?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown>;
  tags?: string[];
  // FASE 6.4 — Financial fields
  contractValue?: number;
  mrr?: number;
  totalRevenue?: number;
  lifetimeValue?: number;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  renewalDate?: string | null;
  // FASE 6.4 — Additional fields
  displayName?: string | null;
  fullName?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
}

// ============================================
// Customer Notes Types
// ============================================

export interface CustomerNote {
  id: string;
  tenantId: string;
  customerId: string;
  createdBy: string;
  createdByName?: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  content: string;
  isPinned?: boolean;
}

export interface UpdateNoteData {
  content?: string;
  isPinned?: boolean;
}

// ============================================
// Customer Activity Types
// ============================================

export type CustomerActivityType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'note_added'
  | 'note_deleted'
  | 'tag_added'
  | 'tag_removed'
  | 'tier_changed'
  | 'converted_from_lead'
  | 'opportunity_created'
  | 'opportunity_closed'
  | 'revenue_updated';

export interface CustomerActivity {
  id: string;
  tenantId: string;
  customerId: string;
  userId?: string;
  userName?: string;
  actionType: CustomerActivityType;
  description?: string;
  metadata: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// Filter & Query Types
// ============================================

export interface CustomerFilters {
  status?: CustomerStatus | CustomerStatus[];
  type?: CustomerType | CustomerType[];
  tier?: CustomerTier | CustomerTier[];
  accountManagerId?: string;
  hasRevenue?: boolean;
  revenueMin?: number;
  revenueMax?: number;
  searchTerm?: string;
  convertedDateFrom?: string;
  convertedDateTo?: string;
  tags?: string[];
}

export interface CustomerSort {
  sortBy?: 'companyName' | 'email' | 'totalRevenue' | 'lifetimeValue' | 'convertedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerNotesFilters {
  isPinned?: boolean;
}

export interface CustomerActivityFilters {
  actionType?: CustomerActivityType;
  startDate?: string;
  endDate?: string;
}

// ============================================
// API Response Types
// ============================================

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Backend response structure for customers list
 * Note: Backend returns { customers, total, page, limit }
 */
export interface CustomersApiResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Normalized response structure used by frontend hooks
 */
export interface CustomersResponse {
  data: Customer[];
  meta: PaginationMeta;
}

export interface CustomerNotesResponse {
  data: CustomerNote[];
  meta: PaginationMeta;
}

export interface CustomerActivityResponse {
  data: CustomerActivity[];
  meta: PaginationMeta;
}

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  newCustomersThisMonth: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  revenueByTier: Record<CustomerTier, number>;
  customersByType: Record<CustomerType, number>;
}

// ============================================
// Display Helpers
// ============================================

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: 'Activo',
  [CustomerStatus.INACTIVE]: 'Inactivo',
  [CustomerStatus.AT_RISK]: 'En Riesgo',
  [CustomerStatus.CHURNED]: 'Perdido',
};

// Customer status colors using CSS variables for theme consistency
export const STATUS_COLORS: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: 'bg-[var(--customer-active-bg)] text-[var(--customer-active)] border border-[var(--customer-active-border)]',
  [CustomerStatus.INACTIVE]: 'bg-[var(--customer-inactive-bg)] text-[var(--customer-inactive)] border border-[var(--customer-inactive-border)]',
  [CustomerStatus.AT_RISK]: 'bg-[var(--customer-at-risk-bg)] text-[var(--customer-at-risk)] border border-[var(--customer-at-risk-border)]',
  [CustomerStatus.CHURNED]: 'bg-[var(--customer-churned-bg)] text-[var(--customer-churned)] border border-[var(--customer-churned-border)]',
};

export const TYPE_LABELS: Record<CustomerType, string> = {
  [CustomerType.COMPANY]: 'Empresa',
  [CustomerType.INDIVIDUAL]: 'Individual',
};

export const TIER_LABELS: Record<CustomerTier, string> = {
  [CustomerTier.ENTERPRISE]: 'Enterprise',
  [CustomerTier.PREMIUM]: 'Premium',
  [CustomerTier.STANDARD]: 'Standard',
  [CustomerTier.BASIC]: 'Basic',
};

// Customer tier colors using CSS variables for theme consistency
export const TIER_COLORS: Record<CustomerTier, string> = {
  [CustomerTier.ENTERPRISE]: 'bg-[var(--tier-enterprise-bg)] text-[var(--tier-enterprise)] border border-[var(--tier-enterprise-border)]',
  [CustomerTier.PREMIUM]: 'bg-[var(--tier-premium-bg)] text-[var(--tier-premium)] border border-[var(--tier-premium-border)]',
  [CustomerTier.STANDARD]: 'bg-[var(--tier-standard-bg)] text-[var(--tier-standard)] border border-[var(--tier-standard-border)]',
  [CustomerTier.BASIC]: 'bg-[var(--tier-basic-bg)] text-[var(--tier-basic)] border border-[var(--tier-basic-border)]',
};

export const ACTIVITY_LABELS: Record<CustomerActivityType, string> = {
  created: 'Cliente creado',
  updated: 'Cliente actualizado',
  status_changed: 'Estado cambiado',
  assigned: 'Asignado',
  note_added: 'Nota agregada',
  note_deleted: 'Nota eliminada',
  tag_added: 'Etiqueta agregada',
  tag_removed: 'Etiqueta removida',
  tier_changed: 'Tier cambiado',
  converted_from_lead: 'Convertido de lead',
  opportunity_created: 'Oportunidad creada',
  opportunity_closed: 'Oportunidad cerrada',
  revenue_updated: 'Ingreso actualizado',
};

// Activity colors - decorative, with dark mode support
export const ACTIVITY_COLORS: Record<CustomerActivityType, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  status_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  note_added: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  note_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  tag_added: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  tag_removed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  tier_changed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  converted_from_lead: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  opportunity_created: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  opportunity_closed: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  revenue_updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};
