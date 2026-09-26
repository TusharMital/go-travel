import { z } from 'zod';
import { StorageBookingStatus } from '@travel/shared';

export const SearchStorageLocationsQueryDto = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radius_km: z.coerce.number().min(0.1).max(500).default(10),
  drop_off_at: z.string().datetime().optional(),
  pick_up_at: z.string().datetime().optional(),
  bag_count: z.coerce.number().int().min(1).default(1),
  max_price: z.coerce.number().positive().optional(),
  item_size: z.enum(['cabin', 'large', 'oversized']).optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchStorageLocationsQuery = z.infer<typeof SearchStorageLocationsQueryDto>;

export const SingleInventoryItemDto = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  total_capacity: z.number().int().min(0, 'Capacity cannot be negative'),
  price_per_bag_per_day: z.number().positive('Price must be greater than zero'),
});

export type SingleInventoryItem = z.infer<typeof SingleInventoryItemDto>;

export const UpdateInventoryDto = z.object({
  inventories: z.array(SingleInventoryItemDto).min(1, 'At least one date inventory item is required'),
});

export type UpdateInventoryInput = z.infer<typeof UpdateInventoryDto>;

export const CreateStorageBookingDto = z
  .object({
    location_id: z.string().uuid('Invalid location_id format'),
    trip_id: z.string().uuid('Invalid trip_id format').optional(),
    bag_count: z.number().int().min(1, 'At least 1 bag is required'),
    drop_off_at: z.string().datetime({ message: 'drop_off_at must be an ISO datetime string' }),
    pick_up_at: z.string().datetime({ message: 'pick_up_at must be an ISO datetime string' }),
    currency: z.string().default('USD'),
  })
  .refine((data) => new Date(data.pick_up_at) >= new Date(data.drop_off_at), {
    message: 'pick_up_at must be on or after drop_off_at',
    path: ['pick_up_at'],
  });

export type CreateStorageBookingInput = z.infer<typeof CreateStorageBookingDto>;

export const TransitionBookingStatusDto = z.object({
  target_status: z.nativeEnum(StorageBookingStatus),
  cancellation_reason: z.string().optional(),
});

export type TransitionBookingStatusInput = z.infer<typeof TransitionBookingStatusDto>;
