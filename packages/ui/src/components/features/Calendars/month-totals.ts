/**
 * Total of per-day order counts for one month (#349).
 * Keys are Vietnam civil day keys `YYYY-MM-DD`; `month` is 0-based like Date#getMonth.
 */
export function sumMonthCounts(
  countsByDate: Map<string, number> | Record<string, number> | undefined,
  year: number,
  month: number
): number {
  if (!countsByDate) return 0;
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const entries = countsByDate instanceof Map ? Array.from(countsByDate.entries()) : Object.entries(countsByDate);
  return entries.reduce((sum, [dateKey, count]) => (dateKey.startsWith(prefix) ? sum + (Number(count) || 0) : sum), 0);
}
