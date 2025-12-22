'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trophy, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import {
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  type Opportunity,
  formatCurrency,
} from '@/lib/opportunities';

// ============================================
// Form Schema Factories
// ============================================

const winFormSchema = z.object({
  notes: z.string().optional(),
});

const createLostFormSchema = (reasonMessage: string) => z.object({
  reason: z.string().min(5, reasonMessage),
});

type WinFormValues = z.infer<typeof winFormSchema>;
type LostFormValues = z.infer<ReturnType<typeof createLostFormSchema>>;

// ============================================
// Props
// ============================================

interface WinLostDialogProps {
  opportunity: Opportunity | null;
  action: 'win' | 'lost';
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function WinLostDialog({
  opportunity,
  action,
  open,
  onClose,
}: WinLostDialogProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const isWin = action === 'win';

  // Create schema with translations
  const lostFormSchema = React.useMemo(
    () => createLostFormSchema(t.opportunities.winLostDialog.lost.reasonRequired),
    [t]
  );

  // Mutations
  const markWon = useMarkOpportunityWon();
  const markLost = useMarkOpportunityLost();

  // Win form
  const winForm = useForm<WinFormValues>({
    resolver: zodResolver(winFormSchema),
    defaultValues: {
      notes: '',
    },
  });

  // Lost form
  const lostForm = useForm<LostFormValues>({
    resolver: zodResolver(lostFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  // Reset forms when dialog opens
  React.useEffect(() => {
    if (open) {
      winForm.reset({ notes: '' });
      lostForm.reset({ reason: '' });
    }
  }, [open, winForm, lostForm]);

  // Win handler
  const handleWin = async (values: WinFormValues) => {
    if (!opportunity) return;

    try {
      await markWon.mutateAsync({
        opportunityId: opportunity.id,
        data: {
          notes: values.notes || undefined,
        },
      });
      toast({
        title: t.opportunities.winLostDialog.success.won,
        description: t.opportunities.winLostDialog.success.wonDescription,
      });
      onClose();
    } catch {
      toast({
        title: t.opportunities.form.errors.updateFailed,
        description: t.opportunities.winLostDialog.errors.wonFailed,
        variant: 'destructive',
      });
    }
  };

  // Lost handler
  const handleLost = async (values: LostFormValues) => {
    if (!opportunity) return;

    try {
      await markLost.mutateAsync({
        opportunityId: opportunity.id,
        data: {
          reason: values.reason,
        },
      });
      toast({
        title: t.opportunities.winLostDialog.success.lost,
        description: t.opportunities.winLostDialog.success.lostDescription,
      });
      onClose();
    } catch {
      toast({
        title: t.opportunities.form.errors.updateFailed,
        description: t.opportunities.winLostDialog.errors.lostFailed,
        variant: 'destructive',
      });
    }
  };

  const isPending = markWon.isPending || markLost.isPending;

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWin ? (
              <>
                <Trophy className="h-5 w-5 text-green-500" />
                {t.opportunities.winLostDialog.win.title}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                {t.opportunities.winLostDialog.lost.title}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isWin
              ? t.opportunities.winLostDialog.win.description
              : t.opportunities.winLostDialog.lost.description}
          </DialogDescription>
        </DialogHeader>

        {/* Opportunity Info */}
        <div className="rounded-md bg-muted p-4">
          <p className="font-medium">{opportunity.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(opportunity.amount, opportunity.currency)}
          </p>
          {opportunity.customer?.name && (
            <p className="text-sm text-muted-foreground">
              {t.opportunities.preview.client}: {opportunity.customer.name}
            </p>
          )}
        </div>

        {/* Win Form */}
        {isWin ? (
          <Form {...winForm}>
            <form className="space-y-4" onSubmit={winForm.handleSubmit(handleWin)}>
              <FormField
                control={winForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.opportunities.winLostDialog.win.notesLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        placeholder={t.opportunities.winLostDialog.win.notesPlaceholder}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t.opportunities.actions.cancel}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trophy className="mr-2 h-4 w-4" />
                  {t.opportunities.winLostDialog.win.confirm}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          /* Lost Form */
          <Form {...lostForm}>
            <form className="space-y-4" onSubmit={lostForm.handleSubmit(handleLost)}>
              <FormField
                control={lostForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.opportunities.winLostDialog.lost.reasonLabel} *</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        placeholder={t.opportunities.winLostDialog.lost.reasonPlaceholder}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {t.opportunities.actions.cancel}
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <XCircle className="mr-2 h-4 w-4" />
                  {t.opportunities.winLostDialog.lost.confirm}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
