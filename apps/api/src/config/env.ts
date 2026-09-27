import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z
      .string()
      .default('postgresql://postgres:postgres@localhost:5432/travel_platform?schema=public'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_ACCESS_SECRET: z
      .string()
      .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
      .default('dev_jwt_access_secret_key_change_in_production'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters')
      .default('dev_jwt_refresh_secret_key_change_in_production'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    MAPS_PROVIDER: z.string().default('mock'),
    PAYMENTS_PROVIDER: z.string().default('mock'),
    NOTIFICATIONS_PROVIDER: z.string().default('console'),
    CORS_ALLOWED_ORIGINS: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        if (
          data.JWT_ACCESS_SECRET.includes('change_in_production') ||
          data.JWT_REFRESH_SECRET.includes('change_in_production')
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'In production mode, JWT secrets must be securely configured and not use default placeholders.',
      path: ['JWT_ACCESS_SECRET'],
    }
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables configuration:', parsedEnv.error.format());
  throw new Error('Invalid environment variables configuration');
}

const rawOrigins = parsedEnv.data.CORS_ALLOWED_ORIGINS
  ? parsedEnv.data.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

export const env = {
  ...parsedEnv.data,
  CORS_ALLOWED_ORIGIN_LIST: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    ...rawOrigins,
  ],
};

