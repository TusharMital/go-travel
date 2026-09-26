import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { UserRole, TransportBookingStatus, TransportMode } from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    transportOption: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    transportProvider: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    partnerAccount: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    transportBooking: {
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

describe('4.5 Transport Module', () => {
  const app = createApp();

  const travelerId = 'traveler-uuid-transport-1';
  const travelerToken = jwt.sign(
    { id: travelerId, email: 'traveler@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Discovery Endpoint (GET /api/v1/transport/options)', () => {
    it('returns transit directions and partner taxi/rideshare options with price/duration estimates', async () => {
      vi.mocked(prisma.transportOption.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get(
          '/api/v1/transport/options?origin_lat=52.5251&origin_lng=13.3694&dest_lat=52.3667&dest_lng=13.5033'
        )
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      // Verify transit option contains step-by-step directions
      const transitOption = res.body.data.find((o: any) => o.mode === 'transit');
      expect(transitOption).toBeDefined();
      expect(transitOption.is_direct_bookable).toBe(true);
      expect(transitOption.transit_steps).toBeDefined();
      expect(transitOption.transit_steps.length).toBeGreaterThan(0);
      expect(transitOption.transit_steps[0].instruction).toBeDefined();

      // Verify deep-link handoff options
      const uberOption = res.body.data.find((o: any) => o.id === 'prov-uber-mock');
      expect(uberOption).toBeDefined();
      expect(uberOption.is_direct_bookable).toBe(false);
      expect(uberOption.deep_link_url).toContain('uber.com');

      // Verify meta information
      expect(res.body.meta.distance_km).toBeGreaterThan(0);
    });

    it('filters options by mode (e.g. taxi only)', async () => {
      vi.mocked(prisma.transportOption.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get(
          '/api/v1/transport/options?origin_lat=52.5251&origin_lng=13.3694&dest_lat=52.3667&dest_lng=13.5033&mode=taxi'
        )
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const opt of res.body.data) {
        expect(opt.mode).toBe('taxi');
      }
    });

    it('returns 400 when coordinates are invalid', async () => {
      const res = await request(app)
        .get('/api/v1/transport/options?origin_lat=120&origin_lng=13.3694&dest_lat=52.3667&dest_lng=13.5033')
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Booking / Handoff Endpoint (POST /api/v1/transport/bookings)', () => {
    it('HANDOFF FLOW: logs audit event and returns deep link without DB booking for deep-link providers', async () => {
      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.transportOption.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/transport/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-uber-${uuidv4()}`)
        .send({
          transport_option_id: 'prov-uber-mock',
          scheduled_at: '2026-10-15T14:30:00.000Z',
          origin_lat: 52.5251,
          origin_lng: 13.3694,
          dest_lat: 52.3667,
          dest_lng: 13.5033,
        })
        .expect(200);

      expect(res.body.handoff).toBe(true);
      expect(res.body.deep_link_url).toContain('uber.com');
      // Assert NO booking was created in the database
      expect(prisma.transportBooking.create).not.toHaveBeenCalled();
      // Assert TRANSPORT_HANDOFF audit event was logged
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TRANSPORT_HANDOFF',
          }),
        })
      );
    });

    it('DIRECT BOOKING FLOW: creates TransportBooking in DB with payment transaction for direct providers', async () => {
      const directOptionId = uuidv4();
      const mockOption = {
        id: directOptionId,
        provider_id: 'prov-1',
        mode: TransportMode.TAXI,
        estimated_price: '28.00',
        currency: 'USD',
        estimated_duration_min: 16,
        deep_link_url: null,
      };

      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.transportOption.findUnique).mockResolvedValue(mockOption as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          transportBooking: {
            create: vi.fn().mockResolvedValue({
              id: 'booking-trans-1',
              user_id: travelerId,
              transport_option_id: directOptionId,
              status: TransportBookingStatus.CONFIRMED,
              scheduled_at: new Date('2026-10-15T14:30:00.000Z'),
              price_total: '28.00',
              currency: 'USD',
              transport_option: mockOption,
            }),
          },
        });
      });

      vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'pay-trans-1' } as any);

      const res = await request(app)
        .post('/api/v1/transport/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-taxi-${uuidv4()}`)
        .send({
          transport_option_id: directOptionId,
          scheduled_at: '2026-10-15T14:30:00.000Z',
        })
        .expect(201);

      expect(res.body.handoff).toBe(false);
      expect(res.body.booking.id).toBe('booking-trans-1');
      expect(res.body.payment).toBeDefined();

      // Assert audit event recorded
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TRANSPORT_BOOKING_CREATED',
          }),
        })
      );
    });

    it('rejects booking request missing Idempotency-Key header', async () => {
      const res = await request(app)
        .post('/api/v1/transport/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          transport_option_id: 'prov-city-taxi',
          scheduled_at: '2026-10-15T14:30:00.000Z',
        })
        .expect(400);

      expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
    });

    it('IDEMPOTENCY REPLAY: returns cached existing booking without re-booking or re-charging', async () => {
      const idemKey = 'idem-trans-replay-1';
      const existingBooking = {
        id: 'booking-existing-trans',
        user_id: travelerId,
        transport_option_id: 'opt-1',
        status: TransportBookingStatus.CONFIRMED,
        scheduled_at: new Date('2026-10-15T14:30:00.000Z'),
        price_total: '28.00',
        currency: 'USD',
        idempotency_key: idemKey,
      };

      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValue(existingBooking as any);

      const res = await request(app)
        .post('/api/v1/transport/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          transport_option_id: 'opt-1',
          scheduled_at: '2026-10-15T14:30:00.000Z',
        })
        .expect(201);

      expect(res.body.handoff).toBe(false);
      expect(res.body.booking.id).toBe('booking-existing-trans');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('3. Booking Cancellation & User Bookings List', () => {
    it('cancels direct transport booking, issues refund, and writes audit event', async () => {
      const bookingId = 'booking-cancel-1';
      const activeBooking = {
        id: bookingId,
        user_id: travelerId,
        status: TransportBookingStatus.CONFIRMED,
        price_total: '28.00',
        transport_option: { mode: 'taxi' },
      };

      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValue(activeBooking as any);

      const refundMock = vi.fn().mockResolvedValue({ id: 'pay-1', status: 'refunded' });

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          payment: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'pay-1',
              provider_ref: 'mock_pi_trans_1',
              amount: '28.00',
            }),
            update: refundMock,
          },
          transportBooking: {
            update: vi.fn().mockResolvedValue({
              ...activeBooking,
              status: TransportBookingStatus.CANCELLED,
            }),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/transport/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({ reason: 'Flight delayed' })
        .expect(200);

      expect(res.body.status).toBe(TransportBookingStatus.CANCELLED);
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TRANSPORT_BOOKING_CANCELLED',
          }),
        })
      );
    });

    it('returns paginated list of transport bookings for traveler', async () => {
      vi.mocked(prisma.transportBooking.count).mockResolvedValue(1);
      vi.mocked(prisma.transportBooking.findMany).mockResolvedValue([
        {
          id: 'booking-trans-1',
          user_id: travelerId,
          status: TransportBookingStatus.CONFIRMED,
          price_total: '28.00',
          scheduled_at: new Date('2026-10-15T14:30:00.000Z'),
          transport_option: {
            mode: 'taxi',
            provider: { name: 'Berlin City Taxi' },
          },
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/transport/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('booking-trans-1');
    });
  });
});
