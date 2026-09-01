import { describe, expect, it } from 'vitest';
import {
  computeEffectiveAvailableForDay,
  resolveProductListAvailabilityOutletId,
} from '../../../apps/api/lib/product-list-effective-availability';
import { USER_ROLE } from '@rentalshop/constants';

describe('resolveProductListAvailabilityOutletId', () => {
  it('prefers query outletId from mobile POS', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: USER_ROLE.MERCHANT,
        userOutletId: undefined,
        queryOutletId: 30,
      })
    ).toBe(30);
  });

  it('falls back to assigned outlet for outlet staff', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: USER_ROLE.OUTLET_STAFF,
        userOutletId: 30,
        queryOutletId: undefined,
      })
    ).toBe(30);
  });

  it('returns undefined when no outlet context', () => {
    expect(
      resolveProductListAvailabilityOutletId({
        role: USER_ROLE.MERCHANT,
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
