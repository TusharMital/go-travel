import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireIdempotencyKey } from '../../middlewares/idempotency.middleware.js';
import { validateRequest, IdParamDto } from '../../middlewares/validation.middleware.js';
import {
  WebhookEventDto,
  CreatePaymentIntentDto,
  CapturePaymentDto,
  RefundPaymentDto,
} from './payments.dto.js';

const router = Router();

// Webhook endpoint (unauthenticated, external provider callbacks)
router.post(
  '/webhook',
  validateRequest({ body: WebhookEventDto }),
  (req, res, next) => {
    paymentsController.handleWebhook(req, res).catch(next);
  }
);

// Authenticated endpoints
router.use(authenticate);

router.post(
  '/intent',
  requireIdempotencyKey,
  validateRequest({ body: CreatePaymentIntentDto }),
  (req, res, next) => {
    paymentsController.createIntent(req, res).catch(next);
  }
);

router.post(
  '/capture',
  validateRequest({ body: CapturePaymentDto }),
  (req, res, next) => {
    paymentsController.capturePayment(req, res).catch(next);
  }
);

router.post(
  '/refund',
  requireIdempotencyKey,
  validateRequest({ body: RefundPaymentDto }),
  (req, res, next) => {
    paymentsController.refundPayment(req, res).catch(next);
  }
);

router.get('/', (req, res, next) => {
  paymentsController.listPayments(req, res).catch(next);
});

router.get(
  '/:id',
  validateRequest({ params: IdParamDto }),
  (req, res, next) => {
    paymentsController.getPaymentById(req, res).catch(next);
  }
);

export const paymentsRouter = router;

