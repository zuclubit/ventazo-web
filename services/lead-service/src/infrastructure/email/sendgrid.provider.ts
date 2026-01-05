/**
 * SendGrid Email Provider
 * Native SendGrid API integration for high-performance email sending
 */

import { Result } from '@zuclubit/domain';

/**
 * SendGrid email personalization
 */
interface SendGridPersonalization {
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject?: string;
  dynamic_template_data?: Record<string, unknown>;
  custom_args?: Record<string, string>;
}

/**
 * SendGrid content block
 */
interface SendGridContent {
  type: 'text/plain' | 'text/html';
  value: string;
}

/**
 * SendGrid attachment
 */
interface SendGridAttachment {
  content: string; // Base64 encoded
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline';
  content_id?: string;
}

/**
 * SendGrid mail object
 */
interface SendGridMail {
  personalizations: SendGridPersonalization[];
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  subject?: string;
  content?: SendGridContent[];
  attachments?: SendGridAttachment[];
  template_id?: string;
  categories?: string[];
  custom_args?: Record<string, string>;
  send_at?: number;
  tracking_settings?: {
    click_tracking?: { enable: boolean; enable_text?: boolean };
    open_tracking?: { enable: boolean; substitution_tag?: string };
    subscription_tracking?: { enable: boolean };
  };
  mail_settings?: {
    sandbox_mode?: { enable: boolean };
  };
  asm?: {
    group_id: number;
    groups_to_display?: number[];
  };
}

/**
 * Email send result with tracking
 */
export interface SendGridSendResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Batch send result
 */
export interface SendGridBatchResult {
  total: number;
  sent: number;
  failed: number;
  results: SendGridSendResult[];
}

/**
 * SendGrid Provider Configuration
 */
export interface SendGridProviderConfig {
  apiKey: string;
  from: {
    email: string;
    name: string;
  };
  replyTo?: {
    email: string;
    name?: string;
  };
  trackOpens?: boolean;
  trackClicks?: boolean;
  sandboxMode?: boolean;
  unsubscribeGroupId?: number;
}

/**
 * Email input for SendGrid
 */
export interface SendGridEmailInput {
  to: string | string[] | Array<{ email: string; name?: string }>;
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
    disposition?: 'attachment' | 'inline';
  }>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: Date;
  replyTo?: { email: string; name?: string };
  trackOpens?: boolean;
  trackClicks?: boolean;
}

/**
 * SendGrid Email Provider
 */
export class SendGridProvider {
  private apiKey: string;
  private from: { email: string; name: string };
  private replyTo?: { email: string; name?: string };
  private trackOpens: boolean;
  private trackClicks: boolean;
  private sandboxMode: boolean;
  private unsubscribeGroupId?: number;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor(config: SendGridProviderConfig) {
    this.apiKey = config.apiKey;
    this.from = config.from;
    this.replyTo = config.replyTo;
    this.trackOpens = config.trackOpens ?? true;
    this.trackClicks = config.trackClicks ?? true;
    this.sandboxMode = config.sandboxMode ?? false;
    this.unsubscribeGroupId = config.unsubscribeGroupId;
  }

  /**
   * Check if provider is configured
   */
  isAvailable(): boolean {
    return !!(this.apiKey && this.from.email);
  }

  /**
   * Send a single email
   */
  async send(input: SendGridEmailInput): Promise<Result<SendGridSendResult>> {
    if (!this.isAvailable()) {
      return Result.ok({
        success: false,
        error: 'SendGrid provider not configured',
        timestamp: new Date(),
      });
    }

    try {
      const mail = this.buildMailObject(input);
      const response = await this.sendRequest('/mail/send', mail);

      if (response.ok) {
        const messageId = response.headers.get('X-Message-Id') || undefined;
        return Result.ok({
          success: true,
          messageId,
          statusCode: response.status,
          timestamp: new Date(),
        });
      }

      const errorBody = await response.text();
      return Result.ok({
        success: false,
        statusCode: response.status,
        error: errorBody || `HTTP ${response.status}`,
        timestamp: new Date(),
      });
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send emails to multiple recipients (batch)
   */
  async sendBatch(
    inputs: SendGridEmailInput[]
  ): Promise<Result<SendGridBatchResult>> {
    const results: SendGridSendResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const input of inputs) {
      const result = await this.send(input);

      if (result.isSuccess && result.getValue()) {
        const sendResult = result.getValue();
        results.push(sendResult);

        if (sendResult.success) {
          sent++;
        } else {
          failed++;
        }
      } else {
        failed++;
        results.push({
          success: false,
          error: result.error || 'Send failed',
          timestamp: new Date(),
        });
      }
    }

    return Result.ok({
      total: inputs.length,
      sent,
      failed,
      results,
    });
  }

  /**
   * Send using dynamic template
   */
  async sendWithTemplate(
    templateId: string,
    recipients: Array<{
      email: string;
      name?: string;
      data: Record<string, unknown>;
    }>,
    options?: {
      categories?: string[];
      sendAt?: Date;
    }
  ): Promise<Result<SendGridBatchResult>> {
    const results: SendGridSendResult[] = [];
    let sent = 0;
    let failed = 0;

    // SendGrid allows up to 1000 personalizations per request
    const batchSize = 1000;
    const batches = this.chunkArray(recipients, batchSize);

    for (const batch of batches) {
      const mail: SendGridMail = {
        personalizations: batch.map((recipient) => ({
          to: [{ email: recipient.email, name: recipient.name }],
          dynamic_template_data: recipient.data,
        })),
        from: this.from,
        template_id: templateId,
        categories: options?.categories,
        tracking_settings: {
          open_tracking: { enable: this.trackOpens },
          click_tracking: { enable: this.trackClicks },
        },
      };

      if (options?.sendAt) {
        mail.send_at = Math.floor(options.sendAt.getTime() / 1000);
      }

      if (this.sandboxMode) {
        mail.mail_settings = { sandbox_mode: { enable: true } };
      }

      const response = await this.sendRequest('/mail/send', mail);

      if (response.ok) {
        sent += batch.length;
        results.push({
          success: true,
          messageId: response.headers.get('X-Message-Id') || undefined,
          statusCode: response.status,
          timestamp: new Date(),
        });
      } else {
        failed += batch.length;
        const errorBody = await response.text();
        results.push({
          success: false,
          statusCode: response.status,
          error: errorBody || `HTTP ${response.status}`,
          timestamp: new Date(),
        });
      }
    }

    return Result.ok({
      total: recipients.length,
      sent,
      failed,
      results,
    });
  }

  /**
   * Validate email address using SendGrid
   */
  async validateEmail(email: string): Promise<{
    valid: boolean;
    score?: number;
    suggestion?: string;
    reason?: string;
  }> {
    try {
      const response = await this.sendRequest('/validations/email', {
        email,
        source: 'signup',
      });

      if (!response.ok) {
        return { valid: true }; // Assume valid if API fails
      }

      const data = (await response.json()) as {
        result: {
          verdict: string;
          score: number;
          suggestion?: string;
        };
      };

      return {
        valid: data.result.verdict !== 'Invalid',
        score: data.result.score,
        suggestion: data.result.suggestion,
        reason: data.result.verdict,
      };
    } catch {
      return { valid: true };
    }
  }

  /**
   * Get email statistics for date range
   */
  async getStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    requests: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    spamReports: number;
    unsubscribes: number;
  }> {
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `${this.baseUrl}/stats?start_date=${start}&end_date=${end}&aggregated_by=day`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return this.emptyStats();
      }

      const data = (await response.json()) as Array<{
        stats: Array<{
          metrics: {
            requests: number;
            delivered: number;
            opens: number;
            unique_opens: number;
            clicks: number;
            unique_clicks: number;
            bounces: number;
            spam_reports: number;
            unsubscribes: number;
          };
        }>;
      }>;

      // Aggregate stats
      let requests = 0;
      let delivered = 0;
      let opens = 0;
      let clicks = 0;
      let bounces = 0;
      let spamReports = 0;
      let unsubscribes = 0;

      for (const day of data) {
        for (const stat of day.stats) {
          requests += stat.metrics.requests || 0;
          delivered += stat.metrics.delivered || 0;
          opens += stat.metrics.opens || 0;
          clicks += stat.metrics.clicks || 0;
          bounces += stat.metrics.bounces || 0;
          spamReports += stat.metrics.spam_reports || 0;
          unsubscribes += stat.metrics.unsubscribes || 0;
        }
      }

      return {
        requests,
        delivered,
        opens,
        clicks,
        bounces,
        spamReports,
        unsubscribes,
      };
    } catch {
      return this.emptyStats();
    }
  }

  /**
   * Build mail object from input
   */
  private buildMailObject(input: SendGridEmailInput): SendGridMail {
    const personalizations: SendGridPersonalization[] = [
      {
        to: this.normalizeRecipients(input.to),
        cc: input.cc ? this.normalizeRecipients(input.cc) : undefined,
        bcc: input.bcc ? this.normalizeRecipients(input.bcc) : undefined,
        subject: input.subject,
        dynamic_template_data: input.dynamicTemplateData,
        custom_args: input.customArgs,
      },
    ];

    const mail: SendGridMail = {
      personalizations,
      from: this.from,
      reply_to: input.replyTo || this.replyTo,
      tracking_settings: {
        open_tracking: { enable: input.trackOpens ?? this.trackOpens },
        click_tracking: { enable: input.trackClicks ?? this.trackClicks },
      },
    };

    // Add template or content
    if (input.templateId) {
      mail.template_id = input.templateId;
    } else {
      mail.subject = input.subject;
      mail.content = [];
      if (input.text) {
        mail.content.push({ type: 'text/plain', value: input.text });
      }
      if (input.html) {
        mail.content.push({ type: 'text/html', value: input.html });
      }
    }

    // Add attachments
    if (input.attachments && input.attachments.length > 0) {
      mail.attachments = input.attachments.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
        type: att.type,
        disposition: att.disposition || 'attachment',
      }));
    }

    // Add categories
    if (input.categories) {
      mail.categories = input.categories;
    }

    // Add scheduling
    if (input.sendAt) {
      mail.send_at = Math.floor(input.sendAt.getTime() / 1000);
    }

    // Add unsubscribe group
    if (this.unsubscribeGroupId) {
      mail.asm = { group_id: this.unsubscribeGroupId };
    }

    // Add sandbox mode
    if (this.sandboxMode) {
      mail.mail_settings = { sandbox_mode: { enable: true } };
    }

    return mail;
  }

  /**
   * Normalize recipients to SendGrid format
   */
  private normalizeRecipients(
    recipients:
      | string
      | string[]
      | Array<{ email: string; name?: string }>
  ): Array<{ email: string; name?: string }> {
    if (typeof recipients === 'string') {
      return [{ email: recipients }];
    }

    if (Array.isArray(recipients)) {
      return recipients.map((r) =>
        typeof r === 'string' ? { email: r } : r
      );
    }

    return [];
  }

  /**
   * Send HTTP request to SendGrid API
   */
  private async sendRequest(
    endpoint: string,
    body: unknown
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Return empty stats object
   */
  private emptyStats() {
    return {
      requests: 0,
      delivered: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      spamReports: 0,
      unsubscribes: 0,
    };
  }
}
