/**
 * @fileoverview UIState Value Object
 *
 * Value Object que representa un estado de interacción de componente UI.
 * Define transiciones válidas, metadatos perceptuales y reglas de negocio
 * para estados de interfaz.
 *
 * @module ui-kit/domain/ux/value-objects/UIState
 * @version 1.0.0
 */

import type { UIState as UIStateType, Result } from '../../types';
import { success, failure } from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Estados válidos de UI.
 */
export const UI_STATES = [
  'idle',
  'hover',
  'active',
  'focus',
  'disabled',
  'loading',
  'error',
  'success',
] as const;

/**
 * Matriz de transiciones válidas entre estados.
 * Define qué transiciones son permitidas desde cada estado.
 */
const STATE_TRANSITIONS: Record<UIStateType, readonly UIStateType[]> = {
  idle: ['hover', 'focus', 'active', 'disabled', 'loading', 'error', 'success'],
  hover: ['idle', 'active', 'focus', 'disabled'],
  active: ['idle', 'hover', 'focus', 'loading', 'error', 'success'],
  focus: ['idle', 'hover', 'active', 'disabled', 'loading'],
  disabled: ['idle', 'loading'],
  loading: ['idle', 'error', 'success', 'disabled'],
  error: ['idle', 'hover', 'focus', 'active', 'loading'],
  success: ['idle', 'hover', 'focus', 'active', 'loading'],
} as const;

/**
 * Prioridad de estados para resolución de conflictos.
 * Mayor número = mayor prioridad.
 */
const STATE_PRIORITY: Record<UIStateType, number> = {
  disabled: 100,  // Siempre gana
  loading: 90,
  error: 80,
  success: 75,
  active: 60,
  focus: 50,
  hover: 40,
  idle: 0,
} as const;

/**
 * Metadatos perceptuales por estado.
 */
interface StatePerceptualMetadata {
  readonly requiresContrast: boolean;
  readonly suggestedLightnessShift: number;
  readonly suggestedChromaShift: number;
  readonly suggestedOpacity: number;
  readonly animation: 'none' | 'subtle' | 'medium' | 'prominent';
  readonly focusIndicator: boolean;
}

const STATE_METADATA: Record<UIStateType, StatePerceptualMetadata> = {
  idle: {
    requiresContrast: true,
    suggestedLightnessShift: 0,
    suggestedChromaShift: 0,
    suggestedOpacity: 1,
    animation: 'none',
    focusIndicator: false,
  },
  hover: {
    requiresContrast: true,
    suggestedLightnessShift: 0.05,
    suggestedChromaShift: 0.02,
    suggestedOpacity: 1,
    animation: 'subtle',
    focusIndicator: false,
  },
  active: {
    requiresContrast: true,
    suggestedLightnessShift: -0.08,
    suggestedChromaShift: 0.03,
    suggestedOpacity: 1,
    animation: 'medium',
    focusIndicator: false,
  },
  focus: {
    requiresContrast: true,
    suggestedLightnessShift: 0,
    suggestedChromaShift: 0,
    suggestedOpacity: 1,
    animation: 'subtle',
    focusIndicator: true,
  },
  disabled: {
    requiresContrast: false, // Reduced requirements for disabled
    suggestedLightnessShift: 0.2,
    suggestedChromaShift: -0.1,
    suggestedOpacity: 0.5,
    animation: 'none',
    focusIndicator: false,
  },
  loading: {
    requiresContrast: true,
    suggestedLightnessShift: 0,
    suggestedChromaShift: -0.05,
    suggestedOpacity: 0.7,
    animation: 'prominent',
    focusIndicator: false,
  },
  error: {
    requiresContrast: true,
    suggestedLightnessShift: 0,
    suggestedChromaShift: 0.1,
    suggestedOpacity: 1,
    animation: 'medium',
    focusIndicator: false,
  },
  success: {
    requiresContrast: true,
    suggestedLightnessShift: 0,
    suggestedChromaShift: 0.05,
    suggestedOpacity: 1,
    animation: 'subtle',
    focusIndicator: false,
  },
} as const;

// ============================================================================
// UI STATE VALUE OBJECT
// ============================================================================

/**
 * UIState - Value Object para estados de interacción.
 *
 * Encapsula un estado de UI con toda su lógica de dominio:
 * - Transiciones válidas
 * - Metadatos perceptuales
 * - Priorización
 * - Combinación de estados
 *
 * @example
 * ```typescript
 * const idle = UIState.idle();
 * const hover = UIState.hover();
 *
 * // Verificar transición válida
 * if (idle.canTransitionTo(hover)) {
 *   const newState = idle.transitionTo(hover);
 * }
 *
 * // Combinar estados (focus + hover)
 * const combined = UIState.combine([hover, UIState.focus()]);
 * console.log(combined.value); // 'focus' (mayor prioridad)
 *
 * // Obtener metadatos perceptuales
 * console.log(hover.metadata.suggestedLightnessShift); // 0.05
 * ```
 */
export class UIState {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _value: UIStateType;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(value: UIStateType) {
    this._value = value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea desde un string.
   */
  static from(value: string): Result<UIState, Error> {
    if (!UI_STATES.includes(value as UIStateType)) {
      return failure(new Error(`Invalid UI state: ${value}`));
    }
    return success(new UIState(value as UIStateType));
  }

  /**
   * Crea un UIState sin validación (usar solo con valores conocidos).
   */
  static of(value: UIStateType): UIState {
    return new UIState(value);
  }

  // Named constructors for each state
  static idle(): UIState { return new UIState('idle'); }
  static hover(): UIState { return new UIState('hover'); }
  static active(): UIState { return new UIState('active'); }
  static focus(): UIState { return new UIState('focus'); }
  static disabled(): UIState { return new UIState('disabled'); }
  static loading(): UIState { return new UIState('loading'); }
  static error(): UIState { return new UIState('error'); }
  static success(): UIState { return new UIState('success'); }

  /**
   * Obtiene todos los estados posibles.
   */
  static all(): readonly UIState[] {
    return UI_STATES.map(s => new UIState(s));
  }

  /**
   * Combina múltiples estados, retornando el de mayor prioridad.
   */
  static combine(states: readonly UIState[]): UIState {
    if (states.length === 0) {
      return UIState.idle();
    }

    return states.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valor del estado.
   */
  get value(): UIStateType {
    return this._value;
  }

  /**
   * Prioridad del estado.
   */
  get priority(): number {
    return STATE_PRIORITY[this._value];
  }

  /**
   * Metadatos perceptuales del estado.
   */
  get metadata(): StatePerceptualMetadata {
    return STATE_METADATA[this._value];
  }

  /**
   * Estados a los que se puede transicionar.
   */
  get validTransitions(): readonly UIStateType[] {
    return STATE_TRANSITIONS[this._value];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICADOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si es el estado idle.
   */
  get isIdle(): boolean { return this._value === 'idle'; }

  /**
   * Verifica si es un estado interactivo (hover, active, focus).
   */
  get isInteractive(): boolean {
    return ['hover', 'active', 'focus'].includes(this._value);
  }

  /**
   * Verifica si es un estado de feedback (error, success, loading).
   */
  get isFeedback(): boolean {
    return ['error', 'success', 'loading'].includes(this._value);
  }

  /**
   * Verifica si el estado requiere alto contraste.
   */
  get requiresHighContrast(): boolean {
    return this.metadata.requiresContrast;
  }

  /**
   * Verifica si el estado necesita indicador de focus.
   */
  get needsFocusIndicator(): boolean {
    return this.metadata.focusIndicator;
  }

  /**
   * Verifica si el estado tiene animación.
   */
  get hasAnimation(): boolean {
    return this.metadata.animation !== 'none';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSICIONES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si puede transicionar a otro estado.
   */
  canTransitionTo(target: UIState): boolean {
    return this.validTransitions.includes(target.value);
  }

  /**
   * Transiciona a otro estado si es válido.
   */
  transitionTo(target: UIState): Result<UIState, Error> {
    if (!this.canTransitionTo(target)) {
      return failure(
        new Error(
          `Invalid transition from '${this._value}' to '${target.value}'`
        )
      );
    }
    return success(target);
  }

  /**
   * Fuerza transición (sin validación).
   * Usar solo cuando se sabe que es correcto.
   */
  forceTransitionTo(target: UIState): UIState {
    return target;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica igualdad.
   */
  equals(other: UIState): boolean {
    return this._value === other._value;
  }

  /**
   * Compara por prioridad.
   * Retorna positivo si this tiene mayor prioridad.
   */
  comparePriority(other: UIState): number {
    return this.priority - other.priority;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  toString(): string {
    return this._value;
  }

  toJSON(): UIStateType {
    return this._value;
  }
}

// ============================================================================
// STATE MACHINE
// ============================================================================

/**
 * Máquina de estados simple para gestionar transiciones.
 */
export class UIStateMachine {
  private _current: UIState;
  private readonly _history: UIState[] = [];
  private readonly _maxHistory: number;

  constructor(initial: UIState = UIState.idle(), maxHistory = 10) {
    this._current = initial;
    this._maxHistory = maxHistory;
  }

  /**
   * Estado actual.
   */
  get current(): UIState {
    return this._current;
  }

  /**
   * Historial de estados.
   */
  get history(): readonly UIState[] {
    return [...this._history];
  }

  /**
   * Intenta transicionar a un nuevo estado.
   */
  transition(target: UIState): Result<UIState, Error> {
    const result = this._current.transitionTo(target);

    if (result.success) {
      this._history.push(this._current);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
      this._current = result.value;
    }

    return result;
  }

  /**
   * Fuerza transición (sin validación).
   */
  forceTransition(target: UIState): void {
    this._history.push(this._current);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    this._current = target;
  }

  /**
   * Retrocede al estado anterior.
   */
  back(): Result<UIState, Error> {
    if (this._history.length === 0) {
      return failure(new Error('No previous state in history'));
    }
    const previous = this._history.pop()!;
    this._current = previous;
    return success(previous);
  }

  /**
   * Resetea al estado inicial.
   */
  reset(): void {
    this._history.length = 0;
    this._current = UIState.idle();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UIState;
// UI_STATES is exported inline; these are not:
export { STATE_PRIORITY, STATE_TRANSITIONS };
