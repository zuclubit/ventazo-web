/**
 * OTP Service
 * Handles 6-digit OTP generation, verification, and email delivery for inline email verification
 * Part of P0.1: OTP Email Inline implementation
 */

import { injectable, inject } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { ResendProvider } from '../email/resend.provider';
import { getResendConfig, getAppConfig, getSupabaseConfig } from '../../config/environment';

/**
 * OTP Purpose types
 */
export type OTPPurpose = 'signup_verification' | 'email_change' | '2fa' | 'password_reset';

/**
 * Generate OTP request
 */
export interface GenerateOTPRequest {
  email: string;
  purpose?: OTPPurpose;
  expiresInMinutes?: number;
  ipAddress?: string;
}

/**
 * Generate OTP response
 */
export interface GenerateOTPResponse {
  success: boolean;
  message: string;
  expiresAt?: Date;
  /** For testing purposes only - not exposed in production */
  otpCode?: string;
}

/**
 * Verify OTP request
 */
export interface VerifyOTPRequest {
  email: string;
  otpCode: string;
  purpose?: OTPPurpose;
}

/**
 * Verify OTP response
 */
export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  remainingAttempts: number;
}

/**
 * Rate limit check result
 */
interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  resets_at: Date;
}

/**
 * OTP generation result from database
 */
interface OTPGenerationResult {
  otp_id: string;
  otp_code: string;
  expires_at: Date;
}

/**
 * OTP verification result from database
 */
interface OTPVerificationResult {
  success: boolean;
  message: string;
  remaining_attempts: number;
}

@injectable()
export class OTPService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeEmailProvider();
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase admin client for email confirmation
   */
  private initializeSupabase(): void {
    try {
      const config = getSupabaseConfig();
      if (config.url && config.serviceRoleKey) {
        this.supabaseAdmin = createClient(config.url, config.serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        console.log('[OTPService] Supabase admin initialized');
      }
    } catch (error) {
      console.warn('[OTPService] Failed to initialize Supabase:', error);
    }
  }

  /**
   * Initialize email provider for sending OTP emails
   */
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
        console.log('[OTPService] Email provider initialized');
      } else {
        console.warn('[OTPService] Failed to initialize email provider:', result.error);
      }
    }
  }

  /**
   * Check rate limit before generating OTP
   */
  private async checkRateLimit(
    identifier: string,
    identifierType: 'email' | 'ip' = 'email',
    maxRequests: number = 5,
    windowMinutes: number = 60
  ): Promise<Result<RateLimitResult>> {
    try {
      const result = await this.pool.query<RateLimitResult>(
        `SELECT * FROM check_otp_rate_limit($1, $2, $3, $4)`,
        [identifier, identifierType, maxRequests, windowMinutes]
      );

      if (result.isFailure || !result.value?.rows[0]) {
        return Result.fail('Rate limit check failed');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      console.error('[OTPService] Rate limit check error:', error);
      return Result.fail(`Rate limit check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate and send OTP to email
   */
  async generateOTP(request: GenerateOTPRequest): Promise<Result<GenerateOTPResponse>> {
    const {
      email: rawEmail,
      purpose = 'signup_verification',
      expiresInMinutes = 10,
      ipAddress,
    } = request;

    // Normalize email for consistent storage and lookup
    const email = this.normalizeEmail(rawEmail);

    try {
      // Check email rate limit (5 requests per hour)
      const emailRateLimit = await this.checkRateLimit(email, 'email', 5, 60);
      if (emailRateLimit.isFailure) {
        return Result.fail(emailRateLimit.error || 'Rate limit check failed');
      }

      if (!emailRateLimit.value?.allowed) {
        const resetsAt = emailRateLimit.value?.resets_at;
        const waitMinutes = resetsAt
          ? Math.ceil((new Date(resetsAt).getTime() - Date.now()) / 60000)
          : 60;

        return Result.ok({
          success: false,
          message: `Has solicitado demasiados códigos. Espera ${waitMinutes} minutos antes de intentar de nuevo.`,
        });
      }

      // Check IP rate limit if provided (20 requests per hour)
      if (ipAddress) {
        const ipRateLimit = await this.checkRateLimit(ipAddress, 'ip', 20, 60);
        if (ipRateLimit.isFailure) {
          console.warn('[OTPService] IP rate limit check failed, proceeding anyway');
        } else if (!ipRateLimit.value?.allowed) {
          return Result.ok({
            success: false,
            message: 'Demasiadas solicitudes desde esta ubicación. Intenta más tarde.',
          });
        }
      }

      // Generate OTP using database function
      const otpResult = await this.pool.query<OTPGenerationResult>(
        `SELECT * FROM generate_otp($1, $2, $3)`,
        [email, purpose, expiresInMinutes]
      );

      if (otpResult.isFailure || !otpResult.value?.rows[0]) {
        return Result.fail('Failed to generate OTP');
      }

      const { otp_code: otpCode, expires_at: expiresAt } = otpResult.value.rows[0];

      // Send OTP email
      const emailSent = await this.sendOTPEmail(email, otpCode, purpose, expiresInMinutes);

      if (!emailSent) {
        return Result.fail('Failed to send OTP email. Please try again.');
      }

      const response: GenerateOTPResponse = {
        success: true,
        message: `Código de verificación enviado a ${this.maskEmail(email)}`,
        expiresAt: new Date(expiresAt),
      };

      // Include OTP code in development mode for testing
      if (process.env.NODE_ENV === 'development') {
        response.otpCode = otpCode;
      }

      return Result.ok(response);
    } catch (error) {
      console.error('[OTPService] Generate OTP error:', error);
      return Result.fail(`Failed to generate OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify OTP code
   * After successful verification, also confirms the email in Supabase Auth
   */
  async verifyOTP(request: VerifyOTPRequest): Promise<Result<VerifyOTPResponse>> {
    const { email: rawEmail, otpCode, purpose = 'signup_verification' } = request;
    const startTime = Date.now();

    // Normalize email for consistent lookup
    const email = this.normalizeEmail(rawEmail);

    try {
      // Validate OTP format
      if (!this.isValidOTPFormat(otpCode)) {
        return Result.ok({
          success: false,
          message: 'El código debe ser de 6 dígitos numéricos',
          remainingAttempts: -1,
        });
      }

      // Verify OTP using database function
      const verifyResult = await this.pool.query<OTPVerificationResult>(
        `SELECT * FROM verify_otp($1, $2, $3)`,
        [email, otpCode, purpose]
      );

      if (verifyResult.isFailure || !verifyResult.value?.rows[0]) {
        return Result.fail('OTP verification failed');
      }

      const { success, message, remaining_attempts: remainingAttempts } = verifyResult.value.rows[0];

      // If OTP verification successful and purpose is signup_verification,
      // also confirm email in Supabase Auth
      if (success && purpose === 'signup_verification') {
        const supabaseConfirmed = await this.confirmEmailInSupabase(email);
        if (!supabaseConfirmed) {
          console.warn('[OTPService] Failed to confirm email in Supabase, but OTP was valid');
          // Don't fail the verification, just log the warning
          // User can still proceed and we can retry later
        }
      }

      // Translate messages to Spanish
      const spanishMessage = this.translateMessage(message);

      // Add timing delay to prevent timing attacks
      await this.addTimingDelay(startTime);

      return Result.ok({
        success,
        message: spanishMessage,
        remainingAttempts,
      });
    } catch (error) {
      // Add timing delay even on errors to prevent timing attacks
      await this.addTimingDelay(startTime);
      console.error('[OTPService] Verify OTP error:', error);
      return Result.fail(`Failed to verify OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm email in Supabase Auth after successful OTP verification
   * This ensures the user can login after OTP verification
   */
  private async confirmEmailInSupabase(email: string): Promise<boolean> {
    if (!this.supabaseAdmin) {
      console.warn('[OTPService] Supabase admin not initialized, cannot confirm email');
      return false;
    }

    try {
      // First, find the user by email
      const { data: users, error: listError } = await this.supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('[OTPService] Failed to list users:', listError.message);
        return false;
      }

      const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        console.warn('[OTPService] User not found in Supabase for email:', email);
        return false;
      }

      // Check if already confirmed
      if (user.email_confirmed_at) {
        console.log('[OTPService] Email already confirmed in Supabase');
        return true;
      }

      // Confirm the email
      const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error('[OTPService] Failed to confirm email in Supabase:', updateError.message);
        return false;
      }

      console.log(`[OTPService] Email confirmed in Supabase for user ${user.id}`);
      return true;
    } catch (error) {
      console.error('[OTPService] Error confirming email in Supabase:', error);
      return false;
    }
  }

  /**
   * Resend OTP (generates a new code)
   */
  async resendOTP(request: GenerateOTPRequest): Promise<Result<GenerateOTPResponse>> {
    // Resend is just generating a new OTP
    return this.generateOTP(request);
  }

  /**
   * Check if email is verified within timeframe
   */
  async isEmailVerified(
    email: string,
    purpose: OTPPurpose = 'signup_verification',
    withinMinutes: number = 60
  ): Promise<Result<boolean>> {
    try {
      const result = await this.pool.query<{ is_email_verified: boolean }>(
        `SELECT is_email_verified($1, $2, $3) as is_email_verified`,
        [email, purpose, withinMinutes]
      );

      if (result.isFailure || !result.value?.rows[0]) {
        return Result.fail('Email verification check failed');
      }

      return Result.ok(result.value.rows[0].is_email_verified);
    } catch (error) {
      console.error('[OTPService] Email verification check error:', error);
      return Result.fail(`Failed to check email verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get time until next OTP can be requested
   */
  async getTimeUntilNextOTP(email: string): Promise<Result<{ canRequest: boolean; waitSeconds: number }>> {
    try {
      // Check if there's a recent OTP for this email
      const result = await this.pool.query<{ created_at: Date }>(
        `SELECT created_at FROM otp_verification_tokens
         WHERE email = $1
           AND verified_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [email]
      );

      if (result.isFailure) {
        return Result.fail('Failed to check OTP status');
      }

      if (!result.value?.rows[0]) {
        // No recent OTP, can request immediately
        return Result.ok({ canRequest: true, waitSeconds: 0 });
      }

      const createdAt = new Date(result.value.rows[0].created_at);
      const minWaitTime = 60 * 1000; // 60 seconds minimum between requests
      const elapsedTime = Date.now() - createdAt.getTime();

      if (elapsedTime >= minWaitTime) {
        return Result.ok({ canRequest: true, waitSeconds: 0 });
      }

      const waitSeconds = Math.ceil((minWaitTime - elapsedTime) / 1000);
      return Result.ok({ canRequest: false, waitSeconds });
    } catch (error) {
      console.error('[OTPService] Time until next OTP check error:', error);
      return Result.fail(`Failed to check time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send OTP email using Resend
   */
  private async sendOTPEmail(
    email: string,
    otpCode: string,
    purpose: OTPPurpose,
    expiresInMinutes: number
  ): Promise<boolean> {
    if (!this.emailProvider) {
      console.warn('[OTPService] Email provider not initialized, skipping OTP email');
      // In development, we can still consider this successful
      return process.env.NODE_ENV === 'development';
    }

    const appConfig = getAppConfig();
    const purposeText = this.getPurposeText(purpose);

    try {
      await this.emailProvider.send({
        to: email,
        subject: `${otpCode} es tu código de verificación - ${appConfig.appName}`,
        html: this.getOTPEmailTemplate(otpCode, purposeText, expiresInMinutes, appConfig.appName),
        text: `Tu código de verificación para ${appConfig.appName} es: ${otpCode}\n\nEste código expira en ${expiresInMinutes} minutos.\n\nSi no solicitaste este código, puedes ignorar este email.`,
        tags: [
          { name: 'type', value: 'otp-verification' },
          { name: 'purpose', value: purpose },
        ],
      });

      console.log(`[OTPService] OTP email sent to ${this.maskEmail(email)}`);
      return true;
    } catch (error) {
      console.error('[OTPService] Failed to send OTP email:', error);
      return false;
    }
  }

  /**
   * Get HTML email template for OTP
   */
  private getOTPEmailTemplate(
    otpCode: string,
    purposeText: string,
    expiresInMinutes: number,
    appName: string
  ): string {
    const otpDigits = otpCode.split('').map(digit => `
      <span style="
        display: inline-block;
        width: 48px;
        height: 56px;
        line-height: 56px;
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        background-color: #f3f4f6;
        border-radius: 8px;
        margin: 0 4px;
        color: #111827;
      ">${digit}</span>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de verificación</title>
</head>
<body style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #374151;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #ffffff;
">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="
      display: inline-block;
      width: 64px;
      height: 64px;
      line-height: 64px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border-radius: 16px;
      font-size: 28px;
      font-weight: bold;
      color: white;
    ">V</div>
  </div>

  <h1 style="
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    color: #111827;
    margin-bottom: 8px;
  ">Tu código de verificación</h1>

  <p style="
    text-align: center;
    color: #6b7280;
    margin-bottom: 32px;
  ">${purposeText}</p>

  <div style="
    text-align: center;
    margin: 32px 0;
    padding: 24px;
    background-color: #f9fafb;
    border-radius: 12px;
  ">
    ${otpDigits}
  </div>

  <p style="
    text-align: center;
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 32px;
  ">
    Este código expira en <strong>${expiresInMinutes} minutos</strong>.
    <br>
    Si no solicitaste este código, puedes ignorar este email.
  </p>

  <hr style="
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 32px 0;
  ">

  <p style="
    text-align: center;
    font-size: 12px;
    color: #9ca3af;
  ">
    Este email fue enviado por ${appName}.
    <br>
    Si tienes preguntas, contacta a nuestro equipo de soporte.
  </p>
</body>
</html>
    `;
  }

  /**
   * Get purpose text for email
   */
  private getPurposeText(purpose: OTPPurpose): string {
    const texts: Record<OTPPurpose, string> = {
      signup_verification: 'Usa este código para verificar tu email y completar tu registro.',
      email_change: 'Usa este código para confirmar el cambio de tu email.',
      '2fa': 'Usa este código para completar el inicio de sesión.',
      password_reset: 'Usa este código para restablecer tu contraseña.',
    };
    return texts[purpose];
  }

  /**
   * Translate database messages to Spanish
   */
  private translateMessage(message: string): string {
    const translations: Record<string, string> = {
      'Email verified successfully': 'Email verificado correctamente',
      'Invalid OTP code': 'Código incorrecto. Verifica e intenta de nuevo.',
      'OTP expired or not found. Please request a new code.': 'El código ha expirado. Solicita uno nuevo.',
      'Maximum attempts exceeded. Please request a new code.': 'Has excedido el número de intentos. Solicita un nuevo código.',
    };
    return translations[message] || message;
  }

  /**
   * Validate OTP format (6 digits)
   */
  private isValidOTPFormat(otpCode: string): boolean {
    return /^\d{6}$/.test(otpCode);
  }

  /**
   * Mask email for privacy (show first 2 chars and domain)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;

    const maskedLocal = local.length > 2
      ? local.slice(0, 2) + '***'
      : local[0] + '***';

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Normalize email for consistent comparison
   * - Lowercase
   * - Trim whitespace
   * - Remove dots from Gmail local part (optional, configurable)
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Add constant-time delay to prevent timing attacks
   * This ensures responses take similar time regardless of validation result
   */
  private async addTimingDelay(startTime: number): Promise<void> {
    const elapsed = Date.now() - startTime;
    const minResponseTime = 200; // Minimum 200ms response time
    if (elapsed < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsed));
    }
  }
}
