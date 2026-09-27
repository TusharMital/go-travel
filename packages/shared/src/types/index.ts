/**
 * Core Domain Enums and Type Definitions
 */

export enum UserRole {
  TRAVELER = 'traveler',
  PARTNER_STORAGE = 'partner_storage',
  PARTNER_TRANSPORT = 'partner_transport',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

export enum PartnerType {
  STORAGE = 'storage',
  TRANSPORT = 'transport',
  BOTH = 'both',
}

export enum PartnerStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

export enum TripStatus {
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ItineraryItemType {
  FLIGHT = 'flight',
  HOTEL = 'hotel',
  ACTIVITY = 'activity',
  STORAGE = 'storage',
  TRANSPORT = 'transport',
}

export enum StorageBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum TransportMode {
  TAXI = 'taxi',
  RIDESHARE = 'rideshare',
  TRANSIT = 'transit',
  BIKE = 'bike',
}

export enum TransportBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentRelatedType {
  STORAGE_BOOKING = 'storage_booking',
  TRANSPORT_BOOKING = 'transport_booking',
}

export enum PaymentStatus {
  INTENT = 'intent',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum ReviewRelatedType {
  STORAGE_LOCATION = 'storage_location',
  TRANSPORT_OPTION = 'transport_option',
  PLATFORM = 'platform',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
}

export interface IAuditLogData {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  correlationId: string;
  timestamp?: Date;
}

export const ALLOWED_STORAGE_TRANSITIONS: Record<StorageBookingStatus, StorageBookingStatus[]> = {
  [StorageBookingStatus.PENDING]: [
    StorageBookingStatus.CONFIRMED,
    StorageBookingStatus.CANCELLED,
    StorageBookingStatus.EXPIRED,
  ],
  [StorageBookingStatus.CONFIRMED]: [
    StorageBookingStatus.CHECKED_IN,
    StorageBookingStatus.CANCELLED,
  ],
  [StorageBookingStatus.CHECKED_IN]: [
    StorageBookingStatus.CHECKED_OUT,
  ],
  [StorageBookingStatus.CHECKED_OUT]: [],
  [StorageBookingStatus.CANCELLED]: [],
  [StorageBookingStatus.EXPIRED]: [],
};

export function canTransitionStorageBooking(
  fromStatus: StorageBookingStatus,
  toStatus: StorageBookingStatus
): boolean {
  const allowed = ALLOWED_STORAGE_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export const ALLOWED_TRANSPORT_TRANSITIONS: Record<TransportBookingStatus, TransportBookingStatus[]> = {
  [TransportBookingStatus.PENDING]: [
    TransportBookingStatus.CONFIRMED,
    TransportBookingStatus.CANCELLED,
    TransportBookingStatus.FAILED,
  ],
  [TransportBookingStatus.CONFIRMED]: [
    TransportBookingStatus.COMPLETED,
    TransportBookingStatus.CANCELLED,
  ],
  [TransportBookingStatus.COMPLETED]: [],
  [TransportBookingStatus.CANCELLED]: [],
  [TransportBookingStatus.FAILED]: [],
};

export function canTransitionTransportBooking(
  fromStatus: TransportBookingStatus,
  toStatus: TransportBookingStatus
): boolean {
  const allowed = ALLOWED_TRANSPORT_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export const ALLOWED_PARTNER_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  [PartnerStatus.PENDING]: [
    PartnerStatus.VERIFIED,
    PartnerStatus.REJECTED,
  ],
  [PartnerStatus.VERIFIED]: [
    PartnerStatus.SUSPENDED,
  ],
  [PartnerStatus.SUSPENDED]: [
    PartnerStatus.VERIFIED,
  ],
  [PartnerStatus.REJECTED]: [
    PartnerStatus.PENDING,
  ],
};

export function canTransitionPartnerStatus(
  fromStatus: PartnerStatus,
  toStatus: PartnerStatus
): boolean {
  const allowed = ALLOWED_PARTNER_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export const ALLOWED_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.PLANNING]: [
    TripStatus.CONFIRMED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.CONFIRMED]: [
    TripStatus.IN_PROGRESS,
    TripStatus.CANCELLED,
  ],
  [TripStatus.IN_PROGRESS]: [
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export function canTransitionTripStatus(
  fromStatus: TripStatus,
  toStatus: TripStatus
): boolean {
  const allowed = ALLOWED_TRIP_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

// -------------------------------------------------------------
// Pure Business Calculation Helpers: Pricing & Capacity
// -------------------------------------------------------------

/**
 * Calculates luggage storage total price based on daily bag rate, bag count, and number of calendar days.
 */
export function calculateStoragePrice(
  dailyRate: number,
  bagCount: number,
  dropOffDate: Date | string,
  pickUpDate: Date | string
): number {
  if (bagCount <= 0 || dailyRate <= 0) return 0;
  const start = new Date(dropOffDate);
  const end = new Date(pickUpDate);

  // Normalize to UTC calendar days
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const diffDays = Math.max(1, Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round(dailyRate * bagCount * diffDays * 100) / 100;
}

/**
 * Calculates platform commission and net partner payout.
 */
export function calculatePartnerPayout(
  grossAmount: number,
  commissionPercent: number = 15
): { platformFee: number; netPayout: number } {
  if (grossAmount <= 0) return { platformFee: 0, netPayout: 0 };
  const platformFee = Math.round(grossAmount * (commissionPercent / 100) * 100) / 100;
  const netPayout = Math.round((grossAmount - platformFee) * 100) / 100;
  return { platformFee, netPayout };
}

/**
 * Calculates remaining available capacity.
 */
export function calculateAvailableCapacity(totalCapacity: number, bookedCapacity: number): number {
  return Math.max(0, totalCapacity - bookedCapacity);
}

/**
 * Verifies if inventory has sufficient capacity for requested bag count.
 */
export function hasSufficientCapacity(
  totalCapacity: number,
  bookedCapacity: number,
  requestedBags: number
): boolean {
  if (requestedBags <= 0) return false;
  return calculateAvailableCapacity(totalCapacity, bookedCapacity) >= requestedBags;
}

