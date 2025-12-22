/**
 * OneSignal Push Notification Provider
 * Alternative push notification provider using OneSignal
 */

import {
  INotificationProvider,
  NotificationChannel,
  Notification,
  NotificationPriority,
} from '../types';

export interface OneSignalConfig {
  appId: string;
  apiKey: string;
  apiUrl?: string;
}

interface OneSignalNotification {
  app_id: string;
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  include_aliases?: {
    external_id?: string[];
  };
  target_channel?: string;
  contents: Record<string, string>;
  headings?: Record<string, string>;
  data?: Record<string, unknown>;
  url?: string;
  web_url?: string;
  app_url?: string;
  ios_badge_type?: string;
  ios_badge_count?: number;
  ios_sound?: string;
  android_sound?: string;
  android_channel_id?: string;
  priority?: number;
  ttl?: number;
  big_picture?: string;
  ios_attachments?: Record<string, string>;
  chrome_web_image?: string;
  buttons?: Array<{
    id: string;
    text: string;
    url?: string;
  }>;
  filters?: Array<{
    field: string;
    key?: string;
    value: string;
    relation?: string;
  }>;
  included_segments?: string[];
  excluded_segments?: string[];
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  external_id?: string;
  errors?: Record<string, unknown>;
}

/**
 * OneSignal Push Notification Provider
 */
export class OneSignalProvider implements INotificationProvider {
  readonly channel = NotificationChannel.PUSH;
  private config: OneSignalConfig | undefined;
  private apiUrl: string;

  constructor(config?: OneSignalConfig) {
    this.config = config || this.getConfigFromEnv();
    this.apiUrl = this.config?.apiUrl || 'https://onesignal.com/api/v1';
  }

  /**
   * Get config from environment variables
   */
  private getConfigFromEnv(): OneSignalConfig | undefined {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;

    if (!appId || !apiKey) {
      return undefined;
    }

    return {
      appId,
      apiKey,
      apiUrl: process.env.ONESIGNAL_API_URL,
    };
  }

  /**
   * Check if OneSignal is available
   */
  isAvailable(): boolean {
    return !!this.config;
  }

  /**
   * Send push notification via OneSignal
   */
  async send(notification: Notification): Promise<boolean> {
    if (!this.config) {
      console.warn('OneSignal not configured');
      return false;
    }

    const externalUserId = notification.recipient.userId;
    if (!externalUserId) {
      console.warn('No user ID available for recipient');
      return false;
    }

    try {
      const oneSignalNotification = this.buildNotification(notification, externalUserId);
      await this.sendNotification(oneSignalNotification);
      return true;
    } catch (error) {
      console.error('OneSignal push notification failed:', error);
      return false;
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBatch(notifications: Notification[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Group notifications by content to batch them
    for (const notification of notifications) {
      const success = await this.send(notification);
      results.set(notification.id, success);
    }

    return results;
  }

  /**
   * Send notification to segment
   */
  async sendToSegment(
    segment: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const notification: OneSignalNotification = {
        app_id: this.config.appId,
        included_segments: [segment],
        headings: { en: title },
        contents: { en: body },
        data,
      };

      await this.sendNotification(notification);
      return true;
    } catch (error) {
      console.error('OneSignal segment notification failed:', error);
      return false;
    }
  }

  /**
   * Send notification with filters
   */
  async sendWithFilters(
    filters: Array<{ field: string; value: string; relation?: string }>,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const notification: OneSignalNotification = {
        app_id: this.config.appId,
        filters,
        headings: { en: title },
        contents: { en: body },
        data,
      };

      await this.sendNotification(notification);
      return true;
    } catch (error) {
      console.error('OneSignal filtered notification failed:', error);
      return false;
    }
  }

  /**
   * Create or update user device
   */
  async createOrUpdateDevice(
    playerId: string,
    externalUserId: string,
    tags?: Record<string, string>
  ): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          external_user_id: externalUserId,
          tags,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update device:', error);
      return false;
    }
  }

  /**
   * Add tags to user
   */
  async addTags(
    externalUserId: string,
    tags: Record<string, string>
  ): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/apps/${this.config.appId}/users/by/external_id/${externalUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            properties: {
              tags,
            },
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to add tags:', error);
      return false;
    }
  }

  /**
   * Build OneSignal notification from internal notification
   */
  private buildNotification(
    notification: Notification,
    externalUserId: string
  ): OneSignalNotification {
    const oneSignalNotification: OneSignalNotification = {
      app_id: this.config!.appId,
      include_aliases: {
        external_id: [externalUserId],
      },
      target_channel: 'push',
      headings: { en: notification.content.title },
      contents: { en: notification.content.body },
    };

    // Add custom data
    if (notification.content.data) {
      oneSignalNotification.data = notification.content.data;
    }

    // Add action URL
    if (notification.content.actionUrl) {
      oneSignalNotification.url = notification.content.actionUrl;
      oneSignalNotification.web_url = notification.content.actionUrl;
      oneSignalNotification.app_url = notification.content.actionUrl;
    }

    // Add image
    if (notification.content.imageUrl) {
      oneSignalNotification.big_picture = notification.content.imageUrl;
      oneSignalNotification.ios_attachments = {
        id: notification.content.imageUrl,
      };
      oneSignalNotification.chrome_web_image = notification.content.imageUrl;
    }

    // Set priority
    oneSignalNotification.priority = this.mapPriority(notification.priority);

    // iOS badge
    oneSignalNotification.ios_badge_type = 'Increase';
    oneSignalNotification.ios_badge_count = 1;

    // Sound
    oneSignalNotification.ios_sound = 'default';
    oneSignalNotification.android_sound = 'default';

    return oneSignalNotification;
  }

  /**
   * Map internal priority to OneSignal priority
   */
  private mapPriority(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 10;
      case NotificationPriority.HIGH:
        return 8;
      case NotificationPriority.MEDIUM:
        return 5;
      case NotificationPriority.LOW:
        return 3;
      default:
        return 5;
    }
  }

  /**
   * Send notification to OneSignal API
   */
  private async sendNotification(
    notification: OneSignalNotification
  ): Promise<OneSignalResponse> {
    if (!this.config) {
      throw new Error('OneSignal not configured');
    }

    const response = await fetch(`${this.apiUrl}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.config.apiKey}`,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneSignal API error: ${response.status} - ${error}`);
    }

    const result = await response.json() as OneSignalResponse;

    if (result.errors && Object.keys(result.errors).length > 0) {
      console.warn('OneSignal notification warnings:', result.errors);
    }

    return result;
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<OneSignalResponse | null> {
    if (!this.config) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/notifications/${notificationId}?app_id=${this.config.appId}`,
        {
          headers: {
            Authorization: `Basic ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return response.json() as Promise<OneSignalResponse>;
    } catch (error) {
      console.error('Failed to get notification:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/notifications/${notificationId}?app_id=${this.config.appId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Basic ${this.config.apiKey}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }
}
