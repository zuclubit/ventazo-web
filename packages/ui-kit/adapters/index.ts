/**
 * @fileoverview Adapters Layer - UI Kit
 *
 * Capa de adaptadores del sistema de diseño gobernado por Color Intelligence.
 *
 * Esta capa contiene implementaciones concretas de los ports del sistema:
 *
 * ## CSS Adapter
 * Aplica tokens mediante CSS Custom Properties al DOM.
 * - Soporte para modo oscuro
 * - Transiciones animadas
 * - Persistencia de preferencias
 * - Detección de preferencias del sistema
 *
 * ## React Adapter
 * Provider y hooks para integración con React.
 * - ThemeProvider para envolver la aplicación
 * - useTheme para acceso simplificado
 * - useDarkMode para control de modo oscuro
 * - useThemeSwitcher para cambiar entre temas
 * - useThemeVariable para acceder a variables CSS
 * - useSystemPreferences para detectar preferencias del sistema
 *
 * ## Tailwind Adapter
 * Genera configuración de Tailwind CSS desde tokens.
 * - Exportación a múltiples formatos (JS, TS, ESM, CJS, JSON)
 * - Soporte para CSS variables
 * - Generación de plugins
 * - Validación de configuración
 *
 * @module ui-kit/adapters
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * // CSS Adapter
 * import { CssVariablesAdapter } from '@zuclubit/ui-kit/adapters/css';
 *
 * const cssAdapter = new CssVariablesAdapter({
 *   darkModeClass: 'dark',
 *   useDarkModeMediaQuery: true,
 * });
 *
 * await cssAdapter.apply({
 *   name: 'brand',
 *   isDark: false,
 *   tokens: tokenCollection,
 * });
 *
 * // React Adapter
 * import { ThemeProvider, useDarkMode } from '@zuclubit/ui-kit/adapters/react';
 *
 * function App() {
 *   return (
 *     <ThemeProvider initialTheme={brandTheme}>
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // Tailwind Adapter
 * import { TailwindConfigAdapter } from '@zuclubit/ui-kit/adapters/tailwind';
 *
 * const tailwindAdapter = new TailwindConfigAdapter({
 *   useCssVariables: true,
 *   outputFormat: 'ts',
 * });
 *
 * const result = await tailwindAdapter.generateFull(tokenCollection);
 * ```
 */

// ============================================================================
// CSS ADAPTERS
// ============================================================================

export {
  CssVariablesAdapter,
  type CssAdapterOptions,
} from './css';

// ============================================================================
// REACT ADAPTERS
// ============================================================================

export {
  // Provider
  ThemeProvider,
  useThemeContext,
  ThemeContext,
  type ThemeProviderProps,
  type ThemeContextState,
  type ThemeContextActions,
  type ThemeContextValue,
  // Hooks
  useTheme,
  useDarkMode,
  useThemeSwitcher,
  useThemeVariable,
  useSystemPreferences,
  useAppliedTokens,
  useThemePreferences,
} from './react';

// ============================================================================
// TAILWIND ADAPTERS
// ============================================================================

export {
  TailwindConfigAdapter,
  type TailwindAdapterOptions,
  type TailwindConfigResult,
  type TailwindThemeConfig,
  type FullTailwindConfig,
} from './tailwind';

// ============================================================================
// GOVERNANCE ADAPTERS
// ============================================================================

export {
  GovernanceProvider,
  GovernanceContext,
  useGovernance,
  useColorGovernance,
  useAccessibilityGovernance,
  useComplianceStatus,
  type GovernanceMode,
  type GovernanceProviderConfig,
  type GovernanceContextValue,
} from './react/providers/GovernanceProvider';
