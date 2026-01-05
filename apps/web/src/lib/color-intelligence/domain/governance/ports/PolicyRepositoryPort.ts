// ============================================
// Policy Repository Port
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Port interface for policy storage and retrieval.
// Following hexagonal architecture: the port defines
// WHAT the Governance needs, adapters implement HOW.
//
// ============================================

import type {
  PerceptualPolicy,
  PolicyId,
  PolicyVersion,
  PolicyCategory,
  PolicyEnforcement,
  PolicyContext,
  PolicyMetadata,
} from '../types/policy';
import type { CompositePolicy, PolicySet } from '../types/policy-composition';

// ============================================
// Policy Repository Port Interface
// ============================================

/**
 * Port for policy storage and retrieval
 *
 * The Governance layer uses this port to:
 * 1. Store and retrieve policies
 * 2. Query policies by various criteria
 * 3. Manage policy versions
 * 4. Handle policy sets
 *
 * IMPORTANT: This is a port, not an implementation.
 * Adapters (InMemory, File, Database) implement this interface.
 */
export interface IPolicyRepositoryPort {
  // ===== CRUD Operations =====

  /**
   * Get a policy by ID
   * Returns the latest version if version not specified
   */
  getById(id: PolicyId, version?: PolicyVersion): Promise<PerceptualPolicy | null>;

  /**
   * Get a policy by ID (sync version for hot path)
   * Returns null if not found or not cached
   */
  getByIdSync(id: PolicyId): PerceptualPolicy | null;

  /**
   * Get all enabled policies (sync version for hot path)
   * Returns empty array if not initialized or not cached
   */
  getAllSync(): ReadonlyArray<PerceptualPolicy>;

  /**
   * Get all versions of a policy
   */
  getVersionHistory(id: PolicyId): Promise<ReadonlyArray<PolicyVersion>>;

  /**
   * Save a new policy or new version
   */
  save(policy: PerceptualPolicy): Promise<SavePolicyResult>;

  /**
   * Update an existing policy (creates new version)
   */
  update(
    id: PolicyId,
    updates: Partial<Omit<PerceptualPolicy, 'id' | 'version' | 'createdAt'>>
  ): Promise<PerceptualPolicy>;

  /**
   * Delete a policy (soft delete - marks as disabled)
   */
  delete(id: PolicyId): Promise<boolean>;

  /**
   * Permanently remove a policy (hard delete)
   * Use with caution - audit trail may be lost
   */
  purge(id: PolicyId): Promise<boolean>;

  // ===== Query Operations =====

  /**
   * Get all enabled policies
   */
  getAll(): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Get all policies including disabled
   */
  getAllIncludingDisabled(): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Find policies matching a context
   */
  findByContext(context: PolicyContext): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Find policies by category
   */
  findByCategory(category: PolicyCategory): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Find policies by enforcement level
   */
  findByEnforcement(enforcement: PolicyEnforcement): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Find policies by tag
   */
  findByTag(tag: string): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Find policies by multiple tags (any match)
   */
  findByTags(tags: ReadonlyArray<string>): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Search policies by name or description
   */
  search(query: string): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Get policies that extend a given policy
   */
  findDependents(parentId: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>>;

  // ===== Metadata Operations =====

  /**
   * Get metadata for all policies (for UI listing)
   */
  getAllMetadata(): Promise<ReadonlyArray<PolicyMetadata>>;

  /**
   * Count policies by category
   */
  countByCategory(): Promise<ReadonlyMap<PolicyCategory, number>>;

  /**
   * Check if a policy exists
   */
  exists(id: PolicyId): Promise<boolean>;

  // ===== Policy Set Operations =====

  /**
   * Get a policy set by ID
   */
  getPolicySet(setId: string): Promise<PolicySet | null>;

  /**
   * Get all policy sets
   */
  getAllPolicySets(): Promise<ReadonlyArray<PolicySet>>;

  /**
   * Save a policy set
   */
  savePolicySet(set: PolicySet): Promise<SavePolicySetResult>;

  /**
   * Get the default policy set
   */
  getDefaultPolicySet(): Promise<PolicySet | null>;

  /**
   * Resolve policies from a set
   */
  resolvePolicySet(setId: string): Promise<ReadonlyArray<PerceptualPolicy>>;

  // ===== Inheritance Resolution =====

  /**
   * Resolve the full inheritance chain for a policy
   */
  resolveInheritanceChain(id: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>>;

  /**
   * Get the resolved (flattened) policy after inheritance
   */
  getResolved(id: PolicyId): Promise<ResolvedPolicyResult | null>;

  // ===== Lifecycle =====

  /**
   * Initialize the repository
   */
  initialize(): Promise<void>;

  /**
   * Close the repository (cleanup connections)
   */
  close(): Promise<void>;

  /**
   * Check if repository is ready
   */
  isReady(): boolean;

  /**
   * Get repository statistics
   */
  getStats(): Promise<RepositoryStats>;
}

// ============================================
// Supporting Types
// ============================================

/**
 * Result of saving a policy
 */
export interface SavePolicyResult {
  /** Whether the operation succeeded */
  readonly success: boolean;

  /** The saved policy (with generated fields) */
  readonly policy: PerceptualPolicy | null;

  /** Whether this was a new policy or update */
  readonly isNew: boolean;

  /** Previous version if this was an update */
  readonly previousVersion?: PolicyVersion;

  /** Error message if failed */
  readonly error?: string;
}

/**
 * Result of saving a policy set
 */
export interface SavePolicySetResult {
  readonly success: boolean;
  readonly set: PolicySet | null;
  readonly isNew: boolean;
  readonly error?: string;
}

/**
 * Result of resolving a policy with inheritance
 */
export interface ResolvedPolicyResult {
  /** The source policy that was resolved */
  readonly sourcePolicy: PerceptualPolicy;

  /** The fully resolved policy (with inherited values) */
  readonly resolvedPolicy: PerceptualPolicy;

  /** Chain of policy IDs (child to root) */
  readonly inheritanceChain: ReadonlyArray<PolicyId>;

  /** Any conflicts encountered during resolution */
  readonly conflicts: ReadonlyArray<InheritanceConflict>;
}

/**
 * Conflict during inheritance resolution
 */
export interface InheritanceConflict {
  /** Field that had conflicting values */
  readonly field: string;

  /** Value from child policy (used) */
  readonly childValue: unknown;

  /** Value from parent policy (overridden) */
  readonly parentValue: unknown;

  /** Which policy the parent value came from */
  readonly parentPolicyId: PolicyId;
}

/**
 * Repository statistics
 */
export interface RepositoryStats {
  /** Total number of policies */
  readonly totalPolicies: number;

  /** Number of enabled policies */
  readonly enabledPolicies: number;

  /** Number of disabled policies */
  readonly disabledPolicies: number;

  /** Policies by category */
  readonly byCategory: Readonly<Record<PolicyCategory, number>>;

  /** Policies by enforcement */
  readonly byEnforcement: Readonly<Record<PolicyEnforcement, number>>;

  /** Number of policy sets */
  readonly totalPolicySets: number;

  /** Average policy versions */
  readonly avgVersionsPerPolicy: number;

  /** Last modified timestamp */
  readonly lastModified: string;
}

// ============================================
// Event Types
// ============================================

/**
 * Events emitted by the repository
 */
export interface PolicyRepositoryEvent {
  readonly type: PolicyRepositoryEventType;
  readonly timestamp: string;
  readonly policyId?: PolicyId;
  readonly setId?: string;
  readonly payload?: unknown;
}

export type PolicyRepositoryEventType =
  | 'policy-created'
  | 'policy-updated'
  | 'policy-deleted'
  | 'policy-purged'
  | 'policy-set-created'
  | 'policy-set-updated'
  | 'policy-set-deleted'
  | 'repository-initialized'
  | 'repository-closed';

/**
 * Event listener
 */
export type PolicyRepositoryEventListener = (event: PolicyRepositoryEvent) => void;

/**
 * Extended port with event support
 */
export interface IPolicyRepositoryPortWithEvents extends IPolicyRepositoryPort {
  addEventListener(listener: PolicyRepositoryEventListener): void;
  removeEventListener(listener: PolicyRepositoryEventListener): void;
}

// ============================================
// Error Types
// ============================================

/**
 * Error thrown by the policy repository
 */
export class PolicyRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: PolicyRepositoryErrorCode,
    public readonly policyId?: PolicyId,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PolicyRepositoryError';
  }
}

/**
 * Error codes
 */
export type PolicyRepositoryErrorCode =
  | 'NOT_FOUND'            // Policy or set not found
  | 'ALREADY_EXISTS'       // Policy with ID already exists
  | 'VERSION_CONFLICT'     // Concurrent modification
  | 'INVALID_POLICY'       // Policy validation failed
  | 'CIRCULAR_INHERITANCE' // Circular extends chain
  | 'PARENT_NOT_FOUND'     // Parent policy in extends not found
  | 'SET_NOT_FOUND'        // Policy set not found
  | 'NOT_INITIALIZED'      // Repository not initialized
  | 'STORAGE_ERROR';       // Underlying storage error

/**
 * Create a repository error
 */
export function createRepositoryError(
  code: PolicyRepositoryErrorCode,
  message: string,
  policyId?: PolicyId,
  details?: Record<string, unknown>
): PolicyRepositoryError {
  return new PolicyRepositoryError(message, code, policyId, details);
}

// ============================================
// Query Types
// ============================================

/**
 * Query options for listing policies
 */
export interface PolicyQueryOptions {
  /** Include disabled policies */
  readonly includeDisabled?: boolean;

  /** Filter by categories */
  readonly categories?: ReadonlyArray<PolicyCategory>;

  /** Filter by enforcement levels */
  readonly enforcements?: ReadonlyArray<PolicyEnforcement>;

  /** Filter by tags (any match) */
  readonly tags?: ReadonlyArray<string>;

  /** Filter by context match */
  readonly context?: PolicyContext;

  /** Search in name/description */
  readonly search?: string;

  /** Sort field */
  readonly sortBy?: 'name' | 'priority' | 'createdAt' | 'category';

  /** Sort direction */
  readonly sortDirection?: 'asc' | 'desc';

  /** Pagination offset */
  readonly offset?: number;

  /** Pagination limit */
  readonly limit?: number;
}

/**
 * Paginated query result
 */
export interface PolicyQueryResult {
  /** Matching policies */
  readonly policies: ReadonlyArray<PerceptualPolicy>;

  /** Total count (before pagination) */
  readonly totalCount: number;

  /** Current offset */
  readonly offset: number;

  /** Current limit */
  readonly limit: number;

  /** Whether there are more results */
  readonly hasMore: boolean;
}

/**
 * Extended port with advanced query support
 */
export interface IPolicyRepositoryPortWithQuery extends IPolicyRepositoryPort {
  /**
   * Query policies with filters and pagination
   */
  query(options: PolicyQueryOptions): Promise<PolicyQueryResult>;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if an error is a PolicyRepositoryError
 */
export function isPolicyRepositoryError(error: unknown): error is PolicyRepositoryError {
  return error instanceof PolicyRepositoryError;
}

/**
 * Create an empty repository stats object
 */
export function createEmptyStats(): RepositoryStats {
  return {
    totalPolicies: 0,
    enabledPolicies: 0,
    disabledPolicies: 0,
    byCategory: {
      accessibility: 0,
      brand: 0,
      'design-system': 0,
      custom: 0,
    },
    byEnforcement: {
      strict: 0,
      advisory: 0,
      monitoring: 0,
    },
    totalPolicySets: 0,
    avgVersionsPerPolicy: 0,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Validate that a port implements required methods
 */
export function validateRepositoryPort(port: unknown): port is IPolicyRepositoryPort {
  if (!port || typeof port !== 'object') return false;

  const requiredMethods = [
    'getById',
    'getByIdSync',
    'getAllSync',
    'save',
    'update',
    'delete',
    'getAll',
    'findByContext',
    'initialize',
    'close',
    'isReady',
  ];

  return requiredMethods.every(
    method => typeof (port as Record<string, unknown>)[method] === 'function'
  );
}

// ============================================
// Builder Helpers
// ============================================

/**
 * Create query options with defaults
 */
export function createQueryOptions(
  options?: Partial<PolicyQueryOptions>
): PolicyQueryOptions {
  return {
    includeDisabled: options?.includeDisabled ?? false,
    categories: options?.categories,
    enforcements: options?.enforcements,
    tags: options?.tags,
    context: options?.context,
    search: options?.search,
    sortBy: options?.sortBy ?? 'priority',
    sortDirection: options?.sortDirection ?? 'asc',
    offset: options?.offset ?? 0,
    limit: options?.limit ?? 50,
  };
}

/**
 * Create a policy repository event
 */
export function createRepositoryEvent(
  type: PolicyRepositoryEventType,
  options?: {
    policyId?: PolicyId;
    setId?: string;
    payload?: unknown;
  }
): PolicyRepositoryEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    policyId: options?.policyId,
    setId: options?.setId,
    payload: options?.payload,
  };
}
