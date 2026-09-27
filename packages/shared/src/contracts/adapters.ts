/**
 * External Integration Interfaces & Contracts
 * Every external integration sits behind a small interface/adapter
 * so mock implementations can be swapped for real providers without touching business logic.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
}

export interface DistanceMatrixResult {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceMeters: number;
  durationSeconds: number;
}

export interface DistanceResult {
  origin: Coordinates;
  destination: Coordinates;
  distanceMeters: number;
  distanceKm: number;
}

export interface WalkingTimeResult {
  origin: Coordinates;
  destination: Coordinates;
  distanceMeters: number;
  walkingDurationMinutes: number;
  walkingDurationSeconds: number;
  formattedDuration: string;
}

export interface LocationProvider {
  name: string;
  geocode(address: string): Promise<GeocodeResult>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>;
  distance(a: Coordinates, b: Coordinates): Promise<DistanceResult>;
  estimateWalkingTime(a: Coordinates, b: Coordinates): Promise<WalkingTimeResult>;
}

export interface IMapsProvider extends LocationProvider {
  calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DistanceMatrixResult>;
}

import { PaymentStatus } from '../types/index.js';

export interface PaymentIntentInput {
  amount: number;
  currency: string;
  userId: string;
  relatedType: 'STORAGE_BOOKING' | 'TRANSPORT_BOOKING' | 'storage_booking' | 'transport_booking';
  relatedId: string;
  idempotencyKey?: string;
  testFlag?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentId: string;
  providerRef: string;
  status: PaymentStatus | 'INTENT' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'intent' | 'authorized' | 'captured' | 'failed';
  clientSecret?: string;
  errorMessage?: string;
}

export interface PaymentResult {
  paymentId: string;
  providerRef: string;
  status: PaymentStatus | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'authorized' | 'captured' | 'failed';
  clientSecret?: string;
  errorMessage?: string;
}

export interface RefundResult {
  paymentId: string;
  providerRef: string;
  status: PaymentStatus | 'REFUNDED' | 'FAILED' | 'refunded' | 'failed';
  refundedAmount: number;
  errorMessage?: string;
}

export interface PaymentProvider {
  name: string;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  capture(paymentRef: string, amount?: number): Promise<PaymentResult>;
  refund(paymentRef: string, amount?: number, reason?: string): Promise<RefundResult>;

  // Compatibility aliases
  createPaymentIntent?(input: PaymentIntentInput): Promise<PaymentResult>;
  capturePayment?(paymentRef: string): Promise<PaymentResult>;
  refundPayment?(paymentRef: string, amount?: number): Promise<RefundResult>;
}

export type IPaymentsProvider = PaymentProvider;

export interface NotificationPayload {
  toUserId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'email' | 'sms' | 'push' | 'in_app' | 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  template: string;
  subject?: string;
  content?: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  notificationId: string;
  channel: string;
  status: 'SENT' | 'PENDING' | 'FAILED' | 'sent' | 'pending' | 'failed';
  dispatchedAt: Date;
  providerMessageId?: string;
}

export interface NotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export type INotificationsProvider = NotificationProvider;

export interface TransitRouteStep {
  instruction: string;
  mode: 'WALK' | 'SUBWAY' | 'BUS' | 'TRAIN';
  line?: string;
  durationMinutes: number;
  distanceMeters?: number;
}

export interface TransportQuoteRequest {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode?: 'TAXI' | 'RIDESHARE' | 'TRANSIT' | 'BIKE' | 'ALL';
  scheduledAt?: string;
}

export interface TransportQuoteResponse {
  providerId: string;
  providerName: string;
  mode: string;
  estimatedPrice: number;
  currency: string;
  estimatedDurationMin: number;
  deepLinkUrl?: string;
  isDirectBookable: boolean;
  transitSteps?: TransitRouteStep[];
}

export interface ITransportProviderAdapter {
  name: string;
  getQuotes(request: TransportQuoteRequest): Promise<TransportQuoteResponse[]>;
}
