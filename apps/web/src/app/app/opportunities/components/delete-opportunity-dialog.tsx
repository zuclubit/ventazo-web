'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import {
  useDeleteOpportunity,
  type Opportunity,
  formatCurrency,
} from '@/lib/opportunities';

// ============================================
// Props
// ============================================

interface DeleteOpportunityDialogProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DeleteOpportunityDialog({
  opportunity,
  open,
  onClose,
}: DeleteOpportunityDialogProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const deleteOpportunity = useDeleteOpportunity();

  const handleDelete = async () => {
    if (!opportunity) return;

    try {
      await deleteOpportunity.mutateAsync(opportunity.id);
      toast({
        title: t.opportunities.deleteDialog.success,
        description: t.opportunities.deleteDialog.successDescription,
      });
      onClose();
    } catch {
      toast({
        title: t.opportunities.form.errors.updateFailed,
        description: t.opportunities.deleteDialog.error,
        variant: 'destructive',
      });
    }
  };

  if (!opportunity) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t.opportunities.deleteDialog.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t.opportunities.deleteDialog.description}
            </p>
            <div className="mt-4 rounded-md bg-muted p-3">
              <p className="font-medium">{opportunity.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(opportunity.amount, opportunity.currency)}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.opportunities.actions.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteOpportunity.isPending}
            onClick={handleDelete}
          >
            {deleteOpportunity.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t.opportunities.actions.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
