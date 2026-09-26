import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  UserRole,
  NotificationChannel,
  NotificationStatus,
  PartnerStatus,
  StorageBookingStatus,
  TransportBookingStatus,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';
import { templateRegistry } from '../src/modules/notifications/templates/template.registry.js';
import { consoleNotificationsAdapter } from '../src/adapters/notifications/console-notifications.adapter.js';
import { pickupReminderScheduler } from '../src/modules/notifications/pickup-reminder.scheduler.js';
import {
  getEventBus,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingConfirmedPayload,
  BookingCancelledPayload,
} from '../src/modules/events/index.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    partnerAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    storageProvider: {
      update: vi.fn(),
    },
    transportProvider: {
      update: vi.fn(),
    },
    storageBooking: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    transportBooking: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('4.8 Notifications Module', () => {
  const app = createApp();

  const travelerId = 'traveler-notif-uuid-1';
  const partnerUserId = 'partner-notif-user-1';
  const adminId = 'admin-notif-uuid-1';

  const travelerToken = jwt.sign(
    { id: travelerId, email: 'traveler.notif@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@platform.com', role: UserRole.ADMIN },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.resetAllMocks();
    consoleNotificationsAdapter.clear();
    // Default prisma.notification.update mock
    vi.mocked(prisma.notification.update).mockImplementation(async (args: any) => ({
      id: args.where?.id || 'notif-1',
      status: NotificationStatus.SENT,
      ...args.data,
    }) as any);
  });

  describe('1. Data-Driven Templates & Variable Interpolation', () => {
    it('renders BOOKING_CONFIRMED template with dynamic variables and no hardcoded strings', () => {
      const rendered = templateRegistry.render('BOOKING_CONFIRMED', 'email', {
        userName: 'Alice Smith',
        title: 'Central Station Hub',
        scheduledTime: '2026-10-15T10:00:00.000Z',
        address: 'Europaplatz 1, Berlin',
        bookingId: 'book-123',
        bookingType: 'STORAGE',
      });

      expect(rendered.subject).toBe('Booking Confirmed: Central Station Hub');
      expect(rendered.content).toContain('Hello Alice Smith');
      expect(rendered.content).toContain('Europaplatz 1, Berlin');
      expect(rendered.content).toContain('Reference ID: book-123');
    });

    it('renders channel-specific SMS template when channel is sms', () => {
      const rendered = templateRegistry.render('PICKUP_REMINDER_1H', 'sms', {
        userName: 'Bob',
        title: 'Alexanderplatz Hub',
        scheduledTime: '15:30',
        address: 'Alexanderplatz 2',
        bookingId: 'ref-456',
        bookingType: 'STORAGE',
      });

      expect(rendered.subject).toContain('Alexanderplatz Hub');
      expect(rendered.content).toContain('Reminder: Your pickup for Alexanderplatz Hub is in 1 hour');
      expect(rendered.content).toContain('pass ref-456');
    });

    it('throws error when requesting a non-existent template', () => {
      expect(() => {
        templateRegistry.render('NON_EXISTENT_TEMPLATE', 'email', {});
      }).toThrow();
    });

    it('dispatches notification via ConsoleNotificationsAdapter and logs to memory for testing', async () => {
      const payload = {
        toUserId: travelerId,
        recipientEmail: 'traveler.notif@example.com',
        channel: 'email' as const,
        template: 'BOOKING_CONFIRMED',
        subject: 'Booking Confirmed: Berlin Hub',
        content: 'Your luggage storage is confirmed',
        data: { title: 'Berlin Hub' },
      };

      const result = await consoleNotificationsAdapter.send(payload);

      expect(result.status).toBe('SENT');
      expect(consoleNotificationsAdapter.getSentNotifications().length).toBe(1);
      expect(consoleNotificationsAdapter.getLastNotification()?.toUserId).toBe(travelerId);
    });
  });

  describe('2. Trigger 1: Booking Confirmed Notification', () => {
    it('dispatches data-driven notification when booking-confirmed domain event is published', async () => {
      const mockUser = {
        id: travelerId,
        full_name: 'Elena Rostova',
        email: 'elena@travel.org',
        phone: '+491512345678',
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-conf-1',
        user_id: travelerId,
        channel: NotificationChannel.EMAIL,
        template: 'BOOKING_CONFIRMED',
        status: NotificationStatus.PENDING,
      } as any);

      // Publish booking-confirmed event (e.g. from storage/transport confirmation)
      await getEventBus().publish<BookingConfirmedPayload>({
        id: uuidv4(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-conf-1',
        payload: {
          bookingType: 'storage',
          bookingId: 'storage-bk-101',
          userId: travelerId,
          status: 'confirmed',
          startsAt: '2026-10-15T12:00:00.000Z',
          endsAt: '2026-10-15T18:00:00.000Z',
          title: 'SafeLuggage Berlin Hauptbahnhof',
          address: 'Washingtonplatz 1',
        },
      });

      // Allow async event handler to complete
      await new Promise((r) => setTimeout(r, 50));

      // Assert notification saved in database
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: travelerId,
            template: 'BOOKING_CONFIRMED',
            channel: NotificationChannel.EMAIL,
          }),
        })
      );

      // Assert sent via adapter
      const sent = consoleNotificationsAdapter.getSentNotifications();
      expect(sent.length).toBeGreaterThanOrEqual(1);
      const last = consoleNotificationsAdapter.getLastNotification();
      expect(last?.template).toBe('BOOKING_CONFIRMED');
      expect(last?.recipientEmail).toBe('elena@travel.org');
      expect(last?.subject).toContain('SafeLuggage Berlin Hauptbahnhof');

      // Assert audit log created
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'NOTIFICATION_SENT',
          }),
        })
      );
    });
  });

  describe('3. Trigger 2: Booking Cancelled Notification', () => {
    it('dispatches cancellation notice with refund info when booking-cancelled event fires', async () => {
      const mockUser = {
        id: travelerId,
        full_name: 'Elena Rostova',
        email: 'elena@travel.org',
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-canc-1',
        user_id: travelerId,
        channel: NotificationChannel.EMAIL,
        template: 'BOOKING_CANCELLED',
        status: NotificationStatus.PENDING,
      } as any);

      await getEventBus().publish<BookingCancelledPayload>({
        id: uuidv4(),
        name: BOOKING_CANCELLED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-canc-1',
        payload: {
          bookingType: 'transport',
          bookingId: 'trans-bk-202',
          userId: travelerId,
          title: 'City Taxi Transfer',
          cancellationReason: 'Traveler change of schedule',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            template: 'BOOKING_CANCELLED',
            user_id: travelerId,
          }),
        })
      );

      const last = consoleNotificationsAdapter.getLastNotification();
      expect(last?.template).toBe('BOOKING_CANCELLED');
      expect(last?.content).toContain('Traveler change of schedule');
      expect(last?.content).toContain('refunded');
    });
  });

  describe('4. Trigger 3: 1-Hour-Before Pickup Reminder (Scheduled Job)', () => {
    it('sends pickup reminder to bookings occurring in 1 hour and prevents duplicate reminders', async () => {
      const referenceNow = new Date('2026-10-15T12:00:00.000Z');
      // 1 hour away is 13:00 (between 12:45 and 13:15)
      const pickupTimeIn1h = new Date('2026-10-15T13:00:00.000Z');
      const storageBookingId = 'booking-reminder-target-1';

      const mockStorageBooking = {
        id: storageBookingId,
        user_id: travelerId,
        status: StorageBookingStatus.CONFIRMED,
        pick_up_at: pickupTimeIn1h,
        user: {
          id: travelerId,
          full_name: 'Marcus Brody',
          email: 'marcus@museum.org',
        },
        location: {
          name: 'Pergamon Luggage Desk',
          address: 'Bodestrasse 1-3, Berlin',
        },
      };

      // Mock finding bookings within the 1-hour window
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([mockStorageBooking as any]);
      vi.mocked(prisma.transportBooking.findMany).mockResolvedValue([]);

      // No prior reminder sent
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStorageBooking.user as any);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-remind-1',
        user_id: travelerId,
        template: 'PICKUP_REMINDER_1H',
      } as any);

      // Execute scheduled job
      const result = await pickupReminderScheduler.runPickupReminderJob(referenceNow);

      expect(result.totalRemindersSent).toBe(1);
      expect(result.storageRemindersSent).toBe(1);
      expect(result.remindedBookingIds).toContain(storageBookingId);

      const lastSent = consoleNotificationsAdapter.getLastNotification();
      expect(lastSent?.template).toBe('PICKUP_REMINDER_1H');
      expect(lastSent?.content).toContain('Pergamon Luggage Desk');
      expect(lastSent?.content).toContain('Bodestrasse 1-3, Berlin');

      // Assert DUPLICATE PREVENTION: Running the job again finds existing reminder and skips
      vi.mocked(prisma.notification.findFirst).mockResolvedValue({
        id: 'notif-already-sent',
        user_id: travelerId,
        template: 'PICKUP_REMINDER_1H',
        payload: { bookingId: storageBookingId },
      } as any);

      const rerunResult = await pickupReminderScheduler.runPickupReminderJob(referenceNow);
      expect(rerunResult.totalRemindersSent).toBe(0);
      expect(rerunResult.remindedBookingIds.length).toBe(0);
    });

    it('can be triggered on demand via POST /api/v1/notifications/jobs/pickup-reminders', async () => {
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transportBooking.findMany).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/v1/notifications/jobs/pickup-reminders')
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.message).toContain('executed successfully');
      expect(res.body.result).toBeDefined();
    });
  });

  describe('5. Trigger 4: Partner Status Changed', () => {
    it('updates partner status (PATCH /api/v1/partners/:id/status) and dispatches PARTNER_STATUS_CHANGED notification', async () => {
      const partnerAccountId = 'partner-acc-101';
      const mockPartner = {
        id: partnerAccountId,
        user_id: partnerUserId,
        type: 'storage',
        status: PartnerStatus.PENDING,
        user: {
          id: partnerUserId,
          full_name: 'Hans Zimmer',
          email: 'hans@berlinstorage.de',
        },
        storage_provider: {
          business_name: 'Zimmer Secure Storage GmbH',
        },
      };

      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue(mockPartner as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          partnerAccount: {
            update: vi.fn().mockResolvedValue({
              ...mockPartner,
              status: PartnerStatus.VERIFIED,
              verified_at: new Date(),
            }),
          },
          storageProvider: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartner.user as any);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-partner-1',
        user_id: partnerUserId,
        template: 'PARTNER_STATUS_CHANGED',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/${partnerAccountId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: PartnerStatus.VERIFIED,
          notes: 'Business license and insurance documents verified.',
        })
        .expect(200);

      expect(res.body.status).toBe(PartnerStatus.VERIFIED);

      // Verify PARTNER_STATUS_CHANGED notification dispatched
      const last = consoleNotificationsAdapter.getLastNotification();
      expect(last?.template).toBe('PARTNER_STATUS_CHANGED');
      expect(last?.toUserId).toBe(partnerUserId);
      expect(last?.content).toContain('Zimmer Secure Storage GmbH');
      expect(last?.content).toContain('VERIFIED');
      expect(last?.content).toContain('Business license and insurance documents verified.');

      // Verify audit trail recorded
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_STATUS_CHANGED',
            entity_id: partnerAccountId,
          }),
        })
      );
    });

    it('rejects partner status change from non-admin users (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/partners/partner-acc-1/status')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          status: PartnerStatus.VERIFIED,
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('6. In-App Notifications API Endpoints', () => {
    it('returns paginated in-app notifications for authenticated user (GET /api/v1/notifications)', async () => {
      const mockNotifications = [
        {
          id: 'n-1',
          user_id: travelerId,
          template: 'BOOKING_CONFIRMED',
          status: NotificationStatus.SENT,
          payload: { title: 'Storage at Alexanderplatz' },
          created_at: new Date(),
        },
      ];

      vi.mocked(prisma.notification.count).mockResolvedValue(1);
      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('marks notification as delivered/read (PATCH /api/v1/notifications/:id/read)', async () => {
      const notifId = 'notif-read-test';
      vi.mocked(prisma.notification.findFirst).mockResolvedValue({
        id: notifId,
        user_id: travelerId,
        status: NotificationStatus.SENT,
      } as any);

      vi.mocked(prisma.notification.update).mockResolvedValue({
        id: notifId,
        status: NotificationStatus.DELIVERED,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.status).toBe(NotificationStatus.DELIVERED);
    });
  });
});
