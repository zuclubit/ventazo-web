'use client';

// ============================================
// AI Classification Card Component - FASE 6.1
// Displays AI lead classification results
// ============================================

import { useState } from 'react';

import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Tag,
  Target,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { IntentBadge } from './ai-badge';

// ============================================
// Types
// ============================================

type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
type IntentLevel = 'low' | 'medium' | 'high';

interface ClassificationLabel {
  label: string;
  probability: number;
  description?: string;
}

interface AIClassificationCardProps {
  primaryLabel: string;
  labels?: ClassificationLabel[];
  industry?: string;
  companySize?: CompanySize;
  buyerPersona?: string;
  intentLevel?: IntentLevel;
  interests?: string[];
  confidence?: number;
  generatedAt?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onApply?: (classification: {
    primaryLabel: string;
    industry?: string;
    companySize?: CompanySize;
    intentLevel?: IntentLevel;
    interests?: string[];
  }) => void;
  className?: string;
}

// ============================================
// Configuration
// ============================================

const companySizeConfig: Record<CompanySize, { label: string; icon: string }> = {
  startup: { label: 'Startup', icon: '🚀' },
  small: { label: 'Small (1-50)', icon: '🏠' },
  medium: { label: 'Medium (51-200)', icon: '🏢' },
  large: { label: 'Large (201-1000)', icon: '🏛️' },
  enterprise: { label: 'Enterprise (1000+)', icon: '🌐' },
};

// ============================================
// Subcomponents
// ============================================

function LabelProbabilityBar({
  label,
  probability,
  isPrimary = false,
}: {
  label: string;
  probability: number;
  isPrimary?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm',
            isPrimary
              ? 'font-semibold text-slate-900 dark:text-slate-100'
              : 'text-slate-600 dark:text-slate-400'
          )}
        >
          {label}
        </span>
        <span className="text-xs text-slate-500">
          {Math.round(probability * 100)}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isPrimary
              ? 'bg-purple-500'
              : probability > 0.5
              ? 'bg-blue-400'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
          style={{ width: `${probability * 100}%` }}
        />
      </div>
    </div>
  );
}

function InterestTag({ interest }: { interest: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <Tag className="h-3 w-3" />
      {interest}
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function AIClassificationCard({
  primaryLabel,
  labels = [],
  industry,
  companySize,
  buyerPersona,
  intentLevel,
  interests = [],
  confidence,
  generatedAt: _generatedAt,
  isLoading = false,
  onRefresh,
  onApply,
  className,
}: AIClassificationCardProps) {
  // generatedAt is available for future use in displaying timestamp
  void _generatedAt;
  const [expanded, setExpanded] = useState(true);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (onApply) {
      onApply({
        primaryLabel,
        industry,
        companySize,
        intentLevel,
        interests,
      });
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  const sizeInfo = companySize ? companySizeConfig[companySize] : undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900 p-4', className)}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI Classification
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              className="h-7 w-7 p-0"
              size="sm"
              variant="ghost"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            className="h-7 w-7 p-0"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Primary Label */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Classification
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {primaryLabel}
              </p>
            </div>
            {intentLevel && <IntentBadge intent={intentLevel} size="lg" />}
          </div>

          {/* Label Probabilities */}
          {labels.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Confidence Breakdown
              </span>
              <div className="space-y-2">
                {labels.slice(0, 4).map((label, index) => (
                  <LabelProbabilityBar
                    key={index}
                    isPrimary={index === 0}
                    label={label.label}
                    probability={label.probability}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Industry */}
            {industry && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Industry</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {industry}
                </p>
              </div>
            )}

            {/* Company Size */}
            {sizeInfo && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Company Size</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {sizeInfo.icon} {sizeInfo.label}
                </p>
              </div>
            )}

            {/* Buyer Persona */}
            {buyerPersona && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 col-span-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs">Buyer Persona</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {buyerPersona}
                </p>
              </div>
            )}
          </div>

          {/* Interests */}
          {interests.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                Detected Interests
              </span>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest, index) => (
                  <InterestTag key={index} interest={interest} />
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          {onApply && (
            <Button
              className="w-full"
              disabled={applied}
              variant={applied ? 'outline' : 'default'}
              onClick={handleApply}
            >
              {applied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Classification Applied
                </>
              ) : (
                'Apply Classification to Lead'
              )}
            </Button>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 italic">
              AI-generated classification. Review before applying.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {confidence !== undefined && (
                <span>{Math.round(confidence * 100)}% confidence</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
