import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';

const router = Router();

// Webhook endpoint (unauthenticated, external provider callbacks)
router.post('/webhook', (req, res, next) => {
  paymentsController.handleWebhook(req, res).catch(next);
});

// Authenticated endpoints
router.use(authenticate);

router.post('/intent', requireIdempotencyKey, (req, res, next) => {
  paymentsController.createIntent(req, res).catch(next);
});

router.post('/capture', (req, res, next) => {
  paymentsController.capturePayment(req, res).catch(next);
});

router.post('/refund', requireIdempotencyKey, (req, res, next) => {
  paymentsController.refundPayment(req, res).catch(next);
});

router.get('/', (req, res, next) => {
  paymentsController.listPayments(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  paymentsController.getPaymentById(req, res).catch(next);
});

export const paymentsRouter = router;
