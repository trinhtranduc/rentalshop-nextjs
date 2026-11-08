/**
 * #560 Giao đồ / Nhận trả dialogs on Chi tiết đơn: the money rows, as the iOS sheets show them
 * (`OrderHandOverSheetViewController.renderMoney`). Amounts come from `handOverMoney` / `returnMoney`
 * in ../orders-model, the same model as the Thanh toán card and the next-step button.
 */
import { dayKeyOf, handOverMoney, returnMoney, type OrderDetailLike, type ToDayKey } from '../orders-model';

/**
 * #1425 note photos on an order, here and on create order. The API keeps accepting 5 for installed apps; an order that
 * already holds more stays as it is, and its photos can still be removed.
 */
export const MAX_NOTE_IMAGES = 3;

/** "2/3"; above the limit only the count, since "5/3" reads like a bug */
export const noteCountLabel = (count: number) => (count > MAX_NOTE_IMAGES ? String(count) : `${count}/${MAX_NOTE_IMAGES}`);

export type HandOverRowKey = 'orderTotal' | 'depositPaid' | 'collateralMoney' | 'paidBefore';
export type ReturnRowKey = 'fees' | 'collateralHeld' | 'settledBefore' | 'excessDeposit';

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
  if (m.excessDeposit > 0) rows.push({ key: 'excessDeposit', amount: m.excessDeposit });
  const result: ReturnResult = m.refund > 0 ? { kind: 'refund', amount: m.refund } : m.collect > 0 ? { kind: 'collect', amount: m.collect } : { kind: 'nothing', amount: 0 };
  return { rows, result };
}

/** A fee typed in the dialog: same parsing as the old shared dialog (digits and a dot, never below 0). */
export function parseFee(raw: string): { text: string; value: number } {
  const text = raw.replace(/[^\d.]/g, '');
  return { text, value: Math.max(0, parseFloat(text) || 0) };
}

/**
 * What to save before RETURNED, as iOS `OrderDetailViewController.confirm` (#1494 one "Phụ thu"): when the typed total
 * differs from the saved late + damage fees, PUT it all as `damageFee` with `lateFee` 0; otherwise nothing (an old order
 * keeps its two fees apart).
 */
export function returnFeesUpdate(
  saved: { lateFee?: number | null; damageFee?: number | null },
  typed: { lateFee: number; damageFee: number },
): { damageFee: number; lateFee: number } | null {
  const total = typed.lateFee + typed.damageFee;
  return total !== (saved.lateFee || 0) + (saved.damageFee || 0) ? { damageFee: total, lateFee: 0 } : null;
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
// #1420 condition photos at hand-over (same rule as the phones, #1418). Nothing is captured at return.
// ----------------------------------------------------------------------------

/** Owner's limit; the API allows 5 per field. */
export const MAX_CONDITION_PHOTOS = 3;

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

/** "Ảnh khi giao" card: not there at 0 photos, unless photos are on their way in this tab, so a shop not using it sees no change */
export const showPickupPhotosCard = (serverCount: number, waiting: number) => serverCount > 0 || waiting > 0;

/** "Thêm ảnh" in the card: only while the goods are out. At 0 photos there is no card, as on the phones */
export function canAddPickupPhotos(status: string, serverCount: number, waiting: boolean): boolean {
  return status === 'PICKUPED' && !waiting && serverCount > 0 && photoRoom(serverCount) > 0;
}

/** How many photos the warning above the cards names; null while a retry runs, so there is one way to start one */
export function uploadWarningCount(job: { files: unknown[]; status: 'uploading' | 'failed' } | undefined | null): number | null {
  return job?.status === 'failed' ? job.files.length : null;
}

const imageList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);

export interface NoteOrderLike {
  notes?: string | null;
  notesImages?: unknown;
  pickupNotes?: string | null;
  pickupNotesImages?: unknown;
  returnNotes?: string | null;
  returnNotesImages?: unknown;
  damageNotes?: string | null;
  damageNotesImages?: unknown;
}

/**
 * The groups of the notes card. Hand-over photos have their own card; the pickup note text stays here, and so do the
 * return and damage texts and photos of old orders.
 */
export function buildNoteViews(order: NoteOrderLike, labels: { notes: string; pickup: string; return: string; damage: string }) {
  const views: { key: string; label: string; text: string; images: string[]; danger?: boolean }[] = [
    { key: 'notes', label: labels.notes, text: order.notes || '', images: imageList(order.notesImages) },
    { key: 'pickup', label: labels.pickup, text: order.pickupNotes || '', images: [] },
    { key: 'return', label: labels.return, text: order.returnNotes || '', images: imageList(order.returnNotesImages) },
    { key: 'damage', label: labels.damage, text: order.damageNotes || '', images: imageList(order.damageNotesImages), danger: true },
  ];
  return views.filter((n) => n.text.trim() || n.images.length > 0);
}

/**
 * The PUT that appends hand-over photos: `data={}`, so nothing else of the order changes. The page sends it with
 * `authenticatedFetch`, not `ordersApi.updateOrder`: `parseApiResponse` raises the global toast on a 4xx, and the warning
 * above the cards already says it failed. A listener cannot hold that toast back: Chrome fires a window target's
 * listeners in registration order, capture or not.
 */
export function pickupPhotosForm(files: File[]): FormData {
  const form = new FormData();
  form.append('data', '{}');
  files.forEach((file) => form.append('pickupNotesImages', file));
  return form;
}
