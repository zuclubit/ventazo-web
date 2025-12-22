import { config } from 'dotenv';
import { DatabaseConfig } from '@zuclubit/database';

// Load environment variables
config();

/**
 * Environment configuration
 */
export const getEnvironment = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'lead-service',
  };
};

/**
 * Database configuration
 */
export const getDatabaseConfig = (): DatabaseConfig => {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';

  // Enable SSL for remote connections (Supabase, cloud DBs, etc.)
  // Disable SSL for local development
  const sslConfig = isLocalhost
    ? undefined
    : { rejectUnauthorized: false }; // Supabase requires SSL but self-signed certs

  return {
    host,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'leads',
    user: process.env.POSTGRES_USER || 'dev',
    password: process.env.POSTGRES_PASSWORD || 'dev123',
    ssl: sslConfig,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000', 10),
  };
};

/**
 * Events configuration
 */
export const getEventsConfig = () => {
  return {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  };
};

/**
 * Authentication configuration (Supabase)
 */
export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  jwtSecret: string;
}

export const getAuthConfig = (): AuthConfig => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  // In development, allow missing Supabase config with defaults
  if (process.env.NODE_ENV === 'development') {
    return {
      supabaseUrl: supabaseUrl || 'http://localhost:54321',
      supabaseAnonKey: supabaseAnonKey || 'dev-anon-key',
      supabaseServiceKey: supabaseServiceKey || 'dev-service-key',
      jwtSecret: jwtSecret || 'dev-jwt-secret-at-least-32-characters-long',
    };
  }

  // In production, require all config
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !jwtSecret) {
    throw new Error(
      'Missing required Supabase configuration. ' +
      'Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, and SUPABASE_JWT_SECRET'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    jwtSecret,
  };
};

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitTimeWindow: string;
}

export const getServerConfig = (): ServerConfig => {
  const env = getEnvironment();
  return {
    port: env.port,
    host: env.host,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitTimeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  };
};

/**
 * Resend Email Configuration
 */
export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export const getResendConfig = (): ResendConfig => {
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@zuclubit.com';
  const fromName = process.env.RESEND_FROM_NAME || 'Zuclubit CRM';

  return {
    apiKey,
    fromEmail,
    fromName,
    isEnabled: !!apiKey && apiKey.startsWith('re_'),
  };
};

/**
 * Application URLs Configuration
 */
export interface AppConfig {
  appName: string;
  appUrl: string;
  supportEmail: string;
}

export const getAppConfig = (): AppConfig => {
  return {
    appName: process.env.APP_NAME || 'Zuclubit CRM',
    appUrl: process.env.APP_URL || 'https://app.zuclubit.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'soporte@zuclubit.com',
  };
};

/**
 * Supabase Configuration (for direct admin access)
 */
export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  anonKey: string;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const authConfig = getAuthConfig();
  return {
    url: authConfig.supabaseUrl,
    serviceRoleKey: authConfig.supabaseServiceKey,
    anonKey: authConfig.supabaseAnonKey,
  };
};

/**
 * Twilio Configuration (SMS & WhatsApp)
 */
export interface TwilioConfig {
  accountSid: string;
  // Auth Token OR API Key authentication
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  // Phone numbers
  phoneNumber: string;
  whatsappNumber: string;
  // Optional Messaging Service
  messagingServiceSid: string;
  // Feature flags
  isEnabled: boolean;
  isWhatsAppEnabled: boolean;
}

export const getTwilioConfig = (): TwilioConfig => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const apiKeySid = process.env.TWILIO_API_KEY_SID || '';
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || '';
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

  // Check if properly configured (needs Account SID + auth method + phone number)
  const hasAuth = !!authToken || (!!apiKeySid && !!apiKeySecret);
  const isEnabled = !!accountSid && hasAuth && !!phoneNumber;
  const isWhatsAppEnabled = !!accountSid && hasAuth && !!whatsappNumber;

  return {
    accountSid,
    authToken,
    apiKeySid,
    apiKeySecret,
    phoneNumber,
    whatsappNumber,
    messagingServiceSid,
    isEnabled,
    isWhatsAppEnabled,
  };
};

/**
 * Firebase Configuration (Push Notifications)
 * Supports multiple authentication methods:
 * - Service Account (privateKey + clientEmail)
 * - Application Default Credentials (ADC)
 * - GOOGLE_APPLICATION_CREDENTIALS file
 */
export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  useADC: boolean;
  isEnabled: boolean;
}

export const getFirebaseConfig = (): FirebaseConfig => {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const useADC = process.env.FIREBASE_USE_ADC === 'true';
  const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Firebase is enabled if:
  // 1. Has Service Account credentials (projectId + privateKey + clientEmail), OR
  // 2. Has GOOGLE_APPLICATION_CREDENTIALS file, OR
  // 3. ADC is enabled with projectId
  const hasServiceAccount = !!projectId && !!privateKey && !!clientEmail;
  const isEnabled = hasServiceAccount || hasCredentialsFile || (useADC && !!projectId);

  return {
    projectId,
    privateKey,
    clientEmail,
    useADC,
    isEnabled,
  };
};
