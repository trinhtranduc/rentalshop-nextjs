import { z } from 'zod';
import { clearAuthData } from './common';
import CONSTANTS from '@rentalshop/constants';
import type { ApiResponse as ResponseBuilderApiResponse } from '../api/response-builder';
import { ResponseBuilder } from '../api/response-builder';

const API = CONSTANTS.API;

// ============================================================================
// UNIFIED ERROR HANDLING SYSTEM - DRY PRINCIPLE
// ============================================================================

/**
 * Core Error Codes - Simplified and Unified
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  NOT_FOUND = 'NOT_FOUND',
  
  // Business Logic Errors
  PLAN_LIMIT_EXCEEDED = 'PLAN_LIMIT_EXCEEDED',
  CANNOT_DELETE_ADDON_LIMIT_EXCEEDED = 'CANNOT_DELETE_ADDON_LIMIT_EXCEEDED',
  CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET = 'CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET',
  CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT = 'CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT',
  CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET = 'CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET',
  CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT = 'CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_PAUSED = 'SUBSCRIPTION_PAUSED',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',
  ORDER_ALREADY_EXISTS = 'ORDER_ALREADY_EXISTS',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',
  
  // Resource Specific Errors
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  PHONE_EXISTS = 'PHONE_EXISTS',
  BUSINESS_NAME_EXISTS = 'BUSINESS_NAME_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MERCHANT_NOT_FOUND = 'MERCHANT_NOT_FOUND',
  OUTLET_NOT_FOUND = 'OUTLET_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  PLAN_NOT_FOUND = 'PLAN_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  AUDIT_LOG_NOT_FOUND = 'AUDIT_LOG_NOT_FOUND',
  BILLING_CYCLE_NOT_FOUND = 'BILLING_CYCLE_NOT_FOUND',
  PLAN_VARIANT_NOT_FOUND = 'PLAN_VARIANT_NOT_FOUND',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // File Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED'
}

// ============================================================================
// RE-EXPORT ApiResponse from response-builder (SINGLE SOURCE OF TRUTH)
// ============================================================================

export type { ApiResponse } from '../api/response-builder';

// Simplified type guards compatible with ResponseBuilder's ApiResponse
export function isSuccessResponse<T>(response: ResponseBuilderApiResponse<T>): response is ResponseBuilderApiResponse<T> & { success: true } {
  return response.success === true;
}

export function isErrorResponse(response: ResponseBuilderApiResponse<any>): response is ResponseBuilderApiResponse<any> & { success: false } {
  return response.success === false;
}

// ============================================================================
// ERROR MESSAGE MAPPINGS - DRY and Consistent
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token',
  [ErrorCode.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  
  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: 'Input validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  
  // Database Errors
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.DUPLICATE_ENTRY]: 'Record already exists',
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: 'Invalid reference',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  
  // Business Logic Errors
  [ErrorCode.PLAN_LIMIT_EXCEEDED]: 'Plan limit exceeded',
  [ErrorCode.CANNOT_DELETE_ADDON_LIMIT_EXCEEDED]: 'Cannot delete addon: Current usage exceeds limits after deletion',
  [ErrorCode.CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET]: 'Cannot create order for other outlet. You can only create orders for your assigned outlet.',
  [ErrorCode.CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT]: 'Cannot create order for outlet from different merchant.',
  [ErrorCode.CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET]: 'Cannot update order from other outlet. You can only update orders from your assigned outlet.',
  [ErrorCode.CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT]: 'Cannot update order from outlet of different merchant.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
  [ErrorCode.ACCOUNT_DEACTIVATED]: 'Account is deactivated',
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Subscription has expired',
  [ErrorCode.SUBSCRIPTION_CANCELLED]: 'Subscription has been cancelled',
  [ErrorCode.SUBSCRIPTION_PAUSED]: 'Subscription is paused',
  [ErrorCode.TRIAL_EXPIRED]: 'Trial period has expired',
  [ErrorCode.ORDER_ALREADY_EXISTS]: 'Order already exists',
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: 'Product is out of stock',
  [ErrorCode.INVALID_ORDER_STATUS]: 'Invalid order status',
  [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed',
  [ErrorCode.INVALID_PAYMENT_METHOD]: 'Invalid payment method',
  
  // Resource Specific Errors
  [ErrorCode.EMAIL_EXISTS]: 'Email address is already registered',
  [ErrorCode.PHONE_EXISTS]: 'Phone number is already registered',
  [ErrorCode.BUSINESS_NAME_EXISTS]: 'Business name already exists',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.MERCHANT_NOT_FOUND]: 'Merchant not found',
  [ErrorCode.OUTLET_NOT_FOUND]: 'Outlet not found',
  [ErrorCode.PRODUCT_NOT_FOUND]: 'Product not found',
  [ErrorCode.ORDER_NOT_FOUND]: 'Order not found',
  [ErrorCode.CUSTOMER_NOT_FOUND]: 'Customer not found',
  [ErrorCode.CATEGORY_NOT_FOUND]: 'Category not found',
  [ErrorCode.PLAN_NOT_FOUND]: 'Plan not found',
  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found',
  [ErrorCode.PAYMENT_NOT_FOUND]: 'Payment not found',
  [ErrorCode.AUDIT_LOG_NOT_FOUND]: 'Audit log not found',
  [ErrorCode.BILLING_CYCLE_NOT_FOUND]: 'Billing cycle not found',
  [ErrorCode.PLAN_VARIANT_NOT_FOUND]: 'Plan variant not found',
  
  // System Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCode.NETWORK_ERROR]: 'Network error occurred',
  
  // File Upload Errors
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds limit',
  [ErrorCode.INVALID_FILE_TYPE]: 'Invalid file type',
  [ErrorCode.UPLOAD_FAILED]: 'File upload failed'
};

// ============================================================================
// HTTP STATUS CODE MAPPINGS - DRY and Consistent
// ============================================================================

export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // Authentication & Authorization (4xx)
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  
  // Validation Errors (4xx)
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  
  // Database Errors (4xx/5xx)
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  
  // Business Logic Errors (4xx)
  [ErrorCode.PLAN_LIMIT_EXCEEDED]: 403,
  [ErrorCode.CANNOT_DELETE_ADDON_LIMIT_EXCEEDED]: 422,
  [ErrorCode.CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET]: 403,
  [ErrorCode.CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT]: 403,
  [ErrorCode.CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET]: 403,
  [ErrorCode.CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.ACCOUNT_DEACTIVATED]: 403,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 402,
  [ErrorCode.SUBSCRIPTION_CANCELLED]: 402,
  [ErrorCode.SUBSCRIPTION_PAUSED]: 402,
  [ErrorCode.TRIAL_EXPIRED]: 402,
  [ErrorCode.ORDER_ALREADY_EXISTS]: 409,
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: 422,
  [ErrorCode.INVALID_ORDER_STATUS]: 422,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.INVALID_PAYMENT_METHOD]: 400,
  
  // Resource Specific Errors (4xx)
  [ErrorCode.EMAIL_EXISTS]: 409,
  [ErrorCode.PHONE_EXISTS]: 409,
  [ErrorCode.BUSINESS_NAME_EXISTS]: 409,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.MERCHANT_NOT_FOUND]: 404,
  [ErrorCode.OUTLET_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.CUSTOMER_NOT_FOUND]: 404,
  [ErrorCode.CATEGORY_NOT_FOUND]: 404,
  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 404,
  [ErrorCode.PAYMENT_NOT_FOUND]: 404,
  [ErrorCode.AUDIT_LOG_NOT_FOUND]: 404,
  [ErrorCode.BILLING_CYCLE_NOT_FOUND]: 404,
  [ErrorCode.PLAN_VARIANT_NOT_FOUND]: 404,
  
  // System Errors (5xx)
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.NETWORK_ERROR]: 503,
  
  // File Upload Errors (4xx)
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.UPLOAD_FAILED]: 500
};

// ============================================================================
// ERROR CLASSES - Unified and Simplified
// ============================================================================

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: string;
  public readonly field?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: string,
    field?: string
  ) {
    const errorMessage = message || ERROR_MESSAGES[code];
    super(errorMessage);
    
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code];
    this.details = details;
    this.field = field;
  }

  toJSON() {
    return {
      success: false,
      code: this.code,
      message: this.message,
      error: this.details || this.message
    };
  }
}

// ============================================================================
// CONVENIENCE ERROR CLASSES
// ============================================================================

export class ValidationError extends ApiError {
  constructor(message: string, details?: string, field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, details, field);
    this.name = 'ValidationError';
  }
}

export class DuplicateError extends ApiError {
  constructor(code: ErrorCode, message?: string, details?: string, field?: string) {
    super(code, message, details, field);
    this.name = 'DuplicateError';
  }
}

export class NotFoundError extends ApiError {
  constructor(code: ErrorCode, message?: string, details?: string) {
    super(code, message, details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message?: string, details?: string) {
    super(ErrorCode.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message?: string, details?: string) {
    super(ErrorCode.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

export class PlanLimitError extends ApiError {
  constructor(message?: string, details?: string) {
    super(ErrorCode.PLAN_LIMIT_EXCEEDED, message, details);
    this.name = 'PlanLimitError';
  }
}

// ============================================================================
// ERROR RESPONSE BUILDERS - DRY and Consistent
// ============================================================================

// createErrorResponse and createSuccessResponse removed
// Use ResponseBuilder from @rentalshop/utils instead:
// - ResponseBuilder.error(code, message)
// - ResponseBuilder.success(code, data)

// ============================================================================
// DATABASE ERROR HANDLERS - Unified and Comprehensive
// ============================================================================

export function handlePrismaError(error: any): ApiError {
  console.error('🔍 Prisma Error Details:', {
    code: error.code,
    message: error.message,
    meta: error.meta
  });

  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target[0] : target;
      
      // ⚠️ CRITICAL: Unique constraint on ID field indicates race condition or sequence issue
      if (field === 'id' || (Array.isArray(target) && target.includes('id'))) {
        console.error('🚨 CRITICAL: Unique constraint on ID field - Possible race condition or database sequence issue');
        console.error('🔍 Error details:', {
          modelName: error.meta?.modelName,
          target: error.meta?.target,
          message: 'This usually indicates a race condition in ID generation or database sequence out of sync'
        });
        return new ApiError(
          ErrorCode.DATABASE_ERROR,
          'Database ID generation error. Please try again.',
          'Lỗi tạo ID. Vui lòng thử lại.'
        );
      }
      
      if (field?.includes('email')) {
        return new ApiError(ErrorCode.EMAIL_EXISTS);
      }
      
      if (field?.includes('phone')) {
        return new ApiError(ErrorCode.PHONE_EXISTS);
      }
      
      if (field?.includes('tenantKey')) {
        return new ApiError(ErrorCode.BUSINESS_NAME_EXISTS);
      }
      
      return new ApiError(ErrorCode.DUPLICATE_ENTRY);
    }
    
    case 'P2003': {
      // Foreign key constraint violation
      return new ApiError(ErrorCode.FOREIGN_KEY_CONSTRAINT);
    }
    
    case 'P2025': {
      // Record not found
      return new ApiError(ErrorCode.NOT_FOUND);
    }
    
    case 'P2014': {
      // Relation violation
      return new ApiError(ErrorCode.BUSINESS_RULE_VIOLATION);
    }
    
    default: {
      return new ApiError(ErrorCode.DATABASE_ERROR);
    }
  }
}

// ============================================================================
// VALIDATION ERROR HANDLERS
// ============================================================================

export function handleValidationError(error: any): ApiError {
  if (error.name === 'ZodError') {
    const firstError = error.errors[0];
    const field = firstError.path.join('.');
    
    return new ApiError(
      ErrorCode.VALIDATION_ERROR,
      firstError.message,
      `Field: ${field}`,
      field
    );
  }
  
  return new ApiError(
    ErrorCode.INVALID_INPUT,
    error.message || 'Validation failed'
  );
}

// ============================================================================
// BUSINESS LOGIC ERROR HANDLERS
// ============================================================================

export function handleBusinessError(error: any): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  // ✅ PRIORITY 1: Check if error has code field (from API response object)
  // Format: { success: false, code: "PLAN_LIMIT_EXCEEDED", ... }
  if (error?.code && typeof error.code === 'string') {
    console.log('🔍 handleBusinessError: Found code field in error:', error.code);
    // Map code to ErrorCode enum if needed, or use directly
    const errorCode = error.code as ErrorCode;
    return new ApiError(errorCode, error.message, error.error);
  }
  
  if (error.message?.includes('not found')) {
    if (error.message.includes('Merchant')) {
      return new ApiError(ErrorCode.MERCHANT_NOT_FOUND);
    }
    if (error.message.includes('Outlet')) {
      return new ApiError(ErrorCode.OUTLET_NOT_FOUND);
    }
    if (error.message.includes('User')) {
      return new ApiError(ErrorCode.USER_NOT_FOUND);
    }
    if (error.message.includes('Product')) {
      return new ApiError(ErrorCode.PRODUCT_NOT_FOUND);
    }
    if (error.message.includes('Order')) {
      return new ApiError(ErrorCode.ORDER_NOT_FOUND);
    }
    if (error.message.includes('Customer')) {
      return new ApiError(ErrorCode.CUSTOMER_NOT_FOUND);
    }
    if (error.message.includes('Category')) {
      return new ApiError(ErrorCode.CATEGORY_NOT_FOUND);
    }
    if (error.message.includes('Plan')) {
      return new ApiError(ErrorCode.PLAN_NOT_FOUND);
    }
    if (error.message.includes('Subscription')) {
      return new ApiError(ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    if (error.message.includes('Payment')) {
      return new ApiError(ErrorCode.PAYMENT_NOT_FOUND);
    }
    if (error.message.includes('Audit log')) {
      return new ApiError(ErrorCode.AUDIT_LOG_NOT_FOUND);
    }
    if (error.message.includes('Billing cycle')) {
      return new ApiError(ErrorCode.BILLING_CYCLE_NOT_FOUND);
    }
    if (error.message.includes('Plan variant')) {
      return new ApiError(ErrorCode.PLAN_VARIANT_NOT_FOUND);
    }
  }
  
  if (error.message?.includes('already registered')) {
    if (error.message.includes('Email')) {
      return new ApiError(ErrorCode.EMAIL_EXISTS);
    }
    if (error.message.includes('Phone')) {
      return new ApiError(ErrorCode.PHONE_EXISTS);
    }
  }
  
  if (error.message?.includes('already exists')) {
    if (error.message.includes('order')) {
      return new ApiError(ErrorCode.ORDER_ALREADY_EXISTS);
    }
  }
  
  if (error.message?.includes('Plan limit')) {
    return new ApiError(ErrorCode.PLAN_LIMIT_EXCEEDED);
  }
  
  if (error.message?.includes('permission')) {
    return new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS);
  }
  
  if (error.message?.includes('deactivated')) {
    return new ApiError(ErrorCode.ACCOUNT_DEACTIVATED);
  }
  
  if (error.message?.includes('subscription')) {
    if (error.message.includes('expired')) {
      return new ApiError(ErrorCode.SUBSCRIPTION_EXPIRED);
    }
    if (error.message.includes('cancelled')) {
      return new ApiError(ErrorCode.SUBSCRIPTION_CANCELLED);
    }
    if (error.message.includes('paused')) {
      return new ApiError(ErrorCode.SUBSCRIPTION_PAUSED);
    }
  }
  
  if (error.message?.includes('trial')) {
    if (error.message.includes('expired')) {
      return new ApiError(ErrorCode.TRIAL_EXPIRED);
    }
  }
  
  if (error.message?.includes('out of stock')) {
    return new ApiError(ErrorCode.PRODUCT_OUT_OF_STOCK);
  }
  
  if (error.message?.includes('payment')) {
    if (error.message.includes('failed')) {
      return new ApiError(ErrorCode.PAYMENT_FAILED);
    }
    if (error.message.includes('invalid')) {
      return new ApiError(ErrorCode.INVALID_PAYMENT_METHOD);
    }
  }
  
  if (error.message?.includes('invalid order status')) {
    return new ApiError(ErrorCode.INVALID_ORDER_STATUS);
  }
  
  return new ApiError(ErrorCode.BUSINESS_RULE_VIOLATION);
}

// ============================================================================
// GLOBAL ERROR HANDLER - DRY and Comprehensive
// ============================================================================

export function handleApiError(error: any): {
  response: ResponseBuilderApiResponse;
  statusCode: number;
} {
  console.error('🚨 API Error:', error);
  
  let apiError: ApiError;
  
  // Handle different error types
  if (error instanceof ApiError) {
    apiError = error;
  } else if (
    error.name === 'PrismaClientInitializationError' ||
    error.message?.includes("Can't reach database server") ||
    error.message?.includes('database server is running') ||
    error.message?.includes('Can\'t reach database') ||
    error.code === 'P1001' || // Prisma error code for connection issues
    error.code === 'P1017'    // Prisma error code for server closed connection
  ) {
    // Database connection errors - Enhanced logging
    console.error('❌ DATABASE CONNECTION ERROR DETECTED:', {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL?.substring(0, 30) || 'NOT SET',
    });
    
    apiError = new ApiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Database connection failed. Please check your database server and try again.',
      'Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối.'
    );
  } else if (
    error.message?.includes('timeout') ||
    error.message?.includes('TIMEOUT') ||
    error.code === 'ETIMEDOUT'
  ) {
    // Timeout errors
    apiError = new ApiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Request timeout. Please try again.',
      'Yêu cầu quá thời gian chờ. Vui lòng thử lại.'
    );
  } else if (
    error.status === 502 ||
    error.code === 502 ||
    error.message?.includes('502') ||
    error.message?.includes('Bad Gateway') ||
    error.message?.includes('Application failed to respond')
  ) {
    // Gateway/Bad Gateway errors (502)
    apiError = new ApiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Service temporarily unavailable. Please try again later.',
      'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.'
    );
  } else if (error.code && error.code.startsWith('P')) {
    // Prisma errors
    apiError = handlePrismaError(error);
  } else if (error.name === 'ZodError') {
    // Validation errors
    apiError = handleValidationError(error);
  } else {
    // Business logic or other errors
    apiError = handleBusinessError(error);
  }
  
  // Convert code to string to match ResponseBuilder.error format
  const errorCode = String(apiError.code);
  
  // Use ResponseBuilder to get default message from translation system
  // This ensures consistent format and allows frontend to translate
  const response = ResponseBuilder.error(errorCode);
  
  // If there are details (like dynamic values), include them in error field for debugging
  // But keep message as translated version from ResponseBuilder
  if (apiError.details && typeof apiError.details === 'string') {
    response.error = apiError.details;
  }

  return {
    response,
    statusCode: apiError.statusCode
  };
}

// ============================================================================
// ERROR TRANSLATION HELPER
// ============================================================================

/**
 * Get translation key for error code
 * This allows frontend to translate error messages client-side
 * 
 * @param errorCode - The error code from API response
 * @returns Translation key (same as error code for simplicity)
 */
export function getErrorTranslationKey(errorCode: string | ErrorCode): string {
  return errorCode;
}

/**
 * Check if error code exists in our error system
 * @param code - The error code to check
 * @returns true if error code is valid
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return Object.values(ErrorCode).includes(code as ErrorCode);
}

// ============================================================================
// ERROR ANALYSIS & HANDLING (from error-handling.ts)
// ============================================================================

/**
 * Error types for better user experience
 */
export type ErrorType = 'auth' | 'permission' | 'subscription' | 'network' | 'validation' | 'unknown';

/**
 * Enhanced error information for better handling
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  title: string;
  showLoginButton: boolean;
  originalError: any;
}

/**
 * Check if an error is authentication-related (401)
 */
export const isAuthError = (error: any): boolean => {
  return (
    error?.message?.includes('Authentication required') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Invalid token') ||
    error?.message?.includes('Token expired') ||
    error?.status === API.STATUS.UNAUTHORIZED ||
    error?.status === 401
  );
};

/**
 * Check if an error is permission-related (403)
 */
export const isPermissionError = (error: any): boolean => {
  return (
    error?.message?.includes('Forbidden') ||
    error?.message?.includes('Access denied') ||
    error?.message?.includes('Insufficient permissions') ||
    error?.status === API.STATUS.FORBIDDEN ||
    error?.status === 403
  );
};

/**
 * Check if an error is subscription-related (402)
 */
export const isSubscriptionError = (error: any): boolean => {
  if (!error) return false;

  const message = error.message || error.error || '';
  const code = error.code || '';

  return (
    code === 'PLAN_LIMIT_EXCEEDED' ||
    code === 'SUBSCRIPTION_EXPIRED' ||
    code === 'SUBSCRIPTION_CANCELLED' ||
    code === 'SUBSCRIPTION_PAUSED' ||
    code === 'TRIAL_EXPIRED' ||
    message.toLowerCase().includes('subscription') ||
    message.toLowerCase().includes('plan limit') ||
    message.toLowerCase().includes('trial expired') ||
    message.toLowerCase().includes('cancelled') ||
    message.toLowerCase().includes('expired') ||
    message.toLowerCase().includes('suspended') ||
    message.toLowerCase().includes('past due') ||
    message.toLowerCase().includes('paused')
  );
};

/**
 * Check if an error is network-related
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('Network Error') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Connection failed') ||
    error?.status === API.STATUS.SERVICE_UNAVAILABLE ||
    error?.status === 503
  );
};

/**
 * Check if an error is validation-related (400)
 */
export const isValidationError = (error: any): boolean => {
  return (
    error?.message?.includes('Validation failed') ||
    error?.message?.includes('Invalid input') ||
    error?.message?.includes('Required field') ||
    error?.status === API.STATUS.BAD_REQUEST ||
    error?.status === 400
  );
};

/**
 * Analyze error and provide enhanced information
 * Returns error code in message field so frontend can translate it
 * Frontend should use useApiError.translateError() to get translated message
 */
export const analyzeError = (error: any): ErrorInfo => {
  console.log('🔍 analyzeError called with:', error);

  // Extract error code from various error formats
  const errorCode = error?.code || error?.response?.data?.code || error?.error?.code || '';
  const errorCodeString = typeof errorCode === 'string' ? errorCode : '';

  // Authentication errors
  if (isAuthError(error)) {
    console.log('🔍 analyzeError: Detected auth error, clearing auth data');
    clearAuthData();
    
    return {
      type: 'auth',
      message: errorCodeString || 'UNAUTHORIZED',
      title: 'Session Expired',
      showLoginButton: true,
      originalError: error
    };
  }

  // Permission errors
  if (isPermissionError(error)) {
    return {
      type: 'permission',
      message: errorCodeString || 'FORBIDDEN',
      title: 'Access Denied',
      showLoginButton: false,
      originalError: error
    };
  }

  // Subscription errors (including PLAN_LIMIT_EXCEEDED)
  if (isSubscriptionError(error)) {
    return {
      type: 'subscription',
      message: errorCodeString || 'PLAN_LIMIT_EXCEEDED',
      title: 'Subscription Issue',
      showLoginButton: false,
      originalError: error
    };
  }

  // Network errors
  if (isNetworkError(error)) {
    return {
      type: 'network',
      message: errorCodeString || 'NETWORK_ERROR',
      title: 'Connection Error',
      showLoginButton: false,
      originalError: error
    };
  }

  // Validation errors
  if (isValidationError(error)) {
    return {
      type: 'validation',
      message: errorCodeString || 'VALIDATION_ERROR',
      title: 'Invalid Input',
      showLoginButton: false,
      originalError: error
    };
  }

  // Unknown errors - use error code if available
  return {
    type: 'unknown',
    message: errorCodeString || 'UNKNOWN_ERROR',
    title: 'Error',
    showLoginButton: false,
    originalError: error
  };
}; 