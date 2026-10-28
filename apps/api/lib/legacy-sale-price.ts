/**
 * #1215 `salePrice: null` for an installed Android.
 *
 * Old Android reads `o.optDouble("salePrice").takeIf { o.has("salePrice") }` (ApiClient.kt:1431 on `main-real`): a key
 * that is present with value `null` becomes NaN, and adding that product to the cart throws
 * `JSONException: Forbidden numeric value: NaN` (CartStore.kt:815). So an Android client that declared no capability
 * gets 0 instead of null. 0 is read there as "no sale price" (ProductRules.kt:118).
 * Old iOS decodes null safely and would show "0" in the edit form (NewProductViewController.swift:671), and web
 * handles null, so they keep null. A client with any capability is a new build and keeps null.
 *
 * Self-contained on purpose (like client-capabilities.ts): route tests mock `@rentalshop/utils`.
 */
import { getClientCapabilities } from './client-capabilities';

type HeaderRequest = { headers?: { get(name: string): string | null } | null } | null | undefined;

/** Android build without capabilities: `X-Device-Type: android`, or OkHttp's default User-Agent with no platform header (builds before #343) */
export function isLegacyAndroid(request: HeaderRequest): boolean {
  try {
    if (getClientCapabilities(request).size > 0) return false;
    const device = request?.headers?.get('x-device-type')?.trim().toLowerCase();
    if (device) return device === 'android';
    const platform = request?.headers?.get('x-client-platform')?.trim().toLowerCase();
    if (platform) return platform === 'android';
    return /okhttp|android/i.test(request?.headers?.get('user-agent') ?? '');
  } catch {
    return false;
  }
}

/** `null` becomes 0 for an old Android; anything else (a price, 0, undefined) is returned as given */
export function salePriceForClient<T extends number | null | undefined>(salePrice: T, request: HeaderRequest): T | 0 {
  return salePrice === null && isLegacyAndroid(request) ? 0 : salePrice;
}
