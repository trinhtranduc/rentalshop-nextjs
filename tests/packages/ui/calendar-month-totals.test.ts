/**
 * #349 — calendar summary cards always showed 0: they counted an empty orders list.
 * They now sum the per-day counts the grid already shows.
 */
import { sumMonthCounts } from '../../../packages/ui/src/components/features/Calendars/month-totals';

describe('sumMonthCounts (#349)', () => {
  const counts = { '2026-09-30': 4, '2026-10-02': 2, '2026-10-03': 7, '2026-10-31': 1, '2026-11-01': 9 };

  it('sums only the days of the displayed month (month is 0-based)', () => {
    expect(sumMonthCounts(counts, 2026, 9)).toBe(10);
  });

  it('accepts a Map', () => {
    expect(sumMonthCounts(new Map(Object.entries(counts)), 2026, 9)).toBe(10);
  });

  it('pads single-digit months', () => {
    expect(sumMonthCounts({ '2026-02-01': 3, '2026-12-01': 5 }, 2026, 1)).toBe(3);
  });

  it('returns 0 when there are no counts', () => {
    expect(sumMonthCounts(undefined, 2026, 9)).toBe(0);
    expect(sumMonthCounts(new Map(), 2026, 9)).toBe(0);
  });
});
