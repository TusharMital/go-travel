import { prisma } from '../../prisma.js';
import { notificationsService } from './notifications.service.js';
import {
  StorageBookingStatus,
  TransportBookingStatus,
  NotificationChannel,
} from '@travel/shared';

export interface ReminderJobResult {
  referenceTime: string;
  storageRemindersSent: number;
  transportRemindersSent: number;
  totalRemindersSent: number;
  remindedBookingIds: string[];
}

export class PickupReminderScheduler {
  private timer: NodeJS.Timeout | null = null;

  /**
   * Run the 1-hour-before pickup reminder job.
   * Can be executed by cron, scheduled interval, or directly for unit testing.
   */
  async runPickupReminderJob(referenceTime: Date = new Date()): Promise<ReminderJobResult> {
    const refMs = referenceTime.getTime();
    // 1 hour window: between 45 minutes and 75 minutes from referenceTime
    const windowStart = new Date(refMs + 45 * 60 * 1000);
    const windowEnd = new Date(refMs + 75 * 60 * 1000);

    const remindedBookingIds: string[] = [];
    let storageRemindersSent = 0;
    let transportRemindersSent = 0;

    // 1. Storage Bookings pickup in ~1 hour
    const upcomingStorageBookings = await prisma.storageBooking.findMany({
      where: {
        status: { in: [StorageBookingStatus.CONFIRMED, StorageBookingStatus.CHECKED_IN] },
        pick_up_at: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        user: true,
        location: true,
      },
    });

    for (const booking of upcomingStorageBookings) {
      // Check if reminder notification was already sent for this booking
      const alreadySent = await this.hasReminderBeenSent(booking.user_id, booking.id);
      if (!alreadySent) {
        await notificationsService.sendNotification({
          userId: booking.user_id,
          template: 'PICKUP_REMINDER_1H',
          channel: NotificationChannel.EMAIL,
          variables: {
            userName: booking.user.full_name,
            title: `Luggage Pickup at ${booking.location.name}`,
            scheduledTime: booking.pick_up_at.toISOString(),
            address: booking.location.address,
            bookingId: booking.id,
            bookingType: 'STORAGE',
          },
        });

        remindedBookingIds.push(booking.id);
        storageRemindersSent++;
      }
    }

    // 2. Transport Bookings scheduled in ~1 hour
    const upcomingTransportBookings = await prisma.transportBooking.findMany({
      where: {
        status: TransportBookingStatus.CONFIRMED,
        scheduled_at: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        user: true,
        transport_option: {
          include: { provider: true },
        },
      },
    });

    for (const booking of upcomingTransportBookings) {
      const alreadySent = await this.hasReminderBeenSent(booking.user_id, booking.id);
      if (!alreadySent) {
        const providerName = booking.transport_option?.provider?.name || 'City Transport';
        await notificationsService.sendNotification({
          userId: booking.user_id,
          template: 'PICKUP_REMINDER_1H',
          channel: NotificationChannel.EMAIL,
          variables: {
            userName: booking.user.full_name,
            title: `Transfer with ${providerName}`,
            scheduledTime: booking.scheduled_at.toISOString(),
            address: `Pick-up coordinates: ${booking.transport_option?.origin_lat}, ${booking.transport_option?.origin_lng}`,
            bookingId: booking.id,
            bookingType: 'TRANSPORT',
          },
        });

        remindedBookingIds.push(booking.id);
        transportRemindersSent++;
      }
    }

    return {
      referenceTime: referenceTime.toISOString(),
      storageRemindersSent,
      transportRemindersSent,
      totalRemindersSent: storageRemindersSent + transportRemindersSent,
      remindedBookingIds,
    };
  }

  /**
   * Check if a PICKUP_REMINDER_1H notification was already sent to avoid duplicate spam.
   */
  private async hasReminderBeenSent(userId: string, bookingId: string): Promise<boolean> {
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: userId,
        template: 'PICKUP_REMINDER_1H',
      },
    });

    if (!existing) {
      return false;
    }

    // Inspect payload for matching bookingId
    const payload = existing.payload as any;
    return payload?.bookingId === bookingId;
  }

  /**
   * Start recurring background scheduler
   */
  startScheduler(intervalMs = 300000): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await this.runPickupReminderJob();
      } catch (err: any) {
        console.error('[PickupReminderScheduler] Periodic job error:', err.message);
      }
    }, intervalMs);
    // Unref timer so it doesn't hold open process in dev/test
    if (this.timer.unref) {
      this.timer.unref();
    }
    console.log(`⏰ Pickup Reminder Scheduler started (running every ${intervalMs / 1000}s).`);
  }

  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const pickupReminderScheduler = new PickupReminderScheduler();
