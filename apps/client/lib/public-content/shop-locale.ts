import { isPublicLocale, webLanguages, type PublicLocale } from '@rentalshop/constants';

/** #1597 the logged-in app speaks the web languages that are on (`webLanguages()`); the public pages the 12 `PUBLIC_LOCALES` */
export type AppLocale = PublicLocale;
export const APP_LOCALES: readonly AppLocale[] = webLanguages().map((l) => l.code);

/** App language for a `NEXT_LOCALE` value: a public language that is not on for the web falls back to English */
export function appLocaleFor(value: unknown): AppLocale {
  if (typeof value !== 'string') return 'vi';
  if ((APP_LOCALES as readonly string[]).includes(value)) return value as AppLocale;
  return isPublicLocale(value) ? 'en' : 'vi';
}

/**
 * #1551 the sign-up page language for a new visitor: the landing choice (`NEXT_PUBLIC_LOCALE`), Vietnamese → vi and any
 * other → en (the shop app speaks VI / EN; #1545 the shop language follows the sign-up page). null = leave it: an app
 * language is already picked (`NEXT_LOCALE`) or there is no landing choice (the page stays Vietnamese).
 */
export function registerLocaleFromLanding(appCookie?: string | null, publicCookie?: string | null): 'vi' | 'en' | null {
  if (appCookie) return null;
  if (!isPublicLocale(publicCookie)) return null;
  return publicCookie === 'vi' ? 'vi' : 'en';
}

/** `/{tenantKey}/products` and `/{tenantKey}/booking/{code}`: the public shop pages */
export function isShopPath(pathname: string): boolean {
  return /^\/[a-z0-9-]+\/products\/?$/i.test(pathname) || /^\/[a-z0-9-]+\/booking\/[a-z0-9]{5}\/?$/i.test(pathname);
}

/** Shop page language: the public choice (`NEXT_PUBLIC_LOCALE`), else the app one (`NEXT_LOCALE`), else Vietnamese */
export function shopLocale(publicCookie?: string | null, appCookie?: string | null): PublicLocale {
  if (isPublicLocale(publicCookie)) return publicCookie;
  if (isPublicLocale(appCookie)) return appCookie;
  return 'vi';
}

/**
 * BCP 47 tag for `Intl` on the shop pages: English with day-first dates (like the Vietnamese ones), Thai with
 * Gregorian years (the shop's calendar; Thai `Intl` defaults to the Buddhist era, 2569 for 2026)
 */
export function intlLocale(locale: string): string {
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'en') return 'en-GB';
  if (locale === 'th') return 'th-TH-u-ca-gregory';
  return locale;
}
