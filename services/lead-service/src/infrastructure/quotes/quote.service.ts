/**
 * Quote Service
 * Handles quotes and proposals management
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  Quote,
  QuoteLineItem,
  QuoteTemplate,
  QuoteActivity,
  QuoteStatus,
  CreateQuoteInput,
  UpdateQuoteInput,
  SendQuoteInput,
  AcceptQuoteInput,
  QuoteFilter,
  QuoteAnalytics,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';

/**
 * Quote Service
 */
@injectable()
export class QuoteService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(private pool: DatabasePool) {
    this.initializeEmailProvider();
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
      }
    }
  }

  /**
   * Generate quote number
   */
  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const countQuery = `
      SELECT COUNT(*) FROM quotes
      WHERE tenant_id = $1 AND quote_number LIKE $2
    `;
    const result = await this.pool.query(countQuery, [tenantId, `Q-${year}-%`]);
    const count = result.isSuccess && result.value?.rows?.[0]
      ? parseInt(result.value.rows[0].count as string, 10) + 1
      : 1;
    return `Q-${year}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Generate public token for quote sharing
   */
  private generatePublicToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Assuming amounts are stored in cents
  }

  /**
   * Calculate line item total
   */
  private calculateLineItemTotal(item: {
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    tax?: number;
    taxable?: boolean;
  }): number {
    let subtotal = item.quantity * item.unitPrice;

    // Apply discount
    if (item.discount) {
      if (item.discountType === 'percentage') {
        subtotal -= Math.round(subtotal * (item.discount / 100));
      } else {
        subtotal -= item.discount;
      }
    }

    // Apply tax if taxable
    if (item.taxable !== false && item.tax) {
      subtotal += Math.round(subtotal * (item.tax / 100));
    }

    return Math.max(0, subtotal);
  }

  /**
   * Calculate quote totals
   */
  private calculateTotals(lineItems: Array<{
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    tax?: number;
    taxable?: boolean;
    total: number;
  }>): { subtotal: number; discountTotal: number; taxTotal: number; total: number } {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of lineItems) {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;

      // Calculate discount
      if (item.discount) {
        if (item.discountType === 'percentage') {
          discountTotal += Math.round(itemSubtotal * (item.discount / 100));
        } else {
          discountTotal += item.discount;
        }
      }

      // Calculate tax
      const afterDiscount = item.discount
        ? item.discountType === 'percentage'
          ? itemSubtotal - Math.round(itemSubtotal * (item.discount / 100))
          : itemSubtotal - item.discount
        : itemSubtotal;

      if (item.taxable !== false && item.tax) {
        taxTotal += Math.round(afterDiscount * (item.tax / 100));
      }
    }

    const total = subtotal - discountTotal + taxTotal;

    return { subtotal, discountTotal, taxTotal, total: Math.max(0, total) };
  }

  // ==================== Quote CRUD ====================

  /**
   * Create a new quote
   */
  async createQuote(
    tenantId: string,
    userId: string,
    input: CreateQuoteInput
  ): Promise<Result<Quote>> {
    // Generate quote number
    const quoteNumber = await this.generateQuoteNumber(tenantId);
    const publicToken = this.generatePublicToken();

    // Calculate line item totals
    const lineItems = input.lineItems.map((item, index) => ({
      ...item,
      taxable: item.taxable ?? true,
      total: this.calculateLineItemTotal(item),
      position: index,
    }));

    const totals = this.calculateTotals(lineItems);

    // Insert quote
    const quoteQuery = `
      INSERT INTO quotes (
        tenant_id, quote_number, customer_id, lead_id, opportunity_id,
        title, description, status, expiration_date, currency,
        subtotal, discount_total, tax_total, total,
        billing_address, contact_name, contact_email, contact_phone, company_name,
        terms, notes, internal_notes,
        signature_required, payment_terms, payment_due_days,
        deposit_required, deposit_percentage,
        public_token, tags, custom_fields, metadata, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, 'draft', $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26,
        $27, $28, $29, $30, $31
      )
      RETURNING *
    `;

    const quoteResult = await this.pool.query(quoteQuery, [
      tenantId,
      quoteNumber,
      input.customerId || null,
      input.leadId || null,
      input.opportunityId || null,
      input.title,
      input.description || null,
      input.expirationDate,
      input.currency || 'USD',
      totals.subtotal,
      totals.discountTotal,
      totals.taxTotal,
      totals.total,
      JSON.stringify(input.billingAddress || {}),
      input.contactName || null,
      input.contactEmail || null,
      input.contactPhone || null,
      input.companyName || null,
      input.terms || null,
      input.notes || null,
      input.internalNotes || null,
      input.signatureRequired || false,
      input.paymentTerms || null,
      input.paymentDueDays || null,
      input.depositRequired || false,
      input.depositPercentage || null,
      publicToken,
      JSON.stringify(input.tags || []),
      JSON.stringify(input.customFields || {}),
      JSON.stringify(input.metadata || {}),
      userId,
    ]);

    if (quoteResult.isFailure || !quoteResult.value?.rows?.[0]) {
      return Result.fail('Failed to create quote');
    }

    const quote = quoteResult.value.rows[0];

    // Insert line items
    for (const item of lineItems) {
      const lineItemQuery = `
        INSERT INTO quote_line_items (
          quote_id, type, name, description, sku,
          quantity, unit_price, discount, discount_type, tax, taxable, total, position, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

      await this.pool.query(lineItemQuery, [
        quote.id,
        item.type,
        item.name,
        item.description || null,
        item.sku || null,
        item.quantity,
        item.unitPrice,
        item.discount || null,
        item.discountType || null,
        item.tax || null,
        item.taxable,
        item.total,
        item.position,
        JSON.stringify({}),
      ]);
    }

    // Log activity
    await this.logActivity(quote.id as string, tenantId, {
      type: 'created',
      description: `Quote ${quoteNumber} created`,
      userId,
    });

    return this.getQuote(tenantId, quote.id as string);
  }

  /**
   * Get quote by ID
   */
  async getQuote(tenantId: string, quoteId: string): Promise<Result<Quote>> {
    const query = `SELECT * FROM quotes WHERE tenant_id = $1 AND id = $2`;
    const result = await this.pool.query(query, [tenantId, quoteId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Quote not found');
    }

    const quote = this.mapQuoteRow(result.value.rows[0]);

    return Result.ok(quote);
  }

  /**
   * Get quote with line items
   */
  async getQuoteWithItems(tenantId: string, quoteId: string): Promise<Result<{ quote: Quote; lineItems: QuoteLineItem[] }>> {
    const quoteResult = await this.getQuote(tenantId, quoteId);
    if (quoteResult.isFailure || !quoteResult.value) {
      return Result.fail(quoteResult.error || 'Quote not found');
    }

    const lineItemsQuery = `
      SELECT * FROM quote_line_items
      WHERE quote_id = $1
      ORDER BY position ASC
    `;
    const lineItemsResult = await this.pool.query(lineItemsQuery, [quoteId]);

    const lineItems = lineItemsResult.isSuccess && lineItemsResult.value?.rows
      ? lineItemsResult.value.rows.map((row: Record<string, unknown>) => this.mapLineItemRow(row))
      : [];

    return Result.ok({ quote: quoteResult.value, lineItems });
  }

  /**
   * Get quote by public token
   */
  async getQuoteByToken(publicToken: string): Promise<Result<{ quote: Quote; lineItems: QuoteLineItem[] }>> {
    const query = `SELECT * FROM quotes WHERE public_token = $1`;
    const result = await this.pool.query(query, [publicToken]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Quote not found');
    }

    const quote = this.mapQuoteRow(result.value.rows[0]);

    // Get line items
    const lineItemsQuery = `
      SELECT * FROM quote_line_items
      WHERE quote_id = $1
      ORDER BY position ASC
    `;
    const lineItemsResult = await this.pool.query(lineItemsQuery, [quote.id]);

    const lineItems = lineItemsResult.isSuccess && lineItemsResult.value?.rows
      ? lineItemsResult.value.rows.map((row: Record<string, unknown>) => this.mapLineItemRow(row))
      : [];

    // Track view
    await this.trackView(quote.id);

    return Result.ok({ quote, lineItems });
  }

  /**
   * Update quote
   */
  async updateQuote(
    tenantId: string,
    quoteId: string,
    userId: string,
    input: UpdateQuoteInput
  ): Promise<Result<Quote>> {
    // Get existing quote
    const existing = await this.getQuote(tenantId, quoteId);
    if (existing.isFailure || !existing.value) {
      return Result.fail('Quote not found');
    }

    // Don't allow updates to accepted/rejected quotes
    if (['accepted', 'rejected'].includes(existing.value.status)) {
      return Result.fail(`Cannot update ${existing.value.status} quote`);
    }

    // Calculate new totals if line items changed
    let totals = {
      subtotal: existing.value.subtotal,
      discountTotal: existing.value.discountTotal,
      taxTotal: existing.value.taxTotal,
      total: existing.value.total,
    };

    if (input.lineItems) {
      // Delete existing line items
      await this.pool.query('DELETE FROM quote_line_items WHERE quote_id = $1', [quoteId]);

      // Calculate and insert new line items
      const lineItems = input.lineItems.map((item, index) => ({
        ...item,
        taxable: item.taxable ?? true,
        total: this.calculateLineItemTotal(item),
        position: index,
      }));

      totals = this.calculateTotals(lineItems);

      for (const item of lineItems) {
        const lineItemQuery = `
          INSERT INTO quote_line_items (
            quote_id, type, name, description, sku,
            quantity, unit_price, discount, discount_type, tax, taxable, total, position, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        await this.pool.query(lineItemQuery, [
          quoteId,
          item.type,
          item.name,
          item.description || null,
          item.sku || null,
          item.quantity,
          item.unitPrice,
          item.discount || null,
          item.discountType || null,
          item.tax || null,
          item.taxable,
          item.total,
          item.position,
          JSON.stringify({}),
        ]);
      }
    }

    // Update quote
    const updateQuery = `
      UPDATE quotes SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        expiration_date = COALESCE($3, expiration_date),
        billing_address = COALESCE($4, billing_address),
        contact_name = COALESCE($5, contact_name),
        contact_email = COALESCE($6, contact_email),
        contact_phone = COALESCE($7, contact_phone),
        company_name = COALESCE($8, company_name),
        terms = COALESCE($9, terms),
        notes = COALESCE($10, notes),
        internal_notes = COALESCE($11, internal_notes),
        signature_required = COALESCE($12, signature_required),
        payment_terms = COALESCE($13, payment_terms),
        payment_due_days = COALESCE($14, payment_due_days),
        deposit_required = COALESCE($15, deposit_required),
        deposit_percentage = COALESCE($16, deposit_percentage),
        subtotal = $17,
        discount_total = $18,
        tax_total = $19,
        total = $20,
        tags = COALESCE($21, tags),
        custom_fields = COALESCE($22, custom_fields),
        metadata = COALESCE($23, metadata),
        updated_by = $24,
        updated_at = NOW()
      WHERE tenant_id = $25 AND id = $26
      RETURNING *
    `;

    const updateResult = await this.pool.query(updateQuery, [
      input.title,
      input.description,
      input.expirationDate,
      input.billingAddress ? JSON.stringify(input.billingAddress) : null,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.companyName,
      input.terms,
      input.notes,
      input.internalNotes,
      input.signatureRequired,
      input.paymentTerms,
      input.paymentDueDays,
      input.depositRequired,
      input.depositPercentage,
      totals.subtotal,
      totals.discountTotal,
      totals.taxTotal,
      totals.total,
      input.tags ? JSON.stringify(input.tags) : null,
      input.customFields ? JSON.stringify(input.customFields) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      userId,
      tenantId,
      quoteId,
    ]);

    if (updateResult.isFailure || !updateResult.value?.rows?.[0]) {
      return Result.fail('Failed to update quote');
    }

    // Log activity
    await this.logActivity(quoteId, tenantId, {
      type: 'updated',
      description: 'Quote updated',
      userId,
    });

    return this.getQuote(tenantId, quoteId);
  }

  /**
   * Delete quote
   */
  async deleteQuote(tenantId: string, quoteId: string): Promise<Result<void>> {
    const query = `DELETE FROM quotes WHERE tenant_id = $1 AND id = $2`;
    const result = await this.pool.query(query, [tenantId, quoteId]);

    if (result.isFailure) {
      return Result.fail('Failed to delete quote');
    }

    return Result.ok(undefined);
  }

  /**
   * List quotes
   */
  async listQuotes(filter: QuoteFilter): Promise<Result<{ quotes: Quote[]; total: number }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [filter.tenantId];
    let paramCount = 2;

    if (filter.customerId) {
      conditions.push(`customer_id = $${paramCount++}`);
      values.push(filter.customerId);
    }
    if (filter.leadId) {
      conditions.push(`lead_id = $${paramCount++}`);
      values.push(filter.leadId);
    }
    if (filter.opportunityId) {
      conditions.push(`opportunity_id = $${paramCount++}`);
      values.push(filter.opportunityId);
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(`status = ANY($${paramCount++})`);
        values.push(filter.status);
      } else {
        conditions.push(`status = $${paramCount++}`);
        values.push(filter.status);
      }
    }
    if (filter.search) {
      conditions.push(`(title ILIKE $${paramCount} OR quote_number ILIKE $${paramCount} OR contact_name ILIKE $${paramCount} OR company_name ILIKE $${paramCount})`);
      values.push(`%${filter.search}%`);
      paramCount++;
    }
    if (filter.minTotal !== undefined) {
      conditions.push(`total >= $${paramCount++}`);
      values.push(filter.minTotal);
    }
    if (filter.maxTotal !== undefined) {
      conditions.push(`total <= $${paramCount++}`);
      values.push(filter.maxTotal);
    }
    if (filter.createdFrom) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(filter.createdFrom);
    }
    if (filter.createdTo) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(filter.createdTo);
    }
    if (filter.createdBy) {
      conditions.push(`created_by = $${paramCount++}`);
      values.push(filter.createdBy);
    }
    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`tags ?| $${paramCount++}`);
      values.push(filter.tags);
    }

    const whereClause = conditions.join(' AND ');
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    const sortColumn = this.getSortColumn(sortBy);
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM quotes WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = countResult.isSuccess && countResult.value?.rows?.[0]
      ? parseInt(countResult.value.rows[0].count as string, 10)
      : 0;

    // Get quotes
    const query = `
      SELECT * FROM quotes
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to list quotes');
    }

    const quotes = result.value.rows.map((row: Record<string, unknown>) => this.mapQuoteRow(row));

    return Result.ok({ quotes, total });
  }

  // ==================== Quote Status Management ====================

  /**
   * Send quote
   */
  async sendQuote(
    tenantId: string,
    quoteId: string,
    userId: string,
    input: SendQuoteInput
  ): Promise<Result<Quote>> {
    const existing = await this.getQuote(tenantId, quoteId);
    if (existing.isFailure || !existing.value) {
      return Result.fail('Quote not found');
    }

    if (['accepted', 'rejected', 'expired'].includes(existing.value.status)) {
      return Result.fail(`Cannot send ${existing.value.status} quote`);
    }

    // Update status to sent
    const updateQuery = `
      UPDATE quotes SET
        status = 'sent',
        sent_at = NOW(),
        updated_by = $1,
        updated_at = NOW()
      WHERE tenant_id = $2 AND id = $3
    `;

    await this.pool.query(updateQuery, [userId, tenantId, quoteId]);

    // Log activity
    await this.logActivity(quoteId, tenantId, {
      type: 'sent',
      description: `Quote sent to ${input.recipientEmail}`,
      userId,
    });

    // Send email notification with quote
    if (this.emailProvider && input.recipientEmail) {
      try {
        const appConfig = getAppConfig();
        const quoteResult = await this.getQuote(tenantId, quoteId);
        const quote = quoteResult.isSuccess ? quoteResult.getValue() : null;

        await this.emailProvider.send({
          to: input.recipientEmail,
          subject: `Cotización ${quote?.quoteNumber || ''} - ${quote?.title || 'Nueva Cotización'}`,
          template: EmailTemplate.QUOTE_SENT,
          variables: {
            recipientName: input.recipientName || 'Cliente',
            companyName: quote?.customerName || '',
            quoteNumber: quote?.quoteNumber || '',
            quoteTitle: quote?.title || '',
            quoteAmount: quote ? this.formatCurrency(quote.total, quote.currency) : '',
            validUntil: quote?.expirationDate ? new Date(quote.expirationDate).toLocaleDateString('es-ES') : '',
            actionUrl: `${appConfig.appUrl}/quotes/view/${quote?.publicToken || quoteId}`,
            message: input.message || '',
          },
          tags: [
            { name: 'type', value: 'quote-sent' },
            { name: 'quoteId', value: quoteId },
          ],
        });
        console.log(`[QuoteService] Quote email sent to ${input.recipientEmail}`);
      } catch (emailError) {
        console.error('[QuoteService] Failed to send quote email:', emailError);
      }
    }

    // Send SMS/WhatsApp notification if phone provided
    if (input.recipientPhone) {
      try {
        const messagingService = getMessagingService();
        const quoteResult = await this.getQuote(tenantId, quoteId);
        const quote = quoteResult.isSuccess ? quoteResult.getValue() : null;
        const appConfig = getAppConfig();

        // Send via WhatsApp if available, otherwise SMS
        const channel = messagingService.isWhatsAppAvailable() ? 'whatsapp' : 'sms';

        if ((channel === 'whatsapp' && messagingService.isWhatsAppAvailable()) ||
            (channel === 'sms' && messagingService.isSmsAvailable())) {
          await messagingService.sendTemplate(
            input.recipientPhone,
            MessageTemplate.QUOTE_CREATED,
            {
              recipientName: input.recipientName || 'Cliente',
              quoteNumber: quote?.quoteNumber || '',
              amount: quote ? this.formatCurrency(quote.total, quote.currency) : '',
              validUntil: quote?.expirationDate ? new Date(quote.expirationDate).toLocaleDateString('es-MX') : '',
              actionUrl: `${appConfig.appUrl}/quotes/view/${quote?.publicToken || quoteId}`,
            },
            channel,
            { entityType: 'quote', entityId: quoteId }
          );
          console.log(`[QuoteService] Quote ${channel} notification sent to ${input.recipientPhone}`);
        }
      } catch (smsError) {
        console.error('[QuoteService] Failed to send quote SMS/WhatsApp:', smsError);
      }
    }

    return this.getQuote(tenantId, quoteId);
  }

  /**
   * Accept quote
   */
  async acceptQuote(
    quoteId: string,
    input: AcceptQuoteInput
  ): Promise<Result<Quote>> {
    const query = `SELECT * FROM quotes WHERE id = $1`;
    const result = await this.pool.query(query, [quoteId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Quote not found');
    }

    const quote = this.mapQuoteRow(result.value.rows[0]);

    if (quote.status !== 'sent' && quote.status !== 'viewed') {
      return Result.fail('Quote cannot be accepted in current status');
    }

    if (new Date(quote.expirationDate) < new Date()) {
      return Result.fail('Quote has expired');
    }

    // Update status to accepted
    const updateQuery = `
      UPDATE quotes SET
        status = 'accepted',
        accepted_at = NOW(),
        signature_name = $1,
        signature_email = $2,
        signature_date = NOW(),
        signature_ip = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const updateResult = await this.pool.query(updateQuery, [
      input.signatureName,
      input.signatureEmail,
      input.signatureIp || null,
      quoteId,
    ]);

    if (updateResult.isFailure || !updateResult.value?.rows?.[0]) {
      return Result.fail('Failed to accept quote');
    }

    // Log activity
    await this.logActivity(quoteId, quote.tenantId, {
      type: 'accepted',
      description: `Quote accepted by ${input.signatureName}`,
    });

    // Notify sales rep via SMS/WhatsApp that quote was accepted
    await this.notifyQuoteAccepted(quote, input.signatureName);

    return Result.ok(this.mapQuoteRow(updateResult.value.rows[0]));
  }

  /**
   * Notify sales rep when quote is accepted
   */
  private async notifyQuoteAccepted(quote: Quote, acceptedBy: string): Promise<void> {
    try {
      // Get quote creator details
      const userQuery = `SELECT email, phone, full_name FROM users WHERE id = $1`;
      const userResult = await this.pool.query(userQuery, [quote.createdBy]);

      if (userResult.isFailure || !userResult.value?.rows?.[0]) {
        return;
      }

      const user = userResult.value.rows[0];
      const messagingService = getMessagingService();
      const appConfig = getAppConfig();

      // Send SMS notification to sales rep
      if (user.phone && messagingService.isSmsAvailable()) {
        await messagingService.sendTemplate(
          user.phone as string,
          MessageTemplate.QUOTE_APPROVED,
          {
            quoteNumber: quote.quoteNumber,
            amount: this.formatCurrency(quote.total, quote.currency),
            customerName: quote.companyName || quote.contactName || 'Cliente',
            acceptedBy,
            actionUrl: `${appConfig.appUrl}/quotes/${quote.id}`,
          },
          'sms',
          { entityType: 'quote', entityId: quote.id }
        );
        console.log(`[QuoteService] Quote accepted SMS sent to ${user.phone}`);
      }

      // Also send WhatsApp if available
      if (user.phone && messagingService.isWhatsAppAvailable()) {
        await messagingService.sendTemplate(
          user.phone as string,
          MessageTemplate.QUOTE_APPROVED,
          {
            quoteNumber: quote.quoteNumber,
            amount: this.formatCurrency(quote.total, quote.currency),
            customerName: quote.companyName || quote.contactName || 'Cliente',
            acceptedBy,
            actionUrl: `${appConfig.appUrl}/quotes/${quote.id}`,
          },
          'whatsapp',
          { entityType: 'quote', entityId: quote.id }
        );
        console.log(`[QuoteService] Quote accepted WhatsApp sent to ${user.phone}`);
      }
    } catch (error) {
      console.error('[QuoteService] Failed to send quote accepted notification:', error);
    }
  }

  /**
   * Reject quote
   */
  async rejectQuote(
    quoteId: string,
    reason?: string
  ): Promise<Result<Quote>> {
    const query = `SELECT * FROM quotes WHERE id = $1`;
    const result = await this.pool.query(query, [quoteId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Quote not found');
    }

    const quote = this.mapQuoteRow(result.value.rows[0]);

    if (!['sent', 'viewed'].includes(quote.status)) {
      return Result.fail('Quote cannot be rejected in current status');
    }

    // Update status to rejected
    const updateQuery = `
      UPDATE quotes SET
        status = 'rejected',
        rejected_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await this.pool.query(updateQuery, [quoteId]);

    if (updateResult.isFailure || !updateResult.value?.rows?.[0]) {
      return Result.fail('Failed to reject quote');
    }

    // Log activity
    await this.logActivity(quoteId, quote.tenantId, {
      type: 'rejected',
      description: `Quote rejected${reason ? `: ${reason}` : ''}`,
    });

    // Notify sales rep via SMS/WhatsApp that quote was rejected
    await this.notifyQuoteRejected(quote, reason);

    return Result.ok(this.mapQuoteRow(updateResult.value.rows[0]));
  }

  /**
   * Notify sales rep when quote is rejected
   */
  private async notifyQuoteRejected(quote: Quote, reason?: string): Promise<void> {
    try {
      // Get quote creator details
      const userQuery = `SELECT email, phone, full_name FROM users WHERE id = $1`;
      const userResult = await this.pool.query(userQuery, [quote.createdBy]);

      if (userResult.isFailure || !userResult.value?.rows?.[0]) {
        return;
      }

      const user = userResult.value.rows[0];
      const messagingService = getMessagingService();
      const appConfig = getAppConfig();

      // Send SMS notification to sales rep about rejection
      if (user.phone && messagingService.isSmsAvailable()) {
        await messagingService.sendTemplate(
          user.phone as string,
          MessageTemplate.QUOTE_REJECTED,
          {
            quoteNumber: quote.quoteNumber,
            customerName: quote.companyName || quote.contactName || 'Cliente',
            reason: reason || 'No se proporcionó razón',
            actionUrl: `${appConfig.appUrl}/quotes/${quote.id}`,
          },
          'sms',
          { entityType: 'quote', entityId: quote.id }
        );
        console.log(`[QuoteService] Quote rejected SMS sent to ${user.phone}`);
      }
    } catch (error) {
      console.error('[QuoteService] Failed to send quote rejected notification:', error);
    }
  }

  /**
   * Create quote revision
   */
  async createRevision(
    tenantId: string,
    quoteId: string,
    userId: string
  ): Promise<Result<Quote>> {
    // Get existing quote with items
    const existing = await this.getQuoteWithItems(tenantId, quoteId);
    if (existing.isFailure || !existing.value) {
      return Result.fail('Quote not found');
    }

    const { quote, lineItems } = existing.value;

    // Create new quote based on existing
    const input: CreateQuoteInput = {
      customerId: quote.customerId,
      leadId: quote.leadId,
      opportunityId: quote.opportunityId,
      title: quote.title,
      description: quote.description,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: quote.currency,
      billingAddress: quote.billingAddress,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      contactPhone: quote.contactPhone,
      companyName: quote.companyName,
      terms: quote.terms,
      notes: quote.notes,
      internalNotes: quote.internalNotes,
      signatureRequired: quote.signatureRequired,
      paymentTerms: quote.paymentTerms,
      paymentDueDays: quote.paymentDueDays,
      depositRequired: quote.depositRequired,
      depositPercentage: quote.depositPercentage,
      lineItems: lineItems.map((item) => ({
        type: item.type,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        tax: item.tax,
        taxable: item.taxable,
      })),
      tags: quote.tags,
      customFields: quote.customFields,
      metadata: quote.metadata,
    };

    // Create new quote
    const newQuote = await this.createQuote(tenantId, userId, input);
    if (newQuote.isFailure || !newQuote.value) {
      return Result.fail('Failed to create revision');
    }

    // Update new quote with parent reference and version
    const updateQuery = `
      UPDATE quotes SET
        parent_quote_id = $1,
        version = $2
      WHERE id = $3
    `;

    await this.pool.query(updateQuery, [quoteId, quote.version + 1, newQuote.value.id]);

    // Mark old quote as revised
    await this.pool.query(
      `UPDATE quotes SET status = 'revised', updated_at = NOW() WHERE id = $1`,
      [quoteId]
    );

    // Log activity
    await this.logActivity(quoteId, tenantId, {
      type: 'revised',
      description: 'Quote revised',
      userId,
    });

    return this.getQuote(tenantId, newQuote.value.id);
  }

  /**
   * Track quote view
   */
  private async trackView(quoteId: string): Promise<void> {
    const updateQuery = `
      UPDATE quotes SET
        view_count = view_count + 1,
        last_viewed_at = NOW(),
        status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
        viewed_at = CASE WHEN viewed_at IS NULL THEN NOW() ELSE viewed_at END
      WHERE id = $1
      RETURNING tenant_id
    `;

    const result = await this.pool.query(updateQuery, [quoteId]);

    if (result.isSuccess && result.value?.rows?.[0]) {
      await this.logActivity(quoteId, result.value.rows[0].tenant_id as string, {
        type: 'viewed',
        description: 'Quote viewed',
      });
    }
  }

  // ==================== Templates ====================

  /**
   * Create template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: Omit<QuoteTemplate, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<QuoteTemplate>> {
    const query = `
      INSERT INTO quote_templates (
        tenant_id, name, description, category,
        default_title, default_description, default_terms, default_notes,
        default_payment_terms, default_payment_due_days, default_validity_days,
        default_deposit_required, default_deposit_percentage,
        line_items, header_html, footer_html, logo_url, primary_color, secondary_color,
        is_active, is_default, created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      tenantId,
      input.name,
      input.description || null,
      input.category || null,
      input.defaultTitle || null,
      input.defaultDescription || null,
      input.defaultTerms || null,
      input.defaultNotes || null,
      input.defaultPaymentTerms || null,
      input.defaultPaymentDueDays || null,
      input.defaultValidityDays || 30,
      input.defaultDepositRequired || false,
      input.defaultDepositPercentage || null,
      JSON.stringify(input.lineItems || []),
      input.headerHtml || null,
      input.footerHtml || null,
      input.logoUrl || null,
      input.primaryColor || null,
      input.secondaryColor || null,
      input.isActive ?? true,
      input.isDefault ?? false,
      userId,
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to create template');
    }

    return Result.ok(this.mapTemplateRow(result.value.rows[0]));
  }

  /**
   * Get templates
   */
  async getTemplates(
    tenantId: string,
    activeOnly = true
  ): Promise<Result<QuoteTemplate[]>> {
    const query = `
      SELECT * FROM quote_templates
      WHERE tenant_id = $1 ${activeOnly ? 'AND is_active = true' : ''}
      ORDER BY is_default DESC, name ASC
    `;

    const result = await this.pool.query(query, [tenantId]);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to get templates');
    }

    const templates = result.value.rows.map((row: Record<string, unknown>) => this.mapTemplateRow(row));

    return Result.ok(templates);
  }

  // ==================== Activities ====================

  /**
   * Log quote activity
   */
  private async logActivity(
    quoteId: string,
    tenantId: string,
    activity: {
      type: string;
      description: string;
      userId?: string;
      userName?: string;
      userEmail?: string;
      changes?: Record<string, { old: unknown; new: unknown }>;
      comment?: string;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO quote_activities (
        quote_id, tenant_id, type, description,
        user_id, user_name, user_email, changes, comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.pool.query(query, [
      quoteId,
      tenantId,
      activity.type,
      activity.description,
      activity.userId || null,
      activity.userName || null,
      activity.userEmail || null,
      activity.changes ? JSON.stringify(activity.changes) : null,
      activity.comment || null,
    ]);
  }

  /**
   * Get quote activities
   */
  async getActivities(
    tenantId: string,
    quoteId: string,
    limit = 50
  ): Promise<Result<QuoteActivity[]>> {
    const query = `
      SELECT * FROM quote_activities
      WHERE tenant_id = $1 AND quote_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await this.pool.query(query, [tenantId, quoteId, limit]);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to get activities');
    }

    const activities = result.value.rows.map((row: Record<string, unknown>) => this.mapActivityRow(row));

    return Result.ok(activities);
  }

  // ==================== Analytics ====================

  /**
   * Get quote analytics
   */
  async getAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<Result<QuoteAnalytics>> {
    const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Basic metrics
    const metricsQuery = `
      SELECT
        COUNT(*) as total_quotes,
        COALESCE(SUM(total), 0) as total_value,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_quotes,
        COALESCE(SUM(total) FILTER (WHERE status = 'accepted'), 0) as accepted_value,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_quotes,
        COUNT(*) FILTER (WHERE status IN ('draft', 'sent', 'viewed')) as pending_quotes,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_quotes,
        COALESCE(AVG(total), 0) as average_value,
        COALESCE(AVG(EXTRACT(EPOCH FROM (accepted_at - sent_at)) / 3600) FILTER (WHERE status = 'accepted'), 0) as avg_time_to_accept
      FROM quotes
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
    `;

    const metricsResult = await this.pool.query(metricsQuery, [tenantId, start, end]);

    if (metricsResult.isFailure || !metricsResult.value?.rows?.[0]) {
      return Result.fail('Failed to get analytics');
    }

    const metrics = metricsResult.value.rows[0];

    // Quotes by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM quotes
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY status
    `;

    const statusResult = await this.pool.query(statusQuery, [tenantId, start, end]);
    const quotesByStatus: Record<QuoteStatus, number> = {
      draft: 0,
      pending_review: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      revised: 0,
    };

    if (statusResult.isSuccess && statusResult.value?.rows) {
      for (const row of statusResult.value.rows) {
        quotesByStatus[row.status as QuoteStatus] = parseInt(row.count as string, 10);
      }
    }

    // Quotes by month
    const monthlyQuery = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(total), 0) as value
      FROM quotes
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const monthlyResult = await this.pool.query(monthlyQuery, [tenantId, start, end]);
    const quotesByMonth = monthlyResult.isSuccess && monthlyResult.value?.rows
      ? monthlyResult.value.rows.map((row: Record<string, unknown>) => ({
          month: row.month as string,
          created: parseInt(row.created as string, 10),
          accepted: parseInt(row.accepted as string, 10),
          rejected: parseInt(row.rejected as string, 10),
          value: parseInt(row.value as string, 10),
        }))
      : [];

    const totalQuotes = parseInt(metrics.total_quotes as string, 10);
    const acceptedQuotes = parseInt(metrics.accepted_quotes as string, 10);

    return Result.ok({
      totalQuotes,
      totalValue: parseInt(metrics.total_value as string, 10),
      acceptedQuotes,
      acceptedValue: parseInt(metrics.accepted_value as string, 10),
      rejectedQuotes: parseInt(metrics.rejected_quotes as string, 10),
      pendingQuotes: parseInt(metrics.pending_quotes as string, 10),
      expiredQuotes: parseInt(metrics.expired_quotes as string, 10),
      acceptanceRate: totalQuotes > 0 ? acceptedQuotes / totalQuotes : 0,
      averageValue: parseFloat(metrics.average_value as string),
      averageTimeToAccept: parseFloat(metrics.avg_time_to_accept as string),
      quotesByStatus,
      quotesByMonth,
    });
  }

  // ==================== Private Helpers ====================

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      total: 'total',
      quoteNumber: 'quote_number',
      expirationDate: 'expiration_date',
    };
    return columnMap[sortBy] || 'created_at';
  }

  private mapQuoteRow(row: Record<string, unknown>): Quote {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      quoteNumber: row.quote_number as string,
      customerId: row.customer_id as string | undefined,
      leadId: row.lead_id as string | undefined,
      opportunityId: row.opportunity_id as string | undefined,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as QuoteStatus,
      version: row.version as number,
      parentQuoteId: row.parent_quote_id as string | undefined,
      issueDate: new Date(row.issue_date as string),
      expirationDate: new Date(row.expiration_date as string),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : undefined,
      rejectedAt: row.rejected_at ? new Date(row.rejected_at as string) : undefined,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      viewedAt: row.viewed_at ? new Date(row.viewed_at as string) : undefined,
      currency: row.currency as string,
      subtotal: row.subtotal as number,
      discountTotal: row.discount_total as number,
      taxTotal: row.tax_total as number,
      total: row.total as number,
      billingAddress: typeof row.billing_address === 'string'
        ? JSON.parse(row.billing_address)
        : row.billing_address as Quote['billingAddress'],
      contactName: row.contact_name as string | undefined,
      contactEmail: row.contact_email as string | undefined,
      contactPhone: row.contact_phone as string | undefined,
      companyName: row.company_name as string | undefined,
      terms: row.terms as string | undefined,
      notes: row.notes as string | undefined,
      internalNotes: row.internal_notes as string | undefined,
      signatureRequired: row.signature_required as boolean,
      signatureName: row.signature_name as string | undefined,
      signatureEmail: row.signature_email as string | undefined,
      signatureDate: row.signature_date ? new Date(row.signature_date as string) : undefined,
      signatureIp: row.signature_ip as string | undefined,
      paymentTerms: row.payment_terms as string | undefined,
      paymentDueDays: row.payment_due_days as number | undefined,
      depositRequired: row.deposit_required as boolean,
      depositPercentage: row.deposit_percentage as number | undefined,
      depositAmount: row.deposit_amount as number | undefined,
      attachmentUrls: typeof row.attachment_urls === 'string'
        ? JSON.parse(row.attachment_urls)
        : row.attachment_urls as string[] | undefined,
      pdfUrl: row.pdf_url as string | undefined,
      publicUrl: row.public_url as string | undefined,
      publicToken: row.public_token as string | undefined,
      viewCount: row.view_count as number,
      lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at as string) : undefined,
      lastViewedBy: row.last_viewed_by as string | undefined,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags as string[] | undefined,
      customFields: typeof row.custom_fields === 'string'
        ? JSON.parse(row.custom_fields)
        : row.custom_fields as Record<string, unknown> | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapLineItemRow(row: Record<string, unknown>): QuoteLineItem {
    return {
      id: row.id as string,
      quoteId: row.quote_id as string,
      type: row.type as QuoteLineItem['type'],
      name: row.name as string,
      description: row.description as string | undefined,
      sku: row.sku as string | undefined,
      quantity: row.quantity as number,
      unitPrice: row.unit_price as number,
      discount: row.discount as number | undefined,
      discountType: row.discount_type as 'percentage' | 'fixed' | undefined,
      tax: row.tax as number | undefined,
      taxable: row.taxable as boolean,
      total: row.total as number,
      position: row.position as number,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapTemplateRow(row: Record<string, unknown>): QuoteTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      category: row.category as string | undefined,
      defaultTitle: row.default_title as string | undefined,
      defaultDescription: row.default_description as string | undefined,
      defaultTerms: row.default_terms as string | undefined,
      defaultNotes: row.default_notes as string | undefined,
      defaultPaymentTerms: row.default_payment_terms as string | undefined,
      defaultPaymentDueDays: row.default_payment_due_days as number | undefined,
      defaultValidityDays: row.default_validity_days as number | undefined,
      defaultDepositRequired: row.default_deposit_required as boolean | undefined,
      defaultDepositPercentage: row.default_deposit_percentage as number | undefined,
      lineItems: typeof row.line_items === 'string'
        ? JSON.parse(row.line_items)
        : row.line_items as QuoteTemplate['lineItems'],
      headerHtml: row.header_html as string | undefined,
      footerHtml: row.footer_html as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      primaryColor: row.primary_color as string | undefined,
      secondaryColor: row.secondary_color as string | undefined,
      isActive: row.is_active as boolean,
      isDefault: row.is_default as boolean,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapActivityRow(row: Record<string, unknown>): QuoteActivity {
    return {
      id: row.id as string,
      quoteId: row.quote_id as string,
      tenantId: row.tenant_id as string,
      type: row.type as QuoteActivity['type'],
      description: row.description as string,
      userId: row.user_id as string | undefined,
      userName: row.user_name as string | undefined,
      userEmail: row.user_email as string | undefined,
      viewerIp: row.viewer_ip as string | undefined,
      viewerUserAgent: row.viewer_user_agent as string | undefined,
      viewDuration: row.view_duration as number | undefined,
      changes: typeof row.changes === 'string'
        ? JSON.parse(row.changes)
        : row.changes as Record<string, { old: unknown; new: unknown }> | undefined,
      comment: row.comment as string | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
