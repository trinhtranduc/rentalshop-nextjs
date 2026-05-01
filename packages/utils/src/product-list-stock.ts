import { USER_ROLE } from '@rentalshop/constants';

export interface ProductListStockOutletRow {
  stock: number;
  renting: number;
  available: number;
  outlet?: { id: number; name?: string };
}

export interface ProductListStockInput {
  stock?: number;
  renting?: number;
  available?: number;
  totalStock?: number;
  outletStock?: ProductListStockOutletRow[];
}

/**
 * Computes numbers shown in the product list table "Inventory" column.
 * When scopedOutletId is set (filter URL or JWT outlet), use that outlet's row only;
 * otherwise use product-level rollup.
 */
export function resolveProductListStockDisplay(
  product: ProductListStockInput,
  scopedOutletId?: number
): {
  totalStock: number;
  renting: number;
  available: number;
  showBranchesHint: boolean;
  outletBranchCount: number;
} {
  const rows = product.outletStock ?? [];
  const scoped =
    scopedOutletId != null
      ? rows.find((r) => r.outlet?.id === scopedOutletId)
      : null;

  const totalStock =
    scoped != null ? scoped.stock : product.totalStock ?? product.stock ?? 0;
  const renting =
    scoped != null ? scoped.renting : product.renting ?? 0;
  const available =
    scoped != null ? scoped.available : product.available ?? 0;

  const showBranchesHint = scopedOutletId == null && rows.length > 1;

  return {
    totalStock,
    renting,
    available,
    showBranchesHint,
    outletBranchCount: rows.length,
  };
}

export type ProductStockScopeUser = {
  role?: string;
  outletId?: number;
} | null | undefined;

/**
 * outlet team: scope stock column to JWT outlet.
 * Merchant / others: optional URL outlet filter overrides.
 */
export function resolveScopedOutletIdForProductStock(
  filtersOutletId: number | undefined,
  user: ProductStockScopeUser
): number | undefined {
  if (filtersOutletId != null) return filtersOutletId;

  const role = user?.role;
  if (
    role === USER_ROLE.OUTLET_ADMIN ||
    role === USER_ROLE.OUTLET_STAFF
  ) {
    if (typeof user?.outletId === 'number') return user.outletId;
  }

  return undefined;
}
