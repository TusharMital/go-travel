import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  UserRole,
  PartnerType,
  PartnerStatus,
  VerificationStatus,
  StorageBookingStatus,
} from '@travel/shared';
import { consoleNotificationsAdapter } from '../src/adapters/notifications/console-notifications.adapter.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    partnerAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    storageProvider: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transportProvider: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    storageBooking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    transportBooking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditEvent: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('4.10 Admin Panel Module', () => {
  const app = createApp();

  const adminUserId = 'user-admin-uuid-1';
  const supportUserId = 'user-support-uuid-1';
  const travelerUserId = 'user-traveler-uuid-1';
  const partnerAccountId = 'partner-acc-1';
  const partnerUserId = 'user-partner-1';

  const adminToken = jwt.sign(
    { id: adminUserId, email: 'admin@platform.travel', role: UserRole.ADMIN, email_verified: true },
    env.JWT_ACCESS_SECRET
  );

  const supportToken = jwt.sign(
    { id: supportUserId, email: 'support@platform.travel', role: UserRole.SUPPORT, email_verified: true },
    env.JWT_ACCESS_SECRET
  );

  const travelerToken = jwt.sign(
    { id: travelerUserId, email: 'traveler@platform.travel', role: UserRole.TRAVELER, email_verified: true },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.clearAllMocks();
    consoleNotificationsAdapter.clear();
    // Default prisma.$transaction implementation
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(prisma));
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: 'notif-1', status: 'sent' } as any);
    vi.mocked(prisma.notification.update).mockResolvedValue({ id: 'notif-1', status: 'sent' } as any);
  });

  // =========================================================================
  // 1. Basic Metrics Dashboard (Real Data Computation)
  // =========================================================================
  describe('1. Basic Metrics Dashboard', () => {
    it('computes metrics from live database queries (bookings today, conversion rate, cancellation rate, revenue)', async () => {
      // Mock counts for storage & transport
      vi.mocked(prisma.storageBooking.count)
        .mockResolvedValueOnce(3) // storageToday
        .mockResolvedValueOnce(10) // totalStorage
        .mockResolvedValueOnce(8) // confirmedStorage
        .mockResolvedValueOnce(2); // cancelledStorage

      vi.mocked(prisma.transportBooking.count)
        .mockResolvedValueOnce(2) // transportToday
        .mockResolvedValueOnce(5) // totalTransport
        .mockResolvedValueOnce(4) // confirmedTransport
        .mockResolvedValueOnce(1); // cancelledTransport

      // Trips count
      vi.mocked(prisma.trip.count).mockResolvedValueOnce(20);

      // Unique trips with bookings
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValueOnce([
        { trip_id: 'trip-1' },
        { trip_id: 'trip-2' },
      ] as any);
      vi.mocked(prisma.transportBooking.findMany).mockResolvedValueOnce([
        { trip_id: 'trip-2' },
        { trip_id: 'trip-3' },
      ] as any);

      // Partner counts
      vi.mocked(prisma.partnerAccount.count)
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(8) // verified
        .mockResolvedValueOnce(1) // suspended
        .mockResolvedValueOnce(11); // total

      // Aggregate revenue
      vi.mocked(prisma.storageBooking.aggregate)
        .mockResolvedValueOnce({ _sum: { price_total: 450.0 } } as any) // total
        .mockResolvedValueOnce({ _sum: { price_total: 75.0 } } as any); // today

      vi.mocked(prisma.transportBooking.aggregate)
        .mockResolvedValueOnce({ _sum: { price_total: 200.0 } } as any) // total
        .mockResolvedValueOnce({ _sum: { price_total: 50.0 } } as any); // today

      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      const data = res.body.data;

      // Bookings today: 3 (storage) + 2 (transport) = 5
      expect(data.bookingsToday).toBe(5);

      // Total bookings: 10 + 5 = 15
      expect(data.totalBookings).toBe(15);

      // Total cancelled: 2 + 1 = 3 -> Cancellation rate: (3 / 15) * 100 = 20.0%
      expect(data.cancelledBookings).toBe(3);
      expect(data.cancellationRate).toBe(20.0);

      // Unique trips with bookings: trip-1, trip-2, trip-3 = 3 out of 20 -> Conversion rate: (3 / 20) * 100 = 15.0%
      expect(data.tripsWithBookings).toBe(3);
      expect(data.totalTrips).toBe(20);
      expect(data.conversionRate).toBe(15.0);

      // Revenue: 450 + 200 = 650.00 total, 75 + 50 = 125.00 today
      expect(data.totalRevenue).toBe(650.0);
      expect(data.revenueToday).toBe(125.0);

      // Partner breakdown
      expect(data.partners).toEqual({
        pending: 2,
        verified: 8,
        suspended: 1,
        total: 11,
      });
    });

    it('handles zero bookings / zero trips safely without division by zero errors', async () => {
      vi.mocked(prisma.storageBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.transportBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.trip.count).mockResolvedValue(0);
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([]);
      vi.mocked(prisma.transportBooking.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerAccount.count).mockResolvedValue(0);
      vi.mocked(prisma.storageBooking.aggregate).mockResolvedValue({ _sum: { price_total: null } } as any);
      vi.mocked(prisma.transportBooking.aggregate).mockResolvedValue({ _sum: { price_total: null } } as any);

      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookingsToday).toBe(0);
      expect(res.body.data.cancellationRate).toBe(0);
      expect(res.body.data.conversionRate).toBe(0);
      expect(res.body.data.totalRevenue).toBe(0);
    });
  });

  // =========================================================================
  // 2. Partner Verification Queue & Actions (Approve / Suspend with Reason)
  // =========================================================================
  describe('2. Partner Verification Queue', () => {
    it('lists partners with status filtering and category count breakdown', async () => {
      vi.mocked(prisma.partnerAccount.findMany).mockResolvedValueOnce([
        {
          id: partnerAccountId,
          user_id: partnerUserId,
          type: PartnerType.STORAGE,
          status: PartnerStatus.PENDING,
          verified_at: null,
          created_at: new Date('2026-09-20'),
          user: {
            id: partnerUserId,
            email: 'partner@storagehub.de',
            full_name: 'Klaus Schmidt',
            phone: '+49170123456',
            created_at: new Date('2026-09-20'),
          },
          storage_provider: {
            id: 'sp-1',
            business_name: 'Schmidt Bag Drop GmbH',
            verification_status: VerificationStatus.PENDING,
            payout_details_ref: 'DE89370400440532013000',
            _count: { locations: 2 },
          },
          transport_provider: null,
        },
      ] as any);

      vi.mocked(prisma.partnerAccount.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.partnerAccount.groupBy).mockResolvedValueOnce([
        { status: 'pending', _count: { _all: 3 } },
        { status: 'verified', _count: { _all: 10 } },
        { status: 'suspended', _count: { _all: 1 } },
      ] as any);

      const res = await request(app)
        .get('/api/v1/admin/partners?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].businessName).toBe('Schmidt Bag Drop GmbH');
      expect(res.body.data[0].status).toBe('pending');
      expect(res.body.counts).toEqual({
        pending: 3,
        verified: 10,
        suspended: 1,
        rejected: 0,
        total: 14,
      });
    });

    it('approves a partner, updates provider verification, and records audit trail and notification', async () => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.PENDING,
        verified_at: null,
        user: {
          id: partnerUserId,
          email: 'klaus@storage.de',
          full_name: 'Klaus Schmidt',
          role: UserRole.TRAVELER,
        },
        storage_provider: {
          id: 'sp-1',
          business_name: 'Schmidt Bag Drop GmbH',
          verification_status: VerificationStatus.PENDING,
        },
        transport_provider: null,
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: partnerUserId,
        email: 'klaus@storage.de',
        full_name: 'Klaus Schmidt',
        role: UserRole.TRAVELER,
      } as any);

      vi.mocked(prisma.partnerAccount.update).mockResolvedValue({
        id: partnerAccountId,
        status: PartnerStatus.VERIFIED,
        verified_at: new Date(),
      } as any);

      vi.mocked(prisma.storageProvider.update).mockResolvedValue({
        id: 'sp-1',
        verification_status: VerificationStatus.VERIFIED,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: partnerUserId,
        role: UserRole.PARTNER_STORAGE,
      } as any);

      const res = await request(app)
        .post(`/api/v1/admin/partners/${partnerAccountId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Commercial insurance and ID verified.' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('verified successfully');

      // Verify audit event creation
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_STATUS_CHANGED',
            entity_type: 'PartnerAccount',
            entity_id: partnerAccountId,
          }),
        })
      );

      // Verify notification sent via adapter
      const sentNotifications = consoleNotificationsAdapter.getSentNotifications();
      expect(sentNotifications.some((n) => n.template === 'PARTNER_STATUS_CHANGED')).toBe(true);
    });

    it('suspends a partner with mandatory reason, updates status, and logs audit trail', async () => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.VERIFIED,
        verified_at: new Date('2026-09-01'),
        user: {
          id: partnerUserId,
          email: 'klaus@storage.de',
          full_name: 'Klaus Schmidt',
          role: UserRole.PARTNER_STORAGE,
        },
        storage_provider: {
          id: 'sp-1',
          business_name: 'Schmidt Bag Drop GmbH',
          verification_status: VerificationStatus.VERIFIED,
        },
        transport_provider: null,
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: partnerUserId,
        email: 'klaus@storage.de',
        full_name: 'Klaus Schmidt',
        role: UserRole.PARTNER_STORAGE,
      } as any);

      vi.mocked(prisma.partnerAccount.update).mockResolvedValue({
        id: partnerAccountId,
        status: PartnerStatus.SUSPENDED,
      } as any);

      vi.mocked(prisma.storageProvider.update).mockResolvedValue({
        id: 'sp-1',
        verification_status: VerificationStatus.SUSPENDED,
      } as any);

      const res = await request(app)
        .post(`/api/v1/admin/partners/${partnerAccountId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Repeated customer complaints regarding facility closure during operating hours.' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('suspended successfully');

      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_STATUS_CHANGED',
            entity_type: 'PartnerAccount',
          }),
        })
      );
    });

    it('rejects partner suspension if reason is missing or too short (negative test)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/partners/${partnerAccountId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Booking Lookup by ID or Customer Email
  // =========================================================================
  describe('3. Booking Lookup', () => {
    it('finds bookings across storage and transport by customer email', async () => {
      const testEmail = 'traveler.search@test.com';

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: travelerUserId } as any,
      ]);

      vi.mocked(prisma.storageBooking.findMany).mockResolvedValueOnce([
        {
          id: 'storage-bk-999',
          user_id: travelerUserId,
          status: StorageBookingStatus.CONFIRMED,
          bag_count: 2,
          drop_off_at: new Date('2026-10-10T10:00:00Z'),
          pick_up_at: new Date('2026-10-10T18:00:00Z'),
          price_total: 12.0,
          currency: 'USD',
          created_at: new Date('2026-09-25T12:00:00Z'),
          user: {
            id: travelerUserId,
            full_name: 'Elena Traveler',
            email: testEmail,
            phone: '+49151234567',
          },
          location: {
            name: 'Alexanderplatz Hub',
            address: 'Alexanderplatz 7',
            city: 'Berlin',
          },
          trip: {
            id: 'trip-101',
            title: 'Berlin Autumn Trip',
          },
        },
      ] as any);

      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([
        {
          id: 'pay-1',
          related_id: 'storage-bk-999',
          related_type: 'storage_booking',
          status: 'captured',
          amount: 12.0,
          provider_ref: 'mock_pi_999',
        },
      ] as any);

      vi.mocked(prisma.transportBooking.findMany).mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/v1/admin/bookings/lookup?query=${encodeURIComponent(testEmail)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].id).toBe('storage-bk-999');
      expect(res.body.data[0].customer.email).toBe(testEmail);
      expect(res.body.data[0].payment.status).toBe('captured');
    });

    it('returns single booking detail with linked audit trail events', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: 'storage-bk-101',
        user_id: travelerUserId,
        status: StorageBookingStatus.CHECKED_IN,
        bag_count: 1,
        drop_off_at: new Date('2026-10-10T10:00:00Z'),
        pick_up_at: new Date('2026-10-10T18:00:00Z'),
        price_total: 6.0,
        currency: 'USD',
        created_at: new Date('2026-09-25T10:00:00Z'),
        user: {
          id: travelerUserId,
          full_name: 'Elena Traveler',
          email: 'elena@travel.org',
          phone: '+49151234567',
        },
        location: {
          name: 'Berlin Hauptbahnhof SafeLuggage',
          address: 'Europaplatz 1',
          city: 'Berlin',
          provider: { business_name: 'SafeLuggage GmbH' },
        },
        trip: { id: 'trip-1', title: 'Berlin Weekend' },
        itinerary_items: [],
      } as any);

      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([
        {
          id: 'pay-storage-1',
          amount: 6.0,
          status: 'captured',
          provider_ref: 'mock_pi_101',
          created_at: new Date(),
        },
      ] as any);

      vi.mocked(prisma.auditEvent.findMany).mockResolvedValueOnce([
        {
          id: 'audit-evt-1',
          action: 'STORAGE_BOOKING_CHECKED_IN',
          entity_type: 'StorageBooking',
          entity_id: 'storage-bk-101',
          actor: { id: partnerUserId, full_name: 'Hans Hub Operator', email: 'hans@hub.de', role: 'partner_storage' },
          created_at: new Date(),
        },
        {
          id: 'audit-evt-0',
          action: 'STORAGE_BOOKING_CREATED',
          entity_type: 'StorageBooking',
          entity_id: 'storage-bk-101',
          actor: { id: travelerUserId, full_name: 'Elena Traveler', email: 'elena@travel.org', role: 'traveler' },
          created_at: new Date(),
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/admin/bookings/storage/storage-bk-101')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.id).toBe('storage-bk-101');
      expect(res.body.data.auditLogs).toHaveLength(2);
      expect(res.body.data.auditLogs[0].action).toBe('STORAGE_BOOKING_CHECKED_IN');
    });

    it('returns 404 when requested booking does not exist (negative test)', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/bookings/storage/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 4. Audit Log Viewer with Filters
  // =========================================================================
  describe('4. Audit Log Viewer with Filters', () => {
    it('returns paginated audit logs filtered by action and entity type', async () => {
      vi.mocked(prisma.auditEvent.findMany).mockResolvedValueOnce([
        {
          id: 'evt-1',
          action: 'STORAGE_BOOKING_CHECKED_IN',
          entity_type: 'StorageBooking',
          entity_id: 'bk-uuid-1',
          actor_user_id: partnerUserId,
          actor: {
            id: partnerUserId,
            full_name: 'Partner User',
            email: 'partner@test.de',
            role: 'partner_storage',
          },
          before_state: { status: 'confirmed' },
          after_state: { status: 'checked_in' },
          correlation_id: 'corr-101',
          created_at: new Date(),
        },
      ] as any);

      vi.mocked(prisma.auditEvent.count).mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/v1/admin/audit-logs?action=CHECKED_IN&entityType=StorageBooking')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe('STORAGE_BOOKING_CHECKED_IN');
      expect(res.body.data[0].actor.email).toBe('partner@test.de');
      expect(res.body.pagination.total).toBe(1);
    });
  });

  // =========================================================================
  // 5. Negative & Role-Gated Security Tests
  // =========================================================================
  describe('5. Role-Gated Access Control', () => {
    it('denies unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/metrics');
      expect(res.status).toBe(401);
    });

    it('denies traveler role with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows support role to view metrics and bookings but denies partner mutation', async () => {
      // Support can view metrics
      vi.mocked(prisma.storageBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.transportBooking.count).mockResolvedValue(0);
      vi.mocked(prisma.trip.count).mockResolvedValue(0);
      vi.mocked(prisma.partnerAccount.count).mockResolvedValue(0);
      vi.mocked(prisma.storageBooking.aggregate).mockResolvedValue({ _sum: { price_total: null } } as any);
      vi.mocked(prisma.transportBooking.aggregate).mockResolvedValue({ _sum: { price_total: null } } as any);

      const viewRes = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(viewRes.status).toBe(200);

      // Support cannot approve partner (admin only)
      const mutateRes = await request(app)
        .post(`/api/v1/admin/partners/${partnerAccountId}/approve`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ notes: 'Support trying to approve' });

      expect(mutateRes.status).toBe(403);
      expect(mutateRes.body.error.code).toBe('FORBIDDEN');
    });
  });
});
