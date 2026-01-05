'use client';

/**
 * MoveToDialog Component
 *
 * Accessible dialog for moving items between stages.
 * Alternative to drag & drop for WCAG 2.2 compliance.
 *
 * @version 1.0.0
 * @module components/MoveToDialog
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Lock,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PipelineStageConfig,
  StageTransitionValidation,
  KanbanItem,
} from '../types';

// ============================================
// Types
// ============================================

export interface MoveToDialogProps<T = unknown> {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Item to move */
  item: KanbanItem<T> | null;
  /** Current stage ID */
  currentStageId: string;
  /** Available stages */
  stages: PipelineStageConfig[];
  /** Validate transition function */
  validateTransition: (targetStageId: string) => StageTransitionValidation;
  /** Callback when move is confirmed */
  onMove: (targetStageId: string, reason?: string) => void;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Item title for display */
  itemTitle?: string;
  /** Custom render for item preview */
  renderItemPreview?: (item: KanbanItem<T>) => React.ReactNode;
}

interface StageOptionProps {
  stage: PipelineStageConfig;
  validation: StageTransitionValidation;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

// ============================================
// Stage Option Component
// ============================================

function StageOption({
  stage,
  validation,
  isSelected,
  isCurrent,
  onClick,
}: StageOptionProps) {
  const isBlocked = validation.type === 'blocked';
  const isWarning = validation.type === 'warning';
  const requiresData = validation.type === 'requires_data';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBlocked || isCurrent}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          // Current stage
          'border-muted bg-muted/50 cursor-not-allowed opacity-60': isCurrent,
          // Blocked
          'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 cursor-not-allowed':
            isBlocked && !isCurrent,
          // Warning
          'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 hover:border-amber-400':
            isWarning && !isSelected,
          // Requires data
          'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 hover:border-blue-400':
            requiresData && !isSelected,
          // Selected
          'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2':
            isSelected,
          // Normal
          'border-border hover:border-primary/50 hover:bg-muted/50':
            validation.type === 'allowed' && !isSelected,
        }
      )}
      aria-selected={isSelected}
      role="option"
    >
      {/* Stage color indicator */}
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      {/* Stage info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {stage.labelEs || stage.label}
          </span>
          {stage.probability !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {stage.probability}%
            </Badge>
          )}
        </div>
        {validation.reasonEs && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {validation.reasonEs}
          </p>
        )}
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {isCurrent && (
          <Badge variant="outline" className="text-xs">
            Actual
          </Badge>
        )}
        {isBlocked && !isCurrent && (
          <Lock className="w-4 h-4 text-red-500" />
        )}
        {isWarning && !isSelected && (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        )}
        {requiresData && !isSelected && (
          <MessageSquare className="w-4 h-4 text-blue-500" />
        )}
        {isSelected && <Check className="w-4 h-4 text-primary" />}
        {validation.type === 'allowed' && !isSelected && !isCurrent && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

// ============================================
// Move To Dialog Component
// ============================================

export function MoveToDialog<T = unknown>({
  isOpen,
  item,
  currentStageId,
  stages,
  validateTransition,
  onMove,
  onClose,
  itemTitle,
  renderItemPreview,
}: MoveToDialogProps<T>) {
  // Selected stage
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(
    null
  );
  // Reason (for requires_data transitions)
  const [reason, setReason] = React.useState('');
  // Loading state
  const [isMoving, setIsMoving] = React.useState(false);

  // Get current stage
  const currentStage = stages.find((s) => s.id === currentStageId);

  // Get validation for selected stage
  const selectedValidation = selectedStageId
    ? validateTransition(selectedStageId)
    : null;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStageId(null);
      setReason('');
      setIsMoving(false);
    }
  }, [isOpen]);

  // Handle move
  const handleMove = async () => {
    if (!selectedStageId || !selectedValidation?.allowed) return;

    setIsMoving(true);
    try {
      await onMove(
        selectedStageId,
        selectedValidation.type === 'requires_data' ? reason : undefined
      );
      onClose();
    } finally {
      setIsMoving(false);
    }
  };

  // Check if can submit
  const canSubmit =
    selectedStageId &&
    selectedValidation?.allowed &&
    (selectedValidation.type !== 'requires_data' || reason.trim().length > 0);

  // Display title
  const displayTitle = itemTitle || item?.id || 'elemento';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Mover a otra etapa
          </DialogTitle>
          <DialogDescription>
            Selecciona la etapa destino para &quot;{displayTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {/* Current stage indicator */}
        {currentStage && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Etapa actual:</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentStage.color }}
              />
              <span className="font-medium">
                {currentStage.labelEs || currentStage.label}
              </span>
            </div>
          </div>
        )}

        {/* Item preview (optional) */}
        {item && renderItemPreview && (
          <div className="p-3 rounded-lg border bg-card">
            {renderItemPreview(item)}
          </div>
        )}

        {/* Stage options */}
        <ScrollArea className="max-h-[300px] pr-4">
          <div
            className="space-y-2"
            role="listbox"
            aria-label="Seleccionar etapa destino"
          >
            {stages.map((stage) => {
              const validation = validateTransition(stage.id);
              const isCurrent = stage.id === currentStageId;
              const isSelected = stage.id === selectedStageId;

              return (
                <StageOption
                  key={stage.id}
                  stage={stage}
                  validation={validation}
                  isSelected={isSelected}
                  isCurrent={isCurrent}
                  onClick={() => {
                    if (!isCurrent && validation.type !== 'blocked') {
                      setSelectedStageId(stage.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </ScrollArea>

        {/* Warning message for selected stage */}
        {selectedValidation?.type === 'warning' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {selectedValidation.reasonEs || selectedValidation.reason}
            </p>
          </div>
        )}

        {/* Reason input for requires_data transitions */}
        {selectedValidation?.type === 'requires_data' && (
          <div className="space-y-2">
            <Label htmlFor="move-reason">
              Razón del cambio <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="move-reason"
              placeholder="Ingresa la razón para este cambio de etapa..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este campo es obligatorio para esta transición.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!canSubmit || isMoving}
            className="gap-2"
          >
            {isMoving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Moviendo...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Mover
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MoveToDialog;
