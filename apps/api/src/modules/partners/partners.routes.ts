import { Router } from 'express';
import { partnersController } from './partners.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  PartnerOnboardingSchema,
  CreatePartnerLocationSchema,
  UpdateInventoryPricingSchema,
} from './partners.dto.js';
import { UserRole } from '@travel/shared';

const router = Router();

// All partner routes require authentication
router.use(authenticate);

// 1. Partner Profile & Onboarding
router.get('/me', (req, res, next) => {
  partnersController.getProfile(req, res).catch(next);
});

router.post(
  '/onboard',
  validateRequest({ body: PartnerOnboardingSchema }),
  (req, res, next) => {
    partnersController.submitOnboarding(req, res).catch(next);
  }
);

// 2. Storage Locations & Inventory (Verified partner or admin)
router.get('/locations', (req, res, next) => {
  partnersController.listLocations(req, res).catch(next);
});

router.post(
  '/locations',
  validateRequest({ body: CreatePartnerLocationSchema }),
  (req, res, next) => {
    partnersController.createLocation(req, res).catch(next);
  }
);

router.post(
  '/locations/:id/inventory',
  validateRequest({ params: IdParamDto, body: UpdateInventoryPricingSchema }),
  (req, res, next) => {
    partnersController.updateLocationInventory(req, res).catch(next);
  }
);

// 3. Partner Bookings & Check-In / Check-Out
router.get('/bookings', (req, res, next) => {
  partnersController.listBookings(req, res).catch(next);
});

router.patch(
  '/bookings/:id/check-in',
  validateRequest({ params: IdParamDto }),
  (req, res, next) => {
    partnersController.checkInBooking(req, res).catch(next);
  }
);

router.patch(
  '/bookings/:id/check-out',
  validateRequest({ params: IdParamDto }),
  (req, res, next) => {
    partnersController.checkOutBooking(req, res).catch(next);
  }
);

// 4. Payout Summary & Payout Request (Stubbed)
router.get('/payouts/summary', (req, res, next) => {
  partnersController.getPayoutSummary(req, res).catch(next);
});

router.post('/payouts/request', (req, res, next) => {
  partnersController.requestPayout(req, res).catch(next);
});

// 5. Admin Partner Status Approval / Transition
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  (req, res, next) => {
    partnersController.updatePartnerStatus(req, res).catch(next);
  }
);

export const partnersRouter = router;

