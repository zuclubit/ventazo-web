/**
 * Push Notification Service
 * Unified push notification service supporting multiple providers
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  INotificationProvider,
} from './types';
import { FirebaseProvider } from './providers/firebase.provider';
import { OneSignalProvider } from './providers/onesignal.provider';

/**
 * Push notification provider types
 */
export type PushProvider = 'firebase' | 'onesignal';

/**
 * Device registration
 */
export interface DeviceRegistration {
  id: string;
  userId: string;
  tenantId: string;
  provider: PushProvider;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Register device input
 */
export interface RegisterDeviceInput {
  userId: string;
  tenantId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  provider?: PushProvider;
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
}

/**
 * Push notification result
 */
export interface PushResult {
  notificationId: string;
  success: boolean;
  provider: PushProvider;
  error?: string;
}

/**
 * Push Notification Service
 */
@injectable()
export class PushNotificationService {
  private providers: Map<PushProvider, INotificationProvider> = new Map();
  private defaultProvider: PushProvider = 'firebase';

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize available providers
   */
  private initializeProviders(): void {
    const firebaseProvider = new FirebaseProvider();
    if (firebaseProvider.isAvailable()) {
      this.providers.set('firebase', firebaseProvider);
      this.defaultProvider = 'firebase';
    }

    const oneSignalProvider = new OneSignalProvider();
    if (oneSignalProvider.isAvailable()) {
      this.providers.set('onesignal', oneSignalProvider);
      if (!this.providers.has('firebase')) {
        this.defaultProvider = 'onesignal';
      }
    }
  }

  /**
   * Check if push notifications are available
   */
  isAvailable(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): PushProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice(input: RegisterDeviceInput): Promise<Result<DeviceRegistration>> {
    try {
      const provider = input.provider || this.defaultProvider;

      // Check if device already registered
      const existingResult = await this.pool.query(
        `SELECT id FROM push_devices WHERE user_id = $1 AND token = $2 AND provider = $3`,
        [input.userId, input.token, provider]
      );

      if (existingResult.isSuccess && existingResult.value?.rows?.[0]) {
        // Update existing registration
        const updateResult = await this.pool.query(
          `UPDATE push_devices
           SET is_active = true, last_used_at = NOW(), updated_at = NOW(),
               device_info = $1
           WHERE id = $2
           RETURNING *`,
          [JSON.stringify(input.deviceInfo || {}), existingResult.value.rows[0].id]
        );

        if (updateResult.isFailure || !updateResult.value?.rows?.[0]) {
          return Result.fail('Failed to update device registration');
        }

        return Result.ok(this.mapRowToDevice(updateResult.value.rows[0]));
      }

      // Create new registration
      const id = uuidv4();
      const now = new Date();

      const insertResult = await this.pool.query(
        `INSERT INTO push_devices (
          id, user_id, tenant_id, provider, token, platform,
          device_info, is_active, last_used_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id,
          input.userId,
          input.tenantId,
          provider,
          input.token,
          input.platform,
          JSON.stringify(input.deviceInfo || {}),
          true,
          now,
          now,
          now,
        ]
      );

      if (insertResult.isFailure || !insertResult.value?.rows?.[0]) {
        return Result.fail('Failed to register device');
      }

      return Result.ok(this.mapRowToDevice(insertResult.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(userId: string, token: string): Promise<Result<void>> {
    try {
      await this.pool.query(
        `UPDATE push_devices SET is_active = false, updated_at = NOW()
         WHERE user_id = $1 AND token = $2`,
        [userId, token]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to unregister device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send push notification to user
   */
  async sendToUser(
    userId: string,
    tenantId: string,
    notification: Omit<Notification, 'id' | 'recipient' | 'channel' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<PushResult[]> {
    const results: PushResult[] = [];

    // Get user's devices
    const devicesResult = await this.pool.query(
      `SELECT * FROM push_devices
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId]
    );

    if (devicesResult.isFailure || !devicesResult.value?.rows?.length) {
      return [{
        notificationId: '',
        success: false,
        provider: this.defaultProvider,
        error: 'No active devices found for user',
      }];
    }

    // Send to each device
    for (const row of devicesResult.value.rows) {
      const device = this.mapRowToDevice(row);
      const provider = this.providers.get(device.provider);

      if (!provider) {
        results.push({
          notificationId: '',
          success: false,
          provider: device.provider,
          error: `Provider ${device.provider} not available`,
        });
        continue;
      }

      const fullNotification: Notification = {
        id: uuidv4(),
        ...notification,
        recipient: {
          userId,
          pushToken: device.token,
          channels: [NotificationChannel.PUSH],
        },
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const success = await provider.send(fullNotification);

      results.push({
        notificationId: fullNotification.id,
        success,
        provider: device.provider,
        error: success ? undefined : 'Failed to send notification',
      });

      // Update device last used
      if (success) {
        await this.pool.query(
          `UPDATE push_devices SET last_used_at = NOW() WHERE id = $1`,
          [device.id]
        );
      }
    }

    return results;
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    tenantId: string,
    notification: Omit<Notification, 'id' | 'recipient' | 'channel' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Map<string, PushResult[]>> {
    const results = new Map<string, PushResult[]>();

    for (const userId of userIds) {
      const userResults = await this.sendToUser(userId, tenantId, notification);
      results.set(userId, userResults);
    }

    return results;
  }

  /**
   * Send push notification to all users in a tenant
   */
  async sendToTenant(
    tenantId: string,
    notification: Omit<Notification, 'id' | 'recipient' | 'channel' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Get all users with active devices
    const usersResult = await this.pool.query(
      `SELECT DISTINCT user_id FROM push_devices WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    if (usersResult.isFailure || !usersResult.value?.rows?.length) {
      return { sent: 0, failed: 0 };
    }

    for (const row of usersResult.value.rows) {
      const results = await this.sendToUser(row.user_id, tenantId, notification);
      const hasSuccess = results.some(r => r.success);
      if (hasSuccess) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send push notification to topic (Firebase only)
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    const firebaseProvider = this.providers.get('firebase') as FirebaseProvider | undefined;
    if (!firebaseProvider) {
      return false;
    }

    return firebaseProvider.sendToTopic(topic, title, body, data);
  }

  /**
   * Subscribe user to topic (Firebase only)
   */
  async subscribeToTopic(userId: string, topic: string): Promise<boolean> {
    const firebaseProvider = this.providers.get('firebase') as FirebaseProvider | undefined;
    if (!firebaseProvider) {
      return false;
    }

    // Get user's Firebase devices
    const devicesResult = await this.pool.query(
      `SELECT token FROM push_devices
       WHERE user_id = $1 AND provider = 'firebase' AND is_active = true`,
      [userId]
    );

    if (devicesResult.isFailure || !devicesResult.value?.rows?.length) {
      return false;
    }

    let success = true;
    for (const row of devicesResult.value.rows) {
      const result = await firebaseProvider.subscribeToTopic(row.token, topic);
      if (!result) {
        success = false;
      }
    }

    return success;
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userId: string, tenantId: string): Promise<DeviceRegistration[]> {
    const result = await this.pool.query(
      `SELECT * FROM push_devices WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
       ORDER BY last_used_at DESC`,
      [userId, tenantId]
    );

    if (result.isFailure || !result.value?.rows) {
      return [];
    }

    return result.value.rows.map(row => this.mapRowToDevice(row));
  }

  /**
   * Clean up inactive devices
   */
  async cleanupInactiveDevices(daysInactive: number = 90): Promise<number> {
    const result = await this.pool.query(
      `UPDATE push_devices
       SET is_active = false, updated_at = NOW()
       WHERE is_active = true AND last_used_at < NOW() - INTERVAL '${daysInactive} days'
       RETURNING id`
    );

    if (result.isFailure || !result.value?.rows) {
      return 0;
    }

    return result.value.rows.length;
  }

  /**
   * Map database row to DeviceRegistration
   */
  private mapRowToDevice(row: Record<string, unknown>): DeviceRegistration {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      provider: row.provider as PushProvider,
      token: row.token as string,
      platform: row.platform as 'ios' | 'android' | 'web',
      deviceInfo: typeof row.device_info === 'string'
        ? JSON.parse(row.device_info)
        : row.device_info as DeviceRegistration['deviceInfo'],
      isActive: row.is_active as boolean,
      lastUsedAt: new Date(row.last_used_at as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
