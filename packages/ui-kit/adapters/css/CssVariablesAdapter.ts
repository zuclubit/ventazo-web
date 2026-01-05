/**
 * @fileoverview CSS Variables Adapter
 *
 * Adaptador para aplicar tokens de diseño como CSS Custom Properties.
 * Implementa ThemeAdapterPort para entornos DOM.
 *
 * @module ui-kit/adapters/css/CssVariablesAdapter
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import type {
  ThemeAdapterPort,
  ThemeConfig,
  ThemeState,
  ThemeChangeOptions,
  ThemePreferences,
  SystemPreferences,
} from '../../application/ports/outbound/ThemeAdapterPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opciones de configuración del adaptador CSS.
 */
export interface CssAdapterOptions {
  /** Selector raíz para aplicar variables */
  readonly rootSelector?: string;
  /** Prefijo para variables CSS */
  readonly variablePrefix?: string;
  /** ID del elemento style a crear/usar */
  readonly styleElementId?: string;
  /** Si usar media query para modo oscuro */
  readonly useDarkModeMediaQuery?: boolean;
  /** Clase para modo oscuro */
  readonly darkModeClass?: string;
  /** Clave de localStorage para preferencias */
  readonly storageKey?: string;
  /** Duración de transición por defecto (ms) */
  readonly defaultTransitionDuration?: number;
}

/**
 * Opciones por defecto.
 */
const DEFAULT_OPTIONS: Required<CssAdapterOptions> = {
  rootSelector: ':root',
  variablePrefix: '',
  styleElementId: 'ui-kit-theme',
  useDarkModeMediaQuery: true,
  darkModeClass: 'dark',
  storageKey: 'ui-kit-theme-preferences',
  defaultTransitionDuration: 200,
};

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * CssVariablesAdapter - Adaptador de temas para CSS Custom Properties.
 *
 * Este adaptador aplica tokens de diseño al DOM mediante CSS Custom Properties,
 * con soporte para modo oscuro, transiciones y persistencia de preferencias.
 *
 * @example
 * ```typescript
 * const adapter = new CssVariablesAdapter({
 *   rootSelector: ':root',
 *   darkModeClass: 'dark',
 *   useDarkModeMediaQuery: true,
 * });
 *
 * await adapter.apply({
 *   name: 'brand',
 *   isDark: false,
 *   tokens: tokenCollection,
 * });
 *
 * // Later, toggle dark mode
 * await adapter.toggleDarkMode({ animate: true });
 * ```
 */
export class CssVariablesAdapter implements ThemeAdapterPort {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly options: Required<CssAdapterOptions>;
  private registeredThemes: Map<string, ThemeConfig> = new Map();
  private activeTheme: string | null = null;
  private isDarkMode = false;
  private styleElement: HTMLStyleElement | null = null;
  private themeChangeListeners: Set<(state: ThemeState) => void> = new Set();
  private systemPrefsListeners: Set<(prefs: SystemPreferences) => void> = new Set();
  private mediaQueryList: MediaQueryList | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(options: CssAdapterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.isAvailable()) {
      this.initializeStyleElement();
      this.initializeMediaQueryListener();
      this.loadPreferences();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THEME APPLICATION
  // ─────────────────────────────────────────────────────────────────────────

  async apply(config: ThemeConfig): Promise<Result<void, Error>> {
    if (!this.isAvailable()) {
      return failure(new Error('CSS adapter requires DOM environment'));
    }

    try {
      // Generate CSS
      const css = this.generateCss(config);

      // Apply to style element
      if (this.styleElement) {
        this.styleElement.textContent = css;
      }

      // Apply dark mode class if needed
      if (config.isDark) {
        document.documentElement.classList.add(this.options.darkModeClass);
      } else {
        document.documentElement.classList.remove(this.options.darkModeClass);
      }

      // Update state
      this.activeTheme = config.name;
      this.isDarkMode = config.isDark;

      // Register theme
      this.registeredThemes.set(config.name, config);

      // Notify listeners
      this.notifyThemeChange();

      return success(undefined);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to apply theme')
      );
    }
  }

  async remove(): Promise<Result<void, Error>> {
    if (!this.isAvailable()) {
      return failure(new Error('CSS adapter requires DOM environment'));
    }

    try {
      if (this.styleElement) {
        this.styleElement.textContent = '';
      }

      document.documentElement.classList.remove(this.options.darkModeClass);

      this.activeTheme = null;
      this.notifyThemeChange();

      return success(undefined);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to remove theme')
      );
    }
  }

  async switchTo(
    themeName: string,
    options?: ThemeChangeOptions
  ): Promise<Result<void, Error>> {
    const theme = this.registeredThemes.get(themeName);

    if (!theme) {
      return failure(new Error(`Theme "${themeName}" not found`));
    }

    if (options?.animate) {
      this.enableTransitions(options.animationDuration);
    }

    const result = await this.apply(theme);

    if (options?.animate) {
      setTimeout(
        () => this.disableTransitions(),
        options.animationDuration || this.options.defaultTransitionDuration
      );
    }

    if (options?.persist) {
      await this.setPreferences({ preferredTheme: themeName });
    }

    options?.onComplete?.();

    return result;
  }

  async toggleDarkMode(options?: ThemeChangeOptions): Promise<Result<void, Error>> {
    if (!this.activeTheme) {
      return failure(new Error('No active theme to toggle'));
    }

    const currentTheme = this.registeredThemes.get(this.activeTheme);
    if (!currentTheme) {
      return failure(new Error('Active theme not found'));
    }

    // Find the opposite variant
    const targetIsDark = !this.isDarkMode;
    const darkSuffix = '-dark';
    const lightName = currentTheme.name.endsWith(darkSuffix)
      ? currentTheme.name.slice(0, -darkSuffix.length)
      : currentTheme.name;

    const targetThemeName = targetIsDark ? `${lightName}${darkSuffix}` : lightName;
    const targetTheme = this.registeredThemes.get(targetThemeName);

    if (targetTheme) {
      return this.switchTo(targetThemeName, options);
    }

    // If no separate dark theme, toggle the class
    if (options?.animate) {
      this.enableTransitions(options.animationDuration);
    }

    this.isDarkMode = targetIsDark;

    if (targetIsDark) {
      document.documentElement.classList.add(this.options.darkModeClass);
    } else {
      document.documentElement.classList.remove(this.options.darkModeClass);
    }

    if (options?.animate) {
      setTimeout(
        () => this.disableTransitions(),
        options.animationDuration || this.options.defaultTransitionDuration
      );
    }

    if (options?.persist) {
      await this.setPreferences({ darkModeOverride: targetIsDark });
    }

    this.notifyThemeChange();
    options?.onComplete?.();

    return success(undefined);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THEME STATE
  // ─────────────────────────────────────────────────────────────────────────

  async getState(): Promise<Result<ThemeState, Error>> {
    return success({
      activeTheme: this.activeTheme || '',
      isDark: this.isDarkMode,
      availableThemes: Array.from(this.registeredThemes.keys()),
      lastUpdate: new Date(),
      appliedVariables: this.countAppliedVariables(),
    });
  }

  async registerTheme(config: ThemeConfig): Promise<Result<void, Error>> {
    this.registeredThemes.set(config.name, config);
    return success(undefined);
  }

  async unregisterTheme(themeName: string): Promise<Result<void, Error>> {
    if (this.activeTheme === themeName) {
      await this.remove();
    }
    this.registeredThemes.delete(themeName);
    return success(undefined);
  }

  async listThemes(): Promise<Result<string[], Error>> {
    return success(Array.from(this.registeredThemes.keys()));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────

  async getPreferences(): Promise<Result<ThemePreferences, Error>> {
    if (!this.isAvailable()) {
      return success({});
    }

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      return success(stored ? JSON.parse(stored) : {});
    } catch {
      return success({});
    }
  }

  async setPreferences(
    preferences: Partial<ThemePreferences>
  ): Promise<Result<void, Error>> {
    if (!this.isAvailable()) {
      return failure(new Error('Storage not available'));
    }

    try {
      const currentResult = await this.getPreferences();
      const current = currentResult.success ? currentResult.value : {};
      const updated = { ...current, ...preferences };
      localStorage.setItem(this.options.storageKey, JSON.stringify(updated));
      return success(undefined);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to save preferences')
      );
    }
  }

  async detectSystemPreferences(): Promise<Result<SystemPreferences, Error>> {
    if (!this.isAvailable()) {
      return success({
        prefersDark: false,
        prefersContrast: 'no-preference',
        prefersReducedMotion: false,
        prefersReducedTransparency: false,
        forcedColors: false,
      });
    }

    return success({
      prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      prefersContrast: this.detectContrastPreference(),
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersReducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
      forcedColors: window.matchMedia('(forced-colors: active)').matches,
    });
  }

  async syncWithSystem(): Promise<Result<void, Error>> {
    const prefsResult = await this.detectSystemPreferences();
    if (!prefsResult.success) {
      return failure(prefsResult.error);
    }

    const prefs = prefsResult.value;

    if (prefs.prefersDark !== this.isDarkMode) {
      await this.toggleDarkMode({ animate: true });
    }

    return success(undefined);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────────────────

  onThemeChange(callback: (state: ThemeState) => void): () => void {
    this.themeChangeListeners.add(callback);
    return () => this.themeChangeListeners.delete(callback);
  }

  onSystemPreferencesChange(callback: (prefs: SystemPreferences) => void): () => void {
    this.systemPrefsListeners.add(callback);
    return () => this.systemPrefsListeners.delete(callback);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  async getVariable(variableName: string): Promise<Result<string | null, Error>> {
    if (!this.isAvailable()) {
      return success(null);
    }

    try {
      const root = document.documentElement;
      const value = getComputedStyle(root).getPropertyValue(variableName).trim();
      return success(value || null);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to get variable')
      );
    }
  }

  async setVariable(variableName: string, value: string): Promise<Result<void, Error>> {
    if (!this.isAvailable()) {
      return failure(new Error('DOM not available'));
    }

    try {
      document.documentElement.style.setProperty(variableName, value);
      return success(undefined);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to set variable')
      );
    }
  }

  async getAllVariables(): Promise<Result<Record<string, string>, Error>> {
    if (!this.isAvailable()) {
      return success({});
    }

    try {
      const variables: Record<string, string> = {};
      const styles = getComputedStyle(document.documentElement);

      for (let i = 0; i < styles.length; i++) {
        const prop = styles[i];
        if (prop.startsWith('--')) {
          variables[prop] = styles.getPropertyValue(prop).trim();
        }
      }

      return success(variables);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to get variables')
      );
    }
  }

  isAvailable(): boolean {
    return typeof document !== 'undefined' && typeof window !== 'undefined';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private initializeStyleElement(): void {
    let element = document.getElementById(this.options.styleElementId) as HTMLStyleElement;

    if (!element) {
      element = document.createElement('style');
      element.id = this.options.styleElementId;
      document.head.appendChild(element);
    }

    this.styleElement = element;
  }

  private initializeMediaQueryListener(): void {
    if (!this.options.useDarkModeMediaQuery) return;

    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (_e: MediaQueryListEvent) => {
      this.notifySystemPrefsChange();

      // Auto-sync if enabled
      this.getPreferences().then(result => {
        if (result.success && result.value.followSystem) {
          this.syncWithSystem();
        }
      });
    };

    this.mediaQueryList.addEventListener('change', handler);
  }

  private loadPreferences(): void {
    this.getPreferences().then(result => {
      if (!result.success) return;

      const prefs = result.value;

      if (prefs.preferredTheme) {
        this.switchTo(prefs.preferredTheme);
      }

      if (prefs.darkModeOverride !== null && prefs.darkModeOverride !== undefined) {
        this.isDarkMode = prefs.darkModeOverride;
      } else if (prefs.followSystem) {
        this.syncWithSystem();
      }
    });
  }

  private generateCss(config: ThemeConfig): string {
    const prefix = config.namespace || this.options.variablePrefix;
    const cssContent = config.tokens.export({
      format: 'css',
      prefix,
    });

    // Wrap in selector
    const selector = config.rootSelector || this.options.rootSelector;

    return `${selector} {\n${cssContent}\n}`;
  }

  private enableTransitions(duration?: number): void {
    const ms = duration || this.options.defaultTransitionDuration;
    document.documentElement.style.setProperty(
      '--theme-transition',
      `all ${ms}ms ease-in-out`
    );
    document.documentElement.style.setProperty('transition', `var(--theme-transition)`);
  }

  private disableTransitions(): void {
    document.documentElement.style.removeProperty('--theme-transition');
    document.documentElement.style.removeProperty('transition');
  }

  private countAppliedVariables(): number {
    if (!this.styleElement?.textContent) return 0;

    const matches = this.styleElement.textContent.match(/--[^:]+:/g);
    return matches?.length || 0;
  }

  private detectContrastPreference(): SystemPreferences['prefersContrast'] {
    if (window.matchMedia('(prefers-contrast: more)').matches) return 'more';
    if (window.matchMedia('(prefers-contrast: less)').matches) return 'less';
    if (window.matchMedia('(prefers-contrast: custom)').matches) return 'custom';
    return 'no-preference';
  }

  private notifyThemeChange(): void {
    this.getState().then(result => {
      if (result.success) {
        for (const listener of this.themeChangeListeners) {
          listener(result.value);
        }
      }
    });
  }

  private notifySystemPrefsChange(): void {
    this.detectSystemPreferences().then(result => {
      if (result.success) {
        for (const listener of this.systemPrefsListeners) {
          listener(result.value);
        }
      }
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CssVariablesAdapter;
