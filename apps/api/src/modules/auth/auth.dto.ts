import { z } from 'zod';
import { UserRole } from '@travel/shared';

export const RegisterDto = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.TRAVELER),
  business_name: z.string().optional(), // For partner registrations
});

export type RegisterInput = z.infer<typeof RegisterDto>;

export const LoginDto = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginDto>;

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenDto>;
