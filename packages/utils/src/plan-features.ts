// ============================================================================
// PLAN FEATURES UTILITIES
// ============================================================================

/**
 * Hard-coded list of all available plan features
 * These are the only features that can be assigned to plans
 * Translation keys are in locales/[lang]/plans.json under "features"
 */
export const AVAILABLE_PLAN_FEATURES = [
  'mobileAppAccess',
  'basicInventoryManagement',
  'customerManagement',
  'orderProcessing',
  'basicReporting',
  'publicProductCatalog',
  'productPublicCheck',
  'webDashboard',
  'advancedReporting',
  'customBranding',
  'prioritySupport',
  'apiIntegration',
  'multiOutletManagement',
  'advancedAnalytics',
  'whiteLabel',
  'allBasicFeatures',
  'webDashboardAccess',
  'advancedReportingAnalytics',
  'inventoryForecasting',
  'onlinePayments',
  'teamCollaborationTools',
  'allProfessionalFeatures',
  'multipleOutlets',
  'advancedTeamManagement',
  'customIntegrations',
  'dedicatedAccountManager',
  'customReporting',
  'whiteLabelSolution',
  '247PhoneSupport',
  'additionalUserPricing',
] as const;

export type PlanFeatureKey = typeof AVAILABLE_PLAN_FEATURES[number];

/**
 * Default features for Basic plan (5 features)
 */
export const BASIC_PLAN_FEATURES: PlanFeatureKey[] = [
  'mobileAppAccess',
  'basicInventoryManagement',
  'customerManagement',
  'orderProcessing',
  'basicReporting',
];

/**
 * Default features for Professional plan (7 features)
 * Includes all Basic features plus additional ones
 */
export const PROFESSIONAL_PLAN_FEATURES: PlanFeatureKey[] = [
  'allBasicFeatures', // Represents all Basic plan features
  'webDashboardAccess',
  'advancedReportingAnalytics',
  'inventoryForecasting',
  'onlinePayments',
  'apiIntegration',
  'teamCollaborationTools',
  'prioritySupport',
];

/**
 * Translate plan feature name to localized string
 * 
 * @param feature - Feature name (e.g., "Mobile app access")
 * @param t - Translation function from usePlansTranslations()
 * @returns Translated feature name or original if translation not found
 */
export function translatePlanFeature(feature: string, t: (key: string) => string): string {
  if (!feature) return feature;
  
  // Remove translation key prefix if present (e.g., "plans.features.allbasicfeatures" -> "allbasicfeatures")
  let cleanFeature = feature.trim();
  if (cleanFeature.startsWith('plans.features.')) {
    cleanFeature = cleanFeature.replace('plans.features.', '');
  } else if (cleanFeature.startsWith('features.')) {
    cleanFeature = cleanFeature.replace('features.', '');
  }
  
  // Normalize feature key: lowercase, remove spaces and special chars (including checkmark symbols)
  const featureKey = cleanFeature.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/✓/g, '') // Remove checkmark symbols
    .replace(/check/g, ''); // Remove "check" suffix if present
  
  // Common feature translations mapping
  const featureMap: Record<string, string> = {
    'mobileappaccess': 'features.mobileAppAccess',
    'basicinventorymanagement': 'features.basicInventoryManagement',
    'customermanagement': 'features.customerManagement',
    'orderprocessing': 'features.orderProcessing',
    'basicreporting': 'features.basicReporting',
    'publicproductcatalog': 'features.publicProductCatalog',
    'productpubliccheck': 'features.productPublicCheck',
    'webdashboard': 'features.webDashboard',
    'advancedreporting': 'features.advancedReporting',
    'custombranding': 'features.customBranding',
    'prioritysupport': 'features.prioritySupport',
    'apiintegration': 'features.apiIntegration',
    'multioutletmanagement': 'features.multiOutletManagement',
    'advancedanalytics': 'features.advancedAnalytics',
    'whitelabel': 'features.whiteLabel',
    // New features
    'allbasicfeatures': 'features.allBasicFeatures',
    'webdashboardaccess': 'features.webDashboardAccess',
    'advancedreportinganalytics': 'features.advancedReportingAnalytics',
    'inventoryforecasting': 'features.inventoryForecasting',
    'onlinepayments': 'features.onlinePayments',
    'teamcollaborationtools': 'features.teamCollaborationTools',
    'allprofessionalfeatures': 'features.allProfessionalFeatures',
    'multipleoutlets': 'features.multipleOutlets',
    'advancedteammanagement': 'features.advancedTeamManagement',
    'customintegrations': 'features.customIntegrations',
    'dedicatedaccountmanager': 'features.dedicatedAccountManager',
    'customreporting': 'features.customReporting',
    'whitelabelsolution': 'features.whiteLabelSolution',
    '247phonesupport': 'features.247PhoneSupport',
    'additionaluserpricing': 'features.additionalUserPricing',
  };
  
  // Try to find translation key in featureMap
  const translationKey = featureMap[featureKey];
  if (translationKey) {
    try {
      // translationKey is like "features.allBasicFeatures"
      // t function from useTranslations('plans') will automatically add "plans." prefix
      // So t('features.allBasicFeatures') will look for "plans.features.allBasicFeatures" in translation file
      const translated = t(translationKey);
      // Check if translation was successful (not the same as key and not undefined)
      if (translated && translated !== translationKey && translated !== `plans.${translationKey}`) {
        return translated;
      }
    } catch (error) {
      // Log error in development
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn(`[translatePlanFeature] Translation error for key "${translationKey}":`, error);
      }
    }
  }
  
  // Fallback 1: try direct translation key with camelCase from cleanFeature
  // If cleanFeature is already camelCase (e.g., "allBasicFeatures"), use it directly
  if (cleanFeature !== cleanFeature.toLowerCase() && cleanFeature !== cleanFeature.toUpperCase()) {
    try {
      const camelCaseKey = cleanFeature.charAt(0).toLowerCase() + cleanFeature.slice(1);
      const directKey = `features.${camelCaseKey}`;
      const translated = t(directKey);
      if (translated && translated !== directKey) {
        return translated;
      }
    } catch {
      // Ignore
    }
  }
  
  // Fallback 2: try direct translation key with normalized key (lowercase)
  try {
    const directKey = `features.${featureKey}`;
    const translated = t(directKey);
    if (translated && translated !== directKey) {
      return translated;
    }
  } catch {
    // Ignore
  }
  
  // Fallback 3: try to convert normalized key to camelCase and translate
  // Convert "allbasicfeatures" -> "allBasicFeatures"
  try {
    const camelCaseKey = featureKey
      .split(/(?=[A-Z])|(?=\d)/)
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // Try different camelCase variations
    const variations = [
      `features.${camelCaseKey}`,
      `features.${featureKey.charAt(0).toUpperCase() + featureKey.slice(1)}`,
      `features.${cleanFeature}`,
    ];
    
    for (const key of variations) {
      try {
        const translated = t(key);
        if (translated && translated !== key) {
          return translated;
        }
      } catch {
        // Continue to next variation
      }
    }
  } catch {
    // Ignore
  }
  
  // Return original if no translation found (log for debugging in development)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.warn(`[translatePlanFeature] No translation found for: "${feature}" (normalized: "${featureKey}", clean: "${cleanFeature}")`);
  }
  return feature;
}

/**
 * Translate array of plan features
 * 
 * @param features - Array of feature names
 * @param t - Translation function from usePlansTranslations()
 * @returns Array of translated feature names
 */
export function translatePlanFeatures(features: string[], t: (key: string) => string): string[] {
  if (!Array.isArray(features)) return [];
  return features.map(feature => translatePlanFeature(feature, t));
}

