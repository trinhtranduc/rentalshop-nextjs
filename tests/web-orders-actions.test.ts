/**
 * #560 Giao đồ / Nhận trả / Huỷ dialogs: rows and amounts as the iOS sheets
 * (OrderDetailLogic.HandOverMoney / ReturnMoney / actions), equal to orderBalance (the API rule).
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { canCancelOrder, handOverView, parseFee, returnFeesUpdate, returnView, scheduleRange } from '../apps/client/app/orders/detail/actions-model';
import { orderBalance } from '../apps/client/app/orders/orders-model';
import { getLocalDateKey } from '../packages/utils/src/core/date';

const rent = (extra: Record<string, unknown>) => ({ id: 1, orderNumber: '1', orderType: 'RENT', status: 'RESERVED', ...extra });
const pay = (notes: string, amount: number, status = 'COMPLETED') => ({ notes, amount, status });

describe('handOverView', () => {
  it('owner case: total 68, cọc 96, thế chân 96 → thu bây giờ 68, rows in iOS order', () => {
    const o = rent({ totalAmount: 68, depositAmount: 96, securityDeposit: 96 });
    const m = handOverView(o);
    expect(m.rows).toEqual([
      { key: 'orderTotal', amount: 68 },
      { key: 'depositPaid', amount: 96 },
      { key: 'collateralMoney', amount: 96 },
    ]);
    expect(m.due).toBe(68);
    expect(m.due).toBe(orderBalance(o).amountDue);
  });

  it('no deposit, no thế chân: only the total', () => {
    const m = handOverView(rent({ totalAmount: 300000 }));
    expect(m.rows).toEqual([{ key: 'orderTotal', amount: 300000 }]);
    expect(m.due).toBe(300000);
  });

  it('completed PICKUP payments show as Đã thu trước and are taken off', () => {
    const o = rent({ totalAmount: 300, depositAmount: 100, securityDeposit: 500, payments: [pay('PICKUP', 150), pay('PICKUP', 99, 'PENDING'), pay('DEPOSIT', 100)] });
    const m = handOverView(o);
    expect(m.rows.map((r) => r.key)).toEqual(['orderTotal', 'depositPaid', 'collateralMoney', 'paidBefore']);
    expect(m.rows[3].amount).toBe(150);
    expect(m.due).toBe(550);
    expect(m.due).toBe(orderBalance(o).amountDue);
  });

  it('never below 0', () => {
    expect(handOverView(rent({ totalAmount: 50, depositAmount: 80 })).due).toBe(0);
  });
});

describe('returnView', () => {
  const picked = (extra: Record<string, unknown>) => rent({ status: 'PICKUPED', ...extra });

  it('thế chân back, no fees → trả lại khách', () => {
    const m = returnView(picked({ securityDeposit: 96 }), { lateFee: 0, damageFee: 0 });
    expect(m.rows).toEqual([
      { key: 'fees', amount: 0 },
      { key: 'collateralHeld', amount: 96 },
    ]);
    expect(m.result).toEqual({ kind: 'refund', amount: 96 });
  });

  it('typed late + damage fee bigger than thế chân → thu thêm', () => {
    const o = picked({ securityDeposit: 100, lateFee: 0, damageFee: 0 });
    const m = returnView(o, { lateFee: 60, damageFee: 70 });
    expect(m.rows[0]).toEqual({ key: 'fees', amount: 130 });
    expect(m.result).toEqual({ kind: 'collect', amount: 30 });
    expect(m.result.amount).toBe(orderBalance({ ...o, lateFee: 60, damageFee: 70 }).amountDue);
  });

  it('fees equal to thế chân → không phát sinh', () => {
    expect(returnView(picked({ securityDeposit: 50 }), { lateFee: 20, damageFee: 30 }).result).toEqual({ kind: 'nothing', amount: 0 });
  });

  it('completed RETURN_ADJUSTMENT payments show as Đã thanh toán trước', () => {
    const o = picked({ securityDeposit: 0, payments: [pay('RETURN_ADJUSTMENT', 40)] });
    const m = returnView(o, { lateFee: 0, damageFee: 100 });
    expect(m.rows).toEqual([
      { key: 'fees', amount: 100 },
      { key: 'settledBefore', amount: 40 },
    ]);
    expect(m.result).toEqual({ kind: 'collect', amount: 60 });
  });

  it('a negative or bad fee counts as 0', () => {
    expect(returnView(picked({}), { lateFee: -5, damageFee: Number.NaN }).result).toEqual({ kind: 'nothing', amount: 0 });
  });
});

describe('returnFeesUpdate (iOS confirm: PUT both fees when either changed)', () => {
  it('nothing changed → no PUT', () => {
    expect(returnFeesUpdate({ lateFee: 50, damageFee: 0 }, { lateFee: 50, damageFee: 0 })).toBeNull();
    expect(returnFeesUpdate({ lateFee: null, damageFee: undefined }, { lateFee: 0, damageFee: 0 })).toBeNull();
  });
  it('damage changed → both fees', () => {
    expect(returnFeesUpdate({ lateFee: 0, damageFee: 0 }, { lateFee: 0, damageFee: 25 })).toEqual({ damageFee: 25, lateFee: 0 });
  });
  it('late fee changed → both fees', () => {
    expect(returnFeesUpdate({ lateFee: 0, damageFee: 10 }, { lateFee: 150, damageFee: 10 })).toEqual({ damageFee: 10, lateFee: 150 });
  });
});

describe('canCancelOrder (iOS OrderDetailLogic.actions + API transitions)', () => {
  it.each([
    ['RENT', 'RESERVED', true],
    ['RENT', 'PICKUPED', true],
    ['RENT', 'RETURNED', false],
    ['RENT', 'CANCELLED', false],
    ['SALE', 'RESERVED', true],
    ['SALE', 'COMPLETED', true],
    ['SALE', 'CANCELLED', false],
  ])('%s %s → %s', (type, status, ok) => {
    expect(canCancelOrder(type, status, true)).toBe(ok);
    expect(canCancelOrder(type, status, false)).toBe(false);
  });
});

describe('parseFee (same as the old shared dialog)', () => {
  it.each([
    ['25', '25', 25],
    ['25.5', '25.5', 25.5],
    ['1a2', '12', 12],
    ['', '', 0],
    ['-3', '3', 3],
  ])('%s', (raw, text, value) => {
    expect(parseFee(raw)).toEqual({ text, value });
  });
});

describe('scheduleRange (Vietnam civil days)', () => {
  it('pickup 00:30 Vietnam is still that Vietnam day', () => {
    const o = rent({ pickupPlanAt: '2026-10-07T17:30:00.000Z', returnPlanAt: '2026-10-16T10:00:00.000Z' });
    expect(scheduleRange(o, getLocalDateKey)).toEqual({ from: '2026-10-08', to: '2026-10-16' });
  });

  it('null without both days', () => {
    expect(scheduleRange(rent({ pickupPlanAt: '2026-10-07T03:00:00.000Z' }), getLocalDateKey)).toBeNull();
  });
});
