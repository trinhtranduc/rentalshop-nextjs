//
//  ErrorCodes.swift
//  RentalShop Mobile App
//
//  Generated from backend error codes
//  Copy this file into your Xcode project
//

import Foundation

/// API Error Codes - Matches backend ErrorCode enum
enum APIErrorCode: String, Codable, CaseIterable {
    // MARK: - Authentication & Authorization
    case unauthorized = "UNAUTHORIZED"
    case forbidden = "FORBIDDEN"
    case invalidToken = "INVALID_TOKEN"
    case tokenExpired = "TOKEN_EXPIRED"
    case invalidCredentials = "INVALID_CREDENTIALS"
    case emailNotVerified = "EMAIL_NOT_VERIFIED"
    case accountDeactivated = "ACCOUNT_DEACTIVATED"
    
    // MARK: - Validation Errors
    case validationError = "VALIDATION_ERROR"
    case invalidInput = "INVALID_INPUT"
    case missingRequiredField = "MISSING_REQUIRED_FIELD"
    case invalidQuery = "INVALID_QUERY"
    case invalidPayload = "INVALID_PAYLOAD"
    case invalidUserData = "INVALID_USER_DATA"
    case invalidUpdateData = "INVALID_UPDATE_DATA"
    case businessNameRequired = "BUSINESS_NAME_REQUIRED"
    case categoryNameRequired = "CATEGORY_NAME_REQUIRED"
    case outletNameAddressRequired = "OUTLET_NAME_ADDRESS_REQUIRED"
    case userIdRequired = "USER_ID_REQUIRED"
    case customerIdRequired = "CUSTOMER_ID_REQUIRED"
    case orderIdRequired = "ORDER_ID_REQUIRED"
    case productIdRequired = "PRODUCT_ID_REQUIRED"
    case merchantIdRequired = "MERCHANT_ID_REQUIRED"
    case outletIdRequired = "OUTLET_ID_REQUIRED"
    case planIdRequired = "PLAN_ID_REQUIRED"
    case invalidAmount = "INVALID_AMOUNT"
    case invalidCustomerIdFormat = "INVALID_CUSTOMER_ID_FORMAT"
    case invalidProductIdFormat = "INVALID_PRODUCT_ID_FORMAT"
    case invalidOrderIdFormat = "INVALID_ORDER_ID_FORMAT"
    case invalidMerchantIdFormat = "INVALID_MERCHANT_ID_FORMAT"
    case invalidUserIdFormat = "INVALID_USER_ID_FORMAT"
    case invalidPlanIdFormat = "INVALID_PLAN_ID_FORMAT"
    case invalidAuditLogIdFormat = "INVALID_AUDIT_LOG_ID_FORMAT"
    case invalidDateFormat = "INVALID_DATE_FORMAT"
    case invalidBusinessType = "INVALID_BUSINESS_TYPE"
    case invalidPricingType = "INVALID_PRICING_TYPE"
    case invalidPlatform = "INVALID_PLATFORM"
    case invalidEndDate = "INVALID_END_DATE"
    case invalidIntervalConfig = "INVALID_INTERVAL_CONFIG"
    case invalidBillingConfig = "INVALID_BILLING_CONFIG"
    case adminOutletIdRequired = "ADMIN_OUTLET_ID_REQUIRED"
    case invalidCategoryId = "INVALID_CATEGORY_ID"
    case invalidSubscriptionId = "INVALID_SUBSCRIPTION_ID"
    
    // MARK: - Password Errors
    case currentPasswordRequired = "CURRENT_PASSWORD_REQUIRED"
    case currentPasswordIncorrect = "CURRENT_PASSWORD_INCORRECT"
    case passwordMinLength = "PASSWORD_MIN_LENGTH"
    case passwordMismatch = "PASSWORD_MISMATCH"
    case passwordResetTokenInvalid = "PASSWORD_RESET_TOKEN_INVALID"
    case passwordResetTokenExpired = "PASSWORD_RESET_TOKEN_EXPIRED"
    case passwordResetTokenUsed = "PASSWORD_RESET_TOKEN_USED"
    
    // MARK: - Database Errors
    case databaseError = "DATABASE_ERROR"
    case duplicateEntry = "DUPLICATE_ENTRY"
    case foreignKeyConstraint = "FOREIGN_KEY_CONSTRAINT"
    case notFound = "NOT_FOUND"
    
    // MARK: - Business Logic Errors
    case planLimitExceeded = "PLAN_LIMIT_EXCEEDED"
    case insufficientPermissions = "INSUFFICIENT_PERMISSIONS"
    case businessRuleViolation = "BUSINESS_RULE_VIOLATION"
    case subscriptionExpired = "SUBSCRIPTION_EXPIRED"
    case subscriptionCancelled = "SUBSCRIPTION_CANCELLED"
    case subscriptionPaused = "SUBSCRIPTION_PAUSED"
    case trialExpired = "TRIAL_EXPIRED"
    case orderAlreadyExists = "ORDER_ALREADY_EXISTS"
    case productOutOfStock = "PRODUCT_OUT_OF_STOCK"
    case invalidOrderStatus = "INVALID_ORDER_STATUS"
    case paymentFailed = "PAYMENT_FAILED"
    case invalidPaymentMethod = "INVALID_PAYMENT_METHOD"
    case productNoStockEntry = "PRODUCT_NO_STOCK_ENTRY"
    case accountAlreadyDeleted = "ACCOUNT_ALREADY_DELETED"
    case orderPaymentRequired = "ORDER_PAYMENT_REQUIRED"
    case subscriptionEndDateRequired = "SUBSCRIPTION_END_DATE_REQUIRED"
    case deviceInfoRequired = "DEVICE_INFO_REQUIRED"
    case apiKeyNameRequired = "API_KEY_NAME_REQUIRED"
    case validUserIdRequired = "VALID_USER_ID_REQUIRED"
    
    // MARK: - Access Control Errors
    case crossMerchantAccessDenied = "CROSS_MERCHANT_ACCESS_DENIED"
    case userNotAssigned = "USER_NOT_ASSIGNED"
    case merchantAssociationRequired = "MERCHANT_ASSOCIATION_REQUIRED"
    case noMerchantAccess = "NO_MERCHANT_ACCESS"
    case noOutletAccess = "NO_OUTLET_ACCESS"
    case merchantAccessRequired = "MERCHANT_ACCESS_REQUIRED"
    case deleteUserOutOfScope = "DELETE_USER_OUT_OF_SCOPE"
    case updateUserOutOfScope = "UPDATE_USER_OUT_OF_SCOPE"
    case deleteOwnAccountOnly = "DELETE_OWN_ACCOUNT_ONLY"
    
    // MARK: - Resource Specific Errors
    case emailExists = "EMAIL_EXISTS"
    case phoneExists = "PHONE_EXISTS"
    case userNotFound = "USER_NOT_FOUND"
    case merchantNotFound = "MERCHANT_NOT_FOUND"
    case outletNotFound = "OUTLET_NOT_FOUND"
    case productNotFound = "PRODUCT_NOT_FOUND"
    case orderNotFound = "ORDER_NOT_FOUND"
    case customerNotFound = "CUSTOMER_NOT_FOUND"
    case categoryNotFound = "CATEGORY_NOT_FOUND"
    case planNotFound = "PLAN_NOT_FOUND"
    case subscriptionNotFound = "SUBSCRIPTION_NOT_FOUND"
    case paymentNotFound = "PAYMENT_NOT_FOUND"
    case auditLogNotFound = "AUDIT_LOG_NOT_FOUND"
    case billingCycleNotFound = "BILLING_CYCLE_NOT_FOUND"
    case planVariantNotFound = "PLAN_VARIANT_NOT_FOUND"
    case noOutletsFound = "NO_OUTLETS_FOUND"
    case noSubscriptionFound = "NO_SUBSCRIPTION_FOUND"
    case noDataAvailable = "NO_DATA_AVAILABLE"
    
    // MARK: - Conflict Errors
    case customerDuplicate = "CUSTOMER_DUPLICATE"
    case outletNameExists = "OUTLET_NAME_EXISTS"
    case categoryNameExists = "CATEGORY_NAME_EXISTS"
    case emailAlreadyExists = "EMAIL_ALREADY_EXISTS"
    case merchantDuplicate = "MERCHANT_DUPLICATE"
    
    // MARK: - System Errors
    case internalServerError = "INTERNAL_SERVER_ERROR"
    case serviceUnavailable = "SERVICE_UNAVAILABLE"
    case networkError = "NETWORK_ERROR"
    case fetchMerchantsFailed = "FETCH_MERCHANTS_FAILED"
    case fetchOutletsFailed = "FETCH_OUTLETS_FAILED"
    case fetchProductsFailed = "FETCH_PRODUCTS_FAILED"
    case fetchOrdersFailed = "FETCH_ORDERS_FAILED"
    case createCustomerFailed = "CREATE_CUSTOMER_FAILED"
    case updateUserFailed = "UPDATE_USER_FAILED"
    case deleteUserFailed = "DELETE_USER_FAILED"
    case featureNotImplemented = "FEATURE_NOT_IMPLEMENTED"
    case unknownError = "UNKNOWN_ERROR"
    
    // MARK: - File Upload Errors
    case fileTooLarge = "FILE_TOO_LARGE"
    case invalidFileType = "INVALID_FILE_TYPE"
    case uploadFailed = "UPLOAD_FAILED"
    
    // MARK: - Helper Methods
    
    /// Get default error message for this error code
    var defaultMessage: String {
        return APIErrorMessages.messages[self] ?? "An error occurred"
    }
    
    /// Get HTTP status code for this error code
    var httpStatusCode: Int {
        return APIErrorStatusCodes.statusCodes[self] ?? 500
    }
    
    /// Initialize from string (case-insensitive)
    init?(from string: String) {
        let upperString = string.uppercased()
        if let code = APIErrorCode.allCases.first(where: { $0.rawValue == upperString }) {
            self = code
        } else {
            return nil
        }
    }
}

// MARK: - Error Messages Dictionary

struct APIErrorMessages {
    static let messages: [APIErrorCode: String] = [
        // Authentication & Authorization
        .unauthorized: "Authentication required",
        .forbidden: "Access denied",
        .invalidToken: "Invalid authentication token",
        .tokenExpired: "Authentication token has expired",
        .invalidCredentials: "Invalid email or password",
        .emailNotVerified: "Email has not been verified. Please check your email and verify your account before logging in.",
        .accountDeactivated: "Account is deactivated. Please contact support.",
        
        // Validation Errors
        .validationError: "Input validation failed",
        .invalidInput: "Invalid input provided",
        .missingRequiredField: "Required field is missing",
        .invalidQuery: "Invalid query parameters",
        .invalidPayload: "Invalid request payload",
        .invalidUserData: "Invalid user data",
        .invalidUpdateData: "Invalid update data",
        .businessNameRequired: "Business name is required",
        .categoryNameRequired: "Category name is required",
        .outletNameAddressRequired: "Outlet name and address are required",
        .userIdRequired: "User ID is required",
        .customerIdRequired: "Customer ID is required",
        .orderIdRequired: "Order ID is required",
        .productIdRequired: "Product ID is required",
        .merchantIdRequired: "Merchant ID is required",
        .outletIdRequired: "Outlet ID is required",
        .planIdRequired: "Plan ID is required",
        .invalidAmount: "Amount must be greater than 0",
        .invalidCustomerIdFormat: "Invalid customer ID format",
        .invalidProductIdFormat: "Invalid product ID format",
        .invalidOrderIdFormat: "Invalid order ID format",
        .invalidMerchantIdFormat: "Invalid merchant ID format",
        .invalidUserIdFormat: "Invalid user ID format",
        .invalidPlanIdFormat: "Invalid plan ID format",
        .invalidAuditLogIdFormat: "Invalid audit log ID format",
        .invalidDateFormat: "Invalid date format",
        .invalidBusinessType: "Invalid business type",
        .invalidPricingType: "Invalid pricing type",
        .invalidPlatform: "Invalid platform. Must be \"ios\" or \"android\"",
        .invalidEndDate: "End date must be in the future",
        .invalidIntervalConfig: "Invalid interval configuration",
        .invalidBillingConfig: "Invalid billing configuration",
        .adminOutletIdRequired: "Admin users need to specify outlet ID for outlet updates",
        .invalidCategoryId: "Invalid category ID",
        .invalidSubscriptionId: "Invalid subscription ID",
        
        // Password Errors
        .currentPasswordRequired: "Current password is required",
        .currentPasswordIncorrect: "Current password is incorrect",
        .passwordMinLength: "New password must be at least 6 characters",
        .passwordMismatch: "Passwords do not match",
        .passwordResetTokenInvalid: "Password reset token is invalid",
        .passwordResetTokenExpired: "Password reset token has expired",
        .passwordResetTokenUsed: "Password reset token has already been used",
        
        // Database Errors
        .databaseError: "Database operation failed",
        .duplicateEntry: "Record already exists",
        .foreignKeyConstraint: "Invalid reference",
        .notFound: "Resource not found",
        
        // Business Logic Errors
        .planLimitExceeded: "Plan limit exceeded",
        .insufficientPermissions: "Insufficient permissions",
        .businessRuleViolation: "Business rule violation",
        .subscriptionExpired: "Subscription has expired",
        .subscriptionCancelled: "Subscription has been cancelled",
        .subscriptionPaused: "Subscription is paused",
        .trialExpired: "Trial period has expired",
        .orderAlreadyExists: "Order already exists",
        .productOutOfStock: "Product is out of stock",
        .invalidOrderStatus: "Invalid order status",
        .paymentFailed: "Payment processing failed",
        .invalidPaymentMethod: "Invalid payment method",
        .productNoStockEntry: "Product must have at least one outlet stock entry",
        .accountAlreadyDeleted: "Account is already deleted",
        .orderPaymentRequired: "Order ID, amount, and method are required",
        .subscriptionEndDateRequired: "Subscription ID, end date, and amount are required",
        .deviceInfoRequired: "Missing required fields: deviceId, pushToken, platform",
        .apiKeyNameRequired: "API key name is required",
        .validUserIdRequired: "Valid user ID is required",
        
        // Access Control Errors
        .crossMerchantAccessDenied: "Cannot access data from other merchants",
        .userNotAssigned: "User not assigned to merchant/outlet",
        .merchantAssociationRequired: "User must be associated with a merchant",
        .noMerchantAccess: "User does not have merchant access",
        .noOutletAccess: "User does not have outlet access",
        .merchantAccessRequired: "Merchant access required",
        .deleteUserOutOfScope: "Cannot delete user outside your scope",
        .updateUserOutOfScope: "Cannot update user outside your scope",
        .deleteOwnAccountOnly: "You can only delete your own account",
        
        // Resource Specific Errors
        .emailExists: "Email address is already registered",
        .phoneExists: "Phone number is already registered",
        .userNotFound: "User not found",
        .merchantNotFound: "Merchant not found",
        .outletNotFound: "Outlet not found",
        .productNotFound: "Product not found",
        .orderNotFound: "Order not found",
        .customerNotFound: "Customer not found",
        .categoryNotFound: "Category not found",
        .planNotFound: "Plan not found",
        .subscriptionNotFound: "Subscription not found",
        .paymentNotFound: "Payment not found",
        .auditLogNotFound: "Audit log not found",
        .billingCycleNotFound: "Billing cycle not found",
        .planVariantNotFound: "Plan variant not found",
        .noOutletsFound: "No outlets found for merchant",
        .noSubscriptionFound: "No subscription found for this merchant",
        .noDataAvailable: "No data available - user not assigned to merchant/outlet",
        
        // Conflict Errors
        .customerDuplicate: "A customer with this email or phone already exists",
        .outletNameExists: "An outlet with this name already exists for this merchant",
        .categoryNameExists: "Category with this name already exists",
        .emailAlreadyExists: "Email address is already registered",
        .merchantDuplicate: "A merchant with this email or phone already exists",
        
        // System Errors
        .internalServerError: "Internal server error",
        .serviceUnavailable: "Service temporarily unavailable",
        .networkError: "Network error occurred",
        .fetchMerchantsFailed: "Failed to fetch merchants",
        .fetchOutletsFailed: "Failed to fetch outlets",
        .fetchProductsFailed: "Failed to fetch products",
        .fetchOrdersFailed: "Failed to fetch orders",
        .createCustomerFailed: "Failed to create customer",
        .updateUserFailed: "Failed to update user",
        .deleteUserFailed: "Failed to delete user",
        .featureNotImplemented: "This feature is not yet implemented",
        .unknownError: "An unknown error occurred",
        
        // File Upload Errors
        .fileTooLarge: "File size exceeds limit",
        .invalidFileType: "Invalid file type",
        .uploadFailed: "File upload failed"
    ]
}

// MARK: - HTTP Status Codes Dictionary

struct APIErrorStatusCodes {
    static let statusCodes: [APIErrorCode: Int] = [
        // Authentication & Authorization (4xx)
        .unauthorized: 401,
        .forbidden: 403,
        .invalidToken: 401,
        .tokenExpired: 401,
        .invalidCredentials: 401,
        .emailNotVerified: 403,
        .accountDeactivated: 403,
        
        // Validation Errors (4xx)
        .validationError: 400,
        .invalidInput: 400,
        .missingRequiredField: 400,
        .invalidQuery: 400,
        .invalidPayload: 400,
        .invalidUserData: 400,
        .invalidUpdateData: 400,
        .businessNameRequired: 400,
        .categoryNameRequired: 400,
        .outletNameAddressRequired: 400,
        .userIdRequired: 400,
        .customerIdRequired: 400,
        .orderIdRequired: 400,
        .productIdRequired: 400,
        .merchantIdRequired: 400,
        .outletIdRequired: 400,
        .planIdRequired: 400,
        .invalidAmount: 400,
        .invalidCustomerIdFormat: 400,
        .invalidProductIdFormat: 400,
        .invalidOrderIdFormat: 400,
        .invalidMerchantIdFormat: 400,
        .invalidUserIdFormat: 400,
        .invalidPlanIdFormat: 400,
        .invalidAuditLogIdFormat: 400,
        .invalidDateFormat: 400,
        .invalidBusinessType: 400,
        .invalidPricingType: 400,
        .invalidPlatform: 400,
        .invalidEndDate: 400,
        .invalidIntervalConfig: 400,
        .invalidBillingConfig: 400,
        .adminOutletIdRequired: 400,
        .invalidCategoryId: 400,
        .invalidSubscriptionId: 400,
        
        // Password Errors (4xx)
        .currentPasswordRequired: 400,
        .currentPasswordIncorrect: 400,
        .passwordMinLength: 400,
        .passwordMismatch: 400,
        .passwordResetTokenInvalid: 400,
        .passwordResetTokenExpired: 400,
        .passwordResetTokenUsed: 400,
        
        // Database Errors (4xx/5xx)
        .databaseError: 500,
        .duplicateEntry: 409,
        .foreignKeyConstraint: 400,
        .notFound: 404,
        
        // Business Logic Errors (4xx)
        .planLimitExceeded: 403,
        .insufficientPermissions: 403,
        .businessRuleViolation: 422,
        .subscriptionExpired: 402,
        .subscriptionCancelled: 402,
        .subscriptionPaused: 402,
        .trialExpired: 402,
        .orderAlreadyExists: 409,
        .productOutOfStock: 422,
        .invalidOrderStatus: 422,
        .paymentFailed: 402,
        .invalidPaymentMethod: 400,
        .productNoStockEntry: 422,
        .accountAlreadyDeleted: 422,
        .orderPaymentRequired: 400,
        .subscriptionEndDateRequired: 400,
        .deviceInfoRequired: 400,
        .apiKeyNameRequired: 400,
        .validUserIdRequired: 400,
        
        // Access Control Errors (4xx)
        .crossMerchantAccessDenied: 403,
        .userNotAssigned: 403,
        .merchantAssociationRequired: 400,
        .noMerchantAccess: 403,
        .noOutletAccess: 403,
        .merchantAccessRequired: 403,
        .deleteUserOutOfScope: 403,
        .updateUserOutOfScope: 403,
        .deleteOwnAccountOnly: 403,
        
        // Resource Specific Errors (4xx)
        .emailExists: 409,
        .phoneExists: 409,
        .userNotFound: 404,
        .merchantNotFound: 404,
        .outletNotFound: 404,
        .productNotFound: 404,
        .orderNotFound: 404,
        .customerNotFound: 404,
        .categoryNotFound: 404,
        .planNotFound: 404,
        .subscriptionNotFound: 404,
        .paymentNotFound: 404,
        .auditLogNotFound: 404,
        .billingCycleNotFound: 404,
        .planVariantNotFound: 404,
        .noOutletsFound: 404,
        .noSubscriptionFound: 404,
        .noDataAvailable: 404,
        
        // Conflict Errors (4xx)
        .customerDuplicate: 409,
        .outletNameExists: 409,
        .categoryNameExists: 409,
        .emailAlreadyExists: 409,
        .merchantDuplicate: 409,
        
        // System Errors (5xx)
        .internalServerError: 500,
        .serviceUnavailable: 503,
        .networkError: 503,
        .fetchMerchantsFailed: 500,
        .fetchOutletsFailed: 500,
        .fetchProductsFailed: 500,
        .fetchOrdersFailed: 500,
        .createCustomerFailed: 500,
        .updateUserFailed: 500,
        .deleteUserFailed: 500,
        .featureNotImplemented: 501,
        .unknownError: 500,
        
        // File Upload Errors (4xx)
        .fileTooLarge: 413,
        .invalidFileType: 400,
        .uploadFailed: 500
    ]
}

// MARK: - API Error Response Model

struct APIErrorResponse: Codable {
    let success: Bool
    let code: String
    let message: String
    let error: String?
    
    /// Get error code enum from response
    var errorCode: APIErrorCode? {
        return APIErrorCode(from: code)
    }
    
    /// Get user-friendly error message
    var userMessage: String {
        if let errorCode = errorCode {
            return errorCode.defaultMessage
        }
        return message.isEmpty ? (error ?? "An error occurred") : message
    }
    
    /// Get HTTP status code
    var statusCode: Int {
        return errorCode?.httpStatusCode ?? 500
    }
}

// MARK: - Usage Example

/*
 // Example usage in your API service:
 
 func handleError(_ response: APIErrorResponse) {
     if let errorCode = response.errorCode {
         switch errorCode {
         case .invalidCredentials:
             // Show login error
             break
         case .emailExists:
             // Show email already exists error
             break
         case .planLimitExceeded:
             // Show plan limit error
             break
         default:
             // Show generic error
             showError(response.userMessage)
         }
     } else {
         // Unknown error code, use message from response
         showError(response.message)
     }
 }
 
 // Parse error from API response:
 if let errorData = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
     handleError(errorData)
 }
 */

