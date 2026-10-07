/**
 * Hoá đơn on the shop web (#562): every line the slip prints, built from the order. Pure (no
 * `@rentalshop/*` import) so it is unit-tested under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 *
 * Content and order follow the iOS receipt (`Order.toPrintData`, plus the thế chân / giấy tờ /
 * phí hư hại rows of the iOS shared receipt). Days are Vietnam civil days, times Vietnam time.
 */

export const RECEIPT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export interface ReceiptOutletInput {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  printNote?: string | null;
  /** Print the default bank account + VietQR on this outlet's bills (#628). */
  printBankQr?: boolean | null;
}

export interface ReceiptItemInput {
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  rentalDays?: number | null;
  pricingType?: string | null;
  productName?: string | null;
  product?: { name?: string | null } | null;
  notes?: string | null;
}

export interface ReceiptOrderInput {
  id?: number | string | null;
  orderNumber?: string | number | null;
  orderType?: string | null;
  createdAt?: string | Date | null;
  pickupPlanAt?: string | Date | null;
  returnPlanAt?: string | Date | null;
  customer?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  customerName?: string | null;
  customerPhone?: string | null;
  outlet?: ReceiptOutletInput | null;
  outletName?: string | null;
  orderItems?: ReceiptItemInput[] | null;
  totalAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  loyaltyDiscount?: number | null;
  depositAmount?: number | null;
  securityDeposit?: number | null;
  damageFee?: number | null;
  collateralType?: string | null;
  collateralDetails?: string | null;
  notes?: string | null;
}

export interface ReceiptSources {
  /** The outlet the caller passed (Tạo đơn: the chosen outlet; order page: the order's outlet). */
  outlet?: ReceiptOutletInput | null;
  /** Outlet details loaded by the dialog when the order carries none (create response). */
  outletDetails?: ReceiptOutletInput | null;
  merchant?: { name?: string | null; phone?: string | null; address?: string | null } | null;
}

/** Unit words for the item calc, e.g. vi `{ perDay: '/ngày', days: '{n} ngày', perHour: '/giờ', hours: '{n} giờ' }`. */
export interface ReceiptWords {
  perDay: string;
  days: string;
  perHour: string;
  hours: string;
}

export type ReceiptRowKey = 'deposit' | 'securityDeposit' | 'collateral' | 'damageFee' | 'rentDate' | 'returnDate' | 'createdAt';

export interface ReceiptRow {
  key: ReceiptRowKey;
  /** null → the slip prints its "none" text (deposit 0 → "Không cọc") */
  value: string | null;
  /** collateral only: the raw type, the slip translates it */
  collateralType?: string | null;
}

export interface ReceiptItemLine {
  index: number;
  name: string;
  note: string;
  calc: string;
}

export interface ReceiptModel {
  isRent: boolean;
  orderNumber: string;
  shop: { name: string; phone: string; address: string };
  /** Empty name → walk-in */
  customer: { name: string; phone: string };
  rows: ReceiptRow[];
  items: ReceiptItemLine[];
  note: string;
  subtotal: string;
  discount: string;
  /** Percentage discount → its percent, shown next to the label */
  discountPercent: number | null;
  loyaltyDiscount: string | null;
  total: string;
  /** RENT only (#347) */
  printNote: string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

/** VND money as the cart shows it: `2.600.000đ`. */
export function formatVnd(amount: number | null | undefined): string {
  const n = Math.round(num(amount));
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${digits}đ`;
}

function vnParts(value: string | Date | null | undefined): Record<string, string> | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RECEIPT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** Vietnam civil day of an instant: `dd/MM/yyyy`. */
export function formatVnDay(value: string | Date | null | undefined): string {
  const p = vnParts(value);
  return p ? `${p.day}/${p.month}/${p.year}` : '';
}

/** Vietnam time of an instant: `dd/MM/yyyy HH:mm`. */
export function formatVnDateTime(value: string | Date | null | undefined): string {
  const p = vnParts(value);
  return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : '';
}

/** "1 × 100.000đ/ngày × 26 ngày = 2.600.000đ" (daily rent) or "1 × 100.000đ = 100.000đ". */
export function itemCalcText(item: ReceiptItemInput, isRent: boolean, words: ReceiptWords): string {
  const qty = Math.max(1, num(item.quantity) || 1);
  const unit = num(item.unitPrice);
  const total = item.totalPrice != null ? num(item.totalPrice) : qty * unit;
  const pricing = text(item.pricingType).toUpperCase();
  const ratio = unit > 0 ? Math.round(total / (qty * unit)) : 0;
  const head = `${qty} × ${formatVnd(unit)}`;
  if (isRent && pricing === 'DAILY') {
    const days = Math.max(1, num(item.rentalDays) > 0 ? Math.round(num(item.rentalDays)) : ratio);
    return `${head}${words.perDay} × ${words.days.replace('{n}', String(days))} = ${formatVnd(total)}`;
  }
  if (isRent && pricing === 'HOURLY' && ratio > 1) {
    return `${head}${words.perHour} × ${words.hours.replace('{n}', String(ratio))} = ${formatVnd(total)}`;
  }
  return `${head} = ${formatVnd(total)}`;
}

/** Outlet note printed on RENT receipts (#347); SALE never prints it. */
export function resolvePrintNote(order: ReceiptOrderInput, outlet?: ReceiptOutletInput | null): string | null {
  if ((order.orderType || 'RENT') !== 'RENT') return null;
  const note = order.outlet?.printNote || outlet?.printNote || '';
  return note.trim() === '' ? null : note;
}

function firstOf(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    const t = text(v);
    if (t) return t;
  }
  return '';
}

export function buildReceipt(order: ReceiptOrderInput, sources: ReceiptSources, words: ReceiptWords): ReceiptModel {
  const isRent = (order.orderType || 'RENT') === 'RENT';
  const { outlet, outletDetails, merchant } = sources;
  const shop = {
    name: firstOf(order.outlet?.name, outlet?.name, order.outletName, outletDetails?.name, merchant?.name),
    phone: firstOf(order.outlet?.phone, outlet?.phone, outletDetails?.phone, merchant?.phone),
    address: firstOf(order.outlet?.address, outlet?.address, outletDetails?.address, merchant?.address),
  };

  const customerName = order.customer
    ? [order.customer.firstName, order.customer.lastName].map(text).filter(Boolean).join(' ')
    : text(order.customerName);
  const customer = { name: customerName, phone: firstOf(order.customer?.phone, order.customerPhone) };

  const rows: ReceiptRow[] = [];
  if (isRent) {
    const deposit = num(order.depositAmount);
    rows.push({ key: 'deposit', value: deposit > 0 ? formatVnd(deposit) : null });
    if (num(order.securityDeposit) > 0) rows.push({ key: 'securityDeposit', value: formatVnd(order.securityDeposit) });
    const type = text(order.collateralType);
    const details = text(order.collateralDetails);
    if (details || (type && type.toLowerCase() !== 'other')) {
      rows.push({ key: 'collateral', value: details, collateralType: type || null });
    }
    if (num(order.damageFee) > 0) rows.push({ key: 'damageFee', value: formatVnd(order.damageFee) });
    const pickup = formatVnDay(order.pickupPlanAt);
    const ret = formatVnDay(order.returnPlanAt);
    if (pickup) rows.push({ key: 'rentDate', value: pickup });
    if (ret) rows.push({ key: 'returnDate', value: ret });
  }
  const created = formatVnDateTime(order.createdAt);
  if (created) rows.push({ key: 'createdAt', value: created });

  const orderItems = order.orderItems || [];
  const items: ReceiptItemLine[] = orderItems.map((item, i) => ({
    index: i + 1,
    name: firstOf(item.productName, item.product?.name),
    note: text(item.notes),
    calc: itemCalcText(item, isRent, words),
  }));

  // totalAmount is stored after the discounts: it is the total, never the subtotal (#352)
  const discount = num(order.discountAmount);
  const loyalty = num(order.loyaltyDiscount);
  const total = num(order.totalAmount);
  const subtotal = orderItems.length
    ? orderItems.reduce((sum, item) => sum + (item.totalPrice != null ? num(item.totalPrice) : Math.max(1, num(item.quantity) || 1) * num(item.unitPrice)), 0)
    : total + discount + loyalty;
  const percent = num(order.discountValue);

  return {
    isRent,
    orderNumber: firstOf(order.orderNumber == null ? null : String(order.orderNumber), order.id == null ? null : String(order.id)),
    shop,
    customer,
    rows,
    items,
    note: text(order.notes),
    subtotal: formatVnd(subtotal),
    discount: formatVnd(discount),
    discountPercent: discount > 0 && text(order.discountType).toLowerCase() === 'percentage' && percent > 0 ? percent : null,
    loyaltyDiscount: loyalty > 0 ? formatVnd(loyalty) : null,
    total: formatVnd(total),
    printNote: resolvePrintNote(order, outlet),
  };
}
