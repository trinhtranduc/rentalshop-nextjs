/**
 * #1515 "Đặt lại" on Chi tiết đơn: the new cart starts from an old order.
 * From the order: type, customer, notes, and each line's product, quantity and note. The price is the product's price
 * today (like adding the product to a cart). Dates, discount, deposit, collateral, payments, photos, status and the
 * order number are not copied. Pure functions, no network.
 */
import { addProduct, draftFromOrder, setLineNote, setQuantity, type CartLine, type CustomerPick, type OrderLike, type OrderType, type ProductLike } from './create-model';

export interface ReorderItem {
  productId: number;
  quantity: number;
  notes: string;
}

export interface ReorderStart {
  orderType: OrderType;
  customer: CustomerPick | null;
  notes: string;
  /** the branch of the old order (null when it has none) */
  outletId: number | null;
  items: ReorderItem[];
  /** order lines that no longer name a product (the product was deleted): not carried over */
  unreadable: number;
}

export function reorderStart(order: OrderLike, toDayKey: (v: string | Date) => string): ReorderStart {
  const draft = draftFromOrder(order, toDayKey);
  return {
    orderType: draft.orderType,
    customer: draft.customer,
    notes: draft.notes,
    outletId: draft.outletId,
    items: draft.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes })),
    unreadable: (order.orderItems || []).length - draft.lines.length,
  };
}

/**
 * `products[i]` is the product loaded for `items[i]` (null when it could not be loaded: deleted, no access).
 * Such an item is left out and counted in `skipped`.
 */
export function reorderLines(
  items: ReorderItem[],
  products: Array<ProductLike | null | undefined>,
  orderType: OrderType,
): { lines: CartLine[]; skipped: number } {
  let lines: CartLine[] = [];
  let skipped = 0;
  items.forEach((item, i) => {
    const product = products[i];
    if (!product) {
      skipped += 1;
      return;
    }
    lines = addProduct(lines, product, orderType);
    const key = lines[lines.length - 1].key;
    lines = setQuantity(lines, key, Math.max(1, item.quantity));
    if (item.notes) lines = setLineNote(lines, key, item.notes);
  });
  return { lines, skipped };
}
