import { isPublicLocale, type PublicLocale } from '@rentalshop/constants';

/** #1146: the logged-in app has 5 languages; the public pages (landing, shop) have the 12 `PUBLIC_LOCALES` */
export const APP_LOCALES = ['vi', 'en', 'ja', 'ko', 'zh'] as const;
export type AppLocale = typeof APP_LOCALES[number];

/** App language for a `NEXT_LOCALE` value: a public-only language (picked on a public page) falls back to English */
export function appLocaleFor(value: unknown): AppLocale {
  if (typeof value !== 'string') return 'vi';
  if ((APP_LOCALES as readonly string[]).includes(value)) return value as AppLocale;
  if (value === 'zh-TW') return 'zh';
  return isPublicLocale(value) ? 'en' : 'vi';
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

/** BCP 47 tag for `Intl` on the shop pages (English with day-first dates, like the Vietnamese ones) */
export function intlLocale(locale: string): string {
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'en') return 'en-GB';
  return locale;
}
