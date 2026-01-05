/**
 * @fileoverview Tailwind Adapters Index
 *
 * Exporta todos los adaptadores de Tailwind del sistema de diseño.
 *
 * @module ui-kit/adapters/tailwind
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { TailwindConfigAdapter } from '@zuclubit/ui-kit/adapters/tailwind';
 *
 * const adapter = new TailwindConfigAdapter({
 *   useCssVariables: true,
 *   extend: true,
 * });
 *
 * const result = await adapter.generateFull(tokenCollection);
 *
 * // Write to tailwind.config.js
 * fs.writeFileSync('tailwind.config.js', result.value.content);
 * ```
 */

export {
  TailwindConfigAdapter,
  type TailwindAdapterOptions,
  type TailwindConfigResult,
  type TailwindThemeConfig,
  type FullTailwindConfig,
} from './TailwindConfigAdapter';

// Re-export default
export { default } from './TailwindConfigAdapter';
