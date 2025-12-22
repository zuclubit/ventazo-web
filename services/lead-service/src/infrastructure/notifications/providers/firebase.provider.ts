/**
 * Firebase Cloud Messaging Provider
 * Handles push notifications via Firebase Admin SDK
 *
 * Supports multiple authentication methods:
 * 1. Service Account JSON key (via env vars)
 * 2. Application Default Credentials (ADC) - recommended for GCP environments
 * 3. GOOGLE_APPLICATION_CREDENTIALS file path
 */

import * as admin from 'firebase-admin';
import {
  INotificationProvider,
  NotificationChannel,
  Notification,
} from '../types';

export interface FirebaseConfig {
  projectId: string;
  privateKey?: string;
  clientEmail?: string;
  useADC?: boolean; // Use Application Default Credentials
}

/**
 * Firebase Cloud Messaging Provider
 * Uses Firebase Admin SDK for reliable push notifications
 *
 * Authentication priority:
 * 1. Explicit config with privateKey + clientEmail (Service Account)
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var (JSON key file path)
 * 3. Application Default Credentials (ADC) - gcloud auth application-default login
 */
export class FirebaseProvider implements INotificationProvider {
  readonly channel = NotificationChannel.PUSH;
  private config: FirebaseConfig | undefined;
  private app: admin.app.App | null = null;
  private initialized = false;
  private authMethod: 'service-account' | 'adc' | 'credentials-file' | 'none' = 'none';

  constructor(config?: FirebaseConfig) {
    this.config = config || this.getConfigFromEnv();
    this.initializeFirebase();
  }

  /**
   * Get config from environment variables
   */
  private getConfigFromEnv(): FirebaseConfig | undefined {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const useADC = process.env.FIREBASE_USE_ADC === 'true';

    // If no project ID, check if GOOGLE_APPLICATION_CREDENTIALS is set
    if (!projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[FirebaseProvider] No Firebase configuration found');
      return undefined;
    }

    return {
      projectId: projectId || '',
      privateKey,
      clientEmail,
      useADC,
    };
  }

  /**
   * Initialize Firebase Admin SDK with multiple auth strategies
   */
  private initializeFirebase(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.app = admin.apps[0]!;
        this.initialized = true;
        this.authMethod = 'service-account'; // Assume existing app
        console.log('[FirebaseProvider] Using existing Firebase app');
        return;
      }

      // Strategy 1: Explicit Service Account credentials
      if (this.config?.privateKey && this.config?.clientEmail && this.config?.projectId) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: this.config.projectId,
            privateKey: this.config.privateKey,
            clientEmail: this.config.clientEmail,
          }),
        });
        this.authMethod = 'service-account';
        this.initialized = true;
        console.log('[FirebaseProvider] Initialized with Service Account credentials');
        return;
      }

      // Strategy 2: GOOGLE_APPLICATION_CREDENTIALS file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: this.config?.projectId,
        });
        this.authMethod = 'credentials-file';
        this.initialized = true;
        console.log('[FirebaseProvider] Initialized with GOOGLE_APPLICATION_CREDENTIALS file');
        return;
      }

      // Strategy 3: Application Default Credentials (ADC)
      // Works with: gcloud auth application-default login
      if (this.config?.useADC || this.config?.projectId) {
        try {
          this.app = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: this.config?.projectId,
          });
          this.authMethod = 'adc';
          this.initialized = true;
          console.log('[FirebaseProvider] Initialized with Application Default Credentials (ADC)');
          return;
        } catch (adcError) {
          console.warn('[FirebaseProvider] ADC not available:', adcError);
        }
      }

      console.warn('[FirebaseProvider] No valid authentication method found');
      this.initialized = false;
    } catch (error) {
      console.error('[FirebaseProvider] Failed to initialize Firebase:', error);
      this.initialized = false;
    }
  }

  /**
   * Get the authentication method being used
   */
  getAuthMethod(): string {
    return this.authMethod;
  }

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return this.initialized && this.app !== null;
  }

  /**
   * Send push notification via Firebase Admin SDK
   */
  async send(notification: Notification): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[FirebaseProvider] Firebase not available');
      return false;
    }

    const pushToken = notification.recipient.pushToken;
    if (!pushToken) {
      console.warn('[FirebaseProvider] No push token available for recipient');
      return false;
    }

    try {
      const message = this.buildMessage(notification, pushToken);
      const response = await admin.messaging().send(message);
      console.log('[FirebaseProvider] Message sent:', response);
      return true;
    } catch (error) {
      console.error('[FirebaseProvider] Push notification failed:', error);
      return false;
    }
  }

  /**
   * Send multiple notifications efficiently using multicast
   */
  async sendBatch(notifications: Notification[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    if (!this.isAvailable()) {
      notifications.forEach(n => results.set(n.id, false));
      return results;
    }

    // Group by similar content to use multicast where possible
    for (const notification of notifications) {
      const success = await this.send(notification);
      results.set(notification.id, success);
    }

    return results;
  }

  /**
   * Send to multiple tokens at once (multicast)
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (!this.isAvailable() || tokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
          imageUrl,
        },
        data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            requireInteraction: true,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      console.error('[FirebaseProvider] Multicast send failed:', error);
      return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
    }
  }

  /**
   * Send push to topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
        },
        webpush: {
          notification: {
            icon: '/icons/notification-icon.png',
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('[FirebaseProvider] Topic message sent:', response);
      return true;
    } catch (error) {
      console.error('[FirebaseProvider] Topic notification failed:', error);
      return false;
    }
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await admin.messaging().subscribeToTopic([token], topic);
      console.log(`[FirebaseProvider] Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('[FirebaseProvider] Failed to subscribe to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await admin.messaging().unsubscribeFromTopic([token], topic);
      console.log(`[FirebaseProvider] Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('[FirebaseProvider] Failed to unsubscribe from topic:', error);
      return false;
    }
  }

  /**
   * Build Firebase message from notification
   */
  private buildMessage(notification: Notification, token: string): admin.messaging.Message {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: notification.content.title,
        body: notification.content.body,
        imageUrl: notification.content.imageUrl,
      },
      android: {
        priority: notification.priority === 'urgent' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          clickAction: notification.content.actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          requireInteraction: notification.priority === 'urgent',
        },
        fcmOptions: {
          link: notification.content.actionUrl,
        },
      },
    };

    // Add custom data
    if (notification.content.data) {
      message.data = {};
      for (const [key, value] of Object.entries(notification.content.data)) {
        message.data[key] = String(value);
      }
    }

    // Add action URL to data
    if (notification.content.actionUrl) {
      message.data = message.data || {};
      message.data.actionUrl = notification.content.actionUrl;
    }

    return message;
  }
}
