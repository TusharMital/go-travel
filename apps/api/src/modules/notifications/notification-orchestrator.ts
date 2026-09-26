import { prisma } from '../../prisma.js';
import {
  getEventBus,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingConfirmedPayload,
  BookingCancelledPayload,
} from '../events/index.js';
import { notificationsService } from './notifications.service.js';
import { NotificationChannel } from '@travel/shared';

let isInitialized = false;

/**
 * Event-Driven Notification Orchestrator
 * Subscribes to domain events and dispatches data-driven notifications.
 * Trigger 1: Booking Confirmed
 * Trigger 2: Booking Cancelled
 */
export function initNotificationOrchestrator(): void {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const eventBus = getEventBus();

  // 1. TRIGGER: BOOKING CONFIRMED
  eventBus.subscribe<BookingConfirmedPayload>(
    BOOKING_CONFIRMED_EVENT,
    async (event) => {
      try {
        const payload = event.payload;
        const user = prisma.user?.findUnique
          ? await prisma.user.findUnique({
              where: { id: payload.userId },
              select: { full_name: true, email: true },
            }).catch(() => null)
          : null;

        const scheduledTimeStr =
          typeof payload.startsAt === 'string'
            ? payload.startsAt
            : payload.startsAt.toISOString();

        await notificationsService.sendNotification({
          userId: payload.userId,
          template: 'BOOKING_CONFIRMED',
          channel: NotificationChannel.EMAIL,
          variables: {
            userName: user?.full_name || 'Traveler',
            title: payload.title,
            scheduledTime: scheduledTimeStr,
            address: payload.address || 'Designated meeting location',
            bookingId: payload.bookingId,
            bookingType: payload.bookingType.toUpperCase(),
          },
          correlationId: event.correlationId,
        }).catch(() => null);
      } catch (err: any) {
        console.error('[NotificationOrchestrator] Error processing booking-confirmed:', err.message);
      }
    }
  );

  // 2. TRIGGER: BOOKING CANCELLED
  eventBus.subscribe<BookingCancelledPayload>(
    BOOKING_CANCELLED_EVENT,
    async (event) => {
      try {
        const payload = event.payload;
        const user = prisma.user?.findUnique
          ? await prisma.user.findUnique({
              where: { id: payload.userId },
              select: { full_name: true, email: true },
            }).catch(() => null)
          : null;

        await notificationsService.sendNotification({
          userId: payload.userId,
          template: 'BOOKING_CANCELLED',
          channel: NotificationChannel.EMAIL,
          variables: {
            userName: user?.full_name || 'Traveler',
            title: payload.title || `${payload.bookingType} Reservation`,
            bookingId: payload.bookingId,
            bookingType: payload.bookingType.toUpperCase(),
            cancellationReason: payload.cancellationReason || 'Requested by traveler',
          },
          correlationId: event.correlationId,
        }).catch(() => null);
      } catch (err: any) {
        console.error('[NotificationOrchestrator] Error processing booking-cancelled:', err.message);
      }
    }
  );

  console.log('✅ Notification Orchestrator initialized (listening for booking events).');
}
