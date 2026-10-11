/**
 * #830 — OUTLET_ADMIN and OUTLET_INVENTORY see the stock of the other active outlets of their shop (read only,
 * owner decision on #823). OUTLET_STAFF sees its own outlet only; MERCHANT and ADMIN keep the full `outletStock`.
 * The product routes add `otherOutlets` for those two roles; no existing field changes.
 */
import { prisma } from '@rentalshop/database';

/** Roles that get `otherOutlets` on the product list and detail. */
export const OTHER_OUTLET_STOCK_ROLES = ['OUTLET_ADMIN', 'OUTLET_INVENTORY'] as const;

export function seesOtherOutletStock(role: string | null | undefined): boolean {
  return (OTHER_OUTLET_STOCK_ROLES as readonly string[]).includes(role ?? '');
}

export interface OtherOutletStock {
  outletId: number;
  outletName: string;
  stock: number;
  /** Shelf count: stock - renting (bookings for later days are not counted). */
  available: number;
  renting: number;
}

export interface ActiveOutlet {
  id: number;
  name: string;
}

type StockRowLike = { stock?: unknown; renting?: unknown; outlet?: { id?: unknown } | null };

const count = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * One product's rows for the outlets in `activeOutlets` other than `ownOutletId`, in the order given.
 * An active outlet without a stock row shows 0.
 */
export function otherOutletStock(
  outletStock: StockRowLike[] | null | undefined,
  ownOutletId: number,
  activeOutlets: ActiveOutlet[]
): OtherOutletStock[] {
  const byOutlet = new Map<number, StockRowLike>();
  for (const row of outletStock || []) {
    const id = Number(row?.outlet?.id);
    if (Number.isInteger(id)) byOutlet.set(id, row);
  }
  return activeOutlets
    .filter((o) => o.id !== ownOutletId)
    .map((o) => {
      const row = byOutlet.get(o.id);
      const stock = count(row?.stock);
      const renting = count(row?.renting);
      return { outletId: o.id, outletName: o.name, stock, available: Math.max(0, stock - renting), renting };
    });
}

/**
 * The other active outlets of the caller's shop when the caller may see them, else null (no field is added).
 * One query per request, whatever the number of products.
 */
export async function otherActiveOutletsFor(user: { role?: string | null }, scope: { merchantId?: number | null; outletId?: number | null }): Promise<ActiveOutlet[] | null> {
  if (!seesOtherOutletStock(user.role) || !scope.merchantId || !scope.outletId) return null;
  const outlets = await prisma.outlet.findMany({
    where: { merchantId: scope.merchantId, isActive: true, id: { not: scope.outletId } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
  return outlets;
}
