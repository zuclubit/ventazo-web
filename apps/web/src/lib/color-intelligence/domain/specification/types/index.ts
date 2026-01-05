// ============================================
// Specification Types - Public Exports
// Phase 5: Standardization Layer
// ============================================
//
// This module exports all types required for the formal
// Color Intelligence specification system.
//
// ============================================

// ============================================
// Core Specification Types
// ============================================

export {
  // Branded types
  type SpecificationId,
  createSpecificationId,
  isValidSpecificationId,

  // Core types
  type SpecificationScope,
  type SpecificationStatus,
  type ExternalReference,
  type SpecificationGuarantee,
  type SpecificationNonGoal,
  type PerceptualSpecification,

  // Conformance definitions
  type ConformanceLevelDefinition,
  type ConformanceLevel,
  type ConformanceRequirement,

  // Changelog
  type SpecificationChange,

  // Registry
  type ISpecificationRegistry,
  type SpecificationListOptions,

  // Factory functions
  createSpecification,
  type CreateSpecificationConfig,
  createGuarantee,
  createNonGoal,
  createReference,

  // Type guards
  isPerceptualSpecification,
  isConformanceLevel,
} from './specification';

// ============================================
// Conformance & Certification Types
// ============================================

export {
  // Branded types
  type ConformanceReportId,
  createConformanceReportId,

  // Core conformance types
  type ConformanceResult,
  type ViolationSeverity,
  type ConformanceTestResult,
  type ConformanceViolation,
  type ConformanceViolationLocation,
  type ConformanceReport,

  // Evaluation types
  type EvaluatedArtifact,
  type ConformanceLevelResult,
  type ViolationSummary,
  type EvaluationEnvironment,

  // Certification types
  type ConformanceCertification,
  type CertificationIssuer,
  type CertificationScope,

  // Configuration types
  type ConformanceEvaluationConfig,
  type ConformanceEvaluationInput,
  type EvaluationArtifact,
  type ConformanceContext,

  // Engine interface
  type IConformanceEngine,

  // Formatting
  type ConformanceReportFormat,
  type IConformanceReportFormatter,

  // Factory functions
  createViolation,
  createTestResult,
  calculateViolationSummary,

  // Type guards
  isConformanceReport,
  isConformanceViolation,
} from './conformance';

// ============================================
// Audit & Regulatory Types
// ============================================

export {
  // Branded types
  type AuditEntryId,
  createAuditEntryId,

  // Core audit types
  type AuditCategory,
  type AuditSeverity,
  type AuditEntry,
  type AuditInput,
  type AuditOutput,
  type AuditPolicyContext,

  // Decision explanation (Explainable AI)
  type DecisionExplanation,
  type DecisionFactor,
  type DecisionAlternative,

  // Metadata
  type AuditMetadata,

  // Trail management
  type AuditTrail,
  type AuditTrailMetadata,
  type IAuditTrailManager,
  type AuditQueryFilter,
  type AuditExportFormat,
  type AuditVerificationResult,
  type AuditVerificationIssue,

  // Service layer types (infrastructure support)
  type AuditEntryType,
  type AuditQuery,
  type ComplianceFramework,
  type ComplianceStatus,
  type RetentionPolicy,
  type AuditReport,
  type ExtendedAuditEntry,

  // Reproducibility
  type ReproducibilityRecord,
  type IReproducibilityChecker,

  // Regulatory compliance
  type RegulatoryFramework,
  type RegulatoryRequirement,
  type RegulatoryComplianceReport,
  type RegulatoryRequirementResult,

  // Factory functions
  createAuditEntry,
  createDecisionExplanation,
  createDecisionFactor,
  computeHash,

  // Type guards
  isAuditEntry,
  isAuditTrail,
  isDecisionExplanation,
} from './audit';

// ============================================
// Golden Set Types
// ============================================

export {
  // Branded types
  type GoldenSetId,
  createGoldenSetId,

  // Core types
  type TestCaseCategory,
  type WCAG3TierLowercase,
  type GoldenTestCase,
  type GoldenSet,

  // Input types
  type SRGBInput,
  type OKLCHValues,
  type HCTValues,
  type ContrastTestInput,
  type ColorSpaceTestInput,
  type TokenGenerationTestInput,
  type GovernanceTestInput,
  type GoldenTestInput,

  // Expected result types
  type ContrastExpectedResult,
  type OKLCHExpectedResult,
  type HCTExpectedResult,
  type TokenGenerationExpectedResult,
  type GovernanceExpectedResult,
  type ExpectedResult,

  // Validation result types
  type GoldenTestValidationResult,
  type GoldenSetValidationResult,

  // Type guards
  isGoldenSet,
  isGoldenTestCase,
  isTestCaseCategory,
} from './golden-set';

// ============================================
// Plugin & Extension Types
// ============================================

export {
  // Branded types
  type PluginId,
  createPluginId,
  isValidPluginId,

  // Core plugin types
  type PluginCategory,
  type PluginState,
  type PluginCapabilities,
  type ColorIntelligencePlugin,
  type PluginDependency,
  type PluginConfigSchema,
  type PluginConfigProperty,
  type PolicyViolationDeclaration,

  // Hooks
  type PluginHooks,
  type HookContext,
  type PluginLoadHook,
  type PluginUnloadHook,
  type PluginErrorHook,
  type BeforeDecisionHook,
  type AfterDecisionHook,
  type BeforeExportHook,
  type AfterExportHook,
  type AfterGovernanceHook,
  type BeforeValidationHook,
  type AfterValidationHook,

  // Hook I/O types
  type DecisionHookInput,
  type DecisionHookOutput,
  type ExportHookInput,
  type ExportHookOutput,
  type GovernanceHookInput,
  type GovernanceHookOutput,
  type ValidationHookInput,
  type ValidationHookOutput,

  // Plugin manager
  type IPluginManager,
  type PluginListOptions,
  type PluginInfo,
  type PluginCompatibilityResult,
  type PluginCompatibilityIssue,
  type ConfigValidationResult,
  type ConfigValidationError,

  // Factory functions
  createPlugin,
  type CreatePluginConfig,
  createSimplePlugin,

  // Type guards
  isColorIntelligencePlugin,
  hasPluginHook,
} from './plugin';
