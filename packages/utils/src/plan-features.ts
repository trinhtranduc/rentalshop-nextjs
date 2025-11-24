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
  let cleanFeature = feature;
  if (feature.startsWith('plans.features.')) {
    cleanFeature = feature.replace('plans.features.', '');
  } else if (feature.startsWith('features.')) {
    cleanFeature = feature.replace('features.', '');
  }
  
  // Normalize feature key: lowercase, remove spaces and special chars
  const featureKey = cleanFeature.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  
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
  };
  
  // Try to find translation key
  const translationKey = featureMap[featureKey];
  if (translationKey) {
    try {
      const translated = t(translationKey);
      // If translation returns the key itself, it means translation not found
      if (translated !== translationKey) {
        return translated;
      }
    } catch {
      // Fallback to original if translation fails
    }
  }
  
  // Fallback: try direct translation key
  try {
    const directKey = `features.${featureKey}`;
    const translated = t(directKey);
    if (translated !== directKey) {
      return translated;
    }
  } catch {
    // Ignore
  }
  
  // Return original if no translation found
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

