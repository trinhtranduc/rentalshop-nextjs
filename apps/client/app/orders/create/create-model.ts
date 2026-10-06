/**
 * Tạo đơn / Sửa đơn on the shop web (#523): the cart, its money and the saved payload.
 * Pure, so the screen and the tests share one rule. Pricing comes from the shared
 * order-line helpers (#444, #460); rental days count both ends (#351).
 */
import {
  computeOrderLineTotal,
  countRentalDays,
  getPreferredPricingOption,
  repriceOrderLineForOrderType,
  resolveOrderLinePricingType,
} from '@rentalshop/utils';
import { addDays } from '../../dashboard/overview-model';

export type OrderType = 'RENT' | 'SALE';
export type DiscountType = 'amount' | 'percentage';

export interface PricingOptionLike {
  id?: number | null;
  type: string;
  price: number;
  isDefault?: boolean | null;
  isActive?: boolean | null;
}

export interface ProductLike {
  id: number;
  name: string;
  barcode?: string | null;
  images?: unknown;
  rentPrice?: number | null;
  salePrice?: number | null;
  deposit?: number | null;
  pricingType?: string | null;
  pricingOptions?: PricingOptionLike[] | null;
}

export interface CartLine {
  productId: number;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  /** Per unit. */
  deposit: number;
  pricingType: string;
  selectedPricingOptionId: number | null;
  notes: string;
  /** Prices typed for this order (#556), per mode: Theo lần and Theo ngày are kept apart, like iOS. */
  customPrices?: Partial<Record<string, number>>;
  product: {
    rentPrice: number;
    salePrice: number;
    pricingType: string | null;
    pricingOptions: LineOption[];
  };
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function imagesOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x);
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (s.startsWith('[')) {
      try {
        return imagesOf(JSON.parse(s));
      } catch {
        return [];
      }
    }
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** A configured price of a cart line (the shape the shared pricing helpers take). */
export interface LineOption {
  id: number | null;
  type: string;
  price: number;
  isDefault: boolean;
}

export const activeOptions = (options?: PricingOptionLike[] | null): LineOption[] =>
  (options || [])
    .filter((o) => o && o.isActive !== false && num(o.price) >= 0)
    .map((o) => ({
      id: o.id ?? null,
      type: o.type,
      price: num(o.price),
      isDefault: !!o.isDefault,
    }));

// ----------------------------------------------------------------------------
// Lines
// ----------------------------------------------------------------------------

/** A new line, priced like the old form: rent starts on the product's default option. */
export function lineFromProduct(p: ProductLike, orderType: OrderType): CartLine {
  const rentPrice = num(p.rentPrice);
  const salePrice = p.salePrice == null ? rentPrice : num(p.salePrice);
  const options = activeOptions(p.pricingOptions);
  const preferred = getPreferredPricingOption(options);
  const rent = orderType === 'RENT';
  return {
    productId: p.id,
    name: p.name,
    image: imagesOf(p.images)[0] || null,
    quantity: 1,
    unitPrice: rent ? (preferred ? num(preferred.price) : rentPrice) : salePrice,
    deposit: num(p.deposit),
    pricingType: rent ? (preferred?.type || p.pricingType || 'FIXED').toUpperCase() : 'FIXED',
    selectedPricingOptionId: rent ? (preferred?.id ?? null) : null,
    notes: '',
    product: {
      rentPrice,
      salePrice,
      pricingType: p.pricingType ?? null,
      pricingOptions: options,
    },
  };
}

export interface OrderItemLike {
  productId?: number | null;
  product?: (Partial<ProductLike> & { id?: number | null }) | null;
  productName?: string | null;
  productImages?: unknown;
  quantity?: number | null;
  unitPrice?: number | null;
  deposit?: number | null;
  notes?: string | null;
  pricingType?: string | null;
  pricingOptionId?: number | null;
}

/** A saved order item → a line that keeps its pricing type, option and unit price. */
export function lineFromOrderItem(item: OrderItemLike): CartLine {
  const p = item.product || {};
  const rentPrice = p.rentPrice == null ? num(item.unitPrice) : num(p.rentPrice);
  const options = activeOptions(p.pricingOptions);
  const pricingType = (item.pricingType || p.pricingType || 'FIXED').toUpperCase();
  return {
    productId: num(p.id ?? item.productId),
    name: p.name || item.productName || '',
    image: imagesOf(item.productImages)[0] || imagesOf(p.images)[0] || null,
    quantity: Math.max(1, num(item.quantity) || 1),
    unitPrice: num(item.unitPrice),
    deposit: num(item.deposit),
    pricingType,
    selectedPricingOptionId: item.pricingOptionId ?? options.find((o) => o.type.toUpperCase() === pricingType)?.id ?? null,
    notes: item.notes || '',
    // The saved price is this order's price for its mode: switching mode and back keeps it (#556)
    customPrices: { [pricingType]: num(item.unitPrice) },
    product: {
      rentPrice,
      salePrice: p.salePrice == null ? rentPrice : num(p.salePrice),
      pricingType: p.pricingType ?? null,
      pricingOptions: options,
    },
  };
}

/** Saved items have no pricing options; take them from the loaded product without repricing. */
export function hydrateLines(lines: CartLine[], products: ProductLike[]): CartLine[] {
  let changed = false;
  const next = lines.map((line) => {
    if (line.product.pricingOptions.length > 0) return line;
    const p = products.find((x) => x.id === line.productId);
    const options = activeOptions(p?.pricingOptions);
    if (!p || options.length === 0) return line;
    changed = true;
    return {
      ...line,
      image: line.image || imagesOf(p.images)[0] || null,
      selectedPricingOptionId: line.selectedPricingOptionId ?? options.find((o) => o.type.toUpperCase() === line.pricingType)?.id ?? null,
      product: {
        rentPrice: p.rentPrice == null ? line.product.rentPrice : num(p.rentPrice),
        salePrice: p.salePrice == null ? line.product.salePrice : num(p.salePrice),
        pricingType: p.pricingType ?? line.product.pricingType,
        pricingOptions: options,
      },
    };
  });
  return changed ? next : lines;
}

export function addProduct(lines: CartLine[], p: ProductLike, orderType: OrderType): CartLine[] {
  if (lines.some((l) => l.productId === p.id)) {
    return lines.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
  }
  return [...lines, lineFromProduct(p, orderType)];
}

/** Quantity 0 or less removes the line. */
export function setQuantity(lines: CartLine[], productId: number, quantity: number): CartLine[] {
  if (quantity <= 0) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.floor(quantity) } : l));
}

export function chooseOption(lines: CartLine[], productId: number, optionId: number): CartLine[] {
  return lines.map((l) => {
    if (l.productId !== productId) return l;
    const option = l.product.pricingOptions.find((o) => o.id === optionId);
    if (!option) return l;
    return {
      ...l,
      selectedPricingOptionId: optionId,
      pricingType: option.type.toUpperCase(),
      unitPrice: num(option.price),
    };
  });
}

/** Thuê ↔ Bán: sale uses the sale price, rent the line's option (or rent price); a typed rent price stays (#556). */
export function repriceLines(lines: CartLine[], orderType: OrderType): CartLine[] {
  return lines.map((l) => {
    const { unitPrice } = repriceOrderLineForOrderType(l, orderType, 1);
    if (orderType === 'SALE') return { ...l, unitPrice };
    const custom = l.customPrices?.[l.pricingType];
    if (custom != null) return { ...l, unitPrice: custom };
    const preferred = l.selectedPricingOptionId == null ? getPreferredPricingOption(l.product.pricingOptions) : null;
    return preferred
      ? {
          ...l,
          unitPrice: num(preferred.price),
          pricingType: preferred.type.toUpperCase(),
          selectedPricingOptionId: preferred.id ?? null,
        }
      : { ...l, unitPrice };
  });
}

// ----------------------------------------------------------------------------
// Pricing mode and price for this order (#556, iOS CartItem.selectPricingType / setCustomRentalPrice)
// ----------------------------------------------------------------------------

/** Modes a rent line offers: Theo lần and Theo ngày always, then any other active option type. */
export function lineModes(line: CartLine): string[] {
  const modes = ['FIXED', 'DAILY'];
  line.product.pricingOptions.forEach((o) => {
    const type = o.type.toUpperCase();
    if (!modes.includes(type)) modes.push(type);
  });
  return modes;
}

const optionOf = (line: CartLine, type: string): LineOption | null => line.product.pricingOptions.find((o) => o.type.toUpperCase() === type) || null;

/**
 * Switch a rent line's mode. Price: the one typed for that mode, else the product's option, else 0 ("Nhập giá").
 * Leaving a mode the product has no option for keeps its current price for the way back.
 */
export function selectMode(lines: CartLine[], productId: number, mode: string): CartLine[] {
  const next = mode.toUpperCase();
  return lines.map((l) => {
    if (l.productId !== productId || l.pricingType === next) return l;
    const custom = { ...(l.customPrices || {}) };
    if (!optionOf(l, l.pricingType) && custom[l.pricingType] == null) custom[l.pricingType] = l.unitPrice;
    const option = optionOf(l, next);
    const typed = custom[next];
    return {
      ...l,
      pricingType: next,
      selectedPricingOptionId: option?.id ?? null,
      unitPrice: typed ?? (option ? num(option.price) : 0),
      customPrices: custom,
    };
  });
}

/** A price typed for this order, kept for the line's current mode only. Never the product's price. */
export function setLinePrice(lines: CartLine[], productId: number, price: number): CartLine[] {
  const value = Math.max(0, Math.round(num(price)));
  return lines.map((l) =>
    l.productId === productId ? { ...l, unitPrice: value, customPrices: { ...(l.customPrices || {}), [l.pricingType]: value } } : l,
  );
}

/** A rent line without a price yet (a mode the product has no price for). */
export const needsPrice = (line: CartLine, orderType: OrderType): boolean => orderType === 'RENT' && !(line.unitPrice > 0);

export const lineType = (line: CartLine, orderType: OrderType): string => (orderType === 'RENT' ? resolveOrderLinePricingType(line) : 'SALE');

export const lineTotal = (line: CartLine, orderType: OrderType, days: number): number => computeOrderLineTotal(line, orderType, days);

/** Prices on a product card: rent options (or rent price), or the sale price. */
export function cardPrices(p: ProductLike, orderType: OrderType): Array<{ type: string; price: number }> {
  if (orderType === 'SALE')
    return [
      {
        type: 'SALE',
        price: p.salePrice == null ? num(p.rentPrice) : num(p.salePrice),
      },
    ];
  const options = activeOptions(p.pricingOptions);
  if (options.length === 0)
    return [
      {
        type: (p.pricingType || 'FIXED').toUpperCase(),
        price: num(p.rentPrice),
      },
    ];
  const order = ['DAILY', 'HOURLY', 'FIXED'];
  return [...options]
    .sort((a, b) => order.indexOf(a.type.toUpperCase()) - order.indexOf(b.type.toUpperCase()))
    .map((o) => ({ type: o.type.toUpperCase(), price: num(o.price) }));
}

// ----------------------------------------------------------------------------
// Days
// ----------------------------------------------------------------------------

/** Rental days, both ends included; 0 without both days. */
export const rentalDays = (pickup: string, ret: string): number => (pickup && ret ? countRentalDays(pickup, ret) : 0);

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const keyMs = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Vietnam midnight of a day key, as an ISO instant (the saved pickup / return plan). */
export const dayStartIso = (key: string): string => new Date(keyMs(key) - VN_OFFSET_MS).toISOString();

/** Availability range: 00:00 of the pickup day to the last millisecond of the return day, Vietnam time. */
export function dayRangeIso(pickup: string, ret: string): { startDate: string; endDate: string } {
  return {
    startDate: dayStartIso(pickup),
    endDate: new Date(keyMs(addDays(ret, 1)) - VN_OFFSET_MS - 1).toISOString(),
  };
}

export type DaysProblem = 'missing' | 'reversed' | 'tooLong' | null;

export function checkDays(pickup: string, ret: string, maxDays: number): DaysProblem {
  if (!pickup || !ret) return 'missing';
  if (ret < pickup) return 'reversed';
  if (rentalDays(pickup, ret) > maxDays) return 'tooLong';
  return null;
}

/** Quick picks in the days dialog. */
export function quickDays(todayKey: string): Record<'today' | 'tomorrow' | 'weekend' | 'threeDays', { from: string; to: string }> {
  const weekday = new Date(keyMs(todayKey)).getUTCDay(); // 0 = Sunday
  const sat = weekday === 0 || weekday === 6 ? todayKey : addDays(todayKey, 6 - weekday);
  return {
    today: { from: todayKey, to: todayKey },
    tomorrow: { from: addDays(todayKey, 1), to: addDays(todayKey, 1) },
    weekend: { from: sat, to: weekday === 0 ? todayKey : addDays(sat, 1) },
    threeDays: { from: todayKey, to: addDays(todayKey, 2) },
  };
}

// ----------------------------------------------------------------------------
// Stock
// ----------------------------------------------------------------------------

export interface AvailabilityLike {
  productId: number;
  error?: string;
  totalStock?: number | null;
  totalAvailableStock?: number | null;
  availabilityByOutlet?: Array<{
    outletId?: number;
    stock?: number | null;
    effectivelyAvailable?: number | null;
  }> | null;
}

export interface Stock {
  free: number;
  total: number;
}

/** "Còn n/m" for the order's outlet: units free for the chosen days / units the outlet holds. */
export function stockOf(result: AvailabilityLike | undefined, outletId: number | null): Stock | null {
  if (!result || result.error) return null;
  const outlets = result.availabilityByOutlet || [];
  const row = (outletId != null && outlets.find((o) => o.outletId === outletId)) || (outlets.length === 1 ? outlets[0] : null);
  if (row)
    return {
      free: Math.max(0, num(row.effectivelyAvailable)),
      total: Math.max(0, num(row.stock)),
    };
  return {
    free: Math.max(0, num(result.totalAvailableStock)),
    total: Math.max(0, num(result.totalStock)),
  };
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Enter in the search box: a product whose barcode is exactly the typed text. */
export function findByBarcode<P extends ProductLike>(products: P[], text: string): P | null {
  const code = text.trim().toLowerCase();
  if (!code) return null;
  return products.find((p) => (p.barcode || '').trim().toLowerCase() === code) || null;
}

// ----------------------------------------------------------------------------
// Money
// ----------------------------------------------------------------------------

export interface TotalsInput {
  lines: CartLine[];
  orderType: OrderType;
  days: number;
  discountType: DiscountType;
  discountValue: number;
  /** null: follows the items (Σ deposit × qty), as on iOS and Android until typed. */
  depositAmount: number | null;
  securityDeposit: number;
  loyaltyDiscount?: number;
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  autoDeposit: number;
  depositAmount: number;
  securityDeposit: number;
  loyaltyDiscount: number;
  /** Rent: left to collect at hand-over (total − cọc + thế chân). Sale: to collect now. */
  dueAtPickup: number;
}

export function computeTotals(input: TotalsInput): Totals {
  const rent = input.orderType === 'RENT';
  const subtotal = input.lines.reduce((s, l) => s + lineTotal(l, input.orderType, input.days), 0);
  const value = Math.max(0, num(input.discountValue));
  const discountAmount = input.discountType === 'percentage' ? (subtotal * Math.min(100, value)) / 100 : Math.min(subtotal, value);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const autoDeposit = rent ? input.lines.reduce((s, l) => s + l.deposit * l.quantity, 0) : 0;
  const depositAmount = rent ? Math.max(0, input.depositAmount == null ? autoDeposit : num(input.depositAmount)) : 0;
  const securityDeposit = rent ? Math.max(0, num(input.securityDeposit)) : 0;
  const loyaltyDiscount = Math.min(totalAmount, Math.max(0, num(input.loyaltyDiscount)));
  const afterLoyalty = totalAmount - loyaltyDiscount;
  const dueAtPickup = rent ? Math.max(0, afterLoyalty - depositAmount) + securityDeposit : afterLoyalty;
  return {
    subtotal,
    discountAmount,
    totalAmount,
    autoDeposit,
    depositAmount,
    securityDeposit,
    loyaltyDiscount,
    dueAtPickup,
  };
}

// ----------------------------------------------------------------------------
// Submit
// ----------------------------------------------------------------------------

export type Missing = 'days' | 'customer' | 'items' | 'price' | 'outlet' | null;

export function firstMissing(s: {
  orderType: OrderType;
  pickup: string;
  ret: string;
  customerId: number | null;
  outletId: number | null;
  lines: CartLine[];
}): Missing {
  if (s.orderType === 'RENT' && (!s.pickup || !s.ret)) return 'days';
  if (!s.lines.length) return 'items';
  if (s.lines.some((l) => needsPrice(l, s.orderType))) return 'price';
  if (!s.customerId) return 'customer';
  if (!s.outletId) return 'outlet';
  return null;
}

export interface PayloadInput {
  mode: 'create' | 'edit';
  orderType: OrderType;
  customerId: number;
  outletId: number;
  pickup: string;
  ret: string;
  lines: CartLine[];
  discountType: DiscountType;
  discountValue: number;
  depositAmount: number | null;
  securityDeposit: number;
  notes: string;
  loyaltyPoints?: number;
}

/**
 * Fields of `POST /api/orders` / `PUT /api/orders/[id]`, same as the old form.
 * Item deposit: POST divides it by quantity and PUT stores it as is, so create sends
 * deposit × qty and edit the per-unit deposit; both save the per-unit value.
 */
export function buildPayload(input: PayloadInput) {
  const rent = input.orderType === 'RENT';
  const days = rent ? rentalDays(input.pickup, input.ret) : 0;
  const totals = computeTotals({ ...input, days });
  return {
    orderType: input.orderType,
    customerId: input.customerId,
    outletId: input.outletId,
    pickupPlanAt: rent && input.pickup ? dayStartIso(input.pickup) : undefined,
    returnPlanAt: rent && input.ret ? dayStartIso(input.ret) : undefined,
    subtotal: totals.subtotal,
    taxAmount: 0,
    discountType: input.discountType,
    discountValue: Math.max(0, num(input.discountValue)),
    discountAmount: totals.discountAmount,
    depositAmount: totals.depositAmount,
    securityDeposit: totals.securityDeposit,
    totalAmount: totals.totalAmount,
    notes: input.notes,
    orderItems: input.lines.map((l) => {
      // The API takes FIXED, HOURLY, DAILY; another option type goes as FIXED without its id (iOS requestPricingType)
      const lineType = rent ? resolveOrderLinePricingType(l) : 'FIXED';
      const type = ['FIXED', 'HOURLY', 'DAILY'].includes(lineType) ? lineType : 'FIXED';
      const optionId = rent && type === lineType ? l.selectedPricingOptionId : null;
      return {
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: lineTotal(l, input.orderType, days),
        deposit: input.mode === 'create' ? l.deposit * l.quantity : l.deposit,
        notes: l.notes,
        rentDays: type === 'DAILY' ? Math.max(1, days) : 1,
        pricingType: type,
        ...(optionId != null ? { pricingOptionId: optionId } : {}),
      };
    }),
    ...(input.mode === 'create' && input.loyaltyPoints && input.loyaltyPoints > 0 ? { loyaltyRedeem: { points: input.loyaltyPoints } } : {}),
  };
}

// ----------------------------------------------------------------------------
// Edit
// ----------------------------------------------------------------------------

export interface OrderLike {
  id?: number;
  orderNumber?: string;
  orderType?: string;
  status?: string;
  customerId?: number | string | null;
  customer?: {
    id?: number | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  customerName?: string | null;
  customerPhone?: string | null;
  outletId?: number | null;
  outlet?: { id?: number | null } | null;
  pickupPlanAt?: string | Date | null;
  returnPlanAt?: string | Date | null;
  discountType?: string | null;
  discountValue?: number | null;
  depositAmount?: number | null;
  securityDeposit?: number | null;
  notes?: string | null;
  orderItems?: OrderItemLike[] | null;
}

/** Same rule as the old edit page: a reserved rental or a completed sale. */
export const canEditOrder = (o: OrderLike): boolean =>
  (o.orderType === 'RENT' && o.status === 'RESERVED') || (o.orderType === 'SALE' && o.status === 'COMPLETED');

export interface CustomerPick {
  id: number;
  name: string;
  phone: string;
}

export function customerPickOf(
  c:
    | {
        id?: number | null;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
      }
    | null
    | undefined,
): CustomerPick | null {
  if (!c || !c.id) return null;
  return {
    id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(),
    phone: c.phone || '',
  };
}

export function draftFromOrder(o: OrderLike, toDayKey: (v: string | Date) => string) {
  const orderType: OrderType = o.orderType === 'SALE' ? 'SALE' : 'RENT';
  const customerId = num(o.customer?.id ?? o.customerId) || null;
  const customer =
    customerPickOf(o.customer && { ...o.customer, id: customerId }) ||
    (customerId
      ? {
          id: customerId,
          name: o.customerName || '',
          phone: o.customerPhone || '',
        }
      : null);
  return {
    orderType,
    pickup: o.pickupPlanAt ? toDayKey(o.pickupPlanAt) : '',
    ret: o.returnPlanAt ? toDayKey(o.returnPlanAt) : '',
    customer,
    outletId: num(o.outletId ?? o.outlet?.id) || null,
    lines: (o.orderItems || []).map(lineFromOrderItem).filter((l) => l.productId > 0),
    discountType: (o.discountType === 'percentage' ? 'percentage' : 'amount') as DiscountType,
    discountValue: num(o.discountValue),
    depositAmount: orderType === 'RENT' ? num(o.depositAmount) : null,
    securityDeposit: num(o.securityDeposit),
    notes: o.notes || '',
  };
}
