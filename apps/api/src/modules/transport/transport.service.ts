import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import { getTransportAdapter } from '../../adapters/transport/index.js';
import { getLocationProvider } from '../../adapters/location/index.js';
import { getPaymentsAdapter } from '../../adapters/payments/index.js';
import { paymentsService } from '../payments/payments.service.js';
import {
  TransportBookingStatus,
  TransportMode,
  Coordinates,
} from '@travel/shared';
import {
  SearchTransportOptionsQuery,
  CreateTransportBookingInput,
  HandoffTransportInput,
} from './transport.dto.js';
import { PaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { randomUUID } from 'crypto';
import {
  getEventBus,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingConfirmedPayload,
  BookingCancelledPayload,
} from '../events/index.js';

export class TransportService {
  /**
   * Discover transport options (transit directions + partner taxis/rideshare)
   * with price and duration estimates.
   */
  async searchOptions(query: SearchTransportOptionsQuery) {
    const origin: Coordinates = { lat: query.origin_lat, lng: query.origin_lng };
    const destination: Coordinates = { lat: query.dest_lat, lng: query.dest_lng };

    // 1. Calculate base distance and walking time
    const locationProvider = getLocationProvider();
    const distanceRes = await locationProvider.distance(origin, destination);
    const walkingRes = await locationProvider.estimateWalkingTime(origin, destination);

    // 2. Fetch quotes from external/mock transport adapter (transit, taxis, rideshare, micromobility)
    const transportAdapter = getTransportAdapter();
    const adapterQuotes = await transportAdapter.getQuotes({
      originLat: query.origin_lat,
      originLng: query.origin_lng,
      destLat: query.dest_lat,
      destLng: query.dest_lng,
      mode: query.mode === 'all' ? 'ALL' : (query.mode.toUpperCase() as any),
      scheduledAt: query.scheduled_at,
    });

    // 3. Query verified partner transport options in database
    const dbOptions = await prisma.transportOption.findMany({
      include: {
        provider: {
          select: {
            name: true,
            verification_status: true,
          },
        },
      },
    });

    // Combine adapter quotes and active DB options
    const enrichedOptions = [
      ...adapterQuotes.map((q) => ({
        id: q.providerId,
        provider_name: q.providerName,
        mode: q.mode,
        estimated_price: q.estimatedPrice,
        currency: q.currency,
        estimated_duration_min: q.estimatedDurationMin,
        is_direct_bookable: q.isDirectBookable,
        deep_link_url: q.deepLinkUrl || null,
        transit_steps: q.transitSteps || null,
      })),
      ...dbOptions.map((opt) => ({
        id: opt.id,
        provider_name: opt.provider.name,
        mode: opt.mode,
        estimated_price: Number(opt.estimated_price),
        currency: opt.currency,
        estimated_duration_min: opt.estimated_duration_min,
        is_direct_bookable: !opt.deep_link_url,
        deep_link_url: opt.deep_link_url || null,
        transit_steps: null,
      })),
    ];

    // Sort by duration ascending
    enrichedOptions.sort((a, b) => a.estimated_duration_min - b.estimated_duration_min);

    return {
      data: enrichedOptions,
      meta: {
        total: enrichedOptions.length,
        distance_km: distanceRes.distanceKm,
        distance_meters: distanceRes.distanceMeters,
        walking_duration: walkingRes.formattedDuration,
      },
    };
  }

  /**
   * Handle booking or handoff:
   * - Direct bookable: creates TransportBooking in DB with payment transaction.
   * - Deep-link only: logs TRANSPORT_HANDOFF audit event and returns deep link without DB booking.
   */
  async createBookingOrHandoff(
    userId: string,
    input: CreateTransportBookingInput,
    idempotencyKey: string,
    correlationId: string
  ) {
    // 1. Idempotency Check
    const existing = await prisma.transportBooking.findUnique({
      where: { idempotency_key: idempotencyKey },
      include: { transport_option: true },
    });

    if (existing) {
      if (existing.user_id === userId) {
        return { handoff: false, booking: existing };
      }
      throw new AppError('Idempotency key has already been used by another request.', 409, 'IDEMPOTENCY_CONFLICT');
    }

    // 2. Identify Option: Check DB or Adapter Providers
    let option = await prisma.transportOption.findUnique({
      where: { id: input.transport_option_id },
      include: { provider: true },
    });

    // Check for deep-link / handoff provider
    const isUberHandoff = input.transport_option_id === 'prov-uber-mock';
    const isLimeHandoff = input.transport_option_id === 'prov-lime-mock';
    const isDeepLinkOnly = isUberHandoff || isLimeHandoff || Boolean(option?.deep_link_url);

    if (isDeepLinkOnly) {
      // Handoff Flow: Do NOT create a booking in DB. Log audit event and return deep link.
      const deepLink =
        option?.deep_link_url ||
        (isUberHandoff
          ? `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${input.origin_lat || 52.52}&pickup[longitude]=${input.origin_lng || 13.4}&dropoff[latitude]=${input.dest_lat || 52.36}&dropoff[longitude]=${input.dest_lng || 13.5}`
          : 'https://lime.bike/ride');

      const providerName = option?.provider?.name || (isUberHandoff ? 'Uber' : 'Lime');

      await recordAuditEvent({
        actorUserId: userId,
        action: 'TRANSPORT_HANDOFF',
        entityType: 'TransportOption',
        entityId: input.transport_option_id,
        beforeState: null,
        afterState: {
          provider_name: providerName,
          deep_link_url: deepLink,
          scheduled_at: input.scheduled_at,
          trip_id: input.trip_id || null,
        },
        correlationId,
      });

      return {
        handoff: true,
        provider_name: providerName,
        deep_link_url: deepLink,
        message: `Handoff initiated to ${providerName}. Redirecting to app.`,
      };
    }

    // 3. Direct Booking Flow: Ensure DB record exists
    if (!option) {
      // Find or create default partner for direct bookable mock options
      let partner = await prisma.transportProvider.findFirst();
      if (!partner) {
        // Fallback default
        let partnerAccount = await prisma.partnerAccount.findFirst({
          where: { type: 'transport' },
        });
        if (!partnerAccount) {
          const user = await prisma.user.findFirst({ where: { role: 'partner_transport' } });
          partnerAccount = await prisma.partnerAccount.create({
            data: {
              user_id: user ? user.id : userId,
              type: 'transport',
              status: 'verified',
            },
          });
        }
        partner = await prisma.transportProvider.create({
          data: {
            partner_account_id: partnerAccount.id,
            name: 'Metropolitan Licensed Taxi & Transit',
            modes_supported: ['taxi', 'transit'],
            verification_status: 'verified',
          },
        });
      }

      const isTransit = input.transport_option_id === 'prov-metro-transit';
      option = await prisma.transportOption.create({
        data: {
          id: input.transport_option_id.startsWith('prov-') ? undefined : input.transport_option_id,
          provider_id: partner.id,
          mode: isTransit ? TransportMode.TRANSIT : TransportMode.TAXI,
          origin_lat: input.origin_lat || 52.52,
          origin_lng: input.origin_lng || 13.4,
          destination_lat: input.dest_lat || 52.36,
          destination_lng: input.dest_lng || 13.5,
          estimated_price: isTransit ? 3.6 : 28.0,
          currency: input.currency || 'USD',
          estimated_duration_min: isTransit ? 24 : 16,
        },
        include: { provider: true },
      });
    }

    const isDelayedWebhook = input.test_flag === 'simulate_delayed_webhook';
    const targetStatus = isDelayedWebhook ? TransportBookingStatus.PENDING : TransportBookingStatus.CONFIRMED;

    // 4. Process Payment FIRST -> Booking Creation -> Compensation Refund on Failure
    const paymentResult = await paymentsService.executeBookingPayment({
      userId,
      amount: Number(option.estimated_price),
      currency: input.currency || option.currency || 'USD',
      relatedType: 'transport_booking',
      idempotencyKey,
      testFlag: input.test_flag,
      isDelayedWebhook,
      correlationId,
      createBookingFn: async (paymentRef) => {
        return await prisma.$transaction(async (tx) => {
          const created = await tx.transportBooking.create({
            data: {
              user_id: userId,
              transport_option_id: option!.id,
              trip_id: input.trip_id || null,
              status: targetStatus,
              scheduled_at: new Date(input.scheduled_at),
              price_total: option!.estimated_price,
              currency: input.currency || 'USD',
              idempotency_key: idempotencyKey,
            },
            include: { transport_option: true },
          });

          return created;
        });
      },
    });

    const booking = paymentResult.booking;

    // 5. Audit Trail
    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRANSPORT_BOOKING_CREATED',
      entityType: 'TransportBooking',
      entityId: booking.id,
      beforeState: null,
      afterState: booking as unknown as Record<string, unknown>,
      correlationId,
    });

    // 6. Emit domain event for booking orchestration (booking-confirmed -> itinerary-updated)
    if (booking.status === TransportBookingStatus.CONFIRMED) {
      const durationMin = option.estimated_duration_min || 30;
      const endsAt = new Date(booking.scheduled_at.getTime() + durationMin * 60000);
      const providerName =
        option.provider?.name ||
        (option.mode === TransportMode.TRANSIT ? 'City Public Transit' : 'Partner Taxi');

      await getEventBus().publish<BookingConfirmedPayload>({
        id: randomUUID(),
        name: BOOKING_CONFIRMED_EVENT,
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          bookingType: 'transport',
          bookingId: booking.id,
          userId,
          tripId: booking.trip_id,
          status: booking.status,
          startsAt: booking.scheduled_at,
          endsAt,
          title: `Transfer: ${providerName} (${option.mode})`,
          locationLat: option.origin_lat ?? null,
          locationLng: option.origin_lng ?? null,
          address:
            input.notes ||
            (option.origin_lat != null && option.origin_lng != null
              ? `Pick-up from ${option.origin_lat.toFixed(4)}, ${option.origin_lng.toFixed(4)}`
              : 'Pick-up point'),
        },
      });
    }

    return {
      handoff: false,
      booking,
      payment: paymentResult.payment,
    };
  }

  /**
   * Log an explicit handoff event when user opens deep link
   */
  async recordHandoff(userId: string, input: HandoffTransportInput, correlationId: string) {
    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRANSPORT_HANDOFF',
      entityType: 'TransportOption',
      entityId: input.provider_name,
      beforeState: null,
      afterState: {
        provider_name: input.provider_name,
        deep_link_url: input.deep_link_url,
        mode: input.mode || null,
        trip_id: input.trip_id || null,
      },
      correlationId,
    });

    return {
      message: 'Handoff event recorded.',
      deep_link_url: input.deep_link_url,
    };
  }

  /**
   * Cancel direct transport booking and trigger refund
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: string,
    correlationId: string,
    reason?: string
  ) {
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      include: { transport_option: true },
    });

    if (!booking) {
      throw new AppError('Transport booking not found.', 404, 'NOT_FOUND');
    }

    if (booking.user_id !== userId && userRole !== 'admin') {
      throw new AppError('You are not authorized to cancel this booking.', 403, 'FORBIDDEN');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Refund payment
      const payment = await tx.payment.findFirst({
        where: { related_type: 'transport_booking', related_id: booking.id },
      });
      if (payment && payment.provider_ref) {
        await getPaymentsAdapter().refund(payment.provider_ref, Number(payment.amount));
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'refunded' },
        });
      }

      return tx.transportBooking.update({
        where: { id: bookingId },
        data: { status: TransportBookingStatus.CANCELLED },
        include: { transport_option: true },
      });
    });

    await recordAuditEvent({
      actorUserId: userId,
      action: 'TRANSPORT_BOOKING_CANCELLED',
      entityType: 'TransportBooking',
      entityId: bookingId,
      beforeState: { status: booking.status },
      afterState: { status: TransportBookingStatus.CANCELLED, reason: reason || null },
      correlationId,
    });

    await getEventBus().publish<BookingCancelledPayload>({
      id: randomUUID(),
      name: BOOKING_CANCELLED_EVENT,
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        bookingType: 'transport',
        bookingId,
        userId,
        tripId: updated.trip_id,
      },
    });

    return updated;
  }

  /**
   * List transport bookings for user
   */
  async listUserBookings(userId: string, pagination: PaginationParams, status?: string) {
    const where = {
      user_id: userId,
      deleted_at: null,
      ...(status ? { status: status as any } : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.transportBooking.count({ where }),
      prisma.transportBooking.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { scheduled_at: 'desc' },
        include: {
          transport_option: {
            include: {
              provider: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(bookings, total, pagination.page, pagination.limit);
  }
}

export const transportService = new TransportService();
