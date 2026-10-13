/**
 * Pricing options as stored (#460, #951). Pure, no Prisma import, so it is unit-tested on its own.
 * - keep only Phase 1 types (FIXED / DAILY) with a price of 0 or more (#951: 0đ is a price; a missing or
 *   negative price is dropped);
 * - exactly one isDefault (the first one when none or several are marked).
 */
export function normalizePricingOptions(options: any[] | undefined): any[] {
  const allowed = (options || []).filter((o) => {
    if (!o || (o.type !== 'FIXED' && o.type !== 'DAILY')) return false;
    if (o.price == null || o.price === '') return false;
    const price = Number(o.price);
    return Number.isFinite(price) && price >= 0;
  });
  if (allowed.length === 0) return [];
  let defaultAssigned = false;
  const normalized = allowed.map((o, i) => {
    const isDefault = !!o.isDefault && !defaultAssigned;
    if (isDefault) defaultAssigned = true;
    return {
      type: o.type,
      price: Number(o.price),
      unit: o.unit ?? null,
      blockSize: o.blockSize ?? null,
      isDefault,
      isActive: o.isActive ?? true,
      sortOrder: o.sortOrder ?? i,
    };
  });
  if (!defaultAssigned) normalized[0].isDefault = true;
  return normalized;
}
