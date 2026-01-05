'use client';

/**
 * CustomerQuickActions - Quick Action Buttons v1.0
 *
 * Provides quick access to contact actions:
 * - WhatsApp (opens wa.me link)
 * - Phone Call (opens tel: link)
 * - Email (opens mailto: link)
 *
 * Design:
 * - 44px touch targets (WCAG 2.1 AA)
 * - Dynamic theming via CSS variables
 * - Hover states with semantic colors
 *
 * @module components/CustomerQuickActions
 */

import * as React from 'react';
import { MessageCircle, Phone, Mail, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customers';

// ============================================
// Types
// ============================================

export type QuickActionSize = 'sm' | 'md' | 'lg';
export type QuickActionVariant = 'icon' | 'labeled' | 'compact';

export interface CustomerQuickActionsProps {
  /** Customer data */
  customer: Customer;
  /** Size variant */
  size?: QuickActionSize;
  /** Display variant */
  variant?: QuickActionVariant;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
  /** Click handler for analytics */
  onActionClick?: (action: 'whatsapp' | 'call' | 'email', customer: Customer) => void;
}

export interface QuickActionButtonProps {
  /** Icon component */
  icon: typeof MessageCircle;
  /** Button label */
  label: string;
  /** Action handler */
  onClick: (e: React.MouseEvent) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size: QuickActionSize;
  /** Display variant */
  variant: QuickActionVariant;
  /** Action type for styling */
  actionType: 'whatsapp' | 'call' | 'email';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Constants
// ============================================

const SIZE_CONFIG = {
  sm: {
    icon: 'w-7 h-7',
    labeled: 'px-2 py-1 text-[10px] gap-1',
    compact: 'w-7 h-7',
    iconSize: 'h-3.5 w-3.5',
  },
  md: {
    icon: 'w-9 h-9',
    labeled: 'px-3 py-1.5 text-xs gap-1.5',
    compact: 'w-9 h-9',
    iconSize: 'h-[18px] w-[18px]',
  },
  lg: {
    icon: 'w-11 h-11',
    labeled: 'px-4 py-2 text-sm gap-2',
    compact: 'w-11 h-11',
    iconSize: 'h-5 w-5',
  },
};

const ACTION_STYLES = {
  whatsapp: {
    hoverBg: 'hover:bg-[var(--action-whatsapp-bg-hover)]',
    hoverText: 'hover:text-[var(--action-whatsapp-text)]',
    hoverBorder: 'hover:border-[var(--action-whatsapp-border)]',
  },
  call: {
    hoverBg: 'hover:bg-[var(--action-call-bg-hover)]',
    hoverText: 'hover:text-[var(--action-call-text)]',
    hoverBorder: 'hover:border-[var(--action-call-border)]',
  },
  email: {
    hoverBg: 'hover:bg-[var(--action-email-bg-hover)]',
    hoverText: 'hover:text-[var(--action-email-text)]',
    hoverBorder: 'hover:border-[var(--action-email-border)]',
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Normalize phone number for WhatsApp
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    // Assume Mexico if no country code
    cleaned = cleaned.startsWith('52') || cleaned.startsWith('1')
      ? '+' + cleaned
      : '+52' + cleaned;
  }
  return cleaned;
}

/**
 * Get WhatsApp URL
 */
function getWhatsAppUrl(phone: string, message?: string): string {
  const normalizedPhone = normalizePhone(phone).replace('+', '');
  const baseUrl = `https://wa.me/${normalizedPhone}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

/**
 * Get phone URL
 */
function getPhoneUrl(phone: string): string {
  return `tel:${phone}`;
}

/**
 * Get email URL
 */
function getEmailUrl(email: string, subject?: string): string {
  const baseUrl = `mailto:${email}`;
  return subject ? `${baseUrl}?subject=${encodeURIComponent(subject)}` : baseUrl;
}

// ============================================
// Quick Action Button Component
// ============================================

const QuickActionButton = React.memo(function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  size,
  variant,
  actionType,
  className,
}: QuickActionButtonProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const actionStyle = ACTION_STYLES[actionType];

  // Variant: Icon Only
  if (variant === 'icon' || variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          'customer-action-btn',
          'flex items-center justify-center',
          variant === 'icon' ? sizeConfig.icon : sizeConfig.compact,
          'rounded-lg border border-transparent',
          'text-muted-foreground',
          'transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          !disabled && [
            'hover:scale-105 active:scale-95',
            actionStyle.hoverBg,
            actionStyle.hoverText,
            actionStyle.hoverBorder,
          ],
          disabled && 'opacity-30 cursor-not-allowed',
          className
        )}
      >
        <Icon className={sizeConfig.iconSize} />
      </button>
    );
  }

  // Variant: Labeled
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'customer-action-btn',
        'inline-flex items-center',
        sizeConfig.labeled,
        'rounded-lg border border-transparent',
        'text-muted-foreground font-medium',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        !disabled && [
          'hover:scale-105 active:scale-95',
          actionStyle.hoverBg,
          actionStyle.hoverText,
          actionStyle.hoverBorder,
        ],
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
    >
      <Icon className={sizeConfig.iconSize} />
      <span>{label}</span>
    </button>
  );
});

// ============================================
// Main Component
// ============================================

export const CustomerQuickActions = React.memo(function CustomerQuickActions({
  customer,
  size = 'md',
  variant = 'icon',
  orientation = 'horizontal',
  className,
  onActionClick,
}: CustomerQuickActionsProps) {
  const hasPhone = !!customer.phone?.trim();
  const hasEmail = !!customer.email?.trim();

  // Handlers
  const handleWhatsApp = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPhone) {
      window.open(getWhatsAppUrl(customer.phone!), '_blank');
      onActionClick?.('whatsapp', customer);
    }
  }, [customer, hasPhone, onActionClick]);

  const handleCall = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPhone) {
      window.location.href = getPhoneUrl(customer.phone!);
      onActionClick?.('call', customer);
    }
  }, [customer, hasPhone, onActionClick]);

  const handleEmail = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasEmail) {
      window.location.href = getEmailUrl(customer.email, `Seguimiento - ${customer.companyName}`);
      onActionClick?.('email', customer);
    }
  }, [customer, hasEmail, onActionClick]);

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row gap-1' : 'flex-col gap-1',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <QuickActionButton
        icon={MessageCircle}
        label="WhatsApp"
        onClick={handleWhatsApp}
        disabled={!hasPhone}
        size={size}
        variant={variant}
        actionType="whatsapp"
      />
      <QuickActionButton
        icon={Phone}
        label="Llamar"
        onClick={handleCall}
        disabled={!hasPhone}
        size={size}
        variant={variant}
        actionType="call"
      />
      <QuickActionButton
        icon={Mail}
        label="Email"
        onClick={handleEmail}
        disabled={!hasEmail}
        size={size}
        variant={variant}
        actionType="email"
      />
    </div>
  );
});

// ============================================
// Website Action Button (Standalone)
// ============================================

export interface WebsiteButtonProps {
  /** Website URL */
  url: string;
  /** Size variant */
  size?: QuickActionSize;
  /** Variant */
  variant?: QuickActionVariant;
  /** Additional CSS classes */
  className?: string;
}

export const WebsiteButton = React.memo(function WebsiteButton({
  url,
  size = 'md',
  variant = 'icon',
  className,
}: WebsiteButtonProps) {
  const sizeConfig = SIZE_CONFIG[size];

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }, [url]);

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Visitar sitio web"
        className={cn(
          'customer-action-btn',
          'inline-flex items-center',
          sizeConfig.labeled,
          'rounded-lg border border-transparent',
          'text-muted-foreground font-medium',
          'transition-all duration-150',
          'hover:scale-105 active:scale-95',
          'hover:bg-muted hover:text-foreground',
          className
        )}
      >
        <ExternalLink className={sizeConfig.iconSize} />
        <span>Web</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Visitar sitio web"
      title="Visitar sitio web"
      className={cn(
        'customer-action-btn',
        'flex items-center justify-center',
        sizeConfig.icon,
        'rounded-lg border border-transparent',
        'text-muted-foreground',
        'transition-all duration-150',
        'hover:scale-105 active:scale-95',
        'hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <ExternalLink className={sizeConfig.iconSize} />
    </button>
  );
});

// ============================================
// Exports
// ============================================

export default CustomerQuickActions;
