// ============================================
// Color Intelligence - Experimental API
// Version: 4.0.0
// ============================================
//
// This file exports EXPERIMENTAL features that may change
// without notice between minor versions.
//
// Use with caution in production. These APIs are subject to:
// - Signature changes
// - Behavioral changes
// - Removal without deprecation warning
//
// For stable APIs, use './public-api.ts'
//
// ============================================

// ============================================
// Experimental Flag
// ============================================

export const EXPERIMENTAL = true;
export const EXPERIMENTAL_VERSION = '4.0.0-experimental';

/**
 * Warning: This import includes experimental APIs
 *
 * @experimental
 */
export function getExperimentalWarning(): string {
  return `
WARNING: You are using experimental Color Intelligence APIs.

These features may change or be removed without notice.
Do not rely on them for production code without fallbacks.

Current experimental version: ${EXPERIMENTAL_VERSION}
  `.trim();
}

// ============================================
// Experimental Color Difference Algorithms
// ============================================

/**
 * CAM16 color appearance model
 *
 * @experimental - API may change
 *
 * CAM16 provides more accurate color appearance prediction
 * than simpler models, accounting for viewing conditions.
 *
 * @example
 * ```typescript
 * import { CAM16 } from './experimental-api';
 *
 * const cam = CAM16.fromHex('#1E40AF', {
 *   whitePoint: 'D65',
 *   adaptingLuminance: 64,
 *   surroundType: 'average',
 * });
 *
 * console.log(cam.J); // Lightness
 * console.log(cam.C); // Chroma
 * console.log(cam.h); // Hue angle
 * ```
 */
// export { CAM16 } from './domain/value-objects/CAM16';
// export type { CAM16Values, CAM16ViewingConditions } from './domain/value-objects/CAM16';

/**
 * Color difference algorithms
 *
 * @experimental - Algorithm selection may change
 *
 * Provides multiple delta-E formulas for color comparison:
 * - DeltaE76: CIE 1976 (Euclidean in Lab)
 * - DeltaE94: CIE 1994 (weighted Lab)
 * - DeltaE2000: CIEDE2000 (perceptually uniform)
 * - DeltaEOK: OKLCH-based difference
 *
 * @example
 * ```typescript
 * import { ColorDifference } from './experimental-api';
 *
 * const diff = ColorDifference.deltaE2000('#1E40AF', '#3B82F6');
 * console.log(diff); // Perceptual difference
 *
 * if (diff < 1) {
 *   console.log('Colors are indistinguishable');
 * } else if (diff < 3) {
 *   console.log('Colors are barely distinguishable');
 * } else if (diff < 6) {
 *   console.log('Colors are noticeable');
 * }
 * ```
 */
// export { ColorDifference } from './domain/services/ColorDifference';
// export type { DeltaEMethod, DeltaEResult } from './domain/services/ColorDifference';

/**
 * Advanced gamut mapping strategies
 *
 * @experimental - Algorithms may change
 *
 * Provides multiple strategies for mapping out-of-gamut colors:
 * - Clipping: Simple RGB clipping
 * - Chroma reduction: Reduce saturation while preserving hue/lightness
 * - Lightness preservation: Adjust chroma and lightness together
 * - Cusp projection: Project toward gamut cusp
 *
 * @example
 * ```typescript
 * import { GamutMapping } from './experimental-api';
 *
 * const mapped = GamutMapping.toSRGB(oklchColor, {
 *   method: 'chroma-reduction',
 *   preserveLightness: true,
 *   tolerance: 0.001,
 * });
 * ```
 */
// export { GamutMapping } from './domain/services/GamutMapping';
// export type { GamutMappingMethod, GamutMappingOptions } from './domain/services/GamutMapping';

// ============================================
// Experimental Governance Features
// ============================================

/**
 * Auto-fix strategies for governance violations
 *
 * @experimental - Strategy algorithms may change
 *
 * Provides automated fixes for common accessibility violations:
 * - Contrast increase: Adjust lightness to meet contrast
 * - Font size minimum: Suggest larger font sizes
 * - Chroma reduction: Reduce saturation for color blindness
 *
 * @example
 * ```typescript
 * import { AutoFixStrategies } from './experimental-api';
 *
 * const strategy = AutoFixStrategies.contrastIncrease({
 *   targetLc: 60,
 *   preserveHue: true,
 *   maxIterations: 10,
 * });
 *
 * const fixed = strategy.apply(decision);
 * ```
 */
// export { AutoFixStrategies } from './application/governance/strategies';
// export type { AutoFixStrategy, AutoFixResult } from './application/governance/strategies';

/**
 * Policy inheritance resolver
 *
 * @experimental - Resolution algorithm may change
 *
 * Resolves policy inheritance chains with conflict detection.
 *
 * @example
 * ```typescript
 * import { PolicyInheritanceResolver } from './experimental-api';
 *
 * const resolver = new PolicyInheritanceResolver(registry);
 * const resolved = await resolver.resolve('my-policy', {
 *   maxDepth: 10,
 *   conflictResolution: 'most-strict',
 * });
 * ```
 */
// export { PolicyInheritanceResolver } from './application/governance/PolicyInheritanceResolver';

// ============================================
// Experimental Token Operations
// ============================================

/**
 * Token transformation pipeline
 *
 * @experimental - Pipeline stages may change
 *
 * Provides a pipeline for transforming tokens between formats
 * with validation at each stage.
 *
 * @example
 * ```typescript
 * import { TokenPipeline } from './experimental-api';
 *
 * const pipeline = TokenPipeline.create()
 *   .addStage('validate', validators.dtcg())
 *   .addStage('transform', transformers.colorSpace('oklch'))
 *   .addStage('export', exporters.tailwind());
 *
 * const result = await pipeline.run(tokens);
 * ```
 */
// export { TokenPipeline } from './infrastructure/exporters/TokenPipeline';
// export type { PipelineStage, PipelineResult } from './infrastructure/exporters/TokenPipeline';

/**
 * Token diffing and merging
 *
 * @experimental - Diff format may change
 *
 * Compare token files and generate patches.
 *
 * @example
 * ```typescript
 * import { TokenDiff } from './experimental-api';
 *
 * const diff = TokenDiff.compare(oldTokens, newTokens);
 * console.log(diff.added);
 * console.log(diff.removed);
 * console.log(diff.modified);
 *
 * const patch = TokenDiff.toPatch(diff);
 * const merged = TokenDiff.applyPatch(oldTokens, patch);
 * ```
 */
// export { TokenDiff } from './infrastructure/exporters/TokenDiff';
// export type { TokenDiffResult, TokenPatch } from './infrastructure/exporters/TokenDiff';

// ============================================
// Experimental AI Features
// ============================================

/**
 * AI color suggestion engine
 *
 * @experimental - Model integration may change
 *
 * Generates color suggestions using AI models.
 *
 * @example
 * ```typescript
 * import { AIColorSuggestion } from './experimental-api';
 *
 * const engine = new AIColorSuggestion({
 *   model: 'color-intelligence-v1',
 *   maxSuggestions: 5,
 * });
 *
 * const suggestions = await engine.suggestPalette({
 *   baseColor: '#1E40AF',
 *   mood: 'professional',
 *   accessibilityLevel: 'AAA',
 * });
 * ```
 */
// export { AIColorSuggestion } from './application/ai/AIColorSuggestion';
// export type { SuggestionConfig, SuggestionResult } from './application/ai/AIColorSuggestion';

/**
 * Contract negotiation for multi-agent systems
 *
 * @experimental - Negotiation protocol may change
 *
 * Allows AI agents to negotiate color constraints.
 *
 * @example
 * ```typescript
 * import { ContractNegotiator } from './experimental-api';
 *
 * const negotiator = new ContractNegotiator();
 *
 * const agreedContract = await negotiator.negotiate([
 *   designerContract,
 *   developerContract,
 *   accessibilityContract,
 * ], {
 *   strategy: 'most-restrictive',
 *   maxRounds: 3,
 * });
 * ```
 */
// export { ContractNegotiator } from './application/ai-contracts/ContractNegotiator';
// export type { NegotiationStrategy, NegotiationResult } from './application/ai-contracts/ContractNegotiator';

// ============================================
// Experimental Performance Features
// ============================================

/**
 * WebWorker-based color processing
 *
 * @experimental - Worker API may change
 *
 * Offloads heavy color calculations to web workers.
 *
 * @example
 * ```typescript
 * import { ColorWorkerPool } from './experimental-api';
 *
 * const pool = new ColorWorkerPool({ workers: 4 });
 *
 * const results = await pool.processBatch(colors, {
 *   operation: 'convert',
 *   targetSpace: 'oklch',
 * });
 *
 * pool.terminate();
 * ```
 */
// export { ColorWorkerPool } from './infrastructure/workers/ColorWorkerPool';
// export type { WorkerPoolConfig, WorkerTask } from './infrastructure/workers/ColorWorkerPool';

/**
 * GPU-accelerated color operations
 *
 * @experimental - WebGPU API is not widely supported
 *
 * Uses WebGPU for batch color processing.
 *
 * @example
 * ```typescript
 * import { GPUColorProcessor } from './experimental-api';
 *
 * if (await GPUColorProcessor.isSupported()) {
 *   const processor = await GPUColorProcessor.create();
 *
 *   const palettes = await processor.generateTonalPalettes(
 *     colors,
 *     { tones: [10, 20, 30, 40, 50, 60, 70, 80, 90] }
 *   );
 * }
 * ```
 */
// export { GPUColorProcessor } from './infrastructure/gpu/GPUColorProcessor';
// export type { GPUProcessorConfig } from './infrastructure/gpu/GPUColorProcessor';

// ============================================
// Placeholder Exports
// ============================================
// These are placeholders for features under development.
// Uncomment when implementations are ready.

/**
 * Experimental features status
 */
export interface ExperimentalFeatureStatus {
  readonly feature: string;
  readonly status: 'planned' | 'in-development' | 'alpha' | 'beta';
  readonly expectedStable: string | null;
  readonly description: string;
}

/**
 * Get status of all experimental features
 */
export function getExperimentalFeaturesStatus(): ReadonlyArray<ExperimentalFeatureStatus> {
  return [
    {
      feature: 'CAM16',
      status: 'planned',
      expectedStable: '5.0.0',
      description: 'CAM16 color appearance model implementation',
    },
    {
      feature: 'ColorDifference',
      status: 'planned',
      expectedStable: '5.0.0',
      description: 'Advanced delta-E algorithms (76, 94, 2000, OK)',
    },
    {
      feature: 'GamutMapping',
      status: 'in-development',
      expectedStable: '4.1.0',
      description: 'Advanced gamut mapping strategies',
    },
    {
      feature: 'AutoFixStrategies',
      status: 'alpha',
      expectedStable: '4.1.0',
      description: 'Automated governance violation fixes',
    },
    {
      feature: 'TokenPipeline',
      status: 'planned',
      expectedStable: '4.2.0',
      description: 'Token transformation pipelines',
    },
    {
      feature: 'AIColorSuggestion',
      status: 'planned',
      expectedStable: '5.0.0',
      description: 'AI-powered color suggestions',
    },
    {
      feature: 'ColorWorkerPool',
      status: 'planned',
      expectedStable: '4.2.0',
      description: 'WebWorker-based batch processing',
    },
    {
      feature: 'GPUColorProcessor',
      status: 'planned',
      expectedStable: '5.0.0',
      description: 'WebGPU-accelerated operations',
    },
  ];
}

// ============================================
// Documentation
// ============================================

/**
 * @module color-intelligence/experimental-api
 *
 * # Experimental Features
 *
 * This module exports features that are still in development
 * or may change in future versions.
 *
 * ## Stability Levels
 *
 * - **planned**: Feature is on the roadmap but not implemented
 * - **in-development**: Implementation in progress
 * - **alpha**: Early implementation, expect breaking changes
 * - **beta**: Feature-complete, minor changes possible
 *
 * ## Feedback
 *
 * We welcome feedback on experimental features. Please file
 * issues with the tag `experimental` to share your experience.
 *
 * ## Promotion to Stable
 *
 * Features graduate to the stable API when:
 * 1. API design is finalized
 * 2. Implementation is complete
 * 3. Tests cover all edge cases
 * 4. Documentation is comprehensive
 * 5. At least one minor version with no breaking changes
 */
