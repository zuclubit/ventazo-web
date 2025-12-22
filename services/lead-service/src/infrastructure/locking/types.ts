/**
 * Optimistic Locking Types
 * Version-based concurrency control for concurrent updates
 */

/**
 * Entity with version support
 */
export interface Versionable {
  version: number;
  updatedAt: Date;
}

/**
 * Optimistic lock options
 */
export interface OptimisticLockOptions {
  /**
   * Retry configuration for conflict resolution
   */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };

  /**
   * Custom merge strategy for conflict resolution
   */
  mergeStrategy?: MergeStrategy;

  /**
   * Whether to throw on conflict or return conflict info
   */
  throwOnConflict?: boolean;
}

/**
 * Merge strategy types
 */
export type MergeStrategy =
  | 'last_write_wins'  // Latest version wins
  | 'first_write_wins' // Original version wins
  | 'merge'            // Attempt to merge changes
  | 'fail';            // Always fail on conflict

/**
 * Lock conflict information
 */
export interface LockConflict<T> {
  entityType: string;
  entityId: string;
  expectedVersion: number;
  actualVersion: number;
  yourChanges: Partial<T>;
  currentData: T;
  lastModifiedBy?: string;
  lastModifiedAt: Date;
}

/**
 * Lock result
 */
export interface LockResult<T> {
  success: boolean;
  data?: T;
  conflict?: LockConflict<T>;
  retryCount: number;
}

/**
 * Update with version
 */
export interface VersionedUpdate<T> {
  id: string;
  version: number;
  changes: Partial<T>;
  updatedBy?: string;
}

/**
 * Versioned entity metadata
 */
export interface VersionMetadata {
  version: number;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
  versionHistory?: VersionHistoryEntry[];
}

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  version: number;
  timestamp: Date;
  userId?: string;
  changes: string[];
  checksum?: string;
}

/**
 * Concurrent update error
 */
export class ConcurrentUpdateError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    public readonly conflict?: LockConflict<unknown>
  ) {
    super(
      `Concurrent update conflict: ${entityType}(${entityId}) - ` +
      `expected version ${expectedVersion}, found ${actualVersion}`
    );
    this.name = 'ConcurrentUpdateError';
  }
}

/**
 * Stale data error
 */
export class StaleDataError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly yourVersion: number,
    public readonly currentVersion: number
  ) {
    super(
      `Stale data: ${entityType}(${entityId}) - ` +
      `your version ${yourVersion} is behind current version ${currentVersion}`
    );
    this.name = 'StaleDataError';
  }
}

/**
 * Lock configuration for entities
 */
export interface EntityLockConfig {
  entityType: string;
  tableName: string;
  versionColumn: string;
  updatedAtColumn: string;
  updatedByColumn?: string;
  enableHistory: boolean;
  historyRetentionDays: number;
}

/**
 * Default lock configuration
 */
export const DEFAULT_LOCK_CONFIG: Omit<EntityLockConfig, 'entityType' | 'tableName'> = {
  versionColumn: 'version',
  updatedAtColumn: 'updated_at',
  updatedByColumn: 'updated_by',
  enableHistory: false,
  historyRetentionDays: 30,
};

/**
 * Lock metrics
 */
export interface LockMetrics {
  totalUpdates: number;
  successfulUpdates: number;
  conflictCount: number;
  retryCount: number;
  avgRetries: number;
  conflictRate: number;
  byEntity: Record<string, {
    updates: number;
    conflicts: number;
    retries: number;
  }>;
}

/**
 * Calculate changes between two objects
 */
export function calculateChanges<T extends Record<string, unknown>>(
  original: T,
  updated: Partial<T>
): string[] {
  const changes: string[] = [];

  for (const key of Object.keys(updated)) {
    if (key === 'version' || key === 'updatedAt') continue;

    const originalValue = original[key];
    const updatedValue = updated[key];

    if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
      changes.push(key);
    }
  }

  return changes;
}

/**
 * Check if two change sets conflict
 */
export function hasConflictingChanges(
  changes1: string[],
  changes2: string[]
): boolean {
  return changes1.some(field => changes2.includes(field));
}

/**
 * Merge non-conflicting changes
 */
export function mergeChanges<T extends Record<string, unknown>>(
  base: T,
  yours: Partial<T>,
  theirs: Partial<T>,
  yourChangedFields: string[],
  theirChangedFields: string[]
): { merged: T; conflicts: string[] } {
  const conflicts: string[] = [];
  const merged = { ...base } as T;

  // Apply their changes first
  for (const field of theirChangedFields) {
    if (field in theirs) {
      (merged as any)[field] = theirs[field];
    }
  }

  // Apply your changes, detect conflicts
  for (const field of yourChangedFields) {
    if (theirChangedFields.includes(field)) {
      // Conflict - both modified same field
      conflicts.push(field);
      // Keep theirs for now (can be configured)
    } else if (field in yours) {
      (merged as any)[field] = yours[field];
    }
  }

  return { merged, conflicts };
}

/**
 * Generate version checksum
 */
export function generateVersionChecksum<T extends Record<string, unknown>>(
  data: T,
  excludeFields: string[] = ['version', 'updatedAt', 'createdAt']
): string {
  const filteredData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!excludeFields.includes(key)) {
      filteredData[key] = value;
    }
  }

  // Simple hash - in production, use crypto
  const str = JSON.stringify(filteredData);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
