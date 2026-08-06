/**
 * Localized copy for merchant onboarding defaults (first registration / first login).
 * Keep product IDs / markers language-agnostic; only user-visible strings are localized.
 */

export type OnboardingLocale = 'en' | 'vi';

export type OnboardingBusinessType = 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';

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

export type SampleCopy = {
  productName: string;
  productDescription: string;
  customerFirstName: string;
  customerLastName: string;
  customerAddress: string;
  customerCity: string;
  customerNotes: string;
  orderNotes: string;
  orderItemNotes: string;
};

type LocaleBundle = {
  outlet: OutletCopy;
  category: CategoryCopy;
  samples: Record<OnboardingBusinessType, SampleCopy>;
};

/** Same generic demo copy for every business type — niche-agnostic onboarding. */
const EN_SAMPLE: SampleCopy = {
  productName: 'Sample Product',
  productDescription:
    'This is a sample product so you can try inventory and orders. You can edit or delete it anytime.',
  customerFirstName: 'Sample',
  customerLastName: 'Customer',
  customerAddress: '123 Sample Street',
  customerCity: 'Sample City',
  customerNotes: 'Sample customer for exploring the system. You can edit or delete it anytime.',
  orderNotes: 'Sample Order — you can edit or delete it after exploring the system.',
  orderItemNotes: 'Sample order item',
};

const VI_SAMPLE: SampleCopy = {
  productName: 'Sản phẩm mẫu',
  productDescription:
    'Đây là sản phẩm mẫu để bạn làm quen quản lý kho và đơn hàng. Bạn có thể sửa hoặc xóa bất cứ lúc nào.',
  customerFirstName: 'Khách hàng',
  customerLastName: 'Mẫu',
  customerAddress: '123 Đường Mẫu',
  customerCity: 'Thành phố mẫu',
  customerNotes: 'Khách hàng mẫu để bạn làm quen hệ thống. Bạn có thể sửa hoặc xóa bất cứ lúc nào.',
  orderNotes: 'Đơn hàng mẫu — bạn có thể sửa hoặc xóa sau khi làm quen hệ thống.',
  orderItemNotes: 'Chi tiết đơn hàng mẫu',
};

const EN_SAMPLES: Record<OnboardingBusinessType, SampleCopy> = {
  CLOTHING: EN_SAMPLE,
  VEHICLE: EN_SAMPLE,
  EQUIPMENT: EN_SAMPLE,
  GENERAL: EN_SAMPLE,
};

const VI_SAMPLES: Record<OnboardingBusinessType, SampleCopy> = {
  CLOTHING: VI_SAMPLE,
  VEHICLE: VI_SAMPLE,
  EQUIPMENT: VI_SAMPLE,
  GENERAL: VI_SAMPLE,
};


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
    samples: EN_SAMPLES,
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
    samples: VI_SAMPLES,
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

export function getSampleCopy(
  businessType: string | null | undefined,
  localeInput?: string | null,
): SampleCopy {
  const { samples } = getOnboardingCopy(localeInput);
  const key = (businessType || 'GENERAL').toUpperCase() as OnboardingBusinessType;
  return samples[key] ?? samples.GENERAL;
}

/** Marker embedded in demo notes/descriptions so we can detect / clean sample rows. */
export const ONBOARDING_SAMPLE_MARKER = '[DU_LIEU_MAU_HE_THONG_V1]';
