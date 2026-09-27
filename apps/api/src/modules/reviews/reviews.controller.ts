import { Request, Response } from 'express';
import { reviewsService } from './reviews.service.js';
import { CreateReviewDto, ReviewQueryDto } from './reviews.dto.js';
import { ReviewRelatedType } from '@travel/shared';

export class ReviewsController {
  /**
   * POST /api/v1/reviews
   * Submit review for completed booking
   */
  async createReview(req: Request, res: Response): Promise<void> {
    const input = CreateReviewDto.parse(req.body);
    const userId = req.user!.id;
    const correlationId = req.correlationId || 'review-submission';

    const review = await reviewsService.createReview(userId, input, correlationId);
    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully. Thank you for your feedback!',
      data: review,
    });
  }

  /**
   * GET /api/v1/reviews/storage/:locationId
   * Retrieve reviews and aggregate rating statistics for storage location
   */
  async getStorageLocationReviews(req: Request, res: Response): Promise<void> {
    const { locationId } = req.params;
    const query = ReviewQueryDto.parse(req.query);

    const result = await reviewsService.getReviewsForEntity(
      ReviewRelatedType.STORAGE_LOCATION,
      locationId,
      query.page,
      query.limit
    );

    res.json({
      status: 'success',
      data: result.items,
      aggregates: result.aggregates,
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/v1/reviews/transport/:optionId
   * Retrieve reviews and aggregate rating statistics for transport option
   */
  async getTransportOptionReviews(req: Request, res: Response): Promise<void> {
    const { optionId } = req.params;
    const query = ReviewQueryDto.parse(req.query);

    const result = await reviewsService.getReviewsForEntity(
      ReviewRelatedType.TRANSPORT_OPTION,
      optionId,
      query.page,
      query.limit
    );

    res.json({
      status: 'success',
      data: result.items,
      aggregates: result.aggregates,
      pagination: result.pagination,
    });
  }

  /**
   * GET /api/v1/reviews/bookings/:bookingId
   * Check traveler's review for a given booking
   */
  async getBookingReview(req: Request, res: Response): Promise<void> {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    const result = await reviewsService.getReviewByBookingId(userId, bookingId);
    res.json({
      status: 'success',
      data: result,
    });
  }
}

export const reviewsController = new ReviewsController();
