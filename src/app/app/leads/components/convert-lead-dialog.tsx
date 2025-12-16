'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircle2, Loader2, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useConvertLead, type Lead } from '@/lib/leads';

// ============================================
// Props
// ============================================

interface ConvertLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function ConvertLeadDialog({ lead, open, onClose }: ConvertLeadDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const convertLead = useConvertLead();

  const [contractValue, setContractValue] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [converted, setConverted] = React.useState(false);
  const [customerId, setCustomerId] = React.useState<string | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setContractValue('');
      setNotes('');
      setConverted(false);
      setCustomerId(null);
    }
  }, [open]);

  const handleConvert = async () => {
    if (!lead) return;

    try {
      const result = await convertLead.mutateAsync({
        leadId: lead.id,
        data: {
          contractValue: contractValue ? Number(contractValue) : undefined,
          notes: notes || undefined,
        },
      });

      setConverted(true);
      setCustomerId(result.customerId);
      toast({
        title: 'Lead convertido',
        description: 'El lead ha sido convertido a cliente exitosamente.',
      });
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo convertir el lead.',
        variant: 'destructive',
      });
    }
  };

  const handleViewCustomer = () => {
    if (customerId) {
      router.push(`/app/customers/${customerId}`);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        {!converted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Convertir Lead a Cliente
              </DialogTitle>
              <DialogDescription>
                Al convertir este lead, se creara automaticamente un nuevo cliente
                con la informacion del lead.
              </DialogDescription>
            </DialogHeader>

            {lead && (
              <div className="space-y-4">
                <div className="rounded-md border p-4 bg-muted/50">
                  <p className="font-medium">{lead.fullName}</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                  {lead.companyName && (
                    <p className="text-sm text-muted-foreground">{lead.companyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractValue">Valor del contrato (opcional)</Label>
                  <Input
                    disabled={convertLead.isPending}
                    id="contractValue"
                    placeholder="10000"
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas de conversion (opcional)</Label>
                  <Textarea
                    disabled={convertLead.isPending}
                    id="notes"
                    placeholder="Notas sobre la conversion..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                disabled={convertLead.isPending}
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                disabled={convertLead.isPending}
                onClick={handleConvert}
              >
                {convertLead.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Convirtiendo...
                  </>
                ) : (
                  'Convertir a Cliente'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Lead Convertido Exitosamente
              </DialogTitle>
              <DialogDescription>
                El lead ha sido convertido a cliente. Puedes ver el nuevo cliente
                haciendo clic en el boton de abajo.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border p-4 bg-green-50 dark:bg-green-950">
              <p className="font-medium text-green-800 dark:text-green-200">
                {lead?.fullName} ahora es un cliente
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Se ha creado el registro del cliente con toda la informacion del lead
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={handleViewCustomer}>
                Ver Cliente
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
