// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface PersonalProfileUpdate {
  firstName: string;
  lastName: string;
  email?: string; // Email field is disabled - cannot be updated
  phone?: string;
}

export interface MerchantInfoUpdate {
  name: string;
  email?: string; // Email field is disabled - cannot be updated
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  taxId?: string;
  website?: string;
  description?: string;
}

export interface OutletInfoUpdate {
  name: string;
  address: string;
  phone?: string;
  description?: string;
}

export interface SecurityUpdate {
  currentPassword: string;
  newPassword: string;
}
