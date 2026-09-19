export type AdminDashboardPeriod = 'today' | 'month' | 'year';
export type RankingSortBy = 'revenue' | 'quantity';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseAdminPeriod(value: string | null | undefined): AdminDashboardPeriod {
  if (value === 'today' || value === 'year') return value;
  return 'month';
}

export function parseRankingSortBy(value: string | null | undefined): RankingSortBy {
  return value === 'quantity' ? 'quantity' : 'revenue';
}

/**
 * Local calendar dates as YYYY-MM-DD.
 * Why not toISOString(): Vietnam is UTC+7, so midnight local becomes the previous UTC day
 * and ranking APIs would miss today's / this month's orders.
 */
export function getAdminDashboardDateRange(period: AdminDashboardPeriod): {
  startDate: string;
  endDate: string;
  period: AdminDashboardPeriod;
} {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
      break;
    case 'month':
    default:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
  }

  return {
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    period
  };
}

export function unwrapRankingPage<T>(data: unknown): {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      page: 1,
      limit: data.length || 1,
      total: data.length,
      totalPages: 1
    };
  }

  const pageData = (data ?? {}) as {
    items?: T[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const items = Array.isArray(pageData.items) ? pageData.items : [];
  return {
    items,
    page: pageData.page || 1,
    limit: pageData.limit || items.length || 1,
    total: pageData.total ?? items.length,
    totalPages: pageData.totalPages ?? 1
  };
}
