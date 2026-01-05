'use client';

/**
 * KeyboardShortcutsDialog Component
 *
 * Help dialog showing all available keyboard shortcuts.
 *
 * @version 1.0.0
 * @module components/KeyboardShortcutsDialog
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyboardShortcut } from '../types';
import { KANBAN_SHORTCUTS } from '../constants';

// ============================================
// Types
// ============================================

export interface KeyboardShortcutsDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Custom shortcuts (merges with defaults) */
  customShortcuts?: KeyboardShortcut[];
}

// ============================================
// Kbd Component (Keyboard Key)
// ============================================

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center px-2 py-1 text-xs font-mono',
        'bg-muted border border-border rounded shadow-sm min-w-[24px]',
        className
      )}
    >
      {children}
    </kbd>
  );
}

// ============================================
// Shortcut Row Component
// ============================================

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  // Format key display
  const formatKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ' ': 'Space',
      Escape: 'Esc',
      Delete: 'Del',
      Enter: '↵',
      Tab: '⇥',
    };
    return keyMap[key] || key;
  };

  // Format modifier display
  const formatModifier = (mod: string): string => {
    const modMap: Record<string, string> = {
      ctrl: '⌃',
      alt: '⌥',
      shift: '⇧',
      meta: '⌘',
    };
    return modMap[mod] || mod;
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.modifiers?.map((mod) => (
          <Kbd key={mod}>{formatModifier(mod)}</Kbd>
        ))}
        <Kbd>{formatKey(shortcut.key)}</Kbd>
      </div>
    </div>
  );
}

// ============================================
// Shortcut Section Component
// ============================================

interface ShortcutSectionProps {
  title: string;
  shortcuts: KeyboardShortcut[];
}

function ShortcutSection({ title, shortcuts }: ShortcutSectionProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="divide-y divide-border">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.action} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Keyboard Shortcuts Dialog Component
// ============================================

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  customShortcuts = [],
}: KeyboardShortcutsDialogProps) {
  // Merge shortcuts
  const allShortcuts = React.useMemo(
    () => [...KANBAN_SHORTCUTS, ...customShortcuts],
    [customShortcuts]
  );

  // Group shortcuts by scope
  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {
      global: [],
      board: [],
      column: [],
      card: [],
    };

    allShortcuts.forEach((shortcut) => {
      const scope = shortcut.scope || 'global';
      if (!groups[scope]) groups[scope] = [];
      groups[scope].push(shortcut);
    });

    return groups;
  }, [allShortcuts]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Usa estos atajos para navegar y gestionar el tablero Kanban más
            rápidamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Navigation */}
            <ShortcutSection
              title="Navegación"
              shortcuts={[
                ...(groupedShortcuts['board'] ?? []).filter((s) =>
                  s.action.includes('focus')
                ),
                ...(groupedShortcuts['column'] ?? []).filter(
                  (s) =>
                    s.action.includes('focus') || s.action.includes('collapse')
                ),
              ]}
            />

            <Separator />

            {/* Card Actions */}
            <ShortcutSection
              title="Acciones en Tarjetas"
              shortcuts={groupedShortcuts['card'] ?? []}
            />

            <Separator />

            {/* Global */}
            <ShortcutSection
              title="Global"
              shortcuts={groupedShortcuts['global'] ?? []}
            />
          </div>
        </ScrollArea>

        {/* Footer tip */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Presiona <Kbd className="mx-1">?</Kbd> en cualquier momento para
            ver estos atajos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
