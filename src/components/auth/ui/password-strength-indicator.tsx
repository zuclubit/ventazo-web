'use client';

/**
 * Password Strength Indicator Component
 *
 * Visual indicator showing password strength with progress bar and labels.
 * Supports internationalization through labels prop.
 */

import * as React from 'react';

import { Progress } from '@/components/ui/progress';

// ============================================
// Types
// ============================================

export interface PasswordStrengthLabels {
  weak: string;
  fair: string;
  good: string;
  strong: string;
}

export interface PasswordStrengthIndicatorProps {
  /** The password to evaluate */
  password: string;
  /** Localized labels for strength levels */
  labels: PasswordStrengthLabels;
  /** Additional class name */
  className?: string;
}

// ============================================
// Component
// ============================================

export function PasswordStrengthIndicator({
  password,
  labels,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = React.useMemo(() => {
    if (!password) return { level: 0, label: '' };

    let level = 0;
    if (password.length >= 8) level++;
    if (/[a-z]/.test(password)) level++;
    if (/[A-Z]/.test(password)) level++;
    if (/\d/.test(password)) level++;
    if (/[^a-zA-Z0-9]/.test(password)) level++;

    let label = '';
    if (level <= 2) label = labels.weak;
    else if (level === 3) label = labels.fair;
    else if (level === 4) label = labels.good;
    else label = labels.strong;

    return { level, label };
  }, [password, labels]);

  if (!password) return null;

  const percentage = (strength.level / 5) * 100;

  const getColorClass = () => {
    if (strength.level <= 2) return 'bg-destructive';
    if (strength.level === 3) return 'bg-yellow-500';
    if (strength.level === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength.level
                ? getColorClass()
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {strength.label}
      </p>
    </div>
  );
}
