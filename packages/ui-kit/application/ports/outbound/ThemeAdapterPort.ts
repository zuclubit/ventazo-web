/**
 * @fileoverview ThemeAdapterPort - Outbound Port for Theme Application
 *
 * Puerto de salida que define el contrato para aplicar temas a diferentes
 * entornos de ejecución (DOM, React, SSR, Native).
 *
 * @module ui-kit/application/ports/outbound/ThemeAdapterPort
 * @version 1.0.0
 */

import type { Result } from '../../../domain/types';
import type { TokenCollection } from '../../../domain/tokens';

// ============================================================================
// THEME TYPES
// ============================================================================

/**
 * Configuración de tema.
 */
export interface ThemeConfig {
  /** Nombre del tema */
  readonly name: string;
  /** Si es tema oscuro */
  readonly isDark: boolean;
  /** Colección de tokens */
  readonly tokens: TokenCollection;
  /** Namespace para CSS variables */
  readonly namespace?: string;
  /** Selector raíz para aplicar */
  readonly rootSelector?: string;
  /** Si aplicar transiciones */
  readonly enableTransitions?: boolean;
  /** Duración de transiciones (ms) */
  readonly transitionDuration?: number;
}

/**
 * Estado del tema aplicado.
 */
export interface ThemeState {
  /** Nombre del tema activo */
  readonly activeTheme: string;
  /** Si está en modo oscuro */
  readonly isDark: boolean;
  /** Temas disponibles */
  readonly availableThemes: string[];
  /** Timestamp de última actualización */
  readonly lastUpdate: Date;
  /** Variables CSS aplicadas */
  readonly appliedVariables: number;
}

/**
 * Opciones para cambio de tema.
 */
export interface ThemeChangeOptions {
  /** Si animar la transición */
  readonly animate?: boolean;
  /** Duración de la animación (ms) */
  readonly animationDuration?: number;
  /** Callback cuando termine la transición */
  readonly onComplete?: () => void;
  /** Si persistir la preferencia */
  readonly persist?: boolean;
}

/**
 * Preferencias del usuario para temas.
 */
export interface ThemePreferences {
  /** Tema preferido */
  readonly preferredTheme?: string;
  /** Si seguir preferencia del sistema */
  readonly followSystem?: boolean;
  /** Override manual de modo oscuro */
  readonly darkModeOverride?: boolean | null;
  /** Contraste preferido */
  readonly contrastPreference?: 'normal' | 'more' | 'less';
  /** Si reducir movimiento */
  readonly reduceMotion?: boolean;
}

/**
 * Resultado de detección de preferencias del sistema.
 */
export interface SystemPreferences {
  /** Si el sistema prefiere modo oscuro */
  readonly prefersDark: boolean;
  /** Nivel de contraste preferido */
  readonly prefersContrast: 'no-preference' | 'more' | 'less' | 'custom';
  /** Si prefiere reducir movimiento */
  readonly prefersReducedMotion: boolean;
  /** Si prefiere reducir transparencia */
  readonly prefersReducedTransparency: boolean;
  /** Esquema de colores forzado (Windows High Contrast) */
  readonly forcedColors: boolean;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * ThemeAdapterPort - Puerto de salida para aplicación de temas.
 *
 * Define el contrato para aplicar tokens de diseño a diferentes
 * entornos de renderizado.
 *
 * @example
 * ```typescript
 * class DOMThemeAdapter implements ThemeAdapterPort {
 *   async apply(config: ThemeConfig): Promise<Result<void, Error>> {
 *     const root = document.documentElement;
 *     const css = config.tokens.export({ format: 'css' });
 *     // Apply CSS variables to root
 *     return success(undefined);
 *   }
 * }
 * ```
 */
export interface ThemeAdapterPort {
  // ─────────────────────────────────────────────────────────────────────────
  // THEME APPLICATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Aplica un tema al entorno.
   *
   * @param config - Configuración del tema
   */
  apply(config: ThemeConfig): Promise<Result<void, Error>>;

  /**
   * Elimina el tema actual.
   */
  remove(): Promise<Result<void, Error>>;

  /**
   * Cambia a un tema diferente.
   *
   * @param themeName - Nombre del tema
   * @param options - Opciones de cambio
   */
  switchTo(themeName: string, options?: ThemeChangeOptions): Promise<Result<void, Error>>;

  /**
   * Alterna entre modo claro y oscuro.
   *
   * @param options - Opciones de cambio
   */
  toggleDarkMode(options?: ThemeChangeOptions): Promise<Result<void, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // THEME STATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el estado actual del tema.
   */
  getState(): Promise<Result<ThemeState, Error>>;

  /**
   * Registra un tema disponible.
   *
   * @param config - Configuración del tema
   */
  registerTheme(config: ThemeConfig): Promise<Result<void, Error>>;

  /**
   * Elimina un tema registrado.
   *
   * @param themeName - Nombre del tema
   */
  unregisterTheme(themeName: string): Promise<Result<void, Error>>;

  /**
   * Lista temas registrados.
   */
  listThemes(): Promise<Result<string[], Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene las preferencias del usuario.
   */
  getPreferences(): Promise<Result<ThemePreferences, Error>>;

  /**
   * Guarda las preferencias del usuario.
   *
   * @param preferences - Preferencias a guardar
   */
  setPreferences(preferences: Partial<ThemePreferences>): Promise<Result<void, Error>>;

  /**
   * Detecta las preferencias del sistema.
   */
  detectSystemPreferences(): Promise<Result<SystemPreferences, Error>>;

  /**
   * Sincroniza con las preferencias del sistema.
   */
  syncWithSystem(): Promise<Result<void, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Suscribe a cambios de tema.
   *
   * @param callback - Función a llamar cuando cambie el tema
   * @returns Función para cancelar suscripción
   */
  onThemeChange(callback: (state: ThemeState) => void): () => void;

  /**
   * Suscribe a cambios de preferencias del sistema.
   *
   * @param callback - Función a llamar cuando cambien las preferencias
   * @returns Función para cancelar suscripción
   */
  onSystemPreferencesChange(callback: (prefs: SystemPreferences) => void): () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el valor de una variable CSS del tema.
   *
   * @param variableName - Nombre de la variable
   */
  getVariable(variableName: string): Promise<Result<string | null, Error>>;

  /**
   * Establece una variable CSS temporal.
   *
   * @param variableName - Nombre de la variable
   * @param value - Valor a establecer
   */
  setVariable(variableName: string, value: string): Promise<Result<void, Error>>;

  /**
   * Obtiene todas las variables CSS del tema actual.
   */
  getAllVariables(): Promise<Result<Record<string, string>, Error>>;

  /**
   * Verifica si el adaptador está disponible.
   */
  isAvailable(): boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ThemeAdapterPort;
