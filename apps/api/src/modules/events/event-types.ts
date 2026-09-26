/**
 * Event Names & Payload Definitions
 */

export const BOOKING_CONFIRMED_EVENT = 'booking-confirmed';
export const ITINERARY_UPDATED_EVENT = 'itinerary-updated';
export const BOOKING_CANCELLED_EVENT = 'booking-cancelled';
export const PARTNER_STATUS_CHANGED_EVENT = 'partner-status-changed';

export interface BookingConfirmedPayload {
  bookingType: 'storage' | 'transport';
  bookingId: string;
  userId: string;
  tripId?: string | null;
  status: string;
  startsAt: string | Date;
  endsAt: string | Date;
  title: string;
  locationLat?: number | null;
  locationLng?: number | null;
  address?: string | null;
}

export interface ItineraryUpdatedPayload {
  tripId: string;
  itineraryItemId: string;
  action: 'created' | 'updated' | 'deleted';
  bookingType: 'storage' | 'transport';
  bookingId: string;
}

export interface BookingCancelledPayload {
  bookingType: 'storage' | 'transport';
  bookingId: string;
  userId: string;
  tripId?: string | null;
  title?: string;
  cancellationReason?: string | null;
}

export interface PartnerStatusChangedPayload {
  partnerAccountId: string;
  userId: string;
  businessName: string;
  partnerType: string;
  oldStatus: string;
  newStatus: string;
  reason?: string | null;
}
