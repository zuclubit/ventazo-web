/**
 * Payment Routes
 * REST API endpoints for payment processing
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { PaymentService } from '../../infrastructure/payments/payment.service';
import { PaymentProvider } from '../../infrastructure/payments/types';

// Validation schemas
const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  metadata: z.record(z.string()).optional(),
});

const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  metadata: z.record(z.string()).optional(),
});

const createPaymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.enum(['USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN']),
  customerId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string()).optional(),
  invoiceId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  statementDescriptor: z.string().max(22).optional(),
});

const confirmPaymentSchema = z.object({
  paymentMethodId: z.string().min(1),
});

const createRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().int().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'other']).optional(),
  metadata: z.record(z.string()).optional(),
});

const createCheckoutSchema = z.object({
  mode: z.enum(['payment', 'subscription', 'setup']),
  lineItems: z.array(z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    amount: z.number().int().positive(),
    currency: z.enum(['USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN']),
    quantity: z.number().int().positive(),
    imageUrl: z.string().url().optional(),
  })).min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string()).optional(),
  subscriptionPlanId: z.string().uuid().optional(),
});

const createPlanSchema = z.object({
  provider: z.enum(['stripe', 'mercadopago']),
  providerPlanId: z.string().min(1),
  providerPriceId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  amount: z.number().int().positive(),
  currency: z.enum(['USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN']),
  interval: z.enum(['day', 'week', 'month', 'year']),
  intervalCount: z.number().int().positive().default(1),
  trialDays: z.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  limits: z.record(z.number()).optional(),
  isActive: z.boolean().default(true),
});

const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).optional(),
  metadata: z.record(z.string()).optional(),
});

const listPaymentsSchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const listSubscriptionsSchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  currency: z.enum(['USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN']).optional(),
});

const providerQuerySchema = z.object({
  provider: z.enum(['stripe', 'mercadopago']).optional(),
});

/**
 * Payment Routes Plugin
 */
export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  const paymentService = container.resolve(PaymentService);

  // Get provider status
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = paymentService.getProviderStatus();
    const available = paymentService.getAvailableProviders();
    return reply.send({ success: true, data: { providers: status, available } });
  });

  // ==================== Customer Endpoints ====================

  // Create customer
  fastify.post('/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = createCustomerSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createCustomer(
      tenantId,
      validation.data,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Get customer by ID
  fastify.get('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await paymentService.getCustomer(tenantId, request.params.id);

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Update customer
  fastify.patch('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = updateCustomerSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await paymentService.updateCustomer(tenantId, request.params.id, validation.data);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Delete customer
  fastify.delete('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await paymentService.deleteCustomer(tenantId, request.params.id);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(204).send();
  });

  // ==================== Payment Method Endpoints ====================

  // Create setup intent for adding payment method
  fastify.post('/customers/:id/setup-intent', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createSetupIntent(
      tenantId,
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Attach payment method to customer
  fastify.post('/customers/:id/payment-methods', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const body = request.body as { paymentMethodId?: string };
    if (!body.paymentMethodId) {
      return reply.status(400).send({ success: false, error: 'Payment method ID required' });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.attachPaymentMethod(
      tenantId,
      request.params.id,
      body.paymentMethodId,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true });
  });

  // List payment methods for customer
  fastify.get('/customers/:id/payment-methods', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.listPaymentMethods(
      tenantId,
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Detach payment method
  fastify.delete('/payment-methods/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.detachPaymentMethod(
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(204).send();
  });

  // ==================== Payment Endpoints ====================

  // Create payment intent
  fastify.post('/intents', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = createPaymentIntentSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createPaymentIntent(
      tenantId,
      validation.data,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Confirm payment
  fastify.post('/:id/confirm', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = confirmPaymentSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.confirmPayment(
      tenantId,
      request.params.id,
      validation.data.paymentMethodId,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Get payment
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.getPayment(
      tenantId,
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Cancel payment
  fastify.post('/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.cancelPayment(
      tenantId,
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // Create refund
  fastify.post('/:id/refund', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const body = request.body as Partial<z.infer<typeof createRefundSchema>>;
    const validation = createRefundSchema.safeParse({
      ...body,
      paymentId: request.params.id,
    });
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createRefund(
      tenantId,
      validation.data,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // List payments
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = listPaymentsSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await paymentService.listPayments(tenantId, validation.data);

    if (result.isFailure || !result.value) {
      return reply.status(500).send({ success: false, error: result.error || 'Failed to list payments' });
    }

    return reply.send({
      success: true,
      data: result.value.payments,
      meta: {
        total: result.value.total,
        limit: validation.data.limit,
        offset: validation.data.offset,
      },
    });
  });

  // ==================== Checkout Endpoints ====================

  // Create checkout session
  fastify.post('/checkout/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = createCheckoutSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createCheckoutSession(
      tenantId,
      validation.data,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Get checkout session
  fastify.get('/checkout/sessions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.getCheckoutSession(
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Subscription Plan Endpoints ====================

  // Create subscription plan
  fastify.post('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = createPlanSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await paymentService.createSubscriptionPlan(tenantId, validation.data);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // List subscription plans
  fastify.get('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { activeOnly } = request.query as { activeOnly?: string };

    const result = await paymentService.getSubscriptionPlans(tenantId, activeOnly !== 'false');

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Subscription Endpoints ====================

  // Create subscription
  fastify.post('/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = createSubscriptionSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.createSubscription(
      tenantId,
      validation.data,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Get subscription
  fastify.get('/subscriptions/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await paymentService.getSubscription(tenantId, request.params.id);

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Cancel subscription
  fastify.post('/subscriptions/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const body = request.body as { cancelImmediately?: boolean };
    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.cancelSubscription(
      tenantId,
      request.params.id,
      body.cancelImmediately || false,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // List subscriptions
  fastify.get('/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = listSubscriptionsSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await paymentService.listSubscriptions(tenantId, validation.data);

    if (result.isFailure || !result.value) {
      return reply.status(500).send({ success: false, error: result.error || 'Failed to list subscriptions' });
    }

    return reply.send({
      success: true,
      data: result.value.subscriptions,
      meta: {
        total: result.value.total,
        limit: validation.data.limit,
        offset: validation.data.offset,
      },
    });
  });

  // ==================== Invoice Endpoints ====================

  // Get invoice
  fastify.get('/invoices/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.getInvoice(
      request.params.id,
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // List invoices for customer
  fastify.get('/customers/:id/invoices', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const { limit, startingAfter } = request.query as { limit?: string; startingAfter?: string };
    const { provider } = providerQuerySchema.parse(request.query);

    const result = await paymentService.listInvoices(
      tenantId,
      request.params.id,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        startingAfter,
      },
      provider as PaymentProvider | undefined
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Analytics Endpoints ====================

  // Get payment analytics
  fastify.get('/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = analyticsQuerySchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const options = {
      startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined,
      currency: validation.data.currency,
    };

    const result = await paymentService.getAnalytics(tenantId, options);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Webhook Endpoints ====================

  // Stripe webhook
  fastify.post('/webhooks/stripe', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ success: false, error: 'Missing signature' });
    }

    const payload = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    const result = await paymentService.processWebhook(payload, signature, 'stripe');

    if (result.isFailure) {
      console.error('Stripe webhook error:', result.error);
      // Return 200 to acknowledge receipt even on error
      return reply.send({ success: true, warning: 'Partial processing' });
    }

    return reply.send({ success: true, data: { eventId: result.value?.id } });
  });

  // MercadoPago webhook
  fastify.post('/webhooks/mercadopago', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ success: false, error: 'Missing signature' });
    }

    const payload = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    const result = await paymentService.processWebhook(payload, signature, 'mercadopago');

    if (result.isFailure) {
      console.error('MercadoPago webhook error:', result.error);
      // Return 200 to acknowledge receipt
      return reply.send({ success: true, warning: 'Partial processing' });
    }

    return reply.send({ success: true, data: { eventId: result.value?.id } });
  });
}
