import { Request, Response } from 'express';
import { notificationsService } from './notifications.service.js';
import { pickupReminderScheduler } from './pickup-reminder.scheduler.js';
import { SendNotificationDto, UpdatePartnerStatusDto } from './notifications.dto.js';
import { parsePagination } from '../../utils/pagination.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class NotificationsController {
  /**
   * GET /api/v1/notifications
   * List in-app notifications for authenticated user
   */
  async listMyNotifications(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const pagination = parsePagination(req);
    const status = req.query.status as string | undefined;

    const result = await notificationsService.listUserNotifications(userId, pagination, status);
    res.status(200).json(result);
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const notificationId = req.params.id;

    const updated = await notificationsService.markAsRead(notificationId, userId);
    res.status(200).json(updated);
  }

  /**
   * POST /api/v1/notifications
   * Send notification using data-driven stored template
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    const validated = SendNotificationDto.parse(req.body);
    const targetUserId = validated.user_id || req.user!.id;
    const correlationId = (req as any).correlationId;

    const result = await notificationsService.sendNotification({
      userId: targetUserId,
      template: validated.template,
      channel: validated.channel,
      variables: validated.variables,
      correlationId,
    });

    res.status(201).json(result);
  }

  /**
   * POST /api/v1/notifications/jobs/pickup-reminders
   * Trigger the 1-hour-before pickup reminder scheduled job
   */
  async triggerPickupRemindersJob(req: Request, res: Response): Promise<void> {
    const refDateStr = req.query.reference_time as string | undefined;
    const refDate = refDateStr ? new Date(refDateStr) : new Date();

    const result = await pickupReminderScheduler.runPickupReminderJob(refDate);
    res.status(200).json({
      message: 'Pickup reminders job executed successfully.',
      result,
    });
  }

  /**
   * PATCH /api/v1/partners/:id/status
   * Admin endpoint to transition partner account status (triggers notification)
   */
  async updatePartnerStatus(req: Request, res: Response): Promise<void> {
    // Ensure admin role
    if (req.user?.role !== 'admin') {
      throw new AppError('Only administrators can update partner status.', 403, 'FORBIDDEN');
    }

    const partnerAccountId = req.params.id;
    const validated = UpdatePartnerStatusDto.parse(req.body);
    const correlationId = (req as any).correlationId;

    const updated = await notificationsService.updatePartnerStatus(
      partnerAccountId,
      validated.status,
      validated.notes,
      req.user.id,
      correlationId
    );

    res.status(200).json(updated);
  }
}

export const notificationsController = new NotificationsController();
