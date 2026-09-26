import { z } from 'zod';
import { PaymentRelatedType, PaymentStatus } from '@travel/shared';

export const CreatePaymentIntentDto = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  related_type: z.nativeEnum(PaymentRelatedType),
  related_id: z.string().min(1, 'related_id is required'),
  test_flag: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentDto>;

export const CapturePaymentDto = z.object({
  provider_ref: z.string().min(1, 'provider_ref is required'),
  amount: z.number().positive().optional(),
});

export type CapturePaymentInput = z.infer<typeof CapturePaymentDto>;

export const RefundPaymentDto = z.object({
  payment_id: z.string().optional(),
  provider_ref: z.string().optional(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
}).refine(data => data.payment_id || data.provider_ref, {
  message: 'Either payment_id or provider_ref must be provided',
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentDto>;

export const WebhookEventDto = z.object({
  event: z.string().min(1),
  data: z.object({
    provider_ref: z.string().min(1),
    amount: z.number().optional(),
    currency: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export type WebhookEventInput = z.infer<typeof WebhookEventDto>;
