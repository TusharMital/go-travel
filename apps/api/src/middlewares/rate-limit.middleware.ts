import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttemptStore = new Map<string, RateLimitRecord>();

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (req: Request) => {
      const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      return `${ip}:${email}`;
    },
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing with header if explicitly needed
    if (process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true') {
      next();
      return;
    }

    const key = keyGenerator(req);
    const now = Date.now();

    const record = loginAttemptStore.get(key);

    if (!record || now > record.resetAt) {
      // First attempt in new window
      loginAttemptStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          details: { retryAfterSeconds },
        },
      });
      return;
    }

    record.count += 1;
    next();
  };
}

export function resetRateLimits(): void {
  loginAttemptStore.clear();
}

// 5 attempts per 15 minutes for login
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});
