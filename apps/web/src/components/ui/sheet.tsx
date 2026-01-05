'use client';

/**
 * Sheet Component - v6.0 (Ventazo 2025 Design System)
 *
 * Responsive side panel with CSS-first design, mobile-optimized behavior,
 * and swipe-to-dismiss gesture support.
 *
 * Design Principles:
 * - CSS-only responsive widths with size variants
 * - Mobile-first: full-screen on mobile, side panel on desktop
 * - Smooth animations with different behaviors per breakpoint
 * - Swipe-to-dismiss with dynamic color indicator
 * - Proper overflow handling with safe area support
 * - WCAG 2.1 AA compliant focus management
 * - Centralized z-index system (2025 best practices)
 *
 * Z-Index Architecture:
 * - Overlay: z-50 (sheetOverlay) - covers all content below
 * - Content: z-[60] (sheet) - above overlay and navigation
 * - Bottom bar: z-[35] - always below sheet overlays
 *
 * @version 6.0.0
 * @see https://ui.shadcn.com/docs/components/sheet
 */

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwipeToDismiss, type SwipeDirection, type SwipeState } from '@/hooks/use-swipe-to-dismiss';
import { zIndexClasses } from '@/lib/theme/z-index';

// ============================================
// Base Components
// ============================================

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

// ============================================
// Overlay
// ============================================

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      // z-50 (sheetOverlay) - above navigation (z-35), below content (z-60)
      'fixed inset-0',
      zIndexClasses.sheetOverlay,
      'bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// ============================================
// SwipeHandle Component (Dynamic Color Indicator)
// ============================================

interface SwipeHandleProps {
  /** Current swipe state for visual feedback */
  swipeState: SwipeState;
  /** Props to spread for swipe handling */
  handleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
  };
  /** Side of the sheet (affects swipe direction) */
  side: SheetSide;
}

/**
 * SwipeHandle - Visual drag handle with dynamic color feedback
 *
 * Color progression:
 * - Idle: Neutral gray (foreground/20)
 * - Swiping (0-50%): Transitions to blue
 * - Swiping (50-80%): Transitions to amber/warning
 * - Swiping (80-100%): Transitions to red/danger (close threshold)
 * - Released: Springs back with smooth animation
 */
const SwipeHandle = React.forwardRef<HTMLDivElement, SwipeHandleProps>(
  ({ swipeState, handleProps, side }, ref) => {
    const { progress, isSwiping, shouldDismiss } = swipeState;

    // Calculate dynamic color based on progress
    const getHandleColor = () => {
      if (!isSwiping) return 'bg-foreground/20';

      if (progress < 0.3) {
        // 0-30%: Neutral to blue transition
        return 'bg-blue-400';
      } else if (progress < 0.6) {
        // 30-60%: Blue to amber transition
        return 'bg-amber-400';
      } else if (progress < 0.85) {
        // 60-85%: Amber to orange
        return 'bg-orange-500';
      } else {
        // 85-100%: Red - close threshold reached
        return 'bg-red-500';
      }
    };

    // Calculate handle width expansion based on progress
    const getHandleWidth = () => {
      if (!isSwiping) return 'w-10';
      const expandedWidth = 40 + (progress * 24); // 40px to 64px
      return `w-[${Math.min(expandedWidth, 64)}px]`;
    };

    // Dynamic styling
    const handleStyle: React.CSSProperties = {
      width: isSwiping ? `${40 + (progress * 24)}px` : '40px',
      height: isSwiping ? `${4 + (progress * 2)}px` : '4px',
      transform: shouldDismiss ? 'scale(1.1)' : 'scale(1)',
      opacity: isSwiping ? 0.9 + (progress * 0.1) : 0.7,
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex justify-center items-center',
          'py-3 cursor-grab active:cursor-grabbing',
          // Touch target area - minimum 44px for accessibility
          'min-h-[44px]',
          // Prevent text selection during drag
          'select-none touch-none'
        )}
        aria-hidden="true"
        {...handleProps}
      >
        <div
          className={cn(
            'rounded-full transition-all duration-150 ease-out',
            getHandleColor(),
            // Glow effect when approaching threshold
            isSwiping && progress > 0.6 && 'shadow-lg',
            shouldDismiss && 'shadow-red-500/50 shadow-lg'
          )}
          style={handleStyle}
        />
        {/* Visual feedback text (only when swiping and near threshold) */}
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
  }
);
SwipeHandle.displayName = 'SwipeHandle';

// ============================================
// Sheet Content Types
// ============================================

type SheetSide = 'top' | 'bottom' | 'left' | 'right';
type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  /** Side of the screen to render from */
  side?: SheetSide;
  /** Size variant for width control */
  size?: SheetSize;
  /** Hide the default close button */
  hideCloseButton?: boolean;
  /** Accessible title for screen readers (hidden visually if not provided explicitly) */
  accessibleTitle?: string;
  /** Enable full-screen behavior on mobile devices */
  mobileFullScreen?: boolean;
  /** Show a drag handle for mobile bottom sheets */
  showDragHandle?: boolean;
  /** Custom className for the overlay */
  overlayClassName?: string;
  /** Enable swipe-to-dismiss gesture (requires showDragHandle) */
  enableSwipeToDismiss?: boolean;
  /** Callback when sheet should be closed via swipe */
  onSwipeDismiss?: () => void;
}

// ============================================
// Animation Classes by Side
// ============================================

const slideAnimations: Record<SheetSide, string> = {
  top: 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
  bottom: 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  left: 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  right: 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
};

// ============================================
// Position Classes by Side
// ============================================

const positionClasses: Record<SheetSide, string> = {
  top: 'inset-x-0 top-0 border-b',
  bottom: 'inset-x-0 bottom-0 border-t',
  left: 'inset-y-0 left-0 h-full border-r',
  right: 'inset-y-0 right-0 h-full border-l',
};

// ============================================
// Size Configuration
// CSS-first responsive - no JavaScript detection needed
// ============================================

// Size variants for left/right sheets
const sizeWidthClasses: Record<SheetSize, string> = {
  sm: 'sm:w-[320px] sm:max-w-[calc(100vw-2rem)]',
  md: 'sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
  lg: 'sm:w-[540px] md:w-[600px] sm:max-w-[calc(100vw-2rem)]',
  xl: 'sm:w-[640px] md:w-[720px] sm:max-w-[calc(100vw-2rem)]',
  full: 'w-full',
};

// Mobile full-screen behavior classes
const mobileFullScreenClasses = {
  base: 'inset-0 w-full h-full rounded-none',
  animation: 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
};

// Default width by side (without mobileFullScreen)
// Mobile: 100% width, anchored to edges, no lateral margins
const defaultWidthClasses: Record<SheetSide, string> = {
  top: 'w-full inset-x-0',
  bottom: 'w-full inset-x-0 max-h-[90vh] rounded-t-2xl',
  // Left/Right: Full width on mobile (100vw), fixed max on larger screens
  left: 'w-screen sm:w-full',
  right: 'w-screen sm:w-full',
};

// ============================================
// Swipe Direction Mapping
// ============================================

const sideToSwipeDirection: Record<SheetSide, SwipeDirection> = {
  top: 'up',
  bottom: 'down',
  left: 'left',
  right: 'right',
};

// ============================================
// Sheet Content
// ============================================

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({
  side = 'right',
  size = 'md',
  className,
  children,
  hideCloseButton = false,
  accessibleTitle,
  mobileFullScreen = false,
  showDragHandle = false,
  overlayClassName,
  enableSwipeToDismiss = false,
  onSwipeDismiss,
  ...props
}, ref) => {
  // Determine if we're dealing with a horizontal sheet (left/right)
  const isHorizontal = side === 'left' || side === 'right';

  // Detect if on mobile (for swipe gestures)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Swipe-to-dismiss hook
  const swipeEnabled = enableSwipeToDismiss && showDragHandle && isMobile;
  const swipeDirection = sideToSwipeDirection[side];

  const {
    state: swipeState,
    style: swipeStyle,
    handleProps,
  } = useSwipeToDismiss({
    direction: swipeDirection,
    threshold: 100,
    velocityThreshold: 0.5,
    resistance: 0.4,
    enabled: swipeEnabled,
    onDismiss: onSwipeDismiss,
  });

  // Build responsive classes
  const getResponsiveClasses = () => {
    if (!isHorizontal) {
      // Top/bottom sheets keep their default behavior
      return defaultWidthClasses[side];
    }

    if (mobileFullScreen) {
      // Mobile: full-screen, Desktop: side panel with size
      return cn(
        // Mobile: full-screen
        mobileFullScreenClasses.base,
        // Desktop: reset to side panel behavior
        'sm:inset-auto sm:rounded-none',
        side === 'left' && 'sm:inset-y-0 sm:left-0',
        side === 'right' && 'sm:inset-y-0 sm:right-0',
        sizeWidthClasses[size],
        'sm:h-full'
      );
    }

    // Standard responsive: full width on mobile, sized on desktop
    return cn(defaultWidthClasses[side], sizeWidthClasses[size]);
  };

  // Determine animations
  const getAnimationClasses = () => {
    if (mobileFullScreen && isHorizontal) {
      // Mobile uses bottom slide, desktop uses side slide
      return cn(
        // Mobile animation (slide from bottom)
        mobileFullScreenClasses.animation,
        // Desktop animation (slide from side)
        side === 'left' && 'sm:data-[state=closed]:slide-out-to-left sm:data-[state=open]:slide-in-from-left',
        side === 'right' && 'sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right'
      );
    }
    return slideAnimations[side];
  };

  // Combine swipe styles with existing styles (only when swiping)
  const contentStyle: React.CSSProperties = swipeEnabled && swipeState.isSwiping
    ? swipeStyle
    : {};

  return (
    <SheetPortal>
      <SheetOverlay
        className={overlayClassName}
        // Dim overlay based on swipe progress
        style={swipeEnabled && swipeState.isSwiping ? {
          opacity: 1 - (swipeState.progress * 0.5),
        } : undefined}
      />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          // Base styles - z-[60] (sheet) above overlay (z-50) and navigation (z-35)
          'fixed bg-background shadow-lg',
          zIndexClasses.sheet,
          // Border
          'border-border',
          // Animation - smooth and premium (disable during swipe)
          !swipeState.isSwiping && 'transition-all ease-out',
          'data-[state=closed]:duration-200 data-[state=open]:duration-300',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          getAnimationClasses(),
          // Position (only for non-mobileFullScreen or desktop)
          !mobileFullScreen && positionClasses[side],
          mobileFullScreen && isHorizontal && cn(
            side === 'left' && 'sm:border-r',
            side === 'right' && 'sm:border-l'
          ),
          // Responsive width/height
          getResponsiveClasses(),
          // Layout
          'flex flex-col',
          // Overflow
          'overflow-hidden',
          // Safe area padding for mobile
          mobileFullScreen && 'pb-safe-area-inset-bottom',
          // Custom className (allows override)
          className
        )}
        style={contentStyle}
        aria-describedby={undefined}
        {...props}
      >
        {/* Swipe-enabled Drag Handle with dynamic color indicator */}
        {showDragHandle && swipeEnabled && (
          <SwipeHandle
            swipeState={swipeState}
            handleProps={handleProps}
            side={side}
          />
        )}

        {/* Static Drag Handle (when swipe is disabled) */}
        {showDragHandle && !swipeEnabled && (
          <div className="flex justify-center py-3" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-foreground/20 transition-colors hover:bg-foreground/30" />
          </div>
        )}

        {/* Hidden title for accessibility when no visible title is provided */}
        {accessibleTitle && (
          <SheetPrimitive.Title className="sr-only">
            {accessibleTitle}
          </SheetPrimitive.Title>
        )}
        {children}
        {!hideCloseButton && (
          <SheetPrimitive.Close
            className={cn(
              'absolute z-10',
              // Position: adjust for mobile full-screen
              mobileFullScreen ? 'right-4 top-4 sm:right-4 sm:top-4' : 'right-4 top-4',
              'rounded-sm opacity-70 ring-offset-background',
              'transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:pointer-events-none data-[state=open]:bg-secondary',
              // Larger touch target on mobile
              'h-8 w-8 flex items-center justify-center sm:h-auto sm:w-auto'
            )}
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Cerrar</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

// ============================================
// Header, Footer, Title, Description
// ============================================

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      'shrink-0',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      'shrink-0',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

// ============================================
// Exports
// ============================================

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

// Type exports
export type { SheetSide, SheetSize, SheetContentProps };
