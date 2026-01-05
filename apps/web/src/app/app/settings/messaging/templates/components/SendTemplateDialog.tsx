'use client';

/**
 * SendTemplateDialog Component
 *
 * Dialog for sending a template to multiple recipients (customers/leads).
 * Features:
 * - Recipient type selection (Customers, Leads, Both)
 * - Filters: status, tier, tags
 * - Recipient count preview
 * - Template preview with variables
 * - Bulk send with progress indicator
 *
 * Uses existing useSendBulkMessage hook for sending.
 */

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  Mail,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/lib/customers';
import { useLeads } from '@/lib/leads';
import {
  useSendBulkMessage,
  usePreviewTemplate,
  type MessageTemplate,
  type BulkRecipient,
} from '@/lib/messaging';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SendTemplateDialogProps {
  /** Template to send */
  template: MessageTemplate | null;
  /** Dialog open state */
  open: boolean;
  /** Handler for open state change */
  onOpenChange: (open: boolean) => void;
}

type RecipientType = 'customers' | 'leads' | 'both';

interface RecipientFilters {
  status?: string[];
  tier?: string[];
  tags?: string[];
  searchTerm?: string;
}

// ============================================
// Status/Tier Options
// ============================================

const CUSTOMER_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'at_risk', label: 'En Riesgo' },
  { value: 'churned', label: 'Perdido' },
];

const CUSTOMER_TIERS = [
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'premium', label: 'Premium' },
  { value: 'standard', label: 'Estándar' },
  { value: 'basic', label: 'Básico' },
];

const LEAD_STATUSES = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

// ============================================
// Main Component
// ============================================

export function SendTemplateDialog({
  template,
  open,
  onOpenChange,
}: SendTemplateDialogProps) {
  const { toast } = useToast();

  // State
  const [recipientType, setRecipientType] = React.useState<RecipientType>('customers');
  const [filters, setFilters] = React.useState<RecipientFilters>({});
  const [sendProgress, setSendProgress] = React.useState(0);
  const [isSending, setIsSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<{
    success: boolean;
    sent: number;
    failed: number;
  } | null>(null);

  // Hooks
  const sendBulk = useSendBulkMessage();
  const previewTemplate = usePreviewTemplate();

  // Fetch recipients based on type and filters
  // Note: filters.status/tier are string[] that match the enum values
  const customersQuery = useCustomers({
    status: filters.status as unknown as import('@/lib/customers').CustomerStatus[] | undefined,
    tier: filters.tier as unknown as import('@/lib/customers').CustomerTier[] | undefined,
    searchTerm: filters.searchTerm,
    limit: 100,
    enabled: open && (recipientType === 'customers' || recipientType === 'both'),
  });

  const leadsQuery = useLeads({
    status: filters.status?.[0] as import('@/lib/leads').LeadStatus | undefined,
    searchTerm: filters.searchTerm,
    limit: 100,
  });

  // Calculate recipients
  const recipients = React.useMemo(() => {
    const result: BulkRecipient[] = [];

    // Add customers
    if ((recipientType === 'customers' || recipientType === 'both') && customersQuery.data?.data) {
      customersQuery.data.data.forEach((customer) => {
        if (customer.email) {
          result.push({
            to: customer.email,
            variables: {
              'customer.name': customer.displayName || customer.companyName,
              'customer.email': customer.email,
              'customer.phone': customer.phone || '',
              'customer.company': customer.companyName,
            },
            metadata: {
              recipientName: customer.displayName || customer.companyName,
              recipientType: 'customer',
              recipientId: customer.id,
              triggeredBy: 'manual',
            },
          });
        }
      });
    }

    // Add leads
    if ((recipientType === 'leads' || recipientType === 'both') && leadsQuery.data?.data) {
      leadsQuery.data.data.forEach((lead) => {
        if (lead.email) {
          result.push({
            to: lead.email,
            variables: {
              'lead.name': lead.fullName || lead.companyName || 'Cliente',
              'lead.email': lead.email,
              'lead.phone': lead.phone || '',
              'lead.company': lead.companyName || '',
              'lead.status': lead.status,
              'lead.score': lead.score?.toString() || '0',
            },
            metadata: {
              recipientName: lead.fullName || lead.companyName || lead.email,
              recipientType: 'lead',
              recipientId: lead.id,
              triggeredBy: 'manual',
            },
          });
        }
      });
    }

    return result;
  }, [recipientType, customersQuery.data, leadsQuery.data]);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRecipientType('customers');
      setFilters({});
      setSendProgress(0);
      setIsSending(false);
      setSendResult(null);
    }
  }, [open]);

  // Handle filter toggle
  const toggleFilter = (type: 'status' | 'tier', value: string) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated.length > 0 ? updated : undefined };
    });
  };

  // Handle send
  const handleSend = async () => {
    if (!template || recipients.length === 0) return;

    setIsSending(true);
    setSendProgress(0);
    setSendResult(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSendProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await sendBulk.mutateAsync({
        channel: template.channel,
        recipients,
        templateId: template.id,
      });

      clearInterval(progressInterval);
      setSendProgress(100);

      setSendResult({
        success: true,
        sent: result.sent ?? recipients.length,
        failed: result.failed ?? 0,
      });

      toast({
        title: 'Mensajes enviados',
        description: `Se enviaron ${result.sent ?? recipients.length} mensajes exitosamente.`,
      });
    } catch (error) {
      setSendResult({
        success: false,
        sent: 0,
        failed: recipients.length,
      });

      toast({
        title: 'Error al enviar',
        description: 'Hubo un error al enviar los mensajes. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Preview template
  const handlePreview = () => {
    if (!template) return;

    previewTemplate.mutate({
      templateId: template.id,
      context: recipients[0]?.variables || {},
    });
  };

  if (!template) return null;

  const isLoading = customersQuery.isLoading || leadsQuery.isLoading;
  const statusOptions = recipientType === 'leads' ? LEAD_STATUSES : CUSTOMER_STATUSES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Template: {template.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona los destinatarios y envía el mensaje masivo
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Recipient Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Destinatarios</Label>
            <Tabs
              value={recipientType}
              onValueChange={(v) => setRecipientType(v as RecipientType)}
            >
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="customers" className="gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </TabsTrigger>
                <TabsTrigger value="leads" className="gap-2">
                  <Users className="h-4 w-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="both" className="gap-2">
                  <Users className="h-4 w-4" />
                  Ambos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nombre o email..."
              value={filters.searchTerm || ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value || undefined }))
              }
            />
          </div>

          {/* Filters Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="filters">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avanzados
                  {(filters.status?.length || filters.tier?.length) && (
                    <Badge variant="secondary" className="ml-2">
                      {(filters.status?.length || 0) + (filters.tier?.length || 0)} activos
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <Badge
                        key={status.value}
                        variant={filters.status?.includes(status.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleFilter('status', status.value)}
                      >
                        {status.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tier Filter (only for customers) */}
                {recipientType !== 'leads' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nivel</Label>
                    <div className="flex flex-wrap gap-2">
                      {CUSTOMER_TIERS.map((tier) => (
                        <Badge
                          key={tier.value}
                          variant={filters.tier?.includes(tier.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleFilter('tier', tier.value)}
                        >
                          {tier.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Recipients Count */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Destinatarios</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Cargando...' : `${recipients.length} contactos seleccionados`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={recipients.length === 0}>
                <Mail className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            </div>

            {/* Preview Result */}
            {previewTemplate.data && (
              <div className="mt-4 p-3 bg-background rounded border">
                {previewTemplate.data.subject && (
                  <p className="font-medium text-sm mb-2">
                    Asunto: {previewTemplate.data.subject}
                  </p>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewTemplate.data.body}
                </p>
              </div>
            )}
          </div>

          {/* Send Progress / Result */}
          {(isSending || sendResult) && (
            <div className="space-y-3">
              {isSending && (
                <>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">Enviando mensajes...</span>
                  </div>
                  <Progress value={sendProgress} className="h-2" />
                </>
              )}

              {sendResult && (
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    sendResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  )}
                >
                  {sendResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {sendResult.success ? 'Envío completado' : 'Error en el envío'}
                    </p>
                    <p className="text-sm">
                      {sendResult.sent} enviados, {sendResult.failed} fallidos
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sendResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!sendResult && (
            <Button
              onClick={handleSend}
              disabled={recipients.length === 0 || isSending || isLoading}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a {recipients.length} destinatarios
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendTemplateDialog;
