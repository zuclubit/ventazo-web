/**
 * Customer Types
 * Types for customer management and lead conversion
 */

/**
 * Customer Status Enum
 */
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CHURNED = 'churned',
  SUSPENDED = 'suspended',
}

/**
 * Customer Type Enum
 */
export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  ENTERPRISE = 'enterprise',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
}

/**
 * Customer Tier Enum
 */
export enum CustomerTier {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VIP = 'vip',
  ENTERPRISE = 'enterprise',
}

/**
 * Customer Address
 */
export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Customer DTO
 */
export interface CustomerDTO {
  id: string;
  tenantId: string;

  // Original lead reference
  leadId?: string;

  // Company/Individual information
  companyName: string;
  email: string;
  phone?: string;
  website?: string;

  // Address
  address: CustomerAddress;

  // Customer classification
  type: CustomerType;
  status: CustomerStatus;
  tier: CustomerTier;

  // Relationship management
  accountManagerId?: string;
  accountManagerName?: string;

  // Revenue tracking
  totalRevenue: number;
  lifetimeValue: number;
  lastPurchaseDate?: Date;

  // Metadata
  notes?: string;
  customFields: Record<string, unknown>;
  tags: string[];

  // Timestamps
  convertedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  opportunityCount?: number;
  taskCount?: number;
  daysSinceLastPurchase?: number;
}

/**
 * Create Customer Request
 */
export interface CreateCustomerRequest {
  // Company information
  companyName: string;
  email: string;
  phone?: string;
  website?: string;

  // Address
  address?: CustomerAddress;

  // Classification
  type?: CustomerType;
  tier?: CustomerTier;

  // Assignment
  accountManagerId?: string;

  // Metadata
  notes?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Update Customer Request
 */
export interface UpdateCustomerRequest {
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
}

/**
 * Convert Lead to Customer Request
 */
export interface ConvertLeadToCustomerRequest {
  leadId: string;

  // Optional overrides for customer data
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: CustomerAddress;
  type?: CustomerType;
  tier?: CustomerTier;
  accountManagerId?: string;
  notes?: string;
  tags?: string[];

  // Related entities to create
  createOpportunity?: boolean;
  opportunityName?: string;
  opportunityAmount?: number;
  opportunityStage?: string;
}

/**
 * Customer Filter Options
 */
export interface CustomerFilterOptions {
  status?: CustomerStatus | CustomerStatus[];
  type?: CustomerType | CustomerType[];
  tier?: CustomerTier | CustomerTier[];
  accountManagerId?: string;
  hasRevenue?: boolean;
  revenueMin?: number;
  revenueMax?: number;
  searchTerm?: string;
  tags?: string[];
  convertedDateFrom?: Date;
  convertedDateTo?: Date;
}

/**
 * Customer Sort Options
 */
export interface CustomerSortOptions {
  sortBy?: 'companyName' | 'email' | 'totalRevenue' | 'lifetimeValue' | 'convertedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Customer Statistics
 */
export interface CustomerStatistics {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
    churned: number;
    suspended: number;
  };
  byType: Record<string, number>;
  byTier: Record<string, number>;
  totalRevenue: number;
  averageLifetimeValue: number;
  averageRevenuePerCustomer: number;
  newThisMonth: number;
  churnedThisMonth: number;
  churnRate: number; // Percentage
  retentionRate: number; // Percentage
}

/**
 * Customer Revenue Summary
 */
export interface CustomerRevenueSummary {
  customerId: string;
  companyName: string;
  totalRevenue: number;
  opportunitiesWon: number;
  opportunitiesOpen: number;
  lastPurchaseDate?: Date;
  accountManagerName?: string;
}

/**
 * Bulk Customer Operation
 */
export interface BulkCustomerOperation {
  customerIds: string[];
  action: 'updateStatus' | 'updateTier' | 'reassign' | 'addTags' | 'removeTags' | 'delete';
  status?: CustomerStatus;
  tier?: CustomerTier;
  accountManagerId?: string;
  tags?: string[];
}

/**
 * Bulk Customer Result
 */
export interface BulkCustomerResult {
  successful: string[];
  failed: { customerId: string; error: string }[];
}

/**
 * Customer Timeline Entry
 */
export interface CustomerTimelineEntry {
  id: string;
  customerId: string;
  type: 'conversion' | 'opportunity' | 'task' | 'note' | 'status_change' | 'tier_change';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Customer Health Score
 */
export interface CustomerHealthScore {
  customerId: string;
  score: number; // 0-100
  factors: {
    engagementScore: number;
    revenueScore: number;
    satisfactionScore: number;
    recencyScore: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
  lastCalculated: Date;
}
