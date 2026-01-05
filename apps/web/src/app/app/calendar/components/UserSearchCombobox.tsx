'use client';

/**
 * UserSearchCombobox Component - Sprint 5
 *
 * Autocomplete combobox for searching and selecting team members.
 * Used in EventFormSheet for adding attendees.
 *
 * @module app/calendar/components/UserSearchCombobox
 */

import * as React from 'react';
import { Check, ChevronsUpDown, User, Loader2, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamMembers } from '@/lib/users';
import { useDebouncedValue } from '@/lib/performance';

// ============================================
// Types
// ============================================

export interface SelectedUser {
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface UserSearchComboboxProps {
  selectedUsers: SelectedUser[];
  onSelect: (user: SelectedUser) => void;
  onRemove: (email: string) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
}

// ============================================
// UserSearchCombobox Component
// ============================================

export function UserSearchCombobox({
  selectedUsers,
  onSelect,
  onRemove,
  placeholder = 'Buscar participante...',
  maxSelections,
  disabled = false,
  className,
}: UserSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  // Fetch team members with search
  const { data: teamData, isLoading } = useTeamMembers({
    search: debouncedSearch || undefined,
    pageSize: 10,
    status: 'active',
  });

  const teamMembers = teamData?.data ?? [];

  // Filter out already selected users
  const availableMembers = teamMembers.filter(
    (member) => !selectedUsers.some((selected) => selected.email === member.email)
  );

  const handleSelect = (member: typeof teamMembers[number]) => {
    onSelect({
      email: member.email,
      name: member.fullName,
      avatarUrl: member.avatarUrl ?? undefined,
    });
    setSearchValue('');
    setOpen(false);
  };

  const isMaxReached = maxSelections !== undefined && selectedUsers.length >= maxSelections;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.email}
              variant="secondary"
              className="flex items-center gap-1 py-1 px-2"
            >
              <Avatar className="h-4 w-4">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />}
                <AvatarFallback className="text-[8px]">
                  {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[150px] truncate">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={() => onRemove(user.email)}
                className="ml-1 hover:text-destructive focus:outline-none focus:ring-1 focus:ring-destructive rounded"
                disabled={disabled}
                aria-label={`Remover ${user.name || user.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Buscar participantes"
            className="w-full justify-between"
            disabled={disabled || isMaxReached}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              {isMaxReached ? 'Máximo de participantes alcanzado' : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Escribe para buscar..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && availableMembers.length === 0 && (
                <CommandEmpty>
                  {searchValue ? 'No se encontraron participantes.' : 'Escribe para buscar.'}
                </CommandEmpty>
              )}
              {!isLoading && availableMembers.length > 0 && (
                <CommandGroup heading="Miembros del equipo">
                  {availableMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.email}
                      onSelect={() => handleSelect(member)}
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        {member.avatarUrl && (
                          <AvatarImage src={member.avatarUrl} alt={member.fullName} />
                        )}
                        <AvatarFallback>
                          {member.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Helper Text */}
      {maxSelections && (
        <p className="text-xs text-muted-foreground">
          {selectedUsers.length} de {maxSelections} participantes seleccionados
        </p>
      )}
    </div>
  );
}

export default UserSearchCombobox;
