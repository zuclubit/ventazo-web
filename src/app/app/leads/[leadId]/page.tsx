'use client';

import * as React from 'react';

import { useRouter, useParams } from 'next/navigation';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Zap,
} from 'lucide-react';

import { AIAssistantPanel } from '@/components/ai';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAIScore, useAISummary, useAIClassify } from '@/lib/ai/hooks';
import { RBACGuard } from '@/lib/auth';
import {
  useLeadDetail,
  useLeadNotesManagement,
  useLeadActivity,
  LeadStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
} from '@/lib/leads';

import { ConvertLeadDialog } from '../components/convert-lead-dialog';
import { DeleteLeadDialog } from '../components/delete-lead-dialog';
import { LeadFormDialog } from '../components/lead-form-dialog';

// ============================================
// Lead Detail Page
// ============================================

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params['leadId'] as string;

  // Dialogs
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);

  // Notes
  const [newNote, setNewNote] = React.useState('');

  // Data
  const {
    lead,
    notes,
    stages,
    isLoading,
    leadError,
    refetchLead,
  } = useLeadDetail(leadId);

  const {
    addNote,
    updateNote,
    deleteNote,
  } = useLeadNotesManagement(leadId);

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    hasNextPage,
    fetchNextPage,
  } = useLeadActivity(leadId);

  const activities = activityData?.pages.flatMap((page) => page.data) || [];

  // AI Hooks
  const {
    data: aiScoreData,
    isLoading: isLoadingScore,
    refetch: refetchScore,
  } = useAIScore(leadId, { enabled: !!lead });

  const {
    data: aiSummaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useAISummary(leadId, { enabled: !!lead });

  const {
    data: aiClassifyData,
    isLoading: isLoadingClassify,
    refetch: refetchClassify,
  } = useAIClassify(leadId, { enabled: !!lead });

  // Build AI data for panel
  const aiData = React.useMemo(() => {
    if (!aiScoreData && !aiSummaryData && !aiClassifyData) return undefined;

    // Type-safe casting helpers
    type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
    type Recommendation = 'pursue' | 'nurture' | 'archive' | 'convert';
    type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
    type Urgency = 'low' | 'medium' | 'high' | 'critical';
    type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    type Intent = 'low' | 'medium' | 'high';

    return {
      // Score
      score: aiScoreData?.score ?? 0,
      grade: aiScoreData?.grade as Grade | undefined,
      scoreConfidence: aiScoreData?.confidence,
      scoreFactors: aiScoreData?.factors,
      scoreExplanations: aiScoreData?.explanations,
      recommendation: aiScoreData?.recommendation as Recommendation | undefined,
      previousScore: aiScoreData?.previousScore,

      // Summary
      summary: aiSummaryData?.summary ?? '',
      keyPoints: aiSummaryData?.keyPoints,
      sentiment: aiSummaryData?.sentiment as Sentiment | undefined,
      urgency: aiSummaryData?.urgency as Urgency | undefined,
      nextActions: aiSummaryData?.nextActions,
      topics: aiSummaryData?.topics,

      // Classification
      primaryLabel: aiClassifyData?.primaryLabel ?? 'Unknown',
      labels: aiClassifyData?.labels,
      industry: aiClassifyData?.industry,
      companySize: aiClassifyData?.companySize as CompanySize | undefined,
      buyerPersona: aiClassifyData?.buyerPersona,
      intentLevel: aiClassifyData?.intentLevel as Intent | undefined,
      interests: aiClassifyData?.interests,
      classificationConfidence: aiClassifyData?.confidence,

      // Metadata
      generatedAt: aiScoreData?.generatedAt ?? aiSummaryData?.generatedAt ?? aiClassifyData?.generatedAt,
      lastRefreshed: new Date().toISOString(),
    };
  }, [aiScoreData, aiSummaryData, aiClassifyData]);

  const isLoadingAI = isLoadingScore || isLoadingSummary || isLoadingClassify;

  const handleRefreshAllAI = async () => {
    await Promise.all([refetchScore(), refetchSummary(), refetchClassify()]);
  };

  const handleApplyClassification = (classification: {
    primaryLabel: string;
    industry?: string;
    companySize?: string;
    intentLevel?: string;
    interests?: string[];
  }) => {
    // TODO: Implement applying classification to lead
    console.log('Applying classification:', classification);
  };

  const handleAddSummaryAsNote = async () => {
    if (aiSummaryData?.summary) {
      try {
        await addNote.mutateAsync({
          leadId,
          content: `[AI Summary]\n${aiSummaryData.summary}`,
        });
      } catch (error) {
        console.error('Failed to add AI summary as note:', error);
      }
    }
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

  // Format date
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays} dias`;
    if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
    return format(date, 'd MMM yyyy', { locale: es });
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await addNote.mutateAsync({
        leadId,
        content: newNote,
      });
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await updateNote.mutateAsync({
        leadId,
        noteId,
        isPinned: !isPinned,
      });
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync({ leadId, noteId });
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Get current stage
  const currentStage = stages.find((s) => s.id === lead?.stageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leadError || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg font-medium">Lead no encontrado</p>
        <Button className="mt-4" onClick={() => router.push('/app/leads')}>
          Volver a Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">{getInitials(lead.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{lead.fullName}</h1>
              <Badge className={STATUS_COLORS[lead.status]}>
                {STATUS_LABELS[lead.status]}
              </Badge>
              {currentStage && (
                <Badge
                  style={{
                    borderColor: currentStage.color,
                    color: currentStage.color,
                  }}
                  variant="outline"
                >
                  {currentStage.label}
                </Badge>
              )}
            </div>
            {lead.companyName && (
              <p className="text-muted-foreground">{lead.companyName}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {SOURCE_LABELS[lead.source]} | Desde: {formatDate(lead.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" onClick={() => refetchLead()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            {lead.status === LeadStatus.QUALIFIED && (
              <Button onClick={() => setIsConvertOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Convertir a Cliente
              </Button>
            )}
          </RBACGuard>
          <RBACGuard fallback={null} minRole="admin">
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
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
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-purple-500" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notas ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="related">Relacionados</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6 mt-6" value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informacion de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    className="text-primary hover:underline"
                    href={`mailto:${lead.email}`}
                  >
                    {lead.email}
                  </a>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="text-primary hover:underline"
                      href={`tel:${lead.phone}`}
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="text-primary hover:underline flex items-center gap-1"
                      href={lead.website}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {lead.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {lead.companyName && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.companyName}</span>
                  </div>
                )}
                {lead.industry && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.industry}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Score & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Score y Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Lead Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${
                          lead.score >= 70
                            ? 'bg-green-500'
                            : lead.score >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className="font-bold text-xl">{lead.score}</span>
                  </div>
                </div>
                <Separator />
                {lead.nextFollowUpAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Proximo seguimiento</p>
                      <p className="font-medium">{formatDate(lead.nextFollowUpAt)}</p>
                    </div>
                  </div>
                )}
                {lead.lastActivityAt && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ultima actividad</p>
                      <p className="font-medium">{formatRelativeTime(lead.lastActivityAt)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Etiquetas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notas del Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent className="space-y-6 mt-6" value="ai">
          <AIAssistantPanel
            leadId={leadId}
            tenantId={lead.tenantId || 'default'}
            data={aiData}
            isLoading={isLoadingAI}
            onRefreshScore={() => { void refetchScore(); }}
            onRefreshSummary={() => { void refetchSummary(); }}
            onRefreshClassification={() => { void refetchClassify(); }}
            onRefreshAll={handleRefreshAllAI}
            onApplyClassification={handleApplyClassification}
            onAddSummaryAsNote={handleAddSummaryAsNote}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent className="space-y-6 mt-6" value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notas
              </CardTitle>
              <CardDescription>
                Agrega notas para mantener un registro de las interacciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note */}
              <RBACGuard fallback={null} minRole="sales_rep">
                <div className="flex gap-2">
                  <Textarea
                    className="min-h-[80px]"
                    placeholder="Escribe una nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <Button
                    disabled={!newNote.trim() || addNote.isPending}
                    onClick={handleAddNote}
                  >
                    {addNote.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </RBACGuard>

              <Separator />

              {/* Notes List */}
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sin notas todavia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border ${
                        note.isPinned ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="whitespace-pre-wrap flex-1">{note.content}</p>
                        <RBACGuard fallback={null} minRole="sales_rep">
                          <div className="flex gap-1 ml-2">
                            <Button
                              className="h-8 w-8"
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
                              className="h-8 w-8 text-destructive"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RBACGuard>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {formatRelativeTime(note.createdAt)}
                      </p>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial de Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sin actividad registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 items-start">
                      <div
                        className={`p-2 rounded-full bg-muted ${
                          ACTIVITY_COLORS[activity.actionType] || 'text-gray-600'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {ACTIVITY_LABELS[activity.actionType] ||
                            activity.actionType}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {hasNextPage && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => fetchNextPage()}
                    >
                      Cargar mas
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Tab */}
        <TabsContent className="space-y-6 mt-6" value="related">
          <Card>
            <CardHeader>
              <CardTitle>Oportunidades</CardTitle>
              <CardDescription>
                Las oportunidades relacionadas apareceran aqui (FASE 5.4)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Sin oportunidades relacionadas</p>
                <p className="text-sm">Proximamente en FASE 5.4</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <LeadFormDialog
        lead={lead}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      {/* Delete Dialog */}
      <DeleteLeadDialog
        lead={lead}
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          router.push('/app/leads');
        }}
      />

      {/* Convert Dialog */}
      <ConvertLeadDialog
        lead={lead}
        open={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
      />
    </div>
  );
}
