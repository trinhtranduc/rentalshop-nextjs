/**
 * Order detail money (preview): the subtotal is the item sum (the page showed the discounted total),
 * and "to collect" follows the order state, with the same rules as iOS and Android:
 * - rental, reserved → at pickup: total − deposit paid + security deposit
 * - rental, picked up → at return: damage fee + late fee − security deposit (negative = refund)
 * - sale, not completed → the total
 * - anything else → nothing
 */
import { computeOrderMoney } from '../../../packages/ui/src/components/features/OrderDetail/order-money';

const base = {
  orderType: 'RENT',
  status: 'RESERVED',
  orderItems: [{ quantity: 1, unitPrice: 81, totalPrice: 81 }],
  totalAmount: 64.8,
  discountAmount: 16.2,
  depositAmount: 31,
};

describe('computeOrderMoney', () => {
  it('subtotal is the item sum, total the stored amount (#944989: 81 − 20%)', () => {
    const m = computeOrderMoney(base, { securityDeposit: 0, damageFee: 0 });
    expect(m.subtotal).toBe(81);
    expect(m.discount).toBe(16.2);
    expect(m.total).toBe(64.8);
  });

  it('reserved rental: collect at pickup = total − deposit + security deposit', () => {
    const m = computeOrderMoney(base, { securityDeposit: 200, damageFee: 0 });
    expect(m.stage).toBe('pickup');
    expect(m.collect).toBeCloseTo(64.8 - 31 + 200);
  });

  it('picked-up rental: return adjustment, negative means refund', () => {
    const picked = { ...base, status: 'PICKUPED', lateFee: 10 };
    expect(computeOrderMoney(picked, { securityDeposit: 200, damageFee: 50 })).toMatchObject({ stage: 'return', collect: -140 });
    expect(computeOrderMoney(picked, { securityDeposit: 0, damageFee: 50 }).collect).toBe(60);
  });

  it('sale: the total until completed', () => {
    const sale = { ...base, orderType: 'SALE', depositAmount: 0 };
    expect(computeOrderMoney(sale, { securityDeposit: 0, damageFee: 0 })).toMatchObject({ stage: 'sale', collect: 64.8 });
    expect(computeOrderMoney({ ...sale, status: 'COMPLETED' }, { securityDeposit: 0, damageFee: 0 })).toMatchObject({ stage: 'done', collect: 0 });
  });

  it('returned, completed or cancelled rentals: nothing to collect', () => {
    for (const status of ['RETURNED', 'COMPLETED', 'CANCELLED']) {
      expect(computeOrderMoney({ ...base, status }, { securityDeposit: 200, damageFee: 0 })).toMatchObject({ stage: 'done', collect: 0 });
    }
  });

  it('never collects less than 0 at pickup when the deposit covered everything', () => {
    expect(computeOrderMoney({ ...base, depositAmount: 100 }, { securityDeposit: 0, damageFee: 0 }).collect).toBe(0);
  });
});
