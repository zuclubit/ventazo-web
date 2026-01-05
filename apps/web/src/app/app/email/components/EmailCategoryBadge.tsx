'use client';

/**
 * EmailCategoryBadge Component
 *
 * Colored category badge for email categorization.
 * Supports predefined and custom categories with dynamic colors.
 *
 * Categories:
 * - Design (blue)
 * - Product (pink/magenta)
 * - Management (orange)
 * - Newsletter (gray)
 * - Custom categories with tenant colors
 *
 * v2.0 - Color Intelligence Integration
 * - OKLCH-based alpha blending for perceptually uniform colors
 * - Automatic contrast validation for custom colors
 * - Memoized color calculations for performance
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { getColorCache, detectContrastModeQuick } from '@/lib/color-intelligence';

// ============================================
// Types
// ============================================

export type EmailCategoryType =
  | 'design'
  | 'product'
  | 'management'
  | 'newsletter'
  | 'marketing'
  | 'sales'
  | 'support'
  | 'personal'
  | 'custom';

export interface EmailCategoryBadgeProps {
  /** Category type */
  category: EmailCategoryType;
  /** Category label (for custom categories) */
  label?: string;
  /** Custom color (for custom categories) */
  customColor?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Category Configuration
// ============================================

interface CategoryConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const CATEGORY_CONFIG: Record<EmailCategoryType, CategoryConfig> = {
  design: {
    label: 'Diseño',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#3B82F6',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  product: {
    label: 'Producto',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    textColor: '#EC4899',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  management: {
    label: 'Gestión',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    textColor: '#F97316',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  newsletter: {
    label: 'Newsletter',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    textColor: '#9CA3AF',
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  marketing: {
    label: 'Marketing',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    textColor: '#A855F7',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  sales: {
    label: 'Ventas',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#22C55E',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  support: {
    label: 'Soporte',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    textColor: '#EAB308',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  personal: {
    label: 'Personal',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    textColor: '#6366F1',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  custom: {
    label: 'Otro',
    bgColor: 'var(--tenant-primary-lighter)',
    textColor: 'var(--tenant-primary)',
    borderColor: 'var(--tenant-primary-light)',
  },
};

// ============================================
// Color Intelligence Utilities
// ============================================

/**
 * Generate OKLCH-based styles for custom colors
 * Uses perceptually uniform color space for accurate alpha blending
 */
function getColorIntelligenceStyles(hex: string): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const cache = getColorCache();
  const oklch = cache.getOklch(hex);

  if (oklch) {
    // Use OKLCH for perceptually uniform alpha blending
    const bgAlpha = 0.15;
    const borderAlpha = 0.30;

    // Determine if we need to adjust text color for contrast
    const mode = detectContrastModeQuick(hex);
    const textColor = mode === 'light-content'
      ? oklch.lighten(0.1).toHex()
      : hex;

    return {
      backgroundColor: `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / ${bgAlpha})`,
      color: textColor,
      borderColor: `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / ${borderAlpha})`,
    };
  }

  // Fallback to hex with alpha
  return {
    backgroundColor: `${hex}26`,
    color: hex,
    borderColor: `${hex}4D`,
  };
}

// ============================================
// Component
// ============================================

export function EmailCategoryBadge({
  category,
  label,
  customColor,
  size = 'sm',
  className,
}: EmailCategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;
  const displayLabel = label || config.label;

  // Memoize custom color styles using Color Intelligence
  const customStyles = React.useMemo(() => {
    if (!customColor) return null;
    return getColorIntelligenceStyles(customColor);
  }, [customColor]);

  // Use custom color styles or predefined config
  const styles = customStyles ?? {
    backgroundColor: config.bgColor,
    color: config.textColor,
    borderColor: config.borderColor,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'font-medium rounded-full',
        'border',
        'transition-colors duration-150',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        className
      )}
      style={styles}
    >
      {displayLabel}
    </span>
  );
}

// ============================================
// Utility: Parse category from email labels
// ============================================

export function parseCategoryFromLabels(labels: string[]): EmailCategoryType | null {
  const labelLower = labels.map((l) => l.toLowerCase());

  if (labelLower.some((l) => l.includes('design') || l.includes('diseño'))) {
    return 'design';
  }
  if (labelLower.some((l) => l.includes('product') || l.includes('producto'))) {
    return 'product';
  }
  if (labelLower.some((l) => l.includes('management') || l.includes('gestión'))) {
    return 'management';
  }
  if (labelLower.some((l) => l.includes('newsletter') || l.includes('boletín'))) {
    return 'newsletter';
  }
  if (labelLower.some((l) => l.includes('marketing'))) {
    return 'marketing';
  }
  if (labelLower.some((l) => l.includes('sales') || l.includes('ventas'))) {
    return 'sales';
  }
  if (labelLower.some((l) => l.includes('support') || l.includes('soporte'))) {
    return 'support';
  }
  if (labelLower.some((l) => l.includes('personal'))) {
    return 'personal';
  }

  return null;
}

export default EmailCategoryBadge;
