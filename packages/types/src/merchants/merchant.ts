// ============================================================================
// MERCHANT TYPES
// ============================================================================

export interface Merchant {
  id: number;                    // This represents the publicId from database
  name: string;
  email: string;
  phone?: string;
  description?: string;
  planId?: number;               // Reference to Plan publicId
  subscriptionStatus: string;    // Current subscription status
  trialEndsAt?: Date;            // Trial end date
  totalRevenue: number;          // Total revenue generated
  lastActiveAt?: Date;           // Last activity date
  isActive: boolean;             // Whether merchant account is active
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (forward references to avoid circular dependencies)
  plan?: any;                    // Current plan details
  outlets?: any[];               // Merchant outlets
  users?: any[];                 // Merchant users
  customers?: any[];             // Merchant customers
  products?: any[];              // Merchant products
  categories?: any[];            // Merchant categories
  subscriptions?: any[];         // Subscription history
}

export interface MerchantCreateInput {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  planId?: number;               // Reference to Plan publicId
  isActive?: boolean;
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
  taxId?: number;
  isActive?: boolean;
}

export interface MerchantStats {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  subscriptionStatus: string;
  planName?: string;
  trialEndDate?: Date;
  subscriptionEndDate?: Date;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalOutlets: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  monthlyCustomers: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface MerchantSearchFilter {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
  plan?: string;
  businessType?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
