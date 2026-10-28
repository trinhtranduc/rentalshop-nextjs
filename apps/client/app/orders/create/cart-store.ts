/**
 * Several carts on the create-order page (#1293), the rules of the apps (iOS CartStore.swift is the reference):
 * at most 10 carts, the name is the customer's or "Giỏ k", the avatar is the first letters of the first and last
 * word, closing the only cart empties it, and a lone empty cart is not saved. Pure functions, unit-tested;
 * the React side is ./useDraftCarts.
 */
import {
  computeTotals,
  rentalDays,
  syncBlockPrices,
  type CartLine,
  type CustomerPick,
  type DiscountType,
  type OrderType,
} from './create-model';
import type { CollectMethod, PlanItemDraft } from '../../installments/installments-model';

export const MAX_CARTS = 10;
export const STORAGE_PREFIX = 'anyrent.draftCarts.';

/** What one cart holds: everything the page used to keep in separate states. */
export interface DraftCart {
  /** Local key of the tab; never leaves the browser. */
  id: string;
  /** "Giỏ k": the smallest free number when the cart was opened; it does not change when others close. */
  number: number;
  orderType: OrderType;
  pickup: string;
  ret: string;
  customer: CustomerPick | null;
  lines: CartLine[];
  discountType: DiscountType;
  discountValue: number;
  discountOpen: boolean;
  depositAmount: number | null;
  notes: string;
  notesOpen: boolean;
  /** Note photos: memory only, not saved (like the apps). */
  photos: File[];
  outletId: number | null;
  bookingRequestId: number | null;
  templatePick: string | null;
  planEdits: PlanItemDraft[] | null;
  collectChoice: CollectMethod | 'NONE';
}

export interface CartsState {
  carts: DraftCart[];
  activeId: string;
}

let counter = 0;
const newId = (): string => {
  counter += 1;
  return `c${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

export function blankCart(number = 1, init: Partial<DraftCart> = {}): DraftCart {
  return {
    id: newId(),
    number,
    orderType: 'RENT',
    pickup: '',
    ret: '',
    customer: null,
    lines: [],
    discountType: 'amount',
    discountValue: 0,
    discountOpen: false,
    depositAmount: null,
    notes: '',
    notesOpen: false,
    photos: [],
    outletId: null,
    bookingRequestId: null,
    templatePick: null,
    planEdits: null,
    collectChoice: 'CASH',
    ...init,
  };
}

export const initialState = (first: DraftCart = blankCart()): CartsState => ({ carts: [first], activeId: first.id });

export const activeOf = (s: CartsState): DraftCart => s.carts.find((c) => c.id === s.activeId) ?? s.carts[0];

/** Smallest number from 1 that no open cart uses. */
export const nextNumber = (carts: DraftCart[]): number => {
  for (let n = 1; n <= MAX_CARTS + 1; n++) if (!carts.some((c) => c.number === n)) return n;
  return carts.length + 1;
};

export const canAddCart = (s: CartsState): boolean => s.carts.length < MAX_CARTS;

/** Units in the cart (the apps count quantities, not lines). */
export const itemCountOf = (c: DraftCart): number => c.lines.reduce((sum, l) => sum + l.quantity, 0);

/** Worth keeping: something was put in it. The days alone are not. */
export const hasDraftContent = (c: DraftCart): boolean =>
  c.lines.length > 0 || !!c.customer || c.notes.trim() !== '' || c.discountValue > 0 || (c.depositAmount ?? 0) > 0;

// ---------------------------------------------------------------------------
// Moves. Each returns the same state when nothing can change.
// ---------------------------------------------------------------------------

/** A new cart, used at once. The outlet is carried over; nothing else is. */
export function addCart(s: CartsState, init: Partial<DraftCart> = {}): CartsState {
  if (!canAddCart(s)) return s;
  const cart = blankCart(nextNumber(s.carts), { outletId: activeOf(s).outletId, ...init });
  return { carts: [...s.carts, cart], activeId: cart.id };
}

export function switchCart(s: CartsState, id: string): CartsState {
  return id !== s.activeId && s.carts.some((c) => c.id === id) ? { ...s, activeId: id } : s;
}

/** With one cart it is emptied (back to "Giỏ 1"); otherwise it goes and the neighbour is used. */
export function removeCart(s: CartsState, id: string): CartsState {
  const at = s.carts.findIndex((c) => c.id === id);
  if (at < 0) return s;
  if (s.carts.length === 1) return initialState(blankCart(1, { outletId: s.carts[0].outletId }));
  const carts = s.carts.filter((c) => c.id !== id);
  const activeId = id === s.activeId ? carts[Math.min(at, carts.length - 1)].id : s.activeId;
  return { carts, activeId };
}

export function patchCart(s: CartsState, id: string, patch: Partial<DraftCart>): CartsState {
  return s.carts.some((c) => c.id === id) ? { ...s, carts: s.carts.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : s;
}

// ---------------------------------------------------------------------------
// Tab text
// ---------------------------------------------------------------------------

const customerName = (c: DraftCart): string => (c.customer?.name ?? '').trim();

/** The customer's name, or the "Giỏ k" text the caller builds from the number. */
export const cartTitle = (c: DraftCart, noCustomer: (n: number) => string): string => customerName(c) || noCustomer(c.number);

/** First letters of the first and last word of the name; the cart number when there is no name. */
export function avatarText(c: DraftCart): string {
  const words = customerName(c).split(/\s+/).filter(Boolean);
  if (!words.length) return String(c.number);
  const first = Array.from(words[0])[0].toUpperCase();
  return words.length > 1 ? first + Array.from(words[words.length - 1])[0].toUpperCase() : first;
}

const PALETTE = ['#1D4ED8', '#7C3AED', '#0F766E', '#EA580C'];
const GREY = '#94A3B8';
export const avatarColor = (c: DraftCart): string => (customerName(c) ? PALETTE[(c.number - 1) % PALETTE.length] : GREY);

/** What the cart is worth (its tab, "2 món · 440.000"): the lines less the discount; loyalty points are not counted. */
export function cartTotal(c: DraftCart, minorUnit = 1): number {
  const days = c.orderType === 'RENT' ? rentalDays(c.pickup, c.ret) : 0;
  const lines = syncBlockPrices(c.lines, c.orderType, days, minorUnit);
  return computeTotals({
    lines,
    orderType: c.orderType,
    days,
    discountType: c.discountType,
    discountValue: c.discountValue,
    depositAmount: c.depositAmount,
    securityDeposit: 0,
  }).totalAmount;
}

// ---------------------------------------------------------------------------
// Saved copy (localStorage, one set per signed-in user)
// ---------------------------------------------------------------------------

export const storageKey = (userId: number | string): string => `${STORAGE_PREFIX}${userId}`;

/** The text to store, or null when nothing is worth keeping (one empty cart). Photos are left out. */
export function serialize(s: CartsState): string | null {
  if (s.carts.length <= 1 && !s.carts.some(hasDraftContent)) return null;
  const carts = s.carts.map((c) => ({ ...c, photos: [] }));
  return JSON.stringify({ v: 1, activeId: s.activeId, carts });
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const nonNeg = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function reviveCart(raw: unknown, taken: Set<number>): DraftCart | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const lines = Array.isArray(r.lines) ? (r.lines as unknown[]).filter((l): l is CartLine => !!l && typeof l === 'object' && Number((l as CartLine).productId) > 0) : [];
  const c = r.customer as Partial<CustomerPick> | null | undefined;
  const customer = c && typeof c === 'object' && Number(c.id) > 0 ? { id: Number(c.id), name: str(c.name), phone: str(c.phone) } : null;
  let number = Number(r.number);
  if (!Number.isInteger(number) || number < 1 || taken.has(number)) number = 0;
  if (!number) for (number = 1; taken.has(number); number++);
  taken.add(number);
  return blankCart(number, {
    id: str(r.id) || newId(),
    orderType: r.orderType === 'SALE' ? 'SALE' : 'RENT',
    pickup: str(r.pickup),
    ret: str(r.ret),
    customer,
    lines,
    discountType: r.discountType === 'percentage' ? 'percentage' : 'amount',
    discountValue: nonNeg(r.discountValue),
    discountOpen: r.discountOpen === true,
    depositAmount: typeof r.depositAmount === 'number' && Number.isFinite(r.depositAmount) ? r.depositAmount : null,
    notes: str(r.notes),
    notesOpen: r.notesOpen === true,
    outletId: Number(r.outletId) > 0 ? Number(r.outletId) : null,
    bookingRequestId: Number(r.bookingRequestId) > 0 ? Number(r.bookingRequestId) : null,
    templatePick: typeof r.templatePick === 'string' ? r.templatePick : null,
    planEdits: Array.isArray(r.planEdits) ? (r.planEdits as PlanItemDraft[]) : null,
    collectChoice: r.collectChoice === 'NONE' ? 'NONE' : ((typeof r.collectChoice === 'string' ? r.collectChoice : 'CASH') as CollectMethod),
  });
}

/** The saved carts, or null when the text is missing or unreadable. At most 10 are taken. */
export function restore(text: string | null | undefined): CartsState | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as { activeId?: unknown; carts?: unknown };
    if (!data || !Array.isArray(data.carts)) return null;
    const taken = new Set<number>();
    const carts = data.carts
      .slice(0, MAX_CARTS)
      .map((c) => reviveCart(c, taken))
      .filter((c): c is DraftCart => !!c);
    if (!carts.length) return null;
    return { carts, activeId: carts.some((c) => c.id === data.activeId) ? (data.activeId as string) : carts[0].id };
  } catch {
    return null;
  }
}
