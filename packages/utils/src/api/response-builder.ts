/**
 * API Response Builder
 * Chuẩn hóa response format với error codes để client có thể translate
 */

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;           // Error/Success code for translation
  message?: string;        // Fallback message (English)
  data?: T;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Error code to default English message mapping
 * Sử dụng khi client không support translation hoặc cần fallback
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  'INVALID_CREDENTIALS': 'Invalid email or password',
  'ACCOUNT_DEACTIVATED': 'Account is deactivated. Please contact support.',
  'EMAIL_NOT_VERIFIED': 'Email has not been verified. Please check your email and verify your account before logging in.',
  'CURRENT_PASSWORD_REQUIRED': 'Current password is required',
  'CURRENT_PASSWORD_INCORRECT': 'Current password is incorrect',
  'PASSWORD_MIN_LENGTH': 'New password must be at least 6 characters',
  'PASSWORD_MISMATCH': 'Passwords do not match',
  'CROSS_MERCHANT_ACCESS_DENIED': 'Cannot access data from other merchants',
  'USER_NOT_ASSIGNED': 'User not assigned to merchant/outlet',
  'MERCHANT_ASSOCIATION_REQUIRED': 'User must be associated with a merchant',
  'NO_MERCHANT_ACCESS': 'User does not have merchant access',
  'NO_OUTLET_ACCESS': 'User does not have outlet access',
  'MERCHANT_ACCESS_REQUIRED': 'Merchant access required',
  'DELETE_USER_OUT_OF_SCOPE': 'Cannot delete user outside your scope',
  'UPDATE_USER_OUT_OF_SCOPE': 'Cannot update user outside your scope',
  'DELETE_OWN_ACCOUNT_ONLY': 'You can only delete your own account',
  
  // Validation Errors
  'INVALID_QUERY': 'Invalid query parameters',
  'INVALID_PAYLOAD': 'Invalid request payload',
  'INVALID_USER_DATA': 'Invalid user data',
  'INVALID_UPDATE_DATA': 'Invalid update data',
  'BUSINESS_NAME_REQUIRED': 'Business name is required',
  'CATEGORY_NAME_REQUIRED': 'Category name is required',
  'OUTLET_NAME_ADDRESS_REQUIRED': 'Outlet name and address are required',
  'USER_ID_REQUIRED': 'User ID is required',
  'CUSTOMER_ID_REQUIRED': 'Customer ID is required',
  'ORDER_ID_REQUIRED': 'Order ID is required',
  'PRODUCT_ID_REQUIRED': 'Product ID is required',
  'MERCHANT_ID_REQUIRED': 'Merchant ID is required',
  'OUTLET_ID_REQUIRED': 'Outlet ID is required',
  'PLAN_ID_REQUIRED': 'Plan ID is required',
  'INVALID_AMOUNT': 'Amount must be greater than 0',
  'INVALID_CUSTOMER_ID_FORMAT': 'Invalid customer ID format',
  'INVALID_PRODUCT_ID_FORMAT': 'Invalid product ID format',
  'INVALID_ORDER_ID_FORMAT': 'Invalid order ID format',
  'INVALID_MERCHANT_ID_FORMAT': 'Invalid merchant ID format',
  'INVALID_USER_ID_FORMAT': 'Invalid user ID format',
  'INVALID_PLAN_ID_FORMAT': 'Invalid plan ID format',
  'INVALID_AUDIT_LOG_ID_FORMAT': 'Invalid audit log ID format',
  'INVALID_DATE_FORMAT': 'Invalid date format',
  'INVALID_BUSINESS_TYPE': 'Invalid business type',
  'INVALID_PRICING_TYPE': 'Invalid pricing type',
  'INVALID_PLATFORM': 'Invalid platform. Must be "ios" or "android"',
  'INVALID_END_DATE': 'End date must be in the future',
  'INVALID_INTERVAL_CONFIG': 'Invalid interval configuration',
  'INVALID_BILLING_CONFIG': 'Invalid billing configuration',
  'ADMIN_OUTLET_ID_REQUIRED': 'Admin users need to specify outlet ID for outlet updates',
  'INVALID_CATEGORY_ID': 'Invalid category ID',
  'INVALID_SUBSCRIPTION_ID': 'Invalid subscription ID',
  
  // Not Found Errors
  'USER_NOT_FOUND': 'User not found',
  'MERCHANT_NOT_FOUND': 'Merchant not found',
  'OUTLET_NOT_FOUND': 'Outlet not found',
  'PRODUCT_NOT_FOUND': 'Product not found',
  'ORDER_NOT_FOUND': 'Order not found',
  'CUSTOMER_NOT_FOUND': 'Customer not found',
  'CATEGORY_NOT_FOUND': 'Category not found',
  'PLAN_NOT_FOUND': 'Plan not found',
  'SUBSCRIPTION_NOT_FOUND': 'Subscription not found',
  'PAYMENT_NOT_FOUND': 'Payment not found',
  'AUDIT_LOG_NOT_FOUND': 'Audit log not found',
  'NO_OUTLETS_FOUND': 'No outlets found for merchant',
  'NO_SUBSCRIPTION_FOUND': 'No subscription found for this merchant',
  'NO_DATA_AVAILABLE': 'No data available - user not assigned to merchant/outlet',
  
  // Conflict Errors
  'EMAIL_EXISTS': 'Email address is already registered',
  'PHONE_EXISTS': 'Phone number is already registered',
  'BUSINESS_NAME_EXISTS': 'Business name already exists',
  'CUSTOMER_DUPLICATE': 'A customer with this email or phone already exists',
  'OUTLET_NAME_EXISTS': 'An outlet with this name already exists for this merchant',
  'CATEGORY_NAME_EXISTS': 'Category with this name already exists',
  
  // Business Rules
  'PRODUCT_NO_STOCK_ENTRY': 'Product must have at least one outlet stock entry',
  'ACCOUNT_ALREADY_DELETED': 'Account is already deleted',
  'ORDER_PAYMENT_REQUIRED': 'Order ID, amount, and method are required',
  'SUBSCRIPTION_END_DATE_REQUIRED': 'Subscription ID, end date, and amount are required',
  'DEVICE_INFO_REQUIRED': 'Missing required fields: deviceId, pushToken, platform',
  'API_KEY_NAME_REQUIRED': 'API key name is required',
  'VALID_USER_ID_REQUIRED': 'Valid user ID is required',
  
  // Plan Limits
  'PLAN_LIMIT_EXCEEDED': 'Plan limit exceeded',
  'CANNOT_DELETE_ADDON_LIMIT_EXCEEDED': 'Cannot delete addon: Current usage exceeds limits after deletion',
  'CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET': 'Cannot create order for other outlet. You can only create orders for your assigned outlet.',
  'CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT': 'Cannot create order for outlet from different merchant.',
  'CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET': 'Cannot update order from other outlet. You can only update orders from your assigned outlet.',
  'CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT': 'Cannot update order from outlet of different merchant.',
  
  // Password Reset Errors
  'PASSWORD_RESET_TOKEN_INVALID': 'Password reset token is invalid',
  'PASSWORD_RESET_TOKEN_EXPIRED': 'Password reset token has expired',
  'PASSWORD_RESET_TOKEN_USED': 'Password reset token has already been used',
  
  // Email Verification Errors
  'EMAIL_VERIFICATION_FAILED': 'Email verification failed',
  'EMAIL_ALREADY_VERIFIED': 'Email has already been verified',
  'EMAIL_SEND_FAILED': 'Failed to send email',
  'TOKEN_REQUIRED': 'Token is required',
  
  // System Errors
  'INTERNAL_SERVER_ERROR': 'Internal server error',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
  'GATEWAY_ERROR': 'Gateway error. The server is temporarily unavailable.',
  'TIMEOUT_ERROR': 'Request timeout. Please try again.',
  'FETCH_MERCHANTS_FAILED': 'Failed to fetch merchants',
  'FETCH_OUTLETS_FAILED': 'Failed to fetch outlets',
  'FETCH_PRODUCTS_FAILED': 'Failed to fetch products',
  'FETCH_ORDERS_FAILED': 'Failed to fetch orders',
  'CREATE_CUSTOMER_FAILED': 'Failed to create customer',
  'UPDATE_USER_FAILED': 'Failed to update user',
  'DELETE_USER_FAILED': 'Failed to delete user',
  'FEATURE_NOT_IMPLEMENTED': 'This feature is not yet implemented',
  
  // Default
  'UNKNOWN_ERROR': 'An unknown error occurred',
};

/**
 * Success code to default English message mapping
 */
const SUCCESS_MESSAGES: Record<string, string> = {
  // Authentication
  'LOGIN_SUCCESS': 'Login successful',
  'LOGOUT_SUCCESS': 'Logged out successfully',
  'PASSWORD_CHANGED_SUCCESS': 'Password changed successfully',
  'PASSWORD_RESET_SUCCESS': 'Password has been reset successfully',
  'PASSWORD_RESET_LINK_SENT': 'If an account with that email exists, a password reset link has been sent',
  
  // Email Verification Success
  'EMAIL_VERIFIED_SUCCESS': 'Email verified successfully',
  'VERIFICATION_EMAIL_SENT': 'Verification email has been sent',
  
  // Create Operations
  'USER_CREATED_SUCCESS': 'User created successfully',
  'CUSTOMER_CREATED_SUCCESS': 'Customer created successfully',
  'PRODUCT_CREATED_SUCCESS': 'Product created successfully',
  'ORDER_CREATED_SUCCESS': 'Order created successfully',
  'CATEGORY_CREATED_SUCCESS': 'Category created successfully',
  'OUTLET_CREATED_SUCCESS': 'Outlet created successfully',
  'PLAN_CREATED_SUCCESS': 'Plan created successfully',
  'MERCHANT_CREATED_SUCCESS': 'Merchant created successfully with default outlet',
  
  // Update Operations
  'USER_UPDATED_SUCCESS': 'User updated successfully',
  'CUSTOMER_UPDATED_SUCCESS': 'Customer updated successfully',
  'PRODUCT_UPDATED_SUCCESS': 'Product updated successfully',
  'ORDER_UPDATED_SUCCESS': 'Order updated successfully',
  'CATEGORY_UPDATED_SUCCESS': 'Category updated successfully',
  'OUTLET_UPDATED_SUCCESS': 'Outlet updated successfully',
  'MERCHANT_UPDATED_SUCCESS': 'Merchant updated successfully',
  'PROFILE_UPDATED_SUCCESS': 'Profile updated successfully',
  'MERCHANT_INFO_UPDATED_SUCCESS': 'Merchant information updated successfully',
  'OUTLET_INFO_UPDATED_SUCCESS': 'Outlet information updated successfully',
  'CURRENCY_UPDATED_SUCCESS': 'Currency updated successfully',
  
  // Delete Operations
  'USER_DELETED_SUCCESS': 'User deleted successfully',
  'CUSTOMER_DELETED_SUCCESS': 'Customer deleted successfully',
  'PRODUCT_DELETED_SUCCESS': 'Product deleted successfully',
  'CATEGORY_DELETED_SUCCESS': 'Category deleted successfully',
  'OUTLET_DELETED_SUCCESS': 'Outlet deleted successfully',
  'MERCHANT_DELETED_SUCCESS': 'Merchant deleted successfully',
  'USER_DEACTIVATED_SUCCESS': 'User deactivated successfully',
  
  // Retrieve Operations
  'USER_RETRIEVED_SUCCESS': 'User retrieved successfully',
  'CUSTOMER_RETRIEVED_SUCCESS': 'Customer retrieved successfully',
  'PRODUCT_RETRIEVED_SUCCESS': 'Product retrieved successfully',
  'ORDER_RETRIEVED_SUCCESS': 'Order retrieved successfully',
  'CATEGORY_RETRIEVED_SUCCESS': 'Category retrieved successfully',
  'MERCHANT_RETRIEVED_SUCCESS': 'Merchant retrieved successfully',
  
  // Special Operations
  'DASHBOARD_DATA_SUCCESS': 'Enhanced dashboard data retrieved successfully',
  'GROWTH_METRICS_SUCCESS': 'Growth metrics retrieved successfully',
  'TODAY_METRICS_SUCCESS': 'Today metrics retrieved successfully',
  'MERCHANT_REGISTERED_TRIAL_SUCCESS': 'Merchant registered successfully with 14-day free trial',
  'MERCHANT_ACCOUNT_CREATED_SUCCESS': 'Merchant account created successfully with default outlet and trial subscription',
  'USER_ACCOUNT_CREATED_SUCCESS': 'User account created successfully',
};

/**
 * Get default message for error/success code
 */
function getDefaultMessage(code: string): string {
  return ERROR_MESSAGES[code] || SUCCESS_MESSAGES[code] || code;
}

/**
 * Response Builder Class
 * Cung cấp các static methods để tạo standardized API responses
 */
export class ResponseBuilder {
  /**
   * Build success response
   * @param code - Success code (e.g., 'USER_CREATED_SUCCESS')
   * @param data - Response data
   * @param meta - Optional metadata (pagination, etc.)
   */
  static success<T>(code: string, data?: T, meta?: any): ApiResponse<T> {
    return {
      success: true,
      code,
      message: getDefaultMessage(code),
      data,
      meta
    };
  }

  /**
   * Build error response
   * @param code - Error code (e.g., 'INVALID_CREDENTIALS')
   * Note: Only accepts error code to ensure translation system works properly
   * Message is automatically fetched from ERROR_MESSAGES or translation files
   */
  static error(code: string): ApiResponse {
    // Automatically get message from ERROR_MESSAGES or translation system
    const errorString = getDefaultMessage(code);
    
    return {
      success: false,
      code,
      message: errorString,
      error: errorString
    };
  }

  /**
   * Build paginated success response
   * @param code - Success code
   * @param data - Array of items
   * @param pagination - Pagination info
   */
  static paginated<T>(
    code: string,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): ApiResponse<T[]> {
    return {
      success: true,
      code,
      message: getDefaultMessage(code),
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        hasMore: pagination.page * pagination.limit < pagination.total
      }
    };
  }

  /**
   * Build validation error response from Zod flattened error
   * @param flattenedError - Flattened Zod error object from error.flatten()
   * DRY: Reuses ResponseBuilder.error() for consistency
   */
  static validationError(flattenedError: {
    fieldErrors?: Record<string, string[] | undefined> | { [key: string | number | symbol]: string[] | undefined };
    formErrors?: string[];
  }): ApiResponse {
    const errorMessages: string[] = [];
    
    // Collect field errors
    if (flattenedError.fieldErrors) {
      Object.entries(flattenedError.fieldErrors).forEach(([field, errors]) => {
        if (Array.isArray(errors)) {
          errors.forEach((errorMsg: string) => {
            errorMessages.push(`${field}: ${errorMsg}`);
          });
        }
      });
    }
    
    // Collect form errors
    if (flattenedError.formErrors && Array.isArray(flattenedError.formErrors)) {
      flattenedError.formErrors.forEach((errorMsg: string) => {
        errorMessages.push(errorMsg);
      });
    }
    
    // Return validation error with field-level details in error field
    // Message comes from translation system via error code
    const errorString = errorMessages.length > 0 
      ? errorMessages.join('; ') 
      : 'Input validation failed';
    
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: getDefaultMessage('VALIDATION_ERROR'),
      error: errorString // Keep detailed validation errors for debugging
    };
  }

}

/**
 * Helper: Extract error code from error object
 * Hữu ích khi catch errors và cần extract code
 */
export function getErrorCode(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.code) return error.code;
  if (error?.name === 'ZodError') return 'VALIDATION_ERROR';
  if (error?.message?.includes('not found')) return 'NOT_FOUND';
  if (error?.message?.includes('already exists')) return 'DUPLICATE_ENTRY';
  return 'UNKNOWN_ERROR';
}

/**
 * Helper: Build error response from caught error
 * Tự động detect error type và tạo appropriate response
 * Returns ApiResponse object (not NextResponse)
 * 
 * DRY: Reuses ResponseBuilder.validationError() for Zod errors
 */
export function buildErrorResponseFromError(error: any): ApiResponse {
  // Zod validation error - reuse ResponseBuilder.validationError() to avoid duplication
  if (error?.name === 'ZodError') {
    return ResponseBuilder.validationError(error.flatten());
  }

  // Custom error with code
  if (error?.code) {
    return ResponseBuilder.error(error.code);
  }

  // Standard errors
  const code = getErrorCode(error);
  return ResponseBuilder.error(code);
}

/**
 * Get HTTP status code based on error type/code
 * Helps determine appropriate status code for error responses
 */
export function getErrorStatusCode(error: any, defaultCode: number = 500): number {
  const code = getErrorCode(error);
  
  // Validation errors (400)
  if (error?.name === 'ZodError') return 400;
  if (code === 'VALIDATION_ERROR') return 400;
  if (code === 'INVALID_INPUT') return 400;
  if (code === 'INVALID_PAYLOAD') return 400;
  if (code === 'INVALID_QUERY') return 400;
  if (code?.includes('_REQUIRED')) return 400;
  if (code?.includes('INVALID_')) return 400;
  
  // Authentication errors (401)
  if (code === 'UNAUTHORIZED') return 401;
  if (code === 'INVALID_TOKEN') return 401;
  if (code === 'TOKEN_EXPIRED') return 401;
  if (code === 'INVALID_CREDENTIALS') return 401;
  
  // Authorization/Permission errors (403)
  if (code === 'FORBIDDEN') return 403;
  if (code === 'ACCOUNT_DEACTIVATED') return 403;
  if (code === 'INSUFFICIENT_PERMISSIONS') return 403;
  if (code?.includes('ACCESS_DENIED')) return 403;
  if (code?.includes('_OUT_OF_SCOPE')) return 403;
  
  // Not found errors (404)
  if (code?.includes('_NOT_FOUND')) return 404;
  if (code === 'NOT_FOUND') return 404;
  
  // Conflict/Duplicate errors (409)
  if (code?.includes('_EXISTS')) return 409;
  if (code?.includes('_DUPLICATE')) return 409;
  if (code === 'DUPLICATE_ENTRY') return 409;
  
  // Business rule violations (422)
  if (code === 'BUSINESS_RULE_VIOLATION') return 422;
  if (code?.includes('PRODUCT_NO_STOCK')) return 422;
  if (code === 'PLAN_LIMIT_EXCEEDED') return 422;
  if (code === 'CANNOT_DELETE_ADDON_LIMIT_EXCEEDED') return 422;
  
  // Authorization errors for order creation/update (403)
  if (code === 'CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET') return 403;
  if (code === 'CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT') return 403;
  if (code === 'CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET') return 403;
  if (code === 'CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT') return 403;
  
  // Service unavailable (503)
  if (code === 'SERVICE_UNAVAILABLE') return 503;
  
  return defaultCode;
}

