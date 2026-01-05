/**
 * Resend Email Provider
 * Native Resend API integration for better performance and features
 */

import { Resend } from 'resend';
import { injectable, singleton } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  EmailTemplate,
  EmailOptions,
  EmailResult,
  EmailConfig,
  EMAIL_TEMPLATES,
} from './types';
import Handlebars from 'handlebars';

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: EmailTemplate;
  variables?: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: Array<{ name: string; value: string }>;
  headers?: Record<string, string>;
}

export interface ResendBatchResult {
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

@injectable()
@singleton()
export class ResendProvider {
  private client: Resend | null = null;
  private fromEmail: string = '';
  private fromName: string = '';
  private isInitialized = false;
  private compiledTemplates: Map<
    EmailTemplate,
    { text: HandlebarsTemplateDelegate; html: HandlebarsTemplateDelegate; subject: HandlebarsTemplateDelegate }
  > = new Map();

  constructor() {
    this.registerHandlebarsHelpers();
  }

  /**
   * Initialize the Resend provider
   */
  async initialize(config: {
    apiKey: string;
    fromEmail: string;
    fromName?: string;
  }): Promise<Result<void>> {
    try {
      if (this.isInitialized) {
        return Result.ok();
      }

      this.client = new Resend(config.apiKey);
      this.fromEmail = config.fromEmail;
      this.fromName = config.fromName || 'Zuclubit CRM';

      // Pre-compile templates
      this.compileTemplates();

      // Test connection by checking API key validity
      // Resend doesn't have a direct verify method, so we'll just trust the key format
      if (!config.apiKey.startsWith('re_')) {
        return Result.fail('Invalid Resend API key format');
      }

      this.isInitialized = true;
      console.log('[ResendProvider] Initialized successfully');
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ResendProvider] Initialization failed:', message);
      return Result.fail(`Failed to initialize Resend: ${message}`);
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('scoreClass', function (score: number) {
      if (score >= 75) return 'score-hot';
      if (score >= 50) return 'score-warm';
      return 'score-cold';
    });

    Handlebars.registerHelper('formatDate', function (date: Date | string) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('ifEquals', function (
      this: unknown,
      arg1: unknown,
      arg2: unknown,
      options: Handlebars.HelperOptions
    ) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('currency', function (amount: number) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(amount);
    });
  }

  /**
   * Compile all email templates
   */
  private compileTemplates(): void {
    for (const [templateName, templateContent] of Object.entries(EMAIL_TEMPLATES)) {
      const text = Handlebars.compile(templateContent.textTemplate.trim());
      const html = Handlebars.compile(templateContent.htmlTemplate.trim());
      const subject = Handlebars.compile(templateContent.subject);
      this.compiledTemplates.set(templateName as EmailTemplate, { text, html, subject });
    }
    console.log(`[ResendProvider] Compiled ${this.compiledTemplates.size} templates`);
  }

  /**
   * Render a template with variables
   */
  private renderTemplate(
    template: EmailTemplate,
    variables: Record<string, unknown>
  ): Result<{ html: string; text: string; subject: string }> {
    const compiled = this.compiledTemplates.get(template);
    if (!compiled) {
      return Result.fail(`Template not found: ${template}`);
    }

    try {
      const defaultVars = {
        appName: process.env.APP_NAME || 'Zuclubit CRM',
        appUrl: process.env.APP_URL || 'https://app.zuclubit.com',
        supportEmail: process.env.SUPPORT_EMAIL || 'soporte@zuclubit.com',
        currentYear: new Date().getFullYear(),
      };

      const mergedVars = { ...defaultVars, ...variables };

      return Result.ok({
        html: compiled.html(mergedVars),
        text: compiled.text(mergedVars),
        subject: compiled.subject(mergedVars),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to render template: ${message}`);
    }
  }

  /**
   * Send a single email
   */
  async send(options: ResendEmailOptions): Promise<Result<EmailResult>> {
    if (!this.isInitialized || !this.client) {
      return Result.fail('Resend provider not initialized');
    }

    try {
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      // Render template if provided
      if (options.template) {
        const templateResult = this.renderTemplate(
          options.template,
          options.variables || {}
        );
        if (templateResult.isFailure) {
          return Result.fail(templateResult.error!);
        }
        const rendered = templateResult.getValue();
        html = rendered.html;
        text = rendered.text;
        subject = rendered.subject;
      }

      const from = options.from || `${this.fromName} <${this.fromEmail}>`;
      const to = Array.isArray(options.to) ? options.to : [options.to];

      const result = await this.client.emails.send({
        from,
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: options.replyTo,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        tags: options.tags,
        headers: options.headers,
      });

      if (result.error) {
        console.error('[ResendProvider] Send failed:', result.error);
        return Result.ok({
          success: false,
          error: result.error.message,
          timestamp: new Date(),
        });
      }

      console.log(`[ResendProvider] Email sent: ${result.data?.id}`);
      return Result.ok({
        success: true,
        messageId: result.data?.id,
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ResendProvider] Send error:', message);
      return Result.ok({
        success: false,
        error: message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send batch emails
   */
  async sendBatch(emails: ResendEmailOptions[]): Promise<Result<ResendBatchResult>> {
    if (!this.isInitialized || !this.client) {
      return Result.fail('Resend provider not initialized');
    }

    const results: ResendBatchResult['results'] = [];
    let sent = 0;
    let failed = 0;

    // Process emails in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks: ResendEmailOptions[][] = [];

    for (let i = 0; i < emails.length; i += concurrencyLimit) {
      chunks.push(emails.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (email) => {
          const result = await this.send(email);
          const to = Array.isArray(email.to) ? email.to[0] : email.to;

          if (result.isSuccess && result.getValue().success) {
            sent++;
            return {
              to,
              success: true,
              messageId: result.getValue().messageId,
            };
          } else {
            failed++;
            return {
              to,
              success: false,
              error: result.isFailure ? result.error : result.getValue().error,
            };
          }
        })
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          failed++;
          results.push({
            to: 'unknown',
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      }
    }

    console.log(`[ResendProvider] Batch complete: ${sent} sent, ${failed} failed`);
    return Result.ok({ sent, failed, results });
  }

  /**
   * Send lead notification email
   */
  async sendLeadNotification(
    to: string,
    data: {
      userName: string;
      companyName: string;
      contactName?: string;
      contactEmail?: string;
      leadSource: string;
      leadScore: number;
      leadId: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: `Nuevo Lead: ${data.companyName}`,
      template: EmailTemplate.LEAD_WELCOME,
      variables: {
        ...data,
        actionUrl: `${process.env.APP_URL || 'https://app.zuclubit.com'}/leads/${data.leadId}`,
        scoreClass:
          data.leadScore >= 75
            ? 'score-hot'
            : data.leadScore >= 50
              ? 'score-warm'
              : 'score-cold',
      },
      tags: [
        { name: 'type', value: 'lead-notification' },
        { name: 'leadId', value: data.leadId },
      ],
    });
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(
    to: string,
    data: {
      inviteeName?: string;
      inviterName: string;
      tenantName: string;
      roleName: string;
      acceptUrl: string;
      expiresAt: string;
      customMessage?: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: `Has sido invitado a unirte a ${data.tenantName}`,
      template: EmailTemplate.TEAM_INVITATION,
      variables: data,
      tags: [
        { name: 'type', value: 'team-invitation' },
        { name: 'tenant', value: data.tenantName },
      ],
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    data: {
      userName: string;
      resetUrl: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: 'Restablecer tu contraseña',
      template: EmailTemplate.USER_PASSWORD_RESET,
      variables: {
        ...data,
        actionUrl: data.resetUrl,
      },
      tags: [{ name: 'type', value: 'password-reset' }],
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    to: string,
    data: {
      userName: string;
      verificationUrl: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: 'Verifica tu correo',
      template: EmailTemplate.USER_EMAIL_VERIFICATION,
      variables: {
        ...data,
      },
      tags: [{ name: 'type', value: 'email-verification' }],
    });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedConfirmation(
    to: string,
    data: {
      userName: string;
      changedAt: string;
      ipAddress?: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: 'Tu contraseña ha sido actualizada',
      template: EmailTemplate.USER_PASSWORD_CHANGED,
      variables: {
        ...data,
      },
      tags: [{ name: 'type', value: 'password-changed' }],
    });
  }

  /**
   * Send custom email (no template)
   */
  async sendCustomEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
  }): Promise<Result<EmailResult>> {
    return this.send({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      from: options.from,
      replyTo: options.replyTo,
      tags: options.tags,
    });
  }

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): EmailTemplate[] {
    return Object.values(EmailTemplate);
  }

  /**
   * Shutdown the provider
   */
  async shutdown(): Promise<void> {
    this.client = null;
    this.isInitialized = false;
    console.log('[ResendProvider] Shutdown complete');
  }
}

/**
 * Create and initialize a Resend provider instance
 */
export async function createResendProvider(config: {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}): Promise<Result<ResendProvider>> {
  const provider = new ResendProvider();
  const initResult = await provider.initialize(config);

  if (initResult.isFailure) {
    return Result.fail(initResult.error!);
  }

  return Result.ok(provider);
}
