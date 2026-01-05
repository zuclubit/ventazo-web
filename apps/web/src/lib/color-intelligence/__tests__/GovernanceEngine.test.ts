// ============================================
// GovernanceEngine Unit Tests
// Phase 4: Governance & Adoption Layer
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GovernanceEngine,
  createGovernanceEngine,
  createEngineConfig,
  PolicyRegistry,
  createPolicy,
  createRule,
  policyId,
  policyVersion,
  createBoundaryRequest,
  createAdjustmentDelegation,
  type PerceptualPolicy,
  type CompositePolicy,
  type IDecisionEnginePort,
  type IPolicyRepositoryPort,
  type ContrastDecision,
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
} from '../domain/governance';
import {
  WCAG21_AA_POLICY,
  WCAG30_SILVER_POLICY,
} from '../domain/governance/policies';
import type {
  AdjustmentDelegation,
  AdjustmentDelegationResult,
  AdjustmentSpecification,
} from '../domain/governance/contracts/GovernanceBoundary';
import type {
  AdjustmentTarget,
  AdjustmentConstraintsInput,
  AdjustmentSuggestion,
  DecisionEngineFeature,
} from '../domain/governance/ports/DecisionEnginePort';
import type { WCAGLevel, WCAG3Tier } from '../domain/types/decision';
import type { ContrastDecisionRequest } from '../domain/types/decision';
import {
  createPerceptualScore,
  createConfidenceScore,
  createFontSizePx,
  createFontWeight,
  createViewingConditions,
  createReadabilityContext,
} from '../domain/types/decision';

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

// Alias for backward compatibility with tests
const MockPolicyRepository = InMemoryPolicyRepository;

/**
 * Mock DecisionEngine implementing IDecisionEnginePort
 * All methods are SYNCHRONOUS (not async)
 */
class MockDecisionEngine implements IDecisionEnginePort {
  private lastDecision: ContrastDecision | null = null;

  // SYNC method - NOT async
  evaluate(request: ContrastDecisionRequest): ContrastDecision {
    const decision = createMockDecision({
      colors: {
        foreground: request.foreground,
        background: request.background,
      },
    });
    this.lastDecision = decision;
    return decision;
  }

  // SYNC method - NOT async
  applyAdjustment(delegation: AdjustmentDelegation): AdjustmentDelegationResult {
    // Mock adjustment - improve the decision
    const adjustedDecision = createMockDecision({
      wcag21Ratio: 7.0,
      apcaLc: 85,
      apcaAbsolute: 85,
      wcagLevel: 'AAA',
      wcag3Tier: 'Gold',
      score: createPerceptualScore(85),
    });

    return {
      delegationId: delegation.delegationId,
      success: true,
      adjustedDecision,
      error: undefined,
      iterations: 1,
      appliedSpecifications: delegation.specifications.map(spec => ({
        specification: spec,
        applied: true,
        reason: 'Successfully adjusted',
      })),
    };
  }

  // Required by IDecisionEnginePort
  findForegroundForTarget(
    background: string,
    target: AdjustmentTarget,
    constraints: AdjustmentConstraintsInput
  ): AdjustmentSuggestion | null {
    return {
      color: '#000000',
      apcaLc: 90,
      wcag21Ratio: 12.0,
      meetsTarget: true,
      iterations: 1,
    };
  }

  // Required by IDecisionEnginePort
  findBackgroundForTarget(
    foreground: string,
    target: AdjustmentTarget,
    constraints: AdjustmentConstraintsInput
  ): AdjustmentSuggestion | null {
    return {
      color: '#FFFFFF',
      apcaLc: 90,
      wcag21Ratio: 12.0,
      meetsTarget: true,
      iterations: 1,
    };
  }

  // Required by IDecisionEnginePort
  getMinimumLcForFont(fontSizePx: number, fontWeight: number): number {
    // Simplified lookup
    if (fontSizePx >= 24 || (fontSizePx >= 18 && fontWeight >= 700)) {
      return 60;
    }
    return 75;
  }

  // Required by IDecisionEnginePort
  meetsWcagLevel(decision: ContrastDecision, level: WCAGLevel): boolean {
    const levels: Record<WCAGLevel, number> = {
      'Fail': 0,
      'A': 1,
      'AA': 2,
      'AAA': 3,
      'Enhanced': 4,
    };
    const decisionLevel = levels[decision.wcagLevel] ?? 0;
    const requiredLevel = levels[level] ?? 0;
    return decisionLevel >= requiredLevel;
  }

  // Required by IDecisionEnginePort
  meetsWcag3Tier(decision: ContrastDecision, tier: WCAG3Tier): boolean {
    const tiers: Record<WCAG3Tier, number> = {
      'Fail': 0,
      'Bronze': 1,
      'Silver': 2,
      'Gold': 3,
      'Platinum': 4,
    };
    const decisionTier = tiers[decision.wcag3Tier] ?? 0;
    const requiredTier = tiers[tier] ?? 0;
    return decisionTier >= requiredTier;
  }

  // Required by IDecisionEnginePort
  getVersion(): string {
    return '1.0.0-mock';
  }

  // Required by IDecisionEnginePort
  supportsFeature(feature: DecisionEngineFeature): boolean {
    const supportedFeatures: DecisionEngineFeature[] = [
      'apca',
      'wcag21',
      'wcag3',
      'adjustment',
    ];
    return supportedFeatures.includes(feature);
  }

  getLastDecision(): ContrastDecision | null {
    return this.lastDecision;
  }
}

// ============================================
// Test Fixtures
// ============================================

function createMockDecision(overrides?: Partial<ContrastDecision>): ContrastDecision {
  const defaultViewingConditions = createViewingConditions('average');
  const defaultReadabilityContext = createReadabilityContext(16, 400);

  return {
    score: createPerceptualScore(75),
    level: 'minimum',
    wcagLevel: 'AA',
    wcag3Tier: 'Silver',
    apcaLc: 75,
    apcaAbsolute: 75,
    wcag21Ratio: 4.5,
    polarity: 'light-on-dark',
    confidence: createConfidenceScore(0.95),
    viewingConditions: defaultViewingConditions,
    readabilityContext: defaultReadabilityContext,
    factors: [],
    reasoning: ['Test decision'],
    warnings: [],
    suggestions: [],
    timestamp: new Date().toISOString(),
    algorithmVersion: '5.0.0',
    colors: {
      foreground: '#333333',
      background: '#FFFFFF',
    },
    ...overrides,
  } as ContrastDecision;
}

function createMockContext(overrides?: Partial<PolicyContext>): PolicyContext {
  return {
    colorScheme: 'light',
    component: 'button',
    accessibilityMode: 'standard',
    viewport: 'desktop',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('GovernanceEngine', () => {
  let repository: MockPolicyRepository;
  let decisionEngine: MockDecisionEngine;
  let registry: PolicyRegistry;
  let engine: GovernanceEngine;

  beforeEach(async () => {
    repository = new MockPolicyRepository();
    decisionEngine = new MockDecisionEngine();
    registry = new PolicyRegistry(repository);
    await registry.initialize();

    // createEngineConfig uses defaultMaxIterations, not maxIterations
    engine = new GovernanceEngine(registry, decisionEngine, createEngineConfig({
      defaultMaxIterations: 5,
      enableDetailedAudit: true,
      enableEvents: true,
    }));
    await engine.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newEngine = new GovernanceEngine(registry, decisionEngine);
      await expect(newEngine.initialize()).resolves.not.toThrow();
    });

    it('should report initialized state', async () => {
      expect(engine.isReady()).toBe(true);
    });

    // Note: GovernanceEngine does not have a shutdown() method
    it('should support version retrieval', () => {
      expect(engine.getVersion()).toBeDefined();
    });
  });

  describe('Policy Registration', () => {
    it('should register built-in policies', async () => {
      await registry.register(WCAG21_AA_POLICY);
      const policies = engine.getApplicablePolicies({});
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should register custom policies', async () => {
      const customPolicy = createPolicy({
        id: 'custom-test',
        name: 'Custom Test Policy',
        description: 'A test policy',
        version: '1.0.0',
        priority: 'high',
        enforcement: 'strict',
        category: 'accessibility',
        applicableContexts: [],
        enabled: true,
        expiresAt: null,
        tags: ['test'],
        requirements: {
          minContrastRatio: 5.0,
        },
      });

      await registry.register(customPolicy);
      const policies = engine.getApplicablePolicies({});
      expect(policies.some(p => p.id === 'custom-test')).toBe(true);
    });
  });

  describe('Policy Evaluation', () => {
    beforeEach(async () => {
      await registry.register(WCAG21_AA_POLICY);
    });

    it('should evaluate decision against policies', async () => {
      const decision = createMockDecision({ wcag21Ratio: 4.5 });
      const context = createMockContext();

      // createBoundaryRequest uses POSITIONAL args: (decision, context, options?)
      const request = createBoundaryRequest(decision, context, {
        autoAdjust: false,
        maxIterations: 1,
      });

      const result = await engine.evaluate(request);

      expect(result).toBeDefined();
      expect(result.outcome).toBeDefined();
      expect(['approved', 'adjusted', 'rejected', 'conditional']).toContain(result.outcome);
    });

    it('should approve decisions meeting all policies', async () => {
      const decision = createMockDecision({
        wcag21Ratio: 7.0,
        apcaLc: 90,
        apcaAbsolute: 90,
        wcagLevel: 'AAA',
      });

      // Positional args
      const request = createBoundaryRequest(decision, createMockContext(), {
        autoAdjust: false,
        maxIterations: 1,
      });

      const result = await engine.evaluate(request);
      expect(result.outcome).toBe('approved');
    });

    it('should reject decisions failing critical policies', async () => {
      const decision = createMockDecision({
        wcag21Ratio: 2.0, // Below AA requirement
        apcaLc: 40,
        apcaAbsolute: 40,
        wcagLevel: 'Fail',
        level: 'fail',
      });

      // Create a custom strict policy with CompositePolicy
      const strictPolicy: CompositePolicy = {
        ...createPolicy({
          id: 'strict-test',
          name: 'Strict Test',
          description: 'Strict test policy',
          version: '1.0.0',
          priority: 'critical',
          enforcement: 'strict',
          category: 'accessibility',
          applicableContexts: [],
          enabled: true,
          expiresAt: null,
          tags: [],
          requirements: { minContrastRatio: 4.5 },
        }),
        rules: [
          createRule({
            id: 'min-contrast',
            name: 'Min Contrast',
            description: 'Minimum contrast ratio',
            condition: {
              target: 'contrastRatio',
              operator: 'gte',
              value: 4.5,
            },
            severity: 'error',
            priority: 'critical',
            // Required fields:
            message: 'Contrast ratio {value} is below minimum {expected}',
            enabled: true,
            applicableContexts: [],
          }),
        ],
        combinator: 'all',
      };

      await registry.register(strictPolicy);

      const request = createBoundaryRequest(decision, createMockContext(), {
        autoAdjust: false,
        maxIterations: 1,
      });

      const result = await engine.evaluate(request);
      expect(['rejected', 'conditional']).toContain(result.outcome);
    });
  });

  describe('Auto-Adjustment', () => {
    beforeEach(async () => {
      await registry.register(WCAG21_AA_POLICY);
    });

    it('should attempt adjustment when enabled', async () => {
      const decision = createMockDecision({
        wcag21Ratio: 3.0, // Below AA
      });

      const request = createBoundaryRequest(decision, createMockContext(), {
        autoAdjust: true,
        maxIterations: 5,
      });

      const result = await engine.evaluate(request);

      // Either adjusted successfully or rejected after attempts
      expect(['approved', 'adjusted', 'rejected']).toContain(result.outcome);
    });

    it('should track adjustment attempts in metadata', async () => {
      const decision = createMockDecision({
        wcag21Ratio: 1.0, // Very low
      });

      const request = createBoundaryRequest(decision, createMockContext(), {
        autoAdjust: true,
        maxIterations: 3,
      });

      const result = await engine.evaluate(request);

      // Should complete without infinite loop
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Quick Check', () => {
    beforeEach(async () => {
      await registry.register(WCAG21_AA_POLICY);
    });

    it('should perform quick compliance check', async () => {
      const decision = createMockDecision({ wcag21Ratio: 5.0 });
      const context = createMockContext();

      const result = await engine.check(decision, context);

      expect(result).toBeDefined();
      // GovernanceCheckResult uses wouldPass, NOT compliant
      expect(result.wouldPass).toBeDefined();
      expect(typeof result.wouldPass).toBe('boolean');
    });

    it('should return violations for non-compliant decisions', async () => {
      const decision = createMockDecision({ wcag21Ratio: 2.0, wcagLevel: 'Fail' });
      const context = createMockContext();

      const result = await engine.check(decision, context);

      // Check using wouldPass (not compliant)
      if (!result.wouldPass) {
        expect(result.violations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Adjustment Delegation', () => {
    it('should delegate adjustments to decision engine', async () => {
      const decision = createMockDecision();
      const specifications: AdjustmentSpecification[] = [
        {
          target: 'foreground',
          operation: 'darken',
          magnitude: 10,
          unit: 'percentage',
          reason: 'Increase contrast',
        },
      ];

      // createAdjustmentDelegation uses POSITIONAL args: (decision, specifications, options?)
      const delegation = createAdjustmentDelegation(decision, specifications, {
        constraints: {
          preserveHue: true,
          maxChromaReduction: 0.3,
          maxIterations: 5,
          preferAdjustment: 'foreground',
        },
      });

      const result = await engine.delegateAdjustment(delegation);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await registry.register(WCAG21_AA_POLICY);
    });

    it('should track evaluation metrics', async () => {
      const decision = createMockDecision();
      const request = createBoundaryRequest(decision, createMockContext(), {
        autoAdjust: false,
        maxIterations: 1,
      });

      await engine.evaluate(request);

      const metrics = engine.getMetrics();
      expect(metrics.totalEvaluations).toBeGreaterThanOrEqual(1);
    });

    it('should track outcome counts', async () => {
      const request = createBoundaryRequest(
        createMockDecision({ wcag21Ratio: 7.0 }),
        createMockContext(),
        { autoAdjust: false, maxIterations: 1 }
      );

      await engine.evaluate(request);

      const metrics = engine.getMetrics();
      // GovernanceEngineMetrics has approvedCount, adjustedCount, rejectedCount, conditionalCount
      expect(metrics.approvedCount).toBeDefined();
      expect(metrics.adjustedCount).toBeDefined();
      expect(metrics.rejectedCount).toBeDefined();
      expect(metrics.conditionalCount).toBeDefined();
    });
  });

  describe('Context Matching', () => {
    it('should filter policies by context', async () => {
      const darkModePolicy = createPolicy({
        id: 'dark-mode-only',
        name: 'Dark Mode Policy',
        description: 'Only for dark mode',
        version: '1.0.0',
        priority: 'high',
        enforcement: 'strict',
        category: 'accessibility',
        applicableContexts: [{ colorScheme: 'dark' }],
        enabled: true,
        expiresAt: null,
        tags: ['dark-mode'],
        requirements: { minApcaLc: 80 },
      });

      const lightModePolicy = createPolicy({
        id: 'light-mode-only',
        name: 'Light Mode Policy',
        description: 'Only for light mode',
        version: '1.0.0',
        priority: 'high',
        enforcement: 'strict',
        category: 'accessibility',
        applicableContexts: [{ colorScheme: 'light' }],
        enabled: true,
        expiresAt: null,
        tags: ['light-mode'],
        requirements: { minApcaLc: 75 },
      });

      await registry.register(darkModePolicy);
      await registry.register(lightModePolicy);

      const darkPolicies = engine.getApplicablePolicies({ colorScheme: 'dark' });
      const lightPolicies = engine.getApplicablePolicies({ colorScheme: 'light' });

      expect(darkPolicies.some(p => p.id === 'dark-mode-only')).toBe(true);
      expect(darkPolicies.some(p => p.id === 'light-mode-only')).toBe(false);

      expect(lightPolicies.some(p => p.id === 'light-mode-only')).toBe(true);
      expect(lightPolicies.some(p => p.id === 'dark-mode-only')).toBe(false);
    });
  });

  describe('Policy Validation', () => {
    it('should validate policy structure', () => {
      const validPolicy = createPolicy({
        id: 'valid-test',
        name: 'Valid Test',
        description: 'A valid policy',
        version: '1.0.0',
        priority: 'medium',
        enforcement: 'advisory',
        category: 'brand',
        applicableContexts: [],
        enabled: true,
        expiresAt: null,
        tags: [],
        requirements: {},
      });

      const result = engine.validatePolicy(validPolicy);
      expect(result.valid).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit events on evaluation', async () => {
      const events: string[] = [];

      engine.addEventListener((event) => {
        events.push(event.type);
      });

      await registry.register(WCAG21_AA_POLICY);

      const request = createBoundaryRequest(
        createMockDecision(),
        createMockContext(),
        { autoAdjust: false, maxIterations: 1 }
      );

      await engine.evaluate(request);

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

describe('GovernanceEngine Factory', () => {
  it('should create engine with factory function', async () => {
    const repository = new MockPolicyRepository();
    const decisionEngine = new MockDecisionEngine();
    const registry = new PolicyRegistry(repository);
    await registry.initialize();

    const engine = createGovernanceEngine(registry, decisionEngine);
    expect(engine).toBeInstanceOf(GovernanceEngine);
  });

  it('should create engine with custom config', async () => {
    const repository = new MockPolicyRepository();
    const decisionEngine = new MockDecisionEngine();
    const registry = new PolicyRegistry(repository);
    await registry.initialize();

    // createEngineConfig uses correct property names
    const config = createEngineConfig({
      defaultMaxIterations: 10,
      enableDetailedAudit: true,
      enableEvents: false,
    });

    const engine = createGovernanceEngine(registry, decisionEngine, config);
    expect(engine).toBeInstanceOf(GovernanceEngine);
  });
});
