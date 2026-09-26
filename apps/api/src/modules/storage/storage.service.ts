import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { getLocationProvider } from '../../adapters/location/index.js';
import { getPaymentsAdapter } from '../../adapters/payments/index.js';
import {
  StorageBookingStatus,
  canTransitionStorageBooking,
  Coordinates,
} from '@travel/shared';
import {
  SearchStorageLocationsQuery,
  UpdateInventoryInput,
  CreateStorageBookingInput,
} from './storage.dto.js';
import { PaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  getEventBus,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingConfirmedPayload,
  BookingCancelledPayload,
} from '../events/index.js';

export class StorageService {
  /**
   * Search storage locations near coordinates within radius, with date window,
   * capacity, bag size, opening hours, and relevance ranking.
   */
  async searchLocations(query: SearchStorageLocationsQuery) {
    const provider = getLocationProvider();
    const searchOrigin: Coordinates = { lat: query.lat, lng: query.lng };

    // Fetch active locations
    const locations = await prisma.storageLocation.findMany({
      where: {
        is_active: true,
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      },
      include: {
        provider: {
          select: {
            business_name: true,
            verification_status: true,
          },
        },
        inventories: {
          where: query.drop_off_at && query.pick_up_at
            ? {
                date: {
                  gte: new Date(new Date(query.drop_off_at).setUTCHours(0, 0, 0, 0)),
                  lte: new Date(new Date(query.pick_up_at).setUTCHours(0, 0, 0, 0)),
                },
              }
            : undefined,
          orderBy: { date: 'asc' },
        },
      },
    });

    const datesNeeded = query.drop_off_at && query.pick_up_at
      ? this.getDatesInRange(new Date(query.drop_off_at), new Date(query.pick_up_at))
      : [];

    const enriched = await Promise.all(
      locations.map(async (loc) => {
        // 1. Calculate distance
        const dist = await provider.distance(searchOrigin, { lat: loc.lat, lng: loc.lng });
        if (dist.distanceKm > query.radius_km) {
          return null;
        }

        // 2. Filter item size
        if (query.item_size) {
          const maxBag = (loc.max_bag_size || '').toLowerCase();
          if (query.item_size === 'oversized' && maxBag !== 'oversized') {
            return null;
          }
          if (query.item_size === 'large' && maxBag === 'cabin') {
            return null;
          }
        }

        // 3. Opening hours verification
        if (query.drop_off_at && loc.opening_hours) {
          const isOpen = this.checkOpeningHours(loc.opening_hours, new Date(query.drop_off_at));
          if (!isOpen) {
            return null;
          }
        }

        // 4. Capacity & Pricing check across dates
        let dailyPrice = 6.0; // default base price
        let totalPrice = 6.0;
        let hasCapacity = true;
        let availableCapacity = 99;

        if (datesNeeded.length > 0) {
          let sumPrice = 0;
          for (const dateStr of datesNeeded) {
            const inv = loc.inventories.find(
              (i) => i.date.toISOString().split('T')[0] === dateStr
            );
            if (!inv) {
              // Default available if no specific override
              sumPrice += 6.0;
              availableCapacity = Math.min(availableCapacity, 20);
            } else {
              const rem = inv.total_capacity - inv.booked_capacity;
              availableCapacity = Math.min(availableCapacity, rem);
              if (rem < query.bag_count) {
                hasCapacity = false;
                break;
              }
              const p = Number(inv.price_per_bag_per_day);
              sumPrice += p;
              dailyPrice = p;
            }
          }

          if (!hasCapacity) {
            return null;
          }
          totalPrice = sumPrice * query.bag_count;
        } else if (loc.inventories.length > 0) {
          dailyPrice = Number(loc.inventories[0].price_per_bag_per_day);
          totalPrice = dailyPrice * query.bag_count;
          availableCapacity = loc.inventories[0].total_capacity - loc.inventories[0].booked_capacity;
        }

        // 5. Max price filter
        if (query.max_price && totalPrice > query.max_price) {
          return null;
        }

        // 6. Walking time estimation
        const walking = await provider.estimateWalkingTime(searchOrigin, {
          lat: loc.lat,
          lng: loc.lng,
        });

        // 7. Rating score (default 4.8 from seed data)
        const rating = 4.8;
        const reviewCount = 24;

        // 8. Relevance Score calculation
        // Distance score (closer = higher, up to 10km)
        const distanceScore = Math.max(0, 1 - dist.distanceKm / query.radius_km);
        // Price score (cheaper = higher, normalized against $30)
        const priceScore = Math.max(0, 1 - dailyPrice / 30);
        // Rating score (higher = higher, out of 5)
        const ratingScore = rating / 5.0;

        // Weighted composite score (50% distance, 30% rating, 20% price)
        const relevanceScore = Math.round(
          (0.5 * distanceScore + 0.3 * ratingScore + 0.2 * priceScore) * 100
        ) / 100;

        return {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          lat: loc.lat,
          lng: loc.lng,
          distance_meters: dist.distanceMeters,
          distance_km: dist.distanceKm,
          walking_time: {
            duration_minutes: walking.walkingDurationMinutes,
            formatted_duration: walking.formattedDuration,
          },
          opening_hours: loc.opening_hours,
          accepted_item_categories: loc.accepted_item_categories,
          max_bag_size: loc.max_bag_size,
          photos: loc.photos,
          price_per_bag_per_day: dailyPrice,
          total_price: totalPrice,
          available_capacity: availableCapacity,
          rating,
          review_count: reviewCount,
          relevance_score: relevanceScore,
          provider: {
            business_name: loc.provider.business_name,
            verification_status: loc.provider.verification_status,
          },
        };
      })
    );

    // Filter out nulls and sort by relevance descending
    const filtered = enriched.filter((item): item is NonNullable<typeof item> => item !== null);
    filtered.sort((a, b) => b.relevance_score - a.relevance_score || a.distance_meters - b.distance_meters);

    // Pagination
    const page = query.page;
    const limit = query.limit;
    const total = filtered.length;
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

    return formatPaginatedResponse(paginatedItems, total, page, limit);
  }

  /**
   * Get location details by ID, including 14-day upcoming inventory.
   */
  async getLocationById(locationId: string, fromCoord?: Coordinates) {
    const loc = await prisma.storageLocation.findUnique({
      where: { id: locationId },
      include: {
        provider: {
          select: {
            business_name: true,
            verification_status: true,
          },
        },
        inventories: {
          where: {
            date: {
              gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
            },
          },
          orderBy: { date: 'asc' },
          take: 14,
        },
      },
    });

    if (!loc) {
      throw new AppError('Storage location not found.', 404, 'NOT_FOUND');
    }

    let walkingTime = null;
    let distance = null;

    if (fromCoord) {
      const provider = getLocationProvider();
      distance = await provider.distance(fromCoord, { lat: loc.lat, lng: loc.lng });
      walkingTime = await provider.estimateWalkingTime(fromCoord, { lat: loc.lat, lng: loc.lng });
    }

    return {
      ...loc,
      distance,
      walking_time: walkingTime,
      rating: 4.8,
      review_count: 24,
    };
  }

  /**
   * Partner inventory management: set/update capacity and pricing per date.
   */
  async updateInventory(
    partnerUserId: string,
    locationId: string,
    input: UpdateInventoryInput,
    correlationId: string,
    userRole: string
  ) {
    const location = await prisma.storageLocation.findUnique({
      where: { id: locationId },
      include: {
        provider: {
          include: { partner_account: true },
        },
      },
    });

    if (!location) {
      throw new AppError('Storage location not found.', 404, 'NOT_FOUND');
    }

    // Role check: Only owner partner or admin can update inventory
    if (userRole !== 'admin' && location.provider.partner_account.user_id !== partnerUserId) {
      throw new AppError('You do not have permission to manage inventory for this location.', 403, 'FORBIDDEN');
    }

    // Upsert each inventory record in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of input.inventories) {
        const itemDate = new Date(`${item.date}T00:00:00.000Z`);
        const res = await tx.storageInventory.upsert({
          where: {
            location_id_date: {
              location_id: locationId,
              date: itemDate,
            },
          },
          update: {
            total_capacity: item.total_capacity,
            price_per_bag_per_day: item.price_per_bag_per_day,
            version: { increment: 1 },
          },
          create: {
            location_id: locationId,
            date: itemDate,
            total_capacity: item.total_capacity,
            price_per_bag_per_day: item.price_per_bag_per_day,
            booked_capacity: 0,
            version: 0,
          },
        });
        results.push(res);
      }
      return results;
    });

    await recordAuditEvent({
      actorUserId: partnerUserId,
      action: 'STORAGE_INVENTORY_UPDATED',
      entityType: 'StorageLocation',
      entityId: locationId,
      beforeState: null,
      afterState: { updated_count: updated.length, items: input.inventories },
      correlationId,
    });

    return { message: 'Inventory updated successfully.', count: updated.length, data: updated };
  }

  /**
   * Idempotent booking creation with atomic capacity check-and-decrement transaction.
   * Prevents overbooking under high concurrency.
   */
  async createBooking(
    userId: string,
    input: CreateStorageBookingInput,
    idempotencyKey: string,
    correlationId: string
  ) {
    // 1. Idempotency Check
    const existing = await prisma.storageBooking.findUnique({
      where: { idempotency_key: idempotencyKey },
      include: { location: true },
    });

    if (existing) {
      if (existing.user_id === userId) {
        return existing;
      }
      throw new AppError('Idempotency key has already been used by another request.', 409, 'IDEMPOTENCY_CONFLICT');
    }

    const location = await prisma.storageLocation.findUnique({
      where: { id: input.location_id },
    });
    if (!location || !location.is_active) {
      throw new AppError('Storage location not available.', 404, 'LOCATION_NOT_FOUND');
    }

    const dropOff = new Date(input.drop_off_at);
    const pickUp = new Date(input.pick_up_at);
    const datesNeeded = this.getDatesInRange(dropOff, pickUp);

    // 2. Concurrency-safe atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      let totalPrice = 0;

      for (const dateStr of datesNeeded) {
        const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

        // Check if inventory row exists; if not, create initial inventory
        let inv = await tx.storageInventory.findUnique({
          where: {
            location_id_date: {
              location_id: input.location_id,
              date: dateObj,
            },
          },
        });

        if (!inv) {
          inv = await tx.storageInventory.create({
            data: {
              location_id: input.location_id,
              date: dateObj,
              total_capacity: 25,
              booked_capacity: 0,
              price_per_bag_per_day: 6.0,
              version: 0,
            },
          });
        }

        // Capacity check
        if (inv.total_capacity - inv.booked_capacity < input.bag_count) {
          throw new AppError(
            `Insufficient storage capacity on ${dateStr}. Available: ${inv.total_capacity - inv.booked_capacity}, requested: ${input.bag_count}`,
            409,
            'INSUFFICIENT_CAPACITY'
          );
        }

        // Atomic check-and-decrement with optimistic versioning to guarantee concurrency safety
        const updateResult = await tx.storageInventory.updateMany({
          where: {
            id: inv.id,
            version: inv.version,
            total_capacity: { gte: inv.booked_capacity + input.bag_count },
          },
          data: {
            booked_capacity: { increment: input.bag_count },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new AppError(
            `Concurrent booking conflict on ${dateStr}. Please retry.`,
            409,
            'CONCURRENCY_CONFLICT'
          );
        }

        totalPrice += Number(inv.price_per_bag_per_day) * input.bag_count;
      }

      // Create Booking record
      const created = await tx.storageBooking.create({
        data: {
          user_id: userId,
          location_id: input.location_id,
          trip_id: input.trip_id || null,
          status: StorageBookingStatus.CONFIRMED,
          bag_count: input.bag_count,
          drop_off_at: dropOff,
          pick_up_at: pickUp,
          price_total: totalPrice,
          currency: input.currency || 'USD',
          idempotency_key: idempotencyKey,
        },
        include: { location: true },
      });

      return created;
    });

    // 3. Process payment through external adapter (Rule #2: always through interface)
    const paymentsProvider = getPaymentsAdapter();
    const paymentResult = await paymentsProvider.createPaymentIntent({
      amount: Number(booking.price_total),
      currency: booking.currency,
      userId,
      relatedType: 'STORAGE_BOOKING',
      relatedId: booking.id,
      idempotencyKey,
    });

    // Record Payment entity
    await prisma.payment.create({
      data: {
        user_id: userId,
        related_type: 'storage_booking',
        related_id: booking.id,
        status: 'captured',
        amount: booking.price_total,
        currency: booking.currency,
        provider_ref: paymentResult.providerRef,
        idempotency_key: idempotencyKey,
      },
    });

    // 4. Audit Event logging
    await recordAuditEvent({
      actorUserId: userId,
      action: 'STORAGE_BOOKING_CREATED',
      entityType: 'StorageBooking',
      entityId: booking.id,
      beforeState: null,
      afterState: booking as unknown as Record<string, unknown>,
      correlationId,
    });

    // 5. Emit domain event for booking orchestration (booking-confirmed -> itinerary-updated)
    await getEventBus().publish<BookingConfirmedPayload>({
      id: randomUUID(),
      name: BOOKING_CONFIRMED_EVENT,
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        bookingType: 'storage',
        bookingId: booking.id,
        userId,
        tripId: booking.trip_id,
        status: booking.status,
        startsAt: booking.drop_off_at,
        endsAt: booking.pick_up_at,
        title: `Luggage Storage: ${location.name} (${booking.bag_count} bags)`,
        locationLat: location.lat,
        locationLng: location.lng,
        address: location.address,
      },
    });

    return {
      ...booking,
      payment: paymentResult,
    };
  }

  /**
   * Transition booking state with strict state machine and audit event recording.
   */
  async transitionBookingStatus(
    bookingId: string,
    userId: string,
    userRole: string,
    targetStatus: StorageBookingStatus,
    correlationId: string,
    cancellationReason?: string
  ) {
    const booking = await prisma.storageBooking.findUnique({
      where: { id: bookingId },
      include: {
        location: {
          include: {
            provider: {
              include: { partner_account: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new AppError('Storage booking not found.', 404, 'NOT_FOUND');
    }

    // Role-based authorization
    const isOwner = booking.user_id === userId;
    const isPartner = booking.location.provider.partner_account.user_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isPartner && !isAdmin) {
      throw new AppError('You are not authorized to modify this booking.', 403, 'FORBIDDEN');
    }

    // Travelers can only cancel their own bookings
    if (isOwner && !isPartner && !isAdmin && targetStatus !== StorageBookingStatus.CANCELLED) {
      throw new AppError('Travelers may only cancel their bookings.', 403, 'FORBIDDEN');
    }

    // State machine validation
    const currentStatus = booking.status as StorageBookingStatus;
    if (!canTransitionStorageBooking(currentStatus, targetStatus)) {
      throw new AppError(
        `Invalid storage booking status transition from '${currentStatus}' to '${targetStatus}'.`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If cancelling, restore booked capacity atomically
      if (targetStatus === StorageBookingStatus.CANCELLED) {
        const dates = this.getDatesInRange(booking.drop_off_at, booking.pick_up_at);
        for (const dateStr of dates) {
          const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
          await tx.storageInventory.updateMany({
            where: {
              location_id: booking.location_id,
              date: dateObj,
            },
            data: {
              booked_capacity: { decrement: booking.bag_count },
              version: { increment: 1 },
            },
          });
        }

        // Process refund via payments adapter
        const payment = await tx.payment.findFirst({
          where: { related_type: 'storage_booking', related_id: booking.id },
        });
        if (payment && payment.provider_ref) {
          await getPaymentsAdapter().refundPayment(payment.provider_ref, Number(payment.amount));
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'refunded' },
          });
        }
      }

      return tx.storageBooking.update({
        where: { id: bookingId },
        data: { status: targetStatus },
        include: { location: true },
      });
    });

    // Write AuditEvent
    await recordAuditEvent({
      actorUserId: userId,
      action: `STORAGE_BOOKING_${targetStatus.toUpperCase()}`,
      entityType: 'StorageBooking',
      entityId: bookingId,
      beforeState: { status: currentStatus },
      afterState: { status: targetStatus, reason: cancellationReason || null },
      correlationId,
    });

    if (targetStatus === StorageBookingStatus.CANCELLED) {
      await getEventBus().publish<BookingCancelledPayload>({
        id: randomUUID(),
        name: BOOKING_CANCELLED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          bookingType: 'storage',
          bookingId,
          userId,
          tripId: updated.trip_id,
        },
      });
    }

    return updated;
  }

  /**
   * List bookings belonging to a traveler.
   */
  async listUserBookings(userId: string, pagination: PaginationParams, status?: string) {
    const where: Prisma.StorageBookingWhereInput = {
      user_id: userId,
      deleted_at: null,
      ...(status ? { status: status as any } : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.storageBooking.count({ where }),
      prisma.storageBooking.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { created_at: 'desc' },
        include: {
          location: {
            select: {
              name: true,
              address: true,
              city: true,
              lat: true,
              lng: true,
              photos: true,
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(bookings, total, pagination.page, pagination.limit);
  }

  /**
   * Helper: extract array of YYYY-MM-DD dates between start and end date inclusive
   */
  private getDatesInRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    if (dates.length === 0) {
      dates.push(startDate.toISOString().split('T')[0]);
    }
    return dates;
  }

  /**
   * Helper: check if a datetime falls within location opening hours
   */
  private checkOpeningHours(openingHoursJson: any, targetTime: Date): boolean {
    if (!openingHoursJson || typeof openingHoursJson !== 'object') {
      return true;
    }
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = days[targetTime.getUTCDay()];
    const hours = openingHoursJson[dayKey];
    if (!hours || !hours.open || !hours.close) {
      return true;
    }

    const currentMins = targetTime.getUTCHours() * 60 + targetTime.getUTCMinutes();
    const [openH, openM] = hours.open.split(':').map(Number);
    const [closeH, closeM] = hours.close.split(':').map(Number);

    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    return currentMins >= openMins && currentMins <= closeMins;
  }
}

export const storageService = new StorageService();
