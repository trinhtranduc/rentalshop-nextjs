export interface RankingPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type RankingSortBy = 'revenue' | 'quantity';

const MAX_LIMIT = 100;

export function parseRankingQuery(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  sortBy: RankingSortBy;
} {
  const parsedLimit = parseInt(searchParams.get('limit') || '5', 10);
  const parsedPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') === 'quantity' ? 'quantity' : 'revenue';
  return {
    page: Number.isFinite(parsedPage) ? parsedPage : 1,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : 5,
    sortBy
  };
}

export function paginateRanked<T>(
  items: T[],
  page: number,
  limit: number
): RankingPage<T> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT) : 10;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const requestedPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    page: currentPage,
    limit: safeLimit,
    total,
    totalPages
  };
}
