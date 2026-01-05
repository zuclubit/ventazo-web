'use client';

/**
 * WIPWarningDialog Component
 *
 * Dialog shown when trying to add items to a column at/near WIP limit.
 * Allows override with justification.
 *
 * @version 1.0.0
 * @module components/WIPWarningDialog
 */

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Ban, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WIPStatus, KanbanColumnState, PipelineStageConfig } from '../types';

// ============================================
// Types
// ============================================

export interface WIPWarningDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Column state (includes WIP info) */
  column: KanbanColumnState | null;
  /** Callback when override is confirmed */
  onConfirm: (justification: string) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Whether justification is required */
  requiresJustification?: boolean;
}

// ============================================
// WIP Status Indicator
// ============================================

interface WIPStatusIndicatorProps {
  status: WIPStatus;
  stageName: string;
}

function WIPStatusIndicator({ status, stageName }: WIPStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status.level) {
      case 'blocked':
        return <Ban className="w-5 h-5 text-red-500" />;
      case 'critical':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getProgressColor = () => {
    if (status.percentage >= 100) return 'bg-red-500';
    if (status.percentage >= 80) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{stageName}</span>
        </div>
        <span className="text-sm font-mono">
          {status.current}/{status.hardLimit}
        </span>
      </div>

      <div className="space-y-1">
        <Progress
          value={Math.min(status.percentage, 100)}
          className={cn('h-2', getProgressColor())}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Soft: {status.softLimit}</span>
          <span>{status.percentage}% de capacidad</span>
          <span>Hard: {status.hardLimit}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// WIP Warning Dialog Component
// ============================================

export function WIPWarningDialog({
  isOpen,
  column,
  onConfirm,
  onCancel,
  requiresJustification = true,
}: WIPWarningDialogProps) {
  const [justification, setJustification] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setJustification('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!column) return null;

  const isBlocked = column.wip.level === 'blocked';
  const stageName = column.stage.labelEs || column.stage.label;

  const handleConfirm = async () => {
    if (requiresJustification && !justification.trim()) return;
    setIsSubmitting(true);
    try {
      onConfirm(justification.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !requiresJustification || justification.trim().length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isBlocked ? (
              <>
                <Ban className="w-5 h-5 text-red-500" />
                Límite WIP Alcanzado
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Advertencia de Capacidad
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                La columna <strong>{stageName}</strong> ha alcanzado su límite
                máximo de elementos. Para agregar más, debes proporcionar una
                justificación.
              </>
            ) : (
              <>
                La columna <strong>{stageName}</strong> está cerca de su límite
                de capacidad. Considera procesar algunos elementos antes de
                agregar más.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* WIP Status */}
        <WIPStatusIndicator status={column.wip} stageName={stageName} />

        {/* Impact explanation */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>¿Por qué existen límites WIP?</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Evitan cuellos de botella en el flujo de trabajo</li>
            <li>Mejoran el enfoque en tareas actuales</li>
            <li>Reducen el tiempo de ciclo de cada elemento</li>
            <li>Identifican problemas en el proceso tempranamente</li>
          </ul>
        </div>

        {/* Justification (for overrides) */}
        {(isBlocked || requiresJustification) && (
          <div className="space-y-2">
            <Label htmlFor="wip-justification">
              Justificación para continuar{' '}
              {requiresJustification && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="wip-justification"
              placeholder="Explica por qué necesitas exceder el límite..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta justificación será registrada para auditoría.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
            {isBlocked ? 'Cancelar' : 'Volver'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              isBlocked
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Procesando...
              </>
            ) : isBlocked ? (
              'Continuar de Todas Formas'
            ) : (
              'Continuar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default WIPWarningDialog;
