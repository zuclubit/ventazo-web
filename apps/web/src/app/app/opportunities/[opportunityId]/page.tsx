'use client';

import * as React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { format, type Locale } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { useI18n } from '@/lib/i18n';

// Date locale mapping
const dateLocales: Record<string, Locale> = {
  'es-MX': es,
  'es-CO': es,
  'es-AR': es,
  'es-CL': es,
  'es-PE': es,
  'pt-BR': ptBR,
  'en-US': enUS,
};
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
  type OpportunityActivityType as ActivityTypeEnum,
  STATUS_COLORS,
  PRIORITY_COLORS,
  ACTIVITY_COLORS,
  formatCurrency,
  calculateForecast,
} from '@/lib/opportunities';

import { DeleteOpportunityDialog } from '../components/delete-opportunity-dialog';
import { OpportunityFormSheet } from '../components/opportunity-form-sheet';
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
  const { t, locale } = useI18n();
  const dateLocale = dateLocales[locale] || es;

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
              <p className="text-sm font-medium">{note.author?.name || t.opportunities.detail.notes.user}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(note.createdAt), 'PPp', { locale: dateLocale })}
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
                {note.isPinned ? t.opportunities.detail.notes.unpin : t.opportunities.detail.notes.pin}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(note.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t.opportunities.detail.notes.delete}
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

// Map backend activity types (snake_case) to i18n keys (camelCase)
const activityTypeToI18nKey: Record<string, keyof typeof import('@/lib/i18n').translations['es-MX']['opportunities']['activity']> = {
  created: 'created',
  updated: 'updated',
  status_changed: 'statusChanged',
  stage_changed: 'stageChanged',
  owner_changed: 'ownerChanged',
  amount_changed: 'amountChanged',
  probability_changed: 'probabilityChanged',
  won: 'won',
  lost: 'lost',
  reopened: 'reopened',
  note_added: 'noteAdded',
  note_updated: 'noteUpdated',
  note_deleted: 'noteDeleted',
  close_date_changed: 'closeDateChanged',
  contact_linked: 'contactLinked',
  contact_unlinked: 'contactUnlinked',
};

interface ActivityItemProps {
  activity: OpportunityActivityType;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const { t, locale } = useI18n();
  const dateLocale = dateLocales[locale] || es;

  const i18nKey = activityTypeToI18nKey[activity.actionType] || 'updated';
  const activityLabel = t.opportunities.activity[i18nKey as keyof typeof t.opportunities.activity];

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
            {activityLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.createdAt), 'PPp', { locale: dateLocale })}
          </span>
        </div>
        {activity.description && (
          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
        )}
        {activity.user && (
          <p className="mt-1 text-xs text-muted-foreground">{t.opportunities.detail.notes.by} {activity.user.name}</p>
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
  const { t, locale } = useI18n();
  const dateLocale = dateLocales[locale] || es;
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
        title: t.opportunities.detail.notes.noteAdded,
        description: t.opportunities.detail.notes.noteAddedDescription,
      });
    } catch {
      toast({
        title: t.opportunities.detail.error.title,
        description: t.opportunities.detail.error.description,
        variant: 'destructive',
      });
    }
  };

  const handlePinNote = async (noteId: string, isPinned: boolean) => {
    try {
      await updateNoteAsync(noteId, { isPinned });
      toast({
        title: isPinned ? t.opportunities.detail.notes.notePinned : t.opportunities.detail.notes.noteUnpinned,
      });
    } catch {
      toast({
        title: t.opportunities.detail.error.title,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNoteAsync(noteId);
      toast({
        title: t.opportunities.detail.notes.noteDeleted,
      });
    } catch {
      toast({
        title: t.opportunities.detail.error.title,
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
    return format(new Date(dateStr), 'PPP', { locale: dateLocale });
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
        <h3 className="text-lg font-semibold">{t.opportunities.detail.error.title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {opportunityError?.message || t.opportunities.detail.error.description}
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => router.push('/app/opportunities')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.opportunities.detail.error.back}
          </Button>
          <Button onClick={() => void refetchOpportunity()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.opportunities.detail.error.retry}
          </Button>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">{t.opportunities.detail.error.notFound}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/app/opportunities')}>
          {t.opportunities.detail.error.backToOpportunities}
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
              <h1 className="text-2xl font-bold tracking-tight">{opportunity.name}</h1>
              <Badge className={STATUS_COLORS[opportunity.status]}>
                {t.opportunities.status[opportunity.status as keyof typeof t.opportunities.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {opportunity.customer?.name || opportunity.lead?.fullName || t.opportunities.detail.noCustomer}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetchOpportunity()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.opportunities.detail.refresh}
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
                  {t.opportunities.detail.won}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setWinLostAction('lost')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t.opportunities.detail.lost}
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
                  {t.opportunities.actions.edit}
                </DropdownMenuItem>
                <RBACGuard fallback={null} minRole="admin">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t.opportunities.actions.delete}
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
            <CardTitle className="text-sm font-medium">{t.opportunities.detail.amount}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t.opportunities.detail.probability}</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunity.probability}%</div>
            <Progress className="mt-2" value={opportunity.probability} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.opportunities.detail.forecast}</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(forecast, opportunity.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t.opportunities.detail.forecastFormula}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.opportunities.detail.expectedClose}</CardTitle>
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
            {t.opportunities.detail.tabs.overview}
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-purple-500" />
            {t.opportunities.detail.tabs.aiInsights}
          </TabsTrigger>
          <TabsTrigger value="notes">
            <NotebookPen className="mr-2 h-4 w-4" />
            {t.opportunities.detail.tabs.notes} ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            {t.opportunities.detail.tabs.activity}
          </TabsTrigger>
          <TabsTrigger value="related">
            <User className="mr-2 h-4 w-4" />
            {t.opportunities.detail.tabs.related}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-4" value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t.opportunities.detail.generalInfo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.status.label}</p>
                    <Badge className={STATUS_COLORS[opportunity.status]}>
                      {t.opportunities.status[opportunity.status as keyof typeof t.opportunities.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.priority.label}</p>
                    <Badge className={PRIORITY_COLORS[opportunity.priority]}>
                      {t.opportunities.priority[opportunity.priority as keyof typeof t.opportunities.priority]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.stage}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.currency}</p>
                    <p className="text-sm">{opportunity.currency}</p>
                  </div>
                </div>

                {opportunity.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.description}</p>
                    <p className="text-sm whitespace-pre-wrap">{opportunity.description}</p>
                  </div>
                )}

                {opportunity.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t.opportunities.detail.tags}</p>
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
                <CardTitle>{t.opportunities.detail.datesAndStatus}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.created}</p>
                    <p className="text-sm">{formatDate(opportunity.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.updated}</p>
                    <p className="text-sm">{formatDate(opportunity.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.expectedClose}</p>
                    <p className="text-sm">{formatDate(opportunity.expectedCloseDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.actualClose}</p>
                    <p className="text-sm">{formatDate(opportunity.actualCloseDate)}</p>
                  </div>
                </div>

                {opportunity.status === 'won' && opportunity.wonNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.closingNotes}</p>
                    <p className="text-sm text-green-600">{opportunity.wonNotes}</p>
                  </div>
                )}

                {opportunity.status === 'lost' && opportunity.lostReason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t.opportunities.detail.lossReason}</p>
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
                  placeholder={t.opportunities.detail.notes.placeholder}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button disabled={!newNote.trim() || isAdding} onClick={handleAddNote}>
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    {t.opportunities.detail.notes.addNote}
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
              <p className="mt-2 text-sm text-muted-foreground">{t.opportunities.detail.notes.noNotes}</p>
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
              <CardTitle>{t.opportunities.detail.activityHistory}</CardTitle>
              <CardDescription>
                {t.opportunities.detail.activityDescription}
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
                  <p className="mt-2 text-sm text-muted-foreground">{t.opportunities.detail.noActivity}</p>
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
                  {t.opportunities.detail.customer}
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
                  <p className="text-sm text-muted-foreground">{t.opportunities.detail.noCustomerAssigned}</p>
                )}
              </CardContent>
            </Card>

            {/* Lead */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t.opportunities.detail.lead}
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
                  <p className="text-sm text-muted-foreground">{t.opportunities.detail.noLeadAssigned}</p>
                )}
              </CardContent>
            </Card>

            {/* Owner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t.opportunities.detail.owner}
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
                  <p className="text-sm text-muted-foreground">{t.opportunities.detail.noOwnerAssigned}</p>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t.opportunities.detail.contact}
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
                  <p className="text-sm text-muted-foreground">{t.opportunities.detail.noContactAssigned}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpportunityFormSheet
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
