// ============================================
// Policy Registry
// Phase 4: Governance & Adoption Layer
// ============================================
//
// The PolicyRegistry is responsible for:
// 1. Managing the lifecycle of policies
// 2. Resolving policy inheritance
// 3. Matching policies to contexts
// 4. Caching resolved policies for performance
//
// ============================================

import type {
  PerceptualPolicy,
  PolicyId,
  PolicyVersion,
  PolicyContext,
  PolicyCategory,
  PolicyEnforcement,
  PolicyPriority,
  PolicyMetadata,
  AccessibilityRequirements,
} from '../../domain/governance/types/policy';
import {
  policyId,
  policyVersion,
  contextMatches,
  extractPolicyMetadata,
  validatePolicy,
  PRIORITY_ORDER,
} from '../../domain/governance/types/policy';
import type {
  CompositePolicy,
  ResolvedPolicy,
  PolicySet,
  PolicyRule,
} from '../../domain/governance/types/policy-composition';
import {
  isCompositePolicy,
  mergeRequirements,
  mergeContexts,
  mergeRules,
  getMostStrictEnforcement,
  getHighestPriority,
} from '../../domain/governance/types/policy-composition';
import type {
  IPolicyRepositoryPort,
  RepositoryStats,
  PolicyQueryOptions,
} from '../../domain/governance/ports/PolicyRepositoryPort';
import {
  createRepositoryError,
  PolicyRepositoryError,
} from '../../domain/governance/ports/PolicyRepositoryPort';

// ============================================
// Registry Configuration
// ============================================

/**
 * Configuration for the PolicyRegistry
 */
export interface PolicyRegistryConfig {
  /** Enable caching of resolved policies */
  readonly enableCache: boolean;

  /** Cache TTL in milliseconds (0 = no expiry) */
  readonly cacheTtlMs: number;

  /** Maximum cache size (number of policies) */
  readonly maxCacheSize: number;

  /** Validate policies on save */
  readonly validateOnSave: boolean;

  /** Allow circular inheritance detection */
  readonly detectCircularInheritance: boolean;

  /** Maximum inheritance depth */
  readonly maxInheritanceDepth: number;
}

/**
 * Default configuration
 */
export const DEFAULT_REGISTRY_CONFIG: PolicyRegistryConfig = {
  enableCache: true,
  cacheTtlMs: 60000, // 1 minute
  maxCacheSize: 100,
  validateOnSave: true,
  detectCircularInheritance: true,
  maxInheritanceDepth: 10,
};

// ============================================
// Cache Entry
// ============================================

interface CacheEntry<T> {
  readonly value: T;
  readonly timestamp: number;
  readonly accessCount: number;
}

// ============================================
// Policy Registry Implementation
// ============================================

/**
 * PolicyRegistry manages policy storage, resolution, and querying.
 *
 * Key responsibilities:
 * - CRUD operations on policies
 * - Inheritance resolution
 * - Context-based policy matching
 * - Performance optimization via caching
 *
 * DESIGN NOTE: The registry does NOT evaluate policies.
 * That responsibility belongs to the GovernanceEngine.
 */
export class PolicyRegistry {
  private readonly config: PolicyRegistryConfig;
  private readonly repository: IPolicyRepositoryPort;

  // Caches
  private readonly resolvedCache: Map<PolicyId, CacheEntry<ResolvedPolicy>>;
  private readonly contextMatchCache: Map<string, CacheEntry<ReadonlyArray<PerceptualPolicy>>>;

  // State
  private initialized: boolean = false;

  constructor(
    repository: IPolicyRepositoryPort,
    config: Partial<PolicyRegistryConfig> = {}
  ) {
    this.repository = repository;
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    this.resolvedCache = new Map();
    this.contextMatchCache = new Map();
  }

  // ===== Lifecycle =====

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.repository.initialize();
    this.initialized = true;
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    await this.repository.close();
    this.initialized = false;
  }

  /**
   * Check if registry is ready
   */
  isReady(): boolean {
    return this.initialized && this.repository.isReady();
  }

  // ===== Policy CRUD =====

  /**
   * Register a new policy
   */
  async register(policy: PerceptualPolicy): Promise<PerceptualPolicy> {
    this.ensureInitialized();

    // Validate if configured
    if (this.config.validateOnSave) {
      const validation = validatePolicy(policy);
      if (!validation.valid) {
        throw createRepositoryError(
          'INVALID_POLICY',
          `Policy validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          policy.id
        );
      }
    }

    // Check for circular inheritance
    if (policy.extends && this.config.detectCircularInheritance) {
      await this.checkCircularInheritance(policy.id, policy.extends);
    }

    // Save to repository
    const result = await this.repository.save(policy);

    if (!result.success || !result.policy) {
      throw createRepositoryError(
        'STORAGE_ERROR',
        result.error ?? 'Failed to save policy',
        policy.id
      );
    }

    // Invalidate related caches
    this.invalidateCachesForPolicy(policy.id);

    return result.policy;
  }

  /**
   * Get a policy by ID
   */
  async get(id: PolicyId, version?: PolicyVersion): Promise<PerceptualPolicy | null> {
    this.ensureInitialized();
    return this.repository.getById(id, version);
  }

  /**
   * Get a policy by ID (sync, from cache only)
   */
  getSync(id: PolicyId): PerceptualPolicy | null {
    if (!this.initialized) return null;
    return this.repository.getByIdSync(id);
  }

  /**
   * Update a policy
   * Creates a new version; policies are immutable
   */
  async update(
    id: PolicyId,
    updates: Partial<Omit<PerceptualPolicy, 'id' | 'version' | 'createdAt'>>
  ): Promise<PerceptualPolicy> {
    this.ensureInitialized();

    const updated = await this.repository.update(id, updates);

    // Invalidate caches
    this.invalidateCachesForPolicy(id);

    return updated;
  }

  /**
   * Disable a policy (soft delete)
   */
  async disable(id: PolicyId): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.repository.delete(id);

    if (result) {
      this.invalidateCachesForPolicy(id);
    }

    return result;
  }

  /**
   * Check if a policy exists
   */
  async exists(id: PolicyId): Promise<boolean> {
    this.ensureInitialized();
    return this.repository.exists(id);
  }

  // ===== Policy Queries =====

  /**
   * Get all enabled policies
   */
  async getAll(): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.getAll();
  }

  /**
   * Get all enabled policies (sync version for hot path)
   * Returns empty array if not initialized
   */
  getAllSync(): ReadonlyArray<PerceptualPolicy> {
    if (!this.initialized) return [];
    return this.repository.getAllSync();
  }

  /**
   * Get all policies including disabled
   */
  async getAllIncludingDisabled(): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.getAllIncludingDisabled();
  }

  /**
   * Find policies applicable to a context
   */
  async findForContext(context: PolicyContext): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();

    // Check cache
    const cacheKey = this.getContextCacheKey(context);
    const cached = this.getFromContextCache(cacheKey);
    if (cached) return cached;

    // Query repository
    const policies = await this.repository.findByContext(context);

    // Filter by context matching and sort by priority
    const matched = policies
      .filter(p => contextMatches(context, p.applicableContexts))
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    // Cache result
    this.addToContextCache(cacheKey, matched);

    return matched;
  }

  /**
   * Find policies by category
   */
  async findByCategory(category: PolicyCategory): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.findByCategory(category);
  }

  /**
   * Find policies by enforcement level
   */
  async findByEnforcement(
    enforcement: PolicyEnforcement
  ): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.findByEnforcement(enforcement);
  }

  /**
   * Search policies by name or description
   */
  async search(query: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.search(query);
  }

  /**
   * Get metadata for all policies
   */
  async getAllMetadata(): Promise<ReadonlyArray<PolicyMetadata>> {
    this.ensureInitialized();
    return this.repository.getAllMetadata();
  }

  // ===== Inheritance Resolution =====

  /**
   * Get a policy with inheritance resolved
   */
  async getResolved(id: PolicyId): Promise<ResolvedPolicy | null> {
    this.ensureInitialized();

    // Check cache
    const cached = this.getFromResolvedCache(id);
    if (cached) return cached;

    // Resolve inheritance
    const resolved = await this.resolvePolicy(id);

    if (resolved) {
      this.addToResolvedCache(id, resolved);
    }

    return resolved;
  }

  /**
   * Resolve the full inheritance chain
   */
  async getInheritanceChain(id: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.resolveInheritanceChain(id);
  }

  /**
   * Get all policies that extend a given policy
   */
  async getDependents(id: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.findDependents(id);
  }

  // ===== Policy Sets =====

  /**
   * Get a policy set
   */
  async getPolicySet(setId: string): Promise<PolicySet | null> {
    this.ensureInitialized();
    return this.repository.getPolicySet(setId);
  }

  /**
   * Get all policy sets
   */
  async getAllPolicySets(): Promise<ReadonlyArray<PolicySet>> {
    this.ensureInitialized();
    return this.repository.getAllPolicySets();
  }

  /**
   * Save a policy set
   */
  async savePolicySet(set: PolicySet): Promise<PolicySet> {
    this.ensureInitialized();

    const result = await this.repository.savePolicySet(set);

    if (!result.success || !result.set) {
      throw createRepositoryError(
        'SET_NOT_FOUND',
        result.error ?? 'Failed to save policy set'
      );
    }

    return result.set;
  }

  /**
   * Get the default policy set
   */
  async getDefaultPolicySet(): Promise<PolicySet | null> {
    this.ensureInitialized();
    return this.repository.getDefaultPolicySet();
  }

  /**
   * Resolve all policies in a set
   */
  async resolvePolicySet(setId: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    this.ensureInitialized();
    return this.repository.resolvePolicySet(setId);
  }

  // ===== Statistics =====

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    this.ensureInitialized();

    const repoStats = await this.repository.getStats();

    return {
      ...repoStats,
      cacheStats: {
        resolvedCacheSize: this.resolvedCache.size,
        contextCacheSize: this.contextMatchCache.size,
        cacheEnabled: this.config.enableCache,
      },
    };
  }

  // ===== Cache Management =====

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.resolvedCache.clear();
    this.contextMatchCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): { resolved: number; context: number } {
    return {
      resolved: this.resolvedCache.size,
      context: this.contextMatchCache.size,
    };
  }

  // ===== Private Methods =====

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw createRepositoryError('NOT_INITIALIZED', 'PolicyRegistry not initialized');
    }
  }

  private async resolvePolicy(id: PolicyId): Promise<ResolvedPolicy | null> {
    const policy = await this.repository.getById(id);
    if (!policy) return null;

    const chain: PerceptualPolicy[] = [policy];
    const visited = new Set<PolicyId>([id]);
    let current = policy;
    let depth = 0;

    // Walk up the inheritance chain
    while (current.extends && depth < this.config.maxInheritanceDepth) {
      if (visited.has(current.extends)) {
        throw createRepositoryError(
          'CIRCULAR_INHERITANCE',
          `Circular inheritance detected: ${id} -> ${current.extends}`,
          id
        );
      }

      const parent = await this.repository.getById(current.extends);
      if (!parent) {
        throw createRepositoryError(
          'PARENT_NOT_FOUND',
          `Parent policy not found: ${current.extends}`,
          id
        );
      }

      chain.push(parent);
      visited.add(current.extends);
      current = parent;
      depth++;
    }

    // Resolve from root to leaf
    const reversed = [...chain].reverse();

    // Merge requirements
    let mergedRequirements: AccessibilityRequirements = {};
    for (const p of reversed) {
      mergedRequirements = mergeRequirements(mergedRequirements, p.requirements);
    }

    // Merge contexts
    let mergedContexts: ReadonlyArray<PolicyContext> = [];
    for (const p of reversed) {
      mergedContexts = mergeContexts(mergedContexts, p.applicableContexts);
    }

    // Merge rules if composite
    let effectiveRules: ReadonlyArray<PolicyRule> = [];
    if (isCompositePolicy(policy)) {
      let parentRules: ReadonlyArray<PolicyRule> = [];
      for (const p of reversed.slice(0, -1)) {
        if (isCompositePolicy(p)) {
          parentRules = mergeRules(parentRules, p.rules);
        }
      }
      effectiveRules = mergeRules(
        parentRules,
        policy.rules,
        policy.ruleOverrides,
        policy.disabledRules
      );
    }

    return {
      sourcePolicy: policy,
      mergedRequirements,
      mergedContexts,
      effectiveRules,
      inheritanceChain: chain.map(p => p.id),
      effectiveEnforcement: getMostStrictEnforcement(chain),
      effectivePriority: getHighestPriority(chain),
    };
  }

  private async checkCircularInheritance(
    childId: PolicyId,
    parentId: PolicyId
  ): Promise<void> {
    const visited = new Set<PolicyId>([childId]);
    let currentId: PolicyId | undefined = parentId;
    let depth = 0;

    while (currentId && depth < this.config.maxInheritanceDepth) {
      if (visited.has(currentId)) {
        throw createRepositoryError(
          'CIRCULAR_INHERITANCE',
          `Circular inheritance detected: ${childId} -> ... -> ${currentId}`,
          childId
        );
      }

      visited.add(currentId);
      const parent = await this.repository.getById(currentId);
      currentId = parent?.extends;
      depth++;
    }
  }

  private invalidateCachesForPolicy(id: PolicyId): void {
    // Remove from resolved cache
    this.resolvedCache.delete(id);

    // Clear context cache (could be more surgical, but simple is better for now)
    this.contextMatchCache.clear();
  }

  // Cache helpers
  private getFromResolvedCache(id: PolicyId): ResolvedPolicy | null {
    if (!this.config.enableCache) return null;

    const entry = this.resolvedCache.get(id);
    if (!entry) return null;

    // Check TTL
    if (this.config.cacheTtlMs > 0) {
      const age = Date.now() - entry.timestamp;
      if (age > this.config.cacheTtlMs) {
        this.resolvedCache.delete(id);
        return null;
      }
    }

    return entry.value;
  }

  private addToResolvedCache(id: PolicyId, resolved: ResolvedPolicy): void {
    if (!this.config.enableCache) return;

    // Evict if at capacity (LRU would be better, but simple size limit for now)
    if (this.resolvedCache.size >= this.config.maxCacheSize) {
      const firstKey = this.resolvedCache.keys().next().value;
      if (firstKey) this.resolvedCache.delete(firstKey);
    }

    this.resolvedCache.set(id, {
      value: resolved,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  private getContextCacheKey(context: PolicyContext): string {
    return JSON.stringify({
      colorScheme: context.colorScheme,
      component: context.component,
      accessibilityMode: context.accessibilityMode,
      viewport: context.viewport,
      tags: [...(context.tags ?? [])].sort(),
    });
  }

  private getFromContextCache(key: string): ReadonlyArray<PerceptualPolicy> | null {
    if (!this.config.enableCache) return null;

    const entry = this.contextMatchCache.get(key);
    if (!entry) return null;

    // Check TTL
    if (this.config.cacheTtlMs > 0) {
      const age = Date.now() - entry.timestamp;
      if (age > this.config.cacheTtlMs) {
        this.contextMatchCache.delete(key);
        return null;
      }
    }

    return entry.value;
  }

  private addToContextCache(
    key: string,
    policies: ReadonlyArray<PerceptualPolicy>
  ): void {
    if (!this.config.enableCache) return;

    // Evict if at capacity
    if (this.contextMatchCache.size >= this.config.maxCacheSize) {
      const firstKey = this.contextMatchCache.keys().next().value;
      if (firstKey) this.contextMatchCache.delete(firstKey);
    }

    this.contextMatchCache.set(key, {
      value: policies,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }
}

// ============================================
// Extended Stats Type
// ============================================

export interface RegistryStats extends RepositoryStats {
  readonly cacheStats: {
    readonly resolvedCacheSize: number;
    readonly contextCacheSize: number;
    readonly cacheEnabled: boolean;
  };
}

// ============================================
// Event Types
// ============================================

export type PolicyRegistryEventType =
  | 'policy-registered'
  | 'policy-unregistered'
  | 'policy-updated'
  | 'policy-enabled'
  | 'policy-disabled'
  | 'cache-cleared'
  | 'registry-initialized'
  | 'registry-closed';

export interface PolicyRegistryEvent {
  readonly type: PolicyRegistryEventType;
  readonly timestamp: string;
  readonly policyId?: string;
  readonly payload?: unknown;
}

export type PolicyRegistryEventListener = (event: PolicyRegistryEvent) => void;

// ============================================
// Metrics Types
// ============================================

export interface PolicyRegistryMetrics {
  readonly totalPolicies: number;
  readonly enabledPolicies: number;
  readonly disabledPolicies: number;
  readonly totalQueries: number;
  readonly cacheHitRate: number;
  readonly avgQueryTimeMs: number;
  readonly registrationCount: number;
  readonly unregistrationCount: number;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create registry configuration with defaults
 */
export function createRegistryConfig(
  overrides?: Partial<PolicyRegistryConfig>
): PolicyRegistryConfig {
  return { ...DEFAULT_REGISTRY_CONFIG, ...overrides };
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a PolicyRegistry with default configuration
 */
export function createPolicyRegistry(
  repository: IPolicyRepositoryPort,
  config?: Partial<PolicyRegistryConfig>
): PolicyRegistry {
  return new PolicyRegistry(repository, config);
}
