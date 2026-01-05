// ============================================
// Perceptual Policy Types
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Core policy types for the Perceptual Governance Engine.
// Policies define constraints and requirements for color
// accessibility decisions.
// ============================================

import type { WCAGLevel, WCAG3Tier } from '../../types/decision';

// Re-export WCAGLevel and WCAG3Tier for consumers
export type { WCAGLevel, WCAG3Tier } from '../../types/decision';

// ============================================
// Branded Types for Policy Domain
// ============================================

declare const BRAND: unique symbol;
type Brand<K, T extends string> = K & { readonly [BRAND]: T };

/**
 * Policy identifier - unique within a registry
 * Format: lowercase-kebab-case (e.g., "wcag21-aa", "brand-primary")
 */
export type PolicyId = Brand<string, 'PolicyId'>;

/**
 * Policy version following SemVer
 * Format: "major.minor.patch" (e.g., "1.0.0", "2.1.3")
 */
export type PolicyVersion = Brand<string, 'PolicyVersion'>;

/**
 * Rule identifier within a policy
 */
export type RuleId = Brand<string, 'RuleId'>;

// ============================================
// Constructors for Branded Types
// ============================================

const POLICY_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const RULE_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const policyId = {
  /**
   * Create a PolicyId with validation
   */
  create(value: string): PolicyId {
    if (!POLICY_ID_PATTERN.test(value)) {
      throw new Error(
        `Invalid PolicyId "${value}". Must be lowercase kebab-case (e.g., "wcag21-aa")`
      );
    }
    return value as PolicyId;
  },

  /**
   * Unsafe cast - use only when value is known valid
   */
  unsafe(value: string): PolicyId {
    return value as PolicyId;
  },

  /**
   * Check if a string is a valid PolicyId
   */
  isValid(value: string): boolean {
    return POLICY_ID_PATTERN.test(value);
  },
};

export const policyVersion = {
  /**
   * Create a PolicyVersion with validation
   */
  create(major: number, minor: number, patch: number): PolicyVersion {
    if (major < 0 || minor < 0 || patch < 0) {
      throw new RangeError('Version components must be non-negative');
    }
    if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch)) {
      throw new TypeError('Version components must be integers');
    }
    return `${major}.${minor}.${patch}` as PolicyVersion;
  },

  /**
   * Parse a version string
   */
  parse(value: string): PolicyVersion {
    if (!SEMVER_PATTERN.test(value)) {
      throw new Error(
        `Invalid PolicyVersion "${value}". Must be SemVer format (e.g., "1.0.0")`
      );
    }
    return value as PolicyVersion;
  },

  /**
   * Unsafe cast
   */
  unsafe(value: string): PolicyVersion {
    return value as PolicyVersion;
  },

  /**
   * Compare two versions (-1, 0, 1)
   */
  compare(a: PolicyVersion, b: PolicyVersion): -1 | 0 | 1 {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const aMajor = aParts[0] ?? 0;
    const aMinor = aParts[1] ?? 0;
    const aPatch = aParts[2] ?? 0;
    const bMajor = bParts[0] ?? 0;
    const bMinor = bParts[1] ?? 0;
    const bPatch = bParts[2] ?? 0;

    if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
    if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
    if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
    return 0;
  },

  /**
   * Increment major version
   */
  incrementMajor(v: PolicyVersion): PolicyVersion {
    const parts = v.split('.').map(Number);
    const major = parts[0] ?? 0;
    return `${major + 1}.0.0` as PolicyVersion;
  },

  /**
   * Increment minor version
   */
  incrementMinor(v: PolicyVersion): PolicyVersion {
    const parts = v.split('.').map(Number);
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;
    return `${major}.${minor + 1}.0` as PolicyVersion;
  },

  /**
   * Increment patch version
   */
  incrementPatch(v: PolicyVersion): PolicyVersion {
    const parts = v.split('.').map(Number);
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;
    return `${major}.${minor}.${patch + 1}` as PolicyVersion;
  },
};

export const ruleId = {
  create(value: string): RuleId {
    if (!RULE_ID_PATTERN.test(value)) {
      throw new Error(
        `Invalid RuleId "${value}". Must be lowercase kebab-case`
      );
    }
    return value as RuleId;
  },

  unsafe(value: string): RuleId {
    return value as RuleId;
  },
};

// ============================================
// Policy Priority & Enforcement
// ============================================

/**
 * Policy priority determines evaluation order
 * Higher priority policies are evaluated first
 */
export type PolicyPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Priority order for sorting
 */
export const PRIORITY_ORDER: Record<PolicyPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Enforcement mode determines behavior on violation
 */
export type PolicyEnforcement =
  | 'strict'      // Violations cause rejection
  | 'advisory'    // Violations generate warnings
  | 'monitoring'; // Violations are logged only

// ============================================
// Policy Context
// ============================================

/**
 * Color scheme context
 */
export type ColorScheme = 'light' | 'dark' | 'high-contrast';

/**
 * Accessibility mode
 */
export type AccessibilityMode = 'standard' | 'enhanced' | 'maximum';

/**
 * Viewport size category
 */
export type ViewportCategory = 'mobile' | 'tablet' | 'desktop' | 'large-screen';

/**
 * Text size category for WCAG compliance
 * Used to determine contrast requirements (large text has lower minimums)
 */
export type TextSizeCategory = 'small' | 'normal' | 'large';

/**
 * Context in which a policy applies
 * Policies can be scoped to specific contexts
 */
export interface PolicyContext {
  /** Color scheme (light/dark/high-contrast) */
  readonly colorScheme?: ColorScheme;

  /** Component type (e.g., "button", "input", "heading") */
  readonly component?: string;

  /** Accessibility mode */
  readonly accessibilityMode?: AccessibilityMode;

  /** Viewport category */
  readonly viewport?: ViewportCategory;

  /** Text size category for WCAG rules (large text has lower contrast requirements) */
  readonly textSize?: TextSizeCategory;

  /** Custom context tags */
  readonly tags?: ReadonlyArray<string>;
}

/**
 * Create a policy context
 */
export function createPolicyContext(
  options?: Partial<PolicyContext>
): PolicyContext {
  return {
    colorScheme: options?.colorScheme,
    component: options?.component,
    accessibilityMode: options?.accessibilityMode ?? 'standard',
    viewport: options?.viewport,
    tags: options?.tags ?? [],
  };
}

/**
 * Check if a context matches a policy's applicable contexts
 */
export function contextMatches(
  actualContext: PolicyContext,
  requiredContexts: ReadonlyArray<PolicyContext>
): boolean {
  // Empty required contexts means policy applies to all
  if (requiredContexts.length === 0) return true;

  return requiredContexts.some(required => {
    // Check each specified field
    if (required.colorScheme && required.colorScheme !== actualContext.colorScheme) {
      return false;
    }
    if (required.component && required.component !== actualContext.component) {
      return false;
    }
    if (required.accessibilityMode && required.accessibilityMode !== actualContext.accessibilityMode) {
      return false;
    }
    if (required.viewport && required.viewport !== actualContext.viewport) {
      return false;
    }
    if (required.tags && required.tags.length > 0) {
      const actualTags = new Set(actualContext.tags ?? []);
      if (!required.tags.some(tag => actualTags.has(tag))) {
        return false;
      }
    }
    return true;
  });
}

// ============================================
// Policy Accessibility Requirements
// ============================================

/**
 * Accessibility requirements that a policy can enforce
 */
export interface AccessibilityRequirements {
  /** Minimum WCAG 2.1 level required */
  readonly minWcagLevel?: WCAGLevel;

  /** Minimum WCAG 3.0 tier required */
  readonly minWcag3Tier?: WCAG3Tier;

  /** Minimum APCA Lc value (absolute) */
  readonly minApcaLc?: number;

  /** Minimum WCAG 2.1 contrast ratio */
  readonly minContrastRatio?: number;

  /** Minimum font size in px */
  readonly minFontSizePx?: number;

  /** Minimum font weight */
  readonly minFontWeight?: number;

  /** Maximum chroma reduction allowed (for auto-fix) */
  readonly maxChromaReduction?: number;

  /** Preserve original hue during auto-fix */
  readonly preserveHue?: boolean;

  /** Maximum hue shift allowed in degrees */
  readonly maxHueShift?: number;

  /** Preserve chroma during adjustments */
  readonly preserveChroma?: boolean;

  /** Minimum chroma retention percentage (0-1) */
  readonly minChromaRetention?: number;

  /** Require color blindness safe palette */
  readonly colorBlindnessSafe?: boolean;

  /** Use font-scaled Lc requirements (APCA lookup tables) */
  readonly useFontScaling?: boolean;
}

// ============================================
// Core Policy Interface
// ============================================

/**
 * Base Perceptual Policy
 *
 * Defines the fundamental structure of all policies in the
 * governance system. Policies are immutable and versioned.
 *
 * Key principle: Policies define WHAT is required, not HOW
 * to achieve it. The governance engine handles evaluation
 * and the decision engine handles color calculations.
 */
export interface PerceptualPolicy {
  // ===== Identity =====

  /** Unique policy identifier */
  readonly id: PolicyId;

  /** Human-readable name */
  readonly name: string;

  /** Detailed description */
  readonly description: string;

  /** Policy version (immutable after creation) */
  readonly version: PolicyVersion;

  // ===== Classification =====

  /** Priority for evaluation ordering */
  readonly priority: PolicyPriority;

  /** Enforcement mode on violation */
  readonly enforcement: PolicyEnforcement;

  /** Category for grouping */
  readonly category: PolicyCategory;

  // ===== Scope =====

  /** Contexts where this policy applies */
  readonly applicableContexts: ReadonlyArray<PolicyContext>;

  /** Policy this extends (for composition) */
  readonly extends?: PolicyId;

  // ===== Lifecycle =====

  /** Whether policy is currently active */
  readonly enabled: boolean;

  /** ISO timestamp of creation */
  readonly createdAt: string;

  /** ISO timestamp when policy expires (null = never) */
  readonly expiresAt: string | null;

  /** Tags for filtering and organization */
  readonly tags: ReadonlyArray<string>;

  // ===== Requirements =====

  /** Accessibility requirements to enforce */
  readonly requirements: AccessibilityRequirements;
}

/**
 * Policy categories for organization
 */
export type PolicyCategory =
  | 'accessibility'  // WCAG, APCA standards
  | 'brand'          // Brand color constraints
  | 'design-system'  // Design system rules
  | 'custom';        // User-defined

// ============================================
// Policy Metadata
// ============================================

/**
 * Metadata about a policy for display/filtering
 */
export interface PolicyMetadata {
  readonly id: PolicyId;
  readonly name: string;
  readonly version: PolicyVersion;
  readonly category: PolicyCategory;
  readonly priority: PolicyPriority;
  readonly enforcement: PolicyEnforcement;
  readonly enabled: boolean;
  readonly tags: ReadonlyArray<string>;
}

/**
 * Extract metadata from a policy
 */
export function extractPolicyMetadata(policy: PerceptualPolicy): PolicyMetadata {
  return {
    id: policy.id,
    name: policy.name,
    version: policy.version,
    category: policy.category,
    priority: policy.priority,
    enforcement: policy.enforcement,
    enabled: policy.enabled,
    tags: policy.tags,
  };
}

// ============================================
// Policy Builder (Immutable)
// ============================================

/**
 * Partial policy for building
 */
export type PolicyInput = Omit<PerceptualPolicy, 'id' | 'version' | 'createdAt'> & {
  readonly id: string;
  readonly version?: string;
};

/**
 * Create a new policy with validation
 */
export function createPolicy(input: PolicyInput): PerceptualPolicy {
  const now = new Date().toISOString();

  return {
    id: policyId.create(input.id),
    name: input.name,
    description: input.description,
    version: input.version
      ? policyVersion.parse(input.version)
      : policyVersion.create(1, 0, 0),
    priority: input.priority,
    enforcement: input.enforcement,
    category: input.category,
    applicableContexts: input.applicableContexts,
    extends: input.extends,
    enabled: input.enabled,
    createdAt: now,
    expiresAt: input.expiresAt,
    tags: input.tags,
    requirements: input.requirements,
  };
}

/**
 * Create a new version of an existing policy
 * Returns a new policy with incremented version
 */
export function createPolicyVersion(
  policy: PerceptualPolicy,
  versionType: 'major' | 'minor' | 'patch',
  updates: Partial<Omit<PerceptualPolicy, 'id' | 'version' | 'createdAt'>>
): PerceptualPolicy {
  const newVersion =
    versionType === 'major'
      ? policyVersion.incrementMajor(policy.version)
      : versionType === 'minor'
      ? policyVersion.incrementMinor(policy.version)
      : policyVersion.incrementPatch(policy.version);

  return {
    ...policy,
    ...updates,
    id: policy.id, // Keep same ID
    version: newVersion,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// Policy Validation
// ============================================

/**
 * Validation error for a policy
 */
export interface PolicyValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Warning during policy validation (non-blocking)
 */
export interface PolicyValidationWarning {
  readonly field: string;
  readonly message: string;
}

/**
 * Validation result
 */
export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<PolicyValidationError>;
  readonly warnings: ReadonlyArray<PolicyValidationWarning>;
}

/**
 * Validate a policy structure
 */
export function validatePolicy(policy: PerceptualPolicy): PolicyValidationResult {
  const errors: PolicyValidationError[] = [];
  const warnings: PolicyValidationWarning[] = [];

  // Name validation
  if (!policy.name || policy.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Policy name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Description validation
  if (!policy.description || policy.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Policy description is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Requirements validation
  const req = policy.requirements;
  if (req.minApcaLc !== undefined && (req.minApcaLc < 0 || req.minApcaLc > 108)) {
    errors.push({
      field: 'requirements.minApcaLc',
      message: 'APCA Lc must be between 0 and 108',
      code: 'OUT_OF_RANGE',
    });
  }

  if (req.minContrastRatio !== undefined && (req.minContrastRatio < 1 || req.minContrastRatio > 21)) {
    errors.push({
      field: 'requirements.minContrastRatio',
      message: 'Contrast ratio must be between 1 and 21',
      code: 'OUT_OF_RANGE',
    });
  }

  if (req.minFontSizePx !== undefined && req.minFontSizePx < 1) {
    errors.push({
      field: 'requirements.minFontSizePx',
      message: 'Font size must be positive',
      code: 'OUT_OF_RANGE',
    });
  }

  if (req.maxHueShift !== undefined && (req.maxHueShift < 0 || req.maxHueShift > 180)) {
    errors.push({
      field: 'requirements.maxHueShift',
      message: 'Hue shift must be between 0 and 180 degrees',
      code: 'OUT_OF_RANGE',
    });
  }

  // Expiration validation
  if (policy.expiresAt) {
    const expiresAt = new Date(policy.expiresAt);
    const createdAt = new Date(policy.createdAt);
    if (expiresAt <= createdAt) {
      errors.push({
        field: 'expiresAt',
        message: 'Expiration date must be after creation date',
        code: 'INVALID_DATE',
      });
    }
  }

  // Warning: Policy nearing expiration
  if (policy.expiresAt) {
    const expiresAt = new Date(policy.expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry > 0 && daysUntilExpiry < 30) {
      warnings.push({
        field: 'expiresAt',
        message: `Policy expires in ${Math.ceil(daysUntilExpiry)} days`,
      });
    }
  }

  // Warning: No applicable contexts (applies to all)
  if (!policy.applicableContexts || policy.applicableContexts.length === 0) {
    warnings.push({
      field: 'applicableContexts',
      message: 'Policy applies to all contexts (no restrictions)',
    });
  }

  // Warning: Advisory enforcement may not be sufficient for accessibility
  if (policy.enforcement === 'advisory' && policy.category === 'accessibility') {
    warnings.push({
      field: 'enforcement',
      message: 'Advisory enforcement may not meet accessibility compliance requirements',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
