/**
 * Localized copy for merchant onboarding defaults (first registration / first login).
 * Keep product IDs / markers language-agnostic; only user-visible strings are localized.
 */

export type OnboardingLocale = 'en' | 'vi';

export function resolveOnboardingLocale(input?: string | null): OnboardingLocale {
  if (!input) return 'vi';
  const normalized = input.toLowerCase().trim();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  return 'vi';
}

/**
 * Resolve locale for onboarding seed from (in order):
 * 1. explicit locale (body / cookie)
 * 2. country code (VN → vi)
 * 3. Accept-Language header
 * 4. default Vietnamese
 */
export function resolveOnboardingLocaleFromContext(opts: {
  locale?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): OnboardingLocale {
  if (opts.locale) {
    return resolveOnboardingLocale(opts.locale);
  }

  const country = opts.country?.toUpperCase().trim();
  if (country === 'VN' || country === 'VNM') return 'vi';
  if (country === 'US' || country === 'GB' || country === 'AU' || country === 'CA') return 'en';

  const accept = opts.acceptLanguage?.toLowerCase() || '';
  if (accept.includes('vi')) return 'vi';
  if (accept.includes('en')) return 'en';

  return 'vi';
}

type OutletCopy = {
  /** Suffix after merchant name, e.g. "Main Store" → "{name} - Main Store" */
  nameSuffix: string;
  /** Standalone default outlet name when merchant name is unused */
  standaloneName: string;
  description: string;
};

type CategoryCopy = {
  name: string;
  description: string;
};

type LocaleBundle = {
  outlet: OutletCopy;
  category: CategoryCopy;
};

/** Same generic demo copy for every business type — niche-agnostic onboarding. */
const BUNDLES: Record<OnboardingLocale, LocaleBundle> = {
  en: {
    outlet: {
      nameSuffix: 'Main Store',
      standaloneName: 'Main Store',
      description: 'Default outlet created during registration',
    },
    category: {
      name: 'General',
      description: 'Default category for general products',
    },
  },
  vi: {
    outlet: {
      nameSuffix: 'Cửa hàng chính',
      standaloneName: 'Cửa hàng chính',
      description: 'Cửa hàng mặc định được tạo khi đăng ký',
    },
    category: {
      name: 'Chung',
      description: 'Danh mục mặc định cho sản phẩm chung',
    },
  },
};

/** Known default category names across locales (lookup when creating products). */
export const DEFAULT_CATEGORY_NAMES = ['General', 'Chung'] as const;

export function getOnboardingCopy(localeInput?: string | null) {
  const locale = resolveOnboardingLocale(localeInput);
  return { locale, ...BUNDLES[locale] };
}

export function getDefaultOutletName(
  merchantName: string | null | undefined,
  localeInput?: string | null,
): string {
  const { outlet } = getOnboardingCopy(localeInput);
  const name = merchantName?.trim();
  if (!name) return outlet.standaloneName;
  return `${name} - ${outlet.nameSuffix}`;
}

/**
 * Marker in the notes / descriptions of the demo rows older accounts got at sign-up (no longer created, #895).
 * Kept so those rows can still be found.
 */
export const ONBOARDING_SAMPLE_MARKER = '[DU_LIEU_MAU_HE_THONG_V1]';
