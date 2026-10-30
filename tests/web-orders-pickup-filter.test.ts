/**
 * #1369 shop web Đơn hàng: "Ngày giao" (pickupPlanAt) filter next to "Ngày tạo".
 * The API takes one `dateField` per request, so the two date filters exclude each other.
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it, jest } from '@jest/globals';
import {
  PICKUP_PRESETS,
  dateFilterApiParams,
  dateFilterPatch,
  dateFilterRange,
  parseDateFilter,
  parsePickupPreset,
  pickupRange,
} from '../apps/client/app/orders/orders-model';

jest.mock('../packages/database/src/client', () => ({ prisma: {} }));

const TODAY = '2026-10-30';

describe('pickup preset from the URL', () => {
  it('reads the known values and falls back to any day', () => {
    expect(PICKUP_PRESETS).toEqual(['any', 'today', 'tomorrow', 'next7d', '7d', '30d', 'month', 'custom']);
    expect(parsePickupPreset('today')).toBe('today');
    expect(parsePickupPreset('next7d')).toBe('next7d');
    expect(parsePickupPreset('custom')).toBe('custom');
    expect(parsePickupPreset('TODAY')).toBe('any');
    expect(parsePickupPreset('x')).toBe('any');
    expect(parsePickupPreset(null)).toBe('any');
  });
});

describe('pickupRange (Vietnam civil days)', () => {
  it('today and tomorrow are one day', () => {
    expect(pickupRange('today', TODAY)).toEqual({ startDate: '2026-10-30', endDate: '2026-10-30' });
    expect(pickupRange('tomorrow', TODAY)).toEqual({ startDate: '2026-10-31', endDate: '2026-10-31' });
  });
  it('tomorrow and the next 7 days cross a month and a year', () => {
    expect(pickupRange('tomorrow', '2026-10-31')).toEqual({ startDate: '2026-11-01', endDate: '2026-11-01' });
    expect(pickupRange('tomorrow', '2026-12-31')).toEqual({ startDate: '2027-01-01', endDate: '2027-01-01' });
    expect(pickupRange('next7d', TODAY)).toEqual({ startDate: '2026-10-30', endDate: '2026-11-05' });
  });
  it('keeps the Ngày tạo presets for the past', () => {
    expect(pickupRange('7d', TODAY)).toEqual({ startDate: '2026-10-24', endDate: '2026-10-30' });
    expect(pickupRange('30d', TODAY)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-30' });
    expect(pickupRange('month', TODAY)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-30' });
  });
  it('custom: one day, many days, reversed range, open ends, junk', () => {
    expect(pickupRange('custom', TODAY, { from: '2026-11-03', to: '2026-11-03' })).toEqual({ startDate: '2026-11-03', endDate: '2026-11-03' });
    expect(pickupRange('custom', TODAY, { from: '2026-11-01', to: '2026-11-09' })).toEqual({ startDate: '2026-11-01', endDate: '2026-11-09' });
    expect(pickupRange('custom', TODAY, { from: '2026-11-09', to: '2026-11-01' })).toEqual({ startDate: '2026-11-01', endDate: '2026-11-09' });
    expect(pickupRange('custom', TODAY, { from: '2026-11-02' })).toEqual({ startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(pickupRange('custom', TODAY, { from: 'abc', to: null })).toBeNull();
  });
  it('any day is no range', () => {
    expect(pickupRange('any', TODAY)).toBeNull();
  });
});

describe('only one date filter at a time', () => {
  it('reads created or pickup from the URL; pickup wins when both are typed in', () => {
    expect(parseDateFilter(null, null)).toEqual({ kind: 'created', preset: 'any' });
    expect(parseDateFilter('7d', null)).toEqual({ kind: 'created', preset: '7d' });
    expect(parseDateFilter(null, 'tomorrow')).toEqual({ kind: 'pickup', preset: 'tomorrow' });
    expect(parseDateFilter('7d', 'today')).toEqual({ kind: 'pickup', preset: 'today' });
    expect(parseDateFilter('7d', 'bogus')).toEqual({ kind: 'created', preset: '7d' });
    expect(parseDateFilter('today', null)).toEqual({ kind: 'created', preset: 'any' }); // "today" is not a created preset
  });

  it('choosing a pickup day clears created, and the other way round', () => {
    expect(dateFilterPatch('pickup', 'tomorrow')).toEqual({ pickup: 'tomorrow', created: null, from: null, to: null });
    expect(dateFilterPatch('created', '7d')).toEqual({ created: '7d', pickup: null, from: null, to: null });
  });

  it('"any day" of either filter clears both and the custom days', () => {
    expect(dateFilterPatch('pickup', 'any')).toEqual({ pickup: null, created: null, from: null, to: null });
    expect(dateFilterPatch('created', 'any')).toEqual({ created: null, pickup: null, from: null, to: null });
  });

  it('custom keeps the picked days and clears the other filter', () => {
    const draft = { from: '2026-11-01', to: '2026-11-03' };
    expect(dateFilterPatch('pickup', 'custom', draft)).toEqual({ pickup: 'custom', created: null, from: '2026-11-01', to: '2026-11-03' });
    expect(dateFilterPatch('created', 'custom', draft)).toEqual({ created: 'custom', pickup: null, from: '2026-11-01', to: '2026-11-03' });
  });

  it('reset: every date key goes to null', () => {
    const patch = dateFilterPatch('pickup', 'any');
    expect(Object.keys(patch).sort()).toEqual(['created', 'from', 'pickup', 'to']);
    expect(Object.values(patch).every((v) => v === null)).toBe(true);
  });
});

describe('API params of the date filter', () => {
  it('pickup asks for dateField=pickupPlanAt with the Vietnam day keys', () => {
    const range = dateFilterRange('pickup', 'tomorrow', TODAY);
    expect(dateFilterApiParams('pickup', range)).toEqual({ dateField: 'pickupPlanAt', startDate: '2026-10-31', endDate: '2026-10-31' });
  });
  it('created keeps the old request (no dateField)', () => {
    const range = dateFilterRange('created', '7d', TODAY);
    expect(dateFilterApiParams('created', range)).toEqual({ startDate: '2026-10-24', endDate: '2026-10-30' });
  });
  it('any day sends no date params at all (also not dateField)', () => {
    expect(dateFilterApiParams('pickup', dateFilterRange('pickup', 'any', TODAY))).toEqual({});
    expect(dateFilterApiParams('created', null)).toEqual({});
  });
  it('custom range through the same helper', () => {
    const range = dateFilterRange('pickup', 'custom', TODAY, { from: '2026-11-09', to: '2026-11-01' });
    expect(dateFilterApiParams('pickup', range)).toEqual({ dateField: 'pickupPlanAt', startDate: '2026-11-01', endDate: '2026-11-09' });
  });
});

describe('orders API client forwards dateField', () => {
  it('searchOrders puts dateField, startDate and endDate in the query', async () => {
    const calls: string[] = [];
    jest.resetModules();
    jest.doMock('../packages/utils/src/core', () => ({
      authenticatedFetch: async (url: string) => {
        calls.push(url);
        return {};
      },
      parseApiResponse: async () => ({ success: true }),
    }));
    const { ordersApi } = await import('../packages/utils/src/api/orders');
    await ordersApi.searchOrders({ dateField: 'pickupPlanAt', startDate: '2026-10-31', endDate: '2026-10-31', page: 1, limit: 1 } as any);
    await ordersApi.searchOrders({ startDate: '2026-10-24', endDate: '2026-10-30' } as any);
    const first = new URL(calls[0], 'http://x').searchParams;
    expect(first.get('dateField')).toBe('pickupPlanAt');
    expect(first.get('startDate')).toBe('2026-10-31');
    expect(first.get('endDate')).toBe('2026-10-31');
    expect(new URL(calls[1], 'http://x').searchParams.get('dateField')).toBeNull();
  });
});

describe('what a pickup day matches (database bounds)', () => {
  // The same bounds the route builds from a day key, then the same predicate Prisma applies
  const { getUtcRangeForDateKeys } = require('../packages/utils/src/core/date-range');
  const { applyOrderDateRange } = require('../packages/database/src/order-date-range');
  const match = (pickupPlanAt: Date | null, key: string) => {
    const r = getUtcRangeForDateKeys({ from: key }, 'Asia/Ho_Chi_Minh');
    const where: any = {};
    applyOrderDateRange(where, r.start, getUtcRangeForDateKeys({ from: key }, 'Asia/Ho_Chi_Minh').end, 'pickupPlanAt', true);
    const f = where.pickupPlanAt;
    if (pickupPlanAt === null) return f.not !== null; // `not: null` drops rows without a pickup day
    return pickupPlanAt >= f.gte && pickupPlanAt <= f.lte;
  };

  it('23:59 and 00:01 Vietnam time belong to their own day', () => {
    const late = new Date('2026-10-30T23:59:00+07:00');
    const early = new Date('2026-10-31T00:01:00+07:00');
    expect(match(late, '2026-10-30')).toBe(true);
    expect(match(late, '2026-10-31')).toBe(false);
    expect(match(early, '2026-10-31')).toBe(true);
    expect(match(early, '2026-10-30')).toBe(false);
  });

  it('an order without a pickup day (sale, draft) never matches', () => {
    expect(match(null, '2026-10-30')).toBe(false);
  });
});
