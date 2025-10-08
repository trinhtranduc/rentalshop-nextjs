'use strict';

var CONSTANTS = require('@rentalshop/constants');
var React = require('react');
var zod = require('zod');
var dateFns = require('date-fns');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var CONSTANTS__default = /*#__PURE__*/_interopDefault(CONSTANTS);
var React__default = /*#__PURE__*/_interopDefault(React);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/core/string-utils.ts
exports.formatPhoneNumber = void 0; exports.generateSlug = void 0; exports.truncateText = void 0; exports.isValidEmail = void 0; exports.isValidPhone = void 0; exports.capitalizeWords = void 0; exports.normalizeWhitespace = void 0; exports.generateRandomString = void 0; exports.isEmpty = void 0; exports.getInitials = void 0;
var init_string_utils = __esm({
  "src/core/string-utils.ts"() {
    exports.formatPhoneNumber = (phone) => {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      } else if (cleaned.length === 11) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
      }
      return phone;
    };
    exports.generateSlug = (text) => {
      return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    };
    exports.truncateText = (text, maxLength) => {
      if (text.length <= maxLength)
        return text;
      return text.slice(0, maxLength) + "...";
    };
    exports.isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    exports.isValidPhone = (phone) => {
      const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
      return phoneRegex.test(phone.replace(/\s/g, ""));
    };
    exports.capitalizeWords = (text) => {
      return text.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    };
    exports.normalizeWhitespace = (text) => {
      return text.replace(/\s+/g, " ").trim();
    };
    exports.generateRandomString = (length) => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    exports.isEmpty = (text) => {
      return !text || text.trim().length === 0;
    };
    exports.getInitials = (name) => {
      return name.split(" ").map((word) => word.charAt(0).toUpperCase()).join("").slice(0, 2);
    };
  }
});

// src/core/function-utils.ts
exports.debounce = void 0; exports.throttle = void 0; exports.memoize = void 0; exports.retry = void 0; exports.once = void 0; exports.delay = void 0; exports.timeout = void 0;
var init_function_utils = __esm({
  "src/core/function-utils.ts"() {
    exports.debounce = (func, wait) => {
      let timeout2;
      return (...args) => {
        clearTimeout(timeout2);
        timeout2 = setTimeout(() => func(...args), wait);
      };
    };
    exports.throttle = (func, limit) => {
      let inThrottle;
      return (...args) => {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    };
    exports.memoize = (func, keyGenerator) => {
      const cache = /* @__PURE__ */ new Map();
      return (...args) => {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
        if (cache.has(key)) {
          return cache.get(key);
        }
        const result = func(...args);
        cache.set(key, result);
        return result;
      };
    };
    exports.retry = async (fn, maxAttempts = 3, baseDelay = 1e3) => {
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (attempt === maxAttempts) {
            throw lastError;
          }
          const delay2 = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay2));
        }
      }
      throw lastError;
    };
    exports.once = (func) => {
      let called = false;
      let result;
      return (...args) => {
        if (!called) {
          called = true;
          result = func(...args);
        }
        return result;
      };
    };
    exports.delay = (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };
    exports.timeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Operation timed out")), ms)
        )
      ]);
    };
  }
});
function isSuccessResponse(response) {
  return response.success === true;
}
function isErrorResponse(response) {
  return response.success === false;
}
function createErrorResponse(code, message, details, field) {
  return {
    success: false,
    message: message || exports.ERROR_MESSAGES[code],
    error: code,
    details,
    field
  };
}
function createSuccessResponse(data, message) {
  return {
    success: true,
    data,
    message
  };
}
function handlePrismaError(error) {
  console.error("\u{1F50D} Prisma Error Details:", {
    code: error.code,
    message: error.message,
    meta: error.meta
  });
  switch (error.code) {
    case "P2002": {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target[0] : target;
      if (field?.includes("email")) {
        return new exports.ApiError(
          "EMAIL_EXISTS" /* EMAIL_EXISTS */,
          `Email address is already registered`,
          `Field: ${field}`,
          "email"
        );
      }
      if (field?.includes("phone")) {
        return new exports.ApiError(
          "PHONE_EXISTS" /* PHONE_EXISTS */,
          `Phone number is already registered`,
          `Field: ${field}`,
          "phone"
        );
      }
      return new exports.ApiError(
        "DUPLICATE_ENTRY" /* DUPLICATE_ENTRY */,
        "Record with this information already exists",
        `Field: ${field}`
      );
    }
    case "P2003": {
      const fieldName = error.meta?.field_name;
      return new exports.ApiError(
        "FOREIGN_KEY_CONSTRAINT" /* FOREIGN_KEY_CONSTRAINT */,
        `Invalid reference: ${fieldName}`,
        `Field: ${fieldName}`
      );
    }
    case "P2025": {
      return new exports.ApiError(
        "NOT_FOUND" /* NOT_FOUND */,
        "Record not found",
        error.message
      );
    }
    case "P2014": {
      return new exports.ApiError(
        "BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */,
        "Cannot perform this operation due to existing relationships",
        error.message
      );
    }
    default: {
      return new exports.ApiError(
        "DATABASE_ERROR" /* DATABASE_ERROR */,
        "Database operation failed",
        error.message
      );
    }
  }
}
function handleValidationError(error) {
  if (error.name === "ZodError") {
    const firstError = error.errors[0];
    const field = firstError.path.join(".");
    return new exports.ApiError(
      "VALIDATION_ERROR" /* VALIDATION_ERROR */,
      firstError.message,
      `Field: ${field}`,
      field
    );
  }
  return new exports.ApiError(
    "INVALID_INPUT" /* INVALID_INPUT */,
    error.message || "Validation failed"
  );
}
function handleBusinessError(error) {
  if (error instanceof exports.ApiError) {
    return error;
  }
  if (error.message?.includes("not found")) {
    if (error.message.includes("Merchant")) {
      return new exports.ApiError("MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Outlet")) {
      return new exports.ApiError("OUTLET_NOT_FOUND" /* OUTLET_NOT_FOUND */, error.message);
    }
    if (error.message.includes("User")) {
      return new exports.ApiError("USER_NOT_FOUND" /* USER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Product")) {
      return new exports.ApiError("PRODUCT_NOT_FOUND" /* PRODUCT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Order")) {
      return new exports.ApiError("ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Customer")) {
      return new exports.ApiError("CUSTOMER_NOT_FOUND" /* CUSTOMER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Category")) {
      return new exports.ApiError("CATEGORY_NOT_FOUND" /* CATEGORY_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Plan")) {
      return new exports.ApiError("PLAN_NOT_FOUND" /* PLAN_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Subscription")) {
      return new exports.ApiError("SUBSCRIPTION_NOT_FOUND" /* SUBSCRIPTION_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Payment")) {
      return new exports.ApiError("PAYMENT_NOT_FOUND" /* PAYMENT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Audit log")) {
      return new exports.ApiError("AUDIT_LOG_NOT_FOUND" /* AUDIT_LOG_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Billing cycle")) {
      return new exports.ApiError("BILLING_CYCLE_NOT_FOUND" /* BILLING_CYCLE_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Plan variant")) {
      return new exports.ApiError("PLAN_VARIANT_NOT_FOUND" /* PLAN_VARIANT_NOT_FOUND */, error.message);
    }
  }
  if (error.message?.includes("already registered")) {
    if (error.message.includes("Email")) {
      return new exports.ApiError("EMAIL_EXISTS" /* EMAIL_EXISTS */, error.message);
    }
    if (error.message.includes("Phone")) {
      return new exports.ApiError("PHONE_EXISTS" /* PHONE_EXISTS */, error.message);
    }
  }
  if (error.message?.includes("already exists")) {
    if (error.message.includes("order")) {
      return new exports.ApiError("ORDER_ALREADY_EXISTS" /* ORDER_ALREADY_EXISTS */, error.message);
    }
  }
  if (error.message?.includes("Plan limit")) {
    return new exports.ApiError("PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */, error.message);
  }
  if (error.message?.includes("permission")) {
    return new exports.ApiError("INSUFFICIENT_PERMISSIONS" /* INSUFFICIENT_PERMISSIONS */, error.message);
  }
  if (error.message?.includes("deactivated")) {
    return new exports.ApiError("ACCOUNT_DEACTIVATED" /* ACCOUNT_DEACTIVATED */, error.message);
  }
  if (error.message?.includes("subscription")) {
    if (error.message.includes("expired")) {
      return new exports.ApiError("SUBSCRIPTION_EXPIRED" /* SUBSCRIPTION_EXPIRED */, error.message);
    }
    if (error.message.includes("cancelled")) {
      return new exports.ApiError("SUBSCRIPTION_CANCELLED" /* SUBSCRIPTION_CANCELLED */, error.message);
    }
    if (error.message.includes("paused")) {
      return new exports.ApiError("SUBSCRIPTION_PAUSED" /* SUBSCRIPTION_PAUSED */, error.message);
    }
  }
  if (error.message?.includes("trial")) {
    if (error.message.includes("expired")) {
      return new exports.ApiError("TRIAL_EXPIRED" /* TRIAL_EXPIRED */, error.message);
    }
  }
  if (error.message?.includes("out of stock")) {
    return new exports.ApiError("PRODUCT_OUT_OF_STOCK" /* PRODUCT_OUT_OF_STOCK */, error.message);
  }
  if (error.message?.includes("payment")) {
    if (error.message.includes("failed")) {
      return new exports.ApiError("PAYMENT_FAILED" /* PAYMENT_FAILED */, error.message);
    }
    if (error.message.includes("invalid")) {
      return new exports.ApiError("INVALID_PAYMENT_METHOD" /* INVALID_PAYMENT_METHOD */, error.message);
    }
  }
  if (error.message?.includes("invalid order status")) {
    return new exports.ApiError("INVALID_ORDER_STATUS" /* INVALID_ORDER_STATUS */, error.message);
  }
  return new exports.ApiError(
    "BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */,
    error.message || "Business rule violation"
  );
}
function handleApiError(error) {
  console.error("\u{1F6A8} API Error:", error);
  let apiError;
  if (error instanceof exports.ApiError) {
    apiError = error;
  } else if (error.code && error.code.startsWith("P")) {
    apiError = handlePrismaError(error);
  } else if (error.name === "ZodError") {
    apiError = handleValidationError(error);
  } else {
    apiError = handleBusinessError(error);
  }
  const response = createErrorResponse(
    apiError.code,
    apiError.message,
    apiError.details,
    apiError.field
  );
  return {
    response,
    statusCode: apiError.statusCode
  };
}
var API; exports.ErrorCode = void 0; exports.ERROR_MESSAGES = void 0; exports.ERROR_STATUS_CODES = void 0; exports.ApiError = void 0; exports.ValidationError = void 0; exports.DuplicateError = void 0; exports.NotFoundError = void 0; exports.UnauthorizedError = void 0; exports.ForbiddenError = void 0; exports.PlanLimitError = void 0; exports.isAuthError = void 0; exports.isPermissionError = void 0; var isSubscriptionErrorNew; exports.isNetworkError = void 0; exports.isValidationError = void 0; exports.analyzeError = void 0;
var init_errors = __esm({
  "src/core/errors.ts"() {
    init_common();
    API = CONSTANTS__default.default.API;
    exports.ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
      ErrorCode2["UNAUTHORIZED"] = "UNAUTHORIZED";
      ErrorCode2["FORBIDDEN"] = "FORBIDDEN";
      ErrorCode2["INVALID_TOKEN"] = "INVALID_TOKEN";
      ErrorCode2["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
      ErrorCode2["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
      ErrorCode2["VALIDATION_ERROR"] = "VALIDATION_ERROR";
      ErrorCode2["INVALID_INPUT"] = "INVALID_INPUT";
      ErrorCode2["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
      ErrorCode2["DATABASE_ERROR"] = "DATABASE_ERROR";
      ErrorCode2["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
      ErrorCode2["FOREIGN_KEY_CONSTRAINT"] = "FOREIGN_KEY_CONSTRAINT";
      ErrorCode2["NOT_FOUND"] = "NOT_FOUND";
      ErrorCode2["PLAN_LIMIT_EXCEEDED"] = "PLAN_LIMIT_EXCEEDED";
      ErrorCode2["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
      ErrorCode2["BUSINESS_RULE_VIOLATION"] = "BUSINESS_RULE_VIOLATION";
      ErrorCode2["ACCOUNT_DEACTIVATED"] = "ACCOUNT_DEACTIVATED";
      ErrorCode2["SUBSCRIPTION_EXPIRED"] = "SUBSCRIPTION_EXPIRED";
      ErrorCode2["SUBSCRIPTION_CANCELLED"] = "SUBSCRIPTION_CANCELLED";
      ErrorCode2["SUBSCRIPTION_PAUSED"] = "SUBSCRIPTION_PAUSED";
      ErrorCode2["TRIAL_EXPIRED"] = "TRIAL_EXPIRED";
      ErrorCode2["ORDER_ALREADY_EXISTS"] = "ORDER_ALREADY_EXISTS";
      ErrorCode2["PRODUCT_OUT_OF_STOCK"] = "PRODUCT_OUT_OF_STOCK";
      ErrorCode2["INVALID_ORDER_STATUS"] = "INVALID_ORDER_STATUS";
      ErrorCode2["PAYMENT_FAILED"] = "PAYMENT_FAILED";
      ErrorCode2["INVALID_PAYMENT_METHOD"] = "INVALID_PAYMENT_METHOD";
      ErrorCode2["EMAIL_EXISTS"] = "EMAIL_EXISTS";
      ErrorCode2["PHONE_EXISTS"] = "PHONE_EXISTS";
      ErrorCode2["USER_NOT_FOUND"] = "USER_NOT_FOUND";
      ErrorCode2["MERCHANT_NOT_FOUND"] = "MERCHANT_NOT_FOUND";
      ErrorCode2["OUTLET_NOT_FOUND"] = "OUTLET_NOT_FOUND";
      ErrorCode2["PRODUCT_NOT_FOUND"] = "PRODUCT_NOT_FOUND";
      ErrorCode2["ORDER_NOT_FOUND"] = "ORDER_NOT_FOUND";
      ErrorCode2["CUSTOMER_NOT_FOUND"] = "CUSTOMER_NOT_FOUND";
      ErrorCode2["CATEGORY_NOT_FOUND"] = "CATEGORY_NOT_FOUND";
      ErrorCode2["PLAN_NOT_FOUND"] = "PLAN_NOT_FOUND";
      ErrorCode2["SUBSCRIPTION_NOT_FOUND"] = "SUBSCRIPTION_NOT_FOUND";
      ErrorCode2["PAYMENT_NOT_FOUND"] = "PAYMENT_NOT_FOUND";
      ErrorCode2["AUDIT_LOG_NOT_FOUND"] = "AUDIT_LOG_NOT_FOUND";
      ErrorCode2["BILLING_CYCLE_NOT_FOUND"] = "BILLING_CYCLE_NOT_FOUND";
      ErrorCode2["PLAN_VARIANT_NOT_FOUND"] = "PLAN_VARIANT_NOT_FOUND";
      ErrorCode2["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
      ErrorCode2["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
      ErrorCode2["NETWORK_ERROR"] = "NETWORK_ERROR";
      ErrorCode2["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
      ErrorCode2["INVALID_FILE_TYPE"] = "INVALID_FILE_TYPE";
      ErrorCode2["UPLOAD_FAILED"] = "UPLOAD_FAILED";
      return ErrorCode2;
    })(exports.ErrorCode || {});
    exports.ERROR_MESSAGES = {
      // Authentication & Authorization
      ["UNAUTHORIZED" /* UNAUTHORIZED */]: "Authentication required",
      ["FORBIDDEN" /* FORBIDDEN */]: "Access denied",
      ["INVALID_TOKEN" /* INVALID_TOKEN */]: "Invalid authentication token",
      ["TOKEN_EXPIRED" /* TOKEN_EXPIRED */]: "Authentication token has expired",
      ["INVALID_CREDENTIALS" /* INVALID_CREDENTIALS */]: "Invalid email or password",
      // Validation Errors
      ["VALIDATION_ERROR" /* VALIDATION_ERROR */]: "Input validation failed",
      ["INVALID_INPUT" /* INVALID_INPUT */]: "Invalid input provided",
      ["MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */]: "Required field is missing",
      // Database Errors
      ["DATABASE_ERROR" /* DATABASE_ERROR */]: "Database operation failed",
      ["DUPLICATE_ENTRY" /* DUPLICATE_ENTRY */]: "Record already exists",
      ["FOREIGN_KEY_CONSTRAINT" /* FOREIGN_KEY_CONSTRAINT */]: "Invalid reference",
      ["NOT_FOUND" /* NOT_FOUND */]: "Resource not found",
      // Business Logic Errors
      ["PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */]: "Plan limit exceeded",
      ["INSUFFICIENT_PERMISSIONS" /* INSUFFICIENT_PERMISSIONS */]: "Insufficient permissions",
      ["BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */]: "Business rule violation",
      ["ACCOUNT_DEACTIVATED" /* ACCOUNT_DEACTIVATED */]: "Account is deactivated",
      ["SUBSCRIPTION_EXPIRED" /* SUBSCRIPTION_EXPIRED */]: "Subscription has expired",
      ["SUBSCRIPTION_CANCELLED" /* SUBSCRIPTION_CANCELLED */]: "Subscription has been cancelled",
      ["SUBSCRIPTION_PAUSED" /* SUBSCRIPTION_PAUSED */]: "Subscription is paused",
      ["TRIAL_EXPIRED" /* TRIAL_EXPIRED */]: "Trial period has expired",
      ["ORDER_ALREADY_EXISTS" /* ORDER_ALREADY_EXISTS */]: "Order already exists",
      ["PRODUCT_OUT_OF_STOCK" /* PRODUCT_OUT_OF_STOCK */]: "Product is out of stock",
      ["INVALID_ORDER_STATUS" /* INVALID_ORDER_STATUS */]: "Invalid order status",
      ["PAYMENT_FAILED" /* PAYMENT_FAILED */]: "Payment processing failed",
      ["INVALID_PAYMENT_METHOD" /* INVALID_PAYMENT_METHOD */]: "Invalid payment method",
      // Resource Specific Errors
      ["EMAIL_EXISTS" /* EMAIL_EXISTS */]: "Email address is already registered",
      ["PHONE_EXISTS" /* PHONE_EXISTS */]: "Phone number is already registered",
      ["USER_NOT_FOUND" /* USER_NOT_FOUND */]: "User not found",
      ["MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */]: "Merchant not found",
      ["OUTLET_NOT_FOUND" /* OUTLET_NOT_FOUND */]: "Outlet not found",
      ["PRODUCT_NOT_FOUND" /* PRODUCT_NOT_FOUND */]: "Product not found",
      ["ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */]: "Order not found",
      ["CUSTOMER_NOT_FOUND" /* CUSTOMER_NOT_FOUND */]: "Customer not found",
      ["CATEGORY_NOT_FOUND" /* CATEGORY_NOT_FOUND */]: "Category not found",
      ["PLAN_NOT_FOUND" /* PLAN_NOT_FOUND */]: "Plan not found",
      ["SUBSCRIPTION_NOT_FOUND" /* SUBSCRIPTION_NOT_FOUND */]: "Subscription not found",
      ["PAYMENT_NOT_FOUND" /* PAYMENT_NOT_FOUND */]: "Payment not found",
      ["AUDIT_LOG_NOT_FOUND" /* AUDIT_LOG_NOT_FOUND */]: "Audit log not found",
      ["BILLING_CYCLE_NOT_FOUND" /* BILLING_CYCLE_NOT_FOUND */]: "Billing cycle not found",
      ["PLAN_VARIANT_NOT_FOUND" /* PLAN_VARIANT_NOT_FOUND */]: "Plan variant not found",
      // System Errors
      ["INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */]: "Internal server error",
      ["SERVICE_UNAVAILABLE" /* SERVICE_UNAVAILABLE */]: "Service temporarily unavailable",
      ["NETWORK_ERROR" /* NETWORK_ERROR */]: "Network error occurred",
      // File Upload Errors
      ["FILE_TOO_LARGE" /* FILE_TOO_LARGE */]: "File size exceeds limit",
      ["INVALID_FILE_TYPE" /* INVALID_FILE_TYPE */]: "Invalid file type",
      ["UPLOAD_FAILED" /* UPLOAD_FAILED */]: "File upload failed"
    };
    exports.ERROR_STATUS_CODES = {
      // Authentication & Authorization (4xx)
      ["UNAUTHORIZED" /* UNAUTHORIZED */]: 401,
      ["FORBIDDEN" /* FORBIDDEN */]: 403,
      ["INVALID_TOKEN" /* INVALID_TOKEN */]: 401,
      ["TOKEN_EXPIRED" /* TOKEN_EXPIRED */]: 401,
      ["INVALID_CREDENTIALS" /* INVALID_CREDENTIALS */]: 401,
      // Validation Errors (4xx)
      ["VALIDATION_ERROR" /* VALIDATION_ERROR */]: 400,
      ["INVALID_INPUT" /* INVALID_INPUT */]: 400,
      ["MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */]: 400,
      // Database Errors (4xx/5xx)
      ["DATABASE_ERROR" /* DATABASE_ERROR */]: 500,
      ["DUPLICATE_ENTRY" /* DUPLICATE_ENTRY */]: 409,
      ["FOREIGN_KEY_CONSTRAINT" /* FOREIGN_KEY_CONSTRAINT */]: 400,
      ["NOT_FOUND" /* NOT_FOUND */]: 404,
      // Business Logic Errors (4xx)
      ["PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */]: 403,
      ["INSUFFICIENT_PERMISSIONS" /* INSUFFICIENT_PERMISSIONS */]: 403,
      ["BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */]: 422,
      ["ACCOUNT_DEACTIVATED" /* ACCOUNT_DEACTIVATED */]: 403,
      ["SUBSCRIPTION_EXPIRED" /* SUBSCRIPTION_EXPIRED */]: 402,
      ["SUBSCRIPTION_CANCELLED" /* SUBSCRIPTION_CANCELLED */]: 402,
      ["SUBSCRIPTION_PAUSED" /* SUBSCRIPTION_PAUSED */]: 402,
      ["TRIAL_EXPIRED" /* TRIAL_EXPIRED */]: 402,
      ["ORDER_ALREADY_EXISTS" /* ORDER_ALREADY_EXISTS */]: 409,
      ["PRODUCT_OUT_OF_STOCK" /* PRODUCT_OUT_OF_STOCK */]: 422,
      ["INVALID_ORDER_STATUS" /* INVALID_ORDER_STATUS */]: 422,
      ["PAYMENT_FAILED" /* PAYMENT_FAILED */]: 402,
      ["INVALID_PAYMENT_METHOD" /* INVALID_PAYMENT_METHOD */]: 400,
      // Resource Specific Errors (4xx)
      ["EMAIL_EXISTS" /* EMAIL_EXISTS */]: 409,
      ["PHONE_EXISTS" /* PHONE_EXISTS */]: 409,
      ["USER_NOT_FOUND" /* USER_NOT_FOUND */]: 404,
      ["MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */]: 404,
      ["OUTLET_NOT_FOUND" /* OUTLET_NOT_FOUND */]: 404,
      ["PRODUCT_NOT_FOUND" /* PRODUCT_NOT_FOUND */]: 404,
      ["ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */]: 404,
      ["CUSTOMER_NOT_FOUND" /* CUSTOMER_NOT_FOUND */]: 404,
      ["CATEGORY_NOT_FOUND" /* CATEGORY_NOT_FOUND */]: 404,
      ["PLAN_NOT_FOUND" /* PLAN_NOT_FOUND */]: 404,
      ["SUBSCRIPTION_NOT_FOUND" /* SUBSCRIPTION_NOT_FOUND */]: 404,
      ["PAYMENT_NOT_FOUND" /* PAYMENT_NOT_FOUND */]: 404,
      ["AUDIT_LOG_NOT_FOUND" /* AUDIT_LOG_NOT_FOUND */]: 404,
      ["BILLING_CYCLE_NOT_FOUND" /* BILLING_CYCLE_NOT_FOUND */]: 404,
      ["PLAN_VARIANT_NOT_FOUND" /* PLAN_VARIANT_NOT_FOUND */]: 404,
      // System Errors (5xx)
      ["INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */]: 500,
      ["SERVICE_UNAVAILABLE" /* SERVICE_UNAVAILABLE */]: 503,
      ["NETWORK_ERROR" /* NETWORK_ERROR */]: 503,
      // File Upload Errors (4xx)
      ["FILE_TOO_LARGE" /* FILE_TOO_LARGE */]: 413,
      ["INVALID_FILE_TYPE" /* INVALID_FILE_TYPE */]: 400,
      ["UPLOAD_FAILED" /* UPLOAD_FAILED */]: 500
    };
    exports.ApiError = class extends Error {
      constructor(code, message, details, field) {
        const errorMessage = message || exports.ERROR_MESSAGES[code];
        super(errorMessage);
        this.name = "ApiError";
        this.code = code;
        this.statusCode = exports.ERROR_STATUS_CODES[code];
        this.details = details;
        this.field = field;
      }
      toResponse() {
        return {
          success: false,
          message: this.message,
          error: this.code,
          details: this.details,
          field: this.field
        };
      }
    };
    exports.ValidationError = class extends exports.ApiError {
      constructor(message, details, field) {
        super("VALIDATION_ERROR" /* VALIDATION_ERROR */, message, details, field);
        this.name = "ValidationError";
      }
    };
    exports.DuplicateError = class extends exports.ApiError {
      constructor(code, message, details, field) {
        super(code, message, details, field);
        this.name = "DuplicateError";
      }
    };
    exports.NotFoundError = class extends exports.ApiError {
      constructor(code, message, details) {
        super(code, message, details);
        this.name = "NotFoundError";
      }
    };
    exports.UnauthorizedError = class extends exports.ApiError {
      constructor(message, details) {
        super("UNAUTHORIZED" /* UNAUTHORIZED */, message, details);
        this.name = "UnauthorizedError";
      }
    };
    exports.ForbiddenError = class extends exports.ApiError {
      constructor(message, details) {
        super("FORBIDDEN" /* FORBIDDEN */, message, details);
        this.name = "ForbiddenError";
      }
    };
    exports.PlanLimitError = class extends exports.ApiError {
      constructor(message, details) {
        super("PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */, message, details);
        this.name = "PlanLimitError";
      }
    };
    exports.isAuthError = (error) => {
      return error?.message?.includes("Authentication required") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid token") || error?.message?.includes("Token expired") || error?.status === API.STATUS.UNAUTHORIZED || error?.status === 401;
    };
    exports.isPermissionError = (error) => {
      return error?.message?.includes("Forbidden") || error?.message?.includes("Access denied") || error?.message?.includes("Insufficient permissions") || error?.status === API.STATUS.FORBIDDEN || error?.status === 403;
    };
    isSubscriptionErrorNew = (error) => {
      if (!error)
        return false;
      const message = error.message || error.error || "";
      const code = error.code || "";
      return code === "PLAN_LIMIT_EXCEEDED" || message.toLowerCase().includes("subscription") || message.toLowerCase().includes("plan limit") || message.toLowerCase().includes("trial expired") || message.toLowerCase().includes("cancelled") || message.toLowerCase().includes("expired") || message.toLowerCase().includes("suspended") || message.toLowerCase().includes("past due") || message.toLowerCase().includes("paused");
    };
    exports.isNetworkError = (error) => {
      return error?.message?.includes("Network Error") || error?.message?.includes("Failed to fetch") || error?.message?.includes("Connection failed") || error?.status === API.STATUS.SERVICE_UNAVAILABLE || error?.status === 503;
    };
    exports.isValidationError = (error) => {
      return error?.message?.includes("Validation failed") || error?.message?.includes("Invalid input") || error?.message?.includes("Required field") || error?.status === API.STATUS.BAD_REQUEST || error?.status === 400;
    };
    exports.analyzeError = (error) => {
      console.log("\u{1F50D} analyzeError called with:", error);
      if (exports.isAuthError(error)) {
        console.log("\u{1F50D} analyzeError: Detected auth error, clearing auth data");
        exports.clearAuthData();
        return {
          type: "auth",
          message: "Your session has expired. Please log in again.",
          title: "Session Expired",
          showLoginButton: true,
          originalError: error
        };
      }
      if (exports.isPermissionError(error)) {
        return {
          type: "permission",
          message: "You do not have permission to perform this action.",
          title: "Access Denied",
          showLoginButton: false,
          originalError: error
        };
      }
      if (isSubscriptionErrorNew(error)) {
        return {
          type: "subscription",
          message: "Your subscription has expired or been cancelled. Please renew to continue.",
          title: "Subscription Issue",
          showLoginButton: false,
          originalError: error
        };
      }
      if (exports.isNetworkError(error)) {
        return {
          type: "network",
          message: "Network connection failed. Please check your internet connection and try again.",
          title: "Connection Error",
          showLoginButton: false,
          originalError: error
        };
      }
      if (exports.isValidationError(error)) {
        return {
          type: "validation",
          message: "Please check your input and try again.",
          title: "Invalid Input",
          showLoginButton: false,
          originalError: error
        };
      }
      return {
        type: "unknown",
        message: "An unexpected error occurred. Please try again later.",
        title: "Error",
        showLoginButton: false,
        originalError: error
      };
    };
  }
});

// src/config/api.ts
var api_exports = {};
__export(api_exports, {
  API_BASE_URL: () => exports.API_BASE_URL,
  apiConfig: () => exports.apiConfig,
  apiEnvironment: () => exports.apiEnvironment,
  apiUrls: () => exports.apiUrls,
  buildApiUrl: () => exports.buildApiUrl,
  getApiBaseUrl: () => exports.getApiBaseUrl,
  getApiCorsOrigins: () => exports.getApiCorsOrigins,
  getApiDatabaseUrl: () => exports.getApiDatabaseUrl,
  getApiJwtSecret: () => exports.getApiJwtSecret,
  getApiUrl: () => exports.getApiUrl,
  getCurrentEnvironment: () => exports.getCurrentEnvironment,
  isDevelopment: () => exports.isDevelopment,
  isLocal: () => exports.isLocal,
  isProduction: () => exports.isProduction
});
function getEnvironment() {
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV;
  if (explicitEnv === "local" || explicitEnv === "development" || explicitEnv === "production") {
    return explicitEnv;
  }
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  return "local";
}
function getApiBaseUrlInternal() {
  const env = getEnvironment();
  switch (env) {
    case "local":
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    case "development":
      return process.env.NEXT_PUBLIC_API_URL || "https://api.dev.rentalshop.com";
    case "production":
      return process.env.NEXT_PUBLIC_API_URL || "https://api.rentalshop.com";
    default:
      return "http://localhost:3002";
  }
}
function getApiConfig() {
  const environment = getEnvironment();
  const baseConfig = {
    cors: {
      origins: []
    },
    features: {
      emailVerification: false,
      analytics: false,
      rateLimiting: false
    },
    logging: {
      level: "info",
      format: "json"
    },
    security: {
      rateLimitMax: 1e3,
      rateLimitWindow: "15m"
    }
  };
  switch (environment) {
    case "local":
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || "file:./dev.db",
          type: "sqlite"
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || "local-jwt-secret-key-change-this",
          expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        },
        cors: {
          origins: [
            "http://localhost:3000",
            // Client App
            "http://localhost:3001",
            // Admin App
            "http://localhost:3002",
            // API Server
            "http://localhost:3003"
            // Mobile App (Future)
          ]
        },
        features: {
          emailVerification: false,
          analytics: false,
          rateLimiting: false
        },
        urls: {
          client: process.env.CLIENT_URL || "http://localhost:3000",
          admin: process.env.ADMIN_URL || "http://localhost:3001",
          api: process.env.API_URL || "http://localhost:3002",
          mobile: process.env.MOBILE_URL || "http://localhost:3003"
        },
        logging: {
          level: process.env.LOG_LEVEL || "debug",
          format: process.env.LOG_FORMAT || "pretty"
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "1000"),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || "15m"
        }
      };
    case "development":
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/rentalshop_dev",
          type: "postgresql"
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-key-change-this",
          expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        },
        cors: {
          origins: [
            "https://dev.rentalshop.com",
            "https://admin.dev.rentalshop.com",
            "https://mobile.dev.rentalshop.com"
          ]
        },
        features: {
          emailVerification: true,
          analytics: true,
          rateLimiting: true
        },
        urls: {
          client: process.env.CLIENT_URL || "https://dev.rentalshop.com",
          admin: process.env.ADMIN_URL || "https://admin.dev.rentalshop.com",
          api: process.env.API_URL || "https://api.dev.rentalshop.com",
          mobile: process.env.MOBILE_URL || "https://mobile.dev.rentalshop.com"
        },
        logging: {
          level: process.env.LOG_LEVEL || "info",
          format: process.env.LOG_FORMAT || "json"
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "500"),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || "15m"
        }
      };
    case "production":
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || "postgresql://username:password@your-prod-host:5432/rentalshop_prod",
          type: "postgresql"
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || "your-super-secure-jwt-secret-key-here",
          expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        },
        cors: {
          origins: [
            "https://rentalshop.com",
            "https://admin.rentalshop.com",
            "https://mobile.rentalshop.com"
          ]
        },
        features: {
          emailVerification: true,
          analytics: true,
          rateLimiting: true
        },
        urls: {
          client: process.env.CLIENT_URL || "https://rentalshop.com",
          admin: process.env.ADMIN_URL || "https://admin.rentalshop.com",
          api: process.env.API_URL || "https://api.rentalshop.com",
          mobile: process.env.MOBILE_URL || "https://mobile.rentalshop.com"
        },
        logging: {
          level: process.env.LOG_LEVEL || "warn",
          format: process.env.LOG_FORMAT || "json"
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100"),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || "15m"
        }
      };
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}
function createApiUrls() {
  const base = getApiBaseUrlInternal();
  return {
    base,
    auth: {
      login: `${base}/api/auth/login`,
      register: `${base}/api/auth/register`,
      verify: `${base}/api/auth/verify`,
      refresh: `${base}/api/auth/refresh`,
      logout: `${base}/api/auth/logout`,
      forgotPassword: `${base}/api/auth/forgot-password`,
      resetPassword: `${base}/api/auth/reset-password`,
      changePassword: `${base}/api/auth/change-password`
    },
    categories: {
      list: `${base}/api/categories`,
      create: `${base}/api/categories`,
      update: (id) => `${base}/api/categories/${id}`,
      delete: (id) => `${base}/api/categories/${id}`
    },
    products: {
      list: `${base}/api/products`,
      create: `${base}/api/products`,
      update: (id) => `${base}/api/products/${id}`,
      delete: (id) => `${base}/api/products/${id}`,
      updateStock: (id) => `${base}/api/products/${id}/stock`,
      bulkUpdate: `${base}/api/products/bulk-update`
    },
    orders: {
      list: `${base}/api/orders`,
      create: `${base}/api/orders`,
      update: (id) => `${base}/api/orders/${id}`,
      delete: (id) => `${base}/api/orders/${id}`,
      getByNumber: (orderNumber) => `${base}/api/orders/by-number/${orderNumber}`,
      updateStatus: (id) => `${base}/api/orders/${id}/status`,
      stats: `${base}/api/orders/stats`
    },
    customers: {
      list: `${base}/api/customers`,
      create: `${base}/api/customers`,
      update: (id) => `${base}/api/customers/${id}`,
      delete: (id) => `${base}/api/customers/${id}`,
      stats: `${base}/api/customers/stats`
    },
    outlets: {
      list: `${base}/api/outlets`,
      create: `${base}/api/outlets`,
      get: (id) => `${base}/api/outlets/${id}`,
      update: (id) => `${base}/api/outlets?outletId=${id}`,
      delete: (id) => `${base}/api/outlets?outletId=${id}`,
      stats: `${base}/api/outlets/stats`
    },
    users: {
      list: `${base}/api/users`,
      create: `${base}/api/users`,
      update: (id) => `${base}/api/users/${id}`,
      delete: (id) => `${base}/api/users/${id}`,
      updateRole: (id) => `${base}/api/users/${id}/role`,
      updateStatus: (id) => `${base}/api/users/${id}/status`,
      assignOutlet: (id) => `${base}/api/users/${id}/assign-outlet`,
      deleteAccount: `${base}/api/users/delete-account`,
      updateByPublicId: (id) => `${base}/api/users/${id}`,
      activateByPublicId: (id) => `${base}/api/users/${id}`,
      deactivateByPublicId: (id) => `${base}/api/users/${id}`,
      deleteByPublicId: (id) => `${base}/api/users/${id}`
    },
    plans: {
      list: `${base}/api/plans`,
      create: `${base}/api/plans`,
      get: (id) => `${base}/api/plans/${id}`,
      update: (id) => `${base}/api/plans/${id}`,
      delete: (id) => `${base}/api/plans/${id}`,
      stats: `${base}/api/plans/stats`,
      public: `${base}/api/plans/public`
    },
    planVariants: {
      list: `${base}/api/plan-variants`,
      create: `${base}/api/plan-variants`,
      get: (id) => `${base}/api/plan-variants/${id}`,
      update: (id) => `${base}/api/plan-variants/${id}`,
      delete: (id) => `${base}/api/plan-variants/${id}`,
      bulk: `${base}/api/plan-variants/bulk`,
      recycle: `${base}/api/plan-variants/recycle`,
      restore: (id) => `${base}/api/plan-variants/recycle/${id}`,
      stats: `${base}/api/plan-variants/stats`
    },
    billingCycles: {
      list: `${base}/api/billing-cycles`,
      create: `${base}/api/billing-cycles`,
      get: (id) => `${base}/api/billing-cycles/${id}`,
      update: (id) => `${base}/api/billing-cycles/${id}`,
      delete: (id) => `${base}/api/billing-cycles/${id}`
    },
    payments: {
      list: `${base}/api/payments`,
      create: `${base}/api/payments`,
      manual: `${base}/api/payments/manual`,
      get: (id) => `${base}/api/payments/${id}`,
      update: (id) => `${base}/api/payments/${id}`,
      delete: (id) => `${base}/api/payments/${id}`,
      process: (id) => `${base}/api/payments/${id}/process`,
      refund: (id) => `${base}/api/payments/${id}/refund`,
      stats: `${base}/api/payments/stats`,
      export: `${base}/api/payments/export`
    },
    subscriptions: {
      list: `${base}/api/subscriptions`,
      create: `${base}/api/subscriptions`,
      get: (id) => `${base}/api/subscriptions/${id}`,
      update: (id) => `${base}/api/subscriptions/${id}`,
      delete: (id) => `${base}/api/subscriptions/${id}`,
      extend: (id) => `${base}/api/subscriptions/${id}/extend`,
      status: `${base}/api/subscriptions/status`,
      stats: `${base}/api/subscriptions/stats`
    },
    analytics: {
      dashboard: `${base}/api/analytics/dashboard`,
      system: `${base}/api/analytics/system`,
      revenue: `${base}/api/analytics/revenue`,
      orders: `${base}/api/analytics/orders`,
      income: `${base}/api/analytics/income`,
      topProducts: `${base}/api/analytics/top-products`,
      topCustomers: `${base}/api/analytics/top-customers`,
      recentOrders: `${base}/api/analytics/recent-orders`,
      recentActivities: `${base}/api/analytics/recent-activities`,
      inventory: `${base}/api/analytics/inventory`,
      outletPerformance: `${base}/api/analytics/outlet-performance`,
      seasonalTrends: `${base}/api/analytics/seasonal-trends`,
      export: `${base}/api/analytics/export`,
      todayMetrics: `${base}/api/analytics/today-metrics`,
      growthMetrics: `${base}/api/analytics/growth-metrics`,
      enhancedDashboard: `${base}/api/analytics/enhanced-dashboard`
    },
    merchants: {
      list: `${base}/api/merchants`,
      create: `${base}/api/merchants`,
      register: `${base}/api/merchants/register`,
      get: (id) => `${base}/api/merchants/${id}`,
      update: (id) => `${base}/api/merchants/${id}`,
      delete: (id) => `${base}/api/merchants/${id}`,
      updatePlan: (id) => `${base}/api/merchants/${id}/plan`,
      getPlan: (id) => `${base}/api/merchants/${id}/plan`,
      extendPlan: (id) => `${base}/api/merchants/${id}/plan`,
      cancelPlan: (id) => `${base}/api/merchants/${id}/plan`,
      pricing: {
        get: (id) => `${base}/api/merchants/${id}/pricing`,
        update: (id) => `${base}/api/merchants/${id}/pricing`
      },
      products: {
        list: (merchantId) => `${base}/api/merchants/${merchantId}/products`,
        get: (merchantId, productId) => `${base}/api/merchants/${merchantId}/products/${productId}`,
        create: (merchantId) => `${base}/api/merchants/${merchantId}/products`,
        update: (merchantId, productId) => `${base}/api/merchants/${merchantId}/products/${productId}`,
        delete: (merchantId, productId) => `${base}/api/merchants/${merchantId}/products/${productId}`
      },
      orders: {
        list: (merchantId) => `${base}/api/merchants/${merchantId}/orders`,
        get: (merchantId, orderId) => `${base}/api/merchants/${merchantId}/orders/${orderId}`,
        create: (merchantId) => `${base}/api/merchants/${merchantId}/orders`,
        update: (merchantId, orderId) => `${base}/api/merchants/${merchantId}/orders/${orderId}`,
        delete: (merchantId, orderId) => `${base}/api/merchants/${merchantId}/orders/${orderId}`
      },
      users: {
        list: (merchantId) => `${base}/api/merchants/${merchantId}/users`,
        get: (merchantId, userId) => `${base}/api/merchants/${merchantId}/users/${userId}`,
        create: (merchantId) => `${base}/api/merchants/${merchantId}/users`,
        update: (merchantId, userId) => `${base}/api/merchants/${merchantId}/users/${userId}`,
        delete: (merchantId, userId) => `${base}/api/merchants/${merchantId}/users/${userId}`
      },
      outlets: {
        list: (merchantId) => `${base}/api/merchants/${merchantId}/outlets`,
        get: (merchantId, outletId) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`,
        create: (merchantId) => `${base}/api/merchants/${merchantId}/outlets`,
        update: (merchantId, outletId) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`,
        delete: (merchantId, outletId) => `${base}/api/merchants/${merchantId}/outlets/${outletId}`
      }
    },
    settings: {
      merchant: `${base}/api/settings/merchant`,
      user: `${base}/api/users/profile`,
      outlet: `${base}/api/settings/outlet`,
      billing: `${base}/api/settings/billing`,
      changePassword: `${base}/api/profile/change-password`,
      uploadPicture: `${base}/api/profile/upload-picture`,
      deletePicture: `${base}/api/profile/delete-picture`,
      preferences: `${base}/api/profile/preferences`,
      activityLog: `${base}/api/profile/activity-log`,
      profileNotifications: `${base}/api/profile/notifications`,
      markNotificationRead: (id) => `${base}/api/profile/notifications/${id}/read`,
      markAllNotificationsRead: `${base}/api/profile/notifications/mark-all-read`
    },
    system: {
      backup: `${base}/api/system/backup`,
      backupSchedule: `${base}/api/system/backup/schedule`,
      backupVerify: `${base}/api/system/backup/verify`,
      stats: `${base}/api/system/stats`,
      health: `${base}/api/system/health`,
      logs: `${base}/api/system/logs`
    },
    notifications: {
      list: `${base}/api/notifications`,
      get: (id) => `${base}/api/notifications/${id}`,
      markRead: (id) => `${base}/api/notifications/${id}/read`,
      markUnread: (id) => `${base}/api/notifications/${id}/unread`,
      markAllRead: `${base}/api/notifications/mark-all-read`,
      delete: (id) => `${base}/api/notifications/${id}`,
      deleteAllRead: `${base}/api/notifications/delete-read`,
      unreadCount: `${base}/api/notifications/unread-count`,
      preferences: `${base}/api/notifications/preferences`,
      test: `${base}/api/notifications/test`
    },
    auditLogs: {
      list: `${base}/api/audit-logs`,
      stats: `${base}/api/audit-logs/stats`,
      export: `${base}/api/audit-logs/export`
    },
    calendar: {
      orders: `${base}/api/calendar/orders`
    }
  };
}
exports.apiConfig = void 0; exports.apiEnvironment = void 0; exports.apiUrls = void 0; exports.getCurrentEnvironment = void 0; exports.isLocal = void 0; exports.isDevelopment = void 0; exports.isProduction = void 0; exports.getApiBaseUrl = void 0; exports.buildApiUrl = void 0; exports.getApiUrl = void 0; exports.API_BASE_URL = void 0; exports.getApiDatabaseUrl = void 0; exports.getApiJwtSecret = void 0; exports.getApiCorsOrigins = void 0;
var init_api = __esm({
  "src/config/api.ts"() {
    exports.apiConfig = getApiConfig();
    exports.apiEnvironment = getEnvironment();
    exports.apiUrls = createApiUrls();
    exports.getCurrentEnvironment = () => getEnvironment();
    exports.isLocal = () => getEnvironment() === "local";
    exports.isDevelopment = () => getEnvironment() === "development";
    exports.isProduction = () => getEnvironment() === "production";
    exports.getApiBaseUrl = () => getApiBaseUrlInternal();
    exports.buildApiUrl = (endpoint) => {
      const base = exports.getApiBaseUrl();
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
      return `${base}/${cleanEndpoint}`;
    };
    exports.getApiUrl = () => exports.getApiBaseUrl();
    exports.API_BASE_URL = exports.getApiBaseUrl();
    exports.getApiDatabaseUrl = () => exports.apiConfig.database.url;
    exports.getApiJwtSecret = () => exports.apiConfig.auth.jwtSecret;
    exports.getApiCorsOrigins = () => exports.apiConfig.cors.origins;
  }
});
var API2; exports.createApiUrl = void 0; exports.publicFetch = void 0; exports.authenticatedFetch = void 0; exports.parseApiResponse = void 0; exports.isAuthenticated = void 0; exports.getAuthToken = void 0; exports.getStoredUser = void 0; exports.storeAuthData = void 0; exports.clearAuthData = void 0; exports.getCurrentUser = void 0; exports.handleApiResponse = void 0; exports.getToastType = void 0; exports.withErrorHandlingForUI = void 0; exports.handleApiErrorForUI = void 0;
var init_common = __esm({
  "src/core/common.ts"() {
    init_errors();
    API2 = CONSTANTS__default.default.API;
    exports.createApiUrl = (endpoint) => {
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
      if (cleanEndpoint.startsWith("http://") || cleanEndpoint.startsWith("https://")) {
        return cleanEndpoint;
      }
      if (cleanEndpoint.startsWith("api/")) {
        try {
          const { apiUrls: apiUrls2 } = (init_api(), __toCommonJS(api_exports));
          return `${apiUrls2.base}/${cleanEndpoint}`;
        } catch {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
          return `${baseUrl}/${cleanEndpoint}`;
        }
      }
      return `/api/${cleanEndpoint}`;
    };
    exports.publicFetch = async (url, options = {}) => {
      console.log("\u{1F50D} FRONTEND: publicFetch called with URL:", url);
      console.log("\u{1F50D} FRONTEND: publicFetch options:", options);
      if (!url || typeof url !== "string") {
        console.log("\u{1F50D} FRONTEND: URL validation failed");
        throw new Error("URL is required and must be a string");
      }
      const headers = {
        [API2.HEADERS.CONTENT_TYPE]: API2.CONTENT_TYPES.JSON,
        [API2.HEADERS.ACCEPT]: API2.CONTENT_TYPES.JSON
      };
      const fullUrl = exports.createApiUrl(url);
      const requestOptions = {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      };
      console.log(`\u{1F310} PUBLIC REQUEST: ${requestOptions.method || "GET"} ${fullUrl}`);
      try {
        const response = await fetch(fullUrl, requestOptions);
        console.log(`\u2705 PUBLIC RESPONSE: ${response.status} ${response.statusText}`);
        return response;
      } catch (error) {
        console.error(`\u274C PUBLIC REQUEST FAILED:`, error);
        throw error;
      }
    };
    exports.authenticatedFetch = async (url, options = {}) => {
      console.log("\u{1F50D} FRONTEND: authenticatedFetch called with URL:", url);
      console.log("\u{1F50D} FRONTEND: authenticatedFetch options:", options);
      if (!url || typeof url !== "string") {
        console.log("\u{1F50D} FRONTEND: URL validation failed");
        throw new Error("URL is required and must be a string");
      }
      const token = exports.getAuthToken();
      console.log("\u{1F50D} FRONTEND: Token from localStorage:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
      if (token && typeof window !== "undefined") {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1e3);
            console.log("\u{1F50D} FRONTEND: Token debug:", {
              userId: payload.userId,
              email: payload.email,
              role: payload.role,
              exp: payload.exp,
              now,
              expired: payload.exp < now,
              timeUntilExpiry: payload.exp - now
            });
            if (payload.exp < now) {
              console.log("\u{1F50D} FRONTEND: Token is expired, clearing auth data");
              exports.clearAuthData();
              throw new Error("Token expired - please log in again");
            }
          }
        } catch (error) {
          console.log("\u{1F50D} FRONTEND: Token validation failed:", error);
          exports.clearAuthData();
          throw new Error("Invalid token - please log in again");
        }
      }
      if (!token && typeof window !== "undefined") {
        console.log("\u{1F50D} FRONTEND: No token found, cleaning up and redirecting to login");
        exports.clearAuthData();
        setTimeout(() => {
        }, 100);
        throw new Error("Authentication required");
      }
      const headers = {
        [API2.HEADERS.CONTENT_TYPE]: API2.CONTENT_TYPES.JSON,
        [API2.HEADERS.ACCEPT]: API2.CONTENT_TYPES.JSON,
        ...options.headers
      };
      if (token) {
        headers[API2.HEADERS.AUTHORIZATION] = `Bearer ${token}`;
        console.log("\u{1F50D} FRONTEND: Authorization header set:", `Bearer ${token.substring(0, 20)}...`);
      }
      console.log("\u{1F50D} FRONTEND: Final headers:", headers);
      const defaultOptions = {
        method: API2.METHODS.GET,
        headers,
        ...options
      };
      console.log("\u{1F50D} FRONTEND: Final request options:", defaultOptions);
      try {
        console.log("\u{1F50D} FRONTEND: Making fetch request to:", url);
        console.log("\u{1F50D} FRONTEND: Request body:", options.body);
        const response = await fetch(url, defaultOptions);
        console.log("\u{1F50D} FRONTEND: Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries())
        });
        if (response.status === API2.STATUS.PAYMENT_REQUIRED) {
          console.log("\u{1F50D} FRONTEND: 402 Payment Required response received (subscription error)");
          try {
            const errorData = await response.clone().json();
            console.log("\u{1F50D} FRONTEND: 402 Error details:", errorData);
            throw new Error(errorData.message || "Subscription issue detected");
          } catch (parseError) {
            console.log("\u{1F50D} FRONTEND: Could not parse 402 error response");
            throw new Error("Subscription issue detected");
          }
        }
        if (response.status === API2.STATUS.UNAUTHORIZED) {
          console.log("\u{1F50D} FRONTEND: 401 Unauthorized response received");
          if (typeof window !== "undefined") {
            console.log("\u{1F50D} FRONTEND: Cleaning up auth data and redirecting to login");
            exports.clearAuthData();
            window.location.href = "/login";
          }
          throw new Error("Unauthorized access - redirecting to login");
        }
        if (response.status === API2.STATUS.FORBIDDEN) {
          throw new Error("Access forbidden - insufficient permissions");
        }
        if (response.status >= 500) {
          throw new Error("Server error - please try again later");
        }
        if (response.status >= API2.STATUS.INTERNAL_SERVER_ERROR) {
          throw new Error("Server error occurred");
        }
        return response;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error(API2.ERROR_CODES.NETWORK_ERROR);
        }
        throw error;
      }
    };
    exports.parseApiResponse = async (response) => {
      console.log("\u{1F50D} DEBUG: parseApiResponse called with status:", response.status);
      console.log("\u{1F50D} DEBUG: Response OK:", response.ok);
      console.log("\u{1F50D} DEBUG: Response URL:", response.url);
      if (!response.ok) {
        console.error("\u274C DEBUG: parseApiResponse - Response not OK, status:", response.status);
        console.error("\u274C DEBUG: parseApiResponse - Response statusText:", response.statusText);
        console.error("\u274C DEBUG: parseApiResponse - Response URL:", response.url);
        if (response.status === API2.STATUS.UNAUTHORIZED) {
          if (typeof window !== "undefined") {
            console.error("\u{1F6A8} DEBUG: parseApiResponse - UNAUTHORIZED RESPONSE!");
            console.error("\u{1F6A8} DEBUG: This will trigger auto-redirect to login page!");
            console.error("\u{1F512} parseApiResponse: Unauthorized access - token may be expired or invalid");
            console.error("\u{1F512} parseApiResponse: Response status:", response.status);
            console.error("\u{1F512} parseApiResponse: Response URL:", response.url);
            try {
              const responseText = await response.clone().text();
              console.error("\u{1F512} parseApiResponse - Response body:", responseText);
            } catch (e) {
              console.error("\u{1F512} parseApiResponse - Could not read response body:", e);
            }
            exports.clearAuthData();
            console.error("\u{1F6A8} DEBUG: parseApiResponse - REDIRECTING TO LOGIN PAGE NOW!");
          }
          throw new Error("Unauthorized access - redirecting to login");
        }
        const errorText = await response.text();
        console.log("\u{1F50D} parseApiResponse: Error response text:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.log("\u{1F50D} parseApiResponse: Parsed error data:", errorData);
          if (errorData.success === false && errorData.message && errorData.error) {
            console.log("\u{1F50D} parseApiResponse: Structured error response detected");
            const result2 = {
              success: false,
              message: errorData.message,
              // Use the user-friendly message
              error: errorData.error
              // Preserve the error code for specific handling
            };
            console.log("\u{1F50D} parseApiResponse: Returning structured error:", result2);
            return result2;
          }
          if (errorData.success === false && errorData.error) {
            console.log("\u{1F50D} parseApiResponse: API error response detected");
            const isSubscriptionInvalidToken = errorData.error === "Invalid token" && // Check for subscription-related context
            (errorData.subscriptionError === true || errorData.context === "subscription" || errorData.context === "plan" || errorData.subscriptionStatus === "cancelled" || errorData.subscriptionStatus === "expired" || // Check if this came from a subscription-related endpoint
            response.url.includes("/subscription") || response.url.includes("/plan") || response.url.includes("/billing") || // Check for subscription-specific error codes
            errorData.errorCode === "SUBSCRIPTION_CANCELLED" || errorData.errorCode === "PLAN_CANCELLED" || errorData.errorCode === "SUBSCRIPTION_EXPIRED");
            const result2 = {
              success: false,
              message: errorData.error,
              // Use the error message directly
              error: errorData.errorCode || "INTERNAL_SERVER_ERROR",
              // Add subscription context if detected
              ...isSubscriptionInvalidToken && {
                details: "subscription"
              }
            };
            console.log("\u{1F50D} parseApiResponse: Returning API error:", result2);
            return result2;
          }
          console.log("\u{1F50D} parseApiResponse: Legacy error response detected");
          const isSubscriptionInvalidTokenMessage = errorData.message === "Invalid token" && // Check for subscription-related context
          (errorData.subscriptionError === true || errorData.context === "subscription" || errorData.context === "plan" || errorData.subscriptionStatus === "cancelled" || errorData.subscriptionStatus === "expired" || // Check if this came from a subscription-related endpoint
          response.url.includes("/subscription") || response.url.includes("/plan") || response.url.includes("/billing") || // Check for subscription-specific error codes
          errorData.errorCode === "SUBSCRIPTION_CANCELLED" || errorData.errorCode === "PLAN_CANCELLED" || errorData.errorCode === "SUBSCRIPTION_EXPIRED");
          const result = {
            success: false,
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            error: errorData.errorCode || "INTERNAL_SERVER_ERROR",
            // Add subscription context if detected
            ...isSubscriptionInvalidTokenMessage && {
              details: "subscription"
            }
          };
          console.log("\u{1F50D} parseApiResponse: Returning legacy error:", result);
          return result;
        } catch {
          console.log("\u{1F50D} parseApiResponse: Failed to parse error JSON, using fallback");
          const result = {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
            error: "INTERNAL_SERVER_ERROR"
          };
          console.log("\u{1F50D} parseApiResponse: Returning fallback error:", result);
          return result;
        }
      }
      try {
        const responseData = await response.json();
        if (responseData.success && responseData.data !== void 0) {
          return {
            success: true,
            data: responseData.data
            // Extract the nested data
          };
        }
        return {
          success: true,
          data: responseData
        };
      } catch (error) {
        return {
          success: false,
          message: "Failed to parse response",
          error: "INTERNAL_SERVER_ERROR"
        };
      }
    };
    exports.isAuthenticated = () => {
      if (typeof window === "undefined")
        return false;
      const token = exports.getAuthToken();
      return !!token;
    };
    exports.getAuthToken = () => {
      if (typeof window === "undefined")
        return null;
      const authData = localStorage.getItem("authData");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.token && parsed.expiresAt) {
            if (Date.now() > parsed.expiresAt) {
              console.log("\u{1F50D} Token is expired, clearing auth data");
              exports.clearAuthData();
              return null;
            }
            return parsed.token;
          }
        } catch (error) {
          console.warn("Failed to parse authData:", error);
          exports.clearAuthData();
          return null;
        }
      }
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp) {
              const now = Math.floor(Date.now() / 1e3);
              if (payload.exp < now) {
                console.log("\u{1F50D} Token is expired, clearing auth data");
                exports.clearAuthData();
                return null;
              }
            }
          }
        } catch (error) {
          console.warn("Failed to decode JWT token for expiration check:", error);
          exports.clearAuthData();
          return null;
        }
        return token;
      }
      return null;
    };
    exports.getStoredUser = () => {
      if (typeof window === "undefined")
        return null;
      try {
        const authData = localStorage.getItem("authData");
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.user) {
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              exports.clearAuthData();
              return null;
            }
            return parsed.user;
          }
        }
        const userData = localStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.expiresAt && Date.now() > user.expiresAt) {
            exports.clearAuthData();
            return null;
          }
          return user;
        }
        return null;
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        exports.clearAuthData();
        return null;
      }
    };
    exports.storeAuthData = (token, user) => {
      if (typeof window === "undefined")
        return;
      let expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp) {
            expiresAt = payload.exp * 1e3;
          }
        }
      } catch (error) {
        console.warn("Failed to decode JWT token for expiration time:", error);
      }
      const authData = {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
          updatedAt: user.updatedAt,
          merchantId: user.merchantId ? Number(user.merchantId) : void 0,
          outletId: user.outletId ? Number(user.outletId) : void 0
        },
        expiresAt
        // Use actual JWT expiration time
      };
      localStorage.setItem("authData", JSON.stringify(authData));
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userData");
      console.log("\u2705 Auth data stored in consolidated format");
    };
    exports.clearAuthData = () => {
      if (typeof window === "undefined")
        return;
      console.log("\u{1F9F9} Clearing auth data from localStorage");
      localStorage.removeItem("authData");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userData");
      console.log("\u2705 All auth data cleared");
    };
    exports.getCurrentUser = () => {
      return exports.getStoredUser();
    };
    exports.handleApiResponse = async (response) => {
      return await exports.parseApiResponse(response);
    };
    exports.getToastType = (errorType) => {
      switch (errorType) {
        case "auth":
          return "error";
        case "permission":
          return "error";
        case "subscription":
          return "warning";
        case "network":
          return "warning";
        case "validation":
          return "warning";
        case "unknown":
          return "error";
        default:
          return "error";
      }
    };
    exports.withErrorHandlingForUI = async (apiCall) => {
      try {
        const data = await apiCall();
        return { data };
      } catch (error) {
        return { error };
      }
    };
    exports.handleApiErrorForUI = (error) => {
      const errorInfo = exports.analyzeError(error);
      return {
        message: errorInfo.message,
        type: errorInfo.type
      };
    };
  }
});

// src/core/pricing-calculator.ts
var DiscountCalculator, BillingIntervalCalculator, ProrationCalculator, PricingComparisonEngine, PricingCalculator, DEFAULT_PRICING_CONFIG; exports.pricingCalculator = void 0; exports.calculateSubscriptionPrice = void 0; exports.getPricingBreakdown = void 0; exports.getAllPricingOptions = void 0; exports.getPricingComparison = void 0; exports.calculateProratedAmount = void 0; exports.formatBillingCycle = void 0; exports.getBillingCycleDiscount = void 0; exports.calculateRenewalPrice = void 0; exports.calculateSavings = void 0; exports.getDiscountPercentage = void 0; exports.calculateDiscountedPrice = void 0; exports.PricingResolver = void 0; exports.PricingValidator = void 0;
var init_pricing_calculator = __esm({
  "src/core/pricing-calculator.ts"() {
    DiscountCalculator = class {
      constructor(config) {
        this.config = config;
      }
      /**
       * Calculate discount amount for billing interval
       */
      calculateDiscount(totalPrice, billingInterval) {
        const discountPercentage = this.getDiscountPercentage(billingInterval);
        const discountAmount = totalPrice * discountPercentage / 100;
        return {
          discount: discountPercentage,
          discountAmount
        };
      }
      /**
       * Get discount percentage for billing interval
       */
      getDiscountPercentage(billingInterval) {
        return this.config.discounts[billingInterval] || 0;
      }
    };
    BillingIntervalCalculator = class {
      constructor(config) {
        this.config = config;
      }
      /**
       * Get total months for billing interval
       */
      getTotalMonths(billingInterval) {
        const intervalMap = {
          month: 1,
          quarter: 3,
          semiAnnual: 6,
          year: 12
        };
        return intervalMap[billingInterval] || 1;
      }
      /**
       * Get all available billing intervals
       */
      getAllIntervals() {
        return ["month", "quarter", "semiAnnual", "year"];
      }
    };
    ProrationCalculator = class {
      constructor(config) {
        this.discountCalculator = new DiscountCalculator(config);
        this.intervalCalculator = new BillingIntervalCalculator(config);
      }
      /**
       * Calculate prorated amount for plan changes
       */
      calculateProratedAmount(currentPlan, newPlan, billingInterval, daysRemaining) {
        const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);
        const currentDailyRate = currentPlan.basePrice * totalMonths / (totalMonths * 30);
        const newDailyRate = newPlan.basePrice * totalMonths / (totalMonths * 30);
        const currentPlanRefund = currentDailyRate * daysRemaining;
        const newPlanCharge = newDailyRate * daysRemaining;
        const netAmount = newPlanCharge - currentPlanRefund;
        return {
          currentPlanRefund,
          newPlanCharge,
          netAmount
        };
      }
    };
    PricingComparisonEngine = class {
      constructor(config) {
        this.discountCalculator = new DiscountCalculator(config);
        this.intervalCalculator = new BillingIntervalCalculator(config);
      }
      /**
       * Get pricing comparison between two plans
       */
      getPricingComparison(plan1, plan2, billingInterval) {
        const plan1Pricing = this.calculatePricingBreakdown(plan1, billingInterval);
        const plan2Pricing = this.calculatePricingBreakdown(plan2, billingInterval);
        const difference = plan2Pricing.finalPrice - plan1Pricing.finalPrice;
        const savings = Math.abs(difference);
        return {
          plan1: plan1Pricing,
          plan2: plan2Pricing,
          difference,
          savings
        };
      }
      /**
       * Calculate pricing breakdown for a plan
       */
      calculatePricingBreakdown(plan, billingInterval) {
        const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);
        const totalPrice = plan.basePrice * totalMonths;
        const discountInfo = this.discountCalculator.calculateDiscount(totalPrice, billingInterval);
        const finalPrice = totalPrice - discountInfo.discountAmount;
        const monthlyEquivalent = finalPrice / totalMonths;
        return {
          basePrice: plan.basePrice,
          totalPrice,
          discount: discountInfo.discount,
          discountAmount: discountInfo.discountAmount,
          finalPrice,
          monthlyEquivalent,
          billingInterval,
          totalMonths
        };
      }
    };
    PricingCalculator = class {
      constructor(config = DEFAULT_PRICING_CONFIG) {
        this.config = config;
        this.discountCalculator = new DiscountCalculator(config);
        this.intervalCalculator = new BillingIntervalCalculator(config);
        this.prorationCalculator = new ProrationCalculator(config);
        this.comparisonEngine = new PricingComparisonEngine(config);
      }
      /**
       * Calculate subscription price based on plan and billing interval
       */
      calculateSubscriptionPrice(plan, billingInterval) {
        const breakdown = this.getPricingBreakdown(plan, billingInterval);
        return breakdown.finalPrice;
      }
      /**
       * Get detailed pricing breakdown
       */
      getPricingBreakdown(plan, billingInterval) {
        const totalMonths = this.intervalCalculator.getTotalMonths(billingInterval);
        const totalPrice = plan.basePrice * totalMonths;
        const discountInfo = this.discountCalculator.calculateDiscount(totalPrice, billingInterval);
        const finalPrice = totalPrice - discountInfo.discountAmount;
        const monthlyEquivalent = finalPrice / totalMonths;
        return {
          basePrice: plan.basePrice,
          totalPrice,
          discount: discountInfo.discount,
          discountAmount: discountInfo.discountAmount,
          finalPrice,
          monthlyEquivalent,
          billingInterval,
          totalMonths
        };
      }
      /**
       * Get all pricing options for a plan
       */
      getAllPricingOptions(plan) {
        const intervals = this.intervalCalculator.getAllIntervals();
        const pricing = {};
        for (const interval of intervals) {
          pricing[interval] = this.getPricingBreakdown(plan, interval);
        }
        return pricing;
      }
      /**
       * Get pricing comparison between two plans
       */
      getPricingComparison(plan1, plan2, billingInterval) {
        return this.comparisonEngine.getPricingComparison(plan1, plan2, billingInterval);
      }
      /**
       * Calculate prorated amount for plan changes
       */
      calculateProratedAmount(currentPlan, newPlan, billingInterval, daysRemaining) {
        return this.prorationCalculator.calculateProratedAmount(
          currentPlan,
          newPlan,
          billingInterval,
          daysRemaining
        );
      }
      /**
       * Update configuration
       */
      updateConfig(newConfig) {
        this.config = newConfig;
        this.discountCalculator = new DiscountCalculator(newConfig);
        this.intervalCalculator = new BillingIntervalCalculator(newConfig);
        this.prorationCalculator = new ProrationCalculator(newConfig);
        this.comparisonEngine = new PricingComparisonEngine(newConfig);
      }
      getConfig() {
        return { ...this.config };
      }
    };
    DEFAULT_PRICING_CONFIG = {
      discounts: {
        month: 0,
        // 0% discount
        quarter: 10,
        // 10% discount
        semiAnnual: 15,
        // 15% discount
        year: 20
        // 20% discount
      },
      intervals: {
        month: { interval: "month", intervalCount: 1 },
        quarter: { interval: "month", intervalCount: 3 },
        semiAnnual: { interval: "month", intervalCount: 6 },
        year: { interval: "year", intervalCount: 1 }
      }
    };
    exports.pricingCalculator = new PricingCalculator();
    exports.calculateSubscriptionPrice = (plan, billingInterval) => exports.pricingCalculator.calculateSubscriptionPrice(plan, billingInterval);
    exports.getPricingBreakdown = (plan, billingInterval) => exports.pricingCalculator.getPricingBreakdown(plan, billingInterval);
    exports.getAllPricingOptions = (plan) => exports.pricingCalculator.getAllPricingOptions(plan);
    exports.getPricingComparison = (plan1, plan2, billingInterval) => exports.pricingCalculator.getPricingComparison(plan1, plan2, billingInterval);
    exports.calculateProratedAmount = (currentPlan, newPlan, billingInterval, daysRemaining) => exports.pricingCalculator.calculateProratedAmount(currentPlan, newPlan, billingInterval, daysRemaining);
    exports.formatBillingCycle = (billingInterval) => {
      switch (billingInterval) {
        case "month":
          return "Monthly";
        case "quarter":
          return "Quarterly";
        case "semiAnnual":
          return "Semi-Annual";
        case "year":
          return "Yearly";
        default:
          return billingInterval;
      }
    };
    exports.getBillingCycleDiscount = (billingInterval) => {
      return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
    };
    exports.calculateRenewalPrice = (plan, billingInterval) => {
      return exports.calculateSubscriptionPrice(plan, billingInterval);
    };
    exports.calculateSavings = (originalPrice, discountedPrice) => {
      return Math.max(0, originalPrice - discountedPrice);
    };
    exports.getDiscountPercentage = (billingInterval) => {
      return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
    };
    exports.calculateDiscountedPrice = (originalPrice, discountPercentage) => {
      const discountAmount = originalPrice * (discountPercentage / 100);
      return Math.max(0, originalPrice - discountAmount);
    };
    exports.PricingResolver = class {
      /**
       * Resolve pricing type cho product dựa trên merchant config
       * Simple: Chỉ dùng pricingType từ merchant (không cần pricingConfig object)
       */
      static resolvePricingType(product, merchant) {
        return merchant.pricingType || "FIXED";
      }
      /**
       * Get effective pricing config cho product
       */
      static getEffectivePricingConfig(product, merchant) {
        const pricingType = this.resolvePricingType(product, merchant);
        return {
          pricingType,
          pricePerUnit: product.rentPrice || 0,
          minDuration: 1,
          maxDuration: 365,
          requireRentalDates: false,
          showPricingOptions: true
        };
      }
      /**
       * Calculate pricing cho product
       */
      static calculatePricing(product, merchant, duration, quantity = 1) {
        const config = this.getEffectivePricingConfig(product, merchant);
        const unitPrice = config.pricePerUnit;
        const totalPrice = unitPrice * quantity * (duration || 1);
        return {
          unitPrice,
          totalPrice,
          deposit: product.deposit || 0,
          pricingType: config.pricingType,
          duration,
          durationUnit: "days"
        };
      }
    };
    exports.PricingValidator = class {
      /**
       * Validate rental period for a product
       */
      static validateRentalPeriod(product, merchant, rentalStartAt, rentalEndAt, quantity = 1) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        merchant.pricingType || "FIXED";
        merchant.businessType || "GENERAL";
        if (rentalStartAt >= rentalEndAt) {
          errors.push("Rental start date must be before end date");
        }
        const durationMs = rentalEndAt.getTime() - rentalStartAt.getTime();
        const durationDays = Math.ceil(durationMs / (1e3 * 60 * 60 * 24));
        const minDuration = 1;
        const maxDuration = 365;
        if (durationDays < minDuration) {
          errors.push(`Minimum rental duration is ${minDuration} day`);
          suggestions.push(`Please select at least ${minDuration} day`);
        }
        if (durationDays > maxDuration) {
          warnings.push(`Rental duration (${durationDays} days) exceeds recommended maximum (${maxDuration} days)`);
          suggestions.push("Consider splitting into multiple rentals");
        }
        if (quantity <= 0) {
          errors.push("Quantity must be greater than 0");
        }
        if (quantity > 100) {
          warnings.push("Large quantity rental detected");
          suggestions.push("Consider bulk pricing or contact for custom quote");
        }
        if (product.stock < quantity) {
          errors.push(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
        }
        if (!product.rentPrice || product.rentPrice <= 0) {
          errors.push("Invalid product pricing");
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        };
      }
      /**
       * Validate pricing configuration
       */
      static validatePricingConfig(config) {
        const errors = [];
        const warnings = [];
        if (!config.defaultPricingType) {
          errors.push("Default pricing type is required");
        }
        if (!config.durationLimits) {
          errors.push("Duration limits are required");
        } else {
          if (!config.durationLimits.minDays || config.durationLimits.minDays < 1) {
            errors.push("Minimum duration must be at least 1 day");
          }
          if (!config.durationLimits.maxDays || config.durationLimits.maxDays < 1) {
            errors.push("Maximum duration must be at least 1 day");
          }
          if (config.durationLimits.minDays >= config.durationLimits.maxDays) {
            errors.push("Minimum duration must be less than maximum duration");
          }
        }
        if (config.businessRules) {
          if (config.businessRules.requireDeposit && config.businessRules.depositPercentage <= 0) {
            errors.push("Deposit percentage must be greater than 0 when deposits are required");
          }
        }
        return {
          isValid: errors.length === 0,
          error: errors.length > 0 ? errors.join("; ") : void 0,
          warning: warnings.length > 0 ? warnings.join("; ") : void 0,
          suggestions: errors.length > 0 ? ["Review pricing configuration"] : void 0
        };
      }
    };
  }
});

// ../database/node_modules/.prisma/client/default.js
var require_default = __commonJS({
  "../database/node_modules/.prisma/client/default.js"(exports, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var default_index_exports = {};
    __export2(default_index_exports, {
      Prisma: () => Prisma,
      PrismaClient: () => PrismaClient2,
      default: () => default_index_default
    });
    module.exports = __toCommonJS2(default_index_exports);
    var prisma2 = {
      enginesVersion: "1c57fdcd7e44b29b9313256c76699e91c3ac3c43"
    };
    var version = "6.16.2";
    var clientVersion = version;
    var PrismaClient2 = class {
      constructor() {
        throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
      }
    };
    function defineExtension(ext) {
      if (typeof ext === "function") {
        return ext;
      }
      return (client) => client.$extends(ext);
    }
    function getExtensionContext(that) {
      return that;
    }
    var Prisma = {
      defineExtension,
      getExtensionContext,
      prismaVersion: { client: clientVersion, engine: prisma2.enginesVersion }
    };
    var default_index_default = { Prisma };
  }
});

// ../database/node_modules/@prisma/client/default.js
var require_default2 = __commonJS({
  "../database/node_modules/@prisma/client/default.js"(exports, module) {
    module.exports = {
      ...require_default()
    };
  }
});

// ../database/src/client.ts
var import_client, globalForPrisma, prisma;
var init_client = __esm({
  "../database/src/client.ts"() {
    import_client = __toESM(require_default2());
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
    });
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prisma;
    }
  }
});

// ../database/src/subscription.ts
function generatePricingFromBasePrice(basePrice) {
  const monthlyPrice = basePrice;
  const quarterlyPrice = monthlyPrice * 3;
  const yearlyPrice = monthlyPrice * 12;
  return {
    monthly: {
      price: monthlyPrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: quarterlyPrice,
      discount: 5,
      // 5% discount for quarterly
      savings: quarterlyPrice * 0.05
    },
    yearly: {
      price: yearlyPrice,
      discount: 15,
      // 15% discount for yearly
      savings: yearlyPrice * 0.15
    }
  };
}
function convertPrismaPlanToPlan(prismaPlan) {
  return {
    id: prismaPlan.id,
    name: prismaPlan.name,
    description: prismaPlan.description,
    basePrice: prismaPlan.basePrice,
    currency: prismaPlan.currency,
    trialDays: prismaPlan.trialDays,
    limits: JSON.parse(prismaPlan.limits),
    features: JSON.parse(prismaPlan.features),
    isActive: prismaPlan.isActive,
    isPopular: prismaPlan.isPopular,
    sortOrder: prismaPlan.sortOrder,
    pricing: generatePricingFromBasePrice(prismaPlan.basePrice),
    createdAt: prismaPlan.createdAt,
    updatedAt: prismaPlan.updatedAt,
    deletedAt: prismaPlan.deletedAt || void 0
  };
}
async function getSubscriptionByMerchantId(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  if (!merchant) {
    return null;
  }
  const subscription = await prisma.subscription.findUnique({
    where: { merchantId: merchant.id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });
  if (!subscription)
    return null;
  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status,
    billingInterval: subscription.interval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: convertPrismaPlanToPlan(subscription.plan)
  };
}
var init_subscription = __esm({
  "../database/src/subscription.ts"() {
    init_client();
  }
});

// ../database/src/order-number-generator.ts
async function generateOrderNumber(config) {
  const {
    format: format2 = "sequential",
    outletId,
    prefix = "ORD",
    sequenceLength = 4,
    randomLength = 6,
    numericOnly = false
  } = config;
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const outletIdStr = outlet.id.toString().padStart(3, "0");
  const generatedAt = /* @__PURE__ */ new Date();
  switch (format2) {
    case "sequential":
      return await generateSequentialNumber(outletIdStr, prefix, sequenceLength);
    case "date-based":
      return await generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt);
    case "random":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, false);
    case "random-numeric":
      return await generateRandomNumber(outletIdStr, prefix, randomLength, true);
    case "compact-numeric":
      return await generateCompactNumericNumber(outletIdStr, prefix);
    case "hybrid":
      return await generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
    default:
      throw new Error(`Unsupported order number format: ${format2}`);
  }
}
async function generateSequentialNumber(outletIdStr, prefix, sequenceLength) {
  const maxRetries = 5;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const lastOrder = await tx.order.findFirst({
          where: {
            orderNumber: { startsWith: `${prefix}-${outletIdStr}-` }
          },
          orderBy: { createdAt: "desc" },
          select: { orderNumber: true, createdAt: true }
        });
        let nextSequence = 1;
        if (lastOrder) {
          const parts = lastOrder.orderNumber.split("-");
          const lastSequence = parseInt(parts[parts.length - 1]) || 0;
          nextSequence = lastSequence + 1;
        }
        const orderNumber = `${prefix}-${outletIdStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
        const existingOrder = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true }
        });
        if (existingOrder) {
          throw new Error("Order number collision detected");
        }
        return {
          orderNumber,
          sequence: nextSequence,
          generatedAt: /* @__PURE__ */ new Date()
        };
      });
      return result;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to generate sequential order number after ${maxRetries} retries: ${errorMessage}`);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 10));
    }
  }
  throw new Error("Maximum retries exceeded");
}
async function generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const result = await prisma.$transaction(async (tx) => {
    const lastOrder = await tx.order.findFirst({
      where: {
        orderNumber: { startsWith: `${prefix}-${outletIdStr}-${dateStr}-` }
      },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true }
    });
    let nextSequence = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split("-");
      const lastSequence = parseInt(parts[parts.length - 1]) || 0;
      nextSequence = lastSequence + 1;
    }
    const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${nextSequence.toString().padStart(sequenceLength, "0")}`;
    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true }
    });
    if (existingOrder) {
      throw new Error("Order number collision detected");
    }
    return {
      orderNumber,
      sequence: nextSequence,
      generatedAt
    };
  });
  return result;
}
async function generateRandomNumber(outletIdStr, prefix, randomLength, numericOnly = false) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString2(randomLength, numericOnly);
      const orderNumber = `${prefix}-${outletIdStr}-${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for random
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate random order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique random order number after ${maxRetries} attempts`);
}
async function generateCompactNumericNumber(outletIdStr, prefix) {
  const maxRetries = 10;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      const randomStr = generateRandomString2(5, true);
      const orderNumber = `${prefix}${outletIdStr}${randomStr}`;
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });
      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0,
          // No sequence for compact numeric
          generatedAt: /* @__PURE__ */ new Date()
        };
      }
      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate compact numeric order number: ${errorMessage}`);
    }
  }
  throw new Error(`Failed to generate unique compact numeric order number after ${maxRetries} attempts`);
}
async function generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly = false) {
  const dateStr = generatedAt.toISOString().split("T")[0].replace(/-/g, "");
  const randomStr = generateRandomString2(4, numericOnly);
  const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${randomStr}`;
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true }
  });
  if (existingOrder) {
    return generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
  }
  return {
    orderNumber,
    sequence: 0,
    // No sequence for hybrid
    generatedAt
  };
}
function generateRandomString2(length, numericOnly = false) {
  const chars = numericOnly ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    const crypto = __require("crypto");
    const randomBytesNode = crypto.randomBytes(length);
    randomBytes.set(randomBytesNode);
  }
  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("");
}
async function getOutletOrderStats(outletId) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });
  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [totalOrders, todayOrders, lastOrder] = await Promise.all([
    prisma.order.count({
      where: { outletId: outlet.id }
    }),
    prisma.order.count({
      where: {
        outletId: outlet.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.order.findFirst({
      where: { outletId: outlet.id },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, createdAt: true }
    })
  ]);
  return {
    totalOrders,
    todayOrders,
    lastOrderNumber: lastOrder?.orderNumber,
    lastOrderDate: lastOrder?.createdAt
  };
}
async function createOrderNumberWithFormat(outletId, format2) {
  const config = {
    format: format2,
    outletId,
    prefix: "ORD",
    sequenceLength: 4,
    randomLength: 6};
  return await generateOrderNumber(config);
}
var init_order_number_generator = __esm({
  "../database/src/order-number-generator.ts"() {
    init_src();
  }
});

// ../database/src/audit.ts
var AuditLogger;
var init_audit = __esm({
  "../database/src/audit.ts"() {
    AuditLogger = class {
      constructor(prisma2) {
        this.idCounter = 0;
        this.prisma = prisma2;
      }
      // Get next public ID
      async getNextPublicId() {
        return 1;
      }
      // Main logging method
      async log(data) {
        try {
          console.log("\u{1F50D} AuditLogger.log - Starting audit log creation...");
          const id = await this.getNextPublicId();
          console.log("\u{1F50D} AuditLogger.log - Got id:", id);
          const validatedUserId = await this.validateUserId(data.context.userId);
          const validatedMerchantId = await this.validateMerchantId(data.context.merchantId);
          const validatedOutletId = await this.validateOutletId(data.context.outletId);
          console.log("\u{1F50D} AuditLogger.log - About to create audit log with data:", {
            id,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            userId: validatedUserId,
            merchantId: validatedMerchantId,
            outletId: validatedOutletId
          });
          console.log("\u{1F50D} Audit log would be created:", {
            id,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId
          });
          console.log("\u2705 AuditLogger.log - Audit log created successfully");
        } catch (error) {
          console.error("\u274C AuditLogger.log - Audit logging failed:", error);
          console.error("\u274C AuditLogger.log - Error details:", error instanceof Error ? error.message : String(error));
          console.error("\u274C AuditLogger.log - Error stack:", error instanceof Error ? error.stack : void 0);
        }
      }
      // Validate foreign key IDs to prevent constraint violations
      async validateUserId(userId) {
        if (!userId)
          return null;
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
          });
          return user ? userId : null;
        } catch (error) {
          console.warn("\u26A0\uFE0F AuditLogger - Failed to validate userId:", userId, error);
          return null;
        }
      }
      async validateMerchantId(merchantId) {
        if (!merchantId)
          return null;
        try {
          const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true }
          });
          return merchant ? merchantId : null;
        } catch (error) {
          console.warn("\u26A0\uFE0F AuditLogger - Failed to validate merchantId:", merchantId, error);
          return null;
        }
      }
      async validateOutletId(outletId) {
        if (!outletId)
          return null;
        try {
          const outlet = await this.prisma.outlet.findUnique({
            where: { id: outletId },
            select: { id: true }
          });
          return outlet ? outletId : null;
        } catch (error) {
          console.warn("\u26A0\uFE0F AuditLogger - Failed to validate outletId:", outletId, error);
          return null;
        }
      }
      // Convenience methods for common operations
      async logCreate(entityType, entityId, entityName, newValues, context, description) {
        await this.log({
          action: "CREATE",
          entityType,
          entityId,
          entityName,
          newValues,
          description: description || `Created ${entityType.toLowerCase()}: ${entityName}`,
          context
        });
      }
      async logUpdate(entityType, entityId, entityName, oldValues, newValues, context, description) {
        const changes = this.calculateChanges(oldValues, newValues);
        await this.log({
          action: "UPDATE",
          entityType,
          entityId,
          entityName,
          oldValues,
          newValues,
          changes,
          description: description || `Updated ${entityType.toLowerCase()}: ${entityName}`,
          context
        });
      }
      async logDelete(entityType, entityId, entityName, oldValues, context, description) {
        await this.log({
          action: "DELETE",
          entityType,
          entityId,
          entityName,
          oldValues,
          description: description || `Deleted ${entityType.toLowerCase()}: ${entityName}`,
          context
        });
      }
      async logLogin(userId, userEmail, userRole, context, success = true) {
        await this.log({
          action: "LOGIN",
          entityType: "User",
          entityId: userId.toString(),
          entityName: userEmail,
          newValues: { success, timestamp: (/* @__PURE__ */ new Date()).toISOString() },
          severity: success ? "INFO" : "WARNING",
          category: "SECURITY",
          description: success ? `User logged in: ${userEmail}` : `Failed login attempt: ${userEmail}`,
          context
        });
      }
      async logLogout(userId, userEmail, context) {
        await this.log({
          action: "LOGOUT",
          entityType: "User",
          entityId: userId.toString(),
          entityName: userEmail,
          category: "SECURITY",
          description: `User logged out: ${userEmail}`,
          context
        });
      }
      async logSecurityEvent(event, entityType, entityId, context, severity = "WARNING", description) {
        await this.log({
          action: "CUSTOM",
          entityType,
          entityId,
          severity,
          category: "SECURITY",
          description: description || `Security event: ${event}`,
          context
        });
      }
      // Calculate changes between old and new values
      calculateChanges(oldValues, newValues) {
        const changes = {};
        const allKeys = /* @__PURE__ */ new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
        for (const key of Array.from(allKeys)) {
          const oldValue = oldValues[key];
          const newValue = newValues[key];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { old: oldValue, new: newValue };
          }
        }
        return changes;
      }
      // Query audit logs
      async getAuditLogs(filter = {}) {
        const where = {};
        if (filter.action)
          where.action = filter.action;
        if (filter.entityType)
          where.entityType = filter.entityType;
        if (filter.entityId)
          where.entityId = filter.entityId;
        if (filter.userId)
          where.userId = filter.userId;
        if (filter.merchantId)
          where.merchantId = filter.merchantId;
        if (filter.outletId)
          where.outletId = filter.outletId;
        if (filter.severity)
          where.severity = filter.severity;
        if (filter.category)
          where.category = filter.category;
        if (filter.startDate || filter.endDate) {
          where.createdAt = {};
          if (filter.startDate)
            where.createdAt.gte = filter.startDate;
          if (filter.endDate)
            where.createdAt.lte = filter.endDate;
        }
        const limit = filter.limit || 50;
        const offset = filter.offset || 0;
        const logs = [];
        const total = 0;
        const transformedLogs = logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: log.entityName,
          user: log.user ? {
            id: log.user.id,
            email: log.user.email,
            name: `${log.user.firstName} ${log.user.lastName}`,
            role: log.user.role
          } : null,
          merchant: log.merchant ? {
            id: log.merchant.id,
            name: log.merchant.name
          } : null,
          outlet: log.outlet ? {
            id: log.outlet.id,
            name: log.outlet.name
          } : null,
          oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
          newValues: log.newValues ? JSON.parse(log.newValues) : null,
          changes: log.changes ? JSON.parse(log.changes) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId,
          requestId: log.requestId,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          severity: log.severity,
          category: log.category,
          description: log.description,
          createdAt: log.createdAt
        }));
        return {
          logs: transformedLogs,
          total,
          hasMore: offset + limit < total
        };
      }
      // Get audit statistics
      async getAuditStats(filter = {}) {
        const where = {};
        if (filter.merchantId)
          where.merchantId = filter.merchantId;
        if (filter.outletId)
          where.outletId = filter.outletId;
        if (filter.startDate || filter.endDate) {
          where.createdAt = {};
          if (filter.startDate)
            where.createdAt.gte = filter.startDate;
          if (filter.endDate)
            where.createdAt.lte = filter.endDate;
        }
        const totalLogs = 0;
        const actionStats = [];
        const entityStats = [];
        const severityStats = [];
        const categoryStats = [];
        const recentActivity = 0;
        return {
          totalLogs,
          logsByAction: actionStats.reduce((acc, item) => {
            acc[item.action] = item._count.action;
            return acc;
          }, {}),
          logsByEntity: entityStats.reduce((acc, item) => {
            acc[item.entityType] = item._count.entityType;
            return acc;
          }, {}),
          logsBySeverity: severityStats.reduce((acc, item) => {
            acc[item.severity] = item._count.severity;
            return acc;
          }, {}),
          logsByCategory: categoryStats.reduce((acc, item) => {
            acc[item.category] = item._count.category;
            return acc;
          }, {}),
          recentActivity
        };
      }
    };
  }
});

// ../database/src/index.ts
var init_src = __esm({
  "../database/src/index.ts"() {
    init_client();
    init_subscription();
    init_audit();
    init_order_number_generator();
  }
});

// src/core/subscription-manager.ts
exports.SubscriptionManager = void 0; exports.checkSubscriptionStatus = void 0; exports.shouldThrowPlanLimitError = void 0; exports.getPlanLimitError = void 0; exports.getSubscriptionError = void 0; exports.validateSubscriptionAccess = void 0; exports.canPerformOperation = void 0; exports.getPlanLimitErrorMessage = void 0; exports.getAllowedOperations = void 0; exports.calculateSubscriptionPeriod = void 0; exports.formatSubscriptionPeriod = void 0; exports.getSubscriptionStatusBadge = void 0; exports.calculateNewBillingDate = void 0; exports.isSubscriptionExpired = void 0; exports.isGracePeriodExceeded = void 0; exports.validateForRenewal = void 0; exports.getSubscriptionStatusPriority = void 0; exports.sortSubscriptionsByStatus = void 0; exports.subscriptionNeedsAttention = void 0;
var init_subscription_manager = __esm({
  "src/core/subscription-manager.ts"() {
    init_core();
    init_src();
    exports.SubscriptionManager = class {
      // ============================================================================
      // CORE SUBSCRIPTION CHECKING
      // ============================================================================
      /**
       * Check if user has valid subscription
       */
      static async checkStatus(user) {
        try {
          if (!user?.merchant?.id) {
            console.log("\u{1F50D} SUBSCRIPTION: No merchant found for user");
            return true;
          }
          const subscriptionError = await this.getError(user);
          return subscriptionError === null;
        } catch (error) {
          console.error("Error checking subscription status:", error);
          return false;
        }
      }
      /**
       * Check if subscription error should be thrown
       */
      static async shouldThrowError(user) {
        try {
          if (!user?.merchant?.id) {
            return false;
          }
          const subscriptionError = await this.getError(user);
          return subscriptionError !== null;
        } catch (error) {
          console.error("Error checking subscription status:", error);
          return true;
        }
      }
      /**
       * Get subscription error if any
       */
      static async getError(user) {
        try {
          if (!user?.merchant?.id) {
            return null;
          }
          let merchantId = user.merchant.id;
          if (typeof merchantId === "string") {
            console.log("\u{1F50D} SUBSCRIPTION: Merchant ID is string, converting to numeric id");
            const numericId = parseInt(merchantId);
            if (isNaN(numericId)) {
              console.log("\u{1F50D} SUBSCRIPTION: Invalid merchant ID:", merchantId);
              return new exports.PlanLimitError("Invalid merchant ID", "SUBSCRIPTION_NOT_FOUND");
            }
            merchantId = numericId;
            console.log("\u{1F50D} SUBSCRIPTION: Converted string to id:", merchantId);
          }
          console.log("\u{1F50D} SUBSCRIPTION: Using merchantId:", merchantId, "type:", typeof merchantId);
          const subscription = await getSubscriptionByMerchantId(merchantId);
          console.log("\u{1F50D} SUBSCRIPTION: Subscription data:", {
            found: !!subscription,
            status: subscription?.status,
            currentPeriodEnd: subscription?.currentPeriodEnd
          });
          if (!subscription) {
            console.log("\u{1F50D} SUBSCRIPTION: No subscription found for merchant");
            return new exports.PlanLimitError("No active subscription found", "SUBSCRIPTION_NOT_FOUND");
          }
          const status = subscription.status?.toLowerCase();
          const errorStatuses = ["cancelled", "expired", "suspended", "past_due", "paused"];
          if (errorStatuses.includes(status)) {
            console.log("\u{1F50D} SUBSCRIPTION: Subscription status is error status:", status);
            return new exports.PlanLimitError(
              `Your subscription has been ${status}. Please renew to continue using our services.`,
              "SUBSCRIPTION_ACCESS_DENIED"
            );
          }
          if (subscription.currentPeriodEnd) {
            const currentDate = /* @__PURE__ */ new Date();
            const endDate = new Date(subscription.currentPeriodEnd);
            console.log("\u{1F50D} SUBSCRIPTION: Date validation:", {
              currentDate: currentDate.toISOString(),
              endDate: endDate.toISOString(),
              isExpired: currentDate > endDate
            });
            if (currentDate > endDate) {
              console.log("\u{1F50D} SUBSCRIPTION: Subscription is past end date, treating as expired");
              return new exports.PlanLimitError(
                "Your subscription has expired. Please renew to continue using our services.",
                "SUBSCRIPTION_EXPIRED"
              );
            }
          }
          console.log("\u{1F50D} SUBSCRIPTION: Subscription is valid");
          return null;
        } catch (error) {
          console.error("\u{1F50D} SUBSCRIPTION: Error checking subscription status:", error);
          return new exports.PlanLimitError("Unable to verify subscription status", "SUBSCRIPTION_ACCESS_DENIED");
        }
      }
      // ============================================================================
      // ADVANCED VALIDATION
      // ============================================================================
      /**
       * Comprehensive subscription validation with options
       */
      static async validateAccess(user, options = {}) {
        const {
          requireActiveSubscription = true,
          allowedStatuses = ["active", "trial"],
          checkMerchantStatus = true,
          checkSubscriptionStatus: checkSubscriptionStatus2 = true,
          autoUpdateExpired = false
        } = options;
        try {
          if (!user?.merchant?.id) {
            return {
              isValid: false,
              error: "User not associated with any merchant",
              statusCode: 400
            };
          }
          if (checkMerchantStatus && user.merchant.status !== "active") {
            return {
              isValid: false,
              error: `Merchant account is ${user.merchant.status}`,
              statusCode: 403,
              merchant: user.merchant
            };
          }
          if (checkSubscriptionStatus2 && requireActiveSubscription) {
            const subscriptionError = await this.getError(user);
            if (subscriptionError) {
              return {
                isValid: false,
                error: subscriptionError.message,
                statusCode: subscriptionError.statusCode,
                isExpired: subscriptionError.code === "TOKEN_EXPIRED" /* TOKEN_EXPIRED */
              };
            }
          }
          return {
            isValid: true,
            subscription: user.subscription,
            merchant: user.merchant
          };
        } catch (error) {
          console.error("Subscription validation error:", error);
          return {
            isValid: false,
            error: "Unable to validate subscription access",
            statusCode: 500
          };
        }
      }
      /**
       * Check if subscription status allows specific operations
       */
      static canPerformOperation(subscriptionStatus, operation) {
        const status = subscriptionStatus.toLowerCase();
        switch (operation) {
          case "read":
            return ["active", "trial", "past_due"].includes(status);
          case "create":
          case "update":
            return ["active", "trial"].includes(status);
          case "delete":
            return status === "active";
          case "admin":
            return status === "active";
          default:
            return false;
        }
      }
      /**
       * Get subscription error message for UI display
       */
      static getErrorMessage(subscriptionStatus, merchantStatus) {
        const status = subscriptionStatus.toLowerCase();
        if (merchantStatus && merchantStatus !== "active") {
          return `Merchant account is ${merchantStatus}. Please contact support.`;
        }
        const messages = {
          "cancelled": "Your subscription has been cancelled. Please contact support to reactivate your account.",
          "expired": "Your subscription has expired. Please renew to continue using our services.",
          "suspended": "Your subscription has been suspended. Please contact support for assistance.",
          "past_due": "Your subscription payment is past due. Please update your payment method.",
          "paused": "Your subscription is paused. Please contact support to reactivate your account."
        };
        return messages[status] || "There is an issue with your subscription. Please contact support.";
      }
      /**
       * Get allowed operations for subscription status
       */
      static getAllowedOperations(subscriptionStatus) {
        const operations = [];
        if (this.canPerformOperation(subscriptionStatus, "read")) {
          operations.push("read");
        }
        if (this.canPerformOperation(subscriptionStatus, "create")) {
          operations.push("create");
        }
        if (this.canPerformOperation(subscriptionStatus, "update")) {
          operations.push("update");
        }
        if (this.canPerformOperation(subscriptionStatus, "delete")) {
          operations.push("delete");
        }
        if (this.canPerformOperation(subscriptionStatus, "admin")) {
          operations.push("admin");
        }
        return operations;
      }
      // ============================================================================
      // PERIOD UTILITIES
      // ============================================================================
      /**
       * Calculate subscription period details
       */
      static calculatePeriod(startDate, endDate, status, interval = "month") {
        const now = /* @__PURE__ */ new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
        return {
          startDate,
          endDate,
          duration: interval,
          isActive: status.toLowerCase() === "active" || status.toLowerCase() === "trial",
          daysRemaining,
          nextBillingDate: endDate,
          isTrial: status.toLowerCase() === "trial"
        };
      }
      /**
       * Format subscription period for display
       */
      static formatPeriod(period) {
        const formatDate2 = (date) => {
          return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          }).format(date);
        };
        const formatTimeRemaining = (days) => {
          if (days <= 0)
            return "Expired";
          if (days === 1)
            return "1 day remaining";
          if (days < 30)
            return `${days} days remaining`;
          if (days < 365) {
            const months = Math.floor(days / 30);
            return months === 1 ? "1 month remaining" : `${months} months remaining`;
          }
          const years = Math.floor(days / 365);
          return years === 1 ? "1 year remaining" : `${years} years remaining`;
        };
        return {
          period: `${formatDate2(period.startDate)} - ${formatDate2(period.endDate)}`,
          duration: period.duration,
          timeRemaining: formatTimeRemaining(period.daysRemaining),
          nextBilling: formatDate2(period.nextBillingDate),
          isActive: period.isActive,
          isTrial: period.isTrial
        };
      }
      /**
       * Get subscription status badge
       */
      static getStatusBadge(status, daysRemaining) {
        const statusConfig = {
          active: { color: "bg-green-100 text-green-800", text: "Active" },
          trial: { color: "bg-blue-100 text-blue-800", text: "Trial" },
          expired: { color: "bg-red-100 text-red-800", text: "Expired" },
          cancelled: { color: "bg-gray-100 text-gray-800", text: "Cancelled" },
          suspended: { color: "bg-orange-100 text-orange-800", text: "Suspended" },
          past_due: { color: "bg-yellow-100 text-yellow-800", text: "Past Due" },
          paused: { color: "bg-purple-100 text-purple-800", text: "Paused" }
        };
        const config = statusConfig[status.toLowerCase()] || { color: "bg-gray-100 text-gray-800", text: status };
        return {
          color: config.color,
          text: config.text,
          daysRemaining
        };
      }
      // ============================================================================
      // RENEWAL UTILITIES
      // ============================================================================
      /**
       * Calculate new billing date based on subscription interval
       */
      static calculateNewBillingDate(subscription) {
        const currentDate = /* @__PURE__ */ new Date();
        const interval = subscription.interval || "month";
        const intervalCount = subscription.intervalCount || 1;
        const newDate = new Date(currentDate);
        switch (interval) {
          case "day":
            newDate.setDate(newDate.getDate() + intervalCount);
            break;
          case "week":
            newDate.setDate(newDate.getDate() + intervalCount * 7);
            break;
          case "month":
            newDate.setMonth(newDate.getMonth() + intervalCount);
            break;
          case "year":
            newDate.setFullYear(newDate.getFullYear() + intervalCount);
            break;
          default:
            newDate.setMonth(newDate.getMonth() + intervalCount);
        }
        return newDate;
      }
      /**
       * Check if subscription is expired
       */
      static isExpired(subscription) {
        if (!subscription.currentPeriodEnd)
          return false;
        const now = /* @__PURE__ */ new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        return now > endDate;
      }
      /**
       * Check if grace period is exceeded
       */
      static isGracePeriodExceeded(subscription, gracePeriodDays = 7) {
        if (!subscription.currentPeriodEnd)
          return false;
        const now = /* @__PURE__ */ new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        const gracePeriodEnd = new Date(endDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1e3);
        return now > gracePeriodEnd;
      }
      /**
       * Validate subscription for renewal
       */
      static validateForRenewal(subscription, gracePeriodDays = 7) {
        if (!subscription) {
          return {
            canRenew: false,
            reason: "Subscription not found"
          };
        }
        if (subscription.status === "cancelled") {
          return {
            canRenew: false,
            reason: "Subscription is cancelled"
          };
        }
        if (subscription.status === "active" && !this.isExpired(subscription)) {
          return {
            canRenew: false,
            reason: "Subscription is still active"
          };
        }
        if (this.isGracePeriodExceeded(subscription, gracePeriodDays)) {
          return {
            canRenew: false,
            reason: "Grace period exceeded"
          };
        }
        return {
          canRenew: true
        };
      }
      // ============================================================================
      // UTILITY FUNCTIONS
      // ============================================================================
      /**
       * Get subscription status priority (for sorting/display)
       */
      static getStatusPriority(status) {
        const priorities = {
          "active": 1,
          "trial": 2,
          "past_due": 3,
          "paused": 4,
          "suspended": 5,
          "expired": 6,
          "cancelled": 7
        };
        return priorities[status.toLowerCase()] || 999;
      }
      /**
       * Sort subscriptions by status priority
       */
      static sortByStatus(subscriptions) {
        return [...subscriptions].sort((a, b) => {
          const priorityA = this.getStatusPriority(a.status);
          const priorityB = this.getStatusPriority(b.status);
          return priorityA - priorityB;
        });
      }
      /**
       * Check if subscription needs attention
       */
      static needsAttention(subscription) {
        if (!subscription) {
          return {
            needsAttention: false,
            urgency: "low"
          };
        }
        const status = subscription.status?.toLowerCase();
        const daysRemaining = subscription.daysRemaining || 0;
        if (status === "expired" || status === "cancelled") {
          return {
            needsAttention: true,
            reason: `Subscription is ${status}`,
            urgency: "critical"
          };
        }
        if (status === "suspended" || status === "past_due") {
          return {
            needsAttention: true,
            reason: `Subscription is ${status}`,
            urgency: "high"
          };
        }
        if (status === "trial" && daysRemaining <= 3) {
          return {
            needsAttention: true,
            reason: "Trial ending soon",
            urgency: "medium"
          };
        }
        if (status === "paused") {
          return {
            needsAttention: true,
            reason: "Subscription is paused",
            urgency: "medium"
          };
        }
        if (status === "active" && daysRemaining <= 7) {
          return {
            needsAttention: true,
            reason: "Subscription ending soon",
            urgency: "low"
          };
        }
        return {
          needsAttention: false,
          urgency: "low"
        };
      }
    };
    exports.checkSubscriptionStatus = exports.SubscriptionManager.checkStatus;
    exports.shouldThrowPlanLimitError = exports.SubscriptionManager.shouldThrowError;
    exports.getPlanLimitError = exports.SubscriptionManager.getError;
    exports.getSubscriptionError = exports.SubscriptionManager.getError;
    exports.validateSubscriptionAccess = exports.SubscriptionManager.validateAccess;
    exports.canPerformOperation = exports.SubscriptionManager.canPerformOperation;
    exports.getPlanLimitErrorMessage = exports.SubscriptionManager.getErrorMessage;
    exports.getAllowedOperations = exports.SubscriptionManager.getAllowedOperations;
    exports.calculateSubscriptionPeriod = exports.SubscriptionManager.calculatePeriod;
    exports.formatSubscriptionPeriod = exports.SubscriptionManager.formatPeriod;
    exports.getSubscriptionStatusBadge = exports.SubscriptionManager.getStatusBadge;
    exports.calculateNewBillingDate = exports.SubscriptionManager.calculateNewBillingDate;
    exports.isSubscriptionExpired = exports.SubscriptionManager.isExpired;
    exports.isGracePeriodExceeded = exports.SubscriptionManager.isGracePeriodExceeded;
    exports.validateForRenewal = exports.SubscriptionManager.validateForRenewal;
    exports.getSubscriptionStatusPriority = exports.SubscriptionManager.getStatusPriority;
    exports.sortSubscriptionsByStatus = exports.SubscriptionManager.sortByStatus;
    exports.subscriptionNeedsAttention = exports.SubscriptionManager.needsAttention;
  }
});

// src/core/proration.ts
function calculateProration(currentSubscription, newPlanPrice, changeDate = /* @__PURE__ */ new Date()) {
  const currentPrice = currentSubscription.amount;
  const priceDifference = newPlanPrice - currentPrice;
  const periodStart = new Date(currentSubscription.currentPeriodStart);
  const periodEnd = new Date(currentSubscription.currentPeriodEnd);
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1e3 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((periodEnd.getTime() - changeDate.getTime()) / (1e3 * 60 * 60 * 24));
  const isUpgrade = priceDifference > 0;
  const isDowngrade = priceDifference < 0;
  const dailyRate = Math.abs(priceDifference) / daysInPeriod;
  const proratedAmount = dailyRate * daysRemaining;
  let chargeAmount = 0;
  let creditAmount = 0;
  let reason = "";
  if (isUpgrade) {
    chargeAmount = Math.round(proratedAmount * 100) / 100;
    reason = `Upgrade proration: ${daysRemaining} days remaining at $${dailyRate.toFixed(2)}/day`;
  } else if (isDowngrade) {
    creditAmount = Math.round(proratedAmount * 100) / 100;
    reason = `Downgrade credit: ${daysRemaining} days remaining at $${dailyRate.toFixed(2)}/day`;
  } else {
    reason = "Same price - no proration needed";
  }
  return {
    isUpgrade,
    isDowngrade,
    currentPlanPrice: currentPrice,
    newPlanPrice,
    daysRemaining,
    daysInPeriod,
    proratedAmount,
    creditAmount,
    chargeAmount,
    reason
  };
}
function shouldApplyProration(currentPrice, newPrice) {
  return newPrice > currentPrice;
}
function formatProration(proration) {
  if (proration.chargeAmount > 0) {
    return `Charge $${proration.chargeAmount.toFixed(2)} (${proration.reason})`;
  } else if (proration.creditAmount > 0) {
    return `Credit $${proration.creditAmount.toFixed(2)} (${proration.reason})`;
  } else {
    return "No proration needed";
  }
}
var init_proration = __esm({
  "src/core/proration.ts"() {
  }
});

// ../../node_modules/lucide-react/dist/esm/defaultAttributes.mjs
var defaultAttributes;
var init_defaultAttributes = __esm({
  "../../node_modules/lucide-react/dist/esm/defaultAttributes.mjs"() {
    defaultAttributes = {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    };
  }
});
var toKebabCase, createLucideIcon, createLucideIcon$1;
var init_createLucideIcon = __esm({
  "../../node_modules/lucide-react/dist/esm/createLucideIcon.mjs"() {
    init_defaultAttributes();
    toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    createLucideIcon = (iconName, iconNode) => {
      const Component = React.forwardRef(
        ({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, children, ...rest }, ref) => React.createElement(
          "svg",
          {
            ref,
            ...defaultAttributes,
            width: size,
            height: size,
            stroke: color,
            strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
            className: `lucide lucide-${toKebabCase(iconName)}`,
            ...rest
          },
          [
            ...iconNode.map(([tag, attrs]) => React.createElement(tag, attrs)),
            ...(Array.isArray(children) ? children : [children]) || []
          ]
        )
      );
      Component.displayName = `${iconName}`;
      return Component;
    };
    createLucideIcon$1 = createLucideIcon;
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/alert-triangle.mjs
var AlertTriangle;
var init_alert_triangle = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/alert-triangle.mjs"() {
    init_createLucideIcon();
    AlertTriangle = createLucideIcon$1("AlertTriangle", [
      [
        "path",
        {
          d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
          key: "c3ski4"
        }
      ],
      ["path", { d: "M12 9v4", key: "juzpu7" }],
      ["path", { d: "M12 17h.01", key: "p32p05" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/building-2.mjs
var Building2;
var init_building_2 = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/building-2.mjs"() {
    init_createLucideIcon();
    Building2 = createLucideIcon$1("Building2", [
      ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
      ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
      ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
      ["path", { d: "M10 6h4", key: "1itunk" }],
      ["path", { d: "M10 10h4", key: "tcdvrf" }],
      ["path", { d: "M10 14h4", key: "kelpxr" }],
      ["path", { d: "M10 18h4", key: "1ulq68" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/check-circle.mjs
var CheckCircle;
var init_check_circle = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/check-circle.mjs"() {
    init_createLucideIcon();
    CheckCircle = createLucideIcon$1("CheckCircle", [
      ["path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14", key: "g774vq" }],
      ["polyline", { points: "22 4 12 14.01 9 11.01", key: "6xbx8j" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/dollar-sign.mjs
var DollarSign;
var init_dollar_sign = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/dollar-sign.mjs"() {
    init_createLucideIcon();
    DollarSign = createLucideIcon$1("DollarSign", [
      ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
      [
        "path",
        { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }
      ]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/file-text.mjs
var FileText;
var init_file_text = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/file-text.mjs"() {
    init_createLucideIcon();
    FileText = createLucideIcon$1("FileText", [
      [
        "path",
        {
          d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z",
          key: "1nnpy2"
        }
      ],
      ["polyline", { points: "14 2 14 8 20 8", key: "1ew0cm" }],
      ["line", { x1: "16", x2: "8", y1: "13", y2: "13", key: "14keom" }],
      ["line", { x1: "16", x2: "8", y1: "17", y2: "17", key: "17nazh" }],
      ["line", { x1: "10", x2: "8", y1: "9", y2: "9", key: "1a5vjj" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/map-pin.mjs
var MapPin;
var init_map_pin = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/map-pin.mjs"() {
    init_createLucideIcon();
    MapPin = createLucideIcon$1("MapPin", [
      [
        "path",
        { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", key: "2oe9fu" }
      ],
      ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/package.mjs
var Package;
var init_package = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/package.mjs"() {
    init_createLucideIcon();
    Package = createLucideIcon$1("Package", [
      ["path", { d: "M16.5 9.4 7.55 4.24", key: "10qotr" }],
      [
        "path",
        {
          d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
          key: "yt0hxn"
        }
      ],
      ["polyline", { points: "3.29 7 12 12 20.71 7", key: "ousv84" }],
      ["line", { x1: "12", x2: "12", y1: "22", y2: "12", key: "a4e8g8" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/shield.mjs
var Shield;
var init_shield = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/shield.mjs"() {
    init_createLucideIcon();
    Shield = createLucideIcon$1("Shield", [
      ["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", key: "3xmgem" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/shopping-cart.mjs
var ShoppingCart;
var init_shopping_cart = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/shopping-cart.mjs"() {
    init_createLucideIcon();
    ShoppingCart = createLucideIcon$1("ShoppingCart", [
      ["circle", { cx: "8", cy: "21", r: "1", key: "jimo8o" }],
      ["circle", { cx: "19", cy: "21", r: "1", key: "13723u" }],
      [
        "path",
        {
          d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
          key: "9zh506"
        }
      ]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/store.mjs
var Store;
var init_store = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/store.mjs"() {
    init_createLucideIcon();
    Store = createLucideIcon$1("Store", [
      [
        "path",
        {
          d: "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7",
          key: "ztvudi"
        }
      ],
      ["path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", key: "1b2hhj" }],
      ["path", { d: "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4", key: "2ebpfo" }],
      ["path", { d: "M2 7h20", key: "1fcdvo" }],
      [
        "path",
        {
          d: "M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7",
          key: "jon5kx"
        }
      ]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/trending-down.mjs
var TrendingDown;
var init_trending_down = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/trending-down.mjs"() {
    init_createLucideIcon();
    TrendingDown = createLucideIcon$1("TrendingDown", [
      ["polyline", { points: "22 17 13.5 8.5 8.5 13.5 2 7", key: "1r2t7k" }],
      ["polyline", { points: "16 17 22 17 22 11", key: "11uiuu" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/trending-up.mjs
var TrendingUp;
var init_trending_up = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/trending-up.mjs"() {
    init_createLucideIcon();
    TrendingUp = createLucideIcon$1("TrendingUp", [
      ["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17", key: "126l90" }],
      ["polyline", { points: "16 7 22 7 22 13", key: "kwv8wd" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/user-check.mjs
var UserCheck;
var init_user_check = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/user-check.mjs"() {
    init_createLucideIcon();
    UserCheck = createLucideIcon$1("UserCheck", [
      ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
      ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
      ["polyline", { points: "16 11 18 13 22 9", key: "1pwet4" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/user-x.mjs
var UserX;
var init_user_x = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/user-x.mjs"() {
    init_createLucideIcon();
    UserX = createLucideIcon$1("UserX", [
      ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
      ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
      ["line", { x1: "17", x2: "22", y1: "8", y2: "13", key: "3nzzx3" }],
      ["line", { x1: "22", x2: "17", y1: "8", y2: "13", key: "1swrse" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/user.mjs
var User;
var init_user = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/user.mjs"() {
    init_createLucideIcon();
    User = createLucideIcon$1("User", [
      ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
      ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/icons/x-circle.mjs
var XCircle;
var init_x_circle = __esm({
  "../../node_modules/lucide-react/dist/esm/icons/x-circle.mjs"() {
    init_createLucideIcon();
    XCircle = createLucideIcon$1("XCircle", [
      ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
      ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
      ["path", { d: "m9 9 6 6", key: "z0biqf" }]
    ]);
  }
});

// ../../node_modules/lucide-react/dist/esm/lucide-react.mjs
var init_lucide_react = __esm({
  "../../node_modules/lucide-react/dist/esm/lucide-react.mjs"() {
    init_alert_triangle();
    init_building_2();
    init_check_circle();
    init_dollar_sign();
    init_file_text();
    init_map_pin();
    init_package();
    init_shield();
    init_shopping_cart();
    init_store();
    init_trending_down();
    init_trending_up();
    init_user_check();
    init_user_x();
    init_user();
    init_x_circle();
  }
});
exports.getStatusBadgeConfig = void 0; exports.getStatusBadge = void 0; exports.getRoleBadgeConfig = void 0; exports.getRoleBadge = void 0; exports.getLocationBadgeConfig = void 0; exports.getLocationBadge = void 0; exports.getAvailabilityBadgeConfig = void 0; exports.getAvailabilityBadge = void 0; exports.getPriceTrendBadgeConfig = void 0; exports.getPriceTrendBadge = void 0; exports.getCustomerStatusBadge = void 0; exports.getUserStatusBadge = void 0; exports.getProductStatusBadge = void 0;
var init_badge_utils = __esm({
  "src/core/badge-utils.tsx"() {
    init_lucide_react();
    exports.getStatusBadgeConfig = (isActive, entityType = "entity") => {
      const status = isActive ? CONSTANTS.ENTITY_STATUS.ACTIVE : CONSTANTS.ENTITY_STATUS.INACTIVE;
      const colorClass = CONSTANTS.getStatusColor(status, entityType);
      const label = CONSTANTS.getStatusLabel(status, entityType);
      let Icon;
      switch (entityType) {
        case "availability":
          Icon = isActive ? CheckCircle : XCircle;
          break;
        default:
          Icon = isActive ? UserCheck : UserX;
      }
      return {
        color: colorClass,
        icon: Icon,
        text: label
      };
    };
    exports.getStatusBadge = ({ isActive, entityType = "entity" }) => {
      const config = exports.getStatusBadgeConfig(isActive, entityType);
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getRoleBadgeConfig = (role) => {
      const roleConfig = {
        [CONSTANTS.USER_ROLE.ADMIN]: { color: "bg-red-100 text-red-800", icon: Shield, text: "Admin" },
        [CONSTANTS.USER_ROLE.MERCHANT]: { color: "bg-blue-100 text-blue-800", icon: Building2, text: "Merchant" },
        [CONSTANTS.USER_ROLE.OUTLET_ADMIN]: { color: "bg-green-100 text-green-800", icon: Store, text: "Outlet Admin" },
        [CONSTANTS.USER_ROLE.OUTLET_STAFF]: { color: "bg-gray-100 text-gray-800", icon: User, text: "Outlet Staff" }
      };
      return roleConfig[role] || {
        color: "bg-gray-100 text-gray-800",
        icon: User,
        text: role
      };
    };
    exports.getRoleBadge = ({ role }) => {
      const config = exports.getRoleBadgeConfig(role);
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getLocationBadgeConfig = (city, state) => {
      if (!city && !state) {
        return null;
      }
      const location = [city, state].filter(Boolean).join(", ");
      return {
        color: "bg-blue-100 text-blue-800",
        icon: MapPin,
        text: location
      };
    };
    exports.getLocationBadge = ({ city, state }) => {
      const config = exports.getLocationBadgeConfig(city, state);
      if (!config) {
        return /* @__PURE__ */ React__default.default.createElement("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500" }, /* @__PURE__ */ React__default.default.createElement(MapPin, { className: "w-3 h-3 mr-1" }), "No location");
      }
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getAvailabilityBadgeConfig = (available, totalStock) => {
      const stockPercentage = totalStock > 0 ? available / totalStock * 100 : 0;
      if (available === 0) {
        return {
          color: "bg-red-100 text-red-800",
          icon: XCircle,
          text: "Out of Stock"
        };
      } else if (stockPercentage < 20) {
        return {
          color: "bg-orange-100 text-orange-800",
          icon: AlertTriangle,
          text: "Low Stock"
        };
      } else if (stockPercentage < 50) {
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: TrendingDown,
          text: "Limited"
        };
      } else {
        return {
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          text: "In Stock"
        };
      }
    };
    exports.getAvailabilityBadge = ({ available, totalStock }) => {
      const config = exports.getAvailabilityBadgeConfig(available, totalStock);
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getPriceTrendBadgeConfig = (currentPrice, previousPrice) => {
      const difference = currentPrice - previousPrice;
      const percentage = previousPrice > 0 ? difference / previousPrice * 100 : 0;
      if (difference > 0) {
        return {
          color: "bg-red-100 text-red-800",
          icon: TrendingUp,
          text: `+${percentage.toFixed(1)}%`
        };
      } else if (difference < 0) {
        return {
          color: "bg-green-100 text-green-800",
          icon: TrendingDown,
          text: `${percentage.toFixed(1)}%`
        };
      } else {
        return {
          color: "bg-gray-100 text-gray-800",
          icon: DollarSign,
          text: "No Change"
        };
      }
    };
    exports.getPriceTrendBadge = (currentPrice, previousPrice) => {
      const config = exports.getPriceTrendBadgeConfig(currentPrice, previousPrice);
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getCustomerStatusBadge = (isActive) => exports.getStatusBadge({ isActive, entityType: "entity" });
    exports.getUserStatusBadge = (isActive) => exports.getStatusBadge({ isActive, entityType: "entity" });
    exports.getProductStatusBadge = (isActive) => exports.getStatusBadge({ isActive, entityType: "availability" });
  }
});
exports.getCustomerLocationBadge = void 0; exports.getCustomerIdTypeBadge = void 0; exports.calculateCustomerStats = void 0; exports.filterCustomers = void 0; exports.getCustomerFullName = void 0; exports.getCustomerAddress = void 0; exports.getCustomerContactInfo = void 0; exports.formatCustomerForDisplay = void 0; exports.validateCustomer = void 0; exports.getCustomerAge = void 0;
var init_customer_utils = __esm({
  "src/core/customer-utils.tsx"() {
    init_lucide_react();
    init_badge_utils();
    exports.getCustomerLocationBadge = (city, state) => {
      return exports.getLocationBadge({ city, state });
    };
    exports.getCustomerIdTypeBadge = (idType) => {
      if (!idType) {
        return /* @__PURE__ */ React__default.default.createElement("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" }, /* @__PURE__ */ React__default.default.createElement(FileText, { className: "w-3 h-3 mr-1" }), "No ID");
      }
      const idTypeConfig = {
        "passport": { color: "bg-purple-100 text-purple-800", text: "Passport" },
        "drivers_license": { color: "bg-blue-100 text-blue-800", text: "Driver License" },
        "national_id": { color: "bg-green-100 text-green-800", text: "National ID" },
        "other": { color: "bg-gray-100 text-gray-800", text: "Other" }
      };
      const config = idTypeConfig[idType] || idTypeConfig.other;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(FileText, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.calculateCustomerStats = (customers) => {
      const customersArray = customers || [];
      const totalCustomers = customersArray.length;
      const activeCustomers = customersArray.filter((c) => c.isActive).length;
      const inactiveCustomers = customersArray.filter((c) => !c.isActive).length;
      const customersWithEmail = customersArray.filter((c) => c.email && c.email.trim() !== "").length;
      const customersWithAddress = customersArray.filter((c) => c.address && c.address.trim() !== "").length;
      const locationStats = customersArray.reduce((acc, customer) => {
        const key = `${customer.city || "Unknown"}, ${customer.state || "Unknown"}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const topLocation = Object.entries(locationStats).reduce(
        (max, [location, count]) => count > max.count ? { location, count } : max,
        { location: "None", count: 0 }
      );
      return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        customersWithEmail,
        customersWithAddress,
        topLocation: topLocation.location,
        topLocationCount: topLocation.count
      };
    };
    exports.filterCustomers = (customers, searchTerm, filters) => {
      return (customers || []).filter((customer) => {
        if (!customer || typeof customer !== "object") {
          return false;
        }
        const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || (customer.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) || (customer.address || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCity = !filters.city || (customer.city || "").toLowerCase().includes(filters.city.toLowerCase());
        const matchesState = !filters.state || (customer.state || "").toLowerCase().includes(filters.state.toLowerCase());
        const matchesCountry = !filters.country || (customer.country || "").toLowerCase().includes(filters.country.toLowerCase());
        const matchesIdType = !filters.idType || customer.idType === filters.idType;
        const matchesActive = filters.isActive === void 0 || customer.isActive === filters.isActive;
        const matchesMerchant = !filters.merchantId || customer.merchantId === filters.merchantId;
        const matchesOutlet = !filters.outletId || customer.outletId === filters.outletId;
        return matchesSearch && matchesCity && matchesState && matchesCountry && matchesIdType && matchesActive && matchesMerchant && matchesOutlet;
      });
    };
    exports.getCustomerFullName = (customer) => {
      return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    };
    exports.getCustomerAddress = (customer) => {
      const parts = [
        customer.address,
        customer.city,
        customer.state,
        customer.zipCode,
        customer.country
      ].filter(Boolean);
      return parts.join(", ") || "No address provided";
    };
    exports.getCustomerContactInfo = (customer) => {
      return {
        email: customer.email || "No email",
        phone: customer.phone || "No phone",
        hasEmail: !!(customer.email && customer.email.trim() !== ""),
        hasPhone: !!(customer.phone && customer.phone.trim() !== ""),
        hasAddress: !!(customer.address && customer.address.trim() !== "")
      };
    };
    exports.formatCustomerForDisplay = (customer) => {
      return {
        ...customer,
        fullName: exports.getCustomerFullName(customer),
        displayAddress: exports.getCustomerAddress(customer),
        contactInfo: exports.getCustomerContactInfo(customer),
        statusBadge: exports.getCustomerStatusBadge(customer.isActive),
        locationBadge: exports.getCustomerLocationBadge(customer.city, customer.state),
        idTypeBadge: exports.getCustomerIdTypeBadge(customer.idType)
      };
    };
    exports.validateCustomer = (customer) => {
      const errors = [];
      if (!customer.firstName || customer.firstName.trim() === "") {
        errors.push("First name is required");
      }
      if (!customer.lastName || customer.lastName.trim() === "") {
        errors.push("Last name is required");
      }
      if (!customer.phone || customer.phone.trim() === "") {
        errors.push("Phone number is required");
      }
      if (customer.email && customer.email.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email)) {
          errors.push("Invalid email format");
        }
      }
      return {
        isValid: errors.length === 0,
        errors
      };
    };
    exports.getCustomerAge = (dateOfBirth) => {
      if (!dateOfBirth)
        return null;
      try {
        const birthDate = new Date(dateOfBirth);
        const today = /* @__PURE__ */ new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
          age--;
        }
        return age >= 0 ? age : null;
      } catch {
        return null;
      }
    };
  }
});
exports.getProductAvailabilityBadge = void 0; exports.getProductTypeBadge = void 0; exports.calculateProductStats = void 0; exports.filterProducts = void 0; exports.formatProductPrice = void 0; exports.getProductImageUrl = void 0; exports.calculateStockPercentage = void 0; exports.getProductStockStatus = void 0; exports.canRentProduct = void 0; exports.canSellProduct = void 0; exports.getProductDisplayName = void 0; exports.getProductCategoryName = void 0; exports.getProductOutletName = void 0; exports.sortProducts = void 0;
var init_product_utils = __esm({
  "src/core/product-utils.tsx"() {
    init_lucide_react();
    exports.getProductAvailabilityBadge = (available, totalStock) => {
      const stockPercentage = totalStock > 0 ? available / totalStock * 100 : 0;
      let config;
      if (available === 0) {
        config = { color: "bg-red-100 text-red-800", icon: XCircle, text: "Out of Stock" };
      } else if (stockPercentage < 25) {
        config = { color: "bg-orange-100 text-orange-800", icon: AlertTriangle, text: "Low Stock" };
      } else if (stockPercentage < 50) {
        config = { color: "bg-yellow-100 text-yellow-800", icon: TrendingDown, text: "Limited Stock" };
      } else {
        config = { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "In Stock" };
      }
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.getProductTypeBadge = (product) => {
      const hasRentPrice = product.rentPrice && product.rentPrice > 0;
      const hasSalePrice = product.salePrice && product.salePrice > 0;
      let config;
      if (hasRentPrice && hasSalePrice) {
        config = { color: "bg-blue-100 text-blue-800", icon: Package, text: "Rent & Sale" };
      } else if (hasRentPrice) {
        config = { color: "bg-purple-100 text-purple-800", icon: ShoppingCart, text: "Rental Only" };
      } else if (hasSalePrice) {
        config = { color: "bg-green-100 text-green-800", icon: DollarSign, text: "Sale Only" };
      } else {
        config = { color: "bg-gray-100 text-gray-800", icon: Package, text: "No Pricing" };
      }
      const Icon = config.icon;
      return /* @__PURE__ */ React__default.default.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React__default.default.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
    };
    exports.calculateProductStats = (products) => {
      const productsArray = products || [];
      const totalProducts = productsArray.length;
      const activeProducts = productsArray.filter((p) => p.isActive).length;
      const inactiveProducts = productsArray.filter((p) => !p.isActive).length;
      const inStockProducts = productsArray.filter((p) => p.available > 0).length;
      const outOfStockProducts = productsArray.filter((p) => p.available === 0).length;
      const lowStockProducts = productsArray.filter((p) => p.available > 0 && p.available < 5).length;
      const totalStockValue = productsArray.reduce((sum, product) => {
        const stockValue = product.available * (product.rentPrice || 0);
        return sum + stockValue;
      }, 0);
      const productsWithPrice = productsArray.filter((p) => p.rentPrice && p.rentPrice > 0);
      const averagePrice = productsWithPrice.length > 0 ? productsWithPrice.reduce((sum, p) => sum + (p.rentPrice || 0), 0) / productsWithPrice.length : 0;
      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockProducts,
        totalStockValue,
        averagePrice
      };
    };
    exports.filterProducts = (products, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter) => {
      return (products || []).filter((product) => {
        if (!product || typeof product !== "object") {
          return false;
        }
        const matchesSearch = (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (product.description || "").toLowerCase().includes(searchTerm.toLowerCase()) || (product.barcode || "").toLowerCase().includes(searchTerm.toLowerCase());
        const productCategoryId = "category" in product ? product.category?.id : product.categoryId;
        const matchesCategory = categoryFilter === "all" || productCategoryId && productCategoryId.toString() === categoryFilter;
        const productOutletId = "outlet" in product ? product.outlet?.id : void 0;
        const matchesOutlet = outletFilter === "all" || productOutletId && productOutletId.toString() === outletFilter;
        const matchesAvailability = availabilityFilter === "all" || availabilityFilter === "in-stock" && product.available > 0 || availabilityFilter === "out-of-stock" && product.available === 0 || availabilityFilter === "low-stock" && product.available > 0 && product.available < 5;
        const matchesStatus = statusFilter === "all" || statusFilter === "active" && product.isActive || statusFilter === "inactive" && !product.isActive;
        return matchesSearch && matchesCategory && matchesOutlet && matchesAvailability && matchesStatus;
      });
    };
    exports.formatProductPrice = (price, currency = "USD") => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency
      }).format(price);
    };
    exports.getProductImageUrl = (product) => {
      if (product.images && product.images.length > 0) {
        return product.images[0];
      }
      return "/images/product-placeholder.png";
    };
    exports.calculateStockPercentage = (available, totalStock) => {
      if (totalStock === 0)
        return 0;
      return Math.round(available / totalStock * 100);
    };
    exports.getProductStockStatus = (available, totalStock) => {
      if (available === 0)
        return "Out of Stock";
      if (available < 5)
        return "Low Stock";
      if (available < totalStock * 0.5)
        return "Limited Stock";
      return "In Stock";
    };
    exports.canRentProduct = (product) => {
      return product.isActive && product.available > 0 && product.rentPrice > 0;
    };
    exports.canSellProduct = (product) => {
      return product.isActive && product.available > 0 && product.salePrice && product.salePrice > 0;
    };
    exports.getProductDisplayName = (product) => {
      return product.name || "Unnamed Product";
    };
    exports.getProductCategoryName = (product) => {
      return "category" in product ? product.category?.name || "Uncategorized" : "Uncategorized";
    };
    exports.getProductOutletName = (product) => {
      return "outlet" in product ? product.outlet?.name || "No Outlet" : "No Outlet";
    };
    exports.sortProducts = (products, sortBy, sortOrder = "asc") => {
      return [...products].sort((a, b) => {
        let aValue;
        let bValue;
        switch (sortBy) {
          case "name":
            aValue = (a.name || "").toLowerCase();
            bValue = (b.name || "").toLowerCase();
            break;
          case "price":
            aValue = a.rentPrice || 0;
            bValue = b.rentPrice || 0;
            break;
          case "stock":
            aValue = a.available || 0;
            bValue = b.available || 0;
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case "updatedAt":
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
          default:
            aValue = a.name || "";
            bValue = b.name || "";
        }
        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    };
  }
});

// src/core/user-utils.tsx
exports.getUserRoleBadge = void 0; exports.calculateUserStats = void 0; exports.filterUsers = void 0; exports.getUserFullName = void 0; exports.canCreateUsers = void 0;
var init_user_utils = __esm({
  "src/core/user-utils.tsx"() {
    init_badge_utils();
    exports.getUserRoleBadge = (role) => {
      return exports.getRoleBadge({ role });
    };
    exports.calculateUserStats = (users) => {
      const usersArray = users || [];
      const totalUsers = usersArray.length;
      const activeUsers = usersArray.filter((u) => u.isActive).length;
      const inactiveUsers = usersArray.filter((u) => !u.isActive).length;
      const verifiedUsers = usersArray.filter((u) => u.emailVerified).length;
      const unverifiedUsers = usersArray.filter((u) => !u.emailVerified).length;
      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        verifiedUsers,
        unverifiedUsers
      };
    };
    exports.filterUsers = (users, searchTerm, roleFilter, statusFilter) => {
      return (users || []).filter((user) => {
        if (!user || typeof user !== "object") {
          return false;
        }
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || user.merchant?.name && user.merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.outlet?.name && user.outlet.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesStatus = statusFilter === "all" || statusFilter === "ACTIVE" && user.isActive || statusFilter === "INACTIVE" && !user.isActive;
        return matchesSearch && matchesRole && matchesStatus;
      });
    };
    exports.getUserFullName = (user) => {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    };
    exports.canCreateUsers = (userRole) => {
      return userRole === "ADMIN" || userRole === "MERCHANT" || userRole === "OUTLET_ADMIN";
    };
  }
});
async function getCurrentEntityCounts(merchantId) {
  try {
    const [outlets, users, products, customers, orders] = await Promise.all([
      prisma.outlet.count({ where: { merchantId } }),
      prisma.user.count({ where: { merchantId } }),
      prisma.product.count({ where: { merchantId } }),
      prisma.customer.count({ where: { merchantId } }),
      prisma.order.count({ where: { outlet: { merchantId } } })
    ]);
    return {
      outlets,
      users,
      products,
      customers,
      orders
    };
  } catch (error) {
    console.error("Error getting entity counts:", error);
    throw new exports.ApiError("DATABASE_ERROR" /* DATABASE_ERROR */, "Failed to get entity counts");
  }
}
async function getPlanLimitsInfo(merchantId) {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        subscription: true
      }
    });
    if (!merchant) {
      throw new exports.ApiError("MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */, "Merchant not found");
    }
    if (!merchant.subscription) {
      throw new exports.ApiError("NOT_FOUND" /* NOT_FOUND */, "No subscription found for merchant");
    }
    const plan = await prisma.plan.findUnique({
      where: { id: merchant.subscription.planId }
    });
    if (!plan) {
      throw new exports.ApiError("NOT_FOUND" /* NOT_FOUND */, "Plan not found");
    }
    const planLimits = JSON.parse(plan.limits);
    const platform = plan.features.includes("Web dashboard access") ? "mobile+web" : "mobile";
    const currentCounts = await getCurrentEntityCounts(merchantId);
    const isUnlimited = {
      outlets: planLimits.outlets === -1,
      users: planLimits.users === -1,
      products: planLimits.products === -1,
      customers: planLimits.customers === -1,
      orders: planLimits.orders === -1
    };
    const features = JSON.parse(plan.features);
    const platformAccess = {
      mobile: true,
      // All plans have mobile access
      web: features.includes("Web dashboard access"),
      productPublicCheck: features.includes("Product public check")
    };
    return {
      planLimits,
      platform: platform || "mobile",
      currentCounts,
      isUnlimited,
      platformAccess
    };
  } catch (error) {
    console.error("Error getting plan limits info:", error);
    if (error instanceof exports.ApiError) {
      throw error;
    }
    throw new exports.ApiError("INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */, "Failed to get plan limits information");
  }
}
async function validatePlanLimits(merchantId, entityType) {
  try {
    const planInfo = await getPlanLimitsInfo(merchantId);
    const currentCount = planInfo.currentCounts[entityType];
    const limit = planInfo.planLimits[entityType];
    const isUnlimited = planInfo.isUnlimited[entityType];
    if (isUnlimited) {
      return {
        isValid: true,
        currentCount,
        limit: -1,
        entityType
      };
    }
    if (currentCount >= limit) {
      return {
        isValid: false,
        error: `${entityType} limit exceeded. Current: ${currentCount}, Limit: ${limit}`,
        currentCount,
        limit,
        entityType
      };
    }
    return {
      isValid: true,
      currentCount,
      limit,
      entityType
    };
  } catch (error) {
    console.error("Error validating plan limits:", error);
    throw new exports.ApiError("INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */, "Failed to validate plan limits");
  }
}
function validatePlatformAccess(merchantId, platform, planInfo) {
  switch (platform) {
    case "mobile":
      return planInfo.platformAccess.mobile;
    case "web":
      return planInfo.platformAccess.web;
    default:
      return false;
  }
}
function validateProductPublicCheckAccess(planInfo) {
  return planInfo.platformAccess.productPublicCheck;
}
async function assertPlanLimit(merchantId, entityType) {
  try {
    const validation = await validatePlanLimits(merchantId, entityType);
    if (!validation.isValid) {
      throw new exports.ApiError(
        "PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */,
        validation.error || `Plan limit exceeded for ${entityType}`
      );
    }
  } catch (error) {
    if (error instanceof exports.ApiError) {
      throw error;
    }
    throw new exports.ApiError(
      "INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */,
      `Failed to validate plan limits for ${entityType}`
    );
  }
}
exports.loginSchema = void 0; exports.registerSchema = void 0; var outletStockItemSchema; exports.productCreateSchema = void 0; exports.productUpdateSchema = void 0; exports.productsQuerySchema = void 0; exports.rentalSchema = void 0; exports.customerCreateSchema = void 0; exports.customerUpdateSchema = void 0; exports.customersQuerySchema = void 0; var orderTypeEnum, orderStatusEnum; exports.ordersQuerySchema = void 0; var orderItemSchema, baseOrderSchema; exports.orderCreateSchema = void 0; exports.orderUpdateSchema = void 0; var userRoleEnum; exports.usersQuerySchema = void 0; exports.userCreateSchema = void 0; exports.userUpdateSchema = void 0; exports.outletsQuerySchema = void 0; exports.outletCreateSchema = void 0; exports.outletUpdateSchema = void 0; exports.planCreateSchema = void 0; exports.planUpdateSchema = void 0; exports.plansQuerySchema = void 0; exports.planVariantCreateSchema = void 0; exports.planVariantUpdateSchema = void 0; exports.planVariantsQuerySchema = void 0; exports.subscriptionCreateSchema = void 0; exports.subscriptionUpdateSchema = void 0; exports.subscriptionsQuerySchema = void 0;
var init_validation = __esm({
  "src/core/validation.ts"() {
    init_src();
    init_errors();
    exports.loginSchema = zod.z.object({
      email: zod.z.string().email("Invalid email address"),
      password: zod.z.string().min(6, "Password must be at least 6 characters")
    });
    exports.registerSchema = zod.z.object({
      email: zod.z.string().email("Invalid email address"),
      password: zod.z.string().min(6, "Password must be at least 6 characters"),
      // Support both name formats for flexibility
      name: zod.z.string().min(2, "Name must be at least 2 characters").optional(),
      firstName: zod.z.string().min(1, "First name is required").optional(),
      lastName: zod.z.string().min(1, "Last name is required").optional(),
      phone: zod.z.string().optional(),
      role: zod.z.enum(["CLIENT", "SHOP_OWNER", "ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]).optional(),
      // For merchant registration
      businessName: zod.z.string().optional(),
      // Business configuration (required for merchants)
      businessType: zod.z.enum(["CLOTHING", "VEHICLE", "EQUIPMENT", "GENERAL"]).optional(),
      pricingType: zod.z.enum(["FIXED", "HOURLY", "DAILY", "WEEKLY"]).optional(),
      // Address fields for merchant registration
      address: zod.z.string().optional(),
      city: zod.z.string().optional(),
      state: zod.z.string().optional(),
      zipCode: zod.z.string().optional(),
      country: zod.z.string().min(2, "Please select a valid country").optional(),
      // For outlet staff registration
      merchantCode: zod.z.string().optional(),
      outletCode: zod.z.string().optional()
    }).refine((data) => {
      return data.name || data.firstName && data.lastName;
    }, {
      message: "Either 'name' or both 'firstName' and 'lastName' must be provided"
    }).refine((data) => {
      if (data.role === "MERCHANT" || data.businessName) {
        return data.businessType && data.pricingType;
      }
      return true;
    }, {
      message: "Business type and pricing type are required for merchant registration"
    });
    outletStockItemSchema = zod.z.object({
      outletId: zod.z.coerce.number().int().positive("Outlet is required"),
      stock: zod.z.number().int().min(0, "Stock must be non-negative")
    });
    exports.productCreateSchema = zod.z.object({
      name: zod.z.string().min(1, "Product name is required"),
      description: zod.z.string().optional(),
      barcode: zod.z.string().optional(),
      rentPrice: zod.z.number().nonnegative("Rent price must be non-negative"),
      salePrice: zod.z.number().nonnegative("Sale price must be non-negative"),
      deposit: zod.z.number().nonnegative("Deposit must be non-negative").default(0),
      categoryId: zod.z.coerce.number().int().positive().optional(),
      // Optional - will use default category if not provided
      totalStock: zod.z.number().int().min(0, "Total stock must be non-negative"),
      images: zod.z.union([zod.z.string(), zod.z.array(zod.z.string())]).optional(),
      // Allow both string and array for testing
      merchantId: zod.z.coerce.number().int().positive().optional(),
      // Optional - required for ADMIN users, auto-assigned for others
      outletStock: zod.z.array(outletStockItemSchema).min(1, "At least one outlet stock entry is required")
      // Required - every product must have outlet stock
    });
    exports.productUpdateSchema = zod.z.object({
      name: zod.z.string().min(1).optional(),
      description: zod.z.string().optional(),
      rentPrice: zod.z.number().nonnegative().optional(),
      salePrice: zod.z.number().nonnegative().nullable().optional(),
      deposit: zod.z.number().nonnegative().optional(),
      images: zod.z.string().optional(),
      categoryId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      totalStock: zod.z.number().int().min(0).optional()
    });
    exports.productsQuerySchema = zod.z.object({
      q: zod.z.string().optional(),
      // Search query parameter (consistent with orders)
      search: zod.z.string().optional(),
      // Keep for backward compatibility
      categoryId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      outletId: zod.z.coerce.number().int().positive().optional(),
      // Add outlet filtering
      available: zod.z.coerce.boolean().optional(),
      // Add availability filter
      minPrice: zod.z.coerce.number().nonnegative().optional(),
      // Add price range filters
      maxPrice: zod.z.coerce.number().nonnegative().optional(),
      // Add price range filters
      page: zod.z.coerce.number().int().min(1).default(1),
      limit: zod.z.coerce.number().int().min(1).max(100).default(20),
      offset: zod.z.coerce.number().int().min(0).default(0),
      // Add offset for pagination consistency
      sortBy: zod.z.string().optional(),
      // Add sorting support
      sortOrder: zod.z.enum(["asc", "desc"]).optional()
      // Add sorting support
    });
    exports.rentalSchema = zod.z.object({
      productId: zod.z.coerce.number().int().positive("Product is required"),
      // Changed from string to number
      startDate: zod.z.date(),
      endDate: zod.z.date(),
      notes: zod.z.string().optional()
    }).refine((data) => data.endDate > data.startDate, {
      message: "End date must be after start date",
      path: ["endDate"]
    });
    exports.customerCreateSchema = zod.z.object({
      firstName: zod.z.string().min(1, "First name is required"),
      lastName: zod.z.string().min(1, "Last name is required"),
      email: zod.z.string().email("Invalid email format").optional().or(zod.z.literal("")),
      phone: zod.z.string().min(1, "Phone number is required"),
      merchantId: zod.z.coerce.number().int().positive().optional(),
      // Optional - only required for ADMIN users, auto-assigned for MERCHANT/OUTLET from JWT
      address: zod.z.string().optional(),
      city: zod.z.string().optional(),
      state: zod.z.string().optional(),
      zipCode: zod.z.string().optional(),
      country: zod.z.string().optional(),
      dateOfBirth: zod.z.string().optional(),
      idNumber: zod.z.string().optional(),
      idType: zod.z.enum(["passport", "drivers_license", "national_id", "other"]).optional(),
      notes: zod.z.string().optional()
    });
    exports.customerUpdateSchema = exports.customerCreateSchema.partial().extend({
      isActive: zod.z.boolean().optional(),
      idType: zod.z.enum(["passport", "drivers_license", "national_id", "other"]).optional()
    });
    exports.customersQuerySchema = zod.z.object({
      q: zod.z.string().optional(),
      // Search query parameter (consistent with orders)
      search: zod.z.string().optional(),
      // Keep for backward compatibility
      merchantId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      isActive: zod.z.union([zod.z.string(), zod.z.boolean()]).transform((v) => {
        if (typeof v === "boolean")
          return v;
        if (v === void 0)
          return void 0;
        return v === "true";
      }).optional(),
      city: zod.z.string().optional(),
      state: zod.z.string().optional(),
      country: zod.z.string().optional(),
      idType: zod.z.enum(["passport", "drivers_license", "national_id", "other"]).optional(),
      page: zod.z.coerce.number().int().min(1).default(1),
      limit: zod.z.coerce.number().int().min(1).max(100).default(20),
      offset: zod.z.coerce.number().int().min(0).default(0),
      // Add offset for pagination consistency
      sortBy: zod.z.string().optional(),
      // Add sorting support
      sortOrder: zod.z.enum(["asc", "desc"]).optional()
      // Add sorting support
    });
    orderTypeEnum = zod.z.enum(["RENT", "SALE"]);
    orderStatusEnum = zod.z.enum(["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"]);
    exports.ordersQuerySchema = zod.z.object({
      q: zod.z.string().optional(),
      outletId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      customerId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      userId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      productId: zod.z.coerce.number().int().positive().optional(),
      // Add product filtering support
      orderType: orderTypeEnum.optional(),
      status: orderStatusEnum.optional(),
      startDate: zod.z.coerce.date().optional(),
      endDate: zod.z.coerce.date().optional(),
      pickupDate: zod.z.coerce.date().optional(),
      returnDate: zod.z.coerce.date().optional(),
      minAmount: zod.z.coerce.number().optional(),
      maxAmount: zod.z.coerce.number().optional(),
      limit: zod.z.coerce.number().int().min(1).max(100).default(20),
      offset: zod.z.coerce.number().int().min(0).default(0)
    });
    orderItemSchema = zod.z.object({
      productId: zod.z.coerce.number().int().positive(),
      // Changed from string to number
      quantity: zod.z.coerce.number().int().positive(),
      unitPrice: zod.z.coerce.number().nonnegative().default(0),
      totalPrice: zod.z.coerce.number().nonnegative().optional(),
      // Made optional since server calculates it
      deposit: zod.z.coerce.number().nonnegative().default(0),
      notes: zod.z.string().optional(),
      startDate: zod.z.coerce.date().optional(),
      endDate: zod.z.coerce.date().optional(),
      daysRented: zod.z.coerce.number().int().nonnegative().optional()
    });
    baseOrderSchema = zod.z.object({
      // Optional fields for updates (backend generates if missing)
      orderId: zod.z.coerce.number().int().positive().optional(),
      orderNumber: zod.z.string().optional(),
      // Core order fields
      orderType: orderTypeEnum,
      customerId: zod.z.coerce.number().int().positive().optional(),
      outletId: zod.z.coerce.number().int().positive(),
      pickupPlanAt: zod.z.coerce.date().optional(),
      returnPlanAt: zod.z.coerce.date().optional(),
      rentalDuration: zod.z.coerce.number().int().positive().optional(),
      subtotal: zod.z.coerce.number().nonnegative(),
      taxAmount: zod.z.coerce.number().nonnegative().optional(),
      discountType: zod.z.enum(["amount", "percentage"]).optional(),
      discountValue: zod.z.coerce.number().nonnegative().optional(),
      discountAmount: zod.z.coerce.number().nonnegative().optional(),
      totalAmount: zod.z.coerce.number().nonnegative(),
      depositAmount: zod.z.coerce.number().nonnegative().optional(),
      securityDeposit: zod.z.coerce.number().nonnegative().optional(),
      damageFee: zod.z.coerce.number().nonnegative().optional(),
      lateFee: zod.z.coerce.number().nonnegative().optional(),
      collateralType: zod.z.string().optional(),
      collateralDetails: zod.z.string().optional(),
      notes: zod.z.string().optional(),
      pickupNotes: zod.z.string().optional(),
      returnNotes: zod.z.string().optional(),
      damageNotes: zod.z.string().optional(),
      customerName: zod.z.string().optional(),
      customerPhone: zod.z.string().optional(),
      customerEmail: zod.z.string().email().optional(),
      isReadyToDeliver: zod.z.boolean().optional(),
      // Order items management
      orderItems: zod.z.array(orderItemSchema)
    });
    exports.orderCreateSchema = baseOrderSchema;
    exports.orderUpdateSchema = baseOrderSchema.partial().extend({
      // Update-specific fields (not present in create)
      status: orderStatusEnum.optional(),
      pickedUpAt: zod.z.coerce.date().optional(),
      returnedAt: zod.z.coerce.date().optional()
    });
    userRoleEnum = zod.z.enum(["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]);
    exports.usersQuerySchema = zod.z.object({
      role: userRoleEnum.optional(),
      isActive: zod.z.union([zod.z.string(), zod.z.boolean()]).transform((v) => {
        if (typeof v === "boolean")
          return v;
        if (v === void 0)
          return void 0;
        return v === "true";
      }).optional(),
      search: zod.z.string().optional(),
      page: zod.z.coerce.number().int().min(1).default(1),
      limit: zod.z.coerce.number().int().min(1).max(100).default(20),
      sortBy: zod.z.enum(["firstName", "lastName", "email", "createdAt"]).default("createdAt").optional(),
      sortOrder: zod.z.enum(["asc", "desc"]).default("desc").optional()
    });
    exports.userCreateSchema = zod.z.object({
      email: zod.z.string().email(),
      password: zod.z.string().min(6),
      firstName: zod.z.string().min(1),
      lastName: zod.z.string().min(1).or(zod.z.literal("")),
      // Allow empty string for lastName
      phone: zod.z.string().min(1, "Phone number is required"),
      // Phone is now required
      role: userRoleEnum.optional(),
      merchantId: zod.z.coerce.number().int().positive().optional(),
      outletId: zod.z.coerce.number().int().positive().optional()
    });
    exports.userUpdateSchema = zod.z.object({
      firstName: zod.z.string().min(1).optional(),
      lastName: zod.z.string().min(1).or(zod.z.literal("")).optional(),
      // Allow empty string for lastName
      email: zod.z.string().email().optional(),
      phone: zod.z.string().min(1, "Phone number is required").optional(),
      // Phone is required when provided
      role: userRoleEnum.optional(),
      isActive: zod.z.boolean().optional(),
      merchantId: zod.z.coerce.number().int().positive().optional(),
      outletId: zod.z.coerce.number().int().positive().optional()
    });
    exports.outletsQuerySchema = zod.z.object({
      merchantId: zod.z.coerce.number().int().positive().optional(),
      // Changed from string to number
      isActive: zod.z.union([zod.z.string(), zod.z.boolean()]).transform((v) => {
        if (typeof v === "boolean")
          return v;
        if (v === void 0)
          return void 0;
        if (v === "all")
          return "all";
        return v === "true";
      }).optional(),
      search: zod.z.string().optional(),
      page: zod.z.coerce.number().int().min(1).default(1),
      limit: zod.z.coerce.number().int().min(1).max(100).default(50)
    });
    exports.outletCreateSchema = zod.z.object({
      name: zod.z.string().min(1, "Outlet name is required"),
      address: zod.z.string().optional(),
      city: zod.z.string().optional(),
      state: zod.z.string().optional(),
      zipCode: zod.z.string().optional(),
      country: zod.z.string().optional(),
      phone: zod.z.string().optional(),
      description: zod.z.string().optional(),
      status: zod.z.enum(["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]).default("ACTIVE")
    });
    exports.outletUpdateSchema = zod.z.object({
      name: zod.z.string().min(1, "Outlet name is required").optional(),
      address: zod.z.string().optional(),
      phone: zod.z.string().optional(),
      city: zod.z.string().optional(),
      state: zod.z.string().optional(),
      zipCode: zod.z.string().optional(),
      country: zod.z.string().optional(),
      description: zod.z.string().optional(),
      isActive: zod.z.boolean().optional(),
      status: zod.z.enum(["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]).optional()
    });
    exports.planCreateSchema = zod.z.object({
      name: zod.z.string().min(1, "Plan name is required"),
      description: zod.z.string().min(1, "Plan description is required"),
      basePrice: zod.z.number().nonnegative("Base price must be non-negative"),
      currency: zod.z.string().default("USD"),
      trialDays: zod.z.number().int().min(0, "Trial days must be non-negative"),
      limits: zod.z.object({
        outlets: zod.z.number().int().min(-1, "Max outlets must be -1 (unlimited) or positive"),
        users: zod.z.number().int().min(-1, "Max users must be -1 (unlimited) or positive"),
        products: zod.z.number().int().min(-1, "Max products must be -1 (unlimited) or positive"),
        customers: zod.z.number().int().min(-1, "Max customers must be -1 (unlimited) or positive")
      }),
      features: zod.z.array(zod.z.string()).default([]),
      isActive: zod.z.boolean().default(true),
      isPopular: zod.z.boolean().default(false),
      sortOrder: zod.z.number().int().default(0)
    });
    exports.planUpdateSchema = exports.planCreateSchema.partial();
    exports.plansQuerySchema = zod.z.object({
      search: zod.z.string().optional(),
      isActive: zod.z.coerce.boolean().optional(),
      isPopular: zod.z.coerce.boolean().optional(),
      limit: zod.z.coerce.number().int().min(1).max(100).default(50),
      offset: zod.z.coerce.number().int().min(0).default(0),
      sortBy: zod.z.enum(["name", "price", "basePrice", "createdAt", "sortOrder"]).default("sortOrder"),
      // ✅ Updated to support basePrice
      sortOrder: zod.z.enum(["asc", "desc"]).default("asc")
    });
    exports.planVariantCreateSchema = zod.z.object({
      planId: zod.z.string().min(1, "Plan ID is required"),
      name: zod.z.string().min(1, "Variant name is required"),
      duration: zod.z.number().int().positive("Duration must be positive"),
      price: zod.z.number().nonnegative("Price must be non-negative").optional(),
      basePrice: zod.z.number().nonnegative("Base price must be non-negative").optional(),
      discount: zod.z.number().min(0).max(100, "Discount must be between 0 and 100").default(0),
      isActive: zod.z.boolean().default(true),
      isPopular: zod.z.boolean().default(false),
      sortOrder: zod.z.number().int().default(0)
    });
    exports.planVariantUpdateSchema = exports.planVariantCreateSchema.partial().extend({
      planId: zod.z.string().min(1, "Plan ID is required").optional()
      // Optional for updates
    });
    exports.planVariantsQuerySchema = zod.z.object({
      planId: zod.z.string().optional(),
      search: zod.z.string().optional(),
      isActive: zod.z.coerce.boolean().optional(),
      isPopular: zod.z.coerce.boolean().optional(),
      duration: zod.z.coerce.number().int().positive().optional(),
      minPrice: zod.z.coerce.number().nonnegative().optional(),
      maxPrice: zod.z.coerce.number().nonnegative().optional(),
      limit: zod.z.coerce.number().int().min(1).max(100).default(50),
      offset: zod.z.coerce.number().int().min(0).default(0),
      sortBy: zod.z.enum(["name", "price", "duration", "discount", "createdAt", "sortOrder"]).default("sortOrder"),
      sortOrder: zod.z.enum(["asc", "desc"]).default("asc")
    });
    exports.subscriptionCreateSchema = zod.z.object({
      planId: zod.z.string().min(1, "Plan ID is required"),
      planVariantId: zod.z.string().min(1, "Plan variant ID is required"),
      merchantId: zod.z.coerce.number().int().positive("Merchant ID is required"),
      status: zod.z.enum(["trial", "active", "past_due", "cancelled", "paused", "expired"]).default("active"),
      billingInterval: zod.z.enum(["month", "quarter", "semiAnnual", "year"]).default("month"),
      amount: zod.z.number().nonnegative("Amount must be non-negative"),
      currency: zod.z.string().default("USD"),
      trialStartDate: zod.z.coerce.date().optional(),
      trialEndDate: zod.z.coerce.date().optional(),
      currentPeriodStart: zod.z.coerce.date().optional(),
      currentPeriodEnd: zod.z.coerce.date().optional(),
      cancelAtPeriodEnd: zod.z.boolean().default(false),
      cancelledAt: zod.z.coerce.date().optional(),
      notes: zod.z.string().optional()
    });
    exports.subscriptionUpdateSchema = exports.subscriptionCreateSchema.partial().extend({
      id: zod.z.coerce.number().int().positive().optional()
    });
    exports.subscriptionsQuerySchema = zod.z.object({
      merchantId: zod.z.coerce.number().int().positive().optional(),
      status: zod.z.enum(["active", "inactive", "cancelled", "expired", "suspended", "past_due", "paused"]).optional(),
      planId: zod.z.string().optional(),
      planVariantId: zod.z.string().optional(),
      search: zod.z.string().optional(),
      limit: zod.z.coerce.number().int().min(1).max(100).default(50),
      offset: zod.z.coerce.number().int().min(0).default(0),
      sortBy: zod.z.enum(["createdAt", "currentPeriodEnd", "amount", "status"]).default("createdAt"),
      sortOrder: zod.z.enum(["asc", "desc"]).default("desc")
    });
  }
});

// src/core/currency.ts
function getCurrency(code) {
  return exports.DEFAULT_CURRENCIES.find((currency) => currency.code === code);
}
function getCurrentCurrency(settings) {
  const currentSettings = settings || exports.DEFAULT_CURRENCY_SETTINGS;
  const currency = getCurrency(currentSettings.currentCurrency);
  if (!currency) {
    return exports.DEFAULT_CURRENCIES.find((c) => c.code === "USD");
  }
  return currency;
}
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);
  if (!from || !to) {
    throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
  }
  const amountInUSD = amount / from.exchangeRate;
  return amountInUSD * to.exchangeRate;
}
function formatCurrencyAdvanced(amount, options = {}, settings) {
  if (amount === null || amount === void 0 || isNaN(amount)) {
    return "0";
  }
  const currentSettings = settings || exports.DEFAULT_CURRENCY_SETTINGS;
  const currencyCode = options.currency || currentSettings.currentCurrency;
  const currency = getCurrency(currencyCode);
  if (!currency) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  const locale = options.locale || currency.locale;
  const showSymbol = options.showSymbol ?? currentSettings.showSymbol;
  const showCode = options.showCode ?? currentSettings.showCode;
  const fractionDigits = options.fractionDigits ?? currency.maxFractionDigits;
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    // Don't force decimal places
    maximumFractionDigits: fractionDigits
    // Allow up to max decimals
  }).format(amount);
  let result = formattedNumber;
  if (showSymbol) {
    if (currency.symbolBefore) {
      result = `${currency.symbol}${result}`;
    } else {
      result = `${result}${currency.symbol}`;
    }
  }
  if (showCode) {
    result = `${result} ${currency.code}`;
  }
  return result;
}
function formatCurrency(amount, currency = "USD", locale) {
  return formatCurrencyAdvanced(amount, { currency, locale });
}
function parseCurrency(currencyString, currency = "USD") {
  if (!currencyString || typeof currencyString !== "string") {
    return null;
  }
  const currencyConfig = getCurrency(currency);
  if (!currencyConfig) {
    return null;
  }
  let cleanString = currencyString.replace(new RegExp(`[${currencyConfig.symbol}]`, "g"), "").replace(new RegExp(currencyConfig.code, "gi"), "").trim();
  if (currencyConfig.locale === "vi-VN") {
    cleanString = cleanString.replace(/\./g, "").replace(",", ".");
  } else {
    cleanString = cleanString.replace(/,/g, "");
  }
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? null : parsed;
}
function getCurrencyDisplay(currency) {
  const currencyConfig = getCurrency(currency);
  if (!currencyConfig) {
    return currency;
  }
  if (currencyConfig.symbolBefore) {
    return `${currencyConfig.symbol} ${currencyConfig.code}`;
  } else {
    return `${currencyConfig.code} ${currencyConfig.symbol}`;
  }
}
function isValidCurrencyCode(code) {
  return ["USD", "VND"].includes(code);
}
function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1;
  }
  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);
  if (!from || !to) {
    throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
  }
  return to.exchangeRate / from.exchangeRate;
}
exports.DEFAULT_CURRENCIES = void 0; exports.DEFAULT_CURRENCY_SETTINGS = void 0;
var init_currency = __esm({
  "src/core/currency.ts"() {
    exports.DEFAULT_CURRENCIES = [
      {
        code: "USD",
        symbol: "$",
        name: "US Dollar",
        locale: "en-US",
        minFractionDigits: 2,
        maxFractionDigits: 2,
        symbolBefore: true,
        exchangeRate: 1
      },
      {
        code: "VND",
        symbol: "\u0111",
        name: "Vietnamese Dong",
        locale: "vi-VN",
        minFractionDigits: 0,
        maxFractionDigits: 0,
        symbolBefore: false,
        exchangeRate: 24500
        // 1 USD ≈ 24,500 VND
      }
    ];
    exports.DEFAULT_CURRENCY_SETTINGS = {
      currentCurrency: "USD",
      // Default to USD
      baseCurrency: "USD",
      availableCurrencies: exports.DEFAULT_CURRENCIES,
      showSymbol: true,
      showCode: false
    };
  }
});

// src/core/payment-gateways/index.ts
function createPaymentGatewayManager(config) {
  return {
    createPayment: async (amount, currency, metadata) => {
      console.log("Creating payment:", { amount, currency, metadata });
      return { id: "mock-payment-id", status: "pending" };
    },
    processPayment: async (paymentId) => {
      console.log("Processing payment:", paymentId);
      return { id: paymentId, status: "completed" };
    },
    refundPayment: async (paymentId, amount) => {
      console.log("Refunding payment:", paymentId, amount);
      return { id: paymentId, status: "refunded" };
    }
  };
}
var init_payment_gateways = __esm({
  "src/core/payment-gateways/index.ts"() {
  }
});

// src/core/order-number-manager.ts
async function getOutletStats(outletId) {
  return await getOutletOrderStats(outletId);
}
async function compareOrderNumberFormats(outletId) {
  const formats = ["sequential", "date-based", "random", "hybrid"];
  const results = {};
  for (const format2 of formats) {
    try {
      const result = await createOrderNumberWithFormat(outletId, format2);
      results[format2] = {
        orderNumber: result.orderNumber,
        sequence: result.sequence,
        generatedAt: result.generatedAt,
        length: result.orderNumber.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results[format2] = {
        error: errorMessage
      };
    }
  }
  return results;
}
function getFormatRecommendations() {
  return {
    smallBusiness: {
      recommended: "sequential",
      reason: "Simple, easy to track, low concurrency needs",
      example: "ORD-001-0001"
    },
    mediumBusiness: {
      recommended: "date-based",
      reason: "Better organization, daily reporting, moderate security",
      example: "ORD-001-20250115-0001"
    },
    largeBusiness: {
      recommended: "hybrid",
      reason: "Balanced security and organization, high volume",
      example: "ORD-001-20250115-A7B9"
    },
    highSecurity: {
      recommended: "random",
      reason: "Maximum security, no business intelligence leakage",
      example: "ORD-001-A7B9C2"
    }
  };
}
async function migrateOrderNumbers(outletId, newFormat) {
  try {
    return {
      success: false,
      message: "Migration not implemented - requires careful planning to avoid data conflicts",
      affectedOrders: 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
      affectedOrders: 0
    };
  }
}
function validateOrderNumberFormat(orderNumber) {
  const errors = [];
  const suggestions = [];
  if (!orderNumber) {
    errors.push("Order number cannot be empty");
    return { isValid: false, errors, suggestions };
  }
  if (!orderNumber.startsWith("ORD-")) {
    errors.push('Order number must start with "ORD-"');
    suggestions.push("Use format: ORD-{outletId}-{sequence}");
  }
  const parts = orderNumber.split("-");
  if (parts.length < 3) {
    errors.push("Order number must have at least 3 parts separated by hyphens");
    suggestions.push("Use format: ORD-{outletId}-{sequence}");
  }
  if (parts.length >= 2) {
    const outletId = parseInt(parts[1]);
    if (isNaN(outletId) || outletId < 1) {
      errors.push("Outlet ID must be a positive number");
      suggestions.push("Use format: ORD-001-0001 (where 001 is outlet ID)");
    }
  }
  const isValid2 = errors.length === 0;
  if (isValid2) {
    suggestions.push("Order number format is valid");
  }
  return { isValid: isValid2, errors, suggestions };
}
var init_order_number_manager = __esm({
  "src/core/order-number-manager.ts"() {
    init_src();
  }
});
var toDate; exports.formatDate = void 0; exports.formatDateTime = void 0; exports.addDaysToDate = void 0; exports.getDaysDifference = void 0; exports.isDateAfter = void 0; exports.isDateBefore = void 0; exports.getCurrentDate = void 0; exports.getTomorrow = void 0; exports.formatDateLong = void 0; exports.formatDateTimeLong = void 0; exports.formatDateShort = void 0; exports.formatDateTimeShort = void 0;
var init_date = __esm({
  "src/core/date.ts"() {
    toDate = (date) => {
      if (!date)
        return null;
      if (date instanceof Date) {
        return dateFns.isValid(date) ? date : null;
      }
      try {
        const parsed = dateFns.parseISO(date);
        return dateFns.isValid(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    exports.formatDate = (date, formatString = "dd/MM/yyyy") => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return dateFns.format(dateObj, formatString);
      } catch {
        return "Invalid Date";
      }
    };
    exports.formatDateTime = (date) => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return dateFns.format(dateObj, "dd/MM/yyyy HH:mm");
      } catch {
        return "Invalid Date";
      }
    };
    exports.addDaysToDate = (date, days) => {
      return dateFns.addDays(date, days);
    };
    exports.getDaysDifference = (startDate, endDate) => {
      return dateFns.differenceInDays(endDate, startDate);
    };
    exports.isDateAfter = (date1, date2) => {
      return dateFns.isAfter(date1, date2);
    };
    exports.isDateBefore = (date1, date2) => {
      return dateFns.isBefore(date1, date2);
    };
    exports.getCurrentDate = () => {
      return /* @__PURE__ */ new Date();
    };
    exports.getTomorrow = () => {
      return exports.addDaysToDate(exports.getCurrentDate(), 1);
    };
    exports.formatDateLong = (date) => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }).format(dateObj);
      } catch {
        return "Invalid Date";
      }
    };
    exports.formatDateTimeLong = (date) => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }).format(dateObj);
      } catch {
        return "Invalid Date";
      }
    };
    exports.formatDateShort = (date) => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }).format(dateObj);
      } catch {
        return "Invalid Date";
      }
    };
    exports.formatDateTimeShort = (date) => {
      const dateObj = toDate(date);
      if (!dateObj)
        return "Invalid Date";
      try {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }).format(dateObj);
      } catch {
        return "Invalid Date";
      }
    };
  }
});

// src/core/audit-config.ts
function getAuditConfig() {
  const config = { ...exports.defaultAuditConfig };
  if (process.env.AUDIT_ENTITIES) {
    const enabledEntities = process.env.AUDIT_ENTITIES.split(",");
    Object.keys(config.entities).forEach((entity) => {
      config.entities[entity].enabled = enabledEntities.includes(entity);
    });
  }
  if (process.env.AUDIT_SAMPLING_RATE) {
    const samplingRate = parseFloat(process.env.AUDIT_SAMPLING_RATE);
    Object.keys(config.entities).forEach((entity) => {
      config.entities[entity].sampling.rate = samplingRate;
    });
  }
  return config;
}
function shouldLogEntity(entityType, action) {
  const config = getAuditConfig();
  console.log("\u{1F50D} shouldLogEntity check:", {
    entityType,
    action,
    globalEnabled: config.global.enabled,
    entityConfig: config.entities[entityType]
  });
  if (!config.global.enabled) {
    console.log("\u274C Global audit logging is disabled");
    return false;
  }
  const entityConfig = config.entities[entityType];
  if (!entityConfig || !entityConfig.enabled) {
    console.log("\u274C Entity not configured or disabled:", entityType);
    return false;
  }
  switch (entityConfig.logLevel) {
    case "ALL":
      return true;
    case "CREATE_UPDATE_DELETE":
      return ["CREATE", "UPDATE", "DELETE"].includes(action);
    case "CREATE_DELETE":
      return ["CREATE", "DELETE"].includes(action);
    case "CRITICAL_ONLY":
      return ["DELETE", "LOGIN", "LOGOUT"].includes(action);
    default:
      return false;
  }
}
function shouldLogField(entityType, fieldName) {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  if (!entityConfig)
    return false;
  const { include, exclude } = entityConfig.fields;
  if (exclude.includes("*") || exclude.includes(fieldName))
    return false;
  if (include.includes("*"))
    return true;
  if (include.includes(fieldName))
    return true;
  return false;
}
function shouldSample(entityType) {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  if (!entityConfig || !entityConfig.sampling.enabled)
    return false;
  return Math.random() < entityConfig.sampling.rate;
}
function getAuditEntityConfig(entityType) {
  const config = getAuditConfig();
  return config.entities[entityType] || null;
}
function sanitizeFieldValue(entityType, fieldName, value) {
  const config = getAuditConfig();
  const entityConfig = config.entities[entityType];
  if (!entityConfig)
    return value;
  if (entityConfig.fields.sensitive.includes(fieldName)) {
    if (typeof value === "string" && value.length > 4) {
      return value.substring(0, 2) + "*".repeat(value.length - 4) + value.substring(value.length - 2);
    }
    return "[REDACTED]";
  }
  return value;
}
exports.defaultAuditConfig = void 0; exports.AuditPerformanceMonitor = void 0; exports.auditPerformanceMonitor = void 0;
var init_audit_config = __esm({
  "src/core/audit-config.ts"() {
    exports.defaultAuditConfig = {
      global: {
        enabled: process.env.AUDIT_LOGGING_ENABLED === "true" || process.env.NODE_ENV === "production" || process.env.NODE_ENV === "development" || process.env.NODE_ENV === void 0,
        // Enable by default in development
        async: true,
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || "90"),
        maxLogSize: parseInt(process.env.AUDIT_MAX_LOG_SIZE || "1048576")
        // 1MB
      },
      entities: {
        // Tier 1: Critical Business Operations (Always Log)
        Customer: {
          enabled: true,
          logLevel: "ALL",
          fields: {
            include: ["*"],
            // All fields
            exclude: ["password", "token", "secret"],
            sensitive: ["email", "phone", "idNumber"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "INFO",
          category: "BUSINESS"
        },
        Order: {
          enabled: true,
          logLevel: "ALL",
          fields: {
            include: ["*"],
            exclude: ["paymentToken", "cardNumber"],
            sensitive: ["customerId", "totalAmount"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "INFO",
          category: "BUSINESS"
        },
        User: {
          enabled: true,
          logLevel: "ALL",
          fields: {
            include: ["*"],
            exclude: ["password", "passwordHash", "token"],
            sensitive: ["email", "phone"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "WARNING",
          category: "SECURITY"
        },
        Payment: {
          enabled: true,
          logLevel: "ALL",
          fields: {
            include: ["*"],
            exclude: ["cardNumber", "cvv", "token"],
            sensitive: ["amount", "customerId"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "WARNING",
          category: "BUSINESS"
        },
        // Tier 2: Important Operations (Selective Logging)
        Product: {
          enabled: true,
          logLevel: "CREATE_UPDATE_DELETE",
          fields: {
            include: ["name", "price", "stock", "category", "isActive"],
            exclude: ["description", "images"],
            sensitive: ["cost", "margin"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "INFO",
          category: "BUSINESS"
        },
        Settings: {
          enabled: true,
          logLevel: "CREATE_UPDATE_DELETE",
          fields: {
            include: ["*"],
            exclude: ["apiKey", "secret", "password"],
            sensitive: ["value"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "WARNING",
          category: "SYSTEM"
        },
        Export: {
          enabled: true,
          logLevel: "ALL",
          fields: {
            include: ["*"],
            exclude: ["data", "content"],
            sensitive: ["userId", "filters"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "INFO",
          category: "BUSINESS"
        },
        Merchant: {
          enabled: true,
          logLevel: "CREATE_UPDATE_DELETE",
          fields: {
            include: ["name", "status", "plan", "settings"],
            exclude: ["apiKey", "webhookSecret"],
            sensitive: ["email", "phone"]
          },
          sampling: { enabled: false, rate: 1 },
          async: true,
          severity: "WARNING",
          category: "BUSINESS"
        },
        // Tier 3: Low-Value Operations (Skip or Sample)
        AuditLog: {
          enabled: false,
          // Don't log audit logs
          logLevel: "CRITICAL_ONLY",
          fields: { include: [], exclude: ["*"], sensitive: [] },
          sampling: { enabled: true, rate: 0.01 },
          async: true,
          severity: "INFO",
          category: "SYSTEM"
        },
        Session: {
          enabled: false,
          logLevel: "CRITICAL_ONLY",
          fields: { include: [], exclude: ["*"], sensitive: [] },
          sampling: { enabled: true, rate: 0.05 },
          async: true,
          severity: "INFO",
          category: "SECURITY"
        }
      },
      performance: {
        maxLogTime: 100,
        // 100ms max
        batchSize: 50,
        queueSize: 1e3
      },
      features: {
        changeDetection: true,
        fieldLevelTracking: true,
        userContext: true,
        networkContext: true
      }
    };
    exports.AuditPerformanceMonitor = class {
      constructor() {
        this.metrics = {
          totalLogs: 0,
          failedLogs: 0,
          totalTime: 0,
          averageTime: 0,
          maxTime: 0
        };
      }
      startTimer() {
        const start = Date.now();
        return () => {
          const duration = Date.now() - start;
          this.updateMetrics(duration);
          return duration;
        };
      }
      updateMetrics(duration) {
        this.metrics.totalLogs++;
        this.metrics.totalTime += duration;
        this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalLogs;
        this.metrics.maxTime = Math.max(this.metrics.maxTime, duration);
      }
      recordFailure() {
        this.metrics.failedLogs++;
      }
      getMetrics() {
        return {
          ...this.metrics,
          failureRate: this.metrics.failedLogs / this.metrics.totalLogs,
          performance: {
            averageTime: this.metrics.averageTime,
            maxTime: this.metrics.maxTime,
            isHealthy: this.metrics.averageTime < 100
            // 100ms threshold
          }
        };
      }
      reset() {
        this.metrics = {
          totalLogs: 0,
          failedLogs: 0,
          totalTime: 0,
          averageTime: 0,
          maxTime: 0
        };
      }
    };
    exports.auditPerformanceMonitor = new exports.AuditPerformanceMonitor();
  }
});

// src/core/audit-helper.ts
function createAuditHelper(prisma2) {
  return new exports.AuditHelper(prisma2);
}
async function quickAuditLog(prisma2, operation, entityType, entityId, context, options) {
  const auditHelper = new exports.AuditHelper(prisma2);
  switch (operation) {
    case "CREATE":
      await auditHelper.logCreate({
        entityType,
        entityId,
        entityName: options?.entityName,
        newValues: options?.newValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
    case "UPDATE":
      await auditHelper.logUpdate({
        entityType,
        entityId,
        entityName: options?.entityName,
        oldValues: options?.oldValues || {},
        newValues: options?.newValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
    case "DELETE":
      await auditHelper.logDelete({
        entityType,
        entityId,
        entityName: options?.entityName,
        oldValues: options?.oldValues || {},
        description: options?.description,
        context,
        severity: options?.severity,
        category: options?.category
      });
      break;
  }
}
exports.AuditHelper = void 0;
var init_audit_helper = __esm({
  "src/core/audit-helper.ts"() {
    init_src();
    init_audit_config();
    exports.AuditHelper = class {
      constructor(prisma2) {
        this.prisma = prisma2;
        this.auditLogger = new AuditLogger(prisma2);
      }
      /**
       * Log a CREATE operation with selective logging
       */
      async logCreate(params) {
        if (!shouldLogEntity(params.entityType, "CREATE")) {
          return;
        }
        if (shouldSample(params.entityType)) {
          return;
        }
        const timer = exports.auditPerformanceMonitor.startTimer();
        try {
          const sanitizedValues = this.sanitizeValues(params.entityType, params.newValues);
          const entityConfig = getAuditEntityConfig(params.entityType);
          await this.auditLogger.log({
            action: "CREATE",
            entityType: params.entityType,
            entityId: params.entityId,
            entityName: params.entityName,
            newValues: sanitizedValues,
            severity: params.severity || entityConfig?.severity || "INFO",
            category: params.category || entityConfig?.category || "BUSINESS",
            description: params.description || `${params.entityType} created`,
            context: this.transformContext(params.context)
          });
        } catch (error) {
          console.error("Failed to log CREATE audit:", error);
          exports.auditPerformanceMonitor.recordFailure();
        } finally {
          timer();
        }
      }
      /**
       * Log an UPDATE operation with selective logging
       */
      async logUpdate(params) {
        console.log("\u{1F50D} Audit Helper - logUpdate called:", {
          entityType: params.entityType,
          entityId: params.entityId,
          shouldLog: shouldLogEntity(params.entityType, "UPDATE"),
          shouldSample: shouldSample(params.entityType)
        });
        if (!shouldLogEntity(params.entityType, "UPDATE")) {
          console.log("\u274C Audit logging skipped: Entity not configured for logging");
          return;
        }
        if (shouldSample(params.entityType)) {
          console.log("\u274C Audit logging skipped: Sampling applied");
          return;
        }
        const timer = exports.auditPerformanceMonitor.startTimer();
        try {
          const changes = params.changes || this.calculateChanges(params.oldValues, params.newValues);
          const significantChanges = this.filterSignificantChanges(params.entityType, changes);
          if (Object.keys(significantChanges).length > 0) {
            const sanitizedOldValues = this.sanitizeValues(params.entityType, params.oldValues);
            const sanitizedNewValues = this.sanitizeValues(params.entityType, params.newValues);
            const entityConfig = getAuditEntityConfig(params.entityType);
            await this.auditLogger.log({
              action: "UPDATE",
              entityType: params.entityType,
              entityId: params.entityId,
              entityName: params.entityName,
              oldValues: sanitizedOldValues,
              newValues: sanitizedNewValues,
              changes: significantChanges,
              severity: params.severity || entityConfig?.severity || "INFO",
              category: params.category || entityConfig?.category || "BUSINESS",
              description: params.description || `${params.entityType} updated`,
              context: this.transformContext(params.context)
            });
          }
        } catch (error) {
          console.error("Failed to log UPDATE audit:", error);
          exports.auditPerformanceMonitor.recordFailure();
        } finally {
          timer();
        }
      }
      /**
       * Log a DELETE operation
       */
      async logDelete(params) {
        try {
          await this.auditLogger.log({
            action: "DELETE",
            entityType: params.entityType,
            entityId: params.entityId,
            entityName: params.entityName,
            oldValues: params.oldValues,
            severity: params.severity || "WARNING",
            category: params.category || "BUSINESS",
            description: params.description || `${params.entityType} deleted`,
            context: this.transformContext(params.context)
          });
        } catch (error) {
          console.error("Failed to log DELETE audit:", error);
        }
      }
      /**
       * Log a custom action
       */
      async logCustom(params) {
        try {
          await this.auditLogger.log({
            action: params.action,
            // Cast to allowed action type
            entityType: params.entityType,
            entityId: params.entityId,
            entityName: params.entityName,
            description: params.description,
            severity: params.severity || "INFO",
            category: params.category || "GENERAL",
            context: {
              ...this.transformContext(params.context),
              metadata: {
                ...params.context.metadata,
                ...params.metadata
              }
            }
          });
        } catch (error) {
          console.error("Failed to log CUSTOM audit:", error);
        }
      }
      /**
       * Calculate changes between old and new values
       */
      calculateChanges(oldValues, newValues) {
        const changes = {};
        for (const key in newValues) {
          if (key === "id" || key === "createdAt" || key === "updatedAt")
            continue;
          if (oldValues[key] !== newValues[key]) {
            changes[key] = {
              old: oldValues[key],
              new: newValues[key]
            };
          }
        }
        for (const key in oldValues) {
          if (key === "id" || key === "createdAt" || key === "updatedAt")
            continue;
          if (!(key in newValues)) {
            changes[key] = {
              old: oldValues[key],
              new: null
            };
          }
        }
        return changes;
      }
      /**
       * Sanitize values based on entity configuration
       */
      sanitizeValues(entityType, values) {
        const sanitized = {};
        for (const [key, value] of Object.entries(values)) {
          if (shouldLogField(entityType, key)) {
            sanitized[key] = sanitizeFieldValue(entityType, key, value);
          }
        }
        return sanitized;
      }
      /**
       * Filter changes to only include significant ones
       */
      filterSignificantChanges(entityType, changes) {
        const significant = {};
        const alwaysSignificant = ["name", "email", "phone", "status", "role", "amount", "price"];
        const usuallyInsignificant = ["updatedAt", "lastLoginAt", "viewCount", "accessCount"];
        for (const [field, change] of Object.entries(changes)) {
          if (!shouldLogField(entityType, field))
            continue;
          if (alwaysSignificant.includes(field)) {
            significant[field] = change;
            continue;
          }
          if (usuallyInsignificant.includes(field))
            continue;
          significant[field] = change;
        }
        return significant;
      }
      /**
       * Transform helper context to audit context
       */
      transformContext(context) {
        return {
          userId: context.userId ? parseInt(context.userId) : void 0,
          userEmail: context.userEmail,
          userRole: context.userRole,
          merchantId: context.merchantId ? parseInt(context.merchantId) : void 0,
          outletId: context.outletId ? parseInt(context.outletId) : void 0,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          requestId: context.requestId,
          metadata: context.metadata
        };
      }
    };
  }
});

// src/core/index.ts
var init_core = __esm({
  "src/core/index.ts"() {
    init_string_utils();
    init_function_utils();
    init_common();
    init_errors();
    init_errors();
    init_errors();
    init_pricing_calculator();
    init_subscription_manager();
    init_proration();
    init_pricing_calculator();
    init_pricing_calculator();
    init_badge_utils();
    init_customer_utils();
    init_product_utils();
    init_user_utils();
    init_validation();
    init_validation();
    init_currency();
    init_payment_gateways();
    init_order_number_manager();
    init_date();
    init_audit_config();
    init_audit_helper();
  }
});

// src/api/auth.ts
exports.authApi = void 0;
var init_auth = __esm({
  "src/api/auth.ts"() {
    init_core();
    init_api();
    exports.authApi = {
      /**
       * Login user
       */
      async login(credentials) {
        try {
          const response = await exports.publicFetch(exports.apiUrls.auth.login, {
            method: "POST",
            body: JSON.stringify(credentials)
          });
          return await exports.parseApiResponse(response);
        } catch (error) {
          console.error("Login error:", error);
          throw new Error("Failed to login");
        }
      },
      /**
       * Register new user
       */
      async register(userData) {
        const response = await exports.publicFetch(exports.apiUrls.auth.register, {
          method: "POST",
          body: JSON.stringify(userData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Verify authentication token
       */
      async verifyToken() {
        const response = await exports.authenticatedFetch(exports.apiUrls.auth.verify);
        return await exports.parseApiResponse(response);
      },
      /**
       * Refresh authentication token
       */
      async refreshToken() {
        const response = await exports.authenticatedFetch(exports.apiUrls.auth.refresh);
        return await exports.parseApiResponse(response);
      },
      /**
       * Logout user
       */
      async logout() {
        const response = await exports.authenticatedFetch(exports.apiUrls.auth.logout, {
          method: "POST"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Request password reset
       */
      async requestPasswordReset(email) {
        const response = await fetch(exports.apiUrls.auth.forgotPassword, {
          method: "POST",
          body: JSON.stringify({ email })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Reset password with token
       */
      async resetPassword(token, newPassword) {
        const response = await fetch(exports.apiUrls.auth.resetPassword, {
          method: "POST",
          body: JSON.stringify({ token, newPassword })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Change password (authenticated)
       */
      async changePassword(currentPassword, newPassword) {
        const response = await exports.authenticatedFetch(exports.apiUrls.auth.changePassword, {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword })
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/products.ts
exports.productsApi = void 0;
var init_products = __esm({
  "src/api/products.ts"() {
    init_core();
    init_api();
    exports.productsApi = {
      /**
       * Get all products
       */
      async getProducts() {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get products with pagination
       */
      async getProductsPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.products.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search products with filters
       */
      async searchProducts(filters) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("q", filters.search);
        if (filters.categoryId)
          params.append("categoryId", filters.categoryId.toString());
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.available !== void 0)
          params.append("available", filters.available.toString());
        if (filters.status)
          params.append("status", filters.status);
        if (filters.minPrice)
          params.append("minPrice", filters.minPrice.toString());
        if (filters.maxPrice)
          params.append("maxPrice", filters.maxPrice.toString());
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.page)
          params.append("page", filters.page.toString());
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.products.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search products for a specific merchant (admin context)
       */
      async searchMerchantProducts(merchantId, filters) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.categoryId)
          params.append("categoryId", filters.categoryId.toString());
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.available !== void 0)
          params.append("available", filters.available.toString());
        if (filters.status)
          params.append("status", filters.status);
        if (filters.minPrice)
          params.append("minPrice", filters.minPrice.toString());
        if (filters.maxPrice)
          params.append("maxPrice", filters.maxPrice.toString());
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.page)
          params.append("page", filters.page.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.merchants.products.list(merchantId)}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get product by ID
       */
      async getProduct(productId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.update(productId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Get product by ID (alias for getProduct for backward compatibility)
       */
      async getProductById(productId) {
        return this.getProduct(productId);
      },
      /**
       * Create a new product
       */
      async createProduct(productData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.create, {
          method: "POST",
          body: JSON.stringify(productData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing product
       */
      async updateProduct(productId, productData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.update(productId), {
          method: "PUT",
          body: JSON.stringify(productData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a product
       */
      async deleteProduct(productId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.delete(productId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get products by category
       */
      async getProductsByCategory(categoryId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.products.list}?categoryId=${categoryId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get products by outlet
       */
      async getProductsByOutlet(outletId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.products.list}?outletId=${outletId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update product stock
       */
      async updateProductStock(productId, stock) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.updateStock(productId), {
          method: "PATCH",
          body: JSON.stringify({ stock })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Bulk update products
       */
      async bulkUpdateProducts(updates) {
        const response = await exports.authenticatedFetch(exports.apiUrls.products.bulkUpdate, {
          method: "PATCH",
          body: JSON.stringify({ updates })
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/customers.ts
exports.customersApi = void 0;
var init_customers = __esm({
  "src/api/customers.ts"() {
    init_core();
    init_api();
    exports.customersApi = {
      // ============================================================================
      // CUSTOMER CRUD OPERATIONS
      // ============================================================================
      /**
       * Get all customers
       */
      async getCustomers() {
        const response = await exports.authenticatedFetch(exports.apiUrls.customers.list);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get customers with pagination
       */
      async getCustomersPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          _t: Date.now().toString()
          // Cache-busting parameter
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.customers.list}?${params.toString()}`);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get customers with filtering and pagination
       */
      async getCustomersWithFilters(filters = {}, page = 1, limit = 20) {
        const params = new URLSearchParams();
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.search)
          params.append("search", filters.search);
        if (filters.city)
          params.append("city", filters.city);
        if (filters.state)
          params.append("state", filters.state);
        if (filters.country)
          params.append("country", filters.country);
        if (filters.idType)
          params.append("idType", filters.idType);
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.customers.list}?${params.toString()}`);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Search customers with advanced filters
       */
      async searchCustomers(filters = {}) {
        const params = new URLSearchParams();
        if (filters.q)
          params.append("q", filters.q);
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.city)
          params.append("city", filters.city);
        if (filters.state)
          params.append("state", filters.state);
        if (filters.country)
          params.append("country", filters.country);
        if (filters.idType)
          params.append("idType", filters.idType);
        params.append("limit", (filters.limit || 20).toString());
        params.append("offset", (filters.offset || 0).toString());
        params.append("_t", Date.now().toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.customers.list}?${params.toString()}`);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get customer by ID
       */
      async getCustomerById(customerId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.customers.update(customerId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create new customer
       */
      async createCustomer(customerData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.customers.create, {
          method: "POST",
          body: JSON.stringify(customerData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update customer
       */
      async updateCustomer(customerId, customerData) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.customers.list}?id=${customerId}`, {
          method: "PUT",
          body: JSON.stringify(customerData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete customer
       */
      async deleteCustomer(customerId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.customers.delete(customerId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      // ============================================================================
      // TESTING AND DEBUG ENDPOINTS
      // ============================================================================
      /**
       * Test customer creation payload validation
       */
      async testCustomerPayload(customerData) {
        const response = await exports.authenticatedFetch("/api/customers/test", {
          method: "POST",
          body: JSON.stringify(customerData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Debug customer creation payload
       */
      async debugCustomerPayload(customerData) {
        const response = await exports.authenticatedFetch("/api/customers/debug", {
          method: "POST",
          body: JSON.stringify(customerData)
        });
        return await exports.parseApiResponse(response);
      },
      // ============================================================================
      // UTILITY METHODS
      // ============================================================================
      /**
       * Validate customer data before sending to API
       */
      validateCustomerData(data) {
        const errors = [];
        if (!data.firstName?.trim())
          errors.push("First name is required");
        if (!data.lastName?.trim())
          errors.push("Last name is required");
        if (!data.email?.trim())
          errors.push("Email is required");
        if (!data.phone?.trim())
          errors.push("Phone is required");
        if (!data.merchantId)
          errors.push("Merchant ID is required");
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push("Invalid email format");
        }
        if (data.phone && !/^[0-9+\-\s()]+$/.test(data.phone)) {
          errors.push("Phone number contains invalid characters");
        }
        if (data.phone && data.phone.length < 8) {
          errors.push("Phone number must be at least 8 characters");
        }
        if (data.idType && !["passport", "drivers_license", "national_id", "other"].includes(data.idType)) {
          errors.push("Invalid ID type");
        }
        return {
          isValid: errors.length === 0,
          errors
        };
      },
      /**
       * Format customer data for API submission
       */
      formatCustomerData(data) {
        return {
          ...data,
          firstName: data.firstName?.trim(),
          lastName: data.lastName?.trim(),
          email: data.email?.toLowerCase().trim(),
          phone: data.phone?.trim(),
          address: data.address?.trim(),
          city: data.city?.trim(),
          state: data.state?.trim(),
          zipCode: data.zipCode?.trim(),
          country: data.country?.trim(),
          idNumber: data.idNumber?.trim(),
          notes: data.notes?.trim()
        };
      }
    };
  }
});

// src/api/orders.ts
exports.ordersApi = void 0;
var init_orders = __esm({
  "src/api/orders.ts"() {
    init_core();
    init_api();
    exports.ordersApi = {
      /**
       * Get all orders
       */
      async getOrders() {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get orders with pagination
       */
      async getOrdersPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.orders.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search orders with filters
       */
      async searchOrders(filters) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("q", filters.search);
        if (filters.status) {
          if (Array.isArray(filters.status)) {
            filters.status.forEach((status) => params.append("status", status));
          } else {
            params.append("status", filters.status);
          }
        }
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.customerId)
          params.append("customerId", filters.customerId.toString());
        if (filters.productId)
          params.append("productId", filters.productId.toString());
        if (filters.startDate) {
          const startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
          params.append("startDate", startDate);
        }
        if (filters.endDate) {
          const endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
          params.append("endDate", endDate);
        }
        if (filters.orderType)
          params.append("orderType", filters.orderType);
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.page)
          params.append("page", filters.page.toString());
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.orders.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get order by ID
       */
      async getOrder(orderId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.update(orderId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Get order by order number (e.g., "ORD-2110")
       */
      async getOrderByNumber(orderNumber) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.getByNumber(orderNumber));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new order
       */
      async createOrder(orderData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.create, {
          method: "POST",
          body: JSON.stringify(orderData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing order
       */
      async updateOrder(orderId, orderData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.update(orderId), {
          method: "PUT",
          body: JSON.stringify(orderData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete an order
       */
      async deleteOrder(orderId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.delete(orderId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get orders by customer
       */
      async getOrdersByCustomer(customerId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.orders.list}?customerId=${customerId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get orders by outlet
       */
      async getOrdersByOutlet(outletId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.orders.list}?outletId=${outletId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get orders by product ID
       */
      async getOrdersByProduct(productId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.orders.list}?productId=${productId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update order status
       */
      async updateOrderStatus(orderId, status) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.updateStatus(orderId), {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Pickup order (change status to PICKUPED)
       */
      async pickupOrder(orderId) {
        return this.updateOrderStatus(orderId, "PICKUPED");
      },
      /**
       * Return order (change status to RETURNED)
       */
      async returnOrder(orderId) {
        return this.updateOrderStatus(orderId, "RETURNED");
      },
      /**
       * Cancel order (change status to CANCELLED)
       */
      async cancelOrder(orderId) {
        return this.updateOrderStatus(orderId, "CANCELLED");
      },
      /**
       * Update order settings (damage fee, security deposit, collateral, notes)
       */
      async updateOrderSettings(orderId, settings) {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.update(orderId), {
          method: "PUT",
          body: JSON.stringify(settings)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get order statistics
       */
      async getOrderStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.orders.stats);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/outlets.ts
exports.outletsApi = void 0;
var init_outlets = __esm({
  "src/api/outlets.ts"() {
    init_core();
    init_api();
    exports.outletsApi = {
      /**
       * Get all outlets
       */
      async getOutlets() {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get outlets with pagination
       */
      async getOutletsPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.outlets.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get outlet by ID
       */
      async getOutlet(outletId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.get(outletId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new outlet
       */
      async createOutlet(outletData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.create, {
          method: "POST",
          body: JSON.stringify(outletData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing outlet
       */
      async updateOutlet(outletId, outletData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.update(outletId), {
          method: "PUT",
          body: JSON.stringify(outletData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete an outlet
       */
      async deleteOutlet(outletId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.delete(outletId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get outlets by shop
       */
      async getOutletsByShop(shopId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.outlets.list}?shopId=${shopId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get outlets by merchant
       */
      async getOutletsByMerchant(merchantId) {
        console.log("\u{1F50D} Outlets API Client: Calling getOutletsByMerchant with merchantId:", merchantId);
        console.log("\u{1F50D} Outlets API Client: API URL:", exports.apiUrls.merchants.outlets.list(merchantId));
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.outlets.list(merchantId));
        console.log("\u{1F50D} Outlets API Client: Raw response:", response);
        const result = await exports.parseApiResponse(response);
        console.log("\u{1F50D} Outlets API Client: Parsed result:", result);
        console.log("\u{1F50D} Outlets API Client: Result success:", result.success);
        if (result.success) {
          console.log("\u{1F50D} Outlets API Client: Result data:", result.data);
          console.log("\u{1F50D} Outlets API Client: Result outlets count:", result.data?.outlets?.length || 0);
        } else {
          console.log("\u{1F50D} Outlets API Client: Error:", result.message);
        }
        return result;
      },
      /**
       * Get outlet statistics
       */
      async getOutletStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.outlets.stats);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/merchants.ts
exports.merchantsApi = void 0;
var init_merchants = __esm({
  "src/api/merchants.ts"() {
    init_core();
    init_api();
    exports.merchantsApi = {
      /**
       * Get all merchants
       */
      async getMerchants() {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get merchants with pagination
       */
      async getMerchantsPaginated(page = 1, limit = 50) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.merchants.list}?page=${page}&limit=${limit}`);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Search merchants with filters
       */
      async searchMerchants(filters) {
        const params = new URLSearchParams();
        if (filters.q)
          params.append("q", filters.q);
        if (filters.status)
          params.append("status", filters.status);
        if (filters.plan)
          params.append("plan", filters.plan);
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.subscriptionStatus)
          params.append("subscriptionStatus", filters.subscriptionStatus);
        if (filters.minRevenue !== void 0)
          params.append("minRevenue", filters.minRevenue.toString());
        if (filters.maxRevenue !== void 0)
          params.append("maxRevenue", filters.maxRevenue.toString());
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.merchants.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get merchant by ID
       */
      async getMerchantById(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.get(id));
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get merchant detail with full data (subscriptions, outlets, users, etc.)
       */
      async getMerchantDetail(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.get(id));
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Create new merchant
       */
      async createMerchant(merchantData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.create, {
          method: "POST",
          body: JSON.stringify(merchantData)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Register new merchant (public endpoint)
       */
      async register(data) {
        const response = await fetch(exports.apiUrls.merchants.register, {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update merchant
       */
      async updateMerchant(id, merchantData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.update(id), {
          method: "PUT",
          body: JSON.stringify(merchantData)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Delete merchant
       */
      async deleteMerchant(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.delete(id), {
          method: "DELETE"
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get merchant statistics
       */
      async getMerchantStats() {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.merchants.list}/stats`);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Update merchant plan
       */
      async updateMerchantPlan(merchantId, planData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.updatePlan(merchantId), {
          method: "PUT",
          body: JSON.stringify(planData)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get merchant plan history
       */
      async getMerchantPlanHistory(merchantId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.getPlan(merchantId));
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Disable merchant plan
       */
      async disableMerchantPlan(merchantId, subscriptionId, reason) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.extendPlan(merchantId), {
          method: "PATCH",
          body: JSON.stringify({
            action: "disable",
            subscriptionId,
            reason
          })
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Delete merchant plan
       */
      async deleteMerchantPlan(merchantId, subscriptionId, reason) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.cancelPlan(merchantId), {
          method: "PATCH",
          body: JSON.stringify({
            action: "delete",
            subscriptionId,
            reason
          })
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      // ============================================================================
      // MERCHANT-SPECIFIC ENDPOINTS
      // ============================================================================
      /**
       * Merchant Products
       */
      products: {
        list: async (merchantId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.products.list(merchantId));
        },
        get: async (merchantId, productId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.products.get(merchantId, productId));
        },
        create: async (merchantId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.products.create(merchantId), {
            method: "POST",
            body: JSON.stringify(data)
          });
        },
        update: async (merchantId, productId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.products.update(merchantId, productId), {
            method: "PUT",
            body: JSON.stringify(data)
          });
        },
        delete: async (merchantId, productId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.products.delete(merchantId, productId), {
            method: "DELETE"
          });
        }
      },
      /**
       * Merchant Orders
       */
      orders: {
        list: async (merchantId, queryParams) => {
          const url = queryParams ? `${exports.apiUrls.merchants.orders.list(merchantId)}?${queryParams}` : exports.apiUrls.merchants.orders.list(merchantId);
          return exports.authenticatedFetch(url);
        },
        get: async (merchantId, orderId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.orders.get(merchantId, orderId));
        },
        create: async (merchantId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.orders.create(merchantId), {
            method: "POST",
            body: JSON.stringify(data)
          });
        },
        update: async (merchantId, orderId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.orders.update(merchantId, orderId), {
            method: "PUT",
            body: JSON.stringify(data)
          });
        },
        delete: async (merchantId, orderId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.orders.delete(merchantId, orderId), {
            method: "DELETE"
          });
        }
      },
      /**
       * Merchant Users
       */
      users: {
        list: async (merchantId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.users.list(merchantId));
        },
        get: async (merchantId, userId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.users.get(merchantId, userId));
        },
        create: async (merchantId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.users.create(merchantId), {
            method: "POST",
            body: JSON.stringify(data)
          });
        },
        update: async (merchantId, userId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.users.update(merchantId, userId), {
            method: "PUT",
            body: JSON.stringify(data)
          });
        },
        delete: async (merchantId, userId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.users.delete(merchantId, userId), {
            method: "DELETE"
          });
        }
      },
      /**
       * Merchant Outlets
       */
      outlets: {
        list: async (merchantId, queryParams) => {
          const url = queryParams ? `${exports.apiUrls.merchants.outlets.list(merchantId)}?${queryParams}` : exports.apiUrls.merchants.outlets.list(merchantId);
          return exports.authenticatedFetch(url);
        },
        get: async (merchantId, outletId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.outlets.get(merchantId, outletId));
        },
        create: async (merchantId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.outlets.create(merchantId), {
            method: "POST",
            body: JSON.stringify(data)
          });
        },
        update: async (merchantId, outletId, data) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.outlets.update(merchantId, outletId), {
            method: "PUT",
            body: JSON.stringify(data)
          });
        },
        delete: async (merchantId, outletId) => {
          return exports.authenticatedFetch(exports.apiUrls.merchants.outlets.delete(merchantId, outletId), {
            method: "DELETE"
          });
        }
      },
      /**
       * Get merchant pricing configuration
       */
      async getPricingConfig(merchantId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.pricing.get(merchantId));
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Update merchant pricing configuration
       */
      async updatePricingConfig(merchantId, config) {
        const response = await exports.authenticatedFetch(exports.apiUrls.merchants.pricing.update(merchantId), {
          method: "PUT",
          body: JSON.stringify(config)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      }
    };
  }
});

// src/api/analytics.ts
exports.analyticsApi = void 0;
var init_analytics = __esm({
  "src/api/analytics.ts"() {
    init_core();
    init_api();
    exports.analyticsApi = {
      /**
       * Get revenue analytics
       */
      async getRevenueAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.groupBy)
          params.append("groupBy", filters.groupBy);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.revenue}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get order analytics
       */
      async getOrderAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.groupBy)
          params.append("groupBy", filters.groupBy);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.orders}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get product analytics
       */
      async getProductAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.topProducts}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get customer analytics
       */
      async getCustomerAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.topCustomers}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get inventory analytics
       */
      async getInventoryAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.inventory}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get dashboard summary
       */
      async getDashboardSummary() {
        const response = await exports.authenticatedFetch(exports.apiUrls.analytics.dashboard);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get system analytics (admin only)
       */
      async getSystemAnalytics(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        if (filters?.groupBy)
          params.append("groupBy", filters.groupBy);
        params.append("t", Date.now().toString());
        const url = `${exports.apiUrls.analytics.system}?${params.toString()}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get recent system activities (admin only)
       */
      async getRecentActivities(limit, offset) {
        const params = new URLSearchParams();
        if (limit)
          params.append("limit", limit.toString());
        if (offset)
          params.append("offset", offset.toString());
        params.append("t", Date.now().toString());
        const url = `${exports.apiUrls.analytics.recentActivities}?${params.toString()}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get income analytics
       */
      async getIncomeAnalytics(filters = {}) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.groupBy)
          params.append("groupBy", filters.groupBy);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.analytics.income}?${queryString}` : exports.apiUrls.analytics.income;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get order analytics summary
       */
      async getOrderAnalyticsSummary() {
        const response = await exports.authenticatedFetch(exports.apiUrls.analytics.orders);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get top products
       */
      async getTopProducts(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        const url = `${exports.apiUrls.analytics.topProducts}${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get top customers
       */
      async getTopCustomers(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        const url = `${exports.apiUrls.analytics.topCustomers}${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get recent orders
       */
      async getRecentOrders(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        const url = `${exports.apiUrls.analytics.recentOrders}${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get outlet performance comparison
       */
      async getOutletPerformance(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.outletPerformance}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get seasonal trends
       */
      async getSeasonalTrends(filters) {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.seasonalTrends}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Export analytics data
       */
      async exportAnalytics(filters, format2 = "csv") {
        const params = new URLSearchParams();
        if (filters.startDate)
          params.append("startDate", filters.startDate);
        if (filters.endDate)
          params.append("endDate", filters.endDate);
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.groupBy)
          params.append("groupBy", filters.groupBy);
        params.append("format", format2);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.analytics.export}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get today's operational metrics
       */
      async getTodayMetrics() {
        const url = `${exports.apiUrls.analytics.todayMetrics}?t=${Date.now()}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get growth metrics
       */
      async getGrowthMetrics(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        params.append("t", Date.now().toString());
        const url = `${exports.apiUrls.analytics.growthMetrics}?${params.toString()}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get enhanced dashboard summary with all metrics
       */
      async getEnhancedDashboardSummary(filters) {
        const params = new URLSearchParams();
        if (filters?.startDate)
          params.append("startDate", filters.startDate);
        if (filters?.endDate)
          params.append("endDate", filters.endDate);
        params.append("t", Date.now().toString());
        const url = `${exports.apiUrls.analytics.enhancedDashboard}?${params.toString()}`;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/categories.ts
exports.categoriesApi = void 0;
var init_categories = __esm({
  "src/api/categories.ts"() {
    init_core();
    init_api();
    exports.categoriesApi = {
      /**
       * Get all categories
       */
      async getCategories() {
        const response = await exports.authenticatedFetch(exports.apiUrls.categories.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get categories with pagination
       */
      async getCategoriesPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.categories.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new category
       */
      async createCategory(categoryData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.categories.create, {
          method: "POST",
          body: JSON.stringify(categoryData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing category
       */
      async updateCategory(categoryId, categoryData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.categories.update(categoryId), {
          method: "PUT",
          body: JSON.stringify(categoryData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a category
       */
      async deleteCategory(categoryId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.categories.delete(categoryId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/notifications.ts
exports.notificationsApi = void 0;
var init_notifications = __esm({
  "src/api/notifications.ts"() {
    init_core();
    init_api();
    exports.notificationsApi = {
      /**
       * Get all notifications
       */
      async getNotifications() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get notifications with pagination
       */
      async getNotificationsPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.notifications.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search notifications with filters
       */
      async searchNotifications(filters) {
        const params = new URLSearchParams();
        if (filters.type)
          params.append("type", filters.type);
        if (filters.isRead !== void 0)
          params.append("isRead", filters.isRead.toString());
        if (filters.page)
          params.append("page", filters.page.toString());
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.notifications.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get notification by ID
       */
      async getNotification(notificationId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.get(notificationId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Mark notification as read
       */
      async markAsRead(notificationId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.markRead(notificationId), {
          method: "PATCH"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Mark notification as unread
       */
      async markAsUnread(notificationId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.markUnread(notificationId), {
          method: "PATCH"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Mark all notifications as read
       */
      async markAllAsRead() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.markAllRead, {
          method: "PATCH"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete notification
       */
      async deleteNotification(notificationId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.delete(notificationId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete all read notifications
       */
      async deleteAllRead() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.deleteAllRead, {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get unread count
       */
      async getUnreadCount() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.unreadCount);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get notification preferences
       */
      async getPreferences() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.preferences);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update notification preferences
       */
      async updatePreferences(preferences) {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.preferences, {
          method: "PUT",
          body: JSON.stringify(preferences)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Send test notification
       */
      async sendTestNotification() {
        const response = await exports.authenticatedFetch(exports.apiUrls.notifications.test, {
          method: "POST"
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/profile.ts
exports.profileApi = void 0;
var init_profile = __esm({
  "src/api/profile.ts"() {
    init_core();
    init_api();
    exports.profileApi = {
      /**
       * Get current user profile
       */
      async getProfile() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.user);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update current user profile
       */
      async updateProfile(profileData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.user, {
          method: "PUT",
          body: JSON.stringify(profileData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Change current user password
       */
      async changePassword(passwordData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.changePassword, {
          method: "PATCH",
          body: JSON.stringify(passwordData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Upload profile picture
       */
      async uploadProfilePicture(file) {
        const formData = new FormData();
        formData.append("profilePicture", file);
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.uploadPicture, {
          method: "POST",
          body: formData
          // Don't set Content-Type header for FormData
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete profile picture
       */
      async deleteProfilePicture() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.deletePicture, {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get user preferences
       */
      async getPreferences() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.preferences);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update user preferences
       */
      async updatePreferences(preferences) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.preferences, {
          method: "PUT",
          body: JSON.stringify(preferences)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get user activity log
       */
      async getActivityLog(page = 1, limit = 20) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.settings.activityLog}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get user notifications
       */
      async getNotifications(page = 1, limit = 20) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.settings.profileNotifications}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Mark notification as read
       */
      async markNotificationAsRead(notificationId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.markNotificationRead(notificationId), {
          method: "PATCH"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Mark all notifications as read
       */
      async markAllNotificationsAsRead() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.markAllNotificationsRead, {
          method: "PATCH"
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/users.ts
exports.usersApi = void 0;
var init_users = __esm({
  "src/api/users.ts"() {
    init_core();
    init_api();
    exports.usersApi = {
      // ============================================================================
      // USER CRUD OPERATIONS
      // ============================================================================
      /**
       * Get all users
       */
      async getUsers(filters = {}, options = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.role)
          params.append("role", filters.role);
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.status)
          params.append("status", filters.status);
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (options.page)
          params.append("page", options.page.toString());
        if (options.limit)
          params.append("limit", options.limit.toString());
        if (options.sortBy)
          params.append("sortBy", options.sortBy);
        if (options.sortOrder)
          params.append("sortOrder", options.sortOrder);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.users.list}?${queryString}` : exports.apiUrls.users.list;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get users with pagination
       */
      async getUsersPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.users.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search users with filters
       */
      async searchUsers(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.role)
          params.append("role", filters.role);
        if (filters.status)
          params.append("status", filters.status);
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.outletId)
          params.append("outletId", filters.outletId.toString());
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.users.list}?${queryString}` : exports.apiUrls.users.list;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get user by ID
       */
      async getUserById(userId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.update(userId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create new user
       */
      async createUser(userData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.create, {
          method: "POST",
          body: JSON.stringify(userData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update user
       */
      async updateUser(userId, userData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.update(userId), {
          method: "PUT",
          body: JSON.stringify(userData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete user
       */
      async deleteUser(userId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.delete(userId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      // ============================================================================
      // USER MANAGEMENT OPERATIONS
      // ============================================================================
      /**
       * Update user by public ID
       */
      async updateUserByPublicId(userId, userData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.updateByPublicId(userId), {
          method: "PUT",
          body: JSON.stringify(userData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Activate user by public ID
       */
      async activateUserByPublicId(userId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.activateByPublicId(userId), {
          method: "PUT"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Deactivate user by public ID
       */
      async deactivateUserByPublicId(userId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.users.deactivateByPublicId(userId), {
          method: "PUT"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Activate user
       */
      async activateUser(userId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.users.update(userId)}/activate`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: true })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Deactivate user
       */
      async deactivateUser(userId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.users.update(userId)}/deactivate`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: false })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Change user password
       */
      async changePassword(userId, newPassword) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.users.update(userId)}/change-password`, {
          method: "PATCH",
          body: JSON.stringify({ newPassword })
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/plans.ts
var publicFetch2; exports.plansApi = void 0; exports.publicPlansApi = void 0;
var init_plans = __esm({
  "src/api/plans.ts"() {
    init_core();
    init_api();
    publicFetch2 = async (url, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options.headers
      };
      const defaultOptions = {
        method: "GET",
        headers,
        ...options
      };
      return await fetch(url, defaultOptions);
    };
    exports.plansApi = {
      /**
       * Get all plans with filters and pagination
       */
      async getPlans(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.isPopular !== void 0)
          params.append("isPopular", filters.isPopular.toString());
        if (filters.includeInactive)
          params.append("includeInactive", "true");
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.plans.list}?${queryString}` : exports.apiUrls.plans.list;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get a specific plan by ID
       */
      async getPlanById(planId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.get(planId));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new plan
       */
      async createPlan(planData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.create, {
          method: "POST",
          body: JSON.stringify(planData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing plan
       */
      async updatePlan(planId, planData) {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.update(planId), {
          method: "PUT",
          body: JSON.stringify(planData)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a plan (soft delete)
       */
      async deletePlan(planId) {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.delete(planId), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get plan statistics
       */
      async getPlanStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.stats);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get public plans (for display to users)
       */
      async getPublicPlans() {
        const response = await exports.authenticatedFetch(exports.apiUrls.plans.public);
        return await exports.parseApiResponse(response);
      }
    };
    exports.publicPlansApi = {
      /**
       * Get public plans with variants (no authentication required)
       */
      async getPublicPlansWithVariants() {
        const response = await publicFetch2(exports.apiUrls.plans.public);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/billing-cycles.ts
exports.billingCyclesApi = void 0;
var init_billing_cycles = __esm({
  "src/api/billing-cycles.ts"() {
    init_core();
    init_api();
    exports.billingCyclesApi = {
      /**
       * Get all billing cycles with filtering and pagination
       */
      async getBillingCycles(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.isActive !== void 0)
          params.append("isActive", filters.isActive.toString());
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.billingCycles.list}?${queryString}` : exports.apiUrls.billingCycles.list;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get a specific billing cycle by ID
       */
      async getBillingCycle(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.billingCycles.get(id));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new billing cycle
       */
      async createBillingCycle(input) {
        const response = await exports.authenticatedFetch(exports.apiUrls.billingCycles.create, {
          method: "POST",
          body: JSON.stringify(input)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing billing cycle
       */
      async updateBillingCycle(id, input) {
        const response = await exports.authenticatedFetch(exports.apiUrls.billingCycles.update(id), {
          method: "PUT",
          body: JSON.stringify(input)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a billing cycle
       */
      async deleteBillingCycle(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.billingCycles.delete(id), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get active billing cycles (for dropdowns and forms)
       */
      async getActiveBillingCycles() {
        const response = await this.getBillingCycles({
          isActive: true,
          sortBy: "sortOrder",
          sortOrder: "asc"
        });
        return response;
      },
      /**
       * Get billing cycle by value (for internal use)
       */
      async getBillingCycleByValue(value) {
        const response = await this.getBillingCycles({
          search: value,
          isActive: true
        });
        if (!response.success || !response.data) {
          throw new Error("Failed to fetch billing cycles");
        }
        const cycle = response.data.billingCycles.find((c) => c.value === value);
        if (!cycle) {
          throw new Error(`Billing cycle with value '${value}' not found`);
        }
        return {
          success: true,
          data: cycle,
          message: "Billing cycle found"
        };
      }
    };
  }
});

// src/api/payments.ts
exports.paymentsApi = void 0;
var init_payments = __esm({
  "src/api/payments.ts"() {
    init_core();
    init_api();
    exports.paymentsApi = {
      /**
       * Get all payments with filtering and pagination
       */
      async getPayments(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.status)
          params.append("status", filters.status);
        if (filters.method)
          params.append("method", filters.method);
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        if (filters.sortBy)
          params.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          params.append("sortOrder", filters.sortOrder);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.payments.list}?${queryString}` : exports.apiUrls.payments.list;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get a specific payment by ID
       */
      async getPayment(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.get(id));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new payment
       */
      async createPayment(input) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.create, {
          method: "POST",
          body: JSON.stringify(input)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update an existing payment
       */
      async updatePayment(id, input) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.update(id), {
          method: "PUT",
          body: JSON.stringify(input)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a manual payment
       */
      async createManualPayment(input) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.manual, {
          method: "POST",
          body: JSON.stringify(input)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a payment
       */
      async deletePayment(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.delete(id), {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Process payment
       */
      async processPayment(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.process(id), {
          method: "POST"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Refund payment
       */
      async refundPayment(id, reason) {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.refund(id), {
          method: "POST",
          body: JSON.stringify({ reason })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get payment statistics
       */
      async getPaymentStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.payments.stats);
        return await exports.parseApiResponse(response);
      },
      /**
       * Export payments
       */
      async exportPayments(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search)
          params.append("search", filters.search);
        if (filters.status)
          params.append("status", filters.status);
        if (filters.method)
          params.append("method", filters.method);
        const queryString = params.toString();
        const url = queryString ? `${exports.apiUrls.payments.export}?${queryString}` : exports.apiUrls.payments.export;
        const response = await exports.authenticatedFetch(url);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/audit-logs.ts
async function getAuditLogs(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${exports.apiUrls.auditLogs.list}?${queryString}` : exports.apiUrls.auditLogs.list;
  const response = await exports.authenticatedFetch(url);
  return await exports.parseApiResponse(response);
}
async function getAuditLogStats(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${exports.apiUrls.auditLogs.stats}?${queryString}` : exports.apiUrls.auditLogs.stats;
  const response = await exports.authenticatedFetch(url);
  return await exports.parseApiResponse(response);
}
async function exportAuditLogs(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${exports.apiUrls.auditLogs.export}?${queryString}` : exports.apiUrls.auditLogs.export;
  const response = await exports.authenticatedFetch(url, {
    headers: {
      "Accept": "application/octet-stream"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export failed: ${errorText}`);
  }
  return response.blob();
}
var init_audit_logs = __esm({
  "src/api/audit-logs.ts"() {
    init_core();
    init_api();
  }
});

// src/api/settings.ts
exports.settingsApi = void 0;
var init_settings = __esm({
  "src/api/settings.ts"() {
    init_core();
    init_api();
    exports.settingsApi = {
      /**
       * Update merchant settings
       */
      async updateMerchantSettings(data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.merchant, {
          method: "PUT",
          body: JSON.stringify(data)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Update merchant information (alias for updateMerchantSettings)
       */
      async updateMerchantInfo(data) {
        return this.updateMerchantSettings(data);
      },
      /**
       * Get user profile
       */
      async getUserProfile() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.user);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Update user profile
       */
      async updateUserProfile(data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.user, {
          method: "PUT",
          body: JSON.stringify(data)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Update outlet information
       */
      async updateOutletInfo(data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.outlet, {
          method: "PUT",
          body: JSON.stringify(data)
        });
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get billing settings
       */
      async getBillingSettings() {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.billing);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update billing settings
       */
      async updateBillingSettings(data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.settings.billing, {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get billing intervals
       */
      async getBillingIntervals() {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.settings.billing}/intervals`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Update billing intervals
       */
      async updateBillingIntervals(intervals) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.settings.billing}/intervals`, {
          method: "POST",
          body: JSON.stringify({ intervals })
        });
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/subscriptions.ts
exports.subscriptionsApi = void 0;
var init_subscriptions = __esm({
  "src/api/subscriptions.ts"() {
    init_core();
    init_api();
    exports.subscriptionsApi = {
      /**
       * Get all subscriptions
       */
      async getSubscriptions() {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.list);
        const result = await exports.parseApiResponse(response);
        return result;
      },
      /**
       * Get subscriptions with pagination
       */
      async getSubscriptionsPaginated(page = 1, limit = 50) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Search subscriptions with filters
       */
      async search(filters = {}) {
        const params = new URLSearchParams();
        if (filters.merchantId)
          params.append("merchantId", filters.merchantId.toString());
        if (filters.planId)
          params.append("planId", filters.planId.toString());
        if (filters.status)
          params.append("status", filters.status);
        if (filters.startDate) {
          const startDate = filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate;
          params.append("startDate", startDate);
        }
        if (filters.endDate) {
          const endDate = filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate;
          params.append("endDate", endDate);
        }
        if (filters.limit)
          params.append("limit", filters.limit.toString());
        if (filters.offset)
          params.append("offset", filters.offset.toString());
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.list}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription by ID
       */
      async getById(id) {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.get(id));
        return await exports.parseApiResponse(response);
      },
      /**
       * Create new subscription
       */
      async create(data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.create, {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update subscription
       */
      async update(id, data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.update(id), {
          method: "PUT",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Cancel subscription (soft delete)
       */
      async cancel(id, reason) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.update(id)}/cancel`, {
          method: "POST",
          body: JSON.stringify({ reason })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Change subscription plan
       */
      async changePlan(id, newPlanId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.update(id)}/change-plan`, {
          method: "PATCH",
          body: JSON.stringify({ newPlanId })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Extend subscription
       */
      async extend(id, data) {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.extend(id), {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription status for current user
       * Returns computed subscription status with single source of truth
       */
      async getCurrentUserSubscriptionStatus() {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.status);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription status by merchant ID
       */
      async getSubscriptionStatus(merchantId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.status}?merchantId=${merchantId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscriptions by merchant
       */
      async getSubscriptionsByMerchant(merchantId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.list}?merchantId=${merchantId}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription statistics
       */
      async getSubscriptionStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.subscriptions.stats);
        return await exports.parseApiResponse(response);
      },
      /**
       * Pause/Suspend subscription
       */
      async suspend(id, data = {}) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.get(id)}/pause`, {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Resume subscription
       */
      async resume(id, data = {}) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.get(id)}/resume`, {
          method: "POST",
          body: JSON.stringify(data)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription activities
       */
      async getActivities(id, limit = 20) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.get(id)}/activities?limit=${limit}`);
        return await exports.parseApiResponse(response);
      },
      /**
       * Get subscription payments
       */
      async getPayments(id, limit = 20) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.subscriptions.get(id)}/payments?limit=${limit}`);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/system.ts
exports.systemApi = void 0;
var init_system = __esm({
  "src/api/system.ts"() {
    init_core();
    init_api();
    exports.systemApi = {
      /**
       * Get all backups
       */
      async getBackups() {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.backup || "/api/system/backup");
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a new backup
       */
      async createBackup(type = "full") {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.backup || "/api/system/backup", {
          method: "POST",
          body: JSON.stringify({ type })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Download a backup
       */
      async downloadBackup(backupId) {
        return await exports.authenticatedFetch(`${exports.apiUrls.system?.backup || "/api/system/backup"}/${backupId}/download`);
      },
      /**
       * Delete a backup
       */
      async deleteBackup(backupId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.system?.backup || "/api/system/backup"}/${backupId}`, {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get backup schedules
       */
      async getBackupSchedules() {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.backupSchedule || "/api/system/backup/schedule");
        return await exports.parseApiResponse(response);
      },
      /**
       * Create a backup schedule
       */
      async createBackupSchedule(schedule) {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.backupSchedule || "/api/system/backup/schedule", {
          method: "POST",
          body: JSON.stringify(schedule)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Update a backup schedule
       */
      async updateBackupSchedule(scheduleId, schedule) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.system?.backupSchedule || "/api/system/backup/schedule"}/${scheduleId}`, {
          method: "PUT",
          body: JSON.stringify(schedule)
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Delete a backup schedule
       */
      async deleteBackupSchedule(scheduleId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.system?.backupSchedule || "/api/system/backup/schedule"}/${scheduleId}`, {
          method: "DELETE"
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Verify a backup
       */
      async verifyBackup(backupId) {
        const response = await exports.authenticatedFetch(`${exports.apiUrls.system?.backupVerify || "/api/system/backup/verify"}`, {
          method: "POST",
          body: JSON.stringify({ backupId })
        });
        return await exports.parseApiResponse(response);
      },
      /**
       * Get system statistics
       */
      async getSystemStats() {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.stats || "/api/system/stats");
        return await exports.parseApiResponse(response);
      },
      /**
       * Get system health status
       */
      async getSystemHealth() {
        const response = await exports.authenticatedFetch(exports.apiUrls.system?.health || "/api/system/health");
        return await exports.parseApiResponse(response);
      },
      /**
       * Get system logs
       */
      async getSystemLogs(page = 1, limit = 50, level) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        });
        if (level)
          params.append("level", level);
        const response = await exports.authenticatedFetch(`${exports.apiUrls.system?.logs || "/api/system/logs"}?${params.toString()}`);
        return await exports.parseApiResponse(response);
      }
    };
  }
});

// src/api/calendar.ts
exports.calendarApi = void 0;
var init_calendar = __esm({
  "src/api/calendar.ts"() {
    init_core();
    init_api();
    exports.calendarApi = {
      /**
       * Get calendar orders for a specific month
       * 
       * @param query - Calendar query parameters
       * @returns Promise with calendar data grouped by date
       */
      async getCalendarOrders(query) {
        const searchParams = new URLSearchParams({
          month: query.month.toString(),
          year: query.year.toString(),
          ...query.outletId && { outletId: query.outletId.toString() },
          ...query.limit && { limit: query.limit.toString() }
        });
        const response = await exports.authenticatedFetch(`${exports.apiUrls.calendar.orders}?${searchParams}`);
        const result = await exports.parseApiResponse(response);
        if (result.success && result.data) {
          return result.data;
        }
        return {
          success: result.success,
          data: {},
          meta: {
            month: query.month,
            year: query.year,
            totalDays: 30,
            stats: { totalPickups: 0, totalOrders: 0 },
            dateRange: { start: "", end: "" }
          },
          message: result.message || "Calendar data loaded"
        };
      },
      /**
       * Get calendar orders for current month
       */
      async getCurrentMonthOrders(outletId) {
        const now = /* @__PURE__ */ new Date();
        return this.getCalendarOrders({
          month: now.getMonth() + 1,
          // JavaScript months are 0-based
          year: now.getFullYear(),
          outletId,
          limit: 4
        });
      },
      /**
       * Get calendar orders for next month
       */
      async getNextMonthOrders(outletId) {
        const now = /* @__PURE__ */ new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return this.getCalendarOrders({
          month: nextMonth.getMonth() + 1,
          year: nextMonth.getFullYear(),
          outletId,
          limit: 4
        });
      },
      /**
       * Get calendar orders for previous month
       */
      async getPreviousMonthOrders(outletId) {
        const now = /* @__PURE__ */ new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return this.getCalendarOrders({
          month: prevMonth.getMonth() + 1,
          year: prevMonth.getFullYear(),
          outletId,
          limit: 4
        });
      }
    };
  }
});

// src/api/upload.ts
function validateImage(file, options = {}) {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES
  } = options;
  const warnings = [];
  let error;
  if (!allowedTypes.includes(file.type)) {
    error = `Invalid file type "${file.type}". Allowed types: ${allowedTypes.join(", ")}`;
    return { isValid: false, error };
  }
  if (file.size > maxFileSize) {
    error = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`;
    return { isValid: false, error };
  }
  if (file.size < MIN_FILE_SIZE) {
    error = "File size is too small. The file may be corrupted or empty.";
    return { isValid: false, error };
  }
  if (file.size > WARNING_SIZE_THRESHOLD) {
    warnings.push(`Large file size (${(file.size / 1024 / 1024).toFixed(2)}MB) may slow down page loading. Consider compressing the image.`);
  }
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : void 0
  };
}
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
async function resizeImage(file, maxWidth = 1200, maxHeight = 900, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
function uploadWithProgress(url, formData, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round(e.loaded / e.total * 100),
          stage: "uploading"
        });
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (onProgress) {
            onProgress({
              loaded: 100,
              total: 100,
              percentage: 100,
              stage: "complete"
            });
          }
          resolve(result);
        } catch (error) {
          reject(new Error("Invalid response from server"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });
    xhr.addEventListener("error", () => {
      reject(new Error("Network error occurred"));
    });
    xhr.addEventListener("timeout", () => {
      reject(new Error("Upload timeout"));
    });
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 6e4;
    if (onProgress) {
      onProgress({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: "preparing"
      });
    }
    xhr.send(formData);
  });
}
async function uploadImage(file, token, options = {}) {
  const {
    onProgress,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    folder = "rentalshop/products",
    useBase64Fallback = true,
    quality = 0.85,
    maxWidth,
    maxHeight
  } = options;
  try {
    if (onProgress) {
      onProgress({ loaded: 0, total: 100, percentage: 0, stage: "preparing" });
    }
    const validation = validateImage(file, { maxFileSize, allowedTypes });
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || "Image validation failed"
      };
    }
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn("Image upload warnings:", validation.warnings);
    }
    let fileToUpload = file;
    if (maxWidth && maxHeight) {
      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
          console.log(`Resizing image from ${dimensions.width}x${dimensions.height} to fit ${maxWidth}x${maxHeight}`);
          fileToUpload = await resizeImage(file, maxWidth, maxHeight, quality);
          console.log(`Image resized. Size reduced from ${(file.size / 1024).toFixed(2)}KB to ${(fileToUpload.size / 1024).toFixed(2)}KB`);
        }
      } catch (resizeError) {
        console.warn("Client-side resize failed, uploading original:", resizeError);
      }
    }
    const formData = new FormData();
    formData.append("image", fileToUpload);
    formData.append("folder", folder);
    formData.append("useBase64", useBase64Fallback.toString());
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    const uploadUrl = `${apiUrl}/api/upload/image`;
    const result = await uploadWithProgress(uploadUrl, formData, token, onProgress);
    return result;
  } catch (error) {
    console.error("Upload error:", error);
    if (useBase64Fallback) {
      try {
        console.log("Upload failed, attempting base64 fallback...");
        const base64 = await fileToBase64(file);
        return {
          success: true,
          data: {
            url: base64,
            publicId: `base64-${Date.now()}`,
            width: 0,
            height: 0,
            format: file.type.split("/")[1] || "unknown",
            size: file.size,
            uploadMethod: "base64"
          },
          message: "Image uploaded using base64 fallback"
        };
      } catch (base64Error) {
        console.error("Base64 fallback failed:", base64Error);
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    };
  }
}
async function uploadImages(files, token, options = {}, onFileProgress) {
  const uploadPromises = files.map((file, index) => {
    const fileOptions = {
      ...options,
      onProgress: onFileProgress ? (progress) => onFileProgress(index, progress) : void 0
    };
    return uploadImage(file, token, fileOptions);
  });
  return Promise.all(uploadPromises);
}
function createUploadController() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort()
  };
}
var DEFAULT_MAX_FILE_SIZE, DEFAULT_ALLOWED_TYPES, WARNING_SIZE_THRESHOLD, MIN_FILE_SIZE;
var init_upload = __esm({
  "src/api/upload.ts"() {
    DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
    DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    WARNING_SIZE_THRESHOLD = 2 * 1024 * 1024;
    MIN_FILE_SIZE = 100;
  }
});

// src/api/index.ts
var init_api2 = __esm({
  "src/api/index.ts"() {
    init_auth();
    init_products();
    init_customers();
    init_orders();
    init_outlets();
    init_merchants();
    init_analytics();
    init_categories();
    init_notifications();
    init_profile();
    init_users();
    init_plans();
    init_billing_cycles();
    init_payments();
    init_audit_logs();
    init_settings();
    init_subscriptions();
    init_system();
    init_calendar();
    init_upload();
  }
});

// src/config/database.ts
function getDatabaseConfig() {
  const nodeEnv = process.env.NODE_ENV || "local";
  switch (nodeEnv) {
    case "local":
      return {
        url: process.env.DATABASE_URL_LOCAL || "file:./dev.db",
        provider: "sqlite"
      };
    case "development":
      return {
        url: process.env.DATABASE_URL || "",
        provider: "postgresql"
      };
    case "production":
      return {
        url: process.env.DATABASE_URL || "",
        provider: "postgresql"
      };
    default:
      return {
        url: process.env.DATABASE_URL_LOCAL || "file:./dev.db",
        provider: "sqlite"
      };
  }
}
function isLocalEnvironment() {
  const nodeEnv = process.env.NODE_ENV;
  return !nodeEnv || nodeEnv === "development";
}
function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === "development";
}
function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}
exports.databaseConfig = void 0;
var init_database = __esm({
  "src/config/database.ts"() {
    exports.databaseConfig = getDatabaseConfig();
  }
});

// src/config/environment.ts
exports.getClientUrl = void 0; exports.getAdminUrl = void 0; exports.getMobileUrl = void 0; exports.getEnvironmentUrls = void 0; exports.isBrowser = void 0; exports.isServer = void 0; exports.isDev = void 0; exports.isProd = void 0; exports.isTest = void 0;
var init_environment = __esm({
  "src/config/environment.ts"() {
    exports.getClientUrl = () => {
      if (process.env.NODE_ENV === "production") {
        return process.env.CLIENT_URL_PROD || process.env.NEXT_PUBLIC_CLIENT_URL || "https://rentalshop.com";
      }
      if (process.env.NODE_ENV === "development") {
        return process.env.CLIENT_URL_DEV || process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";
      }
      return process.env.CLIENT_URL_LOCAL || process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";
    };
    exports.getAdminUrl = () => {
      if (process.env.NODE_ENV === "production") {
        return process.env.ADMIN_URL_PROD || process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.rentalshop.com";
      }
      if (process.env.NODE_ENV === "development") {
        return process.env.ADMIN_URL_DEV || process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
      }
      return process.env.ADMIN_URL_LOCAL || process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
    };
    exports.getMobileUrl = () => {
      if (process.env.NODE_ENV === "production") {
        return process.env.MOBILE_URL_PROD || process.env.NEXT_PUBLIC_MOBILE_URL || "https://mobile.rentalshop.com";
      }
      if (process.env.NODE_ENV === "development") {
        return process.env.MOBILE_URL_DEV || process.env.NEXT_PUBLIC_MOBILE_URL || "http://localhost:3003";
      }
      return process.env.MOBILE_URL_LOCAL || process.env.NEXT_PUBLIC_MOBILE_URL || "http://localhost:3003";
    };
    exports.getEnvironmentUrls = () => ({
      client: exports.getClientUrl(),
      admin: exports.getAdminUrl(),
      mobile: exports.getMobileUrl()
    });
    exports.isBrowser = () => {
      return typeof window !== "undefined";
    };
    exports.isServer = () => {
      return typeof window === "undefined";
    };
    exports.isDev = () => {
      return process.env.NODE_ENV === "development";
    };
    exports.isProd = () => {
      return process.env.NODE_ENV === "production";
    };
    exports.isTest = () => {
      return process.env.NODE_ENV === "test";
    };
  }
});

// src/config/index.ts
var init_config = __esm({
  "src/config/index.ts"() {
    init_api();
    init_database();
    init_environment();
  }
});

// src/performance.ts
exports.PerformanceMonitor = void 0; exports.DatabaseMonitor = void 0; exports.MemoryMonitor = void 0; exports.APIMonitor = void 0;
var init_performance = __esm({
  "src/performance.ts"() {
    exports.PerformanceMonitor = class {
      // Keep last 1000 metrics
      /**
       * Measure query performance with automatic logging
       */
      static async measureQuery(name, query, recordCount) {
        const start = Date.now();
        const timestamp = /* @__PURE__ */ new Date();
        try {
          const result = await query();
          const duration = Date.now() - start;
          const metric = {
            queryName: name,
            duration,
            timestamp,
            slowQuery: duration > this.slowQueryThreshold,
            recordCount
          };
          this.logMetric(metric);
          return result;
        } catch (error) {
          const duration = Date.now() - start;
          const metric = {
            queryName: name,
            duration,
            timestamp,
            slowQuery: true,
            recordCount,
            error: error instanceof Error ? error.message : String(error)
          };
          this.logMetric(metric);
          throw error;
        }
      }
      /**
       * Log performance metric
       */
      static logMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
          this.metrics = this.metrics.slice(-this.maxMetrics);
        }
        const logLevel = metric.slowQuery ? "warn" : "log";
        const message = metric.error ? `[PERF ERROR] ${metric.queryName}: ${metric.duration}ms - ${metric.error}` : `[PERF] ${metric.queryName}: ${metric.duration}ms${metric.recordCount ? ` (${metric.recordCount} records)` : ""}`;
        console[logLevel](message);
        if (metric.duration > 5e3) {
          console.error(`[CRITICAL SLOW QUERY] ${metric.queryName}: ${metric.duration}ms`);
        }
      }
      /**
       * Get performance statistics
       */
      static getStats(queryName) {
        const metrics = queryName ? this.metrics.filter((m) => m.queryName === queryName) : this.metrics;
        const slowQueries = metrics.filter((m) => m.slowQuery);
        const averageDuration = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0;
        const slowestQuery = metrics.length > 0 ? metrics.reduce((prev, current) => prev.duration > current.duration ? prev : current) : null;
        const recentSlowQueries = slowQueries.slice(-10);
        return {
          totalQueries: metrics.length,
          slowQueries: slowQueries.length,
          averageDuration: Math.round(averageDuration),
          slowestQuery,
          recentSlowQueries
        };
      }
      /**
       * Get slow queries for analysis
       */
      static getSlowQueries(threshold) {
        const limit = threshold || this.slowQueryThreshold;
        return this.metrics.filter((m) => m.duration > limit);
      }
      /**
       * Clear performance metrics
       */
      static clearMetrics() {
        this.metrics = [];
      }
      /**
       * Export metrics for analysis
       */
      static exportMetrics() {
        return [...this.metrics];
      }
      /**
       * Set slow query threshold
       */
      static setSlowQueryThreshold(threshold) {
        this.slowQueryThreshold = threshold;
      }
    };
    exports.PerformanceMonitor.metrics = [];
    exports.PerformanceMonitor.slowQueryThreshold = 1e3;
    // 1 second
    exports.PerformanceMonitor.maxMetrics = 1e3;
    exports.DatabaseMonitor = class {
      /**
       * Track database connection
       */
      static trackConnection() {
        this.connectionCount++;
        console.log(`[DB] Connection opened. Total: ${this.connectionCount}`);
      }
      /**
       * Track query start
       */
      static trackQueryStart(queryName) {
        this.activeQueries++;
        console.log(`[DB] Query started: ${queryName}. Active: ${this.activeQueries}`);
      }
      /**
       * Track query end
       */
      static trackQueryEnd(queryName) {
        this.activeQueries = Math.max(0, this.activeQueries - 1);
        console.log(`[DB] Query ended: ${queryName}. Active: ${this.activeQueries}`);
      }
      /**
       * Get database stats
       */
      static getStats() {
        return {
          connectionCount: this.connectionCount,
          activeQueries: this.activeQueries
        };
      }
    };
    exports.DatabaseMonitor.connectionCount = 0;
    exports.DatabaseMonitor.activeQueries = 0;
    exports.MemoryMonitor = class {
      /**
       * Get current memory usage
       */
      static getMemoryUsage() {
        const usage = process.memoryUsage();
        const used = usage.heapUsed;
        const total = usage.heapTotal;
        const percentage = used / total * 100;
        return {
          used: Math.round(used / 1024 / 1024),
          // MB
          total: Math.round(total / 1024 / 1024),
          // MB
          percentage: Math.round(percentage)
        };
      }
      /**
       * Log memory usage
       */
      static logMemoryUsage(context) {
        const memory = this.getMemoryUsage();
        const contextStr = context ? `[${context}] ` : "";
        console.log(`${contextStr}Memory: ${memory.used}MB / ${memory.total}MB (${memory.percentage}%)`);
      }
      /**
       * Check if memory usage is high
       */
      static isHighMemoryUsage(threshold = 80) {
        const memory = this.getMemoryUsage();
        return memory.percentage > threshold;
      }
    };
    exports.APIMonitor = class {
      /**
       * Measure API endpoint performance
       */
      static async measureEndpoint(method, path, handler) {
        const start = Date.now();
        try {
          const result = await handler();
          const duration = Date.now() - start;
          console.log(`[API] ${method} ${path}: ${duration}ms`);
          if (duration > 3e3) {
            console.warn(`[SLOW API] ${method} ${path}: ${duration}ms`);
          }
          return result;
        } catch (error) {
          const duration = Date.now() - start;
          console.error(`[API ERROR] ${method} ${path}: ${duration}ms - ${error}`);
          throw error;
        }
      }
    };
  }
});

// src/index.ts
var init_src2 = __esm({
  "src/index.ts"() {
    init_api2();
    init_upload();
    init_config();
    init_core();
    init_errors();
    init_performance();
  }
});
init_src2();

exports.assertPlanLimit = assertPlanLimit;
exports.calculateProration = calculateProration;
exports.compareOrderNumberFormats = compareOrderNumberFormats;
exports.convertCurrency = convertCurrency;
exports.createAuditHelper = createAuditHelper;
exports.createErrorResponse = createErrorResponse;
exports.createPaymentGatewayManager = createPaymentGatewayManager;
exports.createSuccessResponse = createSuccessResponse;
exports.createUploadController = createUploadController;
exports.exportAuditLogs = exportAuditLogs;
exports.fileToBase64 = fileToBase64;
exports.formatCurrency = formatCurrency;
exports.formatCurrencyAdvanced = formatCurrencyAdvanced;
exports.formatProration = formatProration;
exports.getAuditConfig = getAuditConfig;
exports.getAuditEntityConfig = getAuditEntityConfig;
exports.getAuditLogStats = getAuditLogStats;
exports.getAuditLogs = getAuditLogs;
exports.getCurrency = getCurrency;
exports.getCurrencyDisplay = getCurrencyDisplay;
exports.getCurrentCurrency = getCurrentCurrency;
exports.getCurrentEntityCounts = getCurrentEntityCounts;
exports.getDatabaseConfig = getDatabaseConfig;
exports.getExchangeRate = getExchangeRate;
exports.getFormatRecommendations = getFormatRecommendations;
exports.getImageDimensions = getImageDimensions;
exports.getOutletStats = getOutletStats;
exports.getPlanLimitsInfo = getPlanLimitsInfo;
exports.handleApiError = handleApiError;
exports.handleBusinessError = handleBusinessError;
exports.handlePrismaError = handlePrismaError;
exports.handleValidationError = handleValidationError;
exports.isDevelopmentEnvironment = isDevelopmentEnvironment;
exports.isErrorResponse = isErrorResponse;
exports.isLocalEnvironment = isLocalEnvironment;
exports.isProductionEnvironment = isProductionEnvironment;
exports.isSuccessResponse = isSuccessResponse;
exports.isValidCurrencyCode = isValidCurrencyCode;
exports.migrateOrderNumbers = migrateOrderNumbers;
exports.parseCurrency = parseCurrency;
exports.quickAuditLog = quickAuditLog;
exports.resizeImage = resizeImage;
exports.sanitizeFieldValue = sanitizeFieldValue;
exports.shouldApplyProration = shouldApplyProration;
exports.shouldLogEntity = shouldLogEntity;
exports.shouldLogField = shouldLogField;
exports.shouldSample = shouldSample;
exports.uploadImage = uploadImage;
exports.uploadImages = uploadImages;
exports.validateImage = validateImage;
exports.validateOrderNumberFormat = validateOrderNumberFormat;
exports.validatePlanLimits = validatePlanLimits;
exports.validatePlatformAccess = validatePlatformAccess;
exports.validateProductPublicCheckAccess = validateProductPublicCheckAccess;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map