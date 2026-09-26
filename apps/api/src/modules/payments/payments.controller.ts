import { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';
import {
  CreatePaymentIntentDto,
  CapturePaymentDto,
  RefundPaymentDto,
  WebhookEventDto,
} from './payments.dto.js';
import { parsePagination } from '../../utils/pagination.js';

export class PaymentsController {
  async createIntent(req: Request, res: Response) {
    const input = CreatePaymentIntentDto.parse(req.body);
    const userId = req.user!.id;
    const idempotencyKey = req.header('Idempotency-Key') || '';
    const correlationId = (req as any).correlationId;

    const result = await paymentsService.createIntent(
      userId,
      input,
      idempotencyKey,
      correlationId
    );

    res.status(201).json(result);
  }

  async capturePayment(req: Request, res: Response) {
    const input = CapturePaymentDto.parse(req.body);
    const correlationId = (req as any).correlationId;
    const actorUserId = req.user?.id;

    const result = await paymentsService.capturePayment(
      input,
      correlationId,
      actorUserId
    );

    res.status(200).json(result);
  }

  async refundPayment(req: Request, res: Response) {
    const input = RefundPaymentDto.parse(req.body);
    const correlationId = (req as any).correlationId;
    const actorUserId = req.user?.id;

    const result = await paymentsService.refundPayment(
      input,
      correlationId,
      actorUserId
    );

    res.status(200).json(result);
  }

  async listPayments(req: Request, res: Response) {
    const pagination = parsePagination(req);
    const userId = req.user!.id;
    const relatedType = req.query.related_type as string | undefined;

    const result = await paymentsService.listPayments(userId, pagination, relatedType);
    res.status(200).json(result);
  }

  async getPaymentById(req: Request, res: Response) {
    const paymentId = req.params.id;
    const userId = req.user!.id;

    const result = await paymentsService.getPaymentById(paymentId, userId);
    res.status(200).json(result);
  }

  async handleWebhook(req: Request, res: Response) {
    const input = WebhookEventDto.parse(req.body);
    const correlationId = (req as any).correlationId || 'webhook-correlation';

    const result = await paymentsService.processWebhook(input, correlationId);
    res.status(200).json(result);
  }
}

export const paymentsController = new PaymentsController();
