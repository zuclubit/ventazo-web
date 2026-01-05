/**
 * Ventazo Email Brand Configuration
 *
 * Centralized branding configuration for all email templates.
 * This ensures consistent branding across all email communications.
 *
 * @module infrastructure/email/brand.config
 */

// ============================================
// Ventazo Brand Colors
// ============================================

export const VENTAZO_COLORS = {
  // Primary - Teal Palette
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488', // Main primary
    700: '#0f766e', // Deep teal
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },

  // Accent - Coral Palette
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main accent
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  // Semantic Colors
  success: {
    light: '#ecfdf5',
    main: '#10b981',
    dark: '#059669',
    text: '#065f46',
    border: '#a7f3d0',
  },

  warning: {
    light: '#fffbeb',
    main: '#f59e0b',
    dark: '#d97706',
    text: '#92400e',
    border: '#fcd34d',
  },

  error: {
    light: '#fef2f2',
    main: '#ef4444',
    dark: '#dc2626',
    text: '#991b1b',
    border: '#fecaca',
  },

  info: {
    light: '#eff6ff',
    main: '#3b82f6',
    dark: '#2563eb',
    text: '#1e40af',
    border: '#bfdbfe',
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    background: '#faf7f5',
    card: '#ffffff',
    border: '#e5e7eb',
    text: {
      primary: '#0a0a0a',
      secondary: '#374151',
      muted: '#6b7280',
      light: '#9ca3af',
    },
  },
} as const;

// ============================================
// Email Brand Configuration
// ============================================

export interface EmailBrandConfig {
  appName: string;
  appUrl: string;
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  supportEmail: string;
  colors: typeof VENTAZO_COLORS;
  fonts: {
    primary: string;
    fallback: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export const EMAIL_BRAND_CONFIG: EmailBrandConfig = {
  appName: 'Ventazo',
  appUrl: process.env['APP_URL'] || 'https://app.ventazo.com',
  logoUrl: process.env['EMAIL_LOGO_URL'] || 'https://app.ventazo.com/images/hero/logo.png',
  logoWidth: 48,
  logoHeight: 48,
  supportEmail: process.env['SUPPORT_EMAIL'] || 'soporte@ventazo.com',
  colors: VENTAZO_COLORS,
  fonts: {
    primary: "'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fallback: 'Arial, sans-serif',
  },
  social: {
    linkedin: 'https://linkedin.com/company/ventazo',
    twitter: 'https://twitter.com/ventazo',
  },
};

// ============================================
// Base Email Styles (CSS String)
// ============================================

export function getBaseEmailStyles(): string {
  const { colors, fonts } = EMAIL_BRAND_CONFIG;

  return `
    /* Reset & Base */
    body, html {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    body {
      font-family: ${fonts.fallback};
      line-height: 1.6;
      color: ${colors.neutral.text.primary};
      background-color: ${colors.neutral.background};
    }

    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${colors.neutral.white};
    }

    /* Header */
    .email-header {
      background: linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%);
      color: ${colors.neutral.white};
      padding: 32px 24px;
      text-align: center;
      border-radius: 12px 12px 0 0;
    }

    .email-header-simple {
      background-color: ${colors.primary[600]};
      color: ${colors.neutral.white};
      padding: 24px;
      text-align: center;
      border-radius: 12px 12px 0 0;
    }

    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: ${colors.neutral.white};
    }

    .email-logo {
      margin-bottom: 16px;
    }

    /* Content */
    .email-content {
      background-color: ${colors.neutral.white};
      padding: 32px 24px;
      border: 1px solid ${colors.neutral.border};
      border-top: none;
    }

    .email-content p {
      margin: 0 0 16px 0;
      color: ${colors.neutral.text.primary};
    }

    /* Cards */
    .info-card {
      background-color: ${colors.neutral.background};
      border: 1px solid ${colors.neutral.border};
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .info-card h3 {
      margin: 0 0 12px 0;
      color: ${colors.primary[700]};
      font-size: 18px;
    }

    .info-card-detail {
      margin: 8px 0;
      color: ${colors.neutral.text.secondary};
    }

    .info-card-label {
      font-weight: 600;
      color: ${colors.neutral.text.muted};
    }

    /* Success Card */
    .success-card {
      background-color: ${colors.success.light};
      border: 1px solid ${colors.success.border};
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    /* Warning Card */
    .warning-card {
      background-color: ${colors.warning.light};
      border: 1px solid ${colors.warning.border};
      border-left: 4px solid ${colors.warning.main};
      border-radius: 0 8px 8px 0;
      padding: 16px;
      margin: 20px 0;
    }

    /* Error Card */
    .error-card {
      background-color: ${colors.error.light};
      border: 1px solid ${colors.error.border};
      border-left: 4px solid ${colors.error.main};
      border-radius: 0 8px 8px 0;
      padding: 16px;
      margin: 20px 0;
    }

    /* Primary Button */
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%);
      color: ${colors.neutral.white} !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      mso-padding-alt: 0;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, ${colors.primary[700]} 0%, ${colors.primary[800]} 100%);
    }

    /* Secondary Button */
    .btn-secondary {
      display: inline-block;
      background-color: ${colors.neutral.white};
      color: ${colors.primary[600]} !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      border: 2px solid ${colors.primary[600]};
      font-weight: 600;
      font-size: 14px;
      text-align: center;
    }

    /* Accent Button (for important actions) */
    .btn-accent {
      display: inline-block;
      background: linear-gradient(135deg, ${colors.accent[500]} 0%, ${colors.accent[600]} 100%);
      color: ${colors.neutral.white} !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }

    /* Status Buttons */
    .btn-success {
      display: inline-block;
      background-color: ${colors.success.main};
      color: ${colors.neutral.white} !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }

    .btn-warning {
      display: inline-block;
      background-color: ${colors.warning.main};
      color: ${colors.neutral.white} !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }

    .btn-danger {
      display: inline-block;
      background-color: ${colors.error.main};
      color: ${colors.neutral.white} !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }

    /* Score Badges */
    .score-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
    }

    .score-hot {
      background-color: ${colors.success.light};
      color: ${colors.success.text};
    }

    .score-warm {
      background-color: ${colors.warning.light};
      color: ${colors.warning.text};
    }

    .score-cold {
      background-color: ${colors.info.light};
      color: ${colors.info.text};
    }

    /* Steps */
    .steps-container {
      background-color: ${colors.primary[50]};
      border-radius: 10px;
      padding: 24px;
      margin: 24px 0;
    }

    .steps-container h4 {
      margin: 0 0 16px 0;
      color: ${colors.primary[700]};
    }

    .step-item {
      display: flex;
      align-items: center;
      margin: 12px 0;
    }

    .step-number {
      background-color: ${colors.primary[600]};
      color: ${colors.neutral.white};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-weight: 700;
      font-size: 14px;
    }

    /* Stats Grid */
    .stats-grid {
      display: flex;
      justify-content: space-around;
      margin: 24px 0;
      flex-wrap: wrap;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background-color: ${colors.neutral.white};
      border-radius: 8px;
      min-width: 100px;
      margin: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: ${colors.primary[600]};
    }

    .stat-label {
      font-size: 12px;
      color: ${colors.neutral.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Amount Display */
    .amount-display {
      font-size: 32px;
      font-weight: 700;
      color: ${colors.primary[600]};
      text-align: center;
      margin: 16px 0;
    }

    .amount-display.success {
      color: ${colors.success.main};
    }

    /* Footer */
    .email-footer {
      background-color: ${colors.neutral.background};
      padding: 24px;
      text-align: center;
      border-radius: 0 0 12px 12px;
      border: 1px solid ${colors.neutral.border};
      border-top: none;
    }

    .email-footer p {
      margin: 8px 0;
      color: ${colors.neutral.text.muted};
      font-size: 13px;
    }

    .email-footer a {
      color: ${colors.primary[600]};
      text-decoration: none;
    }

    .email-footer a:hover {
      text-decoration: underline;
    }

    /* Social Links */
    .social-links {
      margin: 16px 0;
    }

    .social-link {
      display: inline-block;
      margin: 0 8px;
    }

    /* Divider */
    .divider {
      height: 1px;
      background-color: ${colors.neutral.border};
      margin: 24px 0;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
      }

      .email-header,
      .email-header-simple {
        padding: 24px 16px;
        border-radius: 0;
      }

      .email-content {
        padding: 24px 16px;
      }

      .email-footer {
        padding: 20px 16px;
        border-radius: 0;
      }

      .btn-primary,
      .btn-accent {
        display: block;
        width: 100%;
        padding: 16px 24px;
      }

      .stats-grid {
        flex-direction: column;
      }

      .stat-item {
        width: 100%;
        margin: 8px 0;
      }
    }

    /* Dark Mode Support (for email clients that support it) */
    @media (prefers-color-scheme: dark) {
      .email-content {
        background-color: #1a1a1a !important;
      }

      .email-content p,
      .info-card-detail {
        color: #e5e5e5 !important;
      }

      .info-card {
        background-color: #262626 !important;
        border-color: #404040 !important;
      }

      .email-footer {
        background-color: #0f0f0f !important;
      }

      .email-footer p {
        color: #a3a3a3 !important;
      }
    }
  `;
}

// ============================================
// Email Template Generator Functions
// ============================================

/**
 * Generate the email header HTML with Ventazo branding
 */
export function generateEmailHeader(title: string, showLogo = true): string {
  const { appName, logoUrl, logoWidth, logoHeight, colors } = EMAIL_BRAND_CONFIG;

  return `
    <div class="email-header" style="background: linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      ${showLogo ? `
        <div class="email-logo" style="margin-bottom: 16px;">
          <img src="${logoUrl}" alt="${appName} Logo" width="${logoWidth}" height="${logoHeight}" style="max-width: ${logoWidth}px; height: auto; border-radius: 8px;">
        </div>
      ` : ''}
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: white;">${title}</h1>
    </div>
  `;
}

/**
 * Generate the email footer HTML with Ventazo branding
 */
export function generateEmailFooter(customMessage?: string): string {
  const { appName, supportEmail, colors, social } = EMAIL_BRAND_CONFIG;
  const currentYear = new Date().getFullYear();

  const socialHtml = social ? `
    <div class="social-links" style="margin: 16px 0;">
      ${social.linkedin ? `<a href="${social.linkedin}" class="social-link" style="display: inline-block; margin: 0 8px; color: ${colors.primary[600]};">LinkedIn</a>` : ''}
      ${social.twitter ? `<a href="${social.twitter}" class="social-link" style="display: inline-block; margin: 0 8px; color: ${colors.primary[600]};">Twitter</a>` : ''}
    </div>
  ` : '';

  return `
    <div class="email-footer" style="background-color: ${colors.neutral.background}; padding: 24px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid ${colors.neutral.border}; border-top: none;">
      ${customMessage ? `<p style="margin: 8px 0; color: ${colors.neutral.text.muted}; font-size: 13px;">${customMessage}</p>` : ''}
      ${socialHtml}
      <p style="margin: 8px 0; color: ${colors.neutral.text.muted}; font-size: 13px;">
        &copy; ${currentYear} ${appName}. Todos los derechos reservados.
      </p>
      <p style="margin: 8px 0; color: ${colors.neutral.text.muted}; font-size: 13px;">
        &iquest;Preguntas? Cont&aacute;ctanos en <a href="mailto:${supportEmail}" style="color: ${colors.primary[600]}; text-decoration: none;">${supportEmail}</a>
      </p>
    </div>
  `;
}

/**
 * Generate a primary CTA button
 */
export function generatePrimaryButton(text: string, url: string): string {
  const { colors } = EMAIL_BRAND_CONFIG;

  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%);">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate score badge HTML
 */
export function generateScoreBadge(score: number): string {
  const { colors } = EMAIL_BRAND_CONFIG;

  let badgeStyle: string;
  let label: string;

  if (score >= 75) {
    badgeStyle = `background-color: ${colors.success.light}; color: ${colors.success.text};`;
    label = 'Hot';
  } else if (score >= 50) {
    badgeStyle = `background-color: ${colors.warning.light}; color: ${colors.warning.text};`;
    label = 'Warm';
  } else {
    badgeStyle = `background-color: ${colors.info.light}; color: ${colors.info.text};`;
    label = 'Cold';
  }

  return `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 14px; ${badgeStyle}">${score} - ${label}</span>`;
}

/**
 * Wrap content in the base email template structure
 */
export function wrapEmailContent(content: string, title: string, options?: {
  showLogo?: boolean;
  footerMessage?: string;
}): string {
  const { showLogo = true, footerMessage } = options || {};
  const styles = getBaseEmailStyles();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    ${styles}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${VENTAZO_COLORS.neutral.background}; font-family: ${EMAIL_BRAND_CONFIG.fonts.fallback};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${VENTAZO_COLORS.neutral.background};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: ${VENTAZO_COLORS.neutral.white}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td>
              ${generateEmailHeader(title, showLogo)}
            </td>
          </tr>
          <tr>
            <td class="email-content" style="background-color: ${VENTAZO_COLORS.neutral.white}; padding: 32px 24px; border: 1px solid ${VENTAZO_COLORS.neutral.border}; border-top: none;">
              ${content}
            </td>
          </tr>
          <tr>
            <td>
              ${generateEmailFooter(footerMessage)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ============================================
// Exports
// ============================================

export {
  EMAIL_BRAND_CONFIG as default,
};
