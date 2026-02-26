import { z } from 'zod';
import type { PlanLimits } from '@rentalshop/constants';
import { 
  ORDER_STATUS,
  ORDER_TYPE,
  USER_ROLE,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  SUBSCRIPTION_STATUS
} from '@rentalshop/constants';

// ============================================================================
// VALIDATION SCHEMAS (CLIENT-SAFE)
// ============================================================================
// These schemas are safe for client-side use (no server-only dependencies)
// They only use Zod for validation, no NextResponse, prisma, or Node.js modules

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  // Required fields: email, password, name (or firstName+lastName), businessName (for merchant)
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  
  // Name: Support both formats - either 'name' or 'firstName' (lastName is optional)
  name: z.string().min(1, 'Name is required').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(), // Allow empty string or undefined
  
  // For merchant registration - businessName is required if registering as merchant
  businessName: z.string().optional(),
  
  // All other fields are optional
  phone: z.string().optional(),
  role: z.enum([
    USER_ROLE.ADMIN,
    USER_ROLE.MERCHANT,
    USER_ROLE.OUTLET_ADMIN,
    USER_ROLE.OUTLET_STAFF,
    // Legacy roles for backward compatibility
    'CLIENT',
    'SHOP_OWNER'
  ] as [string, ...string[]]).optional(),
  // Optional tenant key (domain-like identifier) for future multi-tenant routing
  tenantKey: z.string().min(1).max(50).regex(/^[a-z0-9\-]+$/i, 'Tenant key must be alphanumeric').optional(),
  // Optional referral code (tenantKey of referring merchant)
  referralCode: z.string().min(1).optional(),
  // Business configuration (optional - defaults will be used)
  businessType: z.enum(['CLOTHING', 'VEHICLE', 'EQUIPMENT', 'GENERAL']).optional(),
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY']).optional(),
  // Address fields for merchant registration (all optional)
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(2, 'Please select a valid country').optional(),
  // For outlet staff registration
  merchantCode: z.string().optional(),
  outletCode: z.string().optional(),
}).refine((data) => {
  // Either 'name' or 'firstName' must be provided (lastName is optional)
  // lastName can be empty string or undefined
  const hasName = data.name && data.name.trim().length > 0;
  const hasFirstName = data.firstName && data.firstName.trim().length > 0;
  return hasName || hasFirstName;
}, {
  message: "Either 'name' or 'firstName' must be provided"
}).refine((data) => {
  // For MERCHANT registration, businessName is required
  if (data.role === 'MERCHANT' || data.businessName) {
    return !!data.businessName && data.businessName.trim().length > 0;
  }
  return true;
}, {
  message: "Business name is required for merchant registration"
});

// Product validation schemas (aligned with API routes and DB types)
const outletStockItemSchema = z.object({
  outletId: z.coerce.number().int().positive('Outlet is required'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
});

// Base product schema (without refine) - used for both create and update
const productBaseSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  rentPrice: z.number().nonnegative('Rent price must be non-negative'),
  salePrice: z.number().nonnegative('Sale price must be non-negative').optional(),
  costPrice: z.number().nonnegative('Cost price must be non-negative').optional(),
  deposit: z.number().nonnegative('Deposit must be non-negative').default(0),
  categoryId: z.coerce.number().int().positive().optional(), // Optional - will use default category if not provided
  totalStock: z.coerce.number().int().min(0, 'Total stock must be non-negative').optional(), // Optional - will be calculated from outletStock if not provided
  images: z.array(z.string().url('Invalid image URL')).optional(),
  // Support both outletStock (mobile app) and outletStocks (web app) for backward compatibility
  outletStock: z.array(outletStockItemSchema).optional(), // Mobile app uses this field name
  outletStocks: z.array(outletStockItemSchema).optional(), // Web app uses this field name (legacy)
  // Optional pricing configuration (default FIXED if null or undefined)
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY']).nullable().default('FIXED'), // Default to FIXED
  durationConfig: z.string().nullable().optional(), // JSON string: { minDuration, maxDuration, defaultDuration } - required for HOURLY/DAILY
  durationLimits: z.object({
    min: z.number().int().min(1).optional(),
    max: z.number().int().min(1).optional(),
    unit: z.enum(['hour', 'day', 'week', 'month']).optional(),
  }).optional(),
  isActive: z.boolean().default(true),
  merchantId: z.coerce.number().int().positive().optional(), // Optional - required for ADMIN users, auto-assigned for others
});

// Product create schema with refine validation
export const productCreateSchema = productBaseSchema.refine((data) => {
  // If pricingType is HOURLY or DAILY, durationConfig is required
  if (data.pricingType === 'HOURLY' || data.pricingType === 'DAILY') {
    if (!data.durationConfig) {
      return false;
    }
    // Validate durationConfig JSON structure
    try {
      const config = JSON.parse(data.durationConfig);
      if (!config.minDuration || !config.maxDuration || !config.defaultDuration) {
        return false;
      }
      if (config.minDuration > config.maxDuration) {
        return false;
      }
      if (config.defaultDuration < config.minDuration || config.defaultDuration > config.maxDuration) {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
  return true;
}, {
  message: 'Duration configuration is required and must be valid JSON for HOURLY and DAILY pricing types',
  path: ['durationConfig']
});

// Product update schema (uses base schema without refine, so .partial() works)
export const productUpdateSchema = productBaseSchema.partial().extend({
  id: z.coerce.number().int().positive('Product ID is required'),
});

export const productsQuerySchema = z.object({
  outletId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  q: z.string().optional(), // Support 'q' parameter for search (alias for 'search')
  merchantId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional(), // Support page-based pagination
  isActive: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'createdAt', 'rentPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const rentalSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  productId: z.coerce.number().int().positive('Product is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductsQuery = z.infer<typeof productsQuerySchema>;
export type RentalInput = z.infer<typeof rentalSchema>;

// Customer validation schemas
export const customerCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(2, 'Please select a valid country').optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.coerce.number().int().positive('Customer ID is required'),
});

export const customersQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(), // Support 'q' parameter for search (alias for 'search')
  phone: z.string().optional(),
  email: z.string().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(), // Support page-based pagination
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['firstName', 'lastName', 'phone', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Order validation schemas
const orderStatusEnum = z.enum([
  ORDER_STATUS.RESERVED,
  ORDER_STATUS.PICKUPED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
] as [string, ...string[]]);

const orderTypeEnum = z.enum([
  ORDER_TYPE.RENT,
  ORDER_TYPE.SALE,
] as [string, ...string[]]);

export const ordersQuerySchema = z.object({
  outletId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  status: orderStatusEnum.optional(),
  orderType: orderTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  q: z.string().optional(), // Support 'q' parameter for search (alias for 'search')
  merchantId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional(), // Support page-based pagination
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'orderNumber', 'status', 'totalAmount', 'pickupPlanAt', 'returnPlanAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive('Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  rentDays: z.number().int().min(1).optional(), // For rental orders
});

const baseOrderSchema = z.object({
  orderType: orderTypeEnum,
  outletId: z.coerce.number().int().positive('Outlet is required'),
  customerId: z.coerce.number().int().positive().optional(),
  orderItems: z.array(orderItemSchema).min(1, 'At least one order item is required'),
  pickupPlanAt: z.string().datetime().optional(),
  returnPlanAt: z.string().datetime().optional(),
  totalAmount: z.number().nonnegative('Total amount must be non-negative'),
  depositAmount: z.number().nonnegative('Deposit amount must be non-negative').default(0),
  notes: z.string().optional(),
});

export const orderCreateSchema = baseOrderSchema;
export const orderUpdateSchema = baseOrderSchema.partial().extend({
  id: z.coerce.number().int().positive('Order ID is required'),
});

export type OrdersQuery = z.infer<typeof ordersQuerySchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdatePayload = z.infer<typeof orderUpdateSchema>;

// User validation schemas
const userRoleEnum = z.enum([
  USER_ROLE.ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF,
] as [string, ...string[]]);

export const usersQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional(),
  role: userRoleEnum.optional(),
  search: z.string().optional(),
  q: z.string().optional(), // Support 'q' parameter for search (alias for 'search')
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(), // Support page-based pagination
  sortBy: z.enum(['email', 'name', 'role', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Name: Support both formats - either 'name' or 'firstName' (lastName is optional)
  name: z.string().min(1, 'Name is required').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(), // Allow empty string or undefined
  phone: z.string().optional(),
  role: userRoleEnum,
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional(),
}).refine((data) => {
  // Either 'name' or 'firstName' must be provided (lastName is optional)
  // lastName can be empty string or undefined
  const hasName = data.name && data.name.trim().length > 0;
  const hasFirstName = data.firstName && data.firstName.trim().length > 0;
  return hasName || hasFirstName;
}, {
  message: "Either 'name' or 'firstName' must be provided"
});

export const userUpdateSchema = z.object({
  id: z.coerce.number().int().positive('User ID is required'),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  // Name: Support both formats - either 'name' or 'firstName' (lastName is optional)
  name: z.string().min(1, 'Name is required').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(), // Allow empty string or undefined
  phone: z.string().optional(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  // Either 'name' or 'firstName' must be provided if name fields are present
  // If neither is provided, that's okay (update is partial)
  if (data.name || data.firstName) {
    const hasName = data.name && data.name.trim().length > 0;
    const hasFirstName = data.firstName && data.firstName.trim().length > 0;
    return hasName || hasFirstName;
  }
  return true; // No name fields provided, which is fine for partial updates
}, {
  message: "Either 'name' or 'firstName' must be provided if updating name"
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// Outlet validation schemas
export const outletsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const categoriesQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const outletCreateSchema = z.object({
  name: z.string().min(1, 'Outlet name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  merchantId: z.coerce.number().int().positive('Merchant is required'),
});

export const outletUpdateSchema = z.object({
  id: z.coerce.number().int().positive('Outlet ID is required'),
  name: z.string().min(1, 'Outlet name is required').optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  isActive: z.boolean().optional(),
});

export type OutletsQuery = z.infer<typeof outletsQuerySchema>;
export type OutletCreateInput = z.infer<typeof outletCreateSchema>;
export type OutletUpdateInput = z.infer<typeof outletUpdateSchema>;

// Plan validation schemas
export const planCreateSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative'),
  billingCycle: z.enum(['monthly', 'yearly']),
  limits: z.record(z.any()).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const planUpdateSchema = planCreateSchema.partial();

export const plansQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlansQuery = z.infer<typeof plansQuerySchema>;

// Plan limit addon schemas
export const planLimitAddonCreateSchema = z.object({
  name: z.string().min(1, 'Addon name is required'),
  description: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative'),
  limits: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const planLimitAddonUpdateSchema = z.object({
  id: z.coerce.number().int().positive('Addon ID is required'),
  name: z.string().min(1, 'Addon name is required').optional(),
  description: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative').optional(),
  limits: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const planLimitAddonsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['id', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Plan variant schemas
export const planVariantCreateSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Variant name is required'),
  description: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative'),
  billingCycle: z.enum(['monthly', 'yearly']),
  limits: z.record(z.any()).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const planVariantUpdateSchema = planVariantCreateSchema.partial().extend({
  id: z.coerce.number().int().positive('Variant ID is required'),
});

export const planVariantsQuerySchema = z.object({
  planId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'price', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PlanVariantCreateInput = z.infer<typeof planVariantCreateSchema>;
export type PlanVariantUpdateInput = z.infer<typeof planVariantUpdateSchema>;
export type PlanVariantsQuery = z.infer<typeof planVariantsQuerySchema>;
export type PlanLimitAddonCreateInput = z.infer<typeof planLimitAddonCreateSchema>;
export type PlanLimitAddonUpdateInput = z.infer<typeof planLimitAddonUpdateSchema>;
export type PlanLimitAddonsQuery = z.infer<typeof planLimitAddonsQuerySchema>;

// Subscription schemas
export const subscriptionCreateSchema = z.object({
  merchantId: z.coerce.number().int().positive('Merchant is required'),
  planId: z.string().min(1, 'Plan is required'),
  planVariantId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'yearly']),
  status: z.enum([
    SUBSCRIPTION_STATUS.TRIAL,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.CANCELLED,
    SUBSCRIPTION_STATUS.EXPIRED,
    SUBSCRIPTION_STATUS.PAST_DUE,
    SUBSCRIPTION_STATUS.PAUSED,
  ] as [string, ...string[]]).optional(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial().extend({
  id: z.coerce.number().int().positive('Subscription ID is required'),
});

export const subscriptionsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  status: z.enum(['trial', 'active', 'cancelled', 'expired', 'past_due', 'paused']).optional(),
  planId: z.string().optional(),
  planVariantId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'currentPeriodEnd', 'amount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema>;

// ============================================================================
// PLAN LIMITS TYPES (CLIENT-SAFE)
// ============================================================================
// These types are safe for client-side use (no server-only dependencies)
// They are used by both client and server code

export interface PlanLimitsValidationResult {
  isValid: boolean;
  error?: string;
  currentCount: number;
  limit: number;
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
}

export interface PlanLimitsInfo {
  planLimits: PlanLimits; // Total limits (plan + addon)
  basePlanLimits?: PlanLimits; // Original plan limits (for reference)
  addonLimits?: PlanLimits; // Addon limits (for transparency)
  platform: 'mobile' | 'mobile+web';
  currentCounts: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
  isUnlimited: {
    outlets: boolean;
    users: boolean;
    products: boolean;
    customers: boolean;
    orders: boolean;
  };
  platformAccess: {
    mobile: boolean;
    web: boolean;
    productPublicCheck: boolean;
  };
}
