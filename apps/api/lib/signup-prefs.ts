/**
 * #1539: language, currency and sample-data language of a new shop.
 * - `language` sent (the sign-up form): it is the shop language and the sample-data language; the currency is the one
 *   sent, else VND for vi and USD for en.
 * - Not sent (installed apps, old tabs): #1143 unchanged (sample data from locale / country / Accept-Language, currency
 *   from `registrationCurrency`); the stored language follows the same rule as the currency (vi ↔ VND, en ↔ USD).
 */
import { registrationCurrency, type RegistrationCurrency } from './registration-currency';

export type SignupLanguage = 'vi' | 'en';

export interface SignupPrefs {
  /** `Merchant.language` */
  language: SignupLanguage;
  /** `Merchant.currency` */
  currency: RegistrationCurrency;
  /** language of the sample outlet / category names */
  seedLocale: SignupLanguage;
}

export function signupPrefs(input: {
  language?: SignupLanguage;
  currency?: RegistrationCurrency;
  explicitLocale: string | null | undefined;
  onboardingLocale: SignupLanguage;
}): SignupPrefs {
  const { language, currency, explicitLocale, onboardingLocale } = input;
  if (language) {
    return { language, currency: currency ?? (language === 'vi' ? 'VND' : 'USD'), seedLocale: language };
  }
  const oldCurrency = registrationCurrency(explicitLocale, onboardingLocale);
  return {
    language: oldCurrency === 'VND' ? 'vi' : 'en',
    currency: currency ?? oldCurrency,
    seedLocale: onboardingLocale,
  };
}
