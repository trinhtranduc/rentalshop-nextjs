/**
 * #362 — what the counter collects or hands back for an order (same rule as the QR payment amount).
 */
import { computeOrderBalance } from '../../apps/api/lib/order-balance';

const paid = (amount: number, notes: string, status = 'COMPLETED') => ({ amount, notes, status });

describe('computeOrderBalance (#362)', () => {
  it('RESERVED rental: rest of the total plus collateral money, minus what was already paid at pickup', () => {
    const order = { orderType: 'RENT', status: 'RESERVED', totalAmount: 1000000, depositAmount: 300000, securityDeposit: 500000,
      payments: [paid(200000, 'PICKUP'), paid(999999, 'PICKUP', 'PENDING'), paid(300000, 'DEPOSIT')] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 1000000, refundDue: 0 });
  });

  it('PICKUPED rental: collateral money back when there are no fees', () => {
    const order = { orderType: 'RENT', status: 'PICKUPED', totalAmount: 600000, securityDeposit: 500000, lateFee: 0, damageFee: 0, payments: [] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 0, refundDue: 500000 });
  });

  it('PICKUPED rental: fees above the collateral are collected', () => {
    const order = { orderType: 'RENT', status: 'PICKUPED', securityDeposit: 100000, lateFee: 150000, damageFee: 50000,
      payments: [paid(20000, 'RETURN_ADJUSTMENT')] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 80000, refundDue: 0 });
  });

  it('SALE: total minus sale payments', () => {
    const order = { orderType: 'SALE', status: 'COMPLETED', totalAmount: 1150000, payments: [paid(1150000, 'SALE')] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('finished or cancelled rentals owe nothing', () => {
    expect(computeOrderBalance({ orderType: 'RENT', status: 'RETURNED', totalAmount: 500000 })).toEqual({ amountDue: 0, refundDue: 0 });
    expect(computeOrderBalance({ orderType: 'RENT', status: 'CANCELLED', totalAmount: 500000 })).toEqual({ amountDue: 0, refundDue: 0 });
  });
});
