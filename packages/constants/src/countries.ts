// ============================================================================
// COUNTRY CONSTANTS
// ============================================================================

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  phoneCode: string;
}

export const COUNTRIES: Country[] = [
  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', phoneCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', phoneCode: '+1' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', phoneCode: '+52' },

  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', phoneCode: '+44' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', phoneCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', phoneCode: '+33' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', phoneCode: '+39' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', phoneCode: '+34' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', phoneCode: '+31' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', phoneCode: '+41' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', phoneCode: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', phoneCode: '+47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', phoneCode: '+45' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', phoneCode: '+358' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', phoneCode: '+43' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', phoneCode: '+32' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', phoneCode: '+353' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', phoneCode: '+351' },

  // Asia Pacific
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', phoneCode: '+61' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', phoneCode: '+64' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', phoneCode: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', phoneCode: '+82' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', phoneCode: '+65' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', phoneCode: '+852' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', currency: 'TWD', phoneCode: '+886' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', phoneCode: '+60' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', phoneCode: '+66' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', phoneCode: '+62' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', phoneCode: '+63' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', phoneCode: '+84' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', phoneCode: '+91' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', phoneCode: '+86' },

  // Middle East & Africa
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', phoneCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', phoneCode: '+966' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'ILS', phoneCode: '+972' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', phoneCode: '+27' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', phoneCode: '+20' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', phoneCode: '+212' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', phoneCode: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', phoneCode: '+254' },

  // South America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', phoneCode: '+55' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', phoneCode: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', phoneCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', phoneCode: '+57' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'PEN', phoneCode: '+51' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', currency: 'UYU', phoneCode: '+598' },

  // Central America & Caribbean
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', currency: 'CRC', phoneCode: '+506' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', currency: 'PAB', phoneCode: '+507' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', currency: 'GTQ', phoneCode: '+502' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', currency: 'CUP', phoneCode: '+53' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', currency: 'DOP', phoneCode: '+1' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', currency: 'JMD', phoneCode: '+1' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(country => country.code === code);
}

/**
 * Get country by name
 */
export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find(country => country.name === name);
}

/**
 * Get all countries sorted by name
 */
export function getCountriesSorted(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get countries by region (for future use)
 */
export function getCountriesByRegion(region: string): Country[] {
  const regions: Record<string, string[]> = {
    'north-america': ['US', 'CA', 'MX'],
    'europe': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH', 'SE', 'NO', 'DK', 'FI', 'AT', 'BE', 'IE', 'PT'],
    'asia-pacific': ['AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'MY', 'TH', 'ID', 'PH', 'VN', 'IN', 'CN'],
    'middle-east-africa': ['AE', 'SA', 'IL', 'ZA', 'EG', 'MA', 'NG', 'KE'],
    'south-america': ['BR', 'AR', 'CL', 'CO', 'PE', 'UY'],
    'central-america-caribbean': ['CR', 'PA', 'GT', 'CU', 'DO', 'JM']
  };

  const countryCodes = regions[region] || [];
  return COUNTRIES.filter(country => countryCodes.includes(country.code));
}

/**
 * Format country display name with flag
 */
export function formatCountryDisplay(country: Country): string {
  return `${country.flag} ${country.name}`;
}

/**
 * Get default country (Vietnam)
 */
export function getDefaultCountry(): Country {
  return COUNTRIES.find(country => country.code === 'VN') || COUNTRIES[0]; // Vietnam or fallback to first country
}

// ============================================================================
// #1539 SIGN-UP COUNTRY LIST (every ISO 3166-1 country, names from Intl)
// ============================================================================

/** ISO 3166-1 alpha-2 codes of every country (249). Regions, placeholders and old codes are left out. */
export const ISO_COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

function regionNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return null;
  }
}

/**
 * The country name stored in `Merchant.country` / `Outlet.country`: the English name, the text Settings and existing
 * shops use (the `COUNTRIES` name when listed there, else the Intl English name, else the code).
 */
export function countryEnglishName(code: string): string {
  const upper = code.trim().toUpperCase();
  const listed = COUNTRIES.find((c) => c.code === upper);
  if (listed) return listed.name;
  const name = regionNames('en')?.of(upper);
  return name && name !== upper ? name : upper;
}

/** The sign-up country select: Vietnam first, then every country by its name in the page language. */
export function countryOptions(pageLocale: string): Array<{ code: string; label: string }> {
  const names = regionNames(pageLocale) ?? regionNames('en');
  const labelOf = (code: string) => {
    const name = names?.of(code);
    return name && name !== code ? name : countryEnglishName(code);
  };
  const collator = (() => {
    try {
      return new Intl.Collator(pageLocale);
    } catch {
      return new Intl.Collator('en');
    }
  })();
  const rest = ISO_COUNTRY_CODES.filter((code) => code !== 'VN')
    .map((code) => ({ code, label: labelOf(code) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  return [{ code: 'VN', label: labelOf('VN') }, ...rest];
}
