'use client';

/**
 * LeadSourceBadge Component - Premium 2025 Design
 *
 * Visual badge indicating the origin channel of a lead.
 * Features contextual icons and colors per source type.
 *
 * Sources:
 * - WhatsApp: Green with message icon
 * - Website: Cyan with globe icon
 * - Referral: Indigo with users icon
 * - Social: Pink with share icon
 * - Ad: Orange with megaphone icon
 * - Organic: Emerald with search icon
 * - Manual: Slate with pencil icon
 */

import * as React from 'react';

import {
  Globe,
  MessageCircle,
  Megaphone,
  Pencil,
  Search,
  Share2,
  Users,
} from 'lucide-react';

import { LeadSource, SOURCE_LABELS } from '@/lib/leads';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface LeadSourceBadgeProps {
  /** Lead source type */
  source: LeadSource;
  /** Show label text alongside icon */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Icon Mapping
// ============================================

const sourceIcons: Record<LeadSource, React.ElementType> = {
  [LeadSource.REFERRAL]: Users,
  [LeadSource.SOCIAL]: Share2,
  [LeadSource.WEBSITE]: Globe,
  [LeadSource.AD]: Megaphone,
  [LeadSource.ORGANIC]: Search,
  [LeadSource.MANUAL]: Pencil,
  [LeadSource.OTHER]: Globe,
};

// CSS class mapping for source types
const sourceClasses: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'referral',
  [LeadSource.SOCIAL]: 'social',
  [LeadSource.WEBSITE]: 'website',
  [LeadSource.AD]: 'ad',
  [LeadSource.ORGANIC]: 'organic',
  [LeadSource.MANUAL]: 'manual',
  [LeadSource.OTHER]: 'manual',
};

// ============================================
// Main Component
// ============================================

export function LeadSourceBadge({
  source,
  showLabel = true,
  size = 'sm',
  className,
}: LeadSourceBadgeProps) {
  const Icon = sourceIcons[source] || Globe;
  const sourceClass = sourceClasses[source] || 'manual';
  const label = SOURCE_LABELS[source] || source;

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  // Special handling for WhatsApp source (not in enum but common)
  const isWhatsApp = source.toLowerCase().includes('whatsapp');

  return (
    <span
      className={cn(
        'source-badge',
        isWhatsApp ? 'whatsapp' : sourceClass,
        className
      )}
      title={label}
    >
      {isWhatsApp ? (
        <MessageCircle className={iconSize} />
      ) : (
        <Icon className={iconSize} />
      )}
      {showLabel && (
        <span className="truncate max-w-[60px]">{label}</span>
      )}
    </span>
  );
}

// ============================================
// Compact Icon-Only Version
// ============================================

export interface LeadSourceIconProps {
  source: LeadSource;
  className?: string;
}

export function LeadSourceIcon({ source, className }: LeadSourceIconProps) {
  const Icon = sourceIcons[source] || Globe;
  const sourceClass = sourceClasses[source] || 'manual';
  const label = SOURCE_LABELS[source] || source;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'w-6 h-6 rounded-full',
        'transition-all duration-200',
        sourceClass === 'referral' && 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
        sourceClass === 'social' && 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
        sourceClass === 'website' && 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
        sourceClass === 'ad' && 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
        sourceClass === 'organic' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
        sourceClass === 'manual' && 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
        className
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

export default LeadSourceBadge;
