// ============================================================================
// SIMPLE SUBSCRIPTION CONFIGURATION
// ============================================================================
// Simple subscription model without complex pricing

export interface PlanLimits {
  outlets: number;             // Maximum number of outlets allowed (-1 for unlimited)
  users: number;               // Maximum number of users allowed (-1 for unlimited)
  products: number;            // Maximum number of products allowed (-1 for unlimited)
  customers: number;           // Maximum number of customers allowed (-1 for unlimited)
  orders: number;              // Maximum number of orders allowed (-1 for unlimited)
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  limits: PlanLimits;
  features: PlanFeature[];
  platform: 'mobile' | 'mobile+web';  // Platform access level
  publicProductCheck: boolean;         // Can share product links publicly
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  color: string;
  badge?: string;
  upgradeFrom?: string[];      // Plans that can upgrade to this one
  downgradeTo?: string[];      // Plans that this can downgrade to
}

// ============================================================================
// BILLING CYCLES
// ============================================================================

export const BILLING_CYCLES = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly',
    duration: 1,
    unit: 'month',
    discount: 0
  },
  QUARTERLY: {
    id: 'quarterly',
    name: 'Quarterly',
    duration: 3,
    unit: 'months',
    discount: 0 // 0% discount
  },
  SEMI_ANNUAL: {
    id: 'semi_annual',
    name: 'Semi-Annual',
    duration: 6,
    unit: 'months',
    discount: 0.05 // 5% discount
  },
  ANNUAL: {
    id: 'annual',
    name: 'Annual',
    duration: 12,
    unit: 'months',
    discount: 0.10 // 10% discount
  }
};

// Array format for form components (synchronized with BILLING_CYCLES object)
export const BILLING_CYCLES_ARRAY = [
  {
    value: 'monthly' as const,
    label: BILLING_CYCLES.MONTHLY.name,
    months: BILLING_CYCLES.MONTHLY.duration,
    discount: BILLING_CYCLES.MONTHLY.discount * 100, // Convert to percentage
    description: 'Pay monthly, cancel anytime'
  },
  {
    value: 'quarterly' as const,
    label: BILLING_CYCLES.QUARTERLY.name,
    months: BILLING_CYCLES.QUARTERLY.duration,
    discount: BILLING_CYCLES.QUARTERLY.discount * 100, // Convert to percentage
    description: `Save ${BILLING_CYCLES.QUARTERLY.discount * 100}% with quarterly billing`
  },
  {
    value: 'semi_annual' as const,
    label: BILLING_CYCLES.SEMI_ANNUAL.name,
    months: BILLING_CYCLES.SEMI_ANNUAL.duration,
    discount: BILLING_CYCLES.SEMI_ANNUAL.discount * 100, // Convert to percentage
    description: `Save ${BILLING_CYCLES.SEMI_ANNUAL.discount * 100}% with semi-annual billing`
  },
  {
    value: 'annual' as const,
    label: BILLING_CYCLES.ANNUAL.name,
    months: BILLING_CYCLES.ANNUAL.duration,
    discount: BILLING_CYCLES.ANNUAL.discount * 100, // Convert to percentage
    description: `Save ${BILLING_CYCLES.ANNUAL.discount * 100}% with annual billing`
  }
];

// ============================================================================
// RENEWAL DURATIONS
// ============================================================================

export const RENEWAL_DURATIONS = [
  {
    id: 'monthly',
    name: 'Monthly',
    months: 1,
    duration: 1,
    unit: 'month',
    description: 'Renew every month',
    isPopular: false
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    months: 3,
    duration: 3,
    unit: 'months',
    description: 'Save 5% with quarterly billing',
    isPopular: false
  },
  {
    id: 'semiannual',
    name: '6 Months',
    months: 6,
    duration: 6,
    unit: 'months',
    description: 'Save 10% with 6-month billing',
    isPopular: false
  },
  {
    id: 'annual',
    name: 'Annual',
    months: 12,
    duration: 12,
    unit: 'months',
    description: 'Save 20% with annual billing',
    isPopular: true
  }
];

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

export const TRIAL_CONFIG = {
  DEFAULT_TRIAL_DAYS: 14,
  TRIAL_NOTIFICATIONS: {
    DAYS_BEFORE_EXPIRY: [7, 3, 1] as readonly number[]
  }
};

// ============================================================================
// SUBSCRIPTION PLANS CONFIGURATION
// ============================================================================

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  TRIAL: {
    id: 'trial',
    name: 'Trial',
    description: 'Free trial with starter plan limits',
    basePrice: 0, // Free trial
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2000,
      orders: 2000
    },
    features: [
      { name: 'Mobile app access', description: 'Access your business on mobile devices', included: true },
      { name: 'Basic inventory management', description: 'Track products and stock levels', included: true },
      { name: 'Customer management', description: 'Store customer information and history', included: true },
      { name: 'Order processing', description: 'Create and manage rental orders', included: true },
      { name: 'Basic reporting', description: 'View sales and rental reports', included: true },
      { name: 'Public product catalog', description: 'Share product list publicly with customers', included: true },
      { name: 'Product public check', description: 'Send public links to customers to view products and pricing', included: true }
    ],
    platform: 'mobile',
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
    color: 'green',
    badge: 'Free Trial',
    upgradeFrom: [],
    downgradeTo: ['basic']
  },

  BASIC: {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for small rental businesses',
    basePrice: 79000, // 79k VND
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2000,
      orders: 2000
    },
    features: [
      { name: 'Mobile app access', description: 'Access your business on mobile devices', included: true },
      { name: 'Basic inventory management', description: 'Track products and stock levels', included: true },
      { name: 'Customer management', description: 'Store customer information and history', included: true },
      { name: 'Order processing', description: 'Create and manage rental orders', included: true },
      { name: 'Basic reporting', description: 'View sales and rental reports', included: true }
    ],
    platform: 'mobile',
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    color: 'blue',
    upgradeFrom: [],
    downgradeTo: []
  },

  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for growing rental businesses with web access',
    basePrice: 199000, // 199k VND
    currency: 'VND',
    limits: {
      outlets: 1,
      users: 8,
      products: 5000,
      customers: 10000,
      orders: 10000
    },
    features: [
      { name: 'All Basic features', description: 'Includes all Basic plan features', included: true },
      { name: 'Web dashboard access', description: 'Full web-based management interface', included: true },
      { name: 'Advanced reporting & analytics', description: 'Detailed business insights and trends', included: true },
      { name: 'Inventory forecasting', description: 'Predict demand and optimize stock levels', included: true },
      { name: 'Online payments', description: 'Accept online payments and deposits', included: true },
      { name: 'Public product catalog', description: 'Share product list publicly with customers', included: true },
      { name: 'Product public check', description: 'Send public links to customers to view products and pricing', included: true },
      { name: 'Priority support', description: 'Fast response times for support', included: true }
    ],
    platform: 'mobile+web',
    publicProductCheck: true,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    color: 'purple',
    badge: 'Most Popular',
    upgradeFrom: ['basic'],
    downgradeTo: ['basic']
  },

  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large rental operations with multiple outlets',
    basePrice: 399000, // 399k VND
    currency: 'VND',
    limits: {
      outlets: 3,
      users: 15,
      products: 15000,
      customers: 50000,
      orders: 50000
    },
    features: [
      { name: 'All Professional features', description: 'Includes all Professional plan features', included: true },
      { name: 'Multiple outlets', description: 'Manage multiple rental locations', included: true },
      { name: 'Advanced team management', description: 'Sophisticated user roles and permissions', included: true },
      { name: 'Custom integrations', description: 'Tailored third-party integrations', included: true },
      { name: 'Dedicated account manager', description: 'Personal support representative', included: true },
      { name: 'Custom reporting', description: 'Tailored analytics and reporting', included: true },
      { name: 'White-label solution', description: 'Brand the platform with your company identity', included: true },
      { name: '24/7 phone support', description: 'Round-the-clock support via phone', included: true }
    ],
    platform: 'mobile+web',
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
    color: 'gold',
    badge: 'Premium',
    upgradeFrom: ['basic', 'professional'],
    downgradeTo: ['professional']
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get plan configuration by ID
 */
export function getPlan(planId: string): PlanConfig | null {
  const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
  return plan || null;
}

/**
 * Get all available plans
 */
export function getAllPlans(): PlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get active plans only
 */
export function getActivePlans(): PlanConfig[] {
  return getAllPlans().filter(plan => plan.isActive);
}

/**
 * Get plan limits by plan ID
 */
export function getPlanLimits(planId: string): PlanLimits | null {
  const plan = getPlan(planId);
  return plan ? plan.limits : null;
}

/**
 * Check if plan has web access
 */
export function hasWebAccess(planId: string): boolean {
  const plan = getPlan(planId);
  return plan ? plan.platform === 'mobile+web' : false;
}

/**
 * Check if plan has mobile access
 */
export function hasMobileAccess(planId: string): boolean {
  const plan = getPlan(planId);
  return plan ? plan.platform === 'mobile' || plan.platform === 'mobile+web' : false;
}

/**
 * Check if plan has public product check feature
 */
export function hasProductPublicCheck(planId: string): boolean {
  const plan = getPlan(planId);
  return plan ? plan.publicProductCheck : false;
}

/**
 * Get plan platform
 */
export function getPlanPlatform(planId: string): 'mobile' | 'mobile+web' | null {
  const plan = getPlan(planId);
  return plan ? plan.platform : null;
}

/**
 * Check if plan is unlimited for a specific entity type
 */
export function isUnlimitedPlan(planId: string, entityType: keyof PlanLimits): boolean {
  const limits = getPlanLimits(planId);
  if (!limits) return false;
  return limits[entityType] === -1;
}

/**
 * Get trial notification days
 */
export function getTrialNotificationDays(): readonly number[] {
  return TRIAL_CONFIG.TRIAL_NOTIFICATIONS.DAYS_BEFORE_EXPIRY;
}

/**
 * Get default trial days
 */
export function getDefaultTrialDays(): number {
  return TRIAL_CONFIG.DEFAULT_TRIAL_DAYS;
}

/**
 * Get plan comparison data for display
 */
export function getPlanComparison() {
  const plans = getActivePlans();
  
  return {
    plans: plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      badge: plan.badge,
      color: plan.color
    })),
    features: [
      { name: 'Mobile App', basic: true, professional: true, enterprise: true },
      { name: 'Web Dashboard', basic: false, professional: true, enterprise: true },
      { name: 'Products', basic: '500', professional: '5,000', enterprise: '15,000' },
      { name: 'Customers', basic: '2,000', professional: '10,000', enterprise: '50,000' },
      { name: 'Users', basic: '3', professional: '8', enterprise: '15' },
      { name: 'Outlets', basic: '1', professional: '1', enterprise: '3' },
      { name: 'Orders', basic: '2,000', professional: '10,000', enterprise: '50,000' },
      { name: 'Product Public Check', basic: true, professional: true, enterprise: true },
      { name: 'Advanced Analytics', basic: false, professional: true, enterprise: true },
      { name: 'API Access', basic: false, professional: true, enterprise: true },
      { name: 'Priority Support', basic: false, professional: true, enterprise: true },
      { name: '24/7 Phone Support', basic: false, professional: false, enterprise: true }
    ]
  };
}

/**
 * Validate plan configuration
 */
export function validatePlanConfig(plan: PlanConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!plan.id || plan.id.trim() === '') {
    errors.push('Plan ID is required');
  }

  if (!plan.name || plan.name.trim() === '') {
    errors.push('Plan name is required');
  }

  if (plan.basePrice < 0) {
    errors.push('Base price must be non-negative');
  }

  if (!plan.limits) {
    errors.push('Plan limits are required');
  } else {
    if (plan.limits.outlets < -1) {
      errors.push('Outlets limit must be -1 (unlimited) or positive');
    }
    if (plan.limits.users < -1) {
      errors.push('Users limit must be -1 (unlimited) or positive');
    }
    if (plan.limits.products < -1) {
      errors.push('Products limit must be -1 (unlimited) or positive');
    }
    if (plan.limits.customers < -1) {
      errors.push('Customers limit must be -1 (unlimited) or positive');
    }
    if (plan.limits.orders < -1) {
      errors.push('Orders limit must be -1 (unlimited) or positive');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}