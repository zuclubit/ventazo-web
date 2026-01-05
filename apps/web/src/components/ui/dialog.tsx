'use client';

/**
 * Dialog Component - v3.0 (Ventazo 2025 Design System)
 *
 * Responsive dialog with mobile-optimized bottom sheet behavior
 * and swipe-to-dismiss gesture support.
 *
 * Z-Index Architecture (2025 Best Practices):
 * - Dialog overlay: z-[70] (alertOverlay) - above sheets
 * - Dialog content: z-[75] (alert) - above overlay
 * - Below toasts (z-80) and global search (z-90)
 *
 * @version 3.0.0
 */

import * as React from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSwipeToDismiss, type SwipeState } from '@/hooks/use-swipe-to-dismiss';
import { zIndexClasses } from '@/lib/theme/z-index';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { style?: React.CSSProperties }
>(({ className, style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // z-[70] (alertOverlay) - above sheets (z-60), below toasts (z-80)
      'fixed inset-0 bg-black/80',
      zIndexClasses.alertOverlay,
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    style={style}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ============================================
// Dialog Swipe Handle (Mobile Only)
// ============================================

interface DialogSwipeHandleProps {
  swipeState: SwipeState;
  handleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

const DialogSwipeHandle = ({ swipeState, handleProps }: DialogSwipeHandleProps) => {
  const { progress, isSwiping, shouldDismiss } = swipeState;

  // Dynamic color based on swipe progress
  const getHandleColor = () => {
    if (!isSwiping) return 'bg-foreground/20';
    if (progress < 0.3) return 'bg-blue-400';
    else if (progress < 0.6) return 'bg-amber-400';
    else if (progress < 0.85) return 'bg-orange-500';
    else return 'bg-red-500';
  };

  const handleStyle: React.CSSProperties = {
    width: isSwiping ? `${40 + (progress * 24)}px` : '40px',
    height: isSwiping ? `${4 + (progress * 2)}px` : '4px',
    transform: shouldDismiss ? 'scale(1.1)' : 'scale(1)',
    opacity: isSwiping ? 0.9 + (progress * 0.1) : 0.7,
  };

  return (
    <div
      className={cn(
        'flex justify-center items-center relative',
        'py-3 cursor-grab active:cursor-grabbing',
        'min-h-[44px] select-none touch-none'
      )}
      aria-hidden="true"
      {...handleProps}
    >
      <div
        className={cn(
          'rounded-full transition-all duration-150 ease-out',
          getHandleColor(),
          isSwiping && progress > 0.6 && 'shadow-lg',
          shouldDismiss && 'shadow-red-500/50 shadow-lg'
        )}
        style={handleStyle}
      />
      {isSwiping && progress > 0.7 && (
        <span
          className={cn(
            'absolute text-xs font-medium mt-8 transition-opacity duration-150',
            shouldDismiss ? 'text-red-500 opacity-100' : 'text-muted-foreground opacity-70'
          )}
        >
          {shouldDismiss ? 'Soltar para cerrar' : 'Desliza para cerrar'}
        </span>
      )}
    </div>
  );
};

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Accessible title for screen readers (hidden visually if not provided explicitly) */
  accessibleTitle?: string;
  /** Custom className for the overlay */
  overlayClassName?: string;
  /** Enable swipe-to-dismiss on mobile */
  enableSwipeToDismiss?: boolean;
  /** Callback when dismissed via swipe */
  onSwipeDismiss?: () => void;
  /** Show drag handle on mobile */
  showDragHandle?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({
  className,
  children,
  accessibleTitle,
  overlayClassName,
  enableSwipeToDismiss = false,
  onSwipeDismiss,
  showDragHandle = false,
  ...props
}, ref) => {
  // Detect mobile
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const swipeEnabled = enableSwipeToDismiss && isMobile;

  const {
    state: swipeState,
    style: swipeStyle,
    handleProps,
  } = useSwipeToDismiss({
    direction: 'down',
    threshold: 100,
    velocityThreshold: 0.5,
    resistance: 0.4,
    enabled: swipeEnabled,
    onDismiss: onSwipeDismiss,
  });

  const contentStyle: React.CSSProperties = swipeEnabled && swipeState.isSwiping
    ? swipeStyle
    : {};

  return (
    <DialogPortal>
      <DialogOverlay
        className={overlayClassName}
        style={swipeEnabled && swipeState.isSwiping ? {
          opacity: 1 - (swipeState.progress * 0.5),
        } : undefined}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // z-[75] (alert) - above overlay (z-70), sheets (z-60), below toasts (z-80)
          // Base styles
          'fixed grid gap-4 border bg-background shadow-2xl',
          zIndexClasses.alert,
          !swipeState.isSwiping && 'duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          // Mobile: bottom sheet style, full width, no lateral margins
          'inset-x-0 bottom-0 w-full max-w-full p-4 pb-8',
          'rounded-t-2xl rounded-b-none',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          // Desktop (sm+): centered modal with max-width
          'sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]',
          'sm:w-full sm:max-w-lg sm:p-6',
          'sm:rounded-lg',
          'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
          'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
          className
        )}
        style={contentStyle}
        aria-describedby={undefined}
        {...props}
      >
        {/* Swipe-enabled drag handle (mobile only) */}
        {swipeEnabled && (showDragHandle || enableSwipeToDismiss) && (
          <DialogSwipeHandle swipeState={swipeState} handleProps={handleProps} />
        )}

        {/* Static drag handle (mobile, when swipe disabled) */}
        {!swipeEnabled && showDragHandle && isMobile && (
          <div className="flex justify-center py-2 -mt-2" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-foreground/20" />
          </div>
        )}

        {/* Hidden title for accessibility when no visible title is provided */}
        {accessibleTitle && (
          <DialogPrimitive.Title className="sr-only">
            {accessibleTitle}
          </DialogPrimitive.Title>
        )}
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
