/**
 * #1189 save-time check of a product payload from a client that sent `pricingSchemaVersion: 2`: at most one BLOCK
 * option and its day table must be valid. Returns the error code or null; other clients are not checked (their BLOCK
 * options are ignored on save, see `normalizePricingOptions`).
 *
 * Self-contained on purpose (no workspace import): route tests mock `@rentalshop/utils`. The rules are the ones of
 * `isCompleteBlockTable` (packages/utils/src/core/block-pricing.ts); `tests/block-pricing-api.test.ts` keeps them equal.
 */
type OptionLike = {
  type?: string;
  blockTiers?: number[] | null;
  blockStartDay?: number | null;
  blockExtraMode?: string | null;
  blockExtraPrice?: number | null;
};

const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function blockTableValid(o: OptionLike): boolean {
  const tiers = o.blockTiers;
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > 31 || !tiers.every(money)) return false;
  const start = o.blockStartDay ?? 1;
  if (!Number.isInteger(start) || start < 1 || start > 31) return false;
  const mode = o.blockExtraMode ?? 'EXTRA_PER_DAY';
  if (mode !== 'EXTRA_PER_DAY' && mode !== 'HOLD_LAST') return false;
  // #1223: "+X per extra day" needs its X (0 is a price); HOLD_LAST needs none
  if (o.blockExtraPrice == null) return mode === 'HOLD_LAST';
  return money(o.blockExtraPrice);
}

export function blockOptionsIssue(
  options: OptionLike[] | null | undefined,
  pricingSchemaVersion: number | undefined
): 'BLOCK_TABLE_INVALID' | null {
  if (pricingSchemaVersion !== 2) return null;
  const blocks = (options ?? []).filter((o) => o?.type === 'BLOCK');
  if (blocks.length === 0) return null;
  return blocks.length === 1 && blockTableValid(blocks[0]) ? null : 'BLOCK_TABLE_INVALID';
}
