/**
 * #361 — which order status changes the API accepts.
 */
import { canChangeOrderStatus } from '../../../packages/constants/src/status';

describe('canChangeOrderStatus (#361)', () => {
  it.each([
    ['RENT', 'RESERVED', 'PICKUPED'],
    ['RENT', 'PICKUPED', 'RETURNED'],
    ['RENT', 'RESERVED', 'CANCELLED'],
    ['RENT', 'PICKUPED', 'CANCELLED'],
    ['SALE', 'COMPLETED', 'CANCELLED'],
    ['SALE', 'RESERVED', 'COMPLETED'],
    ['RENT', 'PICKUPED', 'PICKUPED'],
    ['SALE', 'COMPLETED', 'COMPLETED'],
  ])('%s %s → %s is allowed', (orderType, from, to) => {
    expect(canChangeOrderStatus(orderType, from, to)).toBe(true);
  });

  it.each([
    ['RENT', 'RETURNED', 'RESERVED'],
    ['RENT', 'RETURNED', 'PICKUPED'],
    ['RENT', 'RETURNED', 'CANCELLED'],
    ['RENT', 'PICKUPED', 'RESERVED'],
    ['RENT', 'RESERVED', 'RETURNED'],
    ['RENT', 'RESERVED', 'COMPLETED'],
    ['RENT', 'CANCELLED', 'RESERVED'],
    ['SALE', 'COMPLETED', 'PICKUPED'],
    ['SALE', 'COMPLETED', 'RESERVED'],
    ['SALE', 'CANCELLED', 'COMPLETED'],
  ])('%s %s → %s is rejected', (orderType, from, to) => {
    expect(canChangeOrderStatus(orderType, from, to)).toBe(false);
  });
});
