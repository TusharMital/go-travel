import { Router } from 'express';
import { transportController } from './transport.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';
import { bookingRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  SearchTransportOptionsQueryDto,
  CreateTransportBookingDto,
  HandoffTransportDto,
} from './transport.dto.js';

export const transportRouter = Router();

// 1. Discovery & Quotes (Public)
transportRouter.get(
  '/options',
  validateRequest({ query: SearchTransportOptionsQueryDto }),
  (req, res, next) => transportController.searchOptions(req, res, next)
);

// 2. Booking or Handoff (Authenticated)
transportRouter.post(
  '/bookings',
  authenticate,
  requireIdempotencyKey,
  bookingRateLimiter,
  validateRequest({ body: CreateTransportBookingDto }),
  (req, res, next) => transportController.createBooking(req, res, next)
);

// 3. Explicit Handoff logging
transportRouter.post(
  '/handoff',
  authenticate,
  validateRequest({ body: HandoffTransportDto }),
  (req, res, next) => transportController.recordHandoff(req, res, next)
);

// 4. Traveler Bookings List & Cancellation
transportRouter.get(
  '/bookings',
  authenticate,
  (req, res, next) => transportController.listMyBookings(req, res, next)
);

transportRouter.post(
  '/bookings/:id/cancel',
  authenticate,
  validateRequest({ params: IdParamDto }),
  (req, res, next) => transportController.cancelBooking(req, res, next)
);

