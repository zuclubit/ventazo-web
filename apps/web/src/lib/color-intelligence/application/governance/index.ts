// ============================================
// Application Governance Layer - Public Exports
// Phase 4: Governance & Adoption Layer
// ============================================
//
// This is the public API for the Governance application layer.
// It exports the main orchestrator (GovernanceEngine) and
// policy management (PolicyRegistry).
//
// ============================================

// ============================================
// Policy Registry
// ============================================

export {
  PolicyRegistry,
  createPolicyRegistry,
  createRegistryConfig,
  type PolicyRegistryConfig,
  type PolicyRegistryEvent,
  type PolicyRegistryEventType,
  type PolicyRegistryEventListener,
  type PolicyRegistryMetrics,
} from './PolicyRegistry';

// ============================================
// Governance Engine
// ============================================

export {
  GovernanceEngine,
  createGovernanceEngine,
  createEngineConfig,
  type GovernanceEngineConfig,
  type GovernanceEngineEvent,
  type GovernanceEngineEventType,
  type GovernanceEngineEventListener,
  type GovernanceEngineMetrics,
} from './GovernanceEngine';

// ============================================
// Re-export Domain Types
// ============================================

// Core policy types
export type {
  PerceptualPolicy,
  PolicyId,
  PolicyVersion,
  PolicyPriority,
  PolicyEnforcement,
  PolicyCategory,
  PolicyContext,
  PolicyMetadata,
  AccessibilityRequirements,
} from '../../domain/governance';

// Composition types
export type {
  CompositePolicy,
  PolicyRule,
  RuleId,
  RuleCombinator,
  PolicySet,
  ResolvedPolicy,
} from '../../domain/governance';

// Evaluation types
export type {
  GovernanceOutcome,
  GovernanceEvaluation,
  PolicyEvaluationResult,
  PolicyViolation,
  AdjustmentSpecification,
  AppliedAdjustment,
  AuditEntry,
  GovernanceSummary,
} from '../../domain/governance';

// Decision types (re-exported from domain)
export type {
  WCAGLevel,
  WCAG3Tier,
} from '../../domain/governance';

// ContrastDecision (from decision types)
export type {
  ContrastDecision,
  ContrastDecisionDTO,
  ContrastDecisionRequest,
} from '../../domain/types/decision';

// Boundary types
export type {
  IGovernanceBoundary,
  GovernanceBoundaryRequest,
  GovernanceBoundaryResponse,
  GovernanceCheckResult,
  AdjustmentDelegation,
  AdjustmentDelegationResult,
} from '../../domain/governance';

// Port types
export type {
  IDecisionEnginePort,
  IPolicyRepositoryPort,
} from '../../domain/governance';

// ============================================
// Re-export Domain Utilities
// ============================================

export {
  // Policy creation
  createPolicy,
  createPolicyContext,
  policyId,
  policyVersion,
  ruleId,

  // Rule creation
  createRule,
  createMinApcaLcRule,
  createMinContrastRatioRule,
  createMinWcagLevelRule,

  // Composition utilities
  mergeRequirements,
  createPolicySet,
  isCompositePolicy,

  // Validation
  validatePolicy,
  contextMatches,

  // Boundary utilities
  createBoundaryRequest,
  createAdjustmentDelegation,
  validateBoundaryRequest,
  DEFAULT_ADJUSTMENT_CONSTRAINTS,

  // Evaluation utilities
  createViolation,
  createAuditEntry,
  generateAuditHash,
  extractSummary,

  // Error classes
  GovernanceBoundaryError,
  PolicyRepositoryError,
  DecisionEnginePortError,
} from '../../domain/governance';

// ============================================
// Module Documentation
// ============================================

/**
 * @module application/governance
 *
 * The Governance Application Layer provides the main entry points
 * for policy-based color governance.
 *
 * ## Key Components
 *
 * - **GovernanceEngine**: Main orchestrator that evaluates decisions
 *   against policies and coordinates adjustments
 * - **PolicyRegistry**: Manages policy lifecycle, inheritance,
 *   and context-based querying
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   GovernanceEngine,
 *   PolicyRegistry,
 *   createPolicy,
 *   policyId,
 * } from './application/governance';
 *
 * // Create registry with in-memory storage
 * const registry = new PolicyRegistry(inMemoryRepository);
 * await registry.initialize();
 *
 * // Register a policy
 * await registry.register(createPolicy({
 *   id: 'wcag21-aa',
 *   name: 'WCAG 2.1 AA',
 *   priority: 'critical',
 *   enforcement: 'strict',
 *   category: 'accessibility',
 *   requirements: {
 *     minWcagLevel: 'AA',
 *     minContrastRatio: 4.5,
 *   },
 * }));
 *
 * // Create governance engine
 * const engine = new GovernanceEngine(registry, decisionEnginePort);
 * await engine.initialize();
 *
 * // Evaluate a decision
 * const result = await engine.evaluate({
 *   decision: contrastDecision,
 *   context: { colorScheme: 'light', component: 'Button' },
 *   autoAdjust: true,
 *   maxIterations: 5,
 * });
 *
 * console.log(result.outcome); // 'approved' | 'adjusted' | 'rejected' | 'conditional'
 * ```
 *
 * ## Architecture
 *
 * The application layer sits between domain types and infrastructure:
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │        Application Layer                │
 * │  ┌─────────────┐  ┌──────────────────┐ │
 * │  │ Governance  │  │  PolicyRegistry  │ │
 * │  │   Engine    │──│                  │ │
 * │  └─────────────┘  └──────────────────┘ │
 * └────────────┬─────────────────┬─────────┘
 *              │                 │
 *              ▼                 ▼
 * ┌─────────────────┐  ┌─────────────────┐
 * │ DecisionEngine  │  │ PolicyRepository│
 * │     Port        │  │      Port       │
 * └─────────────────┘  └─────────────────┘
 * ```
 *
 * ## See Also
 *
 * - `domain/governance` - Type definitions and contracts
 * - `infrastructure/governance` - Adapters and repositories
 * - `policies/` - Built-in policy definitions
 */
