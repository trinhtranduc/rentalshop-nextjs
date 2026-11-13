/**
 * #1536 "3,7" → [3, 7]: positive whole numbers from a comma-separated query value, first occurrence kept, junk dropped.
 * Used by GET /api/products `categoryIds`.
 */
export function parseIdList(raw: unknown): number[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const out: number[] = [];
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (!/^\d+$/.test(t)) continue;
    const n = Number(t);
    if (Number.isSafeInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}
