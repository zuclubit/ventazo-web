'use client';

/**
 * ReactionBar Component
 * Emoji reactions for comments (GitHub-style)
 *
 * @module components/comments/ReactionBar
 */

import * as React from 'react';
import { SmilePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CommentReactions, SupportedReaction } from '@/lib/comments/types';
import { SUPPORTED_REACTIONS, REACTION_LABELS } from '@/lib/comments/types';

// ============================================
// Types
// ============================================

interface ReactionBarProps {
  reactions: CommentReactions;
  userReactions: string[];
  onReact: (emoji: SupportedReaction) => void;
  size?: 'sm' | 'md';
  className?: string;
}

interface ReactionButtonProps {
  emoji: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}

interface ReactionPickerProps {
  onSelect: (emoji: SupportedReaction) => void;
  userReactions: string[];
}

// ============================================
// Sub-components
// ============================================

function ReactionButton({
  emoji,
  count,
  isActive,
  onClick,
  size = 'sm',
}: ReactionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto px-1.5 py-0.5 rounded-full transition-colors',
              size === 'sm' ? 'text-xs gap-1' : 'text-sm gap-1.5',
              isActive
                ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
            )}
            onClick={onClick}
          >
            <span className={size === 'sm' ? 'text-sm' : 'text-base'}>{emoji}</span>
            <span>{count}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{REACTION_LABELS[emoji] || emoji}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ReactionPicker({ onSelect, userReactions }: ReactionPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1">
      {SUPPORTED_REACTIONS.map((emoji) => {
        const isActive = userReactions.includes(emoji);
        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0 text-lg hover:bg-muted/80 transition-all hover:scale-110',
                    isActive && 'bg-primary/10 ring-1 ring-primary/30'
                  )}
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{REACTION_LABELS[emoji] || emoji}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ReactionBar({
  reactions,
  userReactions,
  onReact,
  size = 'sm',
  className,
}: ReactionBarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Get sorted reactions (most used first)
  const sortedReactions = React.useMemo(() => {
    if (!reactions) return [];

    return Object.entries(reactions)
      .filter(([, userIds]) => userIds.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
  }, [reactions]);

  const handleSelect = (emoji: SupportedReaction) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Existing Reactions */}
      {sortedReactions.map(([emoji, userIds]) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          count={userIds.length}
          isActive={userReactions.includes(emoji)}
          onClick={() => onReact(emoji as SupportedReaction)}
          size={size}
        />
      ))}

      {/* Add Reaction Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80',
              size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
            )}
          >
            <SmilePlus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-1"
          align="start"
          side="top"
          sideOffset={5}
        >
          <ReactionPicker onSelect={handleSelect} userReactions={userReactions} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ReactionBar;
