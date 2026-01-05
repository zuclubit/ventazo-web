'use client';

/**
 * OpportunityPreviewPanel Component
 *
 * Right sidebar preview panel for opportunity details:
 * - Desktop: Fixed right panel with details
 * - Mobile/Tablet: Sheet (slide-up modal)
 *
 * Features:
 * - Quick actions (edit, win, lost)
 * - Amount and forecast display
 * - Activity timeline
 * - Notes section
 * - Contact information
 *
 * Homologated with LeadPreviewPanel design patterns.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, type Locale } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import {
  X,
  ExternalLink,
  Edit2,
  Trophy,
  XCircle,
  DollarSign,
  Target,
  Calendar,
  User,
  Building2,
  Tag,
  Clock,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/lib/opportunities';
import { OpportunityProbabilityIndicator, OpportunityProbabilityBar } from './OpportunityProbabilityIndicator';

// Date locale mapping
const dateLocales: Record<string, Locale> = {
  'es-MX': es,
  'es-CO': es,
  'es-AR': es,
  'es-CL': es,
  'es-PE': es,
  'pt-BR': ptBR,
  'en-US': enUS,
};

// ============================================
// Types
// ============================================

export interface OpportunityPreviewPanelProps {
  /** Selected opportunity to preview */
  opportunity: Opportunity | null;
  /** Whether the panel is open (for mobile) */
  isOpen?: boolean;
  /** Handler to close the panel */
  onClose: () => void;
  /** Handler for edit action */
  onEdit?: (opportunity: Opportunity) => void;
  /** Handler for win action */
  onWin?: (opportunity: Opportunity) => void;
  /** Handler for lost action */
  onLost?: (opportunity: Opportunity) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Style Configs (labels come from i18n)
// ============================================

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300',
  critical: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300',
};

const statusStyles: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// Info Row Component
// ============================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}

function InfoRow({ icon, label, value, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-start gap-3 py-2', className)}>
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

// ============================================
// Panel Content Component
// ============================================

interface PanelContentProps {
  opportunity: Opportunity;
  onClose: () => void;
  onEdit?: (opportunity: Opportunity) => void;
  onWin?: (opportunity: Opportunity) => void;
  onLost?: (opportunity: Opportunity) => void;
  onViewDetails: () => void;
  isMobile?: boolean;
}

function PanelContent({
  opportunity,
  onClose,
  onEdit,
  onWin,
  onLost,
  onViewDetails,
  isMobile = false,
}: PanelContentProps) {
  const { t, locale } = useI18n();
  const dateLocale = dateLocales[locale] || es;

  const priorityStyle = priorityStyles[opportunity.priority] || priorityStyles['medium'];
  const statusStyle = statusStyles[opportunity.status] || statusStyles['open'];
  const isOpen = opportunity.status === 'open';

  // Get translated labels
  const priorityLabel = t.opportunities.priority[opportunity.priority as keyof typeof t.opportunities.priority] || opportunity.priority;
  const statusLabel = t.opportunities.status[opportunity.status as keyof typeof t.opportunities.status] || opportunity.status;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {opportunity.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {opportunity.customer?.name || opportunity.lead?.fullName || t.opportunities.preview.noClient}
            </p>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full flex-shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status & Priority Badges */}
        <div className="flex gap-2 mt-3">
          <Badge className={statusStyle}>{statusLabel}</Badge>
          <Badge variant="outline" className={priorityStyle}>
            {priorityLabel}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Amount Card */}
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                {t.opportunities.preview.opportunityValue}
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(opportunity.amount, opportunity.currency)}
            </p>
          </div>

          {/* Probability Section */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t.opportunities.preview.closeProbability}</span>
              </div>
              <OpportunityProbabilityIndicator
                probability={opportunity.probability}
                size="sm"
                variant="badge"
              />
            </div>
            <OpportunityProbabilityBar
              probability={opportunity.probability}
              showForecast
              amount={opportunity.amount}
              currency={opportunity.currency}
            />
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t.opportunities.preview.details}
            </h4>

            {opportunity.expectedCloseDate && (
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label={t.opportunities.preview.expectedCloseDate}
                value={format(new Date(opportunity.expectedCloseDate), 'PPP', { locale: dateLocale })}
              />
            )}

            {opportunity.customer && (
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label={t.opportunities.preview.client}
                value={opportunity.customer.name}
              />
            )}

            {opportunity.lead && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label={t.opportunities.preview.associatedLead}
                value={opportunity.lead.fullName}
              />
            )}

            {opportunity.ownerId && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label={t.opportunities.preview.owner}
                value={opportunity.owner?.name || t.opportunities.preview.unassigned}
              />
            )}

            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label={t.opportunities.preview.created}
              value={formatDistanceToNow(new Date(opportunity.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            />
          </div>

          {/* Description */}
          {opportunity.description && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.opportunities.preview.description}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opportunity.description}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {opportunity.tags && opportunity.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.opportunities.preview.tags}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="flex-shrink-0 p-4 border-t bg-card/50 backdrop-blur-sm space-y-3">
        {/* Win/Lost Actions (only for open opportunities) */}
        {isOpen && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              onClick={() => onWin?.(opportunity)}
            >
              <Trophy className="mr-2 h-4 w-4" />
              {t.opportunities.status.won}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
              onClick={() => onLost?.(opportunity)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t.opportunities.status.lost}
            </Button>
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEdit?.(opportunity)}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            {t.opportunities.actions.edit}
          </Button>
          <Button className="flex-1" onClick={onViewDetails}>
            {t.opportunities.preview.viewDetails}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OpportunityPreviewPanel({
  opportunity,
  isOpen = false,
  onClose,
  onEdit,
  onWin,
  onLost,
  isLoading = false,
  className,
}: OpportunityPreviewPanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const handleViewDetails = () => {
    if (opportunity) {
      router.push(`/app/opportunities/${opportunity.id}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No opportunity selected
  if (!opportunity) {
    return null;
  }

  // Mobile: Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>{t.opportunities.preview.opportunityDetails}</SheetTitle>
          </SheetHeader>
          <PanelContent
            opportunity={opportunity}
            onClose={onClose}
            onEdit={onEdit}
            onWin={onWin}
            onLost={onLost}
            onViewDetails={handleViewDetails}
            isMobile
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed panel
  return (
    <div
      className={cn(
        'w-[380px] h-full border-l bg-card/50 backdrop-blur-sm',
        'animate-slide-in-right',
        className
      )}
    >
      <PanelContent
        opportunity={opportunity}
        onClose={onClose}
        onEdit={onEdit}
        onWin={onWin}
        onLost={onLost}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}
