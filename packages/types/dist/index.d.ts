import { SubscriptionStatus, BillingInterval } from '@rentalshop/constants';
export { BillingInterval, SubscriptionStatus } from '@rentalshop/constants';

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
 * Soft delete interface
 * Used for entities that support soft deletion
 */
interface SoftDelete {
    deletedAt?: Date | string;
    isDeleted: boolean;
}
/**
 * Timestamp interface for entities that only need time tracking
 */
interface Timestamp {
    createdAt: Date | string;
    updatedAt: Date | string;
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
 * Standard pagination parameters
 * Used across all search/filter operations
 */
interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}
/**
 * Standard pagination metadata
 * Used in all paginated responses
 */
interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    hasMore: boolean;
}
/**
 * Generic paginated result
 * Used for all paginated API responses
 */
interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
}
/**
 * Base search parameters
 * Common search fields used across entities
 */
interface BaseSearchParams extends PaginationParams {
    search?: string;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Base search result
 * Common structure for search responses
 */
interface BaseSearchResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}
/**
 * Common status values
 * Used across different entities
 */
type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended';
/**
 * Common action types
 * Used for CRUD operations
 */
type EntityAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';
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
/**
 * Standard API response wrapper
 * Used for all API responses
 */
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
}
/**
 * Standard API error response
 * Used for error responses
 */
interface ApiErrorResponse {
    success: false;
    error: string;
    message: string;
    errors?: Record<string, string[]>;
    statusCode?: number;
}
/**
 * Validation error interface
 * Used for form validation errors
 */
interface ValidationError {
    field: string;
    message: string;
    code?: string;
}
/**
 * Validation result interface
 * Used for validation responses
 */
interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

type UserRole$1 = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
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
    role: UserRole$1;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: Date | string;
    outletId?: number;
    merchant?: MerchantReference;
    outlet?: OutletReference;
}
/**
 * Authentication-specific user interface
 * Used for login/session management
 */
interface AuthUser extends BaseEntity {
    email: string;
    name: string;
    role: UserRole$1;
    merchantId?: number;
    outletId?: number;
    isActive: boolean;
    lastLoginAt?: Date | string;
}
/**
 * User creation input
 * Used for creating new users
 */
interface UserCreateInput extends BaseFormInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole$1;
    merchantId?: number;
    outletId?: number;
}
/**
 * User update input
 * Used for updating existing users
 */
interface UserUpdateInput extends BaseUpdateInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
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
 * User session interface
 * Used for session management
 */
interface UserSession {
    user: AuthUser;
    token: string;
    expiresAt: Date | string;
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
    role: UserRole$1;
    merchantId?: number;
    outletId?: number;
    businessName?: string;
    outletName?: string;
    merchantCode?: string;
    outletCode?: string;
}
/**
 * Password reset data
 * Used for password reset functionality
 */
interface PasswordReset {
    email: string;
    token: string;
    newPassword: string;
}
/**
 * Change password data
 * Used for changing user password
 */
interface ChangePassword {
    currentPassword: string;
    newPassword: string;
}
/**
 * User search parameters
 * Extends base search with user-specific filters
 */
interface UserSearchParams extends BaseSearchParams {
    role?: UserRole$1;
    merchantId?: number;
    outletId?: number;
    isActive?: boolean;
    status?: 'all' | 'active' | 'inactive';
    emailVerified?: boolean;
}
/**
 * User search result
 * Extends base search result with user-specific data
 */
interface UserSearchResult extends BaseSearchResult<User> {
    users: User[];
}
/**
 * User data interface for management views
 * Used in user management components
 */
interface UserData {
    users: User[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
/**
 * User action type
 * Used for user management actions
 */
type UserAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';
/**
 * User statistics interface
 * Used for user analytics and reporting
 */
interface UserStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: Record<UserRole$1, number>;
    usersByMerchant: Record<number, number>;
    usersByOutlet: Record<number, number>;
    recentLogins: number;
    newUsersThisMonth: number;
}
/**
 * User permissions interface
 * Used for role-based access control
 */
interface UserPermissions {
    canManageUsers: boolean;
    canManageMerchants: boolean;
    canManageOutlets: boolean;
    canManageProducts: boolean;
    canManageOrders: boolean;
    canManageCustomers: boolean;
    canViewAnalytics: boolean;
    canManageSettings: boolean;
}
/**
 * User search filter
 * Used for user search operations in API
 */
interface UserSearchFilter {
    q?: string;
    search?: string;
    merchantId?: number;
    outletId?: number;
    role?: UserRole$1;
    status?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
type UserFilters = UserSearchFilter;

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
 * Merchant creation input
 * Used for creating new merchants
 */
interface MerchantCreateInput extends BaseFormInput {
    name: string;
    email: string;
    phone?: string;
    description?: string;
    planId?: number;
    isActive?: boolean;
}
/**
 * Merchant update input
 * Used for updating existing merchants
 */
interface MerchantUpdateInput extends BaseUpdateInput {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessType?: string;
    taxId?: number;
    isActive?: boolean;
}
/**
 * Merchant search parameters
 * Extends base search with merchant-specific filters
 */
interface MerchantSearchParams extends BaseSearchParams {
    status?: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
    plan?: string;
    businessType?: string;
    country?: string;
    startDate?: Date | string;
    endDate?: Date | string;
}
/**
 * Merchant search result
 * Extends base search result with merchant-specific data
 */
interface MerchantSearchResult extends BaseSearchResult<Merchant> {
    merchants: Merchant[];
}
/**
 * Merchant statistics interface
 * Used for merchant analytics and reporting
 */
interface MerchantStats {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    planName?: string;
    subscriptionEndDate?: Date | string;
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    totalOutlets: number;
    monthlyRevenue: number;
    monthlyOrders: number;
    monthlyCustomers: number;
    createdAt: Date | string;
    lastActivity: Date | string;
}
/**
 * Detailed merchant statistics
 * Used for comprehensive merchant analytics
 */
interface MerchantDetailStats {
    totalOutlets: number;
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
}
/**
 * Merchant detail data interface
 * Used for comprehensive merchant management views
 */
interface MerchantDetailData {
    merchant: Merchant;
    outlets?: OutletReference[];
    users?: UserReference[];
    products?: ProductReference[];
    customers?: CustomerReference[];
    stats: MerchantDetailStats;
}
/**
 * Merchant action type
 * Used for merchant management actions
 */
type MerchantAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'suspend';
/**
 * Merchant filters interface
 * Used for filtering merchants in management views
 */
interface MerchantFilters {
    search?: string;
    status?: string;
    planId?: number;
    businessType?: string;
    country?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    page?: number;
    limit?: number;
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
interface OutletCreateInput extends BaseFormInput {
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
interface OutletUpdateInput extends BaseUpdateInput {
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
 * Outlet search parameters
 * Extends base search with outlet-specific filters
 */
interface OutletSearchParams extends BaseSearchParams {
    merchantId?: number;
    outletId?: number;
    isActive?: boolean;
    isDefault?: boolean;
    city?: string;
    state?: string;
    country?: string;
}
/**
 * Outlet search result
 * Used for outlet search responses
 */
interface OutletSearchResult {
    id: number;
    name: string;
    address?: string;
    phone?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    description?: string;
    isActive: boolean;
    isDefault?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    merchantId: number;
    merchant: {
        id: number;
        name: string;
    };
}
/**
 * Outlet search response
 * Used for API responses with pagination
 */
interface OutletSearchResponse {
    outlets: OutletSearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}
/**
 * Outlet data interface for management views
 * Used in outlet management components
 */
interface OutletData {
    outlets: Outlet[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    filters: OutletFilters;
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
type OutletSearchFilter = OutletFilters;
/**
 * Outlet action type
 * Used for outlet management actions
 */
type OutletAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'setDefault';
/**
 * Outlet statistics interface
 * Used for outlet analytics and reporting
 */
interface OutletStats {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    monthlyRevenue: number;
    monthlyOrders: number;
}
/**
 * Outlet performance metrics
 * Used for outlet performance analysis
 */
interface OutletPerformance {
    outletId: number;
    outletName: string;
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    growthRate: number;
    efficiency: number;
}
/**
 * Outlet inventory summary
 * Used for inventory management
 */
interface OutletInventorySummary {
    outletId: number;
    outletName: string;
    totalProducts: number;
    totalStock: number;
    availableStock: number;
    rentedStock: number;
    lowStockProducts: number;
    outOfStockProducts: number;
}
/**
 * Outlet stock level
 * Used for stock management
 */
interface OutletStockLevel {
    productId: number;
    productName: string;
    currentStock: number;
    availableStock: number;
    rentedStock: number;
    reservedStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
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
interface ProductCreateInput extends BaseFormInput {
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
interface ProductUpdateInput extends BaseUpdateInput {
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
 * Product search parameters
 * Extends base search with product-specific filters
 */
interface ProductSearchParams extends BaseSearchParams {
    merchantId?: number;
    categoryId?: number;
    outletId?: number;
    available?: boolean;
    status?: 'all' | 'active' | 'inactive';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    lowStock?: boolean;
}
/**
 * Product search result
 * Extends base search result with product-specific data
 */
interface ProductSearchResult extends BaseSearchResult<Product> {
    products: Product[];
}
/**
 * Product search response
 * Used for API responses with pagination
 */
interface ProductSearchResponse {
    success: boolean;
    data: {
        products: ProductWithStock[];
        total: number;
        page: number;
        limit: number;
        offset: number;
        hasMore: boolean;
        totalPages: number;
    };
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
 * Product input interface
 * Used for database operations
 */
interface ProductInput {
    merchantId: number;
    categoryId: number;
    name: string;
    description?: string;
    barcode?: string;
    totalStock: number;
    rentPrice: number;
    salePrice?: number;
    deposit: number;
    images?: string[];
    outletStock: Array<{
        outletId: number;
        stock: number;
    }>;
}
/**
 * Outlet stock input interface
 * Used for outlet stock management
 */
interface OutletStockInput {
    productId: number;
    outletId: number;
    stock: number;
    available?: number;
    renting?: number;
}
/**
 * Product action type
 * Used for product management actions
 */
type ProductAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'manageStock';
/**
 * Top product interface
 * Used for product analytics and reporting
 */
interface TopProduct {
    id: number;
    name: string;
    rentPrice: number;
    category: string;
    rentalCount: number;
    totalRevenue: number;
    image?: string | null;
}
/**
 * Product performance metrics
 * Used for product performance analysis
 */
interface ProductPerformance {
    productId: number;
    productName: string;
    category: string;
    totalRentals: number;
    totalRevenue: number;
    averageRentalDuration: number;
    utilizationRate: number;
    profitMargin: number;
}
/**
 * Product inventory summary
 * Used for inventory management
 */
interface ProductInventorySummary {
    totalProducts: number;
    totalStock: number;
    availableStock: number;
    rentedStock: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    highPerformingProducts: number;
    lowPerformingProducts: number;
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
interface OrderCreateInput extends BaseFormInput {
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
 * Order search parameters
 * Extends base search with order-specific filters
 */
interface OrderSearchParams extends BaseSearchParams {
    status?: OrderStatus | OrderStatus[];
    orderType?: OrderType;
    outletId?: number;
    customerId?: number;
    productId?: number;
    startDate?: Date | string;
    endDate?: Date | string;
    pickupDate?: Date | string;
    returnDate?: Date | string;
    minAmount?: number;
    maxAmount?: number;
    isReadyToDeliver?: boolean;
    dateRange?: {
        start: string;
        end: string;
    };
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
 * Order with details
 * Used for detailed order views
 */
interface OrderWithDetails {
    id: number;
    orderNumber: string;
    orderType: OrderType;
    status: OrderStatus;
    customerId?: number;
    outletId: number;
    createdById: number;
    totalAmount: number;
    depositAmount: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    pickedUpAt?: Date | string;
    returnedAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
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
    merchantId: number;
    customer?: CustomerReference;
    outlet: OutletReference;
    orderItems: OrderItemWithProduct[];
    payments: Payment[];
    createdBy?: UserReference;
    merchant: MerchantReference;
}
/**
 * Order action type
 * Used for order management actions
 */
type OrderAction = 'create' | 'edit' | 'view' | 'delete' | 'pickup' | 'return' | 'complete' | 'cancel';
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
 * Order statistics interface
 * Used for order analytics and reporting
 */
interface OrderStats {
    totalOrders: number;
    totalRevenue: number;
    totalDeposits: number;
    activeRentals: number;
    overdueRentals: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
}
/**
 * Order statistics by period
 * Used for time-based analytics
 */
interface OrderStatsByPeriod {
    period: string;
    orders: number;
    revenue: number;
    deposits: number;
}
/**
 * Order history input
 * Used for order audit trails
 */
interface OrderHistoryInput {
    orderId: number;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    notes?: string;
    userId?: string;
}
/**
 * Order export data
 * Used for order data export
 */
interface OrderExportData {
    orderNumber: string;
    orderType: string;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    outletName: string;
    totalAmount: number;
    depositAmount: number;
    pickupPlanAt?: string;
    returnPlanAt?: string;
    pickedUpAt?: string;
    returnedAt?: string;
    createdAt: string;
    updatedAt: string;
    notes?: string;
}
/**
 * Order list data interface
 * Used for order list displays in admin/client apps
 */
interface OrderListData {
    orders: OrderSearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    filters: OrderFilters;
}
/**
 * Orders data interface with stats
 * Used for Orders component with statistics
 */
interface OrdersData {
    orders: OrderSearchResult[];
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
    stats?: OrderStats;
}
/**
 * Order detail data interface
 * Used for detailed order views in admin/client apps
 */
interface OrderDetailData {
    order: OrderWithDetails;
    relatedOrders: OrderSearchResult[];
    customerHistory: CustomerReference[];
    productHistory: ProductReference[];
}
/**
 * Order data interface for client components
 * Used for order displays in client apps
 */
interface OrderData {
    id: number;
    orderNumber: string;
    orderType: OrderType;
    status: OrderStatus;
    customerName: string;
    customerPhone: string;
    totalAmount: number;
    depositAmount: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
    outletName: string;
    isReadyToDeliver: boolean;
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
 * Customer creation input
 * Used for creating new customers
 */
interface CustomerCreateInput extends BaseFormInput {
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
    outletId?: number;
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
 * Customer search parameters
 * Extends base search with customer-specific filters
 */
interface CustomerSearchParams extends BaseSearchParams {
    merchantId?: number;
    outletId?: number;
    city?: string;
    state?: string;
    country?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    isActive?: boolean;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive' | 'blocked';
}
/**
 * Customer search result
 * Used for customer search responses
 */
interface CustomerSearchResult {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    dateOfBirth?: Date | string;
    idNumber?: string;
    idType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
    isActive: boolean;
    notes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    merchantId: number;
    merchant: {
        id: number;
        name: string;
    };
}
/**
 * Customer search response
 * Used for API responses with pagination
 */
interface CustomerSearchResponse {
    success: boolean;
    data: {
        customers: CustomerWithMerchant[];
        total: number;
        page: number;
        limit: number;
        offset: number;
        hasMore: boolean;
        totalPages: number;
    };
}
/**
 * Customer with merchant information
 * Used for customer displays with merchant context
 */
interface CustomerWithMerchant extends Customer {
    merchant: MerchantReference;
}
/**
 * Customer data interface for management views
 * Used in customer management components
 */
interface CustomerData extends Customer {
    fullName: string;
    orderCount: number;
    totalSpent: number;
}
/**
 * Customer management interface
 * Used for customer management operations
 */
interface CustomerManagement {
    createCustomer(input: CustomerCreateInput): Promise<Customer>;
    updateCustomer(id: number, input: CustomerUpdateInput): Promise<Customer>;
    deleteCustomer(id: number): Promise<void>;
    getCustomer(id: number): Promise<Customer | null>;
    getCustomers(filters?: CustomerSearchParams): Promise<Customer[]>;
}
/**
 * Customer action type
 * Used for customer management actions
 */
type CustomerAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate' | 'block';
/**
 * Customer statistics interface
 * Used for customer analytics and reporting
 */
interface CustomerStats {
    totalCustomers: number;
    newCustomersThisMonth: number;
    topCustomers: TopCustomer[];
}
/**
 * Top customer interface
 * Used for customer analytics and reporting
 */
interface TopCustomer {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    orderCount: number;
    rentalCount: number;
    saleCount: number;
    totalSpent: number;
}
/**
 * Customer performance metrics
 * Used for customer performance analysis
 */
interface CustomerPerformance {
    customerId: number;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: Date | string;
    customerLifetimeValue: number;
    retentionRate: number;
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
 * Category creation input
 * Used for creating new categories
 */
interface CategoryCreateInput extends BaseFormInput {
    name: string;
    description?: string;
    isActive?: boolean;
    merchantId: number;
}
/**
 * Category update input
 * Used for updating existing categories
 */
interface CategoryUpdateInput extends BaseUpdateInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}
/**
 * Category search parameters
 * Extends base search with category-specific filters
 */
interface CategorySearchParams extends BaseSearchParams {
    merchantId?: number;
    isActive?: boolean;
    status?: 'all' | 'active' | 'inactive';
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
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
/**
 * Category search result
 * Extends base search result with category-specific data
 */
interface CategorySearchResult extends BaseSearchResult<Category> {
    categories: Category[];
}
/**
 * Category search response
 * Used for API responses with pagination
 */
interface CategorySearchResponse {
    success: boolean;
    data: CategorySearchResult;
    message?: string;
}
/**
 * Category data interface for management views
 * Used in category management components
 */
interface CategoryData {
    categories: Category[];
    currentPage: number;
    totalPages: number;
    total: number;
}
/**
 * Category action type
 * Used for category management actions
 */
type CategoryAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';
/**
 * Category action interface
 * Used for category action buttons
 */
interface CategoryActionItem {
    id: string;
    label: string;
    description: string;
    icon: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    onClick: () => void;
}
/**
 * Category form data interface
 * Used for category forms
 */
interface CategoryFormData {
    name: string;
    description: string;
    isActive: boolean;
}
/**
 * Category form errors interface
 * Used for form validation
 */
interface CategoryFormErrors {
    name?: string;
    description?: string;
}
/**
 * Category form props interface
 * Used for category form components
 */
interface CategoryFormProps {
    category?: Category | null;
    onSave: (category: Partial<Category>) => void;
    onCancel: () => void;
    mode: 'create' | 'edit';
}
/**
 * Category card props interface
 * Used for category card components
 */
interface CategoryCardProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: number) => void;
}
/**
 * Category grid props interface
 * Used for category grid components
 */
interface CategoryGridProps {
    categories: Category[];
    onCategoryAction: (action: string, categoryId: number) => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (categoryId: number) => void;
}
/**
 * Category table props interface
 * Used for category table components
 */
interface CategoryTableProps {
    categories: Category[];
    onCategoryAction: (action: string, categoryId: number) => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (categoryId: number) => void;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (column: string) => void;
}
/**
 * Category actions props interface
 * Used for category action components
 */
interface CategoryActionsProps {
    onAddCategory: () => void;
    onImportCategories: () => void;
    onExportCategories: () => void;
    onBulkEdit: () => void;
}
/**
 * Category pagination props interface
 * Used for category pagination components
 */
interface CategoryPaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
}
/**
 * Category filters props interface
 * Used for category filter components
 */
interface CategoryFiltersProps {
    filters: CategorySearchParams;
    onFiltersChange: (filters: CategorySearchParams) => void;
    onSearchChange: (searchValue: string) => void;
    onClearFilters?: () => void;
}
/**
 * Category statistics interface
 * Used for category analytics and reporting
 */
interface CategoryStats {
    totalCategories: number;
    activeCategories: number;
    inactiveCategories: number;
    categoriesWithProducts: number;
    topCategories: TopCategory[];
}
/**
 * Top category interface
 * Used for category analytics and reporting
 */
interface TopCategory {
    id: number;
    name: string;
    productCount: number;
    totalRevenue: number;
    averageProductValue: number;
}
/**
 * Category performance metrics
 * Used for category performance analysis
 */
interface CategoryPerformance {
    categoryId: number;
    categoryName: string;
    productCount: number;
    totalRevenue: number;
    averageProductValue: number;
    growthRate: number;
    utilizationRate: number;
}

type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

interface Permission {
    id: number;
    name: string;
    description: string;
    resource: string;
    action: string;
    roles: UserRole[];
}
interface PermissionCheck {
    userRole: UserRole;
    resource: string;
    action: string;
    merchantId?: number;
    outletId?: number;
}
interface PermissionResult {
    allowed: boolean;
    reason?: string;
}
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'view';
type PermissionResource = 'users' | 'outlets' | 'products' | 'orders' | 'customers' | 'analytics' | 'settings';

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
type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
interface BillingCycleOption {
    value: BillingCycle;
    label: string;
    months: number;
    description: string;
}
interface PlanCreateInput {
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
interface PlanUpdateInput {
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
interface PlanFeature {
    id: number;
    name: string;
    description: string;
    icon: string;
    isIncluded: boolean;
}
interface PlanComparison {
    basic: Plan;
    professional: Plan;
    enterprise: Plan;
}
/**
 * Plan variant interface
 * Used for plan variants in admin/client apps
 */
interface PlanVariant {
    id: number;
    name: string;
    planId: number;
    duration: number;
    price: number;
    discount: number;
    savings: number;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
    plan?: Plan;
}
/**
 * Plan variant create input
 * Used for creating plan variants
 */
interface PlanVariantCreateInput {
    name: string;
    planId: number;
    duration: number;
    price: number;
    discount: number;
    isActive?: boolean;
}
/**
 * Plan variant update input
 * Used for updating plan variants
 */
interface PlanVariantUpdateInput {
    name?: string;
    duration?: number;
    price?: number;
    discount?: number;
    isActive?: boolean;
}
/**
 * Plan variant filters
 * Used for filtering plan variants
 */
interface PlanVariantFilters {
    planId?: number;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

type BillingPeriod = 1 | 3 | 6 | 12;
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
    };
    plan: Plan;
}
interface SubscriptionCreateInput {
    merchantId: number;
    planId: number;
    billingInterval?: BillingInterval;
    status?: SubscriptionStatus;
    startDate?: Date;
}
interface SubscriptionUpdateInput {
    id: number;
    planId?: number;
    billingInterval?: BillingInterval;
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
interface SubscriptionAction {
    type: 'change_plan' | 'pause' | 'resume' | 'cancel' | 'reactivate';
    planId?: number;
    reason?: string;
}
interface PricingCalculation {
    basePrice: number;
    discount: number;
    finalPrice: number;
    savings: number;
    monthlyEquivalent: number;
    interval: BillingInterval;
    intervalCount: number;
}
declare const PRICING_CONFIG: {
    readonly DISCOUNTS: {
        readonly monthly: 0;
        readonly quarterly: 10;
        readonly yearly: 20;
    };
    readonly INTERVALS: {
        readonly monthly: {
            readonly interval: "month";
            readonly intervalCount: 1;
        };
        readonly quarterly: {
            readonly interval: "month";
            readonly intervalCount: 3;
        };
        readonly yearly: {
            readonly interval: "year";
            readonly intervalCount: 1;
        };
    };
};
declare function calculatePricing(basePrice: number, period: BillingPeriod): PricingCalculation;

interface PersonalProfileUpdate {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}
interface MerchantInfoUpdate {
    name: string;
    email?: string;
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
interface OutletInfoUpdate {
    name: string;
    address: string;
    phone?: string;
    description?: string;
}
interface SecurityUpdate {
    currentPassword: string;
    newPassword: string;
}

/**
 * Dashboard types for analytics and reporting
 */
type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
interface DashboardStats {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    activeOrders: number;
    pendingOrders: number;
    completedOrders: number;
    revenueThisMonth: number;
    ordersThisMonth: number;
}
interface OrderDataPoint {
    date: string;
    orders: number;
    revenue: number;
}
interface OrderItemData {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deposit: number;
    notes?: string;
}
interface IncomeData {
    date: string;
    income: number;
    expenses: number;
    profit: number;
}
interface IncomeDataPoint {
    date: string;
    income: number;
    expenses: number;
    profit: number;
}
interface IncomeDataPoint {
    date: string;
    income: number;
    expenses: number;
    profit: number;
}
interface TodaysFocus {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionRequired: boolean;
    deadline?: string;
    status: string;
}
interface DashboardOrderStats {
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    pendingOrders: number;
    completedOrders: number;
    revenueThisMonth: number;
    ordersThisMonth: number;
    totalDeposits: number;
    activeRentals: number;
    overdueRentals: number;
    cancelledOrders: number;
    averageOrderValue: number;
}
interface DashboardData {
    period: DashboardPeriod;
    stats: DashboardStats;
    orderData: OrderDataPoint[];
    incomeData: IncomeDataPoint[];
    todaysFocus: TodaysFocus[];
    activeTab: string;
}

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    color?: string;
    type: 'pickup' | 'return' | 'maintenance' | 'other';
    orderId?: number;
    customerName?: string;
    productName?: string;
    notes?: string;
}
interface CalendarFilters {
    eventType?: string[];
    outletId?: number;
    startDate?: Date;
    endDate?: Date;
    customerId?: number;
    productId?: number;
}
interface CalendarViewProps {
    events: CalendarEvent[];
    filters?: CalendarFilters;
    onEventClick?: (event: CalendarEvent) => void;
    onDateSelect?: (date: Date) => void;
    onFilterChange?: (filters: CalendarFilters) => void;
}
interface CalendarGridProps {
    events: CalendarEvent[];
    view: 'month' | 'week' | 'day';
    onEventClick?: (event: CalendarEvent) => void;
    onDateSelect?: (date: Date) => void;
}
interface CalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    type: 'pickup' | 'return' | 'maintenance' | 'other';
    orderId?: number;
    customerName?: string;
    productName?: string;
    notes?: string;
    color?: string;
}
interface CalendarDay {
    date: Date;
    events: CalendarEvent[];
    isToday: boolean;
    isCurrentMonth: boolean;
    isSelected: boolean;
}
interface CalendarData {
    events: CalendarEvent[];
    filters: CalendarFilters;
    view: CalendarViewMode;
}
type CalendarViewMode = 'month' | 'week' | 'day';
interface CalendarNavigationProps {
    currentDate: Date;
    view: CalendarViewMode;
    onDateChange: (date: Date) => void;
    onViewChange: (view: CalendarViewMode) => void;
}
interface CalendarSidebarProps {
    events: CalendarEvent[];
    filters: CalendarFilters;
    onFilterChange: (filters: CalendarFilters) => void;
    onEventClick: (event: CalendarEvent) => void;
}
interface CalendarFiltersProps {
    filters: CalendarFilters;
    onFilterChange: (filters: CalendarFilters) => void;
}
interface PickupOrder {
    id: number;
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    productName: string;
    productCount?: number;
    totalAmount?: number;
    pickupDate: Date;
    returnDate: Date;
    status: string;
    outletName?: string;
    notes?: string;
    isOverdue?: boolean;
    duration?: number;
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

interface SearchParams {
    query: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
interface SearchResult<T> {
    data: T[];
    total: number;
    query: string;
    filters: Record<string, any>;
}
interface SearchFilters {
    [key: string]: string | number | boolean | string[];
}

/**
 * Platform Detection Types
 * Used to identify if API requests come from web or mobile clients
 */
type ClientPlatform = 'web' | 'mobile' | 'unknown';
type DeviceType = 'ios' | 'android' | 'browser' | 'unknown';
interface PlatformInfo {
    platform: ClientPlatform;
    version?: string;
    deviceType?: DeviceType;
    userAgent?: string;
}
interface PlatformHeaders {
    'X-Client-Platform'?: string;
    'X-App-Version'?: string;
    'X-Device-Type'?: string;
}
interface RequestWithPlatform extends Request {
    platformInfo?: PlatformInfo;
}

export { type Address, type ApiErrorResponse, type ApiResponse, type AuthUser, type BaseEntity, type BaseEntityWithMerchant, type BaseEntityWithOutlet, type BaseFormInput, type BaseSearchParams, type BaseSearchResult, type BaseUpdateInput, type BillingCycle, type BillingCycleOption, type BillingPeriod, type BusinessType, type CalendarData, type CalendarDay, type CalendarEvent, type CalendarEventFormData, type CalendarFilters, type CalendarFiltersProps, type CalendarGridProps, type CalendarNavigationProps, type CalendarSidebarProps, type CalendarViewMode, type CalendarViewProps, type Category, type CategoryAction, type CategoryActionItem, type CategoryActionsProps, type CategoryCardProps, type CategoryCreateInput, type CategoryData, type CategoryFilters, type CategoryFiltersProps, type CategoryFormData, type CategoryFormErrors, type CategoryFormProps, type CategoryGridProps, type CategoryPaginationProps, type CategoryPerformance, type CategoryReference, type CategorySearchParams, type CategorySearchResponse, type CategorySearchResult, type CategoryStats, type CategoryTableProps, type CategoryUpdateInput, type ChangePassword, type ClientPlatform, type ContactInfo, type Currency, type CurrencyCode, type CurrencyFormatOptions, type CurrencySettings, type CurrentSubscription, type Customer, type CustomerAction, type CustomerCreateInput, type CustomerData, type CustomerFilters, type CustomerInput, type CustomerManagement, type CustomerPerformance, type CustomerReference, type CustomerSearchFilter, type CustomerSearchParams, type CustomerSearchResponse, type CustomerSearchResult, type CustomerStats, type CustomerUpdateInput, type CustomerWithMerchant, type DashboardData, type DashboardOrderStats, type DashboardPeriod, type DashboardStats, type DeviceType, type EntityAction, type EntityStatus, type IncomeData, type IncomeDataPoint, type LoginCredentials, type Merchant, type MerchantAction, type MerchantCreateInput, type MerchantDetailData, type MerchantDetailStats, type MerchantFilters, type MerchantInfoUpdate, type MerchantPricingConfig, type MerchantReference, type MerchantSearchParams, type MerchantSearchResult, type MerchantStats, type MerchantUpdateInput, type Order, type OrderAction, type OrderCreateInput, type OrderData, type OrderDataPoint, type OrderDetailData, type OrderExportData, type OrderFilters, type OrderHistoryInput, type OrderInput, type OrderItem, type OrderItemData, type OrderItemInput, type OrderItemWithProduct, type OrderListData, type OrderSearchFilter, type OrderSearchParams, type OrderSearchResponse, type OrderSearchResult, type OrderStats, type OrderStatsByPeriod, type OrderStatus, type OrderType, type OrderUpdateInput, type OrderWithDetails, type OrdersData, type Outlet, type OutletAction, type OutletCreateInput, type OutletData, type OutletFilters, type OutletInfoUpdate, type OutletInventorySummary, type OutletPerformance, type OutletReference, type OutletSearchFilter, type OutletSearchParams, type OutletSearchResponse, type OutletSearchResult, type OutletStats, type OutletStock, type OutletStockInput, type OutletStockLevel, type OutletUpdateInput, PRICING_CONFIG, type PaginatedResult, type PaginationMeta, type PaginationParams, type PasswordReset, type Payment, type PaymentInput, type PaymentUpdateInput, type Permission, type PermissionAction, type PermissionCheck, type PermissionResource, type PermissionResult, type PersonalProfileUpdate, type PickupOrder, type Plan, type PlanComparison, type PlanCreateInput, type PlanDetails, type PlanFeature, type PlanFilters, type PlanLimits, type PlanPricing, type PlanUpdateInput, type PlanVariant, type PlanVariantCreateInput, type PlanVariantFilters, type PlanVariantUpdateInput, type PlatformHeaders, type PlatformInfo, type PricingBusinessRules, type PricingCalculation, type PricingDurationLimits, type PricingType, type Product, type ProductAction, type ProductCreateInput, type ProductFilters, type ProductInput, type ProductInventorySummary, type ProductPerformance, type ProductReference, type ProductSearchFilter, type ProductSearchParams, type ProductSearchResponse, type ProductSearchResult, type ProductUpdateInput, type ProductWithDetails, type ProductWithStock, type ProfileUpdateInput, type RegisterData, type RequestWithPlatform, type SearchFilters, type SearchParams, type SearchResult, type SecurityUpdate, type SoftDelete, type Subscription, type SubscriptionAction, type SubscriptionCreateInput, type SubscriptionFilters, type SubscriptionPeriod, type SubscriptionUpdateInput, type SubscriptionsResponse, type Timestamp, type TodaysFocus, type TopCategory, type TopCustomer, type TopProduct, type User, type UserAction, type UserCreateInput, type UserData, type UserFilters, type UserPermissions, type UserReference, type UserRole$1 as UserRole, type UserSearchFilter, type UserSearchParams, type UserSearchResult, type UserSession, type UserStats, type UserUpdateInput, type ValidationError, type ValidationResult, calculatePricing };
