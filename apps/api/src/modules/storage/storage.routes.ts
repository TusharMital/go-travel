import { Router } from 'express';
import { storageController } from './storage.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';
import { UserRole } from '@travel/shared';

export const storageRouter = Router();

// 1. Discovery Endpoints (Public)
storageRouter.get('/locations', (req, res, next) => storageController.searchLocations(req, res, next));
storageRouter.get('/locations/:id', (req, res, next) => storageController.getLocation(req, res, next));

// 2. Inventory Management (Partner or Admin only)
storageRouter.post(
  '/locations/:id/inventory',
  authenticate,
  authorize(UserRole.PARTNER_STORAGE, UserRole.ADMIN),
  (req, res, next) => storageController.updateInventory(req, res, next)
);

// 3. Booking Management
storageRouter.post(
  '/bookings',
  authenticate,
  requireIdempotencyKey,
  (req, res, next) => storageController.createBooking(req, res, next)
);

storageRouter.get(
  '/bookings',
  authenticate,
  (req, res, next) => storageController.listMyBookings(req, res, next)
);

// 4. Booking State Machine Transitions
storageRouter.post(
  '/bookings/:id/confirm',
  authenticate,
  (req, res, next) => storageController.confirmBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/check-in',
  authenticate,
  (req, res, next) => storageController.checkInBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/check-out',
  authenticate,
  (req, res, next) => storageController.checkOutBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/cancel',
  authenticate,
  (req, res, next) => storageController.cancelBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/transition',
  authenticate,
  (req, res, next) => storageController.transitionBooking(req, res, next)
);
