/**
 * #1200 — payments[] of an order response: alias keys for installed iOS builds (they require
 * `paymentMethod` + `paymentDate`), INSTALLMENT rows only for clients that declare `installments`.
 */
jest.mock('@rentalshop/utils', () => ({}));
jest.mock('../../packages/database/src/client', () => ({ prisma: {} }));

import {
  isInstallmentPayment,
  shapeOrderPayments,
  shapePayments,
  withPaymentAliases,
} from '../../apps/api/lib/order-payments';
import { paymentCountFilter } from '../../packages/database/src/order';

const req = (value?: string) => ({ headers: { get: (n: string) => (n.toLowerCase() === 'x-client-capabilities' ? (value ?? null) : null) } });

const processedAt = new Date('2026-10-12T03:00:00.000Z');
const createdAt = new Date('2026-10-12T02:00:00.000Z');
const cash = {
  id: 5, amount: 500000, method: 'CASH', status: 'COMPLETED', reference: 'r1', notes: 'PICKUP',
  processedAt, createdAt, updatedAt: createdAt,
};
const stage = { ...cash, id: 6, amount: 200000, notes: 'INSTALLMENT' };
const noProcessed = { ...cash, id: 7, processedAt: null };

describe('withPaymentAliases (#1200)', () => {
  it('adds paymentMethod (= method) and paymentDate (= processedAt) and keeps every old key', () => {
    const out = withPaymentAliases(cash);
    expect(out.paymentMethod).toBe('CASH');
    expect(out.paymentDate).toBe('2026-10-12T03:00:00.000Z');
    for (const key of Object.keys(cash)) expect((out as any)[key]).toEqual((cash as any)[key]);
    expect(out.method).toBe('CASH');
    expect(out.processedAt).toBe(processedAt);
  });

  it('paymentDate falls back to createdAt and is never null for a stored row', () => {
    expect(withPaymentAliases(noProcessed).paymentDate).toBe('2026-10-12T02:00:00.000Z');
  });

  it('paymentDate is an ISO string with milliseconds and Z (what the iOS date decoder reads)', () => {
    expect(withPaymentAliases(cash).paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(withPaymentAliases({ ...cash, processedAt: '2026-10-12T03:00:00Z' }).paymentDate).toBe('2026-10-12T03:00:00.000Z');
  });
});

describe('shapeOrderPayments (#1200)', () => {
  const order = { id: 1, payments: [cash, stage], paymentCount: 2, totalPaid: 700000 };

  it('no header (old client): INSTALLMENT row removed, count and total follow', () => {
    const out: any = shapeOrderPayments(order, req());
    expect(out.payments.map((p: any) => p.id)).toEqual([5]);
    expect(out.paymentCount).toBe(1);
    expect(out.totalPaid).toBe(500000);
    expect(out.payments[0].paymentMethod).toBe('CASH');
  });

  it('client with `installments`: every row stays, alias on all', () => {
    const out: any = shapeOrderPayments(order, req('installments'));
    expect(out.payments.map((p: any) => p.id)).toEqual([5, 6]);
    expect(out.paymentCount).toBe(2);
    expect(out.totalPaid).toBe(700000);
    expect(out.payments.every((p: any) => p.paymentMethod && p.paymentDate)).toBe(true);
  });

  it('other capability only (block-pricing) still counts as installments-less', () => {
    expect((shapeOrderPayments(order, req('block-pricing')) as any).payments).toHaveLength(1);
  });

  it('today (no INSTALLMENT row): same rows and same totals as before, only the alias keys are new', () => {
    const today = { id: 1, payments: [cash, noProcessed], paymentCount: 2, totalPaid: 1000000 };
    const out: any = shapeOrderPayments(today, req());
    expect(out.paymentCount).toBe(2);
    expect(out.totalPaid).toBe(1000000);
    expect(out.payments).toHaveLength(2);
    expect(out.payments[0]).toEqual(expect.objectContaining(cash));
  });

  it('a pending INSTALLMENT row does not lower totalPaid, a completed one does', () => {
    const pending = { ...stage, status: 'PENDING' };
    const out: any = shapeOrderPayments({ payments: [cash, pending], paymentCount: 2, totalPaid: 500000 }, req());
    expect(out.paymentCount).toBe(1);
    expect(out.totalPaid).toBe(500000);
  });

  it('order without payments[] is returned as it is', () => {
    const bare = { id: 1 };
    expect(shapeOrderPayments(bare, req())).toBe(bare);
  });

  it('does not mutate the input', () => {
    const copy = JSON.parse(JSON.stringify(order));
    shapeOrderPayments(order, req());
    expect(JSON.parse(JSON.stringify(order))).toEqual(copy);
  });
});

describe('helpers (#1200)', () => {
  it('isInstallmentPayment matches notes exactly', () => {
    expect(isInstallmentPayment(stage)).toBe(true);
    expect(isInstallmentPayment({ notes: 'installment' })).toBe(false);
    expect(isInstallmentPayment({ notes: null })).toBe(false);
    expect(isInstallmentPayment(undefined)).toBe(false);
  });

  it('shapePayments keeps order of rows', () => {
    expect(shapePayments([cash, stage, noProcessed], false).map((p) => p.id)).toEqual([5, 7]);
    expect(shapePayments([cash, stage, noProcessed], true).map((p) => p.id)).toEqual([5, 6, 7]);
  });

  it('list totals filter keeps NULL notes (a plain `not` would drop them in SQL)', () => {
    expect(paymentCountFilter(false)).toEqual({ OR: [{ notes: null }, { notes: { not: 'INSTALLMENT' } }] });
    expect(paymentCountFilter(undefined)).toEqual(paymentCountFilter(false));
    expect(paymentCountFilter(true)).toEqual({});
  });
});

/**
 * Fixture of the iOS `Payment` struct on main-real (`Order.swift:969-976`): id Int, amount Double,
 * paymentMethod String, paymentDate Date (required), status String, notes String?. The real decode runs in the
 * Swift script of the PR description; this keeps the key/type contract in Jest, without Xcode.
 */
describe('iOS Payment decode contract (#1200)', () => {
  it.each([[cash], [noProcessed], [{ ...cash, notes: null }]])('every shaped row has what the Swift struct requires', (row) => {
    const [out]: any[] = shapePayments([row], true);
    expect(Number.isInteger(out.id)).toBe(true);
    expect(typeof out.amount).toBe('number');
    expect(typeof out.paymentMethod).toBe('string');
    expect(typeof out.status).toBe('string');
    expect(out.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(out.notes === null || typeof out.notes === 'string').toBe(true);
  });
});
