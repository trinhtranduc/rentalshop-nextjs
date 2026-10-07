/**
 * #578 batch C (PKG-8): admin create order checks conflicts by Vietnam civil day, inclusive.
 * Before: `new Date('2026-10-07')` (UTC midnight) was compared with order instants, so a same-day rental on
 * 7 Oct (10:00-17:00 VN) did not conflict with a request for 7 Oct.
 * Run under TZ=UTC, TZ=Asia/Ho_Chi_Minh, TZ=America/Los_Angeles and TZ=Asia/Tokyo (the process zone stands in for
 * the browser zone); the results must be identical.
 */
import { calculateProductAvailability, availabilityForDateRange } from '../../../packages/hooks/src/hooks/useProductAvailability';

const product = { id: 7, available: 3 } as any;
const order = (id: number, pickupPlanAt: string, returnPlanAt: string, quantity = 1, status = 'RESERVED') => ({
  id,
  orderType: 'RENT',
  status,
  pickupPlanAt,
  returnPlanAt,
  orderItems: [{ productId: 7, quantity, name: 'Áo dài' }],
});

describe('useProductAvailability by Vietnam day', () => {
  it('a same-day rental conflicts with a request for that day', () => {
    const status = calculateProductAvailability(product, '2026-10-07', '2026-10-07', 1, [
      order(1, '2026-10-07T03:00:00.000Z', '2026-10-07T10:00:00.000Z', 2),
    ]);
    expect(status.conflicts.map((o) => o.id)).toEqual([1]);
    expect(status.availableQuantity).toBe(1);
  });

  it('decides at the Vietnam midnight (16:59:59Z / 17:00:00Z)', () => {
    const orders = [
      order(1, '2026-10-05T03:00:00.000Z', '2026-10-06T16:59:59.000Z'), // returned 6 Oct 23:59:59 → no
      order(2, '2026-10-05T03:00:00.000Z', '2026-10-06T17:00:00.000Z'), // returned 7 Oct 00:00 → yes
      order(3, '2026-10-07T17:00:00.000Z', '2026-10-09T03:00:00.000Z'), // picked up 8 Oct 00:00 → no
      order(4, '2026-10-07T16:59:59.000Z', '2026-10-09T03:00:00.000Z'), // picked up 7 Oct 23:59:59 → yes
      order(5, '2026-10-07T03:00:00.000Z', '2026-10-07T10:00:00.000Z', 1, 'RETURNED'), // not active
    ];
    const status = calculateProductAvailability(product, '2026-10-07', '2026-10-07', 1, orders);
    expect(status.conflicts.map((o) => o.id)).toEqual([2, 4]);
  });

  it('accepts ISO instants for the requested days and rejects return before pickup', () => {
    const status = calculateProductAvailability(product, '2026-10-06T17:00:00.000Z', '2026-10-07T16:59:59.999Z', 1, [
      order(1, '2026-10-07T03:00:00.000Z', '2026-10-07T10:00:00.000Z'),
    ]);
    expect(status.conflicts).toHaveLength(1);
    expect(calculateProductAvailability(product, '2026-10-08', '2026-10-07', 1, []).available).toBe(false);
  });

  it('per-day availability lists Vietnam day keys, month edge included', () => {
    const days = availabilityForDateRange(product, '2026-10-30', '2026-11-02', [
      order(1, '2026-10-31T17:00:00.000Z', '2026-11-01T10:00:00.000Z'), // 1 Nov VN only
    ]);
    expect(days.map((d) => [d.date, d.available])).toEqual([
      ['2026-10-30', 3],
      ['2026-10-31', 3],
      ['2026-11-01', 2],
      ['2026-11-02', 3],
    ]);
  });
});
