'use client';

/**
 * CommentInput Component
 * Rich text input with @mentions support
 *
 * @module components/comments/CommentInput
 */

import * as React from 'react';
import { Send, X, Loader2, AtSign, Paperclip, Bold, Italic, Code, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Comment, CommentMention } from '@/lib/comments/types';
import { useMentionOptions, formatMention } from '@/lib/user-tags';
import type { MentionOption } from '@/lib/user-tags';

// ============================================
// Types
// ============================================

interface CommentInputProps {
  placeholder?: string;
  allowMentions?: boolean;
  allowMarkdown?: boolean;
  replyingTo?: Comment | null;
  onCancelReply?: () => void;
  onSubmit: (content: string, mentions: CommentMention[]) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
  autoFocus?: boolean;
}

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// Component
// ============================================

export function CommentInput({
  placeholder = 'Escribe un comentario...',
  allowMentions = true,
  allowMarkdown = true,
  replyingTo,
  onCancelReply,
  onSubmit,
  isSubmitting = false,
  className,
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = React.useState('');
  const [mentions, setMentions] = React.useState<CommentMention[]>([]);
  const [showMentionPicker, setShowMentionPicker] = React.useState(false);
  const [mentionSearch, setMentionSearch] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch mention options (users + groups)
  const { users: userOptions, groups: groupOptions, isLoading: isLoadingMentions } = useMentionOptions();

  // Filter users for mention picker
  const filteredUsers = React.useMemo(() => {
    if (!mentionSearch) return userOptions.slice(0, 5);
    const search = mentionSearch.toLowerCase();
    return userOptions
      .filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          (u.description && u.description.toLowerCase().includes(search))
      )
      .slice(0, 5);
  }, [userOptions, mentionSearch]);

  // Filter groups for mention picker
  const filteredGroups = React.useMemo(() => {
    if (!mentionSearch) return groupOptions.slice(0, 3);
    const search = mentionSearch.toLowerCase();
    return groupOptions
      .filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          (g.description && g.description.toLowerCase().includes(search))
      )
      .slice(0, 3);
  }, [groupOptions, mentionSearch]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setContent(value);
    setCursorPosition(position);

    // Check for @ trigger
    if (allowMentions) {
      const textBeforeCursor = value.substring(0, position);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);

      if (atMatch) {
        setMentionSearch(atMatch[1] ?? '');
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
        setMentionSearch('');
      }
    }
  };

  // Handle mention selection (user or group)
  const handleSelectMention = (option: MentionOption) => {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);

    // Find the @ position
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (!atMatch) return;

    const atPosition = textBeforeCursor.lastIndexOf('@');
    const mentionText = formatMention(option);

    // Build new content
    const newContent =
      textBeforeCursor.substring(0, atPosition) +
      mentionText +
      ' ' +
      textAfterCursor;

    // Add mention to list (for users, we track userId; for groups we use the tag id)
    const mention: CommentMention = {
      userId: option.id,
      userName: option.name,
      startIndex: atPosition,
      endIndex: atPosition + mentionText.length,
      // Add type to distinguish between user and group mentions
      type: option.type as 'user' | 'group',
    };

    setContent(newContent);
    setMentions([...mentions, mention]);
    setShowMentionPicker(false);
    setMentionSearch('');

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = atPosition + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      await onSubmit(content.trim(), mentions);
      setContent('');
      setMentions([]);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }

    // Close mention picker on Escape
    if (e.key === 'Escape' && showMentionPicker) {
      e.preventDefault();
      setShowMentionPicker(false);
    }
  };

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = before) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    // Set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = selectedText
          ? start + before.length + selectedText.length + after.length
          : start + before.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          selectedText ? start : newPosition,
          newPosition
        );
      }
    }, 0);
  };

  const hasContent = content.trim().length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Reply indicator - styled card */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-sm">
          <span className="text-muted-foreground">
            Respondiendo a{' '}
            <span className="font-semibold text-primary">
              {replyingTo.author?.name || 'Usuario'}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary/10"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area - modern container */}
      <div className="comment-input-container">
        <Popover open={showMentionPicker} onOpenChange={setShowMentionPicker}>
          <PopoverAnchor asChild>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  'min-h-[80px] pr-12 resize-none border-0 rounded-none',
                  'focus-visible:ring-0 focus-visible:ring-offset-0',
                  'bg-transparent'
                )}
                autoFocus={autoFocus}
                disabled={isSubmitting}
              />

              {/* Submit button (inside textarea) */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'absolute bottom-2 right-2 h-9 w-9 p-0 rounded-full',
                  'transition-all duration-200',
                  hasContent
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                disabled={!hasContent || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </PopoverAnchor>

          {/* Mention picker */}
          <PopoverContent
            className="w-72 p-0"
            align="start"
            side="top"
            sideOffset={5}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                <CommandEmpty>
                  {isLoadingMentions ? 'Cargando...' : 'No se encontraron resultados'}
                </CommandEmpty>

                {/* Groups Section */}
                {filteredGroups.length > 0 && (
                  <CommandGroup heading="Grupos">
                    {filteredGroups.map((group) => (
                      <CommandItem
                        key={`group-${group.id}`}
                        value={`group-${group.id}`}
                        onSelect={() => handleSelectMention(group)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: group.color || '#6366f1' }}
                        >
                          <Users className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">@{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {group.description}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Separator if both sections exist */}
                {filteredGroups.length > 0 && filteredUsers.length > 0 && (
                  <CommandSeparator />
                )}

                {/* Users Section */}
                {filteredUsers.length > 0 && (
                  <CommandGroup heading="Usuarios">
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={`user-${user.id}`}
                        value={`user-${user.id}`}
                        onSelect={() => handleSelectMention(user)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.description}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Toolbar - inside the container */}
        <div className="comment-input-toolbar">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Mention button */}
            {allowMentions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => {
                        if (textareaRef.current) {
                          const pos = textareaRef.current.selectionStart || content.length;
                          const newContent =
                            content.substring(0, pos) + '@' + content.substring(pos);
                          setContent(newContent);
                          setCursorPosition(pos + 1);
                          setShowMentionPicker(true);
                          textareaRef.current.focus();
                        }
                      }}
                    >
                      <AtSign className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mencionar usuario o grupo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Markdown formatting - hidden on very small screens */}
            {allowMarkdown && (
              <div className="hidden xs:flex items-center gap-0.5 sm:gap-1 ml-1 pl-1 border-l border-border/50">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => insertMarkdown('**')}
                      >
                        <Bold className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Negrita</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => insertMarkdown('*')}
                      >
                        <Italic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Itálica</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => insertMarkdown('`')}
                      >
                        <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Código</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Keyboard hint - hidden on mobile where touch is primary */}
          <span className="hidden sm:inline text-xs text-muted-foreground/70">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">⌘</kbd>
            <span className="mx-0.5">+</span>
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">↵</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommentInput;
