// ============================================================================
// #1539 SHOP LANGUAGE (Merchant.language)
// ============================================================================

/** The shop language: emails to the shop and its users, sample data at sign-up, the web language after sign-up. */
export type ShopLanguage = 'vi' | 'en' | 'ja';

export const SHOP_LANGUAGES: readonly ShopLanguage[] = ['vi', 'en', 'ja'];

export function isShopLanguage(value: unknown): value is ShopLanguage {
  return value === 'vi' || value === 'en' || value === 'ja';
}

/** A stored `Merchant.language` as the language to use: 'en' stays 'en'; empty or anything else is Vietnamese (shops before #1539). */
export function shopLanguage(value: unknown): ShopLanguage {
  return value === 'en' ? 'en' : value === 'ja' ? 'ja' : 'vi';
}

/**
 * #1545 what sign-up sends: the shop language is the language the page is in (Vietnamese → vi, any other → en;
 * none = the web default, Vietnamese); the currency follows the country (Vietnam or none picked → VND, any other → USD).
 */
export function signupShopPrefs(
  pageLocale: string | null | undefined,
  countryCode: string | null | undefined
): { language: ShopLanguage; currency: 'VND' | 'USD' } {
  const page = (pageLocale ?? '').trim().toLowerCase();
  const code = (countryCode ?? '').trim().toUpperCase();
  return {
    language: page === '' || page === 'vi' || page.startsWith('vi-') ? 'vi' : page === 'ja' || page.startsWith('ja-') ? 'ja' : 'en',
    currency: code === '' || code === 'VN' ? 'VND' : 'USD',
  };
}

/** "Việt Nam" / "viet nam" / "VN" → "vietnam": lower case, no accents, no spaces or dots */
function countryKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * #1648 the language of the emails to a shop and its users: by the shop's COUNTRY (Việt Nam → vi, Nhật Bản → ja, any
 * other country → en). The country is stored as its English name (`Merchant.country`); the Vietnamese name and the
 * ISO code are read too. No country yet → the stored `Merchant.language` (empty → vi), as before. Not a stored choice:
 * a shop that changes its country gets its emails in the new language with nothing else to do.
 */
export function emailLanguageFor(merchant: { country?: unknown; language?: unknown } | null | undefined): ShopLanguage {
  const key = countryKey(merchant?.country);
  if (key === '') return shopLanguage(merchant?.language);
  if (key === 'vietnam' || key === 'vn' || key === 'vnm') return 'vi';
  if (key === 'japan' || key === 'jp' || key === 'jpn' || key === 'nhatban') return 'ja';
  return 'en';
}

