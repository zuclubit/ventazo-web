'use client';

// ============================================
// AI Badge Component - FASE 6.1
// Visual badges for AI classifications
// ============================================

import { AlertTriangle, Flame, Snowflake, Sun, Target, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type LeadTemperature = 'hot' | 'warm' | 'cold';
type IntentLevel = 'high' | 'medium' | 'low';
type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AIBadgeProps {
  variant: 'temperature' | 'intent' | 'urgency' | 'custom';
  value: LeadTemperature | IntentLevel | UrgencyLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// ============================================
// Configuration
// ============================================

const temperatureConfig = {
  hot: {
    label: 'Hot',
    icon: Flame,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    iconClassName: 'text-red-500',
  },
  warm: {
    label: 'Warm',
    icon: Sun,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    iconClassName: 'text-amber-500',
  },
  cold: {
    label: 'Cold',
    icon: Snowflake,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    iconClassName: 'text-blue-500',
  },
};

const intentConfig = {
  high: {
    label: 'High Intent',
    icon: Zap,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
    iconClassName: 'text-emerald-500',
  },
  medium: {
    label: 'Medium Intent',
    icon: Target,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    iconClassName: 'text-yellow-500',
  },
  low: {
    label: 'Low Intent',
    icon: AlertTriangle,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    iconClassName: 'text-slate-400',
  },
};

const urgencyConfig = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 animate-pulse',
    iconClassName: 'text-red-500',
  },
  high: {
    label: 'High',
    icon: Flame,
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    iconClassName: 'text-orange-500',
  },
  medium: {
    label: 'Medium',
    icon: Sun,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    iconClassName: 'text-yellow-500',
  },
  low: {
    label: 'Low',
    icon: Snowflake,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    iconClassName: 'text-slate-400',
  },
};

const sizeConfig = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const iconSizeConfig = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// ============================================
// Component
// ============================================

export function AIBadge({
  variant,
  value,
  size = 'md',
  showIcon = true,
  className,
}: AIBadgeProps) {
  let config: {
    label: string;
    icon: typeof Flame;
    className: string;
    iconClassName: string;
  };

  switch (variant) {
    case 'temperature':
      config = temperatureConfig[value as LeadTemperature] || temperatureConfig.cold;
      break;
    case 'intent':
      config = intentConfig[value as IntentLevel] || intentConfig.low;
      break;
    case 'urgency':
      config = urgencyConfig[value as UrgencyLevel] || urgencyConfig.low;
      break;
    case 'custom':
    default:
      config = {
        label: value,
        icon: Target,
        className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
        iconClassName: 'text-slate-400',
      };
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        sizeConfig[size],
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(iconSizeConfig[size], config.iconClassName)} />
      )}
      {config.label}
    </span>
  );
}

// ============================================
// Convenience Components
// ============================================

interface TemperatureBadgeProps {
  temperature: LeadTemperature;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function TemperatureBadge({ temperature, ...props }: TemperatureBadgeProps) {
  return <AIBadge value={temperature} variant="temperature" {...props} />;
}

interface IntentBadgeProps {
  intent: IntentLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function IntentBadge({ intent, ...props }: IntentBadgeProps) {
  return <AIBadge value={intent} variant="intent" {...props} />;
}

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function UrgencyBadge({ urgency, ...props }: UrgencyBadgeProps) {
  return <AIBadge value={urgency} variant="urgency" {...props} />;
}

// ============================================
// Utility Functions
// ============================================

export function scoreToTemperature(score: number): LeadTemperature {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function scoreToIntent(score: number): IntentLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
