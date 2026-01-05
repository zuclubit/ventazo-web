// ============================================
// Plugin & Extension System Types
// Phase 5: Ecosystem Layer
// ============================================
//
// Types for the plugin system that allows third-party extensions
// without modifying the core Color Intelligence system.
//
// Features:
// - Stable plugin API
// - Lifecycle hooks
// - Sandboxed execution
// - Policy violation awareness
//
// Example plugins:
// - Color blindness simulation
// - Cultural/regional color preferences
// - HDR experimental features
// - Brand sentiment analysis
//
// ============================================

import type { ConformanceLevel } from './conformance';

// ============================================
// Plugin Identity Types
// ============================================

/**
 * Unique plugin identifier
 */
export type PluginId = string & { readonly __brand: 'PluginId' };

/**
 * Create a plugin ID
 */
export function createPluginId(author: string, name: string): PluginId {
  return `${author}/${name}` as PluginId;
}

/**
 * Validate plugin ID format
 */
export function isValidPluginId(id: string): id is PluginId {
  return /^[a-z0-9-]+\/[a-z0-9-]+$/.test(id);
}

// ============================================
// Plugin Types
// ============================================

/**
 * Plugin category
 */
export type PluginCategory =
  | 'accessibility'   // Accessibility enhancements
  | 'simulation'      // Color simulation (colorblind, etc.)
  | 'analysis'        // Color analysis and insights
  | 'generation'      // Color palette generation
  | 'export'          // Export format extensions
  | 'integration'     // External tool integrations
  | 'experimental';   // Experimental features

/**
 * Plugin lifecycle state
 */
export type PluginState =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'active'
  | 'suspended'
  | 'error'
  | 'unloading';

/**
 * Plugin capability flags
 */
export interface PluginCapabilities {
  readonly canModifyDecisions: boolean;
  readonly canModifyExports: boolean;
  readonly canAccessGovernance: boolean;
  readonly canViolatePolicies: boolean; // Must be explicitly declared
  readonly requiresNetwork: boolean;
  readonly requiresStorage: boolean;
}

/**
 * Color Intelligence Plugin
 */
export interface ColorIntelligencePlugin {
  // Identity
  readonly id: PluginId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly license: string;
  readonly homepage?: string;
  readonly repository?: string;

  // Classification
  readonly category: PluginCategory;
  readonly tags: ReadonlyArray<string>;

  // Capabilities
  readonly capabilities: PluginCapabilities;

  // Dependencies
  readonly dependencies?: ReadonlyArray<PluginDependency>;
  readonly peerDependencies?: ReadonlyArray<PluginDependency>;

  // Compatibility
  readonly colorIntelligenceVersion: string; // SemVer range
  readonly minConformanceLevel?: ConformanceLevel;

  // Hooks
  readonly hooks: PluginHooks;

  // Configuration schema
  readonly configSchema?: PluginConfigSchema;

  // Policy violation declaration
  readonly policyViolations?: ReadonlyArray<PolicyViolationDeclaration>;
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  readonly id: PluginId;
  readonly version: string; // SemVer range
  readonly optional?: boolean;
}

/**
 * Plugin configuration schema (JSON Schema subset)
 */
export interface PluginConfigSchema {
  readonly type: 'object';
  readonly properties: Record<string, PluginConfigProperty>;
  readonly required?: ReadonlyArray<string>;
  readonly defaults?: Record<string, unknown>;
}

/**
 * Plugin config property
 */
export interface PluginConfigProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly default?: unknown;
  readonly enum?: ReadonlyArray<unknown>;
  readonly minimum?: number;
  readonly maximum?: number;
}

/**
 * Policy violation declaration
 */
export interface PolicyViolationDeclaration {
  readonly policyId: string;
  readonly ruleId?: string;
  readonly reason: string;
  readonly mitigation: string;
  readonly userMustAcknowledge: boolean;
}

// ============================================
// Plugin Hooks
// ============================================

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  // Lifecycle
  readonly onLoad?: PluginLoadHook;
  readonly onUnload?: PluginUnloadHook;
  readonly onError?: PluginErrorHook;

  // Decision lifecycle
  readonly beforeDecision?: BeforeDecisionHook;
  readonly afterDecision?: AfterDecisionHook;

  // Export lifecycle
  readonly beforeExport?: BeforeExportHook;
  readonly afterExport?: AfterExportHook;

  // Governance lifecycle
  readonly afterGovernance?: AfterGovernanceHook;

  // Validation lifecycle
  readonly beforeValidation?: BeforeValidationHook;
  readonly afterValidation?: AfterValidationHook;
}

/**
 * Hook context (passed to all hooks)
 */
export interface HookContext {
  readonly pluginId: PluginId;
  readonly pluginConfig: Record<string, unknown>;
  readonly systemVersion: string;
  readonly timestamp: string;
}

/**
 * Plugin load hook
 */
export type PluginLoadHook = (
  context: HookContext
) => Promise<void> | void;

/**
 * Plugin unload hook
 */
export type PluginUnloadHook = (
  context: HookContext
) => Promise<void> | void;

/**
 * Plugin error hook
 */
export type PluginErrorHook = (
  error: Error,
  context: HookContext
) => Promise<void> | void;

/**
 * Before decision hook
 */
export type BeforeDecisionHook = (
  input: DecisionHookInput,
  context: HookContext
) => Promise<DecisionHookInput> | DecisionHookInput;

/**
 * After decision hook
 */
export type AfterDecisionHook = (
  input: DecisionHookInput,
  output: DecisionHookOutput,
  context: HookContext
) => Promise<DecisionHookOutput> | DecisionHookOutput;

/**
 * Before export hook
 */
export type BeforeExportHook = (
  input: ExportHookInput,
  context: HookContext
) => Promise<ExportHookInput> | ExportHookInput;

/**
 * After export hook
 */
export type AfterExportHook = (
  input: ExportHookInput,
  output: ExportHookOutput,
  context: HookContext
) => Promise<ExportHookOutput> | ExportHookOutput;

/**
 * After governance hook
 */
export type AfterGovernanceHook = (
  input: GovernanceHookInput,
  output: GovernanceHookOutput,
  context: HookContext
) => Promise<GovernanceHookOutput> | GovernanceHookOutput;

/**
 * Before validation hook
 */
export type BeforeValidationHook = (
  input: ValidationHookInput,
  context: HookContext
) => Promise<ValidationHookInput> | ValidationHookInput;

/**
 * After validation hook
 */
export type AfterValidationHook = (
  input: ValidationHookInput,
  output: ValidationHookOutput,
  context: HookContext
) => Promise<ValidationHookOutput> | ValidationHookOutput;

// ============================================
// Hook Input/Output Types
// ============================================

/**
 * Decision hook input
 */
export interface DecisionHookInput {
  readonly foreground: string;
  readonly background: string;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly context?: Record<string, unknown>;
}

/**
 * Decision hook output
 */
export interface DecisionHookOutput {
  readonly decision: unknown; // ContrastDecision
  readonly metadata?: Record<string, unknown>;
}

/**
 * Export hook input
 */
export interface ExportHookInput {
  readonly format: string;
  readonly tokens: unknown;
  readonly options?: Record<string, unknown>;
}

/**
 * Export hook output
 */
export interface ExportHookOutput {
  readonly content: string;
  readonly files?: ReadonlyArray<{ path: string; content: string }>;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Governance hook input
 */
export interface GovernanceHookInput {
  readonly decision: unknown;
  readonly policies: ReadonlyArray<unknown>;
  readonly context?: Record<string, unknown>;
}

/**
 * Governance hook output
 */
export interface GovernanceHookOutput {
  readonly evaluation: unknown; // GovernanceEvaluation
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation hook input
 */
export interface ValidationHookInput {
  readonly foreground: string;
  readonly background: string;
  readonly standard: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Validation hook output
 */
export interface ValidationHookOutput {
  readonly passed: boolean;
  readonly details: unknown;
  readonly metadata?: Record<string, unknown>;
}

// ============================================
// Plugin Manager Interface
// ============================================

/**
 * Interface for plugin manager
 */
export interface IPluginManager {
  /**
   * Register a plugin
   */
  register(plugin: ColorIntelligencePlugin): Promise<void>;

  /**
   * Unregister a plugin
   */
  unregister(id: PluginId): Promise<void>;

  /**
   * Load a plugin (activate)
   */
  load(id: PluginId, config?: Record<string, unknown>): Promise<void>;

  /**
   * Unload a plugin (deactivate)
   */
  unload(id: PluginId): Promise<void>;

  /**
   * Get plugin by ID
   */
  get(id: PluginId): ColorIntelligencePlugin | null;

  /**
   * List all plugins
   */
  list(options?: PluginListOptions): ReadonlyArray<PluginInfo>;

  /**
   * Get plugin state
   */
  getState(id: PluginId): PluginState;

  /**
   * Execute hooks of a specific type
   */
  executeHook<T extends keyof PluginHooks>(
    hookType: T,
    ...args: unknown[]
  ): Promise<unknown>;

  /**
   * Check if plugin can be loaded
   */
  canLoad(plugin: ColorIntelligencePlugin): PluginCompatibilityResult;

  /**
   * Validate plugin configuration
   */
  validateConfig(
    id: PluginId,
    config: Record<string, unknown>
  ): ConfigValidationResult;
}

/**
 * Options for listing plugins
 */
export interface PluginListOptions {
  readonly category?: PluginCategory;
  readonly state?: PluginState;
  readonly capabilities?: Partial<PluginCapabilities>;
}

/**
 * Plugin info (lightweight)
 */
export interface PluginInfo {
  readonly id: PluginId;
  readonly name: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly state: PluginState;
  readonly capabilities: PluginCapabilities;
}

/**
 * Plugin compatibility check result
 */
export interface PluginCompatibilityResult {
  readonly compatible: boolean;
  readonly issues: ReadonlyArray<PluginCompatibilityIssue>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Plugin compatibility issue
 */
export interface PluginCompatibilityIssue {
  readonly type: 'version' | 'dependency' | 'capability' | 'policy';
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<ConfigValidationError>;
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  readonly property: string;
  readonly message: string;
  readonly expected: string;
  readonly actual: unknown;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a plugin definition
 */
export function createPlugin(
  config: CreatePluginConfig
): ColorIntelligencePlugin {
  return {
    id: createPluginId(config.author, config.name),
    name: config.name,
    description: config.description,
    version: config.version,
    author: config.author,
    license: config.license ?? 'MIT',
    homepage: config.homepage,
    repository: config.repository,
    category: config.category,
    tags: config.tags ?? [],
    capabilities: config.capabilities ?? {
      canModifyDecisions: false,
      canModifyExports: false,
      canAccessGovernance: false,
      canViolatePolicies: false,
      requiresNetwork: false,
      requiresStorage: false,
    },
    dependencies: config.dependencies,
    peerDependencies: config.peerDependencies,
    colorIntelligenceVersion: config.colorIntelligenceVersion ?? '^5.0.0',
    minConformanceLevel: config.minConformanceLevel,
    hooks: config.hooks,
    configSchema: config.configSchema,
    policyViolations: config.policyViolations,
  };
}

/**
 * Configuration for creating a plugin
 */
export interface CreatePluginConfig {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly category: PluginCategory;
  readonly tags?: ReadonlyArray<string>;
  readonly capabilities?: PluginCapabilities;
  readonly dependencies?: ReadonlyArray<PluginDependency>;
  readonly peerDependencies?: ReadonlyArray<PluginDependency>;
  readonly colorIntelligenceVersion?: string;
  readonly minConformanceLevel?: ConformanceLevel;
  readonly hooks: PluginHooks;
  readonly configSchema?: PluginConfigSchema;
  readonly policyViolations?: ReadonlyArray<PolicyViolationDeclaration>;
}

/**
 * Create a simple hook-only plugin
 */
export function createSimplePlugin(
  author: string,
  name: string,
  hooks: PluginHooks,
  options?: Partial<Omit<CreatePluginConfig, 'name' | 'author' | 'hooks'>>
): ColorIntelligencePlugin {
  return createPlugin({
    name,
    author,
    hooks,
    description: options?.description ?? `${name} plugin`,
    version: options?.version ?? '1.0.0',
    category: options?.category ?? 'experimental',
    ...options,
  });
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for ColorIntelligencePlugin
 */
export function isColorIntelligencePlugin(
  value: unknown
): value is ColorIntelligencePlugin {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['version'] === 'string' &&
    typeof obj['author'] === 'string' &&
    typeof obj['category'] === 'string' &&
    typeof obj['hooks'] === 'object'
  );
}

/**
 * Type guard for PluginHooks
 */
export function hasPluginHook<K extends keyof PluginHooks>(
  hooks: PluginHooks,
  hookName: K
): hooks is PluginHooks & { [P in K]: NonNullable<PluginHooks[P]> } {
  return typeof hooks[hookName] === 'function';
}
