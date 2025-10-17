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
  pricingType?: string; // FIXED, HOURLY, DAILY
  taxId?: string;
  currency: string; // Currency code (USD, VND)
  isActive: boolean;
  
  // Subscription and plan information
  planId?: number;
  
  // Business metrics
  totalRevenue: number;
  lastActiveAt?: Date | string;
  
  // Optional: Full pricing configuration (can be removed if not needed)
  pricingConfig?: MerchantPricingConfig | string;
  
  // Related entities (populated when needed)
  plan?: PlanDetails;
  subscription?: CurrentSubscription; // ✅ Always exists (default trial)
  outlets?: OutletReference[];
  users?: UserReference[];
  customers?: CustomerReference[];
  products?: ProductReference[];
  categories?: any[];
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
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  trialStart?: Date | string;
  trialEnd?: Date | string;
  amount: number;
  currency: string;
  interval: string; // 'month', 'quarter', 'year'
  period: number; // 1, 3, 6, 12 months
  discount: number;
  savings: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | string;
  cancelReason?: string;
  plan?: {
    id: number;
    name: string;
    description: string;
    basePrice: number;
    currency: string;
    trialDays: number;
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
  currency?: string; // Currency code (USD, VND), defaults to USD
  businessType?: string; // Business type (CLOTHING, VEHICLE, EQUIPMENT, GENERAL)
  pricingType?: string; // Pricing type (FIXED, HOURLY, DAILY)
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
  businessType?: string; // Business type (CLOTHING, VEHICLE, EQUIPMENT, GENERAL)
  pricingType?: string; // Pricing type (FIXED, HOURLY, DAILY)
  taxId?: number;
  currency?: string; // Currency code (USD, VND)
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
// Import types from constants package to avoid duplication
import type { BusinessType, PricingType, PricingBusinessRules, PricingDurationLimits, MerchantPricingConfig } from '@rentalshop/constants';

// Re-export for backward compatibility
export type { BusinessType, PricingType, PricingBusinessRules, PricingDurationLimits, MerchantPricingConfig };
