import { Router } from 'express';
import { transportController } from './transport.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';

export const transportRouter = Router();

// 1. Discovery & Quotes (Public)
transportRouter.get('/options', (req, res, next) => transportController.searchOptions(req, res, next));

// 2. Booking or Handoff (Authenticated)
transportRouter.post(
  '/bookings',
  authenticate,
  requireIdempotencyKey,
  (req, res, next) => transportController.createBooking(req, res, next)
);

// 3. Explicit Handoff logging
transportRouter.post(
  '/handoff',
  authenticate,
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
  (req, res, next) => transportController.cancelBooking(req, res, next)
);
