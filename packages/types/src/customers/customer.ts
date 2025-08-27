// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id: number;        // This represents the publicId from database
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
  merchantId: number;  // Changed from string to number
  outletId?: number;   // Changed from string to number
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
  merchantId: number;  // Changed from string to number
}

export interface CustomerFilters {
  search?: string;
  merchantId?: number;  // Changed from string to number
  outletId?: number;   // Changed from string to number
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive?: boolean;
  phone?: string;      // Added missing phone property
  email?: string;      // Added missing email property
  // Additional filter options for UI components
  status?: 'active' | 'inactive' | 'blocked';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerSearchResult {
  id: number;        // This represents the publicId from database
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
  merchantId: number;  // Changed from string to number
  merchant: {
    id: number;        // Changed from string to number
    name: string;
  };
}

// Extended customer types for search and API responses
export interface CustomerWithMerchant extends Customer {
  merchant: {
    id: number;        // Changed from string to number
    name: string;
  };
}

// Note: Customer interface already extends the base Customer type
// which includes id as number (representing publicId) and merchantId as string

export interface CustomerSearchFilter {
  q?: string;
  merchantId?: number;  // Changed from string to number
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
