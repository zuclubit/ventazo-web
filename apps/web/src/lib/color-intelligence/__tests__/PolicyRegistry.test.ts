// ============================================
// PolicyRegistry Unit Tests
// Phase 4: Governance & Adoption Layer
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PolicyRegistry,
  createPolicyRegistry,
  createRegistryConfig,
  createPolicy,
  policyId,
  policyVersion,
  type PerceptualPolicy,
  type CompositePolicy,
  type IPolicyRepositoryPort,
  type PolicyContext,
  type PolicyCategory,
  type PolicyEnforcement,
  type PolicyId,
  type PolicyVersion,
  type PolicyMetadata,
  type PolicySet,
} from '../application/governance';
import {
  type SavePolicyResult,
  type SavePolicySetResult,
  type RepositoryStats,
  type ResolvedPolicyResult,
  createMinContrastRatioRule,
} from '../domain/governance';
import {
  WCAG21_AA_POLICY,
  WCAG21_AAA_POLICY,
  WCAG30_SILVER_POLICY,
  WCAG30_GOLD_POLICY,
  BRAND_ACCESSIBILITY_BALANCED_POLICY,
  HIGH_CONTRAST_MODE_POLICY,
} from '../domain/governance/policies';

// ============================================
// Mock Repository Implementation
// ============================================

class InMemoryPolicyRepository implements IPolicyRepositoryPort {
  private policies = new Map<string, PerceptualPolicy>();
  private policySets = new Map<string, PolicySet>();
  private _isReady = false;

  // ===== Lifecycle =====

  async initialize(): Promise<void> {
    this._isReady = true;
  }

  async close(): Promise<void> {
    this._isReady = false;
  }

  isReady(): boolean {
    return this._isReady;
  }

  // ===== CRUD Operations =====

  async getById(id: PolicyId, _version?: PolicyVersion): Promise<PerceptualPolicy | null> {
    return this.policies.get(id) ?? null;
  }

  getByIdSync(id: PolicyId): PerceptualPolicy | null {
    return this.policies.get(id) ?? null;
  }

  getAllSync(): ReadonlyArray<PerceptualPolicy> {
    return Array.from(this.policies.values()).filter(p => p.enabled);
  }

  async getVersionHistory(_id: PolicyId): Promise<ReadonlyArray<PolicyVersion>> {
    return [policyVersion.parse('1.0.0')];
  }

  async save(policy: PerceptualPolicy): Promise<SavePolicyResult> {
    const existing = this.policies.has(policy.id);
    this.policies.set(policy.id, policy);
    return {
      success: true,
      policy,
      isNew: !existing,
    };
  }

  async update(
    id: PolicyId,
    updates: Partial<Omit<PerceptualPolicy, 'id' | 'version' | 'createdAt'>>
  ): Promise<PerceptualPolicy> {
    const existing = this.policies.get(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }
    const updated = { ...existing, ...updates };
    this.policies.set(id, updated);
    return updated;
  }

  async delete(id: PolicyId): Promise<boolean> {
    return this.policies.delete(id);
  }

  async purge(id: PolicyId): Promise<boolean> {
    return this.policies.delete(id);
  }

  async exists(id: PolicyId): Promise<boolean> {
    return this.policies.has(id);
  }

  // ===== Query Operations =====

  async getAll(): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(p => p.enabled);
  }

  async getAllIncludingDisabled(): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values());
  }

  async findByContext(context: PolicyContext): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(p => {
      if (!p.enabled) return false;
      if (p.applicableContexts.length === 0) return true; // Universal policy
      return p.applicableContexts.some(ctx => {
        if (context.colorScheme && ctx.colorScheme && context.colorScheme !== ctx.colorScheme) {
          return false;
        }
        if (context.viewport && ctx.viewport && context.viewport !== ctx.viewport) {
          return false;
        }
        return true;
      });
    });
  }

  async findByCategory(category: PolicyCategory): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(
      p => p.enabled && p.category === category
    );
  }

  async findByEnforcement(enforcement: PolicyEnforcement): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(
      p => p.enabled && p.enforcement === enforcement
    );
  }

  async findByTag(tag: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(
      p => p.enabled && p.tags.includes(tag)
    );
  }

  async findByTags(tags: ReadonlyArray<string>): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(
      p => p.enabled && tags.some(tag => p.tags.includes(tag))
    );
  }

  async search(query: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    const q = query.toLowerCase();
    return Array.from(this.policies.values()).filter(
      p => p.enabled && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  }

  async findDependents(parentId: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter(
      p => p.enabled && p.extends === parentId
    );
  }

  // ===== Metadata Operations =====

  async getAllMetadata(): Promise<ReadonlyArray<PolicyMetadata>> {
    return Array.from(this.policies.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      category: p.category,
      priority: p.priority,
      enforcement: p.enforcement,
      enabled: p.enabled,
      createdAt: p.createdAt,
      tags: p.tags,
    }));
  }

  async countByCategory(): Promise<ReadonlyMap<PolicyCategory, number>> {
    const counts = new Map<PolicyCategory, number>();
    for (const p of Array.from(this.policies.values())) {
      if (p.enabled) {
        counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
      }
    }
    return counts;
  }

  // ===== Policy Set Operations =====

  async getPolicySet(setId: string): Promise<PolicySet | null> {
    return this.policySets.get(setId) ?? null;
  }

  async getAllPolicySets(): Promise<ReadonlyArray<PolicySet>> {
    return Array.from(this.policySets.values());
  }

  async savePolicySet(set: PolicySet): Promise<SavePolicySetResult> {
    const existing = this.policySets.has(set.id);
    this.policySets.set(set.id, set);
    return {
      success: true,
      set,
      isNew: !existing,
    };
  }

  async getDefaultPolicySet(): Promise<PolicySet | null> {
    for (const set of Array.from(this.policySets.values())) {
      if (set.isDefault) return set;
    }
    return null;
  }

  async resolvePolicySet(setId: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    const set = this.policySets.get(setId);
    if (!set) return [];

    const policies: PerceptualPolicy[] = [];
    for (const pid of set.policies) {
      const policy = this.policies.get(pid);
      if (policy) policies.push(policy);
    }
    return policies;
  }

  // ===== Inheritance Resolution =====

  async resolveInheritanceChain(id: PolicyId): Promise<ReadonlyArray<PerceptualPolicy>> {
    const chain: PerceptualPolicy[] = [];
    let current = this.policies.get(id);

    while (current) {
      chain.push(current);
      if (!current.extends) break;
      current = this.policies.get(current.extends);
    }

    return chain;
  }

  async getResolved(id: PolicyId): Promise<ResolvedPolicyResult | null> {
    const policy = this.policies.get(id);
    if (!policy) return null;

    const chain = await this.resolveInheritanceChain(id);

    return {
      sourcePolicy: policy,
      resolvedPolicy: policy,
      inheritanceChain: chain.map(p => p.id),
      conflicts: [],
    };
  }

  // ===== Statistics =====

  async getStats(): Promise<RepositoryStats> {
    const policies = Array.from(this.policies.values());
    const enabled = policies.filter(p => p.enabled);

    const byCategory: Record<PolicyCategory, number> = {
      accessibility: 0,
      brand: 0,
      'design-system': 0,
      custom: 0,
    };

    const byEnforcement: Record<PolicyEnforcement, number> = {
      strict: 0,
      advisory: 0,
      monitoring: 0,
    };

    for (const p of enabled) {
      byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
      byEnforcement[p.enforcement] = (byEnforcement[p.enforcement] ?? 0) + 1;
    }

    return {
      totalPolicies: policies.length,
      enabledPolicies: enabled.length,
      disabledPolicies: policies.length - enabled.length,
      byCategory,
      byEnforcement,
      totalPolicySets: this.policySets.size,
      avgVersionsPerPolicy: 1,
      lastModified: new Date().toISOString(),
    };
  }

  // Test helper methods
  clear(): void {
    this.policies.clear();
    this.policySets.clear();
  }

  size(): number {
    return this.policies.size;
  }
}

// ============================================
// Test Fixtures
// ============================================

function createTestPolicy(overrides?: Partial<Omit<PerceptualPolicy, 'id'>> & { id?: string }): PerceptualPolicy {
  return createPolicy({
    id: overrides?.id ?? `test-policy-${Date.now()}`,
    name: 'Test Policy',
    description: 'A test policy',
    version: '1.0.0',
    priority: 'medium',
    enforcement: 'advisory',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['test'],
    requirements: {},
    ...overrides,
  });
}

function createTestCompositePolicy(id: string): CompositePolicy {
  return {
    ...createTestPolicy({ id }),
    rules: [
      createMinContrastRatioRule(
        'min-contrast',
        4.5,
        {
          name: 'Min Contrast',
          severity: 'error',
          priority: 'high',
        }
      ),
    ],
    combinator: 'all',
  };
}

// ============================================
// Tests
// ============================================

describe('PolicyRegistry', () => {
  let repository: InMemoryPolicyRepository;
  let registry: PolicyRegistry;

  beforeEach(async () => {
    repository = new InMemoryPolicyRepository();
    registry = new PolicyRegistry(repository);
    await registry.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newRegistry = new PolicyRegistry(repository);
      await expect(newRegistry.initialize()).resolves.not.toThrow();
    });

    it('should report ready state after initialization', async () => {
      expect(registry.isReady()).toBe(true);
    });

    it('should shutdown cleanly', async () => {
      await expect(registry.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Policy Registration', () => {
    it('should register a simple policy', async () => {
      const policy = createTestPolicy({ id: 'simple-test' });
      await registry.register(policy);

      const retrieved = await registry.get(policyId.unsafe('simple-test'));
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('simple-test');
    });

    it('should register a composite policy', async () => {
      const policy = createTestCompositePolicy('composite-test');
      await registry.register(policy);

      const retrieved = await registry.get(policyId.unsafe('composite-test'));
      expect(retrieved).not.toBeNull();
      expect('rules' in retrieved!).toBe(true);
    });

    it('should register built-in WCAG 2.1 AA policy', async () => {
      await registry.register(WCAG21_AA_POLICY);
      const retrieved = await registry.get(policyId.unsafe('wcag21-aa'));
      expect(retrieved).not.toBeNull();
    });

    it('should register built-in WCAG 3.0 Silver policy', async () => {
      await registry.register(WCAG30_SILVER_POLICY);
      const retrieved = await registry.get(policyId.unsafe('wcag30-silver'));
      expect(retrieved).not.toBeNull();
    });
  });

  describe('Policy Retrieval', () => {
    beforeEach(async () => {
      await registry.register(createTestPolicy({ id: 'policy-1', priority: 'critical' }));
      await registry.register(createTestPolicy({ id: 'policy-2', priority: 'high' }));
      await registry.register(createTestPolicy({ id: 'policy-3', priority: 'medium' }));
    });

    it('should retrieve a policy by ID', async () => {
      const policy = await registry.get(policyId.unsafe('policy-1'));
      expect(policy).not.toBeNull();
      expect(policy?.id).toBe('policy-1');
    });

    it('should return null for non-existent policy', async () => {
      const policy = await registry.get(policyId.unsafe('non-existent'));
      expect(policy).toBeNull();
    });

    it('should list all registered policies', async () => {
      const policies = await registry.getAll();
      expect(policies.length).toBe(3);
    });
  });

  describe('Policy Disable', () => {
    it('should disable a policy', async () => {
      await registry.register(createTestPolicy({ id: 'to-remove' }));
      expect(await registry.get(policyId.unsafe('to-remove'))).not.toBeNull();

      await registry.disable(policyId.unsafe('to-remove'));
      expect(await registry.get(policyId.unsafe('to-remove'))).toBeNull();
    });

    it('should return false when disabling non-existent policy', async () => {
      const result = await registry.disable(policyId.unsafe('non-existent'));
      expect(result).toBe(false);
    });
  });

  describe('Context-Based Queries', () => {
    beforeEach(async () => {
      const darkModePolicy = createTestPolicy({
        id: 'dark-mode',
        applicableContexts: [{ colorScheme: 'dark' }],
      });

      const lightModePolicy = createTestPolicy({
        id: 'light-mode',
        applicableContexts: [{ colorScheme: 'light' }],
      });

      const mobilePolicy = createTestPolicy({
        id: 'mobile',
        applicableContexts: [{ viewport: 'mobile' }],
      });

      const universalPolicy = createTestPolicy({
        id: 'universal',
        applicableContexts: [], // Applies to all contexts
      });

      await registry.register(darkModePolicy);
      await registry.register(lightModePolicy);
      await registry.register(mobilePolicy);
      await registry.register(universalPolicy);
    });

    it('should find policies for dark mode context', async () => {
      const policies = await registry.findForContext({ colorScheme: 'dark' });
      expect(policies.some(p => p.id === 'dark-mode')).toBe(true);
      expect(policies.some(p => p.id === 'universal')).toBe(true);
      expect(policies.some(p => p.id === 'light-mode')).toBe(false);
    });

    it('should find policies for light mode context', async () => {
      const policies = await registry.findForContext({ colorScheme: 'light' });
      expect(policies.some(p => p.id === 'light-mode')).toBe(true);
      expect(policies.some(p => p.id === 'universal')).toBe(true);
      expect(policies.some(p => p.id === 'dark-mode')).toBe(false);
    });

    it('should find policies for mobile viewport', async () => {
      const policies = await registry.findForContext({ viewport: 'mobile' });
      expect(policies.some(p => p.id === 'mobile')).toBe(true);
      expect(policies.some(p => p.id === 'universal')).toBe(true);
    });

    it('should find universal policies for any context', async () => {
      const policies = await registry.findForContext({
        colorScheme: 'high-contrast',
        component: 'custom-widget',
      });
      expect(policies.some(p => p.id === 'universal')).toBe(true);
    });
  });

  describe('Priority Ordering', () => {
    beforeEach(async () => {
      await registry.register(createTestPolicy({ id: 'low', priority: 'low' }));
      await registry.register(createTestPolicy({ id: 'critical', priority: 'critical' }));
      await registry.register(createTestPolicy({ id: 'medium', priority: 'medium' }));
      await registry.register(createTestPolicy({ id: 'high', priority: 'high' }));
    });

    it('should return all policies and allow client-side sorting', async () => {
      const policies = await registry.getAll();

      // Verify all policies are returned
      expect(policies.length).toBe(4);
      expect(policies.some(p => p.id === 'critical')).toBe(true);
      expect(policies.some(p => p.id === 'high')).toBe(true);
      expect(policies.some(p => p.id === 'medium')).toBe(true);
      expect(policies.some(p => p.id === 'low')).toBe(true);
    });
  });

  describe('Policy Sets', () => {
    beforeEach(async () => {
      await registry.register(WCAG21_AA_POLICY);
      await registry.register(WCAG21_AAA_POLICY);
      await registry.register(WCAG30_SILVER_POLICY);
      await registry.register(BRAND_ACCESSIBILITY_BALANCED_POLICY);
    });

    it('should save a policy set', async () => {
      const set: PolicySet = {
        id: 'accessibility-basic',
        name: 'Accessibility Basic',
        description: 'Basic accessibility policy set',
        policies: [policyId.unsafe('wcag21-aa'), policyId.unsafe('wcag30-silver')],
        defaultEnforcement: 'strict',
        isDefault: false,
      };

      await registry.savePolicySet(set);

      const setPolicies = await registry.getPolicySet('accessibility-basic');
      expect(setPolicies).not.toBeNull();
      expect(setPolicies?.policies.length).toBe(2);
    });

    it('should retrieve policies from a set', async () => {
      const set: PolicySet = {
        id: 'brand-aware',
        name: 'Brand Aware',
        description: 'Brand aware policy set',
        policies: [policyId.unsafe('wcag21-aa'), policyId.unsafe('brand-accessibility-balanced')],
        defaultEnforcement: 'strict',
        isDefault: false,
      };

      await registry.savePolicySet(set);

      const setPolicies = await registry.getPolicySet('brand-aware');
      expect(setPolicies?.policies.includes(policyId.unsafe('wcag21-aa'))).toBe(true);
      expect(setPolicies?.policies.includes(policyId.unsafe('brand-accessibility-balanced'))).toBe(true);
    });

    it('should return null for non-existent set', async () => {
      const setPolicies = await registry.getPolicySet('non-existent');
      expect(setPolicies).toBeNull();
    });
  });

  describe('Policy Inheritance', () => {
    it('should resolve policy inheritance', async () => {
      // Create base policy
      const basePolicy = createTestPolicy({
        id: 'base-policy',
        requirements: { minContrastRatio: 3.0 },
      });

      // Create derived policy that extends base
      const derivedPolicy = createTestPolicy({
        id: 'derived-policy',
        extends: policyId.unsafe('base-policy'),
        requirements: { minContrastRatio: 4.5 },
      });

      await registry.register(basePolicy);
      await registry.register(derivedPolicy);

      const resolved = await registry.getInheritanceChain(policyId.unsafe('derived-policy'));
      expect(resolved.some(p => p.id === 'derived-policy')).toBe(true);
      expect(resolved.some(p => p.id === 'base-policy')).toBe(true);
    });
  });

  describe('Category-Based Queries', () => {
    beforeEach(async () => {
      await registry.register(createTestPolicy({
        id: 'a11y-1',
        category: 'accessibility',
      }));
      await registry.register(createTestPolicy({
        id: 'a11y-2',
        category: 'accessibility',
      }));
      await registry.register(createTestPolicy({
        id: 'brand-1',
        category: 'brand',
      }));
    });

    it('should find policies by category', async () => {
      const a11yPolicies = await registry.findByCategory('accessibility');
      expect(a11yPolicies.length).toBe(2);

      const brandPolicies = await registry.findByCategory('brand');
      expect(brandPolicies.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should track statistics', async () => {
      await registry.register(createTestPolicy({ id: 'metric-test-1' }));
      await registry.register(createTestPolicy({ id: 'metric-test-2' }));

      const stats = await registry.getStats();
      expect(stats.totalPolicies).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cache Management', () => {
    it('should use cache for repeated queries', async () => {
      await registry.register(createTestPolicy({ id: 'cache-test' }));

      // First call populates cache
      const first = await registry.get(policyId.unsafe('cache-test'));

      // Second call should use cache
      const second = await registry.get(policyId.unsafe('cache-test'));

      expect(first).toEqual(second);
    });

    it('should invalidate cache on registration', async () => {
      await registry.register(createTestPolicy({ id: 'cache-invalidate', name: 'Original' }));

      // Get cached
      await registry.get(policyId.unsafe('cache-invalidate'));

      // Update
      await registry.update(policyId.unsafe('cache-invalidate'), { name: 'Updated' });

      const updated = await registry.get(policyId.unsafe('cache-invalidate'));
      expect(updated?.name).toBe('Updated');
    });
  });
});

describe('PolicyRegistry Factory', () => {
  it('should create registry with factory function', async () => {
    const repository = new InMemoryPolicyRepository();
    const registry = createPolicyRegistry(repository);

    expect(registry).toBeInstanceOf(PolicyRegistry);
  });

  it('should create registry with custom config', async () => {
    const repository = new InMemoryPolicyRepository();
    const config = createRegistryConfig({
      enableCache: true,
      cacheTtlMs: 60000,
    });

    const registry = createPolicyRegistry(repository, config);
    expect(registry).toBeInstanceOf(PolicyRegistry);
  });
});

describe('Built-in Policies Integration', () => {
  let repository: InMemoryPolicyRepository;
  let registry: PolicyRegistry;

  beforeEach(async () => {
    repository = new InMemoryPolicyRepository();
    registry = new PolicyRegistry(repository);
    await registry.initialize();
  });

  it('should register multiple built-in policies', async () => {
    await registry.register(WCAG21_AA_POLICY);
    await registry.register(WCAG21_AAA_POLICY);
    await registry.register(WCAG30_SILVER_POLICY);
    await registry.register(WCAG30_GOLD_POLICY);
    await registry.register(HIGH_CONTRAST_MODE_POLICY);

    const policies = await registry.getAll();
    expect(policies.length).toBe(5);
  });

  it('should find all accessibility policies', async () => {
    await registry.register(WCAG21_AA_POLICY);
    await registry.register(WCAG30_SILVER_POLICY);
    await registry.register(BRAND_ACCESSIBILITY_BALANCED_POLICY);

    const a11yPolicies = await registry.findByCategory('accessibility');
    expect(a11yPolicies.length).toBeGreaterThanOrEqual(2);
  });
});
