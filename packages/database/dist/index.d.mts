import { PrismaClient } from '@prisma/client';

/**
 * Create a subscription activity log
 */
declare function createActivity(data: {
    subscriptionId: number;
    type: string;
    description: string;
    reason?: string;
    metadata?: any;
    performedBy?: number;
}): Promise<any>;
/**
 * Get activities for a subscription
 */
declare function getActivitiesBySubscriptionId(subscriptionId: number, options?: {
    limit?: number;
    offset?: number;
}): Promise<{
    activities: any;
    total: any;
}>;
/**
 * Simplified subscription activity operations
 */
declare const simplifiedSubscriptionActivities: {
    /**
     * Create activity (simplified API)
     */
    create: typeof createActivity;
    /**
     * Get activities by subscription ID
     */
    getBySubscriptionId: typeof getActivitiesBySubscriptionId;
};

/**
 * Order Number Generator & Configuration
 *
 * Provides robust, concurrent-safe order number generation for rental shop orders.
 * Supports multiple formats, handles race conditions, and includes centralized configuration.
 */
type OrderNumberFormat = 'sequential' | 'date-based' | 'random' | 'random-numeric' | 'hybrid' | 'compact-numeric';
interface OrderNumberResult {
    orderNumber: string;
    sequence: number;
    generatedAt: Date;
}
/**
 * Get order statistics for an outlet
 */
declare function getOutletOrderStats(outletId: number): Promise<{
    totalOrders: number;
    todayOrders: number;
    lastOrderNumber?: string;
    lastOrderDate?: Date;
}>;
/**
 * Generate order number with specific format
 */
declare function createOrderNumberWithFormat(outletId: number, format: OrderNumberFormat): Promise<OrderNumberResult>;

interface MerchantFilters extends SimpleFilters {
    businessType?: string;
    subscriptionStatus?: string;
    planId?: number;
    isActive?: boolean;
}
interface MerchantCreateData {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessType?: string;
    pricingType?: string;
    taxId?: string;
    website?: string;
    description?: string;
    pricingConfig?: string;
    planId?: number;
    subscriptionStatus?: string;
}
interface MerchantUpdateData extends Partial<MerchantCreateData> {
    totalRevenue?: number;
    lastActiveAt?: Date;
    isActive?: boolean;
}
/**
 * Find merchant by ID
 */
declare function findById$1(id: number): Promise<any>;
/**
 * Find merchant by email
 */
declare function findByEmail(email: string): Promise<any>;
/**
 * Search merchants with filtering and pagination
 */
declare function search(filters: MerchantFilters): Promise<SimpleResponse<any>>;
/**
 * Create new merchant
 */
declare function create(data: MerchantCreateData): Promise<any>;
/**
 * Update merchant
 */
declare function update(id: number, data: MerchantUpdateData): Promise<any>;
/**
 * Delete merchant (soft delete)
 */
declare function remove(id: number): Promise<any>;
/**
 * Get merchant statistics
 */
declare function getStats(id: number): Promise<{
    totalOutlets: any;
    totalUsers: any;
    totalProducts: any;
    totalCustomers: any;
    totalOrders: number;
    totalRevenue: any;
} | null>;
/**
 * Count merchants with optional where clause
 */
declare function count(options?: {
    where?: any;
}): Promise<any>;

/**
 * Create payment
 */
declare function createPayment(data: any): Promise<any>;
/**
 * Find payment by ID
 */
declare function findById(id: number): Promise<any>;
/**
 * Find payments by subscription ID
 */
declare function findBySubscriptionId(subscriptionId: number, options?: {
    limit?: number;
}): Promise<any>;
/**
 * Search payments with pagination
 */
declare function searchPayments(filters: any): Promise<{
    data: any;
    total: any;
    page: number;
    limit: any;
    hasMore: boolean;
}>;
declare const simplifiedPayments: {
    /**
     * Create payment (simplified API)
     */
    create: typeof createPayment;
    /**
     * Find payment by ID (simplified API)
     */
    findById: typeof findById;
    /**
     * Find payments by subscription ID (simplified API)
     */
    findBySubscriptionId: typeof findBySubscriptionId;
    /**
     * Search payments (simplified API)
     */
    search: typeof searchPayments;
    /**
     * Get payment statistics (simplified API)
     */
    getStats: (whereClause?: any) => Promise<any>;
    /**
     * Group payments by field (simplified API)
     */
    groupBy: (args: any) => Promise<any>;
    /**
     * Aggregate payments (simplified API)
     */
    aggregate: (args: any) => Promise<any>;
};

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
 * Order types - simplified to RENT and SALE only
 */
type OrderType = 'RENT' | 'SALE';
/**
 * Order statuses - simplified status flow
 */
type OrderStatus = 'RESERVED' | 'PICKUPED' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
/**
 * Order item with product details
 * Used for order item displays
 */
interface OrderItemWithProduct {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit?: number;
    rentalDays?: number;
    notes?: string;
    product: ProductReference;
}
/**
 * Order search result
 * Used for order search responses
 */
interface OrderSearchResult {
    id: number;
    orderNumber: string;
    orderType: OrderType;
    status: OrderStatus;
    totalAmount: number;
    depositAmount: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    pickupPlanAt: Date | string | null;
    returnPlanAt: Date | string | null;
    pickedUpAt: Date | string | null;
    returnedAt: Date | string | null;
    isReadyToDeliver: boolean;
    customer: {
        id: number;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
    } | null;
    outlet: {
        id: number;
        name: string;
    };
    orderItems: OrderItemWithProduct[];
}
/**
 * Order search response
 * Used for API responses with pagination
 */
interface OrderSearchResponse {
    success: boolean;
    data: {
        orders: OrderSearchResult[];
        total: number;
        page: number;
        limit: number;
        offset: number;
        hasMore: boolean;
        totalPages: number;
    };
}
/**
 * Order search filter
 * Used for order search operations in API
 */
interface OrderSearchFilter {
    q?: string;
    outletId?: number;
    customerId?: number;
    userId?: number;
    orderType?: OrderType;
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    pickupDate?: Date;
    returnDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    isReadyToDeliver?: boolean;
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

declare const SUBSCRIPTION_STATUS: {
    readonly TRIAL: "TRIAL";
    readonly ACTIVE: "ACTIVE";
    readonly PAST_DUE: "PAST_DUE";
    readonly CANCELLED: "CANCELLED";
    readonly PAUSED: "PAUSED";
    readonly EXPIRED: "EXPIRED";
};
type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
declare const BILLING_INTERVAL: {
    readonly MONTH: "month";
    readonly QUARTER: "quarter";
    readonly SEMI_ANNUAL: "semiAnnual";
    readonly YEAR: "year";
};
type BillingInterval = typeof BILLING_INTERVAL[keyof typeof BILLING_INTERVAL];

interface SubscriptionPeriod {
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
    billingInterval: BillingInterval;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
    subscriptionPeriod?: SubscriptionPeriod;
    merchant: {
        id: number;
        name: string;
        email: string;
        subscriptionStatus: string;
    };
    plan: Plan;
}

interface OrderWithRelations {
    id: number;
    orderNumber: string;
    orderType: string;
    status: string;
    totalAmount: number;
    depositAmount: number;
    securityDeposit: number;
    damageFee: number;
    lateFee: number;
    discountType?: string;
    discountValue: number;
    discountAmount: number;
    pickupPlanAt?: Date;
    returnPlanAt?: Date;
    pickedUpAt?: Date;
    returnedAt?: Date;
    rentalDuration?: number;
    isReadyToDeliver: boolean;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
    pickupNotes?: string;
    returnNotes?: string;
    damageNotes?: string;
    createdAt: Date;
    updatedAt: Date;
    outletId: number;
    merchantId?: number;
    customerId?: number;
    createdById: number;
    customer?: {
        id: number;
        firstName: string;
        lastName: string;
        phone?: string;
        email?: string;
        address?: string;
        idNumber?: string;
    };
    outlet?: {
        id: number;
        name: string;
        address: string;
        merchantId: number;
        merchant: {
            id: number;
            name: string;
        };
    };
    createdBy?: {
        id: number;
        firstName?: string;
        email: string;
    };
    orderItems?: Array<{
        id: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        productId: number;
        product?: {
            id: number;
            name: string;
        };
    }>;
    payments?: Array<{
        id: number;
        amount: number;
        method: string;
        status: string;
        processedAt?: Date;
    }>;
}
/**
 * Search orders with filters (legacy function)
 * @deprecated Use simplifiedOrders.search instead
 */
declare function searchOrders(filters: OrderSearchFilter): Promise<OrderSearchResponse>;

declare const prisma: any;

declare function getSubscriptionByMerchantId(merchantId: number): Promise<Subscription | null>;
declare function getExpiredSubscriptions(): Promise<Subscription[]>;
declare function getSubscriptionById(id: number): Promise<Subscription | null>;
declare function updateSubscription(subscriptionId: number, data: Partial<{
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    amount: number;
}>): Promise<Subscription>;
interface SubscriptionPaymentCreateInput {
    subscriptionId: number;
    amount: number;
    currency: string;
    method: string;
    status: string;
    transactionId: string;
    description?: string;
    failureReason?: string;
}
interface SubscriptionPayment {
    id: number;
    subscriptionId: number;
    amount: number;
    currency: string;
    method: string;
    status: string;
    transactionId: string;
    description?: string;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare function createSubscriptionPayment(data: SubscriptionPaymentCreateInput): Promise<SubscriptionPayment>;

/**
 * Comprehensive Audit Logging System
 *
 * This module provides a complete audit logging solution that tracks:
 * - Who made changes (user, role, context)
 * - What was changed (entity, fields, values)
 * - When changes occurred (timestamp, session)
 * - Where changes came from (IP, user agent)
 * - Why changes were made (business context)
 */

interface AuditContext {
    userId?: number;
    userEmail?: string;
    userRole?: string;
    merchantId?: number;
    outletId?: number;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
}
interface AuditLogData {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT' | 'IMPORT' | 'CUSTOM';
    entityType: string;
    entityId: string;
    entityName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changes?: Record<string, {
        old: any;
        new: any;
    }>;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
    description?: string;
    context: AuditContext;
}
interface AuditLogFilter {
    action?: string;
    entityType?: string;
    entityId?: string;
    userId?: number;
    merchantId?: number;
    outletId?: number;
    severity?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
declare class AuditLogger {
    private prisma;
    private idCounter;
    constructor(prisma: PrismaClient);
    private getNextPublicId;
    log(data: AuditLogData): Promise<void>;
    private validateUserId;
    private validateMerchantId;
    private validateOutletId;
    logCreate(entityType: string, entityId: string, entityName: string, newValues: Record<string, any>, context: AuditContext, description?: string): Promise<void>;
    logUpdate(entityType: string, entityId: string, entityName: string, oldValues: Record<string, any>, newValues: Record<string, any>, context: AuditContext, description?: string): Promise<void>;
    logDelete(entityType: string, entityId: string, entityName: string, oldValues: Record<string, any>, context: AuditContext, description?: string): Promise<void>;
    logLogin(userId: number, userEmail: string, userRole: string, context: AuditContext, success?: boolean): Promise<void>;
    logLogout(userId: number, userEmail: string, context: AuditContext): Promise<void>;
    logSecurityEvent(event: string, entityType: string, entityId: string, context: AuditContext, severity?: 'WARNING' | 'ERROR' | 'CRITICAL', description?: string): Promise<void>;
    private calculateChanges;
    getAuditLogs(filter?: AuditLogFilter): Promise<{
        logs: any[];
        total: number;
        hasMore: boolean;
    }>;
    getAuditStats(filter?: Partial<AuditLogFilter>): Promise<{
        totalLogs: number;
        logsByAction: Record<string, number>;
        logsByEntity: Record<string, number>;
        logsBySeverity: Record<string, number>;
        logsByCategory: Record<string, number>;
        recentActivity: number;
    }>;
}
declare function getAuditLogger(prisma?: PrismaClient): AuditLogger;
declare function extractAuditContext(request: Request, user?: any): AuditContext;

interface RegistrationInput {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'CLIENT' | 'SHOP_OWNER' | 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
    businessName?: string;
    outletName?: string;
    businessType?: 'RENTAL' | 'SALE' | 'MIXED';
    pricingType?: 'FIXED' | 'DYNAMIC' | 'DURATION_BASED';
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    merchantCode?: string;
    outletCode?: string;
}
interface RegistrationResult {
    success: boolean;
    user: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        merchant?: {
            id: number;
            name: string;
        };
        outlet?: {
            id: number;
            name: string;
        };
    };
    token: string;
    message: string;
}
/**
 * Smart registration that handles all user roles
 * Based on role and provided data, creates appropriate account structure
 */
declare function registerUser(data: RegistrationInput): Promise<RegistrationResult>;
/**
 * Register merchant with trial plan (wrapper function for API)
 */
declare function registerMerchantWithTrial(data: any): Promise<{
    merchant: {
        id: number | undefined;
        name: string | undefined;
        email: string;
    };
    user: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
    outlet: {
        id: number | undefined;
        name: string | undefined;
    };
    subscription: {
        planName: string;
        trialEnd: Date;
    };
}>;

interface SimpleFilters {
    merchantId?: number;
    outletId?: number;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}
interface SimpleResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
/**
 * Simplified database operations
 * Replaces the complex dual ID system with simple, consistent operations
 */
declare const db: {
    users: {
        findById: (id: number) => Promise<any>;
        findByEmail: (email: string) => Promise<any>;
        findFirst: (where: any) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<any>;
    };
    customers: {
        findById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        getStats: (whereClause?: any) => Promise<any>;
    };
    products: {
        findById: (id: number) => Promise<any>;
        findByBarcode: (barcode: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        getStats: (where?: any) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<any>;
    };
    orders: {
        findById: (id: number) => Promise<any>;
        findByNumber: (orderNumber: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<OrderWithRelations>;
        delete: (id: number) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        getStats: (whereClause?: any) => Promise<any>;
        groupBy: (args: any) => Promise<any>;
        aggregate: (args: any) => Promise<any>;
    };
    payments: {
        create: typeof createPayment;
        findById: typeof findById;
        findBySubscriptionId: typeof findBySubscriptionId;
        search: typeof searchPayments;
        getStats: (whereClause?: any) => Promise<any>;
        groupBy: (args: any) => Promise<any>;
        aggregate: (args: any) => Promise<any>;
    };
    outlets: {
        findById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        findFirst: (where: any) => Promise<any>;
        getStats: (options: any) => Promise<any>;
        updateMany: (where: any, data: any) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<any>;
    };
    merchants: {
        findById: typeof findById$1;
        findByEmail: typeof findByEmail;
        search: typeof search;
        create: typeof create;
        update: typeof update;
        remove: typeof remove;
        getStats: typeof getStats;
        count: typeof count;
    };
    plans: {
        findById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        getStats: () => Promise<{
            totalPlans: any;
            activePlans: any;
            popularPlans: any;
        }>;
    };
    categories: {
        findById: (id: number) => Promise<any>;
        findFirst: (where: any) => Promise<any>;
        findMany: (options?: any) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        getStats: (where?: any) => Promise<any>;
    };
    auditLogs: {
        findMany: (options?: any) => Promise<any>;
        findFirst: (where: any) => Promise<any>;
        create: (data: any) => Promise<any>;
        getStats: (where?: any) => Promise<any>;
    };
    orderItems: {
        findMany: (options?: any) => Promise<any>;
        findFirst: (where: any) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        getStats: (where?: any) => Promise<any>;
        groupBy: (options: any) => Promise<any>;
    };
    subscriptions: {
        findById: (id: number) => Promise<any>;
        findByMerchantId: (merchantId: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        search: (filters: any) => Promise<{
            data: any;
            total: any;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        getExpired: () => Promise<any>;
    };
    orderNumbers: {
        getOutletStats: (outletId: number) => Promise<{
            totalOrders: number;
            todayOrders: number;
            lastOrderNumber?: string;
            lastOrderDate?: Date;
        }>;
        createWithFormat: (outletId: number, format: OrderNumberFormat) => Promise<OrderNumberResult>;
        generateMultiple: (outletId: number, count: number, format?: OrderNumberFormat) => Promise<string[]>;
        validateFormat: (orderNumber: string) => boolean;
        getFormatInfo: (format: OrderNumberFormat) => {
            readonly description: "Sequential numbering per outlet";
            readonly example: "ORD-001-0001";
            readonly pros: readonly ["Outlet identification", "Easy tracking", "Human readable"];
            readonly cons: readonly ["Business intelligence leakage", "Race conditions possible"];
            readonly bestFor: "Small to medium businesses with low concurrency";
        } | {
            readonly description: "Date-based with daily sequence reset";
            readonly example: "ORD-001-20250115-0001";
            readonly pros: readonly ["Daily organization", "Better security", "Easy daily reporting"];
            readonly cons: readonly ["Longer numbers", "Still somewhat predictable"];
            readonly bestFor: "Medium businesses with daily operations focus";
        } | {
            readonly description: "Random alphanumeric strings for security";
            readonly example: "ORD-001-A7B9C2";
            readonly pros: readonly ["Maximum security", "No race conditions", "Unpredictable"];
            readonly cons: readonly ["No sequence tracking", "Harder to manage", "No business insights"];
            readonly bestFor: "Large businesses prioritizing security";
        } | {
            readonly description: "Random numeric strings for security";
            readonly example: "ORD-001-123456";
            readonly pros: readonly ["Maximum security", "No race conditions", "Numbers only", "Unpredictable"];
            readonly cons: readonly ["No sequence tracking", "Harder to manage", "No business insights"];
            readonly bestFor: "Businesses needing numeric-only random order numbers";
        } | {
            readonly description: "Compact format with outlet ID and 5-digit random number";
            readonly example: "ORD00112345";
            readonly pros: readonly ["Compact format", "Outlet identification", "Numbers only", "Short length", "Easy to read"];
            readonly cons: readonly ["No sequence tracking", "Limited randomness (5 digits)"];
            readonly bestFor: "Businesses wanting compact, numeric-only order numbers";
        } | {
            readonly description: "Combines outlet, date, and random elements";
            readonly example: "ORD-001-20250115-A7B9";
            readonly pros: readonly ["Balanced security", "Outlet identification", "Date organization"];
            readonly cons: readonly ["Longer numbers", "More complex"];
            readonly bestFor: "Large businesses needing both security and organization";
        };
    };
    outletStock: {
        /**
         * Aggregate outlet stock statistics
         */
        aggregate: (options: any) => Promise<any>;
    };
    subscriptionActivities: {
        create: typeof createActivity;
        getBySubscriptionId: typeof getActivitiesBySubscriptionId;
    };
};
/**
 * Check database connection health
 */
declare const checkDatabaseConnection: () => Promise<{
    status: string;
    error?: undefined;
} | {
    status: string;
    error: string;
}>;
/**
 * Generate next order number (simplified)
 */
declare const generateOrderNumber: (outletId: number) => Promise<string>;

export { type AuditContext, AuditLogger, type OrderNumberFormat, type RegistrationInput, type RegistrationResult, type SimpleFilters, type SimpleResponse, checkDatabaseConnection, createOrderNumberWithFormat, createSubscriptionPayment, db, extractAuditContext, generateOrderNumber, getAuditLogger, getExpiredSubscriptions, getOutletOrderStats, getSubscriptionById, getSubscriptionByMerchantId, prisma, registerMerchantWithTrial, registerUser, searchOrders, simplifiedPayments, simplifiedSubscriptionActivities, updateSubscription };
