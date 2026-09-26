/**
 * External Integration Interfaces & Contracts
 * Every external integration sits behind a small interface/adapter
 * so mock implementations can be swapped for real providers without touching business logic.
 */

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

export interface DistanceMatrixResult {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceMeters: number;
  durationSeconds: number;
}

export interface IMapsProvider {
  name: string;
  geocode(address: string): Promise<GeocodeResult>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>;
  calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<DistanceMatrixResult>;
}

export interface PaymentIntentInput {
  amount: number;
  currency: string;
  userId: string;
  relatedType: 'STORAGE_BOOKING' | 'TRANSPORT_BOOKING';
  relatedId: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  paymentId: string;
  providerRef: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
  clientSecret?: string;
  errorMessage?: string;
}

export interface RefundResult {
  paymentId: string;
  providerRef: string;
  status: 'REFUNDED' | 'FAILED';
  refundedAmount: number;
}

export interface IPaymentsProvider {
  name: string;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentResult>;
  capturePayment(paymentRef: string): Promise<PaymentResult>;
  refundPayment(paymentRef: string, amount?: number): Promise<RefundResult>;
}

export interface NotificationPayload {
  toUserId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  template: string;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  notificationId: string;
  channel: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  dispatchedAt: Date;
  providerMessageId?: string;
}

export interface INotificationsProvider {
  name: string;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export interface TransportQuoteRequest {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode: 'TAXI' | 'RIDESHARE' | 'TRANSIT' | 'BIKE';
}

export interface TransportQuoteResponse {
  providerId: string;
  providerName: string;
  mode: string;
  estimatedPrice: number;
  currency: string;
  estimatedDurationMin: number;
  deepLinkUrl?: string;
}

export interface ITransportProviderAdapter {
  name: string;
  getQuotes(request: TransportQuoteRequest): Promise<TransportQuoteResponse[]>;
}
