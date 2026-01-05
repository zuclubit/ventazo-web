'use client';

/**
 * useCardInteractions Hook - Ventazo Design System 2025
 *
 * @description Standardized interaction patterns for cards.
 * Ensures consistent behavior across all modules.
 *
 * @features
 * - Click handling with debounce
 * - Keyboard navigation
 * - Focus management
 * - Action bubbling prevention
 * - Long press detection (mobile)
 *
 * @version 1.0.0
 */

import * as React from 'react';

// ============================================
// Types
// ============================================

export interface UseCardInteractionsProps {
  /** Click handler for the entire card */
  onClick?: () => void;
  /** Whether the card is interactive */
  isInteractive?: boolean;
  /** Whether to prevent double-clicks */
  preventDoubleClick?: boolean;
  /** Double-click cooldown in ms */
  doubleClickCooldown?: number;
  /** Enable long press for mobile context menu */
  enableLongPress?: boolean;
  /** Long press threshold in ms */
  longPressThreshold?: number;
  /** Long press handler */
  onLongPress?: () => void;
}

export interface UseCardInteractionsReturn {
  /** Props to spread on the card container */
  containerProps: {
    onClick: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onTouchEnd?: (e: React.TouchEvent) => void;
    onTouchCancel?: (e: React.TouchEvent) => void;
    tabIndex: number;
    role: string;
  };
  /** Handler to stop propagation (use on internal actions) */
  stopPropagation: (e: React.MouseEvent | React.KeyboardEvent) => void;
  /** Whether the card was recently clicked (for animation) */
  wasClicked: boolean;
  /** Whether long press is active */
  isLongPressing: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useCardInteractions({
  onClick,
  isInteractive = true,
  preventDoubleClick = true,
  doubleClickCooldown = 300,
  enableLongPress = false,
  longPressThreshold = 500,
  onLongPress,
}: UseCardInteractionsProps): UseCardInteractionsReturn {
  // Track last click time for debounce
  const lastClickTime = React.useRef<number>(0);

  // Track if card was recently clicked (for animations)
  const [wasClicked, setWasClicked] = React.useState(false);

  // Long press state
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Reset wasClicked after animation
  React.useEffect(() => {
    if (wasClicked) {
      const timer = setTimeout(() => setWasClicked(false), 150);
      return () => clearTimeout(timer);
    }
  }, [wasClicked]);

  // Cleanup long press timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Handle click with debounce
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive || !onClick) return;

      // Check for double click prevention
      if (preventDoubleClick) {
        const now = Date.now();
        if (now - lastClickTime.current < doubleClickCooldown) {
          return;
        }
        lastClickTime.current = now;
      }

      // Don't trigger if we just long-pressed
      if (isLongPressing) {
        setIsLongPressing(false);
        return;
      }

      setWasClicked(true);
      onClick();
    },
    [onClick, isInteractive, preventDoubleClick, doubleClickCooldown, isLongPressing]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!isInteractive || !onClick) return;

      // Enter or Space activates the card
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setWasClicked(true);
        onClick();
      }
    },
    [onClick, isInteractive]
  );

  // Stop propagation for internal actions
  const stopPropagation = React.useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
    },
    []
  );

  // Long press handlers
  const handleTouchStart = React.useCallback(
    (_e: React.TouchEvent) => {
      if (!enableLongPress || !onLongPress) return;

      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
        onLongPress();
      }, longPressThreshold);
    },
    [enableLongPress, onLongPress, longPressThreshold]
  );

  const handleTouchEnd = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Reset long press state after a short delay
    setTimeout(() => setIsLongPressing(false), 100);
  }, []);

  const handleTouchCancel = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  return {
    containerProps: {
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      ...(enableLongPress && {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
      }),
      tabIndex: isInteractive && onClick ? 0 : -1,
      role: onClick ? 'button' : 'article',
    },
    stopPropagation,
    wasClicked,
    isLongPressing,
  };
}

// ============================================
// UX Interaction Guidelines
// ============================================

/**
 * Card Interaction Patterns - Ventazo Design System
 *
 * ## Click Behavior
 * 1. Entire card is clickable → navigates to detail
 * 2. Internal buttons use stopPropagation
 * 3. Double-click prevention is ON by default
 *
 * ## Hover States
 * 1. Card: shadow increase + subtle lift (-0.5px)
 * 2. Internal actions: opacity reveal on hover
 * 3. No hover on touch devices
 *
 * ## Focus States
 * 1. Visible focus ring (2px, tenant-primary)
 * 2. Ring offset for visibility
 * 3. Tab navigation in logical order
 *
 * ## Drag & Drop
 * 1. Card rotates 2deg when dragging
 * 2. Scale 105% for visibility
 * 3. Shadow increases significantly
 * 4. Original position shows ghost
 *
 * ## Loading States
 * 1. Opacity reduced to 70%
 * 2. Spinner overlay centered
 * 3. Pointer events remain active
 *
 * ## Mobile Considerations
 * 1. Minimum touch target: 44x44px
 * 2. Long press for context menu
 * 3. Swipe gestures where appropriate
 */
export const INTERACTION_GUIDELINES = {
  click: {
    debounce: 300,
    feedback: 'scale + shadow',
  },
  hover: {
    lift: '-0.5px translate-y',
    shadow: 'increase to hover level',
    transition: '150-200ms',
  },
  focus: {
    ring: '2px solid tenant-primary',
    offset: '2px',
    outline: 'none (use ring)',
  },
  drag: {
    rotation: '2deg',
    scale: '105%',
    shadow: 'dragging level',
    zIndex: 50,
  },
  loading: {
    opacity: '70%',
    overlay: 'semi-transparent with spinner',
    interactive: true,
  },
  touch: {
    minTarget: '44px',
    longPress: '500ms',
  },
} as const;
