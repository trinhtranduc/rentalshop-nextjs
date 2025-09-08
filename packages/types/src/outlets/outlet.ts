// ============================================================================
// OUTLET TYPES
// ============================================================================

export interface Outlet {
  id: number;        // This represents the publicId from database
  name: string;
  address?: string;
  phone?: string;
  city?: string;     // Outlet city
  state?: string;    // Outlet state
  zipCode?: string;  // Outlet zip code
  country?: string;  // Outlet country
  description?: string;
  merchantId: number;
  isActive: boolean;
  isDefault?: boolean;  // Indicates if this is the default outlet for the merchant
  createdAt: Date;
  updatedAt: Date;
}

export interface OutletCreateInput {
  name: string;
  address?: string;
  phone?: string;
  description?: string;
  merchantId: number;
}

export interface OutletUpdateInput {
  name?: string;
  address?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// OUTLET SEARCH TYPES
// ============================================================================

export interface OutletSearchFilter {
  merchantId?: number;
  outletId?: number; // Add outletId filter for outlet-level users
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OutletSearchResult {
  id: number;        // publicId
  name: string;
  address?: string;
  phone?: string;
  city?: string;     // Outlet city
  state?: string;    // Outlet state
  zipCode?: string;  // Outlet zip code
  country?: string;  // Outlet country
  description?: string;
  isActive: boolean;
  isDefault?: boolean;  // Indicates if this is the default outlet for the merchant
  createdAt: Date;
  updatedAt: Date;
  merchantId: number;
  merchant: {
    id: number;      // publicId
    name: string;
  };
}

export interface OutletSearchResponse {
  outlets: OutletSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
