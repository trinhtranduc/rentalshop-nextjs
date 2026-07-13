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
    case emailAlreadyVerified = "EMAIL_ALREADY_VERIFIED"
    case accountDeactivated = "ACCOUNT_DEACTIVATED"
    
    // MARK: - Verification Errors
    case verificationEmailSent = "VERIFICATION_EMAIL_SENT"
    case rateLimitExceeded = "RATE_LIMIT_EXCEEDED"
    case emailSendFailed = "EMAIL_SEND_FAILED"
    
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
    case subscriptionPastDue = "SUBSCRIPTION_PAST_DUE"
    case noSubscription = "NO_SUBSCRIPTION"
    case subscriptionPeriodEnded = "SUBSCRIPTION_PERIOD_ENDED"
    case subscriptionPeriodMissing = "SUBSCRIPTION_PERIOD_MISSING"
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
    case sessionExpired = "SESSION_EXPIRED"
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
    // MARK: - Authentication & Authorization
    case accessDenied = "ACCESS_DENIED"
    case accessTokenRequired = "ACCESS_TOKEN_REQUIRED"

    // MARK: - Success Messages
    case accountDeletedSuccess = "ACCOUNT_DELETED_SUCCESS"

    // MARK: - Data Integrity Checks
    case allOrdersValidAmounts = "ALL_ORDERS_VALID_AMOUNTS"
    case allOrdersValidCustomers = "ALL_ORDERS_VALID_CUSTOMERS"
    case allOrderItemsValidProducts = "ALL_ORDER_ITEMS_VALID_PRODUCTS"
    case allPaymentsValidOrders = "ALL_PAYMENTS_VALID_ORDERS"
    case allProductsValidLevels = "ALL_PRODUCTS_VALID_LEVELS"
    case allProductsValidStock = "ALL_PRODUCTS_VALID_STOCK"
    case allUsersValidOutlets = "ALL_USERS_VALID_OUTLETS"

    // MARK: - Test Messages
    case apiKeysWorking = "API_KEYS_WORKING"

    // MARK: - Success Messages
    case auditLogRetrievedSuccess = "AUDIT_LOG_RETRIEVED_SUCCESS"

    // MARK: - Data Integrity Checks
    case auditLogWorking = "AUDIT_LOG_WORKING"

    // MARK: - Success Messages
    case availabilityChecked = "AVAILABILITY_CHECKED"

    // MARK: - Test Messages
    case awsS3TestFailed = "AWS_S3_TEST_FAILED"

    // MARK: - Resource Specific Errors
    case bankAccountNotFound = "BANK_ACCOUNT_NOT_FOUND"

    // MARK: - Success Messages
    case billingConfigUpdatedSuccess = "BILLING_CONFIG_UPDATED_SUCCESS"

    // MARK: - Validation Errors
    case businessNameExists = "BUSINESS_NAME_EXISTS"

    // MARK: - Business Logic Errors
    case cannotDeleteDefaultCategory = "CANNOT_DELETE_DEFAULT_CATEGORY"
    case cannotDeleteDefaultOutlet = "CANNOT_DELETE_DEFAULT_OUTLET"
    case cannotDeleteLastAdmin = "CANNOT_DELETE_LAST_ADMIN"
    case cannotDeleteSelf = "CANNOT_DELETE_SELF"
    case cannotDetectEntity = "CANNOT_DETECT_ENTITY"

    // MARK: - Success Messages
    case categoriesFetched = "CATEGORIES_FETCHED"
    case categoryCreatedSuccess = "CATEGORY_CREATED_SUCCESS"
    case categoryDeletedSuccess = "CATEGORY_DELETED_SUCCESS"
    case categoryRetrievedSuccess = "CATEGORY_RETRIEVED_SUCCESS"
    case categoryUpdatedSuccess = "CATEGORY_UPDATED_SUCCESS"

    // MARK: - System Errors
    case changePasswordFailed = "CHANGE_PASSWORD_FAILED"

    // MARK: - Data Integrity Checks
    case checkAuditLogFailed = "CHECK_AUDIT_LOG_FAILED"
    case checkDataConsistencyFailed = "CHECK_DATA_CONSISTENCY_FAILED"
    case checkOrderCustomerIntegrityFailed = "CHECK_ORDER_CUSTOMER_INTEGRITY_FAILED"
    case checkOrderProductIntegrityFailed = "CHECK_ORDER_PRODUCT_INTEGRITY_FAILED"
    case checkOrphanedRecordsFailed = "CHECK_ORPHANED_RECORDS_FAILED"
    case checkPaymentOrderIntegrityFailed = "CHECK_PAYMENT_ORDER_INTEGRITY_FAILED"
    case checkProductStockFailed = "CHECK_PRODUCT_STOCK_FAILED"
    case checkUserOutletIntegrityFailed = "CHECK_USER_OUTLET_INTEGRITY_FAILED"

    // MARK: - System Errors
    case cleanupFailed = "CLEANUP_FAILED"
    case createOutletFailed = "CREATE_OUTLET_FAILED"

    // MARK: - Validation Errors
    case currencyRequired = "CURRENCY_REQUIRED"
    case currencyUpdatedSuccess = "CURRENCY_UPDATED_SUCCESS"

    // MARK: - Success Messages
    case customerCreatedSuccess = "CUSTOMER_CREATED_SUCCESS"
    case customerDeletedSuccess = "CUSTOMER_DELETED_SUCCESS"

    // MARK: - Business Logic Errors
    case customerHasActiveOrders = "CUSTOMER_HAS_ACTIVE_ORDERS"

    // MARK: - Success Messages
    case customerRetrievedSuccess = "CUSTOMER_RETRIEVED_SUCCESS"
    case customerUpdatedSuccess = "CUSTOMER_UPDATED_SUCCESS"
    case dashboardDataSuccess = "DASHBOARD_DATA_SUCCESS"

    // MARK: - Data Integrity Checks
    case dataIntegrityCheckPassed = "DATA_INTEGRITY_CHECK_PASSED"

    // MARK: - Resource Specific Errors
    case defaultOutletNotFound = "DEFAULT_OUTLET_NOT_FOUND"

    // MARK: - System Errors
    case deleteAccountFailed = "DELETE_ACCOUNT_FAILED"
    case deleteCategoryFailed = "DELETE_CATEGORY_FAILED"

    // MARK: - Success Messages
    case deviceRegisteredSuccess = "DEVICE_REGISTERED_SUCCESS"

    // MARK: - System Errors
    case deviceRegistrationFailed = "DEVICE_REGISTRATION_FAILED"

    // MARK: - Other Errors
    case emailVerificationFailed = "EMAIL_VERIFICATION_FAILED"

    // MARK: - Success Messages
    case emailVerifiedSuccess = "EMAIL_VERIFIED_SUCCESS"

    // MARK: - System Errors
    case fetchBillingCyclesFailed = "FETCH_BILLING_CYCLES_FAILED"
    case fetchBillingFailed = "FETCH_BILLING_FAILED"
    case fetchCategoriesFailed = "FETCH_CATEGORIES_FAILED"
    case fetchPlanFailed = "FETCH_PLAN_FAILED"
    case fetchPricingFailed = "FETCH_PRICING_FAILED"
    case fetchSystemAnalyticsFailed = "FETCH_SYSTEM_ANALYTICS_FAILED"
    case gatewayError = "GATEWAY_ERROR"

    // MARK: - Success Messages
    case growthMetricsSuccess = "GROWTH_METRICS_SUCCESS"

    // MARK: - File Upload Errors
    case imageUploadFailed = "IMAGE_UPLOAD_FAILED"
    case imageValidationFailed = "IMAGE_VALIDATION_FAILED"

    // MARK: - Validation Errors
    case invalidAction = "INVALID_ACTION"
    case invalidCurrency = "INVALID_CURRENCY"
    case invalidDate = "INVALID_DATE"
    case invalidDateRange = "INVALID_DATE_RANGE"
    case invalidEntityType = "INVALID_ENTITY_TYPE"
    case invalidFeaturesFormat = "INVALID_FEATURES_FORMAT"
    case invalidIdFormat = "INVALID_ID_FORMAT"
    case invalidJson = "INVALID_JSON"
    case invalidJsonData = "INVALID_JSON_DATA"
    case invalidLimitsFormat = "INVALID_LIMITS_FORMAT"
    case invalidMerchantId = "INVALID_MERCHANT_ID"
    case invalidOutletId = "INVALID_OUTLET_ID"
    case invalidOutletStock = "INVALID_OUTLET_STOCK"
    case invalidQueryParameters = "INVALID_QUERY_PARAMETERS"
    case invalidRentalDates = "INVALID_RENTAL_DATES"
    case invalidRequest = "INVALID_REQUEST"
    case invalidSessionId = "INVALID_SESSION_ID"
    case invalidTenantKey = "INVALID_TENANT_KEY"
    case invalidUserId = "INVALID_USER_ID"
    case invalidUserRole = "INVALID_USER_ROLE"

    // MARK: - Success Messages
    case loginSuccess = "LOGIN_SUCCESS"
    case logoutSuccess = "LOGOUT_SUCCESS"
    case manualPaymentCreatedSuccess = "MANUAL_PAYMENT_CREATED_SUCCESS"
    case merchantAccountCreatedPendingVerification = "MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION"
    case merchantAccountCreatedSuccess = "MERCHANT_ACCOUNT_CREATED_SUCCESS"
    case merchantCreatedSuccess = "MERCHANT_CREATED_SUCCESS"
    case merchantDeletedSuccess = "MERCHANT_DELETED_SUCCESS"

    // MARK: - Business Logic Errors
    case merchantHasActiveSubscription = "MERCHANT_HAS_ACTIVE_SUBSCRIPTION"

    // MARK: - Resource Specific Errors
    case merchantInactive = "MERCHANT_INACTIVE"

    // MARK: - Success Messages
    case merchantInfoUpdatedSuccess = "MERCHANT_INFO_UPDATED_SUCCESS"
    case merchantRegisteredTrialSuccess = "MERCHANT_REGISTERED_TRIAL_SUCCESS"
    case merchantRetrievedSuccess = "MERCHANT_RETRIEVED_SUCCESS"
    case merchantUpdatedSuccess = "MERCHANT_UPDATED_SUCCESS"

    // MARK: - Validation Errors
    case missingEndpointOrToken = "MISSING_ENDPOINT_OR_TOKEN"
    case missingEntities = "MISSING_ENTITIES"
    case missingEntityType = "MISSING_ENTITY_TYPE"
    case missingFile = "MISSING_FILE"
    case missingMerchantId = "MISSING_MERCHANT_ID"
    case missingProductData = "MISSING_PRODUCT_DATA"
    case missingSessionId = "MISSING_SESSION_ID"
    case missingStagingKeys = "MISSING_STAGING_KEYS"

    // MARK: - Success Messages
    case mobileLoginSuccess = "MOBILE_LOGIN_SUCCESS"

    // MARK: - Validation Errors
    case multipleEntitiesFound = "MULTIPLE_ENTITIES_FOUND"
    case multipleEntitiesInFile = "MULTIPLE_ENTITIES_IN_FILE"

    // MARK: - Resource Specific Errors
    case noDefaultBankAccount = "NO_DEFAULT_BANK_ACCOUNT"
    case noDefaultOutlet = "NO_DEFAULT_OUTLET"
    case noEntitiesToImport = "NO_ENTITIES_TO_IMPORT"
    case noFieldsToUpdate = "NO_FIELDS_TO_UPDATE"
    case noImageFile = "NO_IMAGE_FILE"
    case noOrphanedOrderItems = "NO_ORPHANED_ORDER_ITEMS"

    // MARK: - Validation Errors
    case noValidFields = "NO_VALID_FIELDS"

    // MARK: - Success Messages
    case orderAnalyticsSuccess = "ORDER_ANALYTICS_SUCCESS"
    case orderCreatedSuccess = "ORDER_CREATED_SUCCESS"
    case orderRetrievedSuccess = "ORDER_RETRIEVED_SUCCESS"
    case orderUpdatedSuccess = "ORDER_UPDATED_SUCCESS"
    case outletsFound = "OUTLETS_FOUND"
    case outletCreatedSuccess = "OUTLET_CREATED_SUCCESS"
    case outletDeletedSuccess = "OUTLET_DELETED_SUCCESS"
    case outletInfoUpdatedSuccess = "OUTLET_INFO_UPDATED_SUCCESS"

    // MARK: - Validation Errors
    case outletRequired = "OUTLET_REQUIRED"
    case outletStockRequired = "OUTLET_STOCK_REQUIRED"

    // MARK: - Success Messages
    case outletUpdatedSuccess = "OUTLET_UPDATED_SUCCESS"

    // MARK: - Password Errors
    case passwordChangedSuccess = "PASSWORD_CHANGED_SUCCESS"
    case passwordHashFailed = "PASSWORD_HASH_FAILED"
    case passwordResetLinkSent = "PASSWORD_RESET_LINK_SENT"
    case passwordResetSuccess = "PASSWORD_RESET_SUCCESS"
    case passwordUpdateFailed = "PASSWORD_UPDATE_FAILED"

    // MARK: - Success Messages
    case payloadValidationSuccess = "PAYLOAD_VALIDATION_SUCCESS"

    // MARK: - Business Logic Errors
    case paymentMethodAndTransactionIdRequired = "PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED"

    // MARK: - Conflict Errors
    case phoneAlreadyExists = "PHONE_ALREADY_EXISTS"

    // MARK: - Success Messages
    case planCreatedSuccess = "PLAN_CREATED_SUCCESS"
    case planDeletedSuccess = "PLAN_DELETED_SUCCESS"

    // MARK: - Business Logic Errors
    case planHasActiveSubscriptions = "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
    case planLimitAddonNotFound = "PLAN_LIMIT_ADDON_NOT_FOUND"

    // MARK: - Conflict Errors
    case planNameExists = "PLAN_NAME_EXISTS"

    // MARK: - Success Messages
    case planRetrievedSuccess = "PLAN_RETRIEVED_SUCCESS"
    case planUpdatedSuccess = "PLAN_UPDATED_SUCCESS"
    case previewSuccess = "PREVIEW_SUCCESS"
    case pricingConfigUpdatedSuccess = "PRICING_CONFIG_UPDATED_SUCCESS"
    case productsFetched = "PRODUCTS_FETCHED"
    case productsFound = "PRODUCTS_FOUND"

    // MARK: - Resource Specific Errors
    case productAccessDenied = "PRODUCT_ACCESS_DENIED"

    // MARK: - Success Messages
    case productAvailabilityFound = "PRODUCT_AVAILABILITY_FOUND"
    case productCreatedSuccess = "PRODUCT_CREATED_SUCCESS"
    case productDeletedSuccess = "PRODUCT_DELETED_SUCCESS"

    // MARK: - Conflict Errors
    case productNameExists = "PRODUCT_NAME_EXISTS"

    // MARK: - Resource Specific Errors
    case productOutletNotFound = "PRODUCT_OUTLET_NOT_FOUND"

    // MARK: - Success Messages
    case productRetrievedSuccess = "PRODUCT_RETRIEVED_SUCCESS"
    case productUpdatedSuccess = "PRODUCT_UPDATED_SUCCESS"
    case profileUpdatedSuccess = "PROFILE_UPDATED_SUCCESS"

    // MARK: - System Errors
    case qrCodeGenerationFailed = "QR_CODE_GENERATION_FAILED"

    // MARK: - Data Integrity Checks
    case recentOperationsWithoutLogs = "RECENT_OPERATIONS_WITHOUT_LOGS"

    // MARK: - System Errors
    case retrieveUsersFailed = "RETRIEVE_USERS_FAILED"

    // MARK: - Business Logic Errors
    case sessionCannotBeResumed = "SESSION_CANNOT_BE_RESUMED"
    case sessionCannotBeRolledBack = "SESSION_CANNOT_BE_ROLLED_BACK"

    // MARK: - Resource Specific Errors
    case sessionNotFound = "SESSION_NOT_FOUND"
    case someUsersNotFound = "SOME_USERS_NOT_FOUND"

    // MARK: - Business Logic Errors
    case subscriptionCreatedSuccess = "SUBSCRIPTION_CREATED_SUCCESS"
    case subscriptionError = "SUBSCRIPTION_ERROR"
    case subscriptionPausedSuccess = "SUBSCRIPTION_PAUSED_SUCCESS"
    case subscriptionRenewedSuccess = "SUBSCRIPTION_RENEWED_SUCCESS"
    case subscriptionStatusRetrieved = "SUBSCRIPTION_STATUS_RETRIEVED"

    // MARK: - System Errors
    case syncCheckFailed = "SYNC_CHECK_FAILED"
    case syncCheckSuccess = "SYNC_CHECK_SUCCESS"
    case syncCompleted = "SYNC_COMPLETED"
    case syncDataFetched = "SYNC_DATA_FETCHED"
    case syncFailed = "SYNC_FAILED"
    case syncPartiallyFailed = "SYNC_PARTIALLY_FAILED"
    case syncResumeFailed = "SYNC_RESUME_FAILED"

    // MARK: - Test Messages
    case testApiWorking = "TEST_API_WORKING"
    case testPostWorking = "TEST_POST_WORKING"

    // MARK: - System Errors
    case timeoutError = "TIMEOUT_ERROR"

    // MARK: - Success Messages
    case todayMetricsSuccess = "TODAY_METRICS_SUCCESS"

    // MARK: - Authentication & Authorization
    case tokenRequired = "TOKEN_REQUIRED"
    case tokenValid = "TOKEN_VALID"

    // MARK: - Success Messages
    case topProductsSuccess = "TOP_PRODUCTS_SUCCESS"

    // MARK: - System Errors
    case updateCategoryFailed = "UPDATE_CATEGORY_FAILED"
    case updateOrderFailed = "UPDATE_ORDER_FAILED"
    case updateOutletFailed = "UPDATE_OUTLET_FAILED"
    case updatePlanFailed = "UPDATE_PLAN_FAILED"
    case updatePricingFailed = "UPDATE_PRICING_FAILED"
    case updateProfileFailed = "UPDATE_PROFILE_FAILED"

    // MARK: - File Upload Errors
    case uploadImageFailed = "UPLOAD_IMAGE_FAILED"

    // MARK: - Success Messages
    case userAccountCreatedPendingVerification = "USER_ACCOUNT_CREATED_PENDING_VERIFICATION"
    case userAccountCreatedSuccess = "USER_ACCOUNT_CREATED_SUCCESS"
    case userCreatedSuccess = "USER_CREATED_SUCCESS"
    case userDeactivatedSuccess = "USER_DEACTIVATED_SUCCESS"
    case userDeletedSuccess = "USER_DELETED_SUCCESS"
    case userRetrievedSuccess = "USER_RETRIEVED_SUCCESS"
    case userUpdatedSuccess = "USER_UPDATED_SUCCESS"

    // MARK: - Validation Errors
    case validationFailed = "VALIDATION_FAILED"
    
    case uploadFailed = "UPLOAD_FAILED"
    
    // MARK: - Helper Methods
    
    /// Get default error message for this error code (localized)
    /// First tries to get from Localizable.strings using error code as key
    /// Falls back to APIErrorMessages.messages if not found
    var defaultMessage: String {
        // Try to get from Localizable.strings first (using error code as key)
        let localizedKey = self.rawValue
        let localizedMessage = localizedKey.localized()
        
        // If localization returns the key itself (not found), use fallback
        if localizedMessage == localizedKey {
            // Fallback to hardcoded messages
        let message = APIErrorMessages.messages[self] ?? "An error occurred"
        return message.localized()
        }
        
        return localizedMessage
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
    
    /// Initialize from HTTP status code
    /// Converts HTTP status code (including Alamofire error codes) to appropriate APIErrorCode
    init?(fromHTTPStatusCode statusCode: Int) {
        switch statusCode {
        // Success codes
        case 200:
            return nil // Success, no error code needed
        
        // Client errors (4xx)
        case 400:
            self = .validationError
        case 401:
            self = .unauthorized
        case 403:
            self = .forbidden
        case 404:
            self = .notFound
        case 409:
            self = .duplicateEntry
        case 413:
            self = .fileTooLarge
        case 422:
            self = .businessRuleViolation
        case 429:
            self = .rateLimitExceeded
        
        // Server errors (5xx)
        case 500:
            self = .internalServerError
        case 501:
            self = .featureNotImplemented
        case 503:
            self = .serviceUnavailable
        
        // Alamofire network error codes
        case -1009:
            self = .networkError
        case -1001:
            self = .unknownError // Timeout
        
        default:
            // For other status codes, try to find by matching httpStatusCode
            if let code = APIErrorCode.allCases.first(where: { $0.httpStatusCode == statusCode }) {
                self = code
            } else {
                self = .unknownError
            }
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
        .emailAlreadyVerified: "Your email is already verified. You can log in now.",
        .accountDeactivated: "Account is deactivated. Please contact support.",
        
        // Verification Errors
        .verificationEmailSent: "Verification email has been sent successfully.",
        .rateLimitExceeded: "Too many requests. Please wait a few minutes before requesting another verification email.",
        .emailSendFailed: "Failed to send verification email. Please try again later.",
        
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
        .subscriptionPastDue: "Your subscription payment is past due. Please update your payment method.",
        .noSubscription: "No active subscription found. Please subscribe to continue.",
        .subscriptionPeriodEnded: "Your subscription period has ended. Please renew to continue.",
        .subscriptionPeriodMissing: "Subscription period end date is missing. Please contact support.",
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
        .uploadFailed: "File upload failed",
    
        .accessDenied: "Access denied to this resource",
        .accessTokenRequired: "Access token is required",
        .accountDeletedSuccess: "Account deleted successfully",
        .allOrdersValidAmounts: "All non-cancelled orders have valid amounts",
        .allOrdersValidCustomers: "All orders have valid customer references",
        .allOrderItemsValidProducts: "All order items have valid product references",
        .allPaymentsValidOrders: "All payments have valid order references",
        .allProductsValidLevels: "All products have valid stock levels",
        .allProductsValidStock: "All products have consistent available stock calculations",
        .allUsersValidOutlets: "All users have valid outlet assignments",
        .apiKeysWorking: "API Keys endpoint is working!",
        .auditLogRetrievedSuccess: "Audit log retrieved successfully",
        .auditLogWorking: "Audit logging appears to be working correctly",
        .availabilityChecked: "Availability checked successfully",
        .awsS3TestFailed: "AWS S3 test failed",
        .bankAccountNotFound: "Bank account not found",
        .billingConfigUpdatedSuccess: "Billing configuration updated successfully",
        .businessNameExists: "Business name already exists",
        .cannotDeleteDefaultCategory: "Cannot delete the default \"General\" category. This category was created during registration and must remain active.",
        .cannotDeleteDefaultOutlet: "Cannot delete the default outlet. This is the main outlet created during registration and must remain active.",
        .cannotDeleteLastAdmin: "Cannot delete the last administrator. Please assign another administrator first.",
        .cannotDeleteSelf: "You cannot delete your own account. Please contact another administrator.",
        .cannotDetectEntity: "Cannot detect entity type from data",
        .categoriesFetched: "Categories retrieved successfully",
        .categoryCreatedSuccess: "Category created successfully",
        .categoryDeletedSuccess: "Category deleted successfully",
        .categoryRetrievedSuccess: "Category retrieved successfully",
        .categoryUpdatedSuccess: "Category updated successfully",
        .changePasswordFailed: "Failed to change password",
        .checkAuditLogFailed: "Failed to check audit log completeness",
        .checkDataConsistencyFailed: "Failed to check data consistency",
        .checkOrderCustomerIntegrityFailed: "Failed to check order-customer integrity",
        .checkOrderProductIntegrityFailed: "Failed to check order-product integrity",
        .checkOrphanedRecordsFailed: "Failed to check for orphaned records",
        .checkPaymentOrderIntegrityFailed: "Failed to check payment-order integrity",
        .checkProductStockFailed: "Failed to check product stock consistency",
        .checkUserOutletIntegrityFailed: "Failed to check user-outlet integrity",
        .cleanupFailed: "Cleanup operation failed",
        .createOutletFailed: "Failed to create outlet",
        .currencyRequired: "Currency is required",
        .currencyUpdatedSuccess: "Currency updated successfully",
        .customerCreatedSuccess: "Customer created successfully",
        .customerDeletedSuccess: "Customer deleted successfully",
        .customerHasActiveOrders: "Cannot delete customer with active orders. Please complete or cancel these orders first.",
        .customerRetrievedSuccess: "Customer retrieved successfully",
        .customerUpdatedSuccess: "Customer updated successfully",
        .dashboardDataSuccess: "Enhanced dashboard data retrieved successfully",
        .dataIntegrityCheckPassed: "All data integrity checks passed",
        .defaultOutletNotFound: "Default outlet not found",
        .deleteAccountFailed: "Failed to delete account",
        .deleteCategoryFailed: "Failed to delete category",
        .deviceRegisteredSuccess: "Device registered successfully",
        .deviceRegistrationFailed: "Device registration failed",
        .emailVerificationFailed: "Email verification failed",
        .emailVerifiedSuccess: "Email verified successfully",
        .fetchBillingCyclesFailed: "Failed to fetch billing cycles",
        .fetchBillingFailed: "Failed to fetch billing configuration",
        .fetchCategoriesFailed: "Failed to fetch category",
        .fetchPlanFailed: "Failed to fetch plan",
        .fetchPricingFailed: "Failed to fetch pricing configuration",
        .fetchSystemAnalyticsFailed: "Failed to fetch system analytics",
        .gatewayError: "Gateway error. The server is temporarily unavailable.",
        .growthMetricsSuccess: "Growth metrics retrieved successfully",
        .imageUploadFailed: "Image upload failed",
        .imageValidationFailed: "Image validation failed",
        .invalidAction: "Invalid action specified",
        .invalidCurrency: "Invalid currency code. Supported currencies: USD, VND",
        .invalidDate: "Invalid date",
        .invalidDateRange: "Invalid date range provided",
        .invalidEntityType: "Invalid entity type specified",
        .invalidFeaturesFormat: "Invalid features format",
        .invalidIdFormat: "Invalid ID format",
        .invalidJson: "Invalid JSON format",
        .invalidJsonData: "Invalid JSON data",
        .invalidLimitsFormat: "Invalid limits format",
        .invalidMerchantId: "Invalid merchant ID",
        .invalidOutletId: "Invalid outlet ID",
        .invalidOutletStock: "Invalid outlet stock data",
        .invalidQueryParameters: "Invalid query parameters",
        .invalidRentalDates: "Invalid rental dates",
        .invalidRequest: "Invalid request format",
        .invalidSessionId: "Invalid session ID",
        .invalidTenantKey: "Invalid tenant key provided",
        .invalidUserId: "Invalid user ID",
        .invalidUserRole: "Invalid user role",
        .loginSuccess: "Login successful",
        .logoutSuccess: "Logged out successfully",
        .manualPaymentCreatedSuccess: "Manual payment created successfully",
        .merchantAccountCreatedPendingVerification: "Merchant account created successfully. Please verify your email to activate your account",
        .merchantAccountCreatedSuccess: "Merchant account created successfully with default outlet and trial subscription",
        .merchantCreatedSuccess: "Merchant created successfully with default outlet",
        .merchantDeletedSuccess: "Merchant deleted successfully",
        .merchantHasActiveSubscription: "Cannot delete merchant with active subscription. Please cancel the subscription first.",
        .merchantInactive: "Merchant account is inactive",
        .merchantInfoUpdatedSuccess: "Merchant information updated successfully",
        .merchantRegisteredTrialSuccess: "Merchant registered successfully with 14-day free trial",
        .merchantRetrievedSuccess: "Merchant retrieved successfully",
        .merchantUpdatedSuccess: "Merchant updated successfully",
        .missingEndpointOrToken: "Missing endpoint or token in request",
        .missingEntities: "Missing entities in request",
        .missingEntityType: "Missing entity type in request",
        .missingFile: "No file provided",
        .missingMerchantId: "Merchant ID is required",
        .missingProductData: "Missing product data",
        .missingSessionId: "Session ID is required",
        .missingStagingKeys: "Missing staging keys",
        .mobileLoginSuccess: "Mobile login successful",
        .multipleEntitiesFound: "Multiple entities found with same identifier",
        .multipleEntitiesInFile: "Multiple entity types found in file",
        .noDefaultBankAccount: "No default bank account found",
        .noDefaultOutlet: "No default outlet found for merchant",
        .noEntitiesToImport: "No entities to import",
        .noFieldsToUpdate: "No fields to update",
        .noImageFile: "No image file provided",
        .noOrphanedOrderItems: "No orphaned order items found",
        .noValidFields: "No valid fields to update",
        .orderAnalyticsSuccess: "Order analytics retrieved successfully",
        .orderCreatedSuccess: "Order created successfully",
        .orderRetrievedSuccess: "Order retrieved successfully",
        .orderUpdatedSuccess: "Order updated successfully",
        .outletsFound: "Outlets retrieved successfully",
        .outletCreatedSuccess: "Outlet created successfully",
        .outletDeletedSuccess: "Outlet deleted successfully",
        .outletInfoUpdatedSuccess: "Outlet information updated successfully",
        .outletRequired: "Outlet ID is required",
        .outletStockRequired: "Outlet stock information is required",
        .outletUpdatedSuccess: "Outlet updated successfully",
        .passwordChangedSuccess: "Password changed successfully",
        .passwordHashFailed: "Failed to hash password",
        .passwordResetLinkSent: "If an account with that email exists, a password reset link has been sent",
        .passwordResetSuccess: "Password has been reset successfully",
        .passwordUpdateFailed: "Failed to update password",
        .payloadValidationSuccess: "Payload validation successful",
        .paymentMethodAndTransactionIdRequired: "Payment method and transaction ID are required",
        .phoneAlreadyExists: "Phone number already exists",
        .planCreatedSuccess: "Plan created successfully",
        .planDeletedSuccess: "Plan deleted successfully",
        .planHasActiveSubscriptions: "Cannot delete plan with active subscriptions. Please wait for subscriptions to expire or cancel them first.",
        .planLimitAddonNotFound: "Plan limit addon not found",
        .planNameExists: "A plan with this name already exists",
        .planRetrievedSuccess: "Plan retrieved successfully",
        .planUpdatedSuccess: "Plan updated successfully",
        .previewSuccess: "Preview operation completed successfully",
        .pricingConfigUpdatedSuccess: "Pricing configuration updated successfully",
        .productsFetched: "Products retrieved successfully",
        .productsFound: "Products retrieved successfully",
        .productAccessDenied: "Access denied to this product",
        .productAvailabilityFound: "Product availability retrieved successfully",
        .productCreatedSuccess: "Product created successfully",
        .productDeletedSuccess: "Product deleted successfully",
        .productNameExists: "A product with this name already exists. Please choose a different name.",
        .productOutletNotFound: "Product not found in specified outlet",
        .productRetrievedSuccess: "Product retrieved successfully",
        .productUpdatedSuccess: "Product updated successfully",
        .profileUpdatedSuccess: "Profile updated successfully",
        .qrCodeGenerationFailed: "Failed to generate QR code",
        .recentOperationsWithoutLogs: "Recent operations found without corresponding audit logs",
        .retrieveUsersFailed: "Failed to retrieve users",
        .sessionCannotBeResumed: "Session cannot be resumed",
        .sessionCannotBeRolledBack: "Session cannot be rolled back",
        .sessionNotFound: "Session not found",
        .someUsersNotFound: "Some users were not found",
        .subscriptionCreatedSuccess: "Subscription created successfully",
        .subscriptionError: "Subscription error",
        .subscriptionPausedSuccess: "Subscription paused successfully",
        .subscriptionRenewedSuccess: "Subscription renewed successfully",
        .subscriptionStatusRetrieved: "Subscription status retrieved successfully",
        .syncCheckFailed: "Sync check failed",
        .syncCheckSuccess: "Sync check completed",
        .syncCompleted: "Sync operation completed successfully",
        .syncDataFetched: "Sync data retrieved successfully",
        .syncFailed: "Sync operation failed",
        .syncPartiallyFailed: "Sync operation partially failed",
        .syncResumeFailed: "Failed to resume sync operation",
        .testApiWorking: "Test API working",
        .testPostWorking: "Test POST working",
        .timeoutError: "Request timeout. Please try again.",
        .todayMetricsSuccess: "Today metrics retrieved successfully",
        .tokenRequired: "Token is required",
        .tokenValid: "Token is valid",
        .topProductsSuccess: "Top products retrieved successfully",
        .updateCategoryFailed: "Failed to update category",
        .updateOrderFailed: "Failed to update order",
        .updateOutletFailed: "Failed to update outlet",
        .updatePlanFailed: "Failed to update plan",
        .updatePricingFailed: "Failed to update pricing configuration",
        .updateProfileFailed: "Failed to update user profile",
        .uploadImageFailed: "Failed to upload image",
        .userAccountCreatedPendingVerification: "User account created successfully. Please verify your email to activate your account",
        .userAccountCreatedSuccess: "User account created successfully",
        .userCreatedSuccess: "User created successfully",
        .userDeactivatedSuccess: "User deactivated successfully",
        .userDeletedSuccess: "User deleted successfully",
        .userRetrievedSuccess: "User retrieved successfully",
        .userUpdatedSuccess: "User updated successfully",
        .validationFailed: "Validation failed",
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
        .emailAlreadyVerified: 400,
        .accountDeactivated: 403,
        
        // Verification Errors
        .verificationEmailSent: 200,
        .rateLimitExceeded: 429,
        .emailSendFailed: 500,
        
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
        .subscriptionPastDue: 402,
        .noSubscription: 402,
        .subscriptionPeriodEnded: 402,
        .subscriptionPeriodMissing: 400,
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
        .uploadFailed: 500,
    
        .accessDenied: 403,
        .accessTokenRequired: 500,
        .accountDeletedSuccess: 200,
        .allOrdersValidAmounts: 500,
        .allOrdersValidCustomers: 500,
        .allOrderItemsValidProducts: 500,
        .allPaymentsValidOrders: 500,
        .allProductsValidLevels: 500,
        .allProductsValidStock: 500,
        .allUsersValidOutlets: 500,
        .apiKeysWorking: 500,
        .auditLogRetrievedSuccess: 200,
        .auditLogWorking: 500,
        .availabilityChecked: 500,
        .awsS3TestFailed: 500,
        .bankAccountNotFound: 500,
        .billingConfigUpdatedSuccess: 200,
        .businessNameExists: 500,
        .cannotDeleteDefaultCategory: 500,
        .cannotDeleteDefaultOutlet: 500,
        .cannotDeleteLastAdmin: 500,
        .cannotDeleteSelf: 500,
        .cannotDetectEntity: 500,
        .categoriesFetched: 500,
        .categoryCreatedSuccess: 200,
        .categoryDeletedSuccess: 200,
        .categoryRetrievedSuccess: 200,
        .categoryUpdatedSuccess: 200,
        .changePasswordFailed: 500,
        .checkAuditLogFailed: 500,
        .checkDataConsistencyFailed: 500,
        .checkOrderCustomerIntegrityFailed: 500,
        .checkOrderProductIntegrityFailed: 500,
        .checkOrphanedRecordsFailed: 500,
        .checkPaymentOrderIntegrityFailed: 500,
        .checkProductStockFailed: 500,
        .checkUserOutletIntegrityFailed: 500,
        .cleanupFailed: 500,
        .createOutletFailed: 500,
        .currencyRequired: 500,
        .currencyUpdatedSuccess: 200,
        .customerCreatedSuccess: 200,
        .customerDeletedSuccess: 200,
        .customerHasActiveOrders: 500,
        .customerRetrievedSuccess: 200,
        .customerUpdatedSuccess: 200,
        .dashboardDataSuccess: 200,
        .dataIntegrityCheckPassed: 500,
        .defaultOutletNotFound: 404,
        .deleteAccountFailed: 500,
        .deleteCategoryFailed: 500,
        .deviceRegisteredSuccess: 200,
        .deviceRegistrationFailed: 500,
        .emailVerificationFailed: 500,
        .emailVerifiedSuccess: 200,
        .fetchBillingCyclesFailed: 500,
        .fetchBillingFailed: 500,
        .fetchCategoriesFailed: 500,
        .fetchPlanFailed: 500,
        .fetchPricingFailed: 500,
        .fetchSystemAnalyticsFailed: 500,
        .gatewayError: 503,
        .growthMetricsSuccess: 200,
        .imageUploadFailed: 500,
        .imageValidationFailed: 500,
        .invalidAction: 400,
        .invalidCurrency: 400,
        .invalidDate: 400,
        .invalidDateRange: 400,
        .invalidEntityType: 400,
        .invalidFeaturesFormat: 400,
        .invalidIdFormat: 400,
        .invalidJson: 400,
        .invalidJsonData: 400,
        .invalidLimitsFormat: 400,
        .invalidMerchantId: 400,
        .invalidOutletId: 400,
        .invalidOutletStock: 400,
        .invalidQueryParameters: 400,
        .invalidRentalDates: 400,
        .invalidRequest: 400,
        .invalidSessionId: 400,
        .invalidTenantKey: 400,
        .invalidUserId: 400,
        .invalidUserRole: 400,
        .loginSuccess: 200,
        .logoutSuccess: 200,
        .manualPaymentCreatedSuccess: 200,
        .merchantAccountCreatedPendingVerification: 500,
        .merchantAccountCreatedSuccess: 200,
        .merchantCreatedSuccess: 200,
        .merchantDeletedSuccess: 200,
        .merchantHasActiveSubscription: 500,
        .merchantInactive: 500,
        .merchantInfoUpdatedSuccess: 200,
        .merchantRegisteredTrialSuccess: 200,
        .merchantRetrievedSuccess: 200,
        .merchantUpdatedSuccess: 200,
        .missingEndpointOrToken: 400,
        .missingEntities: 400,
        .missingEntityType: 400,
        .missingFile: 400,
        .missingMerchantId: 400,
        .missingProductData: 400,
        .missingSessionId: 400,
        .missingStagingKeys: 400,
        .mobileLoginSuccess: 200,
        .multipleEntitiesFound: 500,
        .multipleEntitiesInFile: 500,
        .noDefaultBankAccount: 404,
        .noDefaultOutlet: 404,
        .noEntitiesToImport: 404,
        .noFieldsToUpdate: 404,
        .noImageFile: 404,
        .noOrphanedOrderItems: 404,
        .noValidFields: 404,
        .orderAnalyticsSuccess: 200,
        .orderCreatedSuccess: 200,
        .orderRetrievedSuccess: 200,
        .orderUpdatedSuccess: 200,
        .outletsFound: 500,
        .outletCreatedSuccess: 200,
        .outletDeletedSuccess: 200,
        .outletInfoUpdatedSuccess: 200,
        .outletRequired: 500,
        .outletStockRequired: 500,
        .outletUpdatedSuccess: 200,
        .passwordChangedSuccess: 200,
        .passwordHashFailed: 500,
        .passwordResetLinkSent: 500,
        .passwordResetSuccess: 200,
        .passwordUpdateFailed: 500,
        .payloadValidationSuccess: 200,
        .paymentMethodAndTransactionIdRequired: 500,
        .phoneAlreadyExists: 500,
        .planCreatedSuccess: 200,
        .planDeletedSuccess: 200,
        .planHasActiveSubscriptions: 500,
        .planLimitAddonNotFound: 500,
        .planNameExists: 500,
        .planRetrievedSuccess: 200,
        .planUpdatedSuccess: 200,
        .previewSuccess: 200,
        .pricingConfigUpdatedSuccess: 200,
        .productsFetched: 500,
        .productsFound: 500,
        .productAccessDenied: 500,
        .productAvailabilityFound: 500,
        .productCreatedSuccess: 200,
        .productDeletedSuccess: 200,
        .productNameExists: 500,
        .productOutletNotFound: 500,
        .productRetrievedSuccess: 200,
        .productUpdatedSuccess: 200,
        .profileUpdatedSuccess: 200,
        .qrCodeGenerationFailed: 500,
        .recentOperationsWithoutLogs: 500,
        .retrieveUsersFailed: 500,
        .sessionCannotBeResumed: 500,
        .sessionCannotBeRolledBack: 500,
        .sessionNotFound: 500,
        .someUsersNotFound: 500,
        .subscriptionCreatedSuccess: 200,
        .subscriptionError: 500,
        .subscriptionPausedSuccess: 200,
        .subscriptionRenewedSuccess: 200,
        .subscriptionStatusRetrieved: 500,
        .syncCheckFailed: 500,
        .syncCheckSuccess: 200,
        .syncCompleted: 500,
        .syncDataFetched: 500,
        .syncFailed: 500,
        .syncPartiallyFailed: 500,
        .syncResumeFailed: 500,
        .testApiWorking: 500,
        .testPostWorking: 500,
        .timeoutError: 503,
        .todayMetricsSuccess: 200,
        .tokenRequired: 500,
        .tokenValid: 500,
        .topProductsSuccess: 200,
        .updateCategoryFailed: 500,
        .updateOrderFailed: 500,
        .updateOutletFailed: 500,
        .updatePlanFailed: 500,
        .updatePricingFailed: 500,
        .updateProfileFailed: 500,
        .uploadImageFailed: 500,
        .userAccountCreatedPendingVerification: 500,
        .userAccountCreatedSuccess: 200,
        .userCreatedSuccess: 200,
        .userDeactivatedSuccess: 200,
        .userDeletedSuccess: 200,
        .userRetrievedSuccess: 200,
        .userUpdatedSuccess: 200,
        .validationFailed: 400,
    ]
}

// MARK: - API Error Response Model

struct APIErrorResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case error
    }
    
    /// Get error code enum from response
    var errorCode: APIErrorCode? {
        guard let code = code, !code.isEmpty else { return nil }
        return APIErrorCode(from: code)
    }
    
    /// Get localized error message
    var localizedMessage: String {
        if let errorCode = errorCode {
            return errorCode.defaultMessage
        }
        return (message ?? error ?? "An error occurred").localized()
    }
    
    /// Get HTTP status code
    var httpStatusCode: Int {
        return errorCode?.httpStatusCode ?? 500
    }
    
    /// Convert to NSError
    func toNSError(httpStatusCode: Int? = nil, domain: String = "RC") -> NSError {
        let statusCode = httpStatusCode ?? self.httpStatusCode
        return NSError.errorWithOwnMessage(
            message: localizedMessage,
            domain: domain,
            code: statusCode
        )
    }
    
    /// Get user-friendly error message (backward compatibility)
    var userMessage: String {
        return localizedMessage
    }
    
    /// Get HTTP status code (backward compatibility)
    var statusCode: Int {
        return httpStatusCode
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

