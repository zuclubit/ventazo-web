/**
 * @fileoverview React Theme Provider
 *
 * Provider de React para el sistema de temas basado en Color Intelligence.
 * Implementa ThemeAdapterPort para entornos React.
 *
 * @module ui-kit/adapters/react/ReactThemeProvider
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import type { Result } from '../../domain/types';
import { failure } from '../../domain/types';
import type { TokenCollection } from '../../domain/tokens';
import type {
  ThemeConfig,
  ThemeState,
  ThemeChangeOptions,
  ThemePreferences,
  SystemPreferences,
} from '../../application/ports/outbound/ThemeAdapterPort';
import { CssVariablesAdapter, type CssAdapterOptions } from '../css/CssVariablesAdapter';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Estado del contexto de tema.
 */
interface ThemeContextState {
  /** Tema activo actual */
  readonly activeTheme: string | null;
  /** Si está en modo oscuro */
  readonly isDark: boolean;
  /** Temas disponibles */
  readonly availableThemes: string[];
  /** Si está cargando */
  readonly isLoading: boolean;
  /** Error actual si existe */
  readonly error: Error | null;
  /** Preferencias del sistema */
  readonly systemPreferences: SystemPreferences | null;
  /** Tokens aplicados actualmente */
  readonly appliedTokens: TokenCollection | null;
}

/**
 * Acciones disponibles en el contexto.
 */
interface ThemeContextActions {
  /** Aplica un tema */
  applyTheme: (config: ThemeConfig) => Promise<Result<void, Error>>;
  /** Cambia a un tema registrado */
  switchTheme: (themeName: string, options?: ThemeChangeOptions) => Promise<Result<void, Error>>;
  /** Alterna modo oscuro */
  toggleDarkMode: (options?: ThemeChangeOptions) => Promise<Result<void, Error>>;
  /** Registra un nuevo tema */
  registerTheme: (config: ThemeConfig) => Promise<Result<void, Error>>;
  /** Elimina un tema registrado */
  unregisterTheme: (themeName: string) => Promise<Result<void, Error>>;
  /** Sincroniza con preferencias del sistema */
  syncWithSystem: () => Promise<Result<void, Error>>;
  /** Obtiene preferencias guardadas */
  getPreferences: () => Promise<Result<ThemePreferences, Error>>;
  /** Guarda preferencias */
  setPreferences: (prefs: Partial<ThemePreferences>) => Promise<Result<void, Error>>;
  /** Obtiene una variable CSS */
  getVariable: (name: string) => Promise<Result<string | null, Error>>;
  /** Establece una variable CSS */
  setVariable: (name: string, value: string) => Promise<Result<void, Error>>;
}

/**
 * Valor completo del contexto de tema.
 */
type ThemeContextValue = ThemeContextState & ThemeContextActions;

/**
 * Props del ThemeProvider.
 */
export interface ThemeProviderProps {
  /** Nodos hijos */
  children: ReactNode;
  /** Tema inicial a aplicar */
  initialTheme?: ThemeConfig;
  /** Temas pre-registrados */
  themes?: ThemeConfig[];
  /** Opciones del adaptador CSS */
  cssOptions?: CssAdapterOptions;
  /** Si sincronizar automáticamente con el sistema */
  followSystem?: boolean;
  /** Callback cuando cambia el tema */
  onThemeChange?: (state: ThemeState) => void;
  /** Callback cuando cambian las preferencias del sistema */
  onSystemPreferencesChange?: (prefs: SystemPreferences) => void;
}

// ============================================================================
// REDUCER
// ============================================================================

type ThemeAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_THEME'; payload: { name: string; isDark: boolean; tokens: TokenCollection | null } }
  | { type: 'SET_AVAILABLE_THEMES'; payload: string[] }
  | { type: 'SET_SYSTEM_PREFERENCES'; payload: SystemPreferences }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'CLEAR_THEME' };

function themeReducer(state: ThemeContextState, action: ThemeAction): ThemeContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_THEME':
      return {
        ...state,
        activeTheme: action.payload.name,
        isDark: action.payload.isDark,
        appliedTokens: action.payload.tokens,
        error: null,
        isLoading: false,
      };

    case 'SET_AVAILABLE_THEMES':
      return { ...state, availableThemes: action.payload };

    case 'SET_SYSTEM_PREFERENCES':
      return { ...state, systemPreferences: action.payload };

    case 'TOGGLE_DARK_MODE':
      return { ...state, isDark: !state.isDark };

    case 'CLEAR_THEME':
      return {
        ...state,
        activeTheme: null,
        appliedTokens: null,
        error: null,
      };

    default:
      return state;
  }
}

const initialState: ThemeContextState = {
  activeTheme: null,
  isDark: false,
  availableThemes: [],
  isLoading: true,
  error: null,
  systemPreferences: null,
  appliedTokens: null,
};

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * ThemeProvider - Provider de React para el sistema de temas.
 *
 * Envuelve la aplicación para proporcionar acceso al sistema de temas
 * basado en Color Intelligence.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@zuclubit/ui-kit/adapters/react';
 *
 * function App() {
 *   return (
 *     <ThemeProvider
 *       initialTheme={brandTheme}
 *       themes={[brandTheme, brandDarkTheme]}
 *       followSystem={true}
 *       onThemeChange={(state) => console.log('Theme changed:', state)}
 *     >
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  initialTheme,
  themes = [],
  cssOptions,
  followSystem = false,
  onThemeChange,
  onSystemPreferencesChange,
}: ThemeProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(themeReducer, initialState);
  const adapterRef = useRef<CssVariablesAdapter | null>(null);
  const registeredThemesRef = useRef<Map<string, ThemeConfig>>(new Map());

  // Initialize adapter
  useEffect(() => {
    adapterRef.current = new CssVariablesAdapter(cssOptions);

    // Register initial themes
    for (const theme of themes) {
      registeredThemesRef.current.set(theme.name, theme);
      adapterRef.current.registerTheme(theme);
    }

    dispatch({ type: 'SET_AVAILABLE_THEMES', payload: Array.from(registeredThemesRef.current.keys()) });

    // Subscribe to theme changes
    const unsubscribeTheme = adapterRef.current.onThemeChange((themeState) => {
      onThemeChange?.(themeState);
    });

    // Subscribe to system preferences changes
    const unsubscribeSystem = adapterRef.current.onSystemPreferencesChange((prefs) => {
      dispatch({ type: 'SET_SYSTEM_PREFERENCES', payload: prefs });
      onSystemPreferencesChange?.(prefs);
    });

    // Detect initial system preferences
    adapterRef.current.detectSystemPreferences().then((result) => {
      if (result.success) {
        dispatch({ type: 'SET_SYSTEM_PREFERENCES', payload: result.value });
      }
    });

    // Apply initial theme
    if (initialTheme) {
      adapterRef.current.apply(initialTheme).then((result) => {
        if (result.success) {
          dispatch({
            type: 'SET_THEME',
            payload: {
              name: initialTheme.name,
              isDark: initialTheme.isDark,
              tokens: initialTheme.tokens,
            },
          });
        } else {
          dispatch({ type: 'SET_ERROR', payload: result.error });
        }
      });
    } else if (followSystem) {
      adapterRef.current.syncWithSystem();
      dispatch({ type: 'SET_LOADING', payload: false });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }

    return () => {
      unsubscribeTheme();
      unsubscribeSystem();
    };
  }, []);

  // Follow system preference changes
  useEffect(() => {
    if (!followSystem || !state.systemPreferences) return;

    const shouldBeDark = state.systemPreferences.prefersDark;
    if (shouldBeDark !== state.isDark && adapterRef.current) {
      adapterRef.current.toggleDarkMode({ animate: true });
    }
  }, [followSystem, state.systemPreferences?.prefersDark]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const applyTheme = useCallback(async (config: ThemeConfig): Promise<Result<void, Error>> => {
    if (!adapterRef.current) {
      return failure(new Error('Theme adapter not initialized'));
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    const result = await adapterRef.current.apply(config);

    if (result.success) {
      registeredThemesRef.current.set(config.name, config);
      dispatch({
        type: 'SET_THEME',
        payload: {
          name: config.name,
          isDark: config.isDark,
          tokens: config.tokens,
        },
      });
      dispatch({
        type: 'SET_AVAILABLE_THEMES',
        payload: Array.from(registeredThemesRef.current.keys()),
      });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error });
    }

    return result;
  }, []);

  const switchTheme = useCallback(
    async (themeName: string, options?: ThemeChangeOptions): Promise<Result<void, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      const theme = registeredThemesRef.current.get(themeName);
      if (!theme) {
        return failure(new Error(`Theme "${themeName}" not found`));
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      const result = await adapterRef.current.switchTo(themeName, options);

      if (result.success) {
        dispatch({
          type: 'SET_THEME',
          payload: {
            name: themeName,
            isDark: theme.isDark,
            tokens: theme.tokens,
          },
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
      }

      return result;
    },
    []
  );

  const toggleDarkMode = useCallback(
    async (options?: ThemeChangeOptions): Promise<Result<void, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      const result = await adapterRef.current.toggleDarkMode(options);

      if (result.success) {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
      }

      return result;
    },
    []
  );

  const registerTheme = useCallback(async (config: ThemeConfig): Promise<Result<void, Error>> => {
    if (!adapterRef.current) {
      return failure(new Error('Theme adapter not initialized'));
    }

    const result = await adapterRef.current.registerTheme(config);

    if (result.success) {
      registeredThemesRef.current.set(config.name, config);
      dispatch({
        type: 'SET_AVAILABLE_THEMES',
        payload: Array.from(registeredThemesRef.current.keys()),
      });
    }

    return result;
  }, []);

  const unregisterTheme = useCallback(
    async (themeName: string): Promise<Result<void, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      const result = await adapterRef.current.unregisterTheme(themeName);

      if (result.success) {
        registeredThemesRef.current.delete(themeName);
        dispatch({
          type: 'SET_AVAILABLE_THEMES',
          payload: Array.from(registeredThemesRef.current.keys()),
        });

        if (state.activeTheme === themeName) {
          dispatch({ type: 'CLEAR_THEME' });
        }
      }

      return result;
    },
    [state.activeTheme]
  );

  const syncWithSystem = useCallback(async (): Promise<Result<void, Error>> => {
    if (!adapterRef.current) {
      return failure(new Error('Theme adapter not initialized'));
    }

    return adapterRef.current.syncWithSystem();
  }, []);

  const getPreferences = useCallback(async (): Promise<Result<ThemePreferences, Error>> => {
    if (!adapterRef.current) {
      return failure(new Error('Theme adapter not initialized'));
    }

    return adapterRef.current.getPreferences();
  }, []);

  const setPreferences = useCallback(
    async (prefs: Partial<ThemePreferences>): Promise<Result<void, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      return adapterRef.current.setPreferences(prefs);
    },
    []
  );

  const getVariable = useCallback(
    async (name: string): Promise<Result<string | null, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      return adapterRef.current.getVariable(name);
    },
    []
  );

  const setVariable = useCallback(
    async (name: string, value: string): Promise<Result<void, Error>> => {
      if (!adapterRef.current) {
        return failure(new Error('Theme adapter not initialized'));
      }

      return adapterRef.current.setVariable(name, value);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      ...state,
      applyTheme,
      switchTheme,
      toggleDarkMode,
      registerTheme,
      unregisterTheme,
      syncWithSystem,
      getPreferences,
      setPreferences,
      getVariable,
      setVariable,
    }),
    [
      state,
      applyTheme,
      switchTheme,
      toggleDarkMode,
      registerTheme,
      unregisterTheme,
      syncWithSystem,
      getPreferences,
      setPreferences,
      getVariable,
      setVariable,
    ]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para acceder al contexto de tema.
 *
 * @throws Error si se usa fuera de ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isDark,
 *     activeTheme,
 *     toggleDarkMode,
 *     switchTheme,
 *   } = useThemeContext();
 *
 *   return (
 *     <button onClick={() => toggleDarkMode({ animate: true })}>
 *       {isDark ? '🌙' : '☀️'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }

  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ThemeContext };
export type { ThemeContextState, ThemeContextActions, ThemeContextValue };
