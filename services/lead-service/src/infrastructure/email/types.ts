/**
 * Email Service Types
 * Defines email templates, configurations, and types
 *
 * VENTAZO BRAND COLORS:
 * - Primary (Teal): #0d9488 (main), #0f766e (dark), #14b8a6 (light)
 * - Accent (Coral): #f97316
 * - Success: #10b981
 * - Warning: #f59e0b
 * - Error: #ef4444
 */

// ============================================
// Ventazo Brand Color Constants
// ============================================

export const VENTAZO_EMAIL_COLORS = {
  // Primary Teal
  primaryLight: '#14b8a6',
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',

  // Accent Coral
  accent: '#f97316',
  accentDark: '#ea580c',

  // Semantic
  success: '#10b981',
  successLight: '#ecfdf5',
  successDark: '#059669',
  successText: '#065f46',

  warning: '#f59e0b',
  warningLight: '#fffbeb',
  warningDark: '#d97706',
  warningText: '#92400e',

  error: '#ef4444',
  errorLight: '#fef2f2',
  errorDark: '#dc2626',
  errorText: '#991b1b',

  info: '#0d9488', // Using primary teal for info
  infoLight: '#f0fdfa',
  infoText: '#134e4a',

  // Neutral
  white: '#ffffff',
  background: '#faf7f5',
  border: '#e5e7eb',
  textPrimary: '#0a0a0a',
  textSecondary: '#374151',
  textMuted: '#6b7280',
} as const;

export enum EmailTemplate {
  // Lead Templates
  LEAD_WELCOME = 'lead-welcome',
  LEAD_ASSIGNED = 'lead-assigned',
  LEAD_QUALIFIED = 'lead-qualified',
  LEAD_CONVERTED = 'lead-converted',
  LEAD_FOLLOW_UP_REMINDER = 'lead-follow-up-reminder',
  LEAD_OVERDUE_ALERT = 'lead-overdue-alert',

  // User Templates
  USER_WELCOME = 'user-welcome',
  USER_EMAIL_VERIFICATION = 'user-email-verification',
  USER_DAILY_DIGEST = 'user-daily-digest',
  USER_WEEKLY_REPORT = 'user-weekly-report',
  USER_PASSWORD_RESET = 'user-password-reset',
  USER_PASSWORD_CHANGED = 'user-password-changed',

  // Team/Invitation Templates
  TEAM_INVITATION = 'team-invitation',
  INVITATION_ACCEPTED = 'invitation-accepted',
  INVITATION_REMINDER = 'invitation-reminder',

  // Onboarding Templates
  ONBOARDING_COMPLETE = 'onboarding-complete',

  // Opportunity/Quote Templates
  QUOTE_SENT = 'quote-sent',
  LEAD_LOST = 'lead-lost',
  OPPORTUNITY_WON = 'opportunity-won',
  OPPORTUNITY_LOST = 'opportunity-lost',

  // Document Templates
  DOCUMENT_SENT = 'document-sent',

  // Contract Templates
  CONTRACT_APPROVAL_REQUEST = 'contract-approval-request',
  CONTRACT_SIGNATURE_REQUEST = 'contract-signature-request',

  // Payment Templates
  PAYMENT_CONFIRMATION = 'payment-confirmation',
  PAYMENT_REFUND = 'payment-refund',

  // Customer Templates
  CUSTOMER_WELCOME = 'customer-welcome',

  // Task Templates
  TASK_ASSIGNED = 'task-assigned',

  // Drip Campaign Templates
  DRIP_CAMPAIGN_EMAIL = 'drip-campaign-email',

  // Comment/Mention Templates
  COMMENT_MENTION = 'comment-mention',
  COMMENT_GROUP_MENTION = 'comment-group-mention',

  // System Templates
  SYSTEM_ERROR_ALERT = 'system-error-alert',
  SYSTEM_MAINTENANCE = 'system-maintenance',
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: 'base64' | 'utf-8';
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: EmailTemplate;
  html?: string;
  text?: string;
  variables?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'resend';
  from: {
    email: string;
    name: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  resend?: {
    apiKey: string;
  };
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
  };
}

export interface TemplateData {
  // Common
  appName: string;
  appUrl: string;
  supportEmail: string;
  currentYear: number;
  logoUrl?: string;

  // User related
  userName?: string;
  userEmail?: string;

  // Lead related
  leadId?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  leadSource?: string;
  leadScore?: number;
  leadStatus?: string;
  followUpDate?: string;

  // Stats
  totalLeads?: number;
  newLeads?: number;
  convertedLeads?: number;
  overdueFollowUps?: number;

  // Misc
  actionUrl?: string;
  ctaText?: string;
  message?: string;

  // Custom
  [key: string]: unknown;
}

// ============================================
// Base Email Template Styles - Ventazo Branded
// ============================================

const c = VENTAZO_EMAIL_COLORS;

const BASE_STYLES = `
  body { font-family: 'Inter', 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: ${c.textPrimary}; margin: 0; padding: 0; background-color: ${c.background}; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: ${c.primaryGradient}; color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0; }
  .header-simple { background: ${c.primary}; color: white; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: white; }
  .logo { margin-bottom: 16px; }
  .content { background: ${c.white}; padding: 32px 24px; border: 1px solid ${c.border}; border-top: none; }
  .content p { margin: 0 0 16px 0; }
  .card { background: ${c.background}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${c.border}; }
  .card h3 { margin: 0 0 12px 0; color: ${c.primaryDark}; font-size: 18px; }
  .card-detail { margin: 8px 0; color: ${c.textSecondary}; }
  .card-label { font-weight: 600; color: ${c.textMuted}; }
  .success-card { background: ${c.successLight}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0; }
  .warning-card { background: ${c.warningLight}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; border-left: 4px solid ${c.warning}; }
  .error-card { background: ${c.errorLight}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; border-left: 4px solid ${c.error}; }
  .btn { display: inline-block; background: ${c.primaryGradient}; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 16px; }
  .btn:hover { opacity: 0.9; }
  .btn-success { background: ${c.success}; }
  .btn-warning { background: ${c.warning}; }
  .btn-danger { background: ${c.error}; }
  .btn-accent { background: linear-gradient(135deg, ${c.accent} 0%, ${c.accentDark} 100%); }
  .score { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 14px; }
  .score-hot { background: ${c.successLight}; color: ${c.successText}; }
  .score-warm { background: ${c.warningLight}; color: ${c.warningText}; }
  .score-cold { background: ${c.infoLight}; color: ${c.infoText}; }
  .steps { background: #f0fdfa; padding: 24px; border-radius: 10px; margin: 24px 0; }
  .steps h4 { margin: 0 0 16px 0; color: ${c.primaryDark}; }
  .step { display: flex; align-items: center; margin: 12px 0; }
  .step-num { background: ${c.primary}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 700; font-size: 14px; }
  .stats { display: flex; justify-content: space-around; margin: 24px 0; flex-wrap: wrap; }
  .stat { text-align: center; padding: 16px; background: white; border-radius: 8px; min-width: 100px; margin: 4px; }
  .stat-value { font-size: 28px; font-weight: 700; color: ${c.primary}; }
  .stat-label { font-size: 12px; color: ${c.textMuted}; text-transform: uppercase; }
  .amount { font-size: 32px; font-weight: 700; color: ${c.primary}; text-align: center; margin: 16px 0; }
  .amount.success { color: ${c.success}; }
  .footer { text-align: center; padding: 24px; color: ${c.textMuted}; font-size: 13px; background: ${c.background}; border-radius: 0 0 12px 12px; border: 1px solid ${c.border}; border-top: none; }
  .footer a { color: ${c.primary}; text-decoration: none; }
  .divider { height: 1px; background: ${c.border}; margin: 24px 0; }
  .celebration { font-size: 64px; text-align: center; margin: 20px 0; }
  .tip { background: ${c.infoLight}; padding: 16px; border-radius: 8px; margin: 20px 0; }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; padding: 12px; }
    .header, .header-simple { padding: 24px 16px; border-radius: 0; }
    .content { padding: 24px 16px; }
    .footer { padding: 20px 16px; border-radius: 0; }
    .btn { display: block; width: 100%; text-align: center; }
    .stats { flex-direction: column; }
    .stat { width: 100%; margin: 8px 0; }
  }
`;

// ============================================
// Email Template Content - Ventazo Branded
// ============================================

export const EMAIL_TEMPLATES: Record<
  EmailTemplate,
  {
    subject: string;
    textTemplate: string;
    htmlTemplate: string;
  }
> = {
  [EmailTemplate.LEAD_WELCOME]: {
    subject: 'Nuevo Lead: {{companyName}}',
    textTemplate: `
Hola {{userName}},

Se ha creado un nuevo lead:
- Empresa: {{companyName}}
- Contacto: {{contactName}} ({{contactEmail}})
- Fuente: {{leadSource}}
- Score: {{leadScore}}

Ver lead: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Nuevo Lead Creado</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Se ha agregado un nuevo lead a tu pipeline:</p>

      <div class="card">
        <h3>{{companyName}}</h3>
        <div class="card-detail"><span class="card-label">Contacto:</span> {{contactName}}</div>
        <div class="card-detail"><span class="card-label">Email:</span> {{contactEmail}}</div>
        <div class="card-detail"><span class="card-label">Fuente:</span> {{leadSource}}</div>
        <div class="card-detail">
          <span class="card-label">Score:</span>
          <span class="score {{scoreClass}}">{{leadScore}}</span>
        </div>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Detalles del Lead</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
      <p>&iquest;Preguntas? Cont&aacute;ctanos en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_ASSIGNED]: {
    subject: 'Lead Asignado: {{companyName}}',
    textTemplate: `
Hola {{userName}},

Se te ha asignado un lead:
- Empresa: {{companyName}}
- Contacto: {{contactName}} ({{contactEmail}})
- Score: {{leadScore}}
- Estado: {{leadStatus}}

Ver lead: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Lead Asignado</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Se te ha asignado un lead. &iexcl;Toma acci&oacute;n para avanzarlo!</p>

      <div class="card">
        <h3>{{companyName}}</h3>
        <p><strong>Contacto:</strong> {{contactName}} ({{contactEmail}})</p>
        <p><strong>Score:</strong> {{leadScore}} | <strong>Estado:</strong> {{leadStatus}}</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Lead</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_QUALIFIED]: {
    subject: '&iexcl;Lead Calificado! {{companyName}}',
    textTemplate: `
&iexcl;Felicidades {{userName}}!

Tu lead "{{companyName}}" ha sido calificado con un score de {{leadScore}}.

Pr&oacute;ximos pasos:
1. Revisa los detalles del lead
2. Agenda una llamada de descubrimiento
3. Prepara tu propuesta

Ver lead: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#127881; &iexcl;Lead Calificado!</h1>
    </div>
    <div class="content">
      <p>&iexcl;Felicidades <strong>{{userName}}</strong>!</p>
      <p>Tu lead <strong>{{companyName}}</strong> ha sido calificado con un score de <strong>{{leadScore}}</strong>.</p>

      <div class="steps">
        <h4>Pr&oacute;ximos pasos recomendados:</h4>
        <div class="step"><span class="step-num">1</span> Revisa los detalles del lead</div>
        <div class="step"><span class="step-num">2</span> Agenda una llamada de descubrimiento</div>
        <div class="step"><span class="step-num">3</span> Prepara tu propuesta</div>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Detalles del Lead</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_CONVERTED]: {
    subject: '&#127881; &iexcl;Lead Convertido! {{companyName}}',
    textTemplate: `
&iexcl;Felicidades {{userName}}!

&iexcl;Excelentes noticias! El lead "{{companyName}}" se ha convertido exitosamente en cliente.

&iexcl;Sigue as&iacute;!

Ver detalles: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&iexcl;Lead Convertido!</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div class="celebration">&#127881;</div>
      <p>&iexcl;Felicidades <strong>{{userName}}</strong>!</p>
      <p><strong>{{companyName}}</strong> se ha convertido exitosamente en cliente.</p>
      <p>&iexcl;Sigue as&iacute;!</p>

      <a href="{{actionUrl}}" class="btn btn-success">Ver Cliente</a>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_FOLLOW_UP_REMINDER]: {
    subject: 'Recordatorio de Seguimiento: {{companyName}}',
    textTemplate: `
Hola {{userName}},

Este es un recordatorio para dar seguimiento a "{{companyName}}".

Fecha programada: {{followUpDate}}

&iexcl;No dejes escapar esta oportunidad!

Ver lead: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.accent} 0%, ${c.accentDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#9200; Recordatorio de Seguimiento</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>

      <div class="warning-card" style="background: ${c.warningLight}; border-left-color: ${c.accent};">
        <h3 style="margin: 0 0 8px 0; color: ${c.accentDark};">{{companyName}}</h3>
        <p style="margin: 0;"><strong>Fecha programada:</strong> {{followUpDate}}</p>
        <p style="margin: 8px 0 0 0;">&iexcl;No dejes escapar esta oportunidad!</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn btn-accent">Ver Lead</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_OVERDUE_ALERT]: {
    subject: '&#9888;&#65039; Seguimiento Vencido: {{companyName}}',
    textTemplate: `
Hola {{userName}},

URGENTE: Tu seguimiento con "{{companyName}}" est&aacute; vencido.

Fecha original: {{followUpDate}}

Por favor toma acci&oacute;n inmediatamente.

Ver lead: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.error} 0%, ${c.errorDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#9888;&#65039; Seguimiento Vencido</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p><strong>URGENTE:</strong> &iexcl;Tu seguimiento est&aacute; vencido!</p>

      <div class="error-card">
        <h3 style="margin: 0 0 8px 0; color: ${c.errorText};">{{companyName}}</h3>
        <p style="margin: 0;"><strong>Fecha original:</strong> {{followUpDate}}</p>
        <p style="margin: 8px 0 0 0;">Por favor toma acci&oacute;n inmediatamente para no perder esta oportunidad.</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn btn-danger">Tomar Acci&oacute;n Ahora</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_WELCOME]: {
    subject: '&iexcl;Bienvenido a {{appName}}!',
    textTemplate: `
&iexcl;Bienvenido a {{appName}}, {{userName}}!

Estamos emocionados de tenerte con nosotros.

Comienza aqu&iacute;: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&iexcl;Bienvenido a {{appName}}!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>&iexcl;Estamos emocionados de tenerte con nosotros! Ya est&aacute;s listo para comenzar a gestionar tus leads y hacer crecer tu negocio.</p>
      <center><a href="{{actionUrl}}" class="btn">Comenzar</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_EMAIL_VERIFICATION]: {
    subject: 'Verifica tu correo - {{appName}}',
    textTemplate: `
Hola {{userName}},

Gracias por registrarte en {{appName}}.

Por favor verifica tu correo electr&oacute;nico haciendo clic en el siguiente enlace:

{{verificationUrl}}

Este enlace expira en 24 horas.

Si no creaste esta cuenta, puedes ignorar este mensaje.

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Verifica tu correo</h1>
    </div>
    <div class="content">
      <div style="font-size: 64px; text-align: center; margin: 20px 0;">&#128231;</div>
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Gracias por registrarte en {{appName}}. Para completar tu registro, por favor verifica tu correo electr&oacute;nico.</p>

      <center><a href="{{verificationUrl}}" class="btn">Verificar mi correo</a></center>

      <div class="tip" style="margin-top: 24px;">
        <p style="margin: 0;">&#9200; Este enlace expira en <strong>24 horas</strong>. Si expira, puedes solicitar un nuevo correo de verificaci&oacute;n desde la p&aacute;gina de inicio de sesi&oacute;n.</p>
      </div>

      <p style="color: ${c.textMuted}; font-size: 13px; margin-top: 20px;">Si no creaste esta cuenta, puedes ignorar este mensaje de forma segura.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
      <p>&iquest;Preguntas? Cont&aacute;ctanos en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_DAILY_DIGEST]: {
    subject: 'Tu Resumen Diario - {{appName}}',
    textTemplate: `
Hola {{userName}},

Aqu&iacute; est&aacute; tu resumen diario de leads:

- Total de Leads: {{totalLeads}}
- Nuevos Hoy: {{newLeads}}
- Convertidos: {{convertedLeads}}
- Seguimientos Vencidos: {{overdueFollowUps}}

Ver dashboard: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Resumen Diario de Leads</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Aqu&iacute; est&aacute; tu resumen diario:</p>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">{{totalLeads}}</div>
          <div class="stat-label">Total Leads</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{newLeads}}</div>
          <div class="stat-label">Nuevos Hoy</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{convertedLeads}}</div>
          <div class="stat-label">Convertidos</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{overdueFollowUps}}</div>
          <div class="stat-label">Vencidos</div>
        </div>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Dashboard</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_WEEKLY_REPORT]: {
    subject: 'Tu Reporte Semanal - {{appName}}',
    textTemplate: `
Hola {{userName}},

Aqu&iacute; est&aacute; tu reporte de rendimiento semanal:

- Nuevos Leads: {{newLeads}}
- Convertidos: {{convertedLeads}}
- Total Activos: {{totalLeads}}

Ver reporte completo: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Reporte de Rendimiento Semanal</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Aqu&iacute; est&aacute; tu resumen de rendimiento semanal.</p>
      <center><a href="{{actionUrl}}" class="btn">Ver Reporte Completo</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_PASSWORD_RESET]: {
    subject: 'Restablecer tu Contrase&ntilde;a - {{appName}}',
    textTemplate: `
Hola {{userName}},

Solicitaste restablecer tu contrase&ntilde;a. Haz clic en el siguiente enlace:

{{actionUrl}}

Este enlace expira en 1 hora.

Si no solicitaste esto, ignora este correo.

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Restablecer Contrase&ntilde;a</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Solicitaste restablecer tu contrase&ntilde;a. Haz clic en el bot&oacute;n a continuaci&oacute;n:</p>
      <center><a href="{{actionUrl}}" class="btn">Restablecer Contrase&ntilde;a</a></center>
      <div class="warning-card" style="margin-top: 24px;">
        Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.USER_PASSWORD_CHANGED]: {
    subject: 'Tu contrase&ntilde;a ha sido actualizada - {{appName}}',
    textTemplate: `
Hola {{userName}},

Tu contrase&ntilde;a ha sido actualizada exitosamente.

Fecha y hora: {{changedAt}}
Desde: {{ipAddress}}

Si no realizaste este cambio, por favor contacta a soporte inmediatamente.

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#9989; Contrase&ntilde;a Actualizada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Tu contrase&ntilde;a ha sido actualizada exitosamente.</p>

      <div class="success-card">
        <p style="margin: 0;"><strong>&#128197; Fecha:</strong> {{changedAt}}</p>
        {{#if ipAddress}}<p style="margin: 8px 0 0 0;"><strong>&#127760; Ubicaci&oacute;n:</strong> {{ipAddress}}</p>{{/if}}
      </div>

      <div class="warning-card">
        <p style="margin: 0;"><strong>&#9888;&#65039; &iquest;No fuiste t&uacute;?</strong></p>
        <p style="margin: 8px 0 0 0;">Si no realizaste este cambio, por favor contacta a soporte inmediatamente en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
      </div>

      <div class="tip">
        <h4 style="margin: 0 0 12px 0; color: ${c.primaryDark};">&#128274; Consejos de seguridad:</h4>
        <p style="margin: 4px 0;">&#10003; Usa una contrase&ntilde;a &uacute;nica para cada servicio</p>
        <p style="margin: 4px 0;">&#10003; No compartas tu contrase&ntilde;a con nadie</p>
        <p style="margin: 4px 0;">&#10003; Activa la autenticaci&oacute;n de dos factores</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
      <p>&iquest;Preguntas? Cont&aacute;ctanos en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.TEAM_INVITATION]: {
    subject: 'Has sido invitado a unirte a {{tenantName}} en {{appName}}',
    textTemplate: `
Hola{{#if inviteeName}} {{inviteeName}}{{/if}},

{{inviterName}} te ha invitado a unirte a {{tenantName}} en {{appName}} como {{roleName}}.

{{#if customMessage}}
Mensaje de {{inviterName}}:
"{{customMessage}}"
{{/if}}

Haz clic en el enlace para aceptar la invitaci&oacute;n:
{{acceptUrl}}

Esta invitaci&oacute;n expira el {{expiresAt}}.

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&iexcl;Est&aacute;s Invitado!</h1>
    </div>
    <div class="content">
      <p>Hola{{#if inviteeName}} <strong>{{inviteeName}}</strong>{{/if}},</p>
      <p><strong>{{inviterName}}</strong> te ha invitado a unirte a su equipo en {{appName}}.</p>

      <div class="card">
        <h3>{{tenantName}}</h3>
        <div class="card-detail">&#128100; <strong>Invitado por:</strong> {{inviterName}}</div>
        <div class="card-detail">&#127919; <strong>Tu rol:</strong> <span style="display: inline-block; background: ${c.infoLight}; color: ${c.primaryDark}; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">{{roleName}}</span></div>
      </div>

      {{#if customMessage}}
      <div class="warning-card" style="background: ${c.warningLight}; border-left-color: ${c.warning};">
        <p style="margin: 0; font-style: italic;">"{{customMessage}}"</p>
        <small style="color: ${c.textMuted};">&mdash; {{inviterName}}</small>
      </div>
      {{/if}}

      <center><a href="{{acceptUrl}}" class="btn">Aceptar Invitaci&oacute;n</a></center>

      <p style="color: ${c.textMuted}; font-size: 13px; margin-top: 20px;">Esta invitaci&oacute;n expira el <strong>{{expiresAt}}</strong>.</p>
    </div>
    <div class="footer">
      <p>Si no esperabas esta invitaci&oacute;n, puedes ignorar este correo de forma segura.</p>
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
      <p>&iquest;Preguntas? Cont&aacute;ctanos en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.INVITATION_ACCEPTED]: {
    subject: '{{inviteeName}} se ha unido a {{tenantName}}',
    textTemplate: `
Hola {{inviterName}},

&iexcl;Excelentes noticias! {{inviteeName}} ({{inviteeEmail}}) ha aceptado tu invitaci&oacute;n a {{tenantName}}.

Se uni&oacute; como: {{roleName}}

Ver miembros del equipo: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#127881; &iexcl;Nuevo Miembro del Equipo!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{inviterName}}</strong>,</p>
      <p>&iexcl;Excelentes noticias! Tu invitaci&oacute;n ha sido aceptada.</p>

      <div class="success-card" style="text-align: center;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${c.success}; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 10px;">{{inviteeInitials}}</div>
        <h3 style="margin: 8px 0 4px 0; color: ${c.textPrimary};">{{inviteeName}}</h3>
        <p style="margin: 0; color: ${c.textMuted};">{{inviteeEmail}}</p>
        <p style="margin: 12px 0 0 0;">Se uni&oacute; como: <strong>{{roleName}}</strong></p>
      </div>

      <center><a href="{{actionUrl}}" class="btn btn-success">Ver Equipo</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.INVITATION_REMINDER]: {
    subject: 'Recordatorio: Tienes una invitaci&oacute;n pendiente a {{tenantName}}',
    textTemplate: `
Hola{{#if inviteeName}} {{inviteeName}}{{/if}},

Este es un recordatorio de que {{inviterName}} te invit&oacute; a unirte a {{tenantName}} en {{appName}}.

Tu invitaci&oacute;n expira el {{expiresAt}}. &iexcl;No te la pierdas!

Aceptar invitaci&oacute;n: {{acceptUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.accent} 0%, ${c.accentDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#9200; Recordatorio de Invitaci&oacute;n</h1>
    </div>
    <div class="content">
      <p>Hola{{#if inviteeName}} <strong>{{inviteeName}}</strong>{{/if}},</p>
      <p>Este es un recordatorio amigable de que tienes una invitaci&oacute;n pendiente.</p>

      <div class="warning-card" style="background: ${c.warningLight}; border-left-color: ${c.accent};">
        <h3 style="margin: 0 0 12px 0; color: ${c.accentDark};">{{tenantName}}</h3>
        <p style="margin: 4px 0;"><strong>Invitado por:</strong> {{inviterName}}</p>
        <p style="margin: 4px 0;"><strong>Rol:</strong> {{roleName}}</p>
        <p style="margin: 12px 0 0 0;"><strong>Expira:</strong> {{expiresAt}}</p>
      </div>

      <center><a href="{{acceptUrl}}" class="btn btn-accent">Aceptar Invitaci&oacute;n</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.ONBOARDING_COMPLETE]: {
    subject: '&#127881; &iexcl;Bienvenido a {{appName}}! Tu configuraci&oacute;n est&aacute; completa',
    textTemplate: `
&iexcl;Felicidades {{userName}}!

Has completado exitosamente la configuraci&oacute;n de {{tenantName}} en {{appName}}.

Tu CRM est&aacute; listo para usar. Aqu&iacute; tienes algunos pr&oacute;ximos pasos:

1. Explora el dashboard principal
2. Importa tus primeros contactos o leads
3. Configura tus pipelines de ventas
4. Invita a m&aacute;s miembros del equipo

Accede a tu dashboard: {{dashboardUrl}}

&iquest;Necesitas ayuda? Cont&aacute;ctanos en {{supportEmail}}

&iexcl;&Eacute;xito con tu CRM!
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%); padding: 40px 24px;">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <div style="font-size: 64px; margin: 16px 0;">&#127881;</div>
      <h1>&iexcl;Configuraci&oacute;n Completa!</h1>
    </div>
    <div class="content">
      <p>&iexcl;Felicidades <strong>{{userName}}</strong>!</p>
      <p>Has completado exitosamente la configuraci&oacute;n de <strong>{{tenantName}}</strong>. Tu CRM est&aacute; listo para ayudarte a gestionar tus relaciones con clientes.</p>

      <div class="steps" style="background: ${c.successLight};">
        <h4 style="color: ${c.successText};">Pr&oacute;ximos pasos recomendados:</h4>
        <div class="step"><span class="step-num" style="background: ${c.success};">1</span> Explora el dashboard principal</div>
        <div class="step"><span class="step-num" style="background: ${c.success};">2</span> Importa tus primeros contactos o leads</div>
        <div class="step"><span class="step-num" style="background: ${c.success};">3</span> Configura tus pipelines de ventas</div>
        <div class="step"><span class="step-num" style="background: ${c.success};">4</span> Invita a m&aacute;s miembros del equipo</div>
      </div>

      <center><a href="{{dashboardUrl}}" class="btn btn-success">Ir al Dashboard</a></center>
    </div>
    <div class="footer">
      <p>&iquest;Necesitas ayuda? Cont&aacute;ctanos en <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
      <p>&copy; {{currentYear}} {{appName}}. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.QUOTE_SENT]: {
    subject: 'Cotizaci&oacute;n enviada: {{companyName}}',
    textTemplate: `
Hola {{userName}},

Se ha enviado una cotizaci&oacute;n a {{companyName}}.

Detalles:
- Cliente: {{companyName}}
- Contacto: {{contactName}} ({{contactEmail}})
- Monto: {{quoteAmount}}
- V&aacute;lida hasta: {{validUntil}}

Ver cotizaci&oacute;n: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128196; Cotizaci&oacute;n Enviada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Se ha enviado una cotizaci&oacute;n al cliente.</p>

      <div class="card">
        <h3>{{companyName}}</h3>
        <p><strong>Contacto:</strong> {{contactName}} ({{contactEmail}})</p>
        <div class="amount">{{quoteAmount}}</div>
        <p><strong>V&aacute;lida hasta:</strong> {{validUntil}}</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Cotizaci&oacute;n</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.LEAD_LOST]: {
    subject: 'Lead perdido: {{companyName}}',
    textTemplate: `
Hola {{userName}},

Lamentablemente el lead "{{companyName}}" se ha marcado como perdido.

Raz&oacute;n: {{lostReason}}

Notas: {{notes}}

Es importante analizar por qu&eacute; no se cerr&oacute; esta oportunidad para mejorar en el futuro.

Ver detalles: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: ${c.textMuted};">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Lead Perdido</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{userName}}</strong>,</p>
      <p>Lamentablemente el siguiente lead se ha marcado como perdido:</p>

      <div class="card" style="border-left: 4px solid ${c.textMuted};">
        <h3>{{companyName}}</h3>
        <div class="error-card" style="margin: 12px 0;">
          <strong>Raz&oacute;n:</strong> {{lostReason}}
        </div>
        {{#if notes}}<p><strong>Notas:</strong> {{notes}}</p>{{/if}}
      </div>

      <div class="tip">
        &#128161; <strong>Tip:</strong> Analiza por qu&eacute; no se cerr&oacute; esta oportunidad para identificar patrones y mejorar tu proceso de ventas.
      </div>

      <center><a href="{{actionUrl}}" class="btn" style="background: ${c.textMuted};">Ver Detalles</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.OPPORTUNITY_WON]: {
    subject: '&#127881; &iexcl;Oportunidad Ganada! - {{opportunityName}}',
    textTemplate: `
&iexcl;Felicidades {{ownerName}}!

&iexcl;Excelentes noticias! La oportunidad "{{opportunityName}}" ha sido ganada.

Detalles:
- Monto: {{opportunityAmount}}
- Raz&oacute;n de &eacute;xito: {{wonReason}}
- Fecha de cierre: {{closeDate}}

Ver detalles: {{actionUrl}}

&iexcl;Sigue as&iacute;!
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%); padding: 32px;">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&iexcl;Oportunidad Ganada!</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div class="celebration">&#127881;&#127942;&#127881;</div>
      <p>&iexcl;Felicidades <strong>{{ownerName}}</strong>!</p>
      <h2 style="color: ${c.textPrimary}; margin: 16px 0;">{{opportunityName}}</h2>
      <div class="amount success">{{opportunityAmount}}</div>

      <div class="success-card" style="text-align: left;">
        <p><strong>Raz&oacute;n de &eacute;xito:</strong> {{wonReason}}</p>
        <p><strong>Fecha de cierre:</strong> {{closeDate}}</p>
      </div>

      <a href="{{actionUrl}}" class="btn btn-success">Ver Detalles</a>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.OPPORTUNITY_LOST]: {
    subject: 'Oportunidad Perdida - {{opportunityName}}',
    textTemplate: `
Hola {{ownerName}},

Lamentablemente la oportunidad "{{opportunityName}}" se ha marcado como perdida.

Detalles:
- Monto potencial: {{opportunityAmount}}
- Raz&oacute;n de p&eacute;rdida: {{lostReason}}
- Fecha de cierre: {{closeDate}}

Analiza esta experiencia para mejorar futuras oportunidades.

Ver detalles: {{actionUrl}}

El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: ${c.textMuted};">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Oportunidad Perdida</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{ownerName}}</strong>,</p>

      <div class="card" style="border-left: 4px solid ${c.textMuted};">
        <h3>{{opportunityName}}</h3>
        <div class="amount" style="color: ${c.textMuted};">{{opportunityAmount}}</div>
        <div class="error-card">
          <strong>Raz&oacute;n:</strong> {{lostReason}}
        </div>
        <p><strong>Fecha de cierre:</strong> {{closeDate}}</p>
      </div>

      <div class="tip">
        &#128161; <strong>Tip:</strong> Analiza esta experiencia para identificar &aacute;reas de mejora y aumentar tu tasa de cierre.
      </div>

      <center><a href="{{actionUrl}}" class="btn" style="background: ${c.textMuted};">Ver Detalles</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.DOCUMENT_SENT]: {
    subject: 'Documento enviado: {{documentTitle}}',
    textTemplate: `
Hola {{recipientName}},

Se te ha enviado el documento "{{documentTitle}}".

{{#if message}}
Mensaje: {{message}}
{{/if}}

Puedes acceder al documento aqu&iacute;: {{actionUrl}}

Saludos,
{{senderName}}
{{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128196; Documento Enviado</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{recipientName}}</strong>,</p>
      <p>Se te ha enviado un documento para revisar:</p>

      <div class="card" style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">&#128196;</div>
        <h3>{{documentTitle}}</h3>
      </div>

      {{#if message}}
      <div class="tip" style="border-left: 4px solid ${c.primary};">
        <p style="margin: 0;">{{message}}</p>
        <small style="color: ${c.textMuted};">&mdash; {{senderName}}</small>
      </div>
      {{/if}}

      <center><a href="{{actionUrl}}" class="btn">Ver Documento</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.CONTRACT_APPROVAL_REQUEST]: {
    subject: 'Solicitud de aprobaci&oacute;n: {{contractTitle}}',
    textTemplate: `
Hola {{approverName}},

Se requiere tu aprobaci&oacute;n para el contrato "{{contractTitle}}".

Detalles:
- Cliente: {{customerName}}
- Valor: {{contractValue}}
- Fecha l&iacute;mite: {{dueDate}}

Revisar y aprobar: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.accent} 0%, ${c.accentDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128203; Solicitud de Aprobaci&oacute;n</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{approverName}}</strong>,</p>
      <p>Se requiere tu aprobaci&oacute;n para el siguiente contrato:</p>

      <div class="warning-card" style="background: ${c.warningLight}; border-left-color: ${c.accent};">
        <h3 style="margin: 0 0 12px 0; color: ${c.accentDark};">{{contractTitle}}</h3>
        <p style="margin: 4px 0;"><strong>Cliente:</strong> {{customerName}}</p>
        <div class="amount" style="color: ${c.accentDark}; margin: 12px 0;">{{contractValue}}</div>
        <p style="margin: 4px 0;"><strong>Fecha l&iacute;mite:</strong> {{dueDate}}</p>
      </div>

      <div class="tip" style="text-align: center;">
        &#9200; Tu aprobaci&oacute;n es necesaria para continuar con el proceso.
      </div>

      <center><a href="{{actionUrl}}" class="btn btn-accent">Revisar y Aprobar</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.CONTRACT_SIGNATURE_REQUEST]: {
    subject: 'Firma requerida: {{contractTitle}}',
    textTemplate: `
Hola {{signatoryName}},

Se requiere tu firma para el contrato "{{contractTitle}}".

Detalles:
- Cliente: {{customerName}}
- Valor: {{contractValue}}

Por favor firma el contrato aqu&iacute;: {{actionUrl}}

Saludos,
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#9999;&#65039; Firma Requerida</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{signatoryName}}</strong>,</p>
      <p>Se requiere tu firma para completar el siguiente contrato:</p>

      <div class="card" style="text-align: center; border: 2px solid ${c.primary};">
        <div style="font-size: 48px; margin-bottom: 10px;">&#128221;</div>
        <h3 style="color: ${c.primaryDark};">{{contractTitle}}</h3>
        <p><strong>Cliente:</strong> {{customerName}}</p>
        <div class="amount">{{contractValue}}</div>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Firmar Contrato</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.PAYMENT_CONFIRMATION]: {
    subject: '&#9989; Pago confirmado - {{paymentAmount}}',
    textTemplate: `
Hola {{customerName}},

Hemos recibido tu pago exitosamente.

Detalles del pago:
- Monto: {{paymentAmount}}
- Referencia: {{paymentReference}}
- Fecha: {{paymentDate}}
- M&eacute;todo: {{paymentMethod}}

Ver recibo: {{actionUrl}}

Gracias por tu pago.

El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.success} 0%, ${c.successDark} 100%);">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Pago Confirmado</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div style="font-size: 64px; margin: 20px 0;">&#9989;</div>
      <p>Hola <strong>{{customerName}}</strong>,</p>
      <p>Hemos recibido tu pago exitosamente.</p>

      <div class="amount success">{{paymentAmount}}</div>

      <div class="card" style="text-align: left;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${c.border};">
          <span>Referencia:</span>
          <strong>{{paymentReference}}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${c.border};">
          <span>Fecha:</span>
          <strong>{{paymentDate}}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>M&eacute;todo:</span>
          <strong>{{paymentMethod}}</strong>
        </div>
      </div>

      <a href="{{actionUrl}}" class="btn btn-success">Ver Recibo</a>
    </div>
    <div class="footer">
      <p>Gracias por tu pago.</p>
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.PAYMENT_REFUND]: {
    subject: '&#128176; Reembolso procesado - {{refundAmount}}',
    textTemplate: `
Hola {{customerName}},

Tu reembolso ha sido procesado exitosamente.

Detalles:
- Monto reembolsado: {{refundAmount}}
- Referencia: {{refundReference}}
- Fecha: {{refundDate}}
- Raz&oacute;n: {{refundReason}}

El monto ser&aacute; acreditado en {{estimatedDays}} d&iacute;as h&aacute;biles.

El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>Reembolso Procesado</h1>
    </div>
    <div class="content" style="text-align: center;">
      <div style="font-size: 64px; margin: 20px 0;">&#128176;</div>
      <p>Hola <strong>{{customerName}}</strong>,</p>
      <p>Tu reembolso ha sido procesado.</p>

      <div class="amount">{{refundAmount}}</div>

      <div class="tip" style="text-align: left;">
        <p><strong>Referencia:</strong> {{refundReference}}</p>
        <p><strong>Fecha:</strong> {{refundDate}}</p>
        <p><strong>Raz&oacute;n:</strong> {{refundReason}}</p>
      </div>

      <div class="warning-card" style="text-align: center;">
        &#9203; El monto ser&aacute; acreditado en <strong>{{estimatedDays}} d&iacute;as h&aacute;biles</strong> en tu m&eacute;todo de pago original.
      </div>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.CUSTOMER_WELCOME]: {
    subject: '&#127881; &iexcl;Bienvenido a {{appName}}, {{customerName}}!',
    textTemplate: `
&iexcl;Bienvenido {{customerName}}!

Estamos encantados de tenerte como cliente de {{companyName}}.

Tu cuenta ha sido creada y est&aacute;s listo para empezar.

Accede a tu portal: {{actionUrl}}

Si tienes alguna pregunta, no dudes en contactarnos.

&iexcl;Gracias por elegirnos!
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="padding: 40px 24px;">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <div style="font-size: 64px; margin: 16px 0;">&#127881;</div>
      <h1>&iexcl;Bienvenido!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{customerName}}</strong>,</p>
      <p>Estamos encantados de tenerte como cliente. Tu cuenta est&aacute; lista y puedes empezar a disfrutar de todos nuestros servicios.</p>

      <div class="card">
        <h4 style="margin: 0 0 12px 0; color: ${c.primaryDark};">Lo que puedes hacer ahora:</h4>
        <p style="margin: 4px 0;">&#10003; Acceder a tu portal de cliente</p>
        <p style="margin: 4px 0;">&#10003; Ver tu historial de servicios</p>
        <p style="margin: 4px 0;">&#10003; Contactar a tu equipo de soporte</p>
        <p style="margin: 4px 0;">&#10003; Gestionar tu cuenta y facturaci&oacute;n</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Acceder al Portal</a></center>
    </div>
    <div class="footer">
      <p>&iexcl;Gracias por elegirnos!</p>
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.TASK_ASSIGNED]: {
    subject: 'Nueva tarea asignada: {{taskTitle}}',
    textTemplate: `
Hola {{assigneeName}},

Se te ha asignado una nueva tarea:

Tarea: {{taskTitle}}
Descripci&oacute;n: {{taskDescription}}
Prioridad: {{taskPriority}}
Fecha l&iacute;mite: {{taskDueDate}}
Asignada por: {{assignedBy}}

Ver tarea: {{actionUrl}}

El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128203; Nueva Tarea Asignada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{assigneeName}}</strong>,</p>
      <p>Se te ha asignado una nueva tarea:</p>

      <div class="card" style="border-left: 4px solid ${c.primary};">
        <h3 style="margin: 0 0 8px 0;">{{taskTitle}}</h3>
        <p style="color: ${c.textSecondary};">{{taskDescription}}</p>
        <p><span class="score {{taskPriority}}" style="text-transform: capitalize;">{{taskPriority}}</span></p>
      </div>

      <div class="tip">
        <p style="margin: 0;">&#128197; <strong>Fecha l&iacute;mite:</strong> {{taskDueDate}}</p>
        <p style="margin: 8px 0 0 0;">&#128100; <strong>Asignada por:</strong> {{assignedBy}}</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Tarea</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.DRIP_CAMPAIGN_EMAIL]: {
    subject: '{{subject}}',
    textTemplate: `{{emailBody}}

---
Si no deseas recibir m&aacute;s emails, puedes darte de baja aqu&iacute;: {{unsubscribeUrl}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="content" style="border-radius: 12px 12px 0 0; border-top: 4px solid ${c.primary};">
      {{emailBody}}
    </div>
    <div class="footer">
      <p>Si no deseas recibir m&aacute;s emails, <a href="{{unsubscribeUrl}}">date de baja aqu&iacute;</a>.</p>
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  // ===========================================
  // Comment/Mention Templates
  // ===========================================

  [EmailTemplate.COMMENT_MENTION]: {
    subject: '&#128172; {{mentionedBy}} te mencion&oacute; en un comentario - {{appName}}',
    textTemplate: `
Hola {{recipientName}},

{{mentionedBy}} te mencion&oacute; en un comentario:

"{{commentPreview}}"

En: {{entityType}} - {{entityName}}

Ver comentario: {{actionUrl}}

---
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128172; Te Mencionaron</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{recipientName}}</strong>,</p>
      <p><strong>{{mentionedBy}}</strong> te mencion&oacute; en un comentario:</p>

      <div class="card" style="border-left: 4px solid ${c.primary}; background: ${c.background};">
        <p style="font-style: italic; color: ${c.textSecondary}; margin: 0;">"{{commentPreview}}"</p>
      </div>

      <div class="tip">
        <p style="margin: 0;">&#128196; <strong>En:</strong> {{entityType}} - {{entityName}}</p>
        <p style="margin: 8px 0 0 0;">&#128337; <strong>Fecha:</strong> {{commentDate}}</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Comentario</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.COMMENT_GROUP_MENTION]: {
    subject: '&#128172; {{mentionedBy}} mencion&oacute; a @{{groupName}} - {{appName}}',
    textTemplate: `
Hola {{recipientName}},

{{mentionedBy}} mencion&oacute; al grupo @{{groupName}} del que eres miembro:

"{{commentPreview}}"

En: {{entityType}} - {{entityName}}

Ver comentario: {{actionUrl}}

---
El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{appName}}" class="logo" width="48" height="48" style="border-radius: 8px;">{{/if}}
      <h1>&#128172; Menci&oacute;n de Grupo</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{recipientName}}</strong>,</p>
      <p><strong>{{mentionedBy}}</strong> mencion&oacute; al grupo <span class="score hot">@{{groupName}}</span> del que eres miembro:</p>

      <div class="card" style="border-left: 4px solid ${c.primary}; background: ${c.background};">
        <p style="font-style: italic; color: ${c.textSecondary}; margin: 0;">"{{commentPreview}}"</p>
      </div>

      <div class="tip">
        <p style="margin: 0;">&#128196; <strong>En:</strong> {{entityType}} - {{entityName}}</p>
        <p style="margin: 8px 0 0 0;">&#128337; <strong>Fecha:</strong> {{commentDate}}</p>
      </div>

      <center><a href="{{actionUrl}}" class="btn">Ver Comentario</a></center>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.SYSTEM_ERROR_ALERT]: {
    subject: '&#9888;&#65039; Alerta del Sistema - {{appName}}',
    textTemplate: `
Alerta del Sistema

{{message}}

Por favor investiga inmediatamente.

- Sistema de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, ${c.error} 0%, ${c.errorDark} 100%);">
      <h1>&#9888;&#65039; Alerta del Sistema</h1>
    </div>
    <div class="content">
      <div class="error-card">
        <p style="margin: 0;">{{message}}</p>
      </div>
      <p>Por favor investiga inmediatamente.</p>
    </div>
    <div class="footer">
      <p>Sistema de {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },

  [EmailTemplate.SYSTEM_MAINTENANCE]: {
    subject: 'Mantenimiento Programado - {{appName}}',
    textTemplate: `
Hola,

Realizaremos mantenimiento programado en {{appName}}.

{{message}}

Disculpa las molestias.

El equipo de {{appName}}
    `,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: ${c.textMuted};">
      <h1>&#128295; Mantenimiento Programado</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>Realizaremos mantenimiento programado en {{appName}}.</p>
      <div class="tip">
        <p style="margin: 0;">{{message}}</p>
      </div>
      <p>Disculpa las molestias.</p>
    </div>
    <div class="footer">
      <p>&copy; {{currentYear}} {{appName}}</p>
    </div>
  </div>
</body>
</html>
    `,
  },
};
