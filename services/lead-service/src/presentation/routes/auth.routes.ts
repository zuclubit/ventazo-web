/**
 * Authentication and User Management Routes
 * Handles user authentication, invitations, and tenant membership
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import {
  AuthService,
  UserRole,
  Permission,
  OTPService,
  TurnstileService,
  OnboardingService,
} from '../../infrastructure/auth';
import {
  authenticate,
  authenticateWithoutTenant,
  authenticateInternalAPI,
  optionalAuthenticate,
  requirePermission,
  requireRole,
  getAuthUser,
} from '../middlewares/auth.middleware';
import { JwtService } from '../../infrastructure/auth/jwt.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  fullName: z.string().optional(),
});

const updateMembershipSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.string().optional(),
  settings: z.object({
    businessType: z.string().optional(),
    businessSize: z.string().optional(),
    phone: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
  branding: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().optional(),
    companyDisplayName: z.string().optional(),
  }).optional(),
  modules: z.object({
    leads: z.boolean().optional(),
    customers: z.boolean().optional(),
    opportunities: z.boolean().optional(),
    tasks: z.boolean().optional(),
    calendar: z.boolean().optional(),
    workflows: z.boolean().optional(),
    analytics: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    cfdi: z.boolean().optional(),
    ai_scoring: z.boolean().optional(),
  }).optional(),
});

// Schema for syncing user from Supabase
const syncUserSchema = z.object({
  supabaseUserId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Schema for checking email availability
const checkEmailSchema = z.object({
  email: z.string().email(),
});

// Schema for tenant settings update
const updateTenantSettingsSchema = z.object({
  businessType: z.string().optional(),
  businessSize: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
});

// Schema for tenant branding update
const updateTenantBrandingSchema = z.object({
  logo: z.string().url().optional().nullable(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  companyDisplayName: z.string().optional(),
  favicon: z.string().url().optional().nullable(),
});

// Schema for tenant modules update
const updateTenantModulesSchema = z.object({
  leads: z.boolean().optional(),
  customers: z.boolean().optional(),
  opportunities: z.boolean().optional(),
  tasks: z.boolean().optional(),
  calendar: z.boolean().optional(),
  workflows: z.boolean().optional(),
  analytics: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  cfdi: z.boolean().optional(),
  ai_scoring: z.boolean().optional(),
});

// Schema for business hours
const businessHoursSchema = z.object({
  monday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  tuesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  wednesday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  thursday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  friday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  saturday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
  sunday: z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// Password complexity validation
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const passwordComplexityMessage = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';

// Login schema
const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Register schema with strong password validation
const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/\d/, 'La contraseña debe contener al menos un número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'La contraseña debe contener al menos un carácter especial'),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
});

// Refresh token schema
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Token de actualización requerido'),
});

// Password reset request schema
const passwordResetRequestSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

// Password update schema with strong validation
const passwordUpdateSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/\d/, 'La contraseña debe contener al menos un número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'La contraseña debe contener al menos un carácter especial'),
});

// Password reset with token schema (from email recovery link)
const passwordResetWithTokenSchema = z.object({
  token: z.string().min(1, 'Token de recuperación requerido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/\d/, 'La contraseña debe contener al menos un número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'La contraseña debe contener al menos un carácter especial'),
});

// Resend confirmation email schema
const resendConfirmationSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

// OTP schemas for inline email verification (P0.1)
const sendOTPSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  purpose: z.enum(['signup_verification', 'email_change', '2fa', 'password_reset']).optional().default('signup_verification'),
});

const verifyOTPSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  otpCode: z.string()
    .length(6, 'El código debe ser de 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico'),
  purpose: z.enum(['signup_verification', 'email_change', '2fa', 'password_reset']).optional().default('signup_verification'),
});

const checkOTPStatusSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

// Turnstile CAPTCHA verification schema (P0.2)
const turnstileVerifySchema = z.object({
  token: z.string().min(1, 'Token de verificación requerido'),
});

/**
 * Auth routes plugin
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // Public Auth Endpoints (No authentication required)
  // ============================================

  /**
   * Login with email and password
   */
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      description: 'Authenticates user and returns tokens',
      body: toJsonSchema(loginSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                avatarUrl: { type: 'string' },
              },
            },
            session: {
              type: 'object',
              additionalProperties: true,
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                expiresAt: { type: 'number' },
              },
            },
            tenants: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  role: { type: 'string' },
                  plan: { type: 'string' },
                  isActive: { type: 'boolean' },
                },
              },
            },
            onboarding: {
              type: 'object',
              additionalProperties: true,
              properties: {
                status: { type: 'string', enum: ['not_started', 'profile_created', 'business_created', 'setup_completed', 'team_invited', 'completed'] },
                currentStep: { type: 'string' },
                completedSteps: { type: 'array', items: { type: 'string' } },
                requiresOnboarding: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.signIn(email, password);

    if (result.isFailure) {
      const errorMessage = result.error || 'Error al iniciar sesion';

      // Map specific errors
      if (errorMessage === 'email_not_confirmed') {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'email_not_confirmed',
          code: 'EMAIL_NOT_CONFIRMED',
        });
      }

      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: errorMessage,
      });
    }

    return result.value;
  });

  /**
   * Register new user
   */
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register new user',
      description: 'Creates a new user account',
      body: toJsonSchema(registerSchema),
    },
  }, async (request, reply) => {
    const { email, password, fullName } = registerSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.signUp(email, password, fullName);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  // ============================================
  // OTP Verification Endpoints (P0.1 - Inline Email Verification)
  // ============================================

  /**
   * Send OTP code to email for verification
   * Used during signup flow for inline email verification
   */
  fastify.post('/otp/send', {
    schema: {
      tags: ['Auth', 'OTP'],
      summary: 'Send OTP verification code',
      description: 'Generates and sends a 6-digit OTP code to the specified email address for inline verification during signup',
      body: toJsonSchema(sendOTPSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            // otpCode is only included in development mode for testing
            otpCode: { type: 'string', description: 'Only in development mode' },
          },
        },
        429: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, purpose } = sendOTPSchema.parse(request.body);
    const otpService = container.resolve(OTPService);

    // Get client IP for rate limiting
    const ipAddress = request.ip || request.headers['x-forwarded-for'] as string;

    const result = await otpService.generateOTP({
      email,
      purpose,
      ipAddress,
    });

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error al enviar el código de verificación',
      });
    }

    const response = result.value!;

    // Check if rate limited
    if (!response.success) {
      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: response.message,
      });
    }

    return {
      success: true,
      message: response.message,
      expiresAt: response.expiresAt?.toISOString(),
      ...(response.otpCode && { otpCode: response.otpCode }), // Only in dev mode
    };
  });

  /**
   * Verify OTP code
   * Returns success/failure and remaining attempts
   */
  fastify.post('/otp/verify', {
    schema: {
      tags: ['Auth', 'OTP'],
      summary: 'Verify OTP code',
      description: 'Verifies the 6-digit OTP code entered by the user. Returns remaining attempts on failure.',
      body: toJsonSchema(verifyOTPSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            remainingAttempts: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
            remainingAttempts: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, otpCode, purpose } = verifyOTPSchema.parse(request.body);
    const otpService = container.resolve(OTPService);

    const result = await otpService.verifyOTP({
      email,
      otpCode,
      purpose,
    });

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error al verificar el código',
      });
    }

    const response = result.value!;

    if (!response.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: response.message,
        remainingAttempts: response.remainingAttempts,
      });
    }

    return {
      success: true,
      message: response.message,
      remainingAttempts: response.remainingAttempts,
    };
  });

  /**
   * Resend OTP code (generates a new code)
   */
  fastify.post('/otp/resend', {
    schema: {
      tags: ['Auth', 'OTP'],
      summary: 'Resend OTP code',
      description: 'Generates and sends a new OTP code. Subject to rate limiting.',
      body: toJsonSchema(sendOTPSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        429: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, purpose } = sendOTPSchema.parse(request.body);
    const otpService = container.resolve(OTPService);

    // Get client IP for rate limiting
    const ipAddress = request.ip || request.headers['x-forwarded-for'] as string;

    const result = await otpService.resendOTP({
      email,
      purpose,
      ipAddress,
    });

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error al reenviar el código',
      });
    }

    const response = result.value!;

    // Check if rate limited
    if (!response.success) {
      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: response.message,
      });
    }

    return {
      success: true,
      message: response.message,
      expiresAt: response.expiresAt?.toISOString(),
    };
  });

  /**
   * Check OTP status (time until next request allowed)
   */
  fastify.post('/otp/status', {
    schema: {
      tags: ['Auth', 'OTP'],
      summary: 'Check OTP request status',
      description: 'Returns whether a new OTP can be requested and time to wait if not',
      body: toJsonSchema(checkOTPStatusSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            canRequest: { type: 'boolean' },
            waitSeconds: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = checkOTPStatusSchema.parse(request.body);
    const otpService = container.resolve(OTPService);

    const result = await otpService.getTimeUntilNextOTP(email);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error al verificar estado',
      });
    }

    return result.value;
  });

  /**
   * Check if email is verified
   */
  fastify.post('/otp/check-verified', {
    schema: {
      tags: ['Auth', 'OTP'],
      summary: 'Check if email is verified',
      description: 'Returns whether the email has been verified via OTP within the last 60 minutes',
      body: toJsonSchema(checkOTPStatusSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            verified: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = checkOTPStatusSchema.parse(request.body);
    const otpService = container.resolve(OTPService);

    const result = await otpService.isEmailVerified(email, 'signup_verification', 60);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error al verificar estado',
      });
    }

    return { verified: result.value };
  });

  // ============================================
  // Turnstile CAPTCHA Verification (P0.2)
  // ============================================

  /**
   * Verify Cloudflare Turnstile token
   * Used to validate CAPTCHA before signup/login
   */
  fastify.post('/captcha/verify', {
    schema: {
      tags: ['Auth', 'CAPTCHA'],
      summary: 'Verify Turnstile CAPTCHA token',
      description: 'Validates a Cloudflare Turnstile token for bot protection',
      body: toJsonSchema(turnstileVerifySchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            challengeTs: { type: 'string' },
            hostname: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { token } = turnstileVerifySchema.parse(request.body);
    const turnstileService = container.resolve(TurnstileService);

    // Get client IP for verification
    const remoteip = request.ip || request.headers['x-forwarded-for'] as string;

    const result = await turnstileService.verify({
      token,
      remoteip,
    });

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error || 'Error de verificación CAPTCHA',
      });
    }

    const response = result.value!;

    if (!response.success) {
      const errorMessage = turnstileService.getErrorMessage(response.errorCodes || []);
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: errorMessage,
      });
    }

    return {
      success: true,
      challengeTs: response.challengeTs,
      hostname: response.hostname,
    };
  });

  /**
   * Check if CAPTCHA is enabled
   */
  fastify.get('/captcha/status', {
    schema: {
      tags: ['Auth', 'CAPTCHA'],
      summary: 'Check CAPTCHA status',
      description: 'Returns whether CAPTCHA verification is enabled',
      response: {
        200: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            provider: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    const turnstileService = container.resolve(TurnstileService);

    return {
      enabled: turnstileService.isEnabled(),
      provider: 'cloudflare-turnstile',
    };
  });

  /**
   * Refresh access token
   */
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token',
      body: toJsonSchema(refreshTokenSchema),
    },
  }, async (request, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.refreshToken(refreshToken);

    if (result.isFailure) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Request password reset
   */
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Request password reset',
      description: 'Sends password reset email',
      body: toJsonSchema(passwordResetRequestSchema),
    },
  }, async (request, reply) => {
    const { email } = passwordResetRequestSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    await authService.requestPasswordReset(email);

    // Always return success to not reveal if email exists
    return { message: 'Si el correo existe, recibiras instrucciones para restablecer tu contrasena' };
  });

  /**
   * Reset password with token (from email recovery link)
   * This endpoint is called when user clicks the reset link in their email
   * and submits a new password
   */
  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset password with recovery token',
      description: 'Resets user password using the token received via email. The token is obtained from the password reset email link.',
      body: toJsonSchema(passwordResetWithTokenSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
        400: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { token, password } = passwordResetWithTokenSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.resetPasswordWithToken(token, password);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return {
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      success: true,
    };
  });

  /**
   * Logout user
   */
  fastify.post('/logout', {
    preHandler: [optionalAuthenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Invalidates user session',
    },
  }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const authService = container.resolve(AuthService);
      await authService.signOut(token);
    }

    return { message: 'Sesion cerrada exitosamente' };
  });

  /**
   * Resend confirmation/verification email (uses Resend, no rate limits)
   */
  fastify.post('/resend-confirmation', {
    schema: {
      tags: ['Auth'],
      summary: 'Resend confirmation email',
      description: 'Resends the email confirmation link to the user via Resend (no rate limits)',
      body: toJsonSchema(resendConfirmationSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = resendConfirmationSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    // Use new Resend-based verification (no rate limits!)
    const result = await authService.resendVerificationEmail(email);

    // Always return success to not reveal if email exists (security)
    return {
      message: 'Si el correo existe y no ha sido confirmado, recibirás un nuevo enlace de confirmación',
      success: true,
    };
  });

  /**
   * Verify email with token
   */
  fastify.get('/verify-email', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify email address',
      description: 'Verifies user email using the token sent via email',
      querystring: toJsonSchema(z.object({
        token: z.string().uuid('Token inválido'),
      })),
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
            email: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { token } = (request.query as { token: string });
    const authService = container.resolve(AuthService);

    const result = await authService.verifyEmail(token);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
        success: false,
      });
    }

    return {
      message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.',
      success: true,
      email: result.value.email,
    };
  });

  /**
   * Update password (requires authentication)
   */
  fastify.post('/update-password', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Update password',
      description: 'Update user password (requires authentication)',
      body: toJsonSchema(passwordUpdateSchema),
    },
  }, async (request, reply) => {
    const { password } = passwordUpdateSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token requerido',
      });
    }

    const authService = container.resolve(AuthService);
    const result = await authService.updatePassword(token, password);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return { message: 'Contrasena actualizada exitosamente' };
  });

  // ============================================
  // Protected Auth Endpoints (Authentication required)
  // ============================================

  /**
   * Get current user profile and permissions
   * Uses authenticateWithoutTenant for onboarding users without tenants yet
   */
  fastify.get('/me', {
    preHandler: [authenticateWithoutTenant],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user',
      description: 'Returns the authenticated user profile and permissions',
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            tenantId: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object', additionalProperties: true },
            profile: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);

    const authService = container.resolve(AuthService);
    const profileResult = await authService.getUserById(user.id);

    if (profileResult.isFailure || !profileResult.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    return {
      ...user,
      profile: profileResult.value,
    };
  });

  /**
   * Update current user profile
   */
  fastify.patch('/me', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Update current user profile',
      body: toJsonSchema(updateProfileSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = updateProfileSchema.parse(request.body);

    const authService = container.resolve(AuthService);
    const result = await authService.updateUserProfile(user.id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get user's tenants (organizations)
   * Uses authenticateWithoutTenant because users without tenants need to access this
   */
  fastify.get('/tenants', {
    preHandler: [authenticateWithoutTenant],
    schema: {
      tags: ['Auth'],
      summary: 'Get user tenants',
      description: 'Returns all tenants the user is a member of',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    try {
      const result = await authService.getUserTenants(user.id);

      if (result.isFailure) {
        // Log the error but return empty array for better UX
        fastify.log.warn({ userId: user.id, error: result.error }, 'Failed to get user tenants');
        return {
          memberships: [],
        };
      }

      return result.value;
    } catch (error) {
      // Return empty memberships instead of error for resilience
      fastify.log.error({ userId: user.id, error }, 'Error getting user tenants');
      return {
        memberships: [],
      };
    }
  });

  /**
   * Get pending invitations
   */
  fastify.get('/invitations', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Get pending invitations',
      description: 'Returns all pending tenant invitations for the user',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getPendingInvitations(user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Accept an invitation
   */
  fastify.post('/invitations/:id/accept', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Accept invitation',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const authService = container.resolve(AuthService);

    const result = await authService.acceptInvitation(id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Create a new tenant
   * Uses authenticateWithoutTenant because user doesn't have a tenant yet
   */
  fastify.post('/tenants', {
    preHandler: [authenticateWithoutTenant],
    schema: {
      tags: ['Auth'],
      summary: 'Create tenant',
      description: 'Creates a new tenant organization (for onboarding)',
      body: toJsonSchema(createTenantSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = createTenantSchema.parse(request.body);

    const authService = container.resolve(AuthService);

    const result = await authService.createTenant({
      ...body,
      ownerUserId: user.id,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });
};

/**
 * Tenant member management routes
 * These require admin permissions within the tenant
 */
export const memberRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all tenant members
   */
  fastify.get('/', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_VIEW),
    ],
    schema: {
      tags: ['Members'],
      summary: 'List tenant members',
      querystring: toJsonSchema(z.object({
        includeInactive: z.string().transform(v => v === 'true').optional(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const query = request.query as { includeInactive?: boolean };

    const authService = container.resolve(AuthService);
    const result = await authService.getTenantMembers(user.tenantId, {
      includeInactive: query.includeInactive,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get member counts by role
   */
  fastify.get('/counts', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_VIEW),
    ],
    schema: {
      tags: ['Members'],
      summary: 'Get member counts by role',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.countMembersByRole(user.tenantId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Invite a user to the tenant
   */
  fastify.post('/invite', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_INVITE),
    ],
    schema: {
      tags: ['Members'],
      summary: 'Invite user to tenant',
      body: toJsonSchema(inviteUserSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = inviteUserSchema.parse(request.body);

    // Validate role hierarchy - can't invite someone with higher role
    const roleHierarchy: UserRole[] = [
      UserRole.VIEWER,
      UserRole.SALES_REP,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.OWNER,
    ];

    const inviterRoleIndex = roleHierarchy.indexOf(user.role);
    const inviteeRoleIndex = roleHierarchy.indexOf(body.role);

    if (inviteeRoleIndex > inviterRoleIndex) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Cannot invite a user with a higher role than your own',
      });
    }

    const authService = container.resolve(AuthService);
    const result = await authService.inviteUser(user.tenantId, body, user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Update a member's role or status
   */
  fastify.patch('/:id', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_MANAGE),
    ],
    schema: {
      tags: ['Members'],
      summary: 'Update member',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(updateMembershipSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const body = updateMembershipSchema.parse(request.body);
    const user = getAuthUser(request);

    const authService = container.resolve(AuthService);

    // Get the membership to check ownership
    // Prevent changing owner role or self-demotion
    const existingResult = await authService.getTenantMembership(user.id, user.tenantId);
    if (existingResult.isSuccess && existingResult.value?.id === id) {
      if (body.role && body.role !== user.role) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Cannot change your own role',
        });
      }
    }

    const result = await authService.updateMembership(id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Remove a member from the tenant
   */
  fastify.delete('/:id', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_MANAGE),
    ],
    schema: {
      tags: ['Members'],
      summary: 'Remove member',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const user = getAuthUser(request);

    const authService = container.resolve(AuthService);

    // Prevent self-removal
    const existingResult = await authService.getTenantMembership(user.id, user.tenantId);
    if (existingResult.isSuccess && existingResult.value?.id === id) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Cannot remove yourself from the tenant',
      });
    }

    const result = await authService.removeMember(id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(204).send();
  });
};

/**
 * Tenant settings routes (owner/admin only)
 */
export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get current tenant details
   */
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      tags: ['Tenant'],
      summary: 'Get tenant details',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getTenantById(user.tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return result.value;
  });

  /**
   * Get tenant settings
   */
  fastify.get('/settings', {
    preHandler: [authenticate],
    schema: {
      tags: ['Tenant'],
      summary: 'Get tenant settings',
      description: 'Returns the tenant business settings',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getTenantById(user.tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return result.value.settings || {};
  });

  /**
   * Update tenant settings
   */
  fastify.patch('/settings', {
    preHandler: [
      authenticate,
      requireRole(UserRole.ADMIN, UserRole.OWNER),
    ],
    schema: {
      tags: ['Tenant'],
      summary: 'Update tenant settings',
      body: toJsonSchema(updateTenantSettingsSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = updateTenantSettingsSchema.parse(request.body);

    const authService = container.resolve(AuthService);
    const result = await authService.updateTenantSettings(user.tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get tenant branding
   */
  fastify.get('/branding', {
    preHandler: [authenticate],
    schema: {
      tags: ['Tenant'],
      summary: 'Get tenant branding',
      description: 'Returns the tenant branding configuration',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getTenantById(user.tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return (result.value.metadata?.branding as Record<string, unknown>) || {};
  });

  /**
   * Update tenant branding
   */
  fastify.patch('/branding', {
    preHandler: [
      authenticate,
      requireRole(UserRole.ADMIN, UserRole.OWNER),
    ],
    schema: {
      tags: ['Tenant'],
      summary: 'Update tenant branding',
      body: toJsonSchema(updateTenantBrandingSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = updateTenantBrandingSchema.parse(request.body);

    const authService = container.resolve(AuthService);
    const result = await authService.updateTenantBranding(user.tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Upload tenant logo
   */
  fastify.post('/logo', {
    preHandler: [
      authenticate,
      requireRole(UserRole.ADMIN, UserRole.OWNER),
    ],
    schema: {
      tags: ['Tenant'],
      summary: 'Upload tenant logo',
      description: 'Upload a new logo for the tenant',
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);

    try {
      // Handle multipart form data
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid file type. Allowed types: JPEG, PNG, WebP, SVG',
        });
      }

      // Validate file size (5MB max)
      const fileBuffer = await data.toBuffer();
      if (fileBuffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'File size exceeds 5MB limit',
        });
      }

      // Try to use StorageService if available
      try {
        const storageService = container.resolve(StorageService);

        if (storageService.isConfigured()) {
          const uploadResult = await storageService.uploadFile(
            user.tenantId,
            user.id,
            {
              entityType: 'tenant',
              entityId: user.tenantId,
              file: {
                buffer: fileBuffer,
                originalName: data.filename || 'logo.png',
                mimeType: data.mimetype,
                size: fileBuffer.length,
              },
              category: 'image',
              isPublic: true,
            }
          );

          if (uploadResult.isSuccess && uploadResult.value) {
            // Update tenant branding with new logo URL
            const authService = container.resolve(AuthService);
            await authService.updateTenantBranding(user.tenantId, {
              logo: uploadResult.value.storageUrl || '',
            });

            return {
              success: true,
              data: {
                url: uploadResult.value.storageUrl,
                id: uploadResult.value.id,
              },
            };
          }
        }
      } catch {
        // Storage service not available, fall back to base64 data URL
      }

      // Fallback: Convert to base64 data URL
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${data.mimetype};base64,${base64}`;

      // Update tenant branding with data URL
      const authService = container.resolve(AuthService);
      await authService.updateTenantBranding(user.tenantId, {
        logo: dataUrl,
      });

      return {
        success: true,
        data: {
          url: dataUrl,
        },
      };
    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to upload logo',
      });
    }
  });

  /**
   * Get tenant modules configuration
   */
  fastify.get('/modules', {
    preHandler: [authenticate],
    schema: {
      tags: ['Tenant'],
      summary: 'Get tenant modules',
      description: 'Returns which CRM modules are enabled for the tenant',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getTenantById(user.tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return (result.value.metadata?.modules as Record<string, boolean>) || {
      leads: true,
      customers: true,
      opportunities: true,
      tasks: true,
      calendar: true,
      workflows: false,
      analytics: true,
      whatsapp: false,
      cfdi: false,
      ai_scoring: false,
    };
  });

  /**
   * Update tenant modules configuration
   */
  fastify.patch('/modules', {
    preHandler: [
      authenticate,
      requireRole(UserRole.OWNER),
    ],
    schema: {
      tags: ['Tenant'],
      summary: 'Update tenant modules',
      description: 'Enable or disable CRM modules (owner only)',
      body: toJsonSchema(updateTenantModulesSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = updateTenantModulesSchema.parse(request.body);

    const authService = container.resolve(AuthService);
    const result = await authService.updateTenantModules(user.tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get business hours
   */
  fastify.get('/business-hours', {
    preHandler: [authenticate],
    schema: {
      tags: ['Tenant'],
      summary: 'Get business hours',
      description: 'Returns the tenant business hours configuration',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const authService = container.resolve(AuthService);

    const result = await authService.getTenantById(user.tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return (result.value.metadata?.businessHours as Record<string, unknown>) || {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '14:00' },
      sunday: { enabled: false, start: '09:00', end: '14:00' },
    };
  });

  /**
   * Update business hours
   */
  fastify.patch('/business-hours', {
    preHandler: [
      authenticate,
      requireRole(UserRole.ADMIN, UserRole.OWNER),
    ],
    schema: {
      tags: ['Tenant'],
      summary: 'Update business hours',
      body: toJsonSchema(businessHoursSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = businessHoursSchema.parse(request.body);

    const authService = container.resolve(AuthService);
    const result = await authService.updateTenantBusinessHours(user.tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });
};

/**
 * User sync routes - for Supabase integration
 */
export const userSyncRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Sync user from Supabase to backend
   * Called after Supabase auth to ensure user exists in our database
   */
  fastify.post('/sync-user', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Sync user from Supabase',
      description: 'Creates or updates user in backend database after Supabase authentication',
      body: toJsonSchema(syncUserSchema),
    },
  }, async (request, reply) => {
    const body = syncUserSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.syncUserFromSupabase({
      supabaseUserId: body.supabaseUserId,
      email: body.email,
      fullName: body.fullName || `${body.firstName || ''} ${body.lastName || ''}`.trim() || undefined,
      avatarUrl: body.avatarUrl,
      metadata: body.metadata,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Check email availability
   */
  fastify.post('/check-email', {
    schema: {
      tags: ['Auth'],
      summary: 'Check email availability',
      description: 'Checks if an email address is already registered',
      body: toJsonSchema(checkEmailSchema),
    },
  }, async (request, reply) => {
    const { email } = checkEmailSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    const result = await authService.checkEmailAvailability(email);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return {
      email,
      available: result.value,
    };
  });

  /**
   * Complete onboarding - creates tenant with full configuration
   * Uses authenticateWithoutTenant because user doesn't have a tenant yet
   */
  fastify.post('/complete-onboarding', {
    preHandler: [authenticateWithoutTenant],
    schema: {
      tags: ['Auth'],
      summary: 'Complete onboarding process',
      description: 'Creates tenant with settings, branding, and modules in a single operation',
      body: toJsonSchema(createTenantSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = createTenantSchema.parse(request.body);
    const authService = container.resolve(AuthService);

    // Create tenant with all configuration
    const result = await authService.createTenantWithFullConfig({
      name: body.name,
      slug: body.slug,
      plan: body.plan,
      ownerUserId: user.id,
      settings: body.settings,
      branding: body.branding,
      modules: body.modules,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Check slug availability
   */
  fastify.get('/check-slug/:slug', {
    schema: {
      tags: ['Auth'],
      summary: 'Check slug availability',
      description: 'Checks if a tenant slug is available',
      params: toJsonSchema(z.object({
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      })),
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const authService = container.resolve(AuthService);

    const result = await authService.checkSlugAvailability(slug);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return {
      slug,
      available: result.value,
    };
  });

  /**
   * OAuth Exchange - Exchange verified OAuth user data for native JWT tokens
   *
   * SECURITY ARCHITECTURE:
   * This endpoint uses INTERNAL_API_KEY instead of SUPABASE_JWT_SECRET.
   *
   * Flow:
   * 1. User authenticates via OAuth (Google/Microsoft) through Supabase
   * 2. Frontend server receives OAuth code and calls exchangeCodeForSession()
   *    - This is a secure server-to-server call that verifies the OAuth flow
   * 3. Frontend server calls this endpoint with:
   *    - X-Internal-API-Key header (shared secret between frontend/backend servers)
   *    - Verified user data (userId, email, etc.) in request body
   * 4. Backend trusts this data because it's authenticated via INTERNAL_API_KEY
   * 5. Backend generates native JWT tokens and returns complete user state
   *
   * Benefits:
   * - Eliminates SUPABASE_JWT_SECRET dependency
   * - Simpler architecture (no JWT verification, just API key)
   * - The OAuth verification already happened in step 2
   */
  const oauthExchangeSchema = z.object({
    // User data verified by frontend via exchangeCodeForSession()
    userId: z.string().uuid('Invalid user ID'),
    email: z.string().email('Invalid email'),
    fullName: z.string().optional(),
    avatarUrl: z.string().url().optional().nullable(),
    provider: z.string().optional(),
  });

  fastify.post('/oauth/exchange', {
    preHandler: [authenticateInternalAPI],
    schema: {
      tags: ['Auth'],
      summary: 'Exchange OAuth user data for native tokens',
      description: 'Exchanges verified OAuth user data (from frontend server) for native JWT tokens. Requires X-Internal-API-Key header.',
      body: toJsonSchema(oauthExchangeSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                fullName: { type: 'string' },
              },
            },
            tenants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
            onboarding: {
              type: 'object',
              nullable: true,
              properties: {
                status: { type: 'string' },
                currentStep: { type: 'string' },
                completedSteps: { type: 'array', items: { type: 'string' } },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                expiresAt: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = oauthExchangeSchema.parse(request.body);
    const authService = container.resolve(AuthService);
    const onboardingService = container.resolve(OnboardingService);
    const jwtService = new JwtService();

    try {
      // 1. Sync user to backend database
      const syncResult = await authService.syncUserFromSupabase({
        supabaseUserId: body.userId,
        email: body.email,
        fullName: body.fullName,
        avatarUrl: body.avatarUrl || undefined,
        metadata: body.provider ? { oauthProvider: body.provider } : undefined,
      });

      if (syncResult.isFailure) {
        request.log.warn({ error: syncResult.error }, 'User sync failed, user may already exist');
        // Continue anyway - user may already exist
      }

      // 2. Get user's tenant memberships
      const tenantsResult = await authService.getUserTenants(body.userId);
      const tenants = tenantsResult.isSuccess && tenantsResult.value?.memberships
        ? tenantsResult.value.memberships.map(m => ({
            id: m.tenantId,
            name: m.tenantName || 'Unknown',
            slug: m.tenantSlug || '',
            role: m.role,
          }))
        : [];

      // 3. Get onboarding status
      let onboarding = null;
      try {
        const onboardingResult = await onboardingService.getOnboardingStatus(body.userId);
        if (onboardingResult.isSuccess && onboardingResult.value) {
          onboarding = {
            status: onboardingResult.value.status,
            currentStep: onboardingResult.value.currentStep,
            completedSteps: onboardingResult.value.completedSteps,
          };
        }
      } catch (onboardingError) {
        request.log.warn({ error: onboardingError }, 'Could not fetch onboarding status');
      }

      // 4. Generate native JWT tokens
      // Use first tenant if available, otherwise leave tenantId empty
      const firstTenant = tenants[0];
      const tenantId = firstTenant?.id || '';
      const role = firstTenant?.role || 'owner';

      const tokenResult = await jwtService.generateTokenPair(
        body.userId,
        body.email,
        tenantId,
        role
      );

      if (tokenResult.isFailure) {
        request.log.error({ error: tokenResult.error }, 'Token generation failed');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to generate authentication tokens',
        });
      }

      const tokens = tokenResult.value!;

      request.log.info({ userId: body.userId, email: body.email }, 'OAuth exchange successful');

      // 5. Return complete user state with native tokens
      return {
        user: {
          id: body.userId,
          email: body.email,
          fullName: syncResult.isSuccess ? syncResult.value?.fullName : body.fullName,
        },
        tenants,
        onboarding,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          expiresAt: tokens.expiresAt,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'OAuth exchange failed');
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to process OAuth exchange',
      });
    }
  });

  // ============================================
  // DEPRECATED: /oauth/sync
  // Kept for backwards compatibility during migration
  // Will be removed in future version
  // ============================================
  const oauthSyncSchema = z.object({
    email: z.string().email(),
    fullName: z.string().optional(),
    avatarUrl: z.string().url().optional().nullable(),
    provider: z.string().optional(),
  });

  fastify.post('/oauth/sync', {
    preHandler: [authenticateInternalAPI],
    schema: {
      tags: ['Auth'],
      summary: '[DEPRECATED] Use /oauth/exchange instead',
      description: 'DEPRECATED: This endpoint now requires X-Internal-API-Key. Use /oauth/exchange with userId in body.',
      deprecated: true,
      body: toJsonSchema(oauthSyncSchema),
    },
  }, async (request, reply) => {
    // Return deprecation error
    return reply.status(410).send({
      statusCode: 410,
      error: 'Gone',
      message: 'This endpoint is deprecated. Use POST /api/v1/auth/oauth/exchange with X-Internal-API-Key header and userId in body.',
      migration: {
        newEndpoint: '/api/v1/auth/oauth/exchange',
        requiredHeaders: ['X-Internal-API-Key'],
        bodyChanges: 'Add userId (UUID) to request body',
      },
    });
  });
};
