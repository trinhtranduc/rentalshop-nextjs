// ============================================================================
// #1539 SHOP LANGUAGE (Merchant.language)
// ============================================================================

/** The shop language: emails to the shop and its users, sample data at sign-up, the web language after sign-up. */
export type ShopLanguage = 'vi' | 'en';

export const SHOP_LANGUAGES: readonly ShopLanguage[] = ['vi', 'en'];

export function isShopLanguage(value: unknown): value is ShopLanguage {
  return value === 'vi' || value === 'en';
}

/** A stored `Merchant.language` as the language to use: 'en' stays 'en'; empty or anything else is Vietnamese (shops before #1539). */
export function shopLanguage(value: unknown): ShopLanguage {
  return value === 'en' ? 'en' : 'vi';
}

/** Sign-up defaults of a country code: Vietnam (or none picked yet) → Tiếng Việt + VND; any other → English + USD. */
export function signupDefaults(countryCode: string | null | undefined): { language: ShopLanguage; currency: 'VND' | 'USD' } {
  const code = (countryCode ?? '').trim().toUpperCase();
  return code === '' || code === 'VN' ? { language: 'vi', currency: 'VND' } : { language: 'en', currency: 'USD' };
}
