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
      update: vi.fn(),
    },
    partnerAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    storageProvider: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    transportProvider: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    storageLocation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    storageInventory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    storageBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    transportBooking: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    transportOption: {
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('4.9 Partner Portal Module', () => {
  const app = createApp();

  const travelerUserId = 'user-traveler-1';
  const partnerUserId = 'user-storage-partner-1';
  const adminUserId = 'user-admin-1';
  const partnerAccountId = 'partner-acc-1';
  const storageProviderId = 'storage-prov-1';
  const locationId = 'loc-berlin-hub-1';
  const bookingId = 'storage-booking-1';

  const travelerToken = jwt.sign(
    { id: travelerUserId, email: 'traveler@test.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  const partnerToken = jwt.sign(
    { id: partnerUserId, email: 'partner@test.com', role: UserRole.PARTNER_STORAGE },
    env.JWT_ACCESS_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminUserId, email: 'admin@platform.com', role: UserRole.ADMIN },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.resetAllMocks();
    consoleNotificationsAdapter.clear();

    // Default transaction pass-through
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return cb;
    });

    vi.mocked(prisma.auditEvent.create).mockResolvedValue({ id: 'audit-1' } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: 'notif-1' } as any);
    vi.mocked(prisma.notification.update).mockResolvedValue({ id: 'notif-1' } as any);
  });

  describe('1. Partner Profile & Onboarding Form -> Pending Verification', () => {
    it('returns unregistered status when traveler user has not submitted onboarding', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: travelerUserId,
        email: 'traveler@test.com',
        full_name: 'John Traveler',
        phone: null,
        role: UserRole.TRAVELER,
        email_verified_at: new Date(),
      } as any);

      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/partners/me')
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.has_partner_account).toBe(false);
      expect(res.body.status).toBe('unregistered');
    });

    it('submits onboarding form, sets status to pending, updates user role, and writes audit event', async () => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.partnerAccount.upsert).mockResolvedValue({
        id: partnerAccountId,
        user_id: travelerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      vi.mocked(prisma.storageProvider.upsert).mockResolvedValue({
        id: storageProviderId,
        partner_account_id: partnerAccountId,
        business_name: 'Berlin Central SafeLockers GmbH',
        verification_status: VerificationStatus.PENDING,
        payout_details_ref: 'DE89370400440532013000',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: travelerUserId,
        role: UserRole.TRAVELER,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: travelerUserId,
        role: UserRole.PARTNER_STORAGE,
      } as any);

      const res = await request(app)
        .post('/api/v1/partners/onboard')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          business_name: 'Berlin Central SafeLockers GmbH',
          partner_type: PartnerType.STORAGE,
          contact_name: 'Helena Berg',
          contact_phone: '+49 30 12345678',
          city: 'Berlin',
          payout_details_ref: 'DE89370400440532013000',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PartnerStatus.PENDING);
      expect(res.body.partner_account_id).toBe(partnerAccountId);

      // Verify Audit Trail Entry
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_ONBOARDING_SUBMITTED',
            entity_type: 'PartnerAccount',
            entity_id: partnerAccountId,
            actor_user_id: travelerUserId,
          }),
        })
      );
    });

    it('rejects onboarding submission with invalid/missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/partners/onboard')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          business_name: 'A', // too short
          partner_type: 'invalid_type',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('2. Pending Verification Gate (Role & Approval Protection)', () => {
    it('blocks unverified partner from accessing locations or managing inventory', async () => {
      // Mock partner account in PENDING status
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.PENDING,
        storage_provider: {
          id: storageProviderId,
          business_name: 'Berlin Central SafeLockers GmbH',
        },
      } as any);

      const res = await request(app)
        .get('/api/v1/partners/locations')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PARTNER_UNVERIFIED');
    });

    it('blocks unverified partner from viewing partner bookings', async () => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.PENDING,
        storage_provider: { id: storageProviderId },
      } as any);

      const res = await request(app)
        .get('/api/v1/partners/bookings')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PARTNER_UNVERIFIED');
    });
  });

  describe('3. Admin Approval & Verification Flow', () => {
    it('allows admin to approve partner status, updates records, records audit event and sends notification', async () => {
      const mockPartner = {
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.PENDING,
        user: {
          id: partnerUserId,
          full_name: 'Helena Berg',
          email: 'partner@test.com',
          role: UserRole.PARTNER_STORAGE,
        },
        storage_provider: { id: storageProviderId, business_name: 'Berlin Central SafeLockers GmbH' },
        transport_provider: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartner.user as any);
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue(mockPartner as any);
      vi.mocked(prisma.partnerAccount.update).mockResolvedValue({
        ...mockPartner,
        status: PartnerStatus.VERIFIED,
        verified_at: new Date(),
      } as any);

      vi.mocked(prisma.storageProvider.update).mockResolvedValue({
        id: storageProviderId,
        partner_account_id: partnerAccountId,
        verification_status: VerificationStatus.VERIFIED,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/${partnerAccountId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: PartnerStatus.VERIFIED,
          notes: 'Business license and commercial insurance approved by compliance.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(PartnerStatus.VERIFIED);

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_STATUS_CHANGED',
            entity_type: 'PartnerAccount',
            entity_id: partnerAccountId,
            actor_user_id: adminUserId,
          }),
        })
      );

      // Verify Notification sent via ConsoleNotificationsAdapter
      const notifications = consoleNotificationsAdapter.getSentNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      const notif = notifications[0];
      expect(notif.template).toBe('PARTNER_STATUS_CHANGED');
      expect(notif.recipientEmail).toBe('partner@test.com');
      expect(notif.content).toContain('VERIFIED');
    });

    it('rejects partner status approval by non-admin users', async () => {
      const res = await request(app)
        .patch(`/api/v1/partners/${partnerAccountId}/status`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({ status: PartnerStatus.VERIFIED });

      expect(res.status).toBe(403);
    });
  });

  describe('4. Verified Partner: Manage Locations, Inventory & Pricing', () => {
    beforeEach(() => {
      // Mock verified partner account
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.VERIFIED,
        storage_provider: {
          id: storageProviderId,
          business_name: 'Berlin Central SafeLockers GmbH',
        },
      } as any);
    });

    it('allows verified partner to list locations and create a new location with 14-day seeded inventory', async () => {
      vi.mocked(prisma.storageLocation.create).mockResolvedValue({
        id: locationId,
        provider_id: storageProviderId,
        name: 'Alexanderplatz Luggage Hub',
        address: 'Alexanderstrasse 1',
        city: 'Berlin',
        lat: 52.5219,
        lng: 13.4132,
        opening_hours: {},
        accepted_item_categories: ['luggage', 'backpack'],
        max_bag_size: 'large',
        photos: [],
        is_active: true,
      } as any);

      vi.mocked(prisma.storageInventory.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/partners/locations')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          name: 'Alexanderplatz Luggage Hub',
          address: 'Alexanderstrasse 1',
          city: 'Berlin',
          lat: 52.5219,
          lng: 13.4132,
          initial_capacity: 35,
          price_per_bag_per_day: 7.5,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Alexanderplatz Luggage Hub');

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'STORAGE_LOCATION_CREATED',
            entity_type: 'StorageLocation',
            entity_id: locationId,
          }),
        })
      );
    });

    it('allows verified partner to update inventory capacity and pricing per date', async () => {
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue({
        id: locationId,
        provider_id: storageProviderId,
        provider: {
          partner_account: {
            user_id: partnerUserId,
          },
        },
      } as any);

      vi.mocked(prisma.storageInventory.upsert).mockResolvedValue({
        id: 'inv-1',
        location_id: locationId,
        date: new Date('2026-10-15'),
        total_capacity: 50,
        price_per_bag_per_day: 8.0,
      } as any);

      const res = await request(app)
        .post(`/api/v1/partners/locations/${locationId}/inventory`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          date: '2026-10-15',
          total_capacity: 50,
          price_per_bag_per_day: 8.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'STORAGE_INVENTORY_UPDATED',
            entity_type: 'StorageLocation',
            entity_id: locationId,
          }),
        })
      );
    });
  });

  describe('5. Verified Partner: Bookings & Check-In / Check-Out Actions', () => {
    beforeEach(() => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.VERIFIED,
        storage_provider: {
          id: storageProviderId,
          business_name: 'Berlin Central SafeLockers GmbH',
        },
      } as any);
    });

    it('lists bookings for the partner locations', async () => {
      vi.mocked(prisma.storageLocation.findMany).mockResolvedValue([
        { id: locationId },
      ] as any);

      vi.mocked(prisma.storageBooking.count).mockResolvedValue(1);
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([
        {
          id: bookingId,
          user_id: travelerUserId,
          location_id: locationId,
          status: StorageBookingStatus.CONFIRMED,
          bag_count: 2,
          price_total: 15.0,
          location: { id: locationId, name: 'Alexanderplatz Luggage Hub', city: 'Berlin' },
          user: { id: travelerUserId, full_name: 'John Traveler', email: 'traveler@test.com' },
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/partners/bookings')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(bookingId);
      expect(res.body.data[0].status).toBe(StorageBookingStatus.CONFIRMED);
    });

    it('marks booking CHECKED_IN (state machine: confirmed -> checked_in) and records audit trail', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        id: bookingId,
        user_id: travelerUserId,
        location_id: locationId,
        status: StorageBookingStatus.CONFIRMED,
        bag_count: 2,
        location: {
          provider_id: storageProviderId,
          provider: {
            partner_account: { user_id: partnerUserId },
          },
        },
      } as any);

      vi.mocked(prisma.storageBooking.update).mockResolvedValue({
        id: bookingId,
        status: StorageBookingStatus.CHECKED_IN,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe(StorageBookingStatus.CHECKED_IN);

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'STORAGE_BOOKING_CHECKED_IN',
            entity_type: 'StorageBooking',
            entity_id: bookingId,
            actor_user_id: partnerUserId,
          }),
        })
      );
    });

    it('marks booking CHECKED_OUT (state machine: checked_in -> checked_out) and records audit trail', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        id: bookingId,
        user_id: travelerUserId,
        location_id: locationId,
        status: StorageBookingStatus.CHECKED_IN,
        bag_count: 2,
        location: {
          provider_id: storageProviderId,
          provider: {
            partner_account: { user_id: partnerUserId },
          },
        },
      } as any);

      vi.mocked(prisma.storageBooking.update).mockResolvedValue({
        id: bookingId,
        status: StorageBookingStatus.CHECKED_OUT,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe(StorageBookingStatus.CHECKED_OUT);

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'STORAGE_BOOKING_CHECKED_OUT',
            entity_type: 'StorageBooking',
            entity_id: bookingId,
            actor_user_id: partnerUserId,
          }),
        })
      );
    });

    it('negative path: rejects invalid state transition (attempting to check-out a pending or confirmed booking without check-in)', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        id: bookingId,
        user_id: travelerUserId,
        location_id: locationId,
        status: StorageBookingStatus.CONFIRMED, // Not checked in yet!
        location: {
          provider_id: storageProviderId,
          provider: {
            partner_account: { user_id: partnerUserId },
          },
        },
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('negative path: unauthorized partner cannot check in bookings belonging to another partner', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        id: bookingId,
        user_id: travelerUserId,
        location_id: 'some-other-location',
        status: StorageBookingStatus.CONFIRMED,
        location: {
          provider_id: 'other-provider-id',
          provider: {
            partner_account: { user_id: 'other-partner-user-99' },
          },
        },
      } as any);

      const res = await request(app)
        .patch(`/api/v1/partners/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('6. Payout Summary & Payout Request (Stubbed)', () => {
    beforeEach(() => {
      vi.mocked(prisma.partnerAccount.findUnique).mockResolvedValue({
        id: partnerAccountId,
        user_id: partnerUserId,
        type: PartnerType.STORAGE,
        status: PartnerStatus.VERIFIED,
        storage_provider: {
          id: storageProviderId,
          payout_details_ref: 'DE89370400440532013000',
        },
      } as any);

      vi.mocked(prisma.storageLocation.findMany).mockResolvedValue([
        { id: locationId },
      ] as any);

      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([
        { price_total: 100.0, status: StorageBookingStatus.CHECKED_OUT },
        { price_total: 50.0, status: StorageBookingStatus.CONFIRMED },
      ] as any);
    });

    it('calculates payout summary with 15% platform commission and stubbed settlements', async () => {
      const res = await request(app)
        .get('/api/v1/partners/payouts/summary')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gross_revenue).toBe(150.0);
      expect(res.body.platform_commission).toBe(22.5); // 15% of 150
      expect(res.body.net_earnings).toBe(127.5);
      expect(res.body.settlements).toBeDefined();
      expect(res.body.settlements.length).toBeGreaterThan(0);
    });

    it('handles payout request and creates audit event', async () => {
      const res = await request(app)
        .post('/api/v1/partners/payouts/request')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payout_reference).toMatch(/^PAYOUT-/);

      // Verify Audit Event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PARTNER_PAYOUT_REQUESTED',
            entity_type: 'PartnerAccount',
            actor_user_id: partnerUserId,
          }),
        })
      );
    });
  });
});
