'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Edit,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import { useCategoryManagement, type ServiceCategory } from '@/lib/services';

// ============================================
// Form Schema
// ============================================

const categoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido').optional().or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ============================================
// Category Form Dialog
// ============================================

function CategoryFormDialog({
  category,
  open,
  onClose,
}: {
  category: ServiceCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { createCategory, updateCategory } = useCategoryManagement();
  const isEditing = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name,
          description: category.description ?? '',
          color: category.color ?? '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          color: '',
        });
      }
    }
  }, [open, category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          ...values,
          color: values.color || undefined,
        });
        toast({
          title: 'Categoría actualizada',
          description: 'La categoría se ha actualizado correctamente.',
        });
      } else {
        await createCategory.mutateAsync({
          ...values,
          color: values.color || undefined,
        });
        toast({
          title: 'Categoría creada',
          description: 'La categoría se ha creado correctamente.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: isEditing
          ? 'No se pudo actualizar la categoría.'
          : 'No se pudo crear la categoría.',
        variant: 'destructive',
      });
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información de la categoría.'
              : 'Crea una nueva categoría para organizar tus servicios.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Tratamientos dentales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción de la categoría..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="#3B82F6" {...field} />
                      {field.value && (
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: field.value }}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Color en formato hexadecimal (ej: #3B82F6)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button disabled={isPending} type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Delete Category Dialog
// ============================================

function DeleteCategoryDialog({
  category,
  open,
  onClose,
}: {
  category: ServiceCategory | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { deleteCategory } = useCategoryManagement();

  const handleDelete = async () => {
    if (!category) return;

    try {
      await deleteCategory.mutateAsync(category.id);
      toast({
        title: 'Categoría eliminada',
        description: 'La categoría ha sido eliminada correctamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la categoría. Puede que tenga servicios asociados.',
        variant: 'destructive',
      });
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            ¿Eliminar categoría?
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará la categoría{' '}
            <strong>&quot;{category.name}&quot;</strong>.
            {category.service_count && category.service_count > 0 && (
              <span className="block mt-2 text-yellow-600">
                Esta categoría tiene {category.service_count} servicio(s) asociado(s).
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={deleteCategory.isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={deleteCategory.isPending}
            variant="destructive"
            onClick={handleDelete}
          >
            {deleteCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CategoriesPage() {
  const router = useRouter();
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<ServiceCategory | null>(null);

  const { categories, isLoading } = useCategoryManagement();

  const handleEdit = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setFormDialogOpen(true);
  };

  const handleDelete = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setFormDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/services')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorías de Servicios</h1>
            <p className="text-muted-foreground">
              Organiza tus servicios en categorías
            </p>
          </div>
        </div>
        <RBACGuard fallback={null} minRole="manager">
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Button>
        </RBACGuard>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categorías</CardTitle>
          <CardDescription>
            {categories.length} categoría{categories.length !== 1 ? 's' : ''} en total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay categorías</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Crea tu primera categoría para organizar tus servicios
              </p>
              <RBACGuard fallback={null} minRole="manager">
                <Button className="mt-4" variant="outline" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear categoría
                </Button>
              </RBACGuard>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="w-[70px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground line-clamp-1">
                        {category.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Package className="mr-1 h-3 w-3" />
                        {category.service_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-muted-foreground">{category.color}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <RBACGuard fallback={null} minRole="manager">
                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </RBACGuard>
                          <RBACGuard fallback={null} minRole="admin">
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </RBACGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CategoryFormDialog
        category={selectedCategory}
        open={formDialogOpen}
        onClose={handleFormClose}
      />

      <DeleteCategoryDialog
        category={selectedCategory}
        open={deleteDialogOpen}
        onClose={handleDeleteClose}
      />
    </div>
  );
}
