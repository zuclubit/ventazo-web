'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Pin,
  PinOff,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { RBACGuard } from '@/lib/auth';
import {
  useCustomerDetail,
  useCustomerNotesManagement,
  useCustomerActivity,
  STATUS_LABELS,
  STATUS_COLORS,
  TIER_LABELS,
  TIER_COLORS,
  TYPE_LABELS,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
} from '@/lib/customers';

import { CustomerFormDialog } from '../components/customer-form-dialog';
import { DeleteCustomerDialog } from '../components/delete-customer-dialog';

// ============================================
// Customer Detail Page
// ============================================

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params['customerId'] as string;

  // Dialogs
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  // Notes
  const [newNote, setNewNote] = React.useState('');
  const [activityPage] = React.useState(1);

  // Data
  const {
    customer,
    isLoading,
    customerError,
    refetchCustomer,
  } = useCustomerDetail(customerId);

  const {
    notes,
    isLoading: isNotesLoading,
    addNoteAsync,
    isAdding,
    updateNoteAsync,
    deleteNoteAsync,
  } = useCustomerNotesManagement(customerId);

  const {
    data: activityData,
    isLoading: isActivityLoading,
    refetch: refetchActivity,
  } = useCustomerActivity(customerId, { page: activityPage, limit: 20 });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNoteAsync({ content: newNote });
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await updateNoteAsync(noteId, { isPinned: !isPinned });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNoteAsync(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (customerError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Cliente no encontrado</p>
        <p className="text-sm text-muted-foreground">
          El cliente que buscas no existe o fue eliminado
        </p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/app/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">
              {getInitials(customer.companyName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{customer.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_COLORS[customer.status]}>
                {STATUS_LABELS[customer.status]}
              </Badge>
              <Badge className={TIER_COLORS[customer.tier]} variant="outline">
                {TIER_LABELS[customer.tier]}
              </Badge>
              <Badge variant="secondary">
                {TYPE_LABELS[customer.type]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetchCustomer()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </RBACGuard>
          <RBACGuard fallback={null} minRole="admin">
            <Button size="sm" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </RBACGuard>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="related">Relacionados</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6 mt-6" value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Contact Info */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informacion de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a className="hover:underline" href={`mailto:${customer.email}`}>
                        {customer.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p>{customer.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sitio Web</p>
                      {customer.website ? (
                        <a
                          className="flex items-center gap-1 hover:underline"
                          href={customer.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {customer.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p>-</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente desde</p>
                      <p>
                        {format(new Date(customer.convertedAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {customer.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Etiquetas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {customer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes Preview */}
                {customer.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notas</p>
                      <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                    <p className="text-xl font-bold">{formatCurrency(customer.totalRevenue)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor de Vida</p>
                    <p className="text-lg font-semibold">{formatCurrency(customer.lifetimeValue)}</p>
                  </div>
                </div>
                {customer.lastPurchaseDate && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ultima Compra</p>
                        <p>{format(new Date(customer.lastPurchaseDate), "d MMM yyyy", { locale: es })}</p>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{customer.opportunityCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Oportunidades</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.taskCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tareas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Ultimas acciones relacionadas con este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activityData?.data.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Sin actividad registrada
                </p>
              ) : (
                <div className="space-y-4">
                  {activityData?.data.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-1">
                        <Badge className={ACTIVITY_COLORS[activity.actionType]} variant="secondary">
                          {ACTIVITY_LABELS[activity.actionType] || activity.actionType}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        {activity.description && (
                          <p className="text-sm">{activity.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {activity.userName && <span>{activity.userName} · </span>}
                          {format(new Date(activity.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent className="space-y-6 mt-6" value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notas del Cliente
              </CardTitle>
              <CardDescription>
                Agrega notas y comentarios sobre este cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <RBACGuard fallback={null} minRole="sales_rep">
                <div className="space-y-2">
                  <Textarea
                    className="min-h-[100px]"
                    disabled={isAdding}
                    placeholder="Escribe una nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button disabled={!newNote.trim() || isAdding} onClick={handleAddNote}>
                      {isAdding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Agregar Nota
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Separator />
              </RBACGuard>

              {/* Notes List */}
              {isNotesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <p className="mt-4 text-muted-foreground">
                    No hay notas para este cliente
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`rounded-lg border p-4 ${note.isPinned ? 'bg-amber-50 border-amber-200' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.createdByName && <span>{note.createdByName} · </span>}
                            {format(new Date(note.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        </div>
                        <RBACGuard fallback={null} minRole="sales_rep">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleTogglePin(note.id, note.isPinned)}
                            >
                              {note.isPinned ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              className="text-destructive hover:text-destructive"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RBACGuard>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent className="space-y-6 mt-6" value="activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Historial de Actividad</CardTitle>
                <CardDescription>
                  Timeline completo de acciones para este cliente
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetchActivity()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activityData?.data.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <p className="mt-4 text-muted-foreground">
                    Sin actividad registrada
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-6">
                    {activityData?.data.map((activity) => (
                      <div key={activity.id} className="relative flex gap-4 pl-8">
                        <div className="absolute left-0 mt-1.5 h-8 w-8 rounded-full border bg-background flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={ACTIVITY_COLORS[activity.actionType]} variant="secondary">
                              {ACTIVITY_LABELS[activity.actionType] || activity.actionType}
                            </Badge>
                          </div>
                          {activity.description && (
                            <p className="text-sm">{activity.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {activity.userName && <span>{activity.userName} · </span>}
                            {format(new Date(activity.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                          {Object.keys(activity.changes).length > 0 && (
                            <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                              <pre className="overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(activity.changes, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Tab */}
        <TabsContent className="space-y-6 mt-6" value="related">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades</CardTitle>
                <CardDescription>
                  Oportunidades de venta asociadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Modulo de oportunidades pendiente</p>
                  <p className="text-sm">Disponible en proximas fases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tareas</CardTitle>
                <CardDescription>
                  Tareas pendientes y completadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Modulo de tareas pendiente</p>
                  <p className="text-sm">Disponible en proximas fases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  Contratos y documentos asociados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Modulo de documentos pendiente</p>
                  <p className="text-sm">Disponible en proximas fases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comunicaciones</CardTitle>
                <CardDescription>
                  Llamadas, emails y reuniones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Modulo de comunicaciones pendiente</p>
                  <p className="text-sm">Disponible en proximas fases</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <CustomerFormDialog
        customer={customer}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        customer={customer}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          router.push('/app/customers');
        }}
      />
    </div>
  );
}
