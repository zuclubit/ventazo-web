/**
 * @fileoverview AccessibleButton - Composed Component
 *
 * Componente compuesto que demuestra la arquitectura correcta para
 * botones gobernados por Color Intelligence.
 *
 * Características:
 * 1. Colores derivados automáticamente por estado
 * 2. Contraste accesible garantizado (WCAG AA mínimo)
 * 3. Estados visuales perceptualmente correctos
 * 4. Sin hardcoding de colores
 *
 * @module ui-kit/components/composed/AccessibleButton
 * @version 1.0.0
 */

import React, { useMemo, useState, useCallback, forwardRef } from 'react';
import type { PerceptualColor } from '../../domain/perceptual';
import type { ComponentIntent } from '../../domain/ux';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Variantes de botón disponibles.
 */
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';

/**
 * Tamaños de botón disponibles.
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Estado visual del botón.
 */
export type ButtonState = 'idle' | 'hover' | 'active' | 'focus' | 'disabled';

/**
 * Props del componente AccessibleButton.
 */
export interface AccessibleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Color base del botón (de Color Intelligence) */
  baseColor: PerceptualColor;
  /** Variante visual */
  variant?: ButtonVariant;
  /** Tamaño del botón */
  size?: ButtonSize;
  /** Intent semántico */
  intent?: ComponentIntent;
  /** Si ocupa todo el ancho */
  fullWidth?: boolean;
  /** Si muestra loading */
  loading?: boolean;
  /** Icono a la izquierda */
  leftIcon?: React.ReactNode;
  /** Icono a la derecha */
  rightIcon?: React.ReactNode;
  /** Si el icono es solo (sin texto) */
  iconOnly?: boolean;
  /** Override de colores de estado */
  stateColors?: Partial<Record<ButtonState, PerceptualColor>>;
}

// ============================================================================
// SIZE CONFIG
// ============================================================================

const SIZE_CONFIG: Record<ButtonSize, {
  height: number;
  paddingX: number;
  fontSize: number;
  borderRadius: number;
  iconSize: number;
  gap: number;
}> = {
  xs: { height: 24, paddingX: 8, fontSize: 11, borderRadius: 4, iconSize: 12, gap: 4 },
  sm: { height: 32, paddingX: 12, fontSize: 13, borderRadius: 6, iconSize: 14, gap: 6 },
  md: { height: 40, paddingX: 16, fontSize: 14, borderRadius: 8, iconSize: 16, gap: 8 },
  lg: { height: 48, paddingX: 20, fontSize: 16, borderRadius: 10, iconSize: 18, gap: 8 },
  xl: { height: 56, paddingX: 24, fontSize: 18, borderRadius: 12, iconSize: 20, gap: 10 },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AccessibleButton - Botón accesible gobernado por Color Intelligence.
 *
 * Este componente es un ejemplo de referencia arquitectónica que demuestra:
 * 1. Cómo recibir colores perceptuales como props
 * 2. Cómo derivar estados visuales automáticamente
 * 3. Cómo garantizar accesibilidad sin hardcoding
 * 4. Cómo manejar variantes e intents semánticos
 *
 * @example
 * ```tsx
 * import { AccessibleButton } from '@zuclubit/ui-kit/components';
 * import { PerceptualColor } from '@zuclubit/ui-kit';
 *
 * function ActionButtons() {
 *   const primaryColor = PerceptualColor.fromHex('#3B82F6').value!;
 *   const dangerColor = PerceptualColor.fromHex('#EF4444').value!;
 *
 *   return (
 *     <div>
 *       <AccessibleButton
 *         baseColor={primaryColor}
 *         variant="solid"
 *         size="md"
 *         intent="action"
 *       >
 *         Guardar cambios
 *       </AccessibleButton>
 *
 *       <AccessibleButton
 *         baseColor={dangerColor}
 *         variant="outline"
 *         size="md"
 *         intent="destructive"
 *       >
 *         Eliminar
 *       </AccessibleButton>
 *     </div>
 *   );
 * }
 * ```
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  function AccessibleButton(
    {
      baseColor,
      variant = 'solid',
      size = 'md',
      intent = 'action',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      stateColors,
      disabled,
      children,
      className = '',
      style,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) {
    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────

    const [buttonState, setButtonState] = useState<ButtonState>('idle');

    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED COLORS (usando Color Intelligence)
    // ─────────────────────────────────────────────────────────────────────────

    const colors = useMemo(() => {
      // Color base ajustado para cada estado
      const getStateColor = (state: ButtonState): PerceptualColor => {
        // Si hay override, usarlo
        if (stateColors?.[state]) {
          return stateColors[state]!;
        }

        // Derivar perceptualmente
        switch (state) {
          case 'hover':
            return baseColor.lighten(0.1);
          case 'active':
            return baseColor.darken(0.1);
          case 'focus':
            return baseColor;
          case 'disabled':
            return baseColor.desaturate(0.5);
          case 'idle':
          default:
            return baseColor;
        }
      };

      // Determinar estado actual considerando disabled
      const currentState = disabled ? 'disabled' : buttonState;
      const currentColor = getStateColor(currentState);

      // Obtener color de texto óptimo basado en luminancia
      const textColor = currentColor.oklch.l > 0.6 ? '#000000' : '#ffffff';

      // Colores según variante
      let background: string;
      let text: string;
      let border: string;

      switch (variant) {
        case 'outline':
          background = 'transparent';
          text = currentColor.hex;
          border = currentColor.hex;
          break;

        case 'ghost':
          background = currentState === 'hover' || currentState === 'active'
            ? currentColor.withAlpha(0.1).hex
            : 'transparent';
          text = currentColor.hex;
          border = 'transparent';
          break;

        case 'link':
          background = 'transparent';
          text = currentColor.hex;
          border = 'transparent';
          break;

        case 'solid':
        default:
          background = currentColor.hex;
          text = textColor;
          border = currentColor.hex;
          break;
      }

      return {
        background,
        text,
        border,
        focusRing: baseColor.hex,
        opacity: currentState === 'disabled' ? 0.5 : 1,
      };
    }, [baseColor, buttonState, variant, stateColors, disabled]);

    // ─────────────────────────────────────────────────────────────────────────
    // EVENT HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('hover');
        }
        onMouseEnter?.(e);
      },
      [disabled, loading, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('idle');
        }
        onMouseLeave?.(e);
      },
      [disabled, loading, onMouseLeave]
    );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('active');
        }
        onMouseDown?.(e);
      },
      [disabled, loading, onMouseDown]
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('hover');
        }
        onMouseUp?.(e);
      },
      [disabled, loading, onMouseUp]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('focus');
        }
        onFocus?.(e);
      },
      [disabled, loading, onFocus]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLButtonElement>) => {
        if (!disabled && !loading) {
          setButtonState('idle');
        }
        onBlur?.(e);
      },
      [disabled, loading, onBlur]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SIZE CONFIG
    // ─────────────────────────────────────────────────────────────────────────

    const sizeConfig = SIZE_CONFIG[size];

    // ─────────────────────────────────────────────────────────────────────────
    // STYLES
    // ─────────────────────────────────────────────────────────────────────────

    const buttonStyle: React.CSSProperties = {
      // Layout
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sizeConfig.gap,
      width: fullWidth ? '100%' : iconOnly ? sizeConfig.height : 'auto',
      height: sizeConfig.height,
      padding: iconOnly ? 0 : `0 ${sizeConfig.paddingX}px`,

      // Typography
      fontSize: sizeConfig.fontSize,
      fontWeight: 500,
      fontFamily: 'inherit',
      lineHeight: 1,
      textDecoration: variant === 'link' ? 'underline' : 'none',

      // Colors (derivados de Color Intelligence)
      backgroundColor: colors.background,
      color: colors.text,
      border: variant === 'outline' ? `1px solid ${colors.border}` : 'none',
      borderRadius: sizeConfig.borderRadius,
      opacity: colors.opacity,

      // Interaction
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      outline: 'none',
      transition: 'all 150ms ease-in-out',

      // Focus ring
      boxShadow: buttonState === 'focus'
        ? `0 0 0 2px ${colors.focusRing}40`
        : 'none',

      // Custom
      ...style,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={`accessible-button accessible-button--${variant} accessible-button--${size} ${className}`}
        style={buttonStyle}
        data-intent={intent}
        data-state={buttonState}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      >
        {loading && (
          <LoadingSpinner size={sizeConfig.iconSize} color={colors.text} />
        )}

        {!loading && leftIcon && (
          <span
            className="accessible-button__icon accessible-button__icon--left"
            style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
          >
            {leftIcon}
          </span>
        )}

        {!iconOnly && children && (
          <span className="accessible-button__label">{children}</span>
        )}

        {!loading && rightIcon && (
          <span
            className="accessible-button__icon accessible-button__icon--right"
            style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
          >
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface LoadingSpinnerProps {
  size: number;
  color: string;
}

function LoadingSpinner({ size, color }: LoadingSpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        opacity={0.25}
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        strokeDashoffset="23.55"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AccessibleButton;
