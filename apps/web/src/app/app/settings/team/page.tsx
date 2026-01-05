'use client';

/**
 * Team Settings Page
 *
 * Manage team members and invitations with:
 * - Member listing with role/status badges
 * - Pending invitations management
 * - Invite new members
 * - Role and status updates
 *
 * Uses BFF proxy pattern for secure API calls.
 *
 * @module settings/team
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RBACGuard } from '@/lib/auth';

import {
  useTeamSettings,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type TeamMember,
  type Invitation,
  type UserRole,
} from './hooks';

// ============================================
// Schemas
// ============================================

const inviteSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido')
    .transform((v) => v.toLowerCase().trim()),
  role: z.enum(['admin', 'manager', 'sales_rep', 'viewer'] as const, {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
  message: z
    .string()
    .max(500, 'El mensaje no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// ============================================
// Utility Functions
// ============================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expirada';
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays <= 7) return `En ${diffDays} días`;
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// Sub-Components
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isLoading?: boolean;
}

function StatCard({ icon, label, value, color, isLoading }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn('rounded-xl p-2.5 sm:p-3 transition-transform hover:scale-105', color)}>
            {icon}
          </div>
          <div>
            {isLoading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{value}</p>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MemberRowProps {
  member: TeamMember;
  onChangeRole: (member: TeamMember) => void;
  onSuspend: (memberId: string) => void;
  onReactivate: (memberId: string) => void;
  onRemove: (member: TeamMember) => void;
  isUpdating: boolean;
  isRemoving: boolean;
  updatingMemberId: string | null;
  removingMemberId: string | null;
}

function MemberRow({
  member,
  onChangeRole,
  onSuspend,
  onReactivate,
  onRemove,
  isUpdating,
  isRemoving,
  updatingMemberId,
  removingMemberId,
}: MemberRowProps) {
  const displayName = member.fullName || member.email || 'Usuario';
  const isThisMemberUpdating = updatingMemberId === member.id;
  const isThisMemberRemoving = removingMemberId === member.id;
  const isProcessing = isThisMemberUpdating || isThisMemberRemoving;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b last:border-b-0 transition-all',
        isProcessing && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-background shadow-sm">
          <AvatarImage alt={displayName} src={member.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm sm:text-base truncate text-foreground">{displayName}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-[52px] sm:ml-0">
        <Badge className={cn('text-xs', ROLE_COLORS[member.role])}>
          {ROLE_LABELS[member.role]}
        </Badge>
        <Badge
          variant="outline"
          className={cn('text-xs', STATUS_COLORS[member.status])}
        >
          {STATUS_LABELS[member.status]}
        </Badge>

        {member.role !== 'owner' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={isUpdating || isRemoving}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChangeRole(member)}>
                <Shield className="mr-2 h-4 w-4" />
                Cambiar Rol
              </DropdownMenuItem>
              {member.status === 'active' ? (
                <DropdownMenuItem onClick={() => onSuspend(member.id)}>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Suspender
                </DropdownMenuItem>
              ) : member.status === 'suspended' ? (
                <DropdownMenuItem onClick={() => onReactivate(member.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove(member)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

interface InvitationRowProps {
  invitation: Invitation;
  onResend: (id: string) => void;
  onCancel: (invitation: Invitation) => void;
  resendingId: string | null;
  cancellingId: string | null;
}

function InvitationRow({
  invitation,
  onResend,
  onCancel,
  resendingId,
  cancellingId,
}: InvitationRowProps) {
  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const isExpiringSoon = expiresAt <= twoDaysFromNow && expiresAt > now;
  const isExpired = expiresAt <= now;

  const isResending = resendingId === invitation.id;
  const isCancelling = cancellingId === invitation.id;
  const isProcessing = isResending || isCancelling;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b last:border-b-0 transition-all',
        isProcessing && 'opacity-60',
        isExpired && 'bg-red-50/50 dark:bg-red-950/20'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="font-medium text-sm sm:text-base text-foreground">{invitation.email}</p>
          {isExpired ? (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="mr-1 h-3 w-3" />
              Expirada
            </Badge>
          ) : isExpiringSoon ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Por expirar
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {ROLE_LABELS[invitation.role]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {isExpired ? 'Expiró' : 'Expira'}: {formatTimeAgo(invitation.expiresAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isExpiringSoon || isExpired ? 'default' : 'outline'}
                onClick={() => onResend(invitation.id)}
                disabled={isProcessing}
                className="h-8 min-w-[100px]"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Reenviar
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Envía un nuevo email de invitación</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(invitation)}
                disabled={isProcessing}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancelar invitación</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function TeamSettingsPage() {
  // State
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isCancelInviteDialogOpen, setIsCancelInviteDialogOpen] = React.useState(false);
  const [selectedInvitation, setSelectedInvitation] = React.useState<Invitation | null>(null);
  const [newRole, setNewRole] = React.useState<UserRole>('viewer');

  // Hook
  const {
    members,
    isMembersLoading,
    invitations,
    isInvitationsLoading,
    stats,
    inviteMemberAsync,
    isInviting,
    inviteError,
    resendInvitationAsync,
    resendingId,
    cancelInvitationAsync,
    cancellingId,
    updateMemberAsync,
    isUpdating,
    updatingMemberId,
    removeMemberAsync,
    isRemoving,
    removingMemberId,
    refetchMembers,
    refetchInvitations,
    isEmailPendingInvitation,
    isEmailAlreadyMember,
  } = useTeamSettings();

  // Filter members
  const filteredMembers = React.useMemo(() => {
    return members.filter((member) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (member.fullName?.toLowerCase() || '').includes(searchLower) ||
        (member.email?.toLowerCase() || '').includes(searchLower);

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, search, statusFilter, roleFilter]);

  // Filter valid invitations (not expired and pending)
  const validInvitations = React.useMemo(() => {
    return invitations.filter((inv) => inv.status === 'pending');
  }, [invitations]);

  // Invite form with custom validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'sales_rep',
      message: '',
    },
  });

  const watchedEmail = watch('email');

  // Real-time email validation
  React.useEffect(() => {
    if (!watchedEmail) {
      clearErrors('email');
      return;
    }

    const email = watchedEmail.toLowerCase().trim();

    if (isEmailAlreadyMember(email)) {
      setError('email', {
        type: 'manual',
        message: 'Este email ya pertenece a un miembro del equipo',
      });
    } else if (isEmailPendingInvitation(email)) {
      setError('email', {
        type: 'manual',
        message: 'Ya existe una invitación pendiente para este email',
      });
    }
  }, [watchedEmail, isEmailAlreadyMember, isEmailPendingInvitation, setError, clearErrors]);

  const onInviteSubmit = async (data: InviteFormData) => {
    // Double-check validation before submit
    if (isEmailAlreadyMember(data.email)) {
      setError('email', {
        type: 'manual',
        message: 'Este email ya pertenece a un miembro del equipo',
      });
      return;
    }

    if (isEmailPendingInvitation(data.email)) {
      setError('email', {
        type: 'manual',
        message: 'Ya existe una invitación pendiente para este email',
      });
      return;
    }

    try {
      await inviteMemberAsync(data);
      setIsInviteOpen(false);
      reset();
    } catch {
      // Error handled by hook
    }
  };

  const handleRoleChange = async () => {
    if (!selectedMember) return;

    const memberToUpdate = selectedMember;
    const roleToSet = newRole;

    // Close modal immediately for better UX
    setIsRoleDialogOpen(false);
    setSelectedMember(null);

    try {
      await updateMemberAsync(memberToUpdate.id, { role: roleToSet });
    } catch {
      // Error handled by hook with toast
    }
  };

  const handleSuspend = async (memberId: string) => {
    try {
      await updateMemberAsync(memberId, { isActive: false });
    } catch {
      // Error handled by hook
    }
  };

  const handleReactivate = async (memberId: string) => {
    try {
      await updateMemberAsync(memberId, { isActive: true });
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    const memberToRemove = selectedMember;

    // Close modal immediately for better UX
    setIsDeleteDialogOpen(false);
    setSelectedMember(null);

    try {
      await removeMemberAsync(memberToRemove.id);
    } catch {
      // Error handled by hook with toast
    }
  };

  const handleCancelInvitation = async () => {
    if (!selectedInvitation) return;

    const invitationToCancel = selectedInvitation;

    // Close modal immediately for better UX
    setIsCancelInviteDialogOpen(false);
    setSelectedInvitation(null);

    try {
      await cancelInvitationAsync(invitationToCancel.id);
    } catch {
      // Error handled by hook with toast
    }
  };

  const handleRefresh = () => {
    void refetchMembers();
    void refetchInvitations();
  };

  return (
    <RBACGuard
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a la gestión del equipo
          </p>
        </div>
      }
      minRole="admin"
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Gestión del Equipo
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Administra los miembros de tu organización
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Miembro
          </Button>
        </div>

        <Separator />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
            label="Total Miembros"
            value={stats.total}
            color="bg-primary/10"
            isLoading={isMembersLoading}
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />}
            label="Activos"
            value={stats.active}
            color="bg-emerald-500/10"
            isLoading={isMembersLoading}
          />
          <StatCard
            icon={<Mail className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />}
            label="Invitaciones"
            value={validInvitations.length}
            color="bg-amber-500/10"
            isLoading={isInvitationsLoading}
          />
          <StatCard
            icon={<UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />}
            label="Suspendidos"
            value={stats.suspended}
            color="bg-red-500/10"
            isLoading={isMembersLoading}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 h-10"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 sm:gap-3">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] h-10">
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
                  <SelectTrigger className="w-[130px] sm:w-[150px] h-10">
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleRefresh}
                        className="h-10 w-10 shrink-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Actualizar lista</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl text-card-foreground">Miembros del Equipo</CardTitle>
            <CardDescription>
              {filteredMembers.length} de {members.length} miembros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="divide-y" role="status" aria-label="Cargando miembros">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground">No hay miembros</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  {search || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'No se encontraron miembros con los filtros aplicados'
                    : 'Invita a tu primer miembro del equipo'}
                </p>
                {!search && statusFilter === 'all' && roleFilter === 'all' && (
                  <Button
                    className="mt-4"
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invitar Miembro
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    onChangeRole={(m) => {
                      setSelectedMember(m);
                      setNewRole(m.role);
                      setIsRoleDialogOpen(true);
                    }}
                    onSuspend={handleSuspend}
                    onReactivate={handleReactivate}
                    onRemove={(m) => {
                      setSelectedMember(m);
                      setIsDeleteDialogOpen(true);
                    }}
                    isUpdating={isUpdating}
                    isRemoving={isRemoving}
                    updatingMemberId={updatingMemberId}
                    removingMemberId={removingMemberId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {validInvitations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-card-foreground">
                <Mail className="h-5 w-5 text-amber-600" />
                Invitaciones Pendientes
                <Badge variant="secondary" className="ml-2">
                  {validInvitations.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Invitaciones que aún no han sido aceptadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isInvitationsLoading ? (
                <div className="divide-y" role="status" aria-label="Cargando invitaciones">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {validInvitations.map((invitation) => (
                    <InvitationRow
                      key={invitation.id}
                      invitation={invitation}
                      onResend={resendInvitationAsync}
                      onCancel={(inv) => {
                        setSelectedInvitation(inv);
                        setIsCancelInviteDialogOpen(true);
                      }}
                      resendingId={resendingId}
                      cancellingId={cancellingId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invite Sheet (Responsive - Right side on desktop, Full screen on mobile) */}
        <Sheet open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <SheetContent
            side="right"
            size="md"
            mobileFullScreen
            className="flex flex-col"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-primary" />
                Invitar Nuevo Miembro
              </SheetTitle>
              <SheetDescription className="text-sm">
                Envía una invitación por email para unirse a tu equipo.
                La invitación expirará en 7 días.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit(onInviteSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="email"
                    placeholder="correo@ejemplo.com"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={cn(
                      'h-11',
                      errors.email && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Role Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="role">
                    Rol <span className="text-destructive">*</span>
                  </label>
                  <Select
                    defaultValue="sales_rep"
                    onValueChange={(value) => setValue('role', value as InviteFormData['role'])}
                  >
                    <SelectTrigger className={cn('h-11', errors.role && 'border-destructive')}>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['admin', 'manager', 'sales_rep', 'viewer'] as const).map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">{ROLE_LABELS[role]}</span>
                            <span className="text-xs text-muted-foreground">
                              {ROLE_DESCRIPTIONS[role]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>

                {/* Custom Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="message">
                    Mensaje personalizado <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Ej: Te invito a unirte a nuestro equipo de ventas..."
                    rows={4}
                    {...register('message')}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este mensaje aparecerá en el email de invitación.
                  </p>
                </div>

                {/* Error Message */}
                {inviteError && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{inviteError.message}</span>
                  </div>
                )}

                {/* Info Box */}
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    El invitado recibirá un email con un enlace para registrarse y unirse al equipo.
                  </span>
                </div>
              </div>

              {/* Footer with Actions */}
              <SheetFooter className="px-6 py-4 border-t bg-muted/30 gap-3 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsInviteOpen(false);
                    reset();
                  }}
                  className="flex-1 sm:flex-none h-11"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isInviting || !!errors.email}
                  type="submit"
                  className="flex-1 sm:flex-none h-11"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Invitación
                    </>
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Change Role Sheet (Responsive) */}
        <Sheet open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <SheetContent
            side="right"
            size="sm"
            mobileFullScreen
            className="flex flex-col"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary shrink-0" />
                <span>Cambiar Rol</span>
              </SheetTitle>
              <SheetDescription className="text-sm">
                Cambiar el rol de{' '}
                <span className="font-medium break-all">
                  {selectedMember?.fullName || selectedMember?.email}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Member Preview */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                  <AvatarImage
                    alt={selectedMember?.fullName || selectedMember?.email || 'Usuario'}
                    src={selectedMember?.avatarUrl || undefined}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(selectedMember?.fullName || selectedMember?.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {selectedMember?.fullName || selectedMember?.email || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMember?.email}
                  </p>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Seleccionar nuevo rol</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'manager', 'sales_rep', 'viewer'] as const).map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-xs', ROLE_COLORS[role])}>
                            {ROLE_LABELS[role]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Description */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{ROLE_LABELS[newRole]}:</strong>{' '}
                  {ROLE_DESCRIPTIONS[newRole]}
                </p>
              </div>

              {/* Current vs New Role Comparison */}
              {selectedMember?.role && newRole !== selectedMember.role && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <Badge className={cn('text-xs', ROLE_COLORS[selectedMember.role])}>
                    {ROLE_LABELS[selectedMember.role]}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className={cn('text-xs', ROLE_COLORS[newRole])}>
                    {ROLE_LABELS[newRole]}
                  </Badge>
                </div>
              )}
            </div>

            {/* Footer */}
            <SheetFooter className="px-6 py-4 border-t bg-muted/30 gap-3">
              <Button
                variant="outline"
                onClick={() => setIsRoleDialogOpen(false)}
                className="flex-1 sm:flex-none h-11"
              >
                Cancelar
              </Button>
              <Button
                disabled={newRole === selectedMember?.role}
                onClick={handleRoleChange}
                className="flex-1 sm:flex-none h-11"
              >
                <Check className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Member Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
                <Trash2 className="h-5 w-5 shrink-0" />
                <span>Eliminar Miembro</span>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Estás a punto de eliminar a{' '}
                    <span className="font-medium text-foreground break-all">
                      {selectedMember?.fullName || selectedMember?.email}
                    </span>{' '}
                    del equipo.
                  </p>
                  <p className="text-destructive font-medium">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2">
              <AlertDialogCancel className="w-full sm:w-auto">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Invitation Confirmation Dialog */}
        <AlertDialog open={isCancelInviteDialogOpen} onOpenChange={setIsCancelInviteDialogOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <span>Cancelar Invitación</span>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Estás a punto de cancelar la invitación enviada a{' '}
                    <span className="font-medium text-foreground break-all">
                      {selectedInvitation?.email}
                    </span>.
                  </p>
                  <p className="text-muted-foreground">
                    El enlace de invitación ya no funcionará y el usuario no podrá unirse al equipo.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2">
              <AlertDialogCancel className="w-full sm:w-auto">
                Mantener
              </AlertDialogCancel>
              <AlertDialogAction
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleCancelInvitation}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Invitación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RBACGuard>
  );
}
