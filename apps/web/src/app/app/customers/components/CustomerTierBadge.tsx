'use client';

/**
 * CustomerTierBadge - Tier Badge Component v1.0
 *
 * Displays customer tier with gradient styling.
 * Uses CSS variables for dynamic theming.
 *
 * Tiers:
 * - Enterprise: Purple gradient (highest)
 * - Premium: Blue gradient
 * - Standard: Gray gradient
 * - Basic: Stone gradient (lowest)
 *
 * @module components/CustomerTierBadge
 */

import * as React from 'react';
import { Crown, Star, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerTier, TIER_LABELS } from '@/lib/customers';
import { useCustomerTheme } from '../hooks';

// ============================================
// Types
// ============================================

export type TierBadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type TierBadgeVariant = 'gradient' | 'solid' | 'outline' | 'icon-only';

export interface CustomerTierBadgeProps {
  /** Customer tier */
  tier: CustomerTier;
  /** Size variant */
  size?: TierBadgeSize;
  /** Display variant */
  variant?: TierBadgeVariant;
  /** Show icon */
  showIcon?: boolean;
  /** Custom label */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Constants
// ============================================

const SIZE_CONFIG = {
  xs: {
    badge: 'px-1.5 py-0.5 text-[9px] rounded gap-0.5',
    icon: 'h-2.5 w-2.5',
    iconOnly: 'w-4 h-4 rounded',
  },
  sm: {
    badge: 'px-2 py-0.5 text-[10px] rounded-md gap-1',
    icon: 'h-3 w-3',
    iconOnly: 'w-5 h-5 rounded-md',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
    icon: 'h-3.5 w-3.5',
    iconOnly: 'w-6 h-6 rounded-lg',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm rounded-xl gap-2',
    icon: 'h-4 w-4',
    iconOnly: 'w-8 h-8 rounded-xl',
  },
};

const TIER_ICONS: Record<CustomerTier, typeof Crown> = {
  [CustomerTier.ENTERPRISE]: Crown,
  [CustomerTier.PREMIUM]: Star,
  [CustomerTier.STANDARD]: Shield,
  [CustomerTier.BASIC]: User,
};

const TIER_CLASSES: Record<CustomerTier, { solid: string; outline: string }> = {
  [CustomerTier.ENTERPRISE]: {
    solid: 'bg-[var(--tier-enterprise)] text-white border-[var(--tier-enterprise)]',
    outline: 'border-[var(--tier-enterprise-border)] text-[var(--tier-enterprise)] bg-[var(--tier-enterprise-bg)]',
  },
  [CustomerTier.PREMIUM]: {
    solid: 'bg-[var(--tier-premium)] text-white border-[var(--tier-premium)]',
    outline: 'border-[var(--tier-premium-border)] text-[var(--tier-premium)] bg-[var(--tier-premium-bg)]',
  },
  [CustomerTier.STANDARD]: {
    solid: 'bg-[var(--tier-standard)] text-white border-[var(--tier-standard)]',
    outline: 'border-[var(--tier-standard-border)] text-[var(--tier-standard)] bg-[var(--tier-standard-bg)]',
  },
  [CustomerTier.BASIC]: {
    solid: 'bg-[var(--tier-basic)] text-white border-[var(--tier-basic)]',
    outline: 'border-[var(--tier-basic-border)] text-[var(--tier-basic)] bg-[var(--tier-basic-bg)]',
  },
};

// ============================================
// Component
// ============================================

export const CustomerTierBadge = React.memo(function CustomerTierBadge({
  tier,
  size = 'md',
  variant = 'gradient',
  showIcon = true,
  label,
  className,
}: CustomerTierBadgeProps) {
  const { getTierTheme } = useCustomerTheme();
  const tierTheme = getTierTheme(tier);
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = TIER_ICONS[tier];
  const displayLabel = label || TIER_LABELS[tier];

  // Variant: Icon Only
  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          'tier-badge-premium',
          tier,
          'flex items-center justify-center',
          sizeConfig.iconOnly,
          'transition-all duration-200',
          className
        )}
        style={{
          background: tierTheme.gradient,
          color: tierTheme.text,
        }}
        title={displayLabel}
        aria-label={`Tier: ${displayLabel}`}
      >
        <Icon className={sizeConfig.icon} />
      </div>
    );
  }

  // Variant: Gradient (default)
  if (variant === 'gradient') {
    return (
      <span
        className={cn(
          'tier-badge-premium',
          tier,
          'inline-flex items-center font-semibold border',
          sizeConfig.badge,
          'transition-all duration-200',
          'shadow-sm',
          className
        )}
        style={{
          background: tierTheme.gradient,
          color: tierTheme.text,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: tierTheme.shadow,
        }}
        title={displayLabel}
        aria-label={`Tier: ${displayLabel}`}
      >
        {showIcon && <Icon className={sizeConfig.icon} />}
        <span className="tracking-wide">{displayLabel}</span>
      </span>
    );
  }

  // Variant: Solid
  if (variant === 'solid') {
    return (
      <span
        className={cn(
          'inline-flex items-center font-semibold border',
          sizeConfig.badge,
          TIER_CLASSES[tier].solid,
          'transition-all duration-200',
          className
        )}
        title={displayLabel}
        aria-label={`Tier: ${displayLabel}`}
      >
        {showIcon && <Icon className={sizeConfig.icon} />}
        <span>{displayLabel}</span>
      </span>
    );
  }

  // Variant: Outline
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border',
        sizeConfig.badge,
        TIER_CLASSES[tier].outline,
        'transition-all duration-200',
        className
      )}
      title={displayLabel}
      aria-label={`Tier: ${displayLabel}`}
    >
      {showIcon && <Icon className={sizeConfig.icon} />}
      <span>{displayLabel}</span>
    </span>
  );
});

// ============================================
// Tier Selector Component (for forms)
// ============================================

export interface TierSelectorProps {
  /** Current selected tier */
  value: CustomerTier;
  /** Change handler */
  onChange: (tier: CustomerTier) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const TierSelector = React.memo(function TierSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TierSelectorProps) {
  const tiers = [
    CustomerTier.ENTERPRISE,
    CustomerTier.PREMIUM,
    CustomerTier.STANDARD,
    CustomerTier.BASIC,
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      role="radiogroup"
      aria-label="Seleccionar tier del cliente"
    >
      {tiers.map((tier) => {
        const isSelected = value === tier;
        return (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(tier)}
            disabled={disabled}
            className={cn(
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected ? 'scale-105' : 'opacity-60 hover:opacity-100'
            )}
          >
            <CustomerTierBadge
              tier={tier}
              size="md"
              variant={isSelected ? 'gradient' : 'outline'}
            />
          </button>
        );
      })}
    </div>
  );
});

// ============================================
// Exports
// ============================================

export default CustomerTierBadge;
