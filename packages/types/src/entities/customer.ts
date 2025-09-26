// ============================================================================
// CUSTOMER ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  BaseEntityWithMerchant,
  Address, 
  ContactInfo,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus,
  MerchantReference
} from '../common/base';

// ============================================================================
// CORE CUSTOMER INTERFACES
// ============================================================================

/**
 * Main Customer interface - consolidated from multiple sources
 * Combines customers/customer.ts and customer-management.ts definitions
 */
export interface Customer extends BaseEntityWithMerchant, Address, ContactInfo {
  // Core customer fields
  firstName: string;
  lastName: string;
  name: string; // Computed field: firstName + lastName
  dateOfBirth?: Date | string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive: boolean;
  
  // Optional outlet assignment
  outletId?: number;
  
  // Related entities (populated when needed)
  merchant?: MerchantReference;
}

// ============================================================================
// CUSTOMER FORM INPUTS
// ============================================================================

/**
 * Customer creation input
 * Used for creating new customers
 */
export interface CustomerCreateInput extends BaseFormInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date | string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  merchantId: number;
  outletId?: number;
}

/**
 * Customer update input
 * Used for updating existing customers
 */
export interface CustomerUpdateInput extends BaseUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date | string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  isActive?: boolean;
}

// ============================================================================
// CUSTOMER SEARCH AND FILTERS
// ============================================================================

/**
 * Customer search parameters
 * Extends base search with customer-specific filters
 */
export interface CustomerSearchParams extends BaseSearchParams {
  merchantId?: number;
  outletId?: number;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive?: boolean;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'blocked';
}

/**
 * Customer search result
 * Used for customer search responses
 */
export interface CustomerSearchResult {
  id: number;        // Auto-incrementing integer ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: Date | string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  isActive: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  merchantId: number;  // Changed from string to number
  merchant: {
    id: number;        // Changed from string to number
    name: string;
  };
}

/**
 * Customer search response
 * Used for API responses with pagination
 */
export interface CustomerSearchResponse {
  success: boolean;
  data: {
    customers: CustomerWithMerchant[];
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// ============================================================================
// CUSTOMER WITH RELATIONS
// ============================================================================

/**
 * Customer with merchant information
 * Used for customer displays with merchant context
 */
export interface CustomerWithMerchant extends Customer {
  merchant: MerchantReference;
}

/**
 * Customer data interface for management views
 * Used in customer management components
 */
export interface CustomerData extends Customer {
  fullName: string;
  orderCount: number;
  totalSpent: number;
}

// ============================================================================
// CUSTOMER MANAGEMENT TYPES
// ============================================================================

/**
 * Customer management interface
 * Used for customer management operations
 */
export interface CustomerManagement {
  createCustomer(input: CustomerCreateInput): Promise<Customer>;
  updateCustomer(id: number, input: CustomerUpdateInput): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  getCustomer(id: number): Promise<Customer | null>;
  getCustomers(filters?: CustomerSearchParams): Promise<Customer[]>;
}

/**
 * Customer action type
 * Used for customer management actions
 */
export type CustomerAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'block';

// ============================================================================
// CUSTOMER ANALYTICS TYPES
// ============================================================================

/**
 * Customer statistics interface
 * Used for customer analytics and reporting
 */
export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: TopCustomer[];
}

/**
 * Top customer interface
 * Used for customer analytics and reporting
 */
export interface TopCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  orderCount: number;
  rentalCount: number;
  saleCount: number;
  totalSpent: number;
}

/**
 * Customer performance metrics
 * Used for customer performance analysis
 */
export interface CustomerPerformance {
  customerId: number;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: Date | string;
  customerLifetimeValue: number;
  retentionRate: number;
}

// ============================================================================
// CUSTOMER SEARCH FILTERS - FOR API COMPATIBILITY
// ============================================================================

/**
 * Customer search filter
 * Used for customer search operations in API
 */
export interface CustomerSearchFilter {
  q?: string;           // Search query parameter (consistent with orders)
  search?: string;      // Keep for backward compatibility
  merchantId?: number;  // Changed from string to number
  outletId?: number;    // Added outletId for filtering by outlet
  isActive?: boolean;
  city?: string;
  state?: string;
  country?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  limit?: number;
  offset?: number;
  page?: number;        // Add page parameter for pagination
  sortBy?: string;      // Add sorting support
  sortOrder?: 'asc' | 'desc';  // Add sorting support
}

// Alias for backward compatibility
export type CustomerFilters = CustomerSearchFilter;

// ============================================================================
// CUSTOMER INPUT TYPES - FOR DATABASE COMPATIBILITY
// ============================================================================

/**
 * Customer input interface
 * Used for database operations
 */
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
  dateOfBirth?: Date | string;
  idNumber?: string;
  idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  notes?: string;
  merchantId: number;
}
