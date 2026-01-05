// ============================================
// Governance Domain - Public Exports
// Phase 4: Governance & Adoption Layer
// ============================================
//
// This is the public API for the Governance domain layer.
// Only types and contracts are exported from the domain layer.
// Implementations live in application/infrastructure layers.
//
// ============================================

// ============================================
// Core Policy Types
// ============================================

export type {
  // Branded types
  PolicyId,
  PolicyVersion,
  RuleId,

  // Core interfaces
  PerceptualPolicy,
  PolicyInput,
  PolicyMetadata,

  // Classifications
  PolicyPriority,
  PolicyEnforcement,
  PolicyCategory,

  // Context
  PolicyContext,
  ColorScheme,
  AccessibilityMode,
  ViewportCategory,

  // Requirements
  AccessibilityRequirements,

  // Validation
  PolicyValidationError,
  PolicyValidationResult,
} from './types/policy';

export {
  // Branded type constructors
  policyId,
  policyVersion,
  ruleId,

  // Constants
  PRIORITY_ORDER,

  // Factory functions
  createPolicy,
  createPolicyVersion,
  createPolicyContext,

  // Utilities
  contextMatches,
  extractPolicyMetadata,
  validatePolicy,
} from './types/policy';

// ============================================
// Policy Composition Types
// ============================================

export type {
  // Rule types
  PolicyRule,
  RuleInput,
  RuleCondition,
  RuleOperator,
  RuleTarget,
  RuleCombinator,

  // Composite policy
  CompositePolicy,
  ResolvedPolicy,

  // Policy sets
  PolicySet,
} from './types/policy-composition';

export {
  // Type guards
  isCompositePolicy,

  // Rule factories
  createRule,
  createMinApcaLcRule,
  createMinContrastRatioRule,
  createMinWcagLevelRule,
  createMinFontSizeRule,

  // Composition utilities
  mergeRequirements,
  mergeContexts,
  mergeRules,
  getMostStrictEnforcement,
  getHighestPriority,

  // Set factories
  createPolicySet,
} from './types/policy-composition';

// ============================================
// Evaluation Types
// ============================================

export type {
  // Outcomes
  GovernanceOutcome,

  // Violations
  PolicyViolation,

  // Adjustments
  AdjustmentTarget,
  AdjustmentOperation,
  AdjustmentUnit,
  AdjustmentSpecification,
  AdjustmentConstraints,
  AppliedAdjustment,

  // Evaluation results
  PolicyEvaluationResult,
  RuleEvaluationResult,
  GovernanceEvaluation,

  // Audit
  AuditEntry,

  // Summaries
  GovernanceSummary,

  // Requests
  GovernanceEvaluationRequest,
} from './types/evaluation';

export {
  // Constants
  OUTCOME_SEVERITY,

  // Factories
  createViolation,
  createAuditEntry,
  createEvaluationRequest,

  // Utilities
  generateAuditHash,
  extractSummary,
} from './types/evaluation';

// ============================================
// Governance Boundary Contract
// ============================================

export type {
  // Request/Response
  GovernanceBoundaryRequest,
  GovernanceBoundaryResponse,

  // Adjustment delegation
  AdjustmentDelegation,
  AdjustmentConstraints as BoundaryAdjustmentConstraints,
  AdjustmentDelegationResult,

  // Records
  AppliedAdjustmentRecord,
  GovernanceMetadata,

  // Interface
  IGovernanceBoundary,

  // Check results
  GovernanceCheckResult,
  PolicyValidationResult as BoundaryPolicyValidationResult,

  // Validation
  BoundaryValidationResult,

  // Error codes
  GovernanceBoundaryErrorCode,
} from './contracts/GovernanceBoundary';

export {
  // Constants
  DEFAULT_ADJUSTMENT_CONSTRAINTS,

  // Factories
  createBoundaryRequest,
  createAdjustmentDelegation,
  createBoundaryError,

  // Validation
  validateBoundaryRequest,

  // Error class
  GovernanceBoundaryError,
} from './contracts/GovernanceBoundary';

// ============================================
// Decision Engine Port
// ============================================

export type {
  // Port interface
  IDecisionEnginePort,
  IDecisionEnginePortWithEvents,
  IDecisionEnginePortWithMetrics,

  // Adjustment types
  AdjustmentTarget as PortAdjustmentTarget,
  AdjustmentConstraintsInput,
  AdjustmentSuggestion,

  // Features
  DecisionEngineFeature,

  // Events
  DecisionEngineEvent,
  DecisionEngineEventType,
  DecisionEngineEventListener,

  // Metrics
  DecisionEngineMetrics,

  // Error codes
  DecisionEngineErrorCode,
} from './ports/DecisionEnginePort';

export {
  // Factories
  createAdjustmentTarget as createPortAdjustmentTarget,
  createAdjustmentConstraints as createPortAdjustmentConstraints,
  createPortError,

  // Error class
  DecisionEnginePortError,

  // Utilities
  isDecisionEnginePortError,
  validatePort as validateDecisionEnginePort,
} from './ports/DecisionEnginePort';

// ============================================
// Policy Repository Port
// ============================================

export type {
  // Port interfaces
  IPolicyRepositoryPort,
  IPolicyRepositoryPortWithEvents,
  IPolicyRepositoryPortWithQuery,

  // Operation results
  SavePolicyResult,
  SavePolicySetResult,
  ResolvedPolicyResult,
  InheritanceConflict,

  // Statistics
  RepositoryStats,

  // Events
  PolicyRepositoryEvent,
  PolicyRepositoryEventType,
  PolicyRepositoryEventListener,

  // Queries
  PolicyQueryOptions,
  PolicyQueryResult,

  // Error codes
  PolicyRepositoryErrorCode,
} from './ports/PolicyRepositoryPort';

export {
  // Error class
  PolicyRepositoryError,

  // Factories
  createRepositoryError,
  createQueryOptions,
  createRepositoryEvent,
  createEmptyStats,

  // Utilities
  isPolicyRepositoryError,
  validateRepositoryPort,
} from './ports/PolicyRepositoryPort';

// ============================================
// Re-export Decision Types (from Phase 3)
// ============================================
// These are needed by governance layer consumers

export type {
  ContrastDecision,
  ContrastDecisionRequest,
  WCAGLevel,
  WCAG3Tier,
  ViewingConditions,
  ReadabilityContext,
  ContrastPolarity,
} from '../types/decision';

// ============================================
// Module Documentation
// ============================================

/**
 * @module domain/governance
 *
 * The Governance Domain Layer for the Color Intelligence system.
 *
 * ## Architecture
 *
 * This layer follows hexagonal architecture:
 * - **Types**: Core domain types (Policy, Evaluation, etc.)
 * - **Contracts**: Boundary definitions (GovernanceBoundary)
 * - **Ports**: Interfaces to external systems (DecisionEngine, Repository)
 *
 * ## Key Principles
 *
 * 1. **Governance NEVER calculates colors** - only evaluates decisions
 * 2. **Policies define WHAT** - not HOW to achieve compliance
 * 3. **Immutability** - all types are readonly
 * 4. **Branded types** - compile-time safety for IDs
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   createPolicy,
 *   policyId,
 *   policyVersion,
 *   type PerceptualPolicy,
 *   type GovernanceEvaluation,
 * } from './domain/governance';
 *
 * const policy = createPolicy({
 *   id: 'wcag21-aa',
 *   name: 'WCAG 2.1 AA',
 *   description: 'Minimum accessibility for web content',
 *   priority: 'critical',
 *   enforcement: 'strict',
 *   category: 'accessibility',
 *   applicableContexts: [],
 *   enabled: true,
 *   expiresAt: null,
 *   tags: ['wcag', 'accessibility'],
 *   requirements: {
 *     minWcagLevel: 'AA',
 *     minContrastRatio: 4.5,
 *   },
 * });
 * ```
 *
 * ## See Also
 *
 * - `application/governance` - GovernanceEngine, PolicyRegistry
 * - `infrastructure/governance` - Adapters, Repositories
 * - `domain/types/decision` - ContrastDecision from Phase 3
 */
