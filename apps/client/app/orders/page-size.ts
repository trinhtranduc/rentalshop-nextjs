/**
 * #1362 rows per page for every shop-web list: the quick sizes plus any whole number from 1 to 3000.
 * Pure (no app imports) so `tests/web-page-size.test.ts` runs it under any TZ.
 */

export const PAGE_SIZE_PRESETS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;
export const MIN_PAGE_SIZE = 1;
/** Same cap as the list endpoints (`limit` zod max in `validation-schemas.ts`). */
export const MAX_PAGE_SIZE = 3000;

export function isPresetPageSize(n: number): boolean {
  return (PAGE_SIZE_PRESETS as readonly number[]).includes(n);
}

/**
 * `?limit=` from the URL. A whole number from 1 to 3000 is kept, a bigger one is cut to 3000,
 * anything else (empty, text, 0, negative, decimal) is `fallback`.
 */
export function parsePageSize(raw: string | null | undefined, fallback: number = DEFAULT_PAGE_SIZE): number {
  const text = (raw ?? '').trim();
  if (!/^\d+$/.test(text)) return fallback;
  const n = Number(text);
  if (n < MIN_PAGE_SIZE) return fallback;
  return Math.min(n, MAX_PAGE_SIZE);
}

/**
 * What the user typed in the size box. Empty or not a whole number keeps `current`;
 * 0 is raised to 1 and a number above the cap is cut to 3000 (`clamped` tells the box to show its hint).
 */
export function commitPageSize(typed: string, current: number): { value: number; clamped: boolean } {
  const text = typed.trim();
  if (!/^\d+$/.test(text)) return { value: current, clamped: false };
  const n = Number(text);
  if (n < MIN_PAGE_SIZE) return { value: MIN_PAGE_SIZE, clamped: true };
  if (n > MAX_PAGE_SIZE) return { value: MAX_PAGE_SIZE, clamped: true };
  return { value: n, clamped: false };
}
