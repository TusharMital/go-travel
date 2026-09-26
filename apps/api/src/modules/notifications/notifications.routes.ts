import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// All notification endpoints require authentication
router.use(authenticate);

// 1. In-App Notifications
router.get('/', (req, res, next) => {
  notificationsController.listMyNotifications(req, res).catch(next);
});

router.patch('/:id/read', (req, res, next) => {
  notificationsController.markAsRead(req, res).catch(next);
});

// 2. Data-Driven Notification Dispatch
router.post('/', (req, res, next) => {
  notificationsController.sendNotification(req, res).catch(next);
});

// 3. Scheduled Job Endpoint
router.post('/jobs/pickup-reminders', (req, res, next) => {
  notificationsController.triggerPickupRemindersJob(req, res).catch(next);
});

// 4. Partner Status Change (Admin)
router.patch('/partners/:id/status', (req, res, next) => {
  notificationsController.updatePartnerStatus(req, res).catch(next);
});

export const notificationsRouter = router;

// Also export standalone partners router for /api/v1/partners
const partners = Router();
partners.use(authenticate);
partners.patch('/:id/status', (req, res, next) => {
  notificationsController.updatePartnerStatus(req, res).catch(next);
});
export const partnersRouter = partners;
