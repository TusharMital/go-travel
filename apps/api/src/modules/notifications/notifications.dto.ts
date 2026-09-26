import { z } from 'zod';
import { NotificationChannel, PartnerStatus } from '@travel/shared';

export const SendNotificationDto = z.object({
  user_id: z.string().uuid('Invalid user_id format').optional(),
  template: z.string().min(1, 'template identifier is required'),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.IN_APP),
  variables: z.record(z.any()).default({}),
});

export type SendNotificationInput = z.infer<typeof SendNotificationDto>;

export const UpdatePartnerStatusDto = z.object({
  status: z.nativeEnum(PartnerStatus),
  notes: z.string().optional(),
});

export type UpdatePartnerStatusInput = z.infer<typeof UpdatePartnerStatusDto>;
