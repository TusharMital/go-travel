import { z } from 'zod';
import { TripStatus, ItineraryItemType } from '@travel/shared';

export const CreateTripDto = z
  .object({
    title: z.string().min(1, 'Trip title is required'),
    origin_place: z.string().min(1, 'Origin location is required'),
    destination_place: z.string().min(1, 'Destination location is required'),
    start_date: z.string().datetime({ message: 'start_date must be an ISO datetime string' }),
    end_date: z.string().datetime({ message: 'end_date must be an ISO datetime string' }),
    timezone: z.string().default('UTC'),
    status: z.nativeEnum(TripStatus).default(TripStatus.PLANNING),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: 'end_date must be on or after start_date',
    path: ['end_date'],
  });

export type CreateTripInput = z.infer<typeof CreateTripDto>;

export const UpdateTripDto = z
  .object({
    title: z.string().min(1).optional(),
    origin_place: z.string().min(1).optional(),
    destination_place: z.string().min(1).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    timezone: z.string().optional(),
    status: z.nativeEnum(TripStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'end_date must be on or after start_date',
      path: ['end_date'],
    }
  );

export type UpdateTripInput = z.infer<typeof UpdateTripDto>;

export const CreateItineraryItemDto = z
  .object({
    type: z.nativeEnum(ItineraryItemType),
    title: z.string().min(1, 'Item title is required'),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    address: z.string().optional(),
    starts_at: z.string().datetime({ message: 'starts_at must be an ISO datetime string' }),
    ends_at: z.string().datetime({ message: 'ends_at must be an ISO datetime string' }),
    sequence_order: z.number().int().default(0),
    linked_storage_booking_id: z.string().uuid().optional(),
    linked_transport_booking_id: z.string().uuid().optional(),
  })
  .refine((data) => new Date(data.ends_at) >= new Date(data.starts_at), {
    message: 'ends_at must be on or after starts_at',
    path: ['ends_at'],
  });

export type CreateItineraryItemInput = z.infer<typeof CreateItineraryItemDto>;

export const UpdateItineraryItemDto = z
  .object({
    type: z.nativeEnum(ItineraryItemType).optional(),
    title: z.string().min(1).optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    address: z.string().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
    sequence_order: z.number().int().optional(),
    linked_storage_booking_id: z.string().uuid().nullable().optional(),
    linked_transport_booking_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at) >= new Date(data.starts_at);
      }
      return true;
    },
    {
      message: 'ends_at must be on or after starts_at',
      path: ['ends_at'],
    }
  );

export type UpdateItineraryItemInput = z.infer<typeof UpdateItineraryItemDto>;
