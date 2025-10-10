// ============================================================================
// OUTLET ENTITY TYPES - CONSOLIDATED
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
// CORE OUTLET INTERFACES
// ============================================================================

/**
 * Main Outlet interface - consolidated from multiple sources
 * Combines outlet-data.ts and outlets/outlet.ts definitions
 */
export interface Outlet extends BaseEntityWithMerchant, Address, ContactInfo {
  // Core outlet fields
  name: string;
  description?: string;
  isActive: boolean;
  isDefault?: boolean; // Indicates if this is the default outlet for the merchant
  
  // Related entities (populated when needed)
  merchant?: MerchantReference;
}

// ============================================================================
// OUTLET FORM INPUTS
// ============================================================================

/**
 * Outlet creation input
 * Used for creating new outlets
 */
export interface OutletCreateInput extends BaseFormInput {
  name: string;
  address?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  description?: string;
  merchantId: number;
}

/**
 * Outlet update input
 * Used for updating existing outlets
 */
export interface OutletUpdateInput extends BaseUpdateInput {
  name?: string;
  address?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// ============================================================================
// OUTLET SEARCH AND FILTERS
// ============================================================================

/**
 * Outlet search parameters
 * Extends base search with outlet-specific filters
 */
export interface OutletSearchParams extends BaseSearchParams {
  merchantId?: number;
  outletId?: number; // Add outletId filter for outlet-level users
  isActive?: boolean;
  isDefault?: boolean;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Outlet search result
 * Used for outlet search responses
 */
export interface OutletSearchResult {
  id: number;        // Auto-incrementing integer ID
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
  createdAt: Date | string;
  updatedAt: Date | string;
  merchantId: number;
  merchant: {
    id: number;      // Auto-incrementing integer ID
    name: string;
  };
}

/**
 * Outlet search response
 * Used for API responses with pagination
 */
export interface OutletSearchResponse {
  outlets: OutletSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// OUTLET MANAGEMENT TYPES
// ============================================================================

/**
 * Outlet data interface for management views
 * Used in outlet management components
 */
export interface OutletData {
  outlets: Outlet[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: OutletFilters;
}

/**
 * Outlet filters interface
 * Used for filtering outlets in management views
 */
export interface OutletFilters {
  search?: string;
  status?: string;
  merchantId?: number;
  outletId?: number;  // Added missing outletId property
  city?: string;
  state?: string;
  country?: string;
  isActive?: boolean;
  isDefault?: boolean;
  page?: number;
  limit?: number;
  offset?: number;  // Added missing offset property
}

// Alias for backward compatibility
export type OutletSearchFilter = OutletFilters;

/**
 * Outlet action type
 * Used for outlet management actions
 */
export type OutletAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'setDefault';

// ============================================================================
// OUTLET STATISTICS
// ============================================================================

/**
 * Outlet statistics interface
 * Used for outlet analytics and reporting
 */
export interface OutletStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
}

/**
 * Outlet performance metrics
 * Used for outlet performance analysis
 */
export interface OutletPerformance {
  outletId: number;
  outletName: string;
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  growthRate: number;
  efficiency: number;
}

// ============================================================================
// OUTLET INVENTORY TYPES
// ============================================================================

/**
 * Outlet inventory summary
 * Used for inventory management
 */
export interface OutletInventorySummary {
  outletId: number;
  outletName: string;
  totalProducts: number;
  totalStock: number;
  availableStock: number;
  rentedStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

/**
 * Outlet stock level
 * Used for stock management
 */
export interface OutletStockLevel {
  productId: number;
  productName: string;
  currentStock: number;
  availableStock: number;
  rentedStock: number;
  reservedStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}
