import express from 'express';
import { adminController } from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@travel/shared';

export const adminRouter = express.Router();

// All admin endpoints require authentication and at least support or admin role
adminRouter.use(authenticate);

// Metrics Dashboard
adminRouter.get(
  '/metrics',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.getMetrics(req, res).catch(next);
  }
);

// Partner Verification Queue
adminRouter.get(
  '/partners',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.getPartners(req, res).catch(next);
  }
);

adminRouter.get(
  '/partners/:id',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.getPartnerById(req, res).catch(next);
  }
);

adminRouter.post(
  '/partners/:id/approve',
  authorize(UserRole.ADMIN),
  (req, res, next) => {
    adminController.approvePartner(req, res).catch(next);
  }
);

adminRouter.post(
  '/partners/:id/suspend',
  authorize(UserRole.ADMIN),
  (req, res, next) => {
    adminController.suspendPartner(req, res).catch(next);
  }
);

// Booking Lookup
adminRouter.get(
  '/bookings/lookup',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.lookupBookings(req, res).catch(next);
  }
);

adminRouter.get(
  '/bookings/:type/:id',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.getBookingDetail(req, res).catch(next);
  }
);

// Audit Log Viewer
adminRouter.get(
  '/audit-logs',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  (req, res, next) => {
    adminController.getAuditLogs(req, res).catch(next);
  }
);
