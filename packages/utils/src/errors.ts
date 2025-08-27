import { z } from 'zod';

// ============================================================================
// ERROR CODES - Centralized definition for all error types
// ============================================================================

/**
 * User-related error codes
 */
export const USER_ERROR_CODES = {
  // Duplicate errors
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_PHONE: 'DUPLICATE_PHONE',
  DUPLICATE_USER: 'DUPLICATE_USER',
  
  // Validation errors
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT: 'INVALID_PHONE_FORMAT',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_USER_DATA: 'INVALID_USER_DATA',
  
  // Authentication errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Business logic errors
  USER_ALREADY_ACTIVE: 'USER_ALREADY_ACTIVE',
  USER_ALREADY_INACTIVE: 'USER_ALREADY_INACTIVE',
  CANNOT_DEACTIVATE_SELF: 'CANNOT_DEACTIVATE_SELF',
  CANNOT_CHANGE_OWN_ROLE: 'CANNOT_CHANGE_OWN_ROLE',
} as const;

/**
 * Customer-related error codes
 */
export const CUSTOMER_ERROR_CODES = {
  // Duplicate errors
  DUPLICATE_CUSTOMER_EMAIL: 'DUPLICATE_CUSTOMER_EMAIL',
  DUPLICATE_CUSTOMER_PHONE: 'DUPLICATE_CUSTOMER_PHONE',
  
  // Validation errors
  INVALID_CUSTOMER_DATA: 'INVALID_CUSTOMER_DATA',
  INVALID_CUSTOMER_EMAIL: 'INVALID_CUSTOMER_EMAIL',
  INVALID_CUSTOMER_PHONE: 'INVALID_CUSTOMER_PHONE',
  
  // Business logic errors
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_HAS_ACTIVE_ORDERS: 'CUSTOMER_HAS_ACTIVE_ORDERS',
} as const;

/**
 * Product-related error codes
 */
export const PRODUCT_ERROR_CODES = {
  // Duplicate errors
  DUPLICATE_PRODUCT_BARCODE: 'DUPLICATE_PRODUCT_BARCODE',
  DUPLICATE_PRODUCT_NAME: 'DUPLICATE_PRODUCT_NAME',
  
  // Validation errors
  INVALID_PRODUCT_DATA: 'INVALID_PRODUCT_DATA',
  INVALID_PRODUCT_PRICE: 'INVALID_PRODUCT_PRICE',
  INVALID_PRODUCT_STOCK: 'INVALID_PRODUCT_STOCK',
  
  // Business logic errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PRODUCT_IN_USE: 'PRODUCT_IN_USE',
} as const;

/**
 * Order-related error codes
 */
export const ORDER_ERROR_CODES = {
  // Validation errors
  INVALID_ORDER_DATA: 'INVALID_ORDER_DATA',
  INVALID_ORDER_ITEMS: 'INVALID_ORDER_ITEMS',
  INVALID_ORDER_AMOUNT: 'INVALID_ORDER_AMOUNT',
  
  // Business logic errors
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_PROCESSED: 'ORDER_ALREADY_PROCESSED',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  INSUFFICIENT_PRODUCT_STOCK: 'INSUFFICIENT_PRODUCT_STOCK',
} as const;

/**
 * Payment-related error codes
 */
export const PAYMENT_ERROR_CODES = {
  // Validation errors
  INVALID_PAYMENT_DATA: 'INVALID_PAYMENT_DATA',
  INVALID_PAYMENT_AMOUNT: 'INVALID_PAYMENT_AMOUNT',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  
  // Business logic errors
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
} as const;

/**
 * Database-related error codes
 */
export const DATABASE_ERROR_CODES = {
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  
  // Query errors
  QUERY_FAILED: 'QUERY_FAILED',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  
  // Constraint errors
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
  CHECK_CONSTRAINT_VIOLATION: 'CHECK_CONSTRAINT_VIOLATION',
  
  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_ROLLBACK: 'TRANSACTION_ROLLBACK',
} as const;

/**
 * API-related error codes
 */
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Request errors
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
} as const;

/**
 * All error codes combined
 */
export const ERROR_CODES = {
  ...USER_ERROR_CODES,
  ...CUSTOMER_ERROR_CODES,
  ...PRODUCT_ERROR_CODES,
  ...ORDER_ERROR_CODES,
  ...PAYMENT_ERROR_CODES,
  ...DATABASE_ERROR_CODES,
  ...API_ERROR_CODES,
} as const;

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface AppErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: string;
  timestamp?: string;
}

export interface AppSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// ApiResponse moved to common.ts to avoid conflicts

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  toResponse(): AppErrorResponse {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string, code: ErrorCode, details?: string) {
    super(message, code, 409, details);
    this.name = 'DuplicateError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode, details?: string) {
    super(message, code, 404, details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: string) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: string) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

/**
 * Create user-related errors
 */
export const createUserError = {
  duplicateEmail: (email: string, merchantId?: number) => 
    new DuplicateError(
      `User with email '${email}' already exists${merchantId ? ' in this merchant organization' : ''}`,
      USER_ERROR_CODES.DUPLICATE_EMAIL,
      `Email: ${email}, Merchant: ${merchantId || 'N/A'}`
    ),
    
  duplicatePhone: (phone: string, merchantId?: number) => 
    new DuplicateError(
      `User with phone '${phone}' already exists${merchantId ? ' in this merchant organization' : ''}`,
      USER_ERROR_CODES.DUPLICATE_PHONE,
      `Phone: ${phone}, Merchant: ${merchantId || 'N/A'}`
    ),
    
  notFound: (userId: number) => 
    new NotFoundError(
      `User with ID '${userId}' not found`,
      USER_ERROR_CODES.USER_NOT_FOUND,
      `User ID: ${userId}`
    ),
    
  invalidData: (details: string) => 
    new ValidationError(
      'Invalid user data provided',
      details
    ),
};

/**
 * Create customer-related errors
 */
export const createCustomerError = {
  duplicateEmail: (email: string, merchantId?: number) => 
    new DuplicateError(
      `Customer with email '${email}' already exists${merchantId ? ' in this merchant organization' : ''}`,
      CUSTOMER_ERROR_CODES.DUPLICATE_CUSTOMER_EMAIL,
      `Email: ${email}, Merchant: ${merchantId || 'N/A'}`
    ),
    
  duplicatePhone: (phone: string, merchantId?: number) => 
    new DuplicateError(
      `Customer with phone '${phone}' already exists${merchantId ? ' in this merchant organization' : ''}`,
      CUSTOMER_ERROR_CODES.DUPLICATE_CUSTOMER_PHONE,
      `Phone: ${phone}, Merchant: ${merchantId || 'N/A'}`
    ),
    
  notFound: (customerId: number) => 
    new NotFoundError(
      `Customer with ID '${customerId}' not found`,
      CUSTOMER_ERROR_CODES.CUSTOMER_NOT_FOUND,
      `Customer ID: ${customerId}`
    ),
};

/**
 * Create product-related errors
 */
export const createProductError = {
  duplicateBarcode: (barcode: string) => 
    new DuplicateError(
      `Product with barcode '${barcode}' already exists`,
      PRODUCT_ERROR_CODES.DUPLICATE_PRODUCT_BARCODE,
      `Barcode: ${barcode}`
    ),
    
  notFound: (productId: number) => 
    new NotFoundError(
      `Product with ID '${productId}' not found`,
      PRODUCT_ERROR_CODES.PRODUCT_NOT_FOUND,
      `Product ID: ${productId}`
    ),
    
  insufficientStock: (productId: number, requested: number, available: number) => 
    new AppError(
      `Insufficient stock for product. Requested: ${requested}, Available: ${available}`,
      PRODUCT_ERROR_CODES.INSUFFICIENT_STOCK,
      400,
      `Product ID: ${productId}, Requested: ${requested}, Available: ${available}`
    ),
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Convert any error to a standardized AppErrorResponse
 */
export const normalizeError = (error: unknown): AppErrorResponse => {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'INTERNAL_SERVER_ERROR',
      details: error.stack,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    details: String(error),
    timestamp: new Date().toISOString(),
  };
};

// handleApiError moved to common.ts to avoid conflicts

// ============================================================================
// HTTP STATUS CODE MAPPING
// ============================================================================

export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // User errors
  [USER_ERROR_CODES.DUPLICATE_EMAIL]: 409,
  [USER_ERROR_CODES.DUPLICATE_PHONE]: 409,
  [USER_ERROR_CODES.DUPLICATE_USER]: 409,
  [USER_ERROR_CODES.INVALID_EMAIL_FORMAT]: 400,
  [USER_ERROR_CODES.INVALID_PHONE_FORMAT]: 400,
  [USER_ERROR_CODES.INVALID_PASSWORD]: 400,
  [USER_ERROR_CODES.INVALID_ROLE]: 400,
  [USER_ERROR_CODES.INVALID_USER_DATA]: 400,
  [USER_ERROR_CODES.USER_NOT_FOUND]: 404,
  [USER_ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [USER_ERROR_CODES.ACCOUNT_DEACTIVATED]: 403,
  [USER_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  [USER_ERROR_CODES.USER_ALREADY_ACTIVE]: 400,
  [USER_ERROR_CODES.USER_ALREADY_INACTIVE]: 400,
  [USER_ERROR_CODES.CANNOT_DEACTIVATE_SELF]: 400,
  [USER_ERROR_CODES.CANNOT_CHANGE_OWN_ROLE]: 400,
  
  // Customer errors
  [CUSTOMER_ERROR_CODES.DUPLICATE_CUSTOMER_EMAIL]: 409,
  [CUSTOMER_ERROR_CODES.DUPLICATE_CUSTOMER_PHONE]: 409,
  [CUSTOMER_ERROR_CODES.INVALID_CUSTOMER_DATA]: 400,
  [CUSTOMER_ERROR_CODES.INVALID_CUSTOMER_EMAIL]: 400,
  [CUSTOMER_ERROR_CODES.INVALID_CUSTOMER_PHONE]: 400,
  [CUSTOMER_ERROR_CODES.CUSTOMER_NOT_FOUND]: 404,
  [CUSTOMER_ERROR_CODES.CUSTOMER_HAS_ACTIVE_ORDERS]: 400,
  
  // Product errors
  [PRODUCT_ERROR_CODES.DUPLICATE_PRODUCT_BARCODE]: 409,
  [PRODUCT_ERROR_CODES.DUPLICATE_PRODUCT_NAME]: 409,
  [PRODUCT_ERROR_CODES.INVALID_PRODUCT_DATA]: 400,
  [PRODUCT_ERROR_CODES.INVALID_PRODUCT_PRICE]: 400,
  [PRODUCT_ERROR_CODES.INVALID_PRODUCT_STOCK]: 400,
  [PRODUCT_ERROR_CODES.PRODUCT_NOT_FOUND]: 404,
  [PRODUCT_ERROR_CODES.INSUFFICIENT_STOCK]: 400,
  [PRODUCT_ERROR_CODES.PRODUCT_IN_USE]: 400,
  
  // Order errors
  [ORDER_ERROR_CODES.INVALID_ORDER_DATA]: 400,
  [ORDER_ERROR_CODES.INVALID_ORDER_ITEMS]: 400,
  [ORDER_ERROR_CODES.INVALID_ORDER_AMOUNT]: 400,
  [ORDER_ERROR_CODES.ORDER_NOT_FOUND]: 404,
  [ORDER_ERROR_CODES.ORDER_ALREADY_PROCESSED]: 400,
  [ORDER_ERROR_CODES.ORDER_CANNOT_BE_CANCELLED]: 400,
  [ORDER_ERROR_CODES.INSUFFICIENT_PRODUCT_STOCK]: 400,
  
  // Payment errors
  [PAYMENT_ERROR_CODES.INVALID_PAYMENT_DATA]: 400,
  [PAYMENT_ERROR_CODES.INVALID_PAYMENT_AMOUNT]: 400,
  [PAYMENT_ERROR_CODES.INVALID_PAYMENT_METHOD]: 400,
  [PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND]: 404,
  [PAYMENT_ERROR_CODES.PAYMENT_ALREADY_PROCESSED]: 400,
  [PAYMENT_ERROR_CODES.PAYMENT_AMOUNT_MISMATCH]: 400,
  
  // Database errors
  [DATABASE_ERROR_CODES.CONNECTION_FAILED]: 503,
  [DATABASE_ERROR_CODES.CONNECTION_TIMEOUT]: 504,
  [DATABASE_ERROR_CODES.QUERY_FAILED]: 500,
  [DATABASE_ERROR_CODES.QUERY_TIMEOUT]: 504,
  [DATABASE_ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION]: 409,
  [DATABASE_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_VIOLATION]: 400,
  [DATABASE_ERROR_CODES.CHECK_CONSTRAINT_VIOLATION]: 400,
  [DATABASE_ERROR_CODES.TRANSACTION_FAILED]: 500,
  [DATABASE_ERROR_CODES.TRANSACTION_ROLLBACK]: 500,
  
  // API errors
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.FORBIDDEN]: 403,
  [API_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [API_ERROR_CODES.TOKEN_INVALID]: 401,
  [API_ERROR_CODES.BAD_REQUEST]: 400,
  [API_ERROR_CODES.VALIDATION_ERROR]: 400,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.GATEWAY_TIMEOUT]: 504,
};

/**
 * Get HTTP status code for an error code
 */
export const getErrorStatusCode = (code: ErrorCode): number => {
  return ERROR_STATUS_CODES[code] || 500;
}; 