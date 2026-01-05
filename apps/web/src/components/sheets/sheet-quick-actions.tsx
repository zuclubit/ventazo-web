'use client';

/**
 * SheetQuickActions - Quick Action Bar Component (v1.0)
 *
 * Reusable quick action bar for sheet/modal panels.
 * Provides one-click actions like email, phone, WhatsApp, etc.
 *
 * Features:
 * - Icon-only or labeled variants
 * - Theme-aware hover effects
 * - Disabled state handling
 * - WhatsApp integration
 * - Phone/email links
 *
 * @version 1.0.0
 * @module components/sheets/sheet-quick-actions
 */

import * as React from 'react';
import {
  Mail,
  Phone,
  MessageCircle,
  Globe,
  Calendar,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface QuickAction {
  /** Unique key */
  key: string;
  /** Icon component */
  icon: LucideIcon;
  /** Label text */
  label: string;
  /** Tooltip text (defaults to label) */
  tooltip?: string;
  /** Click handler */
  onClick?: () => void;
  /** href for link actions */
  href?: string;
  /** Open in new tab */
  external?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom hover color class */
  hoverColor?: string;
}

export interface SheetQuickActionsProps {
  /** Array of quick actions */
  actions?: QuickAction[];
  /** Email address (auto-creates email action) */
  email?: string | null;
  /** Phone number (auto-creates call action) */
  phone?: string | null;
  /** WhatsApp number (auto-creates WhatsApp action) */
  whatsapp?: string | null;
  /** Website URL (auto-creates website action) */
  website?: string | null;
  /** Show labels or icons only */
  variant?: 'icons-only' | 'labeled';
  /** Additional className */
  className?: string;
  /** Justify content */
  justify?: 'start' | 'center' | 'between' | 'around';
}

// ============================================
// Helpers
// ============================================

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned =
      cleaned.startsWith('52') || cleaned.startsWith('1')
        ? '+' + cleaned
        : '+52' + cleaned;
  }
  return cleaned;
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

// ============================================
// Action Button Component
// ============================================

interface ActionButtonProps {
  action: QuickAction;
  variant: 'icons-only' | 'labeled';
}

function ActionButton({ action, variant }: ActionButtonProps) {
  const Icon = action.icon;
  const isIconsOnly = variant === 'icons-only';

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (action.disabled) {
        e.preventDefault();
        return;
      }

      if (action.href) {
        if (action.external) {
          window.open(action.href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = action.href;
        }
      } else if (action.onClick) {
        action.onClick();
      }
    },
    [action]
  );

  const buttonContent = (
    <Button
      type="button"
      variant="ghost"
      size={isIconsOnly ? 'icon' : 'sm'}
      onClick={handleClick}
      disabled={action.disabled}
      className={cn(
        'transition-colors',
        isIconsOnly ? 'h-9 w-9' : 'h-9 gap-1.5',
        action.disabled && 'opacity-50 cursor-not-allowed',
        !action.disabled && action.hoverColor,
        !action.disabled &&
          !action.hoverColor && [
            'hover:bg-muted',
            'dark:hover:bg-slate-800',
          ]
      )}
    >
      <Icon className="h-4 w-4" />
      {!isIconsOnly && (
        <span className="text-xs font-medium">{action.label}</span>
      )}
    </Button>
  );

  if (isIconsOnly) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {action.tooltip || action.label}
            {action.disabled && ' (no disponible)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}

// ============================================
// Component
// ============================================

export function SheetQuickActions({
  actions: customActions,
  email,
  phone,
  whatsapp,
  website,
  variant = 'icons-only',
  className,
  justify = 'start',
}: SheetQuickActionsProps) {
  // Build actions from props
  const actions = React.useMemo(() => {
    if (customActions) return customActions;

    const builtActions: QuickAction[] = [];

    // Email action
    if (email !== undefined) {
      builtActions.push({
        key: 'email',
        icon: Mail,
        label: 'Email',
        tooltip: email || 'Sin email',
        href: email ? `mailto:${email}` : undefined,
        disabled: !email,
        hoverColor: 'hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400',
      });
    }

    // Phone action
    if (phone !== undefined) {
      builtActions.push({
        key: 'phone',
        icon: Phone,
        label: 'Llamar',
        tooltip: phone || 'Sin teléfono',
        href: phone ? `tel:${phone}` : undefined,
        disabled: !phone,
        hoverColor: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
      });
    }

    // WhatsApp action
    if (whatsapp !== undefined) {
      const normalizedWhatsapp = whatsapp ? normalizePhone(whatsapp) : null;
      builtActions.push({
        key: 'whatsapp',
        icon: MessageCircle,
        label: 'WhatsApp',
        tooltip: whatsapp || 'Sin WhatsApp',
        href: normalizedWhatsapp
          ? `https://wa.me/${normalizedWhatsapp.replace('+', '')}`
          : undefined,
        external: true,
        disabled: !whatsapp,
        hoverColor: 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400',
      });
    }

    // Website action
    if (website !== undefined) {
      builtActions.push({
        key: 'website',
        icon: Globe,
        label: 'Web',
        tooltip: website || 'Sin sitio web',
        href: website ? normalizeUrl(website) : undefined,
        external: true,
        disabled: !website,
        hoverColor: 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400',
      });
    }

    return builtActions;
  }, [customActions, email, phone, whatsapp, website]);

  if (actions.length === 0) return null;

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2',
        'bg-muted/30 border-b border-border/40',
        justifyClasses[justify],
        className
      )}
    >
      {actions.map((action) => (
        <ActionButton key={action.key} action={action} variant={variant} />
      ))}
    </div>
  );
}

// ============================================
// Pre-built Action Creators
// ============================================

export function createEmailAction(email: string | null): QuickAction {
  return {
    key: 'email',
    icon: Mail,
    label: 'Email',
    tooltip: email || 'Sin email',
    href: email ? `mailto:${email}` : undefined,
    disabled: !email,
    hoverColor: 'hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400',
  };
}

export function createPhoneAction(phone: string | null): QuickAction {
  return {
    key: 'phone',
    icon: Phone,
    label: 'Llamar',
    tooltip: phone || 'Sin teléfono',
    href: phone ? `tel:${phone}` : undefined,
    disabled: !phone,
    hoverColor: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
  };
}

export function createWhatsAppAction(phone: string | null): QuickAction {
  const normalized = phone ? normalizePhone(phone) : null;
  return {
    key: 'whatsapp',
    icon: MessageCircle,
    label: 'WhatsApp',
    tooltip: phone || 'Sin WhatsApp',
    href: normalized
      ? `https://wa.me/${normalized.replace('+', '')}`
      : undefined,
    external: true,
    disabled: !phone,
    hoverColor: 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400',
  };
}

export function createWebsiteAction(url: string | null): QuickAction {
  return {
    key: 'website',
    icon: Globe,
    label: 'Web',
    tooltip: url || 'Sin sitio web',
    href: url ? normalizeUrl(url) : undefined,
    external: true,
    disabled: !url,
    hoverColor: 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400',
  };
}

export function createCalendarAction(onClick: () => void): QuickAction {
  return {
    key: 'calendar',
    icon: Calendar,
    label: 'Agendar',
    tooltip: 'Agendar reunión',
    onClick,
    hoverColor: 'hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400',
  };
}

export default SheetQuickActions;
