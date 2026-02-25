import { PaginationMeta } from '../dto/pagination.dto';

export interface PaginateOptions {
  page?: number;
  limit?: number;
  total: number;
}

export function paginate<T>(data: T[], options: PaginateOptions): { data: T[]; meta: PaginationMeta } {
  const page = Math.max(1, options.page || 1);
  let limit = options.limit || 20;
  if (limit > 100) {
    throw new Error('Limit cannot exceed 100');
  }
  limit = Math.max(1, limit);
  const total = options.total;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}
