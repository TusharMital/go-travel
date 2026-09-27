import { Router } from 'express';
import { storageController } from './storage.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';
import { bookingRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  SearchStorageLocationsQueryDto,
  CreateStorageBookingDto,
  UpdateInventoryDto,
  TransitionBookingStatusDto,
} from './storage.dto.js';
import { UserRole } from '@travel/shared';

export const storageRouter = Router();

// 1. Discovery Endpoints (Public)
storageRouter.get(
  '/locations',
  validateRequest({ query: SearchStorageLocationsQueryDto }),
  (req, res, next) => storageController.searchLocations(req, res, next)
);
storageRouter.get(
  '/locations/:id',
  validateRequest({ params: IdParamDto }),
  (req, res, next) => storageController.getLocation(req, res, next)
);

// 2. Inventory Management (Partner or Admin only)
storageRouter.post(
  '/locations/:id/inventory',
  authenticate,
  authorize(UserRole.PARTNER_STORAGE, UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: UpdateInventoryDto }),
  (req, res, next) => storageController.updateInventory(req, res, next)
);

// 3. Booking Management
storageRouter.post(
  '/bookings',
  authenticate,
  requireIdempotencyKey,
  bookingRateLimiter,
  validateRequest({ body: CreateStorageBookingDto }),
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
  validateRequest({ params: IdParamDto }),
  (req, res, next) => storageController.confirmBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/check-in',
  authenticate,
  validateRequest({ params: IdParamDto }),
  (req, res, next) => storageController.checkInBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/check-out',
  authenticate,
  validateRequest({ params: IdParamDto }),
  (req, res, next) => storageController.checkOutBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/cancel',
  authenticate,
  validateRequest({ params: IdParamDto }),
  (req, res, next) => storageController.cancelBooking(req, res, next)
);

storageRouter.post(
  '/bookings/:id/transition',
  authenticate,
  validateRequest({ params: IdParamDto, body: TransitionBookingStatusDto }),
  (req, res, next) => storageController.transitionBooking(req, res, next)
);

