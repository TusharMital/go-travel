import express from 'express';
import { z } from 'zod';
import { adminController } from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  PartnerQueryDto,
  ApprovePartnerDto,
  SuspendPartnerDto,
  BookingLookupQueryDto,
  AuditLogQueryDto,
} from './admin.dto.js';
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
  validateRequest({ query: PartnerQueryDto }),
  (req, res, next) => {
    adminController.getPartners(req, res).catch(next);
  }
);

adminRouter.get(
  '/partners/:id',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  validateRequest({ params: IdParamDto }),
  (req, res, next) => {
    adminController.getPartnerById(req, res).catch(next);
  }
);

adminRouter.post(
  '/partners/:id/approve',
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: ApprovePartnerDto }),
  (req, res, next) => {
    adminController.approvePartner(req, res).catch(next);
  }
);

adminRouter.post(
  '/partners/:id/suspend',
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: SuspendPartnerDto }),
  (req, res, next) => {
    adminController.suspendPartner(req, res).catch(next);
  }
);

// Booking Lookup
adminRouter.get(
  '/bookings/lookup',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  validateRequest({ query: BookingLookupQueryDto }),
  (req, res, next) => {
    adminController.lookupBookings(req, res).catch(next);
  }
);

adminRouter.get(
  '/bookings/:type/:id',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  validateRequest({
    params: z.object({
      type: z.enum(['storage', 'transport']),
      id: z.string().min(1).max(128),
    }),
  }),
  (req, res, next) => {
    adminController.getBookingDetail(req, res).catch(next);
  }
);

// Audit Log Viewer
adminRouter.get(
  '/audit-logs',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  validateRequest({ query: AuditLogQueryDto }),
  (req, res, next) => {
    adminController.getAuditLogs(req, res).catch(next);
  }
);

// Support & Admin: Query all audit events for a specific entity ID
adminRouter.get(
  '/audit-logs/entity/:entityId',
  authorize(UserRole.ADMIN, UserRole.SUPPORT),
  validateRequest({ params: z.object({ entityId: z.string().min(1).max(128) }) }),
  (req, res, next) => {
    adminController.getAuditLogsByEntityId(req, res).catch(next);
  }
);


