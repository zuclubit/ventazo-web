/**
 * Notifications Module Exports
 */

export {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  type Notification,
  type CreateNotificationInput,
  type NotificationRecipient,
  type NotificationContent,
  type NotificationPreferences,
  type NotificationTemplate,
  type INotificationService,
  type INotificationProvider,
} from './types';

export { NotificationService, createLeadNotification } from './notification.service';
export { PushNotificationService, type PushProvider, type DeviceRegistration, type RegisterDeviceInput, type PushResult } from './push.service';
export { FirebaseProvider, OneSignalProvider } from './providers';
