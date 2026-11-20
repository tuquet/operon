export interface PaginationParams {
  currentPage?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

/**
 * Paginates an in-memory array safely with bounds checking.
 * Defaults: currentPage = 1, pageSize = 15.
 */
export function paginateArray<T>(
  data: null | readonly T[] | undefined,
  params?: PaginationParams,
): PaginatedResult<T> {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { items: [], total: 0 };
  }

  const rawPage = params?.currentPage ?? 1;
  const currentPage = Math.max(1, rawPage);
  const rawSize = params?.pageSize ?? 15;
  const pageSize = rawSize < 1 ? 15 : rawSize;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: data.slice(start, end),
    total: data.length,
  };
}
