// ============================================================================
// MERCHANT TYPES
// ============================================================================

export interface Merchant {
  id: number;        // This represents the publicId from database
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  businessType: string;
  taxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantCreateInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  businessType: string;
  taxId?: string;
}

export interface MerchantUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  taxId?: string;
}
