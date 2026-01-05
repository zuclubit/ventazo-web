'use client';

/**
 * Premium Navigation Item Component
 *
 * High-fidelity navigation item with microinteractions.
 * Designed for the premium sidebar experience.
 *
 * Features:
 * - Ripple effect on click (Color Intelligence brand-tinted)
 * - Smooth hover animations with HCT tonal transitions
 * - Dynamic active indicator with brand glow
 * - Badge support with HCT semantic gradients
 * - WCAG 3.0 (APCA) accessible text/icon colors with Governance
 * - Keyboard navigation with focus ring
 * - AI priority indicator (Sparkles)
 *
 * v2.2 - Governance Layer Integration (Phase 4-5)
 *
 * Color Intelligence Features:
 * - HCT tonal palettes: Material Design 3 style navigation states
 * - APCA contrast validation: WCAG 3.0 for all text/icon colors
 * - Semantic badge colors: HCT-derived gradients for warning/success/etc
 * - OKLCH ripple effects: Perceptually uniform brand-tinted ripples
 * - CSS variable injection: Auto-applied via useSidebarCSSVariables
 *
 * NEW in v2.2 - Governance Layer:
 * - Governed CSS variables with APCA auto-remediation
 * - Silver minimum (Lc≥60), Gold for active (Lc≥75)
 * - Cascading fallbacks: --sidebar-gov-* → --sidebar-ci-* → hardcoded
 *
 * CSS Variables Cascade (highest priority first):
 * 1. --sidebar-gov-*: APCA-guaranteed governed colors (auto-remediated)
 * 2. --sidebar-ci-*: Color Intelligence derived colors
 * 3. Hardcoded fallbacks: Final safety net
 *
 * Governed Variables (injected by useSidebarGovernanceCSSVars):
 * - --sidebar-gov-text: Body text (Silver Lc≥60)
 * - --sidebar-gov-icon: Icon color (Silver Lc≥60)
 * - --sidebar-gov-active-text: Active nav text (Gold Lc≥75)
 * - --sidebar-gov-hover-text: Hover state text (Silver Lc≥60)
 * - --sidebar-gov-muted-text: De-emphasized text (Bronze Lc≥45)
 *
 * @module components/layout/nav-item-premium
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ExternalLink, Sparkles } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSidebarColorIntelligence } from './hooks';

// ============================================
// Types
// ============================================

export interface NavItemProps {
  /** Navigation title */
  title: string;
  /** Navigation href */
  href: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Optional badge text (e.g., count) */
  badge?: string | number;
  /** Badge variant - uses Color Intelligence HCT-derived colors */
  badgeVariant?: 'default' | 'warning' | 'success' | 'destructive' | 'info';
  /** Is external link */
  isExternal?: boolean;
  /** Exact match for active state */
  exactMatch?: boolean;
  /** Is collapsed mode */
  isCollapsed?: boolean;
  /** Is AI suggested (high priority) */
  isAISuggested?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** On click callback */
  onClick?: () => void;
  /** Custom className */
  className?: string;
}

// ============================================
// Ripple Hook
// ============================================

function useRipple() {
  const [ripples, setRipples] = React.useState<
    Array<{ x: number; y: number; id: number }>
  >([]);

  const addRipple = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { x, y, id }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    []
  );

  return { ripples, addRipple };
}

// ============================================
// Active State Detection
// ============================================

function isNavItemActive(
  pathname: string,
  href: string,
  exactMatch?: boolean
): boolean {
  if (href.startsWith('http')) return false;
  if (exactMatch) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ============================================
// Badge Component - Color Intelligence Enhanced
// ============================================

/**
 * NavBadge with Color Intelligence
 *
 * Uses HCT-generated semantic gradients with APCA-validated text colors.
 * CSS variables are injected by useSidebarCSSVariables hook at sidebar root.
 *
 * Variants:
 * - default: Brand gradient (primary → accent)
 * - warning: Amber/Orange HCT gradient
 * - success: Green HCT gradient
 * - destructive: Red HCT gradient
 * - info: Blue HCT gradient (new)
 */
function NavBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'destructive' | 'info';
}) {
  // Badge variant type matching the component props
  type BadgeVariant = 'default' | 'warning' | 'success' | 'destructive' | 'info';

  // Color Intelligence CSS variable mappings
  // These use HCT tonal palettes with APCA-validated text colors
  const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
    default: {
      background: 'var(--sidebar-ci-badge-default, linear-gradient(135deg, var(--sidebar-active-border), var(--tenant-accent-color, #22D3EE)))',
      color: 'var(--sidebar-ci-badge-default-text, white)',
    },
    warning: {
      background: 'var(--sidebar-ci-badge-warning, linear-gradient(135deg, #F59E0B, #FB923C))',
      color: 'var(--sidebar-ci-badge-warning-text, white)',
    },
    success: {
      background: 'var(--sidebar-ci-badge-success, linear-gradient(135deg, #10B981, #34D399))',
      color: 'var(--sidebar-ci-badge-success-text, white)',
    },
    destructive: {
      background: 'var(--sidebar-ci-badge-destructive, linear-gradient(135deg, #EF4444, #F87171))',
      color: 'var(--sidebar-ci-badge-destructive-text, white)',
    },
    info: {
      background: 'var(--sidebar-ci-badge-info, linear-gradient(135deg, #3B82F6, #60A5FA))',
      color: 'var(--sidebar-ci-badge-info-text, white)',
    },
  };

  // Get styles - since variant is typed as BadgeVariant, this is always valid
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-1.5 py-0.5',
        'text-[10px] font-bold tabular-nums leading-none',
        'animate-in fade-in zoom-in-75 duration-300',
        // HCT-generated shadow with brand tint
        'shadow-[0_1px_3px_var(--sidebar-ci-ripple,rgba(0,0,0,0.2))]'
      )}
      style={{
        background: styles.background,
        color: styles.color,
      }}
    >
      {children}
    </span>
  );
}

// ============================================
// Ripple Effect Component - Color Intelligence Enhanced
// ============================================

/**
 * RippleEffect with Color Intelligence
 *
 * Uses brand-derived ripple color from HCT tonal palette.
 * The --sidebar-ci-ripple variable is generated with optimal
 * opacity based on sidebar contrast mode analysis.
 *
 * Features:
 * - OKLCH interpolation for smooth expansion
 * - Brand-tinted ripple effect
 * - Adaptive opacity based on light/dark content mode
 */
function RippleEffect({
  ripples,
}: {
  ripples: Array<{ x: number; y: number; id: number }>;
}) {
  return (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            // Color Intelligence: Uses HCT-derived brand color with adaptive opacity
            background: 'var(--sidebar-ci-ripple, var(--ripple-color, rgba(255,255,255,0.2)))',
            transform: 'translate(-50%, -50%)',
            animation: 'ci-ripple-expand 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ci-ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.7;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

// ============================================
// Main Component
// ============================================

export function NavItemPremium({
  title,
  href,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  isExternal = false,
  exactMatch = false,
  isCollapsed = false,
  isAISuggested = false,
  disabled = false,
  onClick,
  className,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, href, exactMatch);
  const { ripples, addRipple } = useRipple();

  // Link props
  const LinkComponent = isExternal ? 'a' : Link;
  const linkProps = isExternal
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };

  // Handle click with ripple
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    addRipple(e);
    onClick?.();
  };

  // Item content
  const itemContent = (
    <div
      className={cn(
        // Base styles
        'group relative flex items-center overflow-hidden rounded-xl',
        'transition-all duration-200',
        // Height and padding
        isCollapsed
          ? 'h-11 w-11 justify-center'
          : 'h-11 w-full gap-3 px-3',
        // States
        isActive
          ? [
              'bg-[var(--sidebar-active-bg)]',
              'shadow-[var(--sidebar-item-shadow-active)]',
            ]
          : [
              'hover:bg-[var(--sidebar-hover-bg)]',
              'hover:shadow-[var(--sidebar-item-shadow)]',
            ],
        // Disabled
        disabled && 'pointer-events-none opacity-40',
        className
      )}
      onClick={handleClick}
    >
      {/* Active indicator bar - Color Intelligence Enhanced */}
      <div
        className={cn(
          'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full',
          'transition-all duration-300',
          isActive
            ? 'scale-y-100'
            : 'scale-y-0 bg-transparent'
        )}
        style={isActive ? {
          // Color Intelligence: Uses HCT-derived brand color with glow
          backgroundColor: 'var(--sidebar-ci-active-border, var(--sidebar-active-border))',
          boxShadow: 'var(--sidebar-ci-indicator-glow, 0 0 8px var(--sidebar-active-border))',
        } : undefined}
        aria-hidden="true"
      />

      {/* Icon - Governance Enhanced (WCAG 3.0 APCA) */}
      <div
        className="relative shrink-0"
        style={{
          // Governance Layer: APCA-guaranteed colors with auto-remediation
          // Active: Gold tier (Lc≥75) | Inactive: Silver tier (Lc≥60)
          // Cascade: gov → ci → design token → hardcoded
          color: isActive
            ? 'var(--sidebar-gov-active-text, var(--sidebar-ci-active-text, var(--sidebar-text-accent)))'
            : 'var(--sidebar-gov-icon, var(--sidebar-ci-icon, var(--sidebar-text-secondary)))',
        }}
      >
        <Icon
          className={cn(
            'transition-all duration-200',
            isCollapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5'
          )}
        />
        {/* AI suggestion sparkle - uses accent highlight */}
        {isAISuggested && !isActive && (
          <Sparkles
            className="absolute -right-1 -top-1 h-3 w-3 animate-pulse"
            style={{
              color: 'var(--sidebar-ci-accent-highlight, #FBBF24)',
            }}
            aria-label="Sugerido por IA"
          />
        )}
      </div>

      {/* Title (hidden when collapsed) - Governance Enhanced */}
      {!isCollapsed && (
        <span
          className="flex-1 truncate text-[15px] font-medium transition-colors duration-200"
          style={{
            // Governance Layer: APCA-guaranteed text colors
            // Active: Gold tier (Lc≥75) for emphasis | Body: Silver tier (Lc≥60)
            // Cascade: gov → ci → design token → hardcoded
            color: isActive
              ? 'var(--sidebar-gov-active-text, var(--sidebar-ci-active-text, var(--sidebar-text-primary)))'
              : 'var(--sidebar-gov-text, var(--sidebar-ci-text, var(--sidebar-text-secondary)))',
          }}
        >
          {title}
        </span>
      )}

      {/* External link indicator - Governance Enhanced */}
      {!isCollapsed && isExternal && (
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0"
          style={{
            // Governance Layer: Muted text uses Bronze tier (Lc≥45) minimum
            color: 'var(--sidebar-gov-muted-text, var(--sidebar-text-muted))',
          }}
          aria-hidden="true"
        />
      )}

      {/* Badge */}
      {!isCollapsed && badge !== undefined && (
        <NavBadge variant={badgeVariant}>{badge}</NavBadge>
      )}

      {/* Ripple container */}
      <RippleEffect ripples={ripples} />
    </div>
  );

  // Collapsed mode with tooltip
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <LinkComponent
            {...linkProps}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-xl"
            aria-current={isActive ? 'page' : undefined}
          >
            {itemContent}
          </LinkComponent>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className={cn(
            'flex items-center gap-2',
            'border-[var(--sidebar-divider)] bg-[var(--sidebar-glass-bg)]',
            'backdrop-blur-xl'
          )}
          style={{
            // Governance Layer: Tooltip text uses governed body text (Silver Lc≥60)
            color: 'var(--sidebar-gov-text, var(--sidebar-text-primary))',
          }}
        >
          <span>{title}</span>
          {isExternal && (
            <ExternalLink
              className="h-3 w-3"
              style={{
                color: 'var(--sidebar-gov-muted-text, var(--sidebar-text-muted))',
              }}
            />
          )}
          {badge !== undefined && (
            <NavBadge variant={badgeVariant}>{badge}</NavBadge>
          )}
          {isAISuggested && (
            <Sparkles className="h-3 w-3 text-amber-400" />
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded mode
  return (
    <LinkComponent
      {...linkProps}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-xl"
      aria-current={isActive ? 'page' : undefined}
    >
      {itemContent}
    </LinkComponent>
  );
}

NavItemPremium.displayName = 'NavItemPremium';

// ============================================
// Section Header Component
// ============================================

export interface NavSectionHeaderProps {
  title: string;
  isCollapsed?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * NavSectionHeader - Governance Enhanced
 *
 * Section headers use governed muted text (Bronze tier minimum, Lc≥45)
 * with hover states using governed hover text (Silver tier, Lc≥60).
 */
export function NavSectionHeader({
  title,
  isCollapsed = false,
  isOpen = true,
  onToggle,
  className,
}: NavSectionHeaderProps) {
  if (isCollapsed) {
    return (
      <div
        className="mx-auto my-2 h-px w-6 bg-[var(--sidebar-divider)]"
        role="separator"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between px-3 py-2',
        'text-[11px] font-semibold uppercase tracking-widest',
        'transition-colors duration-200',
        'outline-none',
        className
      )}
      style={{
        // Governance Layer: Section headers use Bronze tier muted text
        // Hover/focus transitions to Silver tier for visibility
        // @ts-expect-error CSS custom properties with fallbacks
        '--section-base': 'var(--sidebar-gov-muted-text, var(--sidebar-text-muted))',
        '--section-hover': 'var(--sidebar-gov-hover-text, var(--sidebar-text-secondary))',
        color: 'var(--section-base)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--section-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--section-base)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.color = 'var(--section-hover)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.color = 'var(--section-base)';
      }}
      aria-expanded={isOpen}
    >
      <span>{title}</span>
      <svg
        className={cn(
          'h-3 w-3 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}

NavSectionHeader.displayName = 'NavSectionHeader';
