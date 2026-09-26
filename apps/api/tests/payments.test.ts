import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  UserRole,
  PaymentStatus,
  StorageBookingStatus,
  TransportBookingStatus,
} from '@travel/shared';
import { v4 as uuidv4 } from 'uuid';
import { mockPaymentsAdapter } from '../src/adapters/payments/index.js';
import { getEventBus } from '../src/modules/events/index.js';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    storageBooking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    storageLocation: {
      findUnique: vi.fn(),
    },
    storageInventory: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    transportBooking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    transportOption: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    transportProvider: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    trip: {
      findFirst: vi.fn(),
    },
    itineraryItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('4.7 Payments Module', () => {
  const app = createApp();

  const travelerId = 'traveler-pay-uuid-1';
  const travelerToken = jwt.sign(
    { id: travelerId, email: 'traveler.pay@example.com', role: UserRole.TRAVELER },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.resetAllMocks();
    mockPaymentsAdapter.reset();
    vi.mocked(prisma.payment.update).mockImplementation(async (args: any) => ({
      id: args.where?.id || 'pay-mock-id',
      status: PaymentStatus.INTENT,
      ...args.data,
    }) as any);
  });

  describe('1. PaymentProvider Interface & API Endpoints', () => {
    it('creates payment intent with Idempotency-Key (POST /api/v1/payments/intent)', async () => {
      const idempotencyKey = `idem-intent-${uuidv4()}`;
      const mockPaymentRecord = {
        id: 'pay-record-1',
        user_id: travelerId,
        related_type: 'storage_booking',
        related_id: 'pending-123',
        status: PaymentStatus.INTENT,
        amount: 25.0,
        currency: 'USD',
        provider_ref: 'mock_pi_test_1',
        idempotency_key: idempotencyKey,
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.payment.create).mockResolvedValue(mockPaymentRecord as any);

      const res = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: 25.0,
          currency: 'USD',
          related_type: 'storage_booking',
          related_id: 'pending-123',
        })
        .expect(201);

      expect(res.body.payment.id).toBe('pay-record-1');
      expect(res.body.clientSecret).toBeDefined();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_INTENT_CREATED',
          }),
        })
      );
    });

    it('rejects intent creation without Idempotency-Key header (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          amount: 25.0,
          currency: 'USD',
          related_type: 'storage_booking',
          related_id: 'pending-123',
        })
        .expect(400);

      expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
    });

    it('returns existing payment on idempotent intent replay', async () => {
      const idempotencyKey = 'idem-replay-key-1';
      const existingPayment = {
        id: 'pay-existing-1',
        user_id: travelerId,
        status: PaymentStatus.INTENT,
        amount: 30.0,
        currency: 'USD',
        provider_ref: 'mock_pi_existing',
        idempotency_key: idempotencyKey,
      };

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(existingPayment as any);

      const res = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: 30.0,
          currency: 'USD',
          related_type: 'storage_booking',
          related_id: 'pending-123',
        })
        .expect(201);

      expect(res.body.payment.id).toBe('pay-existing-1');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('captures authorized payment (POST /api/v1/payments/capture)', async () => {
      const providerRef = 'mock_pi_capture_test';
      const existingPayment = {
        id: 'pay-cap-1',
        user_id: travelerId,
        provider_ref: providerRef,
        status: PaymentStatus.INTENT,
        amount: 50.0,
        currency: 'USD',
      };

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(existingPayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...existingPayment,
        status: PaymentStatus.CAPTURED,
      } as any);

      const res = await request(app)
        .post('/api/v1/payments/capture')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          provider_ref: providerRef,
          amount: 50.0,
        })
        .expect(200);

      expect(res.body.status).toBe(PaymentStatus.CAPTURED);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentStatus.CAPTURED },
        })
      );
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_CAPTURED',
          }),
        })
      );
    });

    it('refunds captured payment (POST /api/v1/payments/refund)', async () => {
      const providerRef = 'mock_pi_refund_test';
      const capturedPayment = {
        id: 'pay-ref-1',
        user_id: travelerId,
        provider_ref: providerRef,
        status: PaymentStatus.CAPTURED,
        amount: 45.0,
        currency: 'USD',
      };

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(capturedPayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...capturedPayment,
        status: PaymentStatus.REFUNDED,
      } as any);

      const res = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-refund-${uuidv4()}`)
        .send({
          payment_id: 'pay-ref-1',
          amount: 45.0,
          reason: 'Customer requested refund',
        })
        .expect(200);

      expect(res.body.status).toBe(PaymentStatus.REFUNDED);
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_REFUNDED',
          }),
        })
      );
    });

    it('lists traveler payment history (GET /api/v1/payments)', async () => {
      const payments = [
        { id: 'pay-1', amount: 12.0, status: PaymentStatus.CAPTURED, user_id: travelerId },
        { id: 'pay-2', amount: 35.0, status: PaymentStatus.REFUNDED, user_id: travelerId },
      ];

      vi.mocked(prisma.payment.count).mockResolvedValue(2);
      vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as any);

      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${travelerToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('2. Test Flag Simulation (Success vs Decline)', () => {
    it('simulates card decline via test flag and returns 402 with PAYMENT_DECLINED', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.payment.create).mockResolvedValue({
        id: 'pay-declined-1',
        status: PaymentStatus.FAILED,
      } as any);

      const res = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-declined-${uuidv4()}`)
        .send({
          amount: 99.0,
          currency: 'USD',
          related_type: 'storage_booking',
          related_id: 'booking-declined',
          test_flag: 'simulate_decline',
        })
        .expect(402);

      expect(res.body.error.code).toBe('PAYMENT_DECLINED');
      // Payment row written with FAILED status
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
          }),
        })
      );
      // Audit event written
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_DECLINED',
          }),
        })
      );
    });

    it('simulates capture failure via adapter setting and returns 402', async () => {
      mockPaymentsAdapter.setSimulateCaptureFailure(true, 'Capture pre-authorization expired');

      const existingPayment = {
        id: 'pay-cap-fail',
        user_id: travelerId,
        provider_ref: 'mock_pi_cap_fail',
        status: PaymentStatus.INTENT,
        amount: 15.0,
      };

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(existingPayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...existingPayment,
        status: PaymentStatus.FAILED,
      } as any);

      const res = await request(app)
        .post('/api/v1/payments/capture')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          provider_ref: 'mock_pi_cap_fail',
          amount: 15.0,
        })
        .expect(402);

      expect(res.body.error.code).toBe('PAYMENT_CAPTURE_FAILED');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentStatus.FAILED },
        })
      );
    });
  });

  describe('3. Explicit Edge Case 1: Payment Succeeded but Booking Failed', () => {
    it('automatically triggers compensation refund when booking creation fails after payment capture', async () => {
      const locationId = uuidv4();

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue({
        id: locationId,
        is_active: true,
      } as any);
      vi.mocked(prisma.storageInventory.findUnique).mockResolvedValue(null);

      // Payment captured successfully
      const createdPayment = {
        id: 'pay-edge-1',
        user_id: travelerId,
        status: PaymentStatus.CAPTURED,
        amount: 12.0,
        provider_ref: 'mock_pi_edge_1',
      };
      vi.mocked(prisma.payment.create).mockResolvedValue(createdPayment as any);

      // But database transaction for booking throws an error (e.g. concurrent capacity exhaustion)
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        throw new Error('Database transaction aborted: capacity concurrently claimed');
      });

      const res = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-edge1-${uuidv4()}`)
        .send({
          location_id: locationId,
          bag_count: 2,
          drop_off_at: '2026-10-15T10:00:00.000Z',
          pick_up_at: '2026-10-15T18:00:00.000Z',
        })
        .expect(409);

      // Customer message reassures that payment was refunded
      expect(res.body.error.message).toContain('automatically refunded');

      // Assert compensation refund was called and payment status updated to refunded
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-edge-1' },
          data: { status: PaymentStatus.REFUNDED },
        })
      );

      // Assert audit trail records compensation event
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_AUTO_REFUNDED_ON_BOOKING_FAILURE',
            entity_id: 'pay-edge-1',
          }),
        })
      );
    });
  });

  describe('4. Explicit Edge Case 2: Booking Succeeded but Payment Webhook Delayed', () => {
    it('sets booking and payment to pending/intent when webhook is delayed, then confirms both on webhook arrival', async () => {
      const locationId = uuidv4();
      const bookingId = `booking-delayed-${uuidv4()}`;
      const tripId = uuidv4();
      let capturedProviderRef = '';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.storageLocation.findUnique).mockResolvedValue({
        id: locationId,
        name: 'Central Station Lockers',
        lat: 52.52,
        lng: 13.4,
        address: 'Europaplatz 1',
        is_active: true,
      } as any);

      // Step 1: Storage booking created with test_flag: 'simulate_delayed_webhook'
      vi.mocked(prisma.payment.create).mockImplementation(async (args: any) => {
        capturedProviderRef = args.data.provider_ref;
        return {
          id: 'pay-delayed-1',
          ...args.data,
        };
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          storageInventory: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'inv-1',
              total_capacity: 10,
              booked_capacity: 0,
              price_per_bag_per_day: 6.0,
              version: 0,
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          storageBooking: {
            create: vi.fn().mockResolvedValue({
              id: bookingId,
              user_id: travelerId,
              location_id: locationId,
              trip_id: tripId,
              status: StorageBookingStatus.PENDING, // pending until webhook
              bag_count: 1,
              drop_off_at: new Date('2026-10-15T10:00:00.000Z'),
              pick_up_at: new Date('2026-10-15T18:00:00.000Z'),
              price_total: 6.0,
              currency: 'USD',
              location: {
                id: locationId,
                name: 'Central Station Lockers',
                lat: 52.52,
                lng: 13.4,
                address: 'Europaplatz 1',
              },
            }),
          },
        });
      });

      const bookingRes = await request(app)
        .post('/api/v1/storage/bookings')
        .set('Authorization', `Bearer ${travelerToken}`)
        .set('Idempotency-Key', `idem-delayed-${uuidv4()}`)
        .send({
          location_id: locationId,
          trip_id: tripId,
          bag_count: 1,
          drop_off_at: '2026-10-15T10:00:00.000Z',
          pick_up_at: '2026-10-15T18:00:00.000Z',
          test_flag: 'simulate_delayed_webhook',
        })
        .expect(201);

      // Verify booking initially created in PENDING status
      expect(bookingRes.body.status).toBe(StorageBookingStatus.PENDING);
      expect(bookingRes.body.payment.status).toBe(PaymentStatus.INTENT);
      expect(capturedProviderRef).toBeTruthy();

      // Step 2: External provider webhook arrives later at POST /api/v1/payments/webhook
      const pendingPayment = {
        id: 'pay-delayed-1',
        user_id: travelerId,
        provider_ref: capturedProviderRef,
        status: PaymentStatus.INTENT,
        related_type: 'storage_booking',
        related_id: bookingId,
        amount: 6.0,
      };

      const pendingBooking = {
        id: bookingId,
        user_id: travelerId,
        trip_id: tripId,
        status: StorageBookingStatus.PENDING,
        drop_off_at: new Date('2026-10-15T10:00:00.000Z'),
        pick_up_at: new Date('2026-10-15T18:00:00.000Z'),
        bag_count: 1,
        location: {
          name: 'Central Station Lockers',
          lat: 52.52,
          lng: 13.4,
          address: 'Europaplatz 1',
        },
      };

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(pendingPayment as any);
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValue(pendingBooking as any);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.CAPTURED,
      } as any);
      vi.mocked(prisma.storageBooking.update).mockResolvedValue({
        ...pendingBooking,
        status: StorageBookingStatus.CONFIRMED,
      } as any);

      // Track booking-confirmed event publication
      const publishedEvents: any[] = [];
      const eventBus = getEventBus();
      const unsub = eventBus.subscribe('booking-confirmed', async (event) => {
        publishedEvents.push(event);
      });

      const webhookRes = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          event: 'payment_intent.succeeded',
          data: {
            provider_ref: capturedProviderRef,
            amount: 6.0,
            currency: 'USD',
          },
        })
        .expect(200);

      unsub();

      expect(webhookRes.body.processed).toBe(true);

      // Payment captured
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-delayed-1' },
          data: { status: PaymentStatus.CAPTURED },
        })
      );

      // Storage booking transitioned from PENDING to CONFIRMED
      expect(prisma.storageBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: bookingId },
          data: { status: StorageBookingStatus.CONFIRMED },
        })
      );

      // booking-confirmed event emitted to trigger Module 4.6 Booking Orchestration
      expect(publishedEvents.length).toBe(1);
      expect(publishedEvents[0].payload.bookingId).toBe(bookingId);
      expect(publishedEvents[0].payload.status).toBe(StorageBookingStatus.CONFIRMED);

      // Audit trail logged
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYMENT_WEBHOOK_PROCESSED',
          }),
        })
      );
    });

    it('cancels pending booking when delayed payment webhook reports failure', async () => {
      const providerRef = 'mock_pi_failed_webhook';
      const bookingId = 'booking-to-cancel-1';

      const pendingPayment = {
        id: 'pay-fail-1',
        user_id: travelerId,
        provider_ref: providerRef,
        status: PaymentStatus.INTENT,
        related_type: 'storage_booking',
        related_id: bookingId,
      };

      vi.mocked(prisma.payment.findFirst).mockResolvedValue(pendingPayment as any);
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.FAILED,
      } as any);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .send({
          event: 'payment_intent.payment_failed',
          data: {
            provider_ref: providerRef,
            reason: 'Card expired or insufficient balance',
          },
        })
        .expect(200);

      expect(res.body.processed).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-fail-1' },
          data: { status: PaymentStatus.FAILED },
        })
      );
      expect(prisma.storageBooking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: bookingId, status: StorageBookingStatus.PENDING },
          data: { status: StorageBookingStatus.CANCELLED },
        })
      );
    });
  });
});
