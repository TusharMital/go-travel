import { prisma } from '../../prisma.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { recordAuditEvent } from '../../middlewares/audit.middleware.js';
import {
  StorageBookingStatus,
  TransportBookingStatus,
  ReviewRelatedType,
} from '@travel/shared';
import { CreateReviewInput } from './reviews.dto.js';

export class ReviewsService {
  /**
   * Post-checkout review submission (1-5 stars + comment)
   * Tied to a completed booking only:
   * Validates the booking exists, belongs to traveler, and status is checked_out (storage) or completed (transport).
   */
  async createReview(
    userId: string,
    input: CreateReviewInput,
    correlationId: string
  ) {
    let relatedType: ReviewRelatedType;
    let relatedId: string;

    // 1. Try finding storage booking
    const storageBooking = await prisma.storageBooking.findUnique({
      where: { id: input.bookingId },
    });

    if (storageBooking) {
      // Validate ownership
      if (storageBooking.user_id !== userId) {
        throw new AppError(
          'Access denied. You can only review bookings made by your account.',
          403,
          'FORBIDDEN'
        );
      }

      // Validate post-checkout status: booking must be checked_out
      if (storageBooking.status !== StorageBookingStatus.CHECKED_OUT) {
        throw new AppError(
          `Review submission requires a completed booking. Current status is '${storageBooking.status}'. Luggage must be checked out before submitting a review.`,
          400,
          'BOOKING_NOT_CHECKED_OUT'
        );
      }

      relatedType = ReviewRelatedType.STORAGE_LOCATION;
      relatedId = storageBooking.location_id;
    } else {
      // 2. Try finding transport booking
      const transportBooking = await prisma.transportBooking.findUnique({
        where: { id: input.bookingId },
      });

      if (transportBooking) {
        if (transportBooking.user_id !== userId) {
          throw new AppError(
            'Access denied. You can only review bookings made by your account.',
            403,
            'FORBIDDEN'
          );
        }

        // Validate completed status
        if (transportBooking.status !== TransportBookingStatus.COMPLETED) {
          throw new AppError(
            `Review submission requires a completed transport ride. Current status is '${transportBooking.status}'.`,
            400,
            'BOOKING_NOT_COMPLETED'
          );
        }

        relatedType = ReviewRelatedType.TRANSPORT_OPTION;
        relatedId = transportBooking.transport_option_id;
      } else {
        throw new AppError(
          `Booking '${input.bookingId}' was not found.`,
          404,
          'BOOKING_NOT_FOUND'
        );
      }
    }

    // 3. Prevent duplicate reviews for the same booking
    const existingReview = await prisma.review.findFirst({
      where: { booking_id: input.bookingId },
    });

    if (existingReview) {
      throw new AppError(
        'A review has already been submitted for this booking.',
        409,
        'DUPLICATE_REVIEW'
      );
    }

    // 4. Create review in database
    const review = await prisma.review.create({
      data: {
        user_id: userId,
        booking_id: input.bookingId,
        related_type: relatedType as any,
        related_id: relatedId,
        rating: input.rating,
        comment: input.comment ? input.comment.trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // 5. Record immutable audit event
    await recordAuditEvent({
      actorUserId: userId,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: review.id,
      beforeState: null,
      afterState: {
        rating: review.rating,
        comment: review.comment,
        booking_id: input.bookingId,
        related_type: relatedType,
        related_id: relatedId,
      },
      correlationId,
    });

    return {
      id: review.id,
      bookingId: review.booking_id,
      relatedType: review.related_type,
      relatedId: review.related_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      author: {
        id: review.user.id,
        fullName: review.user.full_name,
      },
    };
  }

  /**
   * Retrieve reviews and compute aggregate rating statistics for a storage location or transport option
   */
  async getReviewsForEntity(
    relatedType: ReviewRelatedType,
    relatedId: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [reviews, total, aggregate, distribution] = await Promise.all([
      prisma.review.findMany({
        where: {
          related_type: relatedType as any,
          related_id: relatedId,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: {
          related_type: relatedType as any,
          related_id: relatedId,
        },
      }),
      prisma.review.aggregate({
        where: {
          related_type: relatedType as any,
          related_id: relatedId,
        },
        _avg: { rating: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          related_type: relatedType as any,
          related_id: relatedId,
        },
        _count: { _all: true },
      }),
    ]);

    const averageRating =
      total > 0 && aggregate._avg.rating
        ? Number(aggregate._avg.rating.toFixed(1))
        : 0;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      if (d.rating in ratingBreakdown) {
        ratingBreakdown[d.rating as keyof typeof ratingBreakdown] = d._count._all;
      }
    });

    return {
      items: reviews.map((r) => ({
        id: r.id,
        bookingId: r.booking_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        author: {
          id: r.user.id,
          fullName: r.user.full_name,
        },
      })),
      aggregates: {
        averageRating,
        totalReviews: total,
        ratingBreakdown,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get traveler's review for a given booking if one exists
   */
  async getReviewByBookingId(userId: string, bookingId: string) {
    const review = await prisma.review.findFirst({
      where: { booking_id: bookingId },
      include: {
        user: { select: { id: true, full_name: true } },
      },
    });

    // Check booking status to know if traveler is eligible to review
    const storageBooking = await prisma.storageBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, user_id: true, status: true },
    });

    let canReview = false;
    if (storageBooking && storageBooking.user_id === userId) {
      canReview = storageBooking.status === StorageBookingStatus.CHECKED_OUT && !review;
    } else {
      const transportBooking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
        select: { id: true, user_id: true, status: true },
      });
      if (transportBooking && transportBooking.user_id === userId) {
        canReview = transportBooking.status === TransportBookingStatus.COMPLETED && !review;
      }
    }

    return {
      hasReviewed: !!review,
      canReview,
      review: review
        ? {
            id: review.id,
            bookingId: review.booking_id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at,
          }
        : null,
    };
  }
}

export const reviewsService = new ReviewsService();
