import { Router } from 'express';
import { partnersController } from './partners.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@travel/shared';

const router = Router();

// All partner routes require authentication
router.use(authenticate);

// 1. Partner Profile & Onboarding
router.get('/me', (req, res, next) => {
  partnersController.getProfile(req, res).catch(next);
});

router.post('/onboard', (req, res, next) => {
  partnersController.submitOnboarding(req, res).catch(next);
});

// 2. Storage Locations & Inventory (Verified partner or admin)
router.get('/locations', (req, res, next) => {
  partnersController.listLocations(req, res).catch(next);
});

router.post('/locations', (req, res, next) => {
  partnersController.createLocation(req, res).catch(next);
});

router.post('/locations/:id/inventory', (req, res, next) => {
  partnersController.updateLocationInventory(req, res).catch(next);
});

// 3. Partner Bookings & Check-In / Check-Out
router.get('/bookings', (req, res, next) => {
  partnersController.listBookings(req, res).catch(next);
});

router.patch('/bookings/:id/check-in', (req, res, next) => {
  partnersController.checkInBooking(req, res).catch(next);
});

router.patch('/bookings/:id/check-out', (req, res, next) => {
  partnersController.checkOutBooking(req, res).catch(next);
});

// 4. Payout Summary & Payout Request (Stubbed)
router.get('/payouts/summary', (req, res, next) => {
  partnersController.getPayoutSummary(req, res).catch(next);
});

router.post('/payouts/request', (req, res, next) => {
  partnersController.requestPayout(req, res).catch(next);
});

// 5. Admin Partner Status Approval / Transition
router.patch('/:id/status', authorize(UserRole.ADMIN), (req, res, next) => {
  partnersController.updatePartnerStatus(req, res).catch(next);
});

export const partnersRouter = router;
