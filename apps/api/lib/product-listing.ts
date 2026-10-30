/**
 * #1341 (#1335) "Hiện ở chi nhánh" — OutletStock.isListed says whether a branch sells a product (product list, order
 * picker). Pure rules, no imports of the app, so they run in Jest on their own.
 *
 * - Only the owner ticks / unticks (`canSetBranchListing`). Creating a product lists the creating branch for any role.
 * - `GET /api/products?listed=true` filters by one branch (`listedOutletForList`); a shop with one active branch ignores it.
 * - An old app (no `X-Client-Capabilities: branch-listing`) has no tick and sees every product, so the server lists the
 *   products it puts on an order, or whose stock it raises, instead of leaving them hidden from the new apps.
 */
import { hasCapability } from './client-capabilities';

/** Roles that may tick / untick "Hiện ở chi nhánh" (owner 2026-10-30). Widen here, not in the routes. */
const BRANCH_LISTING_ROLES = ['MERCHANT', 'ADMIN'] as const;

export function canSetBranchListing(role: string | null | undefined): boolean {
  return (BRANCH_LISTING_ROLES as readonly string[]).includes(role ?? '');
}

const BRANCH_ROLES = ['OUTLET_ADMIN', 'OUTLET_INVENTORY', 'OUTLET_STAFF'];

/** A request that does not declare `branch-listing`: an installed app or a stale web tab. */
export function isOldListingClient(request: Parameters<typeof hasCapability>[0]): boolean {
  return !hasCapability(request, 'branch-listing');
}

/** Zero or one active branch: the filter would only hide products from the single branch. */
export function shopHasSingleActiveOutlet(activeOutletCount: number): boolean {
  return activeOutletCount <= 1;
}

/** Query value of `listed`: only `true` / `1` turn the filter on (`z.coerce.boolean()` would turn "false" on). */
export function parseListedParam(raw: string | null | undefined): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * The branch whose list `listed=true` asks for: a branch role is always its own branch; MERCHANT / ADMIN use the
 * `outletId` of the query. undefined = no filter (listed not asked, or no branch known).
 */
export function listedOutletForList(input: {
  listed: boolean;
  role: string | null | undefined;
  userOutletId?: number | null;
  queryOutletId?: number | null;
}): number | undefined {
  if (!input.listed) return undefined;
  if (BRANCH_ROLES.includes(input.role ?? '')) return input.userOutletId ? input.userOutletId : undefined;
  return input.queryOutletId ? input.queryOutletId : undefined;
}

export interface ListedRow {
  outletId: number;
  stock: number;
  isListed: boolean;
}

/**
 * Rows of a new product: the rows the caller sent (listed unless the owner says false; a branch role always lists its
 * own branch), then a 0 row, not listed, for every other active branch of the shop.
 */
export function listedRowsForCreate(
  given: Array<{ outletId: number; stock: number; isListed?: boolean }>,
  activeOutletIds: number[],
  role: string | null | undefined
): ListedRow[] {
  const owner = canSetBranchListing(role);
  const seen = new Set<number>();
  const out: ListedRow[] = [];
  for (const row of given) {
    if (seen.has(row.outletId)) continue;
    seen.add(row.outletId);
    out.push({ outletId: row.outletId, stock: row.stock, isListed: owner ? row.isListed !== false : true });
  }
  for (const id of activeOutletIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ outletId: id, stock: 0, isListed: false });
  }
  return out;
}

/**
 * PUT /api/products/[id] from an old app: the branches whose stock goes UP above 0 while the row is not listed. The same
 * stock sent back (an app saves the whole product) lists nothing, so it never undoes the owner's untick.
 */
export function autoListOutletIdsForStockWrite(
  writes: Array<{ outletId: number; stock: number }>,
  saved: Array<{ outletId: number; stock?: number | null; isListed?: boolean | null }>,
  oldClient: boolean
): number[] {
  if (!oldClient) return [];
  const byOutlet = new Map(saved.map((r) => [r.outletId, r]));
  const ids: number[] = [];
  for (const w of writes) {
    const row = byOutlet.get(w.outletId);
    if (row && row.isListed === false && w.stock > 0 && w.stock > (row.stock ?? 0)) ids.push(w.outletId);
  }
  return ids;
}
