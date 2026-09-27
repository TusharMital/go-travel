import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import {
  UserRole,
  StorageBookingStatus,
  TransportBookingStatus,
  ReviewRelatedType,
} from '@travel/shared';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    storageBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    transportBooking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
  },
}));

describe('4.11 Reviews & Ratings Module', () => {
  const app = createApp();

  const travelerUserId = 'user-traveler-uuid-1';
  const otherTravelerUserId = 'user-traveler-uuid-2';
  const storageLocationId = 'loc-berlin-hbf-1';
  const transportOptionId = 'opt-taxi-transfer-1';

  const travelerToken = jwt.sign(
    { id: travelerUserId, email: 'traveler@platform.travel', role: UserRole.TRAVELER, email_verified: true },
    env.JWT_ACCESS_SECRET
  );

  const otherTravelerToken = jwt.sign(
    { id: otherTravelerUserId, email: 'other@platform.travel', role: UserRole.TRAVELER, email_verified: true },
    env.JWT_ACCESS_SECRET
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Post-Checkout Review Submission (Happy Paths)
  // =========================================================================
  describe('1. Post-Checkout Review Submission', () => {
    it('allows a traveler to submit a 1-5 star review with comment for a completed (checked_out) luggage storage booking', async () => {
      const bookingId = 'storage-bk-checked-out-1';

      // Mock storage booking in checked_out status
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        location_id: storageLocationId,
        status: StorageBookingStatus.CHECKED_OUT,
        bag_count: 2,
        drop_off_at: new Date('2026-09-20T10:00:00Z'),
        pick_up_at: new Date('2026-09-20T18:00:00Z'),
      } as any);

      // No previous review exists
      vi.mocked(prisma.review.findFirst).mockResolvedValueOnce(null);

      // Mock review creation
      vi.mocked(prisma.review.create).mockResolvedValueOnce({
        id: 'review-uuid-1',
        user_id: travelerUserId,
        booking_id: bookingId,
        related_type: ReviewRelatedType.STORAGE_LOCATION,
        related_id: storageLocationId,
        rating: 5,
        comment: 'Great service! Seamless bag drop and pick up at Berlin Hbf.',
        created_at: new Date(),
        updated_at: new Date(),
        user: {
          id: travelerUserId,
          full_name: 'Elena Rostova',
          email: 'traveler@platform.travel',
        },
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 5,
          comment: 'Great service! Seamless bag drop and pick up at Berlin Hbf.',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.bookingId).toBe(bookingId);
      expect(res.body.data.relatedType).toBe(ReviewRelatedType.STORAGE_LOCATION);

      // Verify Audit Event logged
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REVIEW_SUBMITTED',
            entity_type: 'Review',
            entity_id: 'review-uuid-1',
            actor_user_id: travelerUserId,
          }),
        })
      );
    });

    it('allows a traveler to submit a review for a completed transport ride', async () => {
      const bookingId = 'transport-bk-completed-1';

      // Not in storage
      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce(null);

      // In transport with completed status
      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        transport_option_id: transportOptionId,
        status: TransportBookingStatus.COMPLETED,
        scheduled_at: new Date('2026-09-20T12:00:00Z'),
      } as any);

      vi.mocked(prisma.review.findFirst).mockResolvedValueOnce(null);

      vi.mocked(prisma.review.create).mockResolvedValueOnce({
        id: 'review-uuid-2',
        user_id: travelerUserId,
        booking_id: bookingId,
        related_type: ReviewRelatedType.TRANSPORT_OPTION,
        related_id: transportOptionId,
        rating: 4,
        comment: 'Driver was punctual and polite.',
        created_at: new Date(),
        updated_at: new Date(),
        user: {
          id: travelerUserId,
          full_name: 'Elena Rostova',
          email: 'traveler@platform.travel',
        },
      } as any);

      const res = await request(app)
        .post(`/api/v1/reviews/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          rating: 4,
          comment: 'Driver was punctual and polite.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.relatedType).toBe(ReviewRelatedType.TRANSPORT_OPTION);
    });
  });

  // =========================================================================
  // 2. Strict Pre-Condition: Completed / Checked-Out Validation (Negative Tests)
  // =========================================================================
  describe('2. Booking Status Validation', () => {
    it('REJECTS review submission when storage booking is still confirmed (not checked out)', async () => {
      const bookingId = 'storage-bk-confirmed-1';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        location_id: storageLocationId,
        status: StorageBookingStatus.CONFIRMED, // NOT checked out!
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 5,
          comment: 'Trying to review before dropping bags.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BOOKING_NOT_CHECKED_OUT');
      expect(res.body.error.message).toContain('checked out before submitting a review');
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('REJECTS review submission when luggage is currently checked_in (active drop-off, not checked out yet)', async () => {
      const bookingId = 'storage-bk-checked-in-1';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        location_id: storageLocationId,
        status: StorageBookingStatus.CHECKED_IN, // Active, not checked out!
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 4,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BOOKING_NOT_CHECKED_OUT');
    });

    it('REJECTS review submission when transport booking is still confirmed (ride not completed)', async () => {
      const bookingId = 'trans-bk-confirmed-1';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.transportBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        transport_option_id: transportOptionId,
        status: TransportBookingStatus.CONFIRMED, // NOT completed!
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BOOKING_NOT_COMPLETED');
    });
  });

  // =========================================================================
  // 3. Security, Duplicate & Input Validations
  // =========================================================================
  describe('3. Security & Validation Guards', () => {
    it('REJECTS duplicate review submissions for the same booking (409 Conflict)', async () => {
      const bookingId = 'storage-bk-checked-out-2';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        location_id: storageLocationId,
        status: StorageBookingStatus.CHECKED_OUT,
      } as any);

      // Existing review already in DB
      vi.mocked(prisma.review.findFirst).mockResolvedValueOnce({
        id: 'existing-rev-1',
        booking_id: bookingId,
        rating: 5,
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 4,
          comment: 'Second review attempt.',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('REJECTS traveler attempting to review a booking belonging to someone else (403 Forbidden)', async () => {
      const bookingId = 'storage-bk-other-user';

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: otherTravelerUserId, // Belongs to other user
        location_id: storageLocationId,
        status: StorageBookingStatus.CHECKED_OUT,
      } as any);

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId,
          rating: 5,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('REJECTS invalid star ratings outside 1-5 (e.g. 0 or 6)', async () => {
      const res1 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId: 'some-bk',
          rating: 0,
        });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({
          bookingId: 'some-bk',
          rating: 6,
        });

      expect(res2.status).toBe(400);
    });

    it('REJECTS unauthenticated review submissions (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .send({
          bookingId: 'any-bk',
          rating: 5,
        });

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 4. Retrieve Reviews & Aggregate Ratings Display
  // =========================================================================
  describe('4. Entity Reviews & Aggregate Ratings Display', () => {
    it('returns reviews and calculated average rating for a storage location', async () => {
      vi.mocked(prisma.review.findMany).mockResolvedValueOnce([
        {
          id: 'rev-1',
          booking_id: 'bk-1',
          rating: 5,
          comment: 'Perfect location near platforms.',
          created_at: new Date('2026-09-21T10:00:00Z'),
          user: { id: 'u-1', full_name: 'Elena Rostova' },
        },
        {
          id: 'rev-2',
          booking_id: 'bk-2',
          rating: 4,
          comment: 'Helpful staff, fast checkout.',
          created_at: new Date('2026-09-22T11:00:00Z'),
          user: { id: 'u-2', full_name: 'Marcus Brody' },
        },
      ] as any);

      vi.mocked(prisma.review.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.review.aggregate).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
      } as any);

      vi.mocked(prisma.review.groupBy).mockResolvedValueOnce([
        { rating: 5, _count: { _all: 1 } },
        { rating: 4, _count: { _all: 1 } },
      ] as any);

      const res = await request(app).get(`/api/v1/reviews/storage/${storageLocationId}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.aggregates.averageRating).toBe(4.5);
      expect(res.body.aggregates.totalReviews).toBe(2);
      expect(res.body.aggregates.ratingBreakdown[5]).toBe(1);
      expect(res.body.aggregates.ratingBreakdown[4]).toBe(1);
    });

    it('checks if a traveler has already reviewed a booking', async () => {
      const bookingId = 'storage-bk-101';

      vi.mocked(prisma.review.findFirst).mockResolvedValueOnce({
        id: 'rev-existing-1',
        booking_id: bookingId,
        rating: 5,
        comment: 'Already reviewed.',
        created_at: new Date(),
        user: { id: travelerUserId, full_name: 'Elena Rostova' },
      } as any);

      vi.mocked(prisma.storageBooking.findUnique).mockResolvedValueOnce({
        id: bookingId,
        user_id: travelerUserId,
        status: StorageBookingStatus.CHECKED_OUT,
      } as any);

      const res = await request(app)
        .get(`/api/v1/reviews/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasReviewed).toBe(true);
      expect(res.body.data.canReview).toBe(false);
      expect(res.body.data.review.rating).toBe(5);
    });
  });
});
