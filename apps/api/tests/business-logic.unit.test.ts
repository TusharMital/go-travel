import { describe, it, expect } from 'vitest';
import {
  StorageBookingStatus,
  TransportBookingStatus,
  PartnerStatus,
  TripStatus,
  canTransitionStorageBooking,
  canTransitionTransportBooking,
  canTransitionPartnerStatus,
  canTransitionTripStatus,
  calculateStoragePrice,
  calculatePartnerPayout,
  calculateAvailableCapacity,
  hasSufficientCapacity,
} from '@travel/shared';

describe('4.14 Unit Tests - Core Business Logic', () => {
  // -------------------------------------------------------------
  // 1. State Machine Transitions
  // -------------------------------------------------------------
  describe('1. State Machine Transition Rules', () => {
    describe('Storage Booking State Machine', () => {
      it('allows valid forward lifecycle transitions', () => {
        expect(canTransitionStorageBooking(StorageBookingStatus.PENDING, StorageBookingStatus.CONFIRMED)).toBe(true);
        expect(canTransitionStorageBooking(StorageBookingStatus.PENDING, StorageBookingStatus.CANCELLED)).toBe(true);
        expect(canTransitionStorageBooking(StorageBookingStatus.PENDING, StorageBookingStatus.EXPIRED)).toBe(true);
        expect(canTransitionStorageBooking(StorageBookingStatus.CONFIRMED, StorageBookingStatus.CHECKED_IN)).toBe(true);
        expect(canTransitionStorageBooking(StorageBookingStatus.CONFIRMED, StorageBookingStatus.CANCELLED)).toBe(true);
        expect(canTransitionStorageBooking(StorageBookingStatus.CHECKED_IN, StorageBookingStatus.CHECKED_OUT)).toBe(true);
      });

      it('strictly forbids invalid, backwards, or terminal transitions', () => {
        // Terminal states cannot transition to anything
        expect(canTransitionStorageBooking(StorageBookingStatus.CHECKED_OUT, StorageBookingStatus.CONFIRMED)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.CHECKED_OUT, StorageBookingStatus.PENDING)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.CANCELLED, StorageBookingStatus.CONFIRMED)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.CANCELLED, StorageBookingStatus.CHECKED_IN)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.EXPIRED, StorageBookingStatus.CHECKED_IN)).toBe(false);

        // Cannot skip mandatory steps (e.g. PENDING straight to CHECKED_IN or CHECKED_OUT)
        expect(canTransitionStorageBooking(StorageBookingStatus.PENDING, StorageBookingStatus.CHECKED_IN)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.PENDING, StorageBookingStatus.CHECKED_OUT)).toBe(false);
        expect(canTransitionStorageBooking(StorageBookingStatus.CONFIRMED, StorageBookingStatus.CHECKED_OUT)).toBe(false);

        // Cannot cancel once checked in
        expect(canTransitionStorageBooking(StorageBookingStatus.CHECKED_IN, StorageBookingStatus.CANCELLED)).toBe(false);
      });
    });

    describe('Transport Booking State Machine', () => {
      it('allows valid transport lifecycle progression', () => {
        expect(canTransitionTransportBooking(TransportBookingStatus.PENDING, TransportBookingStatus.CONFIRMED)).toBe(true);
        expect(canTransitionTransportBooking(TransportBookingStatus.PENDING, TransportBookingStatus.CANCELLED)).toBe(true);
        expect(canTransitionTransportBooking(TransportBookingStatus.PENDING, TransportBookingStatus.FAILED)).toBe(true);
        expect(canTransitionTransportBooking(TransportBookingStatus.CONFIRMED, TransportBookingStatus.COMPLETED)).toBe(true);
        expect(canTransitionTransportBooking(TransportBookingStatus.CONFIRMED, TransportBookingStatus.CANCELLED)).toBe(true);
      });

      it('forbids invalid transitions once completed or cancelled', () => {
        expect(canTransitionTransportBooking(TransportBookingStatus.COMPLETED, TransportBookingStatus.CONFIRMED)).toBe(false);
        expect(canTransitionTransportBooking(TransportBookingStatus.COMPLETED, TransportBookingStatus.CANCELLED)).toBe(false);
        expect(canTransitionTransportBooking(TransportBookingStatus.CANCELLED, TransportBookingStatus.CONFIRMED)).toBe(false);
        expect(canTransitionTransportBooking(TransportBookingStatus.FAILED, TransportBookingStatus.COMPLETED)).toBe(false);
      });
    });

    describe('Partner Verification State Machine', () => {
      it('allows valid partner onboarding and compliance transitions', () => {
        expect(canTransitionPartnerStatus(PartnerStatus.PENDING, PartnerStatus.VERIFIED)).toBe(true);
        expect(canTransitionPartnerStatus(PartnerStatus.PENDING, PartnerStatus.REJECTED)).toBe(true);
        expect(canTransitionPartnerStatus(PartnerStatus.VERIFIED, PartnerStatus.SUSPENDED)).toBe(true);
        expect(canTransitionPartnerStatus(PartnerStatus.SUSPENDED, PartnerStatus.VERIFIED)).toBe(true);
        expect(canTransitionPartnerStatus(PartnerStatus.REJECTED, PartnerStatus.PENDING)).toBe(true);
      });

      it('forbids illegal partner transitions', () => {
        expect(canTransitionPartnerStatus(PartnerStatus.VERIFIED, PartnerStatus.PENDING)).toBe(false);
        expect(canTransitionPartnerStatus(PartnerStatus.SUSPENDED, PartnerStatus.REJECTED)).toBe(false);
      });
    });

    describe('Trip Planning State Machine', () => {
      it('allows progressive trip status changes', () => {
        expect(canTransitionTripStatus(TripStatus.PLANNING, TripStatus.CONFIRMED)).toBe(true);
        expect(canTransitionTripStatus(TripStatus.PLANNING, TripStatus.CANCELLED)).toBe(true);
        expect(canTransitionTripStatus(TripStatus.CONFIRMED, TripStatus.IN_PROGRESS)).toBe(true);
        expect(canTransitionTripStatus(TripStatus.IN_PROGRESS, TripStatus.COMPLETED)).toBe(true);
      });

      it('forbids mutating terminal trip states', () => {
        expect(canTransitionTripStatus(TripStatus.COMPLETED, TripStatus.PLANNING)).toBe(false);
        expect(canTransitionTripStatus(TripStatus.CANCELLED, TripStatus.IN_PROGRESS)).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------
  // 2. Pricing Calculations
  // -------------------------------------------------------------
  describe('2. Pricing & Financial Calculations', () => {
    describe('Storage Price Calculations', () => {
      it('calculates price for single-day booking', () => {
        // Same calendar day = 1 day
        const price = calculateStoragePrice(6.0, 2, '2026-10-01T10:00:00Z', '2026-10-01T18:00:00Z');
        expect(price).toBe(12.0); // 6.00 * 2 bags * 1 day
      });

      it('calculates price for multi-day booking across calendar days', () => {
        // Oct 1st to Oct 3rd = 3 calendar days (Oct 1, Oct 2, Oct 3)
        const price = calculateStoragePrice(7.5, 3, '2026-10-01T10:00:00Z', '2026-10-03T16:00:00Z');
        expect(price).toBe(67.5); // 7.50 * 3 bags * 3 days
      });

      it('handles month and year boundaries cleanly', () => {
        // Dec 31 to Jan 2 = 3 calendar days
        const price = calculateStoragePrice(5.0, 1, '2026-12-31T20:00:00Z', '2027-01-02T10:00:00Z');
        expect(price).toBe(15.0); // 5.00 * 1 bag * 3 days
      });

      it('returns 0 for zero or negative bag counts or daily rates', () => {
        expect(calculateStoragePrice(6.0, 0, '2026-10-01', '2026-10-02')).toBe(0);
        expect(calculateStoragePrice(6.0, -2, '2026-10-01', '2026-10-02')).toBe(0);
        expect(calculateStoragePrice(0, 2, '2026-10-01', '2026-10-02')).toBe(0);
        expect(calculateStoragePrice(-5.0, 2, '2026-10-01', '2026-10-02')).toBe(0);
      });
    });

    describe('Partner Payout and Platform Commission Splits', () => {
      it('computes 15% platform commission and 85% net partner payout accurately', () => {
        const result = calculatePartnerPayout(100.0, 15);
        expect(result.platformFee).toBe(15.0);
        expect(result.netPayout).toBe(85.0);
      });

      it('handles fractional amounts with rounding to two decimal places', () => {
        const result = calculatePartnerPayout(33.33, 15);
        expect(result.platformFee).toBe(5.0); // 33.33 * 0.15 = 4.9995 -> 5.00
        expect(result.netPayout).toBe(28.33); // 33.33 - 5.00 = 28.33
      });

      it('handles custom commission rates', () => {
        const result = calculatePartnerPayout(250.0, 10);
        expect(result.platformFee).toBe(25.0);
        expect(result.netPayout).toBe(225.0);
      });

      it('returns zero for zero or negative gross amounts', () => {
        expect(calculatePartnerPayout(0)).toEqual({ platformFee: 0, netPayout: 0 });
        expect(calculatePartnerPayout(-50)).toEqual({ platformFee: 0, netPayout: 0 });
      });
    });
  });

  // -------------------------------------------------------------
  // 3. Capacity Checks & Inventory Rules
  // -------------------------------------------------------------
  describe('3. Capacity & Inventory Reservation Checks', () => {
    it('calculates available capacity accurately', () => {
      expect(calculateAvailableCapacity(25, 10)).toBe(15);
      expect(calculateAvailableCapacity(20, 20)).toBe(0);
      expect(calculateAvailableCapacity(30, 0)).toBe(30);
    });

    it('safely clamps available capacity to 0 when booked capacity exceeds total (defense in depth)', () => {
      expect(calculateAvailableCapacity(10, 15)).toBe(0);
    });

    it('validates sufficient capacity under boundary conditions', () => {
      // Plenty of capacity
      expect(hasSufficientCapacity(25, 5, 5)).toBe(true); // 20 available >= 5 requested

      // Exact capacity boundary
      expect(hasSufficientCapacity(10, 5, 5)).toBe(true); // 5 available == 5 requested

      // Capacity exhausted by 1 bag (boundary failure)
      expect(hasSufficientCapacity(10, 5, 6)).toBe(false); // 5 available < 6 requested

      // Zero capacity available
      expect(hasSufficientCapacity(20, 20, 1)).toBe(false);

      // Invalid requested counts
      expect(hasSufficientCapacity(20, 0, 0)).toBe(false);
      expect(hasSufficientCapacity(20, 0, -3)).toBe(false);
    });
  });
});
