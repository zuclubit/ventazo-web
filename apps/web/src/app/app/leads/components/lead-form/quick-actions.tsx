'use client';

/**
 * Quick Actions Component
 *
 * Action buttons for common lead operations:
 * - Send email
 * - Make call
 * - Send WhatsApp
 * - More options
 *
 * @module leads/components/lead-form/quick-actions
 */

import * as React from 'react';

import { motion } from 'framer-motion';
import {
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface QuickAction {
  /** Unique identifier */
  id: string;
  /** Display label (for tooltip) */
  label: string;
  /** Icon */
  icon: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Optional badge (e.g., notification count) */
  badge?: number;
  /** Variant */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export interface MoreAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon */
  icon?: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Whether this is a destructive action */
  destructive?: boolean;
  /** Separator before this item */
  separator?: boolean;
}

export interface QuickActionsProps {
  /** Primary quick actions (shown as icon buttons) */
  actions: QuickAction[];
  /** More actions (shown in dropdown) */
  moreActions?: MoreAction[];
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

// ============================================
// Size Configuration
// ============================================

const sizeConfig = {
  sm: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
    badge: 'h-4 w-4 text-[10px]',
  },
  md: {
    button: 'h-9 w-9',
    icon: 'h-4 w-4',
    badge: 'h-4.5 w-4.5 text-[10px]',
  },
  lg: {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
    badge: 'h-5 w-5 text-xs',
  },
};

const variantColors = {
  default: 'hover:bg-muted hover:text-foreground',
  success: 'hover:bg-emerald-500/10 hover:text-emerald-600',
  warning: 'hover:bg-amber-500/10 hover:text-amber-600',
  destructive: 'hover:bg-destructive/10 hover:text-destructive',
};

// ============================================
// Single Action Button
// ============================================

interface ActionButtonProps {
  action: QuickAction;
  size: 'sm' | 'md' | 'lg';
}

function ActionButton({ action, size }: ActionButtonProps) {
  const config = sizeConfig[size];
  const Icon = action.icon;
  const colorClass = variantColors[action.variant || 'default'];

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={action.disabled}
            onClick={action.onClick}
            className={cn(
              'relative rounded-full border border-border/50',
              'text-muted-foreground transition-all duration-200',
              config.button,
              colorClass,
              action.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={config.icon} />
            <span className="sr-only">{action.label}</span>

            {/* Badge */}
            {action.badge && action.badge > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 flex items-center justify-center',
                  'rounded-full bg-primary text-primary-foreground font-medium',
                  config.badge
                )}
              >
                {action.badge > 9 ? '9+' : action.badge}
              </span>
            )}
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {action.label}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// More Actions Dropdown
// ============================================

interface MoreActionsDropdownProps {
  actions: MoreAction[];
  size: 'sm' | 'md' | 'lg';
}

function MoreActionsDropdown({ actions, size }: MoreActionsDropdownProps) {
  const config = sizeConfig[size];

  return (
    <DropdownMenu>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-full border border-border/50',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'transition-all duration-200',
                  config.button
                )}
              >
                <MoreHorizontal className={config.icon} />
                <span className="sr-only">Mas opciones</span>
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Mas opciones
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={action.disabled}
              onClick={action.onClick}
              className={cn(
                action.destructive && 'text-destructive focus:text-destructive'
              )}
            >
              {action.icon && (
                <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// Main Component
// ============================================

export function QuickActions({
  actions,
  moreActions,
  size = 'md',
  className,
}: QuickActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action) => (
        <ActionButton key={action.id} action={action} size={size} />
      ))}

      {moreActions && moreActions.length > 0 && (
        <MoreActionsDropdown actions={moreActions} size={size} />
      )}
    </div>
  );
}

// ============================================
// Preset Actions Factory
// ============================================

export interface CreateLeadActionsParams {
  email?: string;
  phone?: string;
  onAddTask?: () => void;
  onSendEmail?: () => void;
  onMakeCall?: () => void;
  onSendWhatsApp?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export function createLeadQuickActions(
  params: CreateLeadActionsParams
): QuickAction[] {
  const actions: QuickAction[] = [];

  // Add task
  if (params.onAddTask) {
    actions.push({
      id: 'add',
      label: 'Agregar tarea',
      icon: Plus,
      onClick: params.onAddTask,
    });
  }

  // Email
  if (params.email) {
    actions.push({
      id: 'email',
      label: 'Enviar email',
      icon: Mail,
      onClick: params.onSendEmail || (() => window.open(`mailto:${params.email}`)),
    });
  }

  // Phone
  if (params.phone) {
    actions.push({
      id: 'call',
      label: 'Llamar',
      icon: Phone,
      onClick: params.onMakeCall || (() => window.open(`tel:${params.phone}`)),
      variant: 'success',
    });
  }

  return actions;
}

// ============================================
// Display Names
// ============================================

QuickActions.displayName = 'QuickActions';
ActionButton.displayName = 'ActionButton';
MoreActionsDropdown.displayName = 'MoreActionsDropdown';
