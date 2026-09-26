import {
  NotificationProvider,
  NotificationPayload,
  NotificationResult,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

export class ConsoleNotificationsAdapter implements NotificationProvider {
  name = 'console-notifications-adapter';

  private sent: NotificationPayload[] = [];
  private simulateFailure = false;

  setSimulateFailure(enabled: boolean): void {
    this.simulateFailure = enabled;
  }

  getSentNotifications(): NotificationPayload[] {
    return [...this.sent];
  }

  getLastNotification(): NotificationPayload | undefined {
    return this.sent[this.sent.length - 1];
  }

  clear(): void {
    this.sent = [];
    this.simulateFailure = false;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const messageId = `msg_${Date.now()}_${uuidv4().slice(0, 8)}`;
    this.sent.push(payload);

    if (this.simulateFailure) {
      console.warn(`\n⚠️ [NOTIFICATION FAILED - SIMULATION] Channel: ${payload.channel}, Template: ${payload.template}`);
      return {
        notificationId: uuidv4(),
        channel: payload.channel,
        status: 'FAILED',
        dispatchedAt: new Date(),
        providerMessageId: messageId,
      };
    }

    // Structured console logging for dev / debug
    console.log(`\n🔔 [NOTIFICATION DISPATCHED]`);
    console.log(`Channel:  ${payload.channel.toUpperCase()}`);
    console.log(`To User:  ${payload.toUserId}`);
    if (payload.recipientEmail) console.log(`Email:    ${payload.recipientEmail}`);
    if (payload.recipientPhone) console.log(`Phone:    ${payload.recipientPhone}`);
    console.log(`Template: ${payload.template}`);
    if (payload.subject) console.log(`Subject:  ${payload.subject}`);
    if (payload.content) console.log(`Content:\n${payload.content}`);
    console.log(`Payload:  ${JSON.stringify(payload.data, null, 2)}`);
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

export const consoleNotificationsAdapter = new ConsoleNotificationsAdapter();
