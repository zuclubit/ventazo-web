'use client';

/**
 * QuoteQuickActions - Mobile-optimized action buttons (v1.0)
 *
 * Provides 4 icon buttons in a row for mobile header:
 * - Edit, Delete, Download PDF, Copy Link
 *
 * Design Principles:
 * - Touch-friendly (48px minimum targets)
 * - Tenant-aware theming
 * - Modular and reusable
 * - Responsive variants
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { Copy, Edit3, FileDown, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Quote } from '@/lib/quotes';
import { useProposalPdfGeneration } from '@/lib/proposal-templates';

// ============================================
// Types
// ============================================

interface QuoteQuickActionsProps {
  quote: Quote;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  isDeleting?: boolean;
  className?: string;
  /** Variant for different contexts */
  variant?: 'header' | 'toolbar';
}

interface ActionButtonProps {
  icon: typeof Edit3;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive';
  className?: string;
}

// ============================================
// Action Button Component
// ============================================

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
  variant = 'default',
  className,
}: ActionButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
              // Base styles - touch friendly
              'h-9 w-9 rounded-full shrink-0',
              'transition-all duration-200',
              // Hover states
              variant === 'default' && [
                'text-foreground/70 hover:text-foreground',
                'hover:bg-muted dark:hover:bg-white/10',
              ],
              variant === 'destructive' && [
                'text-foreground/70 hover:text-red-600 dark:hover:text-red-400',
                'hover:bg-red-50 dark:hover:bg-red-900/20',
              ],
              // Active state
              'active:scale-95',
              className
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Main Component
// ============================================

export function QuoteQuickActions({
  quote,
  onEdit,
  onDelete,
  canEdit = true,
  isDeleting = false,
  className,
  variant = 'header',
}: QuoteQuickActionsProps) {
  const { toast } = useToast();
  const { generatePdf, isPdfLoading } = useProposalPdfGeneration();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Handle PDF download
  const handleDownload = React.useCallback(async () => {
    try {
      const blob = await generatePdf({
        quoteId: quote.id,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF descargado',
        description: `${quote.quoteNumber}.pdf descargado correctamente`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF',
        variant: 'destructive',
      });
    }
  }, [quote, generatePdf, toast]);

  // Handle copy link
  const handleCopyLink = React.useCallback(async () => {
    try {
      const publicUrl =
        quote.publicUrl ||
        `${window.location.origin}/q/${quote.publicToken || quote.id}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace de la cotizacion se copio al portapapeles',
      });
    } catch {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  }, [quote, toast]);

  // Handle delete confirmation
  const handleDeleteConfirm = React.useCallback(() => {
    setShowDeleteDialog(false);
    onDelete?.();
  }, [onDelete]);

  return (
    <div
      className={cn(
        'flex items-center',
        variant === 'header' ? 'gap-0.5' : 'gap-1',
        className
      )}
    >
      {/* Edit Button */}
      {canEdit && onEdit && (
        <ActionButton
          icon={Edit3}
          label="Editar"
          onClick={onEdit}
        />
      )}

      {/* Delete Button with Confirmation */}
      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogTrigger asChild>
            <span>
              <ActionButton
                icon={Trash2}
                label="Eliminar"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                loading={isDeleting}
                variant="destructive"
              />
            </span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cotizacion</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de que deseas eliminar la cotizacion{' '}
                <strong>{quote.quoteNumber}</strong>? Esta accion no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Download PDF Button */}
      <ActionButton
        icon={FileDown}
        label="Descargar PDF"
        onClick={handleDownload}
        disabled={isPdfLoading}
        loading={isPdfLoading}
      />

      {/* Copy Link Button */}
      <ActionButton
        icon={Copy}
        label="Copiar enlace"
        onClick={handleCopyLink}
      />
    </div>
  );
}
