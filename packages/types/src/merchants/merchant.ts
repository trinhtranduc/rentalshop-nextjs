// ============================================================================
// MERCHANT TYPES
// ============================================================================

export interface Merchant {
  id: number;                    // This represents the publicId from database
  name: string;
  email: string;
  phone?: string;
  address?: string;              // Merchant address
  city?: string;                 // Merchant city
  state?: string;                // Merchant state
  zipCode?: string;              // Merchant zip code
  country?: string;              // Merchant country
  description?: string;
  planId?: number;               // Reference to Plan publicId
  subscriptionStatus: string;    // Current subscription status
  totalRevenue: number;          // Total revenue generated
  lastActiveAt?: Date;           // Last activity date
  isActive: boolean;             // Whether merchant account is active
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (forward references to avoid circular dependencies)
  plan?: PlanDetails;            // Current plan details
  currentSubscription?: CurrentSubscription; // Current subscription details
  outlets?: any[];               // Merchant outlets
  users?: any[];                 // Merchant users
  customers?: any[];             // Merchant customers
  products?: any[];              // Merchant products
  categories?: any[];            // Merchant categories
  subscriptions?: any[];         // Subscription history
}

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

export interface CurrentSubscription {
  id: number;
  status: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
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
