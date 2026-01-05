'use client';

/**
 * ConfirmationCard Component
 *
 * Displays a confirmation request for high-impact AI actions.
 * User can confirm, cancel, or modify the action.
 *
 * @module app/assistant/components/ConfirmationCard
 */

import * as React from 'react';

import { AlertTriangle, Check, Edit3, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { AIConfirmationRequest } from '@/lib/ai-assistant';

// ============================================
// Types
// ============================================

interface ConfirmationCardProps {
  confirmation: AIConfirmationRequest;
  onConfirm: () => void;
  onCancel: () => void;
  onModify?: () => void;
  isLoading?: boolean;
}

// ============================================
// Main Component
// ============================================

export function ConfirmationCard({
  confirmation,
  onConfirm,
  onCancel,
  onModify,
  isLoading = false,
}: ConfirmationCardProps) {
  return (
    <Card
      className={cn(
        'backdrop-blur-xl',
        'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
        'border border-amber-500/30',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-500/20 p-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-amber-400">
              Confirmación Requerida
            </CardTitle>
            <CardDescription className="text-xs text-amber-300/70">
              {confirmation.isHighImpact
                ? 'Esta acción es de alto impacto'
                : 'Por favor confirma esta acción'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Description */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{confirmation.action}</p>
          <p className="text-sm text-muted-foreground">{confirmation.description}</p>
        </div>

        {/* Parameters Preview */}
        {Object.keys(confirmation.parameters).length > 0 && (
          <div className="rounded-lg bg-black/20 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Parámetros:</p>
            {Object.entries(confirmation.parameters).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{key}:</span>
                <span className="text-foreground font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1',
              'bg-gradient-to-r from-emerald-600 to-emerald-500',
              'hover:from-emerald-500 hover:to-emerald-400'
            )}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Confirmar
          </Button>

          {onModify && (
            <Button
              size="sm"
              variant="outline"
              onClick={onModify}
              disabled={isLoading}
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Modificar
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

ConfirmationCard.displayName = 'ConfirmationCard';
