'use client';

/**
 * QuickActionsBar Component - Premium 2025 Redesign
 *
 * One-click communication actions for leads.
 * Prioritizes WhatsApp for the LATAM market.
 * Features premium hover effects and glow states.
 *
 * Actions: WhatsApp (primary), Call, Email
 */

import * as React from 'react';
import { MessageCircle, Phone, Mail, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/leads';

// ============================================
// Types
// ============================================

export type QuickActionType = 'whatsapp' | 'call' | 'email';

export interface QuickActionsBarProps {
  /** Lead data with phone and email */
  lead: Pick<Lead, 'phone' | 'email' | 'fullName'>;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Layout variant */
  variant?: 'inline' | 'stacked' | 'icons-only';
  /** Callback when action is triggered */
  onAction?: (action: QuickActionType, lead: Pick<Lead, 'phone' | 'email' | 'fullName'>) => void;
  /** Show tooltips */
  showTooltips?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Stop event propagation (useful in cards) */
  stopPropagation?: boolean;
}

// ============================================
// Helpers
// ============================================

/**
 * Normalize phone number for WhatsApp
 * Removes spaces, dashes, parentheses
 * Ensures country code is present
 */
function normalizePhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with 0, assume local (Mexico) and add country code
  if (cleaned.startsWith('0')) {
    cleaned = '52' + cleaned.substring(1);
  }

  // If doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    // If starts with country code, just add +
    if (cleaned.startsWith('52') || cleaned.startsWith('1') || cleaned.startsWith('57')) {
      cleaned = '+' + cleaned;
    } else {
      // Assume Mexico
      cleaned = '+52' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Generate WhatsApp wa.me link
 */
function getWhatsAppUrl(phone: string, message?: string): string {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  // Remove + for wa.me URL
  const phoneNumber = normalizedPhone.replace('+', '');
  let url = `https://wa.me/${phoneNumber}`;

  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }

  return url;
}

// Size configurations
const sizeConfig = {
  sm: {
    button: 'h-7 w-7',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1',
  },
  md: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
};

// ============================================
// Action Button Component
// ============================================

interface ActionButtonProps {
  action: QuickActionType;
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
  size: 'sm' | 'md';
  showTooltip: boolean;
  variant: 'inline' | 'stacked' | 'icons-only';
}

function ActionButton({
  action,
  disabled,
  onClick,
  size,
  showTooltip,
  variant,
}: ActionButtonProps) {
  const sizes = sizeConfig[size];

  const config: Record<QuickActionType, {
    icon: typeof MessageCircle;
    label: string;
    tooltip: string;
    baseClass: string;
    activeClass: string;
  }> = {
    whatsapp: {
      icon: MessageCircle,
      label: 'WhatsApp',
      tooltip: 'Enviar WhatsApp',
      baseClass: 'quick-action-btn whatsapp',
      activeClass: 'bg-[#25D366] text-white border-[#25D366] shadow-lg shadow-[#25D366]/30',
    },
    call: {
      icon: Phone,
      label: 'Llamar',
      tooltip: 'Hacer llamada',
      baseClass: 'quick-action-btn',
      activeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    },
    email: {
      icon: Mail,
      label: 'Email',
      tooltip: 'Enviar correo',
      baseClass: 'quick-action-btn',
      activeClass: 'bg-muted text-muted-foreground border-border/50',
    },
  };

  const { icon: Icon, label, tooltip, baseClass, activeClass } = config[action];

  const button = (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        sizes.button,
        // Premium styling
        'rounded-xl border',
        'transition-all duration-200',
        // Apply base class for animations
        baseClass,
        // Active styling when enabled
        !disabled && activeClass,
        // Special WhatsApp styling
        action === 'whatsapp' && !disabled && [
          'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/30',
          'hover:bg-[#25D366] hover:text-white hover:border-[#25D366]',
          'hover:shadow-lg hover:shadow-[#25D366]/30',
        ],
        // Disabled state
        disabled && 'opacity-30 cursor-not-allowed hover:scale-100 hover:bg-transparent'
      )}
      aria-label={tooltip}
    >
      <Icon className={cn(sizes.icon, 'transition-transform duration-200')} />
    </Button>
  );

  if (showTooltip && !disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ============================================
// Main Component
// ============================================

export function QuickActionsBar({
  lead,
  size = 'md',
  variant = 'inline',
  onAction,
  showTooltips = true,
  className,
  stopPropagation = true,
}: QuickActionsBarProps) {
  const sizes = sizeConfig[size];
  const hasPhone = !!lead.phone?.trim();
  const hasEmail = !!lead.email?.trim();

  const handleAction = React.useCallback(
    (action: QuickActionType, e: React.MouseEvent) => {
      if (stopPropagation) {
        e.stopPropagation();
        e.preventDefault();
      }

      // Trigger callback
      onAction?.(action, lead);

      // Execute action
      switch (action) {
        case 'whatsapp':
          if (hasPhone) {
            window.open(getWhatsAppUrl(lead.phone!), '_blank', 'noopener,noreferrer');
          }
          break;
        case 'call':
          if (hasPhone) {
            window.location.href = `tel:${lead.phone}`;
          }
          break;
        case 'email':
          if (hasEmail) {
            window.location.href = `mailto:${lead.email}`;
          }
          break;
      }
    },
    [lead, hasPhone, hasEmail, onAction, stopPropagation]
  );

  // Icons-only variant for compact displays
  if (variant === 'icons-only') {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={cn('flex items-center', sizes.gap, className)}>
          <ActionButton
            action="whatsapp"
            disabled={!hasPhone}
            onClick={(e) => handleAction('whatsapp', e)}
            size={size}
            showTooltip={showTooltips}
            variant={variant}
          />
          <ActionButton
            action="call"
            disabled={!hasPhone}
            onClick={(e) => handleAction('call', e)}
            size={size}
            showTooltip={showTooltips}
            variant={variant}
          />
          <ActionButton
            action="email"
            disabled={!hasEmail}
            onClick={(e) => handleAction('email', e)}
            size={size}
            showTooltip={showTooltips}
            variant={variant}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Stacked variant for preview panels
  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* WhatsApp - Primary */}
        <Button
          disabled={!hasPhone}
          onClick={(e) => handleAction('whatsapp', e)}
          className={cn(
            'w-full whatsapp-button',
            'shadow-sm shadow-[var(--whatsapp)]/20',
            !hasPhone && 'opacity-40 cursor-not-allowed'
          )}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>

        {/* Call & Email */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPhone}
            onClick={(e) => handleAction('call', e)}
            className="flex-1"
          >
            <Phone className="mr-2 h-4 w-4" />
            Llamar
          </Button>
          <Button
            variant="outline"
            disabled={!hasEmail}
            onClick={(e) => handleAction('email', e)}
            className="flex-1"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center', sizes.gap, className)}>
        <ActionButton
          action="whatsapp"
          disabled={!hasPhone}
          onClick={(e) => handleAction('whatsapp', e)}
          size={size}
          showTooltip={showTooltips}
          variant={variant}
        />
        <ActionButton
          action="call"
          disabled={!hasPhone}
          onClick={(e) => handleAction('call', e)}
          size={size}
          showTooltip={showTooltips}
          variant={variant}
        />
        <ActionButton
          action="email"
          disabled={!hasEmail}
          onClick={(e) => handleAction('email', e)}
          size={size}
          showTooltip={showTooltips}
          variant={variant}
        />
      </div>
    </TooltipProvider>
  );
}

// ============================================
// Quick Actions Dropdown (for menus)
// ============================================

export interface QuickActionsDropdownProps {
  lead: Pick<Lead, 'phone' | 'email' | 'fullName'>;
  onAction?: (action: QuickActionType, lead: Pick<Lead, 'phone' | 'email' | 'fullName'>) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function QuickActionsDropdown({
  lead,
  onAction,
  trigger,
  className,
}: QuickActionsDropdownProps) {
  const hasPhone = !!lead.phone?.trim();
  const hasEmail = !!lead.email?.trim();

  const handleAction = (action: QuickActionType) => {
    onAction?.(action, lead);

    switch (action) {
      case 'whatsapp':
        if (hasPhone) {
          window.open(getWhatsAppUrl(lead.phone!), '_blank', 'noopener,noreferrer');
        }
        break;
      case 'call':
        if (hasPhone) {
          window.location.href = `tel:${lead.phone}`;
        }
        break;
      case 'email':
        if (hasEmail) {
          window.location.href = `mailto:${lead.email}`;
        }
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className={className}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          disabled={!hasPhone}
          onClick={() => handleAction('whatsapp')}
          className="whatsapp-text"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasPhone}
          onClick={() => handleAction('call')}
        >
          <Phone className="mr-2 h-4 w-4" />
          Llamar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasEmail}
          onClick={() => handleAction('email')}
        >
          <Mail className="mr-2 h-4 w-4" />
          Enviar Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
