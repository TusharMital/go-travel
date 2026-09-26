import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import {
  CreateTripInput,
  UpdateTripInput,
  CreateItineraryItemInput,
  UpdateItineraryItemInput,
} from './trips.dto.js';
import { PaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { ItineraryItemType } from '@travel/shared';
import { Prisma } from '@prisma/client';
import { getLocationProvider } from '../../adapters/location/index.js';

export interface ItineraryGap {
  id: string;
  gapType: 'ARRIVAL_GAP' | 'DEPARTURE_GAP' | 'TIMELINE_GAP';
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  durationFormatted: string;
  recommendedLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  hasStorageBooked: boolean;
  hasTransportBooked: boolean;
  recommendationAction: 'BOOK_STORAGE' | 'BOOK_TRANSPORT' | 'ALL_SET';
  previousItemId?: string;
  nextItemId?: string;
}

export class TripsService {
  async createTrip(userId: string, input: CreateTripInput, correlationId: string) {
    const trip = await prisma.trip.create({
      data: {
        user_id: userId,
        title: input.title,
        origin_place: input.origin_place,
        destination_place: input.destination_place,
        start_date: new Date(input.start_date),
        end_date: new Date(input.end_date),
        timezone: input.timezone || 'UTC',
        status: input.status,
      },
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRIP_CREATED',
      entityType: 'Trip',
      entityId: trip.id,
      beforeState: null,
      afterState: trip as unknown as Record<string, unknown>,
      correlationId,
    });

    return trip;
  }

  async listTrips(
    userId: string,
    pagination: PaginationParams,
    statusFilter?: string
  ) {
    const where: Prisma.TripWhereInput = {
      user_id: userId,
      deleted_at: null,
      ...(statusFilter ? { status: statusFilter as any } : {}),
    };

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { start_date: 'asc' },
        include: {
          _count: {
            select: {
              itinerary_items: true,
              storage_bookings: true,
              transport_bookings: true,
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(trips, total, pagination.page, pagination.limit);
  }

  async getTripById(tripId: string, userId: string, userRole: string = 'traveler') {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        deleted_at: null,
        ...(userRole === 'admin' || userRole === 'support' ? {} : { user_id: userId }),
      },
      include: {
        itinerary_items: {
          orderBy: [{ starts_at: 'asc' }, { sequence_order: 'asc' }],
          include: {
            linked_storage_booking: {
              include: { location: true },
            },
            linked_transport_booking: {
              include: { transport_option: true },
            },
          },
        },
        storage_bookings: {
          where: { deleted_at: null },
          include: { location: true },
        },
        transport_bookings: {
          where: { deleted_at: null },
          include: { transport_option: true },
        },
      },
    });

    if (!trip) {
      throw new AppError('Trip not found or you do not have permission to view it.', 404, 'NOT_FOUND');
    }

    return trip;
  }

  async updateTrip(
    tripId: string,
    userId: string,
    input: UpdateTripInput,
    correlationId: string,
    userRole: string = 'traveler'
  ) {
    const existing = await this.getTripById(tripId, userId, userRole);

    const updateData: Prisma.TripUpdateInput = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.origin_place !== undefined) updateData.origin_place = input.origin_place;
    if (input.destination_place !== undefined) updateData.destination_place = input.destination_place;
    if (input.start_date !== undefined) updateData.start_date = new Date(input.start_date);
    if (input.end_date !== undefined) updateData.end_date = new Date(input.end_date);
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRIP_UPDATED',
      entityType: 'Trip',
      entityId: tripId,
      beforeState: existing as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
      correlationId,
    });

    return updated;
  }

  async deleteTrip(tripId: string, userId: string, correlationId: string, userRole: string = 'traveler') {
    const existing = await this.getTripById(tripId, userId, userRole);

    const softDeleted = await prisma.trip.update({
      where: { id: tripId },
      data: { deleted_at: new Date() },
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRIP_DELETED',
      entityType: 'Trip',
      entityId: tripId,
      beforeState: { id: existing.id, deleted_at: null },
      afterState: { id: existing.id, deleted_at: softDeleted.deleted_at },
      correlationId,
    });

    return { message: 'Trip deleted successfully.' };
  }

  // Itinerary Item CRUD
  async addItineraryItem(
    tripId: string,
    userId: string,
    input: CreateItineraryItemInput,
    correlationId: string,
    userRole: string = 'traveler'
  ) {
    await this.getTripById(tripId, userId, userRole);

    let lat = input.location_lat;
    let lng = input.location_lng;
    let address = input.address;

    // Automatically resolve coordinates via LocationProvider if address is provided
    if ((lat === undefined || lng === undefined) && address) {
      try {
        const geo = await getLocationProvider().geocode(address);
        lat = geo.lat;
        lng = geo.lng;
        if (!address) address = geo.formattedAddress;
      } catch {
        // Fall back gracefully to provided input
      }
    }

    const item = await prisma.itineraryItem.create({
      data: {
        trip_id: tripId,
        type: input.type,
        title: input.title,
        location_lat: lat,
        location_lng: lng,
        address,
        starts_at: new Date(input.starts_at),
        ends_at: new Date(input.ends_at),
        sequence_order: input.sequence_order,
        linked_storage_booking_id: input.linked_storage_booking_id || null,
        linked_transport_booking_id: input.linked_transport_booking_id || null,
      },
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'ITINERARY_ITEM_CREATED',
      entityType: 'ItineraryItem',
      entityId: item.id,
      beforeState: null,
      afterState: item as unknown as Record<string, unknown>,
      correlationId,
    });

    return item;
  }

  async updateItineraryItem(
    tripId: string,
    itemId: string,
    userId: string,
    input: UpdateItineraryItemInput,
    correlationId: string,
    userRole: string = 'traveler'
  ) {
    await this.getTripById(tripId, userId, userRole);

    const existing = await prisma.itineraryItem.findFirst({
      where: { id: itemId, trip_id: tripId },
    });

    if (!existing) {
      throw new AppError('Itinerary item not found on this trip.', 404, 'NOT_FOUND');
    }

    const updateData: Prisma.ItineraryItemUpdateInput = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.location_lat !== undefined) updateData.location_lat = input.location_lat;
    if (input.location_lng !== undefined) updateData.location_lng = input.location_lng;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.starts_at !== undefined) updateData.starts_at = new Date(input.starts_at);
    if (input.ends_at !== undefined) updateData.ends_at = new Date(input.ends_at);
    if (input.sequence_order !== undefined) updateData.sequence_order = input.sequence_order;
    if (input.linked_storage_booking_id !== undefined)
      updateData.linked_storage_booking = input.linked_storage_booking_id
        ? { connect: { id: input.linked_storage_booking_id } }
        : { disconnect: true };
    if (input.linked_transport_booking_id !== undefined)
      updateData.linked_transport_booking = input.linked_transport_booking_id
        ? { connect: { id: input.linked_transport_booking_id } }
        : { disconnect: true };

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: updateData,
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'ITINERARY_ITEM_UPDATED',
      entityType: 'ItineraryItem',
      entityId: itemId,
      beforeState: existing as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
      correlationId,
    });

    return updated;
  }

  async deleteItineraryItem(
    tripId: string,
    itemId: string,
    userId: string,
    correlationId: string,
    userRole: string = 'traveler'
  ) {
    await this.getTripById(tripId, userId, userRole);

    const existing = await prisma.itineraryItem.findFirst({
      where: { id: itemId, trip_id: tripId },
    });

    if (!existing) {
      throw new AppError('Itinerary item not found on this trip.', 404, 'NOT_FOUND');
    }

    await prisma.itineraryItem.delete({
      where: { id: itemId },
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'ITINERARY_ITEM_DELETED',
      entityType: 'ItineraryItem',
      entityId: itemId,
      beforeState: existing as unknown as Record<string, unknown>,
      afterState: null,
      correlationId,
    });

    return { message: 'Itinerary item removed.' };
  }

  // Auto-Detect Itinerary Gaps
  async detectItineraryGaps(tripId: string, userId: string, userRole: string = 'traveler'): Promise<ItineraryGap[]> {
    const trip = await this.getTripById(tripId, userId, userRole);
    const items = trip.itinerary_items;
    const gaps: ItineraryGap[] = [];

    if (items.length < 2) {
      return gaps;
    }

    // Existing active storage bookings for this trip
    const activeStorageBookings = trip.storage_bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'checked_in'
    );

    // Format minutes helper
    const formatDuration = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m} mins`;
      if (m === 0) return `${h} hrs`;
      return `${h} hrs ${m} mins`;
    };

    // Check consecutive items for time gaps
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      const currentEnd = new Date(current.ends_at).getTime();
      const nextStart = new Date(next.starts_at).getTime();

      const diffMs = nextStart - currentEnd;
      const diffMins = Math.round(diffMs / 60000);

      // Only consider gaps of at least 60 minutes
      if (diffMins >= 60) {
        let gapType: 'ARRIVAL_GAP' | 'DEPARTURE_GAP' | 'TIMELINE_GAP' = 'TIMELINE_GAP';
        let title = `Timeline Gap (${formatDuration(diffMins)})`;
        let description = `Unscheduled window between ${current.title} and ${next.title}.`;

        // Check if arrival gap: current is flight/transit, next is hotel
        const isArrival =
          current.type === ItineraryItemType.FLIGHT ||
          current.type === ItineraryItemType.TRANSPORT ||
          (current.type as string).toLowerCase() === 'flight' ||
          (current.type as string).toLowerCase() === 'transport';

        const isHotelNext =
          next.type === ItineraryItemType.HOTEL ||
          (next.type as string).toLowerCase() === 'hotel';

        const isHotelCurrent =
          current.type === ItineraryItemType.HOTEL ||
          (current.type as string).toLowerCase() === 'hotel';

        const isDepartureNext =
          next.type === ItineraryItemType.FLIGHT ||
          next.type === ItineraryItemType.TRANSPORT ||
          (next.type as string).toLowerCase() === 'flight' ||
          (next.type as string).toLowerCase() === 'transport';

        if (isArrival && isHotelNext) {
          gapType = 'ARRIVAL_GAP';
          title = `Arrival-to-Check-in Gap (${formatDuration(diffMins)})`;
          description = `You arrive at ${new Date(current.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, but accommodation check-in isn't until ${new Date(next.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Store luggage to explore freely.`;
        } else if (isHotelCurrent && isDepartureNext) {
          // Check-out to departure gap
          gapType = 'DEPARTURE_GAP';
          title = `Checkout-to-Departure Gap (${formatDuration(diffMins)})`;
          description = `You check out at ${new Date(current.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, but your departure isn't until ${new Date(next.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Stash luggage and enjoy your final day.`;
        }

        // Determine if storage or transport is already booked during this window
        const hasStorageItem = items.some(
          (item) =>
            (item.type === ItineraryItemType.STORAGE || (item.type as string).toLowerCase() === 'storage') &&
            new Date(item.starts_at).getTime() <= currentEnd &&
            new Date(item.ends_at).getTime() >= nextStart
        );

        const hasStorageBooking = activeStorageBookings.some((booking) => {
          const bDrop = new Date(booking.drop_off_at).getTime();
          const bPick = new Date(booking.pick_up_at).getTime();
          return bDrop <= currentEnd && bPick >= nextStart;
        });

        const hasStorage = hasStorageItem || hasStorageBooking;

        // Preferred location is arrival point or hotel point
        const lat = current.location_lat || next.location_lat || 52.520008;
        const lng = current.location_lng || next.location_lng || 13.404954;
        const address = current.address || next.address || trip.destination_place;

        gaps.push({
          id: `gap-${i + 1}`,
          gapType,
          title,
          description,
          startsAt: new Date(current.ends_at),
          endsAt: new Date(next.starts_at),
          durationMinutes: diffMins,
          durationFormatted: formatDuration(diffMins),
          recommendedLocation: {
            lat,
            lng,
            address,
          },
          hasStorageBooked: hasStorage,
          hasTransportBooked: false,
          recommendationAction: hasStorage ? 'ALL_SET' : 'BOOK_STORAGE',
          previousItemId: current.id,
          nextItemId: next.id,
        });
      }
    }

    return gaps;
  }
}

export const tripsService = new TripsService();
