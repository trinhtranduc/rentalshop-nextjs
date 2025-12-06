import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { ApiError, ErrorCode } from './errors';
import { 
  API, 
  PlanLimits, 
  getPlan, 
  hasWebAccess, 
  hasMobileAccess, 
  getPlanPlatform, 
  hasProductPublicCheck,
  ORDER_STATUS,
  ORDER_TYPE,
  USER_ROLE,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  SUBSCRIPTION_STATUS
} from '@rentalshop/constants';
import { AuthUser } from '@rentalshop/types';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  // Required fields: email, password, name (or firstName+lastName), businessName (for merchant)
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  
  // Name: Support both formats - either 'name' or both 'firstName' and 'lastName'
  name: z.string().min(1, 'Name is required').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  
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
  // Either 'name' or both 'firstName' and 'lastName' must be provided
  return data.name || (data.firstName && data.lastName);
}, {
  message: "Either 'name' or both 'firstName' and 'lastName' must be provided"
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

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  rentPrice: z.number().nonnegative('Rent price must be non-negative'),
  salePrice: z.number().nonnegative('Sale price must be non-negative').optional(),
  costPrice: z.number().nonnegative('Cost price must be non-negative').optional(),
  deposit: z.number().nonnegative('Deposit must be non-negative').default(0),
  categoryId: z.coerce.number().int().positive().optional(), // Optional - will use default category if not provided
  totalStock: z.number().int().min(0, 'Total stock must be non-negative'),
  images: z.union([z.string(), z.array(z.string())]).optional(), // Allow both string and array for testing
  merchantId: z.coerce.number().int().positive().optional(), // Optional - required for ADMIN users, auto-assigned for others
  outletStock: z.array(outletStockItemSchema).optional(), // Optional - will use default outlet if not provided
  // Optional pricing configuration (default FIXED if null)
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY']).nullable().optional(), // NULL = FIXED (default)
  durationConfig: z.string().nullable().optional(), // JSON string: { minDuration, maxDuration, defaultDuration } - required for HOURLY/DAILY
}).refine((data) => {
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

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rentPrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().optional(),
  deposit: z.number().nonnegative().optional(),
  images: z.union([z.string(), z.array(z.string())]).optional(), // Support both string and array
  categoryId: z.coerce.number().int().positive().optional(), // Changed from string to number
  totalStock: z.number().int().min(0).optional(),
  outletStock: z.array(outletStockItemSchema).optional(), // Add outletStock field
  // Optional pricing configuration (default FIXED if null)
  pricingType: z.enum(['FIXED', 'HOURLY', 'DAILY']).nullable().optional(), // NULL = FIXED (default)
  durationConfig: z.string().nullable().optional(), // JSON string: { minDuration, maxDuration, defaultDuration } - required for HOURLY/DAILY
}).refine((data) => {
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

export const productsQuerySchema = z.object({
  q: z.string().optional(), // Search query parameter (consistent with orders)
  search: z.string().optional(), // Keep for backward compatibility
  merchantId: z.coerce.number().int().positive().optional(), // Add merchant filtering support
  categoryId: z.coerce.number().int().positive().optional(), // Changed from string to number
  outletId: z.coerce.number().int().positive().optional(), // Add outlet filtering
  available: z.coerce.boolean().optional(), // Add availability filter
  minPrice: z.coerce.number().nonnegative().optional(), // Add price range filters
  maxPrice: z.coerce.number().nonnegative().optional(), // Add price range filters
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0), // Add offset for pagination consistency
  sortBy: z.string().optional(), // Add sorting support
  sortOrder: z.enum(['asc', 'desc']).optional(), // Add sorting support
});

// Rental validation schemas
export const rentalSchema = z.object({
  productId: z.coerce.number().int().positive('Product is required'), // Changed from string to number
  startDate: z.date(),
  endDate: z.date(),
  notes: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
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
  lastName: z.string().optional(), // Optional - only firstName is required
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(), // Optional - no constraint required
  merchantId: z.coerce.number().int().positive().optional(), // Optional - only required for ADMIN users, auto-assigned for MERCHANT/OUTLET from JWT
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
});

export const customersQuerySchema = z.object({
  q: z.string().optional(), // Search query parameter (consistent with orders)
  search: z.string().optional(), // Keep for backward compatibility
  merchantId: z.coerce.number().int().positive().optional(), // Changed from string to number
  outletId: z.coerce.number().int().positive().optional(), // Add outlet filtering support
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0), // Add offset for pagination consistency
  sortBy: z.string().optional(), // Add sorting support
  sortOrder: z.enum(['asc', 'desc']).optional(), // Add sorting support
});

// ============================================================================
// Orders validation schemas
// ============================================================================

// ============================================================================
// ZOD ENUM HELPERS - Type-safe enums from constants
// ============================================================================

/**
 * Generate Zod enum for OrderStatus from ORDER_STATUS constants
 */
const orderStatusEnum = z.enum([
  ORDER_STATUS.RESERVED,
  ORDER_STATUS.PICKUPED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED
] as [string, ...string[]]);

/**
 * Generate Zod enum for OrderType from ORDER_TYPE constants
 */
const orderTypeEnum = z.enum([
  ORDER_TYPE.RENT,
  ORDER_TYPE.SALE
] as [string, ...string[]]);

export const ordersQuerySchema = z.object({
  q: z.string().optional(),
  merchantId: z.coerce.number().int().positive().optional(), // Add merchant filtering support
  outletId: z.coerce.number().int().positive().optional(), // Changed from string to number
  customerId: z.coerce.number().int().positive().optional(), // Changed from string to number
  userId: z.coerce.number().int().positive().optional(), // Changed from string to number
  productId: z.coerce.number().int().positive().optional(), // Add product filtering support
  orderType: orderTypeEnum.optional(),
  status: orderStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickupDate: z.coerce.date().optional(),
  returnDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1), // ✅ Use page instead of offset
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(), // Add sortBy support
  sortOrder: z.enum(['asc', 'desc']).optional(), // Add sortOrder support
});

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(), // Changed from string to number
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().default(0),
  totalPrice: z.coerce.number().nonnegative().optional(), // Made optional since server calculates it
  deposit: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  // daysRented removed - API will calculate from pickupPlanAt and returnPlanAt
});



// Base order schema for both create and update
const baseOrderSchema = z.object({
  // Optional fields for updates (backend generates if missing)
  orderId: z.coerce.number().int().positive().optional(),
  orderNumber: z.string().optional(),
  
  // Core order fields
  orderType: orderTypeEnum,
  customerId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive(),
  pickupPlanAt: z.coerce.date().optional(),
  returnPlanAt: z.coerce.date().optional(),
  // rentalDuration removed - API will calculate from pickupPlanAt and returnPlanAt
  subtotal: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(['amount', 'percentage']).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  securityDeposit: z.coerce.number().nonnegative().optional(),
  damageFee: z.coerce.number().nonnegative().optional(),
  lateFee: z.coerce.number().nonnegative().optional(),
  collateralType: z.string().optional(),
  collateralDetails: z.string().optional(),
  notes: z.string().optional(),
  pickupNotes: z.string().optional(),
  returnNotes: z.string().optional(),
  damageNotes: z.string().optional(),
  // customerName, customerPhone, customerEmail removed - use customerId only
  isReadyToDeliver: z.boolean().optional(),
  
  // Order items management
  orderItems: z.array(orderItemSchema),
});

export const orderCreateSchema = baseOrderSchema;

export const orderUpdateSchema = baseOrderSchema.partial().extend({
  // Update-specific fields (not present in create)
  status: orderStatusEnum.optional(),
  pickedUpAt: z.coerce.date().optional(),
  returnedAt: z.coerce.date().optional(),
});

export type OrdersQuery = z.infer<typeof ordersQuerySchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdatePayload = z.infer<typeof orderUpdateSchema>;

// ============================================================================
// Users validation schemas
// ============================================================================

/**
 * Generate Zod enum for UserRole from USER_ROLE constants
 */
const userRoleEnum = z.enum([
  USER_ROLE.ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.OUTLET_ADMIN,
  USER_ROLE.OUTLET_STAFF
] as [string, ...string[]]);

export const usersQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(), // Add merchant filtering support
  outletId: z.coerce.number().int().positive().optional(), // Add outlet filtering support
  role: userRoleEnum.optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1).or(z.literal('')), // Allow empty string for firstName
  lastName: z.string().min(1).or(z.literal('')), // Allow empty string for lastName
  phone: z.string().optional(), // Phone is optional
  role: userRoleEnum.optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional(),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1).or(z.literal('')).optional(), // Allow empty string for firstName
  lastName: z.string().min(1).or(z.literal('')).optional(), // Allow empty string for lastName
  email: z.string().email().optional(),
  phone: z.string().optional(), // Phone is optional
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional(),
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ============================================================================
// Outlets validation schemas
// ============================================================================
export const outletsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    if (v === 'all') return 'all';
    return v === 'true';
  }).optional(),
  q: z.string().optional(), // Search by outlet name (primary)
  search: z.string().optional(), // Alias for q (backward compatibility)
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================================================
// Categories validation schemas
// ============================================================================

export const categoriesQuerySchema = z.object({
  q: z.string().optional(), // Search by category name
  search: z.string().optional(), // Alias for backward compatibility
  merchantId: z.coerce.number().int().positive().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    if (v === 'all') return 'all';
    return v === 'true';
  }).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).optional(),
});

export const outletCreateSchema = z.object({
  name: z.string().min(1, 'Outlet name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED']).default('ACTIVE'),
});

export const outletUpdateSchema = z.object({
  name: z.string().min(1, 'Outlet name is required').optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED']).optional(),
});

export type OutletsQuery = z.infer<typeof outletsQuerySchema>;
export type OutletCreateInput = z.infer<typeof outletCreateSchema>;
export type OutletUpdateInput = z.infer<typeof outletUpdateSchema>;

// Plan validation schemas
export const planCreateSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().min(1, 'Plan description is required'),
  basePrice: z.number().nonnegative('Base price must be non-negative'),
  currency: z.string().default('USD'),
  trialDays: z.number().int().min(0, 'Trial days must be non-negative'),
  limits: z.object({
    outlets: z.number().int().min(-1, 'Max outlets must be -1 (unlimited) or positive'),
    users: z.number().int().min(-1, 'Max users must be -1 (unlimited) or positive'),
    products: z.number().int().min(-1, 'Max products must be -1 (unlimited) or positive'),
    customers: z.number().int().min(-1, 'Max customers must be -1 (unlimited) or positive'),
  }),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const planUpdateSchema = planCreateSchema.partial();

export const plansQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'price', 'basePrice', 'createdAt', 'sortOrder']).default('sortOrder'),  // ✅ Updated to support basePrice
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlansQuery = z.infer<typeof plansQuerySchema>;

// ============================================================================
// Plan Variant validation schemas
// ============================================================================

// Plan Limit Addon validation schemas
export const planLimitAddonCreateSchema = z.object({
  merchantId: z.coerce.number().int().positive('Merchant ID must be a positive integer'),
  outlets: z.coerce.number().int().min(0, 'Outlets must be 0 or greater').default(0),
  users: z.coerce.number().int().min(0, 'Users must be 0 or greater').default(0),
  products: z.coerce.number().int().min(0, 'Products must be 0 or greater').default(0),
  customers: z.coerce.number().int().min(0, 'Customers must be 0 or greater').default(0),
  orders: z.coerce.number().int().min(0, 'Orders must be 0 or greater').default(0),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const planLimitAddonUpdateSchema = z.object({
  outlets: z.coerce.number().int().min(0, 'Outlets must be 0 or greater').optional(),
  users: z.coerce.number().int().min(0, 'Users must be 0 or greater').optional(),
  products: z.coerce.number().int().min(0, 'Products must be 0 or greater').optional(),
  customers: z.coerce.number().int().min(0, 'Customers must be 0 or greater').optional(),
  orders: z.coerce.number().int().min(0, 'Orders must be 0 or greater').optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const planLimitAddonsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['id', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const planVariantCreateSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Variant name is required'),
  duration: z.number().int().positive('Duration must be positive'),
  price: z.number().nonnegative('Price must be non-negative').optional(),
  basePrice: z.number().nonnegative('Base price must be non-negative').optional(),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').default(0),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const planVariantUpdateSchema = planVariantCreateSchema.partial().extend({
  planId: z.string().min(1, 'Plan ID is required').optional(), // Optional for updates
});

export const planVariantsQuerySchema = z.object({
  planId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  duration: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'price', 'duration', 'discount', 'createdAt', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PlanVariantCreateInput = z.infer<typeof planVariantCreateSchema>;
export type PlanVariantUpdateInput = z.infer<typeof planVariantUpdateSchema>;

// Plan Limit Addon type exports
export type PlanLimitAddonCreateInput = z.infer<typeof planLimitAddonCreateSchema>;
export type PlanLimitAddonUpdateInput = z.infer<typeof planLimitAddonUpdateSchema>;
export type PlanLimitAddonsQuery = z.infer<typeof planLimitAddonsQuerySchema>;
export type PlanVariantsQuery = z.infer<typeof planVariantsQuerySchema>;

// ============================================================================
// Subscription validation schemas
// ============================================================================

export const subscriptionCreateSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  planVariantId: z.string().min(1, 'Plan variant ID is required'),
  merchantId: z.coerce.number().int().positive('Merchant ID is required'),
  status: z.enum(['trial', 'active', 'past_due', 'cancelled', 'paused', 'expired']).default('active'),
  billingInterval: z.enum(['month', 'quarter', 'semiAnnual', 'year']).default('month'),
  amount: z.number().nonnegative('Amount must be non-negative'),
  currency: z.string().default('USD'),
  trialStartDate: z.coerce.date().optional(),
  trialEndDate: z.coerce.date().optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  cancelledAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial().extend({
  id: z.coerce.number().int().positive().optional(),
});

export const subscriptionsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'inactive', 'cancelled', 'expired', 'suspended', 'past_due', 'paused']).optional(),
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
// PLAN LIMITS VALIDATION (from plan-limits-validation.ts)
// ============================================================================

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

/**
 * Get current counts for all entities for a merchant
 */
export async function getCurrentEntityCounts(merchantId: number): Promise<{
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}> {
  try {
    // Debug: Get detailed user count info
    const allUsers = await prisma.user.findMany({
      where: { merchantId },
      select: { id: true, email: true, deletedAt: true, role: true }
    });
    const activeUsers = allUsers.filter(u => !u.deletedAt);
    
    console.log(`🔍 getCurrentEntityCounts - Merchant ${merchantId}:`, {
      totalUsersInDB: allUsers.length,
      activeUsers: activeUsers.length,
      deletedUsers: allUsers.length - activeUsers.length,
      userDetails: allUsers.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        deletedAt: u.deletedAt ? 'DELETED' : 'ACTIVE'
      }))
    });

    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId } }),
      // Exclude soft-deleted users (deletedAt = null) from count
      prisma.user.count({ where: { merchantId, deletedAt: null } }),
      prisma.product.count({ where: { merchantId } }),
      prisma.customer.count({ where: { merchantId } }),
      // ✅ Count ALL orders including CANCELLED for plan limits
      prisma.order.count({ where: { outlet: { merchantId } } })
    ]);

    console.log(`📊 Entity counts for merchant ${merchantId}:`, {
      outlets,
      users, // This should match activeUsers.length
      products,
      customers,
      orders // ✅ Includes ALL orders (including CANCELLED) for plan limits
    });

    return {
      outlets,
      users,
      products,
      customers,
      orders
    };
  } catch (error) {
    console.error('Error getting entity counts:', error);
    throw new ApiError(ErrorCode.DATABASE_ERROR);
  }
}

/**
 * Get comprehensive plan limits information for a merchant
 */
export async function getPlanLimitsInfo(merchantId: number): Promise<PlanLimitsInfo> {
  try {
    // Get merchant with subscription - use fresh query to avoid stale data
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        subscription: {
          include: {
            plan: true // Include plan to get fresh data
          }
        }
      }
    });

    if (!merchant) {
      throw new ApiError(ErrorCode.MERCHANT_NOT_FOUND);
    }

    if (!merchant.subscription) {
      throw new ApiError(ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    
    console.log('🔍 getPlanLimitsInfo - Subscription data:', {
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: merchant.subscription.plan?.name || 'N/A'
    });

    // Get plan information - use plan from subscription if available, otherwise fetch fresh
    const plan = merchant.subscription.plan || await prisma.plan.findUnique({
      where: { id: merchant.subscription.planId }
    });
    if (!plan) {
      throw new ApiError(ErrorCode.PLAN_NOT_FOUND);
    }
    
    // Parse plan limits - handle both string and object formats
    let planLimits: any;
    if (typeof plan.limits === 'string') {
      try {
        planLimits = JSON.parse(plan.limits);
        console.log('🔍 Parsed plan.limits from JSON string:', {
          raw: plan.limits,
          parsed: planLimits,
          hasOrders: 'orders' in planLimits,
          ordersValue: planLimits.orders
        });
      } catch (e) {
        console.error('❌ Error parsing plan.limits:', e, 'Raw value:', plan.limits);
        planLimits = {};
      }
    } else {
      planLimits = plan.limits || {};
      console.log('🔍 Using plan.limits as object:', {
        limits: planLimits,
        hasOrders: 'orders' in planLimits,
        ordersValue: planLimits.orders
      });
    }
    
    // Ensure all required fields exist with default values
    // Default to unlimited (-1) if field is missing to prevent blocking operations
    // IMPORTANT: If orders is 0, treat as unlimited (-1) for backward compatibility
    // Only -1 means unlimited, 0 should be treated as unlimited (legacy data issue)
    const originalOrders = planLimits.orders;
    
    // ✅ FIX: Treat orders: 0 as unlimited (-1) for backward compatibility
    // This handles cases where old plan data has orders: 0 instead of undefined or proper limit
    // CRITICAL: This must happen BEFORE spread operator to ensure correct value
    const ordersLimit = (planLimits.orders === undefined || planLimits.orders === null || planLimits.orders === 0)
      ? -1  // Unlimited if missing, null, or 0
      : planLimits.orders;
    
    // ✅ IMPORTANT: Build planLimits object WITHOUT spread to ensure ordersLimit is used correctly
    planLimits = {
      outlets: planLimits.outlets !== undefined ? planLimits.outlets : -1,
      users: planLimits.users !== undefined ? planLimits.users : -1,
      products: planLimits.products !== undefined ? planLimits.products : -1,
      customers: planLimits.customers !== undefined ? planLimits.customers : -1,
      orders: ordersLimit, // ✅ Set orders FIRST (before any spread)
      // Don't spread planLimits here to avoid overriding orders with original value
      allowWebAccess: planLimits.allowWebAccess,
      allowMobileAccess: planLimits.allowMobileAccess,
    };
    
    // ✅ Log orders limit parsing for debugging
    console.log('🔍 Plan limits after processing:', {
      merchantId,
      originalOrders,
      finalOrders: planLimits.orders,
      wasDefaulted: (originalOrders === undefined || originalOrders === null || originalOrders === 0) && planLimits.orders === -1,
      wasFixed: originalOrders === 0 && planLimits.orders === -1,
      note: originalOrders === undefined || originalOrders === null
        ? '⚠️ WARNING: orders field missing in plan limits, defaulting to unlimited (-1)' 
        : originalOrders === 0
        ? '⚠️ WARNING: orders field is 0 (legacy data), treating as unlimited (-1) for backward compatibility'
        : `✅ orders field found: ${originalOrders}`,
      // ✅ Verify the fix worked
      verification: planLimits.orders === -1 ? '✅ Orders correctly set to unlimited (-1)' : `❌ Orders still ${planLimits.orders} (should be -1)`
    });
    
    // Parse plan features - handle both string and array formats
    let features: string[];
    if (typeof plan.features === 'string') {
      try {
        features = JSON.parse(plan.features);
      } catch (e) {
        console.error('Error parsing plan.features:', e, 'Raw value:', plan.features);
        features = [];
      }
    } else if (Array.isArray(plan.features)) {
      features = plan.features;
    } else {
      features = [];
    }
    
    const platform = features.includes('Web dashboard access') ? 'mobile+web' : 'mobile';

    // Get addon limits and add them to plan limits
    const { db } = await import('@rentalshop/database');
    const addonLimits = await db.planLimitAddons.calculateTotal(merchantId);
    
    // Store base plan limits (before adding addons) for reference
    // This ensures total limit never goes below the original plan base limit
    const basePlanLimits = { ...planLimits };
    
    // Calculate total limits: plan limits + addon limits
    // Formula: total = plan mặc định + plan addon (nếu có)
    // Note: If plan limit is -1 (unlimited), total is also -1 (unlimited)
    // Otherwise, simply add: baseLimit + addonLimit
    const calculateTotalLimit = (baseLimit: number, addonLimit: number): number => {
      // If base limit is unlimited, total is also unlimited
      if (baseLimit === -1) return -1;
      
      // ✅ Simple formula: total = plan mặc định + addon
      // Example: plan = 10, addon = 5 => total = 15
      const total = baseLimit + addonLimit;
      
      // Ensure total is never negative (minimum is 0)
      return Math.max(0, total);
    };
    
    const totalLimits = {
      outlets: calculateTotalLimit(planLimits.outlets, addonLimits.outlets),
      users: calculateTotalLimit(planLimits.users, addonLimits.users),
      products: calculateTotalLimit(planLimits.products, addonLimits.products),
      customers: calculateTotalLimit(planLimits.customers, addonLimits.customers),
      orders: calculateTotalLimit(planLimits.orders, addonLimits.orders),
    };

    // Get current counts
    const currentCounts = await getCurrentEntityCounts(merchantId);

    // Check unlimited flags: Only -1 means unlimited
    const isUnlimited = {
      outlets: totalLimits.outlets === -1,
      users: totalLimits.users === -1,
      products: totalLimits.products === -1,
      customers: totalLimits.customers === -1,
      orders: totalLimits.orders === -1
    };
    
    console.log('🔍 Plan Limits Check:', {
      merchantId,
      subscriptionId: merchant.subscription.id,
      planId: merchant.subscription.planId,
      planName: plan.name,
      // ✅ Formula: total = plan mặc định + addon
      basePlanLimits: basePlanLimits, // Plan mặc định (before addons)
      addonLimits, // Plan addon (nếu có)
      totalLimits, // Final limits = basePlanLimits + addonLimits
      limitsType: typeof plan.limits,
      rawPlanLimits: plan.limits, // ✅ Show raw limits from database for debugging
      parsedPlanLimits: planLimits, // ✅ Show parsed limits
      // ✅ Detailed orders calculation
      ordersCalculation: {
        planDefault: basePlanLimits.orders, // Plan mặc định
        addon: addonLimits.orders, // Addon (nếu có)
        total: totalLimits.orders, // Total = planDefault + addon
        formula: `${basePlanLimits.orders} + ${addonLimits.orders} = ${totalLimits.orders}`
      },
      ordersUnlimited: isUnlimited.orders,
      currentOrdersCount: currentCounts.orders,
      canCreateOrder: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
      planFeatures: features.slice(0, 3), // Show first 3 features for debugging
      // ✅ Detailed orders validation info
      ordersValidation: {
        limit: totalLimits.orders,
        current: currentCounts.orders,
        isUnlimited: isUnlimited.orders,
        canCreate: isUnlimited.orders || (totalLimits.orders !== undefined && currentCounts.orders < totalLimits.orders),
        comparison: isUnlimited.orders ? 'UNLIMITED' : `${currentCounts.orders} < ${totalLimits.orders}`,
        remaining: isUnlimited.orders ? 'UNLIMITED' : (totalLimits.orders - currentCounts.orders),
        // ✅ Critical check: why cannot create?
        reason: isUnlimited.orders 
          ? 'UNLIMITED - can create' 
          : (currentCounts.orders >= totalLimits.orders 
            ? `LIMIT REACHED: ${currentCounts.orders} >= ${totalLimits.orders}` 
            : `WITHIN LIMIT: ${currentCounts.orders} < ${totalLimits.orders} (${totalLimits.orders - currentCounts.orders} remaining)`)
      }
    });

    // Check platform access from plan features
    const platformAccess = {
      mobile: true, // All plans have mobile access
      web: features.includes('Web dashboard access'),
      productPublicCheck: features.includes('Product public check')
    };

    return {
      planLimits: totalLimits, // Return total limits (plan + addon, guaranteed >= base plan limit)
      basePlanLimits: basePlanLimits, // Keep original plan limits for reference (before addons)
      addonLimits, // Include addon limits for transparency
      platform: platform || 'mobile',
      currentCounts,
      isUnlimited,
      platformAccess
    };
  } catch (error) {
    console.error('Error getting plan limits info:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Validate if merchant can create a new entity
 */
export async function validatePlanLimits(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<PlanLimitsValidationResult> {
  try {
    console.log(`🔍 validatePlanLimits called: merchantId=${merchantId}, entityType=${entityType}`);
    const planInfo = await getPlanLimitsInfo(merchantId);
    const currentCount = planInfo.currentCounts[entityType];
    const limit = planInfo.planLimits[entityType];
    const isUnlimited = planInfo.isUnlimited[entityType];

    console.log(`🔍 validatePlanLimits result:`, {
      merchantId,
      entityType,
      currentCount,
      limit,
      isUnlimited
    });

    // Handle undefined limit (backward compatibility - treat as unlimited)
    if (limit === undefined || limit === null) {
      console.warn(`⚠️ Plan limit for ${entityType} is undefined, treating as unlimited for backward compatibility`);
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }

    // If unlimited, always allow
    if (isUnlimited) {
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }

    // Check if limit is exceeded
    // ✅ Logic: currentCount >= limit means limit is exceeded
    // Example: limit = 10000, currentCount = 10000 -> cannot create (limit reached)
    // Example: limit = 10000, currentCount = 9999 -> can create (1 more allowed)
    if (currentCount >= limit) {
      console.log(`❌ Plan limit exceeded:`, {
        merchantId,
        entityType,
        currentCount,
        limit,
        comparison: `${currentCount} >= ${limit}`,
        // ✅ Detailed breakdown for debugging
        breakdown: {
          currentCount,
          limit,
          remaining: limit - currentCount,
          canCreate: currentCount < limit,
          reason: currentCount >= limit ? 'Limit reached or exceeded' : 'Within limit'
        }
      });
      // Return error code only - translation system will handle the message
      return {
        isValid: false,
        error: 'PLAN_LIMIT_EXCEEDED', // Use error code for translation
        currentCount,
        limit,
        entityType
      };
    }

    return {
      isValid: true,
      currentCount,
      limit,
      entityType
    };
  } catch (error) {
    console.error('Error validating plan limits:', error);
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Validate platform access for merchant
 */
export function validatePlatformAccess(
  merchantId: number,
  platform: 'mobile' | 'web',
  planInfo: PlanLimitsInfo
): boolean {
  switch (platform) {
    case 'mobile':
      return planInfo.platformAccess.mobile;
    case 'web':
      return planInfo.platformAccess.web;
    default:
      return false;
  }
}

/**
 * Validate product public check access
 */
export function validateProductPublicCheckAccess(planInfo: PlanLimitsInfo): boolean {
  return planInfo.platformAccess.productPublicCheck;
}

/**
 * Assert plan limits for a specific entity type
 * Throws an error if the plan limit would be exceeded
 */
export async function assertPlanLimit(
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<void> {
  try {
    const validation = await validatePlanLimits(merchantId, entityType);
    
    if (!validation.isValid) {
      throw new ApiError(ErrorCode.PLAN_LIMIT_EXCEEDED);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Validate if deleting a plan limit addon would cause limit exceeded
 * 
 * This function checks if the merchant's current entity counts would exceed
 * the limits after removing the addon. If so, deletion should be prevented.
 * 
 * @param merchantId - Merchant ID
 * @param addonToRemove - The addon limits that will be removed
 * @returns Object with validation result and exceeded limits details
 */
export async function validateAddonDeletion(
  merchantId: number,
  addonToRemove: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  }
): Promise<{
  isValid: boolean;
  exceededLimits?: Array<{
    entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
    current: number;
    futureLimit: number;
  }>;
  currentCounts?: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
  futureLimits?: {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
  };
}> {
  try {
    console.log(`🔍 validateAddonDeletion called:`, {
      merchantId,
      addonToRemove
    });

    // Get current plan limits (with all active addons)
    const currentPlanInfo = await getPlanLimitsInfo(merchantId);
    const currentCounts = currentPlanInfo.currentCounts;

    // ✅ FIX: Get base plan limits (before addons) to calculate correctly
    // Current planLimits = base plan + all active addons
    // Future planLimits = base plan + (all active addons - addonToRemove)
    // Use basePlanLimits if available, otherwise fallback to planLimits (shouldn't happen but safe)
    const baseLimits = currentPlanInfo.basePlanLimits || currentPlanInfo.planLimits;
    
    // Calculate future limits: current total - addon to remove
    // Only subtract if addon is actually contributing to current limit
    const calculateFutureLimit = (currentTotalLimit: number, addonValue: number, baseLimit: number): number => {
      // If base limit is unlimited (-1), future limit stays unlimited
      if (baseLimit === -1) return -1;
      
      // If current total is unlimited, future stays unlimited
      if (currentTotalLimit === -1) return -1;
      
      // Future = current total - addon value
      // Ensure it doesn't go below base plan limit
      const future = currentTotalLimit - addonValue;
      return Math.max(baseLimit, future);
    };

    const futureLimits = {
      outlets: calculateFutureLimit(
        currentPlanInfo.planLimits.outlets, 
        addonToRemove.outlets,
        baseLimits.outlets
      ),
      users: calculateFutureLimit(
        currentPlanInfo.planLimits.users, 
        addonToRemove.users,
        baseLimits.users
      ),
      products: calculateFutureLimit(
        currentPlanInfo.planLimits.products, 
        addonToRemove.products,
        baseLimits.products
      ),
      customers: calculateFutureLimit(
        currentPlanInfo.planLimits.customers, 
        addonToRemove.customers,
        baseLimits.customers
      ),
      orders: calculateFutureLimit(
        currentPlanInfo.planLimits.orders, 
        addonToRemove.orders,
        baseLimits.orders
      ),
    };

    // Check if any entity type would exceed limits after deletion
    const exceededLimits: Array<{
      entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
      current: number;
      futureLimit: number;
    }> = [];

    const entityTypes: Array<'outlets' | 'users' | 'products' | 'customers' | 'orders'> = [
      'outlets',
      'users',
      'products',
      'customers',
      'orders',
    ];

    for (const entityType of entityTypes) {
      const currentCount = currentCounts[entityType];
      const futureLimit = futureLimits[entityType];

      // Skip if unlimited (-1)
      if (futureLimit === -1) continue;

      // Check if current count exceeds future limit
      if (currentCount > futureLimit) {
        exceededLimits.push({
          entityType,
          current: currentCount,
          futureLimit,
        });
      }
    }

    const isValid = exceededLimits.length === 0;

    console.log(`🔍 validateAddonDeletion result:`, {
      merchantId,
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
      currentLimits: currentPlanInfo.planLimits,
    });

    return {
      isValid,
      exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
      currentCounts,
      futureLimits,
    };
  } catch (error) {
    console.error('Error validating addon deletion:', error);
    throw new ApiError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Check plan limits for a specific entity type (DRY helper)
 * Returns NextResponse if limit exceeded, null if OK or ADMIN bypass
 * 
 * Usage in API routes:
 * ```typescript
 * const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'customers');
 * if (planLimitError) return planLimitError;
 * ```
 * 
 * @param user - Authenticated user (to check if ADMIN)
 * @param merchantId - Merchant ID to check limits for
 * @param entityType - Type of entity being created
 * @returns NextResponse if limit exceeded, null if OK
 */
export async function checkPlanLimitIfNeeded(
  user: { role: string },
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<NextResponse | null> {
  console.log(`🔍 checkPlanLimitIfNeeded called:`, {
    userRole: user.role,
    merchantId,
    entityType
  });

  // ADMIN users bypass plan limit checks
  if (user.role === USER_ROLE.ADMIN) {
    console.log(`✅ ADMIN user: Bypassing plan limit check for ${entityType}`);
    return null;
  }

  try {
    await assertPlanLimit(merchantId, entityType);
    console.log(`✅ Plan limit check passed for ${entityType} (merchantId: ${merchantId})`);
    return null;
  } catch (error: any) {
    console.log(`❌ Plan limit exceeded for ${entityType} (merchantId: ${merchantId}):`, error.message);
    const { ResponseBuilder, getErrorStatusCode } = await import('../api/response-builder');
    
    // Use error code only - translation system will handle the message
    // Don't pass detailed message to preserve translation
    const errorResponse = ResponseBuilder.error('PLAN_LIMIT_EXCEEDED');
    const statusCode = getErrorStatusCode({ code: 'PLAN_LIMIT_EXCEEDED' }, 422);
    
    // ✅ Log response format for debugging translation
    console.log('🔍 Plan limit error response:', {
      code: errorResponse.code,
      message: errorResponse.message,
      error: errorResponse.error,
      statusCode,
      note: 'Frontend should use code field for translation'
    });
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}