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
import {
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  type Opportunity,
  formatCurrency,
} from '@/lib/opportunities';

// ============================================
// Form Schemas
// ============================================

const winFormSchema = z.object({
  notes: z.string().optional(),
});

const lostFormSchema = z.object({
  reason: z.string().min(5, 'Por favor indica el motivo de perdida'),
});

type WinFormValues = z.infer<typeof winFormSchema>;
type LostFormValues = z.infer<typeof lostFormSchema>;

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
  const isWin = action === 'win';

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
        title: 'Oportunidad ganada',
        description: 'La oportunidad ha sido marcada como ganada exitosamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo marcar la oportunidad como ganada.',
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
        title: 'Oportunidad perdida',
        description: 'La oportunidad ha sido marcada como perdida.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo marcar la oportunidad como perdida.',
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
                Marcar como Ganada
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Marcar como Perdida
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isWin
              ? 'Felicidades! Registra la oportunidad como ganada.'
              : 'Registra el motivo por el cual se perdio esta oportunidad.'}
          </DialogDescription>
        </DialogHeader>

        {/* Opportunity Info */}
        <div className="rounded-md bg-muted p-4">
          <p className="font-medium">{opportunity.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(opportunity.amount, opportunity.currency)}
          </p>
          {opportunity.customer?.name && (
            <p className="text-sm text-muted-foreground">
              Cliente: {opportunity.customer.name}
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
                    <FormLabel>Notas de cierre (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        placeholder="Ej: Contrato firmado, inicio de implementacion en enero..."
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
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trophy className="mr-2 h-4 w-4" />
                  Confirmar Ganada
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
                    <FormLabel>Motivo de perdida *</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        placeholder="Ej: Presupuesto insuficiente, eligieron competencia, proyecto cancelado..."
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
                  Cancelar
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirmar Perdida
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
