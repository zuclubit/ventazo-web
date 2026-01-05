/**
 * @fileoverview DesignToken Value Object
 *
 * Value Object inmutable que representa un token de diseño individual.
 * Sigue el estándar W3C Design Tokens Community Group (DTCG).
 *
 * @module ui-kit/domain/tokens/value-objects/DesignToken
 * @version 1.0.0
 */

import type {
  UIRole as UIRoleType,
  UIState as UIStateType,
  ComponentIntent as ComponentIntentType,
  Result,
} from '../../types';
import { success, failure } from '../../types';
import { PerceptualColor } from '../../perceptual/value-objects/PerceptualColor';
import { UIState } from '../../ux/value-objects/UIState';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tipo de token según DTCG.
 */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'shadow'
  | 'gradient'
  | 'typography'
  | 'border'
  | 'transition'
  | 'composite';

/**
 * Categoría semántica del token.
 */
export type TokenCategory =
  | 'primitive'    // Valores base sin semántica
  | 'semantic'     // Valores con significado de UI
  | 'component'    // Valores específicos de componente
  | 'state';       // Valores de estado de interacción

/**
 * Metadatos de trazabilidad del token.
 */
export interface TokenProvenance {
  readonly derivedFrom?: string;        // Token del que se derivó
  readonly transformations: string[];   // Transformaciones aplicadas
  readonly createdAt: Date;
  readonly version: string;
  readonly generator: string;
}

/**
 * Contexto de uso del token.
 */
export interface TokenContext {
  readonly role?: UIRoleType;
  readonly state?: UIStateType;
  readonly intent?: ComponentIntentType;
  readonly component?: string;
  readonly variant?: string;
}

/**
 * Valor del token según tipo.
 */
export type TokenValue =
  | ColorTokenValue
  | DimensionTokenValue
  | ShadowTokenValue
  | GradientTokenValue
  | CompositeTokenValue;

export interface ColorTokenValue {
  readonly type: 'color';
  readonly value: string;           // Hex o CSS color
  readonly perceptual?: {
    readonly oklch: { l: number; c: number; h: number };
    readonly apca?: number;
    readonly wcagRatio?: number;
  };
}

export interface DimensionTokenValue {
  readonly type: 'dimension';
  readonly value: number;
  readonly unit: 'px' | 'rem' | 'em' | '%' | 'vw' | 'vh';
}

export interface ShadowTokenValue {
  readonly type: 'shadow';
  readonly value: {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly blur: number;
    readonly spread: number;
    readonly color: string;
    readonly inset?: boolean;
  }[];
}

export interface GradientTokenValue {
  readonly type: 'gradient';
  readonly value: {
    readonly type: 'linear' | 'radial' | 'conic';
    readonly angle?: number;
    readonly stops: Array<{ color: string; position: number }>;
  };
}

export interface CompositeTokenValue {
  readonly type: 'composite';
  readonly value: Record<string, TokenValue>;
}

/**
 * Formato W3C DTCG para exportación.
 */
export interface W3CDesignToken {
  readonly $value: unknown;
  readonly $type: string;
  readonly $description?: string;
  readonly $extensions?: Record<string, unknown>;
}

// ============================================================================
// DESIGN TOKEN VALUE OBJECT
// ============================================================================

/**
 * DesignToken - Value Object para tokens de diseño.
 *
 * Representa un token de diseño inmutable con toda su metadata,
 * trazabilidad y capacidad de exportación a múltiples formatos.
 *
 * @example
 * ```typescript
 * // Crear token de color
 * const buttonBg = DesignToken.color(
 *   'button.primary.background',
 *   PerceptualColor.fromHex('#3B82F6').value!,
 *   {
 *     role: 'accent',
 *     state: 'idle',
 *     intent: 'action',
 *     component: 'button',
 *     variant: 'primary'
 *   }
 * );
 *
 * // Exportar a CSS
 * console.log(buttonBg.toCssVariable());
 * // --button-primary-background: #3B82F6;
 *
 * // Exportar a W3C format
 * console.log(buttonBg.toW3C());
 * ```
 */
export class DesignToken {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _name: string;
  private readonly _value: TokenValue;
  private readonly _category: TokenCategory;
  private readonly _description: string;
  private readonly _context: TokenContext;
  private readonly _provenance: TokenProvenance;
  private readonly _deprecated: boolean;
  private readonly _deprecationMessage?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(
    name: string,
    value: TokenValue,
    category: TokenCategory,
    description: string,
    context: TokenContext,
    provenance: TokenProvenance,
    deprecated: boolean = false,
    deprecationMessage?: string
  ) {
    this._name = name;
    this._value = value;
    this._category = category;
    this._description = description;
    this._context = context;
    this._provenance = provenance;
    this._deprecated = deprecated;
    this._deprecationMessage = deprecationMessage;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea un token de color desde PerceptualColor.
   */
  static color(
    name: string,
    color: PerceptualColor,
    context: TokenContext = {},
    description: string = ''
  ): DesignToken {
    const coords = color.oklch;
    const value: ColorTokenValue = {
      type: 'color',
      value: color.hex,
      perceptual: {
        oklch: { l: coords.l, c: coords.c, h: coords.h },
      },
    };

    return new DesignToken(
      name,
      value,
      DesignToken.inferCategory(context),
      description,
      context,
      DesignToken.createProvenance()
    );
  }

  /**
   * Crea un token de color desde hex string.
   */
  static colorFromHex(
    name: string,
    hex: string,
    context: TokenContext = {},
    description: string = ''
  ): Result<DesignToken, Error> {
    const colorResult = PerceptualColor.tryFromHex(hex);
    if (!colorResult.success) {
      return failure(colorResult.error);
    }
    return success(DesignToken.color(name, colorResult.value, context, description));
  }

  /**
   * Crea un token de dimensión.
   */
  static dimension(
    name: string,
    value: number,
    unit: DimensionTokenValue['unit'],
    context: TokenContext = {},
    description: string = ''
  ): DesignToken {
    const tokenValue: DimensionTokenValue = {
      type: 'dimension',
      value,
      unit,
    };

    return new DesignToken(
      name,
      tokenValue,
      DesignToken.inferCategory(context),
      description,
      context,
      DesignToken.createProvenance()
    );
  }

  /**
   * Crea un token de sombra.
   */
  static shadow(
    name: string,
    shadows: ShadowTokenValue['value'],
    context: TokenContext = {},
    description: string = ''
  ): DesignToken {
    const value: ShadowTokenValue = {
      type: 'shadow',
      value: shadows,
    };

    return new DesignToken(
      name,
      value,
      DesignToken.inferCategory(context),
      description,
      context,
      DesignToken.createProvenance()
    );
  }

  /**
   * Crea un token de gradiente.
   */
  static gradient(
    name: string,
    gradientDef: GradientTokenValue['value'],
    context: TokenContext = {},
    description: string = ''
  ): DesignToken {
    const value: GradientTokenValue = {
      type: 'gradient',
      value: gradientDef,
    };

    return new DesignToken(
      name,
      value,
      DesignToken.inferCategory(context),
      description,
      context,
      DesignToken.createProvenance()
    );
  }

  /**
   * Crea un token compuesto.
   */
  static composite(
    name: string,
    values: Record<string, TokenValue>,
    context: TokenContext = {},
    description: string = ''
  ): DesignToken {
    const value: CompositeTokenValue = {
      type: 'composite',
      value: values,
    };

    return new DesignToken(
      name,
      value,
      DesignToken.inferCategory(context),
      description,
      context,
      DesignToken.createProvenance()
    );
  }

  /**
   * Infiere categoría desde contexto.
   */
  private static inferCategory(context: TokenContext): TokenCategory {
    if (context.state) return 'state';
    if (context.component) return 'component';
    if (context.role || context.intent) return 'semantic';
    return 'primitive';
  }

  /**
   * Crea provenance inicial.
   */
  private static createProvenance(derivedFrom?: string): TokenProvenance {
    return {
      derivedFrom,
      transformations: [],
      createdAt: new Date(),
      version: '1.0.0',
      generator: 'ui-kit/domain',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  get name(): string { return this._name; }
  get value(): TokenValue { return this._value; }
  get type(): TokenType { return this._value.type; }
  get category(): TokenCategory { return this._category; }
  get description(): string { return this._description; }
  get context(): TokenContext { return this._context; }
  get provenance(): TokenProvenance { return this._provenance; }
  get deprecated(): boolean { return this._deprecated; }
  get deprecationMessage(): string | undefined { return this._deprecationMessage; }

  /**
   * Nombre como variable CSS.
   */
  get cssVariableName(): string {
    return `--${this._name.replace(/\./g, '-')}`;
  }

  /**
   * Path jerárquico.
   */
  get path(): string[] {
    return this._name.split('.');
  }

  /**
   * Namespace (primer segmento del path).
   */
  get namespace(): string {
    return this.path[0] || '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICADOS
  // ─────────────────────────────────────────────────────────────────────────

  get isColor(): boolean { return this._value.type === 'color'; }
  get isDimension(): boolean { return this._value.type === 'dimension'; }
  get isShadow(): boolean { return this._value.type === 'shadow'; }
  get isGradient(): boolean { return this._value.type === 'gradient'; }
  get isComposite(): boolean { return this._value.type === 'composite'; }

  get isPrimitive(): boolean { return this._category === 'primitive'; }
  get isSemantic(): boolean { return this._category === 'semantic'; }
  get isComponent(): boolean { return this._category === 'component'; }
  get isState(): boolean { return this._category === 'state'; }

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFORMACIONES (Inmutables)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea copia con nuevo nombre.
   */
  rename(newName: string): DesignToken {
    return new DesignToken(
      newName,
      this._value,
      this._category,
      this._description,
      this._context,
      this.addTransformation(`renamed from ${this._name}`),
      this._deprecated,
      this._deprecationMessage
    );
  }

  /**
   * Crea copia con nueva descripción.
   */
  describe(description: string): DesignToken {
    return new DesignToken(
      this._name,
      this._value,
      this._category,
      description,
      this._context,
      this._provenance,
      this._deprecated,
      this._deprecationMessage
    );
  }

  /**
   * Marca como deprecado.
   */
  deprecate(message: string): DesignToken {
    return new DesignToken(
      this._name,
      this._value,
      this._category,
      this._description,
      this._context,
      this._provenance,
      true,
      message
    );
  }

  /**
   * Crea copia con contexto adicional.
   */
  withContext(additionalContext: Partial<TokenContext>): DesignToken {
    return new DesignToken(
      this._name,
      this._value,
      DesignToken.inferCategory({ ...this._context, ...additionalContext }),
      this._description,
      { ...this._context, ...additionalContext },
      this.addTransformation('context updated'),
      this._deprecated,
      this._deprecationMessage
    );
  }

  /**
   * Deriva un token de estado desde este token.
   */
  deriveState(state: UIState, color: PerceptualColor): DesignToken {
    if (this._value.type !== 'color') {
      throw new Error('Can only derive state from color tokens');
    }

    const stateSuffix = state.value;
    const newName = `${this._name}.${stateSuffix}`;

    return DesignToken.color(
      newName,
      color,
      { ...this._context, state: state.value },
      `${this._description} - ${stateSuffix} state`
    );
  }

  /**
   * Agrega transformación al provenance.
   */
  private addTransformation(transformation: string): TokenProvenance {
    return {
      ...this._provenance,
      transformations: [...this._provenance.transformations, transformation],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORTACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exporta a variable CSS.
   */
  toCssVariable(): string {
    return `${this.cssVariableName}: ${this.toCssValue()};`;
  }

  /**
   * Exporta a valor CSS.
   */
  toCssValue(): string {
    switch (this._value.type) {
      case 'color':
        return this._value.value;

      case 'dimension':
        return `${this._value.value}${this._value.unit}`;

      case 'shadow':
        return this._value.value
          .map(s =>
            `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`
          )
          .join(', ');

      case 'gradient': {
        const g = this._value.value;
        const stops = g.stops.map(s => `${s.color} ${s.position * 100}%`).join(', ');
        if (g.type === 'linear') {
          return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
        } else if (g.type === 'radial') {
          return `radial-gradient(${stops})`;
        } else {
          return `conic-gradient(${stops})`;
        }
      }

      case 'composite':
        // Composite tokens no tienen valor CSS directo
        return '';
    }
  }

  /**
   * Exporta a formato W3C DTCG.
   */
  toW3C(): W3CDesignToken {
    const base: W3CDesignToken = {
      $value: this.getW3CValue(),
      $type: this.getW3CType(),
      $description: this._description || undefined,
      $extensions: {
        'com.ui-kit': {
          category: this._category,
          context: this._context,
          provenance: {
            derivedFrom: this._provenance.derivedFrom,
            generator: this._provenance.generator,
            version: this._provenance.version,
          },
          deprecated: this._deprecated ? {
            message: this._deprecationMessage,
          } : undefined,
        },
      },
    };

    return base;
  }

  /**
   * Obtiene valor en formato W3C.
   */
  private getW3CValue(): unknown {
    switch (this._value.type) {
      case 'color':
        return this._value.value;

      case 'dimension':
        return `${this._value.value}${this._value.unit}`;

      case 'shadow':
        return this._value.value.map(s => ({
          offsetX: `${s.offsetX}px`,
          offsetY: `${s.offsetY}px`,
          blur: `${s.blur}px`,
          spread: `${s.spread}px`,
          color: s.color,
          inset: s.inset,
        }));

      case 'gradient':
        return this._value.value;

      case 'composite':
        return this._value.value;
    }
  }

  /**
   * Obtiene tipo W3C.
   */
  private getW3CType(): string {
    return this._value.type;
  }

  /**
   * Exporta a formato Tailwind.
   */
  toTailwindConfig(): { key: string; value: string } {
    // Convierte "button.primary.background" a "button-primary-background"
    const key = this._name.replace(/\./g, '-');
    return { key, value: this.toCssValue() };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica igualdad estructural.
   */
  equals(other: DesignToken): boolean {
    return this._name === other._name &&
           JSON.stringify(this._value) === JSON.stringify(other._value);
  }

  /**
   * Verifica si es del mismo tipo.
   */
  sameType(other: DesignToken): boolean {
    return this._value.type === other._value.type;
  }

  /**
   * Verifica si comparten namespace.
   */
  sameNamespace(other: DesignToken): boolean {
    return this.namespace === other.namespace;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  toString(): string {
    return `${this._name}: ${this.toCssValue()}`;
  }

  toJSON(): object {
    return {
      name: this._name,
      value: this._value,
      category: this._category,
      description: this._description,
      context: this._context,
      provenance: {
        ...this._provenance,
        createdAt: this._provenance.createdAt.toISOString(),
      },
      deprecated: this._deprecated,
      deprecationMessage: this._deprecationMessage,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DesignToken;
