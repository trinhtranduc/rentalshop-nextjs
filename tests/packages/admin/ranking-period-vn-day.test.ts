/**
 * #578 batch C (ADM-1): admin dashboard ranking presets (today / month / year) come from the Vietnam today.
 * Before: they came from the browser day, so a UTC or Los Angeles browser at 00:30 VN asked for yesterday.
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import { getAdminDashboardDateRange } from '../../../apps/admin/app/dashboard/ranking-period';

const NOW = new Date('2026-10-06T17:30:00.000Z'); // 7 Oct 00:30 VN

describe('ranking period', () => {
  afterEach(() => jest.useRealTimers());

  it('today / month / year from the Vietnam today', () => {
    jest.useFakeTimers({ now: NOW });
    expect(getAdminDashboardDateRange('today')).toEqual({ startDate: '2026-10-07', endDate: '2026-10-07', period: 'today' });
    expect(getAdminDashboardDateRange('month')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31', period: 'month' });
    expect(getAdminDashboardDateRange('year')).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31', period: 'year' });
    jest.setSystemTime(new Date('2026-12-31T17:00:00.000Z')); // 1 Jan 2027 00:00 VN
    expect(getAdminDashboardDateRange('year')).toEqual({ startDate: '2027-01-01', endDate: '2027-12-31', period: 'year' });
    jest.setSystemTime(new Date('2026-10-31T16:59:59.000Z')); // still 31 Oct VN
    expect(getAdminDashboardDateRange('month').startDate).toBe('2026-10-01');
  });
});
