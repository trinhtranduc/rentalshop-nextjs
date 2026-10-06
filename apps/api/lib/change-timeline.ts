/**
 * Readable change history (#519) — pure, import-free.
 *
 * Write side: `buildOrderAuditSnapshot` / `buildProductAuditSnapshot` turn a Prisma row (or a stored
 * snapshot, or an old raw audit row) into a flat, JSON-safe object with stable keys. Routes pass these
 * as `oldValues` / `newValues` to the audit helper so diffs are meaningful (no Date or array noise).
 *
 * Read side: `buildChangeEntry` turns one AuditLog row into one timeline entry for
 * GET /api/orders/:id/changes and GET /api/products/:id/changes. Old rows (redacted totals, missing
 * snapshots, product rows with only name/isActive) degrade to a generic entry. Never throws, never
 * returns '[REDACTED]', emails, IPs or cost prices.
 *
 * Instants are returned as UTC ISO strings; the apps group them by Vietnam civil day.
 */

export const ORDER_CHANGE_KINDS = [
  'ORDER_CREATED',
  'ORDER_EDITED',
  'ORDER_ITEMS',
  'ORDER_ITEM_PRICE',
  'ORDER_DEPOSIT',
  'ORDER_PAYMENT',
  'ORDER_NOTE',
  'ORDER_PICKED_UP',
  'ORDER_RETURNED',
  'ORDER_COMPLETED',
  'ORDER_CANCELLED',
  'ORDER_RESTORED',
  'ORDER_DELETED',
] as const;

export const PRODUCT_CHANGE_KINDS = [
  'PRODUCT_CREATED',
  'PRODUCT_EDITED',
  'PRODUCT_PRICE',
  'PRODUCT_STOCK',
  'PRODUCT_IMAGES',
  'PRODUCT_DELETED',
  'PRODUCT_RESTORED',
] as const;

export type ChangeKind =
  | (typeof ORDER_CHANGE_KINDS)[number]
  | (typeof PRODUCT_CHANGE_KINDS)[number]
  | 'OTHER';

export type ChangeValue = number | string | boolean | null;

export interface FieldChange {
  field: string;
  from: ChangeValue;
  to: ChangeValue;
}

export interface ItemChange {
  productId: number | null;
  name: string;
  field: 'quantity' | 'price' | 'added' | 'removed';
  from: number | null;
  to: number | null;
  unit?: string;
}

export interface NoteChange {
  text: string | null;
  imagesAdded: number;
  imagesRemoved: number;
}

export interface ChangeEntry {
  id: number;
  at: string;
  kind: ChangeKind;
  actor: { name: string; role: string | null } | null;
  changes: FieldChange[];
  items: ItemChange[];
  note?: NoteChange;
}

export interface ChangeLogRow {
  id: number;
  action: string;
  details: unknown;
  createdAt: Date | string;
  user?: { firstName?: string | null; lastName?: string | null; role?: string | null } | null;
}

export type ChangeEntityType = 'Order' | 'Product';

// ---------------------------------------------------------------------------
// Value normalisers. `undefined` means "unknown" (missing or redacted) and is never diffed.
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

const REDACTED = '[REDACTED]';

function isRecord(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function has(obj: Obj, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** A key that exists with value `undefined` (Prisma transforms use `|| undefined`) reads as null. */
function field(obj: Obj, key: string): unknown {
  if (!has(obj, key)) return undefined;
  const v = obj[key];
  return v === undefined ? null : v;
}

function toNum(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '' && v !== REDACTED) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (isRecord(v) && typeof v.toNumber === 'function') {
    try {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'string') return v === REDACTED ? undefined : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function toBool(v: unknown): boolean | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'boolean') return v;
  return undefined;
}

/** Any Date / date string → UTC ISO instant. */
function toIso(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
  if (typeof v === 'string' || typeof v === 'number') {
    if (v === REDACTED) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function parseUrlList(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return [];
  if (Array.isArray(v)) return v.filter((u): u is string => typeof u === 'string' && u.trim() !== '');
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[')) {
      try {
        return parseUrlList(JSON.parse(s));
      } catch {
        return undefined;
      }
    }
    return s.split(',').map((u) => u.trim()).filter(Boolean);
  }
  return undefined;
}

function setIfKnown(target: Obj, key: string, value: unknown) {
  if (value !== undefined) target[key] = value;
}

// ---------------------------------------------------------------------------
// Snapshots (write side, also used to normalise stored/old rows on read)
// ---------------------------------------------------------------------------

export interface OrderSnapshotItem {
  productId: number | null;
  name: string | null;
  quantity: number | null;
  unitPrice: number | null;
  pricingType: string | null;
}

const ORDER_NUMBER_FIELDS = [
  'totalAmount',
  'depositAmount',
  'securityDeposit',
  'damageFee',
  'lateFee',
  'discountValue',
  'discountAmount',
] as const;
const ORDER_STRING_FIELDS = [
  'orderNumber',
  'orderType',
  'status',
  'discountType',
  'collateralType',
  'collateralDetails',
  'notes',
  'pickupNotes',
  'returnNotes',
  'damageNotes',
] as const;
const ORDER_DATE_FIELDS = ['pickupPlanAt', 'returnPlanAt', 'pickedUpAt', 'returnedAt'] as const;

function orderItemsOf(order: Obj): OrderSnapshotItem[] | undefined {
  const raw = Array.isArray(order.items) ? order.items : Array.isArray(order.orderItems) ? order.orderItems : undefined;
  if (!raw) return undefined;
  return raw.filter(isRecord).map((item) => {
    const product = isRecord(item.product) ? item.product : {};
    return {
      productId: toNum(item.productId ?? product.id) ?? null,
      name: toStr(item.name ?? item.productName ?? product.name) ?? null,
      quantity: toNum(item.quantity) ?? null,
      unitPrice: toNum(item.unitPrice) ?? null,
      pricingType: toStr(item.pricingType) ?? null,
    };
  });
}

/**
 * Flat order snapshot for audit rows. Accepts a Prisma order (with or without relations), a
 * transformed order, a stored snapshot, or an old raw audit row. Customer data and ids other than
 * product ids are left out; `totalAmount` is kept.
 */
export function buildOrderAuditSnapshot(order: unknown): Obj {
  if (!isRecord(order)) return {};
  const snap: Obj = {};
  for (const key of ORDER_STRING_FIELDS) setIfKnown(snap, key, toStr(field(order, key)));
  for (const key of ORDER_NUMBER_FIELDS) setIfKnown(snap, key, toNum(field(order, key)));
  for (const key of ORDER_DATE_FIELDS) setIfKnown(snap, key, toIso(field(order, key)));
  setIfKnown(snap, 'isReadyToDeliver', toBool(field(order, 'isReadyToDeliver')));
  if (has(order, 'noteImageCount')) {
    setIfKnown(snap, 'noteImageCount', toNum(order.noteImageCount));
  } else if (has(order, 'notesImages')) {
    const list = parseUrlList(order.notesImages ?? null);
    if (list) snap.noteImageCount = list.length;
  }
  const items = orderItemsOf(order);
  if (items) snap.items = items;
  return snap;
}

interface PricingSnap {
  type: string | null;
  price: number | null;
}

export interface ProductSnapshotStock {
  outletId: number | null;
  outletName: string | null;
  stock: number | null;
}

/**
 * Flat product snapshot for audit rows: name, prices, deposit, active pricing options, per-outlet
 * stock, image urls, category name, barcode, isActive. Never `costPrice`.
 */
export function buildProductAuditSnapshot(product: unknown): Obj {
  if (!isRecord(product)) return {};
  const snap: Obj = {};
  setIfKnown(snap, 'name', toStr(field(product, 'name')));
  setIfKnown(snap, 'barcode', toStr(field(product, 'barcode')));
  if (has(product, 'category')) {
    const c = product.category;
    setIfKnown(snap, 'category', isRecord(c) ? toStr(c.name) : toStr(c ?? null));
  }
  setIfKnown(snap, 'isActive', toBool(field(product, 'isActive')));
  setIfKnown(snap, 'rentPrice', toNum(field(product, 'rentPrice')));
  setIfKnown(snap, 'salePrice', toNum(field(product, 'salePrice')));
  setIfKnown(snap, 'deposit', toNum(field(product, 'deposit')));
  setIfKnown(snap, 'pricingType', toStr(field(product, 'pricingType')));

  if (Array.isArray(product.pricingOptions)) {
    snap.pricingOptions = product.pricingOptions
      .filter((o: unknown) => isRecord(o) && o.isActive !== false)
      .map((o: Obj) => ({ type: toStr(o.type) ?? null, price: toNum(o.price) ?? null }))
      .sort((a: PricingSnap, b: PricingSnap) => String(a.type).localeCompare(String(b.type)));
  }
  if (Array.isArray(product.outletStock)) {
    snap.outletStock = product.outletStock
      .filter(isRecord)
      .map((os: Obj) => {
        const outlet = isRecord(os.outlet) ? os.outlet : {};
        return {
          outletId: toNum(os.outletId ?? outlet.id) ?? null,
          outletName: toStr(os.outletName ?? outlet.name) ?? null,
          stock: toNum(os.stock) ?? null,
        };
      })
      .sort((a: ProductSnapshotStock, b: ProductSnapshotStock) => (a.outletId ?? 0) - (b.outletId ?? 0));
  }
  if (has(product, 'images')) {
    const images = parseUrlList(product.images ?? null);
    if (images) snap.images = images;
  }
  return snap;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function pushChange(out: FieldChange[], name: string, from: unknown, to: unknown) {
  if (from === undefined || to === undefined) return;
  if (from === to) return;
  out.push({ field: name, from: from as ChangeValue, to: to as ChangeValue });
}

function itemKey(item: OrderSnapshotItem, seen: Map<string, number>): string {
  const base = item.productId != null ? `p${item.productId}` : `n${item.name ?? ''}`;
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return `${base}#${n}`;
}

function itemName(item: OrderSnapshotItem): string {
  return item.name ?? (item.productId != null ? `#${item.productId}` : '');
}

export function diffOrderItems(before: OrderSnapshotItem[], after: OrderSnapshotItem[]): ItemChange[] {
  const out: ItemChange[] = [];
  const seenA = new Map<string, number>();
  const seenB = new Map<string, number>();
  const oldByKey = new Map(before.map((i) => [itemKey(i, seenA), i] as const));
  const newByKey = new Map(after.map((i) => [itemKey(i, seenB), i] as const));

  for (const [key, b] of Array.from(newByKey.entries())) {
    const a = oldByKey.get(key);
    const unit = b.pricingType ?? undefined;
    if (!a) {
      out.push({ productId: b.productId, name: itemName(b), field: 'added', from: null, to: b.quantity, ...(unit ? { unit } : {}) });
      continue;
    }
    if (a.quantity !== b.quantity && a.quantity != null && b.quantity != null) {
      out.push({ productId: b.productId, name: itemName(b), field: 'quantity', from: a.quantity, to: b.quantity });
    }
    if ((a.unitPrice !== b.unitPrice && a.unitPrice != null && b.unitPrice != null) || (a.pricingType !== b.pricingType && a.pricingType != null && b.pricingType != null)) {
      out.push({ productId: b.productId, name: itemName(b), field: 'price', from: a.unitPrice, to: b.unitPrice, ...(unit ? { unit } : {}) });
    }
  }
  for (const [key, a] of Array.from(oldByKey.entries())) {
    if (newByKey.has(key)) continue;
    const unit = a.pricingType ?? undefined;
    out.push({ productId: a.productId, name: itemName(a), field: 'removed', from: a.quantity, to: null, ...(unit ? { unit } : {}) });
  }
  return out;
}

const ORDER_DIFF_FIELDS = [
  'status',
  'orderType',
  'pickupPlanAt',
  'returnPlanAt',
  'pickedUpAt',
  'returnedAt',
  'totalAmount',
  'depositAmount',
  'securityDeposit',
  'discountType',
  'discountValue',
  'discountAmount',
  'damageFee',
  'lateFee',
  'collateralType',
  'collateralDetails',
  'pickupNotes',
  'returnNotes',
  'damageNotes',
  'isReadyToDeliver',
] as const;

export interface OrderDiff {
  changes: FieldChange[];
  items: ItemChange[];
  note?: NoteChange;
}

export function diffOrderSnapshots(oldRaw: unknown, newRaw: unknown): OrderDiff {
  const a = buildOrderAuditSnapshot(oldRaw);
  const b = buildOrderAuditSnapshot(newRaw);
  const changes: FieldChange[] = [];
  for (const key of ORDER_DIFF_FIELDS) pushChange(changes, key, a[key], b[key]);

  // Status moves set pickedUpAt / returnedAt themselves; the status line says it.
  const statusChanged = changes.some((c) => c.field === 'status');
  const filtered = statusChanged
    ? changes.filter((c) => c.field !== 'pickedUpAt' && c.field !== 'returnedAt')
    : changes;

  const items = Array.isArray(a.items) && Array.isArray(b.items) ? diffOrderItems(a.items, b.items) : [];

  let note: NoteChange | undefined;
  const textChanged = a.notes !== undefined && b.notes !== undefined && a.notes !== b.notes;
  const oldCount = typeof a.noteImageCount === 'number' ? a.noteImageCount : undefined;
  const newCount = typeof b.noteImageCount === 'number' ? b.noteImageCount : undefined;
  const countsKnown = oldCount !== undefined && newCount !== undefined;
  const imagesAdded = countsKnown ? Math.max(0, newCount - oldCount) : 0;
  const imagesRemoved = countsKnown ? Math.max(0, oldCount - newCount) : 0;
  if (textChanged || imagesAdded > 0 || imagesRemoved > 0) {
    note = { text: toStr(b.notes) ?? null, imagesAdded, imagesRemoved };
  }
  return { changes: filtered, items, ...(note ? { note } : {}) };
}

const PRODUCT_DIFF_FIELDS = ['name', 'barcode', 'category', 'isActive', 'deposit', 'rentPrice', 'salePrice', 'pricingType'] as const;

export function diffProductSnapshots(oldRaw: unknown, newRaw: unknown): FieldChange[] {
  const a = buildProductAuditSnapshot(oldRaw);
  const b = buildProductAuditSnapshot(newRaw);
  const changes: FieldChange[] = [];
  const bothHaveOptions =
    Array.isArray(a.pricingOptions) && a.pricingOptions.length > 0 &&
    Array.isArray(b.pricingOptions) && b.pricingOptions.length > 0;

  for (const key of PRODUCT_DIFF_FIELDS) {
    // rentPrice/pricingType mirror the default pricing option; show the option line instead.
    if (bothHaveOptions && (key === 'rentPrice' || key === 'pricingType')) continue;
    pushChange(changes, key, a[key], b[key]);
  }

  if (Array.isArray(a.pricingOptions) && Array.isArray(b.pricingOptions)) {
    const oldBy = new Map<string, number | null>((a.pricingOptions as PricingSnap[]).map((o) => [String(o.type), o.price]));
    const newBy = new Map<string, number | null>((b.pricingOptions as PricingSnap[]).map((o) => [String(o.type), o.price]));
    const types = Array.from(new Set([...Array.from(oldBy.keys()), ...Array.from(newBy.keys())])).sort();
    for (const t of types) pushChange(changes, `pricing.${t}`, oldBy.get(t) ?? null, newBy.get(t) ?? null);
  }

  if (Array.isArray(a.outletStock) && Array.isArray(b.outletStock)) {
    const label = (s: ProductSnapshotStock) => s.outletName ?? (s.outletId != null ? `#${s.outletId}` : '?');
    const keyOf = (s: ProductSnapshotStock) => (s.outletId != null ? `id:${s.outletId}` : `name:${s.outletName}`);
    const oldBy = new Map<string, ProductSnapshotStock>(a.outletStock.map((s: ProductSnapshotStock) => [keyOf(s), s]));
    const newBy = new Map<string, ProductSnapshotStock>(b.outletStock.map((s: ProductSnapshotStock) => [keyOf(s), s]));
    const keys = Array.from(new Set([...Array.from(oldBy.keys()), ...Array.from(newBy.keys())]));
    for (const k of keys) {
      const o = oldBy.get(k);
      const n = newBy.get(k);
      pushChange(changes, `stock.${label((n ?? o)!)}`, o?.stock ?? null, n?.stock ?? null);
    }
  }

  if (Array.isArray(a.images) && Array.isArray(b.images)) {
    const oldImages = a.images as string[];
    const newImages = b.images as string[];
    const added = newImages.filter((u) => !oldImages.includes(u)).length;
    const removed = oldImages.filter((u) => !newImages.includes(u)).length;
    if (added > 0 || removed > 0) {
      changes.push({ field: 'images', from: oldImages.length, to: newImages.length });
      if (added > 0) changes.push({ field: 'imagesAdded', from: null, to: added });
      if (removed > 0) changes.push({ field: 'imagesRemoved', from: null, to: removed });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const STATUS_KINDS: Record<string, ChangeKind> = {
  PICKUPED: 'ORDER_PICKED_UP',
  RETURNED: 'ORDER_RETURNED',
  COMPLETED: 'ORDER_COMPLETED',
  CANCELLED: 'ORDER_CANCELLED',
};

export function classifyOrderUpdate(diff: OrderDiff): ChangeKind {
  const status = diff.changes.find((c) => c.field === 'status');
  if (status) {
    if (status.from === 'CANCELLED') return 'ORDER_RESTORED'; // un-cancel
    return STATUS_KINDS[String(status.to)] ?? 'ORDER_EDITED';
  }

  const groups = new Set<string>();
  for (const c of diff.changes) {
    if (c.field === 'totalAmount') continue; // follows from items/discount; never decides the kind
    groups.add(c.field === 'depositAmount' || c.field === 'securityDeposit' ? 'deposit' : 'other');
  }
  const priceOnly = diff.items.length > 0 && diff.items.every((i) => i.field === 'price');
  if (diff.items.length > 0) groups.add(priceOnly ? 'itemPrice' : 'items');
  if (diff.note) groups.add('note');

  if (groups.size !== 1) return 'ORDER_EDITED';
  const only = Array.from(groups)[0];
  if (only === 'deposit') return 'ORDER_DEPOSIT';
  if (only === 'items') return 'ORDER_ITEMS';
  if (only === 'itemPrice') return 'ORDER_ITEM_PRICE';
  if (only === 'note') return 'ORDER_NOTE';
  return 'ORDER_EDITED';
}

function productGroup(fieldName: string): string {
  if (fieldName === 'rentPrice' || fieldName === 'salePrice' || fieldName === 'pricingType' || fieldName.startsWith('pricing.')) return 'price';
  if (fieldName.startsWith('stock.')) return 'stock';
  if (fieldName.startsWith('images')) return 'images';
  return 'info';
}

export function classifyProductUpdate(changes: FieldChange[]): ChangeKind {
  const groups = new Set(changes.map((c) => productGroup(c.field)));
  if (groups.size !== 1) return 'PRODUCT_EDITED';
  const only = Array.from(groups)[0];
  if (only === 'price') return 'PRODUCT_PRICE';
  if (only === 'stock') return 'PRODUCT_STOCK';
  if (only === 'images') return 'PRODUCT_IMAGES';
  return 'PRODUCT_EDITED';
}

// ---------------------------------------------------------------------------
// Entry builder (read side)
// ---------------------------------------------------------------------------

function parseDetails(details: unknown): Obj {
  if (isRecord(details)) return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Old rows that kept only `changes` ({ field: { old, new } }) still give old/new snapshots. */
function snapshotsOf(details: Obj): { oldValues: unknown; newValues: unknown } {
  if (isRecord(details.oldValues) || isRecord(details.newValues)) {
    return { oldValues: details.oldValues ?? {}, newValues: details.newValues ?? {} };
  }
  if (isRecord(details.changes)) {
    const oldValues: Obj = {};
    const newValues: Obj = {};
    for (const [k, v] of Object.entries(details.changes)) {
      if (!isRecord(v)) continue;
      oldValues[k] = v.old;
      newValues[k] = v.new;
    }
    return { oldValues, newValues };
  }
  return { oldValues: {}, newValues: {} };
}

function actorOf(user: ChangeLogRow['user']): ChangeEntry['actor'] {
  if (!user) return null;
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return { name, role: user.role ?? null };
}

function paymentChanges(newValues: unknown): FieldChange[] | null {
  if (!isRecord(newValues) || !isRecord(newValues.payment)) return null;
  const p = newValues.payment;
  const amount = toNum(p.amount);
  const out: FieldChange[] = [];
  if (amount !== undefined) {
    out.push({ field: p.kind === 'REFUND' ? 'paymentRefunded' : 'paymentCollected', from: null, to: amount });
  }
  const method = toStr(p.method);
  if (method) out.push({ field: 'paymentMethod', from: null, to: method });
  return out;
}

export function buildChangeEntry(row: ChangeLogRow, entityType: ChangeEntityType): ChangeEntry {
  const at = toIso(row.createdAt) ?? new Date(0).toISOString();
  const base: ChangeEntry = { id: row.id, at, kind: 'OTHER', actor: actorOf(row.user), changes: [], items: [] };
  try {
    const details = parseDetails(row.details);
    const action = String(row.action || '').toUpperCase();
    const isOrder = entityType === 'Order';

    if (action === 'CREATE') return { ...base, kind: isOrder ? 'ORDER_CREATED' : 'PRODUCT_CREATED' };
    if (action === 'DELETE') return { ...base, kind: isOrder ? 'ORDER_DELETED' : 'PRODUCT_DELETED' };
    if (action === 'RESTORE') return { ...base, kind: isOrder ? 'ORDER_RESTORED' : 'PRODUCT_RESTORED' };

    if (action === 'CUSTOM' && isOrder) {
      const payment = paymentChanges(details.newValues);
      if (payment) return { ...base, kind: 'ORDER_PAYMENT', changes: payment };
      return base;
    }

    if (action !== 'UPDATE') return base;

    const { oldValues, newValues } = snapshotsOf(details);
    if (isOrder) {
      const diff = diffOrderSnapshots(oldValues, newValues);
      return {
        ...base,
        kind: classifyOrderUpdate(diff),
        changes: diff.changes,
        items: diff.items,
        ...(diff.note ? { note: diff.note } : {}),
      };
    }
    const changes = diffProductSnapshots(oldValues, newValues);
    return { ...base, kind: classifyProductUpdate(changes), changes };
  } catch {
    return base;
  }
}

export function buildChangeTimeline(rows: ChangeLogRow[], entityType: ChangeEntityType): ChangeEntry[] {
  return (rows || []).map((row) => buildChangeEntry(row, entityType));
}

/** Runs an audit write; an audit failure (or a missing helper method) never breaks the request. */
export async function safeAudit(label: string, write: () => unknown): Promise<void> {
  try {
    await write();
  } catch (error) {
    console.error(`Audit log ${label} failed:`, error);
  }
}
