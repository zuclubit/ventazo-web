'use client';

// ============================================
// AI Command Palette - FASE 6.1
// Command palette with AI actions integration
// ============================================

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  BarChart3,
  Brain,
  FileSearch,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/store/ui.store';

// ============================================
// Types
// ============================================

interface AIAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'scoring' | 'insights' | 'summary' | 'prediction' | 'classification' | 'enrichment';
  shortcut?: string;
  action: () => void | Promise<void>;
}

interface AICommandPaletteProps {
  leadId?: string;
  opportunityId?: string;
  customerId?: string;
  onAction?: (actionId: string) => void | Promise<void>;
}

// ============================================
// Component
// ============================================

export function AICommandPalette({
  leadId,
  opportunityId,
  customerId,
  onAction,
}: AICommandPaletteProps) {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Handle keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const handleAction = async (action: AIAction) => {
    setIsProcessing(true);
    try {
      await action.action();
      if (onAction) {
        await onAction(action.id);
      }
    } finally {
      setIsProcessing(false);
      setCommandPaletteOpen(false);
    }
  };

  // Define AI actions based on context
  const leadActions: AIAction[] = leadId
    ? [
        {
          id: 'score-lead',
          label: 'Score Lead',
          description: 'Calculate AI-powered lead score',
          icon: Star,
          category: 'scoring',
          shortcut: '⌘S',
          action: () => {
            router.push(`/app/leads/${leadId}?tab=ai&action=score`);
          },
        },
        {
          id: 'summarize-lead',
          label: 'Summarize Lead',
          description: 'Generate AI summary of lead activity',
          icon: FileSearch,
          category: 'summary',
          shortcut: '⌘U',
          action: () => {
            router.push(`/app/leads/${leadId}?tab=ai&action=summary`);
          },
        },
        {
          id: 'classify-lead',
          label: 'Classify Lead',
          description: 'AI classification and segmentation',
          icon: Tag,
          category: 'classification',
          action: () => {
            router.push(`/app/leads/${leadId}?tab=ai&action=classify`);
          },
        },
        {
          id: 'predict-conversion',
          label: 'Predict Conversion',
          description: 'Predict lead conversion probability',
          icon: TrendingUp,
          category: 'prediction',
          action: () => {
            router.push(`/app/leads/${leadId}?tab=ai&action=predict`);
          },
        },
        {
          id: 'enrich-lead',
          label: 'Enrich Lead Data',
          description: 'AI-powered data enrichment',
          icon: Sparkles,
          category: 'enrichment',
          action: () => {
            router.push(`/app/leads/${leadId}?tab=ai&action=enrich`);
          },
        },
      ]
    : [];

  const opportunityActions: AIAction[] = opportunityId
    ? [
        {
          id: 'analyze-opportunity',
          label: 'Analyze Opportunity',
          description: 'AI analysis of deal potential',
          icon: BarChart3,
          category: 'insights',
          action: () => {
            router.push(`/app/opportunities/${opportunityId}?tab=ai&action=analyze`);
          },
        },
        {
          id: 'predict-stage',
          label: 'Predict Stage Change',
          description: 'Predict next pipeline stage',
          icon: Target,
          category: 'prediction',
          action: () => {
            router.push(`/app/opportunities/${opportunityId}?tab=ai&action=stage`);
          },
        },
        {
          id: 'suggest-actions',
          label: 'Suggest Next Actions',
          description: 'AI-recommended next steps',
          icon: Lightbulb,
          category: 'insights',
          action: () => {
            router.push(`/app/opportunities/${opportunityId}?tab=ai&action=actions`);
          },
        },
      ]
    : [];

  const customerActions: AIAction[] = customerId
    ? [
        {
          id: 'customer-insights',
          label: 'Customer Insights',
          description: 'AI-generated customer intelligence',
          icon: Users,
          category: 'insights',
          action: () => {
            router.push(`/app/customers/${customerId}?tab=ai`);
          },
        },
        {
          id: 'sentiment-analysis',
          label: 'Sentiment Analysis',
          description: 'Analyze customer sentiment',
          icon: MessageSquare,
          category: 'classification',
          action: () => {
            router.push(`/app/customers/${customerId}?tab=ai&action=sentiment`);
          },
        },
      ]
    : [];

  const globalActions: AIAction[] = [
    {
      id: 'dashboard-insights',
      label: 'View AI Insights',
      description: 'Go to AI insights dashboard',
      icon: Brain,
      category: 'insights',
      shortcut: '⌘I',
      action: () => {
        router.push('/app/dashboard?tab=insights');
      },
    },
    {
      id: 'bulk-score',
      label: 'Bulk Score Leads',
      description: 'Score multiple leads at once',
      icon: Zap,
      category: 'scoring',
      action: () => {
        router.push('/app/leads?action=bulk-score');
      },
    },
    {
      id: 'refresh-predictions',
      label: 'Refresh AI Predictions',
      description: 'Update all AI predictions',
      icon: RefreshCw,
      category: 'prediction',
      action: () => {
        router.push('/app/dashboard?action=refresh-ai');
      },
    },
    {
      id: 'ai-assistant',
      label: 'Open AI Assistant',
      description: 'Chat with AI about your CRM data',
      icon: Wand2,
      category: 'insights',
      shortcut: '⌘A',
      action: () => {
        router.push('/app/assistant');
      },
    },
  ];

  const hasContextActions = leadActions.length > 0 || opportunityActions.length > 0 || customerActions.length > 0;

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        disabled={isProcessing}
        placeholder="Search AI actions..."
      />
      <CommandList>
        <CommandEmpty>No AI actions found.</CommandEmpty>

        {/* Context-specific actions */}
        {leadActions.length > 0 && (
          <CommandGroup heading="Lead AI Actions">
            {leadActions.map((action) => (
              <CommandItem
                key={action.id}
                disabled={isProcessing}
                onSelect={() => { void handleAction(action); }}
              >
                <action.icon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-1 flex-col">
                  <span>{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </div>
                {action.shortcut && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {action.shortcut}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {opportunityActions.length > 0 && (
          <CommandGroup heading="Opportunity AI Actions">
            {opportunityActions.map((action) => (
              <CommandItem
                key={action.id}
                disabled={isProcessing}
                onSelect={() => { void handleAction(action); }}
              >
                <action.icon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-1 flex-col">
                  <span>{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {customerActions.length > 0 && (
          <CommandGroup heading="Customer AI Actions">
            {customerActions.map((action) => (
              <CommandItem
                key={action.id}
                disabled={isProcessing}
                onSelect={() => { void handleAction(action); }}
              >
                <action.icon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-1 flex-col">
                  <span>{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasContextActions && <CommandSeparator />}

        {/* Global AI Actions */}
        <CommandGroup heading="Global AI Actions">
          {globalActions.map((action) => (
            <CommandItem
              key={action.id}
              disabled={isProcessing}
              onSelect={() => { void handleAction(action); }}
            >
              <action.icon className="mr-2 h-4 w-4 text-primary" />
              <div className="flex flex-1 flex-col">
                <span>{action.label}</span>
                <span className="text-xs text-muted-foreground">
                  {action.description}
                </span>
              </div>
              {action.shortcut && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {action.shortcut}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// ============================================
// Hook for triggering AI Command Palette
// ============================================

export function useAICommandPalette() {
  const { setCommandPaletteOpen, toggleCommandPalette } = useUIStore();

  return {
    open: () => setCommandPaletteOpen(true),
    close: () => setCommandPaletteOpen(false),
    toggle: toggleCommandPalette,
  };
}

// ============================================
// AI Actions Button (for toolbar integration)
// ============================================

interface AIActionsButtonProps {
  className?: string;
}

export function AIActionsButton({ className }: AIActionsButtonProps) {
  const { open } = useAICommandPalette();

  return (
    <button
      className={className}
      type="button"
      onClick={open}
    >
      <Brain className="h-4 w-4" />
      <span className="ml-2">AI Actions</span>
      <kbd className="ml-auto text-xs text-muted-foreground">⌘K</kbd>
    </button>
  );
}
