'use client';

/**
 * LeadPreviewPanel Component
 *
 * Right sidebar panel showing selected lead details.
 * Supports desktop (fixed panel) and mobile (Sheet) modes.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  X,
  ExternalLink,
  Building2,
  Calendar,
  Clock,
  Mail,
  Phone,
  Globe,
  Tag,
  Sparkles,
  ChevronRight,
  Pencil,
  UserCheck,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';
import {
  type Lead,
  LeadStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
} from '@/lib/leads';
import { RBACGuard } from '@/lib/auth';

import { LeadScoreIndicator } from './LeadScoreIndicator';
import { QuickActionsBar } from './QuickActionsBar';

// ============================================
// Types
// ============================================

export interface LeadPreviewPanelProps {
  /** Selected lead (null = panel closed) */
  lead: Lead | null;
  /** Close handler */
  onClose: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Convert handler */
  onConvert?: () => void;
  /** AI insight (optional) */
  aiInsight?: string;
  /** Is mobile view (render as Sheet) */
  isMobile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return 'N/A';
  }
}

// ============================================
// Panel Content Component
// ============================================

interface PanelContentProps {
  lead: Lead;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConvert?: () => void;
  aiInsight?: string;
}

function PanelContent({
  lead,
  onClose,
  onEdit,
  onDelete,
  onConvert,
  aiInsight,
}: PanelContentProps) {
  const router = useRouter();
  const canConvert = lead.status === LeadStatus.QUALIFIED;
  const colorClasses = STATUS_COLORS[lead.status] || '';

  const handleViewDetails = () => {
    router.push(`/app/leads/${lead.id}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
              {getInitials(lead.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg truncate">{lead.fullName}</h2>
            {lead.companyName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{lead.companyName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-xs', colorClasses)}>
                {STATUS_LABELS[lead.status] || lead.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadScoreIndicator score={lead.score} size="md" showLabel={false} />
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Quick Actions */}
          <QuickActionsBar lead={lead} variant="stacked" />

          {/* AI Insight Banner */}
          {aiInsight && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Sugerencia IA</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{aiInsight}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Contacto
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-sm hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex items-center gap-1"
                  >
                    {lead.website.replace(/^https?:\/\//, '').slice(0, 30)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.website && (
                <p className="text-sm text-muted-foreground italic">
                  Sin información de contacto
                </p>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Detalles
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fuente</span>
                <Badge variant="outline" className="text-xs">
                  {SOURCE_LABELS[lead.source] || lead.source}
                </Badge>
              </div>
              {lead.industry && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Industria</span>
                  <span>{lead.industry}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Creado
                </span>
                <span>{formatRelativeTime(lead.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Última actividad
                </span>
                <span>{formatRelativeTime(lead.lastActivityAt || lead.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Etiquetas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes Preview */}
          {lead.notes && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Notas
              </h4>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {lead.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleViewDetails}
          >
            Ver Detalles
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>

          <RBACGuard minRole="sales_rep" fallback={null}>
            {onEdit && (
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canConvert && onConvert && (
              <Button size="icon" onClick={onConvert} className="ventazo-button">
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </RBACGuard>

          <RBACGuard minRole="admin" fallback={null}>
            {onDelete && (
              <Button variant="outline" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </RBACGuard>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadPreviewPanel({
  lead,
  onClose,
  onEdit,
  onDelete,
  onConvert,
  aiInsight,
  isMobile = false,
  className,
}: LeadPreviewPanelProps) {
  // Mobile: render as Sheet
  if (isMobile) {
    return (
      <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>{lead?.fullName || 'Lead'}</SheetTitle>
          </SheetHeader>
          {lead && (
            <PanelContent
              lead={lead}
              onClose={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onConvert={onConvert}
              aiInsight={aiInsight}
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as fixed panel
  if (!lead) return null;

  return (
    <div
      className={cn(
        'w-[400px] border-l bg-background/95 backdrop-blur-sm',
        'flex flex-col h-full',
        'animate-in slide-in-from-right-5 duration-300',
        className
      )}
    >
      <PanelContent
        lead={lead}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onConvert={onConvert}
        aiInsight={aiInsight}
      />
    </div>
  );
}
