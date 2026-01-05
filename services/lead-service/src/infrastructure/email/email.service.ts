/**
 * Email Service
 * Handles email sending with template support
 */

import * as nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { injectable, singleton } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  EmailTemplate,
  EmailOptions,
  EmailResult,
  EmailConfig,
  TemplateData,
  EMAIL_TEMPLATES,
} from './types';
import { EMAIL_BRAND_CONFIG, VENTAZO_COLORS } from './brand.config';

@injectable()
@singleton()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private compiledTemplates: Map<
    EmailTemplate,
    { text: HandlebarsTemplateDelegate; html: HandlebarsTemplateDelegate }
  > = new Map();
  private isInitialized = false;

  constructor() {
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Initialize the email service
   */
  async initialize(config: EmailConfig): Promise<Result<void>> {
    try {
      if (this.isInitialized) {
        return Result.ok();
      }

      this.config = config;

      // Create transporter based on provider
      this.transporter = this.createTransporter(config);

      // Verify connection
      await this.transporter.verify();

      // Pre-compile all templates
      this.compileTemplates();

      this.isInitialized = true;
      console.log('[EmailService] Initialized successfully');
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Initialization failed:', message);
      return Result.fail(`Failed to initialize email service: ${message}`);
    }
  }

  /**
   * Create nodemailer transporter based on provider
   */
  private createTransporter(config: EmailConfig): nodemailer.Transporter {
    switch (config.provider) {
      case 'smtp':
        if (!config.smtp) throw new Error('SMTP config required');
        return nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.auth.user,
            pass: config.smtp.auth.pass,
          },
        });

      case 'sendgrid':
        if (!config.sendgrid) throw new Error('SendGrid config required');
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: config.sendgrid.apiKey,
          },
        });

      case 'ses':
        if (!config.ses) throw new Error('SES config required');
        // For SES, you would use aws-sdk
        // This is a simplified version using SMTP interface
        return nodemailer.createTransport({
          host: `email-smtp.${config.ses.region}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: config.ses.accessKeyId,
            pass: config.ses.secretAccessKey,
          },
        });

      case 'resend':
        if (!config.resend) throw new Error('Resend config required');
        return nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: config.resend.apiKey,
          },
        });

      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  /**
   * Register Handlebars helpers for templates
   */
  private registerHandlebarsHelpers(): void {
    // Score class helper
    Handlebars.registerHelper('scoreClass', function (score: number) {
      if (score >= 75) return 'score-hot';
      if (score >= 50) return 'score-warm';
      return 'score-cold';
    });

    // Date formatting helper (Spanish locale for Ventazo)
    Handlebars.registerHelper('formatDate', function (date: Date | string) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Short date format helper
    Handlebars.registerHelper('formatDateShort', function (date: Date | string) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });

    // Time formatting helper
    Handlebars.registerHelper('formatTime', function (date: Date | string) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Currency formatting (Spanish locale with USD)
    Handlebars.registerHelper('currency', function (amount: number, currency?: string) {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    });

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', function (num: number) {
      return new Intl.NumberFormat('es-ES').format(num);
    });

    // Percentage formatting helper
    Handlebars.registerHelper('percentage', function (value: number) {
      return `${value.toFixed(1)}%`;
    });

    // Brand color helper (for dynamic styling)
    Handlebars.registerHelper('brandColor', function (colorPath: string) {
      const parts = colorPath.split('.');
      let color: Record<string, unknown> = VENTAZO_COLORS;
      for (const part of parts) {
        color = color[part] as Record<string, unknown>;
        if (!color) return '#0d9488'; // Default to primary teal
      }
      return color as unknown as string;
    });
  }

  /**
   * Pre-compile all email templates
   */
  private compileTemplates(): void {
    for (const [templateName, templateContent] of Object.entries(EMAIL_TEMPLATES)) {
      const text = Handlebars.compile(templateContent.textTemplate.trim());
      const html = Handlebars.compile(templateContent.htmlTemplate.trim());
      this.compiledTemplates.set(templateName as EmailTemplate, { text, html });
    }
    console.log(`[EmailService] Compiled ${this.compiledTemplates.size} templates`);
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<Result<EmailResult>> {
    if (!this.isInitialized || !this.transporter || !this.config) {
      return Result.fail('Email service not initialized');
    }

    try {
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      // If using template, render it
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

        // Also render subject with variables
        const subjectTemplate = EMAIL_TEMPLATES[options.template]?.subject;
        if (subjectTemplate) {
          subject = Handlebars.compile(subjectTemplate)(options.variables || {});
        }
      }

      // Build mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject,
        html,
        text,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : options.bcc
          : undefined,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding,
        })),
        headers: options.headers,
        priority: options.priority,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`[EmailService] Email sent: ${info.messageId}`);

      return Result.ok({
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Failed to send email:', message);
      return Result.ok({
        success: false,
        error: message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send multiple emails (batch)
   */
  async sendBatch(
    emails: EmailOptions[]
  ): Promise<Result<{ sent: number; failed: number; results: EmailResult[] }>> {
    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const result = await this.send(email);
      if (result.isSuccess && result.getValue().success) {
        sent++;
      } else {
        failed++;
      }
      results.push(
        result.isSuccess
          ? result.getValue()
          : { success: false, error: result.error, timestamp: new Date() }
      );
    }

    console.log(`[EmailService] Batch complete: ${sent} sent, ${failed} failed`);
    return Result.ok({ sent, failed, results });
  }

  /**
   * Render a template with variables
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, unknown>
  ): Result<{ html: string; text: string }> {
    const compiled = this.compiledTemplates.get(template);
    if (!compiled) {
      return Result.fail(`Template not found: ${template}`);
    }

    try {
      // Add default Ventazo brand variables
      const currentYear = new Date().getFullYear();
      const defaultVars: Partial<TemplateData> = {
        appName: EMAIL_BRAND_CONFIG.appName,
        appUrl: EMAIL_BRAND_CONFIG.appUrl,
        supportEmail: EMAIL_BRAND_CONFIG.supportEmail,
        currentYear,
        logoUrl: EMAIL_BRAND_CONFIG.logoUrl,
        primaryColor: EMAIL_BRAND_CONFIG.colors.primary[600],
        accentColor: EMAIL_BRAND_CONFIG.colors.accent[500],
        footerText: `© ${currentYear} ${EMAIL_BRAND_CONFIG.appName}. Todos los derechos reservados.`,
        socialLinks: EMAIL_BRAND_CONFIG.social,
      };

      const mergedVars = { ...defaultVars, ...variables };

      const html = compiled.html(mergedVars);
      const text = compiled.text(mergedVars);

      return Result.ok({ html, text });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to render template: ${message}`);
    }
  }

  /**
   * Send lead welcome email
   */
  async sendLeadWelcome(
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
        actionUrl: `${EMAIL_BRAND_CONFIG.appUrl}/leads/${data.leadId}`,
        scoreClass:
          data.leadScore >= 75
            ? 'score-hot'
            : data.leadScore >= 50
              ? 'score-warm'
              : 'score-cold',
      },
    });
  }

  /**
   * Send lead assigned email
   */
  async sendLeadAssigned(
    to: string,
    data: {
      userName: string;
      companyName: string;
      contactName?: string;
      contactEmail?: string;
      leadScore: number;
      leadStatus: string;
      leadId: string;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: `Lead Asignado: ${data.companyName}`,
      template: EmailTemplate.LEAD_ASSIGNED,
      variables: {
        ...data,
        actionUrl: `${EMAIL_BRAND_CONFIG.appUrl}/leads/${data.leadId}`,
      },
    });
  }

  /**
   * Send follow-up reminder email
   */
  async sendFollowUpReminder(
    to: string,
    data: {
      userName: string;
      companyName: string;
      followUpDate: Date | string;
      leadId: string;
      isOverdue?: boolean;
    }
  ): Promise<Result<EmailResult>> {
    const template = data.isOverdue
      ? EmailTemplate.LEAD_OVERDUE_ALERT
      : EmailTemplate.LEAD_FOLLOW_UP_REMINDER;

    return this.send({
      to,
      subject: data.isOverdue
        ? `⚠️ Seguimiento Vencido: ${data.companyName}`
        : `Recordatorio de Seguimiento: ${data.companyName}`,
      template,
      variables: {
        ...data,
        followUpDate:
          typeof data.followUpDate === 'string'
            ? data.followUpDate
            : data.followUpDate.toLocaleDateString('es-ES'),
        actionUrl: `${EMAIL_BRAND_CONFIG.appUrl}/leads/${data.leadId}`,
      },
      priority: data.isOverdue ? 'high' : 'normal',
    });
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(
    to: string,
    data: {
      userName: string;
      totalLeads: number;
      newLeads: number;
      convertedLeads: number;
      overdueFollowUps: number;
    }
  ): Promise<Result<EmailResult>> {
    return this.send({
      to,
      subject: 'Tu Resumen Diario de Leads',
      template: EmailTemplate.USER_DAILY_DIGEST,
      variables: {
        ...data,
        actionUrl: `${EMAIL_BRAND_CONFIG.appUrl}/dashboard`,
      },
    });
  }

  /**
   * Check if service is ready
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
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    this.isInitialized = false;
    console.log('[EmailService] Shutdown complete');
  }
}
