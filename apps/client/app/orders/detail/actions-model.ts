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

// ----------------------------------------------------------------------------
// #1420 condition photos at hand-over and return (same rule as the phones, #1418)
// ----------------------------------------------------------------------------

/** Owner's limit per stage. Note photos keep `MAX_NOTE_IMAGES` (settings.tsx); the API allows 5 per field. */
export const MAX_CONDITION_PHOTOS = 3;

export type PhotoStage = 'pickup' | 'return';

export const photoRoom = (count: number) => Math.max(0, MAX_CONDITION_PHOTOS - count);

export type PhotoSendDecision = { kind: 'alreadyUploaded' } | { kind: 'noRoom' } | { kind: 'send'; count: number };

/**
 * Read before sending. A multipart PUT is all or nothing and has no idempotency key, so our own lost request shows as
 * growth of at least `pending`. Smaller growth came from another device: our photos are still unsent.
 */
export function decidePhotoSend(serverCount: number, baseline: number, pending: number): PhotoSendDecision {
  if (serverCount - baseline >= pending) return { kind: 'alreadyUploaded' };
  const room = photoRoom(serverCount);
  return room > 0 ? { kind: 'send', count: Math.min(pending, room) } : { kind: 'noRoom' };
}

/** "Thêm ảnh" in the notes card: only while the goods are out */
export function canAddPickupPhotos(status: string, serverCount: number, waiting: boolean): boolean {
  return status === 'PICKUPED' && !waiting && photoRoom(serverCount) > 0;
}

/**
 * The notes card shows a failed upload with Thử lại, so a 4xx must not also raise the toast of useGlobalErrorHandler.
 * A capture listener runs before it on the window. 5xx and network errors throw without an event. A subscription error
 * still goes through: it opens its own dialog.
 */
export async function withoutApiErrorToast<R>(run: () => Promise<R>, target: EventTarget = window): Promise<R> {
  const stop = (event: Event) => {
    const code = String((event as CustomEvent<{ code?: string }>).detail?.code ?? '');
    if (!/SUBSCRIPTION|TRIAL_EXPIRED|PLAN_LIMIT/.test(code)) event.stopImmediatePropagation();
  };
  target.addEventListener('api-error', stop, { capture: true });
  try {
    return await run();
  } finally {
    target.removeEventListener('api-error', stop, { capture: true });
  }
}
