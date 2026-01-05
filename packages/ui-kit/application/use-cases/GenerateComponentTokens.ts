/**
 * @fileoverview GenerateComponentTokens Use Case
 *
 * Use case para generar una colección completa de tokens para un componente
 * basándose en un color de marca, intención y configuración de estados.
 *
 * @module ui-kit/application/use-cases/GenerateComponentTokens
 * @version 1.0.0
 */

import type { Result, ComponentVariant, UIState as UIStateType } from '../../domain/types';
import { success, failure } from '../../domain/types';
import { PerceptualColor } from '../../domain/perceptual';
import { ComponentIntent } from '../../domain/ux';
import { TokenCollection, TokenDerivationService } from '../../domain/tokens';
import type { TokenRepositoryPort } from '../ports/outbound/TokenRepositoryPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input para el use case.
 */
export interface GenerateComponentTokensInput {
  /** Nombre del componente */
  readonly componentName: string;
  /** Color de marca en hex */
  readonly brandColorHex: string;
  /** Intención del componente */
  readonly intent: string;
  /** Variantes a generar */
  readonly variants?: ComponentVariant[];
  /** Estados a generar */
  readonly states?: UIStateType[];
  /** Si se debe generar escala completa */
  readonly generateScale?: boolean;
  /** Namespace para los tokens */
  readonly namespace?: string;
}

/**
 * Output del use case.
 */
export interface GenerateComponentTokensOutput {
  /** Colección de tokens generados */
  readonly collection: TokenCollection;
  /** Estadísticas de generación */
  readonly stats: {
    readonly totalTokens: number;
    readonly colorTokens: number;
    readonly stateTokens: number;
    readonly variantTokens: number;
  };
  /** CSS generado */
  readonly css: string;
  /** Tokens W3C */
  readonly w3cTokens: string;
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * GenerateComponentTokens - Genera tokens completos para un componente.
 *
 * Este use case orquesta la generación de tokens de diseño para un componente
 * específico, incluyendo todos sus estados, variantes y escalas de color.
 *
 * @example
 * ```typescript
 * const useCase = new GenerateComponentTokens(derivationService, tokenRepo);
 *
 * const result = await useCase.execute({
 *   componentName: 'button',
 *   brandColorHex: '#3B82F6',
 *   intent: 'action',
 *   variants: ['solid', 'outline', 'ghost'],
 *   states: ['idle', 'hover', 'active', 'disabled'],
 * });
 *
 * if (result.success) {
 *   console.log(result.value.css);
 *   console.log(`Generated ${result.value.stats.totalTokens} tokens`);
 * }
 * ```
 */
export class GenerateComponentTokens {
  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly derivationService: TokenDerivationService;
  private readonly tokenRepository?: TokenRepositoryPort;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    derivationService?: TokenDerivationService,
    tokenRepository?: TokenRepositoryPort
  ) {
    this.derivationService = derivationService || new TokenDerivationService();
    this.tokenRepository = tokenRepository;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ejecuta el use case.
   */
  async execute(
    input: GenerateComponentTokensInput
  ): Promise<Result<GenerateComponentTokensOutput, Error>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (!validationResult.success) {
        return failure(validationResult.error);
      }

      // 2. Crear color perceptual
      const colorResult = PerceptualColor.tryFromHex(input.brandColorHex);
      if (!colorResult.success) {
        return failure(new Error(`Invalid brand color: ${colorResult.error.message}`));
      }
      const brandColor = colorResult.value;

      // 3. Obtener intención
      const intentResult = ComponentIntent.from(input.intent);
      if (!intentResult.success) {
        return failure(new Error(`Invalid intent: ${intentResult.error.message}`));
      }
      const intent = intentResult.value;

      // 4. Generar colección base
      const collection = this.derivationService.deriveComponentTokens(
        input.componentName,
        brandColor,
        intent
      );

      // 5. Agregar estados adicionales si se especifican
      if (input.states && input.states.length > 0) {
        const stateTokens = this.derivationService.deriveStates(
          `${input.componentName}.base`,
          brandColor,
          { component: input.componentName, intent: intent.value }
        );
        collection.addAll(stateTokens);
      }

      // 6. Agregar escala si se solicita
      if (input.generateScale) {
        const scaleTokens = this.derivationService.deriveScale(
          `${input.componentName}.scale`,
          brandColor,
          { component: input.componentName }
        );
        collection.addAll(scaleTokens);
      }

      // 7. Guardar en repositorio si está disponible
      if (this.tokenRepository) {
        await this.tokenRepository.save(collection);
      }

      // 8. Generar outputs
      const stats = this.calculateStats(collection);
      const css = collection.export({ format: 'css', prefix: input.namespace });
      const w3cTokens = collection.export({ format: 'w3c' });

      return success({
        collection,
        stats,
        css,
        w3cTokens,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Unknown error during token generation')
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida el input del use case.
   */
  private validateInput(input: GenerateComponentTokensInput): Result<void, Error> {
    if (!input.componentName || input.componentName.trim().length === 0) {
      return failure(new Error('Component name is required'));
    }

    if (!input.brandColorHex || input.brandColorHex.trim().length === 0) {
      return failure(new Error('Brand color hex is required'));
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(input.brandColorHex)) {
      return failure(new Error('Brand color must be a valid 6-digit hex color'));
    }

    if (!input.intent || input.intent.trim().length === 0) {
      return failure(new Error('Intent is required'));
    }

    return success(undefined);
  }

  /**
   * Calcula estadísticas de la colección.
   */
  private calculateStats(collection: TokenCollection) {
    const all = collection.all();
    const colorTokens = collection.byType('color').length;
    const stateTokens = collection.filter({ state: 'hover' }).length +
                        collection.filter({ state: 'active' }).length +
                        collection.filter({ state: 'disabled' }).length +
                        collection.filter({ state: 'focus' }).length;

    return {
      totalTokens: all.length,
      colorTokens,
      stateTokens,
      variantTokens: all.length - colorTokens,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GenerateComponentTokens;
