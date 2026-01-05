'use client';

/**
 * CampaignCard Component
 *
 * Card for displaying campaign information in list view.
 * Shows status, recipients, stats, and quick actions.
 */

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart3,
  Calendar,
  Copy,
  Eye,
  MoreVertical,
  Pause,
  Play,
  Send,
  Trash2,
  Users,
  Mail,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Campaign, CampaignChannel } from '@/lib/campaigns';
import { CampaignStatusBadge } from './CampaignStatusBadge';

// ============================================
// Types
// ============================================

export interface CampaignCardProps {
  /** Campaign data */
  campaign: Campaign;
  /** Handler for view */
  onView?: (campaign: Campaign) => void;
  /** Handler for edit */
  onEdit?: (campaign: Campaign) => void;
  /** Handler for send */
  onSend?: (campaign: Campaign) => void;
  /** Handler for duplicate */
  onDuplicate?: (campaign: Campaign) => void;
  /** Handler for pause */
  onPause?: (campaign: Campaign) => void;
  /** Handler for resume */
  onResume?: (campaign: Campaign) => void;
  /** Handler for delete */
  onDelete?: (campaign: Campaign) => void;
  /** Handler for analytics */
  onViewAnalytics?: (campaign: Campaign) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

const CHANNEL_ICONS: Partial<Record<CampaignChannel, React.ReactNode>> = {
  email: <Mail className="h-4 w-4 text-[var(--channel-email)]" />,
  sms: <MessageSquare className="h-4 w-4 text-[var(--channel-sms)]" />,
  whatsapp: <MessageSquare className="h-4 w-4 text-[var(--channel-whatsapp)]" />,
  facebook: <MessageSquare className="h-4 w-4 text-[var(--channel-facebook)]" />,
  instagram: <MessageSquare className="h-4 w-4 text-[var(--channel-instagram)]" />,
  linkedin: <MessageSquare className="h-4 w-4 text-[var(--channel-linkedin)]" />,
  twitter: <MessageSquare className="h-4 w-4 text-[var(--channel-twitter)]" />,
  push_notification: <MessageSquare className="h-4 w-4 text-[var(--channel-push)]" />,
  in_app: <MessageSquare className="h-4 w-4 text-[var(--channel-in-app)]" />,
  phone: <MessageSquare className="h-4 w-4 text-[var(--channel-phone)]" />,
};

const getChannelIcon = (channel?: CampaignChannel): React.ReactNode => {
  if (!channel) return <Mail className="h-4 w-4" />;
  return CHANNEL_ICONS[channel] ?? <Mail className="h-4 w-4" />;
};

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return format(new Date(dateString), "d MMM, HH:mm", { locale: es });
}

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return '-';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
}

// ============================================
// Component
// ============================================

export function CampaignCard({
  campaign,
  onView,
  onEdit,
  onSend,
  onDuplicate,
  onPause,
  onResume,
  onDelete,
  onViewAnalytics,
  className,
}: CampaignCardProps) {
  // Status flags
  const isCompleted = campaign.status === 'completed';
  const isActive = campaign.status === 'active';
  const isDraft = campaign.status === 'draft';
  const isScheduled = campaign.status === 'scheduled';
  const isPaused = campaign.status === 'paused';

  // Recipients and reach
  const recipientCount = campaign.actualReach ?? campaign.estimatedReach ?? 0;
  const progressPercentage = recipientCount > 0 && campaign.actualReach
    ? (campaign.actualReach / (campaign.estimatedReach ?? 1)) * 100
    : 0;

  return (
    <Card
      className={cn(
        'group transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-[var(--campaign-card-border-hover)]',
        'border-l-4 border-l-[var(--campaign-card-accent)]',
        className
      )}
      onClick={() => onView?.(campaign)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Channel Icon */}
          <div className="shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            {getChannelIcon(campaign.primaryChannel ?? campaign.channels?.[0])}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{campaign.name}</h3>
                {campaign.subject && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {campaign.subject}
                  </p>
                )}
              </div>
              <CampaignStatusBadge status={campaign.status} size="sm" />
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm">
              {/* Recipients */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{recipientCount.toLocaleString()}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Destinatarios</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Date */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {isCompleted
                          ? formatDate(campaign.completedAt)
                          : isScheduled
                          ? formatDate(campaign.startDate)
                          : formatRelativeDate(campaign.createdAt)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCompleted ? 'Completada' : isScheduled ? 'Programada para' : 'Creada'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Stats (for completed/active campaigns with goals) */}
              {(isCompleted || isActive) && campaign.goals && campaign.goals.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {campaign.goals[0]?.currentValue ?? 0}% {campaign.goals[0]?.name ?? 'meta'}
                  </span>
                </>
              )}
            </div>

            {/* Progress Bar (for active campaigns) */}
            {isActive && (
              <div className="space-y-1">
                <Progress value={progressPercentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {campaign.actualReach?.toLocaleString() ?? 0} de {campaign.estimatedReach?.toLocaleString() ?? 0} alcanzados
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick Actions */}
            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onSend?.(campaign);
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}

            {isPaused && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onResume?.(campaign);
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onPause?.(campaign);
                }}
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {isCompleted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAnalytics?.(campaign);
                }}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(campaign)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalles
                </DropdownMenuItem>
                {isDraft && (
                  <DropdownMenuItem onClick={() => onEdit?.(campaign)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDuplicate?.(campaign)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                {isCompleted && (
                  <DropdownMenuItem onClick={() => onViewAnalytics?.(campaign)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver análisis
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(campaign)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CampaignCard;
