'use client';

/**
 * Premium Navigation Item Component
 *
 * High-fidelity navigation item with microinteractions.
 * Designed for the premium sidebar experience.
 *
 * Features:
 * - Ripple effect on click
 * - Smooth hover animations
 * - Dynamic active indicator
 * - Badge support with animation
 * - WCAG accessible
 * - Keyboard navigation
 * - AI priority indicator
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
  /** Badge variant */
  badgeVariant?: 'default' | 'warning' | 'success' | 'destructive';
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
// Badge Component
// ============================================

function NavBadge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const variantStyles = {
    default:
      'bg-gradient-to-r from-[var(--sidebar-active-border)] to-teal-400 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-400 text-white',
    success: 'bg-gradient-to-r from-emerald-500 to-green-400 text-white',
    destructive: 'bg-gradient-to-r from-red-500 to-rose-400 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-1.5 py-0.5',
        'text-[10px] font-bold tabular-nums leading-none',
        'animate-in fade-in zoom-in-75 duration-300',
        'shadow-sm',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}

// ============================================
// Ripple Effect Component
// ============================================

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
            background: 'var(--ripple-color)',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple-expand var(--ripple-duration) ease-out forwards',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.6;
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
      {/* Active indicator bar */}
      <div
        className={cn(
          'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full',
          'transition-all duration-300',
          isActive
            ? 'scale-y-100 bg-[var(--sidebar-active-border)]'
            : 'scale-y-0 bg-transparent'
        )}
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="relative shrink-0">
        <Icon
          className={cn(
            'transition-all duration-200',
            isCollapsed ? 'h-[22px] w-[22px]' : 'h-5 w-5',
            isActive
              ? 'text-[var(--sidebar-text-accent)]'
              : 'text-[var(--sidebar-text-secondary)] group-hover:text-[var(--sidebar-text-primary)]'
          )}
        />
        {/* AI suggestion sparkle */}
        {isAISuggested && !isActive && (
          <Sparkles
            className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-amber-400"
            aria-label="Sugerido por IA"
          />
        )}
      </div>

      {/* Title (hidden when collapsed) */}
      {!isCollapsed && (
        <span
          className={cn(
            'flex-1 truncate text-[15px] font-medium transition-colors duration-200',
            isActive
              ? 'text-[var(--sidebar-text-primary)]'
              : 'text-[var(--sidebar-text-secondary)] group-hover:text-[var(--sidebar-text-primary)]'
          )}
        >
          {title}
        </span>
      )}

      {/* External link indicator */}
      {!isCollapsed && isExternal && (
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-[var(--sidebar-text-muted)]"
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
            'text-[var(--sidebar-text-primary)] backdrop-blur-xl'
          )}
        >
          <span>{title}</span>
          {isExternal && <ExternalLink className="h-3 w-3" />}
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
        'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text-secondary)]',
        'transition-colors duration-200',
        'outline-none focus-visible:text-[var(--sidebar-text-secondary)]',
        className
      )}
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
