import * as _prisma_client from '.prisma/client';
import * as _prisma_client_runtime_library from '@prisma/client/runtime/library';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Sync Session Operations
 * Temporary implementation for sync-standalone endpoint
 * TODO: Implement proper sync session tracking with database model
 */
interface SyncSession {
    id: number;
    merchantId: number;
    entities: string[];
    config: {
        endpoint: string;
        token: string;
    };
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    stats?: any;
    errorLog?: any[];
    createdAt: Date;
    updatedAt: Date;
}
interface CreateSessionInput {
    merchantId: number;
    entities: string[];
    config: {
        endpoint: string;
        token: string;
    };
}
interface UpdateStatusInput {
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    stats?: any;
    errorLog?: any[];
}
interface AddRecordInput {
    syncSessionId: number;
    entityType: 'customer' | 'product' | 'order';
    entityId: number;
    oldServerId: string;
    status: 'created' | 'updated' | 'failed';
    logMessage?: string;
}
interface CreatedRecord {
    entityType: 'customer' | 'product' | 'order';
    entityId: number;
    oldServerId: string;
}

/**
 * Generate a unique session ID
 */
declare function generateSessionId(): string;
/**
 * Create a new session for a user and invalidate all previous sessions
 * This implements "single session" behavior - only the latest login is valid
 */
declare function createUserSession(userId: number, ipAddress?: string, userAgent?: string): Promise<{
    id: number;
    isActive: boolean;
    createdAt: Date;
    userId: number;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
    sessionId: string;
    invalidatedAt: Date | null;
}>;
/**
 * Validate a session by sessionId
 * Returns true if session is valid (active and not expired)
 */
declare function validateSession(sessionId: string): Promise<boolean>;
/**
 * Invalidate a specific session (for logout)
 */
declare function invalidateSession(sessionId: string): Promise<void>;
/**
 * Invalidate all sessions for a user
 */
declare function invalidateAllUserSessions(userId: number): Promise<void>;
/**
 * Get active sessions for a user
 */
declare function getUserActiveSessions(userId: number): Promise<{
    id: number;
    isActive: boolean;
    createdAt: Date;
    userId: number;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
    sessionId: string;
    invalidatedAt: Date | null;
}[]>;
/**
 * Clean up expired sessions (can be run periodically)
 */
declare function cleanupExpiredSessions(): Promise<number>;

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
}): Promise<{
    id: number;
    description: string;
    createdAt: Date;
    subscriptionId: number;
    type: string;
    metadata: string | null;
    performedBy: number | null;
    reason: string | null;
}>;
/**
 * Get activities for a subscription
 */
declare function getActivitiesBySubscriptionId(subscriptionId: number, options?: {
    limit?: number;
    offset?: number;
}): Promise<{
    activities: any[];
    total: number;
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

type BusinessTypeEnum = 'GENERAL' | 'VEHICLE' | 'CLOTHING' | 'EQUIPMENT';
type PricingTypeEnum = 'FIXED' | 'HOURLY' | 'DAILY';
interface MerchantFilters extends SimpleFilters {
    businessType?: BusinessTypeEnum;
    planId?: number;
    isActive?: boolean;
}
interface MerchantCreateData {
    name: string;
    email: string;
    phone?: string;
    tenantKey?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessType?: BusinessTypeEnum;
    pricingType?: PricingTypeEnum;
    taxId?: string;
    website?: string;
    description?: string;
    currency?: string;
    pricingConfig?: string;
    planId?: number;
}
interface MerchantUpdateData extends Partial<MerchantCreateData> {
    totalRevenue?: number;
    lastActiveAt?: Date;
    isActive?: boolean;
}
/**
 * Find merchant by ID
 */
declare function findById$1(id: number): Promise<{
    _count: {
        products: number;
        users: number;
        customers: number;
        outlets: number;
    };
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    subscription: ({
        plan: {
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: _prisma_client.$Enums.SubscriptionStatus;
        planId: number;
        currency: string;
        amount: number;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        cancelReason: string | null;
        interval: string;
        intervalCount: number;
        period: number;
        discount: number;
        savings: number;
    }) | null;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
    outlets: {
        id: number;
        name: string;
        isActive: boolean;
    }[];
} | null>;
/**
 * Find merchant by email
 */
declare function findByEmail(email: string): Promise<({
    subscription: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: _prisma_client.$Enums.SubscriptionStatus;
        planId: number;
        currency: string;
        amount: number;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        cancelReason: string | null;
        interval: string;
        intervalCount: number;
        period: number;
        discount: number;
        savings: number;
    } | null;
    Plan: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    planId: number | null;
    totalRevenue: number;
    lastActiveAt: Date | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
}) | null>;
/**
 * Find merchant by tenantKey
 * Used for public product pages where merchant shares link with customers
 */
declare function findByTenantKey(tenantKey: string): Promise<{
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    email: string;
    website: string | null;
    currency: string;
} | null>;
/**
 * Search merchants with filtering and pagination
 */
declare function search$3(filters: MerchantFilters): Promise<SimpleResponse<any>>;
/**
 * Create new merchant
 */
declare function create(data: MerchantCreateData): Promise<{
    subscription: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: _prisma_client.$Enums.SubscriptionStatus;
        planId: number;
        currency: string;
        amount: number;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        cancelReason: string | null;
        interval: string;
        intervalCount: number;
        period: number;
        discount: number;
        savings: number;
    } | null;
    Plan: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    planId: number | null;
    totalRevenue: number;
    lastActiveAt: Date | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
}>;
/**
 * Update merchant
 */
declare function update(id: number, data: MerchantUpdateData): Promise<{
    subscription: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: _prisma_client.$Enums.SubscriptionStatus;
        planId: number;
        currency: string;
        amount: number;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        trialStart: Date | null;
        trialEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        canceledAt: Date | null;
        cancelReason: string | null;
        interval: string;
        intervalCount: number;
        period: number;
        discount: number;
        savings: number;
    } | null;
    Plan: {
        id: number;
        name: string;
        description: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    planId: number | null;
    totalRevenue: number;
    lastActiveAt: Date | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
}>;
/**
 * Delete merchant (soft delete)
 */
declare function remove(id: number): Promise<{
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    planId: number | null;
    totalRevenue: number;
    lastActiveAt: Date | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
}>;
/**
 * Get merchant statistics
 */
declare function getStats(id: number): Promise<{
    totalOutlets: number;
    totalUsers: number;
    totalProducts: number;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
} | null>;
/**
 * Count merchants with optional where clause
 */
declare function count(options?: {
    where?: any;
}): Promise<number>;
/**
 * Check for duplicate merchant by email or phone
 */
declare function checkDuplicate(email?: string, phone?: string, excludeId?: number): Promise<{
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    phone: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    email: string;
    tenantKey: string | null;
    businessType: _prisma_client.$Enums.BusinessType;
    taxId: string | null;
    website: string | null;
    planId: number | null;
    totalRevenue: number;
    lastActiveAt: Date | null;
    pricingConfig: string | null;
    pricingType: _prisma_client.$Enums.PricingType;
    currency: string;
} | null>;

/**
 * Create payment
 */
declare function createPayment(data: any): Promise<{
    order: ({
        outlet: {
            name: string;
        };
        customer: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        orderNumber: string;
        orderType: _prisma_client.$Enums.OrderType;
        status: _prisma_client.$Enums.OrderStatus;
        totalAmount: number;
        depositAmount: number;
        securityDeposit: number;
        damageFee: number;
        lateFee: number;
        discountType: string | null;
        discountValue: number;
        discountAmount: number;
        pickupPlanAt: Date | null;
        returnPlanAt: Date | null;
        pickedUpAt: Date | null;
        returnedAt: Date | null;
        rentalDuration: number | null;
        isReadyToDeliver: boolean;
        collateralType: string | null;
        collateralDetails: string | null;
        notes: string | null;
        pickupNotes: string | null;
        returnNotes: string | null;
        damageNotes: string | null;
        outletId: number;
        customerId: number | null;
        createdById: number;
    }) | null;
} & {
    id: number;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: _prisma_client.$Enums.PaymentStatus;
    notes: string | null;
    subscriptionId: number | null;
    type: _prisma_client.$Enums.PaymentType;
    metadata: string | null;
    currency: string;
    amount: number;
    method: _prisma_client.$Enums.PaymentMethod;
    reference: string | null;
    transactionId: string | null;
    invoiceNumber: string | null;
    failureReason: string | null;
    processedAt: Date | null;
    processedBy: string | null;
    orderId: number | null;
}>;
/**
 * Find payment by ID
 */
declare function findById(id: number): Promise<({
    order: ({
        outlet: {
            name: string;
        };
        customer: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        orderNumber: string;
        orderType: _prisma_client.$Enums.OrderType;
        status: _prisma_client.$Enums.OrderStatus;
        totalAmount: number;
        depositAmount: number;
        securityDeposit: number;
        damageFee: number;
        lateFee: number;
        discountType: string | null;
        discountValue: number;
        discountAmount: number;
        pickupPlanAt: Date | null;
        returnPlanAt: Date | null;
        pickedUpAt: Date | null;
        returnedAt: Date | null;
        rentalDuration: number | null;
        isReadyToDeliver: boolean;
        collateralType: string | null;
        collateralDetails: string | null;
        notes: string | null;
        pickupNotes: string | null;
        returnNotes: string | null;
        damageNotes: string | null;
        outletId: number;
        customerId: number | null;
        createdById: number;
    }) | null;
} & {
    id: number;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: _prisma_client.$Enums.PaymentStatus;
    notes: string | null;
    subscriptionId: number | null;
    type: _prisma_client.$Enums.PaymentType;
    metadata: string | null;
    currency: string;
    amount: number;
    method: _prisma_client.$Enums.PaymentMethod;
    reference: string | null;
    transactionId: string | null;
    invoiceNumber: string | null;
    failureReason: string | null;
    processedAt: Date | null;
    processedBy: string | null;
    orderId: number | null;
}) | null>;
/**
 * Find payments by subscription ID
 */
declare function findBySubscriptionId(subscriptionId: number, options?: {
    limit?: number;
}): Promise<{
    id: number;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: _prisma_client.$Enums.PaymentStatus;
    notes: string | null;
    subscriptionId: number | null;
    type: _prisma_client.$Enums.PaymentType;
    metadata: string | null;
    currency: string;
    amount: number;
    method: _prisma_client.$Enums.PaymentMethod;
    reference: string | null;
    transactionId: string | null;
    invoiceNumber: string | null;
    failureReason: string | null;
    processedAt: Date | null;
    processedBy: string | null;
    orderId: number | null;
}[]>;
/**
 * Search payments with pagination
 */
declare function searchPayments(filters: any): Promise<{
    data: ({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: number;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number | null;
        status: _prisma_client.$Enums.PaymentStatus;
        notes: string | null;
        subscriptionId: number | null;
        type: _prisma_client.$Enums.PaymentType;
        metadata: string | null;
        currency: string;
        amount: number;
        method: _prisma_client.$Enums.PaymentMethod;
        reference: string | null;
        transactionId: string | null;
        invoiceNumber: string | null;
        failureReason: string | null;
        processedAt: Date | null;
        processedBy: string | null;
        orderId: number | null;
    })[];
    total: number;
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
     * Find first payment matching criteria (simplified API)
     */
    findFirst: (whereClause: any) => Promise<({
        order: {
            id: number;
            orderNumber: string;
            totalAmount: number;
        } | null;
    } & {
        id: number;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number | null;
        status: _prisma_client.$Enums.PaymentStatus;
        notes: string | null;
        subscriptionId: number | null;
        type: _prisma_client.$Enums.PaymentType;
        metadata: string | null;
        currency: string;
        amount: number;
        method: _prisma_client.$Enums.PaymentMethod;
        reference: string | null;
        transactionId: string | null;
        invoiceNumber: string | null;
        failureReason: string | null;
        processedAt: Date | null;
        processedBy: string | null;
        orderId: number | null;
    }) | null>;
    /**
     * Get payment statistics (simplified API)
     */
    getStats: (whereClause?: any) => Promise<number>;
    /**
     * Group payments by field (simplified API)
     */
    groupBy: (args: any) => Promise<(Prisma.PickEnumerable<Prisma.PaymentGroupByOutputType, Prisma.PaymentScalarFieldEnum | Prisma.PaymentScalarFieldEnum[]> & {
        _count: true | {
            id?: number | undefined;
            amount?: number | undefined;
            currency?: number | undefined;
            method?: number | undefined;
            type?: number | undefined;
            status?: number | undefined;
            reference?: number | undefined;
            transactionId?: number | undefined;
            invoiceNumber?: number | undefined;
            description?: number | undefined;
            notes?: number | undefined;
            failureReason?: number | undefined;
            metadata?: number | undefined;
            processedAt?: number | undefined;
            processedBy?: number | undefined;
            createdAt?: number | undefined;
            updatedAt?: number | undefined;
            orderId?: number | undefined;
            subscriptionId?: number | undefined;
            merchantId?: number | undefined;
            _all?: number | undefined;
        } | undefined;
        _avg: {
            id?: number | null | undefined;
            amount?: number | null | undefined;
            orderId?: number | null | undefined;
            subscriptionId?: number | null | undefined;
            merchantId?: number | null | undefined;
        } | undefined;
        _sum: {
            id?: number | null | undefined;
            amount?: number | null | undefined;
            orderId?: number | null | undefined;
            subscriptionId?: number | null | undefined;
            merchantId?: number | null | undefined;
        } | undefined;
        _min: {
            id?: number | null | undefined;
            amount?: number | null | undefined;
            currency?: string | null | undefined;
            method?: _prisma_client.$Enums.PaymentMethod | null | undefined;
            type?: _prisma_client.$Enums.PaymentType | null | undefined;
            status?: _prisma_client.$Enums.PaymentStatus | null | undefined;
            reference?: string | null | undefined;
            transactionId?: string | null | undefined;
            invoiceNumber?: string | null | undefined;
            description?: string | null | undefined;
            notes?: string | null | undefined;
            failureReason?: string | null | undefined;
            metadata?: string | null | undefined;
            processedAt?: Date | null | undefined;
            processedBy?: string | null | undefined;
            createdAt?: Date | null | undefined;
            updatedAt?: Date | null | undefined;
            orderId?: number | null | undefined;
            subscriptionId?: number | null | undefined;
            merchantId?: number | null | undefined;
        } | undefined;
        _max: {
            id?: number | null | undefined;
            amount?: number | null | undefined;
            currency?: string | null | undefined;
            method?: _prisma_client.$Enums.PaymentMethod | null | undefined;
            type?: _prisma_client.$Enums.PaymentType | null | undefined;
            status?: _prisma_client.$Enums.PaymentStatus | null | undefined;
            reference?: string | null | undefined;
            transactionId?: string | null | undefined;
            invoiceNumber?: string | null | undefined;
            description?: string | null | undefined;
            notes?: string | null | undefined;
            failureReason?: string | null | undefined;
            metadata?: string | null | undefined;
            processedAt?: Date | null | undefined;
            processedBy?: string | null | undefined;
            createdAt?: Date | null | undefined;
            updatedAt?: Date | null | undefined;
            orderId?: number | null | undefined;
            subscriptionId?: number | null | undefined;
            merchantId?: number | null | undefined;
        } | undefined;
    })[]>;
    /**
     * Aggregate payments (simplified API)
     */
    aggregate: (args: any) => Promise<Prisma.GetPaymentAggregateType<Prisma.PaymentAggregateArgs<_prisma_client_runtime_library.DefaultArgs>>>;
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

declare const SUBSCRIPTION_STATUS: {
    readonly TRIAL: "TRIAL";
    readonly ACTIVE: "ACTIVE";
    readonly PAST_DUE: "PAST_DUE";
    readonly CANCELLED: "CANCELLED";
    readonly PAUSED: "PAUSED";
    readonly EXPIRED: "EXPIRED";
};
type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
declare const ORDER_STATUS: {
    readonly RESERVED: "RESERVED";
    readonly PICKUPED: "PICKUPED";
    readonly RETURNED: "RETURNED";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
declare const ORDER_TYPE: {
    readonly RENT: "RENT";
    readonly SALE: "SALE";
};
type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
declare const BILLING_INTERVAL: {
    readonly MONTHLY: "monthly";
    readonly QUARTERLY: "quarterly";
    readonly SIX_MONTHS: "sixMonths";
    readonly YEARLY: "yearly";
};
type BillingInterval = typeof BILLING_INTERVAL[keyof typeof BILLING_INTERVAL];

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

interface SubscriptionPeriod {
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
    billingInterval: BillingInterval;
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
    subscriptionPeriod?: SubscriptionPeriod;
    merchant?: {
        id: number;
        name: string;
        email: string;
    };
    plan?: Plan;
}

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
	savingCurrency: "Updating currency...",
	publicProductLink: "Public Product Link",
	publicProductLinkDesc: "Share this link with your customers so they can browse your products. This link is public and doesn't require login.",
	copy: "Copy Link",
	copied: "Copied!",
	share: "Share",
	viewPublicPage: "View Public Page"
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
	view: "View",
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
var rentNow = "Rent Now";
var details = "Details";
var rent = "Rent";
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
var uncategorized = "Uncategorized";
var store = "Store";
var productsPlural = "products";
var storeNotFound = "Store Not Found";
var storeNotFoundMessage = "The store you're looking for could not be found. Please check the URL or contact the store owner.";
var goToHomepage = "Go to Homepage";
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
	rentNow: rentNow,
	details: details,
	rent: rent,
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
	noCategories: noCategories,
	uncategorized: uncategorized,
	store: store,
	productsPlural: productsPlural,
	storeNotFound: storeNotFound,
	storeNotFoundMessage: storeNotFoundMessage,
	goToHomepage: goToHomepage
};

declare const _________locales_en_products_json_allCategories: typeof allCategories;
declare const _________locales_en_products_json_availability: typeof availability;
declare const _________locales_en_products_json_checkBackLater: typeof checkBackLater;
declare const _________locales_en_products_json_clearFilters: typeof clearFilters;
declare const _________locales_en_products_json_createProduct: typeof createProduct;
declare const _________locales_en_products_json_details: typeof details;
declare const _________locales_en_products_json_editProduct: typeof editProduct;
declare const _________locales_en_products_json_fields: typeof fields;
declare const _________locales_en_products_json_goToHomepage: typeof goToHomepage;
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
declare const _________locales_en_products_json_productsPlural: typeof productsPlural;
declare const _________locales_en_products_json_rent: typeof rent;
declare const _________locales_en_products_json_rentNow: typeof rentNow;
declare const _________locales_en_products_json_selectedProducts: typeof selectedProducts;
declare const _________locales_en_products_json_showingProducts: typeof showingProducts;
declare const _________locales_en_products_json_stock: typeof stock;
declare const _________locales_en_products_json_store: typeof store;
declare const _________locales_en_products_json_storeNotFound: typeof storeNotFound;
declare const _________locales_en_products_json_storeNotFoundMessage: typeof storeNotFoundMessage;
declare const _________locales_en_products_json_tryDifferentSearch: typeof tryDifferentSearch;
declare const _________locales_en_products_json_uncategorized: typeof uncategorized;
declare const _________locales_en_products_json_viewProduct: typeof viewProduct;
declare namespace _________locales_en_products_json {
  export { actions$1 as actions, _________locales_en_products_json_allCategories as allCategories, _________locales_en_products_json_availability as availability, _________locales_en_products_json_checkBackLater as checkBackLater, _________locales_en_products_json_clearFilters as clearFilters, _________locales_en_products_json_createProduct as createProduct, products as default, _________locales_en_products_json_details as details, _________locales_en_products_json_editProduct as editProduct, _________locales_en_products_json_fields as fields, filters$1 as filters, _________locales_en_products_json_goToHomepage as goToHomepage, _________locales_en_products_json_inventory as inventory, messages$2 as messages, _________locales_en_products_json_noCategories as noCategories, _________locales_en_products_json_noProductsFound as noProductsFound, _________locales_en_products_json_noProductsSelected as noProductsSelected, _________locales_en_products_json_price as price, _________locales_en_products_json_pricing as pricing, _________locales_en_products_json_productDetails as productDetails, _________locales_en_products_json_productId as productId, _________locales_en_products_json_productInformationNotAvailable as productInformationNotAvailable, _________locales_en_products_json_productName as productName, _________locales_en_products_json_productsPlural as productsPlural, _________locales_en_products_json_rent as rent, _________locales_en_products_json_rentNow as rentNow, search$1 as search, _________locales_en_products_json_selectedProducts as selectedProducts, _________locales_en_products_json_showingProducts as showingProducts, stats$2 as stats, status$1 as status, _________locales_en_products_json_stock as stock, _________locales_en_products_json_store as store, _________locales_en_products_json_storeNotFound as storeNotFound, _________locales_en_products_json_storeNotFoundMessage as storeNotFoundMessage, title$2 as title, _________locales_en_products_json_tryDifferentSearch as tryDifferentSearch, _________locales_en_products_json_uncategorized as uncategorized, _________locales_en_products_json_viewProduct as viewProduct };
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
var resetPassword = {
	title: "Reset Password",
	subtitle: "Enter your new password",
	password: "New Password",
	confirmPassword: "Confirm New Password",
	resetButton: "Reset Password",
	success: "Password reset successfully",
	failed: "Failed to reset password",
	passwordMismatch: "Passwords do not match",
	tokenInvalid: "Reset link is invalid or expired",
	tokenExpired: "Reset link has expired. Please request a new one",
	tokenUsed: "This reset link has already been used",
	passwordMinLength: "Password must be at least 6 characters",
	passwordRequired: "Password is required",
	confirmPasswordRequired: "Please confirm your password"
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
	resetPassword: resetPassword,
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
declare const _________locales_en_auth_json_resetPassword: typeof resetPassword;
declare namespace _________locales_en_auth_json {
  export { _________locales_en_auth_json_changePassword as changePassword, _________locales_en_auth_json_checkEmail as checkEmail, auth as default, _________locales_en_auth_json_forgotPassword as forgotPassword, _________locales_en_auth_json_login as login, _________locales_en_auth_json_logout as logout, _________locales_en_auth_json_register as register, _________locales_en_auth_json_resetPassword as resetPassword };
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

declare const prisma: PrismaClient<_prisma_client.Prisma.PrismaClientOptions, never, _prisma_client_runtime_library.DefaultArgs>;

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

/**
 * Get default outlet for merchant
 */
declare function getDefaultOutlet(merchantId: number): Promise<any>;

interface RegistrationInput {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
    businessName?: string;
    outletName?: string;
    businessType?: 'GENERAL' | 'VEHICLE' | 'CLOTHING' | 'EQUIPMENT';
    pricingType?: 'FIXED' | 'HOURLY' | 'DAILY';
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

interface EmailVerificationToken {
    id: number;
    userId: number;
    token: string;
    email: string;
    verified: boolean;
    verifiedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
}
/**
 * Generate a secure random token for email verification
 */
declare function generateVerificationToken(): string;
/**
 * Create email verification record
 */
declare function createEmailVerification(userId: number, email: string, expiresInHours?: number): Promise<EmailVerificationToken>;
/**
 * Verify email using token
 */
declare function verifyEmailByToken(token: string): Promise<{
    success: boolean;
    user?: {
        id: number;
        email: string;
    };
    error?: string;
}>;
/**
 * Get verification token by userId
 */
declare function getVerificationTokenByUserId(userId: number): Promise<EmailVerificationToken | null>;
/**
 * Resend verification email (create new token)
 */
declare function resendVerificationToken(userId: number, email: string): Promise<EmailVerificationToken>;
/**
 * Check if user's email is verified
 */
declare function isEmailVerified(userId: number): Promise<boolean>;
/**
 * Delete expired verification tokens (cleanup job)
 */
declare function deleteExpiredTokens(): Promise<number>;

interface PasswordResetToken {
    id: number;
    userId: number;
    token: string;
    email: string;
    used: boolean;
    usedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
}
/**
 * Generate a secure random token for password reset
 */
declare function generatePasswordResetToken(): string;
/**
 * Create password reset record
 */
declare function createPasswordResetToken(userId: number, email: string, expiresInHours?: number): Promise<PasswordResetToken>;
/**
 * Verify password reset token
 */
declare function verifyPasswordResetToken(token: string): Promise<{
    success: boolean;
    user?: {
        id: number;
        email: string;
    };
    error?: string;
}>;
/**
 * Mark password reset token as used
 */
declare function markTokenAsUsed(token: string): Promise<void>;
/**
 * Get password reset token by userId
 */
declare function getPasswordResetTokenByUserId(userId: number): Promise<PasswordResetToken | null>;
/**
 * Delete expired password reset tokens (cleanup job)
 */
declare function deleteExpiredPasswordResetTokens(): Promise<number>;

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
    prisma: _prisma_client.PrismaClient<_prisma_client.Prisma.PrismaClientOptions, never, _prisma_client_runtime_library.DefaultArgs>;
    users: {
        findById: (id: number) => Promise<({
            merchant: {
                id: number;
                name: string;
                address: string | null;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                phone: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                email: string;
                businessType: _prisma_client.$Enums.BusinessType;
                taxId: string | null;
                website: string | null;
                planId: number | null;
                totalRevenue: number;
                lastActiveAt: Date | null;
                pricingType: _prisma_client.$Enums.PricingType;
            } | null;
            outlet: {
                id: number;
                name: string;
                address: string | null;
                description: string | null;
                isActive: boolean;
                isDefault: boolean;
                createdAt: Date;
                phone: string | null;
                merchant: {
                    id: number;
                    name: string;
                };
            } | null;
        } & {
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        }) | null>;
        findByEmail: (email: string) => Promise<{
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            merchant: {
                id: number;
                name: string;
            } | null;
            outlet: {
                id: number;
                name: string;
            } | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        } | null>;
        findFirst: (where: any) => Promise<({
            merchant: {
                id: number;
                name: string;
            } | null;
            outlet: {
                id: number;
                name: string;
            } | null;
        } & {
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
                address: string | null;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                phone: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                email: string;
                businessType: _prisma_client.$Enums.BusinessType;
                taxId: string | null;
                website: string | null;
                planId: number | null;
                totalRevenue: number;
                lastActiveAt: Date | null;
            } | null;
            outlet: {
                id: number;
                name: string;
                address: string | null;
                description: string | null;
                isActive: boolean;
                isDefault: boolean;
                createdAt: Date;
                phone: string | null;
                merchant: {
                    id: number;
                    name: string;
                };
            } | null;
        } & {
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            } | null;
            outlet: {
                id: number;
                name: string;
            } | null;
        } & {
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            phone: string | null;
            outletId: number | null;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role: _prisma_client.$Enums.UserRole;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        }>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    id: number;
                    name: string;
                } | null;
                outlet: {
                    id: number;
                    name: string;
                } | null;
            } & {
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                phone: string | null;
                outletId: number | null;
                email: string;
                password: string;
                firstName: string;
                lastName: string;
                role: _prisma_client.$Enums.UserRole;
                emailVerified: boolean;
                emailVerifiedAt: Date | null;
                deletedAt: Date | null;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
            totalPages: number;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<number>;
        getStats: (whereClause?: any) => Promise<number>;
    };
    customers: {
        findById: (id: number) => Promise<({
            orders: {
                id: number;
                createdAt: Date;
                orderNumber: string;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
            }[];
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            notes: string | null;
            email: string | null;
            firstName: string;
            lastName: string;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            notes: string | null;
            email: string | null;
            firstName: string;
            lastName: string;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            notes: string | null;
            email: string | null;
            firstName: string;
            lastName: string;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }>;
        search: (filters: any) => Promise<{
            data: ({
                _count: {
                    orders: number;
                };
                merchant: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                address: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                phone: string;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                notes: string | null;
                email: string | null;
                firstName: string;
                lastName: string;
                dateOfBirth: Date | null;
                idNumber: string | null;
                idType: string | null;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
            totalPages: number;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string;
            email: string | null;
            firstName: string;
            lastName: string;
        }>;
        findFirst: (whereClause: any) => Promise<{
            id: number;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string;
            email: string | null;
            firstName: string;
            lastName: string;
        } | null>;
        getStats: (whereClause?: any) => Promise<number>;
    };
    products: {
        findById: (id: number) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            category: {
                id: number;
                name: string;
            };
            outletStock: ({
                outlet: {
                    id: number;
                    name: string;
                    address: string | null;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                stock: number;
                available: number;
                renting: number;
                productId: number;
            })[];
        } & {
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }) | null>;
        findByBarcode: (barcode: string) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            category: {
                id: number;
                name: string;
            };
            outletStock: ({
                outlet: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                stock: number;
                available: number;
                renting: number;
                productId: number;
            })[];
        } & {
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
            category: {
                id: number;
                name: string;
            };
            outletStock: ({
                outlet: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                stock: number;
                available: number;
                renting: number;
                productId: number;
            })[];
        } & {
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
            category: {
                id: number;
                name: string;
            };
            outletStock: ({
                outlet: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                stock: number;
                available: number;
                renting: number;
                productId: number;
            })[];
        } & {
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }>;
        findFirst: (whereClause: any) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            category: {
                id: number;
                name: string;
            };
            outletStock: ({
                outlet: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                stock: number;
                available: number;
                renting: number;
                productId: number;
            })[];
        } & {
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: _prisma_client_runtime_library.JsonValue | null;
            categoryId: number;
        }) | null>;
        getStats: (whereClause?: any) => Promise<number>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    id: number;
                    name: string;
                };
                category: {
                    id: number;
                    name: string;
                };
                outletStock: ({
                    outlet: {
                        id: number;
                        name: string;
                        address: string | null;
                    };
                } & {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    outletId: number;
                    stock: number;
                    available: number;
                    renting: number;
                    productId: number;
                })[];
            } & {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<number>;
    };
    orders: {
        findById: (id: number) => Promise<({
            outlet: {
                id: number;
                name: string;
            };
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            customer: {
                id: number;
                phone: string;
                email: string | null;
                firstName: string;
                lastName: string;
            } | null;
            orderItems: {
                id: number;
                notes: string | null;
                product: {
                    id: number;
                    name: string;
                    barcode: string | null;
                };
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
            }[];
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
        }) | null>;
        findByNumber: (orderNumber: string) => Promise<({
            outlet: {
                id: number;
                name: string;
                merchantId: number;
                merchant: {
                    id: number;
                    name: string;
                };
            };
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            customer: {
                id: number;
                phone: string;
                email: string | null;
                firstName: string;
                lastName: string;
            } | null;
            orderItems: {
                id: number;
                notes: string | null;
                product: {
                    id: number;
                    name: string;
                    barcode: string | null;
                };
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
            }[];
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
        }) | null>;
        create: (data: any) => Promise<{
            outlet: {
                id: number;
                name: string;
            };
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            customer: {
                id: number;
                phone: string;
                email: string | null;
                firstName: string;
                lastName: string;
            } | null;
            orderItems: {
                id: number;
                notes: string | null;
                product: {
                    id: number;
                    name: string;
                    barcode: string | null;
                };
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
            }[];
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
        }>;
        update: (id: number, data: any) => Promise<OrderWithRelations>;
        delete: (id: number) => Promise<{
            id: number;
            createdAt: Date;
            updatedAt: Date;
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
        }>;
        search: (filters: any) => Promise<{
            data: {
                _count: {
                    orderItems: number;
                    payments: number;
                };
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outlet: {
                    id: number;
                    name: string;
                    merchant: {
                        id: number;
                        name: string;
                    };
                };
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                createdBy: {
                    id: number;
                    firstName: string;
                    lastName: string;
                };
                customer: {
                    id: number;
                    phone: string;
                    email: string | null;
                    firstName: string;
                    lastName: string;
                } | null;
            }[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
            totalPages: number;
        }>;
        findFirst: (whereClause: any) => Promise<({
            outlet: {
                id: number;
                name: string;
            };
            customer: {
                id: number;
                phone: string;
                email: string | null;
                firstName: string;
                lastName: string;
            } | null;
            orderItems: ({
                product: {
                    id: number;
                    name: string;
                    barcode: string | null;
                };
            } & {
                id: number;
                notes: string | null;
                orderId: number;
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
                productName: string | null;
                productBarcode: string | null;
                productImages: _prisma_client_runtime_library.JsonValue | null;
            })[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
        }) | null>;
        getStats: (whereClause?: any) => Promise<number>;
        groupBy: (args: any) => Promise<(_prisma_client.Prisma.PickEnumerable<_prisma_client.Prisma.OrderGroupByOutputType, _prisma_client.Prisma.OrderScalarFieldEnum | _prisma_client.Prisma.OrderScalarFieldEnum[]> & {
            _count: true | {
                id?: number | undefined;
                orderNumber?: number | undefined;
                orderType?: number | undefined;
                status?: number | undefined;
                totalAmount?: number | undefined;
                depositAmount?: number | undefined;
                securityDeposit?: number | undefined;
                damageFee?: number | undefined;
                lateFee?: number | undefined;
                discountType?: number | undefined;
                discountValue?: number | undefined;
                discountAmount?: number | undefined;
                pickupPlanAt?: number | undefined;
                returnPlanAt?: number | undefined;
                pickedUpAt?: number | undefined;
                returnedAt?: number | undefined;
                rentalDuration?: number | undefined;
                isReadyToDeliver?: number | undefined;
                collateralType?: number | undefined;
                collateralDetails?: number | undefined;
                notes?: number | undefined;
                pickupNotes?: number | undefined;
                returnNotes?: number | undefined;
                damageNotes?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                outletId?: number | undefined;
                customerId?: number | undefined;
                createdById?: number | undefined;
                _all?: number | undefined;
            } | undefined;
            _avg: {
                id?: number | null | undefined;
                totalAmount?: number | null | undefined;
                depositAmount?: number | null | undefined;
                securityDeposit?: number | null | undefined;
                damageFee?: number | null | undefined;
                lateFee?: number | null | undefined;
                discountValue?: number | null | undefined;
                discountAmount?: number | null | undefined;
                rentalDuration?: number | null | undefined;
                outletId?: number | null | undefined;
                customerId?: number | null | undefined;
                createdById?: number | null | undefined;
            } | undefined;
            _sum: {
                id?: number | null | undefined;
                totalAmount?: number | null | undefined;
                depositAmount?: number | null | undefined;
                securityDeposit?: number | null | undefined;
                damageFee?: number | null | undefined;
                lateFee?: number | null | undefined;
                discountValue?: number | null | undefined;
                discountAmount?: number | null | undefined;
                rentalDuration?: number | null | undefined;
                outletId?: number | null | undefined;
                customerId?: number | null | undefined;
                createdById?: number | null | undefined;
            } | undefined;
            _min: {
                id?: number | null | undefined;
                orderNumber?: string | null | undefined;
                orderType?: _prisma_client.$Enums.OrderType | null | undefined;
                status?: _prisma_client.$Enums.OrderStatus | null | undefined;
                totalAmount?: number | null | undefined;
                depositAmount?: number | null | undefined;
                securityDeposit?: number | null | undefined;
                damageFee?: number | null | undefined;
                lateFee?: number | null | undefined;
                discountType?: string | null | undefined;
                discountValue?: number | null | undefined;
                discountAmount?: number | null | undefined;
                pickupPlanAt?: Date | null | undefined;
                returnPlanAt?: Date | null | undefined;
                pickedUpAt?: Date | null | undefined;
                returnedAt?: Date | null | undefined;
                rentalDuration?: number | null | undefined;
                isReadyToDeliver?: boolean | null | undefined;
                collateralType?: string | null | undefined;
                collateralDetails?: string | null | undefined;
                notes?: string | null | undefined;
                pickupNotes?: string | null | undefined;
                returnNotes?: string | null | undefined;
                damageNotes?: string | null | undefined;
                createdAt?: Date | null | undefined;
                updatedAt?: Date | null | undefined;
                outletId?: number | null | undefined;
                customerId?: number | null | undefined;
                createdById?: number | null | undefined;
            } | undefined;
            _max: {
                id?: number | null | undefined;
                orderNumber?: string | null | undefined;
                orderType?: _prisma_client.$Enums.OrderType | null | undefined;
                status?: _prisma_client.$Enums.OrderStatus | null | undefined;
                totalAmount?: number | null | undefined;
                depositAmount?: number | null | undefined;
                securityDeposit?: number | null | undefined;
                damageFee?: number | null | undefined;
                lateFee?: number | null | undefined;
                discountType?: string | null | undefined;
                discountValue?: number | null | undefined;
                discountAmount?: number | null | undefined;
                pickupPlanAt?: Date | null | undefined;
                returnPlanAt?: Date | null | undefined;
                pickedUpAt?: Date | null | undefined;
                returnedAt?: Date | null | undefined;
                rentalDuration?: number | null | undefined;
                isReadyToDeliver?: boolean | null | undefined;
                collateralType?: string | null | undefined;
                collateralDetails?: string | null | undefined;
                notes?: string | null | undefined;
                pickupNotes?: string | null | undefined;
                returnNotes?: string | null | undefined;
                damageNotes?: string | null | undefined;
                createdAt?: Date | null | undefined;
                updatedAt?: Date | null | undefined;
                outletId?: number | null | undefined;
                customerId?: number | null | undefined;
                createdById?: number | null | undefined;
            } | undefined;
        })[]>;
        aggregate: (args: any) => Promise<_prisma_client.Prisma.GetOrderAggregateType<_prisma_client.Prisma.OrderAggregateArgs<_prisma_client_runtime_library.DefaultArgs>>>;
        searchWithItems: (filters?: {
            merchantId?: number;
            outletId?: number;
            status?: string;
            orderType?: string;
            productId?: number;
            startDate?: Date;
            endDate?: Date;
            search?: string;
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            where?: any;
        }) => Promise<{
            data: ({
                outlet: {
                    id: number;
                    name: string;
                    merchantId: number;
                };
                customer: {
                    id: number;
                    phone: string;
                    email: string | null;
                    firstName: string;
                    lastName: string;
                } | null;
                orderItems: ({
                    product: {
                        id: number;
                        name: string;
                        barcode: string | null;
                        rentPrice: number;
                        deposit: number;
                        images: _prisma_client_runtime_library.JsonValue;
                    };
                } & {
                    id: number;
                    notes: string | null;
                    orderId: number;
                    deposit: number;
                    productId: number;
                    quantity: number;
                    unitPrice: number;
                    totalPrice: number;
                    rentalDays: number | null;
                    productName: string | null;
                    productBarcode: string | null;
                    productImages: _prisma_client_runtime_library.JsonValue | null;
                })[];
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                outletId: number;
                customerId: number | null;
                createdById: number;
            })[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>;
        findManyMinimal: (filters?: {
            merchantId?: number;
            outletId?: number;
            status?: string;
            orderType?: string;
            startDate?: Date;
            endDate?: Date;
            search?: string;
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }) => Promise<{
            data: {
                id: number;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                notes: string | null;
                createdAt: Date;
                updatedAt: Date;
                customerId: number | null;
                customerName: string | null;
                customerPhone: string | null;
                customerEmail: string | null;
                outletId: number;
                outletName: string | null;
                outletAddress: string | null;
                merchantId: number | null;
                merchantName: string | null;
                createdById: number;
                createdByName: string | null;
                createdByEmail: string | null;
                itemCount: number;
                paymentCount: number;
                totalPaid: number;
            }[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>;
        findManyLightweight: (filters: {
            merchantId?: number;
            outletId?: number;
            status?: string;
            orderType?: string;
            productId?: number;
            startDate?: Date;
            endDate?: Date;
            search?: string;
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }) => Promise<{
            data: {
                id: number;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                createdAt: Date;
                updatedAt: Date;
                customerId: number | null;
                customerName: string | null;
                customerPhone: string | null;
                outletId: number;
                outletName: string | null;
                merchantName: string | null;
                createdById: number;
                createdByName: string | null;
                orderItems: {
                    id: number;
                    quantity: number;
                    unitPrice: number;
                    totalPrice: number;
                    notes: string | null;
                    productId: number;
                    productName: string;
                    productBarcode: string | null;
                    productImages: _prisma_client_runtime_library.JsonArray;
                    productRentPrice: number;
                    productDeposit: number;
                }[];
                itemCount: number;
                paymentCount: number;
                totalPaid: number;
            }[];
            total: number;
            page: number;
            limit: number;
            hasMore: boolean;
            totalPages: number;
        }>;
        findByIdDetail: (id: number) => Promise<{
            itemCount: any;
            paymentCount: any;
            totalPaid: any;
            timeline: any[];
            id: number;
            createdAt: Date;
            updatedAt: Date;
            outlet: {
                id: number;
                name: string;
                address: string | null;
                isActive: boolean;
                phone: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                merchant: {
                    id: number;
                    name: string;
                    address: string | null;
                    phone: string | null;
                    city: string | null;
                    country: string | null;
                    state: string | null;
                    zipCode: string | null;
                    email: string;
                    businessType: _prisma_client.$Enums.BusinessType;
                    taxId: string | null;
                    pricingType: _prisma_client.$Enums.PricingType;
                    currency: string;
                };
            };
            orderNumber: string;
            orderType: _prisma_client.$Enums.OrderType;
            status: _prisma_client.$Enums.OrderStatus;
            totalAmount: number;
            depositAmount: number;
            securityDeposit: number;
            damageFee: number;
            lateFee: number;
            discountType: string | null;
            discountValue: number;
            discountAmount: number;
            pickupPlanAt: Date | null;
            returnPlanAt: Date | null;
            pickedUpAt: Date | null;
            returnedAt: Date | null;
            rentalDuration: number | null;
            isReadyToDeliver: boolean;
            collateralType: string | null;
            collateralDetails: string | null;
            notes: string | null;
            pickupNotes: string | null;
            returnNotes: string | null;
            damageNotes: string | null;
            outletId: number;
            customerId: number | null;
            createdById: number;
            createdBy: {
                id: number;
                isActive: boolean;
                createdAt: Date;
                phone: string | null;
                email: string;
                firstName: string;
                lastName: string;
                role: _prisma_client.$Enums.UserRole;
            };
            customer: {
                id: number;
                address: string | null;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                notes: string | null;
                email: string | null;
                firstName: string;
                lastName: string;
                dateOfBirth: Date | null;
            } | null;
            orderItems: {
                id: number;
                notes: string | null;
                product: {
                    id: number;
                    name: string;
                    description: string | null;
                    isActive: boolean;
                    category: {
                        id: number;
                        name: string;
                        description: string | null;
                    };
                    barcode: string | null;
                    rentPrice: number;
                    deposit: number;
                    images: _prisma_client_runtime_library.JsonValue;
                };
                orderId: number;
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
                productName: string | null;
                productBarcode: string | null;
                productImages: _prisma_client_runtime_library.JsonValue;
            }[];
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                processedAt: Date | null;
            }[];
        } | null>;
        findByIdOptimized: (id: number, options?: {
            includeItems?: boolean;
            includePayments?: boolean;
            includeCustomer?: boolean;
            includeOutlet?: boolean;
        }) => Promise<{
            [x: string]: ({
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            } | {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            })[] | ({
                id: number;
                notes: string | null;
                orderId: number;
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
                productName: string | null;
                productBarcode: string | null;
                productImages: _prisma_client_runtime_library.JsonValue | null;
            } | {
                id: number;
                notes: string | null;
                orderId: number;
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
                productName: string | null;
                productBarcode: string | null;
                productImages: _prisma_client_runtime_library.JsonValue | null;
            })[] | {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[] | {
                id: number;
                notes: string | null;
                orderId: number;
                deposit: number;
                productId: number;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                rentalDays: number | null;
                productName: string | null;
                productBarcode: string | null;
                productImages: _prisma_client_runtime_library.JsonValue | null;
            }[];
            [x: number]: never;
            [x: symbol]: never;
        } | null>;
        searchWithCursor: (filters: {
            merchantId?: number;
            outletId?: number;
            status?: string;
            orderType?: string;
            startDate?: Date;
            endDate?: Date;
            cursor?: string;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
        }) => Promise<{
            data: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outlet: {
                    id: number;
                    name: string;
                    address: string | null;
                    phone: string | null;
                    city: string | null;
                    country: string | null;
                    state: string | null;
                    zipCode: string | null;
                    merchant: {
                        id: number;
                        name: string;
                    };
                };
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                outletId: number;
                customerId: number | null;
                createdById: number;
                createdBy: {
                    id: number;
                    email: string;
                    firstName: string;
                    lastName: string;
                };
                customer: {
                    id: number;
                    address: string | null;
                    phone: string;
                    city: string | null;
                    country: string | null;
                    state: string | null;
                    zipCode: string | null;
                    email: string | null;
                    firstName: string;
                    lastName: string;
                } | null;
                orderItems: {
                    id: number;
                    notes: string | null;
                    product: {
                        id: number;
                        name: string;
                        barcode: string | null;
                        rentPrice: number;
                        deposit: number;
                        images: _prisma_client_runtime_library.JsonValue;
                    };
                    quantity: number;
                    unitPrice: number;
                    totalPrice: number;
                }[];
            }[];
            hasMore: boolean;
            nextCursor: string | null | undefined;
        }>;
        getStatistics: (filters: {
            merchantId?: number;
            outletId?: number;
            startDate?: Date;
            endDate?: Date;
        }) => Promise<{
            totalOrders: number;
            totalRevenue: number;
            statusBreakdown: Record<string, number>;
            typeBreakdown: Record<string, number>;
            recentOrders: {
                id: number;
                createdAt: Date;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                customer: {
                    id: number;
                    phone: string;
                    firstName: string;
                    lastName: string;
                } | null;
            }[];
        }>;
    };
    payments: {
        create: typeof createPayment;
        findById: typeof findById;
        findBySubscriptionId: typeof findBySubscriptionId;
        search: typeof searchPayments;
        findFirst: (whereClause: any) => Promise<({
            order: {
                id: number;
                orderNumber: string;
                totalAmount: number;
            } | null;
        } & {
            id: number;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            status: _prisma_client.$Enums.PaymentStatus;
            notes: string | null;
            subscriptionId: number | null;
            type: _prisma_client.$Enums.PaymentType;
            metadata: string | null;
            currency: string;
            amount: number;
            method: _prisma_client.$Enums.PaymentMethod;
            reference: string | null;
            transactionId: string | null;
            invoiceNumber: string | null;
            failureReason: string | null;
            processedAt: Date | null;
            processedBy: string | null;
            orderId: number | null;
        }) | null>;
        getStats: (whereClause?: any) => Promise<number>;
        groupBy: (args: any) => Promise<(_prisma_client.Prisma.PickEnumerable<_prisma_client.Prisma.PaymentGroupByOutputType, _prisma_client.Prisma.PaymentScalarFieldEnum | _prisma_client.Prisma.PaymentScalarFieldEnum[]> & {
            _count: true | {
                id?: number | undefined;
                amount?: number | undefined;
                currency?: number | undefined;
                method?: number | undefined;
                type?: number | undefined;
                status?: number | undefined;
                reference?: number | undefined;
                transactionId?: number | undefined;
                invoiceNumber?: number | undefined;
                description?: number | undefined;
                notes?: number | undefined;
                failureReason?: number | undefined;
                metadata?: number | undefined;
                processedAt?: number | undefined;
                processedBy?: number | undefined;
                createdAt?: number | undefined;
                updatedAt?: number | undefined;
                orderId?: number | undefined;
                subscriptionId?: number | undefined;
                merchantId?: number | undefined;
                _all?: number | undefined;
            } | undefined;
            _avg: {
                id?: number | null | undefined;
                amount?: number | null | undefined;
                orderId?: number | null | undefined;
                subscriptionId?: number | null | undefined;
                merchantId?: number | null | undefined;
            } | undefined;
            _sum: {
                id?: number | null | undefined;
                amount?: number | null | undefined;
                orderId?: number | null | undefined;
                subscriptionId?: number | null | undefined;
                merchantId?: number | null | undefined;
            } | undefined;
            _min: {
                id?: number | null | undefined;
                amount?: number | null | undefined;
                currency?: string | null | undefined;
                method?: _prisma_client.$Enums.PaymentMethod | null | undefined;
                type?: _prisma_client.$Enums.PaymentType | null | undefined;
                status?: _prisma_client.$Enums.PaymentStatus | null | undefined;
                reference?: string | null | undefined;
                transactionId?: string | null | undefined;
                invoiceNumber?: string | null | undefined;
                description?: string | null | undefined;
                notes?: string | null | undefined;
                failureReason?: string | null | undefined;
                metadata?: string | null | undefined;
                processedAt?: Date | null | undefined;
                processedBy?: string | null | undefined;
                createdAt?: Date | null | undefined;
                updatedAt?: Date | null | undefined;
                orderId?: number | null | undefined;
                subscriptionId?: number | null | undefined;
                merchantId?: number | null | undefined;
            } | undefined;
            _max: {
                id?: number | null | undefined;
                amount?: number | null | undefined;
                currency?: string | null | undefined;
                method?: _prisma_client.$Enums.PaymentMethod | null | undefined;
                type?: _prisma_client.$Enums.PaymentType | null | undefined;
                status?: _prisma_client.$Enums.PaymentStatus | null | undefined;
                reference?: string | null | undefined;
                transactionId?: string | null | undefined;
                invoiceNumber?: string | null | undefined;
                description?: string | null | undefined;
                notes?: string | null | undefined;
                failureReason?: string | null | undefined;
                metadata?: string | null | undefined;
                processedAt?: Date | null | undefined;
                processedBy?: string | null | undefined;
                createdAt?: Date | null | undefined;
                updatedAt?: Date | null | undefined;
                orderId?: number | null | undefined;
                subscriptionId?: number | null | undefined;
                merchantId?: number | null | undefined;
            } | undefined;
        })[]>;
        aggregate: (args: any) => Promise<_prisma_client.Prisma.GetPaymentAggregateType<_prisma_client.Prisma.PaymentAggregateArgs<_prisma_client_runtime_library.DefaultArgs>>>;
    };
    outlets: {
        findById: (id: number) => Promise<({
            _count: {
                orders: number;
                products: number;
                users: number;
            };
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            name: string;
            address: string | null;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            name: string;
            address: string | null;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            name: string;
            address: string | null;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }>;
        findFirst: (where: any) => Promise<({
            _count: {
                orders: number;
                products: number;
                users: number;
            };
            merchant: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            name: string;
            address: string | null;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            phone: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }) | null>;
        getStats: (options: any) => Promise<number>;
        updateMany: (where: any, data: any) => Promise<_prisma_client.Prisma.BatchPayload>;
        search: (filters: any) => Promise<{
            data: ({
                _count: {
                    orders: number;
                    users: number;
                };
                merchant: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                name: string;
                address: string | null;
                description: string | null;
                isActive: boolean;
                isDefault: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                phone: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
            totalPages: number;
        }>;
        count: (options?: {
            where?: any;
        }) => Promise<number>;
    };
    merchants: {
        findById: typeof findById$1;
        findByEmail: typeof findByEmail;
        findByTenantKey: typeof findByTenantKey;
        findFirst: (whereClause: any) => Promise<{
            id: number;
            name: string;
            address: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            email: string;
            businessType: _prisma_client.$Enums.BusinessType;
            pricingConfig: string | null;
            pricingType: _prisma_client.$Enums.PricingType;
        } | null>;
        search: typeof search$3;
        create: typeof create;
        update: typeof update;
        remove: typeof remove;
        getStats: typeof getStats;
        count: typeof count;
        checkDuplicate: typeof checkDuplicate;
    };
    plans: {
        findById: (id: number) => Promise<{
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        } | null>;
        findByName: (name: string) => Promise<{
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        } | null>;
        create: (data: any) => Promise<{
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        }>;
        update: (id: number, data: any) => Promise<{
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            name: string;
            description: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        }>;
        search: (filters: any) => Promise<{
            data: {
                id: number;
                name: string;
                description: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                currency: string;
                basePrice: number;
                trialDays: number;
                limits: string;
                features: string;
                isPopular: boolean;
                sortOrder: number;
            }[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        findFirst: (whereClause: any) => Promise<{
            id: number;
            name: string;
            description: string;
            basePrice: number;
            currency: string;
            trialDays: number;
            limits: any;
            features: any;
            isActive: boolean;
            isPopular: boolean;
            sortOrder: number;
            pricing: {
                monthly: {
                    price: number;
                    discount: number;
                    savings: number;
                };
                quarterly: {
                    price: number;
                    discount: number;
                    savings: number;
                };
                yearly: {
                    price: number;
                    discount: number;
                    savings: number;
                };
            };
            createdAt: Date;
            updatedAt: Date;
            subscriptions: {
                id: number;
                merchantId: number;
                status: _prisma_client.$Enums.SubscriptionStatus;
            }[];
        } | null>;
        getStats: () => Promise<{
            totalPlans: number;
            activePlans: number;
            popularPlans: number;
        }>;
    };
    categories: {
        findById: (id: number) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null>;
        findFirst: (where: any) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null>;
        findMany: (options?: any) => Promise<{
            [x: string]: ({
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            } | {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            })[] | {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            }[];
            [x: number]: never;
            [x: symbol]: never;
        }[]>;
        create: (data: any) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        }>;
        update: (id: number, data: any) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            name: string;
            description: string | null;
            isActive: boolean;
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
        }>;
        search: (filters: any) => Promise<{
            data: {
                _count: {
                    products: number;
                };
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                isDefault: boolean;
                createdAt: Date;
                updatedAt: Date;
            }[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
            totalPages: number;
        }>;
        getStats: (whereClause?: any) => Promise<number>;
    };
    auditLogs: {
        findMany: (options?: any) => Promise<({
            [x: string]: never;
            [x: number]: never;
            [x: symbol]: never;
        } & {
            id: number;
            createdAt: Date;
            entityType: string;
            entityId: string;
            action: string;
            details: string;
            userId: number | null;
            ipAddress: string | null;
            userAgent: string | null;
        })[]>;
        findFirst: (where: any) => Promise<({
            user: {
                email: string;
                firstName: string;
                lastName: string;
                role: _prisma_client.$Enums.UserRole;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            entityType: string;
            entityId: string;
            action: string;
            details: string;
            userId: number | null;
            ipAddress: string | null;
            userAgent: string | null;
        }) | null>;
        create: (data: any) => Promise<{
            user: {
                email: string;
                firstName: string;
                lastName: string;
                role: _prisma_client.$Enums.UserRole;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            entityType: string;
            entityId: string;
            action: string;
            details: string;
            userId: number | null;
            ipAddress: string | null;
            userAgent: string | null;
        }>;
        getStats: (whereClause?: any) => Promise<number>;
    };
    orderItems: {
        findMany: (options?: any) => Promise<({
            [x: string]: never;
            [x: number]: never;
            [x: symbol]: never;
        } & {
            id: number;
            notes: string | null;
            orderId: number;
            deposit: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            rentalDays: number | null;
            productName: string | null;
            productBarcode: string | null;
            productImages: _prisma_client_runtime_library.JsonValue | null;
        })[]>;
        findFirst: (where: any) => Promise<({
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                outletId: number;
                customerId: number | null;
                createdById: number;
            };
            product: {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            };
        } & {
            id: number;
            notes: string | null;
            orderId: number;
            deposit: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            rentalDays: number | null;
            productName: string | null;
            productBarcode: string | null;
            productImages: _prisma_client_runtime_library.JsonValue | null;
        }) | null>;
        create: (data: any) => Promise<{
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                outletId: number;
                customerId: number | null;
                createdById: number;
            };
            product: {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            };
        } & {
            id: number;
            notes: string | null;
            orderId: number;
            deposit: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            rentalDays: number | null;
            productName: string | null;
            productBarcode: string | null;
            productImages: _prisma_client_runtime_library.JsonValue | null;
        }>;
        update: (id: number, data: any) => Promise<{
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                orderNumber: string;
                orderType: _prisma_client.$Enums.OrderType;
                status: _prisma_client.$Enums.OrderStatus;
                totalAmount: number;
                depositAmount: number;
                securityDeposit: number;
                damageFee: number;
                lateFee: number;
                discountType: string | null;
                discountValue: number;
                discountAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                rentalDuration: number | null;
                isReadyToDeliver: boolean;
                collateralType: string | null;
                collateralDetails: string | null;
                notes: string | null;
                pickupNotes: string | null;
                returnNotes: string | null;
                damageNotes: string | null;
                outletId: number;
                customerId: number | null;
                createdById: number;
            };
            product: {
                id: number;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: _prisma_client_runtime_library.JsonValue | null;
                categoryId: number;
            };
        } & {
            id: number;
            notes: string | null;
            orderId: number;
            deposit: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            rentalDays: number | null;
            productName: string | null;
            productBarcode: string | null;
            productImages: _prisma_client_runtime_library.JsonValue | null;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            notes: string | null;
            orderId: number;
            deposit: number;
            productId: number;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            rentalDays: number | null;
            productName: string | null;
            productBarcode: string | null;
            productImages: _prisma_client_runtime_library.JsonValue | null;
        }>;
        getStats: (whereClause?: any) => Promise<number>;
        groupBy: (options: any) => Promise<(_prisma_client.Prisma.PickEnumerable<_prisma_client.Prisma.OrderItemGroupByOutputType, _prisma_client.Prisma.OrderItemScalarFieldEnum | _prisma_client.Prisma.OrderItemScalarFieldEnum[]> & {
            _count: true | {
                id?: number | undefined;
                quantity?: number | undefined;
                unitPrice?: number | undefined;
                totalPrice?: number | undefined;
                deposit?: number | undefined;
                orderId?: number | undefined;
                productId?: number | undefined;
                notes?: number | undefined;
                rentalDays?: number | undefined;
                productName?: number | undefined;
                productBarcode?: number | undefined;
                productImages?: number | undefined;
                _all?: number | undefined;
            } | undefined;
            _avg: {
                id?: number | null | undefined;
                quantity?: number | null | undefined;
                unitPrice?: number | null | undefined;
                totalPrice?: number | null | undefined;
                deposit?: number | null | undefined;
                orderId?: number | null | undefined;
                productId?: number | null | undefined;
                rentalDays?: number | null | undefined;
            } | undefined;
            _sum: {
                id?: number | null | undefined;
                quantity?: number | null | undefined;
                unitPrice?: number | null | undefined;
                totalPrice?: number | null | undefined;
                deposit?: number | null | undefined;
                orderId?: number | null | undefined;
                productId?: number | null | undefined;
                rentalDays?: number | null | undefined;
            } | undefined;
            _min: {
                id?: number | null | undefined;
                quantity?: number | null | undefined;
                unitPrice?: number | null | undefined;
                totalPrice?: number | null | undefined;
                deposit?: number | null | undefined;
                orderId?: number | null | undefined;
                productId?: number | null | undefined;
                notes?: string | null | undefined;
                rentalDays?: number | null | undefined;
                productName?: string | null | undefined;
                productBarcode?: string | null | undefined;
            } | undefined;
            _max: {
                id?: number | null | undefined;
                quantity?: number | null | undefined;
                unitPrice?: number | null | undefined;
                totalPrice?: number | null | undefined;
                deposit?: number | null | undefined;
                orderId?: number | null | undefined;
                productId?: number | null | undefined;
                notes?: string | null | undefined;
                rentalDays?: number | null | undefined;
                productName?: string | null | undefined;
                productBarcode?: string | null | undefined;
            } | undefined;
        })[]>;
    };
    subscriptions: {
        findById: (id: number) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }) | null>;
        findByMerchantId: (merchantId: number) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                id: number;
                name: string;
            };
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    id: number;
                    name: string;
                };
                payments: {
                    id: number;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    merchantId: number | null;
                    status: _prisma_client.$Enums.PaymentStatus;
                    notes: string | null;
                    subscriptionId: number | null;
                    type: _prisma_client.$Enums.PaymentType;
                    metadata: string | null;
                    currency: string;
                    amount: number;
                    method: _prisma_client.$Enums.PaymentMethod;
                    reference: string | null;
                    transactionId: string | null;
                    invoiceNumber: string | null;
                    failureReason: string | null;
                    processedAt: Date | null;
                    processedBy: string | null;
                    orderId: number | null;
                }[];
                plan: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                status: _prisma_client.$Enums.SubscriptionStatus;
                planId: number;
                currency: string;
                amount: number;
                currentPeriodStart: Date;
                currentPeriodEnd: Date;
                trialStart: Date | null;
                trialEnd: Date | null;
                cancelAtPeriodEnd: boolean;
                canceledAt: Date | null;
                cancelReason: string | null;
                interval: string;
                intervalCount: number;
                period: number;
                discount: number;
                savings: number;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        findFirst: (whereClause: any) => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            payments: {
                id: number;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: _prisma_client.$Enums.PaymentStatus;
                notes: string | null;
                subscriptionId: number | null;
                type: _prisma_client.$Enums.PaymentType;
                metadata: string | null;
                currency: string;
                amount: number;
                method: _prisma_client.$Enums.PaymentMethod;
                reference: string | null;
                transactionId: string | null;
                invoiceNumber: string | null;
                failureReason: string | null;
                processedAt: Date | null;
                processedBy: string | null;
                orderId: number | null;
            }[];
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        }) | null>;
        getStats: (whereClause?: any) => Promise<number>;
        getExpired: () => Promise<({
            merchant: {
                id: number;
                name: string;
            };
            plan: {
                id: number;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: _prisma_client.$Enums.SubscriptionStatus;
            planId: number;
            currency: string;
            amount: number;
            currentPeriodStart: Date;
            currentPeriodEnd: Date;
            trialStart: Date | null;
            trialEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            canceledAt: Date | null;
            cancelReason: string | null;
            interval: string;
            intervalCount: number;
            period: number;
            discount: number;
            savings: number;
        })[]>;
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
        aggregate: (options: any) => Promise<_prisma_client.Prisma.GetOutletStockAggregateType<_prisma_client.Prisma.OutletStockAggregateArgs<_prisma_client_runtime_library.DefaultArgs>>>;
    };
    subscriptionActivities: {
        create: typeof createActivity;
        getBySubscriptionId: typeof getActivitiesBySubscriptionId;
    };
    sessions: {
        generateSessionId: typeof generateSessionId;
        createUserSession: typeof createUserSession;
        validateSession: typeof validateSession;
        invalidateSession: typeof invalidateSession;
        invalidateAllUserSessions: typeof invalidateAllUserSessions;
        getUserActiveSessions: typeof getUserActiveSessions;
        cleanupExpiredSessions: typeof cleanupExpiredSessions;
    };
    sync: {
        createdRecords: Map<number, CreatedRecord[]>;
        trackRecord(sessionId: number, record: CreatedRecord): void;
        rollback(sessionId: number): Promise<{
            deleted: number;
            errors: string[];
        }>;
        clearTracking(sessionId: number): void;
        createSession(input: CreateSessionInput): Promise<SyncSession>;
        updateStatus(sessionId: number, input: UpdateStatusInput): Promise<void>;
        addRecord(input: AddRecordInput): Promise<void>;
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
 * Generate next order number (simplified) - Random 8 digits
 */
declare const generateOrderNumber: (outletId: number) => Promise<string>;

export { type AuditContext, AuditLogger, type EmailVerificationToken, type OrderNumberFormat, type PasswordResetToken, type RegistrationInput, type RegistrationResult, type SimpleFilters, type SimpleResponse, checkDatabaseConnection, createEmailVerification, createOrderNumberWithFormat, createPasswordResetToken, createSubscriptionPayment, db, deleteExpiredPasswordResetTokens, deleteExpiredTokens, extractAuditContext, generateOrderNumber, generatePasswordResetToken, generateVerificationToken, getAuditLogger, getDefaultOutlet, getExpiredSubscriptions, getOutletOrderStats, getPasswordResetTokenByUserId, getSubscriptionById, getSubscriptionByMerchantId, getVerificationTokenByUserId, isEmailVerified, markTokenAsUsed, prisma, registerMerchantWithTrial, registerUser, resendVerificationToken, searchOrders, simplifiedPayments, simplifiedSubscriptionActivities, updateSubscription, verifyEmailByToken, verifyPasswordResetToken };
