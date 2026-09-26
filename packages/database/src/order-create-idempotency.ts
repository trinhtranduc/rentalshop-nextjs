import { createHash } from 'crypto';

export type OrderCreateItemSignature = {
  productId: number;
  quantity: number;
};

export type OrderCreateDuplicateParams = {
  outletId: number;
  customerId?: number | null;
  createdById: number;
  orderType: string;
  totalAmount: number;
  items: OrderCreateItemSignature[];
};

/**
 * Order-independent composition string used by duplicate detection.
 * Same items in different order must produce the same signature.
 */
export function orderItemSignature(items: OrderCreateItemSignature[]): string {
  return items
    .map((item) => `${Number(item.productId)}x${Number(item.quantity)}`)
    .sort()
    .join('|');
}

/**
 * Stable signed 32-bit key for pg_advisory_xact_lock.
 * Two concurrent identical creates share this key and serialize inside one transaction.
 */
export function orderCreateAdvisoryLockKey(params: OrderCreateDuplicateParams): number {
  const payload = [
    params.outletId,
    params.customerId ?? 'null',
    params.createdById,
    params.orderType,
    Math.round(Number(params.totalAmount) * 100),
    orderItemSignature(params.items)
  ].join(':');

  return createHash('sha256').update(payload).digest().readInt32BE(0);
}
