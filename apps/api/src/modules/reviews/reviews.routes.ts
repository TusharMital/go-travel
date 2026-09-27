import express from 'express';
import { z } from 'zod';
import { reviewsController } from './reviews.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { CreateReviewDto, ReviewQueryDto } from './reviews.dto.js';

export const reviewsRouter = express.Router();

const BookingParamDto = z.object({
  bookingId: z.string().min(1).max(128),
});

const BookingBodyDto = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  comment: z.string().max(1000, 'Comment must not exceed 1000 characters').optional().nullable(),
});

// Post-checkout review submission (authenticated travelers only)
reviewsRouter.post(
  '/',
  authenticate,
  validateRequest({ body: CreateReviewDto }),
  (req, res, next) => {
    reviewsController.createReview(req, res).catch(next);
  }
);

// Alias for booking-specific review submission
reviewsRouter.post(
  '/bookings/:bookingId',
  authenticate,
  validateRequest({ params: BookingParamDto, body: BookingBodyDto }),
  (req, res, next) => {
    req.body.bookingId = req.params.bookingId;
    reviewsController.createReview(req, res).catch(next);
  }
);

// Check if booking has been reviewed by user
reviewsRouter.get(
  '/bookings/:bookingId',
  authenticate,
  validateRequest({ params: BookingParamDto }),
  (req, res, next) => {
    reviewsController.getBookingReview(req, res).catch(next);
  }
);

// Public endpoints to retrieve reviews and aggregate ratings for location/option listings
reviewsRouter.get(
  '/storage/:locationId',
  validateRequest({
    params: z.object({ locationId: z.string().min(1).max(128) }),
    query: ReviewQueryDto,
  }),
  (req, res, next) => {
    reviewsController.getStorageLocationReviews(req, res).catch(next);
  }
);

reviewsRouter.get(
  '/transport/:optionId',
  validateRequest({
    params: z.object({ optionId: z.string().min(1).max(128) }),
    query: ReviewQueryDto,
  }),
  (req, res, next) => {
    reviewsController.getTransportOptionReviews(req, res).catch(next);
  }
);

