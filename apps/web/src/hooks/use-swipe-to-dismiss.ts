'use client';

/**
 * useSwipeToDismiss Hook - v1.0
 *
 * Custom hook for implementing swipe-to-dismiss gesture on mobile.
 * Features smooth animations and dynamic visual feedback.
 *
 * @module hooks/use-swipe-to-dismiss
 */

import * as React from 'react';

// ============================================
// Types
// ============================================

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface SwipeState {
  /** Whether user is currently swiping */
  isSwiping: boolean;
  /** Current swipe offset in pixels */
  offset: number;
  /** Progress from 0 to 1 (1 = threshold reached) */
  progress: number;
  /** Whether threshold has been reached */
  shouldDismiss: boolean;
  /** Velocity of the swipe (pixels per ms) */
  velocity: number;
}

export interface UseSwipeToDismissOptions {
  /** Direction of swipe to dismiss */
  direction?: SwipeDirection;
  /** Threshold in pixels to trigger dismiss (default: 100) */
  threshold?: number;
  /** Minimum velocity to trigger dismiss regardless of threshold (px/ms) */
  velocityThreshold?: number;
  /** Called when swipe exceeds threshold and should dismiss */
  onDismiss?: () => void;
  /** Whether the gesture is enabled */
  enabled?: boolean;
  /** Resistance factor (0-1) - higher = more resistance */
  resistance?: number;
}

export interface UseSwipeToDismissReturn {
  /** Ref to attach to the swipeable element */
  ref: React.RefObject<HTMLDivElement>;
  /** Current swipe state */
  state: SwipeState;
  /** Inline styles to apply for smooth animation */
  style: React.CSSProperties;
  /** Props to spread on the drag handle element */
  handleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

// ============================================
// Constants
// ============================================

const DEFAULT_THRESHOLD = 100;
const DEFAULT_VELOCITY_THRESHOLD = 0.5;
const DEFAULT_RESISTANCE = 0.5;

// ============================================
// Hook Implementation
// ============================================

export function useSwipeToDismiss(
  options: UseSwipeToDismissOptions = {}
): UseSwipeToDismissReturn {
  const {
    direction = 'down',
    threshold = DEFAULT_THRESHOLD,
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    onDismiss,
    enabled = true,
    resistance = DEFAULT_RESISTANCE,
  } = options;

  const ref = React.useRef<HTMLDivElement>(null);

  // Touch tracking state
  const [state, setState] = React.useState<SwipeState>({
    isSwiping: false,
    offset: 0,
    progress: 0,
    shouldDismiss: false,
    velocity: 0,
  });

  // Internal refs for tracking
  const startY = React.useRef(0);
  const startX = React.useRef(0);
  const startTime = React.useRef(0);
  const lastY = React.useRef(0);
  const lastX = React.useRef(0);
  const lastTime = React.useRef(0);
  const isTracking = React.useRef(false);

  // Calculate offset based on direction
  const getOffset = React.useCallback(
    (clientX: number, clientY: number): number => {
      switch (direction) {
        case 'down':
          return Math.max(0, clientY - startY.current);
        case 'up':
          return Math.max(0, startY.current - clientY);
        case 'right':
          return Math.max(0, clientX - startX.current);
        case 'left':
          return Math.max(0, startX.current - clientX);
        default:
          return 0;
      }
    },
    [direction]
  );

  // Apply resistance to make swiping feel natural
  const applyResistance = React.useCallback(
    (offset: number): number => {
      // Rubber band effect - gets harder to swipe further
      const maxOffset = threshold * 2;
      const progress = Math.min(offset / maxOffset, 1);
      const resistedOffset = offset * (1 - progress * resistance);
      return resistedOffset;
    },
    [threshold, resistance]
  );

  // Calculate velocity
  const getVelocity = React.useCallback(
    (clientX: number, clientY: number, time: number): number => {
      const timeDelta = time - lastTime.current;
      if (timeDelta <= 0) return 0;

      const distance =
        direction === 'down' || direction === 'up'
          ? Math.abs(clientY - lastY.current)
          : Math.abs(clientX - lastX.current);

      return distance / timeDelta;
    },
    [direction]
  );

  // Handle touch/mouse start
  const handleStart = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;

      startX.current = clientX;
      startY.current = clientY;
      lastX.current = clientX;
      lastY.current = clientY;
      startTime.current = Date.now();
      lastTime.current = Date.now();
      isTracking.current = true;

      setState((prev) => ({
        ...prev,
        isSwiping: true,
        offset: 0,
        progress: 0,
        shouldDismiss: false,
        velocity: 0,
      }));
    },
    [enabled]
  );

  // Handle touch/mouse move
  const handleMove = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!isTracking.current || !enabled) return;

      const rawOffset = getOffset(clientX, clientY);
      const offset = applyResistance(rawOffset);
      const progress = Math.min(rawOffset / threshold, 1);
      const currentTime = Date.now();
      const velocity = getVelocity(clientX, clientY, currentTime);

      // Update last position
      lastX.current = clientX;
      lastY.current = clientY;
      lastTime.current = currentTime;

      setState({
        isSwiping: true,
        offset,
        progress,
        shouldDismiss: progress >= 1,
        velocity,
      });
    },
    [enabled, getOffset, applyResistance, threshold, getVelocity]
  );

  // Handle touch/mouse end
  const handleEnd = React.useCallback(() => {
    if (!isTracking.current) return;

    isTracking.current = false;

    const { progress, velocity } = state;
    const shouldDismiss =
      progress >= 1 || velocity >= velocityThreshold;

    if (shouldDismiss && onDismiss) {
      // Trigger dismiss with a slight delay for animation
      onDismiss();
    }

    // Reset state with animation
    setState((prev) => ({
      ...prev,
      isSwiping: false,
      offset: shouldDismiss ? prev.offset : 0,
      progress: shouldDismiss ? prev.progress : 0,
      shouldDismiss: false,
      velocity: 0,
    }));
  }, [state, velocityThreshold, onDismiss]);

  // Touch event handlers
  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleStart(touch.clientX, touch.clientY);
      }
    },
    [handleStart]
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
        // Prevent scroll while swiping
        if (state.isSwiping && state.offset > 10) {
          e.preventDefault();
        }
      }
    },
    [handleMove, state.isSwiping, state.offset]
  );

  const onTouchEnd = React.useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers (for desktop testing)
  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);

      const onMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const onMouseUp = () => {
        handleEnd();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [handleStart, handleMove, handleEnd]
  );

  // Calculate transform style based on direction
  const getTransformStyle = React.useCallback((): React.CSSProperties => {
    const { offset, isSwiping } = state;

    const transform = (() => {
      switch (direction) {
        case 'down':
          return `translateY(${offset}px)`;
        case 'up':
          return `translateY(-${offset}px)`;
        case 'right':
          return `translateX(${offset}px)`;
        case 'left':
          return `translateX(-${offset}px)`;
        default:
          return 'none';
      }
    })();

    return {
      transform,
      transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      willChange: isSwiping ? 'transform' : 'auto',
    };
  }, [state, direction]);

  return {
    ref,
    state,
    style: getTransformStyle(),
    handleProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
    },
  };
}

export default useSwipeToDismiss;
