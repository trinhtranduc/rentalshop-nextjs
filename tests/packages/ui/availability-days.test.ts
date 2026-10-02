/**
 * Order Check (/availability): the rental period is a Vietnam civil-day range.
 * The web sent UTC midnights, so an order returned at 00:42 on the first day (17:42Z the day before)
 * was not counted and the page showed 23/23 free instead of 21.
 */
import {
  shopDayRangeIso,
  shopDateKey,
  addDaysToKey,
  quickRanges,
  toActiveOrders,
  freeUnitsByDay,
} from '../../../packages/ui/src/components/features/Availability/availability-days';

describe('shopDayRangeIso', () => {
  it('starts at 00:00 and ends at 23:59:59.999 Vietnam time', () => {
    expect(shopDayRangeIso('2026-10-03', '2026-10-05')).toEqual({
      startDate: '2026-10-02T17:00:00.000Z',
      endDate: '2026-10-05T16:59:59.999Z',
    });
  });

  it('a one-day period covers that whole Vietnam day', () => {
    expect(shopDayRangeIso('2026-10-03', '2026-10-03')).toEqual({
      startDate: '2026-10-02T17:00:00.000Z',
      endDate: '2026-10-03T16:59:59.999Z',
    });
  });

  it('crosses a year end', () => {
    expect(shopDayRangeIso('2027-01-01', '2027-01-01').startDate).toBe('2026-12-31T17:00:00.000Z');
  });
});

describe('shopDateKey', () => {
  it('16:59:59Z is still the same Vietnam day, 17:00Z is the next', () => {
    expect(shopDateKey('2026-10-02T16:59:59.000Z')).toBe('2026-10-02');
    expect(shopDateKey('2026-10-02T17:00:00.000Z')).toBe('2026-10-03');
    expect(shopDateKey('2026-10-02T17:42:36.921Z')).toBe('2026-10-03');
  });
});

describe('addDaysToKey / quickRanges', () => {
  it('adds civil days across a month end', () => {
    expect(addDaysToKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysToKey('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('builds today, tomorrow, weekend and 3-day ranges from a Friday', () => {
    // 2026-10-02 is a Friday
    expect(quickRanges('2026-10-02')).toEqual({
      today: { from: '2026-10-02', to: '2026-10-02' },
      tomorrow: { from: '2026-10-03', to: '2026-10-03' },
      weekend: { from: '2026-10-03', to: '2026-10-04' },
      threeDays: { from: '2026-10-02', to: '2026-10-04' },
    });
  });

  it('weekend is today–Sunday on a Saturday and just today on a Sunday', () => {
    expect(quickRanges('2026-10-03').weekend).toEqual({ from: '2026-10-03', to: '2026-10-04' });
    expect(quickRanges('2026-10-04').weekend).toEqual({ from: '2026-10-04', to: '2026-10-04' });
  });
});

describe('toActiveOrders', () => {
  const order = {
    id: 14,
    orderNumber: 'ORD-001-0014',
    status: 'PICKUPED',
    orderType: 'RENT',
    customer: { firstName: 'Amber', lastName: 'Ramirez' },
    pickupPlanAt: '2026-09-28T06:42:55.772Z',
    returnPlanAt: '2026-10-02T17:42:36.921Z',
    orderItems: [
      { productId: 2, quantity: 2 },
      { productId: 7, quantity: 5 },
    ],
  };

  it('uses Vietnam days and flags the overlap on the first rental day', () => {
    const [row] = toActiveOrders([order], 2, '2026-10-03', '2026-10-05');
    expect(row.pickupPlanAt).toBe('2026-09-28');
    expect(row.returnPlanAt).toBe('2026-10-03');
    expect(row.isConflict).toBe(true);
    expect(row.customerName).toBe('Amber Ramirez');
    expect(row.orderType).toBe('RENT');
  });

  it('counts only the units of the checked product', () => {
    expect(toActiveOrders([order], 2, '', '')[0].quantity).toBe(2);
  });

  it('falls back to the nested product id', () => {
    const nested = { ...order, orderItems: [{ product: { id: 2 }, quantity: 3 }] };
    expect(toActiveOrders([nested], 2, '', '')[0].quantity).toBe(3);
  });
});

describe('freeUnitsByDay', () => {
  const orders = [
    { pickupPlanAt: '2026-09-28', returnPlanAt: '2026-10-03', quantity: 2 },
    { pickupPlanAt: '2026-10-03', returnPlanAt: '2026-10-03', quantity: 1 },
  ] as any;

  it('subtracts every order covering the day; a same-day pickup and return still occupies it', () => {
    expect(freeUnitsByDay(23, orders, ['2026-10-02', '2026-10-03', '2026-10-04'])).toEqual([21, 20, 23]);
  });

  it('ignores sale orders, like the availability API, so the grid matches the period result', () => {
    const withSale = [...orders, { pickupPlanAt: '2026-10-03', returnPlanAt: '2026-10-03', quantity: 5, orderType: 'SALE' }];
    expect(freeUnitsByDay(23, withSale, ['2026-10-03'])).toEqual([20]);
  });

  it('never goes below zero', () => {
    expect(freeUnitsByDay(1, orders, ['2026-10-03'])).toEqual([0]);
  });
});
