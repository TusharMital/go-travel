import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Middleware factory to enforce strict Zod schema validation
 * across request body, query parameters, and route path parameters.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const IdParamDto = z.object({
  id: z.string().min(1, 'ID parameter is required').max(128, 'ID parameter exceeds max length'),
});

export const UuidParamDto = z.object({
  id: z.string().uuid('ID parameter must be a valid UUID'),
});

export const PaginationQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
