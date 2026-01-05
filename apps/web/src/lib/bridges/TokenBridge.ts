/**
 * @fileoverview TokenBridge - Adapter between UI-Kit TokenCollection and legacy design-tokens
 *
 * This bridge connects @zuclubit/ui-kit's TokenCollection/DesignToken (W3C DTCG compliant)
 * with the existing static design-tokens.ts system.
 *
 * Architecture:
 * - Legacy: Static TYPOGRAPHY, SPACING, COMPONENTS, ANIMATION, Z_INDEX, BREAKPOINTS
 * - UI-Kit: Immutable TokenCollection with DesignToken value objects
 * - Bridge: Bidirectional conversion and unified access API
 *
 * @module web/lib/bridges/TokenBridge
 * @version 1.0.0
 */

import {
  DesignToken,
  TokenCollection,
  TokenDerivationService,
  PerceptualColor,
  type TokenContext,
  type TokenCategory,
  type TokenType,
} from '@zuclubit/ui-kit/domain';

import {
  TYPOGRAPHY,
  SPACING,
  COMPONENTS,
  ANIMATION,
  Z_INDEX,
  BREAKPOINTS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  SCORE_COLORS,
} from '@/lib/design-tokens';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Token namespaces for organizing the design system.
 */
export type TokenNamespace =
  | 'typography'
  | 'spacing'
  | 'component'
  | 'animation'
  | 'z-index'
  | 'breakpoint'
  | 'status'
  | 'priority'
  | 'score'
  | 'color'
  | 'shadow'
  | 'custom';

/**
 * Export format options.
 */
export type TokenExportFormat = 'css' | 'scss' | 'json' | 'w3c' | 'tailwind' | 'figma';

/**
 * Token bridge configuration.
 */
export interface TokenBridgeConfig {
  readonly namespace: string;
  readonly version: string;
  readonly description: string;
  readonly includeDeprecated: boolean;
}

/**
 * Collection statistics.
 */
export interface TokenStats {
  readonly total: number;
  readonly byType: Record<string, number>;
  readonly byCategory: Record<string, number>;
  readonly byNamespace: Record<string, number>;
}

// ============================================================================
// SINGLETON CACHE
// ============================================================================

let _cachedCollections: Map<string, TokenCollection> | null = null;
let _derivationService: TokenDerivationService | null = null;

// ============================================================================
// TOKEN BRIDGE
// ============================================================================

/**
 * TokenBridge - Unified access to design tokens from both legacy and UI-Kit systems.
 *
 * Features:
 * - Converts static design-tokens.ts to immutable TokenCollection
 * - Provides type-safe access to typography, spacing, components, etc.
 * - Supports token derivation for dynamic theme generation
 * - Exports to CSS, Tailwind, W3C DTCG, Figma formats
 * - Caches collections for performance
 *
 * @example
 * ```typescript
 * // Get typography tokens as collection
 * const typography = TokenBridge.getTypographyCollection();
 *
 * // Get all tokens merged
 * const allTokens = TokenBridge.getAllTokens();
 *
 * // Export to CSS
 * const css = TokenBridge.exportToCss('typography');
 *
 * // Derive component tokens from brand color
 * const buttonTokens = TokenBridge.deriveComponentTokens('button', '#3B82F6');
 *
 * // Access legacy tokens with type safety
 * const fontSize = TokenBridge.typography.fontSize.lg; // '1.125rem'
 * ```
 */
export class TokenBridge {
  // ─────────────────────────────────────────────────────────────────────────
  // STATIC ACCESS TO LEGACY TOKENS (with full TypeScript types)
  // ─────────────────────────────────────────────────────────────────────────

  static get typography(): typeof TYPOGRAPHY {
    return TYPOGRAPHY;
  }

  static get spacing(): typeof SPACING {
    return SPACING;
  }

  static get components(): typeof COMPONENTS {
    return COMPONENTS;
  }

  static get animation(): typeof ANIMATION {
    return ANIMATION;
  }

  static get zIndex(): typeof Z_INDEX {
    return Z_INDEX;
  }

  static get breakpoints(): typeof BREAKPOINTS {
    return BREAKPOINTS;
  }

  static get statusColors(): typeof STATUS_COLORS {
    return STATUS_COLORS;
  }

  static get priorityColors(): typeof PRIORITY_COLORS {
    return PRIORITY_COLORS;
  }

  static get scoreColors(): typeof SCORE_COLORS {
    return SCORE_COLORS;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLLECTION FACTORIES (Convert legacy tokens to TokenCollection)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get derivation service instance (singleton).
   */
  private static getDerivationService(): TokenDerivationService {
    if (!_derivationService) {
      _derivationService = new TokenDerivationService();
    }
    return _derivationService;
  }

  /**
   * Get cached collections map.
   */
  private static getCollectionsCache(): Map<string, TokenCollection> {
    if (!_cachedCollections) {
      _cachedCollections = new Map();
    }
    return _cachedCollections;
  }

  /**
   * Convert typography tokens to TokenCollection.
   */
  static getTypographyCollection(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('typography')) {
      const tokens: DesignToken[] = [];

      // Font sizes
      for (const [key, value] of Object.entries(TYPOGRAPHY.fontSize)) {
        tokens.push(
          DesignToken.dimension(
            `typography.fontSize.${key}`,
            value,
            { role: 'text-primary' },
            `Font size ${key}`
          )
        );
      }

      // Line heights
      for (const [key, value] of Object.entries(TYPOGRAPHY.lineHeight)) {
        tokens.push(
          DesignToken.dimension(
            `typography.lineHeight.${key}`,
            value,
            {},
            `Line height ${key}`
          )
        );
      }

      // Font weights
      for (const [key, value] of Object.entries(TYPOGRAPHY.fontWeight)) {
        tokens.push(
          DesignToken.fontWeight(
            `typography.fontWeight.${key}`,
            parseInt(value, 10),
            `Font weight ${key}`
          )
        );
      }

      cache.set('typography', TokenCollection.from('typography', tokens, 'Typography design tokens'));
    }

    return cache.get('typography')!;
  }

  /**
   * Convert spacing tokens to TokenCollection.
   */
  static getSpacingCollection(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('spacing')) {
      const tokens: DesignToken[] = [];

      for (const [key, value] of Object.entries(SPACING)) {
        tokens.push(
          DesignToken.dimension(
            `spacing.${key}`,
            value as string,
            {},
            `Spacing ${key}`
          )
        );
      }

      cache.set('spacing', TokenCollection.from('spacing', tokens, 'Spacing scale tokens'));
    }

    return cache.get('spacing')!;
  }

  /**
   * Convert component tokens to TokenCollection.
   */
  static getComponentCollection(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('component')) {
      const tokens: DesignToken[] = [];

      // Card tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.card.padding)) {
        tokens.push(
          DesignToken.dimension(
            `component.card.padding.${sizeKey}`,
            value,
            { component: 'card' },
            `Card padding ${sizeKey}`
          )
        );
      }

      tokens.push(
        DesignToken.dimension(
          'component.card.borderRadius',
          COMPONENTS.card.borderRadius,
          { component: 'card' },
          'Card border radius'
        )
      );

      // Button tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.button.height)) {
        tokens.push(
          DesignToken.dimension(
            `component.button.height.${sizeKey}`,
            value,
            { component: 'button' },
            `Button height ${sizeKey}`
          )
        );
      }

      for (const [sizeKey, value] of Object.entries(COMPONENTS.button.padding)) {
        tokens.push(
          DesignToken.dimension(
            `component.button.padding.${sizeKey}`,
            value,
            { component: 'button' },
            `Button padding ${sizeKey}`
          )
        );
      }

      for (const [sizeKey, value] of Object.entries(COMPONENTS.button.fontSize)) {
        tokens.push(
          DesignToken.dimension(
            `component.button.fontSize.${sizeKey}`,
            value,
            { component: 'button' },
            `Button font size ${sizeKey}`
          )
        );
      }

      // Input tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.input.height)) {
        tokens.push(
          DesignToken.dimension(
            `component.input.height.${sizeKey}`,
            value,
            { component: 'input' },
            `Input height ${sizeKey}`
          )
        );
      }

      // Badge tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.badge.height)) {
        tokens.push(
          DesignToken.dimension(
            `component.badge.height.${sizeKey}`,
            value,
            { component: 'badge' },
            `Badge height ${sizeKey}`
          )
        );
      }

      // Avatar tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.avatar)) {
        tokens.push(
          DesignToken.dimension(
            `component.avatar.${sizeKey}`,
            value,
            { component: 'avatar' },
            `Avatar size ${sizeKey}`
          )
        );
      }

      // Icon tokens
      for (const [sizeKey, value] of Object.entries(COMPONENTS.icon)) {
        tokens.push(
          DesignToken.dimension(
            `component.icon.${sizeKey}`,
            value,
            { component: 'icon' },
            `Icon size ${sizeKey}`
          )
        );
      }

      cache.set('component', TokenCollection.from('component', tokens, 'Component design tokens'));
    }

    return cache.get('component')!;
  }

  /**
   * Convert animation tokens to TokenCollection.
   */
  static getAnimationCollection(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('animation')) {
      const tokens: DesignToken[] = [];

      // Durations
      for (const [key, value] of Object.entries(ANIMATION.duration)) {
        tokens.push(
          DesignToken.duration(
            `animation.duration.${key}`,
            value,
            `Animation duration ${key}`
          )
        );
      }

      // Easing
      for (const [key, value] of Object.entries(ANIMATION.easing)) {
        tokens.push(
          DesignToken.cubicBezier(
            `animation.easing.${key}`,
            value,
            `Easing function ${key}`
          )
        );
      }

      cache.set('animation', TokenCollection.from('animation', tokens, 'Animation tokens'));
    }

    return cache.get('animation')!;
  }

  /**
   * Convert breakpoint tokens to TokenCollection.
   */
  static getBreakpointCollection(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('breakpoint')) {
      const tokens: DesignToken[] = [];

      for (const [key, value] of Object.entries(BREAKPOINTS)) {
        tokens.push(
          DesignToken.dimension(
            `breakpoint.${key}`,
            value,
            {},
            `Breakpoint ${key}`
          )
        );
      }

      cache.set('breakpoint', TokenCollection.from('breakpoint', tokens, 'Responsive breakpoints'));
    }

    return cache.get('breakpoint')!;
  }

  /**
   * Get all tokens merged into a single collection.
   */
  static getAllTokens(): TokenCollection {
    const cache = this.getCollectionsCache();

    if (!cache.has('all')) {
      const merged = TokenCollection.merge('design-system', [
        this.getTypographyCollection(),
        this.getSpacingCollection(),
        this.getComponentCollection(),
        this.getAnimationCollection(),
        this.getBreakpointCollection(),
      ]);
      cache.set('all', merged);
    }

    return cache.get('all')!;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOKEN DERIVATION (Dynamic token generation)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Derive component tokens from a brand color.
   *
   * @param componentName - Name of the component (e.g., 'button', 'card')
   * @param brandHex - Brand color in hex format
   * @param intent - Optional intent (e.g., 'action', 'info')
   * @returns TokenCollection with derived tokens
   */
  static deriveComponentTokens(
    componentName: string,
    brandHex: string,
    intent: string = 'action'
  ): TokenCollection {
    const colorResult = PerceptualColor.tryFromHex(brandHex);

    if (!colorResult.success) {
      console.warn(`[TokenBridge] Invalid color: ${brandHex}`);
      return TokenCollection.empty(componentName);
    }

    const service = this.getDerivationService();

    // Import ComponentIntent dynamically to avoid circular deps
    const { ComponentIntent } = require('@zuclubit/ui-kit/domain');
    const componentIntent = ComponentIntent.of(intent);

    return service.deriveComponentTokens(componentName, colorResult.value, componentIntent);
  }

  /**
   * Derive a complete color scale from a base color (50-950).
   *
   * @param baseName - Token name prefix (e.g., 'brand', 'primary')
   * @param baseHex - Base color in hex
   * @param context - Optional token context
   * @returns Array of DesignToken for the scale
   */
  static deriveColorScale(
    baseName: string,
    baseHex: string,
    context: Partial<TokenContext> = {}
  ): DesignToken[] {
    const colorResult = PerceptualColor.tryFromHex(baseHex);

    if (!colorResult.success) {
      console.warn(`[TokenBridge] Invalid color: ${baseHex}`);
      return [];
    }

    const service = this.getDerivationService();
    return service.deriveScale(baseName, colorResult.value, context);
  }

  /**
   * Derive state variants for a color (idle, hover, active, disabled, etc.).
   *
   * @param baseName - Token name prefix
   * @param baseHex - Base color in hex
   * @param context - Optional token context
   * @returns Array of DesignToken for each state
   */
  static deriveStateTokens(
    baseName: string,
    baseHex: string,
    context: Partial<TokenContext> = {}
  ): DesignToken[] {
    const colorResult = PerceptualColor.tryFromHex(baseHex);

    if (!colorResult.success) {
      console.warn(`[TokenBridge] Invalid color: ${baseHex}`);
      return [];
    }

    const service = this.getDerivationService();
    return service.deriveStates(baseName, colorResult.value, context);
  }

  /**
   * Derive a complete theme from a brand color.
   *
   * @param themeName - Theme name
   * @param brandHex - Brand color in hex
   * @param options - Theme generation options
   * @returns TokenCollection with full theme tokens
   */
  static deriveTheme(
    themeName: string,
    brandHex: string,
    options: {
      includeSemanticColors?: boolean;
      includeShadows?: boolean;
      includeSpacing?: boolean;
    } = {}
  ): TokenCollection {
    const colorResult = PerceptualColor.tryFromHex(brandHex);

    if (!colorResult.success) {
      console.warn(`[TokenBridge] Invalid color: ${brandHex}`);
      return TokenCollection.empty(themeName);
    }

    const service = this.getDerivationService();
    return service.deriveTheme(themeName, colorResult.value, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Export tokens to CSS variables.
   *
   * @param namespace - Which collection to export (or 'all')
   * @param options - Export options
   * @returns CSS string with :root variables
   */
  static exportToCss(
    namespace: TokenNamespace | 'all' = 'all',
    options: { prefix?: string; includeDeprecated?: boolean } = {}
  ): string {
    const collection = this.getCollectionByNamespace(namespace);

    return collection.export({
      format: 'css',
      prefix: options.prefix,
      includeDeprecated: options.includeDeprecated ?? false,
    });
  }

  /**
   * Export tokens to Tailwind config.
   *
   * @param namespace - Which collection to export
   * @returns Tailwind config module string
   */
  static exportToTailwind(namespace: TokenNamespace | 'all' = 'all'): string {
    const collection = this.getCollectionByNamespace(namespace);

    return collection.export({
      format: 'tailwind',
      includeDeprecated: false,
    });
  }

  /**
   * Export tokens to W3C DTCG format.
   *
   * @param namespace - Which collection to export
   * @returns JSON string in W3C format
   */
  static exportToW3C(namespace: TokenNamespace | 'all' = 'all'): string {
    const collection = this.getCollectionByNamespace(namespace);

    return collection.export({
      format: 'w3c',
      includeMetadata: true,
    });
  }

  /**
   * Export tokens to Figma Tokens format.
   *
   * @param namespace - Which collection to export
   * @returns JSON string for Figma Tokens plugin
   */
  static exportToFigma(namespace: TokenNamespace | 'all' = 'all'): string {
    const collection = this.getCollectionByNamespace(namespace);

    return collection.export({
      format: 'figma',
      includeMetadata: true,
    });
  }

  /**
   * Get collection by namespace.
   */
  private static getCollectionByNamespace(namespace: TokenNamespace | 'all'): TokenCollection {
    switch (namespace) {
      case 'typography':
        return this.getTypographyCollection();
      case 'spacing':
        return this.getSpacingCollection();
      case 'component':
        return this.getComponentCollection();
      case 'animation':
        return this.getAnimationCollection();
      case 'breakpoint':
        return this.getBreakpointCollection();
      case 'all':
      default:
        return this.getAllTokens();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY & VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Query tokens by filter criteria.
   *
   * @param criteria - Filter criteria
   * @returns Matching tokens
   */
  static query(criteria: {
    name?: string | RegExp;
    type?: TokenType;
    category?: TokenCategory;
    namespace?: string;
    component?: string;
  }): readonly DesignToken[] {
    return this.getAllTokens().filter({
      name: criteria.name,
      type: criteria.type,
      category: criteria.category,
      namespace: criteria.namespace,
      component: criteria.component,
      includeDeprecated: false,
    });
  }

  /**
   * Get a specific token by name.
   *
   * @param name - Token name (e.g., 'typography.fontSize.lg')
   * @returns DesignToken or undefined
   */
  static getToken(name: string): DesignToken | undefined {
    return this.getAllTokens().get(name);
  }

  /**
   * Validate all token collections.
   *
   * @returns Validation results
   */
  static validate(): {
    valid: boolean;
    collections: Record<string, { valid: boolean; errors: string[]; warnings: string[] }>;
  } {
    const collections = [
      { name: 'typography', collection: this.getTypographyCollection() },
      { name: 'spacing', collection: this.getSpacingCollection() },
      { name: 'component', collection: this.getComponentCollection() },
      { name: 'animation', collection: this.getAnimationCollection() },
      { name: 'breakpoint', collection: this.getBreakpointCollection() },
    ];

    const results: Record<string, { valid: boolean; errors: string[]; warnings: string[] }> = {};
    let allValid = true;

    for (const { name, collection } of collections) {
      const validation = collection.validate();
      results[name] = {
        valid: validation.valid,
        errors: validation.errors.map((e) => `[${e.tokenName}] ${e.code}: ${e.message}`),
        warnings: validation.warnings.map((w) => `[${w.tokenName}] ${w.code}: ${w.message}`),
      };

      if (!validation.valid) {
        allValid = false;
      }
    }

    return { valid: allValid, collections: results };
  }

  /**
   * Get token statistics.
   */
  static getStats(): TokenStats {
    const stats = this.getAllTokens().stats();

    return {
      total: stats.totalTokens,
      byType: stats.byType as unknown as Record<string, number>,
      byCategory: stats.byCategory as unknown as Record<string, number>,
      byNamespace: stats.byNamespace,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CACHE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clear cached collections. Call when tokens change at runtime.
   */
  static clearCache(): void {
    _cachedCollections?.clear();
    _cachedCollections = null;
  }

  /**
   * Preload all collections into cache.
   */
  static preload(): void {
    this.getTypographyCollection();
    this.getSpacingCollection();
    this.getComponentCollection();
    this.getAnimationCollection();
    this.getBreakpointCollection();
    this.getAllTokens();
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick access to typography tokens.
 */
export const typography = TokenBridge.typography;

/**
 * Quick access to spacing tokens.
 */
export const spacing = TokenBridge.spacing;

/**
 * Quick access to component tokens.
 */
export const components = TokenBridge.components;

/**
 * Quick access to animation tokens.
 */
export const animation = TokenBridge.animation;

/**
 * Quick access to z-index tokens.
 */
export const zIndex = TokenBridge.zIndex;

/**
 * Quick access to breakpoint tokens.
 */
export const breakpoints = TokenBridge.breakpoints;

export default TokenBridge;
