import { getDefaultOutletName, getOnboardingCopy } from './onboarding-seed-i18n';

export {
  getDefaultOutletName,
  getOnboardingCopy,
  ONBOARDING_SAMPLE_MARKER,
  resolveOnboardingLocale,
  resolveOnboardingLocaleFromContext,
  DEFAULT_CATEGORY_NAMES,
} from './onboarding-seed-i18n';
export type {
  OnboardingLocale,
} from './onboarding-seed-i18n';

/** Localized default outlet + category strings for registration. */
export function getLocalizedRegistrationDefaults(
  merchantName: string | null | undefined,
  locale?: string | null,
) {
  const copy = getOnboardingCopy(locale);
  return {
    locale: copy.locale,
    outletName: getDefaultOutletName(merchantName, locale),
    outletDescription: copy.outlet.description,
    categoryName: copy.category.name,
    categoryDescription: copy.category.description,
  };
}
