'use client';

/**
 * QuoteSendDialog - Send Quote Modal
 *
 * Dialog for sending quotes via email or SMS/WhatsApp.
 * Includes message preview and recipient management.
 *
 * Features:
 * - Email sending with custom subject and message
 * - SMS/WhatsApp option
 * - Message preview
 * - Loading states
 * - Error handling
 *
 * @version 1.0.0
 * @module quotes/components/QuoteSendDialog
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Quote, SendQuoteRequest } from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

export interface QuoteSendDialogProps {
  quote: Quote | null;
  open: boolean;
  onClose: () => void;
  onSend: (quoteId: string, data: SendQuoteRequest) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// Validation Schema
// ============================================

const sendQuoteSchema = z.object({
  sendMethod: z.enum(['email', 'sms', 'both']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  subject: z.string().optional(),
  message: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => {
  if (data.sendMethod === 'email' || data.sendMethod === 'both') {
    return data.email && data.email.length > 0;
  }
  return true;
}, {
  message: 'Email es requerido para enviar por correo',
  path: ['email'],
}).refine((data) => {
  if (data.sendMethod === 'sms' || data.sendMethod === 'both') {
    return data.phone && data.phone.length > 0;
  }
  return true;
}, {
  message: 'Teléfono es requerido para enviar por SMS',
  path: ['phone'],
});

type SendQuoteFormData = z.infer<typeof sendQuoteSchema>;

// ============================================
// Helpers
// ============================================

/**
 * Format currency amount
 * Note: Backend stores values in cents, so we divide by 100
 */
function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function getDefaultSubject(quote: Quote): string {
  return `Cotización ${quote.quoteNumber} - ${quote.title || 'Su cotización'}`;
}

function getDefaultMessage(quote: Quote): string {
  const clientName = quote.customerName || quote.leadName || 'Cliente';
  return `Estimado/a ${clientName},

Le adjuntamos la cotización ${quote.quoteNumber} por un total de ${formatCurrency(quote.total, quote.currency)}.

Puede revisar los detalles en el enlace incluido. La cotización tiene validez hasta la fecha indicada en el documento.

Quedamos atentos a cualquier duda o comentario.

Saludos cordiales.`;
}

// ============================================
// Main Component
// ============================================

export function QuoteSendDialog({
  quote,
  open,
  onClose,
  onSend,
  isLoading = false,
}: QuoteSendDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  // Form setup
  const form = useForm<SendQuoteFormData>({
    resolver: zodResolver(sendQuoteSchema),
    defaultValues: {
      sendMethod: 'email',
      email: '',
      subject: '',
      message: '',
      phone: '',
    },
  });

  // Reset form when quote changes
  React.useEffect(() => {
    if (quote && open) {
      form.reset({
        sendMethod: 'email',
        email: quote.contactEmail || '',
        subject: getDefaultSubject(quote),
        message: getDefaultMessage(quote),
        phone: '',
      });
      setSent(false);
    }
  }, [quote, open, form]);

  // Handle submit
  const handleSubmit = async (data: SendQuoteFormData) => {
    if (!quote) return;

    setSending(true);
    try {
      const request: SendQuoteRequest = {
        email: data.sendMethod !== 'sms' ? data.email : undefined,
        subject: data.subject,
        message: data.message,
        sendSms: data.sendMethod === 'sms' || data.sendMethod === 'both',
        phone: data.sendMethod !== 'email' ? data.phone : undefined,
      };

      await onSend(quote.id, request);
      setSent(true);

      toast({
        title: 'Cotización enviada',
        description: `La cotización ${quote.quoteNumber} ha sido enviada exitosamente.`,
      });

      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error al enviar',
        description: error instanceof Error ? error.message : 'No se pudo enviar la cotización.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendMethod = form.watch('sendMethod');
  const isPending = sending || isLoading;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Cotización
          </DialogTitle>
          <DialogDescription>
            {quote && (
              <span className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">
                  {quote.quoteNumber}
                </Badge>
                <span className="text-foreground font-medium">
                  {formatCurrency(quote.total, quote.currency)}
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          // Success State
          <div className="py-8 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                ¡Cotización Enviada!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                El cliente recibirá la cotización en breve.
              </p>
            </div>
          </div>
        ) : (
          // Form
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Send Method Tabs */}
              <FormField
                control={form.control}
                name="sendMethod"
                render={({ field }) => (
                  <FormItem>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="email" className="gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="hidden sm:inline">Email</span>
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span className="hidden sm:inline">SMS</span>
                        </TabsTrigger>
                        <TabsTrigger value="both" className="gap-2">
                          <Send className="h-4 w-4" />
                          <span className="hidden sm:inline">Ambos</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormItem>
                )}
              />

              {/* Email Fields */}
              {(sendMethod === 'email' || sendMethod === 'both') && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Envío por Email
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinatario</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@ejemplo.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asunto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Asunto del correo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Mensaje personalizado..."
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          El enlace a la cotización se incluirá automáticamente.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* SMS Fields */}
              {(sendMethod === 'sms' || sendMethod === 'both') && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Envío por SMS/WhatsApp
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+52 55 1234 5678"
                            type="tel"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Incluye el código de país (+52 para México).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Quote Preview */}
              {quote && (
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {quote.title || quote.quoteNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quote.customerName || quote.leadName}
                      </p>
                    </div>
                    <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
                      {formatCurrency(quote.total, quote.currency)}
                    </Badge>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Cotización
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default QuoteSendDialog;
