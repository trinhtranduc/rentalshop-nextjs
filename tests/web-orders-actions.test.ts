/**
 * #560 Giao đồ / Nhận trả dialogs: rows and amounts as the iOS sheets
 * (OrderDetailLogic.HandOverMoney / ReturnMoney), equal to orderBalance (the API rule).
 * Day logic must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { handOverMoney, parseFee, returnMoney, scheduleRange } from '../apps/client/app/orders/detail/actions-model';
import { orderBalance } from '../apps/client/app/orders/orders-model';
import { getLocalDateKey } from '../packages/utils/src/core/date';

const rent = (extra: Record<string, unknown>) => ({ orderType: 'RENT', status: 'RESERVED', ...extra });
const pay = (notes: string, amount: number, status = 'COMPLETED') => ({ notes, amount, status });

describe('handOverMoney', () => {
  it('owner case: total 68, cọc 96, thế chân 96 → thu bây giờ 68, rows in iOS order', () => {
    const o = rent({ totalAmount: 68, depositAmount: 96, securityDeposit: 96 });
    const m = handOverMoney(o);
    expect(m.rows).toEqual([
      { key: 'orderTotal', amount: 68 },
      { key: 'depositPaid', amount: 96 },
      { key: 'collateralMoney', amount: 96 },
    ]);
    expect(m.due).toBe(68);
    expect(m.due).toBe(orderBalance(o).amountDue);
  });

  it('no deposit, no thế chân: only the total', () => {
    const m = handOverMoney(rent({ totalAmount: 300000 }));
    expect(m.rows).toEqual([{ key: 'orderTotal', amount: 300000 }]);
    expect(m.due).toBe(300000);
  });

  it('completed PICKUP payments show as Đã thu trước and are taken off', () => {
    const o = rent({ totalAmount: 300, depositAmount: 100, securityDeposit: 500, payments: [pay('PICKUP', 150), pay('PICKUP', 99, 'PENDING'), pay('DEPOSIT', 100)] });
    const m = handOverMoney(o);
    expect(m.rows.map((r) => r.key)).toEqual(['orderTotal', 'depositPaid', 'collateralMoney', 'paidBefore']);
    expect(m.rows[3].amount).toBe(150);
    expect(m.due).toBe(550);
    expect(m.due).toBe(orderBalance(o).amountDue);
  });

  it('never below 0', () => {
    expect(handOverMoney(rent({ totalAmount: 50, depositAmount: 80 })).due).toBe(0);
  });
});

describe('returnMoney', () => {
  const picked = (extra: Record<string, unknown>) => rent({ status: 'PICKUPED', ...extra });

  it('thế chân back, no fees → trả lại khách', () => {
    const m = returnMoney(picked({ securityDeposit: 96 }), 0);
    expect(m.rows).toEqual([
      { key: 'fees', amount: 0 },
      { key: 'collateralHeld', amount: 96 },
    ]);
    expect(m.result).toEqual({ kind: 'refund', amount: 96 });
  });

  it('late + damage fee bigger than thế chân → thu thêm', () => {
    const o = picked({ securityDeposit: 100, lateFee: 60, damageFee: 0 });
    const m = returnMoney(o, 70);
    expect(m.lateFee).toBe(60);
    expect(m.damageFee).toBe(70);
    expect(m.rows[0]).toEqual({ key: 'fees', amount: 130 });
    expect(m.result).toEqual({ kind: 'collect', amount: 30 });
    expect(m.result.amount).toBe(orderBalance({ ...o, damageFee: 70 }).amountDue);
  });

  it('fees equal to thế chân → không phát sinh', () => {
    expect(returnMoney(picked({ securityDeposit: 50, lateFee: 20 }), 30).result).toEqual({ kind: 'nothing', amount: 0 });
  });

  it('completed RETURN_ADJUSTMENT payments show as Đã thanh toán trước', () => {
    const o = picked({ securityDeposit: 0, payments: [pay('RETURN_ADJUSTMENT', 40)] });
    const m = returnMoney(o, 100);
    expect(m.rows).toEqual([
      { key: 'fees', amount: 100 },
      { key: 'settledBefore', amount: 40 },
    ]);
    expect(m.result).toEqual({ kind: 'collect', amount: 60 });
  });

  it('a negative or bad damage fee counts as 0', () => {
    expect(returnMoney(picked({}), -5).result).toEqual({ kind: 'nothing', amount: 0 });
    expect(returnMoney(picked({}), Number.NaN).damageFee).toBe(0);
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
