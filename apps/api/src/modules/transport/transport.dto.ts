import { z } from 'zod';
import { TransportMode, TransportBookingStatus } from '@travel/shared';

export const SearchTransportOptionsQueryDto = z.object({
  origin_lat: z.coerce.number().min(-90).max(90, 'Origin latitude must be between -90 and 90'),
  origin_lng: z.coerce.number().min(-180).max(180, 'Origin longitude must be between -180 and 180'),
  dest_lat: z.coerce.number().min(-90).max(90, 'Destination latitude must be between -90 and 90'),
  dest_lng: z.coerce.number().min(-180).max(180, 'Destination longitude must be between -180 and 180'),
  scheduled_at: z.string().datetime().optional(),
  mode: z.enum(['taxi', 'rideshare', 'transit', 'bike', 'all']).default('all'),
});

export type SearchTransportOptionsQuery = z.infer<typeof SearchTransportOptionsQueryDto>;

export const CreateTransportBookingDto = z.object({
  transport_option_id: z.string().min(1, 'transport_option_id is required'),
  trip_id: z.string().uuid('Invalid trip_id format').optional(),
  scheduled_at: z.string().datetime({ message: 'scheduled_at must be an ISO datetime string' }),
  origin_lat: z.number().min(-90).max(90).optional(),
  origin_lng: z.number().min(-180).max(180).optional(),
  dest_lat: z.number().min(-90).max(90).optional(),
  dest_lng: z.number().min(-180).max(180).optional(),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
});

export type CreateTransportBookingInput = z.infer<typeof CreateTransportBookingDto>;

export const HandoffTransportDto = z.object({
  provider_name: z.string().min(1),
  deep_link_url: z.string().url(),
  mode: z.string().optional(),
  trip_id: z.string().uuid().optional(),
});

export type HandoffTransportInput = z.infer<typeof HandoffTransportDto>;
