// ============================================
// Design System Adapters
// Hexagonal Architecture - Infrastructure Layer
// ============================================

// Base adapter interface and types
export {
  type IDesignSystemAdapter,
  type DesignSystemConfig,
  type DesignSystemToken,
  type TonalPalette,
  type ColorSchemeOutput,
  type ThemeGenerationOptions,
  type AccessibilityValidation,
  type ColorRole,
  type ColorVariant,
  type ColorScheme,
  type SurfaceLevel,
  BaseDesignSystemAdapter,
} from './DesignSystemAdapter';

// Material Design 3 Adapter
export {
  MaterialDesign3Adapter,
  createMaterialDesign3Adapter,
  type MD3ColorRole,
  type MD3SchemeTokens,
  type SurfaceTintConfig,
} from './MaterialDesign3Adapter';

// Fluent UI Adapter
export {
  FluentUIAdapter,
  createFluentUIAdapter,
  type FluentColorSlot,
  type FluentNeutralSlot,
  type FluentSemanticSlot,
  type FluentPalette,
} from './FluentUIAdapter';

// CSS Output Adapter
export {
  CssOutputAdapter,
  cssAdapter,
  type CssOutputOptions,
  type ThemeVariableConfig,
} from './CssOutputAdapter';

// ============================================
// Factory Functions
// ============================================

import { IDesignSystemAdapter } from './DesignSystemAdapter';
import { MaterialDesign3Adapter } from './MaterialDesign3Adapter';
import { FluentUIAdapter } from './FluentUIAdapter';

/**
 * Design system types
 */
export type DesignSystemType = 'material3' | 'fluent' | 'custom';

/**
 * Create adapter for specified design system
 */
export function createDesignSystemAdapter(
  type: DesignSystemType
): IDesignSystemAdapter {
  switch (type) {
    case 'material3':
      return new MaterialDesign3Adapter();
    case 'fluent':
      return new FluentUIAdapter();
    case 'custom':
      throw new Error(
        'Custom adapter requires extending BaseDesignSystemAdapter. ' +
        'Use BaseDesignSystemAdapter as a base class to create your own.'
      );
    default:
      throw new Error(`Unknown design system type: ${type}`);
  }
}

/**
 * Get available design system types
 */
export function getAvailableDesignSystems(): ReadonlyArray<{
  type: DesignSystemType;
  name: string;
  description: string;
}> {
  return [
    {
      type: 'material3',
      name: 'Material Design 3',
      description: "Google's Material You design system with HCT-based tonal palettes",
    },
    {
      type: 'fluent',
      name: 'Fluent UI',
      description: "Microsoft's Fluent Design System with semantic color slots",
    },
    {
      type: 'custom',
      name: 'Custom',
      description: 'Extend BaseDesignSystemAdapter for your own design system',
    },
  ];
}
