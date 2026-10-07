/**
 * #560 Giao đồ / Nhận trả dialogs on Chi tiết đơn: the money rows, as the iOS sheets show them
 * (`OrderHandOverSheetViewController.renderMoney`). Amounts come from `handOverMoney` / `returnMoney`
 * in ../orders-model, the same model as the Thanh toán card and the next-step button.
 */
import { dayKeyOf, handOverMoney, returnMoney, type OrderDetailLike, type ToDayKey } from '../orders-model';

export type HandOverRowKey = 'orderTotal' | 'depositPaid' | 'collateralMoney' | 'paidBefore';
export type ReturnRowKey = 'fees' | 'collateralHeld' | 'settledBefore';

export interface MoneyRow<K extends string> {
  key: K;
  amount: number;
}

export interface HandOverView {
  rows: MoneyRow<HandOverRowKey>[];
  /** Thu bây giờ */
  due: number;
}

export function handOverView(o: OrderDetailLike): HandOverView {
  const m = handOverMoney(o);
  const rows: MoneyRow<HandOverRowKey>[] = [{ key: 'orderTotal', amount: m.total }];
  if (m.deposit > 0) rows.push({ key: 'depositPaid', amount: m.deposit });
  if (m.collateral > 0) rows.push({ key: 'collateralMoney', amount: m.collateral });
  if (m.paidBefore > 0) rows.push({ key: 'paidBefore', amount: m.paidBefore });
  return { rows, due: m.due };
}

export type ReturnResult = { kind: 'refund' | 'collect'; amount: number } | { kind: 'nothing'; amount: 0 };

export interface ReturnView {
  rows: MoneyRow<ReturnRowKey>[];
  result: ReturnResult;
}

/** `fees`: the late and damage fees typed in the dialog. */
export function returnView(o: OrderDetailLike, fees: { lateFee: number; damageFee: number }): ReturnView {
  const m = returnMoney(o, fees);
  const rows: MoneyRow<ReturnRowKey>[] = [{ key: 'fees', amount: m.lateFee + m.damageFee }];
  if (m.collateral > 0) rows.push({ key: 'collateralHeld', amount: m.collateral });
  if (m.settledBefore > 0) rows.push({ key: 'settledBefore', amount: m.settledBefore });
  const result: ReturnResult = m.refund > 0 ? { kind: 'refund', amount: m.refund } : m.collect > 0 ? { kind: 'collect', amount: m.collect } : { kind: 'nothing', amount: 0 };
  return { rows, result };
}

/** A fee typed in the dialog: same parsing as the old shared dialog (digits and a dot, never below 0). */
export function parseFee(raw: string): { text: string; value: number } {
  const text = raw.replace(/[^\d.]/g, '');
  return { text, value: Math.max(0, parseFloat(text) || 0) };
}

/**
 * What to save before RETURNED, as iOS `OrderDetailViewController.confirm`: when the late or damage fee
 * typed differs from the saved one, PUT both; otherwise nothing.
 */
export function returnFeesUpdate(
  saved: { lateFee?: number | null; damageFee?: number | null },
  typed: { lateFee: number; damageFee: number },
): { damageFee: number; lateFee: number } | null {
  const changed = typed.lateFee !== (saved.lateFee || 0) || typed.damageFee !== (saved.damageFee || 0);
  return changed ? { damageFee: typed.damageFee, lateFee: typed.lateFee } : null;
}

/** Pickup and return plan days (Vietnam civil days) for the dialog subtitle. */
export function scheduleRange(o: OrderDetailLike, toDayKey: ToDayKey): { from: string; to: string } | null {
  const from = dayKeyOf(o.pickupPlanAt, toDayKey);
  const to = dayKeyOf(o.returnPlanAt, toDayKey);
  return from && to ? { from, to } : null;
}

/**
 * Huỷ đơn like iOS `OrderDetailLogic.actions` (API ORDER_STATUS_TRANSITIONS): rentals before return,
 * sales not yet cancelled; for users with `orders.manage`.
 */
export function canCancelOrder(orderType: string | null | undefined, status: string | null | undefined, canManageOrders: boolean): boolean {
  if (!canManageOrders) return false;
  if (orderType === 'RENT') return status === 'RESERVED' || status === 'PICKUPED';
  if (orderType === 'SALE') return status === 'RESERVED' || status === 'COMPLETED';
  return false;
}
