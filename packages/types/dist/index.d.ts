import { MerchantPricingConfig, SubscriptionStatus, BillingInterval } from '@rentalshop/constants';
export { BillingInterval, BusinessType, MerchantPricingConfig, PricingBusinessRules, PricingDurationLimits, PricingType, SubscriptionStatus } from '@rentalshop/constants';

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
    currency: string;
    isActive: boolean;
    planId?: number;
    totalRevenue: number;
    lastActiveAt?: Date | string;
    pricingConfig?: MerchantPricingConfig | string;
    plan?: PlanDetails;
    subscription?: CurrentSubscription;
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
 * Current subscription interface
 * Used for active subscription information
 */
interface CurrentSubscription {
    id: number;
    status: string;
    currentPeriodStart: Date | string;
    currentPeriodEnd: Date | string;
    trialStart?: Date | string;
    trialEnd?: Date | string;
    amount: number;
    currency: string;
    interval: string;
    period: number;
    discount: number;
    savings: number;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date | string;
    cancelReason?: string;
    plan?: {
        id: number;
        name: string;
        description: string;
        basePrice: number;
        currency: string;
        trialDays: number;
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
    currency?: string;
    businessType?: string;
    pricingType?: string;
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
    pricingType?: string;
    taxId?: number;
    currency?: string;
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
 * Order list item (minimal data for list views)
 * Flattened structure for better performance
 */
interface OrderListItem {
    id: number;
    orderNumber: string;
    orderType: OrderType;
    status: OrderStatus;
    totalAmount: number;
    depositAmount: number;
    notes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    outletId: number;
    outletName?: string;
    merchantName?: string;
    createdById: number;
    createdByName?: string;
    orderItems: OrderItemFlattened[];
    itemCount: number;
    paymentCount: number;
    totalPaid: number;
}
/**
 * Order item with flattened product data
 * Used for order list views with simplified structure
 */
interface OrderItemFlattened {
    id: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    productId?: number;
    productName?: string;
    productBarcode?: string;
    productImages?: string[];
    productRentPrice?: number;
    productDeposit?: number;
}
/**
 * Order with details (full data for detail views)
 * Includes nested objects for comprehensive information
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
    securityDeposit?: number;
    damageFee?: number;
    lateFee?: number;
    discountType?: 'amount' | 'percentage';
    discountValue?: number;
    discountAmount?: number;
    pickupPlanAt?: Date | string;
    returnPlanAt?: Date | string;
    pickedUpAt?: Date | string;
    returnedAt?: Date | string;
    rentalDuration?: number;
    isReadyToDeliver?: boolean;
    collateralType?: string;
    collateralDetails?: string;
    notes?: string;
    pickupNotes?: string;
    returnNotes?: string;
    damageNotes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    customer?: CustomerReference;
    outlet: OutletReference;
    orderItems: OrderItemWithProduct[];
    payments: Payment[];
    createdBy?: UserReference;
    merchant: MerchantReference;
    timeline?: OrderTimelineItem[];
    itemCount: number;
    paymentCount: number;
    totalPaid: number;
}
/**
 * Order timeline item for audit log
 */
interface OrderTimelineItem {
    id: number;
    action: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    createdAt: Date | string;
    createdBy?: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
    };
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
    orders: OrderListItem[];
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
    hasMore?: boolean;
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
	productId: productId
};

declare const _________locales_en_products_json_availability: typeof availability;
declare const _________locales_en_products_json_createProduct: typeof createProduct;
declare const _________locales_en_products_json_editProduct: typeof editProduct;
declare const _________locales_en_products_json_fields: typeof fields;
declare const _________locales_en_products_json_inventory: typeof inventory;
declare const _________locales_en_products_json_noProductsSelected: typeof noProductsSelected;
declare const _________locales_en_products_json_price: typeof price;
declare const _________locales_en_products_json_pricing: typeof pricing;
declare const _________locales_en_products_json_productDetails: typeof productDetails;
declare const _________locales_en_products_json_productId: typeof productId;
declare const _________locales_en_products_json_productInformationNotAvailable: typeof productInformationNotAvailable;
declare const _________locales_en_products_json_productName: typeof productName;
declare const _________locales_en_products_json_selectedProducts: typeof selectedProducts;
declare const _________locales_en_products_json_stock: typeof stock;
declare const _________locales_en_products_json_viewProduct: typeof viewProduct;
declare namespace _________locales_en_products_json {
  export { actions$1 as actions, _________locales_en_products_json_availability as availability, _________locales_en_products_json_createProduct as createProduct, products as default, _________locales_en_products_json_editProduct as editProduct, _________locales_en_products_json_fields as fields, filters$1 as filters, _________locales_en_products_json_inventory as inventory, messages$2 as messages, _________locales_en_products_json_noProductsSelected as noProductsSelected, _________locales_en_products_json_price as price, _________locales_en_products_json_pricing as pricing, _________locales_en_products_json_productDetails as productDetails, _________locales_en_products_json_productId as productId, _________locales_en_products_json_productInformationNotAvailable as productInformationNotAvailable, _________locales_en_products_json_productName as productName, search$1 as search, _________locales_en_products_json_selectedProducts as selectedProducts, stats$2 as stats, status$1 as status, _________locales_en_products_json_stock as stock, title$2 as title, _________locales_en_products_json_viewProduct as viewProduct };
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
	choosePricingType: "How do you want to price your rentals?"
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
var auth = {
	login: login,
	register: register,
	forgotPassword: forgotPassword,
	changePassword: changePassword,
	logout: logout
};

declare const _________locales_en_auth_json_changePassword: typeof changePassword;
declare const _________locales_en_auth_json_forgotPassword: typeof forgotPassword;
declare const _________locales_en_auth_json_login: typeof login;
declare const _________locales_en_auth_json_logout: typeof logout;
declare const _________locales_en_auth_json_register: typeof register;
declare namespace _________locales_en_auth_json {
  export { _________locales_en_auth_json_changePassword as changePassword, auth as default, _________locales_en_auth_json_forgotPassword as forgotPassword, _________locales_en_auth_json_login as login, _________locales_en_auth_json_logout as logout, _________locales_en_auth_json_register as register };
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
type Locale = 'en' | 'vi';
declare const defaultLocale: Locale;
declare const locales: readonly Locale[];

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

export { type Address, type ApiErrorResponse, type ApiResponse, type AuthUser, type BaseEntity, type BaseEntityWithMerchant, type BaseEntityWithOutlet, type BaseFormInput, type BaseSearchParams, type BaseSearchResult, type BaseUpdateInput, type BillingCycle, type BillingCycleOption, type BillingPeriod, type CalendarData, type CalendarDay, type CalendarEvent, type CalendarEventFormData, type CalendarFilters, type CalendarFiltersProps, type CalendarGridProps, type CalendarNavigationProps, type CalendarSidebarProps, type CalendarViewMode, type CalendarViewProps, type Category, type CategoryAction, type CategoryActionItem, type CategoryActionsProps, type CategoryCardProps, type CategoryCreateInput, type CategoryData, type CategoryFilters, type CategoryFiltersProps, type CategoryFormData, type CategoryFormErrors, type CategoryFormProps, type CategoryGridProps, type CategoryPaginationProps, type CategoryPerformance, type CategoryReference, type CategorySearchParams, type CategorySearchResponse, type CategorySearchResult, type CategoryStats, type CategoryTableProps, type CategoryUpdateInput, type ChangePassword, type ClientPlatform, type ContactInfo, type Currency, type CurrencyCode, type CurrencyFormatOptions, type CurrencySettings, type CurrentSubscription, type Customer, type CustomerAction, type CustomerCreateInput, type CustomerData, type CustomerFilters, type CustomerInput, type CustomerManagement, type CustomerPerformance, type CustomerReference, type CustomerSearchFilter, type CustomerSearchParams, type CustomerSearchResponse, type CustomerSearchResult, type CustomerStats, type CustomerUpdateInput, type CustomerWithMerchant, type DashboardData, type DashboardOrderStats, type DashboardPeriod, type DashboardStats, type DeviceType, type EntityAction, type EntityStatus, type IncomeData, type IncomeDataPoint, type Locale, type LoginCredentials, type Merchant, type MerchantAction, type MerchantCreateInput, type MerchantDetailData, type MerchantDetailStats, type MerchantFilters, type MerchantInfoUpdate, type MerchantReference, type MerchantSearchParams, type MerchantSearchResult, type MerchantStats, type MerchantUpdateInput, type Order, type OrderAction, type OrderCreateInput, type OrderData, type OrderDataPoint, type OrderDetailData, type OrderExportData, type OrderFilters, type OrderHistoryInput, type OrderInput, type OrderItem, type OrderItemData, type OrderItemFlattened, type OrderItemInput, type OrderItemWithProduct, type OrderListData, type OrderListItem, type OrderSearchFilter, type OrderSearchParams, type OrderSearchResponse, type OrderSearchResult, type OrderStats, type OrderStatsByPeriod, type OrderStatus, type OrderTimelineItem, type OrderType, type OrderUpdateInput, type OrderWithDetails, type OrdersData, type Outlet, type OutletAction, type OutletCreateInput, type OutletData, type OutletFilters, type OutletInfoUpdate, type OutletInventorySummary, type OutletPerformance, type OutletReference, type OutletSearchFilter, type OutletSearchParams, type OutletSearchResponse, type OutletSearchResult, type OutletStats, type OutletStock, type OutletStockInput, type OutletStockLevel, type OutletUpdateInput, PRICING_CONFIG, type PaginatedResult, type PaginationMeta, type PaginationParams, type PasswordReset, type Payment, type PaymentInput, type PaymentUpdateInput, type Permission, type PermissionAction, type PermissionCheck, type PermissionResource, type PermissionResult, type PersonalProfileUpdate, type PickupOrder, type Plan, type PlanComparison, type PlanCreateInput, type PlanDetails, type PlanFeature, type PlanFilters, type PlanLimits, type PlanPricing, type PlanUpdateInput, type PlanVariant, type PlanVariantCreateInput, type PlanVariantFilters, type PlanVariantUpdateInput, type PlatformHeaders, type PlatformInfo, type PricingCalculation, type Product, type ProductAction, type ProductCreateInput, type ProductFilters, type ProductInput, type ProductInventorySummary, type ProductPerformance, type ProductReference, type ProductSearchFilter, type ProductSearchParams, type ProductSearchResponse, type ProductSearchResult, type ProductUpdateInput, type ProductWithDetails, type ProductWithStock, type ProfileUpdateInput, type RegisterData, type RequestWithPlatform, type SearchFilters, type SearchParams, type SearchResult, type SecurityUpdate, type SoftDelete, type Subscription, type SubscriptionAction, type SubscriptionCreateInput, type SubscriptionFilters, type SubscriptionPeriod, type SubscriptionUpdateInput, type SubscriptionsResponse, type Timestamp, type TodaysFocus, type TopCategory, type TopCustomer, type TopProduct, type User, type UserAction, type UserCreateInput, type UserData, type UserFilters, type UserPermissions, type UserReference, type UserRole$1 as UserRole, type UserSearchFilter, type UserSearchParams, type UserSearchResult, type UserSession, type UserStats, type UserUpdateInput, type ValidationError, type ValidationResult, calculatePricing, defaultLocale, locales };
