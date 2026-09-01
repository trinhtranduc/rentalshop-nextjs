import { describe, expect, it } from '@jest/globals';
import {
  computeEffectiveAvailableForDay,
  effectiveAvailableForCivilDay,
  resolveProductListAvailabilityOutletId,
} from '../../../apps/api/lib/product-list-effective-availability';
import { calendarRemainingForDay, mobileSameDayOrder } from './order-check-day-select.harness';

describe('resolveProductListAvailabilityOutletId', () => {
  it('prefers query outletId from mobile POS', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: 'MERCHANT',
        userOutletId: undefined,
        queryOutletId: 30,
      })
    ).toBe(30);
  });

  it('falls back to assigned outlet for outlet staff', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: 'OUTLET_STAFF',
        userOutletId: 30,
        queryOutletId: undefined,
      })
    ).toBe(30);
  });

  it('falls back to filter outlet for outlet staff without query param', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: 'OUTLET_STAFF',
        userOutletId: undefined,
        queryOutletId: undefined,
        filterOutletId: 30,
      })
    ).toBe(30);
  });

  it('returns undefined when no outlet context', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: 'MERCHANT',
        userOutletId: undefined,
        queryOutletId: undefined,
      })
    ).toBeUndefined();
  });
});

describe('computeEffectiveAvailableForDay (product list badge)', () => {
  it('matches Order Check: shelf 1 but 0 free today when fully booked', () => {
    // stock=1, nothing rented out yet, but 1 RESERVED overlaps today
    expect(
      computeEffectiveAvailableForDay({
        stock: 1,
        available: 1,
        renting: 0,
        conflictingQuantity: 1,
        reservedConflictQuantity: 1,
      })
    ).toBe(0);
  });

  it('matches Order Check: no conflict → full stock available today', () => {
    expect(
      computeEffectiveAvailableForDay({
        stock: 5,
        available: 4,
        renting: 1,
        conflictingQuantity: 0,
        reservedConflictQuantity: 0,
      })
    ).toBe(5);
  });

  it('subtracts overlapping rent quantity from stock (not shelf only)', () => {
    expect(
      computeEffectiveAvailableForDay({
        stock: 20,
        available: 19,
        renting: 1,
        conflictingQuantity: 1,
        reservedConflictQuantity: 0,
      })
    ).toBe(19);
  });
});

describe('effectiveAvailableForCivilDay (matches Order Check calendar)', () => {
  it('same-day booking shows 0 available on that VN civil day', () => {
    const ymd = '2026-08-28';
    const order = mobileSameDayOrder(1, ymd);
    const orders = [
      {
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        quantity: 1,
      },
    ];

    expect(
      effectiveAvailableForCivilDay({ stock: 1, civilDayYmd: ymd, orders })
    ).toBe(0);

    expect(calendarRemainingForDay(ymd, 1, [order])).toBe(0);
  });

  it('no bookings → full stock available today', () => {
    const ymd = '2026-09-01';
    expect(effectiveAvailableForCivilDay({ stock: 5, civilDayYmd: ymd, orders: [] })).toBe(5);
  });
});
