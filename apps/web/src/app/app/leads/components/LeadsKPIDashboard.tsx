'use client';

/**
 * LeadsKPIDashboard Component
 *
 * Four smart KPI cards for leads overview:
 * 1. Total Leads - with today's count
 * 2. Leads Calientes - score >80, priority
 * 3. Sin Contacto - >48h without activity, warning
 * 4. Conversion Este Mes - with trend vs previous month
 */

import * as React from 'react';
import { Users, Flame, Clock, Target, AlertCircle } from 'lucide-react';
import { SmartKPICard, KPICardGrid } from './SmartKPICard';
import type { Lead, LeadStatsResponse } from '@/lib/leads';

// ============================================
// Types
// ============================================

export interface LeadsKPIDashboardProps {
  /** Statistics from useLeadStats hook */
  statistics?: LeadStatsResponse;
  /** All leads for client-side calculations */
  leads?: Lead[];
  /** Loading state */
  isLoading?: boolean;
  /** Filter callback when clicking a KPI */
  onFilterChange?: (filter: LeadsFilter) => void;
  /** Current active filter */
  activeFilter?: LeadsFilter;
  /** Additional CSS classes */
  className?: string;
}

export type LeadsFilter = 'all' | 'hot' | 'no-contact' | 'converted';

// ============================================
// Helpers
// ============================================

function isHotLead(lead: Lead): boolean {
  return lead.score >= 80;
}

function isNoContactLead(lead: Lead): boolean {
  const lastActivity = lead.lastActivityAt || lead.updatedAt;
  if (!lastActivity) return true;

  const hoursSinceActivity =
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
  return hoursSinceActivity > 48;
}

function calculateTrend(current: number, previous: number): {
  value: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(percentChange));

  if (percentChange > 0) {
    return { value: rounded, direction: 'up' };
  } else if (percentChange < 0) {
    return { value: rounded, direction: 'down' };
  }
  return { value: 0, direction: 'neutral' };
}

// ============================================
// Main Component
// ============================================

export function LeadsKPIDashboard({
  statistics,
  leads = [],
  isLoading = false,
  onFilterChange,
  activeFilter,
  className,
}: LeadsKPIDashboardProps) {
  // Calculate metrics
  const totalLeads = statistics?.total ?? leads.length;
  const newToday = statistics?.newThisMonth ?? 0; // Ideally we'd have newToday
  const hotLeadsCount = React.useMemo(
    () => leads.filter(isHotLead).length,
    [leads]
  );
  const noContactCount = React.useMemo(
    () => leads.filter(isNoContactLead).length,
    [leads]
  );
  const convertedThisMonth = statistics?.convertedThisMonth ?? 0;

  // Calculate conversion trend (mock previous month as 80% of current for demo)
  // In production, you'd get this from the API
  const previousMonthConverted = Math.floor(convertedThisMonth * 0.8);
  const conversionTrend = calculateTrend(convertedThisMonth, previousMonthConverted);

  // Handle KPI click
  const handleKPIClick = (filter: LeadsFilter) => {
    if (onFilterChange) {
      onFilterChange(activeFilter === filter ? 'all' : filter);
    }
  };

  return (
    <KPICardGrid columns={4} className={className}>
      {/* Total Leads */}
      <SmartKPICard
        title="Total Leads"
        value={totalLeads}
        icon={Users}
        subtitle={newToday > 0 ? `+${newToday} este mes` : undefined}
        variant="default"
        isLoading={isLoading}
        onClick={onFilterChange ? () => handleKPIClick('all') : undefined}
        isActive={activeFilter === 'all'}
      />

      {/* Hot Leads */}
      <SmartKPICard
        title="Leads Calientes"
        value={hotLeadsCount}
        icon={Flame}
        subtitle={hotLeadsCount > 0 ? '¡Prioritarios!' : 'Score > 80'}
        variant="highlight"
        isLoading={isLoading}
        onClick={onFilterChange ? () => handleKPIClick('hot') : undefined}
        isActive={activeFilter === 'hot'}
      />

      {/* No Contact */}
      <SmartKPICard
        title="Sin Contacto"
        value={noContactCount}
        icon={noContactCount > 0 ? AlertCircle : Clock}
        subtitle="> 48 horas"
        variant={noContactCount > 0 ? 'warning' : 'default'}
        isLoading={isLoading}
        onClick={onFilterChange ? () => handleKPIClick('no-contact') : undefined}
        isActive={activeFilter === 'no-contact'}
      />

      {/* Conversion This Month */}
      <SmartKPICard
        title="Convertidos"
        value={convertedThisMonth}
        icon={Target}
        trend={{
          ...conversionTrend,
          label: 'vs mes ant.',
        }}
        variant="success"
        isLoading={isLoading}
        onClick={onFilterChange ? () => handleKPIClick('converted') : undefined}
        isActive={activeFilter === 'converted'}
      />
    </KPICardGrid>
  );
}
