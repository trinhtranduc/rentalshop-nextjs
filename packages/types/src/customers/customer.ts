// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id: string;
  publicId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive: boolean;
  merchantId: string;
  outletId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerCreateInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive?: boolean;
}

// Additional customer types for database operations
export interface CustomerInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  merchantId: string;
}

export interface CustomerFilters {
  search?: string;
  merchantId?: string;
  outletId?: string;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive?: boolean;
  // Additional filter options for UI components
  status?: 'active' | 'inactive' | 'blocked';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerSearchResult {
  id: string;
  publicId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  merchantId: string;
  merchant: {
    id: string;
    name: string;
  };
}

// Extended customer types for search and API responses
export interface CustomerWithMerchant extends Customer {
  merchant: {
    id: string;
    name: string;
  };
}

// Note: Customer interface already extends the base Customer type
// which includes publicId as number and merchantId as string

export interface CustomerSearchFilter {
  q?: string;
  merchantId?: string;
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  limit?: number;
  offset?: number;
}

export interface CustomerSearchResponse {
  success: boolean;
  data: {
    customers: CustomerWithMerchant[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// UI-specific types
export interface CustomerData extends Customer {
  fullName: string;
  orderCount: number;
  totalSpent: number;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: TopCustomer[];
}

export interface TopCustomer {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
}
