import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

export function requireIdempotencyKey(req: Request, res: Response, next: NextFunction): void {
  const headerKey = req.headers['idempotency-key'] as string;
  const bodyKey = req.body?.idempotency_key as string;
  const key = headerKey || bodyKey;

  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    res.status(400).json({
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'An Idempotency-Key header is required for this mutating operation.',
      },
    });
    return;
  }

  req.idempotencyKey = key.trim();
  if (req.body && typeof req.body === 'object') {
    req.body.idempotency_key = req.idempotencyKey;
  }
  next();
}
