'use client';

/**
 * User Tags Management Page
 * Allows creating and managing group labels for @mention notifications
 */

import * as React from 'react';
import { Plus, Users, Tag, Trash2, Edit2, Search, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useUserTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useTagMembers,
  useAssignTagMembers,
  useRemoveTagMember,
} from '@/lib/user-tags';
import type { UserTag, TagMember, CreateTagRequest, UpdateTagRequest } from '@/lib/user-tags';
import { useTeamMembers } from '@/lib/users/hooks';
import { cn } from '@/lib/utils';

// Color presets for tags
const TAG_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#64748b', label: 'Gris' },
];

export default function UserTagsPage() {
  const [search, setSearch] = React.useState('');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<UserTag | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<UserTag | null>(null);
  const [deleteConfirmTag, setDeleteConfirmTag] = React.useState<UserTag | null>(null);
  const [addMembersOpen, setAddMembersOpen] = React.useState(false);

  const { toast } = useToast();

  // Queries
  const { data: tagsData, isLoading: tagsLoading } = useUserTags({ search });

  // Mutations
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const filteredTags = React.useMemo(() => {
    if (!tagsData?.data) return [];
    if (!search) return tagsData.data;
    return tagsData.data.filter(
      (tag) =>
        tag.name.toLowerCase().includes(search.toLowerCase()) ||
        tag.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tagsData?.data, search]);

  const handleCreateTag = async (data: CreateTagRequest) => {
    try {
      await createTag.mutateAsync(data);
      toast({ title: 'Grupo creado exitosamente' });
      setCreateDialogOpen(false);
    } catch {
      toast({ title: 'Error al crear el grupo', variant: 'destructive' });
    }
  };

  const handleUpdateTag = async (id: string, data: UpdateTagRequest) => {
    try {
      await updateTag.mutateAsync({ id, data });
      toast({ title: 'Grupo actualizado' });
      setEditingTag(null);
    } catch {
      toast({ title: 'Error al actualizar el grupo', variant: 'destructive' });
    }
  };

  const handleDeleteTag = async (tag: UserTag) => {
    try {
      await deleteTag.mutateAsync(tag.id);
      toast({ title: 'Grupo eliminado' });
      setDeleteConfirmTag(null);
      if (selectedTag?.id === tag.id) {
        setSelectedTag(null);
      }
    } catch {
      toast({ title: 'Error al eliminar el grupo', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grupos de Usuario</h1>
          <p className="text-sm text-muted-foreground">
            Crea etiquetas para agrupar usuarios y usarlas en @menciones
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar grupos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tags Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tagsLoading ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : filteredTags.length === 0 ? (
          // Empty state
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">No hay grupos</h3>
              <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                Crea grupos como &quot;Ventas&quot; o &quot;Soporte&quot; para poder mencionarlos en comentarios
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crear Primer Grupo
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Tags list
          filteredTags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onEdit={() => setEditingTag(tag)}
              onDelete={() => setDeleteConfirmTag(tag)}
              onManageMembers={() => setSelectedTag(tag)}
            />
          ))
        )}
      </div>

      {/* Create Dialog */}
      <TagFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTag}
        isLoading={createTag.isPending}
      />

      {/* Edit Dialog */}
      <TagFormDialog
        open={!!editingTag}
        onOpenChange={(open) => !open && setEditingTag(null)}
        onSubmit={async (data) => {
          if (editingTag) {
            await handleUpdateTag(editingTag.id, data);
          }
        }}
        isLoading={updateTag.isPending}
        initialData={editingTag || undefined}
      />

      {/* Members Sheet */}
      {selectedTag && (
        <TagMembersSheet
          tag={selectedTag}
          open={!!selectedTag}
          onOpenChange={(open) => !open && setSelectedTag(null)}
          onAddMembers={() => setAddMembersOpen(true)}
        />
      )}

      {/* Add Members Dialog */}
      {selectedTag && (
        <AddMembersDialog
          tag={selectedTag}
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmTag} onOpenChange={(open) => !open && setDeleteConfirmTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara el grupo &quot;{deleteConfirmTag?.name}&quot; y removera a todos sus miembros.
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmTag && handleDeleteTag(deleteConfirmTag)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Tag Card Component
// =============================================================================

interface TagCardProps {
  tag: UserTag;
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
}

function TagCard({ tag, onEdit, onDelete, onManageMembers }: TagCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: tag.color + '20' }}
            >
              <Tag className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: tag.color }} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">{tag.name}</CardTitle>
              <CardDescription className="text-xs">
                {tag.memberCount} miembro{tag.memberCount !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          {/* Always visible on mobile, hover on desktop */}
          <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tag.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{tag.description}</p>
        )}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs"
            style={{ backgroundColor: tag.color + '15', color: tag.color }}
          >
            @{tag.slug}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={onManageMembers}>
            <Users className="h-3 w-3" />
            Miembros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Tag Form Dialog
// =============================================================================

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTagRequest) => Promise<void>;
  isLoading: boolean;
  initialData?: UserTag;
}

function TagFormDialog({ open, onOpenChange, onSubmit, isLoading, initialData }: TagFormDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState('#6366f1');

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setColor(initialData.color);
    } else {
      setName('');
      setDescription('');
      setColor('#6366f1');
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined, color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
          <DialogDescription>
            Los grupos permiten mencionar a multiples usuarios con @NombreGrupo
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Ventas, Soporte, Marketing"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el proposito de este grupo..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform hover:scale-110',
                    color === c.value && 'ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Guardando...' : initialData ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Tag Members Sheet
// =============================================================================

interface TagMembersSheetProps {
  tag: UserTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMembers: () => void;
}

function TagMembersSheet({ tag, open, onOpenChange, onAddMembers }: TagMembersSheetProps) {
  const { toast } = useToast();
  const { data: membersData, isLoading } = useTagMembers(tag.id);
  const removeMember = useRemoveTagMember();

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember.mutateAsync({ tagId: tag.id, userId });
      toast({ title: 'Miembro removido' });
    } catch {
      toast({ title: 'Error al remover miembro', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: tag.color + '20' }}
            >
              <Tag className="h-3 w-3" style={{ color: tag.color }} />
            </div>
            {tag.name}
          </SheetTitle>
          <SheetDescription>
            Miembros de este grupo recibiran notificaciones cuando @{tag.slug} sea mencionado
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Button onClick={onAddMembers} className="w-full gap-2">
            <UserPlus className="h-4 w-4" />
            Agregar Miembros
          </Button>
        </div>

        <ScrollArea className="mt-4 h-[calc(100vh-280px)]">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : membersData?.data.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No hay miembros en este grupo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {membersData?.data.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        {member.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={removeMember.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Add Members Dialog
// =============================================================================

interface AddMembersDialogProps {
  tag: UserTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddMembersDialog({ tag, open, onOpenChange }: AddMembersDialogProps) {
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const { toast } = useToast();

  const { data: membersResponse } = useTeamMembers();
  const { data: currentMembersData } = useTagMembers(tag.id);
  const assignMembers = useAssignTagMembers();

  // Filter out already assigned members
  const availableMembers = React.useMemo(() => {
    if (!membersResponse?.data) return [];
    const currentMemberIds = new Set(currentMembersData?.data.map((m: TagMember) => m.userId) || []);
    return membersResponse.data.filter((m: { id: string; fullName: string; email: string; avatarUrl?: string | null }) => !currentMemberIds.has(m.id));
  }, [membersResponse?.data, currentMembersData?.data]);

  const filteredMembers = React.useMemo(() => {
    if (!search) return availableMembers;
    const lowerSearch = search.toLowerCase();
    return availableMembers.filter(
      (m: { fullName: string; email: string }) =>
        m.fullName.toLowerCase().includes(lowerSearch) ||
        m.email.toLowerCase().includes(lowerSearch)
    );
  }, [availableMembers, search]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    try {
      await assignMembers.mutateAsync({ tagId: tag.id, userIds: selectedIds });
      toast({ title: `${selectedIds.length} miembro(s) agregado(s)` });
      setSelectedIds([]);
      onOpenChange(false);
    } catch {
      toast({ title: 'Error al agregar miembros', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Miembros</DialogTitle>
          <DialogDescription>
            Selecciona los usuarios que deseas agregar al grupo {tag.name}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-64">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {availableMembers.length === 0
                  ? 'Todos los miembros ya estan en el grupo'
                  : 'No se encontraron usuarios'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member: { id: string; fullName: string; email: string; avatarUrl?: string | null }) => (
                <label
                  key={member.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    selectedIds.includes(member.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <Checkbox
                    checked={selectedIds.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || assignMembers.isPending}
          >
            {assignMembers.isPending ? 'Agregando...' : `Agregar (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
