// ============================================================================
// OUTLET TYPES
// ============================================================================

export interface Outlet {
  id: number;        // This represents the publicId from database
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email?: string;
  merchantId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutletCreateInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email?: string;
}

export interface OutletUpdateInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}
