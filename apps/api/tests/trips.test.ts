import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { UserRole, TripStatus, ItineraryItemType } from '@travel/shared';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    trip: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    itineraryItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
  },
}));

describe('Trips & Itinerary Module', () => {
  const app = createApp();
  const userId = 'user-test-uuid';

  const userToken = jwt.sign(
    { id: userId, email: 'traveler@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Trip CRUD & Idempotency', () => {
    it('should reject POST /trips without Idempotency-Key header', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Berlin Weekend',
          origin_place: 'London',
          destination_place: 'Berlin',
          start_date: '2026-10-01T10:00:00.000Z',
          end_date: '2026-10-04T18:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
    });

    it('should reject trip when end_date is before start_date', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'key-test-1')
        .send({
          title: 'Invalid Dates Trip',
          origin_place: 'London',
          destination_place: 'Berlin',
          start_date: '2026-10-04T10:00:00.000Z',
          end_date: '2026-10-01T18:00:00.000Z', // before start
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create trip successfully with valid payload and Idempotency-Key', async () => {
      const mockTrip = {
        id: 'trip-123',
        user_id: userId,
        title: 'Berlin Weekend',
        origin_place: 'London LHR',
        destination_place: 'Berlin BER',
        start_date: new Date('2026-10-01T10:00:00.000Z'),
        end_date: new Date('2026-10-04T18:00:00.000Z'),
        status: TripStatus.PLANNING,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      (prisma.trip.create as any).mockResolvedValueOnce(mockTrip);
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'idemp-trip-create-1')
        .send({
          title: 'Berlin Weekend',
          origin_place: 'London LHR',
          destination_place: 'Berlin BER',
          start_date: '2026-10-01T10:00:00.000Z',
          end_date: '2026-10-04T18:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('trip-123');
      expect(res.body.title).toBe('Berlin Weekend');
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });

    it('should list paginated trips for authenticated user', async () => {
      (prisma.trip.count as any).mockResolvedValueOnce(1);
      (prisma.trip.findMany as any).mockResolvedValueOnce([
        {
          id: 'trip-123',
          title: 'Berlin Weekend',
          _count: { itinerary_items: 4, storage_bookings: 1, transport_bookings: 1 },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/trips?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return 404 when requesting non-existent trip', async () => {
      (prisma.trip.findFirst as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/trips/unknown-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should soft-delete trip and log audit event', async () => {
      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-to-delete',
        user_id: userId,
        itinerary_items: [],
        storage_bookings: [],
        transport_bookings: [],
      });

      (prisma.trip.update as any).mockResolvedValueOnce({
        id: 'trip-to-delete',
        deleted_at: new Date(),
      });

      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/v1/trips/trip-to-delete')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deleted_at: expect.any(Date) }),
        })
      );
    });
  });

  describe('2. Itinerary Items CRUD', () => {
    it('should add an itinerary item with Idempotency-Key', async () => {
      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-123',
        user_id: userId,
        itinerary_items: [],
        storage_bookings: [],
        transport_bookings: [],
      });

      const mockItem = {
        id: 'item-1',
        trip_id: 'trip-123',
        type: 'flight',
        title: 'Flight BA 982 London to Berlin',
        starts_at: new Date('2026-10-01T07:00:00.000Z'),
        ends_at: new Date('2026-10-01T09:30:00.000Z'),
        sequence_order: 1,
      };

      (prisma.itineraryItem.create as any).mockResolvedValueOnce(mockItem);
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/v1/trips/trip-123/itinerary')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'idemp-item-1')
        .send({
          type: 'flight',
          title: 'Flight BA 982 London to Berlin',
          starts_at: '2026-10-01T07:00:00.000Z',
          ends_at: '2026-10-01T09:30:00.000Z',
          sequence_order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('item-1');
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });

    it('should reject itinerary item when ends_at is before starts_at', async () => {
      const res = await request(app)
        .post('/api/v1/trips/trip-123/itinerary')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'idemp-item-err')
        .send({
          type: 'hotel',
          title: 'Hotel Check-in',
          starts_at: '2026-10-01T15:00:00.000Z',
          ends_at: '2026-10-01T14:00:00.000Z', // ends before starts
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should delete itinerary item successfully', async () => {
      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-123',
        user_id: userId,
        itinerary_items: [],
        storage_bookings: [],
        transport_bookings: [],
      });

      (prisma.itineraryItem.findFirst as any).mockResolvedValueOnce({
        id: 'item-1',
        trip_id: 'trip-123',
      });

      (prisma.itineraryItem.delete as any).mockResolvedValueOnce({});
      (prisma.auditEvent.create as any).mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/v1/trips/trip-123/itinerary/item-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('removed');
    });
  });

  describe('3. Automated Itinerary Gap Detection (GET /trips/:id/gaps)', () => {
    it('should return empty list if trip has fewer than 2 items', async () => {
      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-short',
        user_id: userId,
        destination_place: 'Berlin',
        itinerary_items: [
          {
            id: 'item-only',
            type: 'flight',
            title: 'Flight',
            starts_at: new Date('2026-10-01T07:00:00Z'),
            ends_at: new Date('2026-10-01T09:00:00Z'),
          },
        ],
        storage_bookings: [],
        transport_bookings: [],
      });

      const res = await request(app)
        .get('/api/v1/trips/trip-short/gaps')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should detect Arrival-to-Check-in gap and recommend storage', async () => {
      // Flight arrives at 09:30 AM, Hotel check-in is at 3:00 PM (15:00) -> 5.5 hour gap!
      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-gap',
        user_id: userId,
        destination_place: 'Berlin',
        itinerary_items: [
          {
            id: 'item-flight',
            type: 'flight',
            title: 'Flight Arrival @ BER Airport',
            location_lat: 52.3667,
            location_lng: 13.5033,
            address: 'BER Airport Terminal 1',
            starts_at: new Date('2026-10-01T07:00:00.000Z'),
            ends_at: new Date('2026-10-01T09:30:00.000Z'),
          },
          {
            id: 'item-hotel',
            type: 'hotel',
            title: 'Check-in @ Hotel Adlon',
            location_lat: 52.516,
            location_lng: 13.38,
            address: 'Unter den Linden 77, Berlin',
            starts_at: new Date('2026-10-01T15:00:00.000Z'),
            ends_at: new Date('2026-10-03T11:00:00.000Z'),
          },
        ],
        storage_bookings: [],
        transport_bookings: [],
      });

      const res = await request(app)
        .get('/api/v1/trips/trip-gap/gaps')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);

      const gap = res.body.data[0];
      expect(gap.gapType).toBe('ARRIVAL_GAP');
      expect(gap.durationMinutes).toBe(330); // 5.5 hours
      expect(gap.hasStorageBooked).toBe(false);
      expect(gap.recommendationAction).toBe('BOOK_STORAGE');
      expect(gap.recommendedLocation.lat).toBe(52.3667);
    });

    it('should mark gap recommendationAction as ALL_SET if storage is already booked', async () => {
      const flightEnd = new Date('2026-10-01T09:30:00.000Z');
      const hotelStart = new Date('2026-10-01T15:00:00.000Z');

      (prisma.trip.findFirst as any).mockResolvedValueOnce({
        id: 'trip-covered',
        user_id: userId,
        destination_place: 'Berlin',
        itinerary_items: [
          {
            id: 'item-flight',
            type: 'flight',
            title: 'Flight Arrival @ BER',
            starts_at: new Date('2026-10-01T07:00:00.000Z'),
            ends_at: flightEnd,
          },
          {
            id: 'item-storage',
            type: 'storage',
            title: 'Luggage Storage @ Berlin Hbf',
            starts_at: flightEnd,
            ends_at: hotelStart,
          },
          {
            id: 'item-hotel',
            type: 'hotel',
            title: 'Hotel Check-in',
            starts_at: hotelStart,
            ends_at: new Date('2026-10-03T11:00:00.000Z'),
          },
        ],
        storage_bookings: [
          {
            id: 'sb-active',
            status: 'confirmed',
            drop_off_at: flightEnd,
            pick_up_at: hotelStart,
          },
        ],
        transport_bookings: [],
      });

      const res = await request(app)
        .get('/api/v1/trips/trip-covered/gaps')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      // The gap between flight and hotel is covered by the storage item
      const arrivalGap = res.body.data.find((g: any) => g.gapType === 'ARRIVAL_GAP');
      if (arrivalGap) {
        expect(arrivalGap.hasStorageBooked).toBe(true);
        expect(arrivalGap.recommendationAction).toBe('ALL_SET');
      }
    });
  });
});
