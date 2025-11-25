// ============================================================================
// PRICING CONFIGURATION CONSTANTS
// ============================================================================

// Local type definitions to avoid circular dependency
export type BusinessType = 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';
export type PricingType = 'FIXED' | 'HOURLY' | 'DAILY';

// Type-safe constants for PricingType enum values
export const PRICING_TYPE = {
  FIXED: 'FIXED' as const,
  HOURLY: 'HOURLY' as const,
  DAILY: 'DAILY' as const,
} as const;

// ============================================================================
// BUSINESS TYPE & PRICING TYPE DESCRIPTIONS
// ============================================================================

export interface BusinessTypeOption {
  value: BusinessType;
  label: string;
  description: string;
  icon: string;
}

export interface PricingTypeOption {
  value: PricingType;
  label: string;
  description: string;
  icon: string;
}

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  {
    value: 'GENERAL',
    label: 'General Rental',
    description: 'Mixed rental business with various product types',
    icon: ''
  },
  {
    value: 'CLOTHING',
    label: 'Clothing & Fashion',
    description: 'Rent or sell clothing, accessories, and fashion items',
    icon: ''
  },
  {
    value: 'VEHICLE',
    label: 'Vehicle Rental',
    description: 'Car, motorcycle, bicycle, and vehicle rental services',
    icon: ''
  },
  {
    value: 'EQUIPMENT',
    label: 'Equipment Rental',
    description: 'Tools, machinery, and equipment rental services',
    icon: ''
  }
];

export const PRICING_TYPE_OPTIONS: PricingTypeOption[] = [
  {
    value: 'FIXED',
    label: 'Fixed Price',
    description: 'Same price regardless of rental duration',
    icon: ''
  },
  {
    value: 'HOURLY',
    label: 'Hourly Pricing',
    description: 'Price calculated per hour of rental',
    icon: ''
  },
  {
    value: 'DAILY',
    label: 'Daily Pricing',
    description: 'Price calculated per day of rental',
    icon: ''
  }
];

export interface PricingBusinessRules {
  requireRentalDates: boolean;
  showPricingOptions: boolean;
}

export interface PricingDurationLimits {
  minDuration: number;
  maxDuration: number;
  defaultDuration: number;
}

export interface MerchantPricingConfig {
  businessType: BusinessType;
  defaultPricingType: PricingType;
  businessRules: PricingBusinessRules;
  durationLimits: PricingDurationLimits;
}

// ============================================================================
// BUSINESS TYPE DEFAULTS
// ============================================================================

/**
 * Default pricing configuration for each business type
 */
export const BUSINESS_TYPE_DEFAULTS: Record<BusinessType, MerchantPricingConfig> = {
  CLOTHING: {
    businessType: 'CLOTHING',
    defaultPricingType: 'FIXED',
    businessRules: {
      requireRentalDates: false,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,
      maxDuration: 1,
      defaultDuration: 1
    }
  },
  
  VEHICLE: {
    businessType: 'VEHICLE',
    defaultPricingType: 'HOURLY',
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: true
    },
    durationLimits: {
      minDuration: 1,      // 1 hour
      maxDuration: 168,    // 1 week (24*7)
      defaultDuration: 4   // 4 hours
    }
  },
  
  EQUIPMENT: {
    businessType: 'EQUIPMENT',
    defaultPricingType: 'DAILY',
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,      // 1 day
      maxDuration: 30,     // 30 days
      defaultDuration: 3   // 3 days
    }
  },
  
  GENERAL: {
    businessType: 'GENERAL',
    defaultPricingType: 'FIXED',
    businessRules: {
      requireRentalDates: false,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,
      maxDuration: 1,
      defaultDuration: 1
    }
  }
};

// ============================================================================
// LABELS AND DESCRIPTIONS
// ============================================================================

/**
 * Human-readable labels for pricing types
 */
export const PRICING_TYPE_LABELS = {
  FIXED: 'Fixed Price',
  HOURLY: 'Hourly',
  DAILY: 'Daily',
} as const;

/**
 * Human-readable labels for business types
 */
export const BUSINESS_TYPE_LABELS = {
  CLOTHING: 'Clothing Rental',
  VEHICLE: 'Vehicle Rental',
  EQUIPMENT: 'Equipment Rental',
  GENERAL: 'General Rental'
} as const;

/**
 * Descriptions for pricing types
 */
export const PRICING_TYPE_DESCRIPTIONS = {
  FIXED: 'One price per rental (e.g., equipment rental)',
  HOURLY: 'Price per hour (e.g., vehicles, tools)',
  DAILY: 'Price per day (e.g., construction equipment)',
} as const;

/**
 * Descriptions for business types
 */
export const BUSINESS_TYPE_DESCRIPTIONS = {
  CLOTHING: 'Dresses, suits, costumes, accessories',
  VEHICLE: 'Cars, bikes, motorcycles',
  EQUIPMENT: 'Tools, machinery, equipment',
  GENERAL: 'Various items and services'
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get default pricing configuration for business type
 */
export function getDefaultPricingConfig(businessType: BusinessType): MerchantPricingConfig {
  return BUSINESS_TYPE_DEFAULTS[businessType];
}

/**
 * Get pricing type label
 */
export function getPricingTypeLabel(pricingType: PricingType): string {
  return PRICING_TYPE_LABELS[pricingType];
}

/**
 * Get business type label
 */
export function getBusinessTypeLabel(businessType: BusinessType): string {
  return BUSINESS_TYPE_LABELS[businessType];
}

/**
 * Get pricing type description
 */
export function getPricingTypeDescription(pricingType: PricingType): string {
  return PRICING_TYPE_DESCRIPTIONS[pricingType];
}

/**
 * Get business type description
 */
export function getBusinessTypeDescription(businessType: BusinessType): string {
  return BUSINESS_TYPE_DESCRIPTIONS[businessType];
}

/**
 * Check if pricing type requires rental dates
 */
export function requiresRentalDates(pricingType: PricingType): boolean {
  return pricingType !== 'FIXED';
}

/**
 * Get duration unit for pricing type
 */
export function getDurationUnit(pricingType: PricingType): string {
  switch (pricingType) {
    case 'HOURLY': return 'hour';
    case 'DAILY': return 'day';
    case 'FIXED': return 'rental';
    default: return 'unit';
  }
}
