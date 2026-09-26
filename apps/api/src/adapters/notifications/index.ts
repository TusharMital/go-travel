import { NotificationProvider } from '@travel/shared';
import {
  ConsoleNotificationsAdapter,
  consoleNotificationsAdapter,
} from './console-notifications.adapter.js';

export function getNotificationProvider(): NotificationProvider {
  // Swappable with SendGrid / Twilio / FCM / Push adapter
  return consoleNotificationsAdapter;
}

export const getNotificationsAdapter = getNotificationProvider;

export { ConsoleNotificationsAdapter, consoleNotificationsAdapter };
