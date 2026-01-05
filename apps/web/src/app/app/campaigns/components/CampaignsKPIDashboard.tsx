'use client';

/**
 * CampaignsKPIDashboard Component
 *
 * KPI cards showing campaign performance metrics.
 */

import * as React from 'react';
import {
  Send,
  Mail,
  MousePointerClick,
  Eye,
  TrendingUp,
  Clock,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CampaignsDashboardStats } from '@/lib/campaigns';

// ============================================
// Types
// ============================================

export interface CampaignsKPIDashboardProps {
  /** Dashboard stats */
  stats?: CampaignsDashboardStats | null;
  /** Loading state */
  isLoading?: boolean;
  /** Handler for KPI click */
  onKPIClick?: (kpi: 'total' | 'active' | 'scheduled' | 'openRate') => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// KPI Card Component
// ============================================

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

function KPICard({
  title,
  value,
  icon,
  trend,
  trendUp,
  onClick,
  isLoading,
  className,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer hover:shadow-md transition-all duration-200',
        'hover:border-[var(--tenant-primary)]',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[var(--tenant-primary-lighter)] text-[var(--tenant-primary)] flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-semibold">{value}</p>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trendUp ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trendUp ? '↑' : '↓'} {trend}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Component
// ============================================

export function CampaignsKPIDashboard({
  stats,
  isLoading = false,
  onKPIClick,
  className,
}: CampaignsKPIDashboardProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <KPICard
        title="Total Campañas"
        value={stats?.totalCampaigns ?? 0}
        icon={<Send className="h-5 w-5" />}
        onClick={() => onKPIClick?.('total')}
        isLoading={isLoading}
      />

      <KPICard
        title="Activas"
        value={stats?.activeCampaigns ?? 0}
        icon={<Mail className="h-5 w-5" />}
        onClick={() => onKPIClick?.('active')}
        isLoading={isLoading}
      />

      <KPICard
        title="Programadas"
        value={stats?.scheduledCampaigns ?? 0}
        icon={<Clock className="h-5 w-5" />}
        onClick={() => onKPIClick?.('scheduled')}
        isLoading={isLoading}
      />

      <KPICard
        title="Tasa de Apertura"
        value={`${(stats?.avgOpenRate ?? 0).toFixed(1)}%`}
        icon={<Eye className="h-5 w-5" />}
        trend={stats?.avgOpenRate && stats.avgOpenRate > 20 ? '+2.3%' : undefined}
        trendUp={true}
        onClick={() => onKPIClick?.('openRate')}
        isLoading={isLoading}
      />
    </div>
  );
}

export default CampaignsKPIDashboard;
