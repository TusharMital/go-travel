import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { UserRole, StorageBookingStatus, TransportBookingStatus } from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  getEventBus,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  ITINERARY_UPDATED_EVENT,
  ItineraryUpdatedPayload,
} from '../src/modules/events/index.js';
import { bookingOrchestrator } from '../src/modules/orchestration/booking-orchestrator.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    trip: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    itineraryItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    storageBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    storageLocation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    storageInventory: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    transportOption: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    transportProvider: {
      findFirst: vi.fn(),
    },
    transportBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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

describe('4.6 Booking Orchestration / Itinerary Linking', () => {
  const app = createApp();

  const travelerId = uuidv4();
  const tripId = uuidv4();
  const storageBookingId = uuidv4();
  const transportBookingId = uuidv4();

  const travelerToken = jwt.sign(
    { id: travelerId, email: 'traveler@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.clearAllMocks();
    bookingOrchestrator.init();
  });

  describe('Event-Driven Orchestrator: booking-confirmed -> itinerary-updated', () => {
    it('auto-inserts ItineraryItem when storage booking is confirmed with linked trip_id', async () => {
      // Mock existing trip
      (prisma.trip.findFirst as any).mockResolvedValue({
        id: tripId,
        user_id: travelerId,
        title: 'Berlin Explorer Trip',
        deleted_at: null,
      });

      // No existing itinerary item linked
      (prisma.itineraryItem.findFirst as any).mockResolvedValue(null);
      (prisma.itineraryItem.count as any).mockResolvedValue(2);

      const createdItem = {
        id: uuidv4(),
        trip_id: tripId,
        type: 'storage',
        title: 'Luggage Storage: Alexanderplatz Hub (2 bags)',
        starts_at: new Date('2026-10-12T10:00:00.000Z'),
        ends_at: new Date('2026-10-12T16:00:00.000Z'),
        location_lat: 52.5219,
        location_lng: 13.4132,
        address: 'Alexanderplatz 1, Berlin',
        sequence_order: 2,
        linked_storage_booking_id: storageBookingId,
        linked_transport_booking_id: null,
      };
      (prisma.itineraryItem.create as any).mockResolvedValue(createdItem);

      // Track itinerary-updated event
      let receivedUpdatedEvent: any = null;
      const unsubscribe = getEventBus().subscribe<ItineraryUpdatedPayload>(
        ITINERARY_UPDATED_EVENT,
        async (event) => {
          receivedUpdatedEvent = event;
        }
      );

      // Trigger booking-confirmed event
      await getEventBus().publish({
        id: uuidv4(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-orch-1',
        payload: {
          bookingType: 'storage',
          bookingId: storageBookingId,
          userId: travelerId,
          tripId,
          status: 'confirmed',
          startsAt: new Date('2026-10-12T10:00:00.000Z'),
          endsAt: new Date('2026-10-12T16:00:00.000Z'),
          title: 'Luggage Storage: Alexanderplatz Hub (2 bags)',
          locationLat: 52.5219,
          locationLng: 13.4132,
          address: 'Alexanderplatz 1, Berlin',
        },
      });

      unsubscribe();

      // Assertions
      expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: tripId,
          type: 'storage',
          title: 'Luggage Storage: Alexanderplatz Hub (2 bags)',
          linked_storage_booking_id: storageBookingId,
          linked_transport_booking_id: null,
        }),
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ITINERARY_ITEM_AUTO_LINKED',
          entity_type: 'ItineraryItem',
        }),
      });

      expect(receivedUpdatedEvent).not.toBeNull();
      expect(receivedUpdatedEvent.payload.action).toBe('created');
      expect(receivedUpdatedEvent.payload.bookingType).toBe('storage');
      expect(receivedUpdatedEvent.payload.bookingId).toBe(storageBookingId);
    });

    it('auto-inserts ItineraryItem when transport booking is confirmed with linked trip_id', async () => {
      (prisma.trip.findFirst as any).mockResolvedValue({
        id: tripId,
        user_id: travelerId,
        title: 'Berlin Explorer Trip',
        deleted_at: null,
      });

      (prisma.itineraryItem.findFirst as any).mockResolvedValue(null);
      (prisma.itineraryItem.count as any).mockResolvedValue(3);

      const createdItem = {
        id: uuidv4(),
        trip_id: tripId,
        type: 'transport',
        title: 'Transfer: City Taxi (taxi)',
        starts_at: new Date('2026-10-12T16:30:00.000Z'),
        ends_at: new Date('2026-10-12T17:00:00.000Z'),
        location_lat: 52.5219,
        location_lng: 13.4132,
        address: 'Pick-up from Alexanderplatz',
        sequence_order: 3,
        linked_storage_booking_id: null,
        linked_transport_booking_id: transportBookingId,
      };
      (prisma.itineraryItem.create as any).mockResolvedValue(createdItem);

      let receivedUpdatedEvent: any = null;
      const unsubscribe = getEventBus().subscribe<ItineraryUpdatedPayload>(
        ITINERARY_UPDATED_EVENT,
        async (event) => {
          receivedUpdatedEvent = event;
        }
      );

      await getEventBus().publish({
        id: uuidv4(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-orch-2',
        payload: {
          bookingType: 'transport',
          bookingId: transportBookingId,
          userId: travelerId,
          tripId,
          status: 'confirmed',
          startsAt: new Date('2026-10-12T16:30:00.000Z'),
          endsAt: new Date('2026-10-12T17:00:00.000Z'),
          title: 'Transfer: City Taxi (taxi)',
          locationLat: 52.5219,
          locationLng: 13.4132,
          address: 'Pick-up from Alexanderplatz',
        },
      });

      unsubscribe();

      expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: tripId,
          type: 'transport',
          title: 'Transfer: City Taxi (taxi)',
          linked_transport_booking_id: transportBookingId,
        }),
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ITINERARY_ITEM_AUTO_LINKED',
          entity_type: 'ItineraryItem',
        }),
      });

      expect(receivedUpdatedEvent).not.toBeNull();
      expect(receivedUpdatedEvent.payload.action).toBe('created');
      expect(receivedUpdatedEvent.payload.bookingType).toBe('transport');
    });

    it('updates existing ItineraryItem instead of duplicating on repeat confirmation or edit', async () => {
      (prisma.trip.findFirst as any).mockResolvedValue({
        id: tripId,
        user_id: travelerId,
        deleted_at: null,
      });

      const existingItem = {
        id: uuidv4(),
        trip_id: tripId,
        type: 'storage',
        title: 'Old Storage Title',
        starts_at: new Date('2026-10-12T10:00:00.000Z'),
        ends_at: new Date('2026-10-12T14:00:00.000Z'),
        location_lat: 52.52,
        location_lng: 13.4,
        address: 'Old address',
        linked_storage_booking_id: storageBookingId,
      };

      (prisma.itineraryItem.findFirst as any).mockResolvedValue(existingItem);
      (prisma.itineraryItem.update as any).mockResolvedValue({
        ...existingItem,
        title: 'Updated Luggage Storage: Alexanderplatz Hub',
        ends_at: new Date('2026-10-12T18:00:00.000Z'),
      });

      let receivedUpdatedEvent: any = null;
      const unsubscribe = getEventBus().subscribe<ItineraryUpdatedPayload>(
        ITINERARY_UPDATED_EVENT,
        async (event) => {
          receivedUpdatedEvent = event;
        }
      );

      await getEventBus().publish({
        id: uuidv4(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-orch-3',
        payload: {
          bookingType: 'storage',
          bookingId: storageBookingId,
          userId: travelerId,
          tripId,
          status: 'confirmed',
          startsAt: new Date('2026-10-12T10:00:00.000Z'),
          endsAt: new Date('2026-10-12T18:00:00.000Z'),
          title: 'Updated Luggage Storage: Alexanderplatz Hub',
          locationLat: 52.5219,
          locationLng: 13.4132,
          address: 'Alexanderplatz 1, Berlin',
        },
      });

      unsubscribe();

      expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
      expect(prisma.itineraryItem.update).toHaveBeenCalledWith({
        where: { id: existingItem.id },
        data: expect.objectContaining({
          title: 'Updated Luggage Storage: Alexanderplatz Hub',
        }),
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ITINERARY_ITEM_AUTO_UPDATED',
          entity_type: 'ItineraryItem',
        }),
      });

      expect(receivedUpdatedEvent).not.toBeNull();
      expect(receivedUpdatedEvent.payload.action).toBe('updated');
    });

    it('auto-detects and links active trip when booking does not supply explicit trip_id', async () => {
      const matchingTripId = uuidv4();
      const matchingTrip = {
        id: matchingTripId,
        user_id: travelerId,
        title: 'Autumn Vacation in Germany',
        start_date: new Date('2026-10-10T00:00:00.000Z'),
        end_date: new Date('2026-10-20T00:00:00.000Z'),
        deleted_at: null,
      };

      (prisma.trip.findFirst as any)
        .mockResolvedValueOnce(matchingTrip) // Matching search
        .mockResolvedValueOnce(matchingTrip); // Verification

      (prisma.storageBooking.update as any).mockResolvedValue({});
      (prisma.itineraryItem.findFirst as any).mockResolvedValue(null);
      (prisma.itineraryItem.count as any).mockResolvedValue(0);
      (prisma.itineraryItem.create as any).mockResolvedValue({
        id: uuidv4(),
        trip_id: matchingTripId,
      });

      await getEventBus().publish({
        id: uuidv4(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-orch-4',
        payload: {
          bookingType: 'storage',
          bookingId: storageBookingId,
          userId: travelerId,
          tripId: null, // No explicit tripId
          status: 'confirmed',
          startsAt: new Date('2026-10-15T09:00:00.000Z'),
          endsAt: new Date('2026-10-15T15:00:00.000Z'),
          title: 'Luggage Storage: Berlin Hbf',
        },
      });

      // Storage booking was linked to matched trip in DB
      expect(prisma.storageBooking.update).toHaveBeenCalledWith({
        where: { id: storageBookingId },
        data: { trip_id: matchingTripId },
      });

      // Itinerary item created on matched trip
      expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: matchingTripId,
          linked_storage_booking_id: storageBookingId,
        }),
      });
    });

    it('completes safely with no errors when traveler has no matching trip', async () => {
      (prisma.trip.findFirst as any).mockResolvedValue(null);

      await expect(
        getEventBus().publish({
          id: uuidv4(),
          name: BOOKING_CONFIRMED_EVENT,
          timestamp: new Date().toISOString(),
          correlationId: 'corr-orch-5',
          payload: {
            bookingType: 'transport',
            bookingId: uuidv4(),
            userId: travelerId,
            tripId: null,
            status: 'confirmed',
            startsAt: new Date('2026-11-01T10:00:00.000Z'),
            endsAt: new Date('2026-11-01T10:30:00.000Z'),
            title: 'Standalone Taxi',
          },
        })
      ).resolves.not.toThrow();

      expect(prisma.itineraryItem.create).not.toHaveBeenCalled();
    });

    it('removes ItineraryItem and emits itinerary-updated when booking is cancelled', async () => {
      const linkedItemId = uuidv4();
      const linkedItem = {
        id: linkedItemId,
        trip_id: tripId,
        type: 'storage',
        linked_storage_booking_id: storageBookingId,
      };

      (prisma.itineraryItem.findFirst as any).mockResolvedValue(linkedItem);
      (prisma.itineraryItem.delete as any).mockResolvedValue(linkedItem);

      let receivedUpdatedEvent: any = null;
      const unsubscribe = getEventBus().subscribe<ItineraryUpdatedPayload>(
        ITINERARY_UPDATED_EVENT,
        async (event) => {
          receivedUpdatedEvent = event;
        }
      );

      await getEventBus().publish({
        id: uuidv4(),
        name: BOOKING_CANCELLED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-orch-6',
        payload: {
          bookingType: 'storage',
          bookingId: storageBookingId,
          userId: travelerId,
          tripId,
        },
      });

      unsubscribe();

      expect(prisma.itineraryItem.delete).toHaveBeenCalledWith({
        where: { id: linkedItemId },
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ITINERARY_ITEM_AUTO_UNLINKED',
          entity_type: 'ItineraryItem',
        }),
      });

      expect(receivedUpdatedEvent).not.toBeNull();
      expect(receivedUpdatedEvent.payload.action).toBe('deleted');
      expect(receivedUpdatedEvent.payload.bookingId).toBe(storageBookingId);
    });
  });

  describe('End-to-End API Integration', () => {
    it('storage booking creation via POST /api/v1/storage/bookings triggers auto-linking to trip', async () => {
      const locationId = uuidv4();
      const bookingId = uuidv4();
      const bookingMock = {
        id: bookingId,
        user_id: travelerId,
        location_id: locationId,
        trip_id: tripId,
        status: StorageBookingStatus.CONFIRMED,
        bag_count: 2,
        drop_off_at: new Date('2026-10-14T09:00:00.000Z'),
        pick_up_at: new Date('2026-10-14T17:00:00.000Z'),
        price_total: 12.0,
        currency: 'USD',
        idempotency_key: `idem-api-test-${uuidv4()}`,
        location: {
          id: locationId,
          name: 'Alexanderplatz Hub',
          lat: 52.5219,
          lng: 13.4132,
          address: 'Alexanderplatz 1, Berlin',
          is_active: true,
        },
      };

      (prisma.storageBooking.findUnique as any).mockResolvedValue(null);
      (prisma.storageLocation.findUnique as any).mockResolvedValue({
        id: locationId,
        name: 'Alexanderplatz Hub',
        lat: 52.5219,
        lng: 13.4132,
        address: 'Alexanderplatz 1, Berlin',
        is_active: true,
      });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          storageInventory: {
            findUnique: vi.fn().mockResolvedValue({
              id: uuidv4(),
              total_capacity: 30,
              booked_capacity: 0,
              price_per_bag_per_day: 6.0,
              version: 0,
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          storageBooking: {
            create: vi.fn().mockResolvedValue(bookingMock),
          },
        });
      });

      (prisma.payment.create as any).mockResolvedValue({});
      (prisma.trip.findFirst as any).mockResolvedValue({ id: tripId, user_id: travelerId, deleted_at: null });
      (prisma.itineraryItem.findFirst as any).mockResolvedValue(null);
      (prisma.itineraryItem.count as any).mockResolvedValue(1);
      (prisma.itineraryItem.create as any).mockResolvedValue({ id: uuidv4() });

      const res = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-api-test-${uuidv4()}`)
        .send({
          location_id: locationId,
          trip_id: tripId,
          bag_count: 2,
          drop_off_at: '2026-10-14T09:00:00.000Z',
          pick_up_at: '2026-10-14T17:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(bookingId);

      // Verify that orchestrator received event and auto-created itinerary item
      expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: tripId,
          linked_storage_booking_id: bookingId,
        }),
      });
    });

    it('transport booking creation via POST /api/v1/transport/bookings triggers auto-linking to trip', async () => {
      const optionId = uuidv4();
      const transportBookingId = uuidv4();
      const transportBookingMock = {
        id: transportBookingId,
        user_id: travelerId,
        transport_option_id: optionId,
        trip_id: tripId,
        status: TransportBookingStatus.CONFIRMED,
        scheduled_at: new Date('2026-10-14T18:00:00.000Z'),
        price_total: 25.0,
        currency: 'USD',
        idempotency_key: `idem-tb-api-${uuidv4()}`,
        transport_option: {
          id: optionId,
          mode: 'taxi',
          origin_lat: 52.5251,
          origin_lng: 13.3694,
          destination_lat: 52.5219,
          destination_lng: 13.4132,
          estimated_price: 25.0,
          estimated_duration_min: 15,
          provider: { name: 'Metropolitan Licensed Taxi' },
        },
      };

      (prisma.transportBooking.findUnique as any).mockResolvedValue(null);
      (prisma.transportOption.findUnique as any).mockResolvedValue({
        id: optionId,
        mode: 'taxi',
        origin_lat: 52.5251,
        origin_lng: 13.3694,
        destination_lat: 52.5219,
        destination_lng: 13.4132,
        estimated_price: 25.0,
        estimated_duration_min: 15,
        provider: { name: 'Metropolitan Licensed Taxi' },
      });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          transportBooking: {
            create: vi.fn().mockResolvedValue(transportBookingMock),
          },
        });
      });

      (prisma.payment.create as any).mockResolvedValue({});
      (prisma.trip.findFirst as any).mockResolvedValue({ id: tripId, user_id: travelerId, deleted_at: null });
      (prisma.itineraryItem.findFirst as any).mockResolvedValue(null);
      (prisma.itineraryItem.count as any).mockResolvedValue(2);
      (prisma.itineraryItem.create as any).mockResolvedValue({ id: uuidv4() });

      const res = await request(app)
        .post('/api/v1/transport/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-tb-api-${uuidv4()}`)
        .send({
          transport_option_id: optionId,
          trip_id: tripId,
          origin_lat: 52.5251,
          origin_lng: 13.3694,
          dest_lat: 52.5219,
          dest_lng: 13.4132,
          scheduled_at: '2026-10-14T18:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.booking.id).toBe(transportBookingId);

      // Verify orchestrator created itinerary item with linked transport booking
      expect(prisma.itineraryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trip_id: tripId,
          linked_transport_booking_id: transportBookingId,
        }),
      });
    });
  });
});
