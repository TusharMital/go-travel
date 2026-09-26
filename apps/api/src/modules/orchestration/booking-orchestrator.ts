import { randomUUID } from 'crypto';
import { prisma } from '../../prisma.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import {
  BOOKING_CANCELLED_EVENT,
  BOOKING_CONFIRMED_EVENT,
  BookingCancelledPayload,
  BookingConfirmedPayload,
  DomainEvent,
  getEventBus,
  ITINERARY_UPDATED_EVENT,
  ItineraryUpdatedPayload,
} from '../events/index.js';
import { ItineraryItemType } from '@travel/shared';

export class BookingOrchestrator {
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      return;
    }

    const eventBus = getEventBus();

    eventBus.subscribe<BookingConfirmedPayload>(
      BOOKING_CONFIRMED_EVENT,
      async (event) => {
        await this.handleBookingConfirmed(event);
      }
    );

    eventBus.subscribe<BookingCancelledPayload>(
      BOOKING_CANCELLED_EVENT,
      async (event) => {
        await this.handleBookingCancelled(event);
      }
    );

    this.initialized = true;
  }

  /**
   * Orchestrates auto-insert or update of ItineraryItem when a booking is confirmed.
   */
  async handleBookingConfirmed(
    event: DomainEvent<BookingConfirmedPayload>
  ): Promise<void> {
    if (!prisma?.trip?.findFirst || !prisma?.itineraryItem?.findFirst) {
      return;
    }

    const {
      bookingType,
      bookingId,
      userId,
      tripId,
      startsAt,
      endsAt,
      title,
      locationLat,
      locationLng,
      address,
    } = event.payload;

    let targetTripId = tripId;

    // If tripId was not provided, check if user has an active trip that covers this booking
    if (!targetTripId) {
      const startsDate = new Date(startsAt);
      const matchingTrip = await prisma.trip.findFirst({
        where: {
          user_id: userId,
          deleted_at: null,
          start_date: { lte: startsDate },
          end_date: { gte: startsDate },
        },
        orderBy: { created_at: 'desc' },
      });

      if (matchingTrip) {
        targetTripId = matchingTrip.id;

        // Associate booking with this trip in the database
        if (bookingType === 'storage') {
          await prisma.storageBooking.update({
            where: { id: bookingId },
            data: { trip_id: matchingTrip.id },
          });
        } else if (bookingType === 'transport') {
          await prisma.transportBooking.update({
            where: { id: bookingId },
            data: { trip_id: matchingTrip.id },
          });
        }
      }
    }

    // If no trip could be linked, exit safely
    if (!targetTripId) {
      return;
    }

    // Verify trip exists
    const trip = await prisma.trip.findFirst({
      where: { id: targetTripId, deleted_at: null },
    });
    if (!trip) {
      return;
    }

    // Check if an ItineraryItem is already linked to this booking
    const existingItem = await prisma.itineraryItem.findFirst({
      where: {
        trip_id: targetTripId,
        ...(bookingType === 'storage'
          ? { linked_storage_booking_id: bookingId }
          : { linked_transport_booking_id: bookingId }),
      },
    });

    const eventBus = getEventBus();

    if (existingItem) {
      // 1. UPDATE EXISTING ITINERARY ITEM
      const updated = await prisma.itineraryItem.update({
        where: { id: existingItem.id },
        data: {
          title,
          starts_at: new Date(startsAt),
          ends_at: new Date(endsAt),
          location_lat: locationLat !== undefined ? locationLat : existingItem.location_lat,
          location_lng: locationLng !== undefined ? locationLng : existingItem.location_lng,
          address: address !== undefined ? address : existingItem.address,
        },
      });

      await recordAuditEvent({
        actorUserId: userId,
        action: 'ITINERARY_ITEM_AUTO_UPDATED',
        entityType: 'ItineraryItem',
        entityId: updated.id,
        beforeState: existingItem as unknown as Record<string, unknown>,
        afterState: updated as unknown as Record<string, unknown>,
        correlationId: event.correlationId || randomUUID(),
      });

      await eventBus.publish<ItineraryUpdatedPayload>({
        id: randomUUID(),
        name: ITINERARY_UPDATED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: event.correlationId,
        payload: {
          tripId: targetTripId,
          itineraryItemId: updated.id,
          action: 'updated',
          bookingType,
          bookingId,
        },
      });
    } else {
      // 2. AUTO-INSERT NEW ITINERARY ITEM
      const count = await prisma.itineraryItem.count({
        where: { trip_id: targetTripId },
      });

      const itemType =
        bookingType === 'storage'
          ? ItineraryItemType.STORAGE
          : ItineraryItemType.TRANSPORT;

      const created = await prisma.itineraryItem.create({
        data: {
          trip_id: targetTripId,
          type: itemType,
          title,
          starts_at: new Date(startsAt),
          ends_at: new Date(endsAt),
          location_lat: locationLat ?? null,
          location_lng: locationLng ?? null,
          address: address ?? null,
          sequence_order: count,
          linked_storage_booking_id: bookingType === 'storage' ? bookingId : null,
          linked_transport_booking_id: bookingType === 'transport' ? bookingId : null,
        },
      });

      await recordAuditEvent({
        actorUserId: userId,
        action: 'ITINERARY_ITEM_AUTO_LINKED',
        entityType: 'ItineraryItem',
        entityId: created.id,
        beforeState: null,
        afterState: created as unknown as Record<string, unknown>,
        correlationId: event.correlationId || randomUUID(),
      });

      await eventBus.publish<ItineraryUpdatedPayload>({
        id: randomUUID(),
        name: ITINERARY_UPDATED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId: event.correlationId,
        payload: {
          tripId: targetTripId,
          itineraryItemId: created.id,
          action: 'created',
          bookingType,
          bookingId,
        },
      });
    }
  }

  /**
   * Orchestrates removal or unlinking of ItineraryItem when a booking is cancelled.
   */
  async handleBookingCancelled(
    event: DomainEvent<BookingCancelledPayload>
  ): Promise<void> {
    if (!prisma?.itineraryItem?.findFirst) {
      return;
    }

    const { bookingType, bookingId, userId } = event.payload;

    const existingItem = await prisma.itineraryItem.findFirst({
      where: {
        ...(bookingType === 'storage'
          ? { linked_storage_booking_id: bookingId }
          : { linked_transport_booking_id: bookingId }),
      },
    });

    if (!existingItem) {
      return;
    }

    // Delete the itinerary stop so the timeline gap opens up again
    await prisma.itineraryItem.delete({
      where: { id: existingItem.id },
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'ITINERARY_ITEM_AUTO_UNLINKED',
      entityType: 'ItineraryItem',
      entityId: existingItem.id,
      beforeState: existingItem as unknown as Record<string, unknown>,
      afterState: { deleted: true },
      correlationId: event.correlationId || randomUUID(),
    });

    const eventBus = getEventBus();
    await eventBus.publish<ItineraryUpdatedPayload>({
      id: randomUUID(),
      name: ITINERARY_UPDATED_EVENT,
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      payload: {
        tripId: existingItem.trip_id,
        itineraryItemId: existingItem.id,
        action: 'deleted',
        bookingType,
        bookingId,
      },
    });
  }
}

export const bookingOrchestrator = new BookingOrchestrator();

export function initBookingOrchestrator(): BookingOrchestrator {
  bookingOrchestrator.init();
  return bookingOrchestrator;
}
