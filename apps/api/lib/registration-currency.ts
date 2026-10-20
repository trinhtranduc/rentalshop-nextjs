/**
 * #1143: a new shop's currency, set once at sign-up from the sign-up language.
 * An explicit language (body `locale` / `NEXT_LOCALE` cookie): `vi*` → VND, any other → USD.
 * No explicit language (old iOS / Android send only `Accept-Language`): the onboarding locale
 * (country, Accept-Language, default vi) → vi = VND, en = USD.
 */
export type RegistrationCurrency = 'VND' | 'USD';

export function registrationCurrency(
  explicitLocale: string | null | undefined,
  onboardingLocale: 'en' | 'vi',
): RegistrationCurrency {
  const raw = explicitLocale?.trim().toLowerCase();
  if (raw) return raw.startsWith('vi') ? 'VND' : 'USD';
  return onboardingLocale === 'vi' ? 'VND' : 'USD';
}
