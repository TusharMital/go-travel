import { z } from 'zod';

export const GeocodeQuerySchema = z.object({
  address: z.string().min(1, 'Address cannot be empty'),
});

export type GeocodeQueryInput = z.infer<typeof GeocodeQuerySchema>;

export const ReverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

export type ReverseGeocodeQueryInput = z.infer<typeof ReverseGeocodeQuerySchema>;

export const CoordinatePairQuerySchema = z.object({
  origin_lat: z.coerce.number().min(-90).max(90, 'Origin latitude must be between -90 and 90'),
  origin_lng: z.coerce.number().min(-180).max(180, 'Origin longitude must be between -180 and 180'),
  dest_lat: z.coerce.number().min(-90).max(90, 'Destination latitude must be between -90 and 90'),
  dest_lng: z.coerce.number().min(-180).max(180, 'Destination longitude must be between -180 and 180'),
});

export type CoordinatePairQueryInput = z.infer<typeof CoordinatePairQuerySchema>;

export const CoordinatePairBodySchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export type CoordinatePairBodyInput = z.infer<typeof CoordinatePairBodySchema>;
