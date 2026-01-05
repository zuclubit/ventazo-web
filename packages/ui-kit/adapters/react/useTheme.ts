/**
 * @fileoverview React Theme Hooks
 *
 * Hooks especializados para acceder a diferentes aspectos del sistema de temas.
 *
 * @module ui-kit/adapters/react/useTheme
 * @version 1.0.0
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useThemeContext } from './ReactThemeProvider';
import type { ThemeChangeOptions } from '../../application/ports/outbound/ThemeAdapterPort';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook simplificado para acceder al estado del tema.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { isDark, themeName } = useTheme();
 *
 *   return (
 *     <header className={isDark ? 'bg-gray-900' : 'bg-white'}>
 *       Current theme: {themeName}
 *     </header>
 *   );
 * }
 * ```
 */
export function useTheme() {
  const context = useThemeContext();

  return useMemo(
    () => ({
      /** Si el modo oscuro está activo */
      isDark: context.isDark,
      /** Nombre del tema activo */
      themeName: context.activeTheme,
      /** Si está cargando */
      isLoading: context.isLoading,
      /** Error actual */
      error: context.error,
      /** Preferencias del sistema */
      systemPreferences: context.systemPreferences,
    }),
    [
      context.isDark,
      context.activeTheme,
      context.isLoading,
      context.error,
      context.systemPreferences,
    ]
  );
}

/**
 * Hook para controlar el modo oscuro.
 *
 * @example
 * ```tsx
 * function DarkModeToggle() {
 *   const { isDark, toggle, setDark, setLight } = useDarkMode();
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>Toggle</button>
 *       <button onClick={setDark}>Dark</button>
 *       <button onClick={setLight}>Light</button>
 *       <span>{isDark ? '🌙' : '☀️'}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDarkMode() {
  const { isDark, toggleDarkMode, switchTheme, activeTheme, availableThemes } = useThemeContext();

  const toggle = useCallback(
    (options?: ThemeChangeOptions) => toggleDarkMode(options),
    [toggleDarkMode]
  );

  const setDark = useCallback(
    async (options?: ThemeChangeOptions) => {
      if (isDark) return;

      // Try to find a dark variant of current theme
      const darkThemeName = activeTheme ? `${activeTheme}-dark` : null;
      if (darkThemeName && availableThemes.includes(darkThemeName)) {
        await switchTheme(darkThemeName, options);
      } else {
        await toggleDarkMode(options);
      }
    },
    [isDark, activeTheme, availableThemes, switchTheme, toggleDarkMode]
  );

  const setLight = useCallback(
    async (options?: ThemeChangeOptions) => {
      if (!isDark) return;

      // Try to find a light variant of current theme
      const lightThemeName = activeTheme?.replace(/-dark$/, '') ?? null;
      if (lightThemeName && availableThemes.includes(lightThemeName)) {
        await switchTheme(lightThemeName, options);
      } else {
        await toggleDarkMode(options);
      }
    },
    [isDark, activeTheme, availableThemes, switchTheme, toggleDarkMode]
  );

  return useMemo(
    () => ({
      isDark,
      toggle,
      setDark,
      setLight,
    }),
    [isDark, toggle, setDark, setLight]
  );
}

/**
 * Hook para cambiar entre temas.
 *
 * @example
 * ```tsx
 * function ThemePicker() {
 *   const { themes, current, switchTo } = useThemeSwitcher();
 *
 *   return (
 *     <select
 *       value={current ?? ''}
 *       onChange={(e) => switchTo(e.target.value, { animate: true })}
 *     >
 *       {themes.map((theme) => (
 *         <option key={theme} value={theme}>
 *           {theme}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useThemeSwitcher() {
  const { activeTheme, availableThemes, switchTheme, registerTheme, unregisterTheme } =
    useThemeContext();

  const switchTo = useCallback(
    (themeName: string, options?: ThemeChangeOptions) => switchTheme(themeName, options),
    [switchTheme]
  );

  return useMemo(
    () => ({
      /** Tema activo actual */
      current: activeTheme,
      /** Lista de temas disponibles */
      themes: availableThemes,
      /** Cambiar a un tema */
      switchTo,
      /** Registrar un nuevo tema */
      register: registerTheme,
      /** Eliminar un tema */
      unregister: unregisterTheme,
    }),
    [activeTheme, availableThemes, switchTo, registerTheme, unregisterTheme]
  );
}

/**
 * Hook para acceder a variables CSS del tema.
 *
 * @example
 * ```tsx
 * function BrandColorDisplay() {
 *   const { value, loading } = useThemeVariable('--color-brand-500');
 *
 *   if (loading) return <span>Loading...</span>;
 *
 *   return (
 *     <div style={{ backgroundColor: value ?? '#ccc' }}>
 *       Brand color: {value}
 *     </div>
 *   );
 * }
 * ```
 */
export function useThemeVariable(variableName: string) {
  const { getVariable, setVariable } = useThemeContext();
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    getVariable(variableName).then((result) => {
      if (!mounted) return;

      if (result.success) {
        setValue(result.value);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [variableName, getVariable]);

  const set = useCallback(
    async (newValue: string) => {
      const result = await setVariable(variableName, newValue);
      if (result.success) {
        setValue(newValue);
      }
      return result;
    },
    [variableName, setVariable]
  );

  return useMemo(
    () => ({
      value,
      loading,
      error,
      set,
    }),
    [value, loading, error, set]
  );
}

/**
 * Hook para detectar preferencias del sistema.
 *
 * @example
 * ```tsx
 * function AccessibilityInfo() {
 *   const {
 *     prefersDark,
 *     prefersReducedMotion,
 *     prefersContrast,
 *   } = useSystemPreferences();
 *
 *   return (
 *     <div>
 *       <p>Prefers dark: {prefersDark ? 'Yes' : 'No'}</p>
 *       <p>Reduced motion: {prefersReducedMotion ? 'Yes' : 'No'}</p>
 *       <p>Contrast: {prefersContrast}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSystemPreferences() {
  const { systemPreferences, syncWithSystem } = useThemeContext();

  return useMemo(
    () => ({
      /** Prefiere modo oscuro */
      prefersDark: systemPreferences?.prefersDark ?? false,
      /** Prefiere movimiento reducido */
      prefersReducedMotion: systemPreferences?.prefersReducedMotion ?? false,
      /** Preferencia de contraste */
      prefersContrast: systemPreferences?.prefersContrast ?? 'no-preference',
      /** Prefiere transparencia reducida */
      prefersReducedTransparency: systemPreferences?.prefersReducedTransparency ?? false,
      /** Colores forzados activos */
      forcedColors: systemPreferences?.forcedColors ?? false,
      /** Sincronizar tema con preferencias del sistema */
      sync: syncWithSystem,
    }),
    [systemPreferences, syncWithSystem]
  );
}

/**
 * Hook para acceder a los tokens aplicados actualmente.
 *
 * @example
 * ```tsx
 * function TokenDebugger() {
 *   const { tokens, hasTokens } = useAppliedTokens();
 *
 *   if (!hasTokens) return <p>No tokens applied</p>;
 *
 *   return (
 *     <pre>
 *       {tokens?.export({ format: 'json' })}
 *     </pre>
 *   );
 * }
 * ```
 */
export function useAppliedTokens() {
  const { appliedTokens } = useThemeContext();

  return useMemo(
    () => ({
      /** Colección de tokens aplicados */
      tokens: appliedTokens,
      /** Si hay tokens aplicados */
      hasTokens: appliedTokens !== null,
    }),
    [appliedTokens]
  );
}

/**
 * Hook para manejar preferencias de tema persistidas.
 *
 * @example
 * ```tsx
 * function PreferencesManager() {
 *   const {
 *     preferences,
 *     loading,
 *     setFollowSystem,
 *     setPreferredTheme,
 *   } = useThemePreferences();
 *
 *   return (
 *     <div>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={preferences?.followSystem ?? false}
 *           onChange={(e) => setFollowSystem(e.target.checked)}
 *         />
 *         Follow system
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export function useThemePreferences() {
  const { getPreferences, setPreferences } = useThemeContext();
  const [preferences, setLocalPreferences] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getPreferences().then((result) => {
      if (!mounted) return;

      if (result.success) {
        setLocalPreferences(result.value as Record<string, unknown>);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [getPreferences]);

  const setFollowSystem = useCallback(
    async (follow: boolean) => {
      await setPreferences({ followSystem: follow });
      setLocalPreferences((prev) => (prev ? { ...prev, followSystem: follow } : { followSystem: follow }));
    },
    [setPreferences]
  );

  const setPreferredTheme = useCallback(
    async (themeName: string) => {
      await setPreferences({ preferredTheme: themeName });
      setLocalPreferences((prev) => (prev ? { ...prev, preferredTheme: themeName } : { preferredTheme: themeName }));
    },
    [setPreferences]
  );

  const setDarkModeOverride = useCallback(
    async (isDark: boolean | null) => {
      await setPreferences({ darkModeOverride: isDark });
      setLocalPreferences((prev) => (prev ? { ...prev, darkModeOverride: isDark } : { darkModeOverride: isDark }));
    },
    [setPreferences]
  );

  return useMemo(
    () => ({
      preferences,
      loading,
      setFollowSystem,
      setPreferredTheme,
      setDarkModeOverride,
    }),
    [preferences, loading, setFollowSystem, setPreferredTheme, setDarkModeOverride]
  );
}
