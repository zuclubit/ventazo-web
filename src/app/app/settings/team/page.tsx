'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RBACGuard, usePermissions, type UserRole } from '@/lib/auth';
import {
  useTeamManagement,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  type TeamMember,
} from '@/lib/users';

// ============================================
// Schemas
// ============================================

const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['admin', 'manager', 'sales_rep', 'viewer'] as const),
  message: z.string().max(500).optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// ============================================
// Team Page
// ============================================

export default function TeamPage() {
  usePermissions();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [newRole, setNewRole] = React.useState<UserRole>('viewer');

  const {
    members,
    membersMeta,
    invitations,
    isMembersLoading,
    inviteMemberAsync,
    isInviting,
    inviteError,
    updateMemberRoleAsync,
    isUpdatingRole,
    deleteMemberAsync,
    isDeleting,
    suspendMember,
    reactivateMember,
    resendInvitation,
    isResending,
    cancelInvitation,
    isCancelling,
    refetchMembers,
    refetchInvitations,
  } = useTeamManagement();

  // Filter members
  const filteredMembers = React.useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        !search ||
        member.fullName.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, search, statusFilter, roleFilter]);

  // Invite form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'sales_rep',
      message: '',
    },
  });

  const onInviteSubmit = async (data: InviteFormData) => {
    try {
      await inviteMemberAsync(data);
      setIsInviteOpen(false);
      reset();
      void refetchInvitations();
    } catch {
      // Error handled by hook
    }
  };

  const handleRoleChange = async () => {
    if (!selectedMember) return;

    try {
      await updateMemberRoleAsync({
        memberId: selectedMember.id,
        role: newRole,
      });
      setIsRoleDialogOpen(false);
      setSelectedMember(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      await deleteMemberAsync(selectedMember.id);
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch {
      // Error handled by hook
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <RBACGuard
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a la gestion del equipo
          </p>
        </div>
      }
      minRole="admin"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestion del Equipo</h2>
            <p className="text-muted-foreground">
              Administra los miembros de tu organizacion
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Miembro
          </Button>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{membersMeta?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Miembros</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invitations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Invitaciones Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-red-500/10 p-3">
                <UserMinus className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.status === 'suspended').length}
                </p>
                <p className="text-sm text-muted-foreground">Suspendidos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                </SelectContent>
              </Select>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="sales_rep">Vendedor</SelectItem>
                  <SelectItem value="viewer">Observador</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  void refetchMembers();
                  void refetchInvitations();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Miembros del Equipo</CardTitle>
            <CardDescription>
              {filteredMembers.length} de {members.length} miembros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No hay miembros</h3>
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'No se encontraron miembros con los filtros aplicados'
                    : 'Invita a tu primer miembro del equipo'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage alt={member.fullName} src={member.avatarUrl} />
                        <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={ROLE_COLORS[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                      <Badge
                        className={STATUS_COLORS[member.status]}
                        variant="outline"
                      >
                        {STATUS_LABELS[member.status]}
                      </Badge>

                      {member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setNewRole(member.role);
                                setIsRoleDialogOpen(true);
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Cambiar Rol
                            </DropdownMenuItem>
                            {member.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => suspendMember(member.id)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Suspender
                              </DropdownMenuItem>
                            ) : member.status === 'suspended' ? (
                              <DropdownMenuItem
                                onClick={() => reactivateMember(member.id)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivar
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedMember(member);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invitaciones Pendientes</CardTitle>
              <CardDescription>
                Invitaciones que aun no han sido aceptadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invitado como {ROLE_LABELS[invitation.role]} - Expira{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={isResending}
                        size="sm"
                        variant="outline"
                        onClick={() => resendInvitation(invitation.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reenviar
                      </Button>
                      <Button
                        disabled={isCancelling}
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invite Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
              <DialogDescription>
                Envia una invitacion por email para unirse a tu equipo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onInviteSubmit)}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    placeholder="correo@ejemplo.com"
                    type="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="role">
                    Rol
                  </label>
                  <Select
                    defaultValue="sales_rep"
                    onValueChange={(value) => setValue('role', value as InviteFormData['role'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div>
                          <p className="font-medium">Administrador</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.admin}
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div>
                          <p className="font-medium">Gerente</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.manager}
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem value="sales_rep">
                        <div>
                          <p className="font-medium">Vendedor</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.sales_rep}
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div>
                          <p className="font-medium">Observador</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.viewer}
                          </p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="message">
                    Mensaje (opcional)
                  </label>
                  <Input
                    id="message"
                    placeholder="Un mensaje personalizado para la invitacion..."
                    {...register('message')}
                  />
                </div>

                {inviteError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {inviteError.message}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancelar
                </Button>
                <Button disabled={isInviting} type="submit">
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar Invitacion
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Rol</DialogTitle>
              <DialogDescription>
                Cambiar el rol de {selectedMember?.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="sales_rep">Vendedor</SelectItem>
                  <SelectItem value="viewer">Observador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {ROLE_DESCRIPTIONS[newRole]}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRoleDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button disabled={isUpdatingRole} onClick={handleRoleChange}>
                {isUpdatingRole ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Miembro</DialogTitle>
              <DialogDescription>
                Esta a punto de eliminar a {selectedMember?.fullName} del equipo.
                Esta accion no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={isDeleting}
                variant="destructive"
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RBACGuard>
  );
}
