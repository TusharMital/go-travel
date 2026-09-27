import { z } from 'zod';
import { ReviewRelatedType } from '@travel/shared';

export const CreateReviewDto = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  comment: z.string().max(1000, 'Comment must not exceed 1000 characters').optional().nullable(),
});

export const ReviewQueryDto = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateReviewInput = z.infer<typeof CreateReviewDto>;
export type ReviewQueryInput = z.infer<typeof ReviewQueryDto>;
