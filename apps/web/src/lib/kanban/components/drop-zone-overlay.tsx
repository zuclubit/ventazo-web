'use client';

/**
 * DropZoneOverlay Component
 *
 * Visual feedback overlay for drag & drop operations.
 * Shows valid/invalid drop states with animations.
 *
 * @version 1.0.0
 * @module components/DropZoneOverlay
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowDown, Ban, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DropZoneState, StageTransitionValidation } from '../types';

// ============================================
// Types
// ============================================

export interface DropZoneOverlayProps {
  /** Drop zone state */
  state: DropZoneState;
  /** Validation result */
  validation?: StageTransitionValidation;
  /** Show message */
  showMessage?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Animation Variants
// ============================================

const overlayVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: 0.05,
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

// ============================================
// Shake Animation (for invalid drops)
// ============================================

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// ============================================
// Component
// ============================================

export function DropZoneOverlay({
  state,
  validation,
  showMessage = true,
  className,
}: DropZoneOverlayProps) {
  const { isOver, isValidDrop, isInvalidDrop } = state;

  // Only show when hovering
  const isVisible = isOver && (isValidDrop || isInvalidDrop);

  // Determine style based on state
  const getOverlayStyle = () => {
    if (isInvalidDrop) {
      return {
        icon: validation?.type === 'blocked' ? Ban : AlertTriangle,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500',
        iconColor: 'text-red-500',
        ringColor: 'ring-red-500/50',
        message: validation?.reasonEs || validation?.reason || 'Movimiento no permitido',
      };
    }

    if (validation?.type === 'warning') {
      return {
        icon: AlertTriangle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500',
        iconColor: 'text-amber-500',
        ringColor: 'ring-amber-500/50',
        message: validation?.reasonEs || validation?.reason || 'Advertencia',
      };
    }

    return {
      icon: isValidDrop ? Check : ArrowDown,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500',
      iconColor: 'text-emerald-500',
      ringColor: 'ring-emerald-500/50',
      message: 'Soltar aquí',
    };
  };

  const style = getOverlayStyle();
  const Icon = style.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={isInvalidDrop ? { ...overlayVariants, ...shakeVariants } : overlayVariants}
          initial="hidden"
          animate={isInvalidDrop ? ['visible', 'shake'] : 'visible'}
          exit="exit"
          className={cn(
            'absolute inset-0 z-10 pointer-events-none',
            'flex flex-col items-center justify-center',
            'border-2 border-dashed rounded-lg',
            style.bgColor,
            style.borderColor,
            className
          )}
        >
          {/* Pulsing background */}
          <motion.div
            variants={pulseVariants}
            animate="animate"
            className={cn(
              'absolute inset-0 rounded-lg',
              style.bgColor
            )}
          />

          {/* Icon */}
          <motion.div
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'relative z-10 w-12 h-12 rounded-full flex items-center justify-center',
              'bg-background shadow-lg ring-4',
              style.ringColor
            )}
          >
            <Icon className={cn('w-6 h-6', style.iconColor)} />
          </motion.div>

          {/* Message */}
          {showMessage && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'relative z-10 mt-3 px-3 py-1.5 rounded-full',
                'text-sm font-medium bg-background shadow-md',
                style.iconColor
              )}
            >
              {style.message}
            </motion.p>
          )}

          {/* Ring effect */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute inset-0 rounded-lg border-4',
              style.borderColor,
              'opacity-30'
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Simple Drop Indicator (without framer-motion)
// ============================================

export interface SimpleDropIndicatorProps {
  /** Whether is a valid drop target */
  isValid: boolean;
  /** Whether currently hovering */
  isOver: boolean;
  /** Validation message */
  message?: string;
  /** Custom class name */
  className?: string;
}

export function SimpleDropIndicator({
  isValid,
  isOver,
  message,
  className,
}: SimpleDropIndicatorProps) {
  if (!isOver) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 pointer-events-none',
        'flex flex-col items-center justify-center gap-2',
        'border-2 border-dashed rounded-lg transition-all duration-200',
        isValid
          ? 'bg-emerald-500/10 border-emerald-500'
          : 'bg-red-500/10 border-red-500 animate-shake',
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-background shadow-lg',
          isValid ? 'ring-2 ring-emerald-500' : 'ring-2 ring-red-500'
        )}
      >
        {isValid ? (
          <Check className="w-5 h-5 text-emerald-500" />
        ) : (
          <Ban className="w-5 h-5 text-red-500" />
        )}
      </div>
      {message && (
        <p
          className={cn(
            'text-xs font-medium px-2 py-1 rounded bg-background shadow',
            isValid ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default DropZoneOverlay;
