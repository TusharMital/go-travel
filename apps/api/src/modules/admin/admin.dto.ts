import { z } from 'zod';
import { PartnerStatus } from '@travel/shared';

export const ApprovePartnerDto = z.object({
  notes: z.string().optional(),
});

export const SuspendPartnerDto = z.object({
  reason: z.string().min(3, 'Suspension reason is required and must be at least 3 characters'),
  notes: z.string().optional(),
});

export const PartnerQueryDto = z.object({
  status: z.enum(['all', 'pending', 'verified', 'suspended', 'rejected']).optional().default('all'),
  type: z.enum(['all', 'storage', 'transport', 'both']).optional().default('all'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const BookingLookupQueryDto = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  type: z.enum(['all', 'storage', 'transport']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const AuditLogQueryDto = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
});

export type ApprovePartnerInput = z.infer<typeof ApprovePartnerDto>;
export type SuspendPartnerInput = z.infer<typeof SuspendPartnerDto>;
export type PartnerQueryInput = z.infer<typeof PartnerQueryDto>;
export type BookingLookupQueryInput = z.infer<typeof BookingLookupQueryDto>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQueryDto>;
