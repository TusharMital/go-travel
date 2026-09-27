import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

function getStore(name: string): Map<string, RateLimitRecord> {
  if (!rateLimitStores.has(name)) {
    rateLimitStores.set(name, new Map<string, RateLimitRecord>());
  }
  return rateLimitStores.get(name)!;
}

export interface RateLimiterOptions {
  name?: string;
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    name = 'default',
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req: Request) => {
      const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
      const userId = (req as any).user?.id || '';
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      return `${ip}:${userId}:${email}`;
    },
  } = options;

  const store = getStore(name);

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow explicit bypass header for non-rate-limiting tests
    if (process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true') {
      next();
      return;
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, record);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
      next();
      return;
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    const resetTimeSec = Math.ceil(record.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimeSec);

    if (record.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          details: {
            retryAfterSeconds,
            limit: max,
            windowMs,
          },
        },
      });
      return;
    }

    next();
  };
}

export function resetRateLimits(): void {
  for (const store of rateLimitStores.values()) {
    store.clear();
  }
}

// 1. Login rate limiter: 5 attempts per 15 minutes
export const loginRateLimiter = createRateLimiter({
  name: 'auth_login',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

// 2. Auth rate limiter (registration, password recovery, verification): 20 attempts per 15 minutes
export const authRateLimiter = createRateLimiter({
  name: 'auth_general',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication requests. Please try again later.',
});

// 3. Booking rate limiter: 30 bookings per 1 minute (prevents automated rapid overbooking/inventory exhaustion)
export const bookingRateLimiter = createRateLimiter({
  name: 'booking_endpoints',
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many booking requests. Please wait a moment before trying again.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || '';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    return `${ip}:${userId}`;
  },
});
