"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  API: () => API,
  AUDIT_ACTION: () => AUDIT_ACTION,
  AUDIT_ENTITY_TYPE: () => AUDIT_ENTITY_TYPE,
  BILLING_CYCLES: () => BILLING_CYCLES,
  BILLING_INTERVAL: () => BILLING_INTERVAL,
  BUSINESS: () => BUSINESS,
  BUSINESS_TYPE_DEFAULTS: () => BUSINESS_TYPE_DEFAULTS,
  BUSINESS_TYPE_DESCRIPTIONS: () => BUSINESS_TYPE_DESCRIPTIONS,
  BUSINESS_TYPE_LABELS: () => BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_OPTIONS: () => BUSINESS_TYPE_OPTIONS,
  CONSTANTS: () => CONSTANTS,
  COUNTRIES: () => COUNTRIES,
  ENTITY_STATUS: () => ENTITY_STATUS,
  ENVIRONMENT: () => ENVIRONMENT,
  ORDER_STATUS: () => ORDER_STATUS,
  ORDER_STATUSES: () => ORDER_STATUS,
  ORDER_STATUS_COLORS: () => ORDER_STATUS_COLORS,
  ORDER_STATUS_ICONS: () => ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS: () => ORDER_STATUS_LABELS,
  ORDER_TYPE: () => ORDER_TYPE,
  ORDER_TYPES: () => ORDER_TYPES,
  ORDER_TYPE_COLORS: () => ORDER_TYPE_COLORS,
  ORDER_TYPE_ICONS: () => ORDER_TYPE_ICONS,
  ORDER_TYPE_LABELS: () => ORDER_TYPE_LABELS,
  PAGINATION: () => PAGINATION,
  PAYMENT_METHOD: () => PAYMENT_METHOD,
  PAYMENT_STATUS: () => PAYMENT_STATUS,
  PAYMENT_TYPE: () => PAYMENT_TYPE,
  PRICING_TYPE_DESCRIPTIONS: () => PRICING_TYPE_DESCRIPTIONS,
  PRICING_TYPE_LABELS: () => PRICING_TYPE_LABELS,
  PRICING_TYPE_OPTIONS: () => PRICING_TYPE_OPTIONS,
  PRODUCT_AVAILABILITY_STATUS: () => PRODUCT_AVAILABILITY_STATUS,
  RENEWAL_DURATIONS: () => RENEWAL_DURATIONS,
  SEARCH: () => SEARCH,
  SUBSCRIPTION_PLANS: () => SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS: () => SUBSCRIPTION_STATUS,
  TRIAL_CONFIG: () => TRIAL_CONFIG,
  UI: () => UI,
  USER_ROLE: () => USER_ROLE,
  VALIDATION: () => VALIDATION,
  default: () => CONSTANTS,
  formatCountryDisplay: () => formatCountryDisplay,
  getActivePlans: () => getActivePlans,
  getAllPlans: () => getAllPlans,
  getBusinessTypeDescription: () => getBusinessTypeDescription,
  getBusinessTypeLabel: () => getBusinessTypeLabel,
  getCountriesByRegion: () => getCountriesByRegion,
  getCountriesSorted: () => getCountriesSorted,
  getCountryByCode: () => getCountryByCode,
  getCountryByName: () => getCountryByName,
  getDefaultCountry: () => getDefaultCountry,
  getDefaultPricingConfig: () => getDefaultPricingConfig,
  getDefaultTrialDays: () => getDefaultTrialDays,
  getDurationUnit: () => getDurationUnit,
  getPlan: () => getPlan,
  getPlanComparison: () => getPlanComparison,
  getPlanLimits: () => getPlanLimits,
  getPlanPlatform: () => getPlanPlatform,
  getPricingTypeDescription: () => getPricingTypeDescription,
  getPricingTypeLabel: () => getPricingTypeLabel,
  getStatusColor: () => getStatusColor,
  getStatusLabel: () => getStatusLabel,
  getStatusOptions: () => getStatusOptions,
  getTrialNotificationDays: () => getTrialNotificationDays,
  hasMobileAccess: () => hasMobileAccess,
  hasProductPublicCheck: () => hasProductPublicCheck,
  hasWebAccess: () => hasWebAccess,
  isEntityActive: () => isEntityActive,
  isOrderCompleted: () => isOrderCompleted,
  isPaymentFailed: () => isPaymentFailed,
  isPaymentPending: () => isPaymentPending,
  isPaymentSuccessful: () => isPaymentSuccessful,
  isSubscriptionActive: () => isSubscriptionActive,
  isUnlimitedPlan: () => isUnlimitedPlan,
  requiresRentalDates: () => requiresRentalDates,
  validatePlanConfig: () => validatePlanConfig
});
module.exports = __toCommonJS(src_exports);

// src/pagination.ts
var PAGINATION = {
  // Search and List Limits
  SEARCH_LIMIT: 20,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 20,
  // Dashboard Limits
  DASHBOARD_ITEMS: 10,
  RECENT_ORDERS: 5,
  TOP_PRODUCTS: 8,
  TOP_CUSTOMERS: 6,
  // Mobile Limits
  MOBILE_SEARCH_LIMIT: 15,
  MOBILE_PAGE_SIZE: 20,
  // API Limits
  API_MAX_LIMIT: 1e3,
  API_DEFAULT_LIMIT: 50
};

// src/search.ts
var SEARCH = {
  // Debounce and Timing
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  // Suggestion and Results
  SUGGESTION_LIMIT: 5,
  MAX_SEARCH_RESULTS: 1e3,
  // Auto-complete
  AUTOCOMPLETE_DELAY: 200,
  AUTOCOMPLETE_MIN_CHARS: 1,
  // Search Types
  PRODUCT_SEARCH: "product",
  CUSTOMER_SEARCH: "customer",
  ORDER_SEARCH: "order"
};

// src/validation.ts
var VALIDATION = {
  // Rental Rules
  MIN_RENTAL_DAYS: 1,
  MAX_RENTAL_DAYS: 365,
  // Stock and Inventory
  LOW_STOCK_THRESHOLD: 2,
  CRITICAL_STOCK_THRESHOLD: 0,
  MAX_STOCK_QUANTITY: 9999,
  // User Input
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 255,
  // Order Rules
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 999999.99,
  MAX_ORDER_ITEMS: 50,
  // Financial
  MIN_DEPOSIT_AMOUNT: 0,
  MAX_DEPOSIT_AMOUNT: 99999.99,
  MIN_DISCOUNT_AMOUNT: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  // File Uploads
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"]
};

// src/ui.ts
var UI = {
  // Animation and Timing
  ANIMATION_DURATION: 200,
  TRANSITION_DURATION: 150,
  HOVER_DELAY: 100,
  // Toast and Notifications
  TOAST_DURATION: 5e3,
  TOAST_DURATION_LONG: 1e4,
  TOAST_DURATION_SHORT: 3e3,
  // Loading States
  LOADING_DELAY: 1e3,
  SKELETON_DURATION: 1500,
  // Debounce and Throttle
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  // Scroll and Pagination
  INFINITE_SCROLL_THRESHOLD: 100,
  SCROLL_TO_TOP_THRESHOLD: 500,
  // Breakpoints (in pixels)
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
    LARGE_DESKTOP: 1536
  },
  // Z-Index Layers
  Z_INDEX: {
    DROPDOWN: 1e3,
    MODAL: 2e3,
    TOOLTIP: 3e3,
    TOAST: 4e3,
    OVERLAY: 5e3
  }
};

// src/business.ts
var BUSINESS = {
  // Order Defaults
  DEFAULT_QUANTITY: 1,
  DEFAULT_DEPOSIT: 0,
  DEFAULT_DISCOUNT: 0,
  DEFAULT_TAX_RATE: 0,
  // Order Limits
  MAX_ORDER_ITEMS: 50,
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 999999.99,
  // Rental Rules
  MIN_RENTAL_DAYS: 1,
  MAX_RENTAL_DAYS: 365,
  // Customer Defaults
  DEFAULT_CUSTOMER_TYPE: "WALK_IN",
  DEFAULT_CUSTOMER_STATUS: "ACTIVE",
  // Product Defaults
  DEFAULT_PRODUCT_STATUS: "ACTIVE",
  DEFAULT_PRODUCT_CATEGORY: "UNCATEGORIZED",
  // Rental Defaults
  DEFAULT_RENTAL_PERIOD: 1,
  // days
  DEFAULT_LATE_FEE_RATE: 0.1,
  // 10% per day
  DEFAULT_DAMAGE_FEE: 0,
  // Payment Defaults
  DEFAULT_PAYMENT_METHOD: "CASH",
  DEFAULT_PAYMENT_STATUS: "PENDING",
  // Outlet Defaults
  DEFAULT_OUTLET_STATUS: "ACTIVE",
  DEFAULT_OUTLET_TYPE: "RETAIL",
  // User Defaults
  DEFAULT_USER_STATUS: "ACTIVE",
  DEFAULT_USER_ROLE: "OUTLET_STAFF",
  // Notification Defaults
  DEFAULT_NOTIFICATION_TYPE: "INFO",
  DEFAULT_NOTIFICATION_PRIORITY: "NORMAL",
  // Rental Shop Specific
  DEFAULT_PICKUP_TIME: "09:00",
  DEFAULT_RETURN_TIME: "17:00",
  BUSINESS_HOURS: {
    OPEN: "08:00",
    CLOSE: "18:00",
    BREAK_START: "12:00",
    BREAK_END: "13:00"
  },
  // Inventory Management
  LOW_STOCK_WARNING: 5,
  CRITICAL_STOCK_WARNING: 2,
  AUTO_REORDER_THRESHOLD: 3,
  // Customer Management
  MAX_CUSTOMER_ORDERS: 100,
  CUSTOMER_CREDIT_LIMIT: 1e3,
  LOYALTY_POINTS_RATE: 0.01,
  // 1 point per $1 spent
  // Order Processing
  ORDER_PREPARATION_TIME: 30,
  // minutes
  PICKUP_GRACE_PERIOD: 15,
  // minutes
  RETURN_GRACE_PERIOD: 30,
  // minutes
  // Financial Rules
  MIN_DEPOSIT_PERCENTAGE: 0.1,
  // 10% of order value
  MAX_DEPOSIT_PERCENTAGE: 0.5,
  // 50% of order value
  LATE_FEE_CAP: 100,
  // Maximum late fee per order
  DAMAGE_FEE_CAP: 500
  // Maximum damage fee per item
};

// src/environment.ts
var ENVIRONMENT = {
  // API Configuration
  API_TIMEOUT: process.env.NODE_ENV === "production" ? 1e4 : 3e4,
  API_RETRY_ATTEMPTS: process.env.NODE_ENV === "production" ? 3 : 1,
  // Search and Pagination (Production vs Development)
  SEARCH_LIMIT: process.env.NODE_ENV === "production" ? 50 : 20,
  DASHBOARD_ITEMS: process.env.NODE_ENV === "production" ? 20 : 10,
  // Caching
  CACHE_TTL: process.env.NODE_ENV === "production" ? 300 : 60,
  // seconds
  CACHE_MAX_SIZE: process.env.NODE_ENV === "production" ? 1e3 : 100,
  // Logging
  LOG_LEVEL: process.env.NODE_ENV === "production" ? "error" : "debug",
  LOG_RETENTION: process.env.NODE_ENV === "production" ? 30 : 7,
  // days
  // Performance
  DEBOUNCE_DELAY: process.env.NODE_ENV === "production" ? 500 : 300,
  THROTTLE_DELAY: process.env.NODE_ENV === "production" ? 200 : 100,
  // Security
  SESSION_TIMEOUT: process.env.NODE_ENV === "production" ? 3600 : 7200,
  // seconds
  MAX_LOGIN_ATTEMPTS: process.env.NODE_ENV === "production" ? 5 : 10,
  // Feature Flags
  ENABLE_ANALYTICS: process.env.NODE_ENV === "production",
  ENABLE_DEBUG_MODE: process.env.NODE_ENV !== "production",
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === "production"
};

// src/api.ts
var API = {
  // HTTP Status Codes
  STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    // For subscription errors (expired, paused, etc.)
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  // HTTP Methods
  METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE"
  },
  // Content Types
  CONTENT_TYPES: {
    JSON: "application/json",
    FORM_DATA: "multipart/form-data",
    TEXT: "text/plain",
    HTML: "text/html"
  },
  // Headers
  HEADERS: {
    AUTHORIZATION: "Authorization",
    CONTENT_TYPE: "Content-Type",
    ACCEPT: "Accept",
    USER_AGENT: "User-Agent",
    CACHE_CONTROL: "Cache-Control"
  },
  // Rate Limiting
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1e3,
    BURST_LIMIT: 10
  },
  // Timeouts
  TIMEOUTS: {
    CONNECT: 5e3,
    READ: 3e4,
    WRITE: 3e4,
    IDLE: 6e4
  },
  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1e3,
    MAX_DELAY: 1e4,
    BACKOFF_MULTIPLIER: 2
  },
  // Cache Headers
  CACHE: {
    NO_CACHE: "no-cache",
    NO_STORE: "no-store",
    MUST_REVALIDATE: "must-revalidate",
    PRIVATE: "private",
    PUBLIC: "public"
  },
  // Error Codes
  ERROR_CODES: {
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
    SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR",
    NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
    CONFLICT_ERROR: "CONFLICT_ERROR",
    SERVER_ERROR: "SERVER_ERROR"
  }
};

// src/orders.ts
var orders_exports = {};
__export(orders_exports, {
  ORDER_STATUSES: () => ORDER_STATUS,
  ORDER_STATUS_COLORS: () => ORDER_STATUS_COLORS,
  ORDER_STATUS_ICONS: () => ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS: () => ORDER_STATUS_LABELS,
  ORDER_TYPES: () => ORDER_TYPES,
  ORDER_TYPE_COLORS: () => ORDER_TYPE_COLORS,
  ORDER_TYPE_ICONS: () => ORDER_TYPE_ICONS,
  ORDER_TYPE_LABELS: () => ORDER_TYPE_LABELS
});

// src/status.ts
var status_exports = {};
__export(status_exports, {
  AUDIT_ACTION: () => AUDIT_ACTION,
  AUDIT_ENTITY_TYPE: () => AUDIT_ENTITY_TYPE,
  BILLING_INTERVAL: () => BILLING_INTERVAL,
  ENTITY_STATUS: () => ENTITY_STATUS,
  ORDER_STATUS: () => ORDER_STATUS,
  ORDER_TYPE: () => ORDER_TYPE,
  PAYMENT_METHOD: () => PAYMENT_METHOD,
  PAYMENT_STATUS: () => PAYMENT_STATUS,
  PAYMENT_TYPE: () => PAYMENT_TYPE,
  PRODUCT_AVAILABILITY_STATUS: () => PRODUCT_AVAILABILITY_STATUS,
  SUBSCRIPTION_STATUS: () => SUBSCRIPTION_STATUS,
  USER_ROLE: () => USER_ROLE,
  getStatusColor: () => getStatusColor,
  getStatusLabel: () => getStatusLabel,
  getStatusOptions: () => getStatusOptions,
  isEntityActive: () => isEntityActive,
  isOrderCompleted: () => isOrderCompleted,
  isPaymentFailed: () => isPaymentFailed,
  isPaymentPending: () => isPaymentPending,
  isPaymentSuccessful: () => isPaymentSuccessful,
  isSubscriptionActive: () => isSubscriptionActive
});
var SUBSCRIPTION_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELLED: "CANCELLED",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED"
};
var ORDER_STATUS = {
  // RENT order statuses
  RESERVED: "RESERVED",
  // New order, scheduled for pickup
  PICKUPED: "PICKUPED",
  // Currently being rented
  RETURNED: "RETURNED",
  // Rental completed
  // SALE order statuses
  COMPLETED: "COMPLETED",
  // Sale finalized
  // Common statuses
  CANCELLED: "CANCELLED"
  // Order cancelled (applies to both types)
};
var PAYMENT_STATUS = {
  PENDING: "PENDING",
  // Payment initiated but not confirmed
  COMPLETED: "COMPLETED",
  // Payment fully processed and confirmed
  FAILED: "FAILED",
  // Payment processing failed
  REFUNDED: "REFUNDED",
  // Payment was refunded
  CANCELLED: "CANCELLED"
  // Payment was cancelled before processing
};
var PAYMENT_METHOD = {
  STRIPE: "STRIPE",
  TRANSFER: "TRANSFER",
  MANUAL: "MANUAL",
  CASH: "CASH",
  CHECK: "CHECK",
  PAYPAL: "PAYPAL"
};
var PAYMENT_TYPE = {
  ORDER_PAYMENT: "ORDER_PAYMENT",
  SUBSCRIPTION_PAYMENT: "SUBSCRIPTION_PAYMENT",
  PLAN_CHANGE: "PLAN_CHANGE",
  PLAN_EXTENSION: "PLAN_EXTENSION"
};
var ORDER_TYPE = {
  RENT: "RENT",
  SALE: "SALE"
};
var USER_ROLE = {
  ADMIN: "ADMIN",
  // System Administrator
  MERCHANT: "MERCHANT",
  // Business Owner
  OUTLET_ADMIN: "OUTLET_ADMIN",
  // Outlet Manager
  OUTLET_STAFF: "OUTLET_STAFF"
  // Outlet Employee
};
var ENTITY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive"
};
var PRODUCT_AVAILABILITY_STATUS = {
  AVAILABLE: "available",
  OUT_OF_STOCK: "out-of-stock",
  UNAVAILABLE: "unavailable",
  DATE_CONFLICT: "date-conflict"
};
var BILLING_INTERVAL = {
  MONTH: "month",
  QUARTER: "quarter",
  SEMI_ANNUAL: "semiAnnual",
  YEAR: "year"
};
var AUDIT_ACTION = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW: "VIEW",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  CANCEL: "CANCEL",
  APPROVE: "APPROVE",
  REJECT: "REJECT"
};
var AUDIT_ENTITY_TYPE = {
  USER: "USER",
  MERCHANT: "MERCHANT",
  OUTLET: "OUTLET",
  CUSTOMER: "CUSTOMER",
  PRODUCT: "PRODUCT",
  ORDER: "ORDER",
  PAYMENT: "PAYMENT",
  SUBSCRIPTION: "SUBSCRIPTION",
  PLAN: "PLAN",
  CATEGORY: "CATEGORY"
};
function isSubscriptionActive(status) {
  return status === SUBSCRIPTION_STATUS.TRIAL || status === SUBSCRIPTION_STATUS.ACTIVE;
}
function isOrderCompleted(status, orderType) {
  if (orderType === ORDER_TYPE.RENT) {
    return status === ORDER_STATUS.RETURNED;
  }
  return status === ORDER_STATUS.COMPLETED;
}
function isPaymentSuccessful(status) {
  return status === PAYMENT_STATUS.COMPLETED;
}
function isPaymentPending(status) {
  return status === PAYMENT_STATUS.PENDING;
}
function isPaymentFailed(status) {
  return status === PAYMENT_STATUS.FAILED;
}
function isEntityActive(status) {
  return status === ENTITY_STATUS.ACTIVE;
}
function getStatusLabel(status, type) {
  switch (type) {
    case "subscription":
      return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
    case "order":
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case "payment":
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case "entity":
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    case "availability":
      return status.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    default:
      return status;
  }
}
function getStatusColor(status, type) {
  switch (type) {
    case "subscription":
      switch (status) {
        case SUBSCRIPTION_STATUS.TRIAL:
          return "text-blue-600 bg-blue-100";
        case SUBSCRIPTION_STATUS.ACTIVE:
          return "text-green-600 bg-green-100";
        case SUBSCRIPTION_STATUS.PAST_DUE:
          return "text-yellow-600 bg-yellow-100";
        case SUBSCRIPTION_STATUS.CANCELLED:
        case SUBSCRIPTION_STATUS.EXPIRED:
          return "text-red-600 bg-red-100";
        case SUBSCRIPTION_STATUS.PAUSED:
          return "text-orange-600 bg-orange-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    case "order":
      switch (status) {
        case ORDER_STATUS.RESERVED:
          return "text-blue-600 bg-blue-100";
        case ORDER_STATUS.PICKUPED:
          return "text-purple-600 bg-purple-100";
        case ORDER_STATUS.RETURNED:
        case ORDER_STATUS.COMPLETED:
          return "text-green-600 bg-green-100";
        case ORDER_STATUS.CANCELLED:
          return "text-red-600 bg-red-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    case "payment":
      switch (status) {
        case PAYMENT_STATUS.PENDING:
          return "text-yellow-600 bg-yellow-100";
        case PAYMENT_STATUS.COMPLETED:
          return "text-green-600 bg-green-100";
        case PAYMENT_STATUS.FAILED:
          return "text-red-600 bg-red-100";
        case PAYMENT_STATUS.REFUNDED:
          return "text-blue-600 bg-blue-100";
        case PAYMENT_STATUS.CANCELLED:
          return "text-gray-600 bg-gray-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    case "entity":
      switch (status) {
        case ENTITY_STATUS.ACTIVE:
          return "text-green-600 bg-green-100";
        case ENTITY_STATUS.INACTIVE:
          return "text-red-600 bg-red-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    case "availability":
      switch (status) {
        case PRODUCT_AVAILABILITY_STATUS.AVAILABLE:
          return "text-green-600 bg-green-100";
        case PRODUCT_AVAILABILITY_STATUS.OUT_OF_STOCK:
          return "text-red-600 bg-red-100";
        case PRODUCT_AVAILABILITY_STATUS.UNAVAILABLE:
          return "text-gray-600 bg-gray-100";
        case PRODUCT_AVAILABILITY_STATUS.DATE_CONFLICT:
          return "text-yellow-600 bg-yellow-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    default:
      return "text-gray-600 bg-gray-100";
  }
}
function getStatusOptions(type) {
  switch (type) {
    case "subscription":
      return Object.values(SUBSCRIPTION_STATUS).map((status) => ({
        value: status,
        label: getStatusLabel(status, "subscription")
      }));
    case "order":
      return Object.values(ORDER_STATUS).map((status) => ({
        value: status,
        label: getStatusLabel(status, "order")
      }));
    case "payment":
      return Object.values(PAYMENT_STATUS).map((status) => ({
        value: status,
        label: getStatusLabel(status, "payment")
      }));
    case "entity":
      return Object.values(ENTITY_STATUS).map((status) => ({
        value: status,
        label: getStatusLabel(status, "entity")
      }));
    case "availability":
      return Object.values(PRODUCT_AVAILABILITY_STATUS).map((status) => ({
        value: status,
        label: getStatusLabel(status, "availability")
      }));
    default:
      return [];
  }
}

// src/orders.ts
var ORDER_TYPES = {
  RENT: "RENT",
  SALE: "SALE"
};
var ORDER_STATUS_COLORS = {
  RESERVED: "bg-red-100 text-red-800",
  PICKUPED: "bg-[#f19920] text-white",
  RETURNED: "bg-[#0F9347] text-white",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-[#b22222] text-white"
};
var ORDER_TYPE_COLORS = {
  RENT: "bg-blue-100 text-blue-800",
  SALE: "bg-green-100 text-green-800"
};
var ORDER_STATUS_ICONS = {
  RESERVED: "\u{1F4CB}",
  PICKUPED: "\u23F3",
  RETURNED: "\u2705",
  COMPLETED: "\u{1F389}",
  CANCELLED: "\u274C"
};
var ORDER_TYPE_ICONS = {
  RENT: "\u{1F504}",
  SALE: "\u{1F4B0}"
};
var ORDER_STATUS_LABELS = {
  RESERVED: "M\u1EDBi c\u1ECDc",
  PICKUPED: "\u0110ang thu\xEA",
  RETURNED: "\u0110\xE3 tr\u1EA3",
  COMPLETED: "Ho\xE0n th\xE0nh",
  CANCELLED: "H\u1EE7y"
};
var ORDER_TYPE_LABELS = {
  RENT: "Thu\xEA",
  SALE: "B\xE1n"
};

// src/subscription.ts
var BILLING_CYCLES = {
  MONTHLY: {
    id: "monthly",
    name: "Monthly",
    duration: 1,
    unit: "month",
    discount: 0
  },
  QUARTERLY: {
    id: "quarterly",
    name: "Quarterly",
    duration: 3,
    unit: "months",
    discount: 0.05
    // 5% discount
  },
  YEARLY: {
    id: "yearly",
    name: "Yearly",
    duration: 12,
    unit: "months",
    discount: 0.2
    // 20% discount
  }
};
var RENEWAL_DURATIONS = [
  {
    id: "monthly",
    name: "Monthly",
    months: 1,
    duration: 1,
    unit: "month",
    description: "Renew every month",
    isPopular: false
  },
  {
    id: "quarterly",
    name: "Quarterly",
    months: 3,
    duration: 3,
    unit: "months",
    description: "Save 5% with quarterly billing",
    isPopular: false
  },
  {
    id: "semiannual",
    name: "6 Months",
    months: 6,
    duration: 6,
    unit: "months",
    description: "Save 10% with 6-month billing",
    isPopular: false
  },
  {
    id: "yearly",
    name: "Yearly",
    months: 12,
    duration: 12,
    unit: "months",
    description: "Save 20% with annual billing",
    isPopular: true
  }
];
var TRIAL_CONFIG = {
  DEFAULT_TRIAL_DAYS: 14,
  TRIAL_NOTIFICATIONS: {
    DAYS_BEFORE_EXPIRY: [7, 3, 1]
  }
};
var SUBSCRIPTION_PLANS = {
  TRIAL: {
    id: "trial",
    name: "Trial",
    description: "Free trial with starter plan limits",
    basePrice: 0,
    // Free trial
    currency: "VND",
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2e3,
      orders: 2e3
    },
    features: [
      { name: "Mobile app access", description: "Access your business on mobile devices", included: true },
      { name: "Basic inventory management", description: "Track products and stock levels", included: true },
      { name: "Customer management", description: "Store customer information and history", included: true },
      { name: "Order processing", description: "Create and manage rental orders", included: true },
      { name: "Basic reporting", description: "View sales and rental reports", included: true },
      { name: "Public product catalog", description: "Share product list publicly with customers", included: true },
      { name: "Product public check", description: "Send public links to customers to view products and pricing", included: true }
    ],
    platform: "mobile",
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
    color: "green",
    badge: "Free Trial",
    upgradeFrom: [],
    downgradeTo: ["basic"]
  },
  BASIC: {
    id: "basic",
    name: "Basic",
    description: "Perfect for small rental businesses",
    basePrice: 79e3,
    // 79k VND
    currency: "VND",
    limits: {
      outlets: 1,
      users: 3,
      products: 500,
      customers: 2e3,
      orders: 2e3
    },
    features: [
      { name: "Mobile app access", description: "Access your business on mobile devices", included: true },
      { name: "Basic inventory management", description: "Track products and stock levels", included: true },
      { name: "Customer management", description: "Store customer information and history", included: true },
      { name: "Order processing", description: "Create and manage rental orders", included: true },
      { name: "Basic reporting", description: "View sales and rental reports", included: true },
      { name: "Public product catalog", description: "Share product list publicly with customers", included: true },
      { name: "Product public check", description: "Send public links to customers to view products and pricing", included: true }
    ],
    platform: "mobile",
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    color: "blue",
    upgradeFrom: [],
    downgradeTo: []
  },
  PROFESSIONAL: {
    id: "professional",
    name: "Professional",
    description: "Ideal for growing rental businesses with web access",
    basePrice: 199e3,
    // 199k VND
    currency: "VND",
    limits: {
      outlets: 1,
      users: 8,
      products: 5e3,
      customers: 1e4,
      orders: 1e4
    },
    features: [
      { name: "All Basic features", description: "Includes all Basic plan features", included: true },
      { name: "Web dashboard access", description: "Full web-based management interface", included: true },
      { name: "Advanced reporting & analytics", description: "Detailed business insights and trends", included: true },
      { name: "Inventory forecasting", description: "Predict demand and optimize stock levels", included: true },
      { name: "Online payments", description: "Accept online payments and deposits", included: true },
      { name: "API integration", description: "Connect with third-party tools", included: true },
      { name: "Team collaboration tools", description: "Manage team permissions and workflows", included: true },
      { name: "Priority support", description: "Fast response times for support", included: true }
    ],
    platform: "mobile+web",
    publicProductCheck: true,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    color: "purple",
    badge: "Most Popular",
    upgradeFrom: ["basic"],
    downgradeTo: ["basic"]
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large rental operations with multiple outlets",
    basePrice: 399e3,
    // 399k VND
    currency: "VND",
    limits: {
      outlets: 3,
      users: 15,
      products: 15e3,
      customers: 5e4,
      orders: 5e4
    },
    features: [
      { name: "All Professional features", description: "Includes all Professional plan features", included: true },
      { name: "Multiple outlets", description: "Manage multiple rental locations", included: true },
      { name: "Advanced team management", description: "Sophisticated user roles and permissions", included: true },
      { name: "Custom integrations", description: "Tailored third-party integrations", included: true },
      { name: "Dedicated account manager", description: "Personal support representative", included: true },
      { name: "Custom reporting", description: "Tailored analytics and reporting", included: true },
      { name: "White-label solution", description: "Brand the platform with your company identity", included: true },
      { name: "24/7 phone support", description: "Round-the-clock support via phone", included: true }
    ],
    platform: "mobile+web",
    publicProductCheck: true,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
    color: "gold",
    badge: "Premium",
    upgradeFrom: ["basic", "professional"],
    downgradeTo: ["professional"]
  }
};
function getPlan(planId) {
  const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
  return plan || null;
}
function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
}
function getActivePlans() {
  return getAllPlans().filter((plan) => plan.isActive);
}
function getPlanLimits(planId) {
  const plan = getPlan(planId);
  return plan ? plan.limits : null;
}
function hasWebAccess(planId) {
  const plan = getPlan(planId);
  return plan ? plan.platform === "mobile+web" : false;
}
function hasMobileAccess(planId) {
  const plan = getPlan(planId);
  return plan ? plan.platform === "mobile" || plan.platform === "mobile+web" : false;
}
function hasProductPublicCheck(planId) {
  const plan = getPlan(planId);
  return plan ? plan.publicProductCheck : false;
}
function getPlanPlatform(planId) {
  const plan = getPlan(planId);
  return plan ? plan.platform : null;
}
function isUnlimitedPlan(planId, entityType) {
  const limits = getPlanLimits(planId);
  if (!limits)
    return false;
  return limits[entityType] === -1;
}
function getTrialNotificationDays() {
  return TRIAL_CONFIG.TRIAL_NOTIFICATIONS.DAYS_BEFORE_EXPIRY;
}
function getDefaultTrialDays() {
  return TRIAL_CONFIG.DEFAULT_TRIAL_DAYS;
}
function getPlanComparison() {
  const plans = getActivePlans();
  return {
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: plan.basePrice,
      currency: plan.currency,
      badge: plan.badge,
      color: plan.color
    })),
    features: [
      { name: "Mobile App", basic: true, professional: true, enterprise: true },
      { name: "Web Dashboard", basic: false, professional: true, enterprise: true },
      { name: "Products", basic: "500", professional: "5,000", enterprise: "15,000" },
      { name: "Customers", basic: "2,000", professional: "10,000", enterprise: "50,000" },
      { name: "Users", basic: "3", professional: "8", enterprise: "15" },
      { name: "Outlets", basic: "1", professional: "1", enterprise: "3" },
      { name: "Orders", basic: "2,000", professional: "10,000", enterprise: "50,000" },
      { name: "Product Public Check", basic: true, professional: true, enterprise: true },
      { name: "Advanced Analytics", basic: false, professional: true, enterprise: true },
      { name: "API Access", basic: false, professional: true, enterprise: true },
      { name: "Priority Support", basic: false, professional: true, enterprise: true },
      { name: "24/7 Phone Support", basic: false, professional: false, enterprise: true }
    ]
  };
}
function validatePlanConfig(plan) {
  const errors = [];
  if (!plan.id || plan.id.trim() === "") {
    errors.push("Plan ID is required");
  }
  if (!plan.name || plan.name.trim() === "") {
    errors.push("Plan name is required");
  }
  if (plan.basePrice < 0) {
    errors.push("Base price must be non-negative");
  }
  if (!plan.limits) {
    errors.push("Plan limits are required");
  } else {
    if (plan.limits.outlets < -1) {
      errors.push("Outlets limit must be -1 (unlimited) or positive");
    }
    if (plan.limits.users < -1) {
      errors.push("Users limit must be -1 (unlimited) or positive");
    }
    if (plan.limits.products < -1) {
      errors.push("Products limit must be -1 (unlimited) or positive");
    }
    if (plan.limits.customers < -1) {
      errors.push("Customers limit must be -1 (unlimited) or positive");
    }
    if (plan.limits.orders < -1) {
      errors.push("Orders limit must be -1 (unlimited) or positive");
    }
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

// src/pricing.ts
var BUSINESS_TYPE_OPTIONS = [
  {
    value: "GENERAL",
    label: "General Rental",
    description: "Mixed rental business with various product types",
    icon: ""
  },
  {
    value: "CLOTHING",
    label: "Clothing & Fashion",
    description: "Rent or sell clothing, accessories, and fashion items",
    icon: ""
  },
  {
    value: "VEHICLE",
    label: "Vehicle Rental",
    description: "Car, motorcycle, bicycle, and vehicle rental services",
    icon: ""
  },
  {
    value: "EQUIPMENT",
    label: "Equipment Rental",
    description: "Tools, machinery, and equipment rental services",
    icon: ""
  }
];
var PRICING_TYPE_OPTIONS = [
  {
    value: "FIXED",
    label: "Fixed Price",
    description: "Same price regardless of rental duration",
    icon: ""
  },
  {
    value: "HOURLY",
    label: "Hourly Pricing",
    description: "Price calculated per hour of rental",
    icon: ""
  },
  {
    value: "DAILY",
    label: "Daily Pricing",
    description: "Price calculated per day of rental",
    icon: ""
  },
  {
    value: "WEEKLY",
    label: "Weekly Pricing",
    description: "Price calculated per week of rental",
    icon: ""
  }
];
var BUSINESS_TYPE_DEFAULTS = {
  CLOTHING: {
    businessType: "CLOTHING",
    defaultPricingType: "FIXED",
    businessRules: {
      requireRentalDates: false,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,
      maxDuration: 1,
      defaultDuration: 1
    }
  },
  VEHICLE: {
    businessType: "VEHICLE",
    defaultPricingType: "HOURLY",
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: true
    },
    durationLimits: {
      minDuration: 1,
      // 1 hour
      maxDuration: 168,
      // 1 week (24*7)
      defaultDuration: 4
      // 4 hours
    }
  },
  EQUIPMENT: {
    businessType: "EQUIPMENT",
    defaultPricingType: "DAILY",
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,
      // 1 day
      maxDuration: 30,
      // 30 days
      defaultDuration: 3
      // 3 days
    }
  },
  GENERAL: {
    businessType: "GENERAL",
    defaultPricingType: "FIXED",
    businessRules: {
      requireRentalDates: false,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,
      maxDuration: 1,
      defaultDuration: 1
    }
  }
};
var PRICING_TYPE_LABELS = {
  FIXED: "Fixed Price",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly"
};
var BUSINESS_TYPE_LABELS = {
  CLOTHING: "Clothing Rental",
  VEHICLE: "Vehicle Rental",
  EQUIPMENT: "Equipment Rental",
  GENERAL: "General Rental"
};
var PRICING_TYPE_DESCRIPTIONS = {
  FIXED: "One price per rental (e.g., equipment rental)",
  HOURLY: "Price per hour (e.g., vehicles, tools)",
  DAILY: "Price per day (e.g., construction equipment)",
  WEEKLY: "Price per week (e.g., long-term rentals)"
};
var BUSINESS_TYPE_DESCRIPTIONS = {
  CLOTHING: "Dresses, suits, costumes, accessories",
  VEHICLE: "Cars, bikes, motorcycles",
  EQUIPMENT: "Tools, machinery, equipment",
  GENERAL: "Various items and services"
};
function getDefaultPricingConfig(businessType) {
  return BUSINESS_TYPE_DEFAULTS[businessType];
}
function getPricingTypeLabel(pricingType) {
  return PRICING_TYPE_LABELS[pricingType];
}
function getBusinessTypeLabel(businessType) {
  return BUSINESS_TYPE_LABELS[businessType];
}
function getPricingTypeDescription(pricingType) {
  return PRICING_TYPE_DESCRIPTIONS[pricingType];
}
function getBusinessTypeDescription(businessType) {
  return BUSINESS_TYPE_DESCRIPTIONS[businessType];
}
function requiresRentalDates(pricingType) {
  return pricingType !== "FIXED";
}
function getDurationUnit(pricingType) {
  switch (pricingType) {
    case "HOURLY":
      return "hour";
    case "DAILY":
      return "day";
    case "WEEKLY":
      return "week";
    case "FIXED":
      return "rental";
    default:
      return "unit";
  }
}

// src/countries.ts
var COUNTRIES = [
  // North America
  { code: "US", name: "United States", flag: "\u{1F1FA}\u{1F1F8}", currency: "USD", phoneCode: "+1" },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}", currency: "CAD", phoneCode: "+1" },
  { code: "MX", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}", currency: "MXN", phoneCode: "+52" },
  // Europe
  { code: "GB", name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", currency: "GBP", phoneCode: "+44" },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}", currency: "EUR", phoneCode: "+49" },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}", currency: "EUR", phoneCode: "+33" },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}", currency: "EUR", phoneCode: "+39" },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}", currency: "EUR", phoneCode: "+34" },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}", currency: "EUR", phoneCode: "+31" },
  { code: "CH", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}", currency: "CHF", phoneCode: "+41" },
  { code: "SE", name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}", currency: "SEK", phoneCode: "+46" },
  { code: "NO", name: "Norway", flag: "\u{1F1F3}\u{1F1F4}", currency: "NOK", phoneCode: "+47" },
  { code: "DK", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}", currency: "DKK", phoneCode: "+45" },
  { code: "FI", name: "Finland", flag: "\u{1F1EB}\u{1F1EE}", currency: "EUR", phoneCode: "+358" },
  { code: "AT", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}", currency: "EUR", phoneCode: "+43" },
  { code: "BE", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}", currency: "EUR", phoneCode: "+32" },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}", currency: "EUR", phoneCode: "+353" },
  { code: "PT", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}", currency: "EUR", phoneCode: "+351" },
  // Asia Pacific
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}", currency: "AUD", phoneCode: "+61" },
  { code: "NZ", name: "New Zealand", flag: "\u{1F1F3}\u{1F1FF}", currency: "NZD", phoneCode: "+64" },
  { code: "JP", name: "Japan", flag: "\u{1F1EF}\u{1F1F5}", currency: "JPY", phoneCode: "+81" },
  { code: "KR", name: "South Korea", flag: "\u{1F1F0}\u{1F1F7}", currency: "KRW", phoneCode: "+82" },
  { code: "SG", name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}", currency: "SGD", phoneCode: "+65" },
  { code: "HK", name: "Hong Kong", flag: "\u{1F1ED}\u{1F1F0}", currency: "HKD", phoneCode: "+852" },
  { code: "TW", name: "Taiwan", flag: "\u{1F1F9}\u{1F1FC}", currency: "TWD", phoneCode: "+886" },
  { code: "MY", name: "Malaysia", flag: "\u{1F1F2}\u{1F1FE}", currency: "MYR", phoneCode: "+60" },
  { code: "TH", name: "Thailand", flag: "\u{1F1F9}\u{1F1ED}", currency: "THB", phoneCode: "+66" },
  { code: "ID", name: "Indonesia", flag: "\u{1F1EE}\u{1F1E9}", currency: "IDR", phoneCode: "+62" },
  { code: "PH", name: "Philippines", flag: "\u{1F1F5}\u{1F1ED}", currency: "PHP", phoneCode: "+63" },
  { code: "VN", name: "Vietnam", flag: "\u{1F1FB}\u{1F1F3}", currency: "VND", phoneCode: "+84" },
  { code: "IN", name: "India", flag: "\u{1F1EE}\u{1F1F3}", currency: "INR", phoneCode: "+91" },
  { code: "CN", name: "China", flag: "\u{1F1E8}\u{1F1F3}", currency: "CNY", phoneCode: "+86" },
  // Middle East & Africa
  { code: "AE", name: "United Arab Emirates", flag: "\u{1F1E6}\u{1F1EA}", currency: "AED", phoneCode: "+971" },
  { code: "SA", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}", currency: "SAR", phoneCode: "+966" },
  { code: "IL", name: "Israel", flag: "\u{1F1EE}\u{1F1F1}", currency: "ILS", phoneCode: "+972" },
  { code: "ZA", name: "South Africa", flag: "\u{1F1FF}\u{1F1E6}", currency: "ZAR", phoneCode: "+27" },
  { code: "EG", name: "Egypt", flag: "\u{1F1EA}\u{1F1EC}", currency: "EGP", phoneCode: "+20" },
  { code: "MA", name: "Morocco", flag: "\u{1F1F2}\u{1F1E6}", currency: "MAD", phoneCode: "+212" },
  { code: "NG", name: "Nigeria", flag: "\u{1F1F3}\u{1F1EC}", currency: "NGN", phoneCode: "+234" },
  { code: "KE", name: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", currency: "KES", phoneCode: "+254" },
  // South America
  { code: "BR", name: "Brazil", flag: "\u{1F1E7}\u{1F1F7}", currency: "BRL", phoneCode: "+55" },
  { code: "AR", name: "Argentina", flag: "\u{1F1E6}\u{1F1F7}", currency: "ARS", phoneCode: "+54" },
  { code: "CL", name: "Chile", flag: "\u{1F1E8}\u{1F1F1}", currency: "CLP", phoneCode: "+56" },
  { code: "CO", name: "Colombia", flag: "\u{1F1E8}\u{1F1F4}", currency: "COP", phoneCode: "+57" },
  { code: "PE", name: "Peru", flag: "\u{1F1F5}\u{1F1EA}", currency: "PEN", phoneCode: "+51" },
  { code: "UY", name: "Uruguay", flag: "\u{1F1FA}\u{1F1FE}", currency: "UYU", phoneCode: "+598" },
  // Central America & Caribbean
  { code: "CR", name: "Costa Rica", flag: "\u{1F1E8}\u{1F1F7}", currency: "CRC", phoneCode: "+506" },
  { code: "PA", name: "Panama", flag: "\u{1F1F5}\u{1F1E6}", currency: "PAB", phoneCode: "+507" },
  { code: "GT", name: "Guatemala", flag: "\u{1F1EC}\u{1F1F9}", currency: "GTQ", phoneCode: "+502" },
  { code: "CU", name: "Cuba", flag: "\u{1F1E8}\u{1F1FA}", currency: "CUP", phoneCode: "+53" },
  { code: "DO", name: "Dominican Republic", flag: "\u{1F1E9}\u{1F1F4}", currency: "DOP", phoneCode: "+1" },
  { code: "JM", name: "Jamaica", flag: "\u{1F1EF}\u{1F1F2}", currency: "JMD", phoneCode: "+1" }
];
function getCountryByCode(code) {
  return COUNTRIES.find((country) => country.code === code);
}
function getCountryByName(name) {
  return COUNTRIES.find((country) => country.name === name);
}
function getCountriesSorted() {
  return [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}
function getCountriesByRegion(region) {
  const regions = {
    "north-america": ["US", "CA", "MX"],
    "europe": ["GB", "DE", "FR", "IT", "ES", "NL", "CH", "SE", "NO", "DK", "FI", "AT", "BE", "IE", "PT"],
    "asia-pacific": ["AU", "NZ", "JP", "KR", "SG", "HK", "TW", "MY", "TH", "ID", "PH", "VN", "IN", "CN"],
    "middle-east-africa": ["AE", "SA", "IL", "ZA", "EG", "MA", "NG", "KE"],
    "south-america": ["BR", "AR", "CL", "CO", "PE", "UY"],
    "central-america-caribbean": ["CR", "PA", "GT", "CU", "DO", "JM"]
  };
  const countryCodes = regions[region] || [];
  return COUNTRIES.filter((country) => countryCodes.includes(country.code));
}
function formatCountryDisplay(country) {
  return `${country.flag} ${country.name}`;
}
function getDefaultCountry() {
  return COUNTRIES.find((country) => country.code === "VN") || COUNTRIES[0];
}

// src/index.ts
var CONSTANTS = {
  PAGINATION,
  SEARCH,
  VALIDATION,
  UI,
  BUSINESS,
  ENVIRONMENT,
  API,
  ORDERS: orders_exports,
  STATUS: status_exports
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  API,
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  BILLING_CYCLES,
  BILLING_INTERVAL,
  BUSINESS,
  BUSINESS_TYPE_DEFAULTS,
  BUSINESS_TYPE_DESCRIPTIONS,
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_OPTIONS,
  CONSTANTS,
  COUNTRIES,
  ENTITY_STATUS,
  ENVIRONMENT,
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE,
  ORDER_TYPES,
  ORDER_TYPE_COLORS,
  ORDER_TYPE_ICONS,
  ORDER_TYPE_LABELS,
  PAGINATION,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PRICING_TYPE_DESCRIPTIONS,
  PRICING_TYPE_LABELS,
  PRICING_TYPE_OPTIONS,
  PRODUCT_AVAILABILITY_STATUS,
  RENEWAL_DURATIONS,
  SEARCH,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  TRIAL_CONFIG,
  UI,
  USER_ROLE,
  VALIDATION,
  formatCountryDisplay,
  getActivePlans,
  getAllPlans,
  getBusinessTypeDescription,
  getBusinessTypeLabel,
  getCountriesByRegion,
  getCountriesSorted,
  getCountryByCode,
  getCountryByName,
  getDefaultCountry,
  getDefaultPricingConfig,
  getDefaultTrialDays,
  getDurationUnit,
  getPlan,
  getPlanComparison,
  getPlanLimits,
  getPlanPlatform,
  getPricingTypeDescription,
  getPricingTypeLabel,
  getStatusColor,
  getStatusLabel,
  getStatusOptions,
  getTrialNotificationDays,
  hasMobileAccess,
  hasProductPublicCheck,
  hasWebAccess,
  isEntityActive,
  isOrderCompleted,
  isPaymentFailed,
  isPaymentPending,
  isPaymentSuccessful,
  isSubscriptionActive,
  isUnlimitedPlan,
  requiresRentalDates,
  validatePlanConfig
});
//# sourceMappingURL=index.js.map