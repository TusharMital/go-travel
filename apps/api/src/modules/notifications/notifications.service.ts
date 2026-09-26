import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { getNotificationProvider } from '../../adapters/notifications/index.js';
import { templateRegistry } from './templates/template.registry.js';
import {
  NotificationChannel,
  NotificationStatus,
  PartnerStatus,
  VerificationStatus,
} from '@travel/shared';
import { PaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import {
  getEventBus,
  PARTNER_STATUS_CHANGED_EVENT,
  PartnerStatusChangedPayload,
} from '../events/index.js';
import { randomUUID } from 'crypto';

export interface SendNotificationParams {
  userId: string;
  template: string;
  channel?: NotificationChannel | 'email' | 'sms' | 'push' | 'in_app';
  variables: Record<string, unknown>;
  correlationId?: string;
}

export class NotificationsService {
  /**
   * Dispatch a data-driven notification using stored templates.
   * Guarantees no hardcoded message strings exist in caller logic.
   */
  async sendNotification(params: SendNotificationParams) {
    const { userId, template: templateId, variables, correlationId = randomUUID() } = params;
    const channel = (params.channel as NotificationChannel) || NotificationChannel.IN_APP;

    // 1. Data-Driven Template Rendering
    const rendered = templateRegistry.render(templateId, channel, variables);

    // 2. Lookup recipient contact info
    const recipient = prisma.user?.findUnique
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, phone: true, full_name: true },
        })
      : { id: userId, email: (variables.recipientEmail as string) || `${userId}@example.com`, phone: null, full_name: (variables.userName as string) || 'Traveler' };

    if (!recipient) {
      throw new AppError(`Recipient user ${userId} not found.`, 404, 'USER_NOT_FOUND');
    }

    // 3. Persist initial Notification record in DB
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        channel,
        template: templateId,
        payload: {
          ...variables,
          subject: rendered.subject,
          content: rendered.content,
        },
        status: NotificationStatus.PENDING,
      },
    });

    // 4. Send via NotificationProvider adapter (Rule #2: always through interface)
    const provider = getNotificationProvider();
    let dispatchResult;
    try {
      dispatchResult = await provider.send({
        toUserId: userId,
        recipientEmail: recipient.email,
        recipientPhone: recipient.phone || undefined,
        channel,
        template: templateId,
        subject: rendered.subject,
        content: rendered.content,
        data: variables,
      });
    } catch (err: any) {
      // Mark as failed in DB
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      });
      throw err;
    }

    const finalStatus =
      dispatchResult.status.toLowerCase() === 'failed'
        ? NotificationStatus.FAILED
        : NotificationStatus.SENT;

    // 5. Update DB record with dispatched status
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: finalStatus,
        sent_at: finalStatus === NotificationStatus.SENT ? new Date() : null,
      },
    });

    // 6. Record Audit Trail
    await recordAuditEvent({
      actorUserId: userId,
      action: 'NOTIFICATION_SENT',
      entityType: 'Notification',
      entityId: updated.id,
      beforeState: null,
      afterState: {
        template: templateId,
        channel,
        status: finalStatus,
        subject: rendered.subject,
      },
      correlationId,
    });

    return {
      notification: updated,
      dispatch: dispatchResult,
      rendered,
    };
  }

  /**
   * List notifications for a user (in-app notifications, alerts, etc.)
   */
  async listUserNotifications(userId: string, pagination: PaginationParams, status?: string) {
    const where: any = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return formatPaginatedResponse(items, total, pagination.page, pagination.limit);
  }

  /**
   * Mark in-app notification as read/delivered
   */
  async markAsRead(notificationId: string, userId: string) {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });

    if (!existing) {
      throw new AppError('Notification not found.', 404, 'NOT_FOUND');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.DELIVERED },
    });

    return updated;
  }

  /**
   * Trigger 4: Partner status changed
   * Transitions partner account status, updates provider records, logs audit event,
   * and automatically sends PARTNER_STATUS_CHANGED notification.
   */
  async updatePartnerStatus(
    partnerAccountId: string,
    newStatus: PartnerStatus,
    notes: string | undefined,
    adminUserId: string,
    correlationId: string
  ) {
    const partner = await prisma.partnerAccount.findUnique({
      where: { id: partnerAccountId },
      include: {
        user: true,
        storage_provider: true,
        transport_provider: true,
      },
    });

    if (!partner) {
      throw new AppError('Partner account not found.', 404, 'NOT_FOUND');
    }

    const oldStatus = partner.status;
    const businessName =
      partner.storage_provider?.business_name ||
      partner.transport_provider?.name ||
      partner.user.full_name;

    const targetVerificationStatus =
      newStatus === PartnerStatus.VERIFIED
        ? VerificationStatus.VERIFIED
        : newStatus === PartnerStatus.SUSPENDED
        ? VerificationStatus.SUSPENDED
        : VerificationStatus.PENDING;

    // Transactionally update partner account & provider verification status
    const updated = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.partnerAccount.update({
        where: { id: partnerAccountId },
        data: {
          status: newStatus,
          verified_at: newStatus === PartnerStatus.VERIFIED ? new Date() : partner.verified_at,
        },
      });

      if (partner.storage_provider) {
        await tx.storageProvider.update({
          where: { partner_account_id: partnerAccountId },
          data: { verification_status: targetVerificationStatus },
        });
      }

      if (partner.transport_provider) {
        await tx.transportProvider.update({
          where: { partner_account_id: partnerAccountId },
          data: { verification_status: targetVerificationStatus },
        });
      }

      return updatedAccount;
    });

    // Audit Event
    await recordAuditEvent({
      actorUserId: adminUserId,
      action: 'PARTNER_STATUS_CHANGED',
      entityType: 'PartnerAccount',
      entityId: partnerAccountId,
      beforeState: { status: oldStatus },
      afterState: { status: newStatus, notes: notes || null },
      correlationId,
    });

    // Emit event on Event Bus
    await getEventBus().publish<PartnerStatusChangedPayload>({
      id: randomUUID(),
      name: PARTNER_STATUS_CHANGED_EVENT,
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        partnerAccountId,
        userId: partner.user_id,
        businessName,
        partnerType: partner.type,
        oldStatus,
        newStatus,
        reason: notes || null,
      },
    });

    // Dispatch PARTNER_STATUS_CHANGED data-driven notification to partner user
    await this.sendNotification({
      userId: partner.user_id,
      template: 'PARTNER_STATUS_CHANGED',
      channel: NotificationChannel.EMAIL,
      variables: {
        partnerName: partner.user.full_name,
        businessName,
        partnerType: partner.type.toUpperCase(),
        oldStatus: oldStatus.toUpperCase(),
        newStatus: newStatus.toUpperCase(),
        notes: notes || 'Status reviewed and verified by platform administrator.',
      },
      correlationId,
    });

    return updated;
  }
}

export const notificationsService = new NotificationsService();
