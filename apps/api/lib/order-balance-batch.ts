import { computeOrderBalance, type OrderBalanceInput } from './order-balance';

/**
 * `amountDue` / `refundDue` for a page of list rows (#389): orders list and calendar day rows.
 * One grouped query per page (`orderId`, step `notes`, SUM of COMPLETED amounts) instead of loading payment rows,
 * so the cost is bounded by the page size and the `(orderId, status)` index.
 */
export interface PaymentSumRow {
  orderId: number | null;
  notes: string | null;
  _sum: { amount: number | null };
}

interface PaymentGroupByClient {
  payment: { groupBy: (args: any) => Promise<any> };
}

export async function loadCompletedPaymentSums(
  client: PaymentGroupByClient,
  orderIds: number[]
): Promise<PaymentSumRow[]> {
  const ids = [...new Set(orderIds.filter((id) => Number.isInteger(id)))];
  if (ids.length === 0) return [];
  return (await client.payment.groupBy({
    by: ['orderId', 'notes'],
    where: { orderId: { in: ids }, status: 'COMPLETED' },
    _sum: { amount: true },
  })) as PaymentSumRow[];
}

export function attachOrderBalances<T extends OrderBalanceInput & { id: number }>(
  orders: T[],
  paymentSums: PaymentSumRow[]
): Array<T & { amountDue: number; refundDue: number }> {
  const paymentsByOrder = new Map<number, { amount: number; status: string; notes: string | null }[]>();
  for (const row of paymentSums) {
    if (row.orderId == null) continue;
    const list = paymentsByOrder.get(row.orderId) || [];
    list.push({ amount: row._sum?.amount || 0, status: 'COMPLETED', notes: row.notes });
    paymentsByOrder.set(row.orderId, list);
  }
  return orders.map((order) => ({
    ...order,
    ...computeOrderBalance({ ...order, payments: paymentsByOrder.get(order.id) || [] }),
  }));
}
