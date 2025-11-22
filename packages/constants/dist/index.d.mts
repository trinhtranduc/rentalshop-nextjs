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
declare const PAYMENT_STATUS: {
    readonly PENDING: "PENDING";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly REFUNDED: "REFUNDED";
    readonly CANCELLED: "CANCELLED";
};
type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
declare const PAYMENT_METHOD: {
    readonly STRIPE: "STRIPE";
    readonly TRANSFER: "TRANSFER";
    readonly MANUAL: "MANUAL";
    readonly CASH: "CASH";
    readonly CHECK: "CHECK";
    readonly PAYPAL: "PAYPAL";
};
type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];
declare const PAYMENT_TYPE: {
    readonly ORDER_PAYMENT: "ORDER_PAYMENT";
    readonly SUBSCRIPTION_PAYMENT: "SUBSCRIPTION_PAYMENT";
    readonly PLAN_CHANGE: "PLAN_CHANGE";
    readonly PLAN_EXTENSION: "PLAN_EXTENSION";
};
type PaymentType = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];
declare const ORDER_TYPE: {
    readonly RENT: "RENT";
    readonly SALE: "SALE";
};
type OrderType$1 = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
declare const USER_ROLE: {
    readonly ADMIN: "ADMIN";
    readonly MERCHANT: "MERCHANT";
    readonly OUTLET_ADMIN: "OUTLET_ADMIN";
    readonly OUTLET_STAFF: "OUTLET_STAFF";
};
type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
declare const ENTITY_STATUS: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
};
type EntityStatus = typeof ENTITY_STATUS[keyof typeof ENTITY_STATUS];
declare const MERCHANT_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly TRIAL: "TRIAL";
    readonly EXPIRED: "EXPIRED";
};
type MerchantStatus = typeof MERCHANT_STATUS[keyof typeof MERCHANT_STATUS];
declare const PRODUCT_AVAILABILITY_STATUS: {
    readonly AVAILABLE: "available";
    readonly OUT_OF_STOCK: "out-of-stock";
    readonly UNAVAILABLE: "unavailable";
    readonly DATE_CONFLICT: "date-conflict";
};
type ProductAvailabilityStatus = typeof PRODUCT_AVAILABILITY_STATUS[keyof typeof PRODUCT_AVAILABILITY_STATUS];
declare const BILLING_INTERVAL: {
    readonly MONTHLY: "monthly";
    readonly QUARTERLY: "quarterly";
    readonly SIX_MONTHS: "sixMonths";
    readonly YEARLY: "yearly";
};
type BillingInterval = typeof BILLING_INTERVAL[keyof typeof BILLING_INTERVAL];
declare const AUDIT_ACTION: {
    readonly CREATE: "CREATE";
    readonly UPDATE: "UPDATE";
    readonly DELETE: "DELETE";
    readonly LOGIN: "LOGIN";
    readonly LOGOUT: "LOGOUT";
    readonly VIEW: "VIEW";
    readonly EXPORT: "EXPORT";
    readonly IMPORT: "IMPORT";
    readonly CANCEL: "CANCEL";
    readonly APPROVE: "APPROVE";
    readonly REJECT: "REJECT";
};
type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];
declare const AUDIT_ENTITY_TYPE: {
    readonly USER: "USER";
    readonly MERCHANT: "MERCHANT";
    readonly OUTLET: "OUTLET";
    readonly CUSTOMER: "CUSTOMER";
    readonly PRODUCT: "PRODUCT";
    readonly ORDER: "ORDER";
    readonly PAYMENT: "PAYMENT";
    readonly SUBSCRIPTION: "SUBSCRIPTION";
    readonly PLAN: "PLAN";
    readonly CATEGORY: "CATEGORY";
};
type AuditEntityType = typeof AUDIT_ENTITY_TYPE[keyof typeof AUDIT_ENTITY_TYPE];
/**
 * Check if a subscription status is active (trial or active)
 */
declare function isSubscriptionActive(status: SubscriptionStatus): boolean;
/**
 * Type guard to validate if a string is a valid SubscriptionStatus
 * Useful for runtime validation when receiving data from API
 */
declare function isValidSubscriptionStatus(value: string): value is SubscriptionStatus;
/**
 * Normalize a string to SubscriptionStatus enum value
 * Returns the enum value if valid, or null if invalid
 */
declare function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus | null;
/**
 * Check if an order status is completed (returned for rent, completed for sale)
 */
declare function isOrderCompleted(status: OrderStatus, orderType: OrderType$1): boolean;
/**
 * Check if a payment status is successful
 */
declare function isPaymentSuccessful(status: PaymentStatus): boolean;
/**
 * Check if a payment status is pending
 */
declare function isPaymentPending(status: PaymentStatus): boolean;
/**
 * Check if a payment status is failed
 */
declare function isPaymentFailed(status: PaymentStatus): boolean;
/**
 * Check if an entity is active
 */
declare function isEntityActive(status: EntityStatus): boolean;
/**
 * Get human-readable status label
 */
declare function getStatusLabel(status: string, type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability'): string;
/**
 * Get status color class for UI components - Ocean Blue Theme
 */
declare function getStatusColor(status: string, type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability'): string;
/**
 * Get all status options for dropdowns/filters
 */
declare function getStatusOptions(type: 'subscription' | 'order' | 'payment' | 'entity' | 'availability'): {
    value: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELLED" | "PAUSED" | "EXPIRED";
    label: string;
}[] | {
    value: "CANCELLED" | "RESERVED" | "PICKUPED" | "RETURNED" | "COMPLETED";
    label: string;
}[] | {
    value: "PENDING" | "CANCELLED" | "COMPLETED" | "FAILED" | "REFUNDED";
    label: string;
}[] | {
    value: "active" | "inactive";
    label: string;
}[] | {
    value: "available" | "out-of-stock" | "unavailable" | "date-conflict";
    label: string;
}[];

declare const STATUS_AUDIT_ACTION: typeof AUDIT_ACTION;
declare const STATUS_AUDIT_ENTITY_TYPE: typeof AUDIT_ENTITY_TYPE;
type STATUS_AuditAction = AuditAction;
type STATUS_AuditEntityType = AuditEntityType;
declare const STATUS_BILLING_INTERVAL: typeof BILLING_INTERVAL;
type STATUS_BillingInterval = BillingInterval;
declare const STATUS_ENTITY_STATUS: typeof ENTITY_STATUS;
type STATUS_EntityStatus = EntityStatus;
declare const STATUS_MERCHANT_STATUS: typeof MERCHANT_STATUS;
type STATUS_MerchantStatus = MerchantStatus;
declare const STATUS_ORDER_STATUS: typeof ORDER_STATUS;
declare const STATUS_ORDER_TYPE: typeof ORDER_TYPE;
type STATUS_OrderStatus = OrderStatus;
declare const STATUS_PAYMENT_METHOD: typeof PAYMENT_METHOD;
declare const STATUS_PAYMENT_STATUS: typeof PAYMENT_STATUS;
declare const STATUS_PAYMENT_TYPE: typeof PAYMENT_TYPE;
declare const STATUS_PRODUCT_AVAILABILITY_STATUS: typeof PRODUCT_AVAILABILITY_STATUS;
type STATUS_PaymentMethod = PaymentMethod;
type STATUS_PaymentStatus = PaymentStatus;
type STATUS_PaymentType = PaymentType;
type STATUS_ProductAvailabilityStatus = ProductAvailabilityStatus;
declare const STATUS_SUBSCRIPTION_STATUS: typeof SUBSCRIPTION_STATUS;
type STATUS_SubscriptionStatus = SubscriptionStatus;
declare const STATUS_USER_ROLE: typeof USER_ROLE;
type STATUS_UserRole = UserRole;
declare const STATUS_getStatusColor: typeof getStatusColor;
declare const STATUS_getStatusLabel: typeof getStatusLabel;
declare const STATUS_getStatusOptions: typeof getStatusOptions;
declare const STATUS_isEntityActive: typeof isEntityActive;
declare const STATUS_isOrderCompleted: typeof isOrderCompleted;
declare const STATUS_isPaymentFailed: typeof isPaymentFailed;
declare const STATUS_isPaymentPending: typeof isPaymentPending;
declare const STATUS_isPaymentSuccessful: typeof isPaymentSuccessful;
declare const STATUS_isSubscriptionActive: typeof isSubscriptionActive;
declare const STATUS_isValidSubscriptionStatus: typeof isValidSubscriptionStatus;
declare const STATUS_normalizeSubscriptionStatus: typeof normalizeSubscriptionStatus;
declare namespace STATUS {
  export { STATUS_AUDIT_ACTION as AUDIT_ACTION, STATUS_AUDIT_ENTITY_TYPE as AUDIT_ENTITY_TYPE, type STATUS_AuditAction as AuditAction, type STATUS_AuditEntityType as AuditEntityType, STATUS_BILLING_INTERVAL as BILLING_INTERVAL, type STATUS_BillingInterval as BillingInterval, STATUS_ENTITY_STATUS as ENTITY_STATUS, type STATUS_EntityStatus as EntityStatus, STATUS_MERCHANT_STATUS as MERCHANT_STATUS, type STATUS_MerchantStatus as MerchantStatus, STATUS_ORDER_STATUS as ORDER_STATUS, STATUS_ORDER_TYPE as ORDER_TYPE, type STATUS_OrderStatus as OrderStatus, type OrderType$1 as OrderType, STATUS_PAYMENT_METHOD as PAYMENT_METHOD, STATUS_PAYMENT_STATUS as PAYMENT_STATUS, STATUS_PAYMENT_TYPE as PAYMENT_TYPE, STATUS_PRODUCT_AVAILABILITY_STATUS as PRODUCT_AVAILABILITY_STATUS, type STATUS_PaymentMethod as PaymentMethod, type STATUS_PaymentStatus as PaymentStatus, type STATUS_PaymentType as PaymentType, type STATUS_ProductAvailabilityStatus as ProductAvailabilityStatus, STATUS_SUBSCRIPTION_STATUS as SUBSCRIPTION_STATUS, type STATUS_SubscriptionStatus as SubscriptionStatus, STATUS_USER_ROLE as USER_ROLE, type STATUS_UserRole as UserRole, STATUS_getStatusColor as getStatusColor, STATUS_getStatusLabel as getStatusLabel, STATUS_getStatusOptions as getStatusOptions, STATUS_isEntityActive as isEntityActive, STATUS_isOrderCompleted as isOrderCompleted, STATUS_isPaymentFailed as isPaymentFailed, STATUS_isPaymentPending as isPaymentPending, STATUS_isPaymentSuccessful as isPaymentSuccessful, STATUS_isSubscriptionActive as isSubscriptionActive, STATUS_isValidSubscriptionStatus as isValidSubscriptionStatus, STATUS_normalizeSubscriptionStatus as normalizeSubscriptionStatus };
}

declare const ORDER_TYPES: {
    readonly RENT: "RENT";
    readonly SALE: "SALE";
};
type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES];
declare const ORDER_STATUS_COLORS$1: {
    readonly RESERVED: "text-blue-700 border border-blue-200";
    readonly PICKUPED: "text-green-700 border border-green-200";
    readonly RETURNED: "text-green-600 border border-green-200";
    readonly COMPLETED: "text-gray-700 border border-gray-200";
    readonly CANCELLED: "text-gray-500 border border-gray-200";
};
declare const ORDER_TYPE_COLORS$1: {
    readonly RENT: "bg-blue-100 text-blue-800";
    readonly SALE: "bg-emerald-100 text-emerald-800";
};
declare const ORDER_STATUS_BUTTON_COLORS: {
    readonly RESERVED: {
        readonly bg: "bg-blue-50";
        readonly text: "text-blue-700";
        readonly border: "border-blue-200";
        readonly hex: "#3B82F6";
        readonly buttonBg: "#3B82F6";
        readonly buttonHover: "#2563EB";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-blue-50 text-blue-700 border-blue-200";
    };
    readonly PICKUPED: {
        readonly bg: "bg-orange-50";
        readonly text: "text-orange-700";
        readonly border: "border-orange-200";
        readonly hex: "#F97316";
        readonly buttonBg: "#F97316";
        readonly buttonHover: "#EA580C";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-orange-50 text-orange-700 border-orange-200";
    };
    readonly RETURNED: {
        readonly bg: "bg-green-50";
        readonly text: "text-green-700";
        readonly border: "border-green-200";
        readonly hex: "#22C55E";
        readonly buttonBg: "#22C55E";
        readonly buttonHover: "#16A34A";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-green-50 text-green-700 border-green-200";
    };
    readonly COMPLETED: {
        readonly bg: "bg-green-50";
        readonly text: "text-green-700";
        readonly border: "border-green-200";
        readonly hex: "#22C55E";
        readonly buttonBg: "#22C55E";
        readonly buttonHover: "#16A34A";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-green-50 text-green-700 border-green-200";
    };
    readonly CANCELLED: {
        readonly bg: "bg-red-50";
        readonly text: "text-red-700";
        readonly border: "border-red-200";
        readonly hex: "#EF4444";
        readonly buttonBg: "#EF4444";
        readonly buttonHover: "#DC2626";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-red-50 text-red-700 border-red-200";
    };
};
declare const ORDER_TYPE_BUTTON_COLORS: {
    readonly RENT: {
        readonly bg: "#DBEAFE";
        readonly text: "#1E40AF";
        readonly hex: "#3B82F6";
        readonly buttonBg: "#3B82F6";
        readonly buttonHover: "#2563EB";
        readonly buttonText: "#FFFFFF";
    };
    readonly SALE: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
};
declare const ORDER_STATUS_ICONS: {
    readonly RESERVED: "📋";
    readonly PICKUPED: "⏳";
    readonly RETURNED: "✅";
    readonly COMPLETED: "🎉";
    readonly CANCELLED: "❌";
};
declare const ORDER_TYPE_ICONS: {
    readonly RENT: "🔄";
    readonly SALE: "💰";
};
declare const ORDER_STATUS_LABELS: {
    readonly RESERVED: "Mới cọc";
    readonly PICKUPED: "Đang thuê";
    readonly RETURNED: "Đã trả";
    readonly COMPLETED: "Hoàn thành";
    readonly CANCELLED: "Hủy";
};
declare const ORDER_TYPE_LABELS: {
    readonly RENT: "Thuê";
    readonly SALE: "Bán";
};

declare const ORDERS_ORDER_STATUS_BUTTON_COLORS: typeof ORDER_STATUS_BUTTON_COLORS;
declare const ORDERS_ORDER_STATUS_ICONS: typeof ORDER_STATUS_ICONS;
declare const ORDERS_ORDER_STATUS_LABELS: typeof ORDER_STATUS_LABELS;
declare const ORDERS_ORDER_TYPES: typeof ORDER_TYPES;
declare const ORDERS_ORDER_TYPE_BUTTON_COLORS: typeof ORDER_TYPE_BUTTON_COLORS;
declare const ORDERS_ORDER_TYPE_ICONS: typeof ORDER_TYPE_ICONS;
declare const ORDERS_ORDER_TYPE_LABELS: typeof ORDER_TYPE_LABELS;
type ORDERS_OrderStatus = OrderStatus;
type ORDERS_OrderType = OrderType;
declare namespace ORDERS {
  export { ORDER_STATUS as ORDER_STATUSES, ORDERS_ORDER_STATUS_BUTTON_COLORS as ORDER_STATUS_BUTTON_COLORS, ORDER_STATUS_COLORS$1 as ORDER_STATUS_COLORS, ORDERS_ORDER_STATUS_ICONS as ORDER_STATUS_ICONS, ORDERS_ORDER_STATUS_LABELS as ORDER_STATUS_LABELS, ORDERS_ORDER_TYPES as ORDER_TYPES, ORDERS_ORDER_TYPE_BUTTON_COLORS as ORDER_TYPE_BUTTON_COLORS, ORDER_TYPE_COLORS$1 as ORDER_TYPE_COLORS, ORDERS_ORDER_TYPE_ICONS as ORDER_TYPE_ICONS, ORDERS_ORDER_TYPE_LABELS as ORDER_TYPE_LABELS, type ORDERS_OrderStatus as OrderStatus, type ORDERS_OrderType as OrderType };
}

/**
 * Pagination and List Constants
 *
 * These constants define limits for various list operations across the application
 */
declare const PAGINATION: {
    readonly SEARCH_LIMIT: 20;
    readonly DEFAULT_PAGE_SIZE: 25;
    readonly MAX_PAGE_SIZE: 20;
    readonly DASHBOARD_ITEMS: 10;
    readonly RECENT_ORDERS: 5;
    readonly TOP_PRODUCTS: 8;
    readonly TOP_CUSTOMERS: 6;
    readonly MOBILE_SEARCH_LIMIT: 15;
    readonly MOBILE_PAGE_SIZE: 20;
    readonly API_MAX_LIMIT: 1000;
    readonly API_DEFAULT_LIMIT: 50;
};
type PaginationValue = typeof PAGINATION[keyof typeof PAGINATION];

/**
 * Search and Query Constants
 *
 * These constants define search behavior and query limits
 */
declare const SEARCH: {
    readonly DEBOUNCE_MS: 300;
    readonly MIN_QUERY_LENGTH: 2;
    readonly MAX_QUERY_LENGTH: 100;
    readonly SUGGESTION_LIMIT: 5;
    readonly MAX_SEARCH_RESULTS: 1000;
    readonly AUTOCOMPLETE_DELAY: 200;
    readonly AUTOCOMPLETE_MIN_CHARS: 1;
    readonly PRODUCT_SEARCH: "product";
    readonly CUSTOMER_SEARCH: "customer";
    readonly ORDER_SEARCH: "order";
};
type SearchValue = typeof SEARCH[keyof typeof SEARCH];

/**
 * Validation and Business Rule Constants
 *
 * These constants define validation rules and business logic limits
 */
declare const VALIDATION: {
    readonly MIN_RENTAL_DAYS: 1;
    readonly MAX_RENTAL_DAYS: 365;
    readonly LOW_STOCK_THRESHOLD: 2;
    readonly CRITICAL_STOCK_THRESHOLD: 0;
    readonly MAX_STOCK_QUANTITY: 9999;
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly MAX_PASSWORD_LENGTH: 128;
    readonly MIN_NAME_LENGTH: 1;
    readonly MAX_NAME_LENGTH: 100;
    readonly MAX_PHONE_LENGTH: 20;
    readonly MAX_EMAIL_LENGTH: 255;
    readonly MIN_ORDER_AMOUNT: 0.01;
    readonly MAX_ORDER_AMOUNT: 999999.99;
    readonly MAX_ORDER_ITEMS: 50;
    readonly MIN_DEPOSIT_AMOUNT: 0;
    readonly MAX_DEPOSIT_AMOUNT: 99999.99;
    readonly MIN_DISCOUNT_AMOUNT: 0;
    readonly MAX_DISCOUNT_PERCENTAGE: 100;
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
};
type ValidationValue = typeof VALIDATION[keyof typeof VALIDATION];

/**
 * UI and User Experience Constants
 *
 * These constants define UI behavior, animations, and user experience settings
 */
declare const UI: {
    readonly ANIMATION_DURATION: 200;
    readonly TRANSITION_DURATION: 150;
    readonly HOVER_DELAY: 100;
    readonly TOAST_DURATION: 5000;
    readonly TOAST_DURATION_LONG: 10000;
    readonly TOAST_DURATION_SHORT: 3000;
    readonly LOADING_DELAY: 1000;
    readonly SKELETON_DURATION: 1500;
    readonly DEBOUNCE_DELAY: 300;
    readonly THROTTLE_DELAY: 100;
    readonly INFINITE_SCROLL_THRESHOLD: 100;
    readonly SCROLL_TO_TOP_THRESHOLD: 500;
    readonly BREAKPOINTS: {
        readonly MOBILE: 768;
        readonly TABLET: 1024;
        readonly DESKTOP: 1280;
        readonly LARGE_DESKTOP: 1536;
    };
    readonly Z_INDEX: {
        readonly DROPDOWN: 1000;
        readonly MODAL: 2000;
        readonly TOOLTIP: 3000;
        readonly TOAST: 4000;
        readonly OVERLAY: 5000;
    };
};
type UIValue = typeof UI[keyof typeof UI];

/**
 * Business Logic Constants
 *
 * These constants define business rules, defaults, and operational values
 */
declare const BUSINESS: {
    readonly DEFAULT_QUANTITY: 1;
    readonly DEFAULT_DEPOSIT: 0;
    readonly DEFAULT_DISCOUNT: 0;
    readonly DEFAULT_TAX_RATE: 0;
    readonly MAX_ORDER_ITEMS: 50;
    readonly MIN_ORDER_AMOUNT: 0.01;
    readonly MAX_ORDER_AMOUNT: 999999.99;
    readonly MIN_RENTAL_DAYS: 1;
    readonly MAX_RENTAL_DAYS: 365;
    readonly DEFAULT_CUSTOMER_TYPE: "WALK_IN";
    readonly DEFAULT_CUSTOMER_STATUS: "ACTIVE";
    readonly DEFAULT_PRODUCT_STATUS: "ACTIVE";
    readonly DEFAULT_PRODUCT_CATEGORY: "UNCATEGORIZED";
    readonly DEFAULT_RENTAL_PERIOD: 1;
    readonly DEFAULT_LATE_FEE_RATE: 0.1;
    readonly DEFAULT_DAMAGE_FEE: 0;
    readonly DEFAULT_PAYMENT_METHOD: "CASH";
    readonly DEFAULT_PAYMENT_STATUS: "PENDING";
    readonly DEFAULT_OUTLET_STATUS: "ACTIVE";
    readonly DEFAULT_OUTLET_TYPE: "RETAIL";
    readonly DEFAULT_USER_STATUS: "ACTIVE";
    readonly DEFAULT_USER_ROLE: "OUTLET_STAFF";
    readonly DEFAULT_NOTIFICATION_TYPE: "INFO";
    readonly DEFAULT_NOTIFICATION_PRIORITY: "NORMAL";
    readonly DEFAULT_PICKUP_TIME: "09:00";
    readonly DEFAULT_RETURN_TIME: "17:00";
    readonly BUSINESS_HOURS: {
        readonly OPEN: "08:00";
        readonly CLOSE: "18:00";
        readonly BREAK_START: "12:00";
        readonly BREAK_END: "13:00";
    };
    readonly LOW_STOCK_WARNING: 5;
    readonly CRITICAL_STOCK_WARNING: 2;
    readonly AUTO_REORDER_THRESHOLD: 3;
    readonly MAX_CUSTOMER_ORDERS: 100;
    readonly CUSTOMER_CREDIT_LIMIT: 1000;
    readonly LOYALTY_POINTS_RATE: 0.01;
    readonly ORDER_PREPARATION_TIME: 30;
    readonly PICKUP_GRACE_PERIOD: 15;
    readonly RETURN_GRACE_PERIOD: 30;
    readonly MIN_DEPOSIT_PERCENTAGE: 0.1;
    readonly MAX_DEPOSIT_PERCENTAGE: 0.5;
    readonly LATE_FEE_CAP: 100;
    readonly DAMAGE_FEE_CAP: 500;
};
type BusinessValue = typeof BUSINESS[keyof typeof BUSINESS];

/**
 * Environment-Specific Constants
 *
 * These constants can vary based on the environment (development, staging, production)
 */
declare const ENVIRONMENT: {
    readonly API_TIMEOUT: 10000 | 30000;
    readonly API_RETRY_ATTEMPTS: 1 | 3;
    readonly SEARCH_LIMIT: 20 | 50;
    readonly DASHBOARD_ITEMS: 20 | 10;
    readonly CACHE_TTL: 300 | 60;
    readonly CACHE_MAX_SIZE: 1000 | 100;
    readonly LOG_LEVEL: "error" | "debug";
    readonly LOG_RETENTION: 30 | 7;
    readonly DEBOUNCE_DELAY: 300 | 500;
    readonly THROTTLE_DELAY: 100 | 200;
    readonly SESSION_TIMEOUT: 3600 | 7200;
    readonly MAX_LOGIN_ATTEMPTS: 10 | 5;
    readonly ENABLE_ANALYTICS: boolean;
    readonly ENABLE_DEBUG_MODE: boolean;
    readonly ENABLE_PERFORMANCE_MONITORING: boolean;
};
type EnvironmentValue = typeof ENVIRONMENT[keyof typeof ENVIRONMENT];

/**
 * API and Network Constants
 *
 * These constants define API behavior, endpoints, and network settings
 */
declare const API: {
    readonly STATUS: {
        readonly OK: 200;
        readonly CREATED: 201;
        readonly NO_CONTENT: 204;
        readonly BAD_REQUEST: 400;
        readonly UNAUTHORIZED: 401;
        readonly PAYMENT_REQUIRED: 402;
        readonly FORBIDDEN: 403;
        readonly NOT_FOUND: 404;
        readonly CONFLICT: 409;
        readonly UNPROCESSABLE_ENTITY: 422;
        readonly INTERNAL_SERVER_ERROR: 500;
        readonly SERVICE_UNAVAILABLE: 503;
    };
    readonly METHODS: {
        readonly GET: "GET";
        readonly POST: "POST";
        readonly PUT: "PUT";
        readonly PATCH: "PATCH";
        readonly DELETE: "DELETE";
    };
    readonly CONTENT_TYPES: {
        readonly JSON: "application/json";
        readonly FORM_DATA: "multipart/form-data";
        readonly TEXT: "text/plain";
        readonly HTML: "text/html";
    };
    readonly HEADERS: {
        readonly AUTHORIZATION: "Authorization";
        readonly CONTENT_TYPE: "Content-Type";
        readonly ACCEPT: "Accept";
        readonly USER_AGENT: "User-Agent";
        readonly CACHE_CONTROL: "Cache-Control";
    };
    readonly RATE_LIMITS: {
        readonly REQUESTS_PER_MINUTE: 60;
        readonly REQUESTS_PER_HOUR: 1000;
        readonly BURST_LIMIT: 10;
    };
    readonly TIMEOUTS: {
        readonly CONNECT: 5000;
        readonly READ: 30000;
        readonly WRITE: 30000;
        readonly IDLE: 60000;
    };
    readonly RETRY: {
        readonly MAX_ATTEMPTS: 3;
        readonly INITIAL_DELAY: 1000;
        readonly MAX_DELAY: 10000;
        readonly BACKOFF_MULTIPLIER: 2;
    };
    readonly CACHE: {
        readonly NO_CACHE: "no-cache";
        readonly NO_STORE: "no-store";
        readonly MUST_REVALIDATE: "must-revalidate";
        readonly PRIVATE: "private";
        readonly PUBLIC: "public";
    };
    readonly ERROR_CODES: {
        readonly NETWORK_ERROR: "NETWORK_ERROR";
        readonly TIMEOUT_ERROR: "TIMEOUT_ERROR";
        readonly VALIDATION_ERROR: "VALIDATION_ERROR";
        readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
        readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
        readonly SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR";
        readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
        readonly CONFLICT_ERROR: "CONFLICT_ERROR";
        readonly SERVER_ERROR: "SERVER_ERROR";
    };
};
type ApiValue = typeof API[keyof typeof API];

interface PlanLimits {
    outlets: number;
    users: number;
    products: number;
    customers: number;
    orders: number;
}
interface PlanFeature {
    name: string;
    description: string;
    included: boolean;
}
interface PlanConfig {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    currency: string;
    limits: PlanLimits;
    features: PlanFeature[];
    platform: 'mobile' | 'mobile+web';
    publicProductCheck: boolean;
    isPopular: boolean;
    isActive: boolean;
    sortOrder: number;
    color: string;
    badge?: string;
    upgradeFrom?: string[];
    downgradeTo?: string[];
}
declare const BILLING_CYCLES: {
    MONTHLY: {
        id: string;
        name: string;
        duration: number;
        unit: string;
        discount: number;
    };
    QUARTERLY: {
        id: string;
        name: string;
        duration: number;
        unit: string;
        discount: number;
    };
    YEARLY: {
        id: string;
        name: string;
        duration: number;
        unit: string;
        discount: number;
    };
};
declare const RENEWAL_DURATIONS: {
    id: string;
    name: string;
    months: number;
    duration: number;
    unit: string;
    description: string;
    isPopular: boolean;
}[];
declare const TRIAL_CONFIG: {
    DEFAULT_TRIAL_DAYS: number;
    TRIAL_NOTIFICATIONS: {
        DAYS_BEFORE_EXPIRY: readonly number[];
    };
};
declare const SUBSCRIPTION_PLANS: Record<string, PlanConfig>;
/**
 * Get plan configuration by ID
 */
declare function getPlan(planId: string): PlanConfig | null;
/**
 * Get all available plans
 */
declare function getAllPlans(): PlanConfig[];
/**
 * Get active plans only
 */
declare function getActivePlans(): PlanConfig[];
/**
 * Get plan limits by plan ID
 */
declare function getPlanLimits(planId: string): PlanLimits | null;
/**
 * Check if plan has web access
 */
declare function hasWebAccess(planId: string): boolean;
/**
 * Check if plan has mobile access
 */
declare function hasMobileAccess(planId: string): boolean;
/**
 * Check if plan has public product check feature
 */
declare function hasProductPublicCheck(planId: string): boolean;
/**
 * Get plan platform
 */
declare function getPlanPlatform(planId: string): 'mobile' | 'mobile+web' | null;
/**
 * Check if plan is unlimited for a specific entity type
 */
declare function isUnlimitedPlan(planId: string, entityType: keyof PlanLimits): boolean;
/**
 * Get trial notification days
 */
declare function getTrialNotificationDays(): readonly number[];
/**
 * Get default trial days
 */
declare function getDefaultTrialDays(): number;
/**
 * Get plan comparison data for display
 */
declare function getPlanComparison(): {
    plans: {
        id: string;
        name: string;
        description: string;
        basePrice: number;
        currency: string;
        badge: string | undefined;
        color: string;
    }[];
    features: ({
        name: string;
        basic: boolean;
        professional: boolean;
        enterprise: boolean;
    } | {
        name: string;
        basic: string;
        professional: string;
        enterprise: string;
    })[];
};
/**
 * Validate plan configuration
 */
declare function validatePlanConfig(plan: PlanConfig): {
    isValid: boolean;
    errors: string[];
};

type BusinessType = 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';
type PricingType = 'FIXED' | 'HOURLY' | 'DAILY';
declare const PRICING_TYPE: {
    readonly FIXED: "FIXED";
    readonly HOURLY: "HOURLY";
    readonly DAILY: "DAILY";
};
interface BusinessTypeOption {
    value: BusinessType;
    label: string;
    description: string;
    icon: string;
}
interface PricingTypeOption {
    value: PricingType;
    label: string;
    description: string;
    icon: string;
}
declare const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[];
declare const PRICING_TYPE_OPTIONS: PricingTypeOption[];
interface PricingBusinessRules {
    requireRentalDates: boolean;
    showPricingOptions: boolean;
}
interface PricingDurationLimits {
    minDuration: number;
    maxDuration: number;
    defaultDuration: number;
}
interface MerchantPricingConfig {
    businessType: BusinessType;
    defaultPricingType: PricingType;
    businessRules: PricingBusinessRules;
    durationLimits: PricingDurationLimits;
}
/**
 * Default pricing configuration for each business type
 */
declare const BUSINESS_TYPE_DEFAULTS: Record<BusinessType, MerchantPricingConfig>;
/**
 * Human-readable labels for pricing types
 */
declare const PRICING_TYPE_LABELS: {
    readonly FIXED: "Fixed Price";
    readonly HOURLY: "Hourly";
    readonly DAILY: "Daily";
};
/**
 * Human-readable labels for business types
 */
declare const BUSINESS_TYPE_LABELS: {
    readonly CLOTHING: "Clothing Rental";
    readonly VEHICLE: "Vehicle Rental";
    readonly EQUIPMENT: "Equipment Rental";
    readonly GENERAL: "General Rental";
};
/**
 * Descriptions for pricing types
 */
declare const PRICING_TYPE_DESCRIPTIONS: {
    readonly FIXED: "One price per rental (e.g., equipment rental)";
    readonly HOURLY: "Price per hour (e.g., vehicles, tools)";
    readonly DAILY: "Price per day (e.g., construction equipment)";
};
/**
 * Descriptions for business types
 */
declare const BUSINESS_TYPE_DESCRIPTIONS: {
    readonly CLOTHING: "Dresses, suits, costumes, accessories";
    readonly VEHICLE: "Cars, bikes, motorcycles";
    readonly EQUIPMENT: "Tools, machinery, equipment";
    readonly GENERAL: "Various items and services";
};
/**
 * Get default pricing configuration for business type
 */
declare function getDefaultPricingConfig(businessType: BusinessType): MerchantPricingConfig;
/**
 * Get pricing type label
 */
declare function getPricingTypeLabel(pricingType: PricingType): string;
/**
 * Get business type label
 */
declare function getBusinessTypeLabel(businessType: BusinessType): string;
/**
 * Get pricing type description
 */
declare function getPricingTypeDescription(pricingType: PricingType): string;
/**
 * Get business type description
 */
declare function getBusinessTypeDescription(businessType: BusinessType): string;
/**
 * Check if pricing type requires rental dates
 */
declare function requiresRentalDates(pricingType: PricingType): boolean;
/**
 * Get duration unit for pricing type
 */
declare function getDurationUnit(pricingType: PricingType): string;

interface Country {
    code: string;
    name: string;
    flag: string;
    currency: string;
    phoneCode: string;
}
declare const COUNTRIES: Country[];
/**
 * Get country by code
 */
declare function getCountryByCode(code: string): Country | undefined;
/**
 * Get country by name
 */
declare function getCountryByName(name: string): Country | undefined;
/**
 * Get all countries sorted by name
 */
declare function getCountriesSorted(): Country[];
/**
 * Get countries by region (for future use)
 */
declare function getCountriesByRegion(region: string): Country[];
/**
 * Format country display name with flag
 */
declare function formatCountryDisplay(country: Country): string;
/**
 * Get default country (Vietnam)
 */
declare function getDefaultCountry(): Country;

/**
 * Currency Constants
 *
 * Centralized currency-related constants for the rental shop application.
 * Supports USD and VND currencies at the merchant level.
 */
/**
 * Currency code type
 */
type CurrencyCode = 'USD' | 'VND';
/**
 * Supported currency codes
 */
declare const SUPPORTED_CURRENCIES: readonly CurrencyCode[];
/**
 * Default currency for new merchants
 */
declare const DEFAULT_CURRENCY: CurrencyCode;
/**
 * Currency symbols mapped to currency codes
 */
declare const CURRENCY_SYMBOLS: Record<CurrencyCode, string>;
/**
 * Currency names mapped to currency codes
 */
declare const CURRENCY_NAMES: Record<CurrencyCode, string>;
/**
 * Currency locales for formatting
 */
declare const CURRENCY_LOCALES: Record<CurrencyCode, string>;
/**
 * Currency decimal places
 */
declare const CURRENCY_DECIMALS: Record<CurrencyCode, number>;
/**
 * Symbol position (before or after amount)
 */
declare const CURRENCY_SYMBOL_POSITION: Record<CurrencyCode, 'before' | 'after'>;
/**
 * Exchange rates to USD (base currency)
 * Note: These are approximate rates for reference only
 * In production, fetch real-time rates from an API
 */
declare const EXCHANGE_RATES: Record<CurrencyCode, number>;
/**
 * Currency configuration for easy access
 */
interface CurrencyConfig {
    code: CurrencyCode;
    symbol: string;
    name: string;
    locale: string;
    decimals: number;
    symbolPosition: 'before' | 'after';
    exchangeRate: number;
}
/**
 * Complete currency configurations
 */
declare const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig>;
/**
 * Get currency configuration by code
 * @param code - Currency code
 * @returns Currency configuration
 */
declare function getCurrencyConfig(code: CurrencyCode): CurrencyConfig;
/**
 * Check if a currency code is valid
 * @param code - Currency code to check
 * @returns True if valid, false otherwise
 */
declare function isValidCurrency(code: string): code is CurrencyCode;
/**
 * Get currency symbol
 * @param code - Currency code
 * @returns Currency symbol
 */
declare function getCurrencySymbol(code: CurrencyCode): string;
/**
 * Get currency name
 * @param code - Currency code
 * @returns Currency name
 */
declare function getCurrencyName(code: CurrencyCode): string;
/**
 * Currency selection options for dropdowns
 */
declare const CURRENCY_OPTIONS: {
    value: CurrencyCode;
    label: string;
    symbol: string;
    name: string;
}[];
/**
 * Default currency settings
 */
declare const DEFAULT_CURRENCY_SETTINGS: {
    currentCurrency: "USD";
    baseCurrency: "USD";
    showSymbol: boolean;
    showCode: boolean;
};

declare const BRAND_COLORS: {
    readonly primary: "#22C55E";
    readonly secondary: "#4ADE80";
    readonly dark: "#15803D";
    readonly light: "#86EFAC";
    readonly lightest: "#DCFCE7";
};
declare const ACTION_COLORS: {
    readonly primary: "#22C55E";
    readonly success: "#10B981";
    readonly danger: "#EF4444";
    readonly warning: "#F59E0B";
    readonly info: "#3B82F6";
};
declare const TEXT_COLORS: {
    readonly primary: "#1E293B";
    readonly secondary: "#64748B";
    readonly tertiary: "#94A3B8";
    readonly inverted: "#FFFFFF";
    readonly muted: "#CBD5E1";
};
declare const BACKGROUND_COLORS: {
    readonly primary: "#F8FAFC";
    readonly secondary: "#F1F5F9";
    readonly tertiary: "#E2E8F0";
    readonly card: "#FFFFFF";
    readonly dark: "#0F172A";
};
declare const NAVIGATION_COLORS: {
    readonly background: "#0F172A";
    readonly backgroundHover: "#1E293B";
    readonly text: "#FFFFFF";
    readonly textActive: "#86EFAC";
    readonly textHover: "#DCFCE7";
    readonly border: "#334155";
    readonly icon: "#94A3B8";
    readonly iconActive: "#22C55E";
};
declare const BORDER_COLORS: {
    readonly default: "#E2E8F0";
    readonly light: "#F1F5F9";
    readonly dark: "#CBD5E1";
    readonly focus: "#22C55E";
};
declare const ORDER_STATUS_COLORS: {
    readonly RESERVED: {
        readonly bg: "bg-blue-50";
        readonly text: "text-blue-700";
        readonly border: "border-blue-200";
        readonly hex: "#3B82F6";
        readonly buttonBg: "#3B82F6";
        readonly buttonHover: "#2563EB";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-blue-50 text-blue-700 border-blue-200";
    };
    readonly PICKUPED: {
        readonly bg: "bg-orange-50";
        readonly text: "text-orange-700";
        readonly border: "border-orange-200";
        readonly hex: "#F97316";
        readonly buttonBg: "#F97316";
        readonly buttonHover: "#EA580C";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-orange-50 text-orange-700 border-orange-200";
    };
    readonly RETURNED: {
        readonly bg: "bg-green-50";
        readonly text: "text-green-700";
        readonly border: "border-green-200";
        readonly hex: "#22C55E";
        readonly buttonBg: "#22C55E";
        readonly buttonHover: "#16A34A";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-green-50 text-green-700 border-green-200";
    };
    readonly COMPLETED: {
        readonly bg: "bg-green-50";
        readonly text: "text-green-700";
        readonly border: "border-green-200";
        readonly hex: "#22C55E";
        readonly buttonBg: "#22C55E";
        readonly buttonHover: "#16A34A";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-green-50 text-green-700 border-green-200";
    };
    readonly CANCELLED: {
        readonly bg: "bg-red-50";
        readonly text: "text-red-700";
        readonly border: "border-red-200";
        readonly hex: "#EF4444";
        readonly buttonBg: "#EF4444";
        readonly buttonHover: "#DC2626";
        readonly buttonText: "#FFFFFF";
        readonly className: "bg-red-50 text-red-700 border-red-200";
    };
};
declare const ORDER_TYPE_COLORS: {
    readonly RENT: {
        readonly bg: "#DBEAFE";
        readonly text: "#1E40AF";
        readonly hex: "#3B82F6";
        readonly buttonBg: "#3B82F6";
        readonly buttonHover: "#2563EB";
        readonly buttonText: "#FFFFFF";
    };
    readonly SALE: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
};
declare const SUBSCRIPTION_STATUS_COLORS: {
    readonly TRIAL: {
        readonly bg: "#DCFCE7";
        readonly text: "#15803D";
        readonly hex: "#22C55E";
        readonly buttonBg: "#22C55E";
        readonly buttonHover: "#16A34A";
        readonly buttonText: "#FFFFFF";
    };
    readonly ACTIVE: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
    readonly PAST_DUE: {
        readonly bg: "#FEF3C7";
        readonly text: "#92400E";
        readonly hex: "#F59E0B";
        readonly buttonBg: "#F59E0B";
        readonly buttonHover: "#D97706";
        readonly buttonText: "#FFFFFF";
    };
    readonly CANCELLED: {
        readonly bg: "#FEE2E2";
        readonly text: "#991B1B";
        readonly hex: "#EF4444";
        readonly buttonBg: "#EF4444";
        readonly buttonHover: "#DC2626";
        readonly buttonText: "#FFFFFF";
    };
    readonly PAUSED: {
        readonly bg: "#F3E8FF";
        readonly text: "#6B21A8";
        readonly hex: "#A855F7";
        readonly buttonBg: "#A855F7";
        readonly buttonHover: "#9333EA";
        readonly buttonText: "#FFFFFF";
    };
    readonly EXPIRED: {
        readonly bg: "#F1F5F9";
        readonly text: "#475569";
        readonly hex: "#64748B";
        readonly buttonBg: "#64748B";
        readonly buttonHover: "#475569";
        readonly buttonText: "#FFFFFF";
    };
};
declare const PAYMENT_STATUS_COLORS: {
    readonly PENDING: {
        readonly bg: "#FEF3C7";
        readonly text: "#92400E";
        readonly hex: "#F59E0B";
        readonly buttonBg: "#F59E0B";
        readonly buttonHover: "#D97706";
        readonly buttonText: "#FFFFFF";
    };
    readonly COMPLETED: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
    readonly FAILED: {
        readonly bg: "#FEE2E2";
        readonly text: "#991B1B";
        readonly hex: "#EF4444";
        readonly buttonBg: "#EF4444";
        readonly buttonHover: "#DC2626";
        readonly buttonText: "#FFFFFF";
    };
    readonly REFUNDED: {
        readonly bg: "#DBEAFE";
        readonly text: "#1E40AF";
        readonly hex: "#3B82F6";
        readonly buttonBg: "#3B82F6";
        readonly buttonHover: "#2563EB";
        readonly buttonText: "#FFFFFF";
    };
    readonly CANCELLED: {
        readonly bg: "#F1F5F9";
        readonly text: "#475569";
        readonly hex: "#64748B";
        readonly buttonBg: "#64748B";
        readonly buttonHover: "#475569";
        readonly buttonText: "#FFFFFF";
    };
};
declare const ENTITY_STATUS_COLORS: {
    readonly ACTIVE: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
    readonly INACTIVE: {
        readonly bg: "#F1F5F9";
        readonly text: "#475569";
        readonly hex: "#64748B";
        readonly buttonBg: "#64748B";
        readonly buttonHover: "#475569";
        readonly buttonText: "#FFFFFF";
    };
};
declare const PRODUCT_AVAILABILITY_COLORS: {
    readonly AVAILABLE: {
        readonly bg: "#D1FAE5";
        readonly text: "#065F46";
        readonly hex: "#10B981";
        readonly buttonBg: "#10B981";
        readonly buttonHover: "#059669";
        readonly buttonText: "#FFFFFF";
    };
    readonly OUT_OF_STOCK: {
        readonly bg: "#FEE2E2";
        readonly text: "#991B1B";
        readonly hex: "#EF4444";
        readonly buttonBg: "#EF4444";
        readonly buttonHover: "#DC2626";
        readonly buttonText: "#FFFFFF";
    };
    readonly UNAVAILABLE: {
        readonly bg: "#F1F5F9";
        readonly text: "#475569";
        readonly hex: "#64748B";
        readonly buttonBg: "#64748B";
        readonly buttonHover: "#475569";
        readonly buttonText: "#FFFFFF";
    };
    readonly DATE_CONFLICT: {
        readonly bg: "#FEF3C7";
        readonly text: "#92400E";
        readonly hex: "#F59E0B";
        readonly buttonBg: "#F59E0B";
        readonly buttonHover: "#D97706";
        readonly buttonText: "#FFFFFF";
    };
};
declare const BUTTON_COLORS: {
    readonly primary: {
        readonly bg: "#22C55E";
        readonly bgHover: "#16A34A";
        readonly text: "#FFFFFF";
    };
    readonly secondary: {
        readonly bg: "#F1F5F9";
        readonly bgHover: "#E2E8F0";
        readonly text: "#1E293B";
    };
    readonly success: {
        readonly bg: "#10B981";
        readonly bgHover: "#059669";
        readonly text: "#FFFFFF";
    };
    readonly danger: {
        readonly bg: "#EF4444";
        readonly bgHover: "#DC2626";
        readonly text: "#FFFFFF";
    };
    readonly warning: {
        readonly bg: "#F59E0B";
        readonly bgHover: "#D97706";
        readonly text: "#FFFFFF";
    };
    readonly outline: {
        readonly bg: "transparent";
        readonly bgHover: "#F8FAFC";
        readonly text: "#334155";
        readonly border: "#CBD5E1";
    };
    readonly ghost: {
        readonly bg: "transparent";
        readonly bgHover: "#F1F5F9";
        readonly text: "#1E293B";
    };
};
/**
 * Get Tailwind class string for order status
 */
declare function getOrderStatusClass(status: keyof typeof ORDER_STATUS_COLORS): string;
/**
 * Get Tailwind class string for order type
 */
declare function getOrderTypeClass(type: keyof typeof ORDER_TYPE_COLORS): string;
/**
 * Get order status color className from ORDER_STATUS_COLORS
 * Returns the full className string (bg + text + border) for badges
 */
declare function getOrderStatusClassName(status: string): string;
/**
 * Get order status color object from ORDER_STATUS_COLORS
 * Returns the full color object with all properties
 */
declare function getOrderStatusColors(status: string): {
    readonly bg: "bg-blue-50";
    readonly text: "text-blue-700";
    readonly border: "border-blue-200";
    readonly hex: "#3B82F6";
    readonly buttonBg: "#3B82F6";
    readonly buttonHover: "#2563EB";
    readonly buttonText: "#FFFFFF";
    readonly className: "bg-blue-50 text-blue-700 border-blue-200";
} | {
    readonly bg: "bg-orange-50";
    readonly text: "text-orange-700";
    readonly border: "border-orange-200";
    readonly hex: "#F97316";
    readonly buttonBg: "#F97316";
    readonly buttonHover: "#EA580C";
    readonly buttonText: "#FFFFFF";
    readonly className: "bg-orange-50 text-orange-700 border-orange-200";
} | {
    readonly bg: "bg-green-50";
    readonly text: "text-green-700";
    readonly border: "border-green-200";
    readonly hex: "#22C55E";
    readonly buttonBg: "#22C55E";
    readonly buttonHover: "#16A34A";
    readonly buttonText: "#FFFFFF";
    readonly className: "bg-green-50 text-green-700 border-green-200";
} | {
    readonly bg: "bg-green-50";
    readonly text: "text-green-700";
    readonly border: "border-green-200";
    readonly hex: "#22C55E";
    readonly buttonBg: "#22C55E";
    readonly buttonHover: "#16A34A";
    readonly buttonText: "#FFFFFF";
    readonly className: "bg-green-50 text-green-700 border-green-200";
} | {
    readonly bg: "bg-red-50";
    readonly text: "text-red-700";
    readonly border: "border-red-200";
    readonly hex: "#EF4444";
    readonly buttonBg: "#EF4444";
    readonly buttonHover: "#DC2626";
    readonly buttonText: "#FFFFFF";
    readonly className: "bg-red-50 text-red-700 border-red-200";
};
type BrandColor = keyof typeof BRAND_COLORS;
type ActionColor = keyof typeof ACTION_COLORS;
type TextColor = keyof typeof TEXT_COLORS;
type BackgroundColor = keyof typeof BACKGROUND_COLORS;
type NavigationColor = keyof typeof NAVIGATION_COLORS;
type BorderColor = keyof typeof BORDER_COLORS;
type ButtonVariant = keyof typeof BUTTON_COLORS;

/**
 * Centralized Constants for Rental Shop Monorepo
 *
 * This package provides all constants used across the application
 * to ensure consistency and maintainability.
 */

declare const CONSTANTS: {
    readonly PAGINATION: {
        readonly SEARCH_LIMIT: 20;
        readonly DEFAULT_PAGE_SIZE: 25;
        readonly MAX_PAGE_SIZE: 20;
        readonly DASHBOARD_ITEMS: 10;
        readonly RECENT_ORDERS: 5;
        readonly TOP_PRODUCTS: 8;
        readonly TOP_CUSTOMERS: 6;
        readonly MOBILE_SEARCH_LIMIT: 15;
        readonly MOBILE_PAGE_SIZE: 20;
        readonly API_MAX_LIMIT: 1000;
        readonly API_DEFAULT_LIMIT: 50;
    };
    readonly SEARCH: {
        readonly DEBOUNCE_MS: 300;
        readonly MIN_QUERY_LENGTH: 2;
        readonly MAX_QUERY_LENGTH: 100;
        readonly SUGGESTION_LIMIT: 5;
        readonly MAX_SEARCH_RESULTS: 1000;
        readonly AUTOCOMPLETE_DELAY: 200;
        readonly AUTOCOMPLETE_MIN_CHARS: 1;
        readonly PRODUCT_SEARCH: "product";
        readonly CUSTOMER_SEARCH: "customer";
        readonly ORDER_SEARCH: "order";
    };
    readonly VALIDATION: {
        readonly MIN_RENTAL_DAYS: 1;
        readonly MAX_RENTAL_DAYS: 365;
        readonly LOW_STOCK_THRESHOLD: 2;
        readonly CRITICAL_STOCK_THRESHOLD: 0;
        readonly MAX_STOCK_QUANTITY: 9999;
        readonly MIN_PASSWORD_LENGTH: 8;
        readonly MAX_PASSWORD_LENGTH: 128;
        readonly MIN_NAME_LENGTH: 1;
        readonly MAX_NAME_LENGTH: 100;
        readonly MAX_PHONE_LENGTH: 20;
        readonly MAX_EMAIL_LENGTH: 255;
        readonly MIN_ORDER_AMOUNT: 0.01;
        readonly MAX_ORDER_AMOUNT: 999999.99;
        readonly MAX_ORDER_ITEMS: 50;
        readonly MIN_DEPOSIT_AMOUNT: 0;
        readonly MAX_DEPOSIT_AMOUNT: 99999.99;
        readonly MIN_DISCOUNT_AMOUNT: 0;
        readonly MAX_DISCOUNT_PERCENTAGE: 100;
        readonly MAX_FILE_SIZE: number;
        readonly ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
    };
    readonly UI: {
        readonly ANIMATION_DURATION: 200;
        readonly TRANSITION_DURATION: 150;
        readonly HOVER_DELAY: 100;
        readonly TOAST_DURATION: 5000;
        readonly TOAST_DURATION_LONG: 10000;
        readonly TOAST_DURATION_SHORT: 3000;
        readonly LOADING_DELAY: 1000;
        readonly SKELETON_DURATION: 1500;
        readonly DEBOUNCE_DELAY: 300;
        readonly THROTTLE_DELAY: 100;
        readonly INFINITE_SCROLL_THRESHOLD: 100;
        readonly SCROLL_TO_TOP_THRESHOLD: 500;
        readonly BREAKPOINTS: {
            readonly MOBILE: 768;
            readonly TABLET: 1024;
            readonly DESKTOP: 1280;
            readonly LARGE_DESKTOP: 1536;
        };
        readonly Z_INDEX: {
            readonly DROPDOWN: 1000;
            readonly MODAL: 2000;
            readonly TOOLTIP: 3000;
            readonly TOAST: 4000;
            readonly OVERLAY: 5000;
        };
    };
    readonly BUSINESS: {
        readonly DEFAULT_QUANTITY: 1;
        readonly DEFAULT_DEPOSIT: 0;
        readonly DEFAULT_DISCOUNT: 0;
        readonly DEFAULT_TAX_RATE: 0;
        readonly MAX_ORDER_ITEMS: 50;
        readonly MIN_ORDER_AMOUNT: 0.01;
        readonly MAX_ORDER_AMOUNT: 999999.99;
        readonly MIN_RENTAL_DAYS: 1;
        readonly MAX_RENTAL_DAYS: 365;
        readonly DEFAULT_CUSTOMER_TYPE: "WALK_IN";
        readonly DEFAULT_CUSTOMER_STATUS: "ACTIVE";
        readonly DEFAULT_PRODUCT_STATUS: "ACTIVE";
        readonly DEFAULT_PRODUCT_CATEGORY: "UNCATEGORIZED";
        readonly DEFAULT_RENTAL_PERIOD: 1;
        readonly DEFAULT_LATE_FEE_RATE: 0.1;
        readonly DEFAULT_DAMAGE_FEE: 0;
        readonly DEFAULT_PAYMENT_METHOD: "CASH";
        readonly DEFAULT_PAYMENT_STATUS: "PENDING";
        readonly DEFAULT_OUTLET_STATUS: "ACTIVE";
        readonly DEFAULT_OUTLET_TYPE: "RETAIL";
        readonly DEFAULT_USER_STATUS: "ACTIVE";
        readonly DEFAULT_USER_ROLE: "OUTLET_STAFF";
        readonly DEFAULT_NOTIFICATION_TYPE: "INFO";
        readonly DEFAULT_NOTIFICATION_PRIORITY: "NORMAL";
        readonly DEFAULT_PICKUP_TIME: "09:00";
        readonly DEFAULT_RETURN_TIME: "17:00";
        readonly BUSINESS_HOURS: {
            readonly OPEN: "08:00";
            readonly CLOSE: "18:00";
            readonly BREAK_START: "12:00";
            readonly BREAK_END: "13:00";
        };
        readonly LOW_STOCK_WARNING: 5;
        readonly CRITICAL_STOCK_WARNING: 2;
        readonly AUTO_REORDER_THRESHOLD: 3;
        readonly MAX_CUSTOMER_ORDERS: 100;
        readonly CUSTOMER_CREDIT_LIMIT: 1000;
        readonly LOYALTY_POINTS_RATE: 0.01;
        readonly ORDER_PREPARATION_TIME: 30;
        readonly PICKUP_GRACE_PERIOD: 15;
        readonly RETURN_GRACE_PERIOD: 30;
        readonly MIN_DEPOSIT_PERCENTAGE: 0.1;
        readonly MAX_DEPOSIT_PERCENTAGE: 0.5;
        readonly LATE_FEE_CAP: 100;
        readonly DAMAGE_FEE_CAP: 500;
    };
    readonly ENVIRONMENT: {
        readonly API_TIMEOUT: 10000 | 30000;
        readonly API_RETRY_ATTEMPTS: 1 | 3;
        readonly SEARCH_LIMIT: 20 | 50;
        readonly DASHBOARD_ITEMS: 20 | 10;
        readonly CACHE_TTL: 300 | 60;
        readonly CACHE_MAX_SIZE: 1000 | 100;
        readonly LOG_LEVEL: "error" | "debug";
        readonly LOG_RETENTION: 30 | 7;
        readonly DEBOUNCE_DELAY: 300 | 500;
        readonly THROTTLE_DELAY: 100 | 200;
        readonly SESSION_TIMEOUT: 3600 | 7200;
        readonly MAX_LOGIN_ATTEMPTS: 10 | 5;
        readonly ENABLE_ANALYTICS: boolean;
        readonly ENABLE_DEBUG_MODE: boolean;
        readonly ENABLE_PERFORMANCE_MONITORING: boolean;
    };
    readonly API: {
        readonly STATUS: {
            readonly OK: 200;
            readonly CREATED: 201;
            readonly NO_CONTENT: 204;
            readonly BAD_REQUEST: 400;
            readonly UNAUTHORIZED: 401;
            readonly PAYMENT_REQUIRED: 402;
            readonly FORBIDDEN: 403;
            readonly NOT_FOUND: 404;
            readonly CONFLICT: 409;
            readonly UNPROCESSABLE_ENTITY: 422;
            readonly INTERNAL_SERVER_ERROR: 500;
            readonly SERVICE_UNAVAILABLE: 503;
        };
        readonly METHODS: {
            readonly GET: "GET";
            readonly POST: "POST";
            readonly PUT: "PUT";
            readonly PATCH: "PATCH";
            readonly DELETE: "DELETE";
        };
        readonly CONTENT_TYPES: {
            readonly JSON: "application/json";
            readonly FORM_DATA: "multipart/form-data";
            readonly TEXT: "text/plain";
            readonly HTML: "text/html";
        };
        readonly HEADERS: {
            readonly AUTHORIZATION: "Authorization";
            readonly CONTENT_TYPE: "Content-Type";
            readonly ACCEPT: "Accept";
            readonly USER_AGENT: "User-Agent";
            readonly CACHE_CONTROL: "Cache-Control";
        };
        readonly RATE_LIMITS: {
            readonly REQUESTS_PER_MINUTE: 60;
            readonly REQUESTS_PER_HOUR: 1000;
            readonly BURST_LIMIT: 10;
        };
        readonly TIMEOUTS: {
            readonly CONNECT: 5000;
            readonly READ: 30000;
            readonly WRITE: 30000;
            readonly IDLE: 60000;
        };
        readonly RETRY: {
            readonly MAX_ATTEMPTS: 3;
            readonly INITIAL_DELAY: 1000;
            readonly MAX_DELAY: 10000;
            readonly BACKOFF_MULTIPLIER: 2;
        };
        readonly CACHE: {
            readonly NO_CACHE: "no-cache";
            readonly NO_STORE: "no-store";
            readonly MUST_REVALIDATE: "must-revalidate";
            readonly PRIVATE: "private";
            readonly PUBLIC: "public";
        };
        readonly ERROR_CODES: {
            readonly NETWORK_ERROR: "NETWORK_ERROR";
            readonly TIMEOUT_ERROR: "TIMEOUT_ERROR";
            readonly VALIDATION_ERROR: "VALIDATION_ERROR";
            readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
            readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
            readonly SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR";
            readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
            readonly CONFLICT_ERROR: "CONFLICT_ERROR";
            readonly SERVER_ERROR: "SERVER_ERROR";
        };
    };
    readonly ORDERS: typeof ORDERS;
    readonly STATUS: typeof STATUS;
};

export { ACTION_COLORS, API, AUDIT_ACTION, AUDIT_ENTITY_TYPE, type ActionColor, type ApiValue, type AuditAction, type AuditEntityType, BACKGROUND_COLORS, BILLING_CYCLES, BILLING_INTERVAL, BORDER_COLORS, BRAND_COLORS, BUSINESS, BUSINESS_TYPE_DEFAULTS, BUSINESS_TYPE_DESCRIPTIONS, BUSINESS_TYPE_LABELS, BUSINESS_TYPE_OPTIONS, BUTTON_COLORS, type BackgroundColor, type BillingInterval, type BorderColor, type BrandColor, type BusinessType, type BusinessTypeOption, type BusinessValue, type ButtonVariant, CONSTANTS, COUNTRIES, CURRENCY_CONFIGS, CURRENCY_DECIMALS, CURRENCY_LOCALES, CURRENCY_NAMES, CURRENCY_OPTIONS, CURRENCY_SYMBOLS, CURRENCY_SYMBOL_POSITION, type Country, type CurrencyCode, type CurrencyConfig, DEFAULT_CURRENCY, DEFAULT_CURRENCY_SETTINGS, ENTITY_STATUS, ENTITY_STATUS_COLORS, ENVIRONMENT, EXCHANGE_RATES, type EntityStatus, type EnvironmentValue, MERCHANT_STATUS, type MerchantPricingConfig, type MerchantStatus, NAVIGATION_COLORS, type NavigationColor, ORDER_STATUS, ORDER_STATUS as ORDER_STATUSES, ORDER_STATUS_BUTTON_COLORS, ORDER_STATUS_COLORS$1 as ORDER_STATUS_COLORS, ORDER_STATUS_COLORS as ORDER_STATUS_COLOR_PALETTE, ORDER_STATUS_ICONS, ORDER_STATUS_LABELS, ORDER_TYPE, ORDER_TYPES, ORDER_TYPE_BUTTON_COLORS, ORDER_TYPE_COLORS$1 as ORDER_TYPE_COLORS, ORDER_TYPE_COLORS as ORDER_TYPE_COLOR_PALETTE, ORDER_TYPE_ICONS, ORDER_TYPE_LABELS, type OrderStatus, type OrderType$1 as OrderType, PAGINATION, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_STATUS_COLORS, PAYMENT_TYPE, PRICING_TYPE, PRICING_TYPE_DESCRIPTIONS, PRICING_TYPE_LABELS, PRICING_TYPE_OPTIONS, PRODUCT_AVAILABILITY_COLORS, PRODUCT_AVAILABILITY_STATUS, type PaginationValue, type PaymentMethod, type PaymentStatus, type PaymentType, type PlanConfig, type PlanFeature, type PlanLimits, type PricingBusinessRules, type PricingDurationLimits, type PricingType, type PricingTypeOption, type ProductAvailabilityStatus, RENEWAL_DURATIONS, SEARCH, SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_COLORS, SUPPORTED_CURRENCIES, type SearchValue, type SubscriptionStatus, TEXT_COLORS, TRIAL_CONFIG, type TextColor, UI, type UIValue, USER_ROLE, type UserRole, VALIDATION, type ValidationValue, CONSTANTS as default, formatCountryDisplay, getActivePlans, getAllPlans, getBusinessTypeDescription, getBusinessTypeLabel, getCountriesByRegion, getCountriesSorted, getCountryByCode, getCountryByName, getCurrencyConfig, getCurrencyName, getCurrencySymbol, getDefaultCountry, getDefaultPricingConfig, getDefaultTrialDays, getDurationUnit, getOrderStatusClass, getOrderStatusClassName, getOrderStatusColors, getOrderTypeClass, getPlan, getPlanComparison, getPlanLimits, getPlanPlatform, getPricingTypeDescription, getPricingTypeLabel, getStatusColor, getStatusLabel, getStatusOptions, getTrialNotificationDays, hasMobileAccess, hasProductPublicCheck, hasWebAccess, isEntityActive, isOrderCompleted, isPaymentFailed, isPaymentPending, isPaymentSuccessful, isSubscriptionActive, isUnlimitedPlan, isValidCurrency, isValidSubscriptionStatus, normalizeSubscriptionStatus, requiresRentalDates, validatePlanConfig };
