/**
 * Security Service
 * Handles 2FA, session management, and security operations
 *
 * @module infrastructure/security/security.service
 */

import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import { DatabasePool } from '@zuclubit/database';
import { Result } from '../../shared/domain/result';
import {
  UserSession,
  UserSessionResponse,
  SessionListResponse,
  DeviceInfo,
  TwoFactorStatus,
  Enable2FAResponse,
  Verify2FAResponse,
  SecurityStats,
  SecurityEvent,
  PasswordPolicy,
  SessionSettings,
  DEFAULT_PASSWORD_POLICY,
  DEFAULT_SESSION_SETTINGS,
  TwoFactorMethod,
} from './types';

// ============================================
// Constants
// ============================================

const ENCRYPTION_KEY = process.env['TOKEN_ENCRYPTION_KEY'] || crypto.randomBytes(32).toString('hex');
const SESSION_EXPIRY_HOURS = 24;
const BACKUP_CODES_COUNT = 10;

// ============================================
// Security Service
// ============================================

@injectable()
export class SecurityService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    tenantId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent?: string
  ): Promise<Result<UserSession>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

      const location = await this.getLocationFromIp(ipAddress);

      const sql = `
        INSERT INTO user_sessions (
          id, user_id, tenant_id, device_info, ip_address, location,
          user_agent, created_at, last_active_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *
      `;

      const result = await this.pool.query(sql, [
        id,
        userId,
        tenantId,
        JSON.stringify(deviceInfo),
        ipAddress,
        location,
        userAgent,
        now,
        now,
        expiresAt,
      ]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const row = result.getValue().rows[0];
      return Result.ok(this.mapRowToSession(row));
    } catch (error) {
      return Result.fail(`Failed to create session: ${error}`);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(
    userId: string,
    tenantId: string,
    currentSessionId?: string
  ): Promise<Result<SessionListResponse>> {
    try {
      const sql = `
        SELECT * FROM user_sessions
        WHERE user_id = $1 AND tenant_id = $2 AND is_active = true AND expires_at > NOW()
        ORDER BY last_active_at DESC
      `;

      const result = await this.pool.query(sql, [userId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const sessions = result.getValue().rows.map((row) => {
        const session = this.mapRowToSession(row);
        return this.mapSessionToResponse(session, session.id === currentSessionId);
      });

      return Result.ok({
        sessions,
        currentSessionId: currentSessionId || '',
      });
    } catch (error) {
      return Result.fail(`Failed to get sessions: ${error}`);
    }
  }

  /**
   * Revoke a single session
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    tenantId: string,
    revokedBy: string
  ): Promise<Result<void>> {
    try {
      const sql = `
        UPDATE user_sessions
        SET is_active = false, revoked_at = NOW(), revoked_by = $4
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND is_active = true
      `;

      const result = await this.pool.query(sql, [sessionId, userId, tenantId, revokedBy]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      if (result.getValue().rowCount === 0) {
        return Result.fail('Session not found or already revoked');
      }

      // Log security event
      await this.logSecurityEvent(userId, tenantId, 'session_revoked', true, {
        sessionId,
        revokedBy,
      });

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to revoke session: ${error}`);
    }
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllSessions(
    userId: string,
    tenantId: string,
    exceptSessionId: string,
    revokedBy: string
  ): Promise<Result<number>> {
    try {
      const sql = `
        UPDATE user_sessions
        SET is_active = false, revoked_at = NOW(), revoked_by = $4
        WHERE user_id = $1 AND tenant_id = $2 AND id != $3 AND is_active = true
      `;

      const result = await this.pool.query(sql, [userId, tenantId, exceptSessionId, revokedBy]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const revokedCount = result.getValue().rowCount || 0;

      // Log security event
      await this.logSecurityEvent(userId, tenantId, 'session_revoked', true, {
        revokedCount,
        revokedBy,
        action: 'revoke_all',
      });

      return Result.ok(revokedCount);
    } catch (error) {
      return Result.fail(`Failed to revoke sessions: ${error}`);
    }
  }

  /**
   * Update session last active time
   */
  async updateSessionActivity(sessionId: string): Promise<Result<void>> {
    try {
      const sql = `
        UPDATE user_sessions
        SET last_active_at = NOW()
        WHERE id = $1 AND is_active = true
      `;

      await this.pool.query(sql, [sessionId]);
      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to update session activity: ${error}`);
    }
  }

  // ============================================
  // Two-Factor Authentication
  // ============================================

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId: string): Promise<Result<TwoFactorStatus>> {
    try {
      const sql = `
        SELECT * FROM user_2fa WHERE user_id = $1
      `;

      const result = await this.pool.query(sql, [userId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      if (result.getValue().rows.length === 0) {
        return Result.ok({
          isEnabled: false,
          hasBackupCodes: false,
        });
      }

      const row = result.getValue().rows[0];
      return Result.ok({
        isEnabled: row.is_enabled,
        method: row.method,
        verifiedAt: row.verified_at?.toISOString(),
        hasBackupCodes: !!row.backup_codes_encrypted,
      });
    } catch (error) {
      return Result.fail(`Failed to get 2FA status: ${error}`);
    }
  }

  /**
   * Initialize 2FA setup (generate secret and QR code)
   */
  async enable2FA(
    userId: string,
    email: string,
    method: TwoFactorMethod = 'totp'
  ): Promise<Result<Enable2FAResponse>> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret();
      const backupCodes = this.generateBackupCodes();

      // Encrypt sensitive data
      const encryptedSecret = this.encrypt(secret);
      const encryptedBackupCodes = this.encrypt(JSON.stringify(backupCodes));

      // Create setup token (for verification step)
      const setupToken = crypto.randomBytes(32).toString('hex');

      // Store in database (not yet enabled)
      const sql = `
        INSERT INTO user_2fa (id, user_id, method, secret_encrypted, backup_codes_encrypted, is_enabled, setup_token, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, false, $6, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          method = EXCLUDED.method,
          secret_encrypted = EXCLUDED.secret_encrypted,
          backup_codes_encrypted = EXCLUDED.backup_codes_encrypted,
          is_enabled = false,
          setup_token = EXCLUDED.setup_token,
          verified_at = NULL,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await this.pool.query(sql, [
        uuidv4(),
        userId,
        method,
        encryptedSecret,
        encryptedBackupCodes,
        setupToken,
      ]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      // Generate QR code URL
      const otpauth = authenticator.keyuri(email, 'Ventazo CRM', secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauth);

      return Result.ok({
        secret,
        qrCodeUrl,
        backupCodes,
        setupToken,
      });
    } catch (error) {
      return Result.fail(`Failed to enable 2FA: ${error}`);
    }
  }

  /**
   * Verify 2FA code and activate
   */
  async verify2FA(
    userId: string,
    code: string,
    setupToken?: string
  ): Promise<Result<Verify2FAResponse>> {
    try {
      // Get 2FA setup
      const sql = `
        SELECT * FROM user_2fa WHERE user_id = $1
      `;

      const result = await this.pool.query(sql, [userId]);

      if (result.isFailure || result.getValue().rows.length === 0) {
        return Result.fail('2FA not set up for this user');
      }

      const row = result.getValue().rows[0];

      // If setup token provided, verify it matches
      if (setupToken && row.setup_token !== setupToken) {
        return Result.fail('Invalid setup token');
      }

      // Decrypt secret
      const secret = this.decrypt(row.secret_encrypted);

      // Verify code
      const isValid = authenticator.verify({ token: code, secret });

      if (!isValid) {
        // Check backup codes
        const backupCodes = JSON.parse(this.decrypt(row.backup_codes_encrypted)) as string[];
        const codeIndex = backupCodes.indexOf(code);

        if (codeIndex === -1) {
          return Result.ok({ success: false });
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await this.updateBackupCodes(userId, backupCodes);
      }

      // Activate 2FA if not already enabled
      if (!row.is_enabled) {
        const updateSql = `
          UPDATE user_2fa
          SET is_enabled = true, verified_at = NOW(), setup_token = NULL, updated_at = NOW()
          WHERE user_id = $1
        `;

        await this.pool.query(updateSql, [userId]);

        // Log security event
        await this.logSecurityEvent(userId, row.tenant_id || '', '2fa_enabled', true);

        // Return backup codes on first activation
        const backupCodes = JSON.parse(this.decrypt(row.backup_codes_encrypted)) as string[];
        return Result.ok({
          success: true,
          backupCodes,
        });
      }

      return Result.ok({ success: true });
    } catch (error) {
      return Result.fail(`Failed to verify 2FA: ${error}`);
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(
    userId: string,
    tenantId: string,
    code: string
  ): Promise<Result<void>> {
    try {
      // Verify code first
      const verifyResult = await this.verify2FA(userId, code);
      if (verifyResult.isFailure || !verifyResult.getValue().success) {
        return Result.fail('Invalid verification code');
      }

      // Delete 2FA record
      const sql = `
        DELETE FROM user_2fa WHERE user_id = $1
      `;

      const result = await this.pool.query(sql, [userId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      // Log security event
      await this.logSecurityEvent(userId, tenantId, '2fa_disabled', true);

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to disable 2FA: ${error}`);
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<Result<string[]>> {
    try {
      // Verify 2FA code first
      const verifyResult = await this.verify2FA(userId, code);
      if (verifyResult.isFailure || !verifyResult.getValue().success) {
        return Result.fail('Invalid verification code');
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes();

      await this.updateBackupCodes(userId, newBackupCodes);

      return Result.ok(newBackupCodes);
    } catch (error) {
      return Result.fail(`Failed to regenerate backup codes: ${error}`);
    }
  }

  // ============================================
  // Security Stats & Events
  // ============================================

  /**
   * Get security statistics for a user
   */
  async getSecurityStats(userId: string, tenantId: string): Promise<Result<SecurityStats>> {
    try {
      // Get 2FA status
      const twoFactorResult = await this.get2FAStatus(userId);
      const twoFactorEnabled = twoFactorResult.isSuccess && twoFactorResult.getValue().isEnabled;

      // Get active sessions count
      const sessionsResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM user_sessions
         WHERE user_id = $1 AND tenant_id = $2 AND is_active = true AND expires_at > NOW()`,
        [userId, tenantId]
      );
      const activeSessions = parseInt(sessionsResult.getValue()?.rows[0]?.count || '0', 10);

      // Get last login
      const lastLoginResult = await this.pool.query(
        `SELECT ip_address, location, created_at FROM user_sessions
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, tenantId]
      );
      const lastLogin = lastLoginResult.getValue()?.rows[0];

      // Get recent security events
      const eventsResult = await this.pool.query(
        `SELECT * FROM security_events
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC LIMIT 10`,
        [userId, tenantId]
      );
      const recentEvents: SecurityEvent[] = (eventsResult.getValue()?.rows || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        type: row.event_type as SecurityEvent['type'],
        description: row.description as string,
        ipAddress: row.ip_address as string | undefined,
        location: row.location as string | undefined,
        timestamp: (row.created_at as Date).toISOString(),
        success: row.success as boolean,
      }));

      // Determine account status
      let accountStatus: 'secure' | 'at_risk' | 'compromised' = 'secure';
      if (!twoFactorEnabled) {
        accountStatus = 'at_risk';
      }
      const hasFailedLogins = recentEvents.some(
        (e) => e.type === 'login_failed' && !e.success
      );
      if (hasFailedLogins) {
        accountStatus = 'at_risk';
      }

      return Result.ok({
        accountStatus,
        twoFactorEnabled,
        activeSessions,
        lastLoginAt: lastLogin?.created_at?.toISOString(),
        lastLoginIp: lastLogin?.ip_address,
        lastLoginLocation: lastLogin?.location,
        recentSecurityEvents: recentEvents,
      });
    } catch (error) {
      return Result.fail(`Failed to get security stats: ${error}`);
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    userId: string,
    tenantId: string,
    eventType: SecurityEvent['type'],
    success: boolean,
    metadata?: Record<string, unknown>,
    ipAddress?: string
  ): Promise<Result<void>> {
    try {
      const description = this.getEventDescription(eventType, success);
      const location = ipAddress ? await this.getLocationFromIp(ipAddress) : undefined;

      const sql = `
        INSERT INTO security_events (
          id, user_id, tenant_id, event_type, description, ip_address, location,
          success, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `;

      await this.pool.query(sql, [
        uuidv4(),
        userId,
        tenantId,
        eventType,
        description,
        ipAddress,
        location,
        success,
        metadata ? JSON.stringify(metadata) : null,
      ]);

      return Result.ok();
    } catch (error) {
      // Don't fail the main operation if event logging fails
      console.error('Failed to log security event:', error);
      return Result.ok();
    }
  }

  // ============================================
  // Password Policy
  // ============================================

  /**
   * Get password policy for tenant
   */
  async getPasswordPolicy(tenantId: string): Promise<Result<PasswordPolicy>> {
    try {
      const sql = `
        SELECT metadata->>'passwordPolicy' as policy FROM tenants WHERE id = $1
      `;

      const result = await this.pool.query(sql, [tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const policyJson = result.getValue().rows[0]?.policy;
      if (!policyJson) {
        return Result.ok(DEFAULT_PASSWORD_POLICY);
      }

      return Result.ok({ ...DEFAULT_PASSWORD_POLICY, ...JSON.parse(policyJson) });
    } catch (error) {
      return Result.fail(`Failed to get password policy: ${error}`);
    }
  }

  /**
   * Update password policy for tenant
   */
  async updatePasswordPolicy(
    tenantId: string,
    policy: Partial<PasswordPolicy>
  ): Promise<Result<PasswordPolicy>> {
    try {
      const currentResult = await this.getPasswordPolicy(tenantId);
      if (currentResult.isFailure) {
        return Result.fail(currentResult.getError());
      }

      const newPolicy = { ...currentResult.getValue(), ...policy };

      const sql = `
        UPDATE tenants
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{passwordPolicy}',
          $2::jsonb
        ),
        updated_at = NOW()
        WHERE id = $1
        RETURNING metadata->>'passwordPolicy' as policy
      `;

      const result = await this.pool.query(sql, [tenantId, JSON.stringify(newPolicy)]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      return Result.ok(newPolicy);
    } catch (error) {
      return Result.fail(`Failed to update password policy: ${error}`);
    }
  }

  // ============================================
  // Session Settings
  // ============================================

  /**
   * Get session settings for tenant
   */
  async getSessionSettings(tenantId: string): Promise<Result<SessionSettings>> {
    try {
      const sql = `
        SELECT metadata->>'sessionSettings' as settings FROM tenants WHERE id = $1
      `;

      const result = await this.pool.query(sql, [tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const settingsJson = result.getValue().rows[0]?.settings;
      if (!settingsJson) {
        return Result.ok(DEFAULT_SESSION_SETTINGS);
      }

      return Result.ok({ ...DEFAULT_SESSION_SETTINGS, ...JSON.parse(settingsJson) });
    } catch (error) {
      return Result.fail(`Failed to get session settings: ${error}`);
    }
  }

  /**
   * Update session settings for tenant
   */
  async updateSessionSettings(
    tenantId: string,
    settings: Partial<SessionSettings>
  ): Promise<Result<SessionSettings>> {
    try {
      const currentResult = await this.getSessionSettings(tenantId);
      if (currentResult.isFailure) {
        return Result.fail(currentResult.getError());
      }

      const newSettings = { ...currentResult.getValue(), ...settings };

      const sql = `
        UPDATE tenants
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{sessionSettings}',
          $2::jsonb
        ),
        updated_at = NOW()
        WHERE id = $1
        RETURNING metadata->>'sessionSettings' as settings
      `;

      const result = await this.pool.query(sql, [tenantId, JSON.stringify(newSettings)]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      return Result.ok(newSettings);
    } catch (error) {
      return Result.fail(`Failed to update session settings: ${error}`);
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private mapRowToSession(row: Record<string, unknown>): UserSession {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      deviceInfo: typeof row.device_info === 'string'
        ? JSON.parse(row.device_info)
        : row.device_info as DeviceInfo,
      ipAddress: row.ip_address as string,
      location: row.location as string | undefined,
      userAgent: row.user_agent as string | undefined,
      createdAt: row.created_at as Date,
      lastActiveAt: row.last_active_at as Date,
      expiresAt: row.expires_at as Date,
      isActive: row.is_active as boolean,
      revokedAt: row.revoked_at as Date | undefined,
      revokedBy: row.revoked_by as string | undefined,
    };
  }

  private mapSessionToResponse(session: UserSession, isCurrent: boolean): UserSessionResponse {
    const deviceInfo = session.deviceInfo;
    const device = deviceInfo.browser
      ? `${deviceInfo.browser} en ${deviceInfo.os || 'Desconocido'}`
      : session.userAgent?.substring(0, 50) || 'Dispositivo desconocido';

    return {
      id: session.id,
      device,
      location: session.location || 'Ubicacion desconocida',
      ipAddress: session.ipAddress,
      lastActive: this.formatRelativeTime(session.lastActiveAt),
      createdAt: session.createdAt.toISOString(),
      isCurrent,
    };
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return date.toLocaleDateString('es-MX');
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private async updateBackupCodes(userId: string, codes: string[]): Promise<void> {
    const encryptedCodes = this.encrypt(JSON.stringify(codes));
    const sql = `
      UPDATE user_2fa SET backup_codes_encrypted = $2, updated_at = NOW()
      WHERE user_id = $1
    `;
    await this.pool.query(sql, [userId, encryptedCodes]);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex!, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async getLocationFromIp(_ipAddress: string): Promise<string> {
    // In production, use a geolocation service like MaxMind GeoIP
    // For now, return a placeholder
    return 'Ciudad de Mexico, MX';
  }

  private getEventDescription(eventType: SecurityEvent['type'], success: boolean): string {
    const descriptions: Record<SecurityEvent['type'], { success: string; failure: string }> = {
      login_success: { success: 'Inicio de sesion exitoso', failure: '' },
      login_failed: { success: '', failure: 'Intento de inicio de sesion fallido' },
      logout: { success: 'Cierre de sesion', failure: '' },
      password_changed: { success: 'Contrasena actualizada', failure: 'Error al cambiar contrasena' },
      '2fa_enabled': { success: 'Autenticacion de dos factores activada', failure: '' },
      '2fa_disabled': { success: 'Autenticacion de dos factores desactivada', failure: '' },
      session_revoked: { success: 'Sesion cerrada remotamente', failure: '' },
      suspicious_activity: { success: '', failure: 'Actividad sospechosa detectada' },
    };

    return success
      ? descriptions[eventType]?.success || 'Evento de seguridad'
      : descriptions[eventType]?.failure || 'Evento de seguridad';
  }
}
