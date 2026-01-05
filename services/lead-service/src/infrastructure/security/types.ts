/**
 * Security Module Types
 * Types for 2FA, sessions, and security management
 *
 * @module infrastructure/security/types
 */

// ============================================
// Session Types
// ============================================

export interface UserSession {
  id: string;
  userId: string;
  tenantId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: string;
  userAgent?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  isMobile?: boolean;
}

export interface SessionListResponse {
  sessions: UserSessionResponse[];
  currentSessionId: string;
}

export interface UserSessionResponse {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// ============================================
// Two-Factor Authentication Types
// ============================================

export type TwoFactorMethod = 'totp' | 'sms' | 'email';

export interface TwoFactorSetup {
  userId: string;
  method: TwoFactorMethod;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enable2FARequest {
  method: TwoFactorMethod;
}

export interface Enable2FAResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  setupToken: string;
}

export interface Verify2FARequest {
  code: string;
  setupToken?: string;
}

export interface Verify2FAResponse {
  success: boolean;
  backupCodes?: string[];
}

export interface Disable2FARequest {
  code: string;
  password: string;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  method?: TwoFactorMethod;
  verifiedAt?: string;
  hasBackupCodes: boolean;
}

// ============================================
// Security Stats Types
// ============================================

export interface SecurityStats {
  accountStatus: 'secure' | 'at_risk' | 'compromised';
  twoFactorEnabled: boolean;
  activeSessions: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginLocation?: string;
  passwordLastChanged?: string;
  recentSecurityEvents: SecurityEvent[];
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  description: string;
  ipAddress?: string;
  location?: string;
  timestamp: string;
  success: boolean;
}

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_revoked'
  | 'suspicious_activity';

// ============================================
// Password Policy Types
// ============================================

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days, 0 = no expiry
  preventReuse: number; // number of previous passwords to check
  lockoutThreshold: number; // failed attempts before lockout
  lockoutDuration: number; // minutes
}

export interface UpdatePasswordPolicyRequest {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxAge?: number;
  preventReuse?: number;
  lockoutThreshold?: number;
  lockoutDuration?: number;
}

// ============================================
// Session Settings Types
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
// Default Values
// ============================================

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  preventReuse: 5,
  lockoutThreshold: 5,
  lockoutDuration: 15,
};

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  sessionTimeout: 30,
  allowRememberMe: true,
  maxConcurrentSessions: 5,
  requireReauthForSensitive: true,
};
