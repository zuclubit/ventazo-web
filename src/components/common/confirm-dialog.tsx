'use client';

import * as React from 'react';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Info,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning' | 'success' | 'info';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Title for the dialog */
  title: string;
  /** Description or content for the dialog */
  description: string | React.ReactNode;
  /** Visual variant (affects icon and button colors) */
  variant?: ConfirmDialogVariant;
  /** Custom icon (overrides variant icon) */
  icon?: LucideIcon;
  /** Text for the confirm button (default based on variant) */
  confirmText?: string;
  /** Text shown while confirming */
  confirmingText?: string;
  /** Text for the cancel button (default: "Cancelar") */
  cancelText?: string;
  /** Whether the confirm operation is pending */
  isPending?: boolean;
  /** Additional content below description */
  children?: React.ReactNode;
}

// ============================================
// Variant Configuration
// ============================================

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: LucideIcon;
    iconClass: string;
    buttonVariant: ButtonProps['variant'];
    defaultConfirmText: string;
  }
> = {
  default: {
    icon: HelpCircle,
    iconClass: 'text-muted-foreground',
    buttonVariant: 'default',
    defaultConfirmText: 'Confirmar',
  },
  destructive: {
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    buttonVariant: 'destructive',
    defaultConfirmText: 'Eliminar',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-yellow-500',
    buttonVariant: 'default',
    defaultConfirmText: 'Continuar',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    buttonVariant: 'default',
    defaultConfirmText: 'Aceptar',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    buttonVariant: 'default',
    defaultConfirmText: 'Entendido',
  },
};

// ============================================
// Component
// ============================================

/**
 * Generic confirmation dialog for various actions.
 *
 * @example
 * ```tsx
 * // Destructive confirmation
 * <ConfirmDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleArchive}
 *   title="Archivar Lead"
 *   description="El lead sera movido al archivo. Podras restaurarlo mas tarde."
 *   variant="warning"
 *   confirmText="Archivar"
 * />
 *
 * // Simple confirmation
 * <ConfirmDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleAssign}
 *   title="Asignar Lead"
 *   description="Se asignara el lead al usuario seleccionado."
 *   variant="default"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'default',
  icon: CustomIcon,
  confirmText,
  confirmingText = 'Procesando...',
  cancelText = 'Cancelar',
  isPending = false,
  children,
}: ConfirmDialogProps) {
  const [internalPending, setInternalPending] = React.useState(false);
  const isLoading = isPending || internalPending;

  const config = variantConfig[variant];
  const Icon = CustomIcon || config.icon;
  const buttonText = confirmText || config.defaultConfirmText;

  const handleConfirm = async () => {
    setInternalPending(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm operation failed:', error);
    } finally {
      setInternalPending(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isLoading) {
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.iconClass)} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <Button
            disabled={isLoading}
            variant={config.buttonVariant}
            onClick={handleConfirm}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {confirmingText}
              </>
            ) : (
              buttonText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================
// Convenience Hook
// ============================================

export interface UseConfirmDialogOptions {
  title: string;
  description: string | React.ReactNode;
  variant?: ConfirmDialogVariant;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Hook for programmatic confirm dialog usage.
 *
 * @example
 * ```tsx
 * const { dialog, confirm } = useConfirmDialog({
 *   title: 'Confirmar accion',
 *   description: 'Esta seguro?',
 *   onConfirm: async () => {
 *     await doSomething();
 *   },
 * });
 *
 * return (
 *   <>
 *     <Button onClick={confirm}>Hacer algo</Button>
 *     {dialog}
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(options: UseConfirmDialogOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const confirm = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleConfirm = React.useCallback(async () => {
    setIsPending(true);
    try {
      await options.onConfirm();
    } finally {
      setIsPending(false);
    }
  }, [options]);

  const dialog = (
    <ConfirmDialog
      description={options.description}
      isPending={isPending}
      open={isOpen}
      title={options.title}
      variant={options.variant}
      confirmText={options.confirmText}
      onClose={() => setIsOpen(false)}
      onConfirm={handleConfirm}
    />
  );

  return { dialog, confirm, isOpen, setIsOpen };
}
