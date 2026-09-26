import {
  INotificationsProvider,
  NotificationPayload,
  NotificationResult,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

export class ConsoleNotificationsAdapter implements INotificationsProvider {
  name = 'console-notifications-adapter';

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const messageId = `msg_${Date.now()}_${uuidv4().slice(0, 8)}`;
    // Structured console logging for dev
    console.log(`\n🔔 [NOTIFICATION DISPATCHED]`);
    console.log(`Channel: ${payload.channel}`);
    console.log(`To User: ${payload.toUserId}`);
    if (payload.recipientEmail) console.log(`Email: ${payload.recipientEmail}`);
    if (payload.recipientPhone) console.log(`Phone: ${payload.recipientPhone}`);
    console.log(`Template: ${payload.template}`);
    console.log(`Payload:`, JSON.stringify(payload.data, null, 2));
    console.log(`------------------------------------\n`);

    return {
      notificationId: uuidv4(),
      channel: payload.channel,
      status: 'SENT',
      dispatchedAt: new Date(),
      providerMessageId: messageId,
    };
  }
}
