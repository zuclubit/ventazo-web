// ============================================
// Plugin Manager
// Phase 5: Ecosystem Layer
// ============================================
//
// The Plugin Manager handles registration, lifecycle,
// and execution of Color Intelligence plugins.
//
// Key Features:
// - Plugin registration and validation
// - Lifecycle management (load, unload, suspend)
// - Hook execution pipeline
// - Sandboxed execution environment
// - Configuration validation
//
// ============================================

import {
  type ColorIntelligencePlugin,
  type PluginId,
  type PluginState,
  type PluginHooks,
  type PluginCapabilities,
  type PluginCategory,
  type PluginInfo,
  type PluginListOptions,
  type PluginCompatibilityResult,
  type PluginCompatibilityIssue,
  type ConfigValidationResult,
  type ConfigValidationError,
  type HookContext,
  type IPluginManager,
  isValidPluginId,
  isColorIntelligencePlugin,
  hasPluginHook,
} from '../../domain/specification';

import { SPECIFICATION_VERSION } from '../../domain/specification';

// ============================================
// Plugin Manager Implementation
// ============================================

/**
 * Plugin Manager for Color Intelligence extension system
 */
export class PluginManager implements IPluginManager {
  private readonly plugins: Map<PluginId, PluginEntry>;
  private readonly systemVersion: string;
  private readonly hooks: HookRegistry;

  constructor() {
    this.plugins = new Map();
    this.systemVersion = SPECIFICATION_VERSION;
    this.hooks = new HookRegistry();
  }

  // ============================================
  // Registration
  // ============================================

  /**
   * Register a plugin
   */
  async register(plugin: ColorIntelligencePlugin): Promise<void> {
    // Validate plugin structure
    if (!isColorIntelligencePlugin(plugin)) {
      throw new PluginError('PLUGIN_INVALID', 'Invalid plugin structure');
    }

    // Validate plugin ID
    if (!isValidPluginId(plugin.id)) {
      throw new PluginError('PLUGIN_ID_INVALID', `Invalid plugin ID: ${plugin.id}`);
    }

    // Check for duplicate
    if (this.plugins.has(plugin.id)) {
      throw new PluginError('PLUGIN_DUPLICATE', `Plugin already registered: ${plugin.id}`);
    }

    // Check compatibility
    const compatibility = this.canLoad(plugin);
    if (!compatibility.compatible) {
      const errors = compatibility.issues.filter(i => i.severity === 'error');
      throw new PluginError(
        'PLUGIN_INCOMPATIBLE',
        `Plugin incompatible: ${errors.map(e => e.message).join(', ')}`
      );
    }

    // Register plugin
    this.plugins.set(plugin.id, {
      plugin,
      state: 'unloaded',
      config: {},
      loadedAt: null,
      errors: [],
    });
  }

  /**
   * Unregister a plugin
   */
  async unregister(id: PluginId): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin not found: ${id}`);
    }

    // Unload if loaded
    if (entry.state !== 'unloaded') {
      await this.unload(id);
    }

    // Remove from registry
    this.plugins.delete(id);
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Load a plugin (activate)
   */
  async load(id: PluginId, config?: Record<string, unknown>): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin not found: ${id}`);
    }

    if (entry.state === 'active' || entry.state === 'loaded') {
      return; // Already loaded
    }

    // Validate config if provided
    if (config) {
      const validation = this.validateConfig(id, config);
      if (!validation.valid) {
        throw new PluginError(
          'CONFIG_INVALID',
          `Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }
      entry.config = config;
    }

    // Update state
    entry.state = 'loading';

    try {
      // Execute onLoad hook
      const context = this.createHookContext(id, entry.config);
      if (hasPluginHook(entry.plugin.hooks, 'onLoad')) {
        await entry.plugin.hooks.onLoad!(context);
      }

      // Register hooks
      this.hooks.register(entry.plugin);

      // Mark as active
      entry.state = 'active';
      entry.loadedAt = new Date().toISOString();
    } catch (error) {
      entry.state = 'error';
      entry.errors.push(error instanceof Error ? error.message : 'Unknown error');

      // Execute error hook if available
      if (hasPluginHook(entry.plugin.hooks, 'onError')) {
        const context = this.createHookContext(id, entry.config);
        await entry.plugin.hooks.onError!(error as Error, context);
      }

      throw new PluginError('PLUGIN_LOAD_FAILED', `Failed to load plugin: ${error}`);
    }
  }

  /**
   * Unload a plugin (deactivate)
   */
  async unload(id: PluginId): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new PluginError('PLUGIN_NOT_FOUND', `Plugin not found: ${id}`);
    }

    if (entry.state === 'unloaded') {
      return; // Already unloaded
    }

    entry.state = 'unloading';

    try {
      // Execute onUnload hook
      const context = this.createHookContext(id, entry.config);
      if (hasPluginHook(entry.plugin.hooks, 'onUnload')) {
        await entry.plugin.hooks.onUnload!(context);
      }

      // Unregister hooks
      this.hooks.unregister(entry.plugin);

      // Mark as unloaded
      entry.state = 'unloaded';
      entry.loadedAt = null;
    } catch (error) {
      entry.state = 'error';
      entry.errors.push(error instanceof Error ? error.message : 'Unknown error');
      throw new PluginError('PLUGIN_UNLOAD_FAILED', `Failed to unload plugin: ${error}`);
    }
  }

  // ============================================
  // Query
  // ============================================

  /**
   * Get plugin by ID
   */
  get(id: PluginId): ColorIntelligencePlugin | null {
    const entry = this.plugins.get(id);
    return entry?.plugin ?? null;
  }

  /**
   * List all plugins
   */
  list(options?: PluginListOptions): ReadonlyArray<PluginInfo> {
    const entries = Array.from(this.plugins.values());

    return entries
      .filter(entry => {
        if (options?.category && entry.plugin.category !== options.category) {
          return false;
        }
        if (options?.state && entry.state !== options.state) {
          return false;
        }
        if (options?.capabilities) {
          const caps = entry.plugin.capabilities;
          for (const [key, value] of Object.entries(options.capabilities)) {
            if (caps[key as keyof PluginCapabilities] !== value) {
              return false;
            }
          }
        }
        return true;
      })
      .map(entry => ({
        id: entry.plugin.id,
        name: entry.plugin.name,
        version: entry.plugin.version,
        category: entry.plugin.category,
        state: entry.state,
        capabilities: entry.plugin.capabilities,
      }));
  }

  /**
   * Get plugin state
   */
  getState(id: PluginId): PluginState {
    const entry = this.plugins.get(id);
    return entry?.state ?? 'unloaded';
  }

  // ============================================
  // Hook Execution
  // ============================================

  /**
   * Execute hooks of a specific type
   */
  async executeHook<T extends keyof PluginHooks>(
    hookType: T,
    ...args: unknown[]
  ): Promise<unknown> {
    return this.hooks.execute(hookType, args, this.createGlobalContext());
  }

  // ============================================
  // Validation
  // ============================================

  /**
   * Check if plugin can be loaded
   */
  canLoad(plugin: ColorIntelligencePlugin): PluginCompatibilityResult {
    const issues: PluginCompatibilityIssue[] = [];
    const warnings: string[] = [];

    // Check version compatibility
    if (!this.isVersionCompatible(plugin.colorIntelligenceVersion)) {
      issues.push({
        type: 'version',
        message: `Incompatible version: requires ${plugin.colorIntelligenceVersion}, have ${this.systemVersion}`,
        severity: 'error',
      });
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep.id)) {
          if (dep.optional) {
            warnings.push(`Optional dependency not available: ${dep.id}`);
          } else {
            issues.push({
              type: 'dependency',
              message: `Missing required dependency: ${dep.id}`,
              severity: 'error',
            });
          }
        }
      }
    }

    // Check capabilities
    if (plugin.capabilities.canViolatePolicies) {
      if (!plugin.policyViolations || plugin.policyViolations.length === 0) {
        issues.push({
          type: 'capability',
          message: 'canViolatePolicies requires policyViolations declaration',
          severity: 'error',
        });
      }
    }

    // Check conformance level
    if (plugin.minConformanceLevel) {
      warnings.push(`Plugin requires conformance level: ${plugin.minConformanceLevel}`);
    }

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Validate plugin configuration
   */
  validateConfig(id: PluginId, config: Record<string, unknown>): ConfigValidationResult {
    const entry = this.plugins.get(id);
    if (!entry) {
      return {
        valid: false,
        errors: [{ property: '', message: 'Plugin not found', expected: '', actual: id }],
      };
    }

    const schema = entry.plugin.configSchema;
    if (!schema) {
      return { valid: true, errors: [] }; // No schema, any config is valid
    }

    const errors: ConfigValidationError[] = [];

    // Check required properties
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in config)) {
          errors.push({
            property: required,
            message: `Required property missing: ${required}`,
            expected: 'present',
            actual: undefined,
          });
        }
      }
    }

    // Validate property types
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = config[key];
      if (value === undefined) continue;

      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== propSchema.type) {
        errors.push({
          property: key,
          message: `Invalid type for ${key}`,
          expected: propSchema.type,
          actual: actualType,
        });
      }

      // Check enum values
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push({
          property: key,
          message: `Invalid value for ${key}`,
          expected: `one of: ${propSchema.enum.join(', ')}`,
          actual: value,
        });
      }

      // Check number constraints
      if (propSchema.type === 'number' && typeof value === 'number') {
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push({
            property: key,
            message: `Value below minimum for ${key}`,
            expected: `>= ${propSchema.minimum}`,
            actual: value,
          });
        }
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push({
            property: key,
            message: `Value above maximum for ${key}`,
            expected: `<= ${propSchema.maximum}`,
            actual: value,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private isVersionCompatible(requiredVersion: string): boolean {
    // Simple semver range check
    // In production, use a proper semver library
    if (requiredVersion.startsWith('^')) {
      const majorStr = requiredVersion.slice(1).split('.')[0] ?? '0';
      const currentMajorStr = this.systemVersion.split('.')[0] ?? '0';
      const major = parseInt(majorStr, 10);
      const currentMajor = parseInt(currentMajorStr, 10);
      return major === currentMajor;
    }
    if (requiredVersion.startsWith('>=')) {
      const required = requiredVersion.slice(2);
      return this.compareVersions(this.systemVersion, required) >= 0;
    }
    return requiredVersion === this.systemVersion;
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] ?? 0;
      const partB = partsB[i] ?? 0;
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    return 0;
  }

  private createHookContext(id: PluginId, config: Record<string, unknown>): HookContext {
    return {
      pluginId: id,
      pluginConfig: config,
      systemVersion: this.systemVersion,
      timestamp: new Date().toISOString(),
    };
  }

  private createGlobalContext(): HookContext {
    return {
      pluginId: 'system/core' as PluginId,
      pluginConfig: {},
      systemVersion: this.systemVersion,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// Hook Registry
// ============================================

class HookRegistry {
  private readonly beforeDecision: Map<PluginId, PluginHooks['beforeDecision']>;
  private readonly afterDecision: Map<PluginId, PluginHooks['afterDecision']>;
  private readonly beforeExport: Map<PluginId, PluginHooks['beforeExport']>;
  private readonly afterExport: Map<PluginId, PluginHooks['afterExport']>;
  private readonly afterGovernance: Map<PluginId, PluginHooks['afterGovernance']>;
  private readonly beforeValidation: Map<PluginId, PluginHooks['beforeValidation']>;
  private readonly afterValidation: Map<PluginId, PluginHooks['afterValidation']>;

  constructor() {
    this.beforeDecision = new Map();
    this.afterDecision = new Map();
    this.beforeExport = new Map();
    this.afterExport = new Map();
    this.afterGovernance = new Map();
    this.beforeValidation = new Map();
    this.afterValidation = new Map();
  }

  register(plugin: ColorIntelligencePlugin): void {
    const hooks = plugin.hooks;

    if (hooks.beforeDecision) this.beforeDecision.set(plugin.id, hooks.beforeDecision);
    if (hooks.afterDecision) this.afterDecision.set(plugin.id, hooks.afterDecision);
    if (hooks.beforeExport) this.beforeExport.set(plugin.id, hooks.beforeExport);
    if (hooks.afterExport) this.afterExport.set(plugin.id, hooks.afterExport);
    if (hooks.afterGovernance) this.afterGovernance.set(plugin.id, hooks.afterGovernance);
    if (hooks.beforeValidation) this.beforeValidation.set(plugin.id, hooks.beforeValidation);
    if (hooks.afterValidation) this.afterValidation.set(plugin.id, hooks.afterValidation);
  }

  unregister(plugin: ColorIntelligencePlugin): void {
    this.beforeDecision.delete(plugin.id);
    this.afterDecision.delete(plugin.id);
    this.beforeExport.delete(plugin.id);
    this.afterExport.delete(plugin.id);
    this.afterGovernance.delete(plugin.id);
    this.beforeValidation.delete(plugin.id);
    this.afterValidation.delete(plugin.id);
  }

  async execute<T extends keyof PluginHooks>(
    hookType: T,
    args: unknown[],
    context: HookContext
  ): Promise<unknown> {
    const registry = this.getRegistry(hookType);
    let result = args[0];

    for (const [pluginId, hook] of Array.from(registry.entries())) {
      if (hook) {
        try {
          const pluginContext = { ...context, pluginId };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (hook as any)(result, ...args.slice(1), pluginContext);
        } catch (error) {
          console.error(`Hook error in plugin ${pluginId}:`, error);
          // Continue with next plugin
        }
      }
    }

    return result;
  }

  private getRegistry<T extends keyof PluginHooks>(
    hookType: T
  ): Map<PluginId, PluginHooks[T]> {
    switch (hookType) {
      case 'beforeDecision':
        return this.beforeDecision as Map<PluginId, PluginHooks[T]>;
      case 'afterDecision':
        return this.afterDecision as Map<PluginId, PluginHooks[T]>;
      case 'beforeExport':
        return this.beforeExport as Map<PluginId, PluginHooks[T]>;
      case 'afterExport':
        return this.afterExport as Map<PluginId, PluginHooks[T]>;
      case 'afterGovernance':
        return this.afterGovernance as Map<PluginId, PluginHooks[T]>;
      case 'beforeValidation':
        return this.beforeValidation as Map<PluginId, PluginHooks[T]>;
      case 'afterValidation':
        return this.afterValidation as Map<PluginId, PluginHooks[T]>;
      default:
        return new Map();
    }
  }
}

// ============================================
// Plugin Entry
// ============================================

interface PluginEntry {
  plugin: ColorIntelligencePlugin;
  state: PluginState;
  config: Record<string, unknown>;
  loadedAt: string | null;
  errors: string[];
}

// ============================================
// Plugin Error
// ============================================

class PluginError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Plugin Manager instance
 */
export function createPluginManager(): PluginManager {
  return new PluginManager();
}
