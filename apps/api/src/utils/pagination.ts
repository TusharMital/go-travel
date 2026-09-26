import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function parsePagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationParams {
  const pageQuery = parseInt(req.query.page as string, 10);
  const limitQuery = parseInt(req.query.limit as string, 10);

  const page = !isNaN(pageQuery) && pageQuery > 0 ? pageQuery : 1;
  let limit = !isNaN(limitQuery) && limitQuery > 0 ? limitQuery : defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function formatPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
