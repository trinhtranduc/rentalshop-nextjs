import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'SHOP_OWNER', 'ADMIN']).optional(),
});

// Product validation schemas (aligned with API routes and DB types)
const outletStockItemSchema = z.object({
  outletId: z.string().min(1, 'Outlet is required'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
});

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  rentPrice: z.number().nonnegative('Rent price must be non-negative'),
  salePrice: z.number().nonnegative('Sale price must be non-negative').optional(),
  deposit: z.number().nonnegative('Deposit must be non-negative').default(0),
  categoryId: z.string().min(1, 'Category is required'),
  images: z.string().optional(), // stored as JSON string upstream
  outletStock: z.array(outletStockItemSchema).optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rentPrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  deposit: z.number().nonnegative().optional(),
  images: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  totalStock: z.number().int().min(0).optional(),
});

export const productsQuerySchema = z.object({
  search: z.string().optional(),
  outletId: z.string().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Rental validation schemas
export const rentalSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
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
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(3, 'Phone is required'),
  merchantId: z.string().min(1, 'Merchant is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.union([z.string().datetime({ offset: true }).optional(), z.string().optional()]),
  idNumber: z.string().optional(),
  idType: z.string().optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
});

export const customersQuerySchema = z.object({
  merchantId: z.string().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  idType: z.enum(['passport', 'drivers_license', 'national_id', 'other']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Orders validation schemas
// ============================================================================

const orderTypeEnum = z.enum(['RENT', 'SALE', 'RENT_TO_OWN']);
const orderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'DAMAGED']);

export const ordersQuerySchema = z.object({
  q: z.string().optional(),
  outletId: z.string().optional(),
  customerId: z.string().optional(),
  userId: z.string().optional(),
  orderType: orderTypeEnum.optional(),
  status: orderStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickupDate: z.coerce.date().optional(),
  returnDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().default(0),
  totalPrice: z.coerce.number().nonnegative().default(0),
  deposit: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  daysRented: z.coerce.number().int().nonnegative().optional(),
});

export const orderCreateSchema = z.object({
  orderType: orderTypeEnum,
  customerId: z.string().optional(),
  outletId: z.string().min(1),
  pickupPlanAt: z.coerce.date().optional(),
  returnPlanAt: z.coerce.date().optional(),
  subtotal: z.coerce.number().nonnegative().default(0),
  taxAmount: z.coerce.number().nonnegative().default(0),
  discountAmount: z.coerce.number().nonnegative().default(0),
  totalAmount: z.coerce.number().nonnegative().default(0),
  depositAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  orderItems: z.array(orderItemSchema).min(1),
});

export const orderUpdateSchema = z.object({
  status: orderStatusEnum.optional(),
  pickupPlanAt: z.coerce.date().optional(),
  returnPlanAt: z.coerce.date().optional(),
  pickedUpAt: z.coerce.date().optional(),
  returnedAt: z.coerce.date().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative().optional(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  damageFee: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
  pickupNotes: z.string().optional(),
  returnNotes: z.string().optional(),
  damageNotes: z.string().optional(),
});

export type OrdersQuery = z.infer<typeof ordersQuerySchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdatePayload = z.infer<typeof orderUpdateSchema>;

// ============================================================================
// Users validation schemas
// ============================================================================

const userRoleEnum = z.enum(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);

export const usersQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().min(1, 'Phone number is required'), // Phone is now required
  role: userRoleEnum.optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1, 'Phone number is required').optional(), // Phone is required when provided
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export type UsersQuery = z.infer<typeof usersQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ============================================================================
// Outlets validation schemas
// ============================================================================
export const outletsQuerySchema = z.object({
  merchantId: z.string().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v) => {
    if (typeof v === 'boolean') return v;
    if (v === undefined) return undefined;
    return v === 'true';
  }).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type OutletsQuery = z.infer<typeof outletsQuerySchema>;