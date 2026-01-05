'use client';

/**
 * Quote Detail Page - Full Page View (v3.0)
 *
 * Premium quote detail page with comprehensive information display.
 * Includes images gallery, comments, attachments, timeline, and more.
 *
 * Key Features v3.0:
 * - Image gallery with lightbox
 * - Comments section with full features
 * - Document attachments with categories
 * - Enhanced activity timeline
 * - Financial breakdown
 * - Client relationship section
 * - Responsive design for all devices
 *
 * @version 3.0.0
 */

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Edit3,
  FileText,
  History,
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Package,
  Paperclip,
  Phone,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  User,
  UserPlus,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuote, useQuoteMutations } from '@/lib/quotes';
import type { Quote, QuoteStatus, QuoteLineItem } from '@/lib/quotes/types';
import { QUOTE_STATUS_LABELS } from '@/lib/quotes/types';
import { CommentSection } from '@/components/comments';
import { AttachmentSection } from '@/components/ui/attachment-section';
import { useQuoteTheme } from '../hooks';
import { QuotePdfActions } from '../components/QuotePdfActions';
import { QuoteQuickActions } from '../components/QuoteQuickActions';
import { QuoteCreateSheet } from '../components';
import { QuoteImageGallery } from '../components/QuoteImageGallery';

// ============================================
// Types
// ============================================

interface PageParams extends Record<string, string> {
  id: string;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<QuoteStatus, {
  icon: typeof FileText;
  className: string;
  color: string;
}> = {
  draft: {
    icon: FileText,
    className: 'bg-muted/80 text-muted-foreground border-border',
    color: '#64748b',
  },
  pending_review: {
    icon: Clock,
    className: 'bg-amber-100/90 text-amber-700 border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-300',
    color: '#f59e0b',
  },
  sent: {
    icon: Send,
    className: 'bg-blue-100/90 text-blue-700 border-blue-300/50 dark:bg-blue-900/30 dark:text-blue-300',
    color: '#3b82f6',
  },
  viewed: {
    icon: FileText,
    className: 'bg-violet-100/90 text-violet-700 border-violet-300/50 dark:bg-violet-900/30 dark:text-violet-300',
    color: '#8b5cf6',
  },
  accepted: {
    icon: CheckCircle,
    className: 'bg-emerald-100/90 text-emerald-700 border-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-300',
    color: '#10b981',
  },
  rejected: {
    icon: XCircle,
    className: 'bg-red-100/90 text-red-700 border-red-300/50 dark:bg-red-900/30 dark:text-red-300',
    color: '#ef4444',
  },
  expired: {
    icon: Clock,
    className: 'bg-orange-100/90 text-orange-700 border-orange-300/50 dark:bg-orange-900/30 dark:text-orange-300',
    color: '#f97316',
  },
  revised: {
    icon: FileText,
    className: 'bg-cyan-100/90 text-cyan-700 border-cyan-300/50 dark:bg-cyan-900/30 dark:text-cyan-300',
    color: '#06b6d4',
  },
};

// ============================================
// Helpers
// ============================================

function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), "d 'de' MMM yyyy", { locale: es });
  } catch {
    return '-';
  }
}

function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), "EEEE, d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return '-';
  }
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function getExpiryStatus(expiryDate: string | null | undefined): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
} {
  if (!expiryDate) return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const days = differenceInDays(expiry, now);
  return {
    isExpired: isPast(expiry),
    isExpiringSoon: days >= 0 && days <= 7,
    daysRemaining: days,
  };
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// ============================================
// Sub-components
// ============================================

interface StatusBadgeProps {
  status: QuoteStatus;
  isExpired?: boolean;
  size?: 'sm' | 'default';
}

function StatusBadge({ status, isExpired, size = 'default' }: StatusBadgeProps) {
  const effectiveStatus = isExpired && status !== 'expired' ? 'expired' : status;
  const config = STATUS_CONFIG[effectiveStatus];
  const StatusIcon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1.5 border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className
      )}
    >
      <StatusIcon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {QUOTE_STATUS_LABELS[effectiveStatus]}
    </Badge>
  );
}

// Quick Action Button
interface QuickActionButtonProps {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'whatsapp' | 'call' | 'email';
}

function QuickActionButton({ icon: Icon, label, onClick, disabled, variant }: QuickActionButtonProps) {
  const variantStyles = {
    whatsapp: 'hover:bg-[#25D366]/10 hover:border-[#25D366]/50 hover:text-[#25D366] text-emerald-600 dark:text-emerald-400',
    call: 'hover:bg-[var(--tenant-primary)]/10 hover:border-[var(--tenant-primary)]/50 hover:text-[var(--tenant-primary)] text-[var(--tenant-primary)]',
    email: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600 text-blue-600 dark:text-blue-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        'p-4 rounded-xl border border-border/50',
        'bg-card/50 backdrop-blur-sm',
        'min-h-[72px] flex-1',
        'transition-all duration-200',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : variantStyles[variant],
        'active:scale-95'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Line Item Row
interface LineItemRowProps {
  item: QuoteLineItem;
  currency: string;
  index: number;
}

function LineItemRow({ item, currency, index }: LineItemRowProps) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 py-4',
      'border-b border-border/30 last:border-0',
      'hover:bg-muted/30 -mx-4 px-4 transition-colors'
    )}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] text-xs font-semibold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="font-medium tabular-nums">
              {item.quantity} × {formatCurrency(item.unitPrice, currency)}
            </span>
            {item.discountValue && item.discountValue > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-300">
                -{item.discountType === 'percentage' ? `${item.discountValue}%` : formatCurrency(item.discountValue, currency)}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(item.total, currency)}
        </p>
      </div>
    </div>
  );
}

// Timeline Event
interface TimelineEventProps {
  icon: typeof Clock;
  label: string;
  date: string | null | undefined;
  color: string;
  description?: string;
}

function TimelineEvent({ icon: Icon, label, date, color, description }: TimelineEventProps) {
  if (!date) return null;

  return (
    <div className="flex gap-3 relative">
      {/* Line connector */}
      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border/50" />

      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{formatFullDate(date)}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function QuoteDetailSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-br from-background to-muted/20">
      <div className="shrink-0 sticky top-0 z-20 backdrop-blur-xl border-b bg-background/95 px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Error State
// ============================================

function QuoteNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-5 bg-[var(--tenant-primary)]/10">
          <FileText className="h-8 w-8 text-[var(--tenant-primary)]" />
        </div>
        <h1 className="text-xl font-bold mb-2">Cotización no encontrada</h1>
        <p className="text-sm text-muted-foreground mb-6">
          La cotización que buscas no existe o no tienes permisos para verla.
        </p>
        <Button onClick={() => router.push('/app/quotes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Cotizaciones
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function QuoteDetailPage() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const { toast } = useToast();
  const quoteId = params?.id;

  // Initialize theme
  useQuoteTheme();

  // State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isActioning, setIsActioning] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');

  // Fetch quote data
  const { data: quote, isLoading, error, refetch } = useQuote(quoteId || '');

  // Mutations
  const mutations = useQuoteMutations();

  // Derived values
  const expiryInfo = quote ? getExpiryStatus(quote.expiryDate) : { isExpired: false, isExpiringSoon: false, daysRemaining: null };
  const isEffectivelyExpired = quote && (quote.status === 'expired' || expiryInfo.isExpired);
  const clientName = quote?.customerName || quote?.leadName;
  const clientType = quote?.customerId ? 'customer' : quote?.leadId ? 'lead' : null;
  const hasClient = !!clientName;
  const items = quote?.items ?? [];

  // Action visibility
  const canSend = quote && !isEffectivelyExpired && (quote.status === 'draft' || quote.status === 'pending_review' || quote.status === 'revised');
  const canAcceptReject = quote && (quote.status === 'sent' || quote.status === 'viewed');
  const canEdit = quote && (quote.status === 'draft' || quote.status === 'pending_review');

  // Contact handlers
  const normalizedPhone = quote ? normalizePhone(quote.contactPhone) : '';
  const sanitizedEmail = quote ? sanitizeEmail(quote.contactEmail) : '';
  const hasPhone = normalizedPhone.length >= 10;
  const hasEmail = !!sanitizedEmail;

  const handleWhatsApp = React.useCallback(() => {
    if (!quote || !hasPhone) return;
    const phoneDigits = normalizedPhone.replace(/^0+/, '');
    const message = encodeURIComponent(
      `Hola${quote.contactName ? ` ${quote.contactName}` : ''}, le comparto su cotización ${quote.quoteNumber} por ${formatCurrency(quote.total, quote.currency)}`
    );
    window.open(`https://wa.me/${phoneDigits}?text=${message}`, '_blank');
  }, [quote, hasPhone, normalizedPhone]);

  const handleCall = React.useCallback(() => {
    if (!hasPhone) return;
    window.location.href = `tel:${normalizedPhone}`;
  }, [hasPhone, normalizedPhone]);

  const handleEmail = React.useCallback(() => {
    if (!quote || !hasEmail) return;
    const subject = encodeURIComponent(`Cotización ${quote.quoteNumber}`);
    const body = encodeURIComponent(
      `Estimado/a ${quote.contactName || 'cliente'},\n\nAdjunto encontrará la cotización ${quote.quoteNumber} por ${formatCurrency(quote.total, quote.currency)}.\n\nSaludos.`
    );
    window.location.href = `mailto:${sanitizedEmail}?subject=${subject}&body=${body}`;
  }, [quote, hasEmail, sanitizedEmail]);

  // Action handlers
  const handleSend = React.useCallback(async () => {
    if (!quote) return;
    setIsActioning(true);
    try {
      await mutations.send({ quoteId: quote.id, data: {} });
      toast({ title: 'Éxito', description: 'Cotización enviada exitosamente' });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Error al enviar la cotización', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  }, [quote, mutations, toast, refetch]);

  const handleAccept = React.useCallback(async () => {
    if (!quote) return;
    setIsActioning(true);
    try {
      await mutations.accept({ quoteId: quote.id, data: {} });
      toast({ title: 'Éxito', description: 'Cotización aceptada' });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Error al aceptar la cotización', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  }, [quote, mutations, toast, refetch]);

  const handleReject = React.useCallback(async () => {
    if (!quote) return;
    setIsActioning(true);
    try {
      await mutations.reject({ quoteId: quote.id, data: {} });
      toast({ title: 'Cotización rechazada', description: 'La cotización ha sido rechazada.' });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Error al rechazar la cotización', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  }, [quote, mutations, toast, refetch]);

  const handleDuplicate = React.useCallback(async () => {
    if (!quote) return;
    setIsActioning(true);
    try {
      const newQuote = await mutations.duplicate(quote.id);
      toast({ title: 'Éxito', description: 'Cotización duplicada' });
      router.push(`/app/quotes/${newQuote.id}`);
    } catch {
      toast({ title: 'Error', description: 'Error al duplicar la cotización', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  }, [quote, mutations, toast, router]);

  const handleDelete = React.useCallback(async () => {
    if (!quote) return;
    setIsActioning(true);
    try {
      await mutations.delete(quote.id);
      toast({ title: 'Cotización eliminada', description: 'La cotización ha sido eliminada.' });
      router.push('/app/quotes');
    } catch {
      toast({ title: 'Error', description: 'Error al eliminar la cotización', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  }, [quote, mutations, toast, router]);

  const handleCopyLink = React.useCallback(async () => {
    if (!quote) return;
    try {
      const publicUrl = quote.publicUrl || `${window.location.origin}/q/${quote.publicToken || quote.id}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace de la cotización se copió al portapapeles',
      });
    } catch {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  }, [quote, toast]);

  // Loading state
  if (isLoading) {
    return <QuoteDetailSkeleton />;
  }

  // Error/Not found state
  if (error || !quote) {
    return <QuoteNotFound />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-br from-background via-background to-[color-mix(in_srgb,var(--tenant-primary)_3%,var(--background))] dark:from-background dark:via-background dark:to-muted/10">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-20 backdrop-blur-xl border-b bg-background/95 border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full"
              onClick={() => router.push('/app/quotes')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Title Area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold truncate">
                  {quote.quoteNumber}
                </h1>
                <StatusBadge status={quote.status} isExpired={isEffectivelyExpired} />
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {quote.title || 'Sin descripción'}
              </p>
            </div>

            {/* Mobile Actions */}
            <div className="sm:hidden">
              <QuoteQuickActions
                quote={quote}
                onEdit={canEdit ? () => setIsEditOpen(true) : undefined}
                onDelete={handleDelete}
                canEdit={canEdit}
                isDeleting={isActioning}
                variant="header"
              />
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
              )}
              {canSend && (
                <Button size="sm" onClick={handleSend} disabled={isActioning}>
                  {isActioning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Enviar
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar enlace
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate} disabled={isActioning}>
                    <FileText className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isActioning}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className={cn(
          'max-w-6xl mx-auto px-4 py-6',
          'pb-[calc(var(--bottom-bar-height,64px)+88px)] md:pb-8'
        )}>
          {/* Value Hero Card - Premium Blue Design */}
          <div className={cn(
            'relative overflow-hidden rounded-2xl p-6 mb-6',
            'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700',
            'dark:from-blue-600 dark:via-blue-700 dark:to-blue-800',
            'shadow-xl shadow-blue-500/25'
          )}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-white/80" />
                  <p className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                    Monto Total
                  </p>
                </div>
                <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-white">
                  {formatCurrency(quote.total, quote.currency)}
                </p>
                {items.length > 0 && (
                  <p className="text-sm text-white/70 mt-2">
                    {items.length} {items.length === 1 ? 'concepto' : 'conceptos'}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <QuotePdfActions quote={quote} variant="compact" className="text-white" />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white opacity-[0.08] blur-3xl" />
            <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-white opacity-[0.05] blur-2xl" />
          </div>

          {/* Alerts */}
          {isEffectivelyExpired && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-100/90 border border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-700 dark:text-orange-300 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Esta cotización ha expirado
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                  Venció {formatRelativeDate(quote.expiryDate)}
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-100">
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Reactivar
              </Button>
            </div>
          )}

          {expiryInfo.isExpiringSoon && !isEffectivelyExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100/90 border border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0" />
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                Vence en {expiryInfo.daysRemaining} {expiryInfo.daysRemaining === 1 ? 'día' : 'días'}
              </p>
            </div>
          )}

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--tenant-primary)] data-[state=active]:bg-transparent"
              >
                <Package className="w-4 h-4 mr-2" />
                Detalle
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--tenant-primary)] data-[state=active]:bg-transparent"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Galería
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--tenant-primary)] data-[state=active]:bg-transparent"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Comentarios
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--tenant-primary)] data-[state=active]:bg-transparent"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Archivos
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--tenant-primary)] data-[state=active]:bg-transparent"
              >
                <History className="w-4 h-4 mr-2" />
                Actividad
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6 min-w-0">
                  {/* Line Items */}
                  {items.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          <Package className="h-5 w-5 text-[var(--tenant-primary)]" />
                          Productos / Servicios
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-border/30">
                          {items.map((item, idx) => (
                            <LineItemRow key={item.id} item={item} currency={quote.currency} index={idx} />
                          ))}
                        </div>

                        {/* Financial Summary */}
                        <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium tabular-nums">{formatCurrency(quote.subtotal, quote.currency)}</span>
                          </div>
                          {quote.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                Descuento
                              </span>
                              <span className="font-medium tabular-nums">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                            </div>
                          )}
                          {quote.taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Impuestos ({quote.taxRate || 16}%)</span>
                              <span className="font-medium tabular-nums">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                            </div>
                          )}
                          <Separator className="my-3" />
                          <div className="flex justify-between text-lg">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold tabular-nums text-[var(--tenant-primary)]">
                              {formatCurrency(quote.total, quote.currency)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes & Terms */}
                  {(quote.notes || quote.terms || quote.description) && (
                    <Card className="border-border/50">
                      <CardContent className="p-6 space-y-5">
                        {quote.description && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[var(--tenant-primary)]" />
                              Descripción
                            </h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{quote.description}</p>
                          </div>
                        )}
                        {quote.notes && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-[var(--tenant-primary)]" />
                              Notas
                            </h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{quote.notes}</p>
                          </div>
                        )}
                        {quote.terms && (
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[var(--tenant-primary)]" />
                              Términos y Condiciones
                            </h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{quote.terms}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Image Preview */}
                  <Card className="border-border/50 lg:hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ImageIcon className="h-5 w-5 text-[var(--tenant-primary)]" />
                        Imágenes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <QuoteImageGallery quoteId={quote.id} maxPreviewImages={4} />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-4 min-w-0 overflow-hidden">
                  {/* Cliente & Contacto - Card Unificada */}
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      {/* Client Header */}
                      {hasClient ? (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--tenant-primary)]/20 to-[var(--tenant-primary)]/10 flex items-center justify-center shrink-0">
                            {clientType === 'customer' ? (
                              <Building2 className="w-6 h-6 text-[var(--tenant-primary)]" />
                            ) : (
                              <User className="w-6 h-6 text-[var(--tenant-primary)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {clientType === 'customer' ? 'Cliente' : 'Prospecto'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditOpen(true)}
                          className={cn(
                            'w-full flex items-center justify-center gap-3 p-4 rounded-xl mb-4',
                            'border-2 border-dashed border-border/70',
                            'text-muted-foreground hover:text-[var(--tenant-primary)]',
                            'hover:border-[var(--tenant-primary)]/50 hover:bg-[var(--tenant-primary)]/5',
                            'transition-all duration-200'
                          )}
                        >
                          <UserPlus className="w-5 h-5" />
                          <span className="text-sm font-medium">Asignar cliente</span>
                        </button>
                      )}

                      {/* Contact Info - Compact */}
                      {(quote.contactName || quote.contactEmail || quote.contactPhone) && (
                        <div className="space-y-2 mb-4 pb-4 border-b border-border/50">
                          {quote.contactName && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-foreground truncate">{quote.contactName}</span>
                            </div>
                          )}
                          {quote.contactEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`mailto:${quote.contactEmail}`} className="text-[var(--tenant-primary)] hover:underline truncate">
                                {quote.contactEmail}
                              </a>
                            </div>
                          )}
                          {quote.contactPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <a href={`tel:${quote.contactPhone}`} className="text-[var(--tenant-primary)] hover:underline">
                                {quote.contactPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Actions - Integrated */}
                      <div className="flex gap-2">
                        <QuickActionButton
                          icon={MessageCircle}
                          label="WhatsApp"
                          onClick={handleWhatsApp}
                          disabled={!hasPhone}
                          variant="whatsapp"
                        />
                        <QuickActionButton
                          icon={Phone}
                          label="Llamar"
                          onClick={handleCall}
                          disabled={!hasPhone}
                          variant="call"
                        />
                        <QuickActionButton
                          icon={Mail}
                          label="Email"
                          onClick={handleEmail}
                          disabled={!hasEmail}
                          variant="email"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Información - Compact Rows */}
                  <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Creación</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className={cn('h-4 w-4', isEffectivelyExpired && 'text-orange-500')} />
                          <span className={isEffectivelyExpired ? 'text-orange-600 dark:text-orange-400' : ''}>
                            Vencimiento
                          </span>
                        </div>
                        <span className={cn(
                          'text-sm font-medium',
                          isEffectivelyExpired ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'
                        )}>
                          {quote.expiryDate ? formatDate(quote.expiryDate) : 'Sin fecha'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documento - PDF Download */}
                  <Card className="border-border/50 hidden sm:block">
                    <CardContent className="p-4">
                      <QuotePdfActions quote={quote} variant="full" />
                    </CardContent>
                  </Card>

                  {/* Image Gallery on Desktop - Only show if likely to have images */}
                  <Card className="border-border/50 hidden lg:block">
                    <CardContent className="p-4">
                      <QuoteImageGallery quoteId={quote.id} maxPreviewImages={4} showCount />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-[var(--tenant-primary)]" />
                    Galería de Imágenes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuoteImageGallery quoteId={quote.id} maxPreviewImages={12} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[var(--tenant-primary)]" />
                    Comentarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentSection
                    entityType="quote"
                    entityId={quote.id}
                    allowReplies
                    allowReactions
                    allowMentions
                    allowMarkdown
                    placeholder="Escribe un comentario sobre esta cotización..."
                    emptyMessage="No hay comentarios aún. Sé el primero en comentar."
                    maxHeight="500px"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-[var(--tenant-primary)]" />
                    Documentos Adjuntos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AttachmentSection
                    entityType="quote"
                    entityId={quote.id}
                    title=""
                    description="Adjunta propuestas, contratos, facturas o cualquier documento relacionado con esta cotización."
                    category="proposal"
                    accessLevel="team"
                    view="grid"
                    showUploader
                    showList
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-[var(--tenant-primary)]" />
                    Línea de Tiempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    <TimelineEvent
                      icon={FileText}
                      label="Cotización creada"
                      date={quote.createdAt}
                      color="#64748b"
                      description={`Por ${quote.createdByName || 'Usuario'}`}
                    />
                    {quote.sentAt && (
                      <TimelineEvent
                        icon={Send}
                        label="Enviada al cliente"
                        date={quote.sentAt}
                        color="#3b82f6"
                        description={quote.contactEmail ? `Enviada a ${quote.contactEmail}` : undefined}
                      />
                    )}
                    {quote.viewedAt && (
                      <TimelineEvent
                        icon={FileText}
                        label="Vista por el cliente"
                        date={quote.viewedAt}
                        color="#8b5cf6"
                      />
                    )}
                    {quote.acceptedAt && (
                      <TimelineEvent
                        icon={CheckCircle}
                        label="Aceptada"
                        date={quote.acceptedAt}
                        color="#10b981"
                        description="El cliente aceptó la cotización"
                      />
                    )}
                    {quote.rejectedAt && (
                      <TimelineEvent
                        icon={XCircle}
                        label="Rechazada"
                        date={quote.rejectedAt}
                        color="#ef4444"
                        description={quote.rejectionReason || 'El cliente rechazó la cotización'}
                      />
                    )}
                    {isEffectivelyExpired && quote.status === 'expired' && (
                      <TimelineEvent
                        icon={Clock}
                        label="Expirada"
                        date={quote.expiryDate}
                        color="#f97316"
                        description="La cotización venció sin respuesta"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Mobile Fixed Bottom Actions */}
      {(canAcceptReject || canSend || canEdit) && (
        <div className={cn(
          'fixed left-0 right-0 z-40 md:hidden',
          'bg-background/95 backdrop-blur-xl',
          'border-t border-border/50',
          'shadow-[0_-2px_12px_rgba(0,0,0,0.08)]'
        )} style={{ bottom: 'var(--bottom-bar-height, 64px)' }}>
          <div className="flex gap-3 px-4 py-3">
            {canAcceptReject ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 min-h-[48px] border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                  onClick={handleAccept}
                  disabled={isActioning}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aceptar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-h-[48px] border-red-400 text-red-700 hover:bg-red-50"
                  onClick={handleReject}
                  disabled={isActioning}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              </>
            ) : canSend ? (
              <Button className="flex-1 min-h-[48px]" onClick={handleSend} disabled={isActioning}>
                {isActioning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Cotización
              </Button>
            ) : canEdit ? (
              <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => setIsEditOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar Cotización
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit Sheet */}
      <QuoteCreateSheet
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          refetch();
        }}
        editQuote={quote}
      />
    </div>
  );
}
