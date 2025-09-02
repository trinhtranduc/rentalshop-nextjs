// ============================================================================
// PLAN TYPES
// ============================================================================

export interface Plan {
  id: number;                    // This represents the publicId from database
  name: string;                  // Plan name (e.g., "Basic", "Professional", "Enterprise")
  description: string;           // Plan description
  price: number;                 // Price for the billing cycle
  currency: string;              // Currency code (USD, VND)
  trialDays: number;             // Number of trial days
  maxOutlets: number;            // Maximum number of outlets allowed
  maxUsers: number;              // Maximum number of users allowed
  maxProducts: number;           // Maximum number of products allowed
  maxCustomers: number;          // Maximum number of customers allowed
  features: string[];            // Array of feature strings
  isActive: boolean;             // Whether the plan is active
  isPopular: boolean;            // Whether to highlight this plan
  sortOrder: number;             // Display order
  billingCycle: BillingCycle;    // Billing cycle type
  billingCycleMonths: number;    // Number of months for billing cycle
  createdAt: Date;
  updatedAt: Date;
}

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface BillingCycleOption {
  value: BillingCycle;
  label: string;
  months: number;
  description: string;
}

export interface PlanCreateInput {
  name: string;
  description: string;
  price: number;
  currency?: string;
  trialDays: number;
  maxOutlets: number;
  maxUsers: number;
  maxProducts: number;
  maxCustomers: number;
  features: string[];
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  billingCycle?: BillingCycle;
  billingCycleMonths?: number;
}

export interface PlanUpdateInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  trialDays?: number;
  maxOutlets?: number;
  maxUsers?: number;
  maxProducts?: number;
  maxCustomers?: number;
  features?: string[];
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  billingCycle?: BillingCycle;
  billingCycleMonths?: number;
}

export interface PlanFilters {
  search?: string;
  isActive?: boolean;
  isPopular?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'price' | 'createdAt' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
}

export interface PlanFeature {
  id: number;
  name: string;
  description: string;
  icon: string;
  isIncluded: boolean;
}

export interface PlanComparison {
  basic: Plan;
  professional: Plan;
  enterprise: Plan;
}
