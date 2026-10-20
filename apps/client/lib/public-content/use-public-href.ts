'use client';

import { usePathname } from 'next/navigation';
import { publicPagePath, type PublicLocale } from '@rentalshop/constants';
import { publicHref, publicLocaleOfPath, publicPageOfPath, type PublicHrefTarget } from './public-href';

/** #1114: public links that stay in the language of the current page (unchanged on Vietnamese pages) */
export function usePublicHref(): (target: PublicHrefTarget) => string {
  const locale = publicLocaleOfPath(usePathname());
  return (target) => publicHref(locale, target);
}

/**
 * #1114: on a localized public page (`/{locale}/{page}`), the language switcher goes to the same page in the chosen
 * language. Vietnamese URLs keep their switcher as it was (app language cookie).
 */
export function usePublicPageSwitcher(): { publicLocale?: PublicLocale; publicPath?: (locale: PublicLocale) => string } {
  const current = publicPageOfPath(usePathname());
  if (!current || current.locale === 'vi') return {};
  return { publicLocale: current.locale, publicPath: (locale) => publicPagePath(locale, current.page) };
}
