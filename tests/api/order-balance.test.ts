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

  it('PICKUPED rental extended (#505): extra rent = total - pickup total is due at return, taken from the collateral', () => {
    const order = { orderType: 'RENT', status: 'PICKUPED', totalAmount: 400000, pickupTotalAmount: 300000, securityDeposit: 500000, lateFee: 0, damageFee: 0, payments: [] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 0, refundDue: 400000 });
    expect(computeOrderBalance({ ...order, securityDeposit: 50000 })).toEqual({ amountDue: 50000, refundDue: 0 });
  });

  it('PICKUPED rental never extended (#505): no pickup total recorded or equal to the total = as before', () => {
    const order = { orderType: 'RENT', status: 'PICKUPED', totalAmount: 400000, securityDeposit: 500000, lateFee: 0, damageFee: 0, payments: [] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 0, refundDue: 500000 });
    expect(computeOrderBalance({ ...order, pickupTotalAmount: null })).toEqual({ amountDue: 0, refundDue: 500000 });
    expect(computeOrderBalance({ ...order, pickupTotalAmount: 400000 })).toEqual({ amountDue: 0, refundDue: 500000 });
  });

  it('SALE: total minus sale payments', () => {
    const order = { orderType: 'SALE', status: 'COMPLETED', totalAmount: 1150000, payments: [paid(1150000, 'SALE')] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('finished or cancelled rentals owe nothing', () => {
    expect(computeOrderBalance({ orderType: 'RENT', status: 'RETURNED', totalAmount: 500000 })).toEqual({ amountDue: 0, refundDue: 0 });
    expect(computeOrderBalance({ orderType: 'RENT', status: 'CANCELLED', totalAmount: 500000 })).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('#1279 PICKUPED rental: editing the collateral after pick-up changes what is given back at return', () => {
    const order = { orderType: 'RENT', status: 'PICKUPED', totalAmount: 600000, securityDeposit: 0, lateFee: 150000, damageFee: 50000, payments: [] };
    expect(computeOrderBalance(order)).toEqual({ amountDue: 200000, refundDue: 0 });
    expect(computeOrderBalance({ ...order, securityDeposit: 500000 })).toEqual({ amountDue: 0, refundDue: 300000 });
    expect(computeOrderBalance({ ...order, securityDeposit: 700000 })).toEqual({ amountDue: 0, refundDue: 500000 });
  });
});

/**
 * #1490 — the deposit (cọc) is held from booking to return. At hand-over the rent is `max(0, total - deposit)`, so a deposit
 * above the rent never eats into the collateral; at return the excess deposit goes back with the collateral, minus fees.
 */
describe('computeOrderBalance with a deposit above the rent (#1490)', () => {
  const reserved = (total: number, deposit: number, collateral: number, payments: ReturnType<typeof paid>[] = []) =>
    computeOrderBalance({ orderType: 'RENT', status: 'RESERVED', totalAmount: total, depositAmount: deposit, securityDeposit: collateral, payments });
  const picked = (total: number, deposit: number, collateral: number, fee = 0, extra: Record<string, unknown> = {}) =>
    computeOrderBalance({ orderType: 'RENT', status: 'PICKUPED', totalAmount: total, depositAmount: deposit, securityDeposit: collateral, lateFee: fee, damageFee: 0, payments: [], ...extra });

  it('case 1 (deposit below the order): 300.000 rent, 100.000 deposit, 500.000 collateral, unchanged', () => {
    expect(reserved(300000, 100000, 500000)).toEqual({ amountDue: 700000, refundDue: 0 });
    expect(picked(300000, 100000, 500000)).toEqual({ amountDue: 0, refundDue: 500000 });
    expect(picked(300000, 100000, 500000, 50000)).toEqual({ amountDue: 0, refundDue: 450000 });
  });

  it('case 2 (deposit above the order): 100.000 rent, 300.000 deposit, 500.000 collateral', () => {
    expect(reserved(100000, 300000, 500000)).toEqual({ amountDue: 500000, refundDue: 0 });
    expect(picked(100000, 300000, 500000)).toEqual({ amountDue: 0, refundDue: 700000 });
    expect(picked(100000, 300000, 500000, 50000)).toEqual({ amountDue: 0, refundDue: 650000 });
  });

  it('case 2: the collateral collected at hand-over is not asked for again', () => {
    expect(reserved(100000, 300000, 500000, [paid(500000, 'PICKUP')])).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('case 2 without collateral: nothing at hand-over, the excess deposit comes back at return', () => {
    expect(reserved(100000, 300000, 0)).toEqual({ amountDue: 0, refundDue: 0 });
    expect(picked(100000, 300000, 0)).toEqual({ amountDue: 0, refundDue: 200000 });
    expect(picked(100000, 300000, 0, 50000)).toEqual({ amountDue: 0, refundDue: 150000 });
    expect(picked(100000, 300000, 0, 250000)).toEqual({ amountDue: 50000, refundDue: 0 });
  });

  it('a deposit equal to or below the rent behaves as before', () => {
    expect(reserved(100000, 100000, 0)).toEqual({ amountDue: 0, refundDue: 0 });
    expect(picked(100000, 100000, 0)).toEqual({ amountDue: 0, refundDue: 0 });
    expect(reserved(100000, 50000, 0)).toEqual({ amountDue: 50000, refundDue: 0 });
    expect(reserved(100000, 50000, 200000)).toEqual({ amountDue: 250000, refundDue: 0 });
    expect(picked(100000, 50000, 200000)).toEqual({ amountDue: 0, refundDue: 200000 });
    expect(reserved(100000, 0, 0)).toEqual({ amountDue: 100000, refundDue: 0 });
    expect(picked(100000, 0, 0)).toEqual({ amountDue: 0, refundDue: 0 });
  });

  it('an extended rental: the excess deposit pays part of the extra rent', () => {
    // pickup total 100.000, extended to 500.000 (extra 400.000), deposit 300.000 (excess 200.000): 200.000 due
    expect(picked(500000, 300000, 0, 0, { pickupTotalAmount: 100000 })).toEqual({ amountDue: 200000, refundDue: 0 });
  });
});
