'use client';

import * as React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Edit,
  Loader2,
  MoreHorizontal,
  NotebookPen,
  Pin,
  RefreshCw,
  Send,
  Target,
  Trash2,
  Trophy,
  User,
  XCircle,
} from 'lucide-react';

import { AIOpportunityPanel } from '@/components/ai';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAIPrediction, useAISummary, useAIInsights } from '@/lib/ai/hooks';
import { RBACGuard } from '@/lib/auth';
import {
  useOpportunityDetail,
  useOpportunityNotesManagement,
  useOpportunityActivity,
  type OpportunityNote,
  type OpportunityActivity as OpportunityActivityType,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  formatCurrency,
  calculateForecast,
} from '@/lib/opportunities';

import { DeleteOpportunityDialog } from '../components/delete-opportunity-dialog';
import { OpportunityFormDialog } from '../components/opportunity-form-dialog';
import { WinLostDialog } from '../components/win-lost-dialog';

// ============================================
// Note Card Component
// ============================================

interface NoteCardProps {
  note: OpportunityNote;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
}

function NoteCard({ note, onPin, onDelete }: NoteCardProps) {
  return (
    <Card className={note.isPinned ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {note.author?.name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{note.author?.name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(note.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8" size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPin(note.id, !note.isPinned)}>
                <Pin className="mr-2 h-4 w-4" />
                {note.isPinned ? 'Desfijar' : 'Fijar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(note.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm">{note.content}</p>
      </CardContent>
    </Card>
  );
}

// ============================================
// Activity Item Component
// ============================================

interface ActivityItemProps {
  activity: OpportunityActivityType;
}

function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Activity className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <Badge className={ACTIVITY_COLORS[activity.actionType]} variant="secondary">
            {ACTIVITY_LABELS[activity.actionType]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
          </span>
        </div>
        {activity.description && (
          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
        )}
        {activity.user && (
          <p className="mt-1 text-xs text-muted-foreground">por {activity.user.name}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Detail Page
// ============================================

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const opportunityId = params['opportunityId'] as string;

  // Data
  const {
    opportunity,
    notes,
    activity,
    isOpportunityLoading,
    isNotesLoading,
    isActivityLoading,
    opportunityError,
    refetchOpportunity,
  } = useOpportunityDetail(opportunityId);

  // Notes management
  const {
    addNoteAsync,
    updateNoteAsync,
    deleteNoteAsync,
    isAdding,
  } = useOpportunityNotesManagement(opportunityId);

  // More activity (for infinite scroll or pagination)
  const { data: fullActivity } = useOpportunityActivity(opportunityId, { page: 1, limit: 20 });

  // AI Hooks
  const {
    data: aiPredictionData,
    isLoading: isLoadingPrediction,
    refetch: refetchPrediction,
  } = useAIPrediction(opportunityId, 'conversion', { enabled: !!opportunity });

  const {
    data: aiStagePrediction,
    refetch: refetchStagePrediction,
  } = useAIPrediction(opportunityId, 'stage', { enabled: !!opportunity });

  const {
    data: aiSummaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useAISummary(opportunityId, { enabled: !!opportunity });

  const {
    data: aiInsightsData,
    isLoading: isLoadingInsights,
    refetch: refetchInsights,
  } = useAIInsights('opportunity', opportunityId, { enabled: !!opportunity });

  // Build AI data for panel
  const aiOpportunityData = React.useMemo(() => {
    if (!aiPredictionData && !aiSummaryData && !aiInsightsData) return undefined;

    // Type-safe casting helpers
    type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
    type Urgency = 'low' | 'medium' | 'high' | 'critical';
    type Timeframe = 'days' | 'weeks' | 'months';
    type Category = 'leads' | 'opportunities' | 'customers' | 'pipeline' | 'performance' | 'engagement';

    interface StagePredictionShape {
      currentStage: string;
      predictedStage: string;
      probability: number;
      timeframe: Timeframe;
      estimatedDays: number;
      factors: string[];
    }

    interface ConversionPredictionShape {
      willConvert: boolean;
      probability: number;
      timeframeDays: number;
      potentialValue: number;
      riskFactors: string[];
      positiveIndicators: string[];
    }

    return {
      summary: aiSummaryData?.summary ?? 'Analyzing opportunity data...',
      keyPoints: aiSummaryData?.keyPoints,
      sentiment: aiSummaryData?.sentiment as Sentiment | undefined,
      urgency: aiSummaryData?.urgency as Urgency | undefined,
      nextActions: aiSummaryData?.nextActions,
      topics: aiSummaryData?.topics,
      stagePrediction: aiStagePrediction?.prediction as StagePredictionShape | undefined,
      conversionPrediction: aiPredictionData?.prediction as ConversionPredictionShape | undefined,
      insights: aiInsightsData?.map((insight) => ({
        ...insight,
        category: insight.category as Category,
      })),
      confidence: aiPredictionData?.confidence ?? aiSummaryData?.confidence,
      generatedAt: aiPredictionData?.generatedAt ?? aiSummaryData?.generatedAt,
      lastRefreshed: new Date().toISOString(),
    };
  }, [aiPredictionData, aiStagePrediction, aiSummaryData, aiInsightsData]);

  const isLoadingAI = isLoadingPrediction || isLoadingSummary || isLoadingInsights;

  const handleRefreshAllAI = async () => {
    await Promise.all([
      refetchPrediction(),
      refetchStagePrediction(),
      refetchSummary(),
      refetchInsights(),
    ]);
  };

  // State
  const [newNote, setNewNote] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('overview');

  // Dialogs
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [winLostAction, setWinLostAction] = React.useState<'win' | 'lost' | null>(null);

  // Handlers
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNoteAsync({ content: newNote });
      setNewNote('');
      toast({
        title: 'Nota agregada',
        description: 'La nota ha sido agregada exitosamente.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo agregar la nota.',
        variant: 'destructive',
      });
    }
  };

  const handlePinNote = async (noteId: string, isPinned: boolean) => {
    try {
      await updateNoteAsync(noteId, { isPinned });
      toast({
        title: isPinned ? 'Nota fijada' : 'Nota desfijada',
      });
    } catch {
      toast({
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNoteAsync(noteId);
      toast({
        title: 'Nota eliminada',
      });
    } catch {
      toast({
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  // Helpers
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  // Loading
  if (isOpportunityLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (opportunityError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold">Error al cargar la oportunidad</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {opportunityError?.message || 'No se pudo cargar la información. Por favor, intenta de nuevo.'}
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => router.push('/app/opportunities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => void refetchOpportunity()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Oportunidad no encontrada</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/app/opportunities')}>
          Volver a oportunidades
        </Button>
      </div>
    );
  }

  const forecast = calculateForecast(opportunity.amount, opportunity.probability);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/opportunities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{opportunity.title}</h1>
              <Badge className={STATUS_COLORS[opportunity.status]}>
                {STATUS_LABELS[opportunity.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {opportunity.customer?.name || opportunity.lead?.fullName || 'Sin cliente asignado'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetchOpportunity()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            {opportunity.status === 'open' && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                  onClick={() => setWinLostAction('win')}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Ganada
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setWinLostAction('lost')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Perdida
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <RBACGuard fallback={null} minRole="admin">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </RBACGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </RBACGuard>
        </div>
      </div>

      <Separator />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(opportunity.amount, opportunity.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Probabilidad</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunity.probability}%</div>
            <Progress className="mt-2" value={opportunity.probability} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(forecast, opportunity.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              = Monto x Probabilidad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cierre Esperado</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDate(opportunity.expectedCloseDate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="mr-2 h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-purple-500" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="notes">
            <NotebookPen className="mr-2 h-4 w-4" />
            Notas ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Actividad
          </TabsTrigger>
          <TabsTrigger value="related">
            <User className="mr-2 h-4 w-4" />
            Relacionados
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-4" value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informacion General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge className={STATUS_COLORS[opportunity.status]}>
                      {STATUS_LABELS[opportunity.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                    <Badge className={PRIORITY_COLORS[opportunity.priority]}>
                      {PRIORITY_LABELS[opportunity.priority]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Etapa</p>
                    <p className="text-sm">
                      {opportunity.stage ? (
                        <Badge
                          style={{
                            borderColor: opportunity.stage.color,
                            color: opportunity.stage.color,
                          }}
                          variant="outline"
                        >
                          {opportunity.stage.label}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Moneda</p>
                    <p className="text-sm">{opportunity.currency}</p>
                  </div>
                </div>

                {opportunity.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descripcion</p>
                    <p className="text-sm whitespace-pre-wrap">{opportunity.description}</p>
                  </div>
                )}

                {opportunity.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                      {opportunity.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates & Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Fechas y Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Creada</p>
                    <p className="text-sm">{formatDate(opportunity.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actualizada</p>
                    <p className="text-sm">{formatDate(opportunity.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cierre Esperado</p>
                    <p className="text-sm">{formatDate(opportunity.expectedCloseDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cierre Real</p>
                    <p className="text-sm">{formatDate(opportunity.actualCloseDate)}</p>
                  </div>
                </div>

                {opportunity.status === 'won' && opportunity.wonNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notas de Cierre</p>
                    <p className="text-sm text-green-600">{opportunity.wonNotes}</p>
                  </div>
                )}

                {opportunity.status === 'lost' && opportunity.lostReason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Motivo de Perdida</p>
                    <p className="text-sm text-red-600">{opportunity.lostReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent className="space-y-4" value="ai">
          <AIOpportunityPanel
            opportunityId={opportunityId}
            tenantId={opportunity.tenantId || 'default'}
            data={aiOpportunityData}
            isLoading={isLoadingAI}
            onRefreshSummary={() => { void refetchSummary(); }}
            onRefreshPredictions={() => { void Promise.all([refetchPrediction(), refetchStagePrediction()]); }}
            onRefreshInsights={() => { void refetchInsights(); }}
            onRefreshAll={handleRefreshAllAI}
            onActionClick={(action) => {
              toast({
                title: 'Action triggered',
                description: action.action,
              });
            }}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent className="space-y-4" value="notes">
          {/* Add Note */}
          <RBACGuard fallback={null} minRole="sales_rep">
            <Card>
              <CardContent className="pt-4">
                <Textarea
                  className="min-h-[100px]"
                  placeholder="Escribe una nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button disabled={!newNote.trim() || isAdding} onClick={handleAddNote}>
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    Agregar Nota
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RBACGuard>

          {/* Notes List */}
          {isNotesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <NotebookPen className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Sin notas todavia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pinned notes first */}
              {notes
                .filter((n) => n.isPinned)
                .map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDeleteNote}
                    onPin={handlePinNote}
                  />
                ))}
              {/* Rest of notes */}
              {notes
                .filter((n) => !n.isPinned)
                .map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDeleteNote}
                    onPin={handlePinNote}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent className="space-y-4" value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividad</CardTitle>
              <CardDescription>
                Todas las acciones realizadas en esta oportunidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (fullActivity?.data ?? activity).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">Sin actividad registrada</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {(fullActivity?.data ?? activity).map((act) => (
                    <ActivityItem key={act.id} activity={act} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Tab */}
        <TabsContent className="space-y-4" value="related">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity.customer ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(opportunity.customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{opportunity.customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.customer.email || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin cliente asignado</p>
                )}
              </CardContent>
            </Card>

            {/* Lead */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity.lead ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(opportunity.lead.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{opportunity.lead.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.lead.email || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin lead asociado</p>
                )}
              </CardContent>
            </Card>

            {/* Owner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity.owner ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(opportunity.owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{opportunity.owner.name}</p>
                      <p className="text-sm text-muted-foreground">{opportunity.owner.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin propietario asignado</p>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity.contact ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(opportunity.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{opportunity.contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.contact.email || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin contacto asignado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpportunityFormDialog
        open={isEditOpen}
        opportunity={opportunity}
        onClose={() => setIsEditOpen(false)}
      />

      <DeleteOpportunityDialog
        open={isDeleteOpen}
        opportunity={opportunity}
        onClose={() => {
          setIsDeleteOpen(false);
          router.push('/app/opportunities');
        }}
      />

      <WinLostDialog
        action={winLostAction ?? 'win'}
        open={!!winLostAction}
        opportunity={opportunity}
        onClose={() => setWinLostAction(null)}
      />
    </div>
  );
}
