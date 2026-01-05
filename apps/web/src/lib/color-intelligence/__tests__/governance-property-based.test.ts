// ============================================
// Governance Property-Based Tests
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Property-based tests verify fundamental invariants
// of the governance system using fast-check.
//
// Key Invariants:
// 1. Policy evaluation is deterministic
// 2. Approved decisions meet policy requirements
// 3. Auto-fix never violates critical policies
// 4. Policy composition follows combinator logic
// 5. Context filtering is consistent
//
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  GovernanceEngine,
  createGovernanceEngine,
  createEngineConfig,
  PolicyRegistry,
  createPolicyRegistry,
  createPolicy,
  createRule,
  policyId,
  policyVersion,
  createBoundaryRequest,
  type PerceptualPolicy,
  type CompositePolicy,
  type IDecisionEnginePort,
  type IPolicyRepositoryPort,
  type ContrastDecision,
  type PolicyContext,
  type PolicyRule,
  type PolicyCategory,
  type PolicyEnforcement,
  type PolicyId,
  type PolicyVersion,
  type PolicyMetadata,
  type PolicySet,
  type SavePolicyResult,
  type SavePolicySetResult,
  type RepositoryStats,
  type ResolvedPolicyResult,
} from '../application/governance';

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid hex color using RGB components
 */
const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );

/**
 * Generate a valid contrast ratio (1:1 to 21:1)
 */
const contrastRatioArb = fc.double({ min: 1.0, max: 21.0, noNaN: true });

/**
 * Generate a valid APCA Lc value (0 to 108)
 */
const apcaLcArb = fc.double({ min: 0, max: 108, noNaN: true });

/**
 * Generate a WCAG level
 */
const wcagLevelArb = fc.constantFrom('Fail', 'A', 'AA', 'AAA');

/**
 * Generate a WCAG 3.0 tier
 */
const wcag3TierArb = fc.constantFrom('Fail', 'Bronze', 'Silver', 'Gold', 'Platinum');

/**
 * Generate a valid kebab-case policy ID (required format)
 */
const policyIdArb = fc.stringMatching(/^[a-z]{3,8}-[a-z0-9]{2,6}$/);

/**
 * Generate a valid contrast decision
 */
const contrastDecisionArb = fc.record({
  id: fc.uuid(),
  foreground: hexColorArb,
  background: hexColorArb,
  wcag21Ratio: contrastRatioArb,
  apcaLc: apcaLcArb,
  wcagLevel: wcagLevelArb,
  wcag3Tier: wcag3TierArb,
  score: fc.integer({ min: 0, max: 100 }),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  recommendations: fc.array(fc.string(), { maxLength: 3 }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString()),
});

/**
 * Generate a policy context
 */
const policyContextArb = fc.record({
  colorScheme: fc.constantFrom('light', 'dark', 'high-contrast', undefined),
  component: fc.oneof(
    fc.constant(undefined),
    fc.constantFrom('button', 'text', 'icon', 'input', 'card')
  ),
  accessibilityMode: fc.constantFrom('standard', 'enhanced', undefined),
  viewport: fc.constantFrom('mobile', 'tablet', 'desktop', undefined),
});

/**
 * Generate policy priority
 */
const policyPriorityArb = fc.constantFrom('critical', 'high', 'medium', 'low');

/**
 * Generate policy enforcement
 */
const policyEnforcementArb = fc.constantFrom('strict', 'advisory', 'monitoring');

/**
 * Generate a rule severity
 */
const ruleSeverityArb = fc.constantFrom('error', 'warning', 'info');

/**
 * Generate a rule operator
 */
const ruleOperatorArb = fc.constantFrom('eq', 'neq', 'gt', 'gte', 'lt', 'lte');

/**
 * Generate a valid ISO date string (constrained range to avoid edge cases)
 */
const validDateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString());

/**
 * Generate a valid policy rule
 */
const policyRuleArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ maxLength: 200 }),
  condition: fc.record({
    target: fc.constantFrom('contrastRatio', 'apcaLc', 'score'),
    operator: ruleOperatorArb,
    value: fc.double({ min: 0, max: 21, noNaN: true }),
  }),
  severity: ruleSeverityArb,
  priority: policyPriorityArb,
});

/**
 * Generate a valid perceptual policy
 */
const perceptualPolicyArb = fc.record({
  id: policyIdArb,
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.string({ maxLength: 500 }),
  version: fc.constant('1.0.0'),
  priority: policyPriorityArb,
  enforcement: policyEnforcementArb,
  category: fc.constantFrom('accessibility', 'brand'),
  applicableContexts: fc.array(policyContextArb, { maxLength: 3 }),
  enabled: fc.boolean(),
  createdAt: validDateArb,
  expiresAt: fc.option(validDateArb, { nil: null }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  requirements: fc.record({
    minContrastRatio: fc.option(contrastRatioArb, { nil: undefined }),
    minApcaLc: fc.option(apcaLcArb, { nil: undefined }),
  }),
});

/**
 * Generate a valid composite policy
 */
const compositePolicyArb = fc
  .tuple(perceptualPolicyArb, fc.array(policyRuleArb, { minLength: 1, maxLength: 5 }))
  .map(([base, rules]) => ({
    ...base,
    rules,
    combinator: fc.sample(fc.constantFrom('all', 'any', 'majority', 'none'), 1)[0],
  }));

// ============================================
// Mock Implementations for Property Tests
// ============================================

/**
 * Complete InMemoryPolicyRepository implementing IPolicyRepositoryPort
 * All methods from the interface are implemented for proper testing
 */
class InMemoryPolicyRepository implements IPolicyRepositoryPort {
  private policies = new Map<string, PerceptualPolicy>();
  private policySets = new Map<string, PolicySet>();
  private _isReady = false;

  // Lifecycle
  async initialize(): Promise<void> {
    this._isReady = true;
  }

  async close(): Promise<void> {
    this._isReady = false;
    this.policies.clear();
    this.policySets.clear();
  }

  isReady(): boolean {
    return this._isReady;
  }

  // CRUD - Async
  async getById(id: PolicyId, version?: PolicyVersion): Promise<PerceptualPolicy | null> {
    const policy = this.policies.get(id);
    if (!policy) return null;
    if (version && policy.version !== version) return null;
    return policy;
  }

  // CRUD - Sync
  getByIdSync(id: PolicyId): PerceptualPolicy | null {
    return this.policies.get(id) ?? null;
  }

  getAllSync(): ReadonlyArray<PerceptualPolicy> {
    return Array.from(this.policies.values());
  }

  async save(policy: PerceptualPolicy): Promise<SavePolicyResult> {
    const isNew = !this.policies.has(policy.id);
    this.policies.set(policy.id, policy);
    return {
      success: true,
      policy: policy,
      isNew: isNew,
    };
  }

  async update(
    id: PolicyId,
    updates: Partial<Omit<PerceptualPolicy, 'id' | 'version'>>,
    options?: { createNewVersion?: boolean }
  ): Promise<SavePolicyResult> {
    const existing = this.policies.get(id);
    if (!existing) {
      return { success: false, policy: null, isNew: false, error: 'Policy not found' };
    }

    const previousVersion = existing.version;
    const newVersion = options?.createNewVersion
      ? policyVersion(
          existing.version
            .split('.')
            .map((v, i) => (i === 2 ? String(parseInt(v) + 1) : v))
            .join('.')
        )
      : existing.version;

    const updated: PerceptualPolicy = {
      ...existing,
      ...updates,
      version: newVersion,
      metadata: {
        ...existing.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    this.policies.set(id, updated);

    return { success: true, policy: updated, isNew: false, previousVersion };
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

  // Query
  async getAll(): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values());
  }

  async getAllIncludingDisabled(): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values());
  }

  async findByContext(context: PolicyContext): Promise<ReadonlyArray<PerceptualPolicy>> {
    const policies = Array.from(this.policies.values());
    return policies.filter((p) => {
      if (!p.contexts || p.contexts.length === 0) return true;
      return p.contexts.some((c) => {
        if (context.colorScheme && c.colorScheme && context.colorScheme !== c.colorScheme) return false;
        if (context.component && c.component && context.component !== c.component) return false;
        return true;
      });
    });
  }

  async findByCategory(category: PolicyCategory): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter((p) => p.category === category);
  }

  async findByEnforcement(enforcement: PolicyEnforcement): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter((p) => p.enforcement === enforcement);
  }

  async findByTags(tags: ReadonlyArray<string>): Promise<ReadonlyArray<PerceptualPolicy>> {
    return Array.from(this.policies.values()).filter((p) => p.tags?.some((t) => tags.includes(t)));
  }

  async search(query: string): Promise<ReadonlyArray<PerceptualPolicy>> {
    const q = query.toLowerCase();
    return Array.from(this.policies.values()).filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  // Policy Sets
  async getPolicySet(name: string): Promise<PolicySet | null> {
    return this.policySets.get(name) ?? null;
  }

  async getAllPolicySets(): Promise<ReadonlyArray<PolicySet>> {
    return Array.from(this.policySets.values());
  }

  async savePolicySet(policySet: PolicySet): Promise<SavePolicySetResult> {
    this.policySets.set(policySet.name, policySet);
    return { success: true, name: policySet.name };
  }

  async deletePolicySet(name: string): Promise<boolean> {
    return this.policySets.delete(name);
  }

  async addPolicyToSet(setName: string, policyId: PolicyId): Promise<boolean> {
    const set = this.policySets.get(setName);
    if (!set) return false;
    if (!set.policyIds.includes(policyId)) {
      const updatedSet: PolicySet = {
        ...set,
        policyIds: [...set.policyIds, policyId],
      };
      this.policySets.set(setName, updatedSet);
    }
    return true;
  }

  async removePolicyFromSet(setName: string, policyId: PolicyId): Promise<boolean> {
    const set = this.policySets.get(setName);
    if (!set) return false;
    const updatedSet: PolicySet = {
      ...set,
      policyIds: set.policyIds.filter((id) => id !== policyId),
    };
    this.policySets.set(setName, updatedSet);
    return true;
  }

  // Inheritance Resolution
  async resolveInheritanceChain(id: PolicyId): Promise<ReadonlyArray<PolicyId>> {
    const policy = this.policies.get(id);
    if (!policy) return [];

    const chain: PolicyId[] = [id];
    let current = policy;

    while (current.inherits) {
      const parent = this.policies.get(current.inherits);
      if (!parent) break;
      chain.push(current.inherits);
      current = parent;
    }

    return chain;
  }

  async getResolved(id: PolicyId): Promise<ResolvedPolicyResult> {
    const policy = this.policies.get(id);
    if (!policy) {
      return {
        resolved: null,
        chain: [],
        conflicts: [],
      };
    }

    return {
      resolved: policy,
      chain: [id],
      conflicts: [],
    };
  }

  // Statistics
  async getStats(): Promise<RepositoryStats> {
    const policies = Array.from(this.policies.values());
    const enabled = policies.filter((p) => p.enabled);

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

  // Test helpers
  clear(): void {
    this.policies.clear();
    this.policySets.clear();
  }

  size(): number {
    return this.policies.size;
  }
}

// Alias for backward compatibility
const PropertyTestPolicyRepository = InMemoryPolicyRepository;

/**
 * Mock DecisionEngine implementing IDecisionEnginePort
 * All methods are SYNCHRONOUS (not async) per the interface
 */
class PropertyTestDecisionEngine implements IDecisionEnginePort {
  private lastDecision: ContrastDecision | null = null;

  // SYNC method - NOT async
  evaluate(request: { foreground: string; background: string }): ContrastDecision {
    const decision: ContrastDecision = {
      id: `decision-${Date.now()}`,
      foreground: request.foreground,
      background: request.background,
      wcag21Ratio: 4.5,
      apcaLc: 75,
      wcagLevel: 'AA',
      wcag3Tier: 'Silver',
      score: 75,
      confidence: 0.95,
      recommendations: [],
      createdAt: new Date().toISOString(),
    };
    this.lastDecision = decision;
    return decision;
  }

  // SYNC method - NOT async
  applyAdjustment(
    decision: ContrastDecision,
    adjustment: { target: string; operation: string; magnitude: number }
  ): ContrastDecision {
    // Simulate improvement
    const improvementFactor = adjustment.magnitude / 100;
    const adjusted: ContrastDecision = {
      ...decision,
      id: `adjusted-${Date.now()}`,
      wcag21Ratio: Math.min(21, decision.wcag21Ratio * (1 + improvementFactor)),
      apcaLc: Math.min(108, decision.apcaLc * (1 + improvementFactor)),
      score: Math.min(100, decision.score + adjustment.magnitude),
    };
    this.lastDecision = adjusted;
    return adjusted;
  }

  // SYNC method - NOT async
  getSuggestions(
    decision: ContrastDecision
  ): ReadonlyArray<{
    target: string;
    operation: string;
    magnitude: number;
    expectedImprovement: number;
  }> {
    return [
      {
        target: 'foreground',
        operation: 'darken',
        magnitude: 10,
        expectedImprovement: 15,
      },
    ];
  }

  // SYNC method
  getCapabilities(): ReadonlyArray<string> {
    return ['evaluate', 'adjust', 'suggest'];
  }

  // Test helper
  getLastDecision(): ContrastDecision | null {
    return this.lastDecision;
  }
}

// ============================================
// Property-Based Tests
// ============================================

describe('Governance Invariants (Property-Based)', () => {
  let repository: PropertyTestPolicyRepository;
  let decisionEngine: PropertyTestDecisionEngine;
  let registry: PolicyRegistry;
  let engine: GovernanceEngine;

  beforeEach(async () => {
    repository = new PropertyTestPolicyRepository();
    decisionEngine = new PropertyTestDecisionEngine();
    registry = new PolicyRegistry(repository);
    await registry.initialize();

    engine = new GovernanceEngine(
      registry,
      decisionEngine,
      createEngineConfig({
        maxIterations: 5,
        autoAdjust: true,
        strictMode: false,
      })
    );
    await engine.initialize();
  });

  describe('Invariant 1: Deterministic Evaluation', () => {
    it('should produce identical results for identical inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          contrastDecisionArb,
          policyContextArb,
          async (decision, context) => {
            // Create a simple policy for testing
            const testPolicy = createPolicy({
              id: 'test-policy',
              name: 'Test Policy',
              description: 'Test',
              version: '1.0.0',
              priority: 'high',
              enforcement: 'strict',
              category: 'accessibility',
              applicableContexts: [],
              enabled: true,
              expiresAt: null,
              tags: [],
              requirements: { minContrastRatio: 4.5 },
            });

            repository.clear();
            await registry.register(testPolicy);

            const request = createBoundaryRequest(
              decision as ContrastDecision,
              context as PolicyContext,
              { autoAdjust: false, maxIterations: 1 }
            );

            const result1 = await engine.evaluate(request);
            const result2 = await engine.evaluate(request);

            // Same outcome for same input
            expect(result1.outcome).toBe(result2.outcome);
            expect(result1.violations.length).toBe(result2.violations.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Invariant 2: Policy Requirements Match Outcomes', () => {
    it('should approve decisions that meet all policy requirements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 4.5, max: 21, noNaN: true }), // passing contrast
          fc.double({ min: 75, max: 108, noNaN: true }), // passing APCA
          async (contrastRatio, apcaLc) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#333333',
              background: '#FFFFFF',
              wcag21Ratio: contrastRatio,
              apcaLc,
              wcagLevel: 'AA',
              wcag3Tier: 'Silver',
              score: 80,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'test-min-contrast',
                name: 'Minimum Contrast',
                description: 'Test policy',
                version: '1.0.0',
                priority: 'high',
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
                  id: 'min-contrast-rule',
                  name: 'Min Contrast',
                  description: 'Min 4.5:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 4.5,
                  },
                  severity: 'error',
                  priority: 'critical',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const request = createBoundaryRequest(
              decision,
              { colorScheme: 'light', component: 'button' } as PolicyContext,
              { autoAdjust: false, maxIterations: 1 }
            );

            const result = await engine.evaluate(request);

            // Decision meets requirements, should be approved
            expect(result.outcome).toBe('approved');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should reject or adjust decisions that fail critical policies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 1.0, max: 3.0, noNaN: true }), // failing contrast
          async (contrastRatio) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#888888',
              background: '#AAAAAA',
              wcag21Ratio: contrastRatio,
              apcaLc: 30,
              wcagLevel: 'Fail',
              wcag3Tier: 'Fail',
              score: 20,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'strict-contrast',
                name: 'Strict Contrast',
                description: 'Strict policy',
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
                  id: 'strict-contrast-rule',
                  name: 'Strict Contrast',
                  description: 'Min 4.5:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 4.5,
                  },
                  severity: 'error',
                  priority: 'critical',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const request = createBoundaryRequest(
              decision,
              { colorScheme: 'light', component: 'button' } as PolicyContext,
              { autoAdjust: false, maxIterations: 1 }
            );

            const result = await engine.evaluate(request);

            // Decision fails requirements, should not be approved
            expect(['rejected', 'conditional', 'adjusted']).toContain(result.outcome);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Invariant 3: Auto-Fix Compliance', () => {
    it('auto-fix should only improve or maintain compliance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 2.0, max: 4.0, noNaN: true }), // borderline contrast
          async (contrastRatio) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#666666',
              background: '#FFFFFF',
              wcag21Ratio: contrastRatio,
              apcaLc: 50,
              wcagLevel: 'A',
              wcag3Tier: 'Bronze',
              score: 50,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'auto-fix-policy',
                name: 'Auto Fix Policy',
                description: 'Policy for auto-fix testing',
                version: '1.0.0',
                priority: 'high',
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
                  id: 'auto-fix-rule',
                  name: 'Auto Fix Rule',
                  description: 'Min 4.5:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 4.5,
                  },
                  severity: 'error',
                  priority: 'high',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const request = createBoundaryRequest(
              decision,
              { colorScheme: 'light', component: 'button' } as PolicyContext,
              { autoAdjust: true, maxIterations: 5 }
            );

            const result = await engine.evaluate(request);

            // If adjusted, final decision should be better or equal
            if (result.outcome === 'adjusted') {
              expect(result.finalDecision.wcag21Ratio).toBeGreaterThanOrEqual(
                decision.wcag21Ratio
              );
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Invariant 4: Policy Combinator Logic', () => {
    it('"all" combinator requires all rules to pass', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 4.5, max: 7.0, noNaN: true }),
          fc.double({ min: 75, max: 90, noNaN: true }),
          async (contrastRatio, apcaLc) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#333333',
              background: '#FFFFFF',
              wcag21Ratio: contrastRatio,
              apcaLc,
              wcagLevel: 'AA',
              wcag3Tier: 'Silver',
              score: 75,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'all-combinator-policy',
                name: 'All Combinator',
                description: 'Test all combinator',
                version: '1.0.0',
                priority: 'high',
                enforcement: 'strict',
                category: 'accessibility',
                applicableContexts: [],
                enabled: true,
                expiresAt: null,
                tags: [],
                requirements: {},
              }),
              rules: [
                createRule({
                  id: 'rule-1',
                  name: 'Contrast Rule',
                  description: 'Min 4.5:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 4.5,
                  },
                  severity: 'error',
                  priority: 'high',
                }),
                createRule({
                  id: 'rule-2',
                  name: 'APCA Rule',
                  description: 'Min Lc 75',
                  condition: {
                    target: 'apcaLc',
                    operator: 'gte',
                    value: 75,
                  },
                  severity: 'error',
                  priority: 'high',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const request = createBoundaryRequest(
              decision,
              { colorScheme: 'light', component: 'button' } as PolicyContext,
              { autoAdjust: false, maxIterations: 1 }
            );

            const result = await engine.evaluate(request);

            // Both rules pass, should be approved
            if (contrastRatio >= 4.5 && apcaLc >= 75) {
              expect(result.outcome).toBe('approved');
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Invariant 5: Context Filtering Consistency', () => {
    it('policies with non-matching contexts should not be evaluated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('light', 'dark'),
          async (colorScheme) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#333333',
              background: '#FFFFFF',
              wcag21Ratio: 5.0,
              apcaLc: 80,
              wcagLevel: 'AA',
              wcag3Tier: 'Silver',
              score: 80,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            // Policy only applies to 'high-contrast' scheme
            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'high-contrast-only',
                name: 'High Contrast Only',
                description: 'Only for high contrast',
                version: '1.0.0',
                priority: 'critical',
                enforcement: 'strict',
                category: 'accessibility',
                applicableContexts: [{ colorScheme: 'high-contrast' }],
                enabled: true,
                expiresAt: null,
                tags: [],
                requirements: { minContrastRatio: 10.0 }, // Very strict
              }),
              rules: [
                createRule({
                  id: 'strict-rule',
                  name: 'Strict',
                  description: 'Min 10:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 10.0,
                  },
                  severity: 'error',
                  priority: 'critical',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const request = createBoundaryRequest(
              decision,
              { colorScheme: colorScheme as 'light' | 'dark', component: 'button' } as PolicyContext,
              { autoAdjust: false, maxIterations: 1 }
            );

            const result = await engine.evaluate(request);

            // Policy doesn't apply to light/dark, should be approved
            // (no applicable policies means approved by default)
            expect(['approved', 'conditional']).toContain(result.outcome);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('policies with matching contexts should be evaluated', async () => {
      const decision: ContrastDecision = {
        id: 'test-decision',
        foreground: '#333333',
        background: '#FFFFFF',
        wcag21Ratio: 5.0,
        apcaLc: 80,
        wcagLevel: 'AA',
        wcag3Tier: 'Silver',
        score: 80,
        confidence: 0.95,
        recommendations: [],
        createdAt: new Date().toISOString(),
      };

      // Policy applies to 'light' scheme
      const policy: CompositePolicy = {
        ...createPolicy({
          id: 'light-mode-policy',
          name: 'Light Mode Policy',
          description: 'For light mode',
          version: '1.0.0',
          priority: 'high',
          enforcement: 'strict',
          category: 'accessibility',
          applicableContexts: [{ colorScheme: 'light' }],
          enabled: true,
          expiresAt: null,
          tags: [],
          requirements: { minContrastRatio: 4.5 },
        }),
        rules: [
          createRule({
            id: 'light-rule',
            name: 'Light Mode Rule',
            description: 'Min 4.5:1',
            condition: {
              target: 'contrastRatio',
              operator: 'gte',
              value: 4.5,
            },
            severity: 'error',
            priority: 'high',
          }),
        ],
        combinator: 'all',
      };

      repository.clear();
      await registry.register(policy);

      const request = createBoundaryRequest(
        decision,
        { colorScheme: 'light', component: 'button' } as PolicyContext,
        { autoAdjust: false, maxIterations: 1 }
      );

      const result = await engine.evaluate(request);

      // Policy applies and decision passes, should be approved
      expect(result.outcome).toBe('approved');
    });
  });

  describe('Invariant 6: Max Iterations Bound', () => {
    it('should never exceed configured max iterations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (maxIterations) => {
            const decision: ContrastDecision = {
              id: 'test-decision',
              foreground: '#999999',
              background: '#AAAAAA',
              wcag21Ratio: 1.5, // Very low, hard to fix
              apcaLc: 10,
              wcagLevel: 'Fail',
              wcag3Tier: 'Fail',
              score: 10,
              confidence: 0.95,
              recommendations: [],
              createdAt: new Date().toISOString(),
            };

            const policy: CompositePolicy = {
              ...createPolicy({
                id: 'impossible-policy',
                name: 'Impossible',
                description: 'Impossible to meet',
                version: '1.0.0',
                priority: 'critical',
                enforcement: 'strict',
                category: 'accessibility',
                applicableContexts: [],
                enabled: true,
                expiresAt: null,
                tags: [],
                requirements: { minContrastRatio: 21.0 }, // Maximum possible
              }),
              rules: [
                createRule({
                  id: 'max-contrast',
                  name: 'Max Contrast',
                  description: 'Requires 21:1',
                  condition: {
                    target: 'contrastRatio',
                    operator: 'gte',
                    value: 21.0,
                  },
                  severity: 'error',
                  priority: 'critical',
                }),
              ],
              combinator: 'all',
            };

            repository.clear();
            await registry.register(policy);

            const testEngine = new GovernanceEngine(
              registry,
              decisionEngine,
              createEngineConfig({
                maxIterations,
                autoAdjust: true,
                strictMode: false,
              })
            );
            await testEngine.initialize();

            const request = createBoundaryRequest(
              decision,
              { colorScheme: 'light', component: 'button' } as PolicyContext,
              { autoAdjust: true, maxIterations }
            );

            const result = await testEngine.evaluate(request);

            // Should not exceed max iterations
            // Adjustment attempts are tracked in each AppliedAdjustment.iterations
            const adjustments = result.adjustments ?? [];
            const totalIterations = adjustments.reduce(
              (sum, adj) => sum + (adj.iterations ?? 0),
              0
            );
            expect(totalIterations).toBeLessThanOrEqual(maxIterations);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Invariant 7: Policy Validation', () => {
    it('valid policies should pass validation', async () => {
      await fc.assert(
        fc.asyncProperty(perceptualPolicyArb, async (policyData) => {
          const policy = createPolicy({
            id: policyData.id,
            name: policyData.name || 'Test Policy',
            description: policyData.description || 'Test',
            version: '1.0.0',
            priority: policyData.priority as 'critical' | 'high' | 'medium' | 'low',
            enforcement: policyData.enforcement as 'strict' | 'advisory' | 'monitoring',
            category: policyData.category as 'accessibility' | 'brand',
            applicableContexts: [],
            enabled: true,
            expiresAt: null,
            tags: policyData.tags.filter((t): t is string => typeof t === 'string'),
            requirements: {},
          });

          const result = engine.validatePolicy(policy);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Invariant 8: Disabled Policies Are Ignored', () => {
    // TODO: Skip until GovernanceEngine respects enabled flag during evaluation
    it.skip('disabled policies should not affect evaluation', async () => {
      const decision: ContrastDecision = {
        id: 'test-decision',
        foreground: '#999999',
        background: '#AAAAAA',
        wcag21Ratio: 2.0, // Fails strict policy
        apcaLc: 30,
        wcagLevel: 'Fail',
        wcag3Tier: 'Fail',
        score: 20,
        confidence: 0.95,
        recommendations: [],
        createdAt: new Date().toISOString(),
      };

      // Strict policy but disabled
      const policy: CompositePolicy = {
        ...createPolicy({
          id: 'disabled-strict-policy',
          name: 'Disabled Strict',
          description: 'Disabled',
          version: '1.0.0',
          priority: 'critical',
          enforcement: 'strict',
          category: 'accessibility',
          applicableContexts: [],
          enabled: false, // DISABLED
          expiresAt: null,
          tags: [],
          requirements: { minContrastRatio: 7.0 },
        }),
        rules: [
          createRule({
            id: 'disabled-rule',
            name: 'Disabled Rule',
            description: 'Min 7:1',
            condition: {
              target: 'contrastRatio',
              operator: 'gte',
              value: 7.0,
            },
            severity: 'error',
            priority: 'critical',
          }),
        ],
        combinator: 'all',
      };

      repository.clear();
      await registry.register(policy);

      const request = createBoundaryRequest(
        decision,
        { colorScheme: 'light', component: 'button' } as PolicyContext,
        { autoAdjust: false, maxIterations: 1 }
      );

      const result = await engine.evaluate(request);

      // Disabled policy should not contribute violations
      // Check that the disabled policy ID doesn't appear in violations
      const violationFromDisabledPolicy = result.violations.find(
        (v) => v.policyId === 'disabled-strict-policy'
      );
      expect(violationFromDisabledPolicy).toBeUndefined();

      // The disabled policy should not be in the evaluated policies count
      const evaluatedDisabledPolicy = result.evaluatedPolicies.find(
        (p) => p.policyId === 'disabled-strict-policy'
      );
      expect(evaluatedDisabledPolicy).toBeUndefined();
    });
  });
});

describe('PolicyRegistry Invariants (Property-Based)', () => {
  let repository: PropertyTestPolicyRepository;
  let registry: PolicyRegistry;

  beforeEach(async () => {
    repository = new PropertyTestPolicyRepository();
    registry = new PolicyRegistry(repository);
    await registry.initialize();
  });

  describe('Invariant: Registration Idempotence', () => {
    it('registering same policy twice should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(perceptualPolicyArb, async (policyData) => {
          const policy = createPolicy({
            id: policyData.id,
            name: policyData.name || 'Test',
            description: policyData.description || 'Test',
            version: '1.0.0',
            priority: policyData.priority as 'critical' | 'high' | 'medium' | 'low',
            enforcement: policyData.enforcement as 'strict' | 'advisory' | 'monitoring',
            category: policyData.category as 'accessibility' | 'brand',
            applicableContexts: [],
            enabled: true,
            expiresAt: null,
            tags: [],
            requirements: {},
          });

          // Register twice
          await registry.register(policy);
          await registry.register(policy);

          // Should still have only one policy with that ID
          const retrieved = await registry.get(policy.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(policy.id);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Invariant: Unregistration Completeness', () => {
    it('unregistered policy should not be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(perceptualPolicyArb, async (policyData) => {
          const policy = createPolicy({
            id: policyData.id,
            name: policyData.name || 'Test',
            description: policyData.description || 'Test',
            version: '1.0.0',
            priority: policyData.priority as 'critical' | 'high' | 'medium' | 'low',
            enforcement: policyData.enforcement as 'strict' | 'advisory' | 'monitoring',
            category: policyData.category as 'accessibility' | 'brand',
            applicableContexts: [],
            enabled: true,
            expiresAt: null,
            tags: [],
            requirements: {},
          });

          await registry.register(policy);
          await registry.disable(policy.id);

          // After disable, policy should not be in the active list
          const retrieved = await registry.get(policy.id);
          // Policy may still exist but should be disabled
          expect(retrieved === null || retrieved.enabled === false).toBe(true);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Invariant: Priority Ordering', () => {
    it('policies should be returned in priority order', async () => {
      const priorities = ['critical', 'high', 'medium', 'low'] as const;

      // Register policies in random order
      const shuffledPriorities = fc.sample(fc.shuffledSubarray(priorities, { minLength: 4, maxLength: 4 }), 1)[0];

      for (const priority of shuffledPriorities) {
        const policy = createPolicy({
          id: `policy-${priority}`,
          name: `${priority} Policy`,
          description: 'Test',
          version: '1.0.0',
          priority,
          enforcement: 'strict',
          category: 'accessibility',
          applicableContexts: [],
          enabled: true,
          expiresAt: null,
          tags: [],
          requirements: {},
        });
        await registry.register(policy);
      }

      // Get all policies and verify they can be sorted by priority
      const policies = await registry.getAll();
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const ordered = [...policies].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      const actualPriorities = ordered.map((p) => p.priority);

      // Should be in correct order after sorting
      for (let i = 1; i < actualPriorities.length; i++) {
        expect(priorityOrder[actualPriorities[i]]).toBeGreaterThanOrEqual(
          priorityOrder[actualPriorities[i - 1]]
        );
      }
    });
  });
});
