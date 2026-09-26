import { INotificationsProvider } from '@travel/shared';
import { ConsoleNotificationsAdapter } from './console-notifications.adapter.js';

export function getNotificationsAdapter(): INotificationsProvider {
  // Swappable with SendGrid / Twilio / FCM adapter
  return new ConsoleNotificationsAdapter();
}
