// ============================================================================
// MERCHANT ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  Address, 
  ContactInfo,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus,
  OutletReference,
  UserReference,
  ProductReference,
  CustomerReference
} from '../common/base';

// ============================================================================
// CORE MERCHANT INTERFACES
// ============================================================================

/**
 * Main Merchant interface - consolidated from multiple sources
 * Combines merchants.ts and merchants/merchant.ts definitions
 */
export interface Merchant extends BaseEntity, Address, ContactInfo {
  // Core business fields
  name: string;
  email: string;
  description?: string;
  businessType?: string;
  taxId?: string;
  isActive: boolean;
  
  // Subscription and plan information
  planId?: number;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  
  // Business metrics
  totalRevenue: number;
  lastActiveAt?: Date | string;
  
  // NEW: Pricing configuration
  pricingConfig: MerchantPricingConfig;
  
  // Related entities (populated when needed)
  plan?: PlanDetails;
  currentSubscription?: CurrentSubscription;
  outlets?: OutletReference[];
  users?: UserReference[];
  customers?: CustomerReference[];
  products?: ProductReference[];
  categories?: any[];
  subscriptions?: any[];
}

// ============================================================================
// PLAN AND SUBSCRIPTION TYPES
// ============================================================================

/**
 * Plan details interface
 * Used for subscription plan information
 */
export interface PlanDetails {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  trialDays: number;
  maxOutlets: number;
  maxUsers: number;
  maxProducts: number;
  maxCustomers: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
}

/**
 * Current subscription interface
 * Used for active subscription information
 */
export interface CurrentSubscription {
  id: number;
  status: string;
  startDate: Date | string;
  endDate?: Date | string;
  nextBillingDate?: Date | string;
  amount: number;
  currency: string;
  autoRenew: boolean;
  plan?: {
    id: number;
    name: string;
    basePrice: number;
    currency: string;
  };
  planVariant?: {
    id: number;
    name: string;
    duration: number;
    price: number;
    discount: number;
    savings: number;
  };
}

// ============================================================================
// MERCHANT FORM INPUTS
// ============================================================================

/**
 * Merchant creation input
 * Used for creating new merchants
 */
export interface MerchantCreateInput extends BaseFormInput {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  planId?: number;
  isActive?: boolean;
}

/**
 * Merchant update input
 * Used for updating existing merchants
 */
export interface MerchantUpdateInput extends BaseUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  taxId?: number;
  isActive?: boolean;
}

// ============================================================================
// MERCHANT SEARCH AND FILTERS
// ============================================================================

/**
 * Merchant search parameters
 * Extends base search with merchant-specific filters
 */
export interface MerchantSearchParams extends BaseSearchParams {
  status?: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
  plan?: string;
  businessType?: string;
  country?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Merchant search result
 * Extends base search result with merchant-specific data
 */
export interface MerchantSearchResult extends BaseSearchResult<Merchant> {
  merchants: Merchant[]; // Alias for items for backward compatibility
}

// ============================================================================
// MERCHANT STATISTICS
// ============================================================================

/**
 * Merchant statistics interface
 * Used for merchant analytics and reporting
 */
export interface MerchantStats {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  subscriptionStatus: string;
  planName?: string;
  subscriptionEndDate?: Date | string;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalOutlets: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  monthlyCustomers: number;
  createdAt: Date | string;
  lastActivity: Date | string;
}

/**
 * Detailed merchant statistics
 * Used for comprehensive merchant analytics
 */
export interface MerchantDetailStats {
  totalOutlets: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

// ============================================================================
// MERCHANT MANAGEMENT TYPES
// ============================================================================

/**
 * Merchant detail data interface
 * Used for comprehensive merchant management views
 */
export interface MerchantDetailData {
  merchant: Merchant;
  outlets?: OutletReference[];
  users?: UserReference[];
  products?: ProductReference[];
  customers?: CustomerReference[];
  stats: MerchantDetailStats;
}

/**
 * Merchant action type
 * Used for merchant management actions
 */
export type MerchantAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'suspend';

// ============================================================================
// MERCHANT FILTERS
// ============================================================================

/**
 * Merchant filters interface
 * Used for filtering merchants in management views
 */
export interface MerchantFilters {
  search?: string;
  status?: string;
  planId?: number;
  businessType?: string;
  country?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

// ============================================================================
// PRICING CONFIGURATION TYPES
// ============================================================================

/**
 * Pricing type enumeration
 */
export type PricingType = 'FIXED' | 'HOURLY' | 'DAILY' | 'WEEKLY';

/**
 * Business type enumeration
 */
export type BusinessType = 'CLOTHING'| 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';

/**
 * Business rules for pricing
 */
export interface PricingBusinessRules {
  requireRentalDates: boolean;      // Bắt buộc chọn dates cho time-based pricing
  showPricingOptions: boolean;      // Hiển thị pricing options cho customer
}

/**
 * Duration limits for time-based pricing
 */
export interface PricingDurationLimits {
  minDuration: number;              // Thời gian thuê tối thiểu
  maxDuration: number;              // Thời gian thuê tối đa
  defaultDuration: number;          // Thời gian mặc định
}

/**
 * Merchant pricing configuration
 */
export interface MerchantPricingConfig {
  businessType: BusinessType;       // Loại hình kinh doanh
  defaultPricingType: PricingType;  // Pricing type mặc định
  businessRules: PricingBusinessRules;
  durationLimits: PricingDurationLimits;
}
