/**
 * @fileoverview React Adapters Index
 *
 * Exporta todos los adaptadores React del sistema de diseño.
 *
 * @module ui-kit/adapters/react
 * @version 1.0.0
 *
 * @example
 * ```tsx
 * import {
 *   ThemeProvider,
 *   useTheme,
 *   useDarkMode,
 *   useThemeSwitcher,
 *   useThemeVariable,
 *   useSystemPreferences,
 * } from '@zuclubit/ui-kit/adapters/react';
 *
 * function App() {
 *   return (
 *     <ThemeProvider initialTheme={brandTheme}>
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * function ThemeToggle() {
 *   const { isDark, toggle } = useDarkMode();
 *   return <button onClick={toggle}>{isDark ? '🌙' : '☀️'}</button>;
 * }
 * ```
 */

// Provider
export {
  ThemeProvider,
  useThemeContext,
  ThemeContext,
  type ThemeProviderProps,
  type ThemeContextState,
  type ThemeContextActions,
  type ThemeContextValue,
} from './ReactThemeProvider';

// Hooks
export {
  useTheme,
  useDarkMode,
  useThemeSwitcher,
  useThemeVariable,
  useSystemPreferences,
  useAppliedTokens,
  useThemePreferences,
} from './useTheme';
