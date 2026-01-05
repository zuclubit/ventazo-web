// ============================================
// Conformance & Certification Types
// Phase 5: Standardization Layer
// ============================================
//
// Types for validating whether a system, theme, or design token
// set conforms to the Color Intelligence specification.
//
// Use cases:
// - "This design system is CI-Silver compliant"
// - "This theme achieves CI-Gold certification"
// - Enterprise adoption and regulatory compliance
//
// ============================================

import type {
  SpecificationId,
  ConformanceLevel,
  ConformanceRequirement,
  PerceptualSpecification,
} from './specification';

// Re-export types that audit.ts and other consumers need
export type { ConformanceLevel } from './specification';

// ============================================
// Conformance Report Types
// ============================================

/**
 * Unique identifier for a conformance report
 */
export type ConformanceReportId = string & { readonly __brand: 'ConformanceReportId' };

/**
 * Create a conformance report ID
 */
export function createConformanceReportId(): ConformanceReportId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CR-${timestamp}-${random}` as ConformanceReportId;
}

/**
 * Result of a conformance evaluation
 */
export type ConformanceResult = 'passed' | 'failed' | 'partial' | 'not-applicable';

/**
 * Severity of a conformance violation
 */
export type ViolationSeverity = 'critical' | 'major' | 'minor' | 'info';

/**
 * A single conformance test result
 */
export interface ConformanceTestResult {
  readonly requirementId: string;
  readonly requirement: ConformanceRequirement;
  readonly result: ConformanceResult;
  readonly score: number; // 0-100
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly violations?: ReadonlyArray<ConformanceViolation>;
  readonly testedAt: string;
  readonly duration: number; // milliseconds
}

/**
 * A conformance violation
 */
export interface ConformanceViolation {
  readonly id: string;
  readonly requirementId: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly expected: string;
  readonly actual: string;
  readonly location?: ConformanceViolationLocation;
  readonly suggestion?: string;
  readonly documentationUrl?: string;
}

/**
 * Location of a violation within the evaluated artifact
 */
export interface ConformanceViolationLocation {
  readonly type: 'color' | 'token' | 'theme' | 'palette' | 'decision';
  readonly path: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Complete conformance report
 */
export interface ConformanceReport {
  // Identity
  readonly id: ConformanceReportId;
  readonly specificationId: SpecificationId;
  readonly specificationVersion: string;

  // Evaluated artifacts
  readonly evaluatedArtifacts: ReadonlyArray<EvaluatedArtifact>;

  // Overall result
  readonly passed: boolean;
  readonly achievedLevel: ConformanceLevel | null;
  readonly score: number; // 0-100

  // Detailed results by level
  readonly levelResults: ReadonlyMap<ConformanceLevel, ConformanceLevelResult>;

  // Test results
  readonly testResults: ReadonlyArray<ConformanceTestResult>;

  // Violations summary
  readonly violations: ReadonlyArray<ConformanceViolation>;
  readonly violationSummary: ViolationSummary;

  // Metadata
  readonly evaluatedAt: string;
  readonly evaluationDuration: number; // milliseconds
  readonly evaluatorVersion: string;
  readonly environment: EvaluationEnvironment;

  // Certification
  readonly certification?: ConformanceCertification;
}

/**
 * An artifact that was evaluated
 */
export interface EvaluatedArtifact {
  readonly type: 'design-system' | 'theme' | 'palette' | 'tokens' | 'component';
  readonly name: string;
  readonly version?: string;
  readonly source: string;
  readonly hash?: string; // For reproducibility
}

/**
 * Result for a specific conformance level
 */
export interface ConformanceLevelResult {
  readonly level: ConformanceLevel;
  readonly achieved: boolean;
  readonly score: number;
  readonly requiredScore: number;
  readonly passedRequirements: number;
  readonly totalRequirements: number;
  readonly mandatoryFailed: number;
}

/**
 * Summary of violations
 */
export interface ViolationSummary {
  readonly total: number;
  readonly critical: number;
  readonly major: number;
  readonly minor: number;
  readonly info: number;
}

/**
 * Environment in which evaluation was performed
 */
export interface EvaluationEnvironment {
  readonly platform: string;
  readonly nodeVersion?: string;
  readonly colorIntelligenceVersion: string;
  readonly timestamp: string;
}

// ============================================
// Certification Types
// ============================================

/**
 * A conformance certification (formal attestation)
 */
export interface ConformanceCertification {
  readonly certificationId: string;
  readonly level: ConformanceLevel;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly issuer: CertificationIssuer;
  readonly scope: CertificationScope;
  readonly signature?: string; // Digital signature for verification
}

/**
 * Certification issuer information
 */
export interface CertificationIssuer {
  readonly name: string;
  readonly id: string;
  readonly type: 'automated' | 'manual' | 'third-party';
  readonly url?: string;
}

/**
 * Scope of certification
 */
export interface CertificationScope {
  readonly artifacts: ReadonlyArray<string>;
  readonly version: string;
  readonly conditions: ReadonlyArray<string>;
  readonly limitations: ReadonlyArray<string>;
}

// ============================================
// Evaluation Configuration
// ============================================

/**
 * Configuration for conformance evaluation
 */
export interface ConformanceEvaluationConfig {
  // Specification to evaluate against
  readonly specification: PerceptualSpecification;

  // Target level (optional - evaluates all if not specified)
  readonly targetLevel?: ConformanceLevel;

  // Strictness
  readonly strictMode?: boolean;
  readonly failFast?: boolean; // Stop on first critical failure

  // Requirements filtering
  readonly includeCategories?: ReadonlyArray<ConformanceRequirement['category']>;
  readonly excludeCategories?: ReadonlyArray<ConformanceRequirement['category']>;

  // Output options
  readonly verbose?: boolean;
  readonly includePassedDetails?: boolean;

  // Certification
  readonly generateCertification?: boolean;
  readonly certificationIssuer?: CertificationIssuer;
}

/**
 * Input for conformance evaluation
 */
export interface ConformanceEvaluationInput {
  // The artifacts to evaluate
  readonly artifacts: ReadonlyArray<EvaluationArtifact>;

  // Additional context
  readonly context?: ConformanceContext;
}

/**
 * An artifact to be evaluated
 */
export interface EvaluationArtifact {
  readonly type: EvaluatedArtifact['type'];
  readonly name: string;
  readonly version?: string;
  readonly data: unknown;
  readonly source: string;
}

/**
 * Context for evaluation
 */
export interface ConformanceContext {
  readonly colorScheme?: 'light' | 'dark' | 'high-contrast';
  readonly accessibilityMode?: 'standard' | 'enhanced';
  readonly viewport?: 'mobile' | 'tablet' | 'desktop';
  readonly locale?: string;
  readonly customProperties?: Record<string, unknown>;
}

// ============================================
// Conformance Engine Interface
// ============================================

/**
 * Interface for the conformance engine
 */
export interface IConformanceEngine {
  /**
   * Evaluate artifacts against a specification
   */
  evaluate(
    input: ConformanceEvaluationInput,
    config: ConformanceEvaluationConfig
  ): Promise<ConformanceReport>;

  /**
   * Quick check if a specific level can be achieved
   */
  canAchieveLevel(
    input: ConformanceEvaluationInput,
    level: ConformanceLevel,
    specification: PerceptualSpecification
  ): Promise<boolean>;

  /**
   * Get the highest achievable level
   */
  getHighestAchievableLevel(
    input: ConformanceEvaluationInput,
    specification: PerceptualSpecification
  ): Promise<ConformanceLevel | null>;

  /**
   * Generate a certification
   */
  generateCertification(
    report: ConformanceReport,
    issuer: CertificationIssuer
  ): ConformanceCertification | null;

  /**
   * Verify a certification
   */
  verifyCertification(certification: ConformanceCertification): Promise<boolean>;
}

// ============================================
// Report Formatting
// ============================================

/**
 * Format options for conformance reports
 */
export type ConformanceReportFormat = 'json' | 'markdown' | 'html' | 'sarif';

/**
 * Interface for report formatters
 */
export interface IConformanceReportFormatter {
  readonly outputFormat: ConformanceReportFormat;

  /**
   * Format a conformance report
   */
  formatReport(report: ConformanceReport): string;

  /**
   * Format a summary only
   */
  formatSummary(report: ConformanceReport): string;

  /**
   * Format violations only
   */
  formatViolations(violations: ReadonlyArray<ConformanceViolation>): string;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a violation
 */
export function createViolation(
  requirementId: string,
  severity: ViolationSeverity,
  message: string,
  expected: string,
  actual: string,
  options?: Partial<Pick<ConformanceViolation, 'location' | 'suggestion' | 'documentationUrl'>>
): ConformanceViolation {
  return {
    id: `V-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    requirementId,
    severity,
    message,
    expected,
    actual,
    location: options?.location,
    suggestion: options?.suggestion,
    documentationUrl: options?.documentationUrl,
  };
}

/**
 * Create a test result
 */
export function createTestResult(
  requirement: ConformanceRequirement,
  result: ConformanceResult,
  score: number,
  message: string,
  options?: Partial<Pick<ConformanceTestResult, 'details' | 'violations'>>
): ConformanceTestResult {
  return {
    requirementId: requirement.id,
    requirement,
    result,
    score,
    message,
    details: options?.details,
    violations: options?.violations,
    testedAt: new Date().toISOString(),
    duration: 0,
  };
}

/**
 * Calculate violation summary
 */
export function calculateViolationSummary(
  violations: ReadonlyArray<ConformanceViolation>
): ViolationSummary {
  return violations.reduce(
    (summary, violation) => ({
      total: summary.total + 1,
      critical: summary.critical + (violation.severity === 'critical' ? 1 : 0),
      major: summary.major + (violation.severity === 'major' ? 1 : 0),
      minor: summary.minor + (violation.severity === 'minor' ? 1 : 0),
      info: summary.info + (violation.severity === 'info' ? 1 : 0),
    }),
    { total: 0, critical: 0, major: 0, minor: 0, info: 0 }
  );
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for ConformanceReport
 */
export function isConformanceReport(value: unknown): value is ConformanceReport {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['specificationId'] === 'string' &&
    typeof obj['passed'] === 'boolean' &&
    typeof obj['score'] === 'number' &&
    Array.isArray(obj['testResults']) &&
    Array.isArray(obj['violations'])
  );
}

/**
 * Type guard for ConformanceViolation
 */
export function isConformanceViolation(
  value: unknown
): value is ConformanceViolation {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['requirementId'] === 'string' &&
    typeof obj['severity'] === 'string' &&
    typeof obj['message'] === 'string'
  );
}
