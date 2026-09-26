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
