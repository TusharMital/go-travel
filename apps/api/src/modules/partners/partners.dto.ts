import { z } from 'zod';
import { PartnerType, TransportMode } from '@travel/shared';

export const PartnerOnboardingSchema = z.object({
  business_name: z.string().min(2, 'Business name must have at least 2 characters'),
  partner_type: z.nativeEnum(PartnerType),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  payout_details_ref: z.string().optional(),
  modes_supported: z.array(z.nativeEnum(TransportMode)).optional(),
});

export type PartnerOnboardingDto = z.infer<typeof PartnerOnboardingSchema>;

export const CreatePartnerLocationSchema = z.object({
  name: z.string().min(2, 'Location name is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  opening_hours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
  accepted_item_categories: z.array(z.string()).optional(),
  max_bag_size: z.string().optional(),
  photos: z.array(z.string()).optional(),
  initial_capacity: z.number().int().positive().default(20),
  price_per_bag_per_day: z.number().positive().default(6.0),
});

export type CreatePartnerLocationDto = z.infer<typeof CreatePartnerLocationSchema>;

export const UpdateInventoryPricingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  total_capacity: z.number().int().min(0),
  price_per_bag_per_day: z.number().positive(),
});

export type UpdateInventoryPricingDto = z.infer<typeof UpdateInventoryPricingSchema>;

export const CreateTransportOptionSchema = z.object({
  mode: z.nativeEnum(TransportMode),
  origin_lat: z.number().min(-90).max(90),
  origin_lng: z.number().min(-180).max(180),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  estimated_price: z.number().positive(),
  estimated_duration_min: z.number().int().positive(),
  currency: z.string().default('USD'),
  deep_link_url: z.string().url().nullable().optional(),
});

export type CreateTransportOptionDto = z.infer<typeof CreateTransportOptionSchema>;
