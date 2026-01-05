'use client';

/**
 * Lead Form Header Component
 *
 * Premium header section with:
 * - Avatar with initials or image
 * - Lead name and contact info
 * - Quick action buttons
 * - Edit mode toggle
 *
 * Responsive Design:
 * - Mobile: Compact layout with essential actions only
 * - Tablet: Full layout with all actions
 * - Desktop: Expanded with hover states
 *
 * @module leads/components/lead-form/lead-header
 */

import * as React from 'react';

import { motion } from 'framer-motion';
import { Edit2, Mail, Phone, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { QuickActions, type QuickAction } from './quick-actions';

// ============================================
// Types
// ============================================

export interface LeadHeaderProps {
  /** Lead's full name */
  name: string;
  /** Lead's email */
  email?: string;
  /** Lead's phone */
  phone?: string;
  /** Lead's company */
  company?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Whether form is in edit mode */
  isEditing?: boolean;
  /** Toggle edit mode callback */
  onEditToggle?: () => void;
  /** Close/dismiss callback */
  onClose?: () => void;
  /** Additional quick actions */
  quickActions?: QuickAction[];
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Responsive Size Configuration
// ============================================

const sizeConfig = {
  sm: {
    avatar: 'h-10 w-10 sm:h-11 sm:w-11',
    avatarText: 'text-sm',
    name: 'text-base sm:text-lg',
    subtitle: 'text-xs',
    container: 'gap-2.5 sm:gap-3',
    padding: 'p-3 sm:p-4',
    // Minimum touch target: 44x44px (WCAG 2.1 AAA)
    actionButton: 'h-10 w-10 sm:h-9 sm:w-9',
    actionIcon: 'h-4 w-4',
  },
  md: {
    avatar: 'h-11 w-11 sm:h-12 sm:w-12',
    avatarText: 'text-sm sm:text-base',
    name: 'text-lg sm:text-xl',
    subtitle: 'text-xs sm:text-sm',
    container: 'gap-3 sm:gap-4',
    padding: 'p-3 sm:p-4',
    actionButton: 'h-10 w-10 sm:h-9 sm:w-9',
    actionIcon: 'h-4 w-4',
  },
  lg: {
    avatar: 'h-12 w-12 sm:h-14 sm:w-14',
    avatarText: 'text-base sm:text-lg',
    name: 'text-xl sm:text-2xl',
    subtitle: 'text-sm',
    container: 'gap-3 sm:gap-4',
    padding: 'p-4 sm:p-5',
    actionButton: 'h-11 w-11 sm:h-10 sm:w-10',
    actionIcon: 'h-4.5 w-4.5 sm:h-5 sm:w-5',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate initials from a name
 */
function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return '??';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) {
    const firstPart = parts[0];
    return firstPart ? firstPart.slice(0, 2).toUpperCase() : '??';
  }
  const first = parts[0]?.[0] || '?';
  const last = parts[parts.length - 1]?.[0] || '?';
  return (first + last).toUpperCase();
}

/**
 * Generate a consistent color based on name
 */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-gradient-to-br from-violet-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-cyan-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-amber-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-blue-600',
  ] as const;

  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length] ?? colors[0];
}

// ============================================
// Avatar Component
// ============================================

interface LeadAvatarProps {
  name: string;
  avatarUrl?: string;
  size: 'sm' | 'md' | 'lg';
}

function LeadAvatar({ name, avatarUrl, size }: LeadAvatarProps) {
  const config = sizeConfig[size];
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="shrink-0"
    >
      <Avatar
        className={cn(
          config.avatar,
          'ring-2 ring-white/20 shadow-lg',
          // Ensure crisp rendering
          'transform-gpu'
        )}
      >
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback
          className={cn(
            colorClass,
            'text-white font-semibold select-none',
            config.avatarText
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
}

// ============================================
// Contact Info Component
// ============================================

interface ContactInfoProps {
  email?: string;
  phone?: string;
  company?: string;
  size: 'sm' | 'md' | 'lg';
}

function ContactInfo({ email, phone, company, size }: ContactInfoProps) {
  const config = sizeConfig[size];

  // Prioritize what to show based on screen size
  // On mobile, show only company or email (most important)
  // On larger screens, show all

  if (!company && !email && !phone) return null;

  return (
    <div className={cn('text-muted-foreground', config.subtitle)}>
      {/* Mobile: Show only first available item */}
      <p className="sm:hidden truncate max-w-[180px]">
        {company || email || phone}
      </p>

      {/* Tablet+: Show all items */}
      <p className="hidden sm:block truncate max-w-[280px] md:max-w-[320px]">
        {[company, email, phone].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

// ============================================
// Action Button Component (Accessible)
// ============================================

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
  size,
  className,
}: ActionButtonProps) {
  const config = sizeConfig[size];

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant === 'primary' ? 'default' : 'ghost'}
          size="icon"
          onClick={onClick}
          className={cn(
            // Minimum 44x44 touch target on mobile
            config.actionButton,
            'rounded-full transition-all duration-200',
            // Focus styles for accessibility
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            // Active state for touch feedback
            'active:scale-95',
            variant === 'ghost' && 'text-muted-foreground hover:text-foreground hover:bg-muted',
            variant === 'primary' && 'bg-primary/10 text-primary hover:bg-primary/20',
            className
          )}
        >
          <Icon className={config.actionIcon} />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="text-xs"
        // Hide tooltip on touch devices (they don't have hover)
        sideOffset={8}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadHeader({
  name,
  email,
  phone,
  company,
  avatarUrl,
  isEditing,
  onEditToggle,
  onClose,
  quickActions = [],
  className,
  size = 'md',
}: LeadHeaderProps) {
  const config = sizeConfig[size];

  // Build default quick actions if not provided
  const defaultActions: QuickAction[] = [];

  if (email) {
    defaultActions.push({
      id: 'email',
      label: 'Enviar email',
      icon: Mail,
      onClick: () => window.open(`mailto:${email}`),
    });
  }

  if (phone) {
    defaultActions.push({
      id: 'call',
      label: 'Llamar',
      icon: Phone,
      onClick: () => window.open(`tel:${phone}`),
      variant: 'success',
    });
  }

  const allActions = [...defaultActions, ...quickActions];

  // On mobile, limit to 2 quick actions to save space
  const visibleActions = allActions.slice(0, 2);
  const hasMoreActions = allActions.length > 2;

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        // Layout
        'flex items-center justify-between',
        config.padding,
        // Visual
        'border-b border-border/50',
        'bg-gradient-to-r from-muted/30 via-muted/20 to-transparent',
        // Ensure header is above content during scroll
        'relative z-10',
        className
      )}
      role="banner"
    >
      {/* Left: Avatar & Info */}
      <div className={cn('flex items-center min-w-0 flex-1', config.container)}>
        <LeadAvatar name={name} avatarUrl={avatarUrl} size={size} />

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'font-semibold text-foreground truncate',
              config.name
            )}
          >
            {name || 'Nuevo Lead'}
          </h2>
          <ContactInfo
            email={email}
            phone={phone}
            company={company}
            size={size}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
        {/* Quick Actions - Show on mobile with touch-friendly sizing */}
        {visibleActions.length > 0 && (
          <div className="flex items-center gap-1">
            <QuickActions
              actions={visibleActions}
              size="sm"
              // Pass more actions if available
              moreActions={hasMoreActions ? allActions.slice(2).map(a => ({
                id: a.id,
                label: a.label,
                icon: a.icon,
                onClick: a.onClick,
                disabled: a.disabled,
              })) : undefined}
            />
          </div>
        )}

        {/* Edit Toggle - Hide on very small screens if we have many actions */}
        {onEditToggle && (
          <div className={cn(allActions.length > 1 && 'hidden xs:block')}>
            <ActionButton
              icon={Edit2}
              label={isEditing ? 'Cancelar edición' : 'Editar lead'}
              onClick={onEditToggle}
              variant={isEditing ? 'primary' : 'ghost'}
              size={size}
            />
          </div>
        )}

        {/* Close Button - Always visible */}
        {onClose && (
          <ActionButton
            icon={X}
            label="Cerrar"
            onClick={onClose}
            variant="ghost"
            size={size}
          />
        )}
      </div>
    </motion.header>
  );
}

// ============================================
// Display Names
// ============================================

LeadHeader.displayName = 'LeadHeader';
LeadAvatar.displayName = 'LeadAvatar';
ContactInfo.displayName = 'ContactInfo';
ActionButton.displayName = 'ActionButton';
