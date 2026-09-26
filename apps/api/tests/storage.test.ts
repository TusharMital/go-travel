import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { UserRole, StorageBookingStatus } from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    storageLocation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    storageInventory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    storageBooking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('4.4 Storage Module (Discovery, Inventory, Booking)', () => {
  const app = createApp();

  const travelerId = 'traveler-uuid-1';
  const partnerId = 'partner-storage-uuid-1';
  const otherUserId = 'other-user-uuid-1';

  const travelerToken = jwt.sign(
    { id: travelerId, email: 'traveler@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  const partnerToken = jwt.sign(
    { id: partnerId, email: 'storage@partner.com', role: UserRole.PARTNER_STORAGE },
    env.JWT_ACCESS_SECRET
  );

  const otherToken = jwt.sign(
    { id: otherUserId, email: 'stranger@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  const mockLocation = {
    id: 'loc-berlin-alex',
    provider_id: 'provider-1',
    name: 'Alexanderplatz Luggage Hub',
    lat: 52.5219,
    lng: 13.4132,
    address: 'Dircksenstrasse 2, 10178 Berlin',
    city: 'Berlin',
    opening_hours: {
      mon: { open: '08:00', close: '22:00' },
      tue: { open: '08:00', close: '22:00' },
      wed: { open: '08:00', close: '22:00' },
      thu: { open: '08:00', close: '22:00' },
      fri: { open: '08:00', close: '22:00' },
      sat: { open: '08:00', close: '22:00' },
      sun: { open: '08:00', close: '22:00' },
    },
    accepted_item_categories: ['luggage', 'backpack', 'odd_size'],
    max_bag_size: 'oversized',
    photos: ['https://images.unsplash.com/photo-1544816155-12df9643f363'],
    is_active: true,
    provider: {
      business_name: 'Berlin SafeStorage GmbH',
      verification_status: 'verified',
      partner_account: { user_id: partnerId },
    },
    inventories: [
      {
        id: 'inv-1',
        location_id: 'loc-berlin-alex',
        date: new Date('2026-10-15T00:00:00.000Z'),
        total_capacity: 50,
        booked_capacity: 10,
        price_per_bag_per_day: '6.50',
        version: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Discovery Endpoint (GET /api/v1/storage/locations)', () => {
    it('searches storage locations near coordinates and sorts by relevance', async () => {
      vi.mocked(prisma.storageLocation.findMany).mockResolvedValue([mockLocation as any]);

      const res = await request(app)
        .get('/api/v1/storage/locations?lat=52.5251&lng=13.3694&radius_km=10')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(1);
      const loc = res.body.data[0];
      expect(loc.name).toBe('Alexanderplatz Luggage Hub');
      expect(loc.distance_km).toBeLessThanOrEqual(10);
      expect(loc.walking_time).toBeDefined();
      expect(loc.relevance_score).toBeGreaterThan(0);
      expect(res.body.meta.total).toBe(1);
    });

    it('filters out locations exceeding max_price', async () => {
      vi.mocked(prisma.storageLocation.findMany).mockResolvedValue([mockLocation as any]);

      const res = await request(app)
        .get('/api/v1/storage/locations?lat=52.5251&lng=13.3694&max_price=3.00')
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('returns 400 when search coordinates are invalid', async () => {
      const res = await request(app)
        .get('/api/v1/storage/locations?lat=120&lng=13.3694')
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('fetches location details by ID', async () => {
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue(mockLocation as any);

      const res = await request(app)
        .get('/api/v1/storage/locations/loc-berlin-alex')
        .expect(200);

      expect(res.body.id).toBe('loc-berlin-alex');
      expect(res.body.name).toBe('Alexanderplatz Luggage Hub');
      expect(res.body.rating).toBe(4.8);
    });
  });

  describe('2. Partner Inventory Management (POST /locations/:id/inventory)', () => {
    it('allows partner owner to update capacity and pricing per date', async () => {
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue(mockLocation as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          storageInventory: {
            upsert: vi.fn().mockResolvedValue({
              id: 'inv-new',
              location_id: 'loc-berlin-alex',
              date: new Date('2026-10-16T00:00:00.000Z'),
              total_capacity: 40,
              price_per_bag_per_day: 7.0,
            }),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/storage/locations/loc-berlin-alex/inventory')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          inventories: [
            {
              date: '2026-10-16',
              total_capacity: 40,
              price_per_bag_per_day: 7.0,
            },
          ],
        })
        .expect(200);

      expect(res.body.message).toContain('Inventory updated');
      expect(res.body.count).toBe(1);
    });

    it('rejects inventory update from a traveler or non-owner partner (403 Forbidden)', async () => {
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue(mockLocation as any);

      const res = await request(app)
        .post('/api/v1/storage/locations/loc-berlin-alex/inventory')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          inventories: [{ date: '2026-10-16', total_capacity: 40, price_per_bag_per_day: 7.0 }],
        })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Booking Endpoint, Idempotency & Concurrency Safety', () => {
    it('rejects booking creation without Idempotency-Key header', async () => {
      const res = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          location_id: uuidv4(),
          bag_count: 2,
          drop_off_at: '2026-10-15T10:00:00.000Z',
          pick_up_at: '2026-10-15T18:00:00.000Z',
        })
        .expect(400);

      expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
    });

    it('returns existing booking when replaying with same Idempotency-Key (idempotent)', async () => {
      const idemKey = 'idem-storage-key-1';
      const existingBooking = {
        id: 'booking-existing-1',
        user_id: travelerId,
        location_id: mockLocation.id,
        status: StorageBookingStatus.CONFIRMED,
        bag_count: 2,
        price_total: '13.00',
        currency: 'USD',
        idempotency_key: idemKey,
      };

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(existingBooking as any);

      const res = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          location_id: uuidv4(),
          bag_count: 2,
          drop_off_at: '2026-10-15T10:00:00.000Z',
          pick_up_at: '2026-10-15T18:00:00.000Z',
        })
        .expect(201);

      expect(res.body.id).toBe('booking-existing-1');
      // Should not have initiated a new database transaction
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('CONCURRENCY TEST: fires 20 simultaneous booking requests against 5 remaining slots and asserts exactly 5 succeed', async () => {
      // Setup shared inventory state with exactly 5 remaining slots (total: 5, booked: 0)
      const locationId = uuidv4();
      let totalCapacity = 5;
      let bookedCapacity = 0;
      let version = 0;

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue({
        id: locationId,
        is_active: true,
      } as any);

      // Concurrency-safe atomic transaction mock
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          storageInventory: {
            findUnique: vi.fn().mockImplementation(async () => {
              return {
                id: 'inv-concurrent-1',
                location_id: locationId,
                date: new Date('2026-10-15T00:00:00.000Z'),
                total_capacity: totalCapacity,
                booked_capacity: bookedCapacity,
                price_per_bag_per_day: 6.0,
                version,
              };
            }),
            create: vi.fn(),
            updateMany: vi.fn().mockImplementation(async (args: any) => {
              // Atomic check: cannot book if remaining capacity is exceeded
              if (bookedCapacity + 1 <= totalCapacity) {
                bookedCapacity += 1;
                version += 1;
                return { count: 1 };
              }
              // Capacity exceeded or version conflict
              return { count: 0 };
            }),
          },
          storageBooking: {
            create: vi.fn().mockImplementation(async (args: any) => ({
              id: `booking-${uuidv4()}`,
              ...args.data,
              location: { name: 'Berlin Test Hub' },
            })),
          },
        };

        return cb(tx);
      });

      vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-1' } as any);

      // Fire 20 simultaneous booking requests concurrently
      const concurrentRequests = Array.from({ length: 20 }, (_, i) => {
        return request(app)
          .post('/api/v1/storage/bookings')
          .set('Authorization', `Bearer ${travelerToken}`)
          .set('Idempotency-Key', `idem-concurrent-${i}-${uuidv4()}`)
          .send({
            location_id: locationId,
            bag_count: 1,
            drop_off_at: '2026-10-15T10:00:00.000Z',
            pick_up_at: '2026-10-15T18:00:00.000Z',
          });
      });

      const responses = await Promise.all(concurrentRequests);

      const successfulBookings = responses.filter((r) => r.status === 201);
      const rejectedBookings = responses.filter((r) => r.status === 409);

      // Assert that EXACTLY 5 succeeded and EXACTLY 15 failed safely without overbooking
      expect(successfulBookings.length).toBe(5);
      expect(rejectedBookings.length).toBe(15);
      expect(bookedCapacity).toBe(5);

      // Verify all rejected requests got the proper error code
      for (const rej of rejectedBookings) {
        expect(['INSUFFICIENT_CAPACITY', 'CONCURRENCY_CONFLICT']).toContain(rej.body.error.code);
      }
    });
  });

  describe('4. State Machine & Transitions', () => {
    const bookingId = 'booking-status-test-1';
    const activeBooking = {
      id: bookingId,
      user_id: travelerId,
      location_id: mockLocation.id,
      status: StorageBookingStatus.CONFIRMED,
      bag_count: 2,
      drop_off_at: new Date('2026-10-15T10:00:00.000Z'),
      pick_up_at: new Date('2026-10-15T18:00:00.000Z'),
      price_total: '12.00',
      location: mockLocation,
    };

    it('allows valid state progression: confirmed -> checked_in -> checked_out', async () => {
      // Step 1: Check-in
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(activeBooking as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          storageBooking: {
            update: vi.fn().mockResolvedValue({
              ...activeBooking,
              status: StorageBookingStatus.CHECKED_IN,
            }),
          },
        });
      });

      const checkInRes = await request(app)
        .post(`/api/v1/storage/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(checkInRes.body.status).toBe(StorageBookingStatus.CHECKED_IN);

      // Step 2: Check-out
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        ...activeBooking,
        status: StorageBookingStatus.CHECKED_IN,
      } as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          storageBooking: {
            update: vi.fn().mockResolvedValue({
              ...activeBooking,
              status: StorageBookingStatus.CHECKED_OUT,
            }),
          },
        });
      });

      const checkOutRes = await request(app)
        .post(`/api/v1/storage/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(checkOutRes.body.status).toBe(StorageBookingStatus.CHECKED_OUT);
    });

    it('rejects invalid state transition: checked_in -> cancelled (400 Bad Request)', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue({
        ...activeBooking,
        status: StorageBookingStatus.CHECKED_IN,
      } as any);

      const res = await request(app)
        .post(`/api/v1/storage/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('allows traveler to cancel confirmed booking, restoring inventory capacity and issuing refund', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(activeBooking as any);

      const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
      const refundMock = vi.fn().mockResolvedValue({ id: 'pay-1', status: 'refunded' });

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          storageInventory: { updateMany: updateManyMock },
          payment: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'pay-1',
              provider_ref: 'mock_pi_123',
              amount: '12.00',
            }),
            update: refundMock,
          },
          storageBooking: {
            update: vi.fn().mockResolvedValue({
              ...activeBooking,
              status: StorageBookingStatus.CANCELLED,
            }),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/storage/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({ reason: 'Trip plans changed' })
        .expect(200);

      expect(res.body.status).toBe(StorageBookingStatus.CANCELLED);
      // Capacity restored
      expect(updateManyMock).toHaveBeenCalled();
      // Audit event recorded
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });

    it('rejects unauthorized user trying to cancel someone elses booking (403 Forbidden)', async () => {
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(activeBooking as any);

      const res = await request(app)
        .post(`/api/v1/storage/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('5. List Traveler Bookings (GET /api/v1/storage/bookings)', () => {
    it('returns paginated list of bookings for authenticated traveler', async () => {
      vi.mocked(prisma.storageBooking.count).mockResolvedValue(1);
      vi.mocked(prisma.storageBooking.findMany).mockResolvedValue([
        {
          id: 'booking-1',
          user_id: travelerId,
          status: StorageBookingStatus.CONFIRMED,
          bag_count: 2,
          price_total: '13.00',
          location: {
            name: 'Alexanderplatz Luggage Hub',
            address: 'Dircksenstrasse 2',
            city: 'Berlin',
          },
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/storage/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].id).toBe('booking-1');
    });
  });
});
