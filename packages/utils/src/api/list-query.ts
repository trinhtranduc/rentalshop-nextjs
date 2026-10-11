/**
 * Query string of the list filters that are set: `undefined`, `null` and empty values are dropped, `false` and 0 are kept.
 * Returns '' or '?a=1&b=2'. Shared by the list helpers of the API client (#789).
 */
export function listQuery(filters?: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
