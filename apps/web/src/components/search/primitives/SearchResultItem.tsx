/**
 * SearchResultItem Primitive - Ventazo Design System 2025
 *
 * @description Individual search result item with entity icon,
 * score badge, and responsive layout.
 *
 * @module components/search/primitives/SearchResultItem
 */

'use client';

import * as React from 'react';
import {
  ChevronRight,
  Building2,
  User,
  Users,
  Target,
  CheckSquare,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEntityDisplayInfo, type SearchResultItem as SearchResultItemType } from '@/lib/search';
import type { SearchResultItemProps } from '../types';

// ============================================
// Entity Icons Map
// ============================================

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: Building2,
  contact: User,
  customer: Users,
  opportunity: Target,
  task: CheckSquare,
  communication: MessageSquare,
};

// ============================================
// Helper Functions
// ============================================

function getResultTitle(result: SearchResultItemType): string {
  switch (result.type) {
    case 'lead':
      return result.companyName;
    case 'contact':
      return result.fullName;
    case 'customer':
      return result.companyName;
    case 'opportunity':
      return result.name;
    case 'task':
      return result.title;
    case 'communication':
      return result.subject || 'Sin asunto';
    default:
      return 'Unknown';
  }
}

function getResultSubtitle(result: SearchResultItemType): string {
  switch (result.type) {
    case 'lead':
      return result.email || result.industry || '';
    case 'contact':
      return result.jobTitle ? `${result.jobTitle} - ${result.email}` : result.email;
    case 'customer':
      return `${result.tier} • ${result.email}`;
    case 'opportunity':
      return `$${result.value.toLocaleString()} • ${result.stage}`;
    case 'task':
      return result.description || `Prioridad: ${result.priority}`;
    case 'communication':
      return result.summary || result.communicationType;
    default:
      return '';
  }
}

// ============================================
// Score Badge Sub-component
// ============================================

function ScoreBadge({ score }: { score: number }) {
  const getScoreConfig = (s: number) => {
    if (s >= 70)
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
      };
    if (s >= 40)
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
      };
    return {
      bg: 'bg-slate-500/15',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
    };
  };

  const config = getScoreConfig(score);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        'px-2.5 py-1 rounded-full',
        'text-xs font-semibold border',
        config.bg,
        config.text,
        config.border
      )}
    >
      <TrendingUp className="w-3 h-3" />
      <span>{score}</span>
    </div>
  );
}

// ============================================
// Entity Badge Sub-component
// ============================================

function EntityBadge({ type, locale }: { type: string; locale: 'es' | 'en' }) {
  const info = getEntityDisplayInfo(type);

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5 rounded-md',
        'text-[10px] font-semibold',
        'uppercase tracking-wide border'
      )}
      style={{
        backgroundColor: `${info.color}15`,
        borderColor: `${info.color}30`,
        color: info.color,
      }}
    >
      {locale === 'es' ? info.label : info.labelEn}
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function SearchResultItem({
  result,
  isSelected,
  onClick,
  onMouseEnter,
  locale = 'es',
  accentColor,
}: SearchResultItemProps) {
  const entityInfo = getEntityDisplayInfo(result.type);
  const Icon = ENTITY_ICONS[result.type] || Building2;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        // Layout
        'w-full flex items-center gap-3 sm:gap-4',
        'p-3 sm:p-4 rounded-xl',
        'text-left',
        // Transitions
        'transition-all duration-150',
        'active:scale-[0.99]',
        // States
        isSelected
          ? 'bg-white/10 ring-1 ring-white/20'
          : 'bg-white/[0.02] hover:bg-white/[0.06]'
      )}
    >
      {/* Entity Icon */}
      <div
        className={cn(
          'w-11 h-11 sm:w-12 sm:h-12',
          'rounded-xl flex items-center justify-center',
          'flex-shrink-0 border'
        )}
        style={{
          backgroundColor: `${entityInfo.color}15`,
          borderColor: `${entityInfo.color}25`,
        }}
      >
        <Icon
          className="w-5 h-5 sm:w-6 sm:h-6"
          style={{ color: entityInfo.color }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm sm:text-base font-semibold text-white truncate">
            {getResultTitle(result)}
          </p>
          <EntityBadge type={result.type} locale={locale} />
        </div>
        <p className="text-xs sm:text-sm text-white/50 truncate">
          {getResultSubtitle(result)}
        </p>
      </div>

      {/* Score Badge (for leads) */}
      {'score' in result && typeof result.score === 'number' && (
        <div className="hidden sm:block flex-shrink-0">
          <ScoreBadge score={result.score} />
        </div>
      )}

      {/* Arrow */}
      <ChevronRight
        className={cn(
          'w-5 h-5 flex-shrink-0 transition-all',
          isSelected ? 'text-white translate-x-0.5' : 'text-white/20'
        )}
        style={isSelected && accentColor ? { color: accentColor } : undefined}
      />
    </button>
  );
}

SearchResultItem.displayName = 'SearchResultItem';
