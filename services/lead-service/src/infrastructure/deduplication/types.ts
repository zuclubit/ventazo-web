/**
 * Deduplication Types
 * Types for lead duplicate detection and merging
 */

/**
 * Fields that can be used for duplicate detection
 */
export type DuplicateCheckField =
  | 'email'
  | 'companyName'
  | 'phone'
  | 'website'
  | 'domain'; // Email domain extraction

/**
 * Duplicate detection strategy
 */
export enum DuplicateStrategy {
  EXACT = 'exact',           // Exact match
  FUZZY = 'fuzzy',           // Fuzzy matching (similarity)
  NORMALIZED = 'normalized', // Normalize before comparing
}

/**
 * Confidence levels for duplicate matches
 */
export enum DuplicateConfidence {
  HIGH = 'high',       // 90%+ match
  MEDIUM = 'medium',   // 70-90% match
  LOW = 'low',         // 50-70% match
}

/**
 * Duplicate detection configuration
 */
export interface DuplicateDetectionConfig {
  fields: DuplicateCheckField[];
  strategy: DuplicateStrategy;
  minConfidence: DuplicateConfidence;
  fuzzyThreshold?: number; // 0-1, for fuzzy matching
  ignoreCase?: boolean;
  normalizePhones?: boolean;
  normalizeDomains?: boolean;
}

/**
 * Default duplicate detection configuration
 */
export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
  fields: ['email', 'companyName'],
  strategy: DuplicateStrategy.NORMALIZED,
  minConfidence: DuplicateConfidence.MEDIUM,
  fuzzyThreshold: 0.8,
  ignoreCase: true,
  normalizePhones: true,
  normalizeDomains: true,
};

/**
 * Duplicate match result
 */
export interface DuplicateMatch {
  leadId: string;
  matchedLeadId: string;
  confidence: DuplicateConfidence;
  confidenceScore: number; // 0-100
  matchedFields: DuplicateMatchField[];
}

/**
 * Individual field match
 */
export interface DuplicateMatchField {
  field: DuplicateCheckField;
  originalValue: string;
  matchedValue: string;
  similarity: number; // 0-100
  isExact: boolean;
}

/**
 * Duplicate detection result
 */
export interface DuplicateDetectionResult {
  leadId: string;
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  totalMatches: number;
}

/**
 * Merge strategy for conflicting fields
 */
export enum MergeStrategy {
  KEEP_PRIMARY = 'keep_primary',     // Keep primary lead's value
  KEEP_SECONDARY = 'keep_secondary', // Keep duplicate's value
  KEEP_NEWEST = 'keep_newest',       // Keep most recently updated
  KEEP_OLDEST = 'keep_oldest',       // Keep oldest value
  CONCATENATE = 'concatenate',       // Combine values (for notes)
  HIGHEST = 'highest',               // Keep highest value (for scores)
  LOWEST = 'lowest',                 // Keep lowest value
}

/**
 * Merge configuration for individual fields
 */
export interface FieldMergeConfig {
  field: string;
  strategy: MergeStrategy;
}

/**
 * Overall merge configuration
 */
export interface MergeConfig {
  primaryLeadId: string;
  duplicateLeadIds: string[];
  fieldConfigs?: FieldMergeConfig[];
  defaultStrategy?: MergeStrategy;
  deleteAfterMerge?: boolean;
  preserveHistory?: boolean;
}

/**
 * Merge result
 */
export interface MergeResult {
  mergedLeadId: string;
  mergedFromIds: string[];
  fieldsUpdated: string[];
  activitiesMerged: number;
  notesMerged: number;
  deletedLeads: string[];
}

/**
 * Duplicate group (leads that are potentially duplicates of each other)
 */
export interface DuplicateGroup {
  id: string;
  leadIds: string[];
  primaryLeadId?: string;
  confidence: DuplicateConfidence;
  avgConfidenceScore: number;
  matchedFields: DuplicateCheckField[];
  createdAt: Date;
  status: DuplicateGroupStatus;
}

/**
 * Duplicate group status
 */
export enum DuplicateGroupStatus {
  PENDING = 'pending',           // Awaiting review
  REVIEWED = 'reviewed',         // Reviewed but not merged
  MERGED = 'merged',             // Successfully merged
  DISMISSED = 'dismissed',       // Marked as not duplicates
  AUTO_DISMISSED = 'auto_dismissed', // Auto-dismissed based on rules
}

/**
 * Duplicate scan options
 */
export interface DuplicateScanOptions {
  tenantId: string;
  config?: Partial<DuplicateDetectionConfig>;
  leadIds?: string[]; // Specific leads to scan
  excludeLeadIds?: string[]; // Leads to exclude
  includeAlreadyGrouped?: boolean;
  maxResults?: number;
}

/**
 * Duplicate scan result
 */
export interface DuplicateScanResult {
  scanId: string;
  tenantId: string;
  totalLeadsScanned: number;
  duplicateGroupsFound: number;
  totalDuplicates: number;
  groups: DuplicateGroup[];
  duration: number;
  scanConfig: DuplicateDetectionConfig;
  completedAt: Date;
}
