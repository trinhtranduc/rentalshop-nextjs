import { vnEndOfMonthKey, vnTodayKey } from './vn-day';

export type AdminDashboardPeriod = 'today' | 'month' | 'year';
export type RankingSortBy = 'revenue' | 'quantity';

export function parseAdminPeriod(value: string | null | undefined): AdminDashboardPeriod {
  if (value === 'today' || value === 'year') return value;
  return 'month';
}

export function parseRankingSortBy(value: string | null | undefined): RankingSortBy {
  return value === 'quantity' ? 'quantity' : 'revenue';
}

/**
 * Vietnam civil days as YYYY-MM-DD, whatever the browser zone (#578 ADM-1).
 * The browser's local day is yesterday in a UTC or Los Angeles browser between 00:00 and 07:00 Vietnam time,
 * and `toISOString()` gives the UTC day; the ranking APIs read these keys as Vietnam days.
 */
export function getAdminDashboardDateRange(period: AdminDashboardPeriod): {
  startDate: string;
  endDate: string;
  period: AdminDashboardPeriod;
} {
  const today = vnTodayKey();

  switch (period) {
    case 'today':
      return { startDate: today, endDate: today, period };
    case 'year':
      return { startDate: `${today.slice(0, 4)}-01-01`, endDate: `${today.slice(0, 4)}-12-31`, period };
    case 'month':
    default:
      return { startDate: `${today.slice(0, 7)}-01`, endDate: vnEndOfMonthKey(today), period };
  }
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
