import * as _prisma_client_runtime_library from '@prisma/client/runtime/library';
import { Prisma, PrismaClient } from '@prisma/client';
import * as _prisma_client from '.prisma/client';

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
    createdAt: Date;
    subscriptionId: number;
    type: string;
    description: string;
    reason: string | null;
    metadata: string | null;
    performedBy: number | null;
}>;
/**
 * Get activities for a subscription
 */
declare function getActivitiesBySubscriptionId(subscriptionId: number, options?: {
    limit?: number;
    offset?: number;
}): Promise<{
    activities: {
        metadata: any;
        user: {
            id: number;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
        } | null;
        id: number;
        createdAt: Date;
        subscriptionId: number;
        type: string;
        description: string;
        reason: string | null;
        performedBy: number | null;
    }[];
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
declare function findById$1(id: number): Promise<({
    subscription: ({
        plan: {
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string;
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
        status: string;
        planId: number;
        amount: number;
        currency: string;
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
    Plan: {
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
    _count: {
        products: number;
        customers: number;
        outlets: number;
        users: number;
    };
    outlets: {
        name: string;
        id: number;
        isActive: boolean;
    }[];
} & {
    name: string;
    id: number;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    businessType: string | null;
    pricingType: string | null;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    planId: number | null;
    subscriptionStatus: string;
    totalRevenue: number;
    lastActiveAt: Date | null;
}) | null>;
/**
 * Find merchant by email
 */
declare function findByEmail(email: string): Promise<({
    subscription: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: string;
        planId: number;
        amount: number;
        currency: string;
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
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    name: string;
    id: number;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    businessType: string | null;
    pricingType: string | null;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    planId: number | null;
    subscriptionStatus: string;
    totalRevenue: number;
    lastActiveAt: Date | null;
}) | null>;
/**
 * Search merchants with filtering and pagination
 */
declare function search(filters: MerchantFilters): Promise<SimpleResponse<any>>;
/**
 * Create new merchant
 */
declare function create(data: MerchantCreateData): Promise<{
    subscription: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        merchantId: number;
        status: string;
        planId: number;
        amount: number;
        currency: string;
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
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    name: string;
    id: number;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    businessType: string | null;
    pricingType: string | null;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    planId: number | null;
    subscriptionStatus: string;
    totalRevenue: number;
    lastActiveAt: Date | null;
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
        status: string;
        planId: number;
        amount: number;
        currency: string;
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
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string;
        currency: string;
        basePrice: number;
        trialDays: number;
        limits: string;
        features: string;
        isPopular: boolean;
        sortOrder: number;
    } | null;
} & {
    name: string;
    id: number;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    businessType: string | null;
    pricingType: string | null;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    planId: number | null;
    subscriptionStatus: string;
    totalRevenue: number;
    lastActiveAt: Date | null;
}>;
/**
 * Delete merchant (soft delete)
 */
declare function remove(id: number): Promise<{
    name: string;
    id: number;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    state: string | null;
    zipCode: string | null;
    businessType: string | null;
    pricingType: string | null;
    taxId: string | null;
    website: string | null;
    pricingConfig: string | null;
    planId: number | null;
    subscriptionStatus: string;
    totalRevenue: number;
    lastActiveAt: Date | null;
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
 * Create payment
 */
declare function createPayment(data: Prisma.PaymentCreateInput): Promise<{
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
        outletId: number;
        orderNumber: string;
        orderType: string;
        status: string;
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
        customerId: number | null;
        createdById: number;
    }) | null;
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: string;
    notes: string | null;
    subscriptionId: number | null;
    type: string;
    description: string | null;
    metadata: string | null;
    amount: number;
    currency: string;
    method: string;
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
        outletId: number;
        orderNumber: string;
        orderType: string;
        status: string;
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
        customerId: number | null;
        createdById: number;
    }) | null;
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: string;
    notes: string | null;
    subscriptionId: number | null;
    type: string;
    description: string | null;
    metadata: string | null;
    amount: number;
    currency: string;
    method: string;
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
    createdAt: Date;
    updatedAt: Date;
    merchantId: number | null;
    status: string;
    notes: string | null;
    subscriptionId: number | null;
    type: string;
    description: string | null;
    metadata: string | null;
    amount: number;
    currency: string;
    method: string;
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
        createdAt: Date;
        updatedAt: Date;
        merchantId: number | null;
        status: string;
        notes: string | null;
        subscriptionId: number | null;
        type: string;
        description: string | null;
        metadata: string | null;
        amount: number;
        currency: string;
        method: string;
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
            method?: string | null | undefined;
            type?: string | null | undefined;
            status?: string | null | undefined;
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
            method?: string | null | undefined;
            type?: string | null | undefined;
            status?: string | null | undefined;
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
        findById: (id: number) => Promise<({
            merchant: {
                name: string;
                id: number;
                email: string;
                phone: string | null;
                isActive: boolean;
                createdAt: Date;
                description: string | null;
                address: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                businessType: string | null;
                pricingType: string | null;
                taxId: string | null;
                website: string | null;
                planId: number | null;
                subscriptionStatus: string;
                totalRevenue: number;
                lastActiveAt: Date | null;
            } | null;
            outlet: {
                name: string;
                id: number;
                phone: string | null;
                isActive: boolean;
                createdAt: Date;
                description: string | null;
                merchant: {
                    name: string;
                    id: number;
                };
                address: string | null;
                isDefault: boolean;
            } | null;
        } & {
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }) | null>;
        findByEmail: (email: string) => Promise<({
            merchant: {
                name: string;
                id: number;
            } | null;
            outlet: {
                name: string;
                id: number;
            } | null;
        } & {
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }) | null>;
        findFirst: (where: any) => Promise<({
            merchant: {
                name: string;
                id: number;
            } | null;
            outlet: {
                name: string;
                id: number;
            } | null;
        } & {
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
                email: string;
                phone: string | null;
                isActive: boolean;
                createdAt: Date;
                description: string | null;
                address: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                businessType: string | null;
                taxId: string | null;
                website: string | null;
                planId: number | null;
                subscriptionStatus: string;
                totalRevenue: number;
                lastActiveAt: Date | null;
            } | null;
            outlet: {
                name: string;
                id: number;
                phone: string | null;
                isActive: boolean;
                createdAt: Date;
                description: string | null;
                merchant: {
                    name: string;
                    id: number;
                };
                address: string | null;
                isDefault: boolean;
            } | null;
        } & {
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            } | null;
            outlet: {
                name: string;
                id: number;
            } | null;
        } & {
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }>;
        delete: (id: number) => Promise<{
            id: number;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number | null;
            outletId: number | null;
            deletedAt: Date | null;
        }>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    name: string;
                    id: number;
                } | null;
                outlet: {
                    name: string;
                    id: number;
                } | null;
            } & {
                id: number;
                email: string;
                password: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                role: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                outletId: number | null;
                deletedAt: Date | null;
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
    customers: {
        findById: (id: number) => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            orders: {
                id: number;
                createdAt: Date;
                orderNumber: string;
                status: string;
                totalAmount: number;
            }[];
        } & {
            id: number;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            notes: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
        } & {
            id: number;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            notes: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
        } & {
            id: number;
            email: string | null;
            firstName: string;
            lastName: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            notes: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
            dateOfBirth: Date | null;
            idNumber: string | null;
            idType: string | null;
        }>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    name: string;
                    id: number;
                };
                _count: {
                    orders: number;
                };
            } & {
                id: number;
                email: string | null;
                firstName: string;
                lastName: string;
                phone: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                notes: string | null;
                address: string | null;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
                dateOfBirth: Date | null;
                idNumber: string | null;
                idType: string | null;
            })[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
        getStats: (whereClause?: any) => Promise<number>;
    };
    products: {
        findById: (id: number) => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            category: {
                name: string;
                id: number;
            };
            outletStock: ({
                outlet: {
                    name: string;
                    id: number;
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
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: string | null;
            categoryId: number;
        }) | null>;
        findByBarcode: (barcode: string) => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            category: {
                name: string;
                id: number;
            };
            outletStock: ({
                outlet: {
                    name: string;
                    id: number;
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
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: string | null;
            categoryId: number;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
            category: {
                name: string;
                id: number;
            };
            outletStock: ({
                outlet: {
                    name: string;
                    id: number;
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
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: string | null;
            categoryId: number;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
            category: {
                name: string;
                id: number;
            };
            outletStock: ({
                outlet: {
                    name: string;
                    id: number;
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
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: string | null;
            categoryId: number;
        }>;
        delete: (id: number) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            barcode: string | null;
            totalStock: number;
            rentPrice: number;
            salePrice: number | null;
            deposit: number;
            images: string | null;
            categoryId: number;
        }>;
        getStats: (where?: any) => Promise<number>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    name: string;
                    id: number;
                };
                category: {
                    name: string;
                    id: number;
                };
                outletStock: ({
                    outlet: {
                        name: string;
                        id: number;
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
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
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
                name: string;
                id: number;
            };
            customer: {
                id: number;
                email: string | null;
                firstName: string;
                lastName: string;
                phone: string;
            } | null;
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            orderItems: ({
                product: {
                    name: string;
                    id: number;
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
            })[];
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: string;
                notes: string | null;
                subscriptionId: number | null;
                type: string;
                description: string | null;
                metadata: string | null;
                amount: number;
                currency: string;
                method: string;
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
            outletId: number;
            orderNumber: string;
            orderType: string;
            status: string;
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
            customerId: number | null;
            createdById: number;
        }) | null>;
        findByNumber: (orderNumber: string) => Promise<({
            outlet: {
                name: string;
                id: number;
                merchantId: number;
                merchant: {
                    name: string;
                    id: number;
                };
            };
            customer: {
                id: number;
                email: string | null;
                firstName: string;
                lastName: string;
                phone: string;
            } | null;
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            orderItems: ({
                product: {
                    name: string;
                    id: number;
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
            })[];
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: string;
                notes: string | null;
                subscriptionId: number | null;
                type: string;
                description: string | null;
                metadata: string | null;
                amount: number;
                currency: string;
                method: string;
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
            outletId: number;
            orderNumber: string;
            orderType: string;
            status: string;
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
            customerId: number | null;
            createdById: number;
        }) | null>;
        create: (data: any) => Promise<{
            outlet: {
                name: string;
                id: number;
            };
            customer: {
                id: number;
                email: string | null;
                firstName: string;
                lastName: string;
                phone: string;
            } | null;
            createdBy: {
                id: number;
                firstName: string;
                lastName: string;
            };
            orderItems: ({
                product: {
                    name: string;
                    id: number;
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
            })[];
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: string;
                notes: string | null;
                subscriptionId: number | null;
                type: string;
                description: string | null;
                metadata: string | null;
                amount: number;
                currency: string;
                method: string;
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
            outletId: number;
            orderNumber: string;
            orderType: string;
            status: string;
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
            customerId: number | null;
            createdById: number;
        }>;
        update: (id: number, data: any) => Promise<OrderWithRelations>;
        delete: (id: number) => Promise<{
            id: number;
            createdAt: Date;
            updatedAt: Date;
            outletId: number;
            orderNumber: string;
            orderType: string;
            status: string;
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
            customerId: number | null;
            createdById: number;
        }>;
        search: (filters: any) => Promise<{
            data: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                orderNumber: string;
                orderType: string;
                status: string;
                totalAmount: number;
                depositAmount: number;
                pickupPlanAt: Date | null;
                returnPlanAt: Date | null;
                pickedUpAt: Date | null;
                returnedAt: Date | null;
                outlet: {
                    name: string;
                    id: number;
                    merchant: {
                        name: string;
                        id: number;
                    };
                };
                customer: {
                    id: number;
                    email: string | null;
                    firstName: string;
                    lastName: string;
                    phone: string;
                } | null;
                _count: {
                    orderItems: number;
                    payments: number;
                };
                createdBy: {
                    id: number;
                    firstName: string;
                    lastName: string;
                };
            }[];
            total: number;
            page: any;
            limit: any;
            hasMore: boolean;
        }>;
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
                orderType?: string | null | undefined;
                status?: string | null | undefined;
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
                orderType?: string | null | undefined;
                status?: string | null | undefined;
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
    };
    payments: {
        create: typeof createPayment;
        findById: typeof findById;
        findBySubscriptionId: typeof findBySubscriptionId;
        search: typeof searchPayments;
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
                method?: string | null | undefined;
                type?: string | null | undefined;
                status?: string | null | undefined;
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
                method?: string | null | undefined;
                type?: string | null | undefined;
                status?: string | null | undefined;
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
            merchant: {
                name: string;
                id: number;
            };
            _count: {
                products: number;
                users: number;
                orders: number;
            };
        } & {
            name: string;
            id: number;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            address: string | null;
            isDefault: boolean;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }) | null>;
        create: (data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
        } & {
            name: string;
            id: number;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            address: string | null;
            isDefault: boolean;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }>;
        update: (id: number, data: any) => Promise<{
            merchant: {
                name: string;
                id: number;
            };
        } & {
            name: string;
            id: number;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            address: string | null;
            isDefault: boolean;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }>;
        findFirst: (where: any) => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            _count: {
                products: number;
                users: number;
                orders: number;
            };
        } & {
            name: string;
            id: number;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            description: string | null;
            address: string | null;
            isDefault: boolean;
            city: string | null;
            country: string | null;
            state: string | null;
            zipCode: string | null;
        }) | null>;
        getStats: (options: any) => Promise<number>;
        updateMany: (where: any, data: any) => Promise<_prisma_client.Prisma.BatchPayload>;
        search: (filters: any) => Promise<{
            data: ({
                merchant: {
                    name: string;
                    id: number;
                };
                _count: {
                    users: number;
                    orders: number;
                };
            } & {
                name: string;
                id: number;
                phone: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                address: string | null;
                isDefault: boolean;
                city: string | null;
                country: string | null;
                state: string | null;
                zipCode: string | null;
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
        findById: (id: number) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        } | null>;
        create: (data: any) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        }>;
        update: (id: number, data: any) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string;
            currency: string;
            basePrice: number;
            trialDays: number;
            limits: string;
            features: string;
            isPopular: boolean;
            sortOrder: number;
        }>;
        delete: (id: number) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string;
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
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                description: string;
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
        getStats: () => Promise<{
            totalPlans: number;
            activePlans: number;
            popularPlans: number;
        }>;
    };
    categories: {
        findById: (id: number) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null>;
        findFirst: (where: any) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        } | null>;
        findMany: (options?: any) => Promise<{
            [x: string]: ({
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
                categoryId: number;
            } | {
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
                categoryId: number;
            })[] | {
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
                categoryId: number;
            }[];
            [x: number]: never;
            [x: symbol]: never;
        }[]>;
        create: (data: any) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        }>;
        update: (id: number, data: any) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        }>;
        delete: (id: number) => Promise<{
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
        }>;
        getStats: (where?: any) => Promise<number>;
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
                role: string;
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
                role: string;
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
        getStats: (where?: any) => Promise<number>;
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
        })[]>;
        findFirst: (where: any) => Promise<({
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                orderNumber: string;
                orderType: string;
                status: string;
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
                customerId: number | null;
                createdById: number;
            };
            product: {
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
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
        }) | null>;
        create: (data: any) => Promise<{
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                orderNumber: string;
                orderType: string;
                status: string;
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
                customerId: number | null;
                createdById: number;
            };
            product: {
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
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
        }>;
        update: (id: number, data: any) => Promise<{
            order: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                outletId: number;
                orderNumber: string;
                orderType: string;
                status: string;
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
                customerId: number | null;
                createdById: number;
            };
            product: {
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number;
                description: string | null;
                barcode: string | null;
                totalStock: number;
                rentPrice: number;
                salePrice: number | null;
                deposit: number;
                images: string | null;
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
        }>;
        getStats: (where?: any) => Promise<number>;
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
            } | undefined;
        })[]>;
    };
    subscriptions: {
        findById: (id: number) => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            plan: {
                name: string;
                id: number;
            };
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: string;
                notes: string | null;
                subscriptionId: number | null;
                type: string;
                description: string | null;
                metadata: string | null;
                amount: number;
                currency: string;
                method: string;
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
            merchantId: number;
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
                name: string;
                id: number;
            };
            plan: {
                name: string;
                id: number;
            };
            payments: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                merchantId: number | null;
                status: string;
                notes: string | null;
                subscriptionId: number | null;
                type: string;
                description: string | null;
                metadata: string | null;
                amount: number;
                currency: string;
                method: string;
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
            merchantId: number;
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
                name: string;
                id: number;
            };
            plan: {
                name: string;
                id: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
                name: string;
                id: number;
            };
            plan: {
                name: string;
                id: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
                    name: string;
                    id: number;
                };
                plan: {
                    name: string;
                    id: number;
                };
                payments: {
                    id: number;
                    createdAt: Date;
                    updatedAt: Date;
                    merchantId: number | null;
                    status: string;
                    notes: string | null;
                    subscriptionId: number | null;
                    type: string;
                    description: string | null;
                    metadata: string | null;
                    amount: number;
                    currency: string;
                    method: string;
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
                merchantId: number;
                status: string;
                planId: number;
                amount: number;
                currency: string;
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
        getExpired: () => Promise<({
            merchant: {
                name: string;
                id: number;
            };
            plan: {
                name: string;
                id: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            merchantId: number;
            status: string;
            planId: number;
            amount: number;
            currency: string;
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
