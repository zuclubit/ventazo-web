/**
 * @fileoverview TokenCollection Entity (Immutable)
 *
 * Entidad INMUTABLE que representa una colección organizada de Design Tokens.
 * Proporciona operaciones de consulta, filtrado, agrupación y exportación.
 *
 * Todas las operaciones de modificación retornan una NUEVA instancia,
 * preservando la inmutabilidad requerida por DDD.
 *
 * @module ui-kit/domain/tokens/entities/TokenCollection
 * @version 2.0.0
 */

import type { Result, UIRole as UIRoleType, UIState as UIStateType } from '../../types';
import { success, failure } from '../../types';
import {
  DesignToken,
  TokenCategory,
  TokenType,
} from '../value-objects/DesignToken';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Filtro para búsqueda de tokens.
 */
export interface TokenFilter {
  readonly name?: string | RegExp;
  readonly type?: TokenType;
  readonly category?: TokenCategory;
  readonly namespace?: string;
  readonly role?: UIRoleType;
  readonly state?: UIStateType;
  readonly component?: string;
  readonly includeDeprecated?: boolean;
}

/**
 * Opciones de exportación.
 */
export interface ExportOptions {
  readonly format: 'css' | 'scss' | 'json' | 'w3c' | 'tailwind' | 'figma';
  readonly includeMetadata?: boolean;
  readonly includeDeprecated?: boolean;
  readonly prefix?: string;
  readonly indent?: number;
}

/**
 * Estructura jerárquica de tokens.
 */
export interface TokenHierarchy {
  [key: string]: TokenHierarchy | DesignToken;
}

/**
 * Estadísticas de la colección.
 */
export interface CollectionStats {
  readonly totalTokens: number;
  readonly byType: Readonly<Record<TokenType, number>>;
  readonly byCategory: Readonly<Record<TokenCategory, number>>;
  readonly byNamespace: Readonly<Record<string, number>>;
  readonly deprecatedCount: number;
  readonly uniqueColors: number;
}

/**
 * Resultado de validación.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface ValidationError {
  readonly tokenName: string;
  readonly code: string;
  readonly message: string;
}

export interface ValidationWarning {
  readonly tokenName: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Opciones para crear una colección.
 */
export interface TokenCollectionOptions {
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
}

// ============================================================================
// TOKEN COLLECTION ENTITY (IMMUTABLE)
// ============================================================================

/**
 * TokenCollection - Entidad INMUTABLE para gestión de colecciones de tokens.
 *
 * IMPORTANTE: Todas las operaciones de modificación retornan una NUEVA instancia.
 * La instancia original nunca se modifica.
 *
 * Proporciona operaciones avanzadas sobre conjuntos de tokens:
 * - Consultas y filtrado
 * - Agrupación y organización
 * - Exportación a múltiples formatos
 * - Validación y auditoría
 *
 * @example
 * ```typescript
 * // Crear colección (inmutable)
 * const collection = TokenCollection.create({ name: 'brand' })
 *   .add(buttonBgToken)
 *   .add(buttonTextToken)
 *   .addAll(stateTokens);
 *
 * // Cada operación retorna nueva instancia
 * const updated = collection.add(newToken);
 * console.log(collection === updated); // false
 *
 * // Filtrar (no modifica)
 * const colorTokens = collection.filter({ type: 'color' });
 *
 * // Exportar a CSS
 * console.log(collection.export({ format: 'css' }));
 *
 * // Validar
 * const result = collection.validate();
 * ```
 */
export class TokenCollection {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE READONLY STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _name: string;
  private readonly _description: string;
  private readonly _version: string;
  private readonly _tokens: ReadonlyMap<string, DesignToken>;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE CONSTRUCTOR (use static factories)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(
    name: string,
    description: string,
    version: string,
    tokens: ReadonlyMap<string, DesignToken>,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._name = name;
    this._description = description;
    this._version = version;
    this._tokens = tokens;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    // Freeze para prevenir modificaciones accidentales
    Object.freeze(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea una nueva colección vacía.
   * @param optionsOrName - Options object o simplemente el nombre.
   */
  static create(optionsOrName: TokenCollectionOptions | string): TokenCollection {
    const options: TokenCollectionOptions = typeof optionsOrName === 'string'
      ? { name: optionsOrName }
      : optionsOrName;
    const now = new Date();
    return new TokenCollection(
      options.name,
      options.description ?? '',
      options.version ?? '1.0.0',
      new Map(),
      now,
      now
    );
  }

  /**
   * Crea colección vacía (alias de create).
   */
  static empty(name: string): TokenCollection {
    return TokenCollection.create({ name });
  }

  /**
   * Crea colección desde array de tokens.
   */
  static from(
    name: string,
    tokens: readonly DesignToken[],
    description: string = ''
  ): TokenCollection {
    const tokenMap = new Map<string, DesignToken>();
    for (const token of tokens) {
      tokenMap.set(token.name, token);
    }
    const now = new Date();
    return new TokenCollection(name, description, '1.0.0', tokenMap, now, now);
  }

  /**
   * Merge múltiples colecciones en una nueva.
   */
  static merge(
    name: string,
    collections: readonly TokenCollection[]
  ): TokenCollection {
    const tokenMap = new Map<string, DesignToken>();
    for (const collection of collections) {
      for (const token of collection.all()) {
        tokenMap.set(token.name, token);
      }
    }
    const now = new Date();
    return new TokenCollection(name, '', '1.0.0', tokenMap, now, now);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS (readonly access)
  // ─────────────────────────────────────────────────────────────────────────

  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get version(): string { return this._version; }
  get size(): number { return this._tokens.size; }
  get isEmpty(): boolean { return this._tokens.size === 0; }
  get createdAt(): Date { return new Date(this._createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this._updatedAt.getTime()); }

  /**
   * Obtiene todos los namespaces únicos.
   */
  get namespaces(): readonly string[] {
    const namespaces = new Set<string>();
    for (const token of this._tokens.values()) {
      namespaces.add(token.namespace);
    }
    return Object.freeze(Array.from(namespaces).sort());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IMMUTABLE CRUD OPERATIONS (return new instances)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Agrega un token. Retorna NUEVA colección.
   */
  add(token: DesignToken): TokenCollection {
    const newTokens = new Map(this._tokens);
    newTokens.set(token.name, token);
    return new TokenCollection(
      this._name,
      this._description,
      this._version,
      newTokens,
      this._createdAt,
      new Date()
    );
  }

  /**
   * Agrega múltiples tokens. Retorna NUEVA colección.
   */
  addAll(tokens: readonly DesignToken[]): TokenCollection {
    const newTokens = new Map(this._tokens);
    for (const token of tokens) {
      newTokens.set(token.name, token);
    }
    return new TokenCollection(
      this._name,
      this._description,
      this._version,
      newTokens,
      this._createdAt,
      new Date()
    );
  }

  /**
   * Obtiene un token por nombre.
   */
  get(name: string): DesignToken | undefined {
    return this._tokens.get(name);
  }

  /**
   * Verifica si existe un token.
   */
  has(name: string): boolean {
    return this._tokens.has(name);
  }

  /**
   * Elimina un token. Retorna NUEVA colección.
   * Si el token no existe, retorna la misma instancia (sin cambios).
   */
  remove(name: string): TokenCollection {
    if (!this._tokens.has(name)) {
      return this; // No changes needed
    }
    const newTokens = new Map(this._tokens);
    newTokens.delete(name);
    return new TokenCollection(
      this._name,
      this._description,
      this._version,
      newTokens,
      this._createdAt,
      new Date()
    );
  }

  /**
   * Reemplaza un token. Retorna Result con NUEVA colección o error.
   */
  replace(token: DesignToken): Result<TokenCollection, Error> {
    if (!this._tokens.has(token.name)) {
      return failure(new Error(`Token '${token.name}' not found`));
    }
    const newTokens = new Map(this._tokens);
    newTokens.set(token.name, token);
    return success(
      new TokenCollection(
        this._name,
        this._description,
        this._version,
        newTokens,
        this._createdAt,
        new Date()
      )
    );
  }

  /**
   * Actualiza o agrega un token. Retorna NUEVA colección.
   */
  upsert(token: DesignToken): TokenCollection {
    const newTokens = new Map(this._tokens);
    newTokens.set(token.name, token);
    return new TokenCollection(
      this._name,
      this._description,
      this._version,
      newTokens,
      this._createdAt,
      new Date()
    );
  }

  /**
   * Limpia la colección. Retorna NUEVA colección vacía.
   */
  clear(): TokenCollection {
    if (this._tokens.size === 0) {
      return this; // Already empty
    }
    return new TokenCollection(
      this._name,
      this._description,
      this._version,
      new Map(),
      this._createdAt,
      new Date()
    );
  }

  /**
   * Actualiza metadatos. Retorna NUEVA colección.
   */
  withMetadata(options: Partial<Pick<TokenCollectionOptions, 'name' | 'description' | 'version'>>): TokenCollection {
    return new TokenCollection(
      options.name ?? this._name,
      options.description ?? this._description,
      options.version ?? this._version,
      this._tokens,
      this._createdAt,
      new Date()
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY OPERATIONS (read-only, return copies)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los tokens (copia defensiva).
   */
  all(): readonly DesignToken[] {
    return Object.freeze(Array.from(this._tokens.values()));
  }

  /**
   * Alias de all() para compatibilidad.
   * @deprecated Usar all() en su lugar.
   */
  getAll(): readonly DesignToken[] {
    return this.all();
  }

  /**
   * Obtiene tokens por prefijo de path (e.g., 'color.brand').
   */
  getByPath(pathPrefix: string): readonly DesignToken[] {
    const normalizedPrefix = pathPrefix.endsWith('.') ? pathPrefix : `${pathPrefix}.`;
    const results = Array.from(this._tokens.values()).filter(token => {
      // Match tokens where name starts with prefix or equals prefix without dot
      return token.name.startsWith(normalizedPrefix) ||
             token.name === pathPrefix ||
             token.name.startsWith(pathPrefix);
    });
    return Object.freeze(results);
  }

  /**
   * Filtra tokens según criterios.
   */
  filter(criteria: TokenFilter): readonly DesignToken[] {
    let results = Array.from(this._tokens.values());

    if (criteria.name) {
      if (criteria.name instanceof RegExp) {
        results = results.filter(t => criteria.name instanceof RegExp && criteria.name.test(t.name));
      } else {
        results = results.filter(t => t.name.includes(criteria.name as string));
      }
    }

    if (criteria.type) {
      results = results.filter(t => t.type === criteria.type);
    }

    if (criteria.category) {
      results = results.filter(t => t.category === criteria.category);
    }

    if (criteria.namespace) {
      results = results.filter(t => t.namespace === criteria.namespace);
    }

    if (criteria.role) {
      results = results.filter(t => t.context.role === criteria.role);
    }

    if (criteria.state) {
      results = results.filter(t => t.context.state === criteria.state);
    }

    if (criteria.component) {
      results = results.filter(t => t.context.component === criteria.component);
    }

    if (!criteria.includeDeprecated) {
      results = results.filter(t => !t.deprecated);
    }

    return Object.freeze(results);
  }

  /**
   * Retorna nueva colección con solo los tokens que cumplen criterios.
   */
  filterToCollection(criteria: TokenFilter): TokenCollection {
    const filtered = this.filter(criteria);
    return TokenCollection.from(this._name, filtered, this._description);
  }

  /**
   * Encuentra el primer token que cumple criterios.
   */
  find(criteria: TokenFilter): DesignToken | undefined {
    return this.filter(criteria)[0];
  }

  /**
   * Verifica si algún token cumple criterios.
   */
  some(criteria: TokenFilter): boolean {
    return this.filter(criteria).length > 0;
  }

  /**
   * Verifica si todos los tokens cumplen criterios.
   */
  every(criteria: TokenFilter): boolean {
    const all = this.all();
    const filtered = this.filter(criteria);
    return all.length === filtered.length;
  }

  /**
   * Obtiene tokens por tipo.
   */
  byType(type: TokenType): readonly DesignToken[] {
    return this.filter({ type });
  }

  /**
   * Obtiene tokens por categoría.
   */
  byCategory(category: TokenCategory): readonly DesignToken[] {
    return this.filter({ category });
  }

  /**
   * Obtiene tokens por namespace.
   */
  byNamespace(namespace: string): readonly DesignToken[] {
    return this.filter({ namespace });
  }

  /**
   * Obtiene tokens por componente.
   */
  byComponent(component: string): readonly DesignToken[] {
    return this.filter({ component });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUPING OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Agrupa tokens por tipo.
   */
  groupByType(): ReadonlyMap<TokenType, readonly DesignToken[]> {
    const groups = new Map<TokenType, DesignToken[]>();
    for (const token of this._tokens.values()) {
      const existing = groups.get(token.type) || [];
      existing.push(token);
      groups.set(token.type, existing);
    }
    // Freeze arrays
    const frozen = new Map<TokenType, readonly DesignToken[]>();
    for (const [key, value] of groups) {
      frozen.set(key, Object.freeze(value));
    }
    return frozen;
  }

  /**
   * Agrupa tokens por categoría.
   */
  groupByCategory(): ReadonlyMap<TokenCategory, readonly DesignToken[]> {
    const groups = new Map<TokenCategory, DesignToken[]>();
    for (const token of this._tokens.values()) {
      const existing = groups.get(token.category) || [];
      existing.push(token);
      groups.set(token.category, existing);
    }
    const frozen = new Map<TokenCategory, readonly DesignToken[]>();
    for (const [key, value] of groups) {
      frozen.set(key, Object.freeze(value));
    }
    return frozen;
  }

  /**
   * Agrupa tokens por namespace.
   */
  groupByNamespace(): ReadonlyMap<string, readonly DesignToken[]> {
    const groups = new Map<string, DesignToken[]>();
    for (const token of this._tokens.values()) {
      const existing = groups.get(token.namespace) || [];
      existing.push(token);
      groups.set(token.namespace, existing);
    }
    const frozen = new Map<string, readonly DesignToken[]>();
    for (const [key, value] of groups) {
      frozen.set(key, Object.freeze(value));
    }
    return frozen;
  }

  /**
   * Construye estructura jerárquica desde paths.
   */
  toHierarchy(): Readonly<TokenHierarchy> {
    const root: TokenHierarchy = {};

    for (const token of this._tokens.values()) {
      const parts = token.path;
      let current = root;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as TokenHierarchy;
      }

      const lastPart = parts[parts.length - 1];
      current[lastPart] = token;
    }

    return Object.freeze(root);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exporta la colección en el formato especificado.
   */
  export(options: ExportOptions): string {
    const tokens = options.includeDeprecated
      ? Array.from(this._tokens.values())
      : Array.from(this.filter({ includeDeprecated: false }));

    switch (options.format) {
      case 'css':
        return this.exportToCss(tokens, options);
      case 'scss':
        return this.exportToScss(tokens, options);
      case 'json':
        return this.exportToJson(tokens, options);
      case 'w3c':
        return this.exportToW3C(tokens, options);
      case 'tailwind':
        return this.exportToTailwind(tokens, options);
      case 'figma':
        return this.exportToFigma(tokens, options);
      default:
        throw new Error(`Unknown export format: ${(options as ExportOptions).format}`);
    }
  }

  /**
   * Exporta a CSS variables.
   */
  private exportToCss(tokens: readonly DesignToken[], options: ExportOptions): string {
    const prefix = options.prefix || '';
    const indent = ' '.repeat(options.indent || 2);

    const lines = [':root {'];
    for (const token of tokens) {
      const varName = prefix
        ? `--${prefix}-${token.name.replace(/\./g, '-')}`
        : token.cssVariableName;
      lines.push(`${indent}${varName}: ${token.toCssValue()};`);
    }
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Exporta a SCSS variables.
   */
  private exportToScss(tokens: readonly DesignToken[], options: ExportOptions): string {
    const prefix = options.prefix || '';

    return tokens
      .map(token => {
        const varName = prefix
          ? `$${prefix}-${token.name.replace(/\./g, '-')}`
          : `$${token.name.replace(/\./g, '-')}`;
        return `${varName}: ${token.toCssValue()};`;
      })
      .join('\n');
  }

  /**
   * Exporta a JSON.
   */
  private exportToJson(tokens: readonly DesignToken[], options: ExportOptions): string {
    const data = options.includeMetadata
      ? tokens.map(t => t.toJSON())
      : tokens.reduce((acc, t) => {
          acc[t.name] = t.toCssValue();
          return acc;
        }, {} as Record<string, string>);

    return JSON.stringify(data, null, options.indent || 2);
  }

  /**
   * Exporta a formato W3C DTCG.
   */
  private exportToW3C(tokens: readonly DesignToken[], options: ExportOptions): string {
    const hierarchy: Record<string, unknown> = {};

    for (const token of tokens) {
      const parts = token.path;
      let current = hierarchy;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastPart = parts[parts.length - 1];
      current[lastPart] = token.toW3C();
    }

    return JSON.stringify(hierarchy, null, options.indent || 2);
  }

  /**
   * Exporta a configuración Tailwind.
   */
  private exportToTailwind(tokens: readonly DesignToken[], options: ExportOptions): string {
    const colors: Record<string, Record<string, string>> = {};
    const spacing: Record<string, string> = {};
    const shadows: Record<string, string> = {};

    for (const token of tokens) {
      const { key, value } = token.toTailwindConfig();

      if (token.isColor) {
        const parts = key.split('-');
        const colorName = parts[0];
        const shade = parts.slice(1).join('-') || 'DEFAULT';

        if (!colors[colorName]) {
          colors[colorName] = {};
        }
        colors[colorName][shade] = value;
      } else if (token.isDimension) {
        spacing[key] = value;
      } else if (token.isShadow) {
        shadows[key] = value;
      }
    }

    const config = {
      theme: {
        extend: {
          colors,
          spacing,
          boxShadow: shadows,
        },
      },
    };

    return `module.exports = ${JSON.stringify(config, null, options.indent || 2)}`;
  }

  /**
   * Exporta a formato Figma Tokens.
   */
  private exportToFigma(tokens: readonly DesignToken[], options: ExportOptions): string {
    const figmaTokens: Record<string, unknown> = {};

    for (const token of tokens) {
      figmaTokens[token.name] = {
        value: token.toCssValue(),
        type: token.type,
        description: token.description,
      };
    }

    return JSON.stringify(figmaTokens, null, options.indent || 2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida la colección.
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const token of this._tokens.values()) {
      if (!token.description) {
        warnings.push({
          tokenName: token.name,
          code: 'MISSING_DESCRIPTION',
          message: 'Token lacks description',
        });
      }

      if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(token.name)) {
        warnings.push({
          tokenName: token.name,
          code: 'INVALID_NAME_FORMAT',
          message: 'Token name should follow lowercase dot notation',
        });
      }

      if (token.isColor) {
        const colorValue = token.value as { perceptual?: unknown };
        if (!colorValue.perceptual) {
          warnings.push({
            tokenName: token.name,
            code: 'MISSING_PERCEPTUAL',
            message: 'Color token lacks perceptual metadata',
          });
        }
      }

      if (token.deprecated && !token.deprecationMessage) {
        warnings.push({
          tokenName: token.name,
          code: 'DEPRECATED_NO_MESSAGE',
          message: 'Deprecated token lacks deprecation message',
        });
      }
    }

    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
    });
  }

  /**
   * Obtiene estadísticas de la colección.
   */
  stats(): CollectionStats {
    const byType: Record<TokenType, number> = {
      color: 0,
      dimension: 0,
      fontFamily: 0,
      fontWeight: 0,
      duration: 0,
      cubicBezier: 0,
      shadow: 0,
      gradient: 0,
      typography: 0,
      border: 0,
      transition: 0,
      composite: 0,
    };

    const byCategory: Record<TokenCategory, number> = {
      primitive: 0,
      semantic: 0,
      component: 0,
      state: 0,
    };

    const byNamespace: Record<string, number> = {};
    const uniqueColors = new Set<string>();
    let deprecatedCount = 0;

    for (const token of this._tokens.values()) {
      byType[token.type]++;
      byCategory[token.category]++;
      byNamespace[token.namespace] = (byNamespace[token.namespace] || 0) + 1;

      if (token.deprecated) {
        deprecatedCount++;
      }

      if (token.isColor) {
        uniqueColors.add(token.toCssValue());
      }
    }

    return Object.freeze({
      totalTokens: this._tokens.size,
      byType: Object.freeze(byType),
      byCategory: Object.freeze(byCategory),
      byNamespace: Object.freeze(byNamespace),
      deprecatedCount,
      uniqueColors: uniqueColors.size,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ITERATION (read-only)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Itera sobre tokens.
   */
  forEach(callback: (token: DesignToken) => void): void {
    for (const token of this._tokens.values()) {
      callback(token);
    }
  }

  /**
   * Mapea tokens a nuevo tipo.
   */
  map<T>(callback: (token: DesignToken) => T): readonly T[] {
    return Object.freeze(this.all().map(callback));
  }

  /**
   * Reduce tokens.
   */
  reduce<T>(
    callback: (acc: T, token: DesignToken) => T,
    initial: T
  ): T {
    return Array.from(this._tokens.values()).reduce(callback, initial);
  }

  /**
   * Iterator support.
   */
  [Symbol.iterator](): Iterator<DesignToken> {
    return this._tokens.values();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EQUALITY & COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compara dos colecciones por contenido.
   */
  equals(other: TokenCollection): boolean {
    if (this._tokens.size !== other._tokens.size) {
      return false;
    }
    for (const [name, token] of this._tokens) {
      const otherToken = other._tokens.get(name);
      if (!otherToken || token.name !== otherToken.name) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calcula diff entre colecciones.
   */
  diff(other: TokenCollection): {
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly changed: readonly string[];
  } {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    // Find added and changed
    for (const [name, token] of other._tokens) {
      if (!this._tokens.has(name)) {
        added.push(name);
      } else {
        const existing = this._tokens.get(name)!;
        if (existing.toCssValue() !== token.toCssValue()) {
          changed.push(name);
        }
      }
    }

    // Find removed
    for (const name of this._tokens.keys()) {
      if (!other._tokens.has(name)) {
        removed.push(name);
      }
    }

    return Object.freeze({
      added: Object.freeze(added),
      removed: Object.freeze(removed),
      changed: Object.freeze(changed),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  toJSON(): Readonly<{
    name: string;
    description: string;
    version: string;
    createdAt: string;
    updatedAt: string;
    tokens: readonly object[];
  }> {
    return Object.freeze({
      name: this._name,
      description: this._description,
      version: this._version,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      tokens: Object.freeze(this.all().map(t => t.toJSON())),
    });
  }

  /**
   * Reconstituye desde JSON.
   */
  static fromJSON(
    json: { name: string; description?: string; version?: string; tokens: unknown[] },
    tokenDeserializer: (data: unknown) => DesignToken
  ): TokenCollection {
    const tokens = json.tokens.map(tokenDeserializer);
    return TokenCollection.from(json.name, tokens, json.description ?? '');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TokenCollection;
// Note: TokenFilter, ExportOptions, TokenHierarchy, CollectionStats,
// ValidationResult, ValidationError, ValidationWarning, TokenCollectionOptions
// are already exported at their interface declarations above.
