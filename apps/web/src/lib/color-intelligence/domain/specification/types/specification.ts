// ============================================
// Perceptual Specification Types
// Phase 5: Standardization Layer
// ============================================
//
// This file defines the formal specification types that allow
// Color Intelligence to be referenced as a standard, not just
// an implementation.
//
// Purpose:
// - Enable third-party reimplementation
// - Support external auditing
// - Provide formal guarantees
// - Document non-goals explicitly
//
// ============================================

// ============================================
// Branded Types
// ============================================

/**
 * Specification ID following the format: CI-SPEC-{scope}-{version}
 * Example: CI-SPEC-UI-1.0.0
 */
export type SpecificationId = string & { readonly __brand: 'SpecificationId' };

/**
 * Create a branded SpecificationId
 */
export function createSpecificationId(
  scope: SpecificationScope,
  version: string
): SpecificationId {
  return `CI-SPEC-${scope.toUpperCase()}-${version}` as SpecificationId;
}

/**
 * Validate a specification ID format
 */
export function isValidSpecificationId(id: string): id is SpecificationId {
  return /^CI-SPEC-(UI|BRAND|ACCESSIBILITY|AI)-\d+\.\d+\.\d+$/.test(id);
}

// ============================================
// Core Specification Types
// ============================================

/**
 * Scope of a perceptual specification
 */
export type SpecificationScope = 'UI' | 'Brand' | 'Accessibility' | 'AI';

/**
 * Status of a specification
 */
export type SpecificationStatus =
  | 'draft'        // Under development
  | 'candidate'    // Ready for review
  | 'stable'       // Released and supported
  | 'deprecated'   // Superseded, will be removed
  | 'retired';     // No longer supported

/**
 * Reference to an external standard or specification
 */
export interface ExternalReference {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly url: string;
  readonly section?: string;
  readonly relationship: 'implements' | 'extends' | 'references' | 'supersedes';
}

/**
 * A formal guarantee provided by the specification
 */
export interface SpecificationGuarantee {
  readonly id: string;
  readonly description: string;
  readonly category: 'perceptual' | 'accessibility' | 'performance' | 'compatibility';
  readonly testable: boolean;
  readonly testReference?: string;
}

/**
 * An explicit non-goal of the specification
 */
export interface SpecificationNonGoal {
  readonly id: string;
  readonly description: string;
  readonly rationale: string;
  readonly alternatives?: ReadonlyArray<string>;
}

/**
 * Perceptual Specification
 *
 * The core type that formalizes Color Intelligence as a standard.
 * This allows third parties to:
 * - Reimplement the specification
 * - Audit existing implementations
 * - Verify conformance
 */
export interface PerceptualSpecification {
  // Identity
  readonly id: SpecificationId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly status: SpecificationStatus;

  // Scope and applicability
  readonly scope: SpecificationScope;
  readonly applicableContexts: ReadonlyArray<string>;

  // External references (APCA, WCAG, CIE, etc.)
  readonly references: ReadonlyArray<ExternalReference>;

  // What the system guarantees
  readonly guarantees: ReadonlyArray<SpecificationGuarantee>;

  // What the system explicitly does NOT do
  readonly nonGoals: ReadonlyArray<SpecificationNonGoal>;

  // Conformance requirements
  readonly conformanceLevels: ReadonlyArray<ConformanceLevelDefinition>;

  // Changelog
  readonly changelog: ReadonlyArray<SpecificationChange>;

  // Metadata
  readonly authors: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deprecatedAt?: string;
  readonly supersededBy?: SpecificationId;
}

// ============================================
// Conformance Level Definitions
// ============================================

/**
 * Conformance level definition within a specification
 */
export interface ConformanceLevelDefinition {
  readonly level: ConformanceLevel;
  readonly name: string;
  readonly description: string;
  readonly requirements: ReadonlyArray<ConformanceRequirement>;
  readonly minimumScore: number; // 0-100
}

/**
 * Conformance levels (aligned with WCAG 3.0 tiers)
 */
export type ConformanceLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

/**
 * A specific requirement for conformance
 */
export interface ConformanceRequirement {
  readonly id: string;
  readonly description: string;
  readonly category: 'contrast' | 'color-space' | 'accessibility' | 'governance' | 'audit';
  readonly mandatory: boolean;
  readonly weight: number; // 0-1, used for scoring
  readonly testMethod: 'automated' | 'manual' | 'hybrid';
  readonly testReference?: string;
}

// ============================================
// Specification Changelog
// ============================================

/**
 * A change in the specification
 */
export interface SpecificationChange {
  readonly version: string;
  readonly date: string;
  readonly type: 'breaking' | 'feature' | 'fix' | 'deprecation';
  readonly description: string;
  readonly migrationGuide?: string;
}

// ============================================
// Specification Registry
// ============================================

/**
 * Registry for managing specifications
 */
export interface ISpecificationRegistry {
  /**
   * Register a new specification
   */
  register(spec: PerceptualSpecification): void;

  /**
   * Get a specification by ID
   */
  get(id: SpecificationId): PerceptualSpecification | null;

  /**
   * Get the latest version of a specification by scope
   */
  getLatest(scope: SpecificationScope): PerceptualSpecification | null;

  /**
   * List all specifications
   */
  list(options?: SpecificationListOptions): ReadonlyArray<PerceptualSpecification>;

  /**
   * Check if a specification exists
   */
  has(id: SpecificationId): boolean;

  /**
   * Get all versions of a specification
   */
  getVersions(scope: SpecificationScope): ReadonlyArray<string>;
}

/**
 * Options for listing specifications
 */
export interface SpecificationListOptions {
  readonly scope?: SpecificationScope;
  readonly status?: SpecificationStatus;
  readonly includeDeprecated?: boolean;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new perceptual specification
 */
export function createSpecification(
  config: CreateSpecificationConfig
): PerceptualSpecification {
  const id = createSpecificationId(config.scope, config.version);

  return {
    id,
    name: config.name,
    description: config.description,
    version: config.version,
    status: config.status ?? 'draft',
    scope: config.scope,
    applicableContexts: config.applicableContexts ?? [],
    references: config.references ?? [],
    guarantees: config.guarantees ?? [],
    nonGoals: config.nonGoals ?? [],
    conformanceLevels: config.conformanceLevels ?? [],
    changelog: config.changelog ?? [],
    authors: config.authors ?? [],
    createdAt: config.createdAt ?? new Date().toISOString(),
    updatedAt: config.updatedAt ?? new Date().toISOString(),
    deprecatedAt: config.deprecatedAt,
    supersededBy: config.supersededBy,
  };
}

/**
 * Configuration for creating a specification
 */
export interface CreateSpecificationConfig {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly scope: SpecificationScope;
  readonly status?: SpecificationStatus;
  readonly applicableContexts?: ReadonlyArray<string>;
  readonly references?: ReadonlyArray<ExternalReference>;
  readonly guarantees?: ReadonlyArray<SpecificationGuarantee>;
  readonly nonGoals?: ReadonlyArray<SpecificationNonGoal>;
  readonly conformanceLevels?: ReadonlyArray<ConformanceLevelDefinition>;
  readonly changelog?: ReadonlyArray<SpecificationChange>;
  readonly authors?: ReadonlyArray<string>;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly deprecatedAt?: string;
  readonly supersededBy?: SpecificationId;
}

/**
 * Create a guarantee
 */
export function createGuarantee(
  id: string,
  description: string,
  category: SpecificationGuarantee['category'],
  options?: Partial<Pick<SpecificationGuarantee, 'testable' | 'testReference'>>
): SpecificationGuarantee {
  return {
    id,
    description,
    category,
    testable: options?.testable ?? true,
    testReference: options?.testReference,
  };
}

/**
 * Create a non-goal
 */
export function createNonGoal(
  id: string,
  description: string,
  rationale: string,
  alternatives?: ReadonlyArray<string>
): SpecificationNonGoal {
  return {
    id,
    description,
    rationale,
    alternatives,
  };
}

/**
 * Create an external reference
 */
export function createReference(
  id: string,
  name: string,
  version: string,
  url: string,
  relationship: ExternalReference['relationship'],
  section?: string
): ExternalReference {
  return {
    id,
    name,
    version,
    url,
    relationship,
    section,
  };
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for PerceptualSpecification
 */
export function isPerceptualSpecification(
  value: unknown
): value is PerceptualSpecification {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['version'] === 'string' &&
    typeof obj['scope'] === 'string' &&
    Array.isArray(obj['guarantees']) &&
    Array.isArray(obj['nonGoals'])
  );
}

/**
 * Type guard for ConformanceLevel
 */
export function isConformanceLevel(value: unknown): value is ConformanceLevel {
  return (
    value === 'Bronze' ||
    value === 'Silver' ||
    value === 'Gold' ||
    value === 'Platinum'
  );
}
