/**
 * #560 Giao đồ / Nhận trả dialogs on Chi tiết đơn: the money rows, as the iOS sheets show them
 * (`OrderHandOverSheetViewController.renderMoney`, `OrderDetailLogic.HandOverMoney` / `ReturnMoney`).
 * Same amounts as `orderBalance` (the API rule); rows carry no sign, the label says what it is.
 */
import { dayKeyOf, type OrderDetailLike, type ToDayKey } from '../orders-model';

type Num = number | null | undefined;
const pos = (n: Num) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

const paid = (o: OrderDetailLike, purpose: string) =>
  (o.payments || []).filter((p) => p.status === 'COMPLETED' && p.notes === purpose).reduce((s, p) => s + pos(p.amount), 0);

export type HandOverRowKey = 'orderTotal' | 'depositPaid' | 'collateralMoney' | 'paidBefore';
export type ReturnRowKey = 'fees' | 'collateralHeld' | 'settledBefore';

export interface MoneyRow<K extends string> {
  key: K;
  amount: number;
}

export interface HandOverMoney {
  rows: MoneyRow<HandOverRowKey>[];
  /** Thu bây giờ */
  due: number;
}

/** Hand-over: total − deposit paid at booking + thế chân − completed PICKUP payments, never below 0. */
export function handOverMoney(o: OrderDetailLike): HandOverMoney {
  const total = pos(o.totalAmount);
  const deposit = pos(o.depositAmount);
  const collateral = pos(o.securityDeposit);
  const before = paid(o, 'PICKUP');
  const rows: MoneyRow<HandOverRowKey>[] = [{ key: 'orderTotal', amount: total }];
  if (deposit > 0) rows.push({ key: 'depositPaid', amount: deposit });
  if (collateral > 0) rows.push({ key: 'collateralMoney', amount: collateral });
  if (before > 0) rows.push({ key: 'paidBefore', amount: before });
  return { rows, due: Math.max(0, total - deposit + collateral - before) };
}

export type ReturnResult = { kind: 'refund' | 'collect'; amount: number } | { kind: 'nothing'; amount: 0 };

export interface ReturnMoney {
  lateFee: number;
  damageFee: number;
  rows: MoneyRow<ReturnRowKey>[];
  result: ReturnResult;
}

/** Return: late + damage − thế chân held − completed RETURN_ADJUSTMENT payments; negative = give back. */
export function returnMoney(o: OrderDetailLike, damageFee: number): ReturnMoney {
  const lateFee = pos(o.lateFee);
  const damage = pos(damageFee);
  const collateral = pos(o.securityDeposit);
  const before = paid(o, 'RETURN_ADJUSTMENT');
  const rows: MoneyRow<ReturnRowKey>[] = [{ key: 'fees', amount: lateFee + damage }];
  if (collateral > 0) rows.push({ key: 'collateralHeld', amount: collateral });
  if (before > 0) rows.push({ key: 'settledBefore', amount: before });
  const net = lateFee + damage - collateral - before;
  const result: ReturnResult = net < 0 ? { kind: 'refund', amount: -net } : net > 0 ? { kind: 'collect', amount: net } : { kind: 'nothing', amount: 0 };
  return { lateFee, damageFee: damage, rows, result };
}

/** Damage fee typed in the dialog: same parsing as the old shared dialog (digits and a dot, never below 0). */
export function parseFee(raw: string): { text: string; value: number } {
  const text = raw.replace(/[^\d.]/g, '');
  return { text, value: Math.max(0, parseFloat(text) || 0) };
}

/** Pickup and return plan days (Vietnam civil days) for the dialog subtitle. */
export function scheduleRange(o: OrderDetailLike, toDayKey: ToDayKey): { from: string; to: string } | null {
  const from = dayKeyOf(o.pickupPlanAt, toDayKey);
  const to = dayKeyOf(o.returnPlanAt, toDayKey);
  return from && to ? { from, to } : null;
}
