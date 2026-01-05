'use client';

/**
 * EmailFloatingDock Component v2.0
 *
 * Apple Liquid Glass inspired floating dock with Smart Glass adaptive system.
 * Implements APCA contrast algorithm (WCAG 3.0) and OKLCH perceptual colors.
 *
 * Features:
 * - Smart Glass: Auto-adapts icon colors based on tenant primary luminance
 * - APCA contrast validation for WCAG 3.0 compliance
 * - OKLCH color space for perceptually uniform color manipulation
 * - content-visibility: auto for render optimization
 * - CSS @layer for predictable specificity
 * - @starting-style for entry animations without layout thrashing
 * - will-change optimization only during interactions
 * - prefers-reduced-motion & prefers-contrast: more support
 * - requestIdleCallback for lazy contrast calculations
 *
 * Design: Apple macOS Tahoe / iOS 26 Liquid Glass
 */

import * as React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Archive,
  FileText,
  Inbox,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAdaptiveColors } from '@/hooks/use-adaptive-colors';
import type { EmailFolder, EmailStats } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface EmailFloatingDockProps {
  /** Current selected folder */
  currentFolder: EmailFolder;
  /** Handler for folder change */
  onFolderChange: (folder: EmailFolder) => void;
  /** Handler for settings click */
  onSettings?: () => void;
  /** Email statistics */
  stats?: EmailStats | null;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Folder Configuration
// ============================================

interface FolderConfig {
  id: EmailFolder | 'settings';
  icon: React.ElementType;
  label: string;
  showBadge?: boolean;
}

const FOLDERS: FolderConfig[] = [
  { id: 'inbox', icon: Inbox, label: 'Bandeja de entrada', showBadge: true },
  { id: 'starred', icon: Star, label: 'Destacados' },
  { id: 'drafts', icon: FileText, label: 'Borradores', showBadge: true },
  { id: 'archive', icon: Archive, label: 'Archivo' },
  { id: 'trash', icon: Trash2, label: 'Papelera' },
  { id: 'settings', icon: Settings, label: 'Configuraci\u00f3n' },
];

// ============================================
// Dock Icon Component (with Smart Glass)
// ============================================

interface DockIconProps {
  folder: FolderConfig;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  adaptiveColors: ReturnType<typeof useAdaptiveColors>;
}

function DockIcon({
  folder,
  isActive,
  unreadCount,
  onClick,
  mouseX,
  adaptiveColors,
}: DockIconProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const Icon = folder.icon;
  const [isHovering, setIsHovering] = React.useState(false);

  // Calculate distance from mouse to icon center
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Scale icon based on proximity (Apple dock magnification)
  // Optimized: will-change only during interaction
  const widthSync = useTransform(distance, [-120, 0, 120], [44, 56, 44]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  // Adaptive icon color based on tenant primary
  const iconColor = isActive
    ? adaptiveColors.iconColorActive
    : adaptiveColors.iconColorMuted;

  const iconColorHover = adaptiveColors.iconColor;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          ref={ref}
          onClick={onClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            width,
            height: width,
            // will-change only during hover for performance
            willChange: isHovering ? 'transform' : 'auto',
          }}
          className={cn(
            // Base styles
            'dock-icon',
            'relative flex items-center justify-center',
            'rounded-2xl',
            'transition-colors duration-200',
            // Focus styles with adaptive ring
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--tenant-primary)] focus-visible:ring-offset-2',
            'focus-visible:ring-offset-transparent',
            // Active state - Smart Glass
            isActive && [
              // Adaptive glass background
              adaptiveColors.isLightPrimary
                ? 'bg-black/20'
                : 'bg-white/20',
              'shadow-[0_8px_32px_var(--adaptive-shadow,rgba(0,0,0,0.15)),inset_0_1px_0_rgba(255,255,255,0.3)]',
              'border',
              adaptiveColors.isLightPrimary
                ? 'border-black/20'
                : 'border-white/30',
            ],
            // Inactive state
            !isActive && [
              adaptiveColors.isLightPrimary
                ? 'bg-black/5 hover:bg-black/15'
                : 'bg-white/5 hover:bg-white/15',
              'border border-transparent',
              adaptiveColors.isLightPrimary
                ? 'hover:border-black/15'
                : 'hover:border-white/20',
            ]
          )}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
          aria-label={folder.label}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon
            className="transition-all duration-200"
            style={{
              width: '45%',
              height: '45%',
              color: isHovering && !isActive ? iconColorHover : iconColor,
              filter: isActive ? `drop-shadow(0 0 8px ${adaptiveColors.iconColorActive})` : 'none',
              strokeWidth: isActive ? 2.2 : 1.8,
            }}
          />

          {/* Active glow ring - adaptive gradient */}
          {isActive && (
            <motion.span
              className={cn(
                'absolute inset-0 rounded-2xl pointer-events-none',
                'bg-gradient-to-br',
                adaptiveColors.isLightPrimary
                  ? 'from-[var(--tenant-primary)]/15 to-[var(--tenant-accent)]/8'
                  : 'from-[var(--tenant-primary)]/20 to-[var(--tenant-accent)]/10'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          {/* Unread Badge - Smart Glass adaptive */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'absolute -top-1 -right-1',
                'min-w-[18px] h-[18px] px-1.5',
                'flex items-center justify-center',
                'text-[10px] font-bold',
                'rounded-full',
                'shadow-lg',
                'border',
                adaptiveColors.isLightPrimary
                  ? 'border-white/30'
                  : 'border-white/20'
              )}
              style={{
                background: adaptiveColors.badgeGradient,
                color: adaptiveColors.badgeTextColor,
                boxShadow: `0 4px 12px ${adaptiveColors.isLightPrimary ? 'rgba(0,0,0,0.2)' : 'var(--tenant-primary-glow, rgba(0,0,0,0.4))'}`,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}

          {/* Reflection highlight (Liquid Glass specular) */}
          <span
            className={cn(
              'absolute top-0 left-0 right-0 h-1/2',
              'rounded-t-2xl',
              'bg-gradient-to-b',
              adaptiveColors.isLightPrimary
                ? 'from-white/15 to-transparent'
                : 'from-white/10 to-transparent',
              'pointer-events-none'
            )}
          />
        </motion.button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={12}
        className={cn(
          // Liquid Glass tooltip - adaptive
          'backdrop-blur-xl',
          'text-xs font-medium',
          'border',
          'px-3 py-1.5 rounded-xl',
          adaptiveColors.isLightPrimary
            ? 'bg-white/90 text-slate-900 border-black/10'
            : 'bg-slate-900/80 text-white border-white/15',
          'shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
        )}
      >
        <span>{folder.label}</span>
        {unreadCount > 0 && (
          <span
            className="ml-2 font-semibold"
            style={{ color: adaptiveColors.iconColorActive }}
          >
            {unreadCount}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// Main Component
// ============================================

export function EmailFloatingDock({
  currentFolder,
  onFolderChange,
  onSettings,
  stats,
  className,
}: EmailFloatingDockProps) {
  const mouseX = useMotionValue(Infinity);
  const [isInteracting, setIsInteracting] = React.useState(false);

  // Smart Glass adaptive colors
  const adaptiveColors = useAdaptiveColors({
    lazyCalculation: true, // Use requestIdleCallback
  });

  // Get unread count for a folder
  const getUnreadCount = (folder: EmailFolder): number => {
    if (!stats?.folderStats) return 0;
    const folderStats = stats.folderStats.find((f) => f.folder === folder);
    return folderStats?.unread ?? 0;
  };

  const handleClick = (folder: FolderConfig) => {
    if (folder.id === 'settings') {
      onSettings?.();
    } else {
      onFolderChange(folder.id as EmailFolder);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      {/* Centered container with content-visibility optimization */}
      <div
        className={cn(
          'absolute bottom-6 left-1/2 -translate-x-1/2',
          'z-50',
          // content-visibility for render optimization
          '[content-visibility:auto]',
          // contain-intrinsic-size for stable layout
          '[contain-intrinsic-size:auto_400px_auto_60px]',
          className
        )}
        style={adaptiveColors.getInlineStyles()}
      >
        {/* Liquid Glass Dock - Smart Glass variant */}
        <motion.div
          onMouseMove={(e) => {
            mouseX.set(e.pageX);
            if (!isInteracting) setIsInteracting(true);
          }}
          onMouseLeave={() => {
            mouseX.set(Infinity);
            setIsInteracting(false);
          }}
          className={cn(
            'floating-dock',
            'flex items-end gap-2 px-4 pb-3 pt-3',
            // Smart Glass material - adapts to tenant color
            adaptiveColors.isLightPrimary
              ? 'bg-black/[0.08]'
              : 'bg-white/[0.08]',
            // Optimized backdrop-filter
            'backdrop-blur-2xl backdrop-saturate-150',
            // Multi-layer borders for depth - adaptive
            'border',
            adaptiveColors.isLightPrimary
              ? 'border-black/[0.12]'
              : 'border-white/[0.15]',
            'rounded-[28px]',
            // Soft shadows with depth - uses CSS custom property
            'shadow-[0_8px_32px_var(--adaptive-shadow,rgba(0,0,0,0.25)),0_2px_8px_rgba(0,0,0,0.15)]',
            // Subtle inner glow - adaptive
            'ring-1 ring-inset',
            adaptiveColors.isLightPrimary
              ? 'ring-white/[0.08]'
              : 'ring-white/[0.05]',
            // Optimized will-change only during interaction
            isInteracting && 'will-change-transform'
          )}
          style={{
            // Inset shadow with primary color tint
            boxShadow: `
              0 8px 32px ${adaptiveColors.isLightPrimary ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.25)'},
              0 2px 8px rgba(0,0,0,0.15),
              inset 0 1px 0 ${adaptiveColors.isLightPrimary ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}
            `,
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
          role="navigation"
          aria-label="Email folders"
        >
          {FOLDERS.map((folder, index) => {
            const isActive = folder.id === currentFolder;
            const unreadCount =
              folder.showBadge && folder.id !== 'settings'
                ? getUnreadCount(folder.id as EmailFolder)
                : 0;

            return (
              <React.Fragment key={folder.id}>
                {/* Separator before settings - adaptive */}
                {index === 5 && (
                  <div
                    className={cn(
                      'w-px h-8 mx-1 self-center',
                      adaptiveColors.isLightPrimary
                        ? 'bg-black/[0.1]'
                        : 'bg-white/[0.1]'
                    )}
                  />
                )}

                <DockIcon
                  folder={folder}
                  isActive={isActive}
                  unreadCount={unreadCount}
                  onClick={() => handleClick(folder)}
                  mouseX={mouseX}
                  adaptiveColors={adaptiveColors}
                />
              </React.Fragment>
            );
          })}
        </motion.div>

        {/* Reflection/glow beneath dock - adaptive */}
        <div
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2',
            'w-3/4 h-8',
            'bg-gradient-to-t to-transparent',
            'blur-xl rounded-full',
            'pointer-events-none',
            // Reduced motion: hide decorative glow
            'motion-reduce:hidden'
          )}
          style={{
            background: `linear-gradient(to top, ${adaptiveColors.isLightPrimary ? 'rgba(0,0,0,0.08)' : 'var(--tenant-primary-glow, rgba(14,181,140,0.1))'}, transparent)`,
          }}
        />
      </div>
    </TooltipProvider>
  );
}

export default EmailFloatingDock;
