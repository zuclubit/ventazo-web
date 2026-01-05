/**
 * Security Module Types
 * Types for 2FA, sessions, and security settings
 */

// ============================================
// Two-Factor Authentication
// ============================================

export interface TwoFactorStatus {
  enabled: boolean;
  method: 'totp' | 'sms' | 'email' | null;
  enabledAt: string | null;
  backupCodesRemaining: number;
}

export interface Enable2FAResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface Verify2FARequest {
  code: string;
}

export interface Verify2FAResponse {
  success: boolean;
  message: string;
}

export interface Disable2FARequest {
  code: string;
}

// ============================================
// Sessions
// ============================================

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionsResponse {
  sessions: UserSession[];
  total: number;
}

// ============================================
// Password Policy
// ============================================

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days, 0 = never expires
  preventReuse: number; // number of previous passwords
}

export interface UpdatePasswordPolicyRequest {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxAge?: number;
  preventReuse?: number;
}

// ============================================
// Session Settings
// ============================================

export interface SessionSettings {
  sessionTimeout: number; // minutes
  allowRememberMe: boolean;
  maxConcurrentSessions: number;
  requireReauthForSensitive: boolean;
}

export interface UpdateSessionSettingsRequest {
  sessionTimeout?: number;
  allowRememberMe?: boolean;
  maxConcurrentSessions?: number;
  requireReauthForSensitive?: boolean;
}

// ============================================
// Security Stats
// ============================================

export interface SecurityStats {
  activeSessions: number;
  failedLoginAttempts: number;
  lastPasswordChange: string | null;
  lastLogin: string;
  accountStatus: 'secure' | 'warning' | 'at_risk';
}

// ============================================
// Security Audit Events
// ============================================

export interface SecurityAuditEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'session_revoked' | 'failed_login';
  description: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface SecurityEventsResponse {
  events: SecurityAuditEvent[];
  total: number;
}
