/**
 * Business Logic Constants
 * 
 * These constants define business rules, defaults, and operational values
 */

export const BUSINESS = {
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
  DEFAULT_CUSTOMER_TYPE: 'WALK_IN',
  DEFAULT_CUSTOMER_STATUS: 'ACTIVE',
  
  // Product Defaults
  DEFAULT_PRODUCT_STATUS: 'ACTIVE',
  DEFAULT_PRODUCT_CATEGORY: 'UNCATEGORIZED',
  
  // Rental Defaults
  DEFAULT_RENTAL_PERIOD: 1, // days
  DEFAULT_LATE_FEE_RATE: 0.1, // 10% per day
  DEFAULT_DAMAGE_FEE: 0,
  
  // Payment Defaults
  DEFAULT_PAYMENT_METHOD: 'CASH',
  DEFAULT_PAYMENT_STATUS: 'PENDING',
  
  // Outlet Defaults
  DEFAULT_OUTLET_STATUS: 'ACTIVE',
  DEFAULT_OUTLET_TYPE: 'RETAIL',
  
  // User Defaults
  DEFAULT_USER_STATUS: 'ACTIVE',
  DEFAULT_USER_ROLE: 'OUTLET_STAFF',
  
  // Notification Defaults
  DEFAULT_NOTIFICATION_TYPE: 'INFO',
  DEFAULT_NOTIFICATION_PRIORITY: 'NORMAL',
  
  // Rental Shop Specific
  DEFAULT_PICKUP_TIME: '09:00',
  DEFAULT_RETURN_TIME: '17:00',
  BUSINESS_HOURS: {
    OPEN: '08:00',
    CLOSE: '18:00',
    BREAK_START: '12:00',
    BREAK_END: '13:00',
  },
  
  // Inventory Management
  LOW_STOCK_WARNING: 5,
  CRITICAL_STOCK_WARNING: 2,
  AUTO_REORDER_THRESHOLD: 3,
  
  // Customer Management
  MAX_CUSTOMER_ORDERS: 100,
  CUSTOMER_CREDIT_LIMIT: 1000,
  LOYALTY_POINTS_RATE: 0.01, // 1 point per $1 spent
  
  // Order Processing
  ORDER_PREPARATION_TIME: 30, // minutes
  PICKUP_GRACE_PERIOD: 15, // minutes
  RETURN_GRACE_PERIOD: 30, // minutes
  
  // Financial Rules
  MIN_DEPOSIT_PERCENTAGE: 0.1, // 10% of order value
  MAX_DEPOSIT_PERCENTAGE: 0.5, // 50% of order value
  LATE_FEE_CAP: 100, // Maximum late fee per order
  DAMAGE_FEE_CAP: 500, // Maximum damage fee per item
} as const;

// Type for business values
export type BusinessValue = typeof BUSINESS[keyof typeof BUSINESS];
