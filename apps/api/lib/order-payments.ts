/**
 * Payment rows inside an order response (#1200).
 *
 * - Alias fields for every client: installed iOS builds decode `payments[]` with the keys
 *   `paymentMethod` and `paymentDate` (both required, `Order.swift:969-976` on `main-real`), while the API
 *   returned `method` / `processedAt`. We keep the old keys and add the two aliases.
 * - A payment with `notes === 'INSTALLMENT'` is a deposit stage that old clients would count twice
 *   ("Đã thu"); only a client that declares the `installments` capability gets it.
 *
 * Self-contained on purpose (no workspace import): route tests mock `@rentalshop/utils`.
 */

import { hasCapability } from './client-capabilities';

export const INSTALLMENT_NOTE = 'INSTALLMENT';

type PaymentLike = {
  method?: unknown;
  notes?: unknown;
  processedAt?: Date | string | null;
  createdAt?: Date | string | null;
  [key: string]: unknown;
};

/** ISO instant with milliseconds and `Z`, the format the iOS JSON date decoder reads (`JSONHelper.swift:68-90`). */
function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isInstallmentPayment(payment: { notes?: unknown } | null | undefined): boolean {
  return payment?.notes === INSTALLMENT_NOTE;
}

/** Adds `paymentMethod` (= `method`) and `paymentDate` (= `processedAt ?? createdAt`); every old key stays. */
export function withPaymentAliases<T extends PaymentLike>(payment: T): T & { paymentMethod: unknown; paymentDate: string | null } {
  return {
    ...payment,
    paymentMethod: payment.method,
    paymentDate: toIso(payment.processedAt) ?? toIso(payment.createdAt),
  };
}

export function shapePayments<T extends PaymentLike>(payments: T[], includeInstallments: boolean) {
  const rows = includeInstallments ? payments : payments.filter((payment) => !isInstallmentPayment(payment));
  return rows.map(withPaymentAliases);
}

/**
 * Order response with `payments[]` shaped for this caller. An order without a `payments` array is returned
 * as it is. `paymentCount` / `totalPaid`, when the order already carries them, drop the removed rows.
 */
export function shapeOrderPayments<T extends { payments?: unknown }>(
  order: T,
  request: { headers?: { get(name: string): string | null } | null } | null | undefined
): T {
  if (!order || !Array.isArray(order.payments)) return order;
  const includeInstallments = hasCapability(request, 'installments');
  const all = order.payments as PaymentLike[];
  const removed = includeInstallments ? [] : all.filter(isInstallmentPayment);
  const shaped: Record<string, unknown> = { ...order, payments: shapePayments(all, includeInstallments) };
  if (removed.length > 0) {
    const current = order as { paymentCount?: unknown; totalPaid?: unknown };
    if (typeof current.paymentCount === 'number') shaped.paymentCount = current.paymentCount - removed.length;
    if (typeof current.totalPaid === 'number') {
      const removedCompleted = removed
        .filter((payment) => payment.status === 'COMPLETED')
        .reduce((sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : 0), 0);
      shaped.totalPaid = current.totalPaid - removedCompleted;
    }
  }
  return shaped as T;
}
