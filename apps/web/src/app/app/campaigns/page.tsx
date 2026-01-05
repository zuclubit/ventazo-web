'use client';

/**
 * Campaigns Page
 *
 * Campaign management interface for email marketing.
 * Features:
 * - Campaign list with filters
 * - KPI dashboard
 * - Create/edit campaigns
 * - Analytics view
 */

import * as React from 'react';
import { Plus, Search, Filter, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageContainer } from '@/components/layout/page-container';

import {
  CampaignCard,
  CampaignsEmptyState,
  CampaignsKPIDashboard,
} from './components';
import { useCampaignTheme } from './hooks';
import {
  useCampaigns,
  useCampaignsDashboard,
  useDeleteCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useDuplicateCampaign,
} from '@/lib/campaigns';
import type { Campaign, CampaignStatus, CampaignChannel } from '@/lib/campaigns';

// ============================================
// Component
// ============================================

export default function CampaignsPage() {
  // Apply dynamic theming
  useCampaignTheme();

  // State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<CampaignStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = React.useState<CampaignChannel | 'all'>('all');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

  // Data fetching
  const { data: campaignsData, isLoading: isLoadingCampaigns, refetch } = useCampaigns({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    channel: channelFilter !== 'all' ? channelFilter : undefined,
    search: searchQuery || undefined,
  });
  const { data: dashboardStats, isLoading: isLoadingStats } = useCampaignsDashboard();

  // Mutations
  const deleteCampaign = useDeleteCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const duplicateCampaign = useDuplicateCampaign();

  // Extract campaigns
  const campaigns = campaignsData?.campaigns ?? [];

  // Handlers
  const handleCreateCampaign = () => {
    // TODO: Open create campaign dialog/page
    console.log('Create campaign');
  };

  const handleViewCampaign = (campaign: Campaign) => {
    // TODO: Navigate to campaign detail
    console.log('View campaign:', campaign.id);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    // TODO: Navigate to campaign editor
    console.log('Edit campaign:', campaign.id);
  };

  const handleSendCampaign = (campaign: Campaign) => {
    // TODO: Open send confirmation dialog
    console.log('Send campaign:', campaign.id);
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    await duplicateCampaign.mutateAsync({
      id: campaign.id,
      name: `${campaign.name} (copia)`,
    });
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    await pauseCampaign.mutateAsync(campaign.id);
  };

  const handleResumeCampaign = async (campaign: Campaign) => {
    await resumeCampaign.mutateAsync(campaign.id);
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    // TODO: Show confirmation dialog
    await deleteCampaign.mutateAsync(campaign.id);
  };

  const handleViewAnalytics = (campaign: Campaign) => {
    // TODO: Navigate to analytics page
    console.log('View analytics:', campaign.id);
  };

  const handleKPIClick = (kpi: string) => {
    // Filter by KPI type
    switch (kpi) {
      case 'active':
        setStatusFilter('active');
        break;
      case 'scheduled':
        setStatusFilter('scheduled');
        break;
      case 'completed':
        setStatusFilter('completed');
        break;
      default:
        setStatusFilter('all');
    }
  };

  return (
    <PageContainer>
      <PageContainer.Header>
        <PageContainer.HeaderRow>
          <PageContainer.Title subtitle="Gestiona tus campañas de email marketing">
            Campañas
          </PageContainer.Title>
          <PageContainer.Actions>
            <Button
              onClick={handleCreateCampaign}
              className="gap-2 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva campaña</span>
            </Button>
          </PageContainer.Actions>
        </PageContainer.HeaderRow>
      </PageContainer.Header>
      <PageContainer.Body>
        <PageContainer.Content scroll="vertical">
          <div className="space-y-6">
            {/* KPI Dashboard */}
            <CampaignsKPIDashboard
              stats={dashboardStats}
              isLoading={isLoadingStats}
              onKPIClick={handleKPIClick}
            />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campañas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as CampaignStatus | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="scheduled">Programadas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            <Select
              value={channelFilter}
              onValueChange={(v) => setChannelFilter(v as CampaignChannel | 'all')}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="push_notification">Push</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>

                {/* View Mode Toggle */}
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as 'list' | 'grid')}
                  className="hidden sm:block"
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="list" className="px-2">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="grid" className="px-2">
                      <LayoutGrid className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Content */}
            {isLoadingCampaigns ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <CampaignsEmptyState
                onCreateCampaign={handleCreateCampaign}
                onViewTemplates={() => {
                  // TODO: Navigate to templates
                }}
              />
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3'
                }
              >
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onView={handleViewCampaign}
                    onEdit={handleEditCampaign}
                    onSend={handleSendCampaign}
                    onDuplicate={handleDuplicateCampaign}
                    onPause={handlePauseCampaign}
                    onResume={handleResumeCampaign}
                    onDelete={handleDeleteCampaign}
                    onViewAnalytics={handleViewAnalytics}
                  />
                ))}
              </div>
            )}
          </div>
        </PageContainer.Content>
      </PageContainer.Body>
    </PageContainer>
  );
}
