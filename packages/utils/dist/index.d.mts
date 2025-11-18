import { SubscriptionStatus, BillingInterval as BillingInterval$1, MerchantPricingConfig, PricingType, PlanLimits as PlanLimits$1 } from '@rentalshop/constants';
import { S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as react_jsx_runtime from 'react/jsx-runtime';
import React$1 from 'react';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

/**
 * String Utility Functions
 *
 * Provides common string manipulation and validation functions
 */
/**
 * Format phone number for display
 */
declare const formatPhoneNumber: (phone: string) => string;
/**
 * Generate URL-friendly slug from text
 */
declare const generateSlug: (text: string) => string;
/**
 * Truncate text to specified length with ellipsis
 */
declare const truncateText: (text: string, maxLength: number) => string;
/**
 * Validate email format
 */
declare const isValidEmail: (email: string) => boolean;
/**
 * Validate Vietnamese phone number format
 */
declare const isValidPhone: (phone: string) => boolean;
/**
 * Capitalize first letter of each word
 */
declare const capitalizeWords: (text: string) => string;
/**
 * Remove extra whitespace and normalize spaces
 */
declare const normalizeWhitespace: (text: string) => string;
/**
 * Generate random string of specified length
 */
declare const generateRandomString: (length: number) => string;
/**
 * Check if string is empty or only whitespace
 */
declare const isEmpty: (text: string) => boolean;
/**
 * Extract initials from name
 */
declare const getInitials: (name: string) => string;

/**
 * Function Utility Functions
 *
 * Provides common function manipulation utilities like debounce and throttle
 */
/**
 * Debounce function execution
 * Delays execution until after wait time has passed since last invocation
 */
declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
/**
 * Throttle function execution
 * Limits execution to once per specified time period
 */
declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => ((...args: Parameters<T>) => void);
/**
 * Memoize function results
 * Caches function results based on input parameters
 */
declare const memoize: <T extends (...args: any[]) => any>(func: T, keyGenerator?: (...args: Parameters<T>) => string) => T;
/**
 * Retry function execution with exponential backoff
 */
declare const retry: <T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number) => Promise<T>;
/**
 * Create a function that only executes once
 */
declare const once: <T extends (...args: any[]) => any>(func: T) => T;
/**
 * Create a function that executes after a delay
 */
declare const delay: (ms: number) => Promise<void>;
/**
 * Create a timeout promise that rejects after specified time
 */
declare const timeout: <T>(promise: Promise<T>, ms: number) => Promise<T>;

/**
 * Generate a URL-safe tenant key from a merchant / shop name.
 *
 * Examples:
 *  - "Áo dài Phạm 1" -> "aodaipham1"
 *  - "My Shop!"      -> "myshop"
 */
declare function generateTenantKeyFromName(name: string): string;

/**
 * Base entity interface with common fields
 * All entities should extend this for consistency
 */
interface BaseEntity {
    id: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}
/**
 * Base entity with merchant relationship
 * Used for entities that belong to a merchant
 */
interface BaseEntityWithMerchant extends BaseEntity {
    merchantId: number;
}
/**
 * Base entity with outlet relationship
 * Used for entities that belong to a specific outlet
 */
interface BaseEntityWithOutlet extends BaseEntityWithMerchant {
    outletId: number;
}
/**
 * Standardized address interface
 * Used across all entities that have address information
 */
interface Address {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}
/**
 * Contact information interface
 * Used for entities that have contact details
 */
interface ContactInfo {
    phone?: string;
    email?: string;
    website?: string;
}
/**
 * Minimal merchant reference
 * Used when only basic merchant info is needed
 */
interface MerchantReference {
    id: number;
    name: string;
    email?: string;
}
/**
 * Minimal outlet reference
 * Used when only basic outlet info is needed
 */
interface OutletReference {
    id: number;
    name: string;
    address?: string;
    merchantId: number;
    merchant?: MerchantReference;
}
/**
 * Minimal user reference
 * Used when only basic user info is needed
 */
interface UserReference {
    id: number;
    name: string;
    email: string;
    role: string;
}
/**
 * Minimal customer reference
 * Used when only basic customer info is needed
 */
interface CustomerReference {
    id: number;
    firstName: string;
    lastName: string;
    name: string;
    email?: string;
    phone: string;
}
/**
 * Minimal product reference
 * Used when only basic product info is needed
 */
interface ProductReference {
    id: number;
    name: string;
    rentPrice: number;
    deposit: number;
    available: number;
}
/**
 * Base form input interface
 * Common fields for all form inputs
 */
interface BaseFormInput {
    id?: number;
}
/**
 * Base update input interface
 * All update inputs should extend this
 */
interface BaseUpdateInput {
    id: number;
}

type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
/**
 * Main User interface - consolidated from multiple sources
 * Combines auth/user.ts and users/user.ts definitions
 */
interface User extends BaseEntityWithMerchant {
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: Date | string;
    outletId?: number;
    merchant?: MerchantReference;
    outlet?: OutletReference;
}
/**
 * User creation input
 * Used for creating new users
 */
interface UserCreateInput$1 extends BaseFormInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    merchantId?: number;
    outletId?: number;
}
/**
 * Profile update input
 * Used for users updating their own profile
 */
interface ProfileUpdateInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
}
/**
 * Login credentials
 * Used for authentication
 */
interface LoginCredentials {
    email: string;
    password: string;
}
/**
 * Registration data
 * Used for user registration
 */
interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    merchantId?: number;
    outletId?: number;
    businessName?: string;
    outletName?: string;
    merchantCode?: string;
    outletCode?: string;
}

interface PlanLimits {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
    allowWebAccess?: boolean;
    allowMobileAccess?: boolean;
}
interface PlanPricing {
    price: number;
    discount: number;
    savings: number;
}
interface Plan {
    id: number;
    name: string;
    description: string;
    basePrice: number;
    currency: string;
    trialDays: number;
    limits: PlanLimits;
    features: string[];
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
    pricing: {
        monthly: PlanPricing;
        quarterly: PlanPricing;
        sixMonths: PlanPricing;
        yearly: PlanPricing;
    };
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
interface PlanCreateInput$1 {
    name: string;
    description: string;
    basePrice: number;
    currency?: string;
    trialDays: number;
    limits: PlanLimits;
    features: string[];
    isActive?: boolean;
    isPopular?: boolean;
    sortOrder?: number;
}
interface PlanUpdateInput$1 {
    name?: string;
    description?: string;
    basePrice?: number;
    currency?: string;
    trialDays?: number;
    limits?: Partial<PlanLimits>;
    features?: string[];
    pricing?: {
        monthly?: PlanPricing;
        quarterly?: PlanPricing;
        sixMonths?: PlanPricing;
        yearly?: PlanPricing;
    };
    isActive?: boolean;
    isPopular?: boolean;
    sortOrder?: number;
}
interface PlanFilters {
    search?: string;
    isActive?: boolean;
    isPopular?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'price' | 'basePrice' | 'createdAt' | 'sortOrder';
    sortOrder?: 'asc' | 'desc';
}

interface SubscriptionPeriod$1 {
    startDate: Date;
    endDate: Date;
    duration: string;
    isActive: boolean;
    daysRemaining: number;
    nextBillingDate: Date;
    isTrial?: boolean;
}
/**
 * Complete Subscription interface matching Prisma model
 * This is the single source of truth for subscription data
 */
interface Subscription {
    id: number;
    merchantId: number;
    planId: number;
    status: SubscriptionStatus;
    billingInterval: BillingInterval$1;
    currentPeriodStart: Date | string;
    currentPeriodEnd: Date | string;
    trialStart?: Date | string;
    trialEnd?: Date | string;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
    period: number;
    discount: number;
    savings: number;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date | string;
    cancelReason?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    subscriptionPeriod?: SubscriptionPeriod$1;
    merchant?: {
        id: number;
        name: string;
        email: string;
    };
    plan?: Plan;
}
interface SubscriptionCreateInput$1 {
    merchantId: number;
    planId: number;
    billingInterval?: BillingInterval$1;
    status?: SubscriptionStatus;
    startDate?: Date;
}
interface SubscriptionUpdateInput$1 {
    id: number;
    planId?: number;
    billingInterval?: BillingInterval$1;
    status?: SubscriptionStatus;
    endDate?: Date | string;
}
interface SubscriptionFilters {
    merchantId?: number;
    planId?: number;
    status?: SubscriptionStatus;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
    offset?: number;
}
interface SubscriptionsResponse {
    data: Subscription[];
    pagination: {
        total: number;
        hasMore: boolean;
        limit: number;
        offset: number;
    };
}

/**
 * Main Merchant interface - consolidated from multiple sources
 * Combines merchants.ts and merchants/merchant.ts definitions
 */
interface Merchant extends BaseEntity, Address, ContactInfo {
    name: string;
    email: string;
    description?: string;
    businessType?: string;
    pricingType?: string;
    taxId?: string;
    currency: string;
    isActive: boolean;
    planId?: number;
    totalRevenue: number;
    lastActiveAt?: Date | string;
    pricingConfig?: MerchantPricingConfig | string;
    plan?: PlanDetails;
    subscription?: Subscription;
    outlets?: OutletReference[];
    users?: UserReference[];
    customers?: CustomerReference[];
    products?: ProductReference[];
    categories?: any[];
}
/**
 * Plan details interface
 * Used for subscription plan information
 */
interface PlanDetails {
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
 * Main Outlet interface - consolidated from multiple sources
 * Combines outlet-data.ts and outlets/outlet.ts definitions
 */
interface Outlet extends BaseEntityWithMerchant, Address, ContactInfo {
    name: string;
    description?: string;
    isActive: boolean;
    isDefault?: boolean;
    merchant?: MerchantReference;
}
/**
 * Outlet creation input
 * Used for creating new outlets
 */
interface OutletCreateInput$1 extends BaseFormInput {
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
interface OutletUpdateInput$1 extends BaseUpdateInput {
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
/**
 * Outlet filters interface
 * Used for filtering outlets in management views
 */
interface OutletFilters {
    q?: string;
    search?: string;
    status?: string;
    merchantId?: number;
    outletId?: number;
    city?: string;
    state?: string;
    country?: string;
    isActive?: boolean;
    isDefault?: boolean;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Main Product interface - consolidated from multiple sources
 * Combines products/product.ts and product-view.ts definitions
 */
interface Product extends BaseEntityWithMerchant {
    name: string;
    description?: string;
    barcode?: string;
    categoryId: number;
    rentPrice: number;
    salePrice?: number;
    deposit: number;
    stock: number;
    renting: number;
    available: number;
    isActive: boolean;
    images?: string[];
    category?: CategoryReference;
    merchant?: MerchantReference;
    outletStock?: OutletStock[];
}
/**
 * Category reference interface
 * Used when only basic category info is needed
 */
interface CategoryReference {
    id: number;
    name: string;
    description?: string;
}
/**
 * Outlet stock interface
 * Used for product stock management across outlets
 */
interface OutletStock {
    id: number;
    outletId: number;
    stock: number;
    available: number;
    renting: number;
    outlet?: OutletReference;
}
/**
 * Product creation input
 * Used for creating new products
 */
interface ProductCreateInput$1 extends BaseFormInput {
    name: string;
    description?: string;
    barcode?: string;
    categoryId: number;
    rentPrice: number;
    salePrice?: number;
    deposit: number;
    totalStock: number;
    images?: string[];
    outletStock: Array<{
        outletId: number;
        stock: number;
    }>;
}
/**
 * Product update input
 * Used for updating existing products
 */
interface ProductUpdateInput$1 extends BaseUpdateInput {
    name?: string;
    description?: string;
    barcode?: string;
    categoryId?: number;
    rentPrice?: number;
    deposit?: number;
    stock?: number;
    totalStock?: number;
    salePrice?: number;
    images?: string[];
    isActive?: boolean;
}
/**
 * Product with stock information
 * Used for product listings with outlet stock details
 */
interface ProductWithStock extends Product {
    category: CategoryReference;
    merchant: MerchantReference;
    outletStock: Array<{
        id: number;
        outletId: number;
        stock: number;
        available: number;
        renting: number;
        outlet: OutletReference;
    }>;
}
/**
 * Product with full details
 * Used for detailed product views
 */
interface ProductWithDetails extends Product {
    category: CategoryReference;
    merchant: MerchantReference;
    outletStock: Array<{
        id: number;
        outletId: number;
        stock: number;
        available: number;
        renting: number;
        outlet: OutletReference;
    }>;
    specifications?: Record<string, any>;
    features?: string[];
    tags?: string[];
}
/**
 * Product search filter
 * Used for product search operations in API
 */
interface ProductSearchFilter {
    q?: string;
    merchantId?: number;
    categoryId?: number;
    outletId?: number;
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    available?: boolean;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
}
type ProductFilters = ProductSearchFilter;

/**
 * Order types - simplified to RENT and SALE only
 */
type OrderType = 'RENT' | 'SALE';
/**
 * Order statuses - simplified status flow
 */
type OrderStatus = 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
/**
 * Main Order interface - consolidated from multiple sources
 * Combines orders/order.ts and order-detail.ts definitions
 */
interface Order extends BaseEntityWithOutlet {
    orderNumber: string;
    orderType: OrderType;
    status: OrderStatus;
    customerId?: number;
    createdById: number;
    totalAmount: number;
    depositAmount: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    pickedUpAt?: Date | string;
    returnedAt?: Date | string;
    damageFee?: number;
    bailAmount?: number;
    material?: string;
    securityDeposit?: number;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
    discountType?: 'amount' | 'percentage';
    discountValue?: number;
    discountAmount?: number;
    customer?: CustomerReference;
    outlet?: OutletReference;
    merchant?: MerchantReference;
    orderItems?: OrderItem[];
    payments?: Payment[];
    createdBy?: UserReference;
    customerName?: string;
    customerPhone?: string;
    outletName?: string;
    merchantName?: string;
    createdByName?: string;
}
/**
 * Order item interface
 * Used for order line items
 */
interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit?: number;
    product?: ProductReference;
}
/**
 * Order item input interface
 * Used for creating/updating order items
 */
interface OrderItemInput {
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit?: number;
    rentalDays?: number;
    notes?: string;
}
/**
 * Payment interface
 * Used for order payments
 */
interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    transactionId?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
/**
 * Payment input interface
 * Used for creating new payments
 */
interface PaymentInput {
    orderId: string;
    amount: number;
    method: string;
    status?: string;
    transactionId?: string;
}
/**
 * Payment update interface
 * Used for updating existing payments
 */
interface PaymentUpdateInput {
    id: string;
    amount?: number;
    method?: string;
    status?: string;
    transactionId?: string;
}
/**
 * Order creation input
 * Used for creating new orders
 */
interface OrderCreateInput$1 extends BaseFormInput {
    orderType: OrderType;
    customerId?: number;
    outletId: number;
    totalAmount: number;
    depositAmount?: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    orderItems: OrderItemInput[];
}
/**
 * Order input interface
 * Unified interface for both creating and updating orders
 */
interface OrderInput {
    orderId?: number;
    orderNumber?: string;
    orderType: OrderType;
    customerId?: number;
    outletId: number;
    createdById: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    rentalDuration?: number;
    subtotal: number;
    taxAmount?: number;
    discountType?: 'amount' | 'percentage';
    discountValue?: number;
    discountAmount?: number;
    bailAmount?: number;
    material?: string;
    totalAmount: number;
    depositAmount?: number;
    securityDeposit?: number;
    damageFee?: number;
    lateFee?: number;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
    pickupNotes?: string;
    returnNotes?: string;
    damageNotes?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    isReadyToDeliver?: boolean;
    orderItems: OrderItemInput[];
    status?: OrderStatus;
    pickedUpAt?: Date | string;
    returnedAt?: Date | string;
}
/**
 * Order update input
 * Alias for OrderInput for backward compatibility
 */
type OrderUpdateInput = OrderInput;
/**
 * Order filters interface
 * Used for filtering orders in management views
 */
interface OrderFilters {
    status?: OrderStatus | OrderStatus[];
    orderType?: OrderType;
    merchantId?: number;
    outletId?: number;
    customerId?: number;
    productId?: number;
    startDate?: Date | string;
    endDate?: Date | string;
    search?: string;
    pickupDate?: Date | string;
    returnDate?: Date | string;
    minAmount?: number;
    maxAmount?: number;
    isReadyToDeliver?: boolean;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    outlet?: string;
    dateRange?: {
        start: string;
        end: string;
    };
}

/**
 * Main Customer interface - consolidated from multiple sources
 * Combines customers/customer.ts and customer-management.ts definitions
 */
interface Customer extends BaseEntityWithMerchant, Address, ContactInfo {
    firstName: string;
    lastName: string;
    name: string;
    dateOfBirth?: Date | string;
    idNumber?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    notes?: string;
    isActive: boolean;
    outletId?: number;
    merchant?: MerchantReference;
}
/**
 * Customer update input
 * Used for updating existing customers
 */
interface CustomerUpdateInput extends BaseUpdateInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    dateOfBirth?: Date | string;
    idNumber?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    notes?: string;
    isActive?: boolean;
}
/**
 * Customer search filter
 * Used for customer search operations in API
 */
interface CustomerSearchFilter {
    q?: string;
    search?: string;
    merchantId?: number;
    outletId?: number;
    isActive?: boolean;
    city?: string;
    state?: string;
    country?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    limit?: number;
    offset?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
type CustomerFilters = CustomerSearchFilter;
/**
 * Customer input interface
 * Used for database operations
 */
interface CustomerInput {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    dateOfBirth?: Date | string;
    idNumber?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    notes?: string;
    merchantId: number;
}

/**
 * Main Category interface - consolidated from multiple sources
 * Combines categories/category.ts and category-management.ts definitions
 */
interface Category extends BaseEntityWithMerchant {
    name: string;
    description?: string;
    isActive: boolean;
    merchant?: {
        id: number;
        name: string;
    };
}
/**
 * Category filters (alias for CategorySearchParams)
 * Used for consistent API interface with other entities
 */
interface CategoryFilters {
    q?: string;
    search?: string;
    merchantId?: number;
    isActive?: boolean;
    status?: string;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

var required = "This field is required";
var email = "Please enter a valid email address";
var phone = "Please enter a valid phone number";
var min = "Minimum value is {min}";
var max = "Maximum value is {max}";
var minLength = "Minimum length is {min} characters";
var maxLength = "Maximum length is {max} characters";
var pattern = "Invalid format";
var url = "Please enter a valid URL";
var number = "Please enter a valid number";
var integer = "Please enter a whole number";
var positive = "Please enter a positive number";
var negative = "Please enter a negative number";
var date = "Please enter a valid date";
var dateRange = "Invalid date range";
var time$1 = "Please enter a valid time";
var password = {
	minLength: "Password must be at least {min} characters",
	uppercase: "Password must contain at least one uppercase letter",
	lowercase: "Password must contain at least one lowercase letter",
	number: "Password must contain at least one number",
	special: "Password must contain at least one special character",
	match: "Passwords do not match"
};
var file = {
	size: "File size must be less than {max}",
	type: "Invalid file type. Allowed types: {types}",
	required: "Please select a file"
};
var unique = "This value already exists";
var exists = "This value does not exist";
var custom = {
	invalidBarcode: "Invalid barcode format",
	invalidSKU: "Invalid SKU format",
	stockNotAvailable: "Not enough stock available",
	invalidDateRange: "End date must be after start date",
	priceGreaterThanZero: "Price must be greater than zero",
	quantityGreaterThanZero: "Quantity must be greater than zero"
};
var validation$1 = {
	required: required,
	email: email,
	phone: phone,
	min: min,
	max: max,
	minLength: minLength,
	maxLength: maxLength,
	pattern: pattern,
	url: url,
	number: number,
	integer: integer,
	positive: positive,
	negative: negative,
	date: date,
	dateRange: dateRange,
	time: time$1,
	password: password,
	file: file,
	unique: unique,
	exists: exists,
	custom: custom
};

declare const _________locales_en_validation_json_custom: typeof custom;
declare const _________locales_en_validation_json_date: typeof date;
declare const _________locales_en_validation_json_dateRange: typeof dateRange;
declare const _________locales_en_validation_json_email: typeof email;
declare const _________locales_en_validation_json_exists: typeof exists;
declare const _________locales_en_validation_json_file: typeof file;
declare const _________locales_en_validation_json_integer: typeof integer;
declare const _________locales_en_validation_json_max: typeof max;
declare const _________locales_en_validation_json_maxLength: typeof maxLength;
declare const _________locales_en_validation_json_min: typeof min;
declare const _________locales_en_validation_json_minLength: typeof minLength;
declare const _________locales_en_validation_json_negative: typeof negative;
declare const _________locales_en_validation_json_number: typeof number;
declare const _________locales_en_validation_json_password: typeof password;
declare const _________locales_en_validation_json_pattern: typeof pattern;
declare const _________locales_en_validation_json_phone: typeof phone;
declare const _________locales_en_validation_json_positive: typeof positive;
declare const _________locales_en_validation_json_required: typeof required;
declare const _________locales_en_validation_json_unique: typeof unique;
declare const _________locales_en_validation_json_url: typeof url;
declare namespace _________locales_en_validation_json {
  export { _________locales_en_validation_json_custom as custom, _________locales_en_validation_json_date as date, _________locales_en_validation_json_dateRange as dateRange, validation$1 as default, _________locales_en_validation_json_email as email, _________locales_en_validation_json_exists as exists, _________locales_en_validation_json_file as file, _________locales_en_validation_json_integer as integer, _________locales_en_validation_json_max as max, _________locales_en_validation_json_maxLength as maxLength, _________locales_en_validation_json_min as min, _________locales_en_validation_json_minLength as minLength, _________locales_en_validation_json_negative as negative, _________locales_en_validation_json_number as number, _________locales_en_validation_json_password as password, _________locales_en_validation_json_pattern as pattern, _________locales_en_validation_json_phone as phone, _________locales_en_validation_json_positive as positive, _________locales_en_validation_json_required as required, time$1 as time, _________locales_en_validation_json_unique as unique, _________locales_en_validation_json_url as url };
}

var title$4 = "Settings";
var subtitle$1 = "Manage your account settings and preferences";
var loading = "Loading settings...";
var tabs = {
	profile: "Profile",
	account: "Account",
	merchant: "Business",
	outlet: "Outlet",
	security: "Security",
	subscription: "Subscription",
	currency: "Currency",
	language: "Language",
	notifications: "Notifications",
	preferences: "Preferences"
};
var profile$1 = {
	title: "Profile Settings",
	subtitle: "Manage your personal information",
	personalInformation: "Personal Information",
	firstName: "First Name",
	lastName: "Last Name",
	name: "Full Name",
	email: "Email Address",
	phone: "Phone Number",
	role: "Role",
	avatar: "Profile Picture",
	updateButton: "Update Profile",
	uploadAvatar: "Upload Photo",
	removeAvatar: "Remove Photo",
	edit: "Edit",
	save: "Save",
	cancel: "Cancel",
	saving: "Saving...",
	notProvided: "Not provided",
	enterFirstName: "Enter your first name",
	enterLastName: "Enter your last name",
	enterPhone: "Enter your phone number"
};
var account = {
	title: "Account Settings",
	subtitle: "Manage your account preferences",
	timezone: "Timezone",
	dateFormat: "Date Format",
	timeFormat: "Time Format",
	numberFormat: "Number Format",
	changePasswordTitle: "Change Password",
	changePasswordDesc: "Update your account password",
	changePasswordButton: "Change Password",
	sessionTitle: "Session Management",
	sessionDesc: "Sign out of your current session",
	signOut: "Sign Out",
	deleteAccountTitle: "Delete Account",
	deleteAccountDesc: "Permanently delete your account and all data",
	deleteAccount: "Delete Account",
	deleting: "Deleting...",
	deleteAccountWarning: "This action cannot be undone"
};
var merchant = {
	title: "Business Settings",
	subtitle: "Manage your business information",
	businessInformation: "Business Information",
	name: "Business Name",
	email: "Business Email",
	phone: "Business Phone",
	address: "Business Address",
	city: "City",
	state: "State",
	zipCode: "ZIP Code",
	country: "Country",
	taxId: "Tax ID",
	businessType: "Business Type",
	pricingType: "Pricing Type",
	registrationNumber: "Registration Number",
	logo: "Business Logo",
	edit: "Edit",
	save: "Save",
	cancel: "Cancel",
	saving: "Saving...",
	notProvided: "Not provided",
	enterBusinessName: "Enter business name",
	enterTaxId: "Enter tax ID",
	enterPhone: "Enter phone number",
	enterAddress: "Enter address",
	enterCity: "Enter city",
	enterState: "Enter state",
	enterZipCode: "Enter ZIP code",
	selectCountry: "Select country",
	currencySettings: "Currency Settings",
	currencyDesc: "Select your preferred currency for pricing and transactions",
	usDollar: "US Dollar",
	vietnameseDong: "Vietnamese Dong",
	selected: "Selected",
	selectCurrency: "Select Currency",
	savingCurrency: "Updating currency..."
};
var outlet = {
	title: "Outlet Settings",
	subtitle: "Manage your outlet information",
	outletInformation: "Outlet Information",
	name: "Outlet Name",
	address: "Outlet Address",
	phone: "Outlet Phone",
	description: "Description",
	workingHours: "Working Hours",
	contactPerson: "Contact Person",
	edit: "Edit",
	save: "Save",
	cancel: "Cancel",
	saving: "Saving...",
	notProvided: "Not provided",
	noOutletInfo: "No outlet information available",
	enterOutletName: "Enter outlet name",
	enterOutletPhone: "Enter outlet phone",
	enterOutletAddress: "Enter outlet address",
	enterDescription: "Enter outlet description"
};
var security = {
	title: "Security Settings",
	subtitle: "Manage your password and security preferences",
	currentPassword: "Current Password",
	newPassword: "New Password",
	confirmPassword: "Confirm New Password",
	changePassword: "Change Password",
	twoFactorAuth: "Two-Factor Authentication",
	enableTwoFactor: "Enable 2FA",
	disableTwoFactor: "Disable 2FA",
	activeSessions: "Active Sessions",
	logoutAllDevices: "Logout from all devices"
};
var subscription = {
	title: "Subscription",
	subtitle: "Manage your subscription plan",
	currentPlan: "Current Plan",
	status: "Status",
	billingCycle: "Billing Cycle",
	nextBilling: "Next Billing",
	amount: "Amount",
	paymentMethod: "Payment Method",
	upgradePlan: "Upgrade Plan",
	downgradePlan: "Downgrade Plan",
	cancelSubscription: "Cancel Subscription",
	viewInvoices: "View Invoices",
	planFeatures: "Plan Features",
	usageStats: "Usage Statistics",
	loading: "Loading subscription data...",
	active: "Active",
	expired: "Expired",
	expiringSoon: "Expiring Soon",
	daysRemaining: "days remaining",
	cancelsAtPeriodEnd: "Cancels at period end",
	autoRenewalEnabled: "Auto-renewal enabled",
	expiresIn: "Your subscription expires in",
	considerRenewing: "Consider renewing to avoid service interruption.",
	contactMerchant: "Contact your merchant administrator to manage subscription settings.",
	comingSoon: "Subscription management features coming soon.",
	noSubscription: "No Active Subscription",
	noSubscriptionDesc: "You don't have an active subscription plan.",
	contactAdmin: "Please contact your system administrator to activate a subscription plan."
};
var currency = {
	title: "Currency Settings",
	subtitle: "Select your preferred currency",
	selectCurrency: "Select Currency",
	currentCurrency: "Current Currency",
	symbol: "Symbol",
	code: "Code",
	exchangeRate: "Exchange Rate",
	updateButton: "Update Currency"
};
var language = {
	title: "Language Settings",
	subtitle: "Select your preferred language for the interface",
	selectLanguage: "Select Language",
	currentLanguage: "Current Language",
	english: "English",
	vietnamese: "Tiếng Việt",
	updateButton: "Update Language",
	selectALanguage: "Select a language",
	applyingChanges: "Applying language changes...",
	languagePreferenceSaved: "Your language preference is saved automatically and will be used across all your sessions."
};
var notifications = {
	title: "Notification Settings",
	subtitle: "Manage your notification preferences",
	emailNotifications: "Email Notifications",
	pushNotifications: "Push Notifications",
	smsNotifications: "SMS Notifications",
	orderUpdates: "Order Updates",
	paymentAlerts: "Payment Alerts",
	systemAlerts: "System Alerts",
	marketingEmails: "Marketing Emails"
};
var billing = {
	title: "Billing Configuration",
	subtitle: "Configure billing intervals and discount percentages",
	modernSubscription: "Modern Subscription Billing",
	modernSubscriptionDesc: "Configure billing intervals and discount percentages following Stripe's modern subscription practices. Longer commitments typically receive higher discounts to encourage customer retention.",
	intervals: {
		title: "Billing Intervals",
		addInterval: "Add Interval",
		editInterval: "Edit Billing Interval",
		addNewInterval: "Add Billing Interval",
		name: "Name",
		months: "Months",
		discount: "Discount",
		status: "Status",
		actions: "Actions",
		active: "Active",
		namePlaceholder: "e.g., Monthly, Quarterly",
		update: "Update",
		add: "Add",
		cancel: "Cancel",
		saveConfiguration: "Save Configuration",
		saving: "Saving..."
	},
	examples: {
		monthly: "Monthly",
		quarterly: "Quarterly",
		yearly: "Yearly",
		monthlyDesc: "0% discount - Standard pricing",
		quarterlyDesc: "5% discount - Good for retention",
		yearlyDesc: "20% discount - Best value"
	},
	messages: {
		saveSuccess: "Billing configuration saved successfully!",
		saveFailed: "Failed to save billing configuration",
		saveError: "Error saving billing configuration. Please try again."
	}
};
var menuItems = {
	profile: {
		label: "Profile",
		description: "Manage your personal information"
	},
	merchant: {
		label: "Business",
		description: "Manage your business information, pricing, and currency"
	},
	outlet: {
		label: "Outlet",
		description: "Manage your outlet information"
	},
	subscription: {
		label: "Subscription",
		description: "Manage your subscription and billing"
	},
	language: {
		label: "Language",
		description: "Select your preferred language"
	},
	account: {
		label: "Account",
		description: "Account settings, password and preferences"
	}
};
var messages$4 = {
	updateSuccess: "Settings updated successfully",
	updateFailed: "Failed to update settings",
	passwordChanged: "Password changed successfully",
	passwordChangeFailed: "Failed to change password",
	confirmDelete: "Are you sure you want to delete your account?",
	deleteSuccess: "Account deleted successfully",
	deleteFailed: "Failed to delete account",
	personalProfileUpdated: "Personal profile updated successfully!",
	personalProfileUpdateFailed: "Failed to update personal profile",
	businessInfoUpdated: "Business information updated successfully!",
	businessInfoUpdateFailed: "Failed to update business information",
	outletInfoUpdated: "Outlet information updated successfully!",
	outletInfoUpdateFailed: "Failed to update outlet information",
	currencyUpdated: "Currency updated successfully!",
	currencyUpdateFailed: "Failed to update currency",
	accountDeleted: "Your account has been deleted successfully.",
	accountDeleteFailed: "Failed to delete account. Please try again.",
	passwordMismatch: "New passwords do not match",
	passwordTooShort: "New password must be at least 6 characters"
};
var deleteAccountDialog = {
	title: "Delete Account",
	description: "Are you sure you want to delete your account? This action cannot be undone and will permanently remove:",
	profileInfo: "Your profile and personal information",
	orderHistory: "All your orders and transaction history",
	productListings: "Your product listings and inventory",
	savedPreferences: "Any saved preferences and settings",
	irreversibleWarning: "This action is irreversible.",
	cancel: "Cancel",
	deleteAccount: "Delete Account",
	deleting: "Deleting..."
};
var changePassword$1 = {
	title: "Change Password",
	currentPassword: "Current Password",
	newPassword: "New Password",
	confirmPassword: "Confirm New Password",
	currentPasswordPlaceholder: "Enter your current password",
	newPasswordPlaceholder: "Enter your new password",
	confirmPasswordPlaceholder: "Confirm your new password",
	cancel: "Cancel",
	changePassword: "Change Password",
	changing: "Changing..."
};
var settings = {
	title: title$4,
	subtitle: subtitle$1,
	loading: loading,
	tabs: tabs,
	profile: profile$1,
	account: account,
	merchant: merchant,
	outlet: outlet,
	security: security,
	subscription: subscription,
	currency: currency,
	language: language,
	notifications: notifications,
	billing: billing,
	menuItems: menuItems,
	messages: messages$4,
	deleteAccountDialog: deleteAccountDialog,
	changePassword: changePassword$1
};

declare const _________locales_en_settings_json_account: typeof account;
declare const _________locales_en_settings_json_billing: typeof billing;
declare const _________locales_en_settings_json_currency: typeof currency;
declare const _________locales_en_settings_json_deleteAccountDialog: typeof deleteAccountDialog;
declare const _________locales_en_settings_json_language: typeof language;
declare const _________locales_en_settings_json_loading: typeof loading;
declare const _________locales_en_settings_json_menuItems: typeof menuItems;
declare const _________locales_en_settings_json_merchant: typeof merchant;
declare const _________locales_en_settings_json_notifications: typeof notifications;
declare const _________locales_en_settings_json_outlet: typeof outlet;
declare const _________locales_en_settings_json_security: typeof security;
declare const _________locales_en_settings_json_subscription: typeof subscription;
declare const _________locales_en_settings_json_tabs: typeof tabs;
declare namespace _________locales_en_settings_json {
  export { _________locales_en_settings_json_account as account, _________locales_en_settings_json_billing as billing, changePassword$1 as changePassword, _________locales_en_settings_json_currency as currency, settings as default, _________locales_en_settings_json_deleteAccountDialog as deleteAccountDialog, _________locales_en_settings_json_language as language, _________locales_en_settings_json_loading as loading, _________locales_en_settings_json_menuItems as menuItems, _________locales_en_settings_json_merchant as merchant, messages$4 as messages, _________locales_en_settings_json_notifications as notifications, _________locales_en_settings_json_outlet as outlet, profile$1 as profile, _________locales_en_settings_json_security as security, _________locales_en_settings_json_subscription as subscription, subtitle$1 as subtitle, _________locales_en_settings_json_tabs as tabs, title$4 as title };
}

var title$3 = "Customers";
var subtitle = "Manage customers in the system";
var pageTitle = "Customer Management";
var createCustomer = "Add Customer";
var editCustomer = "Edit Customer";
var viewCustomer = "View Customer";
var customerDetails = "Customer Details";
var customerInformation = "Customer Information";
var noDataAvailable = "No customer data available";
var viewCustomerInfo = "View customer information and details";
var customerOverview = "Customer Overview";
var personalInformation = "Personal Information";
var addressInformation = "Address Information";
var updating = "Updating...";
var updateCustomer = "Update Customer";
var deleting = "Deleting...";
var fields$1 = {
	id: "ID",
	firstName: "First Name",
	lastName: "Last Name",
	fullName: "Full Name",
	name: "Name",
	email: "Email",
	phone: "Phone Number",
	contact: "Contact",
	address: "Address",
	streetAddress: "Street Address",
	city: "City",
	state: "State/Province",
	country: "Country",
	zipCode: "ZIP/Postal Code",
	location: "Location",
	dateOfBirth: "Date of Birth",
	idNumber: "ID Number",
	notes: "Notes",
	tags: "Tags",
	createdAt: "Created",
	customerId: "Customer ID",
	lastUpdated: "Last Updated",
	merchant: "Merchant",
	companyName: "Company Name",
	noAddress: "No address provided",
	notProvided: "Not provided",
	notSpecified: "Not specified",
	notAvailable: "Not available",
	loading: "Loading..."
};
var profile = {
	title: "Customer Profile",
	contact: "Contact Information",
	address: "Address Information",
	identification: "Identification",
	preferences: "Preferences",
	notes: "Internal Notes"
};
var orders$1 = {
	title: "Order History",
	totalOrders: "Total Orders",
	activeOrders: "Active Orders",
	completedOrders: "Completed Orders",
	totalSpent: "Total Spent",
	viewOrders: "View All Orders",
	createOrder: "Create Order for Customer",
	noOrders: "No orders yet"
};
var stats$3 = {
	title: "Customer Statistics",
	memberSince: "Member Since",
	lastOrder: "Last Order",
	averageOrderValue: "Average Order Value",
	lifetimeValue: "Lifetime Value",
	paymentStatus: "Payment Status",
	currentBalance: "Current Balance"
};
var status$2 = {
	active: "Active",
	inactive: "Inactive",
	blocked: "Blocked",
	vip: "VIP"
};
var actions$2 = {
	title: "Actions",
	view: "View Details",
	edit: "Edit",
	editCustomer: "Edit Customer",
	viewOrders: "View Orders",
	orders: "Orders",
	createOrder: "Create Order",
	viewHistory: "View History",
	sendMessage: "Send Message",
	block: "Block Customer",
	unblock: "Unblock Customer",
	"delete": "Delete",
	deleteCustomer: "Delete Customer",
	activate: "Activate Customer",
	deactivate: "Deactivate Customer"
};
var messages$3 = {
	createSuccess: "Customer created successfully",
	createFailed: "Failed to create customer",
	updateSuccess: "Customer updated successfully",
	updateFailed: "Failed to update customer",
	deleteSuccess: "Customer deleted successfully",
	deleteFailed: "Failed to delete customer",
	confirmDelete: "Are you sure you want to delete this customer?",
	confirmDeleteDetails: "Are you sure you want to delete {name}? This action cannot be undone and will permanently remove all customer data.",
	noCustomers: "No customers found",
	noCustomersDescription: "Try adjusting your filters or add some customers to get started.",
	tryAdjustingSearch: "Try adjusting your search",
	getStarted: "Get started by adding your first customer",
	loadingCustomers: "Loading customers...",
	na: "N/A",
	noChanges: "No changes detected"
};
var filters$2 = {
	all: "All Customers",
	active: "Active",
	inactive: "Inactive",
	vip: "VIP",
	hasActiveOrders: "Has Active Orders",
	hasOverduePayments: "Has Overdue Payments"
};
var search$2 = {
	placeholder: "Search customers by name, email, or phone...",
	noResults: "No customers found matching your search"
};
var validation = {
	firstNameRequired: "First name is required",
	firstNameMinLength: "First name must be at least 2 characters",
	lastNameRequired: "Last name is required",
	lastNameMinLength: "Last name must be at least 2 characters",
	emailInvalid: "Email is invalid",
	phoneRequired: "Phone number is required",
	phoneInvalid: "Phone number contains invalid characters",
	phoneMinLength: "Phone number must be at least 8 digits"
};
var placeholders = {
	enterFirstName: "Enter first name",
	enterLastName: "Enter last name",
	enterEmail: "Enter email address (optional)",
	enterPhone: "Enter phone number (optional)",
	enterCompanyName: "Enter company name (optional)",
	enterStreetAddress: "Enter street address (optional)",
	enterCity: "Enter city (optional)",
	enterState: "Enter state (optional)",
	enterZipCode: "Enter ZIP code (optional)",
	enterCountry: "Enter country (optional)"
};
var customers = {
	title: title$3,
	subtitle: subtitle,
	pageTitle: pageTitle,
	createCustomer: createCustomer,
	editCustomer: editCustomer,
	viewCustomer: viewCustomer,
	customerDetails: customerDetails,
	customerInformation: customerInformation,
	noDataAvailable: noDataAvailable,
	viewCustomerInfo: viewCustomerInfo,
	customerOverview: customerOverview,
	personalInformation: personalInformation,
	addressInformation: addressInformation,
	updating: updating,
	updateCustomer: updateCustomer,
	deleting: deleting,
	fields: fields$1,
	profile: profile,
	orders: orders$1,
	stats: stats$3,
	status: status$2,
	actions: actions$2,
	messages: messages$3,
	filters: filters$2,
	search: search$2,
	validation: validation,
	placeholders: placeholders
};

declare const _________locales_en_customers_json_addressInformation: typeof addressInformation;
declare const _________locales_en_customers_json_createCustomer: typeof createCustomer;
declare const _________locales_en_customers_json_customerDetails: typeof customerDetails;
declare const _________locales_en_customers_json_customerInformation: typeof customerInformation;
declare const _________locales_en_customers_json_customerOverview: typeof customerOverview;
declare const _________locales_en_customers_json_deleting: typeof deleting;
declare const _________locales_en_customers_json_editCustomer: typeof editCustomer;
declare const _________locales_en_customers_json_noDataAvailable: typeof noDataAvailable;
declare const _________locales_en_customers_json_pageTitle: typeof pageTitle;
declare const _________locales_en_customers_json_personalInformation: typeof personalInformation;
declare const _________locales_en_customers_json_placeholders: typeof placeholders;
declare const _________locales_en_customers_json_profile: typeof profile;
declare const _________locales_en_customers_json_subtitle: typeof subtitle;
declare const _________locales_en_customers_json_updateCustomer: typeof updateCustomer;
declare const _________locales_en_customers_json_updating: typeof updating;
declare const _________locales_en_customers_json_validation: typeof validation;
declare const _________locales_en_customers_json_viewCustomer: typeof viewCustomer;
declare const _________locales_en_customers_json_viewCustomerInfo: typeof viewCustomerInfo;
declare namespace _________locales_en_customers_json {
  export { actions$2 as actions, _________locales_en_customers_json_addressInformation as addressInformation, _________locales_en_customers_json_createCustomer as createCustomer, _________locales_en_customers_json_customerDetails as customerDetails, _________locales_en_customers_json_customerInformation as customerInformation, _________locales_en_customers_json_customerOverview as customerOverview, customers as default, _________locales_en_customers_json_deleting as deleting, _________locales_en_customers_json_editCustomer as editCustomer, fields$1 as fields, filters$2 as filters, messages$3 as messages, _________locales_en_customers_json_noDataAvailable as noDataAvailable, orders$1 as orders, _________locales_en_customers_json_pageTitle as pageTitle, _________locales_en_customers_json_personalInformation as personalInformation, _________locales_en_customers_json_placeholders as placeholders, _________locales_en_customers_json_profile as profile, search$2 as search, stats$3 as stats, status$2 as status, _________locales_en_customers_json_subtitle as subtitle, title$3 as title, _________locales_en_customers_json_updateCustomer as updateCustomer, _________locales_en_customers_json_updating as updating, _________locales_en_customers_json_validation as validation, _________locales_en_customers_json_viewCustomer as viewCustomer, _________locales_en_customers_json_viewCustomerInfo as viewCustomerInfo };
}

var title$2 = "Products";
var productName = "Product Name";
var createProduct = "Add Product";
var editProduct = "Edit Product";
var viewProduct = "View Product";
var productDetails = "Product Details";
var fields = {
	name: "Product Name",
	category: "Category",
	barcode: "Barcode",
	sku: "SKU",
	description: "Description",
	price: "Price",
	rentPrice: "Rental Price",
	salePrice: "Sale Price",
	deposit: "Deposit",
	stock: "Stock",
	available: "Available",
	renting: "Currently Renting",
	minRentalPeriod: "Minimum Rental Period",
	maxRentalPeriod: "Maximum Rental Period",
	images: "Product Images",
	specifications: "Specifications",
	notes: "Notes"
};
var stock = {
	label: "Stock",
	renting: "Renting"
};
var price = {
	sale: "Sale"
};
var status$1 = {
	active: "Active",
	inactive: "Inactive",
	inStock: "In Stock",
	outOfStock: "Out of Stock",
	lowStock: "Low Stock"
};
var inventory = {
	title: "Inventory",
	inStock: "In Stock",
	outOfStock: "Out of Stock",
	lowStock: "Low Stock",
	totalStock: "Total Stock",
	availableStock: "Available",
	stockSummary: "Stock Summary",
	rentedOut: "Rented Out",
	reserved: "Reserved",
	updateStock: "Update Stock",
	stockHistory: "Stock History",
	outletStockDistribution: "Outlet Stock Distribution",
	stockAllocation: "Stock allocation across different outlets",
	noOutletStock: "No outlet stock information available",
	notAssignedToOutlets: "This product may not be assigned to any outlets yet.",
	totalOutlets: "Total outlets",
	stockEntries: "Outlet stock entries",
	stockRequired: "Stock values are required",
	noOutletsAvailable: "No Outlets Available",
	needOutletFirst: "You need to create at least one outlet before you can add products. Please contact your administrator.",
	needOutletMessage: "You need to create at least one outlet before you can add products. Products must be assigned to specific outlets for inventory management.",
	contactAdmin: "Please contact your administrator to set up outlets for your merchant.",
	creating: "Creating..."
};
var availability = {
	title: "Availability",
	available: "Available",
	notAvailable: "Not Available",
	partiallyAvailable: "Partially Available",
	checkAvailability: "Check Availability",
	availableFrom: "Available from",
	availableUntil: "Available until"
};
var pricing = {
	title: "Pricing",
	hourly: "Hourly Rate",
	daily: "Daily Rate",
	weekly: "Weekly Rate",
	monthly: "Monthly Rate",
	custom: "Custom Rate",
	depositRequired: "Deposit Required"
};
var actions$1 = {
	viewDetails: "View Details",
	edit: "Edit Product",
	viewOrders: "View Orders",
	activate: "Activate",
	deactivate: "Deactivate",
	"delete": "Delete Product",
	viewHistory: "View History",
	duplicate: "Duplicate Product",
	archive: "Archive Product",
	restore: "Restore Product"
};
var messages$2 = {
	createSuccess: "Product created successfully",
	createFailed: "Failed to create product",
	updateSuccess: "Product updated successfully",
	updateFailed: "Failed to update product",
	updateProduct: "Update Product",
	updating: "Updating...",
	deleteSuccess: "Product deleted successfully",
	deleteFailed: "Failed to delete product",
	confirmDelete: "Are you sure you want to delete this product?",
	noProducts: "No products found",
	noProductsDescription: "Try adjusting your filters or add some products to get started.",
	loadingProducts: "Loading products...",
	tryAdjustingSearch: "Try adjusting your search or filters",
	getStarted: "Get started by adding your first product",
	generateBarcode: "Generate new barcode",
	maxImagesReached: "Maximum images reached",
	dragDropImages: "Drag and drop images here",
	imageFormats: "Supports JPG, PNG, WebP, GIF up to 5MB each (max 3 images, optional)",
	imagesUploaded: "images uploaded (optional)",
	clearAllImages: "Clear All Images",
	uploadFailed: "Upload Failed",
	preparing: "Preparing...",
	uploading: "Uploading",
	processing: "Processing...",
	complete: "Complete!",
	removeImage: "Remove image"
};
var filters$1 = {
	all: "All Products",
	available: "Available",
	rented: "Currently Rented",
	outOfStock: "Out of Stock",
	outletLabel: "Outlet",
	allOutlets: "All Outlets",
	categoryLabel: "Category",
	allCategories: "All Categories",
	priceRange: "Price Range",
	clear: "Clear"
};
var search$1 = {
	placeholder: "Search products by name, barcode, or SKU...",
	noResults: "No products found matching your search"
};
var stats$2 = {
	totalProducts: "Total Products",
	availableProducts: "Available",
	rentedProducts: "Rented",
	totalValue: "Total Inventory Value"
};
var selectedProducts = "Selected Products";
var noProductsSelected = "No Products Selected";
var productInformationNotAvailable = "Product information not available";
var productId = "Product ID";
var showingProducts = "Showing {count} of {total} products";
var noProductsFound = "No products found";
var tryDifferentSearch = "Try adjusting your search or filters";
var checkBackLater = "This store does not have any products available at the moment. Please check back later.";
var clearFilters = "Clear Filters";
var allCategories = "All Categories";
var noCategories = "No categories";
var products = {
	title: title$2,
	productName: productName,
	createProduct: createProduct,
	editProduct: editProduct,
	viewProduct: viewProduct,
	productDetails: productDetails,
	fields: fields,
	stock: stock,
	price: price,
	status: status$1,
	inventory: inventory,
	availability: availability,
	pricing: pricing,
	actions: actions$1,
	messages: messages$2,
	filters: filters$1,
	search: search$1,
	stats: stats$2,
	selectedProducts: selectedProducts,
	noProductsSelected: noProductsSelected,
	productInformationNotAvailable: productInformationNotAvailable,
	productId: productId,
	showingProducts: showingProducts,
	noProductsFound: noProductsFound,
	tryDifferentSearch: tryDifferentSearch,
	checkBackLater: checkBackLater,
	clearFilters: clearFilters,
	allCategories: allCategories,
	noCategories: noCategories
};

declare const _________locales_en_products_json_allCategories: typeof allCategories;
declare const _________locales_en_products_json_availability: typeof availability;
declare const _________locales_en_products_json_checkBackLater: typeof checkBackLater;
declare const _________locales_en_products_json_clearFilters: typeof clearFilters;
declare const _________locales_en_products_json_createProduct: typeof createProduct;
declare const _________locales_en_products_json_editProduct: typeof editProduct;
declare const _________locales_en_products_json_fields: typeof fields;
declare const _________locales_en_products_json_inventory: typeof inventory;
declare const _________locales_en_products_json_noCategories: typeof noCategories;
declare const _________locales_en_products_json_noProductsFound: typeof noProductsFound;
declare const _________locales_en_products_json_noProductsSelected: typeof noProductsSelected;
declare const _________locales_en_products_json_price: typeof price;
declare const _________locales_en_products_json_pricing: typeof pricing;
declare const _________locales_en_products_json_productDetails: typeof productDetails;
declare const _________locales_en_products_json_productId: typeof productId;
declare const _________locales_en_products_json_productInformationNotAvailable: typeof productInformationNotAvailable;
declare const _________locales_en_products_json_productName: typeof productName;
declare const _________locales_en_products_json_selectedProducts: typeof selectedProducts;
declare const _________locales_en_products_json_showingProducts: typeof showingProducts;
declare const _________locales_en_products_json_stock: typeof stock;
declare const _________locales_en_products_json_tryDifferentSearch: typeof tryDifferentSearch;
declare const _________locales_en_products_json_viewProduct: typeof viewProduct;
declare namespace _________locales_en_products_json {
  export { actions$1 as actions, _________locales_en_products_json_allCategories as allCategories, _________locales_en_products_json_availability as availability, _________locales_en_products_json_checkBackLater as checkBackLater, _________locales_en_products_json_clearFilters as clearFilters, _________locales_en_products_json_createProduct as createProduct, products as default, _________locales_en_products_json_editProduct as editProduct, _________locales_en_products_json_fields as fields, filters$1 as filters, _________locales_en_products_json_inventory as inventory, messages$2 as messages, _________locales_en_products_json_noCategories as noCategories, _________locales_en_products_json_noProductsFound as noProductsFound, _________locales_en_products_json_noProductsSelected as noProductsSelected, _________locales_en_products_json_price as price, _________locales_en_products_json_pricing as pricing, _________locales_en_products_json_productDetails as productDetails, _________locales_en_products_json_productId as productId, _________locales_en_products_json_productInformationNotAvailable as productInformationNotAvailable, _________locales_en_products_json_productName as productName, search$1 as search, _________locales_en_products_json_selectedProducts as selectedProducts, _________locales_en_products_json_showingProducts as showingProducts, stats$2 as stats, status$1 as status, _________locales_en_products_json_stock as stock, title$2 as title, _________locales_en_products_json_tryDifferentSearch as tryDifferentSearch, _________locales_en_products_json_viewProduct as viewProduct };
}

var title$1 = "Orders";
var createOrder = "Create Order";
var editOrder = "Edit Order";
var viewOrder = "View Order";
var orderDetails = "Order Details";
var orderNumber = "Order Number";
var orderType = {
	label: "Order Type",
	RENT: "RENT",
	SALE: "SALE"
};
var status = {
	label: "Status",
	RESERVED: "RESERVED",
	PICKUPED: "PICKED UP",
	RETURNED: "RETURNED",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED"
};
var customer = {
	label: "Customer",
	name: "Customer Name",
	phone: "Customer Phone",
	email: "Customer Email",
	selectCustomer: "Select Customer",
	createCustomer: "Create New Customer",
	noCustomer: "Walk-in Customer"
};
var dates = {
	pickupDate: "Pickup Date",
	returnDate: "Return Date",
	returnLabel: "Return",
	createdDate: "Created Date",
	completedDate: "Completed Date"
};
var items = {
	title: "Order Items",
	product: "Product",
	quantity: "Quantity",
	price: "Price",
	total: "Total",
	addItem: "Add Item",
	removeItem: "Remove Item",
	noItems: "No items in this order"
};
var amount = {
	total: "Total",
	deposit: "Deposit",
	subtotal: "Subtotal",
	grandTotal: "Grand Total",
	securityDeposit: "Security Deposit",
	damageFee: "Damage Fee",
	collateralType: "Collateral Type",
	collateralDetails: "Collateral Details"
};
var detail = {
	orderInformation: "Order Information",
	customerInformation: "Customer Information",
	products: "Products",
	orderSummary: "Order Summary",
	orderSettings: "Order Settings",
	orderActions: "Order Actions",
	viewAndManage: "View and manage order information",
	seller: "Seller",
	orderDate: "Order Date",
	editSettings: "Edit Settings",
	saveChanges: "Save Changes",
	saving: "Saving...",
	cancel: "Cancel",
	notes: "Notes",
	noNotes: "No notes",
	noDetails: "No details",
	collateralOther: "Other",
	editOrder: "Edit Order",
	settingsSaved: "Settings Saved",
	settingsSavedMessage: "Order settings have been updated successfully",
	saveFailed: "Save Failed",
	saveFailedMessage: "Failed to save settings. Please try again.",
	cancelOrderTitle: "Cancel Order",
	cancelOrderMessage: "Are you sure you want to cancel this order? This action cannot be undone.",
	keepOrder: "Keep Order",
	cancelling: "Cancelling...",
	cancelSuccess: "Cancellation Successful",
	cancelSuccessMessage: "Order has been cancelled.",
	cancelFailed: "Cancellation Failed",
	cancelFailedMessage: "Failed to cancel order. Please try again.",
	editFailed: "Edit Failed",
	editFailedMessage: "Failed to enter edit mode. Please try again.",
	editingRules: "Editing Rules",
	rentOrderRule: "RENT orders: Can only be edited when status is",
	saleOrderRule: "SALE orders: Can only be edited when status is",
	status: "Status",
	collectionAmount: "Collection Amount",
	collateral: "Collateral",
	alreadyCollected: "Already collected",
	noCollectionNeeded: "No collection needed"
};
var payment = {
	subtotal: "Subtotal",
	discount: "Discount",
	deposit: "Deposit",
	tax: "Tax",
	total: "Total Amount",
	amountPaid: "Amount Paid",
	amountDue: "Amount Due",
	paymentMethod: "Payment Method",
	cash: "Cash",
	card: "Card",
	transfer: "Transfer",
	other: "Other"
};
var actions = {
	label: "Actions",
	view: "View",
	edit: "Edit",
	markAsPickedUp: "Mark as Picked Up",
	pickingUp: "Picking up...",
	markAsReturned: "Mark as Returned",
	returning: "Returning...",
	markAsCompleted: "Mark as Completed",
	cancelOrder: "Cancel Order",
	printReceipt: "Print Receipt",
	sendReceipt: "Send Receipt",
	viewHistory: "View History",
	updateOrder: "Update Order",
	confirmCreate: "Confirm & Create Order",
	backToEdit: "Back to Edit",
	orderPreview: "Order Preview",
	reviewBeforeConfirm: "Review your order details before confirming"
};
var messages$1 = {
	createSuccess: "Order created successfully",
	createFailed: "Failed to create order",
	updateSuccess: "Order updated successfully",
	updateFailed: "Failed to update order",
	deleteSuccess: "Order deleted successfully",
	deleteFailed: "Failed to delete order",
	confirmDelete: "Are you sure you want to delete this order?",
	confirmCancel: "Are you sure you want to cancel this order?",
	noOrders: "No orders found",
	loadingOrders: "Loading orders...",
	tryAdjustingFilters: "Try adjusting your filters or create some orders to get started.",
	getStarted: "Get started by creating your first order",
	noOrdersForProduct: "No Orders Found",
	noOrdersForProductDescription: "This product hasn't been ordered yet.",
	noOrdersForCustomer: "No orders found for this customer",
	viewingAllOrders: "Viewing all",
	mayBeSlow: "orders may be slow",
	cannotEditOrder: "Only RESERVED orders can be edited",
	errorLoadingOrders: "Error Loading Orders",
	errorLoadingOrder: "Error Loading Order",
	orderNotFound: "Order Not Found",
	orderNotFoundMessage: "The order you're looking for could not be found.",
	goBack: "Go Back",
	viewAllOrders: "View All Orders",
	retryLoading: "Retry Loading",
	failedToUpdateOrder: "Failed to update order",
	failedToFetchOrder: "Failed to fetch order details",
	errorFetchingOrder: "An error occurred while fetching order details",
	orderIdNotFound: "Order id not found",
	unknownError: "Unknown error",
	orders: "Orders",
	edit: "Edit",
	noBarcode: "No Barcode",
	noCategory: "No Category",
	outOfStock: "Out of Stock",
	lowStock: "Low Stock",
	inStock: "In Stock",
	error: "Error",
	duplicateCustomer: "Duplicate Customer",
	customerCreated: "Customer Created",
	customerCreatedMessage: "has been created and selected.",
	failedToCreateCustomer: "Failed to create customer",
	processing: "Processing...",
	updateOrder: "Update Order",
	preview: "Preview",
	cancel: "Cancel",
	resetSelection: "Reset Selection",
	removeProduct: "Remove product",
	deposit: "Deposit",
	product: "Product",
	unknownProduct: "Unknown Product",
	clearSelectedCustomer: "Clear selected customer",
	useAddNewCustomerButton: "Use the \"Add New Customer\" button above to create one",
	rentalPeriod: "Rental Period",
	selectRentalPeriod: "Select rental period",
	editOrder: "Edit Order",
	createNewOrder: "Create New Order",
	confirmOrder: "Confirm Order",
	orderPreview: "Order Preview",
	reviewOrderDetails: "Review your order details before confirming",
	customerInformationMissing: "Customer information is missing",
	noOrderItemsAdded: "No order items added",
	rentalDatesNotSet: "Rental dates are not set",
	orderTotalAmountInvalid: "Order total amount is invalid",
	notSet: "Not set",
	notSelected: "Not selected",
	totalPrice: "Total Price",
	additionalInformation: "Additional Information"
};
var productOrders = {
	title: "Product Orders",
	description: "View and manage all orders for this product",
	backToProducts: "Back to Products",
	totalQuantity: "Total Quantity",
	totalSales: "Total Sales",
	reservedOrders: "Reserved Orders",
	totalStock: "Total Stock",
	availableInventory: "Available inventory",
	currentlyRented: "Currently Rented",
	outOnRental: "Out on rental",
	availableNow: "Available Now",
	readyToRent: "Ready to rent",
	allTimeEarnings: "All time earnings"
};
var filters = {
	all: "All Orders",
	allStatus: "All Status",
	allTypes: "All Types",
	allOutlets: "All Outlets",
	statusLabel: "Status",
	typeLabel: "Type",
	outletLabel: "Outlet",
	loading: "Loading...",
	error: "Error",
	noOutlets: "No outlets",
	clear: "Clear",
	active: "Active",
	completed: "Completed",
	cancelled: "Cancelled",
	overdue: "Overdue",
	today: "Today",
	thisWeek: "This Week",
	thisMonth: "This Month",
	dateRange: "Date Range"
};
var search = {
	placeholder: "Search orders by number, customer name, or phone...",
	noResults: "No orders found matching your search"
};
var stats$1 = {
	totalOrders: "Total Orders",
	allTimeOrders: "All time orders",
	activeRentals: "Active Rentals",
	currentlyPickuped: "Currently pickuped",
	totalRevenue: "Total Revenue",
	lifetimeRevenue: "Lifetime revenue",
	completedOrders: "Completed Orders",
	avgOrder: "avg order",
	totalDeposits: "Total Deposits",
	averageOrderValue: "Average Order Value",
	overdueRentals: "Overdue Rentals",
	revenueMetrics: "Revenue Metrics"
};
var orders = {
	title: title$1,
	createOrder: createOrder,
	editOrder: editOrder,
	viewOrder: viewOrder,
	orderDetails: orderDetails,
	orderNumber: orderNumber,
	orderType: orderType,
	status: status,
	customer: customer,
	dates: dates,
	items: items,
	amount: amount,
	detail: detail,
	payment: payment,
	actions: actions,
	messages: messages$1,
	productOrders: productOrders,
	filters: filters,
	search: search,
	stats: stats$1
};

declare const _________locales_en_orders_json_actions: typeof actions;
declare const _________locales_en_orders_json_amount: typeof amount;
declare const _________locales_en_orders_json_createOrder: typeof createOrder;
declare const _________locales_en_orders_json_customer: typeof customer;
declare const _________locales_en_orders_json_dates: typeof dates;
declare const _________locales_en_orders_json_detail: typeof detail;
declare const _________locales_en_orders_json_editOrder: typeof editOrder;
declare const _________locales_en_orders_json_filters: typeof filters;
declare const _________locales_en_orders_json_items: typeof items;
declare const _________locales_en_orders_json_orderDetails: typeof orderDetails;
declare const _________locales_en_orders_json_orderNumber: typeof orderNumber;
declare const _________locales_en_orders_json_orderType: typeof orderType;
declare const _________locales_en_orders_json_payment: typeof payment;
declare const _________locales_en_orders_json_productOrders: typeof productOrders;
declare const _________locales_en_orders_json_search: typeof search;
declare const _________locales_en_orders_json_status: typeof status;
declare const _________locales_en_orders_json_viewOrder: typeof viewOrder;
declare namespace _________locales_en_orders_json {
  export { _________locales_en_orders_json_actions as actions, _________locales_en_orders_json_amount as amount, _________locales_en_orders_json_createOrder as createOrder, _________locales_en_orders_json_customer as customer, _________locales_en_orders_json_dates as dates, orders as default, _________locales_en_orders_json_detail as detail, _________locales_en_orders_json_editOrder as editOrder, _________locales_en_orders_json_filters as filters, _________locales_en_orders_json_items as items, messages$1 as messages, _________locales_en_orders_json_orderDetails as orderDetails, _________locales_en_orders_json_orderNumber as orderNumber, _________locales_en_orders_json_orderType as orderType, _________locales_en_orders_json_payment as payment, _________locales_en_orders_json_productOrders as productOrders, _________locales_en_orders_json_search as search, stats$1 as stats, _________locales_en_orders_json_status as status, title$1 as title, _________locales_en_orders_json_viewOrder as viewOrder };
}

var title = "Dashboard";
var welcome = "Welcome back";
var overview = "Overview";
var stats = {
	totalOrders: "Total Orders",
	todayRentals: "Today's Rentals",
	activeRentals: "Active Rentals",
	totalRevenue: "Total Revenue",
	totalCustomers: "Total Customers",
	totalProducts: "Total Products",
	availableProducts: "Available Products",
	pendingOrders: "Pending Orders",
	completedOrders: "Completed Orders",
	overdueReturns: "Overdue Returns",
	todayRevenue: "Today's Revenue",
	thisWeekRevenue: "This Week's Revenue",
	thisMonthRevenue: "This Month's Revenue",
	futureRevenue: "Future Revenue",
	realTimeData: "Real-time data",
	bookedRevenue: "Booked revenue",
	expectedRevenue: "Expected revenue from upcoming and ongoing rentals",
	todayPickups: "Today's Pickups",
	todayReturns: "Today's Returns",
	productUtilization: "Product Utilization",
	revenueGrowth: "Revenue Growth",
	customerGrowth: "Customer Growth"
};
var tooltips = {
	todayRevenue: "Total actual revenue from orders created today. Includes both rental and sales orders.",
	todayRentals: "Number of new rental orders created today. Only counts orders with RESERVED, PICKUPED, or RETURNED status.",
	activeRentals: "Total number of currently active rental orders. Includes all orders with PICKUPED status (currently being rented) and not yet returned.",
	overdueReturns: "Number of rental orders that are overdue for return. Orders where the planned return date has passed but items haven't been returned yet.",
	totalRevenue: "Total revenue from all orders in the system. Includes both rental and sales orders from the beginning until now.",
	totalOrders: "Total number of orders created in the system. Includes all types of orders: rental, sales, and rent-to-own.",
	totalCustomers: "Total number of customers registered in the system. Includes both individual and business customers.",
	totalProducts: "Total number of products in inventory. Includes all products that have been added to the system.",
	availableProducts: "Number of products currently available for rental. Excludes products that are currently being rented or have been sold.",
	pendingOrders: "Number of orders waiting to be processed. Orders with RESERVED status that haven't been picked up yet.",
	completedOrders: "Number of completed orders. Rental orders that have been returned or sales orders that have been delivered.",
	futureRevenue: "Expected revenue from upcoming orders. Includes ongoing rentals and pre-booked orders.",
	thisWeekRevenue: "Total revenue for this week. Calculated from Monday to Sunday of the current week.",
	thisMonthRevenue: "Total revenue for this month. Calculated from the 1st to the end of the current month.",
	thisYearRevenue: "Total revenue for this year. Calculated from January 1st to the present.",
	customerGrowth: "Growth rate of new customers. Compared to the previous period.",
	revenueGrowth: "Revenue growth rate. Compared to the previous period to assess business performance.",
	productUtilization: "Product utilization rate. Percentage of products currently being rented compared to total available products."
};
var charts = {
	revenueOverTime: "Revenue Over Time",
	ordersByStatus: "Orders by Status",
	topProducts: "Top Products",
	customerActivity: "Customer Activity",
	rentalTrends: "Rental Trends",
	noData: "No data available for this period",
	actualRevenue: "Actual Revenue",
	projectedRevenue: "Projected Revenue",
	rentalOrders: "Rental Orders",
	ordersCount: "orders"
};
var chartTitles = {
	dailyRevenue: "Daily Revenue",
	monthlyRevenue: "Monthly Revenue",
	yearlyRevenue: "Yearly Revenue",
	monthlyRentals: "Monthly Rentals",
	yearlyRentals: "Yearly Rentals"
};
var recentActivity = {
	title: "Recent Activity",
	newOrder: "New order created",
	orderPickedUp: "Order picked up",
	orderReturned: "Order returned",
	newCustomer: "New customer registered",
	productAdded: "New product added",
	viewAll: "View all activities"
};
var quickActions = {
	title: "Quick Actions",
	createOrder: "Create Order",
	addProduct: "Add Product",
	addCustomer: "Add Customer",
	viewCalendar: "View Calendar",
	viewReports: "View Reports"
};
var upcomingReturns = {
	title: "Upcoming Returns",
	dueToday: "Due Today",
	dueTomorrow: "Due Tomorrow",
	dueThisWeek: "Due This Week",
	overdue: "Overdue",
	noReturns: "No upcoming returns"
};
var orderStatuses = {
	reserved: "Reserved",
	pickup: "Pickup",
	"return": "Return",
	completed: "Completed",
	cancelled: "Cancelled",
	ordersCount: "orders"
};
var dashboard = {
	title: title,
	welcome: welcome,
	overview: overview,
	stats: stats,
	tooltips: tooltips,
	charts: charts,
	chartTitles: chartTitles,
	recentActivity: recentActivity,
	quickActions: quickActions,
	upcomingReturns: upcomingReturns,
	orderStatuses: orderStatuses
};

declare const _________locales_en_dashboard_json_chartTitles: typeof chartTitles;
declare const _________locales_en_dashboard_json_charts: typeof charts;
declare const _________locales_en_dashboard_json_orderStatuses: typeof orderStatuses;
declare const _________locales_en_dashboard_json_overview: typeof overview;
declare const _________locales_en_dashboard_json_quickActions: typeof quickActions;
declare const _________locales_en_dashboard_json_recentActivity: typeof recentActivity;
declare const _________locales_en_dashboard_json_stats: typeof stats;
declare const _________locales_en_dashboard_json_title: typeof title;
declare const _________locales_en_dashboard_json_tooltips: typeof tooltips;
declare const _________locales_en_dashboard_json_upcomingReturns: typeof upcomingReturns;
declare const _________locales_en_dashboard_json_welcome: typeof welcome;
declare namespace _________locales_en_dashboard_json {
  export { _________locales_en_dashboard_json_chartTitles as chartTitles, _________locales_en_dashboard_json_charts as charts, dashboard as default, _________locales_en_dashboard_json_orderStatuses as orderStatuses, _________locales_en_dashboard_json_overview as overview, _________locales_en_dashboard_json_quickActions as quickActions, _________locales_en_dashboard_json_recentActivity as recentActivity, _________locales_en_dashboard_json_stats as stats, _________locales_en_dashboard_json_title as title, _________locales_en_dashboard_json_tooltips as tooltips, _________locales_en_dashboard_json_upcomingReturns as upcomingReturns, _________locales_en_dashboard_json_welcome as welcome };
}

var login = {
	title: "Login",
	subtitle: "Sign in to your account",
	email: "Email Address",
	password: "Password",
	rememberMe: "Remember me",
	forgotPassword: "Forgot password?",
	loginButton: "Sign In",
	noAccount: "Don't have an account?",
	signUp: "Sign up",
	success: "Logged in successfully",
	failed: "Login failed. Please check your credentials.",
	invalidEmail: "Please enter a valid email address",
	invalidPassword: "Password must be at least 6 characters"
};
var register = {
	title: "Create Account",
	subtitle: "Register a new account",
	name: "Full Name",
	email: "Email Address",
	phone: "Phone Number",
	password: "Password",
	confirmPassword: "Confirm Password",
	merchantName: "Business Name",
	registerButton: "Create Account",
	hasAccount: "Already have an account?",
	signIn: "Sign in",
	success: "Account created successfully",
	failed: "Registration failed. Please try again.",
	passwordMismatch: "Passwords do not match",
	emailExists: "Email already exists",
	termsAndConditions: "I agree to the Terms and Conditions",
	agreeToTerms: "You must agree to the terms and conditions",
	createMerchantAccount: "Create Merchant Account",
	step1: "Step 1: Create your account",
	step2: "Step 2: Business information",
	account: "Account",
	business: "Business",
	firstName: "First Name",
	lastName: "Last Name",
	businessName: "Business Name",
	businessType: "Business Type",
	pricingType: "Pricing Type",
	address: "Business Address",
	city: "City",
	state: "State",
	zipCode: "ZIP Code",
	country: "Country",
	enterYourEmail: "Enter your email",
	createPassword: "Create a password",
	confirmYourPassword: "Confirm your password",
	enterFirstName: "Enter your first name",
	enterLastName: "Enter your last name",
	enterPhoneNumber: "Enter your phone number",
	enterBusinessName: "Enter your business name",
	selectBusinessType: "Select business type",
	selectPricingType: "Select pricing type",
	enterBusinessAddress: "Enter your business address",
	selectCountry: "Select country",
	validating: "Validating...",
	continueToBusinessInfo: "Continue to Business Info",
	back: "Back",
	creatingAccount: "Creating Account...",
	importantNotice: "Important Notice",
	cannotBeChanged: "Business Type and Pricing Type cannot be changed after registration. Please choose carefully as these settings will be locked permanently.",
	freeTrialIncludes: "Free Trial Includes:",
	fullAccessToAllFeatures: "Full access to all features",
	defaultOutlet: "Default outlet",
	mobileAppAccess: "Mobile app access",
	noCreditCardRequired: "No credit card required",
	termsOfService: "Terms of Service",
	privacyPolicy: "Privacy Policy",
	iAgreeToThe: "I agree to the",
	and: "and",
	registrationComplete: "Registration Complete!",
	accountCreatedSuccessfully: "Account created successfully.",
	checkEmailToActivate: "Please check your email to activate your account",
	registrationFailed: "Registration Failed",
	somethingWentWrong: "Something went wrong. Please try again.",
	merchantNameRequired: "Merchant name is required",
	merchantEmailRequired: "Merchant email is required",
	userEmailRequired: "User email is required",
	emailRequired: "Email is required",
	emailInvalid: "Invalid email format",
	passwordRequired: "Password is required",
	passwordMinLength: "Your password must be at least 6 characters",
	passwordMaxLength: "Your password must be at most 25 characters",
	confirmPasswordRequired: "Confirm password is required",
	firstNameRequired: "First name is required",
	lastNameRequired: "Last name is required",
	phoneRequired: "Phone number is required",
	phoneInvalid: "Please enter a valid phone number",
	phoneNumberInvalid: "Please enter a valid phone number",
	phoneMinLength: "Phone number must be at least 10 digits",
	phoneNumberMinLength: "Phone number must be at least 10 digits",
	businessNameRequired: "Business name is required",
	businessNameMinLength: "Business name must be at least 2 characters",
	businessTypeRequired: "Please select your business type",
	pricingTypeRequired: "Please select your pricing type",
	addressRequired: "Address is required",
	addressMinLength: "Address must be at least 5 characters",
	cityRequired: "City is required",
	cityMinLength: "City must be at least 2 characters",
	stateRequired: "State is required",
	stateMinLength: "State must be at least 2 characters",
	zipCodeRequired: "ZIP code is required",
	zipCodeInvalid: "Please enter a valid ZIP code",
	countryRequired: "Country is required",
	countryMinLength: "Country must be at least 2 characters",
	mustAcceptTerms: "You must accept the Terms of Service and Privacy Policy",
	businessTypes: {
		general: {
			label: "General Rental",
			description: "Mixed rental business with various product types"
		},
		clothing: {
			label: "Clothing & Fashion",
			description: "Rent or sell clothing, accessories, and fashion items"
		},
		vehicle: {
			label: "Vehicle Rental",
			description: "Car, motorcycle, bicycle, and vehicle rental services"
		},
		equipment: {
			label: "Equipment Rental",
			description: "Tools, machinery, and equipment rental services"
		}
	},
	pricingTypes: {
		fixed: {
			label: "Fixed Price",
			description: "Same price regardless of rental duration"
		},
		hourly: {
			label: "Hourly Pricing",
			description: "Price calculated per hour of rental"
		},
		daily: {
			label: "Daily Pricing",
			description: "Price calculated per day of rental"
		}
	},
	chooseBusinessType: "Choose the type of business you operate",
	choosePricingType: "How do you want to price your rentals?",
	personalInfo: "Personal Information",
	contactInfo: "Contact Information",
	accountSecurity: "Account Security",
	businessInfo: "Business Information",
	businessAddress: "Business Address"
};
var forgotPassword = {
	title: "Forgot Password",
	subtitle: "Enter your email to reset your password",
	email: "Email Address",
	sendButton: "Send Reset Link",
	backToLogin: "Back to login",
	success: "Password reset link sent to your email",
	failed: "Failed to send reset link",
	emailNotFound: "Email not found",
	checkEmail: "Check your email for the reset link"
};
var changePassword = {
	title: "Change Password",
	currentPassword: "Current Password",
	newPassword: "New Password",
	confirmPassword: "Confirm New Password",
	changeButton: "Change Password",
	success: "Password changed successfully",
	failed: "Failed to change password",
	incorrectPassword: "Current password is incorrect",
	passwordMismatch: "Passwords do not match"
};
var logout = {
	title: "Logout",
	message: "Are you sure you want to logout?",
	confirm: "Yes, Logout",
	cancel: "Cancel",
	success: "Logged out successfully"
};
var checkEmail = {
	title: "Please check your email",
	subtitle: "We have sent an account activation link to your email",
	emailSentTo: "Email sent to:",
	nextSteps: "Next steps:",
	step1: "Check your inbox",
	step2: "Click the activation link in the email",
	step3: "Log in after successful activation",
	spamWarning: "If you don't see the email, please check your spam folder or promotions folder",
	sending: "Sending...",
	resendAfter: "Resend after {minutes} minutes",
	emailResent: "Email has been resent",
	resendEmail: "Resend activation email",
	backToLogin: "Back to login",
	resendSuccess: "Email sent",
	resendSuccessMessage: "Please check your inbox",
	rateLimitError: "Too many requests",
	rateLimitMessage: "Please wait 5 minutes before trying again",
	sendError: "Email send error",
	sendErrorMessage: "Unable to send email. Please try again later."
};
var auth = {
	login: login,
	register: register,
	forgotPassword: forgotPassword,
	changePassword: changePassword,
	logout: logout,
	checkEmail: checkEmail
};

declare const _________locales_en_auth_json_changePassword: typeof changePassword;
declare const _________locales_en_auth_json_checkEmail: typeof checkEmail;
declare const _________locales_en_auth_json_forgotPassword: typeof forgotPassword;
declare const _________locales_en_auth_json_login: typeof login;
declare const _________locales_en_auth_json_logout: typeof logout;
declare const _________locales_en_auth_json_register: typeof register;
declare namespace _________locales_en_auth_json {
  export { _________locales_en_auth_json_changePassword as changePassword, _________locales_en_auth_json_checkEmail as checkEmail, auth as default, _________locales_en_auth_json_forgotPassword as forgotPassword, _________locales_en_auth_json_login as login, _________locales_en_auth_json_logout as logout, _________locales_en_auth_json_register as register };
}

var buttons = {
	save: "Save",
	cancel: "Cancel",
	"delete": "Delete",
	edit: "Edit",
	add: "Add",
	search: "Search",
	filter: "Filter",
	"export": "Export",
	"import": "Import",
	refresh: "Refresh",
	submit: "Submit",
	confirm: "Confirm",
	close: "Close",
	back: "Back",
	next: "Next",
	previous: "Previous",
	create: "Create",
	update: "Update",
	view: "View",
	download: "Download",
	upload: "Upload",
	reset: "Reset",
	clear: "Clear",
	apply: "Apply",
	browse: "Browse Files",
	saving: "Saving...",
	tryAgain: "Try Again"
};
var labels = {
	name: "Name",
	email: "Email",
	phone: "Phone",
	address: "Address",
	addressInformation: "Address Information",
	city: "City",
	state: "State",
	country: "Country",
	zipCode: "Zip Code",
	description: "Description",
	notes: "Notes",
	status: "Status",
	type: "Type",
	category: "Category",
	merchant: "Merchant",
	price: "Price",
	quantity: "Quantity",
	total: "Total",
	subtotal: "Subtotal",
	discount: "Discount",
	tax: "Tax",
	date: "Date",
	time: "Time",
	createdAt: "Created At",
	updatedAt: "Updated At",
	actions: "Actions",
	search: "Search",
	noResults: "No results found",
	noData: "No data",
	loading: "Loading...",
	success: "Success",
	error: "Error",
	warning: "Warning",
	info: "Information",
	pickup: "Pickup",
	"return": "Return",
	active: "Active",
	inactive: "Inactive",
	"default": "Default",
	create: "Create",
	unknown: "Unknown"
};
var messages = {
	noBillingCycles: "No billing cycles found",
	getStartedBillingCycle: "Get started by creating your first billing cycle",
	noPlanVariants: "No plan variants found",
	getStartedPlanVariant: "Get started by creating your first plan variant"
};
var navigation = {
	home: "Home",
	dashboard: "Dashboard",
	orders: "Orders",
	products: "Products",
	allProducts: "All Products",
	customers: "Customers",
	settings: "Settings",
	logout: "Logout",
	profile: "Profile",
	calendar: "Calendar",
	users: "Users",
	outlets: "Outlets",
	categories: "Categories",
	reports: "Reports",
	analytics: "Analytics"
};
var pagination = {
	showing: "Showing",
	to: "to",
	of: "of",
	results: "results",
	page: "Page",
	rowsPerPage: "Rows per page",
	first: "First",
	last: "Last",
	noData: "No data to display"
};
var time = {
	today: "Today",
	yesterday: "Yesterday",
	tomorrow: "Tomorrow",
	thisWeek: "This Week",
	thisMonth: "This Month",
	lastMonth: "Last Month",
	thisYear: "This Year",
	lastYear: "Last Year",
	custom: "Custom",
	from: "From",
	to: "To",
	year: "Year",
	month: "Month",
	week: "Week",
	day: "Day"
};
var periods = {
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	yearly: "Yearly",
	monthlyAnalytics: "Monthly Analytics",
	annualStrategy: "Annual Strategy",
	dailyOperations: "Daily Operations",
	weeklyReport: "Weekly Report",
	monthlyReport: "Monthly Report",
	yearlyReport: "Yearly Report"
};
var common = {
	buttons: buttons,
	labels: labels,
	messages: messages,
	navigation: navigation,
	pagination: pagination,
	time: time,
	periods: periods
};

declare const _________locales_en_common_json_buttons: typeof buttons;
declare const _________locales_en_common_json_labels: typeof labels;
declare const _________locales_en_common_json_messages: typeof messages;
declare const _________locales_en_common_json_navigation: typeof navigation;
declare const _________locales_en_common_json_pagination: typeof pagination;
declare const _________locales_en_common_json_periods: typeof periods;
declare const _________locales_en_common_json_time: typeof time;
declare namespace _________locales_en_common_json {
  export { _________locales_en_common_json_buttons as buttons, common as default, _________locales_en_common_json_labels as labels, _________locales_en_common_json_messages as messages, _________locales_en_common_json_navigation as navigation, _________locales_en_common_json_pagination as pagination, _________locales_en_common_json_periods as periods, _________locales_en_common_json_time as time };
}

/**
 * i18n Type Definitions
 *
 * Type-safe translations with autocomplete support
 */
type Messages = typeof _________locales_en_common_json & typeof _________locales_en_auth_json & typeof _________locales_en_dashboard_json & typeof _________locales_en_orders_json & typeof _________locales_en_products_json & typeof _________locales_en_customers_json & typeof _________locales_en_settings_json & typeof _________locales_en_validation_json;
declare global {
    type IntlMessages = Messages;
}

/**
 * Supported currency codes
 */
type CurrencyCode = 'USD' | 'VND';
/**
 * Currency configuration interface
 */
interface Currency {
    /** Currency code (e.g., 'USD', 'VND') */
    code: CurrencyCode;
    /** Currency symbol (e.g., '$', 'đ') */
    symbol: string;
    /** Currency name (e.g., 'US Dollar', 'Vietnamese Dong') */
    name: string;
    /** Locale for formatting (e.g., 'en-US', 'vi-VN') */
    locale: string;
    /** Minimum fraction digits */
    minFractionDigits: number;
    /** Maximum fraction digits */
    maxFractionDigits: number;
    /** Whether to show currency symbol before amount */
    symbolBefore: boolean;
    /** Exchange rate to base currency (USD) */
    exchangeRate: number;
}
/**
 * Currency settings for the application
 */
interface CurrencySettings {
    /** Currently selected currency */
    currentCurrency: CurrencyCode;
    /** Base currency for the system (always USD) */
    baseCurrency: CurrencyCode;
    /** Available currencies */
    availableCurrencies: Currency[];
    /** Whether to show currency symbol */
    showSymbol: boolean;
    /** Whether to show currency code */
    showCode: boolean;
}
/**
 * Currency formatting options
 */
interface CurrencyFormatOptions {
    /** Currency to format in */
    currency?: CurrencyCode;
    /** Locale for formatting */
    locale?: string;
    /** Whether to show currency symbol */
    showSymbol?: boolean;
    /** Whether to show currency code */
    showCode?: boolean;
    /** Custom fraction digits */
    fractionDigits?: number;
}

/**
 * API Response Builder
 * Chuẩn hóa response format với error codes để client có thể translate
 */
interface ApiResponse<T = any> {
    success: boolean;
    code?: string;
    message?: string;
    data?: T;
    error?: any;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        hasMore?: boolean;
    };
}
/**
 * Response Builder Class
 * Cung cấp các static methods để tạo standardized API responses
 */
declare class ResponseBuilder {
    /**
     * Build success response
     * @param code - Success code (e.g., 'USER_CREATED_SUCCESS')
     * @param data - Response data
     * @param meta - Optional metadata (pagination, etc.)
     */
    static success<T>(code: string, data?: T, meta?: any): ApiResponse<T>;
    /**
     * Build error response
     * @param code - Error code (e.g., 'INVALID_CREDENTIALS')
     * @param error - Optional error details
     */
    static error(code: string, error?: any): ApiResponse;
    /**
     * Build paginated success response
     * @param code - Success code
     * @param data - Array of items
     * @param pagination - Pagination info
     */
    static paginated<T>(code: string, data: T[], pagination: {
        page: number;
        limit: number;
        total: number;
    }): ApiResponse<T[]>;
}
/**
 * Helper: Extract error code from error object
 * Hữu ích khi catch errors và cần extract code
 */
declare function getErrorCode(error: any): string;
/**
 * Helper: Create error response from caught error
 * Tự động detect error type và tạo appropriate response
 */
declare function createErrorResponse(error: any): ApiResponse;
/**
 * Get HTTP status code based on error type/code
 * Helps determine appropriate status code for error responses
 */
declare function getErrorStatusCode(error: any, defaultCode?: number): number;

/**
 * Core Error Codes - Simplified and Unified
 */
declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    DATABASE_ERROR = "DATABASE_ERROR",
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
    FOREIGN_KEY_CONSTRAINT = "FOREIGN_KEY_CONSTRAINT",
    NOT_FOUND = "NOT_FOUND",
    PLAN_LIMIT_EXCEEDED = "PLAN_LIMIT_EXCEEDED",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
    ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED",
    SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",
    SUBSCRIPTION_PAUSED = "SUBSCRIPTION_PAUSED",
    TRIAL_EXPIRED = "TRIAL_EXPIRED",
    ORDER_ALREADY_EXISTS = "ORDER_ALREADY_EXISTS",
    PRODUCT_OUT_OF_STOCK = "PRODUCT_OUT_OF_STOCK",
    INVALID_ORDER_STATUS = "INVALID_ORDER_STATUS",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    INVALID_PAYMENT_METHOD = "INVALID_PAYMENT_METHOD",
    EMAIL_EXISTS = "EMAIL_EXISTS",
    PHONE_EXISTS = "PHONE_EXISTS",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    MERCHANT_NOT_FOUND = "MERCHANT_NOT_FOUND",
    OUTLET_NOT_FOUND = "OUTLET_NOT_FOUND",
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND",
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
    CATEGORY_NOT_FOUND = "CATEGORY_NOT_FOUND",
    PLAN_NOT_FOUND = "PLAN_NOT_FOUND",
    SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",
    PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND",
    AUDIT_LOG_NOT_FOUND = "AUDIT_LOG_NOT_FOUND",
    BILLING_CYCLE_NOT_FOUND = "BILLING_CYCLE_NOT_FOUND",
    PLAN_VARIANT_NOT_FOUND = "PLAN_VARIANT_NOT_FOUND",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    NETWORK_ERROR = "NETWORK_ERROR",
    FILE_TOO_LARGE = "FILE_TOO_LARGE",
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
    UPLOAD_FAILED = "UPLOAD_FAILED"
}

declare function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & {
    success: true;
};
declare function isErrorResponse(response: ApiResponse<any>): response is ApiResponse<any> & {
    success: false;
};
declare const ERROR_MESSAGES: Record<ErrorCode, string>;
declare const ERROR_STATUS_CODES: Record<ErrorCode, number>;
declare class ApiError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: string;
    readonly field?: string;
    constructor(code: ErrorCode, message?: string, details?: string, field?: string);
    toJSON(): {
        success: boolean;
        code: ErrorCode;
        message: string;
        error: string;
    };
}
declare class ValidationError extends ApiError {
    constructor(message: string, details?: string, field?: string);
}
declare class DuplicateError extends ApiError {
    constructor(code: ErrorCode, message?: string, details?: string, field?: string);
}
declare class NotFoundError extends ApiError {
    constructor(code: ErrorCode, message?: string, details?: string);
}
declare class UnauthorizedError extends ApiError {
    constructor(message?: string, details?: string);
}
declare class ForbiddenError extends ApiError {
    constructor(message?: string, details?: string);
}
declare class PlanLimitError extends ApiError {
    constructor(message?: string, details?: string);
}
declare function handlePrismaError(error: any): ApiError;
declare function handleValidationError(error: any): ApiError;
declare function handleBusinessError(error: any): ApiError;
declare function handleApiError(error: any): {
    response: ApiResponse;
    statusCode: number;
};
/**
 * Get translation key for error code
 * This allows frontend to translate error messages client-side
 *
 * @param errorCode - The error code from API response
 * @returns Translation key (same as error code for simplicity)
 */
declare function getErrorTranslationKey(errorCode: string | ErrorCode): string;
/**
 * Check if error code exists in our error system
 * @param code - The error code to check
 * @returns true if error code is valid
 */
declare function isValidErrorCode(code: string): code is ErrorCode;
/**
 * Error types for better user experience
 */
type ErrorType = 'auth' | 'permission' | 'subscription' | 'network' | 'validation' | 'unknown';
/**
 * Enhanced error information for better handling
 */
interface ErrorInfo {
    type: ErrorType;
    message: string;
    title: string;
    showLoginButton: boolean;
    originalError: any;
}
/**
 * Check if an error is authentication-related (401)
 */
declare const isAuthError: (error: any) => boolean;
/**
 * Check if an error is permission-related (403)
 */
declare const isPermissionError: (error: any) => boolean;
/**
 * Check if an error is network-related
 */
declare const isNetworkError: (error: any) => boolean;
/**
 * Check if an error is validation-related (400)
 */
declare const isValidationError: (error: any) => boolean;
/**
 * Analyze error and provide enhanced information
 */
declare const analyzeError: (error: any) => ErrorInfo;

/**
 * Create API URL with proper base URL
 */
declare const createApiUrl: (endpoint: string) => string;
/**
 * Authenticated fetch wrapper for API calls
 * Handles authentication headers and common error cases
 */
/**
 * Public fetch wrapper for unauthenticated requests (login, register, etc.)
 * Does not require authentication token
 */
declare const publicFetch: (url: string, options?: RequestInit) => Promise<Response>;
/**
 * Authenticated fetch wrapper for API calls
 *
 * Best Practices:
 * - Proper error handling and user feedback
 * - Automatic token cleanup on auth failure
 * - Consistent header management
 * - Type-safe implementation
 */
declare const authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
/**
 * Parse API response
 *
 * This function handles the nested API response structure:
 * API returns: { success: true, data: { ... }, message: "..." }
 * We extract: { success: true, data: { ... } }
 *
 * This allows frontend to access user data directly via response.data
 * instead of response.data.data
 */
declare const parseApiResponse: <T>(response: Response) => Promise<ApiResponse<T>>;
/**
 * Check if user is authenticated
 */
declare const isAuthenticated: () => boolean;
interface StoredUser {
    id: number;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date | string;
    emailVerified: boolean;
    updatedAt: Date | string;
    merchantId?: number;
    outletId?: number;
    token: string;
    expiresAt: number;
}
/**
 * Get stored authentication token - CONSOLIDATED APPROACH
 */
declare const getAuthToken: () => string | null;
/**
 * Get stored user data
 */
declare const getStoredUser: () => StoredUser | null;
/**
 * Store authentication data - CONSOLIDATED APPROACH
 * Only stores ONE item: 'authData' with everything needed
 */
declare const storeAuthData: (token: string, user: User) => void;
/**
 * Clear authentication data - CONSOLIDATED APPROACH
 */
declare const clearAuthData: () => void;
/**
 * Get current authenticated user
 */
declare const getCurrentUser: () => StoredUser | null;
/**
 * Handle API response with proper error handling
 */
declare const handleApiResponse: <T>(response: Response) => Promise<ApiResponse<T>>;
/**
 * Get toast type based on error type
 */
declare const getToastType: (errorType: "auth" | "permission" | "subscription" | "network" | "validation" | "unknown") => "error" | "warning" | "info";
/**
 * Wrap API call with error handling for UI
 */
declare const withErrorHandlingForUI: <T>(apiCall: () => Promise<T>) => Promise<{
    data?: T;
    error?: any;
}>;
/**
 * Handle API error for UI display
 */
declare const handleApiErrorForUI: (error: any) => {
    message: string;
    type: string;
};

interface PricingBreakdown {
    basePrice: number;
    totalPrice: number;
    discount: number;
    discountAmount: number;
    finalPrice: number;
    monthlyEquivalent: number;
    billingInterval: BillingInterval$1;
    totalMonths: number;
}
interface PricingConfig {
    discounts: {
        monthly: number;
        quarterly: number;
        sixMonths: number;
        yearly: number;
    };
    intervals: {
        monthly: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        quarterly: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        sixMonths: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        yearly: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
    };
}
interface PricingInfo {
    pricingType: PricingType;
    pricePerUnit: number;
    minDuration: number;
    maxDuration: number;
    requireRentalDates: boolean;
    showPricingOptions: boolean;
}
interface CalculatedPricing {
    unitPrice: number;
    totalPrice: number;
    deposit: number;
    pricingType: PricingType;
    duration?: number;
    durationUnit?: string;
}
interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    suggestions?: string[];
}
interface RentalPeriodValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
declare class PricingCalculator {
    private config;
    private discountCalculator;
    private intervalCalculator;
    private prorationCalculator;
    private comparisonEngine;
    constructor(config?: PricingConfig);
    /**
     * Calculate subscription price based on plan and billing interval
     */
    calculateSubscriptionPrice(plan: Plan, billingInterval: BillingInterval$1): number;
    /**
     * Get detailed pricing breakdown
     */
    getPricingBreakdown(plan: Plan, billingInterval: BillingInterval$1): PricingBreakdown;
    /**
     * Get all pricing options for a plan
     */
    getAllPricingOptions(plan: Plan): Record<BillingInterval$1, PricingBreakdown>;
    /**
     * Get pricing comparison between two plans
     */
    getPricingComparison(plan1: Plan, plan2: Plan, billingInterval: BillingInterval$1): {
        plan1: PricingBreakdown;
        plan2: PricingBreakdown;
        difference: number;
        savings: number;
    };
    /**
     * Calculate prorated amount for plan changes
     */
    calculateProratedAmount(currentPlan: Plan, newPlan: Plan, billingInterval: BillingInterval$1, daysRemaining: number): {
        currentPlanRefund: number;
        newPlanCharge: number;
        netAmount: number;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: PricingConfig): void;
    getConfig(): PricingConfig;
}
declare const pricingCalculator: PricingCalculator;
declare const calculateSubscriptionPrice: (plan: Plan, billingInterval: BillingInterval$1) => number;
declare const getPricingBreakdown: (plan: Plan, billingInterval: BillingInterval$1) => PricingBreakdown;
declare const getAllPricingOptions: (plan: Plan) => Record<BillingInterval$1, PricingBreakdown>;
declare const getPricingComparison: (plan1: Plan, plan2: Plan, billingInterval: BillingInterval$1) => {
    plan1: PricingBreakdown;
    plan2: PricingBreakdown;
    difference: number;
    savings: number;
};
declare const calculateProratedAmount: (currentPlan: Plan, newPlan: Plan, billingInterval: BillingInterval$1, daysRemaining: number) => {
    currentPlanRefund: number;
    newPlanCharge: number;
    netAmount: number;
};
/**
 * Format billing cycle for display
 */
declare const formatBillingCycle: (billingInterval: BillingInterval$1) => string;
/**
 * Get billing cycle discount percentage
 */
declare const getBillingCycleDiscount: (billingInterval: BillingInterval$1) => number;
/**
 * Calculate renewal price
 */
declare const calculateRenewalPrice: (plan: Plan, billingInterval: BillingInterval$1) => number;
/**
 * Calculate savings amount
 */
declare const calculateSavings: (originalPrice: number, discountedPrice: number) => number;
/**
 * Get discount percentage
 */
declare const getDiscountPercentage: (billingInterval: BillingInterval$1) => number;
/**
 * Calculate discounted price
 */
declare const calculateDiscountedPrice: (originalPrice: number, discountPercentage: number) => number;
declare class PricingResolver {
    /**
     * Resolve pricing type cho product dựa trên merchant config
     * Simple: Chỉ dùng pricingType từ merchant (không cần pricingConfig object)
     */
    static resolvePricingType(product: Product, merchant: Merchant): PricingType;
    /**
     * Get effective pricing config cho product
     */
    static getEffectivePricingConfig(product: Product, merchant: Merchant): PricingInfo;
    /**
     * Calculate pricing cho product
     */
    static calculatePricing(product: Product, merchant: Merchant, duration?: number, quantity?: number): CalculatedPricing;
}
declare class PricingValidator {
    /**
     * Validate rental period for a product
     */
    static validateRentalPeriod(product: Product, merchant: Merchant, rentalStartAt: Date, rentalEndAt: Date, quantity?: number): RentalPeriodValidation;
    /**
     * Validate pricing configuration
     */
    static validatePricingConfig(config: any): ValidationResult;
}

/**
 * Consolidated Subscription Manager
 *
 * Consolidates all subscription functionality into a single, organized class
 * following DRY principles and consistent naming conventions.
 *
 * Consolidates:
 * - subscription-utils-consolidated.ts
 * - subscription-utils.ts
 * - subscription-renewal.ts
 * - subscription-validation.ts
 * - subscription-check.ts
 */

interface SubscriptionPeriod {
    startDate: Date;
    endDate: Date;
    duration: string;
    isActive: boolean;
    daysRemaining: number;
    nextBillingDate: Date;
    isTrial?: boolean;
}
interface SubscriptionRenewalConfig {
    paymentGateway: {
        apiKey: string;
        webhookSecret: string;
    };
    autoRenewEnabled: boolean;
    gracePeriodDays: number;
    retryAttempts: number;
    retryDelayHours: number;
}
interface SubscriptionRenewalResult {
    subscriptionId: number;
    success: boolean;
    status: string;
    error?: string;
    paymentId?: number;
    nextBillingDate?: Date;
}
interface RenewalStats {
    totalProcessed: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: string[];
}
interface SubscriptionValidationResult {
    isValid: boolean;
    error?: string;
    statusCode?: number;
    subscription?: any;
    merchant?: any;
    isExpired?: boolean;
    needsStatusUpdate?: boolean;
}
interface SubscriptionValidationOptions {
    requireActiveSubscription?: boolean;
    allowedStatuses?: string[];
    checkMerchantStatus?: boolean;
    checkSubscriptionStatus?: boolean;
    autoUpdateExpired?: boolean;
}
interface RenewalConfig {
    paymentGateway: {
        apiKey: string;
        webhookSecret: string;
    };
    autoRenewEnabled: boolean;
    gracePeriodDays: number;
    retryAttempts: number;
    retryDelayHours: number;
}
interface RenewalResult {
    subscriptionId: number;
    success: boolean;
    status: string;
    error?: string;
    paymentId?: number;
    nextBillingDate?: Date;
}
declare class SubscriptionManager {
    /**
     * Check if user has valid subscription
     */
    static checkStatus(user: any): Promise<boolean>;
    /**
     * Check if subscription error should be thrown
     */
    static shouldThrowError(user: any): Promise<boolean>;
    /**
     * Get subscription error if any
     */
    static getError(user: any): Promise<PlanLimitError | null>;
    /**
     * Comprehensive subscription validation with options
     */
    static validateAccess(user: any, options?: SubscriptionValidationOptions): Promise<SubscriptionValidationResult>;
    /**
     * Check if subscription status allows specific operations
     */
    static canPerformOperation(subscriptionStatus: string, operation: 'create' | 'read' | 'update' | 'delete' | 'admin'): boolean;
    /**
     * Get subscription error message for UI display
     */
    static getErrorMessage(subscriptionStatus: string, merchantStatus?: string): string;
    /**
     * Get allowed operations for subscription status
     */
    static getAllowedOperations(subscriptionStatus: string): string[];
    /**
     * Calculate subscription period details
     */
    static calculatePeriod(startDate: Date, endDate: Date, status: string, interval?: string): SubscriptionPeriod;
    /**
     * Format subscription period for display
     */
    static formatPeriod(period: SubscriptionPeriod): {
        period: string;
        duration: string;
        timeRemaining: string;
        nextBilling: string;
        isActive: boolean;
        isTrial: boolean | undefined;
    };
    /**
     * Get subscription status badge
     */
    static getStatusBadge(status: string, daysRemaining: number): {
        color: string;
        text: string;
        daysRemaining: number;
    };
    /**
     * Calculate new billing date based on subscription interval
     */
    static calculateNewBillingDate(subscription: any): Date;
    /**
     * Check if subscription is expired
     */
    static isExpired(subscription: any): boolean;
    /**
     * Check if grace period is exceeded
     */
    static isGracePeriodExceeded(subscription: any, gracePeriodDays?: number): boolean;
    /**
     * Validate subscription for renewal
     */
    static validateForRenewal(subscription: any, gracePeriodDays?: number): {
        canRenew: boolean;
        reason?: string;
    };
    /**
     * Get subscription status priority (for sorting/display)
     */
    static getStatusPriority(status: string): number;
    /**
     * Sort subscriptions by status priority
     */
    static sortByStatus(subscriptions: any[]): any[];
    /**
     * Check if subscription needs attention
     */
    static needsAttention(subscription: any): {
        needsAttention: boolean;
        reason?: string;
        urgency: 'low' | 'medium' | 'high' | 'critical';
    };
}
declare const checkSubscriptionStatus: typeof SubscriptionManager.checkStatus;
declare const shouldThrowPlanLimitError: typeof SubscriptionManager.shouldThrowError;
declare const getPlanLimitError: typeof SubscriptionManager.getError;
declare const getSubscriptionError: typeof SubscriptionManager.getError;
declare const validateSubscriptionAccess: typeof SubscriptionManager.validateAccess;
declare const canPerformOperation: typeof SubscriptionManager.canPerformOperation;
declare const getPlanLimitErrorMessage: typeof SubscriptionManager.getErrorMessage;
declare const getAllowedOperations: typeof SubscriptionManager.getAllowedOperations;
declare const calculateSubscriptionPeriod: typeof SubscriptionManager.calculatePeriod;
declare const formatSubscriptionPeriod: typeof SubscriptionManager.formatPeriod;
declare const getSubscriptionStatusBadge: typeof SubscriptionManager.getStatusBadge;
declare const calculateNewBillingDate: typeof SubscriptionManager.calculateNewBillingDate;
declare const isSubscriptionExpired: typeof SubscriptionManager.isExpired;
declare const isGracePeriodExceeded: typeof SubscriptionManager.isGracePeriodExceeded;
declare const validateForRenewal: typeof SubscriptionManager.validateForRenewal;
declare const getSubscriptionStatusPriority: typeof SubscriptionManager.getStatusPriority;
declare const sortSubscriptionsByStatus: typeof SubscriptionManager.sortByStatus;
declare const subscriptionNeedsAttention: typeof SubscriptionManager.needsAttention;

interface ProrationCalculation {
    isUpgrade: boolean;
    isDowngrade: boolean;
    currentPlanPrice: number;
    newPlanPrice: number;
    daysRemaining: number;
    daysInPeriod: number;
    proratedAmount: number;
    creditAmount: number;
    chargeAmount: number;
    reason: string;
}
/**
 * Calculate proration for plan changes
 * Simple logic: Charge difference for upgrades, credit for downgrades
 */
declare function calculateProration(currentSubscription: {
    amount: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
}, newPlanPrice: number, changeDate?: Date): ProrationCalculation;
/**
 * Check if proration should be applied
 * Simple rule: Only apply proration for upgrades (charge difference)
 */
declare function shouldApplyProration(currentPrice: number, newPrice: number): boolean;
/**
 * Format proration for display
 */
declare function formatProration(proration: ProrationCalculation): string;

interface BadgeConfig {
    color: string;
    icon: React$1.ComponentType<{
        className?: string;
    }>;
    text: string;
}
interface StatusBadgeProps {
    isActive: boolean;
    entityType?: 'entity' | 'availability';
}
interface RoleBadgeProps {
    role: string;
}
interface LocationBadgeProps {
    city?: string;
    state?: string;
}
interface AvailabilityBadgeProps {
    available: number;
    totalStock: number;
}
/**
 * Get status badge configuration for any entity
 */
declare const getStatusBadgeConfig: (isActive: boolean, entityType?: "entity" | "availability") => BadgeConfig;
/**
 * Generate status badge component
 */
declare const getStatusBadge: ({ isActive, entityType }: StatusBadgeProps) => react_jsx_runtime.JSX.Element;
/**
 * Get role badge configuration
 */
declare const getRoleBadgeConfig: (role: string) => BadgeConfig;
/**
 * Generate role badge component
 */
declare const getRoleBadge: ({ role }: RoleBadgeProps) => react_jsx_runtime.JSX.Element;
/**
 * Get location badge configuration
 */
declare const getLocationBadgeConfig: (city?: string, state?: string) => BadgeConfig | null;
/**
 * Generate location badge component
 */
declare const getLocationBadge: ({ city, state }: LocationBadgeProps) => react_jsx_runtime.JSX.Element;
/**
 * Get availability badge configuration
 */
declare const getAvailabilityBadgeConfig: (available: number, totalStock: number) => BadgeConfig;
/**
 * Generate availability badge component
 */
declare const getAvailabilityBadge: ({ available, totalStock }: AvailabilityBadgeProps) => react_jsx_runtime.JSX.Element;
/**
 * Get price trend badge configuration
 */
declare const getPriceTrendBadgeConfig: (currentPrice: number, previousPrice: number) => BadgeConfig;
/**
 * Generate price trend badge component
 */
declare const getPriceTrendBadge: (currentPrice: number, previousPrice: number) => react_jsx_runtime.JSX.Element;
/**
 * Generate customer status badge (backward compatibility)
 */
declare const getCustomerStatusBadge: (isActive: boolean) => react_jsx_runtime.JSX.Element;
/**
 * Generate user status badge (backward compatibility)
 */
declare const getUserStatusBadge: (isActive: boolean) => react_jsx_runtime.JSX.Element;
/**
 * Generate product status badge (backward compatibility)
 */
declare const getProductStatusBadge: (isActive: boolean) => react_jsx_runtime.JSX.Element;

/**
 * Get customer location badge configuration and component
 * @param city - Customer city
 * @param state - Customer state
 * @returns JSX element for location badge
 */
declare const getCustomerLocationBadge: (city?: string, state?: string) => react_jsx_runtime.JSX.Element;
/**
 * Get customer ID type badge configuration and component
 * @param idType - Customer ID type
 * @returns JSX element for ID type badge
 */
declare const getCustomerIdTypeBadge: (idType?: string) => react_jsx_runtime.JSX.Element;
/**
 * Calculate customer statistics from customer array
 * @param customers - Array of customers
 * @returns Object with calculated statistics
 */
declare const calculateCustomerStats: (customers: Customer[]) => {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    customersWithEmail: number;
    customersWithAddress: number;
    topLocation: string;
    topLocationCount: number;
};
/**
 * Filter customers based on search term and filters
 * @param customers - Array of customers to filter
 * @param searchTerm - Search term for name, email, phone
 * @param filters - Customer filters object
 * @returns Filtered array of customers
 */
declare const filterCustomers: (customers: Customer[], searchTerm: string, filters: CustomerFilters) => Customer[];
/**
 * Get customer's full name
 * @param customer - Customer object
 * @returns Full name string
 */
declare const getCustomerFullName: (customer: Customer) => string;
/**
 * Get customer's display address
 * @param customer - Customer object
 * @returns Formatted address string
 */
declare const getCustomerAddress: (customer: Customer) => string;
/**
 * Get customer's contact info
 * @param customer - Customer object
 * @returns Object with contact information
 */
declare const getCustomerContactInfo: (customer: Customer) => {
    email: string;
    phone: string;
    hasEmail: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
};
/**
 * Format customer for display in tables/cards
 * @param customer - Customer object
 * @returns Formatted customer object with display properties
 */
declare const formatCustomerForDisplay: (customer: Customer) => {
    fullName: string;
    displayAddress: string;
    contactInfo: {
        email: string;
        phone: string;
        hasEmail: boolean;
        hasPhone: boolean;
        hasAddress: boolean;
    };
    statusBadge: react_jsx_runtime.JSX.Element;
    locationBadge: react_jsx_runtime.JSX.Element;
    idTypeBadge: react_jsx_runtime.JSX.Element;
    firstName: string;
    lastName: string;
    name: string;
    dateOfBirth?: Date | string;
    idNumber?: string;
    idType?: "passport" | "drivers_license" | "national_id" | "other";
    notes?: string;
    isActive: boolean;
    outletId?: number;
    merchant?: MerchantReference;
    merchantId: number;
    id: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
};
/**
 * Validate customer data
 * @param customer - Customer object to validate
 * @returns Object with validation results
 */
declare const validateCustomer: (customer: Partial<Customer>) => {
    isValid: boolean;
    errors: string[];
};
/**
 * Get customer age from date of birth
 * @param dateOfBirth - Date of birth string or Date
 * @returns Age in years or null if invalid
 */
declare const getCustomerAge: (dateOfBirth?: string | Date) => number | null;

/**
 * Get product availability badge configuration and component
 * @param available - Available stock count
 * @param totalStock - Total stock count
 * @returns JSX element for availability badge
 */
declare const getProductAvailabilityBadge: (available: number, totalStock: number) => react_jsx_runtime.JSX.Element;
/**
 * Get product type badge configuration and component
 * @param product - Product object
 * @returns JSX element for product type badge
 */
declare const getProductTypeBadge: (product: Product | ProductWithDetails) => react_jsx_runtime.JSX.Element;
/**
 * Calculate product statistics from product array
 * @param products - Array of products
 * @returns Object with calculated statistics
 */
declare const calculateProductStats: (products: Product[] | ProductWithDetails[]) => {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
    averagePrice: number;
};
/**
 * Filter products based on search term, category, outlet, and availability
 * @param products - Array of products to filter
 * @param searchTerm - Search term for name, description, barcode
 * @param categoryFilter - Category filter ('all' or specific category ID)
 * @param outletFilter - Outlet filter ('all' or specific outlet ID)
 * @param availabilityFilter - Availability filter ('all', 'in-stock', 'out-of-stock', 'low-stock')
 * @param statusFilter - Status filter ('all', 'active', 'inactive')
 * @returns Filtered array of products
 */
declare const filterProducts: (products: Product[] | ProductWithDetails[], searchTerm: string, categoryFilter: string, outletFilter: string, availabilityFilter: string, statusFilter: string) => (Product[] | ProductWithDetails[]);
/**
 * Format product price for display
 * @param price - Price value
 * @param currency - Currency code (default: USD)
 * @returns Formatted price string
 */
declare const formatProductPrice: (price: number, currency?: string) => string;
/**
 * Get product's primary image URL with better handling for S3 URLs
 * @param product - Product object
 * @returns Primary image URL or placeholder
 */
declare const getProductImageUrl: (product: Product | ProductWithDetails) => string;
/**
 * Calculate product's stock percentage
 * @param available - Available stock
 * @param totalStock - Total stock
 * @returns Stock percentage (0-100)
 */
declare const calculateStockPercentage: (available: number, totalStock: number) => number;
/**
 * Get product's stock status text
 * @param available - Available stock
 * @param totalStock - Total stock
 * @returns Stock status text
 */
declare const getProductStockStatus: (available: number, totalStock: number) => string;
/**
 * Check if product can be rented
 * @param product - Product object
 * @returns Boolean indicating if product can be rented
 */
declare const canRentProduct: (product: Product | ProductWithDetails) => boolean;
/**
 * Check if product can be sold
 * @param product - Product object
 * @returns Boolean indicating if product can be sold
 */
declare const canSellProduct: (product: Product | ProductWithDetails) => boolean;
/**
 * Get product's display name with fallback
 * @param product - Product object
 * @returns Product display name
 */
declare const getProductDisplayName: (product: Product | ProductWithDetails) => string;
/**
 * Get product's category name with fallback
 * @param product - Product object
 * @returns Category name or 'Uncategorized'
 */
declare const getProductCategoryName: (product: Product | ProductWithDetails) => string;
/**
 * Get product's outlet name with fallback
 * @param product - Product object
 * @returns Outlet name or 'No Outlet'
 */
declare const getProductOutletName: (product: Product | ProductWithDetails) => string;
/**
 * Sort products by various criteria
 * @param products - Array of products
 * @param sortBy - Sort field ('name', 'price', 'stock', 'createdAt', 'updatedAt')
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Sorted array of products
 */
declare const sortProducts: (products: Product[] | ProductWithDetails[], sortBy: string, sortOrder?: "asc" | "desc") => (Product[] | ProductWithDetails[]);

/**
 * Get role badge configuration and component
 * @param role - User role string
 * @returns JSX element for role badge
 */
declare const getUserRoleBadge: (role: string) => react_jsx_runtime.JSX.Element;
/**
 * Calculate user statistics from user array
 * @param users - Array of users
 * @returns Object with calculated statistics
 */
declare const calculateUserStats: (users: User[]) => {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
};
/**
 * Filter users based on search term, role, and status
 * @param users - Array of users to filter
 * @param searchTerm - Search term for name, email, merchant, outlet
 * @param roleFilter - Role filter ('all' or specific role)
 * @param statusFilter - Status filter ('all', 'ACTIVE', 'INACTIVE')
 * @returns Filtered array of users
 */
declare const filterUsers: (users: User[], searchTerm: string, roleFilter: string, statusFilter: string) => User[];
/**
 * Get user's full name
 * @param user - User object
 * @returns Full name string
 */
declare const getUserFullName: (user: User) => string;
/**
 * Check if user can create other users based on role
 * @param userRole - Current user's role
 * @returns Boolean indicating if user can create other users
 */
declare const canCreateUsers: (userRole?: string) => boolean;

declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
declare const registerSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["CLIENT", "SHOP_OWNER", "ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]>>;
    businessName: z.ZodOptional<z.ZodString>;
    tenantKey: z.ZodOptional<z.ZodString>;
    businessType: z.ZodOptional<z.ZodEnum<["CLOTHING", "VEHICLE", "EQUIPMENT", "GENERAL"]>>;
    pricingType: z.ZodOptional<z.ZodEnum<["FIXED", "HOURLY", "DAILY"]>>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    merchantCode: z.ZodOptional<z.ZodString>;
    outletCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}>, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}>, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}, {
    email: string;
    password: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | "CLIENT" | "SHOP_OWNER" | undefined;
    name?: string | undefined;
    businessType?: "CLOTHING" | "VEHICLE" | "EQUIPMENT" | "GENERAL" | undefined;
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    tenantKey?: string | undefined;
    businessName?: string | undefined;
    merchantCode?: string | undefined;
    outletCode?: string | undefined;
}>;
declare const productCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    barcode: z.ZodOptional<z.ZodString>;
    rentPrice: z.ZodNumber;
    salePrice: z.ZodNumber;
    deposit: z.ZodDefault<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    totalStock: z.ZodNumber;
    images: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletStock: z.ZodOptional<z.ZodArray<z.ZodObject<{
        outletId: z.ZodNumber;
        stock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outletId: number;
        stock: number;
    }, {
        outletId: number;
        stock: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    rentPrice: number;
    salePrice: number;
    deposit: number;
    totalStock: number;
    merchantId?: number | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    images?: string | string[] | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name: string;
    rentPrice: number;
    salePrice: number;
    totalStock: number;
    merchantId?: number | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    deposit?: number | undefined;
    images?: string | string[] | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
declare const productUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rentPrice: z.ZodOptional<z.ZodNumber>;
    salePrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    deposit: z.ZodOptional<z.ZodNumber>;
    images: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    totalStock: z.ZodOptional<z.ZodNumber>;
    outletStock: z.ZodOptional<z.ZodArray<z.ZodObject<{
        outletId: z.ZodNumber;
        stock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outletId: number;
        stock: number;
    }, {
        outletId: number;
        stock: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    categoryId?: number | undefined;
    rentPrice?: number | undefined;
    salePrice?: number | null | undefined;
    deposit?: number | undefined;
    totalStock?: number | undefined;
    images?: string | string[] | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    categoryId?: number | undefined;
    rentPrice?: number | undefined;
    salePrice?: number | null | undefined;
    deposit?: number | undefined;
    totalStock?: number | undefined;
    images?: string | string[] | undefined;
    outletStock?: {
        outletId: number;
        stock: number;
    }[] | undefined;
}>;
declare const productsQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
    available: z.ZodOptional<z.ZodBoolean>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    offset: number;
    available?: boolean | undefined;
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    categoryId?: number | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
}, {
    available?: boolean | undefined;
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    categoryId?: number | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
declare const rentalSchema: z.ZodEffects<z.ZodObject<{
    productId: z.ZodNumber;
    startDate: z.ZodDate;
    endDate: z.ZodDate;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startDate: Date;
    endDate: Date;
    productId: number;
    notes?: string | undefined;
}, {
    startDate: Date;
    endDate: Date;
    productId: number;
    notes?: string | undefined;
}>, {
    startDate: Date;
    endDate: Date;
    productId: number;
    notes?: string | undefined;
}, {
    startDate: Date;
    endDate: Date;
    productId: number;
    notes?: string | undefined;
}>;
type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ProductCreateInput = z.infer<typeof productCreateSchema>;
type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
type ProductsQuery = z.infer<typeof productsQuerySchema>;
type RentalInput = z.infer<typeof rentalSchema>;
declare const customerCreateSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodString;
    merchantId: z.ZodOptional<z.ZodNumber>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    idNumber: z.ZodOptional<z.ZodString>;
    idType: z.ZodOptional<z.ZodEnum<["passport", "drivers_license", "national_id", "other"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | undefined;
    merchantId?: number | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    dateOfBirth?: string | undefined;
    idNumber?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
    notes?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | undefined;
    merchantId?: number | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    dateOfBirth?: string | undefined;
    idNumber?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
    notes?: string | undefined;
}>;
declare const customerUpdateSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    phone: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    state: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    zipCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dateOfBirth: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    idNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    isActive: z.ZodOptional<z.ZodBoolean>;
    idType: z.ZodOptional<z.ZodEnum<["passport", "drivers_license", "national_id", "other"]>>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    merchantId?: number | undefined;
    isActive?: boolean | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    dateOfBirth?: string | undefined;
    idNumber?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
    notes?: string | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    merchantId?: number | undefined;
    isActive?: boolean | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
    dateOfBirth?: string | undefined;
    idNumber?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
    notes?: string | undefined;
}>;
declare const customersQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodBoolean]>, boolean | undefined, string | boolean>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    idType: z.ZodOptional<z.ZodEnum<["passport", "drivers_license", "national_id", "other"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    offset: number;
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: boolean | undefined;
    country?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
}, {
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: string | boolean | undefined;
    country?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    idType?: "passport" | "drivers_license" | "national_id" | "other" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
declare const ordersQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
    customerId: z.ZodOptional<z.ZodNumber>;
    userId: z.ZodOptional<z.ZodNumber>;
    productId: z.ZodOptional<z.ZodNumber>;
    orderType: z.ZodOptional<z.ZodEnum<["RENT", "SALE"]>>;
    status: z.ZodOptional<z.ZodEnum<["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"]>>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    pickupDate: z.ZodOptional<z.ZodDate>;
    returnDate: z.ZodOptional<z.ZodDate>;
    minAmount: z.ZodOptional<z.ZodNumber>;
    maxAmount: z.ZodOptional<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    status?: "CANCELLED" | "RESERVED" | "PICKUPED" | "RETURNED" | "COMPLETED" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    orderType?: "RENT" | "SALE" | undefined;
    customerId?: number | undefined;
    productId?: number | undefined;
    pickupDate?: Date | undefined;
    returnDate?: Date | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    userId?: number | undefined;
}, {
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    status?: "CANCELLED" | "RESERVED" | "PICKUPED" | "RETURNED" | "COMPLETED" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    orderType?: "RENT" | "SALE" | undefined;
    customerId?: number | undefined;
    productId?: number | undefined;
    pickupDate?: Date | undefined;
    returnDate?: Date | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    userId?: number | undefined;
}>;
declare const orderCreateSchema: z.ZodObject<{
    orderId: z.ZodOptional<z.ZodNumber>;
    orderNumber: z.ZodOptional<z.ZodString>;
    orderType: z.ZodEnum<["RENT", "SALE"]>;
    customerId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodNumber;
    pickupPlanAt: z.ZodOptional<z.ZodDate>;
    returnPlanAt: z.ZodOptional<z.ZodDate>;
    subtotal: z.ZodOptional<z.ZodNumber>;
    taxAmount: z.ZodOptional<z.ZodNumber>;
    discountType: z.ZodOptional<z.ZodEnum<["amount", "percentage"]>>;
    discountValue: z.ZodOptional<z.ZodNumber>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
    totalAmount: z.ZodNumber;
    depositAmount: z.ZodOptional<z.ZodNumber>;
    securityDeposit: z.ZodOptional<z.ZodNumber>;
    damageFee: z.ZodOptional<z.ZodNumber>;
    lateFee: z.ZodOptional<z.ZodNumber>;
    collateralType: z.ZodOptional<z.ZodString>;
    collateralDetails: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    pickupNotes: z.ZodOptional<z.ZodString>;
    returnNotes: z.ZodOptional<z.ZodString>;
    damageNotes: z.ZodOptional<z.ZodString>;
    isReadyToDeliver: z.ZodOptional<z.ZodBoolean>;
    orderItems: z.ZodArray<z.ZodObject<{
        productId: z.ZodNumber;
        quantity: z.ZodNumber;
        unitPrice: z.ZodDefault<z.ZodNumber>;
        totalPrice: z.ZodOptional<z.ZodNumber>;
        deposit: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        notes?: string | undefined;
        totalPrice?: number | undefined;
    }, {
        productId: number;
        quantity: number;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    outletId: number;
    orderType: "RENT" | "SALE";
    totalAmount: number;
    orderItems: {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        notes?: string | undefined;
        totalPrice?: number | undefined;
    }[];
    customerId?: number | undefined;
    depositAmount?: number | undefined;
    pickupPlanAt?: Date | undefined;
    returnPlanAt?: Date | undefined;
    isReadyToDeliver?: boolean | undefined;
    notes?: string | undefined;
    orderNumber?: string | undefined;
    securityDeposit?: number | undefined;
    damageFee?: number | undefined;
    lateFee?: number | undefined;
    discountType?: "amount" | "percentage" | undefined;
    discountValue?: number | undefined;
    discountAmount?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
}, {
    outletId: number;
    orderType: "RENT" | "SALE";
    totalAmount: number;
    orderItems: {
        productId: number;
        quantity: number;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
    }[];
    customerId?: number | undefined;
    depositAmount?: number | undefined;
    pickupPlanAt?: Date | undefined;
    returnPlanAt?: Date | undefined;
    isReadyToDeliver?: boolean | undefined;
    notes?: string | undefined;
    orderNumber?: string | undefined;
    securityDeposit?: number | undefined;
    damageFee?: number | undefined;
    lateFee?: number | undefined;
    discountType?: "amount" | "percentage" | undefined;
    discountValue?: number | undefined;
    discountAmount?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
}>;
declare const orderUpdateSchema: z.ZodObject<{
    orderId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    orderNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    orderType: z.ZodOptional<z.ZodEnum<["RENT", "SALE"]>>;
    customerId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    outletId: z.ZodOptional<z.ZodNumber>;
    pickupPlanAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    returnPlanAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    subtotal: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    taxAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    discountType: z.ZodOptional<z.ZodOptional<z.ZodEnum<["amount", "percentage"]>>>;
    discountValue: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    discountAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    totalAmount: z.ZodOptional<z.ZodNumber>;
    depositAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    securityDeposit: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    damageFee: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lateFee: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    collateralType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    collateralDetails: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    pickupNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    returnNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    damageNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isReadyToDeliver: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    orderItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productId: z.ZodNumber;
        quantity: z.ZodNumber;
        unitPrice: z.ZodDefault<z.ZodNumber>;
        totalPrice: z.ZodOptional<z.ZodNumber>;
        deposit: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        notes?: string | undefined;
        totalPrice?: number | undefined;
    }, {
        productId: number;
        quantity: number;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
    }>, "many">>;
} & {
    status: z.ZodOptional<z.ZodEnum<["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"]>>;
    pickedUpAt: z.ZodOptional<z.ZodDate>;
    returnedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    outletId?: number | undefined;
    status?: "CANCELLED" | "RESERVED" | "PICKUPED" | "RETURNED" | "COMPLETED" | undefined;
    orderType?: "RENT" | "SALE" | undefined;
    customerId?: number | undefined;
    totalAmount?: number | undefined;
    depositAmount?: number | undefined;
    pickupPlanAt?: Date | undefined;
    returnPlanAt?: Date | undefined;
    orderItems?: {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        notes?: string | undefined;
        totalPrice?: number | undefined;
    }[] | undefined;
    isReadyToDeliver?: boolean | undefined;
    notes?: string | undefined;
    orderNumber?: string | undefined;
    securityDeposit?: number | undefined;
    damageFee?: number | undefined;
    lateFee?: number | undefined;
    discountType?: "amount" | "percentage" | undefined;
    discountValue?: number | undefined;
    discountAmount?: number | undefined;
    pickedUpAt?: Date | undefined;
    returnedAt?: Date | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
}, {
    outletId?: number | undefined;
    status?: "CANCELLED" | "RESERVED" | "PICKUPED" | "RETURNED" | "COMPLETED" | undefined;
    orderType?: "RENT" | "SALE" | undefined;
    customerId?: number | undefined;
    totalAmount?: number | undefined;
    depositAmount?: number | undefined;
    pickupPlanAt?: Date | undefined;
    returnPlanAt?: Date | undefined;
    orderItems?: {
        productId: number;
        quantity: number;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
    }[] | undefined;
    isReadyToDeliver?: boolean | undefined;
    notes?: string | undefined;
    orderNumber?: string | undefined;
    securityDeposit?: number | undefined;
    damageFee?: number | undefined;
    lateFee?: number | undefined;
    discountType?: "amount" | "percentage" | undefined;
    discountValue?: number | undefined;
    discountAmount?: number | undefined;
    pickedUpAt?: Date | undefined;
    returnedAt?: Date | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
}>;
type OrdersQuery = z.infer<typeof ordersQuerySchema>;
type OrderCreateInput = z.infer<typeof orderCreateSchema>;
type OrderUpdatePayload = z.infer<typeof orderUpdateSchema>;
declare const usersQuerySchema: z.ZodObject<{
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]>>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodBoolean]>, boolean | undefined, string | boolean>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["firstName", "lastName", "email", "createdAt"]>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
    sortBy?: "firstName" | "lastName" | "email" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: boolean | undefined;
}, {
    search?: string | undefined;
    sortBy?: "firstName" | "lastName" | "email" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: string | boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
declare const userCreateSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>;
    phone: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]>>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
}, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
}>;
declare const userUpdateSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: boolean | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
    merchantId?: number | undefined;
    outletId?: number | undefined;
    isActive?: boolean | undefined;
}>;
type UsersQuery = z.infer<typeof usersQuerySchema>;
type UserCreateInput = z.infer<typeof userCreateSchema>;
type UserUpdateInput = z.infer<typeof userUpdateSchema>;
declare const outletsQuerySchema: z.ZodObject<{
    merchantId: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodBoolean]>, boolean | "all" | undefined, string | boolean>>;
    q: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    isActive?: boolean | "all" | undefined;
    offset?: number | undefined;
}, {
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    isActive?: string | boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
declare const categoriesQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodBoolean]>, boolean | "all" | undefined, string | boolean>>;
    sortBy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["name", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodEnum<["asc", "desc"]>>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    isActive?: boolean | "all" | undefined;
    offset?: number | undefined;
}, {
    search?: string | undefined;
    q?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    isActive?: string | boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
declare const outletCreateSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]>>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "INACTIVE" | "CLOSED" | "SUSPENDED";
    name: string;
    phone?: string | undefined;
    description?: string | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
}, {
    name: string;
    phone?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "CLOSED" | "SUSPENDED" | undefined;
    description?: string | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
}>;
declare const outletUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]>>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    isActive?: boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "CLOSED" | "SUSPENDED" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
}, {
    phone?: string | undefined;
    isActive?: boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "CLOSED" | "SUSPENDED" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
}>;
type OutletsQuery = z.infer<typeof outletsQuerySchema>;
type OutletCreateInput = z.infer<typeof outletCreateSchema>;
type OutletUpdateInput = z.infer<typeof outletUpdateSchema>;
declare const planCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    basePrice: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    trialDays: z.ZodNumber;
    limits: z.ZodObject<{
        outlets: z.ZodNumber;
        users: z.ZodNumber;
        products: z.ZodNumber;
        customers: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    }, {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    }>;
    features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    isPopular: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sortOrder: number;
    isActive: boolean;
    name: string;
    basePrice: number;
    description: string;
    currency: string;
    trialDays: number;
    limits: {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    };
    features: string[];
    isPopular: boolean;
}, {
    name: string;
    basePrice: number;
    description: string;
    trialDays: number;
    limits: {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    };
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    features?: string[] | undefined;
    isPopular?: boolean | undefined;
}>;
declare const planUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    basePrice: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    trialDays: z.ZodOptional<z.ZodNumber>;
    limits: z.ZodOptional<z.ZodObject<{
        outlets: z.ZodNumber;
        users: z.ZodNumber;
        products: z.ZodNumber;
        customers: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    }, {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    }>>;
    features: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isPopular: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    basePrice?: number | undefined;
    description?: string | undefined;
    currency?: string | undefined;
    trialDays?: number | undefined;
    limits?: {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    } | undefined;
    features?: string[] | undefined;
    isPopular?: boolean | undefined;
}, {
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    basePrice?: number | undefined;
    description?: string | undefined;
    currency?: string | undefined;
    trialDays?: number | undefined;
    limits?: {
        outlets: number;
        users: number;
        products: number;
        customers: number;
    } | undefined;
    features?: string[] | undefined;
    isPopular?: boolean | undefined;
}>;
declare const plansQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPopular: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "price", "basePrice", "createdAt", "sortOrder"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "sortOrder" | "name" | "price" | "basePrice" | "createdAt";
    sortOrder: "asc" | "desc";
    limit: number;
    offset: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
    isPopular?: boolean | undefined;
}, {
    search?: string | undefined;
    sortBy?: "sortOrder" | "name" | "price" | "basePrice" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    isActive?: boolean | undefined;
    limit?: number | undefined;
    isPopular?: boolean | undefined;
    offset?: number | undefined;
}>;
type PlanCreateInput = z.infer<typeof planCreateSchema>;
type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
type PlansQuery = z.infer<typeof plansQuerySchema>;
declare const planVariantCreateSchema: z.ZodObject<{
    planId: z.ZodString;
    name: z.ZodString;
    duration: z.ZodNumber;
    price: z.ZodOptional<z.ZodNumber>;
    basePrice: z.ZodOptional<z.ZodNumber>;
    discount: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    isPopular: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sortOrder: number;
    isActive: boolean;
    name: string;
    planId: string;
    discount: number;
    isPopular: boolean;
    duration: number;
    price?: number | undefined;
    basePrice?: number | undefined;
}, {
    name: string;
    planId: string;
    duration: number;
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    price?: number | undefined;
    basePrice?: number | undefined;
    discount?: number | undefined;
    isPopular?: boolean | undefined;
}>;
declare const planVariantUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    basePrice: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    discount: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isPopular: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
} & {
    planId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    price?: number | undefined;
    basePrice?: number | undefined;
    planId?: string | undefined;
    discount?: number | undefined;
    isPopular?: boolean | undefined;
    duration?: number | undefined;
}, {
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    price?: number | undefined;
    basePrice?: number | undefined;
    planId?: string | undefined;
    discount?: number | undefined;
    isPopular?: boolean | undefined;
    duration?: number | undefined;
}>;
declare const planVariantsQuerySchema: z.ZodObject<{
    planId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    isPopular: z.ZodOptional<z.ZodBoolean>;
    duration: z.ZodOptional<z.ZodNumber>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["name", "price", "duration", "discount", "createdAt", "sortOrder"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "sortOrder" | "name" | "price" | "createdAt" | "discount" | "duration";
    sortOrder: "asc" | "desc";
    limit: number;
    offset: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
    planId?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    isPopular?: boolean | undefined;
    duration?: number | undefined;
}, {
    search?: string | undefined;
    sortBy?: "sortOrder" | "name" | "price" | "createdAt" | "discount" | "duration" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    isActive?: boolean | undefined;
    planId?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    limit?: number | undefined;
    isPopular?: boolean | undefined;
    offset?: number | undefined;
    duration?: number | undefined;
}>;
type PlanVariantCreateInput = z.infer<typeof planVariantCreateSchema>;
type PlanVariantUpdateInput = z.infer<typeof planVariantUpdateSchema>;
type PlanVariantsQuery = z.infer<typeof planVariantsQuerySchema>;
declare const subscriptionCreateSchema: z.ZodObject<{
    planId: z.ZodString;
    planVariantId: z.ZodString;
    merchantId: z.ZodNumber;
    status: z.ZodDefault<z.ZodEnum<["trial", "active", "past_due", "cancelled", "paused", "expired"]>>;
    billingInterval: z.ZodDefault<z.ZodEnum<["month", "quarter", "semiAnnual", "year"]>>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    trialStartDate: z.ZodOptional<z.ZodDate>;
    trialEndDate: z.ZodOptional<z.ZodDate>;
    currentPeriodStart: z.ZodOptional<z.ZodDate>;
    currentPeriodEnd: z.ZodOptional<z.ZodDate>;
    cancelAtPeriodEnd: z.ZodDefault<z.ZodBoolean>;
    cancelledAt: z.ZodOptional<z.ZodDate>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    merchantId: number;
    status: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due";
    currency: string;
    planId: string;
    billingInterval: "month" | "quarter" | "year" | "semiAnnual";
    amount: number;
    cancelAtPeriodEnd: boolean;
    planVariantId: string;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    notes?: string | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}, {
    merchantId: number;
    planId: string;
    amount: number;
    planVariantId: string;
    status?: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    currency?: string | undefined;
    billingInterval?: "month" | "quarter" | "year" | "semiAnnual" | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    notes?: string | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}>;
declare const subscriptionUpdateSchema: z.ZodObject<{
    planId: z.ZodOptional<z.ZodString>;
    planVariantId: z.ZodOptional<z.ZodString>;
    merchantId: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["trial", "active", "past_due", "cancelled", "paused", "expired"]>>>;
    billingInterval: z.ZodOptional<z.ZodDefault<z.ZodEnum<["month", "quarter", "semiAnnual", "year"]>>>;
    amount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    trialStartDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    trialEndDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    currentPeriodStart: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    currentPeriodEnd: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    cancelAtPeriodEnd: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    cancelledAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    id: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    merchantId?: number | undefined;
    status?: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    currency?: string | undefined;
    planId?: string | undefined;
    id?: number | undefined;
    billingInterval?: "month" | "quarter" | "year" | "semiAnnual" | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    amount?: number | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    notes?: string | undefined;
    planVariantId?: string | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}, {
    merchantId?: number | undefined;
    status?: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    currency?: string | undefined;
    planId?: string | undefined;
    id?: number | undefined;
    billingInterval?: "month" | "quarter" | "year" | "semiAnnual" | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    amount?: number | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    notes?: string | undefined;
    planVariantId?: string | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}>;
declare const subscriptionsQuerySchema: z.ZodObject<{
    merchantId: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "cancelled", "expired", "suspended", "past_due", "paused"]>>;
    planId: z.ZodOptional<z.ZodString>;
    planVariantId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "currentPeriodEnd", "amount", "status"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sortBy: "status" | "createdAt" | "currentPeriodEnd" | "amount";
    sortOrder: "asc" | "desc";
    limit: number;
    offset: number;
    search?: string | undefined;
    merchantId?: number | undefined;
    status?: "active" | "inactive" | "suspended" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    planId?: string | undefined;
    planVariantId?: string | undefined;
}, {
    search?: string | undefined;
    sortBy?: "status" | "createdAt" | "currentPeriodEnd" | "amount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    merchantId?: number | undefined;
    status?: "active" | "inactive" | "suspended" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    planId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    planVariantId?: string | undefined;
}>;
type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema>;
interface PlanLimitsValidationResult {
    isValid: boolean;
    error?: string;
    currentCount: number;
    limit: number;
    entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders';
}
interface PlanLimitsInfo {
    planLimits: PlanLimits$1;
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
declare function getCurrentEntityCounts(merchantId: number): Promise<{
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
}>;
/**
 * Get comprehensive plan limits information for a merchant
 */
declare function getPlanLimitsInfo(merchantId: number): Promise<PlanLimitsInfo>;
/**
 * Validate if merchant can create a new entity
 */
declare function validatePlanLimits(merchantId: number, entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'): Promise<PlanLimitsValidationResult>;
/**
 * Validate platform access for merchant
 */
declare function validatePlatformAccess(merchantId: number, platform: 'mobile' | 'web', planInfo: PlanLimitsInfo): boolean;
/**
 * Validate product public check access
 */
declare function validateProductPublicCheckAccess(planInfo: PlanLimitsInfo): boolean;
/**
 * Assert plan limits for a specific entity type
 * Throws an error if the plan limit would be exceeded
 */
declare function assertPlanLimit(merchantId: number, entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'): Promise<void>;

/**
 * Default currency configuration
 * USD is the base currency (exchangeRate: 1)
 * VND exchange rate is approximate (1 USD ≈ 24,500 VND)
 */
declare const DEFAULT_CURRENCIES: Currency[];
/**
 * Default currency settings
 */
declare const DEFAULT_CURRENCY_SETTINGS: CurrencySettings;
/**
 * Get currency by code
 * @param code - Currency code
 * @returns Currency configuration or undefined if not found
 */
declare function getCurrency(code: CurrencyCode): Currency | undefined;
/**
 * Get current currency configuration
 * @param settings - Currency settings (optional, uses default if not provided)
 * @returns Current currency configuration
 */
declare function getCurrentCurrency(settings?: CurrencySettings): Currency;
/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
declare function convertCurrency(amount: number, fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number;
/**
 * Format amount as currency with advanced options
 * @param amount - Amount to format
 * @param options - Formatting options
 * @param settings - Currency settings (optional)
 * @returns Formatted currency string
 */
declare function formatCurrencyAdvanced(amount: number | null | undefined, options?: CurrencyFormatOptions, settings?: CurrencySettings): string;
/**
 * Format amount as currency (simplified version for backward compatibility)
 * @param amount - Amount to format
 * @param currency - Currency code (optional, uses current currency if not provided)
 * @param locale - Locale for formatting (optional)
 * @returns Formatted currency string
 */
declare function formatCurrency(amount: number | null | undefined, currency?: CurrencyCode, locale?: string): string;
/**
 * Parse currency string to number
 * @param currencyString - Currency string to parse
 * @param currency - Currency code to parse from
 * @returns Parsed number or null if invalid
 */
declare function parseCurrency(currencyString: string, currency?: CurrencyCode): number | null;
/**
 * Get currency display string (symbol + code)
 * @param currency - Currency code
 * @returns Display string (e.g., "$ USD" or "đ VND")
 */
declare function getCurrencyDisplay(currency: CurrencyCode): string;
/**
 * Validate currency code
 * @param code - Currency code to validate
 * @returns True if valid, false otherwise
 */
declare function isValidCurrencyCode(code: string): code is CurrencyCode;
/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate
 */
declare function getExchangeRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number;

interface PaymentGatewayConfig {
    provider: 'stripe' | 'paypal' | 'square';
    apiKey: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
    defaultGateway?: string;
}
interface PaymentGatewayManager {
    createPayment: (amount: number, currency: string, metadata?: any) => Promise<any>;
    processPayment: (paymentId: string) => Promise<any>;
    refundPayment: (paymentId: string, amount?: number) => Promise<any>;
}
/**
 * Create payment gateway manager
 * This is a placeholder implementation
 */
declare function createPaymentGatewayManager(config: PaymentGatewayConfig): PaymentGatewayManager;

/**
 * Order Number Generator & Configuration
 *
 * Provides robust, concurrent-safe order number generation for rental shop orders.
 * Supports multiple formats, handles race conditions, and includes centralized configuration.
 */
type OrderNumberFormat = 'sequential' | 'date-based' | 'random' | 'random-numeric' | 'hybrid' | 'compact-numeric';

/**
 * Order Number Manager Utilities
 *
 * Utility functions for managing order number generation across the application.
 * Provides easy-to-use functions for different order number formats.
 */

/**
 * Get outlet order statistics
 */
declare function getOutletStats(outletId: number): Promise<{
    totalOrders: number;
    todayOrders: number;
    lastOrderNumber?: string;
    lastOrderDate?: Date;
}>;
/**
 * Compare different order number formats
 */
declare function compareOrderNumberFormats(outletId: number): Promise<Record<string, any>>;
/**
 * Format recommendations based on business needs
 */
declare function getFormatRecommendations(): {
    smallBusiness: {
        recommended: string;
        reason: string;
        example: string;
    };
    mediumBusiness: {
        recommended: string;
        reason: string;
        example: string;
    };
    largeBusiness: {
        recommended: string;
        reason: string;
        example: string;
    };
    highSecurity: {
        recommended: string;
        reason: string;
        example: string;
    };
};
/**
 * Migration helper: Convert existing orders to new format
 */
declare function migrateOrderNumbers(outletId: number, newFormat: OrderNumberFormat): Promise<{
    success: boolean;
    message: string;
    affectedOrders: number;
}>;
/**
 * Order number format validator
 */
declare function validateOrderNumberFormat(orderNumber: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
};

declare const formatDate: (date: Date | string | null | undefined, formatString?: string) => string;
declare const formatDateTime: (date: Date | string | null | undefined) => string;
declare const addDaysToDate: (date: Date, days: number) => Date;
declare const getDaysDifference: (startDate: Date, endDate: Date) => number;
declare const isDateAfter: (date1: Date, date2: Date) => boolean;
declare const isDateBefore: (date1: Date, date2: Date) => boolean;
declare const getCurrentDate: () => Date;
declare const getTomorrow: () => Date;
/**
 * Format date in a user-friendly way (e.g., "January 15, 2025")
 */
declare const formatDateLong: (date: Date | string | null | undefined) => string;
/**
 * Format date and time in a user-friendly way (e.g., "January 15, 2025 at 3:45 PM")
 */
declare const formatDateTimeLong: (date: Date | string | null | undefined) => string;
/**
 * Format date in short format (e.g., "Jan 15, 2025")
 */
declare const formatDateShort: (date: Date | string | null | undefined) => string;
/**
 * Format date and time in short format (e.g., "Jan 15, 2025 3:45 PM")
 */
declare const formatDateTimeShort: (date: Date | string | null | undefined) => string;
/**
 * Format date with locale support
 * @param date - Date object or date string
 * @param locale - Locale code ('en' or 'vi')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
declare const formatDateWithLocale: (date: Date | string | null | undefined, locale?: "en" | "vi", options?: Intl.DateTimeFormatOptions) => string;
type DateFormatOptions = {
    month?: 'short' | 'long' | 'numeric';
    year?: 'numeric' | '2-digit';
    day?: 'numeric' | '2-digit';
    weekday?: 'short' | 'long' | 'narrow';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
};
/**
 * Get the appropriate locale for date formatting based on current language
 */
declare function getDateLocale(locale: string): string;
/**
 * Format a date string or Date object according to the current locale
 *
 * @param date - Date string or Date object to format
 * @param locale - Current locale ('en' or 'vi')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
declare function formatDateByLocale(date: string | Date, locale: string, options?: DateFormatOptions): string;
/**
 * Format date for chart periods (month + year)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted period string (e.g., "Th12 2024" or "Dec 2024")
 */
declare function formatChartPeriod(date: string | Date, locale: string): string;
/**
 * Format date for full display (day + month + year)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "20/01/05" or "Jan 20, 2025")
 */
declare function formatFullDateByLocale(date: string | Date, locale: string): string;
/**
 * Format date for month only display (month + year)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "01/05" or "Jan 2025")
 */
declare function formatMonthOnlyByLocale(date: string | Date, locale: string): string;
/**
 * Format date for daily display (day + month)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted date string (e.g., "01/10" or "Oct 1")
 */
declare function formatDailyByLocale(date: string | Date, locale: string): string;
/**
 * Format date for time display (hour + minute)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted time string (e.g., "14:30")
 */
declare function formatTimeByLocale(date: string | Date, locale: string): string;
/**
 * Format date for datetime display (date + time)
 *
 * @param date - Date string or Date object
 * @param locale - Current locale ('en' or 'vi')
 * @returns Formatted datetime string (e.g., "10:12 20/01/05" or "10:12 AM Jan 20, 2025")
 */
declare function formatDateTimeByLocale(date: string | Date, locale: string): string;
/**
 * Hook to get formatted date using current locale
 *
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
declare function useFormattedDate(date: string | Date, options?: DateFormatOptions): string;
/**
 * Hook to get formatted chart period using current locale
 *
 * @param date - Date string or Date object
 * @returns Formatted period string for charts
 */
declare function useFormattedChartPeriod(date: string | Date): string;
/**
 * Hook to get formatted full date using current locale
 *
 * @param date - Date string or Date object
 * @returns Formatted date string (dd/mm/yy for Vietnamese, standard for English)
 */
declare function useFormattedFullDate(date: string | Date): string;
/**
 * Hook to get formatted datetime using current locale
 *
 * @param date - Date string or Date object
 * @returns Formatted datetime string (hh:mm dd/mm/yy for Vietnamese, standard for English)
 */
declare function useFormattedDateTime(date: string | Date): string;
/**
 * Hook to get formatted month only using current locale
 *
 * @param date - Date string or Date object
 * @returns Formatted month string (mm/yy for Vietnamese, standard for English)
 */
declare function useFormattedMonthOnly(date: string | Date): string;
/**
 * Hook to get formatted daily using current locale
 *
 * @param date - Date string or Date object
 * @returns Formatted daily string (dd/mm for Vietnamese, standard for English)
 */
declare function useFormattedDaily(date: string | Date): string;
/**
 * Get local date key from UTC datetime string
 * Converts UTC database datetime to local date (YYYY-MM-DD)
 *
 * @param date - UTC datetime string or Date object from database
 * @returns Local date in YYYY-MM-DD format
 *
 * @example
 * // Database stores UTC: "2025-10-28T17:00:00Z"
 * // User in UTC+7 timezone sees it as: "2025-10-29T00:00:00+07:00"
 * // This function returns: "2025-10-29"
 * getLocalDateKey("2025-10-28T17:00:00Z") // "2025-10-29"
 */
declare function getLocalDateKey(date: Date | string | null | undefined): string;
/**
 * Get local date from UTC datetime string
 * Useful when database stores UTC but UI needs to display in local time
 *
 * @param date - UTC datetime string or Date object
 * @returns Date object in local timezone
 */
declare function getLocalDate(date: Date | string | null | undefined): Date | null;
/**
 * Get UTC date key from UTC datetime string
 * Converts UTC datetime to UTC date (YYYY-MM-DD)
 * This preserves the original UTC date without timezone conversion
 *
 * @param date - UTC datetime string or Date object from database
 * @returns UTC date in YYYY-MM-DD format
 *
 * @example
 * // Database stores UTC: "2025-10-27T17:00:00Z"
 * // This function returns: "2025-10-27" (no timezone conversion)
 * getUTCDateKey("2025-10-27T17:00:00Z") // "2025-10-27"
 */
declare function getUTCDateKey(date: Date | string | null | undefined): string;

/**
 * Audit Logging Configuration
 *
 * This module provides a configurable audit logging system with tiered approach
 * and smart filtering to optimize performance while maintaining comprehensive coverage.
 */
interface AuditEntityConfig {
    enabled: boolean;
    logLevel: 'ALL' | 'CREATE_UPDATE_DELETE' | 'CREATE_DELETE' | 'CRITICAL_ONLY';
    fields: {
        include: string[];
        exclude: string[];
        sensitive: string[];
    };
    sampling: {
        enabled: boolean;
        rate: number;
    };
    async: boolean;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
}
interface AuditConfig {
    global: {
        enabled: boolean;
        async: boolean;
        retentionDays: number;
        maxLogSize: number;
    };
    entities: Record<string, AuditEntityConfig>;
    performance: {
        maxLogTime: number;
        batchSize: number;
        queueSize: number;
    };
    features: {
        changeDetection: boolean;
        fieldLevelTracking: boolean;
        userContext: boolean;
        networkContext: boolean;
    };
}
declare const defaultAuditConfig: AuditConfig;
declare function getAuditConfig(): AuditConfig;
declare function shouldLogEntity(entityType: string, action: string): boolean;
declare function shouldLogField(entityType: string, fieldName: string): boolean;
declare function shouldSample(entityType: string): boolean;
declare function getAuditEntityConfig(entityType: string): AuditEntityConfig | null;
declare function sanitizeFieldValue(entityType: string, fieldName: string, value: any): any;
declare class AuditPerformanceMonitor {
    private metrics;
    startTimer(): () => number;
    private updateMetrics;
    recordFailure(): void;
    getMetrics(): {
        failureRate: number;
        performance: {
            averageTime: number;
            maxTime: number;
            isHealthy: boolean;
        };
        totalLogs: number;
        failedLogs: number;
        totalTime: number;
        averageTime: number;
        maxTime: number;
    };
    reset(): void;
}
declare const auditPerformanceMonitor: AuditPerformanceMonitor;

/**
 * Audit Helper Utilities
 *
 * This module provides helper functions to make audit logging easier
 * across all API routes and database operations with selective logging.
 */

interface AuditHelperContext {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    merchantId?: string;
    outletId?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
}
declare class AuditHelper {
    private auditLogger;
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Log a CREATE operation with selective logging
     */
    logCreate(params: {
        entityType: string;
        entityId: string;
        entityName?: string;
        newValues: Record<string, any>;
        description?: string;
        context: AuditHelperContext;
        severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    }): Promise<void>;
    /**
     * Log an UPDATE operation with selective logging
     */
    logUpdate(params: {
        entityType: string;
        entityId: string;
        entityName?: string;
        oldValues: Record<string, any>;
        newValues: Record<string, any>;
        changes?: Record<string, {
            old: any;
            new: any;
        }>;
        description?: string;
        context: AuditHelperContext;
        severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    }): Promise<void>;
    /**
     * Log a DELETE operation
     */
    logDelete(params: {
        entityType: string;
        entityId: string;
        entityName?: string;
        oldValues: Record<string, any>;
        description?: string;
        context: AuditHelperContext;
        severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    }): Promise<void>;
    /**
     * Log a custom action
     */
    logCustom(params: {
        action: string;
        entityType: string;
        entityId: string;
        entityName?: string;
        description: string;
        context: AuditHelperContext;
        severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Calculate changes between old and new values
     */
    private calculateChanges;
    /**
     * Sanitize values based on entity configuration
     */
    private sanitizeValues;
    /**
     * Filter changes to only include significant ones
     */
    private filterSignificantChanges;
    /**
     * Transform helper context to audit context
     */
    private transformContext;
}
/**
 * Create an audit helper instance
 */
declare function createAuditHelper(prisma: PrismaClient): AuditHelper;
/**
 * Quick audit logging functions for common operations
 */
declare function quickAuditLog(prisma: PrismaClient, operation: 'CREATE' | 'UPDATE' | 'DELETE', entityType: string, entityId: string, context: AuditHelperContext, options?: {
    entityName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    description?: string;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
}): Promise<void>;

interface AuthResponse {
    token: string;
    user: User;
}
interface RegisterResponse {
    user: User;
    requiresEmailVerification?: boolean;
    subscription?: {
        planName: string;
        trialEnd: Date;
        daysRemaining: number;
    };
}
/**
 * Authentication API client
 */
declare const authApi: {
    /**
     * Login user
     */
    login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>>;
    /**
     * Register new user
     */
    register(userData: RegisterData): Promise<ApiResponse<RegisterResponse>>;
    /**
     * Verify authentication token
     */
    verifyToken(): Promise<ApiResponse<User>>;
    /**
     * Refresh authentication token
     */
    refreshToken(): Promise<ApiResponse<{
        token: string;
    }>>;
    /**
     * Logout user
     */
    logout(): Promise<ApiResponse<void>>;
    /**
     * Request password reset
     */
    requestPasswordReset(email: string): Promise<ApiResponse<void>>;
    /**
     * Reset password with token
     */
    resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>>;
    /**
     * Change password (authenticated)
     */
    changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>>;
    /**
     * Resend verification email
     */
    resendVerificationEmail(email: string): Promise<ApiResponse<{
        message: string;
    }>>;
};

interface ProductsResponse {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
}
interface ProductAvailabilityRequest {
    startDate?: string;
    endDate?: string;
    quantity?: number;
    includeTimePrecision?: boolean;
    timeZone?: string;
}
interface ProductAvailabilityResponse {
    productId: number;
    productName: string;
    totalStock: number;
    totalAvailableStock: number;
    totalRenting: number;
    requestedQuantity: number;
    rentalPeriod?: {
        startDate: string;
        endDate: string;
        startDateLocal: string;
        endDateLocal: string;
        durationMs: number;
        durationHours: number;
        durationDays: number;
        timeZone: string;
        includeTimePrecision: boolean;
    };
    isAvailable: boolean;
    stockAvailable: boolean;
    hasNoConflicts: boolean;
    availabilityByOutlet: Array<{
        outletId: number;
        outletName: string;
        stock: number;
        available: number;
        renting: number;
        conflictingQuantity: number;
        effectivelyAvailable: number;
        canFulfillRequest: boolean;
        conflicts: Array<{
            orderNumber: string;
            customerName: string;
            pickupDate: string;
            returnDate: string;
            pickupDateLocal: string;
            returnDateLocal: string;
            quantity: number;
            conflictDuration: number;
            conflictHours: number;
            conflictType: 'pickup_overlap' | 'return_overlap' | 'period_overlap' | 'complete_overlap';
        }>;
    }>;
    bestOutlet?: {
        outletId: number;
        outletName: string;
        effectivelyAvailable: number;
    };
    totalConflictsFound: number;
    message: string;
}
/**
 * Products API client for product management operations
 */
declare const productsApi: {
    /**
     * Get all products
     */
    getProducts(): Promise<ApiResponse<Product[]>>;
    /**
     * Get products with pagination
     */
    getProductsPaginated(page?: number, limit?: number): Promise<ApiResponse<ProductsResponse>>;
    /**
     * Search products with filters
     */
    searchProducts(filters: ProductFilters): Promise<ApiResponse<Product[]>>;
    /**
     * Search products for a specific merchant (admin context)
     */
    searchMerchantProducts(merchantId: number, filters: ProductFilters): Promise<ApiResponse<Product[]>>;
    /**
     * Get product by ID
     */
    getProduct(productId: number): Promise<ApiResponse<ProductWithStock>>;
    /**
     * Get product by ID (alias for getProduct for backward compatibility)
     */
    getProductById(productId: number): Promise<ApiResponse<ProductWithStock>>;
    /**
     * Create a new product
     */
    createProduct(productData: ProductCreateInput$1): Promise<ApiResponse<Product>>;
    /**
     * Create a new product with multipart form data (includes file uploads)
     */
    createProductWithFiles(productData: ProductCreateInput$1, files?: File[]): Promise<ApiResponse<Product>>;
    /**
     * Update an existing product
     */
    updateProduct(productId: number, productData: ProductUpdateInput$1): Promise<ApiResponse<Product>>;
    /**
     * Delete a product
     */
    deleteProduct(productId: number): Promise<ApiResponse<void>>;
    /**
     * Get products by category
     */
    getProductsByCategory(categoryId: number): Promise<ApiResponse<Product[]>>;
    /**
     * Get products by outlet
     */
    getProductsByOutlet(outletId: number): Promise<ApiResponse<Product[]>>;
    /**
     * Update product stock
     */
    updateProductStock(productId: number, stock: number): Promise<ApiResponse<Product>>;
    /**
     * Bulk update products
     */
    bulkUpdateProducts(updates: Array<{
        id: number;
        data: Partial<ProductUpdateInput$1>;
    }>): Promise<ApiResponse<Product[]>>;
    /**
     * Check product availability with rental period and booking conflicts
     */
    checkProductAvailability(productId: number, request?: ProductAvailabilityRequest): Promise<ApiResponse<ProductAvailabilityResponse>>;
};

interface CustomerApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: any;
}
interface CustomerSearchResponse {
    customers: any[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
interface CustomerListResponse {
    customers: any[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
}
declare const customersApi: {
    /**
     * Get all customers
     */
    getCustomers(): Promise<CustomerApiResponse>;
    /**
     * Get customers with pagination
     */
    getCustomersPaginated(page?: number, limit?: number): Promise<CustomerApiResponse<CustomerListResponse>>;
    /**
     * Get customers with filtering and pagination
     */
    getCustomersWithFilters(filters?: CustomerFilters, page?: number, limit?: number): Promise<CustomerApiResponse<CustomerListResponse>>;
    /**
     * Search customers with advanced filters
     */
    searchCustomers(filters?: CustomerSearchFilter): Promise<CustomerApiResponse<CustomerSearchResponse>>;
    /**
     * Get customer by ID
     */
    getCustomerById(customerId: number): Promise<CustomerApiResponse>;
    /**
     * Create new customer
     */
    createCustomer(customerData: CustomerInput): Promise<CustomerApiResponse>;
    /**
     * Update customer
     */
    updateCustomer(customerId: number, customerData: CustomerUpdateInput): Promise<CustomerApiResponse>;
    /**
     * Delete customer
     */
    deleteCustomer(customerId: number): Promise<CustomerApiResponse>;
    /**
     * Test customer creation payload validation
     */
    testCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse>;
    /**
     * Debug customer creation payload
     */
    debugCustomerPayload(customerData: CustomerInput): Promise<CustomerApiResponse>;
    /**
     * Validate customer data before sending to API
     */
    validateCustomerData(data: CustomerInput): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Format customer data for API submission
     */
    formatCustomerData(data: CustomerInput): CustomerInput;
};

interface OrdersResponse {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
}
/**
 * Orders API client for order management operations
 */
declare const ordersApi: {
    /**
     * Get all orders
     */
    getOrders(): Promise<ApiResponse<Order[]>>;
    /**
     * Get orders with pagination
     */
    getOrdersPaginated(page?: number, limit?: number): Promise<ApiResponse<OrdersResponse>>;
    /**
     * Search orders with filters
     */
    searchOrders(filters: OrderFilters): Promise<ApiResponse<OrdersResponse>>;
    /**
     * Get order by ID
     */
    getOrder(orderId: number): Promise<ApiResponse<Order>>;
    /**
     * Get order by order number (e.g., "ORD-2110")
     */
    getOrderByNumber(orderNumber: string): Promise<ApiResponse<Order>>;
    /**
     * Create a new order
     */
    createOrder(orderData: OrderCreateInput$1): Promise<ApiResponse<Order>>;
    /**
     * Update an existing order
     */
    updateOrder(orderId: number, orderData: OrderUpdateInput): Promise<ApiResponse<Order>>;
    /**
     * Delete an order
     */
    deleteOrder(orderId: number): Promise<ApiResponse<void>>;
    /**
     * Get orders by customer
     */
    getOrdersByCustomer(customerId: number): Promise<ApiResponse<Order[]>>;
    /**
     * Get orders by outlet
     */
    getOrdersByOutlet(outletId: number): Promise<ApiResponse<Order[]>>;
    /**
     * Get orders by product ID
     */
    getOrdersByProduct(productId: number): Promise<ApiResponse<Order[]>>;
    /**
     * Update order status
     */
    updateOrderStatus(orderId: number, status: string): Promise<ApiResponse<Order>>;
    /**
     * Pickup order (change status to PICKUPED)
     */
    pickupOrder(orderId: number): Promise<ApiResponse<Order>>;
    /**
     * Return order (change status to RETURNED)
     */
    returnOrder(orderId: number): Promise<ApiResponse<Order>>;
    /**
     * Cancel order (change status to CANCELLED)
     */
    cancelOrder(orderId: number): Promise<ApiResponse<Order>>;
    /**
     * Update order settings (damage fee, security deposit, collateral, notes)
     */
    updateOrderSettings(orderId: number, settings: {
        damageFee?: number;
        securityDeposit?: number;
        collateralType?: string;
        collateralDetails?: string;
        notes?: string;
    }): Promise<ApiResponse<Order>>;
    /**
     * Get order statistics
     */
    getOrderStats(): Promise<ApiResponse<any>>;
};

interface OutletsResponse {
    outlets: Outlet[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
/**
 * Outlets API client for outlet management operations
 */
declare const outletsApi: {
    /**
     * Get all outlets
     */
    getOutlets(): Promise<ApiResponse<OutletsResponse>>;
    /**
     * Get outlets with pagination
     */
    getOutletsPaginated(page?: number, limit?: number): Promise<ApiResponse<OutletsResponse>>;
    /**
     * Search outlets by name with filters
     */
    searchOutlets(filters: OutletFilters): Promise<ApiResponse<OutletsResponse>>;
    /**
     * Get outlet by ID
     */
    getOutlet(outletId: number): Promise<ApiResponse<Outlet>>;
    /**
     * Create a new outlet
     */
    createOutlet(outletData: OutletCreateInput$1): Promise<ApiResponse<Outlet>>;
    /**
     * Update an existing outlet
     */
    updateOutlet(outletId: number, outletData: OutletUpdateInput$1): Promise<ApiResponse<Outlet>>;
    /**
     * Delete an outlet
     */
    deleteOutlet(outletId: number): Promise<ApiResponse<void>>;
    /**
     * Get outlets by shop
     */
    getOutletsByShop(shopId: number): Promise<ApiResponse<OutletsResponse>>;
    /**
     * Get outlets by merchant
     */
    getOutletsByMerchant(merchantId: number): Promise<ApiResponse<OutletsResponse>>;
    /**
     * Get outlet statistics
     */
    getOutletStats(): Promise<ApiResponse<any>>;
};

interface MerchantsResponse {
    merchants: Merchant[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
interface MerchantSearchFilters {
    q?: string;
    status?: string;
    plan?: string;
    isActive?: boolean;
    subscriptionStatus?: SubscriptionStatus;
    minRevenue?: number;
    maxRevenue?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
/**
 * Merchants API client for merchant management operations
 */
declare const merchantsApi: {
    /**
     * Get all merchants
     */
    getMerchants(): Promise<ApiResponse<MerchantsResponse>>;
    /**
     * Get merchants with pagination
     */
    getMerchantsPaginated(page?: number, limit?: number): Promise<ApiResponse<MerchantsResponse>>;
    /**
     * Search merchants with filters
     */
    searchMerchants(filters: MerchantSearchFilters): Promise<ApiResponse<MerchantsResponse>>;
    /**
     * Get merchant by ID
     */
    getMerchantById(id: number): Promise<ApiResponse<Merchant>>;
    /**
     * Get merchant detail with full data (subscriptions, outlets, users, etc.)
     */
    getMerchantDetail(id: number): Promise<ApiResponse<Merchant>>;
    /**
     * Create new merchant
     */
    createMerchant(merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>>;
    /**
     * Register new merchant (public endpoint)
     */
    register(data: {
        merchantName: string;
        merchantEmail: string;
        merchantPhone: string;
        merchantDescription: string;
        userEmail: string;
        userPassword: string;
        userFirstName: string;
        userLastName: string;
        userPhone: string;
        outletName: string;
        outletAddress: string;
        outletDescription: string;
    }): Promise<ApiResponse<{
        merchant: Merchant;
        user: any;
    }>>;
    /**
     * Update merchant
     */
    updateMerchant(id: number, merchantData: Partial<Merchant>): Promise<ApiResponse<Merchant>>;
    /**
     * Delete merchant
     */
    deleteMerchant(id: number): Promise<ApiResponse<void>>;
    /**
     * Get merchant statistics
     */
    getMerchantStats(): Promise<ApiResponse<any>>;
    /**
     * Update merchant plan
     */
    updateMerchantPlan(merchantId: number, planData: {
        planId: number;
        reason?: string;
        effectiveDate?: string;
        notifyMerchant?: boolean;
        billingInterval?: string;
        duration?: number;
        discount?: number;
        totalPrice?: number;
    }): Promise<ApiResponse<any>>;
    /**
     * Get merchant plan history
     */
    getMerchantPlanHistory(merchantId: number): Promise<ApiResponse<any>>;
    /**
     * Disable merchant plan
     */
    disableMerchantPlan(merchantId: number, subscriptionId: number, reason: string): Promise<ApiResponse<any>>;
    /**
     * Delete merchant plan
     */
    deleteMerchantPlan(merchantId: number, subscriptionId: number, reason: string): Promise<ApiResponse<any>>;
    /**
     * Merchant Products
     */
    products: {
        list: (merchantId: number) => Promise<Response>;
        get: (merchantId: number, productId: number) => Promise<Response>;
        create: (merchantId: number, data: any) => Promise<Response>;
        update: (merchantId: number, productId: number, data: any) => Promise<Response>;
        delete: (merchantId: number, productId: number) => Promise<Response>;
    };
    /**
     * Merchant Orders
     */
    orders: {
        list: (merchantId: number, queryParams?: string) => Promise<Response>;
        get: (merchantId: number, orderId: number) => Promise<Response>;
        create: (merchantId: number, data: any) => Promise<Response>;
        update: (merchantId: number, orderId: number, data: any) => Promise<Response>;
        delete: (merchantId: number, orderId: number) => Promise<Response>;
    };
    /**
     * Merchant Users
     */
    users: {
        list: (merchantId: number) => Promise<Response>;
        get: (merchantId: number, userId: number) => Promise<Response>;
        create: (merchantId: number, data: any) => Promise<Response>;
        update: (merchantId: number, userId: number, data: any) => Promise<Response>;
        delete: (merchantId: number, userId: number) => Promise<Response>;
    };
    /**
     * Merchant Outlets
     */
    outlets: {
        list: (merchantId: number, queryParams?: string) => Promise<Response>;
        get: (merchantId: number, outletId: number) => Promise<Response>;
        create: (merchantId: number, data: any) => Promise<Response>;
        update: (merchantId: number, outletId: number, data: any) => Promise<Response>;
        delete: (merchantId: number, outletId: number) => Promise<Response>;
    };
    /**
     * Get merchant pricing configuration
     */
    getPricingConfig(merchantId: number): Promise<ApiResponse<{
        merchantId: number;
        merchantName: string;
        businessType: string;
        pricingConfig: any;
    }>>;
    /**
     * Update merchant pricing configuration
     */
    updatePricingConfig(merchantId: number, config: any): Promise<ApiResponse<any>>;
};

interface AnalyticsFilters {
    startDate?: string;
    endDate?: string;
    outletId?: number;
    merchantId?: number;
    groupBy?: 'day' | 'week' | 'month' | 'year';
}
interface RevenueData {
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
}
interface ProductAnalytics {
    productId: number;
    productName: string;
    totalRentals: number;
    totalRevenue: number;
    averageRentalDuration: number;
    popularity: number;
}
interface CustomerAnalytics {
    customerId: number;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: string;
}
/**
 * Analytics API client for business intelligence and reporting
 */
declare const analyticsApi: {
    /**
     * Get revenue analytics
     */
    getRevenueAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<RevenueData[]>>;
    /**
     * Get order analytics
     */
    getOrderAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get product analytics
     */
    getProductAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<ProductAnalytics[]>>;
    /**
     * Get customer analytics
     */
    getCustomerAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<CustomerAnalytics[]>>;
    /**
     * Get inventory analytics
     */
    getInventoryAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get dashboard summary
     */
    getDashboardSummary(period?: "today" | "month" | "year"): Promise<ApiResponse<any>>;
    /**
     * Get system analytics (admin only)
     */
    getSystemAnalytics(filters?: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get recent system activities (admin only)
     */
    getRecentActivities(limit?: number, offset?: number): Promise<ApiResponse<any>>;
    /**
     * Get income analytics
     */
    getIncomeAnalytics(filters?: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get order analytics summary
     */
    getOrderAnalyticsSummary(): Promise<ApiResponse<any>>;
    /**
     * Get top products
     */
    getTopProducts(filters?: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get top customers
     */
    getTopCustomers(filters?: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get recent orders
     */
    getRecentOrders(filters?: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get outlet performance comparison
     */
    getOutletPerformance(filters: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Get seasonal trends
     */
    getSeasonalTrends(filters: AnalyticsFilters): Promise<ApiResponse<any>>;
    /**
     * Export analytics data
     */
    exportAnalytics(filters: AnalyticsFilters, format?: "csv" | "excel"): Promise<ApiResponse<any>>;
    /**
     * Get today's operational metrics
     */
    getTodayMetrics(): Promise<ApiResponse<{
        todayPickups: number;
        todayReturns: number;
        overdueItems: number;
        productUtilization: number;
    }>>;
    /**
     * Get growth metrics
     */
    getGrowthMetrics(filters?: AnalyticsFilters): Promise<ApiResponse<{
        customerGrowth: number;
        revenueGrowth: number;
        customerBase: number;
    }>>;
    /**
     * Get enhanced dashboard summary with all metrics
     */
    getEnhancedDashboardSummary(filters?: AnalyticsFilters): Promise<ApiResponse<{
        totalRevenue: number;
        todayRevenue: number;
        totalOrders: number;
        futureIncome: number;
        todayPickups: number;
        todayReturns: number;
        overdueItems: number;
        productUtilization: number;
        customerGrowth: number;
        revenueGrowth: number;
        customerBase: number;
    }>>;
};

interface CategoriesResponse {
    categories: Category[];
    total: number;
}
/**
 * Categories API client for category management operations
 */
declare const categoriesApi: {
    /**
     * Get all categories
     */
    getCategories(): Promise<ApiResponse<Category[]>>;
    /**
     * Get categories with pagination
     */
    getCategoriesPaginated(page?: number, limit?: number): Promise<ApiResponse<CategoriesResponse>>;
    /**
     * Search categories by name with filters
     */
    searchCategories(filters: CategoryFilters): Promise<ApiResponse<CategoriesResponse>>;
    /**
     * Create a new category
     */
    createCategory(categoryData: Partial<Category>): Promise<ApiResponse<Category>>;
    /**
     * Update an existing category
     */
    updateCategory(categoryId: number, categoryData: Partial<Category>): Promise<ApiResponse<Category>>;
    /**
     * Delete a category
     */
    deleteCategory(categoryId: number): Promise<ApiResponse<any>>;
};

interface Notification {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}
interface NotificationFilters {
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
}
interface NotificationsResponse {
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
}
/**
 * Notifications API client for notification management
 */
declare const notificationsApi: {
    /**
     * Get all notifications
     */
    getNotifications(): Promise<ApiResponse<Notification[]>>;
    /**
     * Get notifications with pagination
     */
    getNotificationsPaginated(page?: number, limit?: number): Promise<ApiResponse<NotificationsResponse>>;
    /**
     * Search notifications with filters
     */
    searchNotifications(filters: NotificationFilters): Promise<ApiResponse<Notification[]>>;
    /**
     * Get notification by ID
     */
    getNotification(notificationId: number): Promise<ApiResponse<Notification>>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: number): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Mark notification as unread
     */
    markAsUnread(notificationId: number): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Delete notification
     */
    deleteNotification(notificationId: number): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Delete all read notifications
     */
    deleteAllRead(): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Get unread count
     */
    getUnreadCount(): Promise<ApiResponse<{
        count: number;
    }>>;
    /**
     * Get notification preferences
     */
    getPreferences(): Promise<ApiResponse<any>>;
    /**
     * Update notification preferences
     */
    updatePreferences(preferences: any): Promise<ApiResponse<any>>;
    /**
     * Send test notification
     */
    sendTestNotification(): Promise<ApiResponse<{
        message: string;
    }>>;
};

/**
 * Profile API client for user profile management
 */
declare const profileApi: {
    /**
     * Get current user profile
     */
    getProfile(): Promise<ApiResponse<User>>;
    /**
     * Update current user profile
     */
    updateProfile(profileData: ProfileUpdateInput): Promise<ApiResponse<User>>;
    /**
     * Change current user password
     */
    changePassword(passwordData: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Upload profile picture
     */
    uploadProfilePicture(file: File): Promise<ApiResponse<{
        imageUrl: string;
    }>>;
    /**
     * Delete profile picture
     */
    deleteProfilePicture(): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Get user preferences
     */
    getPreferences(): Promise<ApiResponse<any>>;
    /**
     * Update user preferences
     */
    updatePreferences(preferences: any): Promise<ApiResponse<any>>;
    /**
     * Get user activity log
     */
    getActivityLog(page?: number, limit?: number): Promise<ApiResponse<any>>;
    /**
     * Get user notifications
     */
    getNotifications(page?: number, limit?: number): Promise<ApiResponse<any>>;
    /**
     * Mark notification as read
     */
    markNotificationAsRead(notificationId: number): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Mark all notifications as read
     */
    markAllNotificationsAsRead(): Promise<ApiResponse<{
        message: string;
    }>>;
};

interface UserApiResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
}
declare const usersApi: {
    /**
     * Get all users
     */
    getUsers(filters?: any, options?: any): Promise<UserApiResponse>;
    /**
     * Get users with pagination
     */
    getUsersPaginated(page?: number, limit?: number): Promise<UserApiResponse>;
    /**
     * Search users with filters
     */
    searchUsers(filters?: any): Promise<UserApiResponse>;
    /**
     * Get user by ID
     */
    getUserById(userId: number): Promise<UserApiResponse>;
    /**
     * Create new user
     */
    createUser(userData: UserCreateInput$1): Promise<UserApiResponse>;
    /**
     * Update user
     */
    updateUser(userId: number, userData: Partial<User>): Promise<UserApiResponse>;
    /**
     * Delete user
     */
    deleteUser(userId: number): Promise<UserApiResponse>;
    /**
     * Update user by public ID
     */
    updateUserByPublicId(userId: number, userData: Partial<User>): Promise<UserApiResponse>;
    /**
     * Activate user by public ID
     */
    activateUserByPublicId(userId: number): Promise<UserApiResponse>;
    /**
     * Deactivate user by public ID
     */
    deactivateUserByPublicId(userId: number): Promise<UserApiResponse>;
    /**
     * Activate user
     */
    activateUser(userId: number): Promise<UserApiResponse>;
    /**
     * Deactivate user
     */
    deactivateUser(userId: number): Promise<UserApiResponse>;
    /**
     * Change user password
     */
    changePassword(userId: number, newPassword: string): Promise<UserApiResponse>;
};

interface PlansResponse {
    plans: Plan[];
    total: number;
    hasMore: boolean;
}
interface PlanStats {
    totalPlans: number;
    activePlans: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalRevenue: number;
}
/**
 * Plans API client for plan management operations
 */
declare const plansApi: {
    /**
     * Get all plans with filters and pagination
     */
    getPlans(filters?: PlanFilters & {
        includeInactive?: boolean;
    }): Promise<ApiResponse<PlansResponse>>;
    /**
     * Get a specific plan by ID
     */
    getPlanById(planId: number): Promise<ApiResponse<Plan>>;
    /**
     * Create a new plan
     */
    createPlan(planData: PlanCreateInput$1): Promise<ApiResponse<Plan>>;
    /**
     * Update an existing plan
     */
    updatePlan(planId: number, planData: PlanUpdateInput$1): Promise<ApiResponse<Plan>>;
    /**
     * Delete a plan (soft delete)
     */
    deletePlan(planId: number): Promise<ApiResponse<any>>;
    /**
     * Get plan statistics
     */
    getPlanStats(): Promise<ApiResponse<PlanStats>>;
    /**
     * Get public plans (for display to users)
     */
    getPublicPlans(): Promise<ApiResponse<Plan[]>>;
};
/**
 * Public plans API client (no authentication required)
 */
declare const publicPlansApi: {
    /**
     * Get public plans with variants (no authentication required)
     */
    getPublicPlansWithVariants(): Promise<ApiResponse<Plan[]>>;
};

interface BillingCycle {
    id: number;
    name: string;
    value: string;
    months: number;
    discount: number;
    description?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}
interface BillingCycleCreateInput {
    name: string;
    value: string;
    months: number;
    discount?: number;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
}
interface BillingCycleUpdateInput {
    name?: string;
    value?: string;
    months?: number;
    discount?: number;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
}
interface BillingCycleFilters {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'value' | 'months' | 'discount' | 'sortOrder' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}
interface BillingCyclesResponse {
    billingCycles: BillingCycle[];
    total: number;
    hasMore: boolean;
}
/**
 * Billing Cycles API client for billing cycle management operations
 */
declare const billingCyclesApi: {
    /**
     * Get all billing cycles with filtering and pagination
     */
    getBillingCycles(filters?: BillingCycleFilters): Promise<ApiResponse<BillingCyclesResponse>>;
    /**
     * Get a specific billing cycle by ID
     */
    getBillingCycle(id: number): Promise<ApiResponse<BillingCycle>>;
    /**
     * Create a new billing cycle
     */
    createBillingCycle(input: BillingCycleCreateInput): Promise<ApiResponse<BillingCycle>>;
    /**
     * Update an existing billing cycle
     */
    updateBillingCycle(id: number, input: BillingCycleUpdateInput): Promise<ApiResponse<BillingCycle>>;
    /**
     * Delete a billing cycle
     */
    deleteBillingCycle(id: number): Promise<ApiResponse<any>>;
    /**
     * Get active billing cycles (for dropdowns and forms)
     */
    getActiveBillingCycles(): Promise<ApiResponse<BillingCyclesResponse>>;
    /**
     * Get billing cycle by value (for internal use)
     */
    getBillingCycleByValue(value: string): Promise<ApiResponse<BillingCycle>>;
};

interface PaymentFilters {
    search?: string;
    status?: string;
    method?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
interface PaymentsResponse {
    payments: Payment[];
    total: number;
    hasMore: boolean;
}
/**
 * Payments API client for subscription payment management operations
 */
declare const paymentsApi: {
    /**
     * Get all payments with filtering and pagination
     */
    getPayments(filters?: PaymentFilters): Promise<ApiResponse<PaymentsResponse>>;
    /**
     * Get a specific payment by ID
     */
    getPayment(id: number): Promise<ApiResponse<Payment>>;
    /**
     * Create a new payment
     */
    createPayment(input: PaymentInput): Promise<ApiResponse<Payment>>;
    /**
     * Update an existing payment
     */
    updatePayment(id: number, input: PaymentUpdateInput): Promise<ApiResponse<Payment>>;
    /**
     * Create a manual payment
     */
    createManualPayment(input: ManualPaymentCreateInput): Promise<ApiResponse<ManualPayment>>;
    /**
     * Delete a payment
     */
    deletePayment(id: number): Promise<ApiResponse<any>>;
    /**
     * Process payment
     */
    processPayment(id: number): Promise<ApiResponse<Payment>>;
    /**
     * Refund payment
     */
    refundPayment(id: number, reason?: string): Promise<ApiResponse<Payment>>;
    /**
     * Get payment statistics
     */
    getPaymentStats(): Promise<ApiResponse<any>>;
    /**
     * Export payments
     */
    exportPayments(filters?: PaymentFilters): Promise<ApiResponse<{
        downloadUrl: string;
    }>>;
};
interface ManualPaymentCreateInput {
    merchantId: number;
    planId: number;
    amount: number;
    currency: string;
    method: string;
    description?: string;
    extendSubscription?: boolean;
    monthsToExtend?: number;
    invoiceNumber?: string;
    transactionId?: string;
    startDate?: string;
    endDate?: string;
}
interface ManualPayment {
    id: number;
    amount: number;
    method: string;
    type: string;
    status: string;
    reference: string;
    notes?: string;
    createdAt: string;
    metadata?: {
        planId: string;
        startDate?: string;
        endDate?: string;
        extendSubscription?: boolean;
        monthsToExtend?: number;
        transactionId?: string;
        currency: string;
    };
}

/**
 * Audit Logs API Client
 *
 * This module provides API client functions for audit logs operations.
 * All API requests should be made through these functions, not directly in UI components.
 */

interface AuditLog {
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    user?: {
        id: number;
        email: string;
        name: string;
        role: string;
    };
    merchant?: {
        id: number;
        name: string;
    };
    outlet?: {
        id: number;
        name: string;
    };
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changes?: Record<string, {
        old: any;
        new: any;
    }>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    description?: string;
    createdAt: string;
}
interface AuditLogFilter {
    action?: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    merchantId?: string;
    outletId?: string;
    severity?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}
interface AuditLogResponse {
    success: boolean;
    data: AuditLog[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
interface AuditLogStats {
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntity: Record<string, number>;
    logsBySeverity: Record<string, number>;
    logsByCategory: Record<string, number>;
    recentActivity: number;
}
interface AuditLogStatsResponse {
    success: boolean;
    data: AuditLogStats;
}
/**
 * Get audit logs with filtering and pagination
 */
declare function getAuditLogs(filter?: AuditLogFilter): Promise<ApiResponse<AuditLog[]>>;
/**
 * Get audit log statistics
 */
declare function getAuditLogStats(filter?: Partial<AuditLogFilter>): Promise<ApiResponse<AuditLogStats>>;
/**
 * Export audit logs (if endpoint exists)
 */
declare function exportAuditLogs(filter?: AuditLogFilter): Promise<Blob>;

interface MerchantSettings {
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessType?: string;
    taxId?: string;
    website?: string;
    description?: string;
}
interface MerchantCurrencyUpdate {
    currency: CurrencyCode;
}
interface UserProfile {
    firstName: string;
    lastName: string;
    phone?: string;
}
interface OutletSettings {
    name: string;
    phone?: string;
    address?: string;
    description?: string;
}
interface BillingInterval {
    id: string;
    name: string;
    duration: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
    isActive: boolean;
}
interface BillingSettings {
    intervals: BillingInterval[];
    defaultInterval?: string;
    autoRenewal: boolean;
    gracePeriod: number;
}
/**
 * Settings API client for user and merchant settings
 */
declare const settingsApi: {
    /**
     * Update merchant settings
     */
    updateMerchantSettings(data: MerchantSettings): Promise<ApiResponse<any>>;
    /**
     * Update merchant information (alias for updateMerchantSettings)
     */
    updateMerchantInfo(data: MerchantSettings): Promise<ApiResponse<any>>;
    /**
     * Get user profile
     */
    getUserProfile(): Promise<ApiResponse<UserProfile>>;
    /**
     * Update user profile
     */
    updateUserProfile(data: UserProfile): Promise<ApiResponse<UserProfile>>;
    /**
     * Update outlet information
     */
    updateOutletInfo(data: OutletSettings): Promise<ApiResponse<any>>;
    /**
     * Get billing settings
     */
    getBillingSettings(): Promise<ApiResponse<BillingSettings>>;
    /**
     * Update billing settings
     */
    updateBillingSettings(data: BillingSettings): Promise<ApiResponse<BillingSettings>>;
    /**
     * Get billing intervals
     */
    getBillingIntervals(): Promise<ApiResponse<BillingInterval[]>>;
    /**
     * Update billing intervals
     */
    updateBillingIntervals(intervals: BillingInterval[]): Promise<ApiResponse<BillingInterval[]>>;
    /**
     * Update merchant currency
     */
    updateMerchantCurrency(data: MerchantCurrencyUpdate): Promise<ApiResponse<any>>;
    /**
     * Get merchant currency
     */
    getMerchantCurrency(): Promise<ApiResponse<{
        currency: string;
    }>>;
};

/**
 * Subscriptions API client for subscription management operations
 */
declare const subscriptionsApi: {
    /**
     * Get all subscriptions
     */
    getSubscriptions(): Promise<ApiResponse<Subscription[]>>;
    /**
     * Get subscriptions with pagination
     */
    getSubscriptionsPaginated(page?: number, limit?: number): Promise<ApiResponse<SubscriptionsResponse>>;
    /**
     * Search subscriptions with filters
     */
    search(filters?: SubscriptionFilters): Promise<ApiResponse<Subscription[]>>;
    /**
     * Get subscription by ID
     */
    getById(id: number): Promise<ApiResponse<Subscription>>;
    /**
     * Create new subscription
     */
    create(data: SubscriptionCreateInput$1): Promise<ApiResponse<Subscription>>;
    /**
     * Update subscription
     */
    update(id: number, data: SubscriptionUpdateInput$1): Promise<ApiResponse<Subscription>>;
    /**
     * Cancel subscription (soft delete)
     */
    cancel(id: number, reason: string): Promise<ApiResponse<Subscription>>;
    /**
     * Change subscription plan
     */
    changePlan(id: number, newPlanId: number): Promise<ApiResponse<Subscription>>;
    /**
     * Extend subscription
     */
    extend(id: number, data: {
        newEndDate: Date | string;
        amount: number;
        method: string;
        description?: string;
    }): Promise<ApiResponse<Subscription>>;
    /**
     * Get subscription status for current user
     * Returns computed subscription status with single source of truth
     */
    getCurrentUserSubscriptionStatus(): Promise<ApiResponse<{
        merchantId: number;
        merchantName: string;
        merchantEmail: string;
        status: "CANCELED" | "EXPIRED" | "PAST_DUE" | "PAUSED" | "TRIAL" | "ACTIVE" | "UNKNOWN";
        statusReason: string;
        hasAccess: boolean;
        daysRemaining: number | null;
        isExpiringSoon: boolean;
        dbStatus: string;
        subscriptionId: number;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
        trialStart: string | null;
        trialEnd: string | null;
        planId: number | null;
        planName: string;
        planDescription: string;
        planPrice: number;
        planCurrency: string;
        planTrialDays: number;
        billingAmount: number;
        billingCurrency: string;
        billingInterval: string;
        billingIntervalCount: number;
        cancelAtPeriodEnd: boolean;
        canceledAt: string | null;
        cancelReason: string | null;
        limits: Record<string, number>;
        usage: {
            outlets: number;
            users: number;
            products: number;
            customers: number;
        };
        features: string[];
    }>>;
    /**
     * Get subscription status by merchant ID
     */
    getSubscriptionStatus(merchantId: number): Promise<ApiResponse<{
        status: string;
        planName: string;
        endDate?: Date | string;
        nextBillingDate?: Date | string;
        amount: number;
        currency: string;
        autoRenew: boolean;
    }>>;
    /**
     * Get subscriptions by merchant
     */
    getSubscriptionsByMerchant(merchantId: number): Promise<ApiResponse<Subscription[]>>;
    /**
     * Get subscription statistics
     */
    getSubscriptionStats(): Promise<ApiResponse<any>>;
    /**
     * Pause/Suspend subscription
     */
    suspend(id: number, data?: {
        reason?: string;
    }): Promise<ApiResponse<Subscription>>;
    /**
     * Resume subscription
     */
    resume(id: number, data?: {
        reason?: string;
    }): Promise<ApiResponse<Subscription>>;
    /**
     * Get subscription activities
     */
    getActivities(id: number, limit?: number): Promise<ApiResponse<any[]>>;
    /**
     * Get subscription payments
     */
    getPayments(id: number, limit?: number): Promise<ApiResponse<any[]>>;
};

interface BackupInfo {
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    type: 'full' | 'incremental';
    status: 'completed' | 'failed' | 'in_progress';
}
interface BackupSchedule {
    id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
}
interface BackupVerification {
    id: string;
    backupId: string;
    status: 'verified' | 'failed' | 'pending';
    checksum: string;
    verifiedAt?: string;
    error?: string;
}
interface SystemStats {
    totalBackups: number;
    totalSize: number;
    lastBackup?: string;
    nextScheduledBackup?: string;
    diskUsage: {
        used: number;
        available: number;
        total: number;
    };
}
/**
 * System API client for system administration operations
 */
declare const systemApi: {
    /**
     * Get all backups
     */
    getBackups(): Promise<ApiResponse<{
        backups: BackupInfo[];
    }>>;
    /**
     * Create a new backup
     */
    createBackup(type?: "full" | "incremental"): Promise<ApiResponse<{
        backupId: string;
    }>>;
    /**
     * Download a backup
     */
    downloadBackup(backupId: string): Promise<Response>;
    /**
     * Delete a backup
     */
    deleteBackup(backupId: string): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Get backup schedules
     */
    getBackupSchedules(): Promise<ApiResponse<{
        schedules: BackupSchedule[];
    }>>;
    /**
     * Create a backup schedule
     */
    createBackupSchedule(schedule: Omit<BackupSchedule, "id">): Promise<ApiResponse<{
        scheduleId: string;
    }>>;
    /**
     * Update a backup schedule
     */
    updateBackupSchedule(scheduleId: string, schedule: Partial<BackupSchedule>): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Delete a backup schedule
     */
    deleteBackupSchedule(scheduleId: string): Promise<ApiResponse<{
        message: string;
    }>>;
    /**
     * Verify a backup
     */
    verifyBackup(backupId: string): Promise<ApiResponse<BackupVerification>>;
    /**
     * Get system statistics
     */
    getSystemStats(): Promise<ApiResponse<SystemStats>>;
    /**
     * Get system health status
     */
    getSystemHealth(): Promise<ApiResponse<{
        status: "healthy" | "warning" | "critical";
        services: Array<{
            name: string;
            status: "up" | "down" | "degraded";
            lastCheck: string;
        }>;
        uptime: number;
    }>>;
    /**
     * Get system logs
     */
    getSystemLogs(page?: number, limit?: number, level?: string): Promise<ApiResponse<{
        logs: Array<{
            id: string;
            level: string;
            message: string;
            timestamp: string;
            source: string;
        }>;
        total: number;
        page: number;
        limit: number;
    }>>;
};

interface CalendarOrderItem {
    id: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    productId?: number;
    productName?: string;
    productBarcode?: string;
    productImages?: string[] | string | null;
    productRentPrice?: number;
    productDeposit?: number;
}
interface CalendarOrderSummary {
    id: number;
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    totalAmount: number;
    status: string;
    outletName?: string;
    notes?: string;
    pickupPlanAt?: string;
    returnPlanAt?: string;
    isOverdue?: boolean;
    duration?: number;
    productName?: string;
    productCount?: number;
    orderItems: CalendarOrderItem[];
}
interface DayOrders {
    pickups: CalendarOrderSummary[];
    total: number;
}
interface CalendarDay {
    date: string;
    orders: CalendarOrderSummary[];
    summary: {
        totalOrders: number;
        totalRevenue: number;
        totalPickups: number;
        totalReturns: number;
        averageOrderValue: number;
    };
}
interface CalendarResponse {
    calendar: CalendarDay[];
    summary: {
        totalOrders: number;
        totalRevenue: number;
        totalPickups: number;
        totalReturns: number;
        averageOrderValue: number;
    };
}
interface CalendarMeta {
    totalDays: number;
    stats: {
        totalPickups: number;
        totalOrders: number;
        totalRevenue: number;
        totalReturns: number;
        averageOrderValue: number;
    };
    dateRange: {
        start: string;
        end: string;
    };
}
interface CalendarApiResponse {
    success: boolean;
    data?: CalendarResponse;
    meta?: CalendarMeta;
    code?: string;
    message?: string;
}
interface CalendarQuery {
    startDate: string;
    endDate: string;
    outletId?: number;
    merchantId?: number;
    status?: string;
    orderType?: string;
    limit?: number;
}
/**
 * 🎯 Calendar API Client
 *
 * Specialized API for calendar display
 * - Optimized for monthly calendar views
 * - Groups orders by date
 * - Limits orders per day for performance
 */
declare const calendarApi: {
    /**
     * Get calendar orders for a specific date range
     *
     * @param query - Calendar query parameters
     * @returns Promise with calendar data grouped by date
     */
    getCalendarOrders(query: CalendarQuery): Promise<CalendarApiResponse>;
    /**
     * Get calendar orders for current month
     */
    getCurrentMonthOrders(outletId?: number): Promise<CalendarApiResponse>;
    /**
     * Get calendar orders for next month
     */
    getNextMonthOrders(outletId?: number): Promise<CalendarApiResponse>;
    /**
     * Get calendar orders for previous month
     */
    getPreviousMonthOrders(outletId?: number): Promise<CalendarApiResponse>;
    /**
     * Get calendar orders for a specific month
     * @param year - Year (e.g., 2025)
     * @param month - Month (1-12)
     * @param outletId - Optional outlet filter
     */
    getMonthOrders(year: number, month: number, outletId?: number): Promise<CalendarApiResponse>;
    /**
     * Get calendar orders for a custom date range
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @param outletId - Optional outlet filter
     * @param options - Additional options
     */
    getDateRangeOrders(startDate: string, endDate: string, outletId?: number, options?: {
        merchantId?: number;
        status?: string;
        orderType?: string;
        limit?: number;
    }): Promise<CalendarApiResponse>;
};

interface UploadResponse {
    success: boolean;
    data?: {
        url: string;
        publicId: string;
        width: number;
        height: number;
        format: string;
        size: number;
        uploadMethod?: 'cloudinary' | 'local' | 'base64';
    };
    message?: string;
    error?: string;
}
interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
    stage: 'preparing' | 'uploading' | 'processing' | 'complete';
}
interface UploadOptions {
    onProgress?: (progress: UploadProgress) => void;
    maxFileSize?: number;
    allowedTypes?: string[];
    folder?: string;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    enableCompression?: boolean;
    compressionQuality?: number;
    maxSizeMB?: number;
}
interface ImageValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}
interface ImageDimensions {
    width: number;
    height: number;
}
/**
 * Validate image file before upload
 *
 * **Why we validate:**
 * - Prevents uploading malicious files (security)
 * - Ensures quality standards (user experience)
 * - Catches errors early before expensive upload operations
 * - Provides helpful feedback to users about issues
 */
declare function validateImage(file: File, options?: UploadOptions): ImageValidationResult;
/**
 * Get image dimensions from file
 */
declare function getImageDimensions(file: File): Promise<ImageDimensions>;
/**
 * Compress image using browser-image-compression library
 *
 * **Why use browser-image-compression:**
 * - Better compression algorithms
 * - Auto WebP conversion
 * - Progress tracking
 * - More reliable than manual canvas compression
 * - Handles various image formats
 */
declare function compressImage(file: File, options?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    quality?: number;
    onProgress?: (progress: number) => void;
}): Promise<File>;
/**
 * Resize image on client-side before upload (legacy method)
 *
 * **Why client-side resize:**
 * - Reduces upload time and bandwidth
 * - Faster user experience
 * - Less server load
 * - Still have server-side optimization as backup
 */
declare function resizeImage(file: File, maxWidth?: number, maxHeight?: number, quality?: number): Promise<File>;
/**
 * Convert file to base64 string
 */
declare function fileToBase64(file: File): Promise<string>;
/**
 * Upload image to server with progress tracking, validation, and fallbacks
 *
 * **Complete upload flow:**
 * 1. Validate image (type, size, quality)
 * 2. Optional client-side resize/optimization
 * 3. Upload with progress tracking
 * 4. Automatic fallback to base64 if upload fails (optional)
 *
 * @param file - Image file to upload
 * @param token - Authentication token
 * @param options - Upload configuration options
 */
declare function uploadImage(file: File, token: string, options?: UploadOptions): Promise<UploadResponse>;
/**
 * Upload multiple images with individual progress tracking
 *
 * @param files - Array of image files to upload
 * @param token - Authentication token
 * @param options - Upload configuration options
 * @param onFileProgress - Callback for individual file progress (optional)
 */
declare function uploadImages(files: File[], token: string, options?: UploadOptions, onFileProgress?: (fileIndex: number, progress: UploadProgress) => void): Promise<UploadResponse[]>;
/**
 * Cancel ongoing upload (for future implementation with AbortController)
 */
declare function createUploadController(): {
    signal: AbortSignal;
    cancel: () => void;
};

declare function createS3Client(): S3Client;
declare let s3Client: S3Client;
declare const BUCKET_NAME: string | undefined;
declare const CLOUDFRONT_DOMAIN: string;
interface S3UploadOptions {
    folder?: string;
    fileName?: string;
    contentType?: string;
    expiresIn?: number;
    preserveOriginalName?: boolean;
}
interface S3StreamUploadOptions extends S3UploadOptions {
    stream?: Readable;
}
interface S3UploadResponse {
    success: boolean;
    data?: {
        url: string;
        key: string;
        bucket: string;
        region: string;
        cdnUrl?: string;
        s3Url?: string;
    };
    error?: string;
}
/**
 * Upload file to AWS S3
 */
declare function uploadToS3(file: Buffer | Uint8Array, options?: S3UploadOptions): Promise<S3UploadResponse>;
/**
 * Upload stream to AWS S3 (Based on Stack Overflow example)
 * This is useful for handling large files or streams directly from multipart form data
 */
declare function uploadStreamToS3(stream: Readable, options?: S3StreamUploadOptions): Promise<S3UploadResponse>;
/**
 * Delete file from AWS S3
 */
declare function deleteFromS3(key: string): Promise<boolean>;
/**
 * Clean up orphaned staging files
 * Used when user uploads images but doesn't create product
 */
declare function cleanupStagingFiles(stagingKeys: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
}>;
/**
 * Move file from staging to production folder in S3
 * This implements the Two-Phase Upload Pattern
 */
declare function commitStagingFiles(stagingKeys: string[], targetFolder?: string): Promise<{
    success: boolean;
    committedKeys: string[];
    errors: string[];
}>;
/**
 * Generate presigned URL for direct upload
 */
declare function generatePresignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string | null>;
/**
 * Generate clean S3 URL for file access (direct or CDN)
 */
declare function generateAccessUrl(key: string, expiresIn?: number): Promise<string | null>;
/**
 * Process product images - return CloudFront URLs as-is
 */
declare function processProductImages(images: string | string[] | null | undefined, expiresIn?: number): Promise<string[]>;
/**
 * Normalize image key/path to JPG extension
 */
declare function normalizeImageKeyToJpg(key: string): string;
/**
 * Normalize image URL to JPG extension for consistent display
 */
declare function normalizeImageUrlToJpg(url: string): string;
/**
 * Extract S3 key from URL
 */
declare function extractS3KeyFromUrl(url: string): string | null;
/**
 * Check if URL is from our S3 bucket
 */
declare function isS3Url(url: string): boolean;

type Environment = 'development' | 'production' | 'test' | 'local';
/**
 * Get the appropriate client URL based on environment
 */
declare const getClientUrl: () => string;
/**
 * Get the appropriate admin URL based on environment
 */
declare const getAdminUrl: () => string;
/**
 * Get the appropriate mobile URL based on environment
 */
declare const getMobileUrl: () => string;
/**
 * Get all URLs for the current environment
 */
declare const getEnvironmentUrls: () => {
    client: string;
    admin: string;
    mobile: string;
};
/**
 * Check if running in browser environment
 */
declare const isBrowser: () => boolean;
/**
 * Check if running in server environment
 */
declare const isServer: () => boolean;
/**
 * Check if running in development mode
 */
declare const isDev: () => boolean;
/**
 * Check if running in production mode
 */
declare const isProd: () => boolean;
/**
 * Check if running in test mode
 */
declare const isTest: () => boolean;

interface ApiConfig {
    database: {
        url: string;
        type: 'sqlite' | 'postgresql';
    };
    auth: {
        jwtSecret: string;
        expiresIn: string;
    };
    cors: {
        origins: string[];
    };
    features: {
        emailVerification: boolean;
        analytics: boolean;
        rateLimiting: boolean;
    };
    urls: {
        client: string;
        admin: string;
        api: string;
        mobile?: string;
    };
    logging: {
        level: string;
        format: string;
    };
    security: {
        rateLimitMax: number;
        rateLimitWindow: string;
    };
}
interface ApiUrls {
    base: string;
    auth: {
        login: string;
        register: string;
        verify: string;
        refresh: string;
        logout: string;
        forgotPassword: string;
        resetPassword: string;
        changePassword: string;
        resendVerification: string;
    };
    categories: {
        list: string;
        create: string;
        update: (id: number) => string;
        delete: (id: number) => string;
    };
    products: {
        list: string;
        create: string;
        update: (id: number) => string;
        delete: (id: number) => string;
        updateStock: (id: number) => string;
        bulkUpdate: string;
        availability: (id: number) => string;
    };
    orders: {
        list: string;
        create: string;
        update: (id: number) => string;
        delete: (id: number) => string;
        getByNumber: (orderNumber: string) => string;
        updateStatus: (id: number) => string;
        stats: string;
    };
    customers: {
        list: string;
        create: string;
        update: (id: number) => string;
        delete: (id: number) => string;
        stats: string;
    };
    outlets: {
        list: string;
        create: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        stats: string;
    };
    users: {
        list: string;
        create: string;
        update: (id: number) => string;
        delete: (id: number) => string;
        updateRole: (id: number) => string;
        updateStatus: (id: number) => string;
        assignOutlet: (id: number) => string;
        deleteAccount: string;
        updateByPublicId: (id: number) => string;
        activateByPublicId: (id: number) => string;
        deactivateByPublicId: (id: number) => string;
        deleteByPublicId: (id: number) => string;
    };
    plans: {
        list: string;
        create: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        stats: string;
        public: string;
    };
    planVariants: {
        list: string;
        create: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        bulk: string;
        recycle: string;
        restore: (id: number) => string;
        stats: string;
    };
    billingCycles: {
        list: string;
        create: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
    };
    payments: {
        list: string;
        create: string;
        manual: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        process: (id: number) => string;
        refund: (id: number) => string;
        stats: string;
        export: string;
    };
    subscriptions: {
        list: string;
        create: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        extend: (id: number) => string;
        status: string;
        stats: string;
    };
    analytics: {
        dashboard: string;
        system: string;
        revenue: string;
        orders: string;
        income: string;
        topProducts: string;
        topCustomers: string;
        recentOrders: string;
        recentActivities: string;
        inventory: string;
        outletPerformance: string;
        seasonalTrends: string;
        export: string;
        todayMetrics: string;
        growthMetrics: string;
        enhancedDashboard: string;
    };
    merchants: {
        list: string;
        create: string;
        register: string;
        get: (id: number) => string;
        update: (id: number) => string;
        delete: (id: number) => string;
        updatePlan: (id: number) => string;
        getPlan: (id: number) => string;
        extendPlan: (id: number) => string;
        cancelPlan: (id: number) => string;
        pricing: {
            get: (id: number) => string;
            update: (id: number) => string;
        };
        products: {
            list: (merchantId: number) => string;
            get: (merchantId: number, productId: number) => string;
            create: (merchantId: number) => string;
            update: (merchantId: number, productId: number) => string;
            delete: (merchantId: number, productId: number) => string;
        };
        orders: {
            list: (merchantId: number) => string;
            get: (merchantId: number, orderId: number) => string;
            create: (merchantId: number) => string;
            update: (merchantId: number, orderId: number) => string;
            delete: (merchantId: number, orderId: number) => string;
        };
        users: {
            list: (merchantId: number) => string;
            get: (merchantId: number, userId: number) => string;
            create: (merchantId: number) => string;
            update: (merchantId: number, userId: number) => string;
            delete: (merchantId: number, userId: number) => string;
        };
        outlets: {
            list: (merchantId: number) => string;
            get: (merchantId: number, outletId: number) => string;
            create: (merchantId: number) => string;
            update: (merchantId: number, outletId: number) => string;
            delete: (merchantId: number, outletId: number) => string;
        };
    };
    settings: {
        merchant: string;
        user: string;
        outlet: string;
        billing: string;
        currency: string;
        changePassword: string;
        uploadPicture: string;
        deletePicture: string;
        preferences: string;
        activityLog: string;
        profileNotifications: string;
        markNotificationRead: (id: number) => string;
        markAllNotificationsRead: string;
    };
    system: {
        backup: string;
        backupSchedule: string;
        backupVerify: string;
        stats: string;
        health: string;
        logs: string;
    };
    notifications: {
        list: string;
        get: (id: number) => string;
        markRead: (id: number) => string;
        markUnread: (id: number) => string;
        markAllRead: string;
        delete: (id: number) => string;
        deleteAllRead: string;
        unreadCount: string;
        preferences: string;
        test: string;
    };
    auditLogs: {
        list: string;
        stats: string;
        export: string;
    };
    calendar: {
        orders: string;
    };
}
declare const apiConfig: ApiConfig;
declare const apiEnvironment: Environment;
declare const apiUrls: ApiUrls;
declare const getCurrentEnvironment: () => Environment;
declare const isLocal: () => boolean;
declare const isDevelopment: () => boolean;
declare const isProduction: () => boolean;
declare const getApiBaseUrl: () => string;
declare const buildApiUrl: (endpoint: string) => string;
declare const getApiUrl: () => string;
declare const API_BASE_URL: string;
declare const getApiDatabaseUrl: () => string;
declare const getApiJwtSecret: () => string;
declare const getApiCorsOrigins: () => string[];

interface DatabaseConfig {
    url: string;
    provider: 'sqlite' | 'postgresql';
}
declare function getDatabaseConfig(): DatabaseConfig;
declare function isLocalEnvironment(): boolean;
declare function isDevelopmentEnvironment(): boolean;
declare function isProductionEnvironment(): boolean;
declare const databaseConfig: DatabaseConfig;

/**
 * Error Display Utilities
 *
 * Utilities for displaying translated error messages in the UI.
 * This file provides helpers to convert API error responses into user-friendly translated messages.
 */
/**
 * Get error message for display
 *
 * This function extracts the error code from an API error response
 * and returns it so it can be translated client-side.
 *
 * Usage with translation hook:
 * ```typescript
 * const te = useErrorTranslations();
 * const errorKey = getDisplayErrorKey(error);
 * const translatedMessage = te(errorKey);
 * ```
 *
 * @param error - API error response or error object
 * @returns Error code to use as translation key
 */
declare function getDisplayErrorKey(error: any): string;
/**
 * Check if error has a translatable error code
 *
 * @param error - Error object
 * @returns true if error has a valid error code
 */
declare function hasTranslatableError(error: any): boolean;
/**
 * Extract error details for additional context
 *
 * @param error - Error object
 * @returns Error details string if available
 */
declare function getErrorDetails(error: any): string | undefined;

/**
 * Breadcrumb Helper Utilities
 *
 * Centralized breadcrumb generators for consistent navigation across the app
 */
interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React.ReactNode;
}
/**
 * Products Module Breadcrumbs
 */
declare const productBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (productName: string, productId: number) => BreadcrumbItem[];
    edit: (productName: string, productId: number) => BreadcrumbItem[];
    orders: (productName: string, productId: number) => BreadcrumbItem[];
};
/**
 * Orders Module Breadcrumbs
 */
declare const orderBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (orderNumber: string) => BreadcrumbItem[];
    edit: (orderNumber: string, orderId: string) => BreadcrumbItem[];
    create: () => BreadcrumbItem[];
};
/**
 * Customers Module Breadcrumbs
 */
declare const customerBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (customerName: string, customerId: number) => BreadcrumbItem[];
    edit: (customerName: string, customerId: number) => BreadcrumbItem[];
    orders: (customerName: string, customerId: number) => BreadcrumbItem[];
};
/**
 * Users Module Breadcrumbs
 */
declare const userBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (userName: string, userId: number) => BreadcrumbItem[];
    edit: (userName: string, userId: number) => BreadcrumbItem[];
};
/**
 * Outlets Module Breadcrumbs
 */
declare const outletBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (outletName: string, outletId: number) => BreadcrumbItem[];
};
/**
 * Subscriptions Module Breadcrumbs (Admin)
 */
declare const subscriptionBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (subscriptionId: number, merchantName?: string) => BreadcrumbItem[];
};
/**
 * Merchants Module Breadcrumbs (Admin)
 */
declare const merchantBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (merchantName: string, merchantId: number) => BreadcrumbItem[];
    orders: (merchantName: string, merchantId: number) => BreadcrumbItem[];
    orderDetail: (merchantName: string, merchantId: number, orderNumber: string, orderId: string) => BreadcrumbItem[];
    orderEdit: (merchantName: string, merchantId: number, orderNumber: string, orderId: string) => BreadcrumbItem[];
};
/**
 * Categories Module Breadcrumbs
 */
declare const categoryBreadcrumbs: {
    list: () => BreadcrumbItem[];
};
/**
 * Reports Module Breadcrumbs
 */
declare const reportBreadcrumbs: {
    list: () => BreadcrumbItem[];
    detail: (reportType: string) => BreadcrumbItem[];
};
/**
 * Settings Module Breadcrumbs
 */
declare const settingsBreadcrumbs: {
    main: () => BreadcrumbItem[];
    section: (sectionName: string) => BreadcrumbItem[];
};

interface PerformanceMetrics {
    queryName: string;
    duration: number;
    timestamp: Date;
    slowQuery?: boolean;
    recordCount?: number;
    error?: string;
}
declare class PerformanceMonitor {
    private static metrics;
    private static slowQueryThreshold;
    private static maxMetrics;
    /**
     * Measure query performance with automatic logging
     */
    static measureQuery<T>(name: string, query: () => Promise<T>, recordCount?: number): Promise<T>;
    /**
     * Log performance metric
     */
    private static logMetric;
    /**
     * Get performance statistics
     */
    static getStats(queryName?: string): {
        totalQueries: number;
        slowQueries: number;
        averageDuration: number;
        slowestQuery: PerformanceMetrics | null;
        recentSlowQueries: PerformanceMetrics[];
    };
    /**
     * Get slow queries for analysis
     */
    static getSlowQueries(threshold?: number): PerformanceMetrics[];
    /**
     * Clear performance metrics
     */
    static clearMetrics(): void;
    /**
     * Export metrics for analysis
     */
    static exportMetrics(): PerformanceMetrics[];
    /**
     * Set slow query threshold
     */
    static setSlowQueryThreshold(threshold: number): void;
}
/**
 * Database connection monitoring
 */
declare class DatabaseMonitor {
    private static connectionCount;
    private static activeQueries;
    /**
     * Track database connection
     */
    static trackConnection(): void;
    /**
     * Track query start
     */
    static trackQueryStart(queryName: string): void;
    /**
     * Track query end
     */
    static trackQueryEnd(queryName: string): void;
    /**
     * Get database stats
     */
    static getStats(): {
        connectionCount: number;
        activeQueries: number;
    };
}
/**
 * Memory usage monitoring
 */
declare class MemoryMonitor {
    /**
     * Get current memory usage
     */
    static getMemoryUsage(): {
        used: number;
        total: number;
        percentage: number;
    };
    /**
     * Log memory usage
     */
    static logMemoryUsage(context?: string): void;
    /**
     * Check if memory usage is high
     */
    static isHighMemoryUsage(threshold?: number): boolean;
}
/**
 * API response time monitoring
 */
declare class APIMonitor {
    /**
     * Measure API endpoint performance
     */
    static measureEndpoint<T>(method: string, path: string, handler: () => Promise<T>): Promise<T>;
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    fromName?: string;
}
interface EmailVerificationData {
    name: string;
    email: string;
    verificationUrl: string;
}
/**
 * Send email using AWS SES or console (for development)
 */
declare function sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
/**
 * Generate email verification email HTML
 */
declare function generateVerificationEmail(data: EmailVerificationData): string;
/**
 * Send email verification email
 */
declare function sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;

export { APIMonitor, API_BASE_URL, type AnalyticsFilters, type ApiConfig, ApiError, type ApiResponse, type ApiUrls, type AuditConfig, type AuditEntityConfig, AuditHelper, type AuditHelperContext, type AuditLog, type AuditLogFilter, type AuditLogResponse, type AuditLogStats, type AuditLogStatsResponse, AuditPerformanceMonitor, type AuthResponse, type AvailabilityBadgeProps, BUCKET_NAME, type BackupInfo, type BackupSchedule, type BackupVerification, type BadgeConfig, type BillingCycle, type BillingCycleCreateInput, type BillingCycleFilters, type BillingCycleUpdateInput, type BillingCyclesResponse, type BillingInterval, type BillingSettings, type BreadcrumbItem, CLOUDFRONT_DOMAIN, type CalculatedPricing, type CalendarApiResponse, type CalendarDay, type CalendarMeta, type CalendarOrderItem, type CalendarOrderSummary, type CalendarQuery, type CalendarResponse, type CategoriesResponse, type CustomerAnalytics, type CustomerApiResponse, type CustomerListResponse, type CustomerSearchResponse, DEFAULT_CURRENCIES, DEFAULT_CURRENCY_SETTINGS, type DatabaseConfig, DatabaseMonitor, type DateFormatOptions, type DayOrders, DuplicateError, ERROR_MESSAGES, ERROR_STATUS_CODES, type EmailOptions, type EmailVerificationData, type Environment, ErrorCode, type ErrorInfo, type ErrorType, ForbiddenError, type ImageDimensions, type ImageValidationResult, type LocationBadgeProps, type LoginInput, type ManualPayment, type ManualPaymentCreateInput, MemoryMonitor, type MerchantCurrencyUpdate, type MerchantSearchFilters, type MerchantSettings, type MerchantsResponse, NotFoundError, type Notification, type NotificationFilters, type NotificationsResponse, type OrderCreateInput, type OrderUpdatePayload, type OrdersQuery, type OrdersResponse, type OutletCreateInput, type OutletSettings, type OutletUpdateInput, type OutletsQuery, type OutletsResponse, type PaymentFilters, type PaymentGatewayConfig, type PaymentGatewayManager, type PaymentsResponse, type PerformanceMetrics, PerformanceMonitor, type PlanCreateInput, PlanLimitError, type PlanLimitsInfo, type PlanLimitsValidationResult, type PlanStats, type PlanUpdateInput, type PlanVariantCreateInput, type PlanVariantUpdateInput, type PlanVariantsQuery, type PlansQuery, type PlansResponse, type PricingBreakdown, type PricingConfig, type PricingInfo, PricingResolver, PricingValidator, type ProductAnalytics, type ProductAvailabilityRequest, type ProductAvailabilityResponse, type ProductCreateInput, type ProductUpdateInput, type ProductsQuery, type ProductsResponse, type ProrationCalculation, type RegisterInput, type RegisterResponse, type RenewalConfig, type RenewalResult, type RenewalStats, type RentalInput, type RentalPeriodValidation, ResponseBuilder, type RevenueData, type RoleBadgeProps, type S3StreamUploadOptions, type S3UploadOptions, type S3UploadResponse, type StatusBadgeProps, type StoredUser, type SubscriptionCreateInput, SubscriptionManager, type SubscriptionPeriod, type SubscriptionRenewalConfig, type SubscriptionRenewalResult, type SubscriptionUpdateInput, type SubscriptionValidationOptions, type SubscriptionValidationResult, type SubscriptionsQuery, type SystemStats, UnauthorizedError, type UploadOptions, type UploadProgress, type UploadResponse, type UserApiResponse, type UserCreateInput, type UserProfile, type UserUpdateInput, type UsersQuery, ValidationError, type ValidationResult, addDaysToDate, analyticsApi, analyzeError, apiConfig, apiEnvironment, apiUrls, assertPlanLimit, auditPerformanceMonitor, authApi, authenticatedFetch, billingCyclesApi, buildApiUrl, calculateCustomerStats, calculateDiscountedPrice, calculateNewBillingDate, calculateProductStats, calculateProratedAmount, calculateProration, calculateRenewalPrice, calculateSavings, calculateStockPercentage, calculateSubscriptionPeriod, calculateSubscriptionPrice, calculateUserStats, calendarApi, canCreateUsers, canPerformOperation, canRentProduct, canSellProduct, capitalizeWords, categoriesApi, categoriesQuerySchema, categoryBreadcrumbs, checkSubscriptionStatus, cleanupStagingFiles, clearAuthData, commitStagingFiles, compareOrderNumberFormats, compressImage, convertCurrency, createApiUrl, createAuditHelper, createErrorResponse, createPaymentGatewayManager, createS3Client, createUploadController, customerBreadcrumbs, customerCreateSchema, customerUpdateSchema, customersApi, customersQuerySchema, databaseConfig, debounce, defaultAuditConfig, delay, deleteFromS3, exportAuditLogs, extractS3KeyFromUrl, fileToBase64, filterCustomers, filterProducts, filterUsers, formatBillingCycle, formatChartPeriod, formatCurrency, formatCurrencyAdvanced, formatCustomerForDisplay, formatDailyByLocale, formatDate, formatDateByLocale, formatDateLong, formatDateShort, formatDateTime, formatDateTimeByLocale, formatDateTimeLong, formatDateTimeShort, formatDateWithLocale, formatFullDateByLocale, formatMonthOnlyByLocale, formatPhoneNumber, formatProductPrice, formatProration, formatSubscriptionPeriod, formatTimeByLocale, generateAccessUrl, generatePresignedUrl, generateRandomString, generateSlug, generateTenantKeyFromName, generateVerificationEmail, getAdminUrl, getAllPricingOptions, getAllowedOperations, getApiBaseUrl, getApiCorsOrigins, getApiDatabaseUrl, getApiJwtSecret, getApiUrl, getAuditConfig, getAuditEntityConfig, getAuditLogStats, getAuditLogs, getAuthToken, getAvailabilityBadge, getAvailabilityBadgeConfig, getBillingCycleDiscount, getClientUrl, getCurrency, getCurrencyDisplay, getCurrentCurrency, getCurrentDate, getCurrentEntityCounts, getCurrentEnvironment, getCurrentUser, getCustomerAddress, getCustomerAge, getCustomerContactInfo, getCustomerFullName, getCustomerIdTypeBadge, getCustomerLocationBadge, getCustomerStatusBadge, getDatabaseConfig, getDateLocale, getDaysDifference, getDiscountPercentage, getDisplayErrorKey, getEnvironmentUrls, getErrorCode, getErrorDetails, getErrorStatusCode, getErrorTranslationKey, getExchangeRate, getFormatRecommendations, getImageDimensions, getInitials, getLocalDate, getLocalDateKey, getLocationBadge, getLocationBadgeConfig, getMobileUrl, getOutletStats, getPlanLimitError, getPlanLimitErrorMessage, getPlanLimitsInfo, getPriceTrendBadge, getPriceTrendBadgeConfig, getPricingBreakdown, getPricingComparison, getProductAvailabilityBadge, getProductCategoryName, getProductDisplayName, getProductImageUrl, getProductOutletName, getProductStatusBadge, getProductStockStatus, getProductTypeBadge, getRoleBadge, getRoleBadgeConfig, getStatusBadge, getStatusBadgeConfig, getStoredUser, getSubscriptionError, getSubscriptionStatusBadge, getSubscriptionStatusPriority, getToastType, getTomorrow, getUTCDateKey, getUserFullName, getUserRoleBadge, getUserStatusBadge, handleApiError, handleApiErrorForUI, handleApiResponse, handleBusinessError, handlePrismaError, handleValidationError, hasTranslatableError, isAuthError, isAuthenticated, isBrowser, isDateAfter, isDateBefore, isDev, isDevelopment, isDevelopmentEnvironment, isEmpty, isErrorResponse, isGracePeriodExceeded, isLocal, isLocalEnvironment, isNetworkError, isPermissionError, isProd, isProduction, isProductionEnvironment, isS3Url, isServer, isSubscriptionExpired, isSuccessResponse, isTest, isValidCurrencyCode, isValidEmail, isValidErrorCode, isValidPhone, isValidationError, loginSchema, memoize, merchantBreadcrumbs, merchantsApi, migrateOrderNumbers, normalizeImageKeyToJpg, normalizeImageUrlToJpg, normalizeWhitespace, notificationsApi, once, orderBreadcrumbs, orderCreateSchema, orderUpdateSchema, ordersApi, ordersQuerySchema, outletBreadcrumbs, outletCreateSchema, outletUpdateSchema, outletsApi, outletsQuerySchema, parseApiResponse, parseCurrency, paymentsApi, planCreateSchema, planUpdateSchema, planVariantCreateSchema, planVariantUpdateSchema, planVariantsQuerySchema, plansApi, plansQuerySchema, pricingCalculator, processProductImages, productBreadcrumbs, productCreateSchema, productUpdateSchema, productsApi, productsQuerySchema, profileApi, publicFetch, publicPlansApi, quickAuditLog, registerSchema, rentalSchema, reportBreadcrumbs, resizeImage, retry, s3Client, sanitizeFieldValue, sendEmail, sendVerificationEmail, settingsApi, settingsBreadcrumbs, shouldApplyProration, shouldLogEntity, shouldLogField, shouldSample, shouldThrowPlanLimitError, sortProducts, sortSubscriptionsByStatus, storeAuthData, subscriptionBreadcrumbs, subscriptionCreateSchema, subscriptionNeedsAttention, subscriptionUpdateSchema, subscriptionsApi, subscriptionsQuerySchema, systemApi, throttle, timeout, truncateText, uploadImage, uploadImages, uploadStreamToS3, uploadToS3, useFormattedChartPeriod, useFormattedDaily, useFormattedDate, useFormattedDateTime, useFormattedFullDate, useFormattedMonthOnly, userBreadcrumbs, userCreateSchema, userUpdateSchema, usersApi, usersQuerySchema, validateCustomer, validateForRenewal, validateImage, validateOrderNumberFormat, validatePlanLimits, validatePlatformAccess, validateProductPublicCheckAccess, validateSubscriptionAccess, withErrorHandlingForUI };
