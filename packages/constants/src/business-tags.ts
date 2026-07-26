// ============================================================================
// MERCHANT BUSINESS TAGS (niche rental categories)
// ============================================================================
// Stable keys stored on Merchant.businessTags (JSON string[]).
// Clients localize labels; API only persists these codes.

import type { BusinessType } from './pricing';

export const BUSINESS_TAG = {
  AO_DAI: 'AO_DAI',
  COSTUME: 'COSTUME',
  WEDDING_DRESS: 'WEDDING_DRESS',
  EQUIPMENT: 'EQUIPMENT',
  VEHICLE: 'VEHICLE',
  FILM_EQUIPMENT: 'FILM_EQUIPMENT',
  OTHER: 'OTHER',
} as const;

export type BusinessTag = (typeof BUSINESS_TAG)[keyof typeof BUSINESS_TAG];

export const BUSINESS_TAG_VALUES: BusinessTag[] = [
  BUSINESS_TAG.AO_DAI,
  BUSINESS_TAG.COSTUME,
  BUSINESS_TAG.WEDDING_DRESS,
  BUSINESS_TAG.EQUIPMENT,
  BUSINESS_TAG.VEHICLE,
  BUSINESS_TAG.FILM_EQUIPMENT,
  BUSINESS_TAG.OTHER,
];

export interface BusinessTagOption {
  /** Stable API key stored in DB */
  value: BusinessTag;
  /** English label (clients should localize by `value`) */
  label: string;
  /** Maps to Merchant.businessType pricing category */
  businessType: BusinessType;
}

export const BUSINESS_TAG_OPTIONS: BusinessTagOption[] = [
  {
    value: BUSINESS_TAG.AO_DAI,
    label: 'Ao dai rental',
    businessType: 'CLOTHING',
  },
  {
    value: BUSINESS_TAG.COSTUME,
    label: 'Costume rental',
    businessType: 'CLOTHING',
  },
  {
    value: BUSINESS_TAG.WEDDING_DRESS,
    label: 'Wedding dress rental',
    businessType: 'CLOTHING',
  },
  {
    value: BUSINESS_TAG.EQUIPMENT,
    label: 'Equipment rental',
    businessType: 'EQUIPMENT',
  },
  {
    value: BUSINESS_TAG.VEHICLE,
    label: 'Vehicle rental',
    businessType: 'VEHICLE',
  },
  {
    value: BUSINESS_TAG.FILM_EQUIPMENT,
    label: 'Film equipment rental',
    businessType: 'EQUIPMENT',
  },
  {
    value: BUSINESS_TAG.OTHER,
    label: 'Other',
    businessType: 'GENERAL',
  },
];

const TAG_SET = new Set<string>(BUSINESS_TAG_VALUES);

/**
 * Keep only known tag codes, unique, order preserved.
 */
export function normalizeBusinessTags(tags: unknown): BusinessTag[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: BusinessTag[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim().toUpperCase();
    if (!TAG_SET.has(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value as BusinessTag);
  }
  return result;
}

/**
 * Derive Merchant.businessType from selected niche tags.
 * Mixed niches across categories → GENERAL.
 */
export function deriveBusinessTypeFromTags(tags: BusinessTag[]): BusinessType {
  const normalized = normalizeBusinessTags(tags);
  if (normalized.length === 0) return 'GENERAL';

  const types = new Set(
    normalized
      .map((tag) => BUSINESS_TAG_OPTIONS.find((o) => o.value === tag)?.businessType)
      .filter((t): t is BusinessType => !!t && t !== 'GENERAL')
  );

  // Only OTHER / empty specialty → GENERAL
  if (types.size === 0) return 'GENERAL';
  // Single specialty category
  if (types.size === 1) return [...types][0];
  // Mixed (e.g. clothing + vehicle)
  return 'GENERAL';
}
