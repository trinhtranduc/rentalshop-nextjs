/**
 * #389 — list rows (orders list, calendar day) carry what the counter collects (`amountDue`) or hands back
 * (`refundDue`), from one grouped payment query per page (no payment rows sent to the client).
 */
import { attachOrderBalances, loadCompletedPaymentSums } from '../../apps/api/lib/order-balance-batch';

const sum = (orderId: number, notes: string | null, amount: number) => ({ orderId, notes, _sum: { amount } });

describe('order balance for list rows (#389)', () => {
  const reserved = { id: 1, orderType: 'RENT', status: 'RESERVED', totalAmount: 1000000, depositAmount: 300000, securityDeposit: 500000 };
  const pickedUp = { id: 2, orderType: 'RENT', status: 'PICKUPED', totalAmount: 800000, securityDeposit: 500000, lateFee: 100000, damageFee: 0 };
  const sale = { id: 3, orderType: 'SALE', status: 'RESERVED', totalAmount: 400000 };
  const cancelled = { id: 4, orderType: 'RENT', status: 'CANCELLED', totalAmount: 900000, depositAmount: 0, securityDeposit: 0 };
  const returned = { id: 5, orderType: 'RENT', status: 'RETURNED', totalAmount: 900000, securityDeposit: 200000 };

  it('adds amountDue / refundDue from the grouped COMPLETED payments', () => {
    const rows = attachOrderBalances([reserved, pickedUp, sale], [
      sum(1, 'PICKUP', 200000),
      sum(1, 'DEPOSIT', 300000), // deposit already netted by depositAmount
      sum(2, 'RETURN_ADJUSTMENT', 0),
      sum(3, 'SALE', 150000),
    ]);
    expect(rows.map((r) => [r.id, r.amountDue, r.refundDue])).toEqual([
      [1, 1000000, 0], // 1,000,000 − 300,000 + 500,000 − 200,000
      [2, 0, 400000], // late 100,000 − collateral 500,000 → give back 400,000
      [3, 250000, 0],
    ]);
  });

  it('keeps every original field', () => {
    const [row] = attachOrderBalances([{ ...reserved, orderNumber: 'ORD-1-0001' }], []);
    expect(row).toMatchObject({ id: 1, orderNumber: 'ORD-1-0001', totalAmount: 1000000 });
  });

  it('CANCELLED and RETURNED orders owe nothing, whatever was paid', () => {
    const rows = attachOrderBalances([cancelled, returned], [sum(4, 'PICKUP', 100000)]);
    expect(rows.map((r) => [r.amountDue, r.refundDue])).toEqual([[0, 0], [0, 0]]);
  });

  it('closed SALE orders (COMPLETED / CANCELLED) owe nothing even without recorded payments', () => {
    // Cash sales record no SALE payment; a finished or cancelled sale must not show "còn thu" in the list
    const rows = attachOrderBalances([
      { id: 6, orderType: 'SALE', status: 'COMPLETED', totalAmount: 50000 },
      { id: 7, orderType: 'SALE', status: 'CANCELLED', totalAmount: 50000 },
    ], []);
    expect(rows.map((r) => [r.amountDue, r.refundDue])).toEqual([[0, 0], [0, 0]]);
  });

  it('an order without payments owes its full pickup amount', () => {
    const [row] = attachOrderBalances([reserved], []);
    expect(row.amountDue).toBe(1200000);
  });

  it('reads only COMPLETED payment sums of the page orders, grouped by order and step', async () => {
    const groupBy = jest.fn().mockResolvedValue([sum(1, 'PICKUP', 5)]);
    const rows = await loadCompletedPaymentSums({ payment: { groupBy } }, [1, 2, 1]);
    expect(rows).toEqual([sum(1, 'PICKUP', 5)]);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['orderId', 'notes'],
      where: { orderId: { in: [1, 2] }, status: 'COMPLETED' },
      _sum: { amount: true },
    });
  });

  it('does not query for an empty page', async () => {
    const groupBy = jest.fn();
    expect(await loadCompletedPaymentSums({ payment: { groupBy } }, [])).toEqual([]);
    expect(groupBy).not.toHaveBeenCalled();
  });
});
