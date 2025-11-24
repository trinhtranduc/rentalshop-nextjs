// ============================================================================
// PLAN FEATURES UTILITIES
// ============================================================================

/**
 * Translate plan feature name to localized string
 * 
 * @param feature - Feature name (e.g., "Mobile app access")
 * @param t - Translation function from usePlansTranslations()
 * @returns Translated feature name or original if translation not found
 */
export function translatePlanFeature(feature: string, t: (key: string) => string): string {
  if (!feature) return feature;
  
  // Normalize feature key: lowercase, remove spaces and special chars
  const featureKey = feature.toLowerCase()
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

