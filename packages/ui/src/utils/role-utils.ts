/**
 * Format role for display in UI with localization support
 * - MERCHANT → "Merchant" (or translated)
 * - OUTLET_ADMIN → "Outlet Admin" (or translated)
 * - OUTLET_STAFF → "Outlet Staff" (or translated)
 * - ADMIN → "Admin" (or translated)
 * 
 * @param role - User role string
 * @param t - Optional translation function (e.g., from useCommonTranslations or useUsersTranslations)
 * @returns Formatted role display name
 */
export const formatRoleDisplayName = (role: string, t?: (key: string) => string): string => {
  // If translation function is provided, use it
  if (t) {
    const roleKey = role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
    const translated = t(`roles.${roleKey}` as any);
    if (translated && translated !== `roles.${roleKey}`) {
      return translated;
    }
  }
  
  // Fallback to default English values
  switch (role) {
    case 'MERCHANT':
      return 'Merchant';
    case 'OUTLET_ADMIN':
      return 'Outlet Admin';
    case 'OUTLET_STAFF':
      return 'Outlet Staff';
    case 'ADMIN':
      return 'Admin';
    default:
      return role;
  }
};

