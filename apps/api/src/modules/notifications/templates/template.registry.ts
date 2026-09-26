import { AppError } from '../../../middlewares/error.middleware.js';

export interface NotificationTemplateDefinition {
  id: string;
  name: string;
  description: string;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  subjectTemplate: string;
  bodyTemplate: string;
  smsTemplate?: string;
  pushTemplate?: string;
  requiredVariables: string[];
}

export interface RenderedTemplate {
  subject: string;
  content: string;
}

/**
 * Data-Driven Stored Notification Templates Registry
 * Centralizes all message definitions with dynamic parameter interpolation.
 * Prevents hardcoded notification copy from being scattered across business logic.
 */
class TemplateRegistry {
  private templates: Map<string, NotificationTemplateDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // 1. Booking Confirmed Template
    this.register({
      id: 'BOOKING_CONFIRMED',
      name: 'Booking Confirmed',
      description: 'Triggered when a storage or transport booking is confirmed',
      channels: ['email', 'sms', 'push', 'in_app'],
      subjectTemplate: 'Booking Confirmed: {{title}}',
      bodyTemplate:
        'Hello {{userName}},\n\n' +
        'Your {{bookingType}} reservation has been confirmed!\n\n' +
        '• Service / Location: {{title}}\n' +
        '• Scheduled Time: {{scheduledTime}}\n' +
        '• Address / Meeting Point: {{address}}\n' +
        '• Reference ID: {{bookingId}}\n\n' +
        'Thank you for traveling with us. You can view your pass anytime in the app.',
      smsTemplate: 'Confirmed: {{title}} at {{scheduledTime}}. Booking Ref: {{bookingId}}.',
      pushTemplate: 'Your {{bookingType}} booking at {{title}} is confirmed!',
      requiredVariables: ['userName', 'title', 'scheduledTime', 'bookingId'],
    });

    // 2. Booking Cancelled Template
    this.register({
      id: 'BOOKING_CANCELLED',
      name: 'Booking Cancelled',
      description: 'Triggered when a storage or transport booking is cancelled',
      channels: ['email', 'sms', 'in_app'],
      subjectTemplate: 'Booking Cancelled: {{title}}',
      bodyTemplate:
        'Hello {{userName}},\n\n' +
        'Your reservation for {{title}} (Ref: {{bookingId}}) has been cancelled.\n' +
        'Cancellation Reason: {{cancellationReason}}\n\n' +
        'Any captured amount has been automatically refunded to your original payment method.\n' +
        'If you need assistance, please reply to this message.',
      smsTemplate: 'Booking cancelled for {{title}} (Ref: {{bookingId}}). Any payment has been refunded.',
      pushTemplate: 'Your booking for {{title}} was cancelled. Refund processed.',
      requiredVariables: ['userName', 'title', 'bookingId'],
    });

    // 3. 1-Hour-Before Pickup Reminder Template
    this.register({
      id: 'PICKUP_REMINDER_1H',
      name: '1-Hour Pickup Reminder',
      description: 'Scheduled alert sent 1 hour prior to luggage pickup or transport transfer',
      channels: ['email', 'sms', 'push', 'in_app'],
      subjectTemplate: 'Reminder: Pickup in 1 Hour for {{title}}',
      bodyTemplate:
        'Hello {{userName}},\n\n' +
        'This is a friendly reminder that your {{bookingType}} scheduled pickup is in approximately 1 hour (at {{scheduledTime}}).\n\n' +
        '• Location: {{address}}\n' +
        '• Service: {{title}}\n' +
        '• Pass / Booking ID: {{bookingId}}\n\n' +
        'Please arrive promptly with your digital QR booking pass ready on your device.',
      smsTemplate: 'Reminder: Your pickup for {{title}} is in 1 hour (at {{scheduledTime}}). Have pass {{bookingId}} ready.',
      pushTemplate: 'Pickup reminder: Your luggage pickup at {{title}} is in 1 hour!',
      requiredVariables: ['userName', 'title', 'scheduledTime', 'address', 'bookingId'],
    });

    // 4. Partner Status Changed Template
    this.register({
      id: 'PARTNER_STATUS_CHANGED',
      name: 'Partner Status Changed',
      description: 'Triggered when partner account verification or active status transitions',
      channels: ['email', 'in_app'],
      subjectTemplate: 'Partner Account Status Updated: {{newStatus}}',
      bodyTemplate:
        'Dear {{partnerName}},\n\n' +
        'The verification status of your partner account for "{{businessName}}" has been updated.\n\n' +
        '• Partner Type: {{partnerType}}\n' +
        '• Previous Status: {{oldStatus}}\n' +
        '• New Status: {{newStatus}}\n' +
        '• Notes: {{notes}}\n\n' +
        'You can check your partner dashboard for active locations and fleet management.',
      smsTemplate: 'Partner account for {{businessName}} status changed to: {{newStatus}}.',
      pushTemplate: 'Your partner account status has been updated to {{newStatus}}.',
      requiredVariables: ['partnerName', 'businessName', 'newStatus'],
    });
  }

  register(template: NotificationTemplateDefinition): void {
    this.templates.set(template.id, template);
  }

  get(templateId: string): NotificationTemplateDefinition | undefined {
    return this.templates.get(templateId);
  }

  list(): NotificationTemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  /**
   * Render template with variable interpolation
   */
  render(
    templateId: string,
    channel: string,
    variables: Record<string, unknown>
  ): RenderedTemplate {
    const template = this.get(templateId);
    if (!template) {
      throw new AppError(
        `Notification template '${templateId}' not found in registry.`,
        404,
        'TEMPLATE_NOT_FOUND'
      );
    }

    // Check required variables
    for (const reqVar of template.requiredVariables) {
      if (variables[reqVar] === undefined || variables[reqVar] === null) {
        // Fallback default value instead of crashing if possible
        variables[reqVar] = 'N/A';
      }
    }

    // Select raw text based on channel
    let rawBody = template.bodyTemplate;
    if (channel === 'sms' && template.smsTemplate) {
      rawBody = template.smsTemplate;
    } else if (channel === 'push' && template.pushTemplate) {
      rawBody = template.pushTemplate;
    }

    const subject = this.interpolate(template.subjectTemplate, variables);
    const content = this.interpolate(rawBody, variables);

    return { subject, content };
  }

  private interpolate(raw: string, variables: Record<string, unknown>): string {
    return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const val = variables[key];
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
  }
}

export const templateRegistry = new TemplateRegistry();
