import { describe, expect, it } from 'vitest';
import { mapAvailabilityOrderDisplay } from '../../../apps/api/lib/availability';

describe('mapAvailabilityOrderDisplay', () => {
  it('includes createdAt ISO string for mobile Ngày tạo column', () => {
    const createdAt = new Date('2026-03-15T08:30:00.000Z');

    const result = mapAvailabilityOrderDisplay(
      {
        id: 7480,
        orderNumber: '538194',
        orderType: 'RENT',
        status: 'PICKUPED',
        createdAt,
        pickupPlanAt: new Date('2026-07-07T17:00:00.000Z'),
        returnPlanAt: new Date('2026-07-12T16:59:59.000Z'),
        customer: {
          firstName: 'Chị',
          lastName: 'Thuỷ',
          phone: '0876878999',
        },
        orderItems: [{ productId: 13832, quantity: 1 }],
      },
      13832,
      true
    );

    expect(result.createdAt).toBe('2026-03-15T08:30:00.000Z');
    expect(result.customerName).toBe('Chị Thuỷ');
    expect(result.quantity).toBe(1);
    expect(result.isConflict).toBe(true);
  });

  it('returns null createdAt when order has no createdAt', () => {
    const result = mapAvailabilityOrderDisplay(
      {
        id: 1,
        orderNumber: '100',
        orderType: 'SALE',
        status: 'COMPLETED',
        createdAt: null,
        pickupPlanAt: null,
        returnPlanAt: null,
        customer: null,
        orderItems: [{ productId: 10, quantity: 2 }],
      },
      10,
      false
    );

    expect(result.createdAt).toBeNull();
    expect(result.quantity).toBe(2);
  });
});
