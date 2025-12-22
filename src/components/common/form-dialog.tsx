'use client';

import * as React from 'react';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface FormDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Title for the dialog */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Form content (children) */
  children: React.ReactNode;
  /** ID for the form element (required for submit button) */
  formId: string;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Text for the submit button (default: "Guardar") */
  submitText?: string;
  /** Text shown while submitting (default: "Guardando...") */
  submittingText?: string;
  /** Text for the cancel button (default: "Cancelar") */
  cancelText?: string;
  /** Maximum width class (default: "max-w-lg") */
  maxWidth?: 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';
  /** Whether content should be scrollable */
  scrollable?: boolean;
  /** Additional footer content (rendered before buttons) */
  footerContent?: React.ReactNode;
  /** Callback for custom cancel behavior */
  onCancel?: () => void;
}

// ============================================
// Component
// ============================================

/**
 * Generic form dialog wrapper for create/edit operations.
 * Works with react-hook-form or any form implementation.
 *
 * @example
 * ```tsx
 * <FormDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title={lead ? 'Editar Lead' : 'Nuevo Lead'}
 *   description="Completa la informacion del lead"
 *   formId="lead-form"
 *   isSubmitting={createLead.isPending || updateLead.isPending}
 *   submitText={lead ? 'Guardar Cambios' : 'Crear Lead'}
 *   maxWidth="max-w-2xl"
 *   scrollable
 * >
 *   <form id="lead-form" onSubmit={handleSubmit(onSubmit)}>
 *     {form fields}
 *   </form>
 * </FormDialog>
 * ```
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
  formId,
  isSubmitting = false,
  submitText = 'Guardar',
  submittingText = 'Guardando...',
  cancelText = 'Cancelar',
  maxWidth = 'max-w-lg',
  scrollable = false,
  footerContent,
  onCancel,
}: FormDialogProps) {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          maxWidth,
          scrollable && 'max-h-[90vh] overflow-y-auto'
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {children}

        <DialogFooter className="gap-2 sm:gap-0">
          {footerContent}
          <Button
            disabled={isSubmitting}
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            disabled={isSubmitting}
            form={formId}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {submittingText}
              </>
            ) : (
              submitText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Form Dialog Trigger (optional helper)
// ============================================

export interface FormDialogTriggerProps {
  /** Trigger element */
  children: React.ReactNode;
  /** Callback when triggered */
  onClick: () => void;
}

/**
 * Optional trigger button wrapper for FormDialog
 */
export function FormDialogTrigger({ children, onClick }: FormDialogTriggerProps) {
  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      {children}
    </div>
  );
}
