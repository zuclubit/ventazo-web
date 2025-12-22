'use client';

/**
 * Sheet Component - v3.0 (2025 World-Class)
 *
 * Responsive side panel with CSS-first design.
 *
 * Design Principles:
 * - CSS-only responsive widths
 * - No JavaScript for layout decisions
 * - Consistent animations
 * - Proper overflow handling
 * - Safe area support
 *
 * @see https://ui.shadcn.com/docs/components/sheet
 */

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// ============================================
// Sheet Content Types
// ============================================

type SheetSide = 'top' | 'bottom' | 'left' | 'right';

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  /** Side of the screen to render from */
  side?: SheetSide;
  /** Hide the default close button */
  hideCloseButton?: boolean;
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
// Default Width Classes by Side
// CSS-first responsive - no JavaScript detection needed
// ============================================

const defaultWidthClasses: Record<SheetSide, string> = {
  top: 'w-full',
  bottom: 'w-full',
  // Left/Right: Full width on mobile, fixed max on larger screens
  left: 'w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
  right: 'w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
};

// ============================================
// Sheet Content
// ============================================

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, hideCloseButton = false, ...props }, ref) => {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          // Base styles
          'fixed z-50 bg-background shadow-lg',
          // Animation
          'transition ease-in-out',
          'data-[state=closed]:duration-300 data-[state=open]:duration-500',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          slideAnimations[side],
          // Position
          positionClasses[side],
          // Default width
          defaultWidthClasses[side],
          // Layout
          'flex flex-col',
          // Overflow
          'overflow-hidden',
          // Custom className (allows override)
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <SheetPrimitive.Close
            className={cn(
              'absolute right-4 top-4 z-10',
              'rounded-sm opacity-70 ring-offset-background',
              'transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:pointer-events-none data-[state=open]:bg-secondary'
            )}
          >
            <X className="h-4 w-4" />
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
