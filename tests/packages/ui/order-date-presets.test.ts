/**
 * #578 batch C (ADM-4, PKG-4): the order date filter, quick filters and export dialog build Vietnam day keys
 * whatever the browser zone. Before: presets used the browser day, a custom range shifted −1 day in a
 * Los Angeles browser, and max/default used the UTC day (`toISOString().split`).
 * Now = 2026-10-06T17:30:00Z = 00:30 on 7 Oct in Vietnam (still 6 Oct in UTC and Los Angeles).
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import {
  orderPresetKeys,
  rangeForKeys,
  keysForRange,
  exportCustomDefaultKeys,
} from '../../../packages/ui/src/components/features/Orders/components/order-date-presets';

const NOW = new Date('2026-10-06T17:30:00.000Z');
const BEFORE_MIDNIGHT = new Date('2026-10-06T16:59:59.000Z');

describe('order date presets', () => {
  it('presets end on the Vietnam today', () => {
    expect(orderPresetKeys('today', NOW)).toEqual({ from: '2026-10-07', to: '2026-10-07' });
    expect(orderPresetKeys('today', BEFORE_MIDNIGHT)).toEqual({ from: '2026-10-06', to: '2026-10-06' });
    expect(orderPresetKeys('month', NOW)).toEqual({ from: '2026-09-07', to: '2026-10-07' });
    expect(orderPresetKeys('90days', NOW)).toEqual({ from: '2026-07-09', to: '2026-10-07' });
    expect(orderPresetKeys('year', NOW)).toEqual({ from: '2025-10-07', to: '2026-10-07' });
    expect(orderPresetKeys('all', NOW)).toEqual({ from: '2020-01-01', to: '2026-10-07' });
    expect(orderPresetKeys('week', NOW)).toEqual({ from: '2026-10-05', to: '2026-10-07' });
    expect(orderPresetKeys('quarter', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    expect(orderPresetKeys('quarter', BEFORE_MIDNIGHT)).toEqual({ from: '2026-10-01', to: '2026-10-06' });
  });

  it('a custom range keeps the typed keys and becomes Vietnam day bounds', () => {
    const range = rangeForKeys({ from: '2026-10-01', to: '2026-10-07' });
    expect(range.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-07T16:59:59.999Z');
    expect(keysForRange(range.start, range.end)).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    // month and year edges
    const edge = rangeForKeys({ from: '2026-12-31', to: '2027-01-01' });
    expect(keysForRange(edge.start, edge.end)).toEqual({ from: '2026-12-31', to: '2027-01-01' });
  });

  it('export custom range defaults to the last 30 Vietnam days, max = Vietnam today', () => {
    expect(exportCustomDefaultKeys(NOW)).toEqual({ startDate: '2026-09-07', endDate: '2026-10-07' });
    expect(exportCustomDefaultKeys(BEFORE_MIDNIGHT)).toEqual({ startDate: '2026-09-06', endDate: '2026-10-06' });
  });
});
