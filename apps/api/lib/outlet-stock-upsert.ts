/**
 * Writing `OutletStock` from a product form without losing the units out on rent (#359, #1339).
 *
 * Units out on rent stay rented: each outlet keeps its `renting`, `available = stock - renting`, and outlets that
 * are not in the payload are left alone. A stock below `renting` is refused. Pure: the route checks that every
 * outlet belongs to the shop and does the write.
 */

export interface ExistingOutletStockRow {
  outletId: number;
  renting?: number | null;
}

export interface OutletStockEntry {
  outletId: number;
  stock: number;
}

/** Nested `prisma.product.update({ data: { outletStock: { upsert: [...] } } })` item. */
export interface OutletStockUpsert {
  where: { productId_outletId: { productId: number; outletId: number } };
  update: { stock: number; available: number };
  create: { outletId: number; stock: number; available: number; renting: number };
}

export type OutletStockPlan =
  | { ok: true; upserts: OutletStockUpsert[] }
  | { ok: false; code: 'STOCK_BELOW_RENTED'; outletId: number };

export function planOutletStockUpserts(
  productId: number,
  existingRows: ExistingOutletStockRow[],
  entries: OutletStockEntry[]
): OutletStockPlan {
  const rentingByOutlet = new Map<number, number>(
    (existingRows || []).map((row) => [row.outletId, row.renting || 0])
  );
  const upserts: OutletStockUpsert[] = [];
  for (const entry of entries) {
    const renting = rentingByOutlet.get(entry.outletId) || 0;
    if (entry.stock < renting) {
      return { ok: false, code: 'STOCK_BELOW_RENTED', outletId: entry.outletId };
    }
    upserts.push({
      where: { productId_outletId: { productId, outletId: entry.outletId } },
      update: { stock: entry.stock, available: entry.stock - renting },
      create: { outletId: entry.outletId, stock: entry.stock, available: entry.stock, renting: 0 },
    });
  }
  return { ok: true, upserts };
}
