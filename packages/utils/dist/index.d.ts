import { SubscriptionStatus, BillingInterval as BillingInterval$1, PlanLimits as PlanLimits$1 } from '@rentalshop/constants';
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
    isActive: boolean;
    planId?: number;
    totalRevenue: number;
    lastActiveAt?: Date | string;
    pricingConfig?: MerchantPricingConfig | string;
    plan?: PlanDetails;
    currentSubscription?: CurrentSubscription;
    outlets?: OutletReference[];
    users?: UserReference[];
    customers?: CustomerReference[];
    products?: ProductReference[];
    categories?: any[];
    subscriptions?: any[];
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
 * Current subscription interface
 * Used for active subscription information
 */
interface CurrentSubscription {
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
/**
 * Pricing type enumeration
 */
type PricingType = 'FIXED' | 'HOURLY' | 'DAILY' | 'WEEKLY';
/**
 * Business type enumeration
 */
type BusinessType = 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';
/**
 * Business rules for pricing
 */
interface PricingBusinessRules {
    requireRentalDates: boolean;
    showPricingOptions: boolean;
}
/**
 * Duration limits for time-based pricing
 */
interface PricingDurationLimits {
    minDuration: number;
    maxDuration: number;
    defaultDuration: number;
}
/**
 * Merchant pricing configuration
 */
interface MerchantPricingConfig {
    businessType: BusinessType;
    defaultPricingType: PricingType;
    businessRules: PricingBusinessRules;
    durationLimits: PricingDurationLimits;
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
    images?: string;
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
    images?: string;
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
    images?: string;
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
interface Subscription {
    id: number;
    merchantId: number;
    planId: number;
    status: SubscriptionStatus;
    billingInterval: BillingInterval$1;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
    subscriptionPeriod?: SubscriptionPeriod$1;
    merchant: {
        id: number;
        name: string;
        email: string;
    };
    plan: Plan;
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
    status?: string;
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
interface ApiErrorResponse {
    success: false;
    message: string;
    error: ErrorCode;
    details?: string;
    field?: string;
}
interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
}
type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
declare function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T>;
declare function isErrorResponse(response: ApiResponse<any>): response is ApiErrorResponse;
declare const ERROR_MESSAGES: Record<ErrorCode, string>;
declare const ERROR_STATUS_CODES: Record<ErrorCode, number>;
declare class ApiError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: string;
    readonly field?: string;
    constructor(code: ErrorCode, message?: string, details?: string, field?: string);
    toResponse(): ApiErrorResponse;
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
declare function createErrorResponse(code: ErrorCode, message?: string, details?: string, field?: string): ApiErrorResponse;
declare function createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T>;
declare function handlePrismaError(error: any): ApiError;
declare function handleValidationError(error: any): ApiError;
declare function handleBusinessError(error: any): ApiError;
declare function handleApiError(error: any): {
    response: ApiErrorResponse;
    statusCode: number;
};
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
        month: number;
        quarter: number;
        semiAnnual: number;
        year: number;
    };
    intervals: {
        month: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        quarter: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        semiAnnual: {
            interval: BillingInterval$1;
            intervalCount: number;
        };
        year: {
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
 * Get product's primary image URL
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
    businessType: z.ZodOptional<z.ZodEnum<["CLOTHING", "VEHICLE", "EQUIPMENT", "GENERAL"]>>;
    pricingType: z.ZodOptional<z.ZodEnum<["FIXED", "HOURLY", "DAILY", "WEEKLY"]>>;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    pricingType?: "FIXED" | "HOURLY" | "DAILY" | "WEEKLY" | undefined;
    country?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    zipCode?: string | undefined;
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
    outletStock: z.ZodArray<z.ZodObject<{
        outletId: z.ZodNumber;
        stock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        outletId: number;
        stock: number;
    }, {
        outletId: number;
        stock: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    rentPrice: number;
    salePrice: number;
    deposit: number;
    totalStock: number;
    outletStock: {
        outletId: number;
        stock: number;
    }[];
    merchantId?: number | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    images?: string | string[] | undefined;
}, {
    name: string;
    rentPrice: number;
    salePrice: number;
    totalStock: number;
    outletStock: {
        outletId: number;
        stock: number;
    }[];
    merchantId?: number | undefined;
    description?: string | undefined;
    barcode?: string | undefined;
    categoryId?: number | undefined;
    deposit?: number | undefined;
    images?: string | string[] | undefined;
}>;
declare const productUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rentPrice: z.ZodOptional<z.ZodNumber>;
    salePrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    deposit: z.ZodOptional<z.ZodNumber>;
    images: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    totalStock: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    categoryId?: number | undefined;
    rentPrice?: number | undefined;
    salePrice?: number | null | undefined;
    deposit?: number | undefined;
    totalStock?: number | undefined;
    images?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    categoryId?: number | undefined;
    rentPrice?: number | undefined;
    salePrice?: number | null | undefined;
    deposit?: number | undefined;
    totalStock?: number | undefined;
    images?: string | undefined;
}>;
declare const productsQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
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
    page?: number | undefined;
    limit?: number | undefined;
}>;
declare const orderCreateSchema: z.ZodObject<{
    orderId: z.ZodOptional<z.ZodNumber>;
    orderNumber: z.ZodOptional<z.ZodString>;
    orderType: z.ZodEnum<["RENT", "SALE"]>;
    customerId: z.ZodOptional<z.ZodNumber>;
    outletId: z.ZodNumber;
    pickupPlanAt: z.ZodOptional<z.ZodDate>;
    returnPlanAt: z.ZodOptional<z.ZodDate>;
    rentalDuration: z.ZodOptional<z.ZodNumber>;
    subtotal: z.ZodNumber;
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
    customerName: z.ZodOptional<z.ZodString>;
    customerPhone: z.ZodOptional<z.ZodString>;
    customerEmail: z.ZodOptional<z.ZodString>;
    isReadyToDeliver: z.ZodOptional<z.ZodBoolean>;
    orderItems: z.ZodArray<z.ZodObject<{
        productId: z.ZodNumber;
        quantity: z.ZodNumber;
        unitPrice: z.ZodDefault<z.ZodNumber>;
        totalPrice: z.ZodOptional<z.ZodNumber>;
        deposit: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        daysRented: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        notes?: string | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
    }, {
        productId: number;
        quantity: number;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
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
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        notes?: string | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
    }[];
    subtotal: number;
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
    rentalDuration?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    taxAmount?: number | undefined;
    customerName?: string | undefined;
    customerPhone?: string | undefined;
    customerEmail?: string | undefined;
}, {
    outletId: number;
    orderType: "RENT" | "SALE";
    totalAmount: number;
    orderItems: {
        productId: number;
        quantity: number;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
    }[];
    subtotal: number;
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
    rentalDuration?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    taxAmount?: number | undefined;
    customerName?: string | undefined;
    customerPhone?: string | undefined;
    customerEmail?: string | undefined;
}>;
declare const orderUpdateSchema: z.ZodObject<{
    orderId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    orderNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    orderType: z.ZodOptional<z.ZodEnum<["RENT", "SALE"]>>;
    customerId: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    outletId: z.ZodOptional<z.ZodNumber>;
    pickupPlanAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    returnPlanAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    rentalDuration: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    subtotal: z.ZodOptional<z.ZodNumber>;
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
    customerName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    customerPhone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    customerEmail: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isReadyToDeliver: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    orderItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productId: z.ZodNumber;
        quantity: z.ZodNumber;
        unitPrice: z.ZodDefault<z.ZodNumber>;
        totalPrice: z.ZodOptional<z.ZodNumber>;
        deposit: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        daysRented: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        deposit: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        notes?: string | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
    }, {
        productId: number;
        quantity: number;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
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
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        notes?: string | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
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
    rentalDuration?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
    customerName?: string | undefined;
    customerPhone?: string | undefined;
    customerEmail?: string | undefined;
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
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        deposit?: number | undefined;
        notes?: string | undefined;
        unitPrice?: number | undefined;
        totalPrice?: number | undefined;
        daysRented?: number | undefined;
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
    rentalDuration?: number | undefined;
    collateralType?: string | undefined;
    collateralDetails?: string | undefined;
    pickupNotes?: string | undefined;
    returnNotes?: string | undefined;
    damageNotes?: string | undefined;
    orderId?: number | undefined;
    subtotal?: number | undefined;
    taxAmount?: number | undefined;
    customerName?: string | undefined;
    customerPhone?: string | undefined;
    customerEmail?: string | undefined;
}>;
type OrdersQuery = z.infer<typeof ordersQuerySchema>;
type OrderCreateInput = z.infer<typeof orderCreateSchema>;
type OrderUpdatePayload = z.infer<typeof orderUpdateSchema>;
declare const usersQuerySchema: z.ZodObject<{
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
    isActive?: boolean | undefined;
}, {
    search?: string | undefined;
    sortBy?: "firstName" | "lastName" | "email" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    role?: "OUTLET_STAFF" | "ADMIN" | "MERCHANT" | "OUTLET_ADMIN" | undefined;
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
    description: string;
    basePrice: number;
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
    description: string;
    basePrice: number;
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
    description?: string | undefined;
    basePrice?: number | undefined;
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
    description?: string | undefined;
    basePrice?: number | undefined;
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
    sortBy: "sortOrder" | "name" | "createdAt" | "price" | "basePrice";
    sortOrder: "asc" | "desc";
    limit: number;
    offset: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
    isPopular?: boolean | undefined;
}, {
    search?: string | undefined;
    sortBy?: "sortOrder" | "name" | "createdAt" | "price" | "basePrice" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    isActive?: boolean | undefined;
    isPopular?: boolean | undefined;
    limit?: number | undefined;
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
    isPopular: boolean;
    discount: number;
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
    isPopular?: boolean | undefined;
    discount?: number | undefined;
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
    planId?: string | undefined;
    price?: number | undefined;
    basePrice?: number | undefined;
    isPopular?: boolean | undefined;
    discount?: number | undefined;
    duration?: number | undefined;
}, {
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    planId?: string | undefined;
    price?: number | undefined;
    basePrice?: number | undefined;
    isPopular?: boolean | undefined;
    discount?: number | undefined;
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
    sortBy: "sortOrder" | "name" | "createdAt" | "price" | "discount" | "duration";
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
    sortBy?: "sortOrder" | "name" | "createdAt" | "price" | "discount" | "duration" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    isActive?: boolean | undefined;
    planId?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    isPopular?: boolean | undefined;
    limit?: number | undefined;
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
    planId: string;
    amount: number;
    currency: string;
    cancelAtPeriodEnd: boolean;
    billingInterval: "month" | "quarter" | "semiAnnual" | "year";
    planVariantId: string;
    notes?: string | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}, {
    merchantId: number;
    planId: string;
    amount: number;
    planVariantId: string;
    status?: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    notes?: string | undefined;
    currency?: string | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    billingInterval?: "month" | "quarter" | "semiAnnual" | "year" | undefined;
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
    planId?: string | undefined;
    id?: number | undefined;
    amount?: number | undefined;
    notes?: string | undefined;
    currency?: string | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    billingInterval?: "month" | "quarter" | "semiAnnual" | "year" | undefined;
    planVariantId?: string | undefined;
    trialStartDate?: Date | undefined;
    trialEndDate?: Date | undefined;
    cancelledAt?: Date | undefined;
}, {
    merchantId?: number | undefined;
    status?: "active" | "trial" | "expired" | "cancelled" | "paused" | "past_due" | undefined;
    planId?: string | undefined;
    id?: number | undefined;
    amount?: number | undefined;
    notes?: string | undefined;
    currency?: string | undefined;
    currentPeriodStart?: Date | undefined;
    currentPeriodEnd?: Date | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    billingInterval?: "month" | "quarter" | "semiAnnual" | "year" | undefined;
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
    sortBy: "status" | "createdAt" | "amount" | "currentPeriodEnd";
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
    sortBy?: "status" | "createdAt" | "amount" | "currentPeriodEnd" | undefined;
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
    register(userData: RegisterData): Promise<ApiResponse<AuthResponse>>;
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
    subscriptionStatus?: string;
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
    getDashboardSummary(): Promise<ApiResponse<any>>;
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

interface CalendarOrderSummary {
    id: number;
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    productName: string;
    productCount?: number;
    totalAmount: number;
    status: string;
    outletName?: string;
    notes?: string;
    pickupPlanAt?: string;
    returnPlanAt?: string;
    isOverdue?: boolean;
    duration?: number;
}
interface DayOrders {
    pickups: CalendarOrderSummary[];
    total: number;
}
interface CalendarResponse {
    [dateKey: string]: DayOrders;
}
interface CalendarMeta {
    month: number;
    year: number;
    totalDays: number;
    stats: {
        totalPickups: number;
        totalOrders: number;
    };
    dateRange: {
        start: string;
        end: string;
    };
}
interface CalendarApiResponse {
    success: boolean;
    data: CalendarResponse;
    meta: CalendarMeta;
    message: string;
}
interface CalendarQuery {
    month: number;
    year: number;
    outletId?: number;
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
     * Get calendar orders for a specific month
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
    useBase64Fallback?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
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
 * Resize image on client-side before upload
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

export { APIMonitor, API_BASE_URL, type AnalyticsFilters, type ApiConfig, ApiError, type ApiErrorResponse, type ApiResponse, type ApiSuccessResponse, type ApiUrls, type AuditConfig, type AuditEntityConfig, AuditHelper, type AuditHelperContext, type AuditLog, type AuditLogFilter, type AuditLogResponse, type AuditLogStats, type AuditLogStatsResponse, AuditPerformanceMonitor, type AuthResponse, type AvailabilityBadgeProps, type BackupInfo, type BackupSchedule, type BackupVerification, type BadgeConfig, type BillingCycle, type BillingCycleCreateInput, type BillingCycleFilters, type BillingCycleUpdateInput, type BillingCyclesResponse, type BillingInterval, type BillingSettings, type BreadcrumbItem, type CalculatedPricing, type CalendarApiResponse, type CalendarMeta, type CalendarOrderSummary, type CalendarQuery, type CalendarResponse, type CategoriesResponse, type CustomerAnalytics, type CustomerApiResponse, type CustomerListResponse, type CustomerSearchResponse, DEFAULT_CURRENCIES, DEFAULT_CURRENCY_SETTINGS, type DatabaseConfig, DatabaseMonitor, type DayOrders, DuplicateError, ERROR_MESSAGES, ERROR_STATUS_CODES, type Environment, ErrorCode, type ErrorInfo, type ErrorType, ForbiddenError, type ImageDimensions, type ImageValidationResult, type LocationBadgeProps, type LoginInput, type ManualPayment, type ManualPaymentCreateInput, MemoryMonitor, type MerchantSearchFilters, type MerchantSettings, type MerchantsResponse, NotFoundError, type Notification, type NotificationFilters, type NotificationsResponse, type OrderCreateInput, type OrderUpdatePayload, type OrdersQuery, type OrdersResponse, type OutletCreateInput, type OutletSettings, type OutletUpdateInput, type OutletsQuery, type OutletsResponse, type PaymentFilters, type PaymentGatewayConfig, type PaymentGatewayManager, type PaymentsResponse, type PerformanceMetrics, PerformanceMonitor, type PlanCreateInput, PlanLimitError, type PlanLimitsInfo, type PlanLimitsValidationResult, type PlanStats, type PlanUpdateInput, type PlanVariantCreateInput, type PlanVariantUpdateInput, type PlanVariantsQuery, type PlansQuery, type PlansResponse, type PricingBreakdown, type PricingConfig, type PricingInfo, PricingResolver, PricingValidator, type ProductAnalytics, type ProductCreateInput, type ProductUpdateInput, type ProductsQuery, type ProductsResponse, type ProrationCalculation, type RegisterInput, type RenewalConfig, type RenewalResult, type RenewalStats, type RentalInput, type RentalPeriodValidation, type RevenueData, type RoleBadgeProps, type StatusBadgeProps, type StoredUser, type SubscriptionCreateInput, SubscriptionManager, type SubscriptionPeriod, type SubscriptionRenewalConfig, type SubscriptionRenewalResult, type SubscriptionUpdateInput, type SubscriptionValidationOptions, type SubscriptionValidationResult, type SubscriptionsQuery, type SystemStats, UnauthorizedError, type UploadOptions, type UploadProgress, type UploadResponse, type UserApiResponse, type UserCreateInput, type UserProfile, type UserUpdateInput, type UsersQuery, ValidationError, type ValidationResult, addDaysToDate, analyticsApi, analyzeError, apiConfig, apiEnvironment, apiUrls, assertPlanLimit, auditPerformanceMonitor, authApi, authenticatedFetch, billingCyclesApi, buildApiUrl, calculateCustomerStats, calculateDiscountedPrice, calculateNewBillingDate, calculateProductStats, calculateProratedAmount, calculateProration, calculateRenewalPrice, calculateSavings, calculateStockPercentage, calculateSubscriptionPeriod, calculateSubscriptionPrice, calculateUserStats, calendarApi, canCreateUsers, canPerformOperation, canRentProduct, canSellProduct, capitalizeWords, categoriesApi, categoriesQuerySchema, categoryBreadcrumbs, checkSubscriptionStatus, clearAuthData, compareOrderNumberFormats, convertCurrency, createApiUrl, createAuditHelper, createErrorResponse, createPaymentGatewayManager, createSuccessResponse, createUploadController, customerBreadcrumbs, customerCreateSchema, customerUpdateSchema, customersApi, customersQuerySchema, databaseConfig, debounce, defaultAuditConfig, delay, exportAuditLogs, fileToBase64, filterCustomers, filterProducts, filterUsers, formatBillingCycle, formatCurrency, formatCurrencyAdvanced, formatCustomerForDisplay, formatDate, formatDateLong, formatDateShort, formatDateTime, formatDateTimeLong, formatDateTimeShort, formatPhoneNumber, formatProductPrice, formatProration, formatSubscriptionPeriod, generateRandomString, generateSlug, getAdminUrl, getAllPricingOptions, getAllowedOperations, getApiBaseUrl, getApiCorsOrigins, getApiDatabaseUrl, getApiJwtSecret, getApiUrl, getAuditConfig, getAuditEntityConfig, getAuditLogStats, getAuditLogs, getAuthToken, getAvailabilityBadge, getAvailabilityBadgeConfig, getBillingCycleDiscount, getClientUrl, getCurrency, getCurrencyDisplay, getCurrentCurrency, getCurrentDate, getCurrentEntityCounts, getCurrentEnvironment, getCurrentUser, getCustomerAddress, getCustomerAge, getCustomerContactInfo, getCustomerFullName, getCustomerIdTypeBadge, getCustomerLocationBadge, getCustomerStatusBadge, getDatabaseConfig, getDaysDifference, getDiscountPercentage, getEnvironmentUrls, getExchangeRate, getFormatRecommendations, getImageDimensions, getInitials, getLocationBadge, getLocationBadgeConfig, getMobileUrl, getOutletStats, getPlanLimitError, getPlanLimitErrorMessage, getPlanLimitsInfo, getPriceTrendBadge, getPriceTrendBadgeConfig, getPricingBreakdown, getPricingComparison, getProductAvailabilityBadge, getProductCategoryName, getProductDisplayName, getProductImageUrl, getProductOutletName, getProductStatusBadge, getProductStockStatus, getProductTypeBadge, getRoleBadge, getRoleBadgeConfig, getStatusBadge, getStatusBadgeConfig, getStoredUser, getSubscriptionError, getSubscriptionStatusBadge, getSubscriptionStatusPriority, getToastType, getTomorrow, getUserFullName, getUserRoleBadge, getUserStatusBadge, handleApiError, handleApiErrorForUI, handleApiResponse, handleBusinessError, handlePrismaError, handleValidationError, isAuthError, isAuthenticated, isBrowser, isDateAfter, isDateBefore, isDev, isDevelopment, isDevelopmentEnvironment, isEmpty, isErrorResponse, isGracePeriodExceeded, isLocal, isLocalEnvironment, isNetworkError, isPermissionError, isProd, isProduction, isProductionEnvironment, isServer, isSubscriptionExpired, isSuccessResponse, isTest, isValidCurrencyCode, isValidEmail, isValidPhone, isValidationError, loginSchema, memoize, merchantBreadcrumbs, merchantsApi, migrateOrderNumbers, normalizeWhitespace, notificationsApi, once, orderBreadcrumbs, orderCreateSchema, orderUpdateSchema, ordersApi, ordersQuerySchema, outletBreadcrumbs, outletCreateSchema, outletUpdateSchema, outletsApi, outletsQuerySchema, parseApiResponse, parseCurrency, paymentsApi, planCreateSchema, planUpdateSchema, planVariantCreateSchema, planVariantUpdateSchema, planVariantsQuerySchema, plansApi, plansQuerySchema, pricingCalculator, productBreadcrumbs, productCreateSchema, productUpdateSchema, productsApi, productsQuerySchema, profileApi, publicFetch, publicPlansApi, quickAuditLog, registerSchema, rentalSchema, reportBreadcrumbs, resizeImage, retry, sanitizeFieldValue, settingsApi, settingsBreadcrumbs, shouldApplyProration, shouldLogEntity, shouldLogField, shouldSample, shouldThrowPlanLimitError, sortProducts, sortSubscriptionsByStatus, storeAuthData, subscriptionBreadcrumbs, subscriptionCreateSchema, subscriptionNeedsAttention, subscriptionUpdateSchema, subscriptionsApi, subscriptionsQuerySchema, systemApi, throttle, timeout, truncateText, uploadImage, uploadImages, userBreadcrumbs, userCreateSchema, userUpdateSchema, usersApi, usersQuerySchema, validateCustomer, validateForRenewal, validateImage, validateOrderNumberFormat, validatePlanLimits, validatePlatformAccess, validateProductPublicCheckAccess, validateSubscriptionAccess, withErrorHandlingForUI };
