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
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

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
  const railwayEnv = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME;
  if (railwayEnv === "development") {
    return "development";
  }
  if (railwayEnv === "production") {
    return "production";
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("dev-client-development")) {
    return "development";
  }
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  return "local";
}
function getApiBaseUrlInternal() {
  const env = getEnvironment();
  console.log("\u{1F50D} Environment Detection:", {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    APP_ENV: process.env.APP_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
    detectedEnv: env,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  });
  switch (env) {
    case "local":
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    case "development":
      return process.env.NEXT_PUBLIC_API_URL || "https://dev-apis-development.up.railway.app";
    case "production":
      return process.env.NEXT_PUBLIC_API_URL || "https://apis-development.up.railway.app";
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
          client: process.env.CLIENT_URL || "https://client-production-d10a.up.railway.app",
          admin: process.env.ADMIN_URL || "https://admin-production-89d0.up.railway.app",
          api: process.env.API_URL || "https://apis-production-b698.up.railway.app",
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

// ../../node_modules/@prisma/client/runtime/library.js
var require_library = __commonJS({
  "../../node_modules/@prisma/client/runtime/library.js"(exports, module) {
    var yu = Object.create;
    var jt = Object.defineProperty;
    var bu = Object.getOwnPropertyDescriptor;
    var Eu = Object.getOwnPropertyNames;
    var wu = Object.getPrototypeOf;
    var xu = Object.prototype.hasOwnProperty;
    var Do = (e, r) => () => (e && (r = e(e = 0)), r);
    var ue = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports);
    var tr = (e, r) => {
      for (var t in r)
        jt(e, t, { get: r[t], enumerable: true });
    };
    var Oo = (e, r, t, n) => {
      if (r && typeof r == "object" || typeof r == "function")
        for (let i of Eu(r))
          !xu.call(e, i) && i !== t && jt(e, i, { get: () => r[i], enumerable: !(n = bu(r, i)) || n.enumerable });
      return e;
    };
    var O = (e, r, t) => (t = e != null ? yu(wu(e)) : {}, Oo(r || !e || !e.__esModule ? jt(t, "default", { value: e, enumerable: true }) : t, e));
    var vu = (e) => Oo(jt({}, "__esModule", { value: true }), e);
    var hi = ue((_g, is) => {
      is.exports = (e, r = process.argv) => {
        let t = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", n = r.indexOf(t + e), i = r.indexOf("--");
        return n !== -1 && (i === -1 || n < i);
      };
    });
    var as = ue((Ng, ss) => {
      var Fc = __require("os"), os = __require("tty"), de = hi(), { env: G } = process, Qe;
      de("no-color") || de("no-colors") || de("color=false") || de("color=never") ? Qe = 0 : (de("color") || de("colors") || de("color=true") || de("color=always")) && (Qe = 1);
      "FORCE_COLOR" in G && (G.FORCE_COLOR === "true" ? Qe = 1 : G.FORCE_COLOR === "false" ? Qe = 0 : Qe = G.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(G.FORCE_COLOR, 10), 3));
      function yi(e) {
        return e === 0 ? false : { level: e, hasBasic: true, has256: e >= 2, has16m: e >= 3 };
      }
      function bi(e, r) {
        if (Qe === 0)
          return 0;
        if (de("color=16m") || de("color=full") || de("color=truecolor"))
          return 3;
        if (de("color=256"))
          return 2;
        if (e && !r && Qe === void 0)
          return 0;
        let t = Qe || 0;
        if (G.TERM === "dumb")
          return t;
        if (process.platform === "win32") {
          let n = Fc.release().split(".");
          return Number(n[0]) >= 10 && Number(n[2]) >= 10586 ? Number(n[2]) >= 14931 ? 3 : 2 : 1;
        }
        if ("CI" in G)
          return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((n) => n in G) || G.CI_NAME === "codeship" ? 1 : t;
        if ("TEAMCITY_VERSION" in G)
          return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(G.TEAMCITY_VERSION) ? 1 : 0;
        if (G.COLORTERM === "truecolor")
          return 3;
        if ("TERM_PROGRAM" in G) {
          let n = parseInt((G.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
          switch (G.TERM_PROGRAM) {
            case "iTerm.app":
              return n >= 3 ? 3 : 2;
            case "Apple_Terminal":
              return 2;
          }
        }
        return /-256(color)?$/i.test(G.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(G.TERM) || "COLORTERM" in G ? 1 : t;
      }
      function Mc(e) {
        let r = bi(e, e && e.isTTY);
        return yi(r);
      }
      ss.exports = { supportsColor: Mc, stdout: yi(bi(true, os.isatty(1))), stderr: yi(bi(true, os.isatty(2))) };
    });
    var cs = ue((Lg, us) => {
      var $c = as(), br = hi();
      function ls(e) {
        if (/^\d{3,4}$/.test(e)) {
          let t = /(\d{1,2})(\d{2})/.exec(e) || [];
          return { major: 0, minor: parseInt(t[1], 10), patch: parseInt(t[2], 10) };
        }
        let r = (e || "").split(".").map((t) => parseInt(t, 10));
        return { major: r[0], minor: r[1], patch: r[2] };
      }
      function Ei(e) {
        let { CI: r, FORCE_HYPERLINK: t, NETLIFY: n, TEAMCITY_VERSION: i, TERM_PROGRAM: o, TERM_PROGRAM_VERSION: s, VTE_VERSION: a, TERM: l } = process.env;
        if (t)
          return !(t.length > 0 && parseInt(t, 10) === 0);
        if (br("no-hyperlink") || br("no-hyperlinks") || br("hyperlink=false") || br("hyperlink=never"))
          return false;
        if (br("hyperlink=true") || br("hyperlink=always") || n)
          return true;
        if (!$c.supportsColor(e) || e && !e.isTTY)
          return false;
        if ("WT_SESSION" in process.env)
          return true;
        if (process.platform === "win32" || r || i)
          return false;
        if (o) {
          let u = ls(s || "");
          switch (o) {
            case "iTerm.app":
              return u.major === 3 ? u.minor >= 1 : u.major > 3;
            case "WezTerm":
              return u.major >= 20200620;
            case "vscode":
              return u.major > 1 || u.major === 1 && u.minor >= 72;
            case "ghostty":
              return true;
          }
        }
        if (a) {
          if (a === "0.50.0")
            return false;
          let u = ls(a);
          return u.major > 0 || u.minor >= 50;
        }
        switch (l) {
          case "alacritty":
            return true;
        }
        return false;
      }
      us.exports = { supportsHyperlink: Ei, stdout: Ei(process.stdout), stderr: Ei(process.stderr) };
    });
    var ps = ue((Kg, qc) => {
      qc.exports = { name: "@prisma/internals", version: "6.16.3", description: "This package is intended for Prisma's internal use", main: "dist/index.js", types: "dist/index.d.ts", repository: { type: "git", url: "https://github.com/prisma/prisma.git", directory: "packages/internals" }, homepage: "https://www.prisma.io", author: "Tim Suchanek <suchanek@prisma.io>", bugs: "https://github.com/prisma/prisma/issues", license: "Apache-2.0", scripts: { dev: "DEV=true tsx helpers/build.ts", build: "tsx helpers/build.ts", test: "dotenv -e ../../.db.env -- jest --silent", prepublishOnly: "pnpm run build" }, files: ["README.md", "dist", "!**/libquery_engine*", "!dist/get-generators/engines/*", "scripts"], devDependencies: { "@babel/helper-validator-identifier": "7.25.9", "@opentelemetry/api": "1.9.0", "@swc/core": "1.11.5", "@swc/jest": "0.2.37", "@types/babel__helper-validator-identifier": "7.15.2", "@types/jest": "29.5.14", "@types/node": "18.19.76", "@types/resolve": "1.20.6", archiver: "6.0.2", "checkpoint-client": "1.1.33", "cli-truncate": "4.0.0", dotenv: "16.5.0", empathic: "2.0.0", "escape-string-regexp": "5.0.0", execa: "5.1.1", "fast-glob": "3.3.3", "find-up": "7.0.0", "fp-ts": "2.16.9", "fs-extra": "11.3.0", "fs-jetpack": "5.1.0", "global-directory": "4.0.0", globby: "11.1.0", "identifier-regex": "1.0.0", "indent-string": "4.0.0", "is-windows": "1.0.2", "is-wsl": "3.1.0", jest: "29.7.0", "jest-junit": "16.0.0", kleur: "4.1.5", "mock-stdin": "1.0.0", "new-github-issue-url": "0.2.1", "node-fetch": "3.3.2", "npm-packlist": "5.1.3", open: "7.4.2", "p-map": "4.0.0", resolve: "1.22.10", "string-width": "7.2.0", "strip-indent": "4.0.0", "temp-dir": "2.0.0", tempy: "1.0.1", "terminal-link": "4.0.0", tmp: "0.2.3", "ts-pattern": "5.6.2", "ts-toolbelt": "9.6.0", typescript: "5.4.5", yarn: "1.22.22" }, dependencies: { "@prisma/config": "workspace:*", "@prisma/debug": "workspace:*", "@prisma/dmmf": "workspace:*", "@prisma/driver-adapter-utils": "workspace:*", "@prisma/engines": "workspace:*", "@prisma/fetch-engine": "workspace:*", "@prisma/generator": "workspace:*", "@prisma/generator-helper": "workspace:*", "@prisma/get-platform": "workspace:*", "@prisma/prisma-schema-wasm": "6.16.1-1.bb420e667c1820a8c05a38023385f6cc7ef8e83a", "@prisma/schema-engine-wasm": "6.16.1-1.bb420e667c1820a8c05a38023385f6cc7ef8e83a", "@prisma/schema-files-loader": "workspace:*", arg: "5.0.2", prompts: "2.4.2" }, peerDependencies: { typescript: ">=5.1.0" }, peerDependenciesMeta: { typescript: { optional: true } }, sideEffects: false };
    });
    var Ti = ue((gh, Qc) => {
      Qc.exports = { name: "@prisma/engines-version", version: "6.16.1-1.bb420e667c1820a8c05a38023385f6cc7ef8e83a", main: "index.js", types: "index.d.ts", license: "Apache-2.0", author: "Tim Suchanek <suchanek@prisma.io>", prisma: { enginesVersion: "bb420e667c1820a8c05a38023385f6cc7ef8e83a" }, repository: { type: "git", url: "https://github.com/prisma/engines-wrapper.git", directory: "packages/engines-version" }, devDependencies: { "@types/node": "18.19.76", typescript: "4.9.5" }, files: ["index.js", "index.d.ts"], scripts: { build: "tsc -d" } };
    });
    var on = ue((nn) => {
      Object.defineProperty(nn, "__esModule", { value: true });
      nn.enginesVersion = void 0;
      nn.enginesVersion = Ti().prisma.enginesVersion;
    });
    var hs = ue((Ih, gs) => {
      gs.exports = (e) => {
        let r = e.match(/^[ \t]*(?=\S)/gm);
        return r ? r.reduce((t, n) => Math.min(t, n.length), 1 / 0) : 0;
      };
    });
    var Di = ue((kh, Es) => {
      Es.exports = (e, r = 1, t) => {
        if (t = { indent: " ", includeEmptyLines: false, ...t }, typeof e != "string")
          throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof e}\``);
        if (typeof r != "number")
          throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof r}\``);
        if (typeof t.indent != "string")
          throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof t.indent}\``);
        if (r === 0)
          return e;
        let n = t.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
        return e.replace(n, t.indent.repeat(r));
      };
    });
    var vs = ue((jh, tp) => {
      tp.exports = { name: "dotenv", version: "16.5.0", description: "Loads environment variables from .env file", main: "lib/main.js", types: "lib/main.d.ts", exports: { ".": { types: "./lib/main.d.ts", require: "./lib/main.js", default: "./lib/main.js" }, "./config": "./config.js", "./config.js": "./config.js", "./lib/env-options": "./lib/env-options.js", "./lib/env-options.js": "./lib/env-options.js", "./lib/cli-options": "./lib/cli-options.js", "./lib/cli-options.js": "./lib/cli-options.js", "./package.json": "./package.json" }, scripts: { "dts-check": "tsc --project tests/types/tsconfig.json", lint: "standard", pretest: "npm run lint && npm run dts-check", test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000", "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=lcov", prerelease: "npm test", release: "standard-version" }, repository: { type: "git", url: "git://github.com/motdotla/dotenv.git" }, homepage: "https://github.com/motdotla/dotenv#readme", funding: "https://dotenvx.com", keywords: ["dotenv", "env", ".env", "environment", "variables", "config", "settings"], readmeFilename: "README.md", license: "BSD-2-Clause", devDependencies: { "@types/node": "^18.11.3", decache: "^4.6.2", sinon: "^14.0.1", standard: "^17.0.0", "standard-version": "^9.5.0", tap: "^19.2.0", typescript: "^4.8.4" }, engines: { node: ">=12" }, browser: { fs: false } };
    });
    var As = ue((Bh, _e5) => {
      var Fi = __require("fs"), Mi = __require("path"), np = __require("os"), ip = __require("crypto"), op = vs(), Ts = op.version, sp = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
      function ap(e) {
        let r = {}, t = e.toString();
        t = t.replace(/\r\n?/mg, `
`);
        let n;
        for (; (n = sp.exec(t)) != null; ) {
          let i = n[1], o = n[2] || "";
          o = o.trim();
          let s = o[0];
          o = o.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), s === '"' && (o = o.replace(/\\n/g, `
`), o = o.replace(/\\r/g, "\r")), r[i] = o;
        }
        return r;
      }
      function lp(e) {
        let r = Rs(e), t = B.configDotenv({ path: r });
        if (!t.parsed) {
          let s = new Error(`MISSING_DATA: Cannot parse ${r} for an unknown reason`);
          throw s.code = "MISSING_DATA", s;
        }
        let n = Ss(e).split(","), i = n.length, o;
        for (let s = 0; s < i; s++)
          try {
            let a = n[s].trim(), l = cp(t, a);
            o = B.decrypt(l.ciphertext, l.key);
            break;
          } catch (a) {
            if (s + 1 >= i)
              throw a;
          }
        return B.parse(o);
      }
      function up(e) {
        console.log(`[dotenv@${Ts}][WARN] ${e}`);
      }
      function ot(e) {
        console.log(`[dotenv@${Ts}][DEBUG] ${e}`);
      }
      function Ss(e) {
        return e && e.DOTENV_KEY && e.DOTENV_KEY.length > 0 ? e.DOTENV_KEY : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0 ? process.env.DOTENV_KEY : "";
      }
      function cp(e, r) {
        let t;
        try {
          t = new URL(r);
        } catch (a) {
          if (a.code === "ERR_INVALID_URL") {
            let l = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
            throw l.code = "INVALID_DOTENV_KEY", l;
          }
          throw a;
        }
        let n = t.password;
        if (!n) {
          let a = new Error("INVALID_DOTENV_KEY: Missing key part");
          throw a.code = "INVALID_DOTENV_KEY", a;
        }
        let i = t.searchParams.get("environment");
        if (!i) {
          let a = new Error("INVALID_DOTENV_KEY: Missing environment part");
          throw a.code = "INVALID_DOTENV_KEY", a;
        }
        let o = `DOTENV_VAULT_${i.toUpperCase()}`, s = e.parsed[o];
        if (!s) {
          let a = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${o} in your .env.vault file.`);
          throw a.code = "NOT_FOUND_DOTENV_ENVIRONMENT", a;
        }
        return { ciphertext: s, key: n };
      }
      function Rs(e) {
        let r = null;
        if (e && e.path && e.path.length > 0)
          if (Array.isArray(e.path))
            for (let t of e.path)
              Fi.existsSync(t) && (r = t.endsWith(".vault") ? t : `${t}.vault`);
          else
            r = e.path.endsWith(".vault") ? e.path : `${e.path}.vault`;
        else
          r = Mi.resolve(process.cwd(), ".env.vault");
        return Fi.existsSync(r) ? r : null;
      }
      function Ps(e) {
        return e[0] === "~" ? Mi.join(np.homedir(), e.slice(1)) : e;
      }
      function pp(e) {
        !!(e && e.debug) && ot("Loading env from encrypted .env.vault");
        let t = B._parseVault(e), n = process.env;
        return e && e.processEnv != null && (n = e.processEnv), B.populate(n, t, e), { parsed: t };
      }
      function dp(e) {
        let r = Mi.resolve(process.cwd(), ".env"), t = "utf8", n = !!(e && e.debug);
        e && e.encoding ? t = e.encoding : n && ot("No encoding is specified. UTF-8 is used by default");
        let i = [r];
        if (e && e.path)
          if (!Array.isArray(e.path))
            i = [Ps(e.path)];
          else {
            i = [];
            for (let l of e.path)
              i.push(Ps(l));
          }
        let o, s = {};
        for (let l of i)
          try {
            let u = B.parse(Fi.readFileSync(l, { encoding: t }));
            B.populate(s, u, e);
          } catch (u) {
            n && ot(`Failed to load ${l} ${u.message}`), o = u;
          }
        let a = process.env;
        return e && e.processEnv != null && (a = e.processEnv), B.populate(a, s, e), o ? { parsed: s, error: o } : { parsed: s };
      }
      function mp(e) {
        if (Ss(e).length === 0)
          return B.configDotenv(e);
        let r = Rs(e);
        return r ? B._configVault(e) : (up(`You set DOTENV_KEY but you are missing a .env.vault file at ${r}. Did you forget to build it?`), B.configDotenv(e));
      }
      function fp(e, r) {
        let t = Buffer.from(r.slice(-64), "hex"), n = Buffer.from(e, "base64"), i = n.subarray(0, 12), o = n.subarray(-16);
        n = n.subarray(12, -16);
        try {
          let s = ip.createDecipheriv("aes-256-gcm", t, i);
          return s.setAuthTag(o), `${s.update(n)}${s.final()}`;
        } catch (s) {
          let a = s instanceof RangeError, l = s.message === "Invalid key length", u = s.message === "Unsupported state or unable to authenticate data";
          if (a || l) {
            let c = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
            throw c.code = "INVALID_DOTENV_KEY", c;
          } else if (u) {
            let c = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
            throw c.code = "DECRYPTION_FAILED", c;
          } else
            throw s;
        }
      }
      function gp(e, r, t = {}) {
        let n = !!(t && t.debug), i = !!(t && t.override);
        if (typeof r != "object") {
          let o = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
          throw o.code = "OBJECT_REQUIRED", o;
        }
        for (let o of Object.keys(r))
          Object.prototype.hasOwnProperty.call(e, o) ? (i === true && (e[o] = r[o]), n && ot(i === true ? `"${o}" is already defined and WAS overwritten` : `"${o}" is already defined and was NOT overwritten`)) : e[o] = r[o];
      }
      var B = { configDotenv: dp, _configVault: pp, _parseVault: lp, config: mp, decrypt: fp, parse: ap, populate: gp };
      _e5.exports.configDotenv = B.configDotenv;
      _e5.exports._configVault = B._configVault;
      _e5.exports._parseVault = B._parseVault;
      _e5.exports.config = B.config;
      _e5.exports.decrypt = B.decrypt;
      _e5.exports.parse = B.parse;
      _e5.exports.populate = B.populate;
      _e5.exports = B;
    });
    var Os = ue((Kh, cn) => {
      cn.exports = (e = {}) => {
        let r;
        if (e.repoUrl)
          r = e.repoUrl;
        else if (e.user && e.repo)
          r = `https://github.com/${e.user}/${e.repo}`;
        else
          throw new Error("You need to specify either the `repoUrl` option or both the `user` and `repo` options");
        let t = new URL(`${r}/issues/new`), n = ["body", "title", "labels", "template", "milestone", "assignee", "projects"];
        for (let i of n) {
          let o = e[i];
          if (o !== void 0) {
            if (i === "labels" || i === "projects") {
              if (!Array.isArray(o))
                throw new TypeError(`The \`${i}\` option should be an array`);
              o = o.join(",");
            }
            t.searchParams.set(i, o);
          }
        }
        return t.toString();
      };
      cn.exports.default = cn.exports;
    });
    var Ki = ue((vb, ea) => {
      ea.exports = /* @__PURE__ */ function() {
        function e(r, t, n, i, o) {
          return r < t || n < t ? r > n ? n + 1 : r + 1 : i === o ? t : t + 1;
        }
        return function(r, t) {
          if (r === t)
            return 0;
          if (r.length > t.length) {
            var n = r;
            r = t, t = n;
          }
          for (var i = r.length, o = t.length; i > 0 && r.charCodeAt(i - 1) === t.charCodeAt(o - 1); )
            i--, o--;
          for (var s = 0; s < i && r.charCodeAt(s) === t.charCodeAt(s); )
            s++;
          if (i -= s, o -= s, i === 0 || o < 3)
            return o;
          var a = 0, l, u, c, p, d, f, h, g, I, T, S, b, D = [];
          for (l = 0; l < i; l++)
            D.push(l + 1), D.push(r.charCodeAt(s + l));
          for (var me = D.length - 1; a < o - 3; )
            for (I = t.charCodeAt(s + (u = a)), T = t.charCodeAt(s + (c = a + 1)), S = t.charCodeAt(s + (p = a + 2)), b = t.charCodeAt(s + (d = a + 3)), f = a += 4, l = 0; l < me; l += 2)
              h = D[l], g = D[l + 1], u = e(h, u, c, I, g), c = e(u, c, p, T, g), p = e(c, p, d, S, g), f = e(p, d, f, b, g), D[l] = f, d = p, p = c, c = u, u = h;
          for (; a < o; )
            for (I = t.charCodeAt(s + (u = a)), f = ++a, l = 0; l < me; l += 2)
              h = D[l], D[l] = f = e(h, u, f, I, D[l + 1]), u = h;
          return f;
        };
      }();
    });
    var oa = Do(() => {
    });
    var sa = Do(() => {
    });
    var jf = {};
    tr(jf, { DMMF: () => ct, Debug: () => N, Decimal: () => Fe, Extensions: () => ni, MetricsClient: () => Lr, PrismaClientInitializationError: () => P, PrismaClientKnownRequestError: () => z2, PrismaClientRustPanicError: () => ae, PrismaClientUnknownRequestError: () => V, PrismaClientValidationError: () => Z, Public: () => ii, Sql: () => ie, createParam: () => va, defineDmmfProperty: () => Ca, deserializeJsonResponse: () => Vr, deserializeRawResult: () => Xn, dmmfToRuntimeDataModel: () => Ns, empty: () => Oa, getPrismaClient: () => fu, getRuntime: () => Kn, join: () => Da, makeStrictEnum: () => gu, makeTypedQueryFactory: () => Ia, objectEnumValues: () => On, raw: () => no, serializeJsonQuery: () => $n, skip: () => Mn, sqltag: () => io, warnEnvConflicts: () => hu, warnOnce: () => at });
    module.exports = vu(jf);
    var ni = {};
    tr(ni, { defineExtension: () => ko, getExtensionContext: () => _o });
    function ko(e) {
      return typeof e == "function" ? e : (r) => r.$extends(e);
    }
    function _o(e) {
      return e;
    }
    var ii = {};
    tr(ii, { validator: () => No });
    function No(...e) {
      return (r) => r;
    }
    var Bt = {};
    tr(Bt, { $: () => qo, bgBlack: () => ku, bgBlue: () => Fu, bgCyan: () => $u, bgGreen: () => Nu, bgMagenta: () => Mu, bgRed: () => _u, bgWhite: () => qu, bgYellow: () => Lu, black: () => Cu, blue: () => nr, bold: () => W, cyan: () => De, dim: () => Ce, gray: () => Hr, green: () => qe, grey: () => Ou, hidden: () => Ru, inverse: () => Su, italic: () => Tu, magenta: () => Iu, red: () => ce, reset: () => Pu, strikethrough: () => Au, underline: () => Y, white: () => Du, yellow: () => Ie });
    var oi;
    var Lo;
    var Fo;
    var Mo;
    var $o = true;
    typeof process < "u" && ({ FORCE_COLOR: oi, NODE_DISABLE_COLORS: Lo, NO_COLOR: Fo, TERM: Mo } = process.env || {}, $o = process.stdout && process.stdout.isTTY);
    var qo = { enabled: !Lo && Fo == null && Mo !== "dumb" && (oi != null && oi !== "0" || $o) };
    function F(e, r) {
      let t = new RegExp(`\\x1b\\[${r}m`, "g"), n = `\x1B[${e}m`, i = `\x1B[${r}m`;
      return function(o) {
        return !qo.enabled || o == null ? o : n + (~("" + o).indexOf(i) ? o.replace(t, i + n) : o) + i;
      };
    }
    var Pu = F(0, 0);
    var W = F(1, 22);
    var Ce = F(2, 22);
    var Tu = F(3, 23);
    var Y = F(4, 24);
    var Su = F(7, 27);
    var Ru = F(8, 28);
    var Au = F(9, 29);
    var Cu = F(30, 39);
    var ce = F(31, 39);
    var qe = F(32, 39);
    var Ie = F(33, 39);
    var nr = F(34, 39);
    var Iu = F(35, 39);
    var De = F(36, 39);
    var Du = F(37, 39);
    var Hr = F(90, 39);
    var Ou = F(90, 39);
    var ku = F(40, 49);
    var _u = F(41, 49);
    var Nu = F(42, 49);
    var Lu = F(43, 49);
    var Fu = F(44, 49);
    var Mu = F(45, 49);
    var $u = F(46, 49);
    var qu = F(47, 49);
    var Vu = 100;
    var Vo = ["green", "yellow", "blue", "magenta", "cyan", "red"];
    var Yr = [];
    var jo = Date.now();
    var ju = 0;
    var si = typeof process < "u" ? process.env : {};
    globalThis.DEBUG ?? (globalThis.DEBUG = si.DEBUG ?? "");
    globalThis.DEBUG_COLORS ?? (globalThis.DEBUG_COLORS = si.DEBUG_COLORS ? si.DEBUG_COLORS === "true" : true);
    var zr = { enable(e) {
      typeof e == "string" && (globalThis.DEBUG = e);
    }, disable() {
      let e = globalThis.DEBUG;
      return globalThis.DEBUG = "", e;
    }, enabled(e) {
      let r = globalThis.DEBUG.split(",").map((i) => i.replace(/[.+?^${}()|[\]\\]/g, "\\$&")), t = r.some((i) => i === "" || i[0] === "-" ? false : e.match(RegExp(i.split("*").join(".*") + "$"))), n = r.some((i) => i === "" || i[0] !== "-" ? false : e.match(RegExp(i.slice(1).split("*").join(".*") + "$")));
      return t && !n;
    }, log: (...e) => {
      let [r, t, ...n] = e;
      (console.warn ?? console.log)(`${r} ${t}`, ...n);
    }, formatters: {} };
    function Bu(e) {
      let r = { color: Vo[ju++ % Vo.length], enabled: zr.enabled(e), namespace: e, log: zr.log, extend: () => {
      } }, t = (...n) => {
        let { enabled: i, namespace: o, color: s, log: a } = r;
        if (n.length !== 0 && Yr.push([o, ...n]), Yr.length > Vu && Yr.shift(), zr.enabled(o) || i) {
          let l = n.map((c) => typeof c == "string" ? c : Uu(c)), u = `+${Date.now() - jo}ms`;
          jo = Date.now(), globalThis.DEBUG_COLORS ? a(Bt[s](W(o)), ...l, Bt[s](u)) : a(o, ...l, u);
        }
      };
      return new Proxy(t, { get: (n, i) => r[i], set: (n, i, o) => r[i] = o });
    }
    var N = new Proxy(Bu, { get: (e, r) => zr[r], set: (e, r, t) => zr[r] = t });
    function Uu(e, r = 2) {
      let t = /* @__PURE__ */ new Set();
      return JSON.stringify(e, (n, i) => {
        if (typeof i == "object" && i !== null) {
          if (t.has(i))
            return "[Circular *]";
          t.add(i);
        } else if (typeof i == "bigint")
          return i.toString();
        return i;
      }, r);
    }
    function Bo(e = 7500) {
      let r = Yr.map(([t, ...n]) => `${t} ${n.map((i) => typeof i == "string" ? i : JSON.stringify(i)).join(" ")}`).join(`
`);
      return r.length < e ? r : r.slice(-e);
    }
    function Uo() {
      Yr.length = 0;
    }
    var gr = N;
    var Go = O(__require("fs"));
    function ai() {
      let e = process.env.PRISMA_QUERY_ENGINE_LIBRARY;
      if (!(e && Go.default.existsSync(e)) && process.arch === "ia32")
        throw new Error('The default query engine type (Node-API, "library") is currently not supported for 32bit Node. Please set `engineType = "binary"` in the "generator" block of your "schema.prisma" file (or use the environment variables "PRISMA_CLIENT_ENGINE_TYPE=binary" and/or "PRISMA_CLI_QUERY_ENGINE_TYPE=binary".)');
    }
    var li = ["darwin", "darwin-arm64", "debian-openssl-1.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "rhel-openssl-1.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x", "linux-arm64-openssl-1.1.x", "linux-arm64-openssl-1.0.x", "linux-arm64-openssl-3.0.x", "linux-arm-openssl-1.1.x", "linux-arm-openssl-1.0.x", "linux-arm-openssl-3.0.x", "linux-musl", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-1.1.x", "linux-musl-arm64-openssl-3.0.x", "linux-nixos", "linux-static-x64", "linux-static-arm64", "windows", "freebsd11", "freebsd12", "freebsd13", "freebsd14", "freebsd15", "openbsd", "netbsd", "arm"];
    var Ut = "libquery_engine";
    function Gt(e, r) {
      return e.includes("windows") ? `query_engine-${e}.dll.node` : e.includes("darwin") ? `${Ut}-${e}.dylib.node` : `${Ut}-${e}.so.node`;
    }
    var Ko = O(__require("child_process"));
    var mi = O(__require("fs/promises"));
    var Ht = O(__require("os"));
    var Oe = Symbol.for("@ts-pattern/matcher");
    var Gu = Symbol.for("@ts-pattern/isVariadic");
    var Wt = "@ts-pattern/anonymous-select-key";
    var ui = (e) => !!(e && typeof e == "object");
    var Qt = (e) => e && !!e[Oe];
    var Ee = (e, r, t) => {
      if (Qt(e)) {
        let n = e[Oe](), { matched: i, selections: o } = n.match(r);
        return i && o && Object.keys(o).forEach((s) => t(s, o[s])), i;
      }
      if (ui(e)) {
        if (!ui(r))
          return false;
        if (Array.isArray(e)) {
          if (!Array.isArray(r))
            return false;
          let n = [], i = [], o = [];
          for (let s of e.keys()) {
            let a = e[s];
            Qt(a) && a[Gu] ? o.push(a) : o.length ? i.push(a) : n.push(a);
          }
          if (o.length) {
            if (o.length > 1)
              throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
            if (r.length < n.length + i.length)
              return false;
            let s = r.slice(0, n.length), a = i.length === 0 ? [] : r.slice(-i.length), l = r.slice(n.length, i.length === 0 ? 1 / 0 : -i.length);
            return n.every((u, c) => Ee(u, s[c], t)) && i.every((u, c) => Ee(u, a[c], t)) && (o.length === 0 || Ee(o[0], l, t));
          }
          return e.length === r.length && e.every((s, a) => Ee(s, r[a], t));
        }
        return Reflect.ownKeys(e).every((n) => {
          let i = e[n];
          return (n in r || Qt(o = i) && o[Oe]().matcherType === "optional") && Ee(i, r[n], t);
          var o;
        });
      }
      return Object.is(r, e);
    };
    var Ge = (e) => {
      var r, t, n;
      return ui(e) ? Qt(e) ? (r = (t = (n = e[Oe]()).getSelectionKeys) == null ? void 0 : t.call(n)) != null ? r : [] : Array.isArray(e) ? Zr(e, Ge) : Zr(Object.values(e), Ge) : [];
    };
    var Zr = (e, r) => e.reduce((t, n) => t.concat(r(n)), []);
    function pe(e) {
      return Object.assign(e, { optional: () => Qu(e), and: (r) => q(e, r), or: (r) => Wu(e, r), select: (r) => r === void 0 ? Qo(e) : Qo(r, e) });
    }
    function Qu(e) {
      return pe({ [Oe]: () => ({ match: (r) => {
        let t = {}, n = (i, o) => {
          t[i] = o;
        };
        return r === void 0 ? (Ge(e).forEach((i) => n(i, void 0)), { matched: true, selections: t }) : { matched: Ee(e, r, n), selections: t };
      }, getSelectionKeys: () => Ge(e), matcherType: "optional" }) });
    }
    function q(...e) {
      return pe({ [Oe]: () => ({ match: (r) => {
        let t = {}, n = (i, o) => {
          t[i] = o;
        };
        return { matched: e.every((i) => Ee(i, r, n)), selections: t };
      }, getSelectionKeys: () => Zr(e, Ge), matcherType: "and" }) });
    }
    function Wu(...e) {
      return pe({ [Oe]: () => ({ match: (r) => {
        let t = {}, n = (i, o) => {
          t[i] = o;
        };
        return Zr(e, Ge).forEach((i) => n(i, void 0)), { matched: e.some((i) => Ee(i, r, n)), selections: t };
      }, getSelectionKeys: () => Zr(e, Ge), matcherType: "or" }) });
    }
    function A(e) {
      return { [Oe]: () => ({ match: (r) => ({ matched: !!e(r) }) }) };
    }
    function Qo(...e) {
      let r = typeof e[0] == "string" ? e[0] : void 0, t = e.length === 2 ? e[1] : typeof e[0] == "string" ? void 0 : e[0];
      return pe({ [Oe]: () => ({ match: (n) => {
        let i = { [r ?? Wt]: n };
        return { matched: t === void 0 || Ee(t, n, (o, s) => {
          i[o] = s;
        }), selections: i };
      }, getSelectionKeys: () => [r ?? Wt].concat(t === void 0 ? [] : Ge(t)) }) });
    }
    function ye(e) {
      return typeof e == "number";
    }
    function Ve(e) {
      return typeof e == "string";
    }
    function je(e) {
      return typeof e == "bigint";
    }
    pe(A(function(e) {
      return true;
    }));
    var Be = (e) => Object.assign(pe(e), { startsWith: (r) => {
      return Be(q(e, (t = r, A((n) => Ve(n) && n.startsWith(t)))));
      var t;
    }, endsWith: (r) => {
      return Be(q(e, (t = r, A((n) => Ve(n) && n.endsWith(t)))));
      var t;
    }, minLength: (r) => Be(q(e, ((t) => A((n) => Ve(n) && n.length >= t))(r))), length: (r) => Be(q(e, ((t) => A((n) => Ve(n) && n.length === t))(r))), maxLength: (r) => Be(q(e, ((t) => A((n) => Ve(n) && n.length <= t))(r))), includes: (r) => {
      return Be(q(e, (t = r, A((n) => Ve(n) && n.includes(t)))));
      var t;
    }, regex: (r) => {
      return Be(q(e, (t = r, A((n) => Ve(n) && !!n.match(t)))));
      var t;
    } });
    Be(A(Ve));
    var be = (e) => Object.assign(pe(e), { between: (r, t) => be(q(e, ((n, i) => A((o) => ye(o) && n <= o && i >= o))(r, t))), lt: (r) => be(q(e, ((t) => A((n) => ye(n) && n < t))(r))), gt: (r) => be(q(e, ((t) => A((n) => ye(n) && n > t))(r))), lte: (r) => be(q(e, ((t) => A((n) => ye(n) && n <= t))(r))), gte: (r) => be(q(e, ((t) => A((n) => ye(n) && n >= t))(r))), int: () => be(q(e, A((r) => ye(r) && Number.isInteger(r)))), finite: () => be(q(e, A((r) => ye(r) && Number.isFinite(r)))), positive: () => be(q(e, A((r) => ye(r) && r > 0))), negative: () => be(q(e, A((r) => ye(r) && r < 0))) });
    be(A(ye));
    var Ue = (e) => Object.assign(pe(e), { between: (r, t) => Ue(q(e, ((n, i) => A((o) => je(o) && n <= o && i >= o))(r, t))), lt: (r) => Ue(q(e, ((t) => A((n) => je(n) && n < t))(r))), gt: (r) => Ue(q(e, ((t) => A((n) => je(n) && n > t))(r))), lte: (r) => Ue(q(e, ((t) => A((n) => je(n) && n <= t))(r))), gte: (r) => Ue(q(e, ((t) => A((n) => je(n) && n >= t))(r))), positive: () => Ue(q(e, A((r) => je(r) && r > 0))), negative: () => Ue(q(e, A((r) => je(r) && r < 0))) });
    Ue(A(je));
    pe(A(function(e) {
      return typeof e == "boolean";
    }));
    pe(A(function(e) {
      return typeof e == "symbol";
    }));
    pe(A(function(e) {
      return e == null;
    }));
    pe(A(function(e) {
      return e != null;
    }));
    var ci = class extends Error {
      constructor(r) {
        let t;
        try {
          t = JSON.stringify(r);
        } catch {
          t = r;
        }
        super(`Pattern matching error: no pattern matches value ${t}`), this.input = void 0, this.input = r;
      }
    };
    var pi = { matched: false, value: void 0 };
    function hr(e) {
      return new di(e, pi);
    }
    var di = class e {
      constructor(r, t) {
        this.input = void 0, this.state = void 0, this.input = r, this.state = t;
      }
      with(...r) {
        if (this.state.matched)
          return this;
        let t = r[r.length - 1], n = [r[0]], i;
        r.length === 3 && typeof r[1] == "function" ? i = r[1] : r.length > 2 && n.push(...r.slice(1, r.length - 1));
        let o = false, s = {}, a = (u, c) => {
          o = true, s[u] = c;
        }, l = !n.some((u) => Ee(u, this.input, a)) || i && !i(this.input) ? pi : { matched: true, value: t(o ? Wt in s ? s[Wt] : s : this.input, this.input) };
        return new e(this.input, l);
      }
      when(r, t) {
        if (this.state.matched)
          return this;
        let n = !!r(this.input);
        return new e(this.input, n ? { matched: true, value: t(this.input, this.input) } : pi);
      }
      otherwise(r) {
        return this.state.matched ? this.state.value : r(this.input);
      }
      exhaustive() {
        if (this.state.matched)
          return this.state.value;
        throw new ci(this.input);
      }
      run() {
        return this.exhaustive();
      }
      returnType() {
        return this;
      }
    };
    var Ho = __require("util");
    var Ju = { warn: Ie("prisma:warn") };
    var Ku = { warn: () => !process.env.PRISMA_DISABLE_WARNINGS };
    function Jt(e, ...r) {
      Ku.warn() && console.warn(`${Ju.warn} ${e}`, ...r);
    }
    var Hu = (0, Ho.promisify)(Ko.default.exec);
    var ee = gr("prisma:get-platform");
    var Yu = ["1.0.x", "1.1.x", "3.0.x"];
    async function Yo() {
      let e = Ht.default.platform(), r = process.arch;
      if (e === "freebsd") {
        let s = await Yt("freebsd-version");
        if (s && s.trim().length > 0) {
          let l = /^(\d+)\.?/.exec(s);
          if (l)
            return { platform: "freebsd", targetDistro: `freebsd${l[1]}`, arch: r };
        }
      }
      if (e !== "linux")
        return { platform: e, arch: r };
      let t = await Zu(), n = await sc(), i = ec({ arch: r, archFromUname: n, familyDistro: t.familyDistro }), { libssl: o } = await rc(i);
      return { platform: "linux", libssl: o, arch: r, archFromUname: n, ...t };
    }
    function zu(e) {
      let r = /^ID="?([^"\n]*)"?$/im, t = /^ID_LIKE="?([^"\n]*)"?$/im, n = r.exec(e), i = n && n[1] && n[1].toLowerCase() || "", o = t.exec(e), s = o && o[1] && o[1].toLowerCase() || "", a = hr({ id: i, idLike: s }).with({ id: "alpine" }, ({ id: l }) => ({ targetDistro: "musl", familyDistro: l, originalDistro: l })).with({ id: "raspbian" }, ({ id: l }) => ({ targetDistro: "arm", familyDistro: "debian", originalDistro: l })).with({ id: "nixos" }, ({ id: l }) => ({ targetDistro: "nixos", originalDistro: l, familyDistro: "nixos" })).with({ id: "debian" }, { id: "ubuntu" }, ({ id: l }) => ({ targetDistro: "debian", familyDistro: "debian", originalDistro: l })).with({ id: "rhel" }, { id: "centos" }, { id: "fedora" }, ({ id: l }) => ({ targetDistro: "rhel", familyDistro: "rhel", originalDistro: l })).when(({ idLike: l }) => l.includes("debian") || l.includes("ubuntu"), ({ id: l }) => ({ targetDistro: "debian", familyDistro: "debian", originalDistro: l })).when(({ idLike: l }) => i === "arch" || l.includes("arch"), ({ id: l }) => ({ targetDistro: "debian", familyDistro: "arch", originalDistro: l })).when(({ idLike: l }) => l.includes("centos") || l.includes("fedora") || l.includes("rhel") || l.includes("suse"), ({ id: l }) => ({ targetDistro: "rhel", familyDistro: "rhel", originalDistro: l })).otherwise(({ id: l }) => ({ targetDistro: void 0, familyDistro: void 0, originalDistro: l }));
      return ee(`Found distro info:
${JSON.stringify(a, null, 2)}`), a;
    }
    async function Zu() {
      let e = "/etc/os-release";
      try {
        let r = await mi.default.readFile(e, { encoding: "utf-8" });
        return zu(r);
      } catch {
        return { targetDistro: void 0, familyDistro: void 0, originalDistro: void 0 };
      }
    }
    function Xu(e) {
      let r = /^OpenSSL\s(\d+\.\d+)\.\d+/.exec(e);
      if (r) {
        let t = `${r[1]}.x`;
        return zo(t);
      }
    }
    function Wo(e) {
      let r = /libssl\.so\.(\d)(\.\d)?/.exec(e);
      if (r) {
        let t = `${r[1]}${r[2] ?? ".0"}.x`;
        return zo(t);
      }
    }
    function zo(e) {
      let r = (() => {
        if (Xo(e))
          return e;
        let t = e.split(".");
        return t[1] = "0", t.join(".");
      })();
      if (Yu.includes(r))
        return r;
    }
    function ec(e) {
      return hr(e).with({ familyDistro: "musl" }, () => (ee('Trying platform-specific paths for "alpine"'), ["/lib", "/usr/lib"])).with({ familyDistro: "debian" }, ({ archFromUname: r }) => (ee('Trying platform-specific paths for "debian" (and "ubuntu")'), [`/usr/lib/${r}-linux-gnu`, `/lib/${r}-linux-gnu`])).with({ familyDistro: "rhel" }, () => (ee('Trying platform-specific paths for "rhel"'), ["/lib64", "/usr/lib64"])).otherwise(({ familyDistro: r, arch: t, archFromUname: n }) => (ee(`Don't know any platform-specific paths for "${r}" on ${t} (${n})`), []));
    }
    async function rc(e) {
      let r = 'grep -v "libssl.so.0"', t = await Jo(e);
      if (t) {
        ee(`Found libssl.so file using platform-specific paths: ${t}`);
        let o = Wo(t);
        if (ee(`The parsed libssl version is: ${o}`), o)
          return { libssl: o, strategy: "libssl-specific-path" };
      }
      ee('Falling back to "ldconfig" and other generic paths');
      let n = await Yt(`ldconfig -p | sed "s/.*=>s*//" | sed "s|.*/||" | grep libssl | sort | ${r}`);
      if (n || (n = await Jo(["/lib64", "/usr/lib64", "/lib", "/usr/lib"])), n) {
        ee(`Found libssl.so file using "ldconfig" or other generic paths: ${n}`);
        let o = Wo(n);
        if (ee(`The parsed libssl version is: ${o}`), o)
          return { libssl: o, strategy: "ldconfig" };
      }
      let i = await Yt("openssl version -v");
      if (i) {
        ee(`Found openssl binary with version: ${i}`);
        let o = Xu(i);
        if (ee(`The parsed openssl version is: ${o}`), o)
          return { libssl: o, strategy: "openssl-binary" };
      }
      return ee("Couldn't find any version of libssl or OpenSSL in the system"), {};
    }
    async function Jo(e) {
      for (let r of e) {
        let t = await tc(r);
        if (t)
          return t;
      }
    }
    async function tc(e) {
      try {
        return (await mi.default.readdir(e)).find((t) => t.startsWith("libssl.so.") && !t.startsWith("libssl.so.0"));
      } catch (r) {
        if (r.code === "ENOENT")
          return;
        throw r;
      }
    }
    async function ir() {
      let { binaryTarget: e } = await Zo();
      return e;
    }
    function nc(e) {
      return e.binaryTarget !== void 0;
    }
    async function fi() {
      let { memoized: e, ...r } = await Zo();
      return r;
    }
    var Kt = {};
    async function Zo() {
      if (nc(Kt))
        return Promise.resolve({ ...Kt, memoized: true });
      let e = await Yo(), r = ic(e);
      return Kt = { ...e, binaryTarget: r }, { ...Kt, memoized: false };
    }
    function ic(e) {
      let { platform: r, arch: t, archFromUname: n, libssl: i, targetDistro: o, familyDistro: s, originalDistro: a } = e;
      r === "linux" && !["x64", "arm64"].includes(t) && Jt(`Prisma only officially supports Linux on amd64 (x86_64) and arm64 (aarch64) system architectures (detected "${t}" instead). If you are using your own custom Prisma engines, you can ignore this warning, as long as you've compiled the engines for your system architecture "${n}".`);
      let l = "1.1.x";
      if (r === "linux" && i === void 0) {
        let c = hr({ familyDistro: s }).with({ familyDistro: "debian" }, () => "Please manually install OpenSSL via `apt-get update -y && apt-get install -y openssl` and try installing Prisma again. If you're running Prisma on Docker, add this command to your Dockerfile, or switch to an image that already has OpenSSL installed.").otherwise(() => "Please manually install OpenSSL and try installing Prisma again.");
        Jt(`Prisma failed to detect the libssl/openssl version to use, and may not work as expected. Defaulting to "openssl-${l}".
${c}`);
      }
      let u = "debian";
      if (r === "linux" && o === void 0 && ee(`Distro is "${a}". Falling back to Prisma engines built for "${u}".`), r === "darwin" && t === "arm64")
        return "darwin-arm64";
      if (r === "darwin")
        return "darwin";
      if (r === "win32")
        return "windows";
      if (r === "freebsd")
        return o;
      if (r === "openbsd")
        return "openbsd";
      if (r === "netbsd")
        return "netbsd";
      if (r === "linux" && o === "nixos")
        return "linux-nixos";
      if (r === "linux" && t === "arm64")
        return `${o === "musl" ? "linux-musl-arm64" : "linux-arm64"}-openssl-${i || l}`;
      if (r === "linux" && t === "arm")
        return `linux-arm-openssl-${i || l}`;
      if (r === "linux" && o === "musl") {
        let c = "linux-musl";
        return !i || Xo(i) ? c : `${c}-openssl-${i}`;
      }
      return r === "linux" && o && i ? `${o}-openssl-${i}` : (r !== "linux" && Jt(`Prisma detected unknown OS "${r}" and may not work as expected. Defaulting to "linux".`), i ? `${u}-openssl-${i}` : o ? `${o}-openssl-${l}` : `${u}-openssl-${l}`);
    }
    async function oc(e) {
      try {
        return await e();
      } catch {
        return;
      }
    }
    function Yt(e) {
      return oc(async () => {
        let r = await Hu(e);
        return ee(`Command "${e}" successfully returned "${r.stdout}"`), r.stdout;
      });
    }
    async function sc() {
      return typeof Ht.default.machine == "function" ? Ht.default.machine() : (await Yt("uname -m"))?.trim();
    }
    function Xo(e) {
      return e.startsWith("1.");
    }
    var Xt = {};
    tr(Xt, { beep: () => kc, clearScreen: () => Cc, clearTerminal: () => Ic, cursorBackward: () => mc, cursorDown: () => pc, cursorForward: () => dc, cursorGetPosition: () => hc, cursorHide: () => Ec, cursorLeft: () => ts, cursorMove: () => cc, cursorNextLine: () => yc, cursorPrevLine: () => bc, cursorRestorePosition: () => gc, cursorSavePosition: () => fc, cursorShow: () => wc, cursorTo: () => uc, cursorUp: () => rs, enterAlternativeScreen: () => Dc, eraseDown: () => Tc, eraseEndLine: () => vc, eraseLine: () => ns, eraseLines: () => xc, eraseScreen: () => gi, eraseStartLine: () => Pc, eraseUp: () => Sc, exitAlternativeScreen: () => Oc, iTerm: () => Lc, image: () => Nc, link: () => _c, scrollDown: () => Ac, scrollUp: () => Rc });
    var Zt = O(__require("process"), 1);
    var zt = globalThis.window?.document !== void 0;
    globalThis.process?.versions?.node !== void 0;
    globalThis.process?.versions?.bun !== void 0;
    globalThis.Deno?.version?.deno !== void 0;
    globalThis.process?.versions?.electron !== void 0;
    globalThis.navigator?.userAgent?.includes("jsdom") === true;
    typeof WorkerGlobalScope < "u" && globalThis instanceof WorkerGlobalScope;
    typeof DedicatedWorkerGlobalScope < "u" && globalThis instanceof DedicatedWorkerGlobalScope;
    typeof SharedWorkerGlobalScope < "u" && globalThis instanceof SharedWorkerGlobalScope;
    typeof ServiceWorkerGlobalScope < "u" && globalThis instanceof ServiceWorkerGlobalScope;
    var Xr = globalThis.navigator?.userAgentData?.platform;
    Xr === "macOS" || globalThis.navigator?.platform === "MacIntel" || globalThis.navigator?.userAgent?.includes(" Mac ") === true || globalThis.process?.platform === "darwin";
    Xr === "Windows" || globalThis.navigator?.platform === "Win32" || globalThis.process?.platform === "win32";
    Xr === "Linux" || globalThis.navigator?.platform?.startsWith("Linux") === true || globalThis.navigator?.userAgent?.includes(" Linux ") === true || globalThis.process?.platform === "linux";
    Xr === "Android" || globalThis.navigator?.platform === "Android" || globalThis.navigator?.userAgent?.includes(" Android ") === true || globalThis.process?.platform === "android";
    var C = "\x1B[";
    var rt = "\x1B]";
    var yr = "\x07";
    var et = ";";
    var es = !zt && Zt.default.env.TERM_PROGRAM === "Apple_Terminal";
    var ac = !zt && Zt.default.platform === "win32";
    var lc = zt ? () => {
      throw new Error("`process.cwd()` only works in Node.js, not the browser.");
    } : Zt.default.cwd;
    var uc = (e, r) => {
      if (typeof e != "number")
        throw new TypeError("The `x` argument is required");
      return typeof r != "number" ? C + (e + 1) + "G" : C + (r + 1) + et + (e + 1) + "H";
    };
    var cc = (e, r) => {
      if (typeof e != "number")
        throw new TypeError("The `x` argument is required");
      let t = "";
      return e < 0 ? t += C + -e + "D" : e > 0 && (t += C + e + "C"), r < 0 ? t += C + -r + "A" : r > 0 && (t += C + r + "B"), t;
    };
    var rs = (e = 1) => C + e + "A";
    var pc = (e = 1) => C + e + "B";
    var dc = (e = 1) => C + e + "C";
    var mc = (e = 1) => C + e + "D";
    var ts = C + "G";
    var fc = es ? "\x1B7" : C + "s";
    var gc = es ? "\x1B8" : C + "u";
    var hc = C + "6n";
    var yc = C + "E";
    var bc = C + "F";
    var Ec = C + "?25l";
    var wc = C + "?25h";
    var xc = (e) => {
      let r = "";
      for (let t = 0; t < e; t++)
        r += ns + (t < e - 1 ? rs() : "");
      return e && (r += ts), r;
    };
    var vc = C + "K";
    var Pc = C + "1K";
    var ns = C + "2K";
    var Tc = C + "J";
    var Sc = C + "1J";
    var gi = C + "2J";
    var Rc = C + "S";
    var Ac = C + "T";
    var Cc = "\x1Bc";
    var Ic = ac ? `${gi}${C}0f` : `${gi}${C}3J${C}H`;
    var Dc = C + "?1049h";
    var Oc = C + "?1049l";
    var kc = yr;
    var _c = (e, r) => [rt, "8", et, et, r, yr, e, rt, "8", et, et, yr].join("");
    var Nc = (e, r = {}) => {
      let t = `${rt}1337;File=inline=1`;
      return r.width && (t += `;width=${r.width}`), r.height && (t += `;height=${r.height}`), r.preserveAspectRatio === false && (t += ";preserveAspectRatio=0"), t + ":" + Buffer.from(e).toString("base64") + yr;
    };
    var Lc = { setCwd: (e = lc()) => `${rt}50;CurrentDir=${e}${yr}`, annotation(e, r = {}) {
      let t = `${rt}1337;`, n = r.x !== void 0, i = r.y !== void 0;
      if ((n || i) && !(n && i && r.length !== void 0))
        throw new Error("`x`, `y` and `length` must be defined when `x` or `y` is defined");
      return e = e.replaceAll("|", ""), t += r.isHidden ? "AddHiddenAnnotation=" : "AddAnnotation=", r.length > 0 ? t += (n ? [e, r.length, r.x, r.y] : [r.length, e]).join("|") : t += e, t + yr;
    } };
    var en = O(cs(), 1);
    function or(e, r, { target: t = "stdout", ...n } = {}) {
      return en.default[t] ? Xt.link(e, r) : n.fallback === false ? e : typeof n.fallback == "function" ? n.fallback(e, r) : `${e} (\u200B${r}\u200B)`;
    }
    or.isSupported = en.default.stdout;
    or.stderr = (e, r, t = {}) => or(e, r, { target: "stderr", ...t });
    or.stderr.isSupported = en.default.stderr;
    function wi(e) {
      return or(e, e, { fallback: Y });
    }
    var Vc = ps();
    var xi = Vc.version;
    function Er(e) {
      let r = jc();
      return r || (e?.config.engineType === "library" ? "library" : e?.config.engineType === "binary" ? "binary" : e?.config.engineType === "client" ? "client" : Bc());
    }
    function jc() {
      let e = process.env.PRISMA_CLIENT_ENGINE_TYPE;
      return e === "library" ? "library" : e === "binary" ? "binary" : e === "client" ? "client" : void 0;
    }
    function Bc() {
      return "library";
    }
    function vi(e) {
      return e.name === "DriverAdapterError" && typeof e.cause == "object";
    }
    function rn(e) {
      return { ok: true, value: e, map(r) {
        return rn(r(e));
      }, flatMap(r) {
        return r(e);
      } };
    }
    function sr(e) {
      return { ok: false, error: e, map() {
        return sr(e);
      }, flatMap() {
        return sr(e);
      } };
    }
    var ds = N("driver-adapter-utils");
    var Pi = class {
      constructor() {
        __publicField(this, "registeredErrors", []);
      }
      consumeError(r) {
        return this.registeredErrors[r];
      }
      registerNewError(r) {
        let t = 0;
        for (; this.registeredErrors[t] !== void 0; )
          t++;
        return this.registeredErrors[t] = { error: r }, t;
      }
    };
    var tn = (e, r = new Pi()) => {
      let t = { adapterName: e.adapterName, errorRegistry: r, queryRaw: ke(r, e.queryRaw.bind(e)), executeRaw: ke(r, e.executeRaw.bind(e)), executeScript: ke(r, e.executeScript.bind(e)), dispose: ke(r, e.dispose.bind(e)), provider: e.provider, startTransaction: async (...n) => (await ke(r, e.startTransaction.bind(e))(...n)).map((o) => Uc(r, o)) };
      return e.getConnectionInfo && (t.getConnectionInfo = Gc(r, e.getConnectionInfo.bind(e))), t;
    };
    var Uc = (e, r) => ({ adapterName: r.adapterName, provider: r.provider, options: r.options, queryRaw: ke(e, r.queryRaw.bind(r)), executeRaw: ke(e, r.executeRaw.bind(r)), commit: ke(e, r.commit.bind(r)), rollback: ke(e, r.rollback.bind(r)) });
    function ke(e, r) {
      return async (...t) => {
        try {
          return rn(await r(...t));
        } catch (n) {
          if (ds("[error@wrapAsync]", n), vi(n))
            return sr(n.cause);
          let i = e.registerNewError(n);
          return sr({ kind: "GenericJs", id: i });
        }
      };
    }
    function Gc(e, r) {
      return (...t) => {
        try {
          return rn(r(...t));
        } catch (n) {
          if (ds("[error@wrapSync]", n), vi(n))
            return sr(n.cause);
          let i = e.registerNewError(n);
          return sr({ kind: "GenericJs", id: i });
        }
      };
    }
    O(on());
    var M = O(__require("path"));
    O(on());
    N("prisma:engines");
    function ms() {
      return M.default.join(__dirname, "../");
    }
    M.default.join(__dirname, "../query-engine-darwin");
    M.default.join(__dirname, "../query-engine-darwin-arm64");
    M.default.join(__dirname, "../query-engine-debian-openssl-1.0.x");
    M.default.join(__dirname, "../query-engine-debian-openssl-1.1.x");
    M.default.join(__dirname, "../query-engine-debian-openssl-3.0.x");
    M.default.join(__dirname, "../query-engine-linux-static-x64");
    M.default.join(__dirname, "../query-engine-linux-static-arm64");
    M.default.join(__dirname, "../query-engine-rhel-openssl-1.0.x");
    M.default.join(__dirname, "../query-engine-rhel-openssl-1.1.x");
    M.default.join(__dirname, "../query-engine-rhel-openssl-3.0.x");
    M.default.join(__dirname, "../libquery_engine-darwin.dylib.node");
    M.default.join(__dirname, "../libquery_engine-darwin-arm64.dylib.node");
    M.default.join(__dirname, "../libquery_engine-debian-openssl-1.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-debian-openssl-1.1.x.so.node");
    M.default.join(__dirname, "../libquery_engine-debian-openssl-3.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-1.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-1.1.x.so.node");
    M.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-3.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-linux-musl.so.node");
    M.default.join(__dirname, "../libquery_engine-linux-musl-openssl-3.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-rhel-openssl-1.0.x.so.node");
    M.default.join(__dirname, "../libquery_engine-rhel-openssl-1.1.x.so.node");
    M.default.join(__dirname, "../libquery_engine-rhel-openssl-3.0.x.so.node");
    M.default.join(__dirname, "../query_engine-windows.dll.node");
    O(__require("fs"));
    gr("chmodPlusX");
    function Ai(e) {
      let r = e.e, t = (a) => `Prisma cannot find the required \`${a}\` system library in your system`, n = r.message.includes("cannot open shared object file"), i = `Please refer to the documentation about Prisma's system requirements: ${wi("https://pris.ly/d/system-requirements")}`, o = `Unable to require(\`${Ce(e.id)}\`).`, s = hr({ message: r.message, code: r.code }).with({ code: "ENOENT" }, () => "File does not exist.").when(({ message: a }) => n && a.includes("libz"), () => `${t("libz")}. Please install it and try again.`).when(({ message: a }) => n && a.includes("libgcc_s"), () => `${t("libgcc_s")}. Please install it and try again.`).when(({ message: a }) => n && a.includes("libssl"), () => {
        let a = e.platformInfo.libssl ? `openssl-${e.platformInfo.libssl}` : "openssl";
        return `${t("libssl")}. Please install ${a} and try again.`;
      }).when(({ message: a }) => a.includes("GLIBC"), () => `Prisma has detected an incompatible version of the \`glibc\` C standard library installed in your system. This probably means your system may be too old to run Prisma. ${i}`).when(({ message: a }) => e.platformInfo.platform === "linux" && a.includes("symbol not found"), () => `The Prisma engines are not compatible with your system ${e.platformInfo.originalDistro} on (${e.platformInfo.archFromUname}) which uses the \`${e.platformInfo.binaryTarget}\` binaryTarget by default. ${i}`).otherwise(() => `The Prisma engines do not seem to be compatible with your system. ${i}`);
      return `${o}
${s}

Details: ${r.message}`;
    }
    var ys = O(hs(), 1);
    function Ci(e) {
      let r = (0, ys.default)(e);
      if (r === 0)
        return e;
      let t = new RegExp(`^[ \\t]{${r}}`, "gm");
      return e.replace(t, "");
    }
    var bs = "prisma+postgres";
    var sn = `${bs}:`;
    function an(e) {
      return e?.toString().startsWith(`${sn}//`) ?? false;
    }
    function Ii(e) {
      if (!an(e))
        return false;
      let { host: r } = new URL(e);
      return r.includes("localhost") || r.includes("127.0.0.1") || r.includes("[::1]");
    }
    var ws = O(Di());
    function ki(e) {
      return String(new Oi(e));
    }
    var Oi = class {
      constructor(r) {
        this.config = r;
      }
      toString() {
        let { config: r } = this, t = r.provider.fromEnvVar ? `env("${r.provider.fromEnvVar}")` : r.provider.value, n = JSON.parse(JSON.stringify({ provider: t, binaryTargets: Kc(r.binaryTargets) }));
        return `generator ${r.name} {
${(0, ws.default)(Hc(n), 2)}
}`;
      }
    };
    function Kc(e) {
      let r;
      if (e.length > 0) {
        let t = e.find((n) => n.fromEnvVar !== null);
        t ? r = `env("${t.fromEnvVar}")` : r = e.map((n) => n.native ? "native" : n.value);
      } else
        r = void 0;
      return r;
    }
    function Hc(e) {
      let r = Object.keys(e).reduce((t, n) => Math.max(t, n.length), 0);
      return Object.entries(e).map(([t, n]) => `${t.padEnd(r)} = ${Yc(n)}`).join(`
`);
    }
    function Yc(e) {
      return JSON.parse(JSON.stringify(e, (r, t) => Array.isArray(t) ? `[${t.map((n) => JSON.stringify(n)).join(", ")}]` : JSON.stringify(t)));
    }
    var nt = {};
    tr(nt, { error: () => Xc, info: () => Zc, log: () => zc, query: () => ep, should: () => xs, tags: () => tt, warn: () => _i });
    var tt = { error: ce("prisma:error"), warn: Ie("prisma:warn"), info: De("prisma:info"), query: nr("prisma:query") };
    var xs = { warn: () => !process.env.PRISMA_DISABLE_WARNINGS };
    function zc(...e) {
      console.log(...e);
    }
    function _i(e, ...r) {
      xs.warn() && console.warn(`${tt.warn} ${e}`, ...r);
    }
    function Zc(e, ...r) {
      console.info(`${tt.info} ${e}`, ...r);
    }
    function Xc(e, ...r) {
      console.error(`${tt.error} ${e}`, ...r);
    }
    function ep(e, ...r) {
      console.log(`${tt.query} ${e}`, ...r);
    }
    function ln(e, r) {
      if (!e)
        throw new Error(`${r}. This should never happen. If you see this error, please, open an issue at https://pris.ly/prisma-prisma-bug-report`);
    }
    function ar(e, r) {
      throw new Error(r);
    }
    function Ni({ onlyFirst: e = false } = {}) {
      let t = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
      return new RegExp(t, e ? void 0 : "g");
    }
    var rp = Ni();
    function wr(e) {
      if (typeof e != "string")
        throw new TypeError(`Expected a \`string\`, got \`${typeof e}\``);
      return e.replace(rp, "");
    }
    var it = O(__require("path"));
    function Li(e) {
      return it.default.sep === it.default.posix.sep ? e : e.split(it.default.sep).join(it.default.posix.sep);
    }
    var qi = O(As());
    var un = O(__require("fs"));
    var xr = O(__require("path"));
    function Cs(e) {
      let r = e.ignoreProcessEnv ? {} : process.env, t = (n) => n.match(/(.?\${(?:[a-zA-Z0-9_]+)?})/g)?.reduce(function(o, s) {
        let a = /(.?)\${([a-zA-Z0-9_]+)?}/g.exec(s);
        if (!a)
          return o;
        let l = a[1], u, c;
        if (l === "\\")
          c = a[0], u = c.replace("\\$", "$");
        else {
          let p = a[2];
          c = a[0].substring(l.length), u = Object.hasOwnProperty.call(r, p) ? r[p] : e.parsed[p] || "", u = t(u);
        }
        return o.replace(c, u);
      }, n) ?? n;
      for (let n in e.parsed) {
        let i = Object.hasOwnProperty.call(r, n) ? r[n] : e.parsed[n];
        e.parsed[n] = t(i);
      }
      for (let n in e.parsed)
        r[n] = e.parsed[n];
      return e;
    }
    var $i = gr("prisma:tryLoadEnv");
    function st({ rootEnvPath: e, schemaEnvPath: r }, t = { conflictCheck: "none" }) {
      let n = Is(e);
      t.conflictCheck !== "none" && hp(n, r, t.conflictCheck);
      let i = null;
      return Ds(n?.path, r) || (i = Is(r)), !n && !i && $i("No Environment variables loaded"), i?.dotenvResult.error ? console.error(ce(W("Schema Env Error: ")) + i.dotenvResult.error) : { message: [n?.message, i?.message].filter(Boolean).join(`
`), parsed: { ...n?.dotenvResult?.parsed, ...i?.dotenvResult?.parsed } };
    }
    function hp(e, r, t) {
      let n = e?.dotenvResult.parsed, i = !Ds(e?.path, r);
      if (n && r && i && un.default.existsSync(r)) {
        let o = qi.default.parse(un.default.readFileSync(r)), s = [];
        for (let a in o)
          n[a] === o[a] && s.push(a);
        if (s.length > 0) {
          let a = xr.default.relative(process.cwd(), e.path), l = xr.default.relative(process.cwd(), r);
          if (t === "error") {
            let u = `There is a conflict between env var${s.length > 1 ? "s" : ""} in ${Y(a)} and ${Y(l)}
Conflicting env vars:
${s.map((c) => `  ${W(c)}`).join(`
`)}

We suggest to move the contents of ${Y(l)} to ${Y(a)} to consolidate your env vars.
`;
            throw new Error(u);
          } else if (t === "warn") {
            let u = `Conflict for env var${s.length > 1 ? "s" : ""} ${s.map((c) => W(c)).join(", ")} in ${Y(a)} and ${Y(l)}
Env vars from ${Y(l)} overwrite the ones from ${Y(a)}
      `;
            console.warn(`${Ie("warn(prisma)")} ${u}`);
          }
        }
      }
    }
    function Is(e) {
      if (yp(e)) {
        $i(`Environment variables loaded from ${e}`);
        let r = qi.default.config({ path: e, debug: process.env.DOTENV_CONFIG_DEBUG ? true : void 0 });
        return { dotenvResult: Cs(r), message: Ce(`Environment variables loaded from ${xr.default.relative(process.cwd(), e)}`), path: e };
      } else
        $i(`Environment variables not found at ${e}`);
      return null;
    }
    function Ds(e, r) {
      return e && r && xr.default.resolve(e) === xr.default.resolve(r);
    }
    function yp(e) {
      return !!(e && un.default.existsSync(e));
    }
    function Vi(e, r) {
      return Object.prototype.hasOwnProperty.call(e, r);
    }
    function pn(e, r) {
      let t = {};
      for (let n of Object.keys(e))
        t[n] = r(e[n], n);
      return t;
    }
    function ji(e, r) {
      if (e.length === 0)
        return;
      let t = e[0];
      for (let n = 1; n < e.length; n++)
        r(t, e[n]) < 0 && (t = e[n]);
      return t;
    }
    function x(e, r) {
      Object.defineProperty(e, "name", { value: r, configurable: true });
    }
    var ks = /* @__PURE__ */ new Set();
    var at = (e, r, ...t) => {
      ks.has(e) || (ks.add(e), _i(r, ...t));
    };
    var P = class e extends Error {
      constructor(r, t, n) {
        super(r);
        __publicField(this, "clientVersion");
        __publicField(this, "errorCode");
        __publicField(this, "retryable");
        this.name = "PrismaClientInitializationError", this.clientVersion = t, this.errorCode = n, Error.captureStackTrace(e);
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientInitializationError";
      }
    };
    x(P, "PrismaClientInitializationError");
    var z2 = class extends Error {
      constructor(r, { code: t, clientVersion: n, meta: i, batchRequestIdx: o }) {
        super(r);
        __publicField(this, "code");
        __publicField(this, "meta");
        __publicField(this, "clientVersion");
        __publicField(this, "batchRequestIdx");
        this.name = "PrismaClientKnownRequestError", this.code = t, this.clientVersion = n, this.meta = i, Object.defineProperty(this, "batchRequestIdx", { value: o, enumerable: false, writable: true });
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientKnownRequestError";
      }
    };
    x(z2, "PrismaClientKnownRequestError");
    var ae = class extends Error {
      constructor(r, t) {
        super(r);
        __publicField(this, "clientVersion");
        this.name = "PrismaClientRustPanicError", this.clientVersion = t;
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientRustPanicError";
      }
    };
    x(ae, "PrismaClientRustPanicError");
    var V = class extends Error {
      constructor(r, { clientVersion: t, batchRequestIdx: n }) {
        super(r);
        __publicField(this, "clientVersion");
        __publicField(this, "batchRequestIdx");
        this.name = "PrismaClientUnknownRequestError", this.clientVersion = t, Object.defineProperty(this, "batchRequestIdx", { value: n, writable: true, enumerable: false });
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientUnknownRequestError";
      }
    };
    x(V, "PrismaClientUnknownRequestError");
    var Z = class extends Error {
      constructor(r, { clientVersion: t }) {
        super(r);
        __publicField(this, "name", "PrismaClientValidationError");
        __publicField(this, "clientVersion");
        this.clientVersion = t;
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientValidationError";
      }
    };
    x(Z, "PrismaClientValidationError");
    var we = class {
      constructor() {
        __publicField(this, "_map", /* @__PURE__ */ new Map());
      }
      get(r) {
        return this._map.get(r)?.value;
      }
      set(r, t) {
        this._map.set(r, { value: t });
      }
      getOrCreate(r, t) {
        let n = this._map.get(r);
        if (n)
          return n.value;
        let i = t();
        return this.set(r, i), i;
      }
    };
    function We(e) {
      return e.substring(0, 1).toLowerCase() + e.substring(1);
    }
    function _s(e, r) {
      let t = {};
      for (let n of e) {
        let i = n[r];
        t[i] = n;
      }
      return t;
    }
    function lt(e) {
      let r;
      return { get() {
        return r || (r = { value: e() }), r.value;
      } };
    }
    function Ns(e) {
      return { models: Bi(e.models), enums: Bi(e.enums), types: Bi(e.types) };
    }
    function Bi(e) {
      let r = {};
      for (let { name: t, ...n } of e)
        r[t] = n;
      return r;
    }
    function vr(e) {
      return e instanceof Date || Object.prototype.toString.call(e) === "[object Date]";
    }
    function mn(e) {
      return e.toString() !== "Invalid Date";
    }
    var Pr = 9e15;
    var Ye = 1e9;
    var Ui = "0123456789abcdef";
    var hn = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058";
    var yn = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789";
    var Gi = { precision: 20, rounding: 4, modulo: 1, toExpNeg: -7, toExpPos: 21, minE: -Pr, maxE: Pr, crypto: false };
    var $s;
    var Ne;
    var w = true;
    var En = "[DecimalError] ";
    var He = En + "Invalid argument: ";
    var qs = En + "Precision limit exceeded";
    var Vs = En + "crypto unavailable";
    var js = "[object Decimal]";
    var X = Math.floor;
    var U = Math.pow;
    var bp = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i;
    var Ep = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i;
    var wp = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i;
    var Bs = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
    var fe = 1e7;
    var E = 7;
    var xp = 9007199254740991;
    var vp = hn.length - 1;
    var Qi = yn.length - 1;
    var m = { toStringTag: js };
    m.absoluteValue = m.abs = function() {
      var e = new this.constructor(this);
      return e.s < 0 && (e.s = 1), y(e);
    };
    m.ceil = function() {
      return y(new this.constructor(this), this.e + 1, 2);
    };
    m.clampedTo = m.clamp = function(e, r) {
      var t, n = this, i = n.constructor;
      if (e = new i(e), r = new i(r), !e.s || !r.s)
        return new i(NaN);
      if (e.gt(r))
        throw Error(He + r);
      return t = n.cmp(e), t < 0 ? e : n.cmp(r) > 0 ? r : new i(n);
    };
    m.comparedTo = m.cmp = function(e) {
      var r, t, n, i, o = this, s = o.d, a = (e = new o.constructor(e)).d, l = o.s, u = e.s;
      if (!s || !a)
        return !l || !u ? NaN : l !== u ? l : s === a ? 0 : !s ^ l < 0 ? 1 : -1;
      if (!s[0] || !a[0])
        return s[0] ? l : a[0] ? -u : 0;
      if (l !== u)
        return l;
      if (o.e !== e.e)
        return o.e > e.e ^ l < 0 ? 1 : -1;
      for (n = s.length, i = a.length, r = 0, t = n < i ? n : i; r < t; ++r)
        if (s[r] !== a[r])
          return s[r] > a[r] ^ l < 0 ? 1 : -1;
      return n === i ? 0 : n > i ^ l < 0 ? 1 : -1;
    };
    m.cosine = m.cos = function() {
      var e, r, t = this, n = t.constructor;
      return t.d ? t.d[0] ? (e = n.precision, r = n.rounding, n.precision = e + Math.max(t.e, t.sd()) + E, n.rounding = 1, t = Pp(n, Js(n, t)), n.precision = e, n.rounding = r, y(Ne == 2 || Ne == 3 ? t.neg() : t, e, r, true)) : new n(1) : new n(NaN);
    };
    m.cubeRoot = m.cbrt = function() {
      var e, r, t, n, i, o, s, a, l, u, c = this, p = c.constructor;
      if (!c.isFinite() || c.isZero())
        return new p(c);
      for (w = false, o = c.s * U(c.s * c, 1 / 3), !o || Math.abs(o) == 1 / 0 ? (t = J(c.d), e = c.e, (o = (e - t.length + 1) % 3) && (t += o == 1 || o == -2 ? "0" : "00"), o = U(t, 1 / 3), e = X((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2)), o == 1 / 0 ? t = "5e" + e : (t = o.toExponential(), t = t.slice(0, t.indexOf("e") + 1) + e), n = new p(t), n.s = c.s) : n = new p(o.toString()), s = (e = p.precision) + 3; ; )
        if (a = n, l = a.times(a).times(a), u = l.plus(c), n = L(u.plus(c).times(a), u.plus(l), s + 2, 1), J(a.d).slice(0, s) === (t = J(n.d)).slice(0, s))
          if (t = t.slice(s - 3, s + 1), t == "9999" || !i && t == "4999") {
            if (!i && (y(a, e + 1, 0), a.times(a).times(a).eq(c))) {
              n = a;
              break;
            }
            s += 4, i = 1;
          } else {
            (!+t || !+t.slice(1) && t.charAt(0) == "5") && (y(n, e + 1, 1), r = !n.times(n).times(n).eq(c));
            break;
          }
      return w = true, y(n, e, p.rounding, r);
    };
    m.decimalPlaces = m.dp = function() {
      var e, r = this.d, t = NaN;
      if (r) {
        if (e = r.length - 1, t = (e - X(this.e / E)) * E, e = r[e], e)
          for (; e % 10 == 0; e /= 10)
            t--;
        t < 0 && (t = 0);
      }
      return t;
    };
    m.dividedBy = m.div = function(e) {
      return L(this, new this.constructor(e));
    };
    m.dividedToIntegerBy = m.divToInt = function(e) {
      var r = this, t = r.constructor;
      return y(L(r, new t(e), 0, 1, 1), t.precision, t.rounding);
    };
    m.equals = m.eq = function(e) {
      return this.cmp(e) === 0;
    };
    m.floor = function() {
      return y(new this.constructor(this), this.e + 1, 3);
    };
    m.greaterThan = m.gt = function(e) {
      return this.cmp(e) > 0;
    };
    m.greaterThanOrEqualTo = m.gte = function(e) {
      var r = this.cmp(e);
      return r == 1 || r === 0;
    };
    m.hyperbolicCosine = m.cosh = function() {
      var e, r, t, n, i, o = this, s = o.constructor, a = new s(1);
      if (!o.isFinite())
        return new s(o.s ? 1 / 0 : NaN);
      if (o.isZero())
        return a;
      t = s.precision, n = s.rounding, s.precision = t + Math.max(o.e, o.sd()) + 4, s.rounding = 1, i = o.d.length, i < 32 ? (e = Math.ceil(i / 3), r = (1 / xn(4, e)).toString()) : (e = 16, r = "2.3283064365386962890625e-10"), o = Tr(s, 1, o.times(r), new s(1), true);
      for (var l, u = e, c = new s(8); u--; )
        l = o.times(o), o = a.minus(l.times(c.minus(l.times(c))));
      return y(o, s.precision = t, s.rounding = n, true);
    };
    m.hyperbolicSine = m.sinh = function() {
      var e, r, t, n, i = this, o = i.constructor;
      if (!i.isFinite() || i.isZero())
        return new o(i);
      if (r = o.precision, t = o.rounding, o.precision = r + Math.max(i.e, i.sd()) + 4, o.rounding = 1, n = i.d.length, n < 3)
        i = Tr(o, 2, i, i, true);
      else {
        e = 1.4 * Math.sqrt(n), e = e > 16 ? 16 : e | 0, i = i.times(1 / xn(5, e)), i = Tr(o, 2, i, i, true);
        for (var s, a = new o(5), l = new o(16), u = new o(20); e--; )
          s = i.times(i), i = i.times(a.plus(s.times(l.times(s).plus(u))));
      }
      return o.precision = r, o.rounding = t, y(i, r, t, true);
    };
    m.hyperbolicTangent = m.tanh = function() {
      var e, r, t = this, n = t.constructor;
      return t.isFinite() ? t.isZero() ? new n(t) : (e = n.precision, r = n.rounding, n.precision = e + 7, n.rounding = 1, L(t.sinh(), t.cosh(), n.precision = e, n.rounding = r)) : new n(t.s);
    };
    m.inverseCosine = m.acos = function() {
      var e = this, r = e.constructor, t = e.abs().cmp(1), n = r.precision, i = r.rounding;
      return t !== -1 ? t === 0 ? e.isNeg() ? xe(r, n, i) : new r(0) : new r(NaN) : e.isZero() ? xe(r, n + 4, i).times(0.5) : (r.precision = n + 6, r.rounding = 1, e = new r(1).minus(e).div(e.plus(1)).sqrt().atan(), r.precision = n, r.rounding = i, e.times(2));
    };
    m.inverseHyperbolicCosine = m.acosh = function() {
      var e, r, t = this, n = t.constructor;
      return t.lte(1) ? new n(t.eq(1) ? 0 : NaN) : t.isFinite() ? (e = n.precision, r = n.rounding, n.precision = e + Math.max(Math.abs(t.e), t.sd()) + 4, n.rounding = 1, w = false, t = t.times(t).minus(1).sqrt().plus(t), w = true, n.precision = e, n.rounding = r, t.ln()) : new n(t);
    };
    m.inverseHyperbolicSine = m.asinh = function() {
      var e, r, t = this, n = t.constructor;
      return !t.isFinite() || t.isZero() ? new n(t) : (e = n.precision, r = n.rounding, n.precision = e + 2 * Math.max(Math.abs(t.e), t.sd()) + 6, n.rounding = 1, w = false, t = t.times(t).plus(1).sqrt().plus(t), w = true, n.precision = e, n.rounding = r, t.ln());
    };
    m.inverseHyperbolicTangent = m.atanh = function() {
      var e, r, t, n, i = this, o = i.constructor;
      return i.isFinite() ? i.e >= 0 ? new o(i.abs().eq(1) ? i.s / 0 : i.isZero() ? i : NaN) : (e = o.precision, r = o.rounding, n = i.sd(), Math.max(n, e) < 2 * -i.e - 1 ? y(new o(i), e, r, true) : (o.precision = t = n - i.e, i = L(i.plus(1), new o(1).minus(i), t + e, 1), o.precision = e + 4, o.rounding = 1, i = i.ln(), o.precision = e, o.rounding = r, i.times(0.5))) : new o(NaN);
    };
    m.inverseSine = m.asin = function() {
      var e, r, t, n, i = this, o = i.constructor;
      return i.isZero() ? new o(i) : (r = i.abs().cmp(1), t = o.precision, n = o.rounding, r !== -1 ? r === 0 ? (e = xe(o, t + 4, n).times(0.5), e.s = i.s, e) : new o(NaN) : (o.precision = t + 6, o.rounding = 1, i = i.div(new o(1).minus(i.times(i)).sqrt().plus(1)).atan(), o.precision = t, o.rounding = n, i.times(2)));
    };
    m.inverseTangent = m.atan = function() {
      var e, r, t, n, i, o, s, a, l, u = this, c = u.constructor, p = c.precision, d = c.rounding;
      if (u.isFinite()) {
        if (u.isZero())
          return new c(u);
        if (u.abs().eq(1) && p + 4 <= Qi)
          return s = xe(c, p + 4, d).times(0.25), s.s = u.s, s;
      } else {
        if (!u.s)
          return new c(NaN);
        if (p + 4 <= Qi)
          return s = xe(c, p + 4, d).times(0.5), s.s = u.s, s;
      }
      for (c.precision = a = p + 10, c.rounding = 1, t = Math.min(28, a / E + 2 | 0), e = t; e; --e)
        u = u.div(u.times(u).plus(1).sqrt().plus(1));
      for (w = false, r = Math.ceil(a / E), n = 1, l = u.times(u), s = new c(u), i = u; e !== -1; )
        if (i = i.times(l), o = s.minus(i.div(n += 2)), i = i.times(l), s = o.plus(i.div(n += 2)), s.d[r] !== void 0)
          for (e = r; s.d[e] === o.d[e] && e--; )
            ;
      return t && (s = s.times(2 << t - 1)), w = true, y(s, c.precision = p, c.rounding = d, true);
    };
    m.isFinite = function() {
      return !!this.d;
    };
    m.isInteger = m.isInt = function() {
      return !!this.d && X(this.e / E) > this.d.length - 2;
    };
    m.isNaN = function() {
      return !this.s;
    };
    m.isNegative = m.isNeg = function() {
      return this.s < 0;
    };
    m.isPositive = m.isPos = function() {
      return this.s > 0;
    };
    m.isZero = function() {
      return !!this.d && this.d[0] === 0;
    };
    m.lessThan = m.lt = function(e) {
      return this.cmp(e) < 0;
    };
    m.lessThanOrEqualTo = m.lte = function(e) {
      return this.cmp(e) < 1;
    };
    m.logarithm = m.log = function(e) {
      var r, t, n, i, o, s, a, l, u = this, c = u.constructor, p = c.precision, d = c.rounding, f = 5;
      if (e == null)
        e = new c(10), r = true;
      else {
        if (e = new c(e), t = e.d, e.s < 0 || !t || !t[0] || e.eq(1))
          return new c(NaN);
        r = e.eq(10);
      }
      if (t = u.d, u.s < 0 || !t || !t[0] || u.eq(1))
        return new c(t && !t[0] ? -1 / 0 : u.s != 1 ? NaN : t ? 0 : 1 / 0);
      if (r)
        if (t.length > 1)
          o = true;
        else {
          for (i = t[0]; i % 10 === 0; )
            i /= 10;
          o = i !== 1;
        }
      if (w = false, a = p + f, s = Ke(u, a), n = r ? bn(c, a + 10) : Ke(e, a), l = L(s, n, a, 1), ut(l.d, i = p, d))
        do
          if (a += 10, s = Ke(u, a), n = r ? bn(c, a + 10) : Ke(e, a), l = L(s, n, a, 1), !o) {
            +J(l.d).slice(i + 1, i + 15) + 1 == 1e14 && (l = y(l, p + 1, 0));
            break;
          }
        while (ut(l.d, i += 10, d));
      return w = true, y(l, p, d);
    };
    m.minus = m.sub = function(e) {
      var r, t, n, i, o, s, a, l, u, c, p, d, f = this, h = f.constructor;
      if (e = new h(e), !f.d || !e.d)
        return !f.s || !e.s ? e = new h(NaN) : f.d ? e.s = -e.s : e = new h(e.d || f.s !== e.s ? f : NaN), e;
      if (f.s != e.s)
        return e.s = -e.s, f.plus(e);
      if (u = f.d, d = e.d, a = h.precision, l = h.rounding, !u[0] || !d[0]) {
        if (d[0])
          e.s = -e.s;
        else if (u[0])
          e = new h(f);
        else
          return new h(l === 3 ? -0 : 0);
        return w ? y(e, a, l) : e;
      }
      if (t = X(e.e / E), c = X(f.e / E), u = u.slice(), o = c - t, o) {
        for (p = o < 0, p ? (r = u, o = -o, s = d.length) : (r = d, t = c, s = u.length), n = Math.max(Math.ceil(a / E), s) + 2, o > n && (o = n, r.length = 1), r.reverse(), n = o; n--; )
          r.push(0);
        r.reverse();
      } else {
        for (n = u.length, s = d.length, p = n < s, p && (s = n), n = 0; n < s; n++)
          if (u[n] != d[n]) {
            p = u[n] < d[n];
            break;
          }
        o = 0;
      }
      for (p && (r = u, u = d, d = r, e.s = -e.s), s = u.length, n = d.length - s; n > 0; --n)
        u[s++] = 0;
      for (n = d.length; n > o; ) {
        if (u[--n] < d[n]) {
          for (i = n; i && u[--i] === 0; )
            u[i] = fe - 1;
          --u[i], u[n] += fe;
        }
        u[n] -= d[n];
      }
      for (; u[--s] === 0; )
        u.pop();
      for (; u[0] === 0; u.shift())
        --t;
      return u[0] ? (e.d = u, e.e = wn(u, t), w ? y(e, a, l) : e) : new h(l === 3 ? -0 : 0);
    };
    m.modulo = m.mod = function(e) {
      var r, t = this, n = t.constructor;
      return e = new n(e), !t.d || !e.s || e.d && !e.d[0] ? new n(NaN) : !e.d || t.d && !t.d[0] ? y(new n(t), n.precision, n.rounding) : (w = false, n.modulo == 9 ? (r = L(t, e.abs(), 0, 3, 1), r.s *= e.s) : r = L(t, e, 0, n.modulo, 1), r = r.times(e), w = true, t.minus(r));
    };
    m.naturalExponential = m.exp = function() {
      return Wi(this);
    };
    m.naturalLogarithm = m.ln = function() {
      return Ke(this);
    };
    m.negated = m.neg = function() {
      var e = new this.constructor(this);
      return e.s = -e.s, y(e);
    };
    m.plus = m.add = function(e) {
      var r, t, n, i, o, s, a, l, u, c, p = this, d = p.constructor;
      if (e = new d(e), !p.d || !e.d)
        return !p.s || !e.s ? e = new d(NaN) : p.d || (e = new d(e.d || p.s === e.s ? p : NaN)), e;
      if (p.s != e.s)
        return e.s = -e.s, p.minus(e);
      if (u = p.d, c = e.d, a = d.precision, l = d.rounding, !u[0] || !c[0])
        return c[0] || (e = new d(p)), w ? y(e, a, l) : e;
      if (o = X(p.e / E), n = X(e.e / E), u = u.slice(), i = o - n, i) {
        for (i < 0 ? (t = u, i = -i, s = c.length) : (t = c, n = o, s = u.length), o = Math.ceil(a / E), s = o > s ? o + 1 : s + 1, i > s && (i = s, t.length = 1), t.reverse(); i--; )
          t.push(0);
        t.reverse();
      }
      for (s = u.length, i = c.length, s - i < 0 && (i = s, t = c, c = u, u = t), r = 0; i; )
        r = (u[--i] = u[i] + c[i] + r) / fe | 0, u[i] %= fe;
      for (r && (u.unshift(r), ++n), s = u.length; u[--s] == 0; )
        u.pop();
      return e.d = u, e.e = wn(u, n), w ? y(e, a, l) : e;
    };
    m.precision = m.sd = function(e) {
      var r, t = this;
      if (e !== void 0 && e !== !!e && e !== 1 && e !== 0)
        throw Error(He + e);
      return t.d ? (r = Us(t.d), e && t.e + 1 > r && (r = t.e + 1)) : r = NaN, r;
    };
    m.round = function() {
      var e = this, r = e.constructor;
      return y(new r(e), e.e + 1, r.rounding);
    };
    m.sine = m.sin = function() {
      var e, r, t = this, n = t.constructor;
      return t.isFinite() ? t.isZero() ? new n(t) : (e = n.precision, r = n.rounding, n.precision = e + Math.max(t.e, t.sd()) + E, n.rounding = 1, t = Sp(n, Js(n, t)), n.precision = e, n.rounding = r, y(Ne > 2 ? t.neg() : t, e, r, true)) : new n(NaN);
    };
    m.squareRoot = m.sqrt = function() {
      var e, r, t, n, i, o, s = this, a = s.d, l = s.e, u = s.s, c = s.constructor;
      if (u !== 1 || !a || !a[0])
        return new c(!u || u < 0 && (!a || a[0]) ? NaN : a ? s : 1 / 0);
      for (w = false, u = Math.sqrt(+s), u == 0 || u == 1 / 0 ? (r = J(a), (r.length + l) % 2 == 0 && (r += "0"), u = Math.sqrt(r), l = X((l + 1) / 2) - (l < 0 || l % 2), u == 1 / 0 ? r = "5e" + l : (r = u.toExponential(), r = r.slice(0, r.indexOf("e") + 1) + l), n = new c(r)) : n = new c(u.toString()), t = (l = c.precision) + 3; ; )
        if (o = n, n = o.plus(L(s, o, t + 2, 1)).times(0.5), J(o.d).slice(0, t) === (r = J(n.d)).slice(0, t))
          if (r = r.slice(t - 3, t + 1), r == "9999" || !i && r == "4999") {
            if (!i && (y(o, l + 1, 0), o.times(o).eq(s))) {
              n = o;
              break;
            }
            t += 4, i = 1;
          } else {
            (!+r || !+r.slice(1) && r.charAt(0) == "5") && (y(n, l + 1, 1), e = !n.times(n).eq(s));
            break;
          }
      return w = true, y(n, l, c.rounding, e);
    };
    m.tangent = m.tan = function() {
      var e, r, t = this, n = t.constructor;
      return t.isFinite() ? t.isZero() ? new n(t) : (e = n.precision, r = n.rounding, n.precision = e + 10, n.rounding = 1, t = t.sin(), t.s = 1, t = L(t, new n(1).minus(t.times(t)).sqrt(), e + 10, 0), n.precision = e, n.rounding = r, y(Ne == 2 || Ne == 4 ? t.neg() : t, e, r, true)) : new n(NaN);
    };
    m.times = m.mul = function(e) {
      var r, t, n, i, o, s, a, l, u, c = this, p = c.constructor, d = c.d, f = (e = new p(e)).d;
      if (e.s *= c.s, !d || !d[0] || !f || !f[0])
        return new p(!e.s || d && !d[0] && !f || f && !f[0] && !d ? NaN : !d || !f ? e.s / 0 : e.s * 0);
      for (t = X(c.e / E) + X(e.e / E), l = d.length, u = f.length, l < u && (o = d, d = f, f = o, s = l, l = u, u = s), o = [], s = l + u, n = s; n--; )
        o.push(0);
      for (n = u; --n >= 0; ) {
        for (r = 0, i = l + n; i > n; )
          a = o[i] + f[n] * d[i - n - 1] + r, o[i--] = a % fe | 0, r = a / fe | 0;
        o[i] = (o[i] + r) % fe | 0;
      }
      for (; !o[--s]; )
        o.pop();
      return r ? ++t : o.shift(), e.d = o, e.e = wn(o, t), w ? y(e, p.precision, p.rounding) : e;
    };
    m.toBinary = function(e, r) {
      return Ji(this, 2, e, r);
    };
    m.toDecimalPlaces = m.toDP = function(e, r) {
      var t = this, n = t.constructor;
      return t = new n(t), e === void 0 ? t : (ne(e, 0, Ye), r === void 0 ? r = n.rounding : ne(r, 0, 8), y(t, e + t.e + 1, r));
    };
    m.toExponential = function(e, r) {
      var t, n = this, i = n.constructor;
      return e === void 0 ? t = ve(n, true) : (ne(e, 0, Ye), r === void 0 ? r = i.rounding : ne(r, 0, 8), n = y(new i(n), e + 1, r), t = ve(n, true, e + 1)), n.isNeg() && !n.isZero() ? "-" + t : t;
    };
    m.toFixed = function(e, r) {
      var t, n, i = this, o = i.constructor;
      return e === void 0 ? t = ve(i) : (ne(e, 0, Ye), r === void 0 ? r = o.rounding : ne(r, 0, 8), n = y(new o(i), e + i.e + 1, r), t = ve(n, false, e + n.e + 1)), i.isNeg() && !i.isZero() ? "-" + t : t;
    };
    m.toFraction = function(e) {
      var r, t, n, i, o, s, a, l, u, c, p, d, f = this, h = f.d, g = f.constructor;
      if (!h)
        return new g(f);
      if (u = t = new g(1), n = l = new g(0), r = new g(n), o = r.e = Us(h) - f.e - 1, s = o % E, r.d[0] = U(10, s < 0 ? E + s : s), e == null)
        e = o > 0 ? r : u;
      else {
        if (a = new g(e), !a.isInt() || a.lt(u))
          throw Error(He + a);
        e = a.gt(r) ? o > 0 ? r : u : a;
      }
      for (w = false, a = new g(J(h)), c = g.precision, g.precision = o = h.length * E * 2; p = L(a, r, 0, 1, 1), i = t.plus(p.times(n)), i.cmp(e) != 1; )
        t = n, n = i, i = u, u = l.plus(p.times(i)), l = i, i = r, r = a.minus(p.times(i)), a = i;
      return i = L(e.minus(t), n, 0, 1, 1), l = l.plus(i.times(u)), t = t.plus(i.times(n)), l.s = u.s = f.s, d = L(u, n, o, 1).minus(f).abs().cmp(L(l, t, o, 1).minus(f).abs()) < 1 ? [u, n] : [l, t], g.precision = c, w = true, d;
    };
    m.toHexadecimal = m.toHex = function(e, r) {
      return Ji(this, 16, e, r);
    };
    m.toNearest = function(e, r) {
      var t = this, n = t.constructor;
      if (t = new n(t), e == null) {
        if (!t.d)
          return t;
        e = new n(1), r = n.rounding;
      } else {
        if (e = new n(e), r === void 0 ? r = n.rounding : ne(r, 0, 8), !t.d)
          return e.s ? t : e;
        if (!e.d)
          return e.s && (e.s = t.s), e;
      }
      return e.d[0] ? (w = false, t = L(t, e, 0, r, 1).times(e), w = true, y(t)) : (e.s = t.s, t = e), t;
    };
    m.toNumber = function() {
      return +this;
    };
    m.toOctal = function(e, r) {
      return Ji(this, 8, e, r);
    };
    m.toPower = m.pow = function(e) {
      var r, t, n, i, o, s, a = this, l = a.constructor, u = +(e = new l(e));
      if (!a.d || !e.d || !a.d[0] || !e.d[0])
        return new l(U(+a, u));
      if (a = new l(a), a.eq(1))
        return a;
      if (n = l.precision, o = l.rounding, e.eq(1))
        return y(a, n, o);
      if (r = X(e.e / E), r >= e.d.length - 1 && (t = u < 0 ? -u : u) <= xp)
        return i = Gs(l, a, t, n), e.s < 0 ? new l(1).div(i) : y(i, n, o);
      if (s = a.s, s < 0) {
        if (r < e.d.length - 1)
          return new l(NaN);
        if ((e.d[r] & 1) == 0 && (s = 1), a.e == 0 && a.d[0] == 1 && a.d.length == 1)
          return a.s = s, a;
      }
      return t = U(+a, u), r = t == 0 || !isFinite(t) ? X(u * (Math.log("0." + J(a.d)) / Math.LN10 + a.e + 1)) : new l(t + "").e, r > l.maxE + 1 || r < l.minE - 1 ? new l(r > 0 ? s / 0 : 0) : (w = false, l.rounding = a.s = 1, t = Math.min(12, (r + "").length), i = Wi(e.times(Ke(a, n + t)), n), i.d && (i = y(i, n + 5, 1), ut(i.d, n, o) && (r = n + 10, i = y(Wi(e.times(Ke(a, r + t)), r), r + 5, 1), +J(i.d).slice(n + 1, n + 15) + 1 == 1e14 && (i = y(i, n + 1, 0)))), i.s = s, w = true, l.rounding = o, y(i, n, o));
    };
    m.toPrecision = function(e, r) {
      var t, n = this, i = n.constructor;
      return e === void 0 ? t = ve(n, n.e <= i.toExpNeg || n.e >= i.toExpPos) : (ne(e, 1, Ye), r === void 0 ? r = i.rounding : ne(r, 0, 8), n = y(new i(n), e, r), t = ve(n, e <= n.e || n.e <= i.toExpNeg, e)), n.isNeg() && !n.isZero() ? "-" + t : t;
    };
    m.toSignificantDigits = m.toSD = function(e, r) {
      var t = this, n = t.constructor;
      return e === void 0 ? (e = n.precision, r = n.rounding) : (ne(e, 1, Ye), r === void 0 ? r = n.rounding : ne(r, 0, 8)), y(new n(t), e, r);
    };
    m.toString = function() {
      var e = this, r = e.constructor, t = ve(e, e.e <= r.toExpNeg || e.e >= r.toExpPos);
      return e.isNeg() && !e.isZero() ? "-" + t : t;
    };
    m.truncated = m.trunc = function() {
      return y(new this.constructor(this), this.e + 1, 1);
    };
    m.valueOf = m.toJSON = function() {
      var e = this, r = e.constructor, t = ve(e, e.e <= r.toExpNeg || e.e >= r.toExpPos);
      return e.isNeg() ? "-" + t : t;
    };
    function J(e) {
      var r, t, n, i = e.length - 1, o = "", s = e[0];
      if (i > 0) {
        for (o += s, r = 1; r < i; r++)
          n = e[r] + "", t = E - n.length, t && (o += Je(t)), o += n;
        s = e[r], n = s + "", t = E - n.length, t && (o += Je(t));
      } else if (s === 0)
        return "0";
      for (; s % 10 === 0; )
        s /= 10;
      return o + s;
    }
    function ne(e, r, t) {
      if (e !== ~~e || e < r || e > t)
        throw Error(He + e);
    }
    function ut(e, r, t, n) {
      var i, o, s, a;
      for (o = e[0]; o >= 10; o /= 10)
        --r;
      return --r < 0 ? (r += E, i = 0) : (i = Math.ceil((r + 1) / E), r %= E), o = U(10, E - r), a = e[i] % o | 0, n == null ? r < 3 ? (r == 0 ? a = a / 100 | 0 : r == 1 && (a = a / 10 | 0), s = t < 4 && a == 99999 || t > 3 && a == 49999 || a == 5e4 || a == 0) : s = (t < 4 && a + 1 == o || t > 3 && a + 1 == o / 2) && (e[i + 1] / o / 100 | 0) == U(10, r - 2) - 1 || (a == o / 2 || a == 0) && (e[i + 1] / o / 100 | 0) == 0 : r < 4 ? (r == 0 ? a = a / 1e3 | 0 : r == 1 ? a = a / 100 | 0 : r == 2 && (a = a / 10 | 0), s = (n || t < 4) && a == 9999 || !n && t > 3 && a == 4999) : s = ((n || t < 4) && a + 1 == o || !n && t > 3 && a + 1 == o / 2) && (e[i + 1] / o / 1e3 | 0) == U(10, r - 3) - 1, s;
    }
    function fn(e, r, t) {
      for (var n, i = [0], o, s = 0, a = e.length; s < a; ) {
        for (o = i.length; o--; )
          i[o] *= r;
        for (i[0] += Ui.indexOf(e.charAt(s++)), n = 0; n < i.length; n++)
          i[n] > t - 1 && (i[n + 1] === void 0 && (i[n + 1] = 0), i[n + 1] += i[n] / t | 0, i[n] %= t);
      }
      return i.reverse();
    }
    function Pp(e, r) {
      var t, n, i;
      if (r.isZero())
        return r;
      n = r.d.length, n < 32 ? (t = Math.ceil(n / 3), i = (1 / xn(4, t)).toString()) : (t = 16, i = "2.3283064365386962890625e-10"), e.precision += t, r = Tr(e, 1, r.times(i), new e(1));
      for (var o = t; o--; ) {
        var s = r.times(r);
        r = s.times(s).minus(s).times(8).plus(1);
      }
      return e.precision -= t, r;
    }
    var L = /* @__PURE__ */ function() {
      function e(n, i, o) {
        var s, a = 0, l = n.length;
        for (n = n.slice(); l--; )
          s = n[l] * i + a, n[l] = s % o | 0, a = s / o | 0;
        return a && n.unshift(a), n;
      }
      function r(n, i, o, s) {
        var a, l;
        if (o != s)
          l = o > s ? 1 : -1;
        else
          for (a = l = 0; a < o; a++)
            if (n[a] != i[a]) {
              l = n[a] > i[a] ? 1 : -1;
              break;
            }
        return l;
      }
      function t(n, i, o, s) {
        for (var a = 0; o--; )
          n[o] -= a, a = n[o] < i[o] ? 1 : 0, n[o] = a * s + n[o] - i[o];
        for (; !n[0] && n.length > 1; )
          n.shift();
      }
      return function(n, i, o, s, a, l) {
        var u, c, p, d, f, h, g, I, T, S, b, D, me, se, Kr, j, te, Ae, K, fr, Vt = n.constructor, ti = n.s == i.s ? 1 : -1, H = n.d, k = i.d;
        if (!H || !H[0] || !k || !k[0])
          return new Vt(!n.s || !i.s || (H ? k && H[0] == k[0] : !k) ? NaN : H && H[0] == 0 || !k ? ti * 0 : ti / 0);
        for (l ? (f = 1, c = n.e - i.e) : (l = fe, f = E, c = X(n.e / f) - X(i.e / f)), K = k.length, te = H.length, T = new Vt(ti), S = T.d = [], p = 0; k[p] == (H[p] || 0); p++)
          ;
        if (k[p] > (H[p] || 0) && c--, o == null ? (se = o = Vt.precision, s = Vt.rounding) : a ? se = o + (n.e - i.e) + 1 : se = o, se < 0)
          S.push(1), h = true;
        else {
          if (se = se / f + 2 | 0, p = 0, K == 1) {
            for (d = 0, k = k[0], se++; (p < te || d) && se--; p++)
              Kr = d * l + (H[p] || 0), S[p] = Kr / k | 0, d = Kr % k | 0;
            h = d || p < te;
          } else {
            for (d = l / (k[0] + 1) | 0, d > 1 && (k = e(k, d, l), H = e(H, d, l), K = k.length, te = H.length), j = K, b = H.slice(0, K), D = b.length; D < K; )
              b[D++] = 0;
            fr = k.slice(), fr.unshift(0), Ae = k[0], k[1] >= l / 2 && ++Ae;
            do
              d = 0, u = r(k, b, K, D), u < 0 ? (me = b[0], K != D && (me = me * l + (b[1] || 0)), d = me / Ae | 0, d > 1 ? (d >= l && (d = l - 1), g = e(k, d, l), I = g.length, D = b.length, u = r(g, b, I, D), u == 1 && (d--, t(g, K < I ? fr : k, I, l))) : (d == 0 && (u = d = 1), g = k.slice()), I = g.length, I < D && g.unshift(0), t(b, g, D, l), u == -1 && (D = b.length, u = r(k, b, K, D), u < 1 && (d++, t(b, K < D ? fr : k, D, l))), D = b.length) : u === 0 && (d++, b = [0]), S[p++] = d, u && b[0] ? b[D++] = H[j] || 0 : (b = [H[j]], D = 1);
            while ((j++ < te || b[0] !== void 0) && se--);
            h = b[0] !== void 0;
          }
          S[0] || S.shift();
        }
        if (f == 1)
          T.e = c, $s = h;
        else {
          for (p = 1, d = S[0]; d >= 10; d /= 10)
            p++;
          T.e = p + c * f - 1, y(T, a ? o + T.e + 1 : o, s, h);
        }
        return T;
      };
    }();
    function y(e, r, t, n) {
      var i, o, s, a, l, u, c, p, d, f = e.constructor;
      e:
        if (r != null) {
          if (p = e.d, !p)
            return e;
          for (i = 1, a = p[0]; a >= 10; a /= 10)
            i++;
          if (o = r - i, o < 0)
            o += E, s = r, c = p[d = 0], l = c / U(10, i - s - 1) % 10 | 0;
          else if (d = Math.ceil((o + 1) / E), a = p.length, d >= a)
            if (n) {
              for (; a++ <= d; )
                p.push(0);
              c = l = 0, i = 1, o %= E, s = o - E + 1;
            } else
              break e;
          else {
            for (c = a = p[d], i = 1; a >= 10; a /= 10)
              i++;
            o %= E, s = o - E + i, l = s < 0 ? 0 : c / U(10, i - s - 1) % 10 | 0;
          }
          if (n = n || r < 0 || p[d + 1] !== void 0 || (s < 0 ? c : c % U(10, i - s - 1)), u = t < 4 ? (l || n) && (t == 0 || t == (e.s < 0 ? 3 : 2)) : l > 5 || l == 5 && (t == 4 || n || t == 6 && (o > 0 ? s > 0 ? c / U(10, i - s) : 0 : p[d - 1]) % 10 & 1 || t == (e.s < 0 ? 8 : 7)), r < 1 || !p[0])
            return p.length = 0, u ? (r -= e.e + 1, p[0] = U(10, (E - r % E) % E), e.e = -r || 0) : p[0] = e.e = 0, e;
          if (o == 0 ? (p.length = d, a = 1, d--) : (p.length = d + 1, a = U(10, E - o), p[d] = s > 0 ? (c / U(10, i - s) % U(10, s) | 0) * a : 0), u)
            for (; ; )
              if (d == 0) {
                for (o = 1, s = p[0]; s >= 10; s /= 10)
                  o++;
                for (s = p[0] += a, a = 1; s >= 10; s /= 10)
                  a++;
                o != a && (e.e++, p[0] == fe && (p[0] = 1));
                break;
              } else {
                if (p[d] += a, p[d] != fe)
                  break;
                p[d--] = 0, a = 1;
              }
          for (o = p.length; p[--o] === 0; )
            p.pop();
        }
      return w && (e.e > f.maxE ? (e.d = null, e.e = NaN) : e.e < f.minE && (e.e = 0, e.d = [0])), e;
    }
    function ve(e, r, t) {
      if (!e.isFinite())
        return Ws(e);
      var n, i = e.e, o = J(e.d), s = o.length;
      return r ? (t && (n = t - s) > 0 ? o = o.charAt(0) + "." + o.slice(1) + Je(n) : s > 1 && (o = o.charAt(0) + "." + o.slice(1)), o = o + (e.e < 0 ? "e" : "e+") + e.e) : i < 0 ? (o = "0." + Je(-i - 1) + o, t && (n = t - s) > 0 && (o += Je(n))) : i >= s ? (o += Je(i + 1 - s), t && (n = t - i - 1) > 0 && (o = o + "." + Je(n))) : ((n = i + 1) < s && (o = o.slice(0, n) + "." + o.slice(n)), t && (n = t - s) > 0 && (i + 1 === s && (o += "."), o += Je(n))), o;
    }
    function wn(e, r) {
      var t = e[0];
      for (r *= E; t >= 10; t /= 10)
        r++;
      return r;
    }
    function bn(e, r, t) {
      if (r > vp)
        throw w = true, t && (e.precision = t), Error(qs);
      return y(new e(hn), r, 1, true);
    }
    function xe(e, r, t) {
      if (r > Qi)
        throw Error(qs);
      return y(new e(yn), r, t, true);
    }
    function Us(e) {
      var r = e.length - 1, t = r * E + 1;
      if (r = e[r], r) {
        for (; r % 10 == 0; r /= 10)
          t--;
        for (r = e[0]; r >= 10; r /= 10)
          t++;
      }
      return t;
    }
    function Je(e) {
      for (var r = ""; e--; )
        r += "0";
      return r;
    }
    function Gs(e, r, t, n) {
      var i, o = new e(1), s = Math.ceil(n / E + 4);
      for (w = false; ; ) {
        if (t % 2 && (o = o.times(r), Fs(o.d, s) && (i = true)), t = X(t / 2), t === 0) {
          t = o.d.length - 1, i && o.d[t] === 0 && ++o.d[t];
          break;
        }
        r = r.times(r), Fs(r.d, s);
      }
      return w = true, o;
    }
    function Ls(e) {
      return e.d[e.d.length - 1] & 1;
    }
    function Qs(e, r, t) {
      for (var n, i, o = new e(r[0]), s = 0; ++s < r.length; ) {
        if (i = new e(r[s]), !i.s) {
          o = i;
          break;
        }
        n = o.cmp(i), (n === t || n === 0 && o.s === t) && (o = i);
      }
      return o;
    }
    function Wi(e, r) {
      var t, n, i, o, s, a, l, u = 0, c = 0, p = 0, d = e.constructor, f = d.rounding, h = d.precision;
      if (!e.d || !e.d[0] || e.e > 17)
        return new d(e.d ? e.d[0] ? e.s < 0 ? 0 : 1 / 0 : 1 : e.s ? e.s < 0 ? 0 : e : NaN);
      for (r == null ? (w = false, l = h) : l = r, a = new d(0.03125); e.e > -2; )
        e = e.times(a), p += 5;
      for (n = Math.log(U(2, p)) / Math.LN10 * 2 + 5 | 0, l += n, t = o = s = new d(1), d.precision = l; ; ) {
        if (o = y(o.times(e), l, 1), t = t.times(++c), a = s.plus(L(o, t, l, 1)), J(a.d).slice(0, l) === J(s.d).slice(0, l)) {
          for (i = p; i--; )
            s = y(s.times(s), l, 1);
          if (r == null)
            if (u < 3 && ut(s.d, l - n, f, u))
              d.precision = l += 10, t = o = a = new d(1), c = 0, u++;
            else
              return y(s, d.precision = h, f, w = true);
          else
            return d.precision = h, s;
        }
        s = a;
      }
    }
    function Ke(e, r) {
      var t, n, i, o, s, a, l, u, c, p, d, f = 1, h = 10, g = e, I = g.d, T = g.constructor, S = T.rounding, b = T.precision;
      if (g.s < 0 || !I || !I[0] || !g.e && I[0] == 1 && I.length == 1)
        return new T(I && !I[0] ? -1 / 0 : g.s != 1 ? NaN : I ? 0 : g);
      if (r == null ? (w = false, c = b) : c = r, T.precision = c += h, t = J(I), n = t.charAt(0), Math.abs(o = g.e) < 15e14) {
        for (; n < 7 && n != 1 || n == 1 && t.charAt(1) > 3; )
          g = g.times(e), t = J(g.d), n = t.charAt(0), f++;
        o = g.e, n > 1 ? (g = new T("0." + t), o++) : g = new T(n + "." + t.slice(1));
      } else
        return u = bn(T, c + 2, b).times(o + ""), g = Ke(new T(n + "." + t.slice(1)), c - h).plus(u), T.precision = b, r == null ? y(g, b, S, w = true) : g;
      for (p = g, l = s = g = L(g.minus(1), g.plus(1), c, 1), d = y(g.times(g), c, 1), i = 3; ; ) {
        if (s = y(s.times(d), c, 1), u = l.plus(L(s, new T(i), c, 1)), J(u.d).slice(0, c) === J(l.d).slice(0, c))
          if (l = l.times(2), o !== 0 && (l = l.plus(bn(T, c + 2, b).times(o + ""))), l = L(l, new T(f), c, 1), r == null)
            if (ut(l.d, c - h, S, a))
              T.precision = c += h, u = s = g = L(p.minus(1), p.plus(1), c, 1), d = y(g.times(g), c, 1), i = a = 1;
            else
              return y(l, T.precision = b, S, w = true);
          else
            return T.precision = b, l;
        l = u, i += 2;
      }
    }
    function Ws(e) {
      return String(e.s * e.s / 0);
    }
    function gn(e, r) {
      var t, n, i;
      for ((t = r.indexOf(".")) > -1 && (r = r.replace(".", "")), (n = r.search(/e/i)) > 0 ? (t < 0 && (t = n), t += +r.slice(n + 1), r = r.substring(0, n)) : t < 0 && (t = r.length), n = 0; r.charCodeAt(n) === 48; n++)
        ;
      for (i = r.length; r.charCodeAt(i - 1) === 48; --i)
        ;
      if (r = r.slice(n, i), r) {
        if (i -= n, e.e = t = t - n - 1, e.d = [], n = (t + 1) % E, t < 0 && (n += E), n < i) {
          for (n && e.d.push(+r.slice(0, n)), i -= E; n < i; )
            e.d.push(+r.slice(n, n += E));
          r = r.slice(n), n = E - r.length;
        } else
          n -= i;
        for (; n--; )
          r += "0";
        e.d.push(+r), w && (e.e > e.constructor.maxE ? (e.d = null, e.e = NaN) : e.e < e.constructor.minE && (e.e = 0, e.d = [0]));
      } else
        e.e = 0, e.d = [0];
      return e;
    }
    function Tp(e, r) {
      var t, n, i, o, s, a, l, u, c;
      if (r.indexOf("_") > -1) {
        if (r = r.replace(/(\d)_(?=\d)/g, "$1"), Bs.test(r))
          return gn(e, r);
      } else if (r === "Infinity" || r === "NaN")
        return +r || (e.s = NaN), e.e = NaN, e.d = null, e;
      if (Ep.test(r))
        t = 16, r = r.toLowerCase();
      else if (bp.test(r))
        t = 2;
      else if (wp.test(r))
        t = 8;
      else
        throw Error(He + r);
      for (o = r.search(/p/i), o > 0 ? (l = +r.slice(o + 1), r = r.substring(2, o)) : r = r.slice(2), o = r.indexOf("."), s = o >= 0, n = e.constructor, s && (r = r.replace(".", ""), a = r.length, o = a - o, i = Gs(n, new n(t), o, o * 2)), u = fn(r, t, fe), c = u.length - 1, o = c; u[o] === 0; --o)
        u.pop();
      return o < 0 ? new n(e.s * 0) : (e.e = wn(u, c), e.d = u, w = false, s && (e = L(e, i, a * 4)), l && (e = e.times(Math.abs(l) < 54 ? U(2, l) : Le.pow(2, l))), w = true, e);
    }
    function Sp(e, r) {
      var t, n = r.d.length;
      if (n < 3)
        return r.isZero() ? r : Tr(e, 2, r, r);
      t = 1.4 * Math.sqrt(n), t = t > 16 ? 16 : t | 0, r = r.times(1 / xn(5, t)), r = Tr(e, 2, r, r);
      for (var i, o = new e(5), s = new e(16), a = new e(20); t--; )
        i = r.times(r), r = r.times(o.plus(i.times(s.times(i).minus(a))));
      return r;
    }
    function Tr(e, r, t, n, i) {
      var o, s, a, l, c = e.precision, p = Math.ceil(c / E);
      for (w = false, l = t.times(t), a = new e(n); ; ) {
        if (s = L(a.times(l), new e(r++ * r++), c, 1), a = i ? n.plus(s) : n.minus(s), n = L(s.times(l), new e(r++ * r++), c, 1), s = a.plus(n), s.d[p] !== void 0) {
          for (o = p; s.d[o] === a.d[o] && o--; )
            ;
          if (o == -1)
            break;
        }
        o = a, a = n, n = s, s = o;
      }
      return w = true, s.d.length = p + 1, s;
    }
    function xn(e, r) {
      for (var t = e; --r; )
        t *= e;
      return t;
    }
    function Js(e, r) {
      var t, n = r.s < 0, i = xe(e, e.precision, 1), o = i.times(0.5);
      if (r = r.abs(), r.lte(o))
        return Ne = n ? 4 : 1, r;
      if (t = r.divToInt(i), t.isZero())
        Ne = n ? 3 : 2;
      else {
        if (r = r.minus(t.times(i)), r.lte(o))
          return Ne = Ls(t) ? n ? 2 : 3 : n ? 4 : 1, r;
        Ne = Ls(t) ? n ? 1 : 4 : n ? 3 : 2;
      }
      return r.minus(i).abs();
    }
    function Ji(e, r, t, n) {
      var i, o, s, a, l, u, c, p, d, f = e.constructor, h = t !== void 0;
      if (h ? (ne(t, 1, Ye), n === void 0 ? n = f.rounding : ne(n, 0, 8)) : (t = f.precision, n = f.rounding), !e.isFinite())
        c = Ws(e);
      else {
        for (c = ve(e), s = c.indexOf("."), h ? (i = 2, r == 16 ? t = t * 4 - 3 : r == 8 && (t = t * 3 - 2)) : i = r, s >= 0 && (c = c.replace(".", ""), d = new f(1), d.e = c.length - s, d.d = fn(ve(d), 10, i), d.e = d.d.length), p = fn(c, 10, i), o = l = p.length; p[--l] == 0; )
          p.pop();
        if (!p[0])
          c = h ? "0p+0" : "0";
        else {
          if (s < 0 ? o-- : (e = new f(e), e.d = p, e.e = o, e = L(e, d, t, n, 0, i), p = e.d, o = e.e, u = $s), s = p[t], a = i / 2, u = u || p[t + 1] !== void 0, u = n < 4 ? (s !== void 0 || u) && (n === 0 || n === (e.s < 0 ? 3 : 2)) : s > a || s === a && (n === 4 || u || n === 6 && p[t - 1] & 1 || n === (e.s < 0 ? 8 : 7)), p.length = t, u)
            for (; ++p[--t] > i - 1; )
              p[t] = 0, t || (++o, p.unshift(1));
          for (l = p.length; !p[l - 1]; --l)
            ;
          for (s = 0, c = ""; s < l; s++)
            c += Ui.charAt(p[s]);
          if (h) {
            if (l > 1)
              if (r == 16 || r == 8) {
                for (s = r == 16 ? 4 : 3, --l; l % s; l++)
                  c += "0";
                for (p = fn(c, i, r), l = p.length; !p[l - 1]; --l)
                  ;
                for (s = 1, c = "1."; s < l; s++)
                  c += Ui.charAt(p[s]);
              } else
                c = c.charAt(0) + "." + c.slice(1);
            c = c + (o < 0 ? "p" : "p+") + o;
          } else if (o < 0) {
            for (; ++o; )
              c = "0" + c;
            c = "0." + c;
          } else if (++o > l)
            for (o -= l; o--; )
              c += "0";
          else
            o < l && (c = c.slice(0, o) + "." + c.slice(o));
        }
        c = (r == 16 ? "0x" : r == 2 ? "0b" : r == 8 ? "0o" : "") + c;
      }
      return e.s < 0 ? "-" + c : c;
    }
    function Fs(e, r) {
      if (e.length > r)
        return e.length = r, true;
    }
    function Rp(e) {
      return new this(e).abs();
    }
    function Ap(e) {
      return new this(e).acos();
    }
    function Cp(e) {
      return new this(e).acosh();
    }
    function Ip(e, r) {
      return new this(e).plus(r);
    }
    function Dp(e) {
      return new this(e).asin();
    }
    function Op(e) {
      return new this(e).asinh();
    }
    function kp(e) {
      return new this(e).atan();
    }
    function _p(e) {
      return new this(e).atanh();
    }
    function Np(e, r) {
      e = new this(e), r = new this(r);
      var t, n = this.precision, i = this.rounding, o = n + 4;
      return !e.s || !r.s ? t = new this(NaN) : !e.d && !r.d ? (t = xe(this, o, 1).times(r.s > 0 ? 0.25 : 0.75), t.s = e.s) : !r.d || e.isZero() ? (t = r.s < 0 ? xe(this, n, i) : new this(0), t.s = e.s) : !e.d || r.isZero() ? (t = xe(this, o, 1).times(0.5), t.s = e.s) : r.s < 0 ? (this.precision = o, this.rounding = 1, t = this.atan(L(e, r, o, 1)), r = xe(this, o, 1), this.precision = n, this.rounding = i, t = e.s < 0 ? t.minus(r) : t.plus(r)) : t = this.atan(L(e, r, o, 1)), t;
    }
    function Lp(e) {
      return new this(e).cbrt();
    }
    function Fp(e) {
      return y(e = new this(e), e.e + 1, 2);
    }
    function Mp(e, r, t) {
      return new this(e).clamp(r, t);
    }
    function $p(e) {
      if (!e || typeof e != "object")
        throw Error(En + "Object expected");
      var r, t, n, i = e.defaults === true, o = ["precision", 1, Ye, "rounding", 0, 8, "toExpNeg", -Pr, 0, "toExpPos", 0, Pr, "maxE", 0, Pr, "minE", -Pr, 0, "modulo", 0, 9];
      for (r = 0; r < o.length; r += 3)
        if (t = o[r], i && (this[t] = Gi[t]), (n = e[t]) !== void 0)
          if (X(n) === n && n >= o[r + 1] && n <= o[r + 2])
            this[t] = n;
          else
            throw Error(He + t + ": " + n);
      if (t = "crypto", i && (this[t] = Gi[t]), (n = e[t]) !== void 0)
        if (n === true || n === false || n === 0 || n === 1)
          if (n)
            if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
              this[t] = true;
            else
              throw Error(Vs);
          else
            this[t] = false;
        else
          throw Error(He + t + ": " + n);
      return this;
    }
    function qp(e) {
      return new this(e).cos();
    }
    function Vp(e) {
      return new this(e).cosh();
    }
    function Ks(e) {
      var r, t, n;
      function i(o) {
        var s, a, l, u = this;
        if (!(u instanceof i))
          return new i(o);
        if (u.constructor = i, Ms(o)) {
          u.s = o.s, w ? !o.d || o.e > i.maxE ? (u.e = NaN, u.d = null) : o.e < i.minE ? (u.e = 0, u.d = [0]) : (u.e = o.e, u.d = o.d.slice()) : (u.e = o.e, u.d = o.d ? o.d.slice() : o.d);
          return;
        }
        if (l = typeof o, l === "number") {
          if (o === 0) {
            u.s = 1 / o < 0 ? -1 : 1, u.e = 0, u.d = [0];
            return;
          }
          if (o < 0 ? (o = -o, u.s = -1) : u.s = 1, o === ~~o && o < 1e7) {
            for (s = 0, a = o; a >= 10; a /= 10)
              s++;
            w ? s > i.maxE ? (u.e = NaN, u.d = null) : s < i.minE ? (u.e = 0, u.d = [0]) : (u.e = s, u.d = [o]) : (u.e = s, u.d = [o]);
            return;
          }
          if (o * 0 !== 0) {
            o || (u.s = NaN), u.e = NaN, u.d = null;
            return;
          }
          return gn(u, o.toString());
        }
        if (l === "string")
          return (a = o.charCodeAt(0)) === 45 ? (o = o.slice(1), u.s = -1) : (a === 43 && (o = o.slice(1)), u.s = 1), Bs.test(o) ? gn(u, o) : Tp(u, o);
        if (l === "bigint")
          return o < 0 ? (o = -o, u.s = -1) : u.s = 1, gn(u, o.toString());
        throw Error(He + o);
      }
      if (i.prototype = m, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.EUCLID = 9, i.config = i.set = $p, i.clone = Ks, i.isDecimal = Ms, i.abs = Rp, i.acos = Ap, i.acosh = Cp, i.add = Ip, i.asin = Dp, i.asinh = Op, i.atan = kp, i.atanh = _p, i.atan2 = Np, i.cbrt = Lp, i.ceil = Fp, i.clamp = Mp, i.cos = qp, i.cosh = Vp, i.div = jp, i.exp = Bp, i.floor = Up, i.hypot = Gp, i.ln = Qp, i.log = Wp, i.log10 = Kp, i.log2 = Jp, i.max = Hp, i.min = Yp, i.mod = zp, i.mul = Zp, i.pow = Xp, i.random = ed, i.round = rd, i.sign = td, i.sin = nd, i.sinh = id, i.sqrt = od, i.sub = sd, i.sum = ad, i.tan = ld, i.tanh = ud, i.trunc = cd, e === void 0 && (e = {}), e && e.defaults !== true)
        for (n = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], r = 0; r < n.length; )
          e.hasOwnProperty(t = n[r++]) || (e[t] = this[t]);
      return i.config(e), i;
    }
    function jp(e, r) {
      return new this(e).div(r);
    }
    function Bp(e) {
      return new this(e).exp();
    }
    function Up(e) {
      return y(e = new this(e), e.e + 1, 3);
    }
    function Gp() {
      var e, r, t = new this(0);
      for (w = false, e = 0; e < arguments.length; )
        if (r = new this(arguments[e++]), r.d)
          t.d && (t = t.plus(r.times(r)));
        else {
          if (r.s)
            return w = true, new this(1 / 0);
          t = r;
        }
      return w = true, t.sqrt();
    }
    function Ms(e) {
      return e instanceof Le || e && e.toStringTag === js || false;
    }
    function Qp(e) {
      return new this(e).ln();
    }
    function Wp(e, r) {
      return new this(e).log(r);
    }
    function Jp(e) {
      return new this(e).log(2);
    }
    function Kp(e) {
      return new this(e).log(10);
    }
    function Hp() {
      return Qs(this, arguments, -1);
    }
    function Yp() {
      return Qs(this, arguments, 1);
    }
    function zp(e, r) {
      return new this(e).mod(r);
    }
    function Zp(e, r) {
      return new this(e).mul(r);
    }
    function Xp(e, r) {
      return new this(e).pow(r);
    }
    function ed(e) {
      var r, t, n, i, o = 0, s = new this(1), a = [];
      if (e === void 0 ? e = this.precision : ne(e, 1, Ye), n = Math.ceil(e / E), this.crypto)
        if (crypto.getRandomValues)
          for (r = crypto.getRandomValues(new Uint32Array(n)); o < n; )
            i = r[o], i >= 429e7 ? r[o] = crypto.getRandomValues(new Uint32Array(1))[0] : a[o++] = i % 1e7;
        else if (crypto.randomBytes) {
          for (r = crypto.randomBytes(n *= 4); o < n; )
            i = r[o] + (r[o + 1] << 8) + (r[o + 2] << 16) + ((r[o + 3] & 127) << 24), i >= 214e7 ? crypto.randomBytes(4).copy(r, o) : (a.push(i % 1e7), o += 4);
          o = n / 4;
        } else
          throw Error(Vs);
      else
        for (; o < n; )
          a[o++] = Math.random() * 1e7 | 0;
      for (n = a[--o], e %= E, n && e && (i = U(10, E - e), a[o] = (n / i | 0) * i); a[o] === 0; o--)
        a.pop();
      if (o < 0)
        t = 0, a = [0];
      else {
        for (t = -1; a[0] === 0; t -= E)
          a.shift();
        for (n = 1, i = a[0]; i >= 10; i /= 10)
          n++;
        n < E && (t -= E - n);
      }
      return s.e = t, s.d = a, s;
    }
    function rd(e) {
      return y(e = new this(e), e.e + 1, this.rounding);
    }
    function td(e) {
      return e = new this(e), e.d ? e.d[0] ? e.s : 0 * e.s : e.s || NaN;
    }
    function nd(e) {
      return new this(e).sin();
    }
    function id(e) {
      return new this(e).sinh();
    }
    function od(e) {
      return new this(e).sqrt();
    }
    function sd(e, r) {
      return new this(e).sub(r);
    }
    function ad() {
      var e = 0, r = arguments, t = new this(r[e]);
      for (w = false; t.s && ++e < r.length; )
        t = t.plus(r[e]);
      return w = true, y(t, this.precision, this.rounding);
    }
    function ld(e) {
      return new this(e).tan();
    }
    function ud(e) {
      return new this(e).tanh();
    }
    function cd(e) {
      return y(e = new this(e), e.e + 1, 1);
    }
    m[Symbol.for("nodejs.util.inspect.custom")] = m.toString;
    m[Symbol.toStringTag] = "Decimal";
    var Le = m.constructor = Ks(Gi);
    hn = new Le(hn);
    yn = new Le(yn);
    var Fe = Le;
    function Sr(e) {
      return Le.isDecimal(e) ? true : e !== null && typeof e == "object" && typeof e.s == "number" && typeof e.e == "number" && typeof e.toFixed == "function" && Array.isArray(e.d);
    }
    var ct = {};
    tr(ct, { ModelAction: () => Rr, datamodelEnumToSchemaEnum: () => pd });
    function pd(e) {
      return { name: e.name, values: e.values.map((r) => r.name) };
    }
    var Rr = ((b) => (b.findUnique = "findUnique", b.findUniqueOrThrow = "findUniqueOrThrow", b.findFirst = "findFirst", b.findFirstOrThrow = "findFirstOrThrow", b.findMany = "findMany", b.create = "create", b.createMany = "createMany", b.createManyAndReturn = "createManyAndReturn", b.update = "update", b.updateMany = "updateMany", b.updateManyAndReturn = "updateManyAndReturn", b.upsert = "upsert", b.delete = "delete", b.deleteMany = "deleteMany", b.groupBy = "groupBy", b.count = "count", b.aggregate = "aggregate", b.findRaw = "findRaw", b.aggregateRaw = "aggregateRaw", b))(Rr || {});
    var Xs = O(Di());
    var Zs = O(__require("fs"));
    var Hs = { keyword: De, entity: De, value: (e) => W(nr(e)), punctuation: nr, directive: De, function: De, variable: (e) => W(nr(e)), string: (e) => W(qe(e)), boolean: Ie, number: De, comment: Hr };
    var dd = (e) => e;
    var vn = {};
    var md = 0;
    var v = { manual: vn.Prism && vn.Prism.manual, disableWorkerMessageHandler: vn.Prism && vn.Prism.disableWorkerMessageHandler, util: { encode: function(e) {
      if (e instanceof ge) {
        let r = e;
        return new ge(r.type, v.util.encode(r.content), r.alias);
      } else
        return Array.isArray(e) ? e.map(v.util.encode) : e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
    }, type: function(e) {
      return Object.prototype.toString.call(e).slice(8, -1);
    }, objId: function(e) {
      return e.__id || Object.defineProperty(e, "__id", { value: ++md }), e.__id;
    }, clone: function e(r, t) {
      let n, i, o = v.util.type(r);
      switch (t = t || {}, o) {
        case "Object":
          if (i = v.util.objId(r), t[i])
            return t[i];
          n = {}, t[i] = n;
          for (let s in r)
            r.hasOwnProperty(s) && (n[s] = e(r[s], t));
          return n;
        case "Array":
          return i = v.util.objId(r), t[i] ? t[i] : (n = [], t[i] = n, r.forEach(function(s, a) {
            n[a] = e(s, t);
          }), n);
        default:
          return r;
      }
    } }, languages: { extend: function(e, r) {
      let t = v.util.clone(v.languages[e]);
      for (let n in r)
        t[n] = r[n];
      return t;
    }, insertBefore: function(e, r, t, n) {
      n = n || v.languages;
      let i = n[e], o = {};
      for (let a in i)
        if (i.hasOwnProperty(a)) {
          if (a == r)
            for (let l in t)
              t.hasOwnProperty(l) && (o[l] = t[l]);
          t.hasOwnProperty(a) || (o[a] = i[a]);
        }
      let s = n[e];
      return n[e] = o, v.languages.DFS(v.languages, function(a, l) {
        l === s && a != e && (this[a] = o);
      }), o;
    }, DFS: function e(r, t, n, i) {
      i = i || {};
      let o = v.util.objId;
      for (let s in r)
        if (r.hasOwnProperty(s)) {
          t.call(r, s, r[s], n || s);
          let a = r[s], l = v.util.type(a);
          l === "Object" && !i[o(a)] ? (i[o(a)] = true, e(a, t, null, i)) : l === "Array" && !i[o(a)] && (i[o(a)] = true, e(a, t, s, i));
        }
    } }, plugins: {}, highlight: function(e, r, t) {
      let n = { code: e, grammar: r, language: t };
      return v.hooks.run("before-tokenize", n), n.tokens = v.tokenize(n.code, n.grammar), v.hooks.run("after-tokenize", n), ge.stringify(v.util.encode(n.tokens), n.language);
    }, matchGrammar: function(e, r, t, n, i, o, s) {
      for (let g in t) {
        if (!t.hasOwnProperty(g) || !t[g])
          continue;
        if (g == s)
          return;
        let I = t[g];
        I = v.util.type(I) === "Array" ? I : [I];
        for (let T = 0; T < I.length; ++T) {
          let S = I[T], b = S.inside, D = !!S.lookbehind, me = !!S.greedy, se = 0, Kr = S.alias;
          if (me && !S.pattern.global) {
            let j = S.pattern.toString().match(/[imuy]*$/)[0];
            S.pattern = RegExp(S.pattern.source, j + "g");
          }
          S = S.pattern || S;
          for (let j = n, te = i; j < r.length; te += r[j].length, ++j) {
            let Ae = r[j];
            if (r.length > e.length)
              return;
            if (Ae instanceof ge)
              continue;
            if (me && j != r.length - 1) {
              S.lastIndex = te;
              var p = S.exec(e);
              if (!p)
                break;
              var c = p.index + (D ? p[1].length : 0), d = p.index + p[0].length, a = j, l = te;
              for (let k = r.length; a < k && (l < d || !r[a].type && !r[a - 1].greedy); ++a)
                l += r[a].length, c >= l && (++j, te = l);
              if (r[j] instanceof ge)
                continue;
              u = a - j, Ae = e.slice(te, l), p.index -= te;
            } else {
              S.lastIndex = 0;
              var p = S.exec(Ae), u = 1;
            }
            if (!p) {
              if (o)
                break;
              continue;
            }
            D && (se = p[1] ? p[1].length : 0);
            var c = p.index + se, p = p[0].slice(se), d = c + p.length, f = Ae.slice(0, c), h = Ae.slice(d);
            let K = [j, u];
            f && (++j, te += f.length, K.push(f));
            let fr = new ge(g, b ? v.tokenize(p, b) : p, Kr, p, me);
            if (K.push(fr), h && K.push(h), Array.prototype.splice.apply(r, K), u != 1 && v.matchGrammar(e, r, t, j, te, true, g), o)
              break;
          }
        }
      }
    }, tokenize: function(e, r) {
      let t = [e], n = r.rest;
      if (n) {
        for (let i in n)
          r[i] = n[i];
        delete r.rest;
      }
      return v.matchGrammar(e, t, r, 0, 0, false), t;
    }, hooks: { all: {}, add: function(e, r) {
      let t = v.hooks.all;
      t[e] = t[e] || [], t[e].push(r);
    }, run: function(e, r) {
      let t = v.hooks.all[e];
      if (!(!t || !t.length))
        for (var n = 0, i; i = t[n++]; )
          i(r);
    } }, Token: ge };
    v.languages.clike = { comment: [{ pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/, lookbehind: true }, { pattern: /(^|[^\\:])\/\/.*/, lookbehind: true, greedy: true }], string: { pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, greedy: true }, "class-name": { pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i, lookbehind: true, inside: { punctuation: /[.\\]/ } }, keyword: /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/, boolean: /\b(?:true|false)\b/, function: /\w+(?=\()/, number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i, operator: /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/, punctuation: /[{}[\];(),.:]/ };
    v.languages.javascript = v.languages.extend("clike", { "class-name": [v.languages.clike["class-name"], { pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/, lookbehind: true }], keyword: [{ pattern: /((?:^|})\s*)(?:catch|finally)\b/, lookbehind: true }, { pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/, lookbehind: true }], number: /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/, function: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/, operator: /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/ });
    v.languages.javascript["class-name"][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;
    v.languages.insertBefore("javascript", "keyword", { regex: { pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*($|[\r\n,.;})\]]))/, lookbehind: true, greedy: true }, "function-variable": { pattern: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/, alias: "function" }, parameter: [{ pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/, lookbehind: true, inside: v.languages.javascript }, { pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i, inside: v.languages.javascript }, { pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/, lookbehind: true, inside: v.languages.javascript }, { pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/, lookbehind: true, inside: v.languages.javascript }], constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/ });
    v.languages.markup && v.languages.markup.tag.addInlined("script", "javascript");
    v.languages.js = v.languages.javascript;
    v.languages.typescript = v.languages.extend("javascript", { keyword: /\b(?:abstract|as|async|await|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|new|null|of|package|private|protected|public|readonly|return|require|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b/, builtin: /\b(?:string|Function|any|number|boolean|Array|symbol|console|Promise|unknown|never)\b/ });
    v.languages.ts = v.languages.typescript;
    function ge(e, r, t, n, i) {
      this.type = e, this.content = r, this.alias = t, this.length = (n || "").length | 0, this.greedy = !!i;
    }
    ge.stringify = function(e, r) {
      return typeof e == "string" ? e : Array.isArray(e) ? e.map(function(t) {
        return ge.stringify(t, r);
      }).join("") : fd(e.type)(e.content);
    };
    function fd(e) {
      return Hs[e] || dd;
    }
    function Ys(e) {
      return gd(e, v.languages.javascript);
    }
    function gd(e, r) {
      return v.tokenize(e, r).map((n) => ge.stringify(n)).join("");
    }
    function zs(e) {
      return Ci(e);
    }
    var Pn = class e {
      constructor(r, t) {
        __publicField(this, "firstLineNumber");
        __publicField(this, "lines");
        this.firstLineNumber = r, this.lines = t;
      }
      static read(r) {
        let t;
        try {
          t = Zs.default.readFileSync(r, "utf-8");
        } catch {
          return null;
        }
        return e.fromContent(t);
      }
      static fromContent(r) {
        let t = r.split(/\r?\n/);
        return new e(1, t);
      }
      get lastLineNumber() {
        return this.firstLineNumber + this.lines.length - 1;
      }
      mapLineAt(r, t) {
        if (r < this.firstLineNumber || r > this.lines.length + this.firstLineNumber)
          return this;
        let n = r - this.firstLineNumber, i = [...this.lines];
        return i[n] = t(i[n]), new e(this.firstLineNumber, i);
      }
      mapLines(r) {
        return new e(this.firstLineNumber, this.lines.map((t, n) => r(t, this.firstLineNumber + n)));
      }
      lineAt(r) {
        return this.lines[r - this.firstLineNumber];
      }
      prependSymbolAt(r, t) {
        return this.mapLines((n, i) => i === r ? `${t} ${n}` : `  ${n}`);
      }
      slice(r, t) {
        let n = this.lines.slice(r - 1, t).join(`
`);
        return new e(r, zs(n).split(`
`));
      }
      highlight() {
        let r = Ys(this.toString());
        return new e(this.firstLineNumber, r.split(`
`));
      }
      toString() {
        return this.lines.join(`
`);
      }
    };
    var hd = { red: ce, gray: Hr, dim: Ce, bold: W, underline: Y, highlightSource: (e) => e.highlight() };
    var yd = { red: (e) => e, gray: (e) => e, dim: (e) => e, bold: (e) => e, underline: (e) => e, highlightSource: (e) => e };
    function bd({ message: e, originalMethod: r, isPanic: t, callArguments: n }) {
      return { functionName: `prisma.${r}()`, message: e, isPanic: t ?? false, callArguments: n };
    }
    function Ed({ callsite: e, message: r, originalMethod: t, isPanic: n, callArguments: i }, o) {
      let s = bd({ message: r, originalMethod: t, isPanic: n, callArguments: i });
      if (!e || typeof window < "u" || process.env.NODE_ENV === "production")
        return s;
      let a = e.getLocation();
      if (!a || !a.lineNumber || !a.columnNumber)
        return s;
      let l = Math.max(1, a.lineNumber - 3), u = Pn.read(a.fileName)?.slice(l, a.lineNumber), c = u?.lineAt(a.lineNumber);
      if (u && c) {
        let p = xd(c), d = wd(c);
        if (!d)
          return s;
        s.functionName = `${d.code})`, s.location = a, n || (u = u.mapLineAt(a.lineNumber, (h) => h.slice(0, d.openingBraceIndex))), u = o.highlightSource(u);
        let f = String(u.lastLineNumber).length;
        if (s.contextLines = u.mapLines((h, g) => o.gray(String(g).padStart(f)) + " " + h).mapLines((h) => o.dim(h)).prependSymbolAt(a.lineNumber, o.bold(o.red("\u2192"))), i) {
          let h = p + f + 1;
          h += 2, s.callArguments = (0, Xs.default)(i, h).slice(h);
        }
      }
      return s;
    }
    function wd(e) {
      let r = Object.keys(Rr).join("|"), n = new RegExp(String.raw`\.(${r})\(`).exec(e);
      if (n) {
        let i = n.index + n[0].length, o = e.lastIndexOf(" ", n.index) + 1;
        return { code: e.slice(o, i), openingBraceIndex: i };
      }
      return null;
    }
    function xd(e) {
      let r = 0;
      for (let t = 0; t < e.length; t++) {
        if (e.charAt(t) !== " ")
          return r;
        r++;
      }
      return r;
    }
    function vd({ functionName: e, location: r, message: t, isPanic: n, contextLines: i, callArguments: o }, s) {
      let a = [""], l = r ? " in" : ":";
      if (n ? (a.push(s.red(`Oops, an unknown error occurred! This is ${s.bold("on us")}, you did nothing wrong.`)), a.push(s.red(`It occurred in the ${s.bold(`\`${e}\``)} invocation${l}`))) : a.push(s.red(`Invalid ${s.bold(`\`${e}\``)} invocation${l}`)), r && a.push(s.underline(Pd(r))), i) {
        a.push("");
        let u = [i.toString()];
        o && (u.push(o), u.push(s.dim(")"))), a.push(u.join("")), o && a.push("");
      } else
        a.push(""), o && a.push(o), a.push("");
      return a.push(t), a.join(`
`);
    }
    function Pd(e) {
      let r = [e.fileName];
      return e.lineNumber && r.push(String(e.lineNumber)), e.columnNumber && r.push(String(e.columnNumber)), r.join(":");
    }
    function Tn(e) {
      let r = e.showColors ? hd : yd, t;
      return t = Ed(e, r), vd(t, r);
    }
    var la = O(Ki());
    function na(e, r, t) {
      let n = ia(e), i = Td(n), o = Rd(i);
      o ? Sn(o, r, t) : r.addErrorMessage(() => "Unknown error");
    }
    function ia(e) {
      return e.errors.flatMap((r) => r.kind === "Union" ? ia(r) : [r]);
    }
    function Td(e) {
      let r = /* @__PURE__ */ new Map(), t = [];
      for (let n of e) {
        if (n.kind !== "InvalidArgumentType") {
          t.push(n);
          continue;
        }
        let i = `${n.selectionPath.join(".")}:${n.argumentPath.join(".")}`, o = r.get(i);
        o ? r.set(i, { ...n, argument: { ...n.argument, typeNames: Sd(o.argument.typeNames, n.argument.typeNames) } }) : r.set(i, n);
      }
      return t.push(...r.values()), t;
    }
    function Sd(e, r) {
      return [...new Set(e.concat(r))];
    }
    function Rd(e) {
      return ji(e, (r, t) => {
        let n = ra(r), i = ra(t);
        return n !== i ? n - i : ta(r) - ta(t);
      });
    }
    function ra(e) {
      let r = 0;
      return Array.isArray(e.selectionPath) && (r += e.selectionPath.length), Array.isArray(e.argumentPath) && (r += e.argumentPath.length), r;
    }
    function ta(e) {
      switch (e.kind) {
        case "InvalidArgumentValue":
        case "ValueTooLarge":
          return 20;
        case "InvalidArgumentType":
          return 10;
        case "RequiredArgumentMissing":
          return -10;
        default:
          return 0;
      }
    }
    var le = class {
      constructor(r, t) {
        __publicField(this, "isRequired", false);
        this.name = r;
        this.value = t;
      }
      makeRequired() {
        return this.isRequired = true, this;
      }
      write(r) {
        let { colors: { green: t } } = r.context;
        r.addMarginSymbol(t(this.isRequired ? "+" : "?")), r.write(t(this.name)), this.isRequired || r.write(t("?")), r.write(t(": ")), typeof this.value == "string" ? r.write(t(this.value)) : r.write(this.value);
      }
    };
    sa();
    var Ar = class {
      constructor(r = 0, t) {
        __publicField(this, "lines", []);
        __publicField(this, "currentLine", "");
        __publicField(this, "currentIndent", 0);
        __publicField(this, "marginSymbol");
        __publicField(this, "afterNextNewLineCallback");
        this.context = t;
        this.currentIndent = r;
      }
      write(r) {
        return typeof r == "string" ? this.currentLine += r : r.write(this), this;
      }
      writeJoined(r, t, n = (i, o) => o.write(i)) {
        let i = t.length - 1;
        for (let o = 0; o < t.length; o++)
          n(t[o], this), o !== i && this.write(r);
        return this;
      }
      writeLine(r) {
        return this.write(r).newLine();
      }
      newLine() {
        this.lines.push(this.indentedCurrentLine()), this.currentLine = "", this.marginSymbol = void 0;
        let r = this.afterNextNewLineCallback;
        return this.afterNextNewLineCallback = void 0, r?.(), this;
      }
      withIndent(r) {
        return this.indent(), r(this), this.unindent(), this;
      }
      afterNextNewline(r) {
        return this.afterNextNewLineCallback = r, this;
      }
      indent() {
        return this.currentIndent++, this;
      }
      unindent() {
        return this.currentIndent > 0 && this.currentIndent--, this;
      }
      addMarginSymbol(r) {
        return this.marginSymbol = r, this;
      }
      toString() {
        return this.lines.concat(this.indentedCurrentLine()).join(`
`);
      }
      getCurrentLineLength() {
        return this.currentLine.length;
      }
      indentedCurrentLine() {
        let r = this.currentLine.padStart(this.currentLine.length + 2 * this.currentIndent);
        return this.marginSymbol ? this.marginSymbol + r.slice(1) : r;
      }
    };
    oa();
    var Rn = class {
      constructor(r) {
        this.value = r;
      }
      write(r) {
        r.write(this.value);
      }
      markAsError() {
        this.value.markAsError();
      }
    };
    var An = (e) => e;
    var Cn = { bold: An, red: An, green: An, dim: An, enabled: false };
    var aa = { bold: W, red: ce, green: qe, dim: Ce, enabled: true };
    var Cr = { write(e) {
      e.writeLine(",");
    } };
    var Pe = class {
      constructor(r) {
        __publicField(this, "isUnderlined", false);
        __publicField(this, "color", (r) => r);
        this.contents = r;
      }
      underline() {
        return this.isUnderlined = true, this;
      }
      setColor(r) {
        return this.color = r, this;
      }
      write(r) {
        let t = r.getCurrentLineLength();
        r.write(this.color(this.contents)), this.isUnderlined && r.afterNextNewline(() => {
          r.write(" ".repeat(t)).writeLine(this.color("~".repeat(this.contents.length)));
        });
      }
    };
    var ze = class {
      constructor() {
        __publicField(this, "hasError", false);
      }
      markAsError() {
        return this.hasError = true, this;
      }
    };
    var Ir = class extends ze {
      constructor() {
        super(...arguments);
        __publicField(this, "items", []);
      }
      addItem(r) {
        return this.items.push(new Rn(r)), this;
      }
      getField(r) {
        return this.items[r];
      }
      getPrintWidth() {
        return this.items.length === 0 ? 2 : Math.max(...this.items.map((t) => t.value.getPrintWidth())) + 2;
      }
      write(r) {
        if (this.items.length === 0) {
          this.writeEmpty(r);
          return;
        }
        this.writeWithItems(r);
      }
      writeEmpty(r) {
        let t = new Pe("[]");
        this.hasError && t.setColor(r.context.colors.red).underline(), r.write(t);
      }
      writeWithItems(r) {
        let { colors: t } = r.context;
        r.writeLine("[").withIndent(() => r.writeJoined(Cr, this.items).newLine()).write("]"), this.hasError && r.afterNextNewline(() => {
          r.writeLine(t.red("~".repeat(this.getPrintWidth())));
        });
      }
      asObject() {
      }
    };
    var Dr = class e extends ze {
      constructor() {
        super(...arguments);
        __publicField(this, "fields", {});
        __publicField(this, "suggestions", []);
      }
      addField(r) {
        this.fields[r.name] = r;
      }
      addSuggestion(r) {
        this.suggestions.push(r);
      }
      getField(r) {
        return this.fields[r];
      }
      getDeepField(r) {
        let [t, ...n] = r, i = this.getField(t);
        if (!i)
          return;
        let o = i;
        for (let s of n) {
          let a;
          if (o.value instanceof e ? a = o.value.getField(s) : o.value instanceof Ir && (a = o.value.getField(Number(s))), !a)
            return;
          o = a;
        }
        return o;
      }
      getDeepFieldValue(r) {
        return r.length === 0 ? this : this.getDeepField(r)?.value;
      }
      hasField(r) {
        return !!this.getField(r);
      }
      removeAllFields() {
        this.fields = {};
      }
      removeField(r) {
        delete this.fields[r];
      }
      getFields() {
        return this.fields;
      }
      isEmpty() {
        return Object.keys(this.fields).length === 0;
      }
      getFieldValue(r) {
        return this.getField(r)?.value;
      }
      getDeepSubSelectionValue(r) {
        let t = this;
        for (let n of r) {
          if (!(t instanceof e))
            return;
          let i = t.getSubSelectionValue(n);
          if (!i)
            return;
          t = i;
        }
        return t;
      }
      getDeepSelectionParent(r) {
        let t = this.getSelectionParent();
        if (!t)
          return;
        let n = t;
        for (let i of r) {
          let o = n.value.getFieldValue(i);
          if (!o || !(o instanceof e))
            return;
          let s = o.getSelectionParent();
          if (!s)
            return;
          n = s;
        }
        return n;
      }
      getSelectionParent() {
        let r = this.getField("select")?.value.asObject();
        if (r)
          return { kind: "select", value: r };
        let t = this.getField("include")?.value.asObject();
        if (t)
          return { kind: "include", value: t };
      }
      getSubSelectionValue(r) {
        return this.getSelectionParent()?.value.fields[r].value;
      }
      getPrintWidth() {
        let r = Object.values(this.fields);
        return r.length == 0 ? 2 : Math.max(...r.map((n) => n.getPrintWidth())) + 2;
      }
      write(r) {
        let t = Object.values(this.fields);
        if (t.length === 0 && this.suggestions.length === 0) {
          this.writeEmpty(r);
          return;
        }
        this.writeWithContents(r, t);
      }
      asObject() {
        return this;
      }
      writeEmpty(r) {
        let t = new Pe("{}");
        this.hasError && t.setColor(r.context.colors.red).underline(), r.write(t);
      }
      writeWithContents(r, t) {
        r.writeLine("{").withIndent(() => {
          r.writeJoined(Cr, [...t, ...this.suggestions]).newLine();
        }), r.write("}"), this.hasError && r.afterNextNewline(() => {
          r.writeLine(r.context.colors.red("~".repeat(this.getPrintWidth())));
        });
      }
    };
    var Q = class extends ze {
      constructor(t) {
        super();
        this.text = t;
      }
      getPrintWidth() {
        return this.text.length;
      }
      write(t) {
        let n = new Pe(this.text);
        this.hasError && n.underline().setColor(t.context.colors.red), t.write(n);
      }
      asObject() {
      }
    };
    var pt = class {
      constructor() {
        __publicField(this, "fields", []);
      }
      addField(r, t) {
        return this.fields.push({ write(n) {
          let { green: i, dim: o } = n.context.colors;
          n.write(i(o(`${r}: ${t}`))).addMarginSymbol(i(o("+")));
        } }), this;
      }
      write(r) {
        let { colors: { green: t } } = r.context;
        r.writeLine(t("{")).withIndent(() => {
          r.writeJoined(Cr, this.fields).newLine();
        }).write(t("}")).addMarginSymbol(t("+"));
      }
    };
    function Sn(e, r, t) {
      switch (e.kind) {
        case "MutuallyExclusiveFields":
          Ad(e, r);
          break;
        case "IncludeOnScalar":
          Cd(e, r);
          break;
        case "EmptySelection":
          Id(e, r, t);
          break;
        case "UnknownSelectionField":
          _d(e, r);
          break;
        case "InvalidSelectionValue":
          Nd(e, r);
          break;
        case "UnknownArgument":
          Ld(e, r);
          break;
        case "UnknownInputField":
          Fd(e, r);
          break;
        case "RequiredArgumentMissing":
          Md(e, r);
          break;
        case "InvalidArgumentType":
          $d(e, r);
          break;
        case "InvalidArgumentValue":
          qd(e, r);
          break;
        case "ValueTooLarge":
          Vd(e, r);
          break;
        case "SomeFieldsMissing":
          jd(e, r);
          break;
        case "TooManyFieldsGiven":
          Bd(e, r);
          break;
        case "Union":
          na(e, r, t);
          break;
        default:
          throw new Error("not implemented: " + e.kind);
      }
    }
    function Ad(e, r) {
      let t = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      t && (t.getField(e.firstField)?.markAsError(), t.getField(e.secondField)?.markAsError()), r.addErrorMessage((n) => `Please ${n.bold("either")} use ${n.green(`\`${e.firstField}\``)} or ${n.green(`\`${e.secondField}\``)}, but ${n.red("not both")} at the same time.`);
    }
    function Cd(e, r) {
      let [t, n] = Or(e.selectionPath), i = e.outputType, o = r.arguments.getDeepSelectionParent(t)?.value;
      if (o && (o.getField(n)?.markAsError(), i))
        for (let s of i.fields)
          s.isRelation && o.addSuggestion(new le(s.name, "true"));
      r.addErrorMessage((s) => {
        let a = `Invalid scalar field ${s.red(`\`${n}\``)} for ${s.bold("include")} statement`;
        return i ? a += ` on model ${s.bold(i.name)}. ${dt(s)}` : a += ".", a += `
Note that ${s.bold("include")} statements only accept relation fields.`, a;
      });
    }
    function Id(e, r, t) {
      let n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      if (n) {
        let i = n.getField("omit")?.value.asObject();
        if (i) {
          Dd(e, r, i);
          return;
        }
        if (n.hasField("select")) {
          Od(e, r);
          return;
        }
      }
      if (t?.[We(e.outputType.name)]) {
        kd(e, r);
        return;
      }
      r.addErrorMessage(() => `Unknown field at "${e.selectionPath.join(".")} selection"`);
    }
    function Dd(e, r, t) {
      t.removeAllFields();
      for (let n of e.outputType.fields)
        t.addSuggestion(new le(n.name, "false"));
      r.addErrorMessage((n) => `The ${n.red("omit")} statement includes every field of the model ${n.bold(e.outputType.name)}. At least one field must be included in the result`);
    }
    function Od(e, r) {
      let t = e.outputType, n = r.arguments.getDeepSelectionParent(e.selectionPath)?.value, i = n?.isEmpty() ?? false;
      n && (n.removeAllFields(), pa(n, t)), r.addErrorMessage((o) => i ? `The ${o.red("`select`")} statement for type ${o.bold(t.name)} must not be empty. ${dt(o)}` : `The ${o.red("`select`")} statement for type ${o.bold(t.name)} needs ${o.bold("at least one truthy value")}.`);
    }
    function kd(e, r) {
      let t = new pt();
      for (let i of e.outputType.fields)
        i.isRelation || t.addField(i.name, "false");
      let n = new le("omit", t).makeRequired();
      if (e.selectionPath.length === 0)
        r.arguments.addSuggestion(n);
      else {
        let [i, o] = Or(e.selectionPath), a = r.arguments.getDeepSelectionParent(i)?.value.asObject()?.getField(o);
        if (a) {
          let l = a?.value.asObject() ?? new Dr();
          l.addSuggestion(n), a.value = l;
        }
      }
      r.addErrorMessage((i) => `The global ${i.red("omit")} configuration excludes every field of the model ${i.bold(e.outputType.name)}. At least one field must be included in the result`);
    }
    function _d(e, r) {
      let t = da(e.selectionPath, r);
      if (t.parentKind !== "unknown") {
        t.field.markAsError();
        let n = t.parent;
        switch (t.parentKind) {
          case "select":
            pa(n, e.outputType);
            break;
          case "include":
            Ud(n, e.outputType);
            break;
          case "omit":
            Gd(n, e.outputType);
            break;
        }
      }
      r.addErrorMessage((n) => {
        let i = [`Unknown field ${n.red(`\`${t.fieldName}\``)}`];
        return t.parentKind !== "unknown" && i.push(`for ${n.bold(t.parentKind)} statement`), i.push(`on model ${n.bold(`\`${e.outputType.name}\``)}.`), i.push(dt(n)), i.join(" ");
      });
    }
    function Nd(e, r) {
      let t = da(e.selectionPath, r);
      t.parentKind !== "unknown" && t.field.value.markAsError(), r.addErrorMessage((n) => `Invalid value for selection field \`${n.red(t.fieldName)}\`: ${e.underlyingError}`);
    }
    function Ld(e, r) {
      let t = e.argumentPath[0], n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      n && (n.getField(t)?.markAsError(), Qd(n, e.arguments)), r.addErrorMessage((i) => ua(i, t, e.arguments.map((o) => o.name)));
    }
    function Fd(e, r) {
      let [t, n] = Or(e.argumentPath), i = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      if (i) {
        i.getDeepField(e.argumentPath)?.markAsError();
        let o = i.getDeepFieldValue(t)?.asObject();
        o && ma(o, e.inputType);
      }
      r.addErrorMessage((o) => ua(o, n, e.inputType.fields.map((s) => s.name)));
    }
    function ua(e, r, t) {
      let n = [`Unknown argument \`${e.red(r)}\`.`], i = Jd(r, t);
      return i && n.push(`Did you mean \`${e.green(i)}\`?`), t.length > 0 && n.push(dt(e)), n.join(" ");
    }
    function Md(e, r) {
      let t;
      r.addErrorMessage((l) => t?.value instanceof Q && t.value.text === "null" ? `Argument \`${l.green(o)}\` must not be ${l.red("null")}.` : `Argument \`${l.green(o)}\` is missing.`);
      let n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      if (!n)
        return;
      let [i, o] = Or(e.argumentPath), s = new pt(), a = n.getDeepFieldValue(i)?.asObject();
      if (a) {
        if (t = a.getField(o), t && a.removeField(o), e.inputTypes.length === 1 && e.inputTypes[0].kind === "object") {
          for (let l of e.inputTypes[0].fields)
            s.addField(l.name, l.typeNames.join(" | "));
          a.addSuggestion(new le(o, s).makeRequired());
        } else {
          let l = e.inputTypes.map(ca).join(" | ");
          a.addSuggestion(new le(o, l).makeRequired());
        }
        if (e.dependentArgumentPath) {
          n.getDeepField(e.dependentArgumentPath)?.markAsError();
          let [, l] = Or(e.dependentArgumentPath);
          r.addErrorMessage((u) => `Argument \`${u.green(o)}\` is required because argument \`${u.green(l)}\` was provided.`);
        }
      }
    }
    function ca(e) {
      return e.kind === "list" ? `${ca(e.elementType)}[]` : e.name;
    }
    function $d(e, r) {
      let t = e.argument.name, n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      n && n.getDeepFieldValue(e.argumentPath)?.markAsError(), r.addErrorMessage((i) => {
        let o = In("or", e.argument.typeNames.map((s) => i.green(s)));
        return `Argument \`${i.bold(t)}\`: Invalid value provided. Expected ${o}, provided ${i.red(e.inferredType)}.`;
      });
    }
    function qd(e, r) {
      let t = e.argument.name, n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      n && n.getDeepFieldValue(e.argumentPath)?.markAsError(), r.addErrorMessage((i) => {
        let o = [`Invalid value for argument \`${i.bold(t)}\``];
        if (e.underlyingError && o.push(`: ${e.underlyingError}`), o.push("."), e.argument.typeNames.length > 0) {
          let s = In("or", e.argument.typeNames.map((a) => i.green(a)));
          o.push(` Expected ${s}.`);
        }
        return o.join("");
      });
    }
    function Vd(e, r) {
      let t = e.argument.name, n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject(), i;
      if (n) {
        let s = n.getDeepField(e.argumentPath)?.value;
        s?.markAsError(), s instanceof Q && (i = s.text);
      }
      r.addErrorMessage((o) => {
        let s = ["Unable to fit value"];
        return i && s.push(o.red(i)), s.push(`into a 64-bit signed integer for field \`${o.bold(t)}\``), s.join(" ");
      });
    }
    function jd(e, r) {
      let t = e.argumentPath[e.argumentPath.length - 1], n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject();
      if (n) {
        let i = n.getDeepFieldValue(e.argumentPath)?.asObject();
        i && ma(i, e.inputType);
      }
      r.addErrorMessage((i) => {
        let o = [`Argument \`${i.bold(t)}\` of type ${i.bold(e.inputType.name)} needs`];
        return e.constraints.minFieldCount === 1 ? e.constraints.requiredFields ? o.push(`${i.green("at least one of")} ${In("or", e.constraints.requiredFields.map((s) => `\`${i.bold(s)}\``))} arguments.`) : o.push(`${i.green("at least one")} argument.`) : o.push(`${i.green(`at least ${e.constraints.minFieldCount}`)} arguments.`), o.push(dt(i)), o.join(" ");
      });
    }
    function Bd(e, r) {
      let t = e.argumentPath[e.argumentPath.length - 1], n = r.arguments.getDeepSubSelectionValue(e.selectionPath)?.asObject(), i = [];
      if (n) {
        let o = n.getDeepFieldValue(e.argumentPath)?.asObject();
        o && (o.markAsError(), i = Object.keys(o.getFields()));
      }
      r.addErrorMessage((o) => {
        let s = [`Argument \`${o.bold(t)}\` of type ${o.bold(e.inputType.name)} needs`];
        return e.constraints.minFieldCount === 1 && e.constraints.maxFieldCount == 1 ? s.push(`${o.green("exactly one")} argument,`) : e.constraints.maxFieldCount == 1 ? s.push(`${o.green("at most one")} argument,`) : s.push(`${o.green(`at most ${e.constraints.maxFieldCount}`)} arguments,`), s.push(`but you provided ${In("and", i.map((a) => o.red(a)))}. Please choose`), e.constraints.maxFieldCount === 1 ? s.push("one.") : s.push(`${e.constraints.maxFieldCount}.`), s.join(" ");
      });
    }
    function pa(e, r) {
      for (let t of r.fields)
        e.hasField(t.name) || e.addSuggestion(new le(t.name, "true"));
    }
    function Ud(e, r) {
      for (let t of r.fields)
        t.isRelation && !e.hasField(t.name) && e.addSuggestion(new le(t.name, "true"));
    }
    function Gd(e, r) {
      for (let t of r.fields)
        !e.hasField(t.name) && !t.isRelation && e.addSuggestion(new le(t.name, "true"));
    }
    function Qd(e, r) {
      for (let t of r)
        e.hasField(t.name) || e.addSuggestion(new le(t.name, t.typeNames.join(" | ")));
    }
    function da(e, r) {
      let [t, n] = Or(e), i = r.arguments.getDeepSubSelectionValue(t)?.asObject();
      if (!i)
        return { parentKind: "unknown", fieldName: n };
      let o = i.getFieldValue("select")?.asObject(), s = i.getFieldValue("include")?.asObject(), a = i.getFieldValue("omit")?.asObject(), l = o?.getField(n);
      return o && l ? { parentKind: "select", parent: o, field: l, fieldName: n } : (l = s?.getField(n), s && l ? { parentKind: "include", field: l, parent: s, fieldName: n } : (l = a?.getField(n), a && l ? { parentKind: "omit", field: l, parent: a, fieldName: n } : { parentKind: "unknown", fieldName: n }));
    }
    function ma(e, r) {
      if (r.kind === "object")
        for (let t of r.fields)
          e.hasField(t.name) || e.addSuggestion(new le(t.name, t.typeNames.join(" | ")));
    }
    function Or(e) {
      let r = [...e], t = r.pop();
      if (!t)
        throw new Error("unexpected empty path");
      return [r, t];
    }
    function dt({ green: e, enabled: r }) {
      return "Available options are " + (r ? `listed in ${e("green")}` : "marked with ?") + ".";
    }
    function In(e, r) {
      if (r.length === 1)
        return r[0];
      let t = [...r], n = t.pop();
      return `${t.join(", ")} ${e} ${n}`;
    }
    var Wd = 3;
    function Jd(e, r) {
      let t = 1 / 0, n;
      for (let i of r) {
        let o = (0, la.default)(e, i);
        o > Wd || o < t && (t = o, n = i);
      }
      return n;
    }
    var mt = class {
      constructor(r, t, n, i, o) {
        __publicField(this, "modelName");
        __publicField(this, "name");
        __publicField(this, "typeName");
        __publicField(this, "isList");
        __publicField(this, "isEnum");
        this.modelName = r, this.name = t, this.typeName = n, this.isList = i, this.isEnum = o;
      }
      _toGraphQLInputType() {
        let r = this.isList ? "List" : "", t = this.isEnum ? "Enum" : "";
        return `${r}${t}${this.typeName}FieldRefInput<${this.modelName}>`;
      }
    };
    function kr(e) {
      return e instanceof mt;
    }
    var Dn = Symbol();
    var Yi = /* @__PURE__ */ new WeakMap();
    var Me = class {
      constructor(r) {
        r === Dn ? Yi.set(this, `Prisma.${this._getName()}`) : Yi.set(this, `new Prisma.${this._getNamespace()}.${this._getName()}()`);
      }
      _getName() {
        return this.constructor.name;
      }
      toString() {
        return Yi.get(this);
      }
    };
    var ft = class extends Me {
      _getNamespace() {
        return "NullTypes";
      }
    };
    var _e, _a2;
    var gt = (_a2 = class extends ft {
      constructor() {
        super(...arguments);
        __privateAdd(this, _e, void 0);
      }
    }, _e = new WeakMap(), _a2);
    zi(gt, "DbNull");
    var _e2, _a3;
    var ht = (_a3 = class extends ft {
      constructor() {
        super(...arguments);
        __privateAdd(this, _e2, void 0);
      }
    }, _e2 = new WeakMap(), _a3);
    zi(ht, "JsonNull");
    var _e3, _a4;
    var yt = (_a4 = class extends ft {
      constructor() {
        super(...arguments);
        __privateAdd(this, _e3, void 0);
      }
    }, _e3 = new WeakMap(), _a4);
    zi(yt, "AnyNull");
    var On = { classes: { DbNull: gt, JsonNull: ht, AnyNull: yt }, instances: { DbNull: new gt(Dn), JsonNull: new ht(Dn), AnyNull: new yt(Dn) } };
    function zi(e, r) {
      Object.defineProperty(e, "name", { value: r, configurable: true });
    }
    var fa = ": ";
    var kn = class {
      constructor(r, t) {
        __publicField(this, "hasError", false);
        this.name = r;
        this.value = t;
      }
      markAsError() {
        this.hasError = true;
      }
      getPrintWidth() {
        return this.name.length + this.value.getPrintWidth() + fa.length;
      }
      write(r) {
        let t = new Pe(this.name);
        this.hasError && t.underline().setColor(r.context.colors.red), r.write(t).write(fa).write(this.value);
      }
    };
    var Zi = class {
      constructor(r) {
        __publicField(this, "arguments");
        __publicField(this, "errorMessages", []);
        this.arguments = r;
      }
      write(r) {
        r.write(this.arguments);
      }
      addErrorMessage(r) {
        this.errorMessages.push(r);
      }
      renderAllMessages(r) {
        return this.errorMessages.map((t) => t(r)).join(`
`);
      }
    };
    function _r(e) {
      return new Zi(ga(e));
    }
    function ga(e) {
      let r = new Dr();
      for (let [t, n] of Object.entries(e)) {
        let i = new kn(t, ha(n));
        r.addField(i);
      }
      return r;
    }
    function ha(e) {
      if (typeof e == "string")
        return new Q(JSON.stringify(e));
      if (typeof e == "number" || typeof e == "boolean")
        return new Q(String(e));
      if (typeof e == "bigint")
        return new Q(`${e}n`);
      if (e === null)
        return new Q("null");
      if (e === void 0)
        return new Q("undefined");
      if (Sr(e))
        return new Q(`new Prisma.Decimal("${e.toFixed()}")`);
      if (e instanceof Uint8Array)
        return Buffer.isBuffer(e) ? new Q(`Buffer.alloc(${e.byteLength})`) : new Q(`new Uint8Array(${e.byteLength})`);
      if (e instanceof Date) {
        let r = mn(e) ? e.toISOString() : "Invalid Date";
        return new Q(`new Date("${r}")`);
      }
      return e instanceof Me ? new Q(`Prisma.${e._getName()}`) : kr(e) ? new Q(`prisma.${We(e.modelName)}.$fields.${e.name}`) : Array.isArray(e) ? Kd(e) : typeof e == "object" ? ga(e) : new Q(Object.prototype.toString.call(e));
    }
    function Kd(e) {
      let r = new Ir();
      for (let t of e)
        r.addItem(ha(t));
      return r;
    }
    function _n(e, r) {
      let t = r === "pretty" ? aa : Cn, n = e.renderAllMessages(t), i = new Ar(0, { colors: t }).write(e).toString();
      return { message: n, args: i };
    }
    function Nn({ args: e, errors: r, errorFormat: t, callsite: n, originalMethod: i, clientVersion: o, globalOmit: s }) {
      let a = _r(e);
      for (let p of r)
        Sn(p, a, s);
      let { message: l, args: u } = _n(a, t), c = Tn({ message: l, callsite: n, originalMethod: i, showColors: t === "pretty", callArguments: u });
      throw new Z(c, { clientVersion: o });
    }
    function Te(e) {
      return e.replace(/^./, (r) => r.toLowerCase());
    }
    function ba(e, r, t) {
      let n = Te(t);
      return !r.result || !(r.result.$allModels || r.result[n]) ? e : Hd({ ...e, ...ya(r.name, e, r.result.$allModels), ...ya(r.name, e, r.result[n]) });
    }
    function Hd(e) {
      let r = new we(), t = (n, i) => r.getOrCreate(n, () => i.has(n) ? [n] : (i.add(n), e[n] ? e[n].needs.flatMap((o) => t(o, i)) : [n]));
      return pn(e, (n) => ({ ...n, needs: t(n.name, /* @__PURE__ */ new Set()) }));
    }
    function ya(e, r, t) {
      return t ? pn(t, ({ needs: n, compute: i }, o) => ({ name: o, needs: n ? Object.keys(n).filter((s) => n[s]) : [], compute: Yd(r, o, i) })) : {};
    }
    function Yd(e, r, t) {
      let n = e?.[r]?.compute;
      return n ? (i) => t({ ...i, [r]: n(i) }) : t;
    }
    function Ea(e, r) {
      if (!r)
        return e;
      let t = { ...e };
      for (let n of Object.values(r))
        if (e[n.name])
          for (let i of n.needs)
            t[i] = true;
      return t;
    }
    function wa(e, r) {
      if (!r)
        return e;
      let t = { ...e };
      for (let n of Object.values(r))
        if (!e[n.name])
          for (let i of n.needs)
            delete t[i];
      return t;
    }
    var Ln = class {
      constructor(r, t) {
        __publicField(this, "computedFieldsCache", new we());
        __publicField(this, "modelExtensionsCache", new we());
        __publicField(this, "queryCallbacksCache", new we());
        __publicField(this, "clientExtensions", lt(() => this.extension.client ? { ...this.previous?.getAllClientExtensions(), ...this.extension.client } : this.previous?.getAllClientExtensions()));
        __publicField(this, "batchCallbacks", lt(() => {
          let r = this.previous?.getAllBatchQueryCallbacks() ?? [], t = this.extension.query?.$__internalBatch;
          return t ? r.concat(t) : r;
        }));
        this.extension = r;
        this.previous = t;
      }
      getAllComputedFields(r) {
        return this.computedFieldsCache.getOrCreate(r, () => ba(this.previous?.getAllComputedFields(r), this.extension, r));
      }
      getAllClientExtensions() {
        return this.clientExtensions.get();
      }
      getAllModelExtensions(r) {
        return this.modelExtensionsCache.getOrCreate(r, () => {
          let t = Te(r);
          return !this.extension.model || !(this.extension.model[t] || this.extension.model.$allModels) ? this.previous?.getAllModelExtensions(r) : { ...this.previous?.getAllModelExtensions(r), ...this.extension.model.$allModels, ...this.extension.model[t] };
        });
      }
      getAllQueryCallbacks(r, t) {
        return this.queryCallbacksCache.getOrCreate(`${r}:${t}`, () => {
          let n = this.previous?.getAllQueryCallbacks(r, t) ?? [], i = [], o = this.extension.query;
          return !o || !(o[r] || o.$allModels || o[t] || o.$allOperations) ? n : (o[r] !== void 0 && (o[r][t] !== void 0 && i.push(o[r][t]), o[r].$allOperations !== void 0 && i.push(o[r].$allOperations)), r !== "$none" && o.$allModels !== void 0 && (o.$allModels[t] !== void 0 && i.push(o.$allModels[t]), o.$allModels.$allOperations !== void 0 && i.push(o.$allModels.$allOperations)), o[t] !== void 0 && i.push(o[t]), o.$allOperations !== void 0 && i.push(o.$allOperations), n.concat(i));
        });
      }
      getAllBatchQueryCallbacks() {
        return this.batchCallbacks.get();
      }
    };
    var Nr = class e {
      constructor(r) {
        this.head = r;
      }
      static empty() {
        return new e();
      }
      static single(r) {
        return new e(new Ln(r));
      }
      isEmpty() {
        return this.head === void 0;
      }
      append(r) {
        return new e(new Ln(r, this.head));
      }
      getAllComputedFields(r) {
        return this.head?.getAllComputedFields(r);
      }
      getAllClientExtensions() {
        return this.head?.getAllClientExtensions();
      }
      getAllModelExtensions(r) {
        return this.head?.getAllModelExtensions(r);
      }
      getAllQueryCallbacks(r, t) {
        return this.head?.getAllQueryCallbacks(r, t) ?? [];
      }
      getAllBatchQueryCallbacks() {
        return this.head?.getAllBatchQueryCallbacks() ?? [];
      }
    };
    var Fn = class {
      constructor(r) {
        this.name = r;
      }
    };
    function xa(e) {
      return e instanceof Fn;
    }
    function va(e) {
      return new Fn(e);
    }
    var Pa = Symbol();
    var bt = class {
      constructor(r) {
        if (r !== Pa)
          throw new Error("Skip instance can not be constructed directly");
      }
      ifUndefined(r) {
        return r === void 0 ? Mn : r;
      }
    };
    var Mn = new bt(Pa);
    function Se(e) {
      return e instanceof bt;
    }
    var zd = { findUnique: "findUnique", findUniqueOrThrow: "findUniqueOrThrow", findFirst: "findFirst", findFirstOrThrow: "findFirstOrThrow", findMany: "findMany", count: "aggregate", create: "createOne", createMany: "createMany", createManyAndReturn: "createManyAndReturn", update: "updateOne", updateMany: "updateMany", updateManyAndReturn: "updateManyAndReturn", upsert: "upsertOne", delete: "deleteOne", deleteMany: "deleteMany", executeRaw: "executeRaw", queryRaw: "queryRaw", aggregate: "aggregate", groupBy: "groupBy", runCommandRaw: "runCommandRaw", findRaw: "findRaw", aggregateRaw: "aggregateRaw" };
    var Ta = "explicitly `undefined` values are not allowed";
    function $n({ modelName: e, action: r, args: t, runtimeDataModel: n, extensions: i = Nr.empty(), callsite: o, clientMethod: s, errorFormat: a, clientVersion: l, previewFeatures: u, globalOmit: c }) {
      let p = new Xi({ runtimeDataModel: n, modelName: e, action: r, rootArgs: t, callsite: o, extensions: i, selectionPath: [], argumentPath: [], originalMethod: s, errorFormat: a, clientVersion: l, previewFeatures: u, globalOmit: c });
      return { modelName: e, action: zd[r], query: Et(t, p) };
    }
    function Et({ select: e, include: r, ...t } = {}, n) {
      let i = t.omit;
      return delete t.omit, { arguments: Ra(t, n), selection: Zd(e, r, i, n) };
    }
    function Zd(e, r, t, n) {
      return e ? (r ? n.throwValidationError({ kind: "MutuallyExclusiveFields", firstField: "include", secondField: "select", selectionPath: n.getSelectionPath() }) : t && n.throwValidationError({ kind: "MutuallyExclusiveFields", firstField: "omit", secondField: "select", selectionPath: n.getSelectionPath() }), tm(e, n)) : Xd(n, r, t);
    }
    function Xd(e, r, t) {
      let n = {};
      return e.modelOrType && !e.isRawAction() && (n.$composites = true, n.$scalars = true), r && em(n, r, e), rm(n, t, e), n;
    }
    function em(e, r, t) {
      for (let [n, i] of Object.entries(r)) {
        if (Se(i))
          continue;
        let o = t.nestSelection(n);
        if (eo(i, o), i === false || i === void 0) {
          e[n] = false;
          continue;
        }
        let s = t.findField(n);
        if (s && s.kind !== "object" && t.throwValidationError({ kind: "IncludeOnScalar", selectionPath: t.getSelectionPath().concat(n), outputType: t.getOutputTypeDescription() }), s) {
          e[n] = Et(i === true ? {} : i, o);
          continue;
        }
        if (i === true) {
          e[n] = true;
          continue;
        }
        e[n] = Et(i, o);
      }
    }
    function rm(e, r, t) {
      let n = t.getComputedFields(), i = { ...t.getGlobalOmit(), ...r }, o = wa(i, n);
      for (let [s, a] of Object.entries(o)) {
        if (Se(a))
          continue;
        eo(a, t.nestSelection(s));
        let l = t.findField(s);
        n?.[s] && !l || (e[s] = !a);
      }
    }
    function tm(e, r) {
      let t = {}, n = r.getComputedFields(), i = Ea(e, n);
      for (let [o, s] of Object.entries(i)) {
        if (Se(s))
          continue;
        let a = r.nestSelection(o);
        eo(s, a);
        let l = r.findField(o);
        if (!(n?.[o] && !l)) {
          if (s === false || s === void 0 || Se(s)) {
            t[o] = false;
            continue;
          }
          if (s === true) {
            l?.kind === "object" ? t[o] = Et({}, a) : t[o] = true;
            continue;
          }
          t[o] = Et(s, a);
        }
      }
      return t;
    }
    function Sa(e, r) {
      if (e === null)
        return null;
      if (typeof e == "string" || typeof e == "number" || typeof e == "boolean")
        return e;
      if (typeof e == "bigint")
        return { $type: "BigInt", value: String(e) };
      if (vr(e)) {
        if (mn(e))
          return { $type: "DateTime", value: e.toISOString() };
        r.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: r.getSelectionPath(), argumentPath: r.getArgumentPath(), argument: { name: r.getArgumentName(), typeNames: ["Date"] }, underlyingError: "Provided Date object is invalid" });
      }
      if (xa(e))
        return { $type: "Param", value: e.name };
      if (kr(e))
        return { $type: "FieldRef", value: { _ref: e.name, _container: e.modelName } };
      if (Array.isArray(e))
        return nm(e, r);
      if (ArrayBuffer.isView(e)) {
        let { buffer: t, byteOffset: n, byteLength: i } = e;
        return { $type: "Bytes", value: Buffer.from(t, n, i).toString("base64") };
      }
      if (im(e))
        return e.values;
      if (Sr(e))
        return { $type: "Decimal", value: e.toFixed() };
      if (e instanceof Me) {
        if (e !== On.instances[e._getName()])
          throw new Error("Invalid ObjectEnumValue");
        return { $type: "Enum", value: e._getName() };
      }
      if (om(e))
        return e.toJSON();
      if (typeof e == "object")
        return Ra(e, r);
      r.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: r.getSelectionPath(), argumentPath: r.getArgumentPath(), argument: { name: r.getArgumentName(), typeNames: [] }, underlyingError: `We could not serialize ${Object.prototype.toString.call(e)} value. Serialize the object to JSON or implement a ".toJSON()" method on it` });
    }
    function Ra(e, r) {
      if (e.$type)
        return { $type: "Raw", value: e };
      let t = {};
      for (let n in e) {
        let i = e[n], o = r.nestArgument(n);
        Se(i) || (i !== void 0 ? t[n] = Sa(i, o) : r.isPreviewFeatureOn("strictUndefinedChecks") && r.throwValidationError({ kind: "InvalidArgumentValue", argumentPath: o.getArgumentPath(), selectionPath: r.getSelectionPath(), argument: { name: r.getArgumentName(), typeNames: [] }, underlyingError: Ta }));
      }
      return t;
    }
    function nm(e, r) {
      let t = [];
      for (let n = 0; n < e.length; n++) {
        let i = r.nestArgument(String(n)), o = e[n];
        if (o === void 0 || Se(o)) {
          let s = o === void 0 ? "undefined" : "Prisma.skip";
          r.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: i.getSelectionPath(), argumentPath: i.getArgumentPath(), argument: { name: `${r.getArgumentName()}[${n}]`, typeNames: [] }, underlyingError: `Can not use \`${s}\` value within array. Use \`null\` or filter out \`${s}\` values` });
        }
        t.push(Sa(o, i));
      }
      return t;
    }
    function im(e) {
      return typeof e == "object" && e !== null && e.__prismaRawParameters__ === true;
    }
    function om(e) {
      return typeof e == "object" && e !== null && typeof e.toJSON == "function";
    }
    function eo(e, r) {
      e === void 0 && r.isPreviewFeatureOn("strictUndefinedChecks") && r.throwValidationError({ kind: "InvalidSelectionValue", selectionPath: r.getSelectionPath(), underlyingError: Ta });
    }
    var Xi = class e {
      constructor(r) {
        __publicField(this, "modelOrType");
        this.params = r;
        this.params.modelName && (this.modelOrType = this.params.runtimeDataModel.models[this.params.modelName] ?? this.params.runtimeDataModel.types[this.params.modelName]);
      }
      throwValidationError(r) {
        Nn({ errors: [r], originalMethod: this.params.originalMethod, args: this.params.rootArgs ?? {}, callsite: this.params.callsite, errorFormat: this.params.errorFormat, clientVersion: this.params.clientVersion, globalOmit: this.params.globalOmit });
      }
      getSelectionPath() {
        return this.params.selectionPath;
      }
      getArgumentPath() {
        return this.params.argumentPath;
      }
      getArgumentName() {
        return this.params.argumentPath[this.params.argumentPath.length - 1];
      }
      getOutputTypeDescription() {
        if (!(!this.params.modelName || !this.modelOrType))
          return { name: this.params.modelName, fields: this.modelOrType.fields.map((r) => ({ name: r.name, typeName: "boolean", isRelation: r.kind === "object" })) };
      }
      isRawAction() {
        return ["executeRaw", "queryRaw", "runCommandRaw", "findRaw", "aggregateRaw"].includes(this.params.action);
      }
      isPreviewFeatureOn(r) {
        return this.params.previewFeatures.includes(r);
      }
      getComputedFields() {
        if (this.params.modelName)
          return this.params.extensions.getAllComputedFields(this.params.modelName);
      }
      findField(r) {
        return this.modelOrType?.fields.find((t) => t.name === r);
      }
      nestSelection(r) {
        let t = this.findField(r), n = t?.kind === "object" ? t.type : void 0;
        return new e({ ...this.params, modelName: n, selectionPath: this.params.selectionPath.concat(r) });
      }
      getGlobalOmit() {
        return this.params.modelName && this.shouldApplyGlobalOmit() ? this.params.globalOmit?.[We(this.params.modelName)] ?? {} : {};
      }
      shouldApplyGlobalOmit() {
        switch (this.params.action) {
          case "findFirst":
          case "findFirstOrThrow":
          case "findUniqueOrThrow":
          case "findMany":
          case "upsert":
          case "findUnique":
          case "createManyAndReturn":
          case "create":
          case "update":
          case "updateManyAndReturn":
          case "delete":
            return true;
          case "executeRaw":
          case "aggregateRaw":
          case "runCommandRaw":
          case "findRaw":
          case "createMany":
          case "deleteMany":
          case "groupBy":
          case "updateMany":
          case "count":
          case "aggregate":
          case "queryRaw":
            return false;
          default:
            ar(this.params.action, "Unknown action");
        }
      }
      nestArgument(r) {
        return new e({ ...this.params, argumentPath: this.params.argumentPath.concat(r) });
      }
    };
    function Aa(e) {
      if (!e._hasPreviewFlag("metrics"))
        throw new Z("`metrics` preview feature must be enabled in order to access metrics API", { clientVersion: e._clientVersion });
    }
    var Lr = class {
      constructor(r) {
        __publicField(this, "_client");
        this._client = r;
      }
      prometheus(r) {
        return Aa(this._client), this._client._engine.metrics({ format: "prometheus", ...r });
      }
      json(r) {
        return Aa(this._client), this._client._engine.metrics({ format: "json", ...r });
      }
    };
    function Ca(e, r) {
      let t = lt(() => sm(r));
      Object.defineProperty(e, "dmmf", { get: () => t.get() });
    }
    function sm(e) {
      return { datamodel: { models: ro(e.models), enums: ro(e.enums), types: ro(e.types) } };
    }
    function ro(e) {
      return Object.entries(e).map(([r, t]) => ({ name: r, ...t }));
    }
    var to = /* @__PURE__ */ new WeakMap();
    var qn = "$$PrismaTypedSql";
    var wt = class {
      constructor(r, t) {
        to.set(this, { sql: r, values: t }), Object.defineProperty(this, qn, { value: qn });
      }
      get sql() {
        return to.get(this).sql;
      }
      get values() {
        return to.get(this).values;
      }
    };
    function Ia(e) {
      return (...r) => new wt(e, r);
    }
    function Vn(e) {
      return e != null && e[qn] === qn;
    }
    var cu = O(Ti());
    var pu = __require("async_hooks");
    var du = __require("events");
    var mu = O(__require("fs"));
    var ri = O(__require("path"));
    var ie = class e {
      constructor(r, t) {
        if (r.length - 1 !== t.length)
          throw r.length === 0 ? new TypeError("Expected at least 1 string") : new TypeError(`Expected ${r.length} strings to have ${r.length - 1} values`);
        let n = t.reduce((s, a) => s + (a instanceof e ? a.values.length : 1), 0);
        this.values = new Array(n), this.strings = new Array(n + 1), this.strings[0] = r[0];
        let i = 0, o = 0;
        for (; i < t.length; ) {
          let s = t[i++], a = r[i];
          if (s instanceof e) {
            this.strings[o] += s.strings[0];
            let l = 0;
            for (; l < s.values.length; )
              this.values[o++] = s.values[l++], this.strings[o] = s.strings[l];
            this.strings[o] += a;
          } else
            this.values[o++] = s, this.strings[o] = a;
        }
      }
      get sql() {
        let r = this.strings.length, t = 1, n = this.strings[0];
        for (; t < r; )
          n += `?${this.strings[t++]}`;
        return n;
      }
      get statement() {
        let r = this.strings.length, t = 1, n = this.strings[0];
        for (; t < r; )
          n += `:${t}${this.strings[t++]}`;
        return n;
      }
      get text() {
        let r = this.strings.length, t = 1, n = this.strings[0];
        for (; t < r; )
          n += `$${t}${this.strings[t++]}`;
        return n;
      }
      inspect() {
        return { sql: this.sql, statement: this.statement, text: this.text, values: this.values };
      }
    };
    function Da(e, r = ",", t = "", n = "") {
      if (e.length === 0)
        throw new TypeError("Expected `join([])` to be called with an array of multiple elements, but got an empty array");
      return new ie([t, ...Array(e.length - 1).fill(r), n], e);
    }
    function no(e) {
      return new ie([e], []);
    }
    var Oa = no("");
    function io(e, ...r) {
      return new ie(e, r);
    }
    function xt(e) {
      return { getKeys() {
        return Object.keys(e);
      }, getPropertyValue(r) {
        return e[r];
      } };
    }
    function re(e, r) {
      return { getKeys() {
        return [e];
      }, getPropertyValue() {
        return r();
      } };
    }
    function lr(e) {
      let r = new we();
      return { getKeys() {
        return e.getKeys();
      }, getPropertyValue(t) {
        return r.getOrCreate(t, () => e.getPropertyValue(t));
      }, getPropertyDescriptor(t) {
        return e.getPropertyDescriptor?.(t);
      } };
    }
    var jn = { enumerable: true, configurable: true, writable: true };
    function Bn(e) {
      let r = new Set(e);
      return { getPrototypeOf: () => Object.prototype, getOwnPropertyDescriptor: () => jn, has: (t, n) => r.has(n), set: (t, n, i) => r.add(n) && Reflect.set(t, n, i), ownKeys: () => [...r] };
    }
    var ka = Symbol.for("nodejs.util.inspect.custom");
    function he(e, r) {
      let t = am(r), n = /* @__PURE__ */ new Set(), i = new Proxy(e, { get(o, s) {
        if (n.has(s))
          return o[s];
        let a = t.get(s);
        return a ? a.getPropertyValue(s) : o[s];
      }, has(o, s) {
        if (n.has(s))
          return true;
        let a = t.get(s);
        return a ? a.has?.(s) ?? true : Reflect.has(o, s);
      }, ownKeys(o) {
        let s = _a(Reflect.ownKeys(o), t), a = _a(Array.from(t.keys()), t);
        return [.../* @__PURE__ */ new Set([...s, ...a, ...n])];
      }, set(o, s, a) {
        return t.get(s)?.getPropertyDescriptor?.(s)?.writable === false ? false : (n.add(s), Reflect.set(o, s, a));
      }, getOwnPropertyDescriptor(o, s) {
        let a = Reflect.getOwnPropertyDescriptor(o, s);
        if (a && !a.configurable)
          return a;
        let l = t.get(s);
        return l ? l.getPropertyDescriptor ? { ...jn, ...l?.getPropertyDescriptor(s) } : jn : a;
      }, defineProperty(o, s, a) {
        return n.add(s), Reflect.defineProperty(o, s, a);
      }, getPrototypeOf: () => Object.prototype });
      return i[ka] = function() {
        let o = { ...this };
        return delete o[ka], o;
      }, i;
    }
    function am(e) {
      let r = /* @__PURE__ */ new Map();
      for (let t of e) {
        let n = t.getKeys();
        for (let i of n)
          r.set(i, t);
      }
      return r;
    }
    function _a(e, r) {
      return e.filter((t) => r.get(t)?.has?.(t) ?? true);
    }
    function Fr(e) {
      return { getKeys() {
        return e;
      }, has() {
        return false;
      }, getPropertyValue() {
      } };
    }
    function Mr(e, r) {
      return { batch: e, transaction: r?.kind === "batch" ? { isolationLevel: r.options.isolationLevel } : void 0 };
    }
    function Na(e) {
      if (e === void 0)
        return "";
      let r = _r(e);
      return new Ar(0, { colors: Cn }).write(r).toString();
    }
    var lm = "P2037";
    function $r({ error: e, user_facing_error: r }, t, n) {
      return r.error_code ? new z2(um(r, n), { code: r.error_code, clientVersion: t, meta: r.meta, batchRequestIdx: r.batch_request_idx }) : new V(e, { clientVersion: t, batchRequestIdx: r.batch_request_idx });
    }
    function um(e, r) {
      let t = e.message;
      return (r === "postgresql" || r === "postgres" || r === "mysql") && e.error_code === lm && (t += `
Prisma Accelerate has built-in connection pooling to prevent such errors: https://pris.ly/client/error-accelerate`), t;
    }
    var vt = "<unknown>";
    function La(e) {
      var r = e.split(`
`);
      return r.reduce(function(t, n) {
        var i = dm(n) || fm(n) || ym(n) || xm(n) || Em(n);
        return i && t.push(i), t;
      }, []);
    }
    var cm = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|rsc|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
    var pm = /\((\S*)(?::(\d+))(?::(\d+))\)/;
    function dm(e) {
      var r = cm.exec(e);
      if (!r)
        return null;
      var t = r[2] && r[2].indexOf("native") === 0, n = r[2] && r[2].indexOf("eval") === 0, i = pm.exec(r[2]);
      return n && i != null && (r[2] = i[1], r[3] = i[2], r[4] = i[3]), { file: t ? null : r[2], methodName: r[1] || vt, arguments: t ? [r[2]] : [], lineNumber: r[3] ? +r[3] : null, column: r[4] ? +r[4] : null };
    }
    var mm = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|rsc|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
    function fm(e) {
      var r = mm.exec(e);
      return r ? { file: r[2], methodName: r[1] || vt, arguments: [], lineNumber: +r[3], column: r[4] ? +r[4] : null } : null;
    }
    var gm = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|rsc|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i;
    var hm = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
    function ym(e) {
      var r = gm.exec(e);
      if (!r)
        return null;
      var t = r[3] && r[3].indexOf(" > eval") > -1, n = hm.exec(r[3]);
      return t && n != null && (r[3] = n[1], r[4] = n[2], r[5] = null), { file: r[3], methodName: r[1] || vt, arguments: r[2] ? r[2].split(",") : [], lineNumber: r[4] ? +r[4] : null, column: r[5] ? +r[5] : null };
    }
    var bm = /^\s*(?:([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
    function Em(e) {
      var r = bm.exec(e);
      return r ? { file: r[3], methodName: r[1] || vt, arguments: [], lineNumber: +r[4], column: r[5] ? +r[5] : null } : null;
    }
    var wm = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
    function xm(e) {
      var r = wm.exec(e);
      return r ? { file: r[2], methodName: r[1] || vt, arguments: [], lineNumber: +r[3], column: r[4] ? +r[4] : null } : null;
    }
    var oo = class {
      getLocation() {
        return null;
      }
    };
    var so = class {
      constructor() {
        __publicField(this, "_error");
        this._error = new Error();
      }
      getLocation() {
        let r = this._error.stack;
        if (!r)
          return null;
        let n = La(r).find((i) => {
          if (!i.file)
            return false;
          let o = Li(i.file);
          return o !== "<anonymous>" && !o.includes("@prisma") && !o.includes("/packages/client/src/runtime/") && !o.endsWith("/runtime/binary.js") && !o.endsWith("/runtime/library.js") && !o.endsWith("/runtime/edge.js") && !o.endsWith("/runtime/edge-esm.js") && !o.startsWith("internal/") && !i.methodName.includes("new ") && !i.methodName.includes("getCallSite") && !i.methodName.includes("Proxy.") && i.methodName.split(".").length < 4;
        });
        return !n || !n.file ? null : { fileName: n.file, lineNumber: n.lineNumber, columnNumber: n.column };
      }
    };
    function Ze(e) {
      return e === "minimal" ? typeof $EnabledCallSite == "function" && e !== "minimal" ? new $EnabledCallSite() : new oo() : new so();
    }
    var Fa = { _avg: true, _count: true, _sum: true, _min: true, _max: true };
    function qr(e = {}) {
      let r = Pm(e);
      return Object.entries(r).reduce((n, [i, o]) => (Fa[i] !== void 0 ? n.select[i] = { select: o } : n[i] = o, n), { select: {} });
    }
    function Pm(e = {}) {
      return typeof e._count == "boolean" ? { ...e, _count: { _all: e._count } } : e;
    }
    function Un(e = {}) {
      return (r) => (typeof e._count == "boolean" && (r._count = r._count._all), r);
    }
    function Ma(e, r) {
      let t = Un(e);
      return r({ action: "aggregate", unpacker: t, argsMapper: qr })(e);
    }
    function Tm(e = {}) {
      let { select: r, ...t } = e;
      return typeof r == "object" ? qr({ ...t, _count: r }) : qr({ ...t, _count: { _all: true } });
    }
    function Sm(e = {}) {
      return typeof e.select == "object" ? (r) => Un(e)(r)._count : (r) => Un(e)(r)._count._all;
    }
    function $a(e, r) {
      return r({ action: "count", unpacker: Sm(e), argsMapper: Tm })(e);
    }
    function Rm(e = {}) {
      let r = qr(e);
      if (Array.isArray(r.by))
        for (let t of r.by)
          typeof t == "string" && (r.select[t] = true);
      else
        typeof r.by == "string" && (r.select[r.by] = true);
      return r;
    }
    function Am(e = {}) {
      return (r) => (typeof e?._count == "boolean" && r.forEach((t) => {
        t._count = t._count._all;
      }), r);
    }
    function qa(e, r) {
      return r({ action: "groupBy", unpacker: Am(e), argsMapper: Rm })(e);
    }
    function Va(e, r, t) {
      if (r === "aggregate")
        return (n) => Ma(n, t);
      if (r === "count")
        return (n) => $a(n, t);
      if (r === "groupBy")
        return (n) => qa(n, t);
    }
    function ja(e, r) {
      let t = r.fields.filter((i) => !i.relationName), n = _s(t, "name");
      return new Proxy({}, { get(i, o) {
        if (o in i || typeof o == "symbol")
          return i[o];
        let s = n[o];
        if (s)
          return new mt(e, o, s.type, s.isList, s.kind === "enum");
      }, ...Bn(Object.keys(n)) });
    }
    var Ba = (e) => Array.isArray(e) ? e : e.split(".");
    var ao = (e, r) => Ba(r).reduce((t, n) => t && t[n], e);
    var Ua = (e, r, t) => Ba(r).reduceRight((n, i, o, s) => Object.assign({}, ao(e, s.slice(0, o)), { [i]: n }), t);
    function Cm(e, r) {
      return e === void 0 || r === void 0 ? [] : [...r, "select", e];
    }
    function Im(e, r, t) {
      return r === void 0 ? e ?? {} : Ua(r, t, e || true);
    }
    function lo(e, r, t, n, i, o) {
      let a = e._runtimeDataModel.models[r].fields.reduce((l, u) => ({ ...l, [u.name]: u }), {});
      return (l) => {
        let u = Ze(e._errorFormat), c = Cm(n, i), p = Im(l, o, c), d = t({ dataPath: c, callsite: u })(p), f = Dm(e, r);
        return new Proxy(d, { get(h, g) {
          if (!f.includes(g))
            return h[g];
          let T = [a[g].type, t, g], S = [c, p];
          return lo(e, ...T, ...S);
        }, ...Bn([...f, ...Object.getOwnPropertyNames(d)]) });
      };
    }
    function Dm(e, r) {
      return e._runtimeDataModel.models[r].fields.filter((t) => t.kind === "object").map((t) => t.name);
    }
    var Om = ["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "create", "update", "upsert", "delete"];
    var km = ["aggregate", "count", "groupBy"];
    function uo(e, r) {
      let t = e._extensions.getAllModelExtensions(r) ?? {}, n = [_m(e, r), Lm(e, r), xt(t), re("name", () => r), re("$name", () => r), re("$parent", () => e._appliedParent)];
      return he({}, n);
    }
    function _m(e, r) {
      let t = Te(r), n = Object.keys(Rr).concat("count");
      return { getKeys() {
        return n;
      }, getPropertyValue(i) {
        let o = i, s = (a) => (l) => {
          let u = Ze(e._errorFormat);
          return e._createPrismaPromise((c) => {
            let p = { args: l, dataPath: [], action: o, model: r, clientMethod: `${t}.${i}`, jsModelName: t, transaction: c, callsite: u };
            return e._request({ ...p, ...a });
          }, { action: o, args: l, model: r });
        };
        return Om.includes(o) ? lo(e, r, s) : Nm(i) ? Va(e, i, s) : s({});
      } };
    }
    function Nm(e) {
      return km.includes(e);
    }
    function Lm(e, r) {
      return lr(re("fields", () => {
        let t = e._runtimeDataModel.models[r];
        return ja(r, t);
      }));
    }
    function Ga(e) {
      return e.replace(/^./, (r) => r.toUpperCase());
    }
    var co = Symbol();
    function Pt(e) {
      let r = [Fm(e), Mm(e), re(co, () => e), re("$parent", () => e._appliedParent)], t = e._extensions.getAllClientExtensions();
      return t && r.push(xt(t)), he(e, r);
    }
    function Fm(e) {
      let r = Object.getPrototypeOf(e._originalClient), t = [...new Set(Object.getOwnPropertyNames(r))];
      return { getKeys() {
        return t;
      }, getPropertyValue(n) {
        return e[n];
      } };
    }
    function Mm(e) {
      let r = Object.keys(e._runtimeDataModel.models), t = r.map(Te), n = [...new Set(r.concat(t))];
      return lr({ getKeys() {
        return n;
      }, getPropertyValue(i) {
        let o = Ga(i);
        if (e._runtimeDataModel.models[o] !== void 0)
          return uo(e, o);
        if (e._runtimeDataModel.models[i] !== void 0)
          return uo(e, i);
      }, getPropertyDescriptor(i) {
        if (!t.includes(i))
          return { enumerable: false };
      } });
    }
    function Qa(e) {
      return e[co] ? e[co] : e;
    }
    function Wa(e) {
      if (typeof e == "function")
        return e(this);
      if (e.client?.__AccelerateEngine) {
        let t = e.client.__AccelerateEngine;
        this._originalClient._engine = new t(this._originalClient._accelerateEngineConfig);
      }
      let r = Object.create(this._originalClient, { _extensions: { value: this._extensions.append(e) }, _appliedParent: { value: this, configurable: true }, $on: { value: void 0 } });
      return Pt(r);
    }
    function Ja({ result: e, modelName: r, select: t, omit: n, extensions: i }) {
      let o = i.getAllComputedFields(r);
      if (!o)
        return e;
      let s = [], a = [];
      for (let l of Object.values(o)) {
        if (n) {
          if (n[l.name])
            continue;
          let u = l.needs.filter((c) => n[c]);
          u.length > 0 && a.push(Fr(u));
        } else if (t) {
          if (!t[l.name])
            continue;
          let u = l.needs.filter((c) => !t[c]);
          u.length > 0 && a.push(Fr(u));
        }
        $m(e, l.needs) && s.push(qm(l, he(e, s)));
      }
      return s.length > 0 || a.length > 0 ? he(e, [...s, ...a]) : e;
    }
    function $m(e, r) {
      return r.every((t) => Vi(e, t));
    }
    function qm(e, r) {
      return lr(re(e.name, () => e.compute(r)));
    }
    function Gn({ visitor: e, result: r, args: t, runtimeDataModel: n, modelName: i }) {
      if (Array.isArray(r)) {
        for (let s = 0; s < r.length; s++)
          r[s] = Gn({ result: r[s], args: t, modelName: i, runtimeDataModel: n, visitor: e });
        return r;
      }
      let o = e(r, i, t) ?? r;
      return t.include && Ka({ includeOrSelect: t.include, result: o, parentModelName: i, runtimeDataModel: n, visitor: e }), t.select && Ka({ includeOrSelect: t.select, result: o, parentModelName: i, runtimeDataModel: n, visitor: e }), o;
    }
    function Ka({ includeOrSelect: e, result: r, parentModelName: t, runtimeDataModel: n, visitor: i }) {
      for (let [o, s] of Object.entries(e)) {
        if (!s || r[o] == null || Se(s))
          continue;
        let l = n.models[t].fields.find((c) => c.name === o);
        if (!l || l.kind !== "object" || !l.relationName)
          continue;
        let u = typeof s == "object" ? s : {};
        r[o] = Gn({ visitor: i, result: r[o], args: u, modelName: l.type, runtimeDataModel: n });
      }
    }
    function Ha({ result: e, modelName: r, args: t, extensions: n, runtimeDataModel: i, globalOmit: o }) {
      return n.isEmpty() || e == null || typeof e != "object" || !i.models[r] ? e : Gn({ result: e, args: t ?? {}, modelName: r, runtimeDataModel: i, visitor: (a, l, u) => {
        let c = Te(l);
        return Ja({ result: a, modelName: c, select: u.select, omit: u.select ? void 0 : { ...o?.[c], ...u.omit }, extensions: n });
      } });
    }
    var Vm = ["$connect", "$disconnect", "$on", "$transaction", "$extends"];
    var Ya = Vm;
    function za(e) {
      if (e instanceof ie)
        return jm(e);
      if (Vn(e))
        return Bm(e);
      if (Array.isArray(e)) {
        let t = [e[0]];
        for (let n = 1; n < e.length; n++)
          t[n] = Tt(e[n]);
        return t;
      }
      let r = {};
      for (let t in e)
        r[t] = Tt(e[t]);
      return r;
    }
    function jm(e) {
      return new ie(e.strings, e.values);
    }
    function Bm(e) {
      return new wt(e.sql, e.values);
    }
    function Tt(e) {
      if (typeof e != "object" || e == null || e instanceof Me || kr(e))
        return e;
      if (Sr(e))
        return new Fe(e.toFixed());
      if (vr(e))
        return /* @__PURE__ */ new Date(+e);
      if (ArrayBuffer.isView(e))
        return e.slice(0);
      if (Array.isArray(e)) {
        let r = e.length, t;
        for (t = Array(r); r--; )
          t[r] = Tt(e[r]);
        return t;
      }
      if (typeof e == "object") {
        let r = {};
        for (let t in e)
          t === "__proto__" ? Object.defineProperty(r, t, { value: Tt(e[t]), configurable: true, enumerable: true, writable: true }) : r[t] = Tt(e[t]);
        return r;
      }
      ar(e, "Unknown value");
    }
    function Xa(e, r, t, n = 0) {
      return e._createPrismaPromise((i) => {
        let o = r.customDataProxyFetch;
        return "transaction" in r && i !== void 0 && (r.transaction?.kind === "batch" && r.transaction.lock.then(), r.transaction = i), n === t.length ? e._executeRequest(r) : t[n]({ model: r.model, operation: r.model ? r.action : r.clientMethod, args: za(r.args ?? {}), __internalParams: r, query: (s, a = r) => {
          let l = a.customDataProxyFetch;
          return a.customDataProxyFetch = nl(o, l), a.args = s, Xa(e, a, t, n + 1);
        } });
      });
    }
    function el(e, r) {
      let { jsModelName: t, action: n, clientMethod: i } = r, o = t ? n : i;
      if (e._extensions.isEmpty())
        return e._executeRequest(r);
      let s = e._extensions.getAllQueryCallbacks(t ?? "$none", o);
      return Xa(e, r, s);
    }
    function rl(e) {
      return (r) => {
        let t = { requests: r }, n = r[0].extensions.getAllBatchQueryCallbacks();
        return n.length ? tl(t, n, 0, e) : e(t);
      };
    }
    function tl(e, r, t, n) {
      if (t === r.length)
        return n(e);
      let i = e.customDataProxyFetch, o = e.requests[0].transaction;
      return r[t]({ args: { queries: e.requests.map((s) => ({ model: s.modelName, operation: s.action, args: s.args })), transaction: o ? { isolationLevel: o.kind === "batch" ? o.isolationLevel : void 0 } : void 0 }, __internalParams: e, query(s, a = e) {
        let l = a.customDataProxyFetch;
        return a.customDataProxyFetch = nl(i, l), tl(a, r, t + 1, n);
      } });
    }
    var Za = (e) => e;
    function nl(e = Za, r = Za) {
      return (t) => e(r(t));
    }
    var il = N("prisma:client");
    var ol = { Vercel: "vercel", "Netlify CI": "netlify" };
    function sl({ postinstall: e, ciName: r, clientVersion: t, generator: n }) {
      if (il("checkPlatformCaching:postinstall", e), il("checkPlatformCaching:ciName", r), e === true && !(n?.output && typeof (n.output.fromEnvVar ?? n.output.value) == "string") && r && r in ol) {
        let i = `Prisma has detected that this project was built on ${r}, which caches dependencies. This leads to an outdated Prisma Client because Prisma's auto-generation isn't triggered. To fix this, make sure to run the \`prisma generate\` command during the build process.

Learn how: https://pris.ly/d/${ol[r]}-build`;
        throw console.error(i), new P(i, t);
      }
    }
    function al(e, r) {
      return e ? e.datasources ? e.datasources : e.datasourceUrl ? { [r[0]]: { url: e.datasourceUrl } } : {} : {};
    }
    var dl = O(__require("fs"));
    var St = O(__require("path"));
    function Qn(e) {
      let { runtimeBinaryTarget: r } = e;
      return `Add "${r}" to \`binaryTargets\` in the "schema.prisma" file and run \`prisma generate\` after saving it:

${Um(e)}`;
    }
    function Um(e) {
      let { generator: r, generatorBinaryTargets: t, runtimeBinaryTarget: n } = e, i = { fromEnvVar: null, value: n }, o = [...t, i];
      return ki({ ...r, binaryTargets: o });
    }
    function Xe(e) {
      let { runtimeBinaryTarget: r } = e;
      return `Prisma Client could not locate the Query Engine for runtime "${r}".`;
    }
    function er(e) {
      let { searchedLocations: r } = e;
      return `The following locations have been searched:
${[...new Set(r)].map((i) => `  ${i}`).join(`
`)}`;
    }
    function ll(e) {
      let { runtimeBinaryTarget: r } = e;
      return `${Xe(e)}

This happened because \`binaryTargets\` have been pinned, but the actual deployment also required "${r}".
${Qn(e)}

${er(e)}`;
    }
    function Wn(e) {
      return `We would appreciate if you could take the time to share some information with us.
Please help us by answering a few questions: https://pris.ly/${e}`;
    }
    function Jn(e) {
      let { errorStack: r } = e;
      return r?.match(/\/\.next|\/next@|\/next\//) ? `

We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.` : "";
    }
    function ul(e) {
      let { queryEngineName: r } = e;
      return `${Xe(e)}${Jn(e)}

This is likely caused by a bundler that has not copied "${r}" next to the resulting bundle.
Ensure that "${r}" has been copied next to the bundle or in "${e.expectedLocation}".

${Wn("engine-not-found-bundler-investigation")}

${er(e)}`;
    }
    function cl(e) {
      let { runtimeBinaryTarget: r, generatorBinaryTargets: t } = e, n = t.find((i) => i.native);
      return `${Xe(e)}

This happened because Prisma Client was generated for "${n?.value ?? "unknown"}", but the actual deployment required "${r}".
${Qn(e)}

${er(e)}`;
    }
    function pl(e) {
      let { queryEngineName: r } = e;
      return `${Xe(e)}${Jn(e)}

This is likely caused by tooling that has not copied "${r}" to the deployment folder.
Ensure that you ran \`prisma generate\` and that "${r}" has been copied to "${e.expectedLocation}".

${Wn("engine-not-found-tooling-investigation")}

${er(e)}`;
    }
    var Gm = N("prisma:client:engines:resolveEnginePath");
    var Qm = () => new RegExp("runtime[\\\\/]library\\.m?js$");
    async function ml(e, r) {
      let t = { binary: process.env.PRISMA_QUERY_ENGINE_BINARY, library: process.env.PRISMA_QUERY_ENGINE_LIBRARY }[e] ?? r.prismaPath;
      if (t !== void 0)
        return t;
      let { enginePath: n, searchedLocations: i } = await Wm(e, r);
      if (Gm("enginePath", n), n !== void 0)
        return r.prismaPath = n;
      let o = await ir(), s = r.generator?.binaryTargets ?? [], a = s.some((d) => d.native), l = !s.some((d) => d.value === o), u = __filename.match(Qm()) === null, c = { searchedLocations: i, generatorBinaryTargets: s, generator: r.generator, runtimeBinaryTarget: o, queryEngineName: fl(e, o), expectedLocation: St.default.relative(process.cwd(), r.dirname), errorStack: new Error().stack }, p;
      throw a && l ? p = cl(c) : l ? p = ll(c) : u ? p = ul(c) : p = pl(c), new P(p, r.clientVersion);
    }
    async function Wm(e, r) {
      let t = await ir(), n = [], i = [r.dirname, St.default.resolve(__dirname, ".."), r.generator?.output?.value ?? __dirname, St.default.resolve(__dirname, "../../../.prisma/client"), "/tmp/prisma-engines", r.cwd];
      __filename.includes("resolveEnginePath") && i.push(ms());
      for (let o of i) {
        let s = fl(e, t), a = St.default.join(o, s);
        if (n.push(o), dl.default.existsSync(a))
          return { enginePath: a, searchedLocations: n };
      }
      return { enginePath: void 0, searchedLocations: n };
    }
    function fl(e, r) {
      return Gt(r) ;
    }
    function gl(e) {
      return e ? e.replace(/".*"/g, '"X"').replace(/[\s:\[]([+-]?([0-9]*[.])?[0-9]+)/g, (r) => `${r[0]}5`) : "";
    }
    function hl(e) {
      return e.split(`
`).map((r) => r.replace(/^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)\s*/, "").replace(/\+\d+\s*ms$/, "")).join(`
`);
    }
    var yl = O(Os());
    function bl({ title: e, user: r = "prisma", repo: t = "prisma", template: n = "bug_report.yml", body: i }) {
      return (0, yl.default)({ user: r, repo: t, template: n, title: e, body: i });
    }
    function El({ version: e, binaryTarget: r, title: t, description: n, engineVersion: i, database: o, query: s }) {
      let a = Bo(6e3 - (s?.length ?? 0)), l = hl(wr(a)), u = n ? `# Description
\`\`\`
${n}
\`\`\`` : "", c = wr(`Hi Prisma Team! My Prisma Client just crashed. This is the report:
## Versions

| Name            | Version            |
|-----------------|--------------------|
| Node            | ${process.version?.padEnd(19)}| 
| OS              | ${r?.padEnd(19)}|
| Prisma Client   | ${e?.padEnd(19)}|
| Query Engine    | ${i?.padEnd(19)}|
| Database        | ${o?.padEnd(19)}|

${u}

## Logs
\`\`\`
${l}
\`\`\`

## Client Snippet
\`\`\`ts
// PLEASE FILL YOUR CODE SNIPPET HERE
\`\`\`

## Schema
\`\`\`prisma
// PLEASE ADD YOUR SCHEMA HERE IF POSSIBLE
\`\`\`

## Prisma Engine Query
\`\`\`
${s ? gl(s) : ""}
\`\`\`
`), p = bl({ title: t, body: c });
      return `${t}

This is a non-recoverable error which probably happens when the Prisma Query Engine has a panic.

${Y(p)}

If you want the Prisma team to look into it, please open the link above \u{1F64F}
To increase the chance of success, please post your schema and a snippet of
how you used Prisma Client in the issue. 
`;
    }
    function wl(e, r) {
      throw new Error(r);
    }
    function Jm(e) {
      return e !== null && typeof e == "object" && typeof e.$type == "string";
    }
    function Km(e, r) {
      let t = {};
      for (let n of Object.keys(e))
        t[n] = r(e[n], n);
      return t;
    }
    function Vr(e) {
      return e === null ? e : Array.isArray(e) ? e.map(Vr) : typeof e == "object" ? Jm(e) ? Hm(e) : e.constructor !== null && e.constructor.name !== "Object" ? e : Km(e, Vr) : e;
    }
    function Hm({ $type: e, value: r }) {
      switch (e) {
        case "BigInt":
          return BigInt(r);
        case "Bytes": {
          let { buffer: t, byteOffset: n, byteLength: i } = Buffer.from(r, "base64");
          return new Uint8Array(t, n, i);
        }
        case "DateTime":
          return new Date(r);
        case "Decimal":
          return new Le(r);
        case "Json":
          return JSON.parse(r);
        default:
          wl(r, "Unknown tagged value");
      }
    }
    var xl = "6.16.3";
    var zm = () => globalThis.process?.release?.name === "node";
    var Zm = () => !!globalThis.Bun || !!globalThis.process?.versions?.bun;
    var Xm = () => !!globalThis.Deno;
    var ef = () => typeof globalThis.Netlify == "object";
    var rf = () => typeof globalThis.EdgeRuntime == "object";
    var tf = () => globalThis.navigator?.userAgent === "Cloudflare-Workers";
    function nf() {
      return [[ef, "netlify"], [rf, "edge-light"], [tf, "workerd"], [Xm, "deno"], [Zm, "bun"], [zm, "node"]].flatMap((t) => t[0]() ? [t[1]] : []).at(0) ?? "";
    }
    var of = { node: "Node.js", workerd: "Cloudflare Workers", deno: "Deno and Deno Deploy", netlify: "Netlify Edge Functions", "edge-light": "Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)" };
    function Kn() {
      let e = nf();
      return { id: e, prettyName: of[e] || e, isEdge: ["workerd", "deno", "netlify", "edge-light"].includes(e) };
    }
    function jr({ inlineDatasources: e, overrideDatasources: r, env: t, clientVersion: n }) {
      let i, o = Object.keys(e)[0], s = e[o]?.url, a = r[o]?.url;
      if (o === void 0 ? i = void 0 : a ? i = a : s?.value ? i = s.value : s?.fromEnvVar && (i = t[s.fromEnvVar]), s?.fromEnvVar !== void 0 && i === void 0)
        throw new P(`error: Environment variable not found: ${s.fromEnvVar}.`, n);
      if (i === void 0)
        throw new P("error: Missing URL environment variable, value, or override.", n);
      return i;
    }
    var Hn = class extends Error {
      constructor(r, t) {
        super(r);
        __publicField(this, "clientVersion");
        __publicField(this, "cause");
        this.clientVersion = t.clientVersion, this.cause = t.cause;
      }
      get [Symbol.toStringTag]() {
        return this.name;
      }
    };
    var oe = class extends Hn {
      constructor(r, t) {
        super(r, t);
        __publicField(this, "isRetryable");
        this.isRetryable = t.isRetryable ?? true;
      }
    };
    function R(e, r) {
      return { ...e, isRetryable: r };
    }
    var ur = class extends oe {
      constructor(r, t) {
        super(r, R(t, false));
        __publicField(this, "name", "InvalidDatasourceError");
        __publicField(this, "code", "P6001");
      }
    };
    x(ur, "InvalidDatasourceError");
    function vl(e) {
      let r = { clientVersion: e.clientVersion }, t = Object.keys(e.inlineDatasources)[0], n = jr({ inlineDatasources: e.inlineDatasources, overrideDatasources: e.overrideDatasources, clientVersion: e.clientVersion, env: { ...e.env, ...typeof process < "u" ? process.env : {} } }), i;
      try {
        i = new URL(n);
      } catch {
        throw new ur(`Error validating datasource \`${t}\`: the URL must start with the protocol \`prisma://\``, r);
      }
      let { protocol: o, searchParams: s } = i;
      if (o !== "prisma:" && o !== sn)
        throw new ur(`Error validating datasource \`${t}\`: the URL must start with the protocol \`prisma://\` or \`prisma+postgres://\``, r);
      let a = s.get("api_key");
      if (a === null || a.length < 1)
        throw new ur(`Error validating datasource \`${t}\`: the URL must contain a valid API key`, r);
      let l = Ii(i) ? "http:" : "https:";
      process.env.TEST_CLIENT_ENGINE_REMOTE_EXECUTOR && i.searchParams.has("use_http") && (l = "http:");
      let u = new URL(i.href.replace(o, l));
      return { apiKey: a, url: u };
    }
    var Pl = O(on());
    var _e4, e_fn, _a5;
    var Yn = (_a5 = class {
      constructor({ apiKey: r, tracingHelper: t, logLevel: n, logQueries: i, engineHash: o }) {
        __privateAdd(this, _e4);
        __publicField(this, "apiKey");
        __publicField(this, "tracingHelper");
        __publicField(this, "logLevel");
        __publicField(this, "logQueries");
        __publicField(this, "engineHash");
        this.apiKey = r, this.tracingHelper = t, this.logLevel = n, this.logQueries = i, this.engineHash = o;
      }
      build({ traceparent: r, transactionId: t } = {}) {
        let n = { Accept: "application/json", Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "Prisma-Engine-Hash": this.engineHash, "Prisma-Engine-Version": Pl.enginesVersion };
        this.tracingHelper.isEnabled() && (n.traceparent = r ?? this.tracingHelper.getTraceParent()), t && (n["X-Transaction-Id"] = t);
        let i = __privateMethod(this, _e4, e_fn).call(this);
        return i.length > 0 && (n["X-Capture-Telemetry"] = i.join(", ")), n;
      }
    }, _e4 = new WeakSet(), e_fn = function() {
      let r = [];
      return this.tracingHelper.isEnabled() && r.push("tracing"), this.logLevel && r.push(this.logLevel), this.logQueries && r.push("query"), r;
    }, _a5);
    function sf(e) {
      return e[0] * 1e3 + e[1] / 1e6;
    }
    function po(e) {
      return new Date(sf(e));
    }
    var Br = class extends oe {
      constructor(r) {
        super("This request must be retried", R(r, true));
        __publicField(this, "name", "ForcedRetryError");
        __publicField(this, "code", "P5001");
      }
    };
    x(Br, "ForcedRetryError");
    var cr = class extends oe {
      constructor(r, t) {
        super(r, R(t, false));
        __publicField(this, "name", "NotImplementedYetError");
        __publicField(this, "code", "P5004");
      }
    };
    x(cr, "NotImplementedYetError");
    var $ = class extends oe {
      constructor(r, t) {
        super(r, t);
        __publicField(this, "response");
        this.response = t.response;
        let n = this.response.headers.get("prisma-request-id");
        if (n) {
          let i = `(The request id was: ${n})`;
          this.message = this.message + " " + i;
        }
      }
    };
    var pr = class extends $ {
      constructor(r) {
        super("Schema needs to be uploaded", R(r, true));
        __publicField(this, "name", "SchemaMissingError");
        __publicField(this, "code", "P5005");
      }
    };
    x(pr, "SchemaMissingError");
    var mo = "This request could not be understood by the server";
    var Rt = class extends $ {
      constructor(r, t, n) {
        super(t || mo, R(r, false));
        __publicField(this, "name", "BadRequestError");
        __publicField(this, "code", "P5000");
        n && (this.code = n);
      }
    };
    x(Rt, "BadRequestError");
    var At = class extends $ {
      constructor(r, t) {
        super("Engine not started: healthcheck timeout", R(r, true));
        __publicField(this, "name", "HealthcheckTimeoutError");
        __publicField(this, "code", "P5013");
        __publicField(this, "logs");
        this.logs = t;
      }
    };
    x(At, "HealthcheckTimeoutError");
    var Ct = class extends $ {
      constructor(r, t, n) {
        super(t, R(r, true));
        __publicField(this, "name", "EngineStartupError");
        __publicField(this, "code", "P5014");
        __publicField(this, "logs");
        this.logs = n;
      }
    };
    x(Ct, "EngineStartupError");
    var It = class extends $ {
      constructor(r) {
        super("Engine version is not supported", R(r, false));
        __publicField(this, "name", "EngineVersionNotSupportedError");
        __publicField(this, "code", "P5012");
      }
    };
    x(It, "EngineVersionNotSupportedError");
    var fo = "Request timed out";
    var Dt = class extends $ {
      constructor(r, t = fo) {
        super(t, R(r, false));
        __publicField(this, "name", "GatewayTimeoutError");
        __publicField(this, "code", "P5009");
      }
    };
    x(Dt, "GatewayTimeoutError");
    var af = "Interactive transaction error";
    var Ot = class extends $ {
      constructor(r, t = af) {
        super(t, R(r, false));
        __publicField(this, "name", "InteractiveTransactionError");
        __publicField(this, "code", "P5015");
      }
    };
    x(Ot, "InteractiveTransactionError");
    var lf = "Request parameters are invalid";
    var kt = class extends $ {
      constructor(r, t = lf) {
        super(t, R(r, false));
        __publicField(this, "name", "InvalidRequestError");
        __publicField(this, "code", "P5011");
      }
    };
    x(kt, "InvalidRequestError");
    var go = "Requested resource does not exist";
    var _t = class extends $ {
      constructor(r, t = go) {
        super(t, R(r, false));
        __publicField(this, "name", "NotFoundError");
        __publicField(this, "code", "P5003");
      }
    };
    x(_t, "NotFoundError");
    var ho = "Unknown server error";
    var Ur = class extends $ {
      constructor(r, t, n) {
        super(t || ho, R(r, true));
        __publicField(this, "name", "ServerError");
        __publicField(this, "code", "P5006");
        __publicField(this, "logs");
        this.logs = n;
      }
    };
    x(Ur, "ServerError");
    var yo = "Unauthorized, check your connection string";
    var Nt = class extends $ {
      constructor(r, t = yo) {
        super(t, R(r, false));
        __publicField(this, "name", "UnauthorizedError");
        __publicField(this, "code", "P5007");
      }
    };
    x(Nt, "UnauthorizedError");
    var bo = "Usage exceeded, retry again later";
    var Lt = class extends $ {
      constructor(r, t = bo) {
        super(t, R(r, true));
        __publicField(this, "name", "UsageExceededError");
        __publicField(this, "code", "P5008");
      }
    };
    x(Lt, "UsageExceededError");
    async function uf(e) {
      let r;
      try {
        r = await e.text();
      } catch {
        return { type: "EmptyError" };
      }
      try {
        let t = JSON.parse(r);
        if (typeof t == "string")
          switch (t) {
            case "InternalDataProxyError":
              return { type: "DataProxyError", body: t };
            default:
              return { type: "UnknownTextError", body: t };
          }
        if (typeof t == "object" && t !== null) {
          if ("is_panic" in t && "message" in t && "error_code" in t)
            return { type: "QueryEngineError", body: t };
          if ("EngineNotStarted" in t || "InteractiveTransactionMisrouted" in t || "InvalidRequestError" in t) {
            let n = Object.values(t)[0].reason;
            return typeof n == "string" && !["SchemaMissing", "EngineVersionNotSupported"].includes(n) ? { type: "UnknownJsonError", body: t } : { type: "DataProxyError", body: t };
          }
        }
        return { type: "UnknownJsonError", body: t };
      } catch {
        return r === "" ? { type: "EmptyError" } : { type: "UnknownTextError", body: r };
      }
    }
    async function Ft(e, r) {
      if (e.ok)
        return;
      let t = { clientVersion: r, response: e }, n = await uf(e);
      if (n.type === "QueryEngineError")
        throw new z2(n.body.message, { code: n.body.error_code, clientVersion: r });
      if (n.type === "DataProxyError") {
        if (n.body === "InternalDataProxyError")
          throw new Ur(t, "Internal Data Proxy error");
        if ("EngineNotStarted" in n.body) {
          if (n.body.EngineNotStarted.reason === "SchemaMissing")
            return new pr(t);
          if (n.body.EngineNotStarted.reason === "EngineVersionNotSupported")
            throw new It(t);
          if ("EngineStartupError" in n.body.EngineNotStarted.reason) {
            let { msg: i, logs: o } = n.body.EngineNotStarted.reason.EngineStartupError;
            throw new Ct(t, i, o);
          }
          if ("KnownEngineStartupError" in n.body.EngineNotStarted.reason) {
            let { msg: i, error_code: o } = n.body.EngineNotStarted.reason.KnownEngineStartupError;
            throw new P(i, r, o);
          }
          if ("HealthcheckTimeout" in n.body.EngineNotStarted.reason) {
            let { logs: i } = n.body.EngineNotStarted.reason.HealthcheckTimeout;
            throw new At(t, i);
          }
        }
        if ("InteractiveTransactionMisrouted" in n.body) {
          let i = { IDParseError: "Could not parse interactive transaction ID", NoQueryEngineFoundError: "Could not find Query Engine for the specified host and transaction ID", TransactionStartError: "Could not start interactive transaction" };
          throw new Ot(t, i[n.body.InteractiveTransactionMisrouted.reason]);
        }
        if ("InvalidRequestError" in n.body)
          throw new kt(t, n.body.InvalidRequestError.reason);
      }
      if (e.status === 401 || e.status === 403)
        throw new Nt(t, Gr(yo, n));
      if (e.status === 404)
        return new _t(t, Gr(go, n));
      if (e.status === 429)
        throw new Lt(t, Gr(bo, n));
      if (e.status === 504)
        throw new Dt(t, Gr(fo, n));
      if (e.status >= 500)
        throw new Ur(t, Gr(ho, n));
      if (e.status >= 400)
        throw new Rt(t, Gr(mo, n));
    }
    function Gr(e, r) {
      return r.type === "EmptyError" ? e : `${e}: ${JSON.stringify(r)}`;
    }
    function Tl(e) {
      let r = Math.pow(2, e) * 50, t = Math.ceil(Math.random() * r) - Math.ceil(r / 2), n = r + t;
      return new Promise((i) => setTimeout(() => i(n), n));
    }
    var $e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function Sl(e) {
      let r = new TextEncoder().encode(e), t = "", n = r.byteLength, i = n % 3, o = n - i, s, a, l, u, c;
      for (let p = 0; p < o; p = p + 3)
        c = r[p] << 16 | r[p + 1] << 8 | r[p + 2], s = (c & 16515072) >> 18, a = (c & 258048) >> 12, l = (c & 4032) >> 6, u = c & 63, t += $e[s] + $e[a] + $e[l] + $e[u];
      return i == 1 ? (c = r[o], s = (c & 252) >> 2, a = (c & 3) << 4, t += $e[s] + $e[a] + "==") : i == 2 && (c = r[o] << 8 | r[o + 1], s = (c & 64512) >> 10, a = (c & 1008) >> 4, l = (c & 15) << 2, t += $e[s] + $e[a] + $e[l] + "="), t;
    }
    function Rl(e) {
      if (!!e.generator?.previewFeatures.some((t) => t.toLowerCase().includes("metrics")))
        throw new P("The `metrics` preview feature is not yet available with Accelerate.\nPlease remove `metrics` from the `previewFeatures` in your schema.\n\nMore information about Accelerate: https://pris.ly/d/accelerate", e.clientVersion);
    }
    var Al = { "@prisma/engines-version": "6.16.1-1.bb420e667c1820a8c05a38023385f6cc7ef8e83a"};
    var Mt = class extends oe {
      constructor(r, t) {
        super(`Cannot fetch data from service:
${r}`, R(t, true));
        __publicField(this, "name", "RequestError");
        __publicField(this, "code", "P5010");
      }
    };
    x(Mt, "RequestError");
    async function dr(e, r, t = (n) => n) {
      let { clientVersion: n, ...i } = r, o = t(fetch);
      try {
        return await o(e, i);
      } catch (s) {
        let a = s.message ?? "Unknown error";
        throw new Mt(a, { clientVersion: n, cause: s });
      }
    }
    var pf = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
    var Cl = N("prisma:client:dataproxyEngine");
    async function df(e, r) {
      let t = Al["@prisma/engines-version"], n = r.clientVersion ?? "unknown";
      if (process.env.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION || globalThis.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION)
        return process.env.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION || globalThis.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION;
      if (e.includes("accelerate") && n !== "0.0.0" && n !== "in-memory")
        return n;
      let [i, o] = n?.split("-") ?? [];
      if (o === void 0 && pf.test(i))
        return i;
      if (o !== void 0 || n === "0.0.0" || n === "in-memory") {
        let [s] = t.split("-") ?? [], [a, l, u] = s.split("."), c = mf(`<=${a}.${l}.${u}`), p = await dr(c, { clientVersion: n });
        if (!p.ok)
          throw new Error(`Failed to fetch stable Prisma version, unpkg.com status ${p.status} ${p.statusText}, response body: ${await p.text() || "<empty body>"}`);
        let d = await p.text();
        Cl("length of body fetched from unpkg.com", d.length);
        let f;
        try {
          f = JSON.parse(d);
        } catch (h) {
          throw console.error("JSON.parse error: body fetched from unpkg.com: ", d), h;
        }
        return f.version;
      }
      throw new cr("Only `major.minor.patch` versions are supported by Accelerate.", { clientVersion: n });
    }
    async function Il(e, r) {
      let t = await df(e, r);
      return Cl("version", t), t;
    }
    function mf(e) {
      return encodeURI(`https://unpkg.com/prisma@${e}/package.json`);
    }
    var Dl = 3;
    var $t = N("prisma:client:dataproxyEngine");
    var qt = class {
      constructor(r) {
        __publicField(this, "name", "DataProxyEngine");
        __publicField(this, "inlineSchema");
        __publicField(this, "inlineSchemaHash");
        __publicField(this, "inlineDatasources");
        __publicField(this, "config");
        __publicField(this, "logEmitter");
        __publicField(this, "env");
        __publicField(this, "clientVersion");
        __publicField(this, "engineHash");
        __publicField(this, "tracingHelper");
        __publicField(this, "remoteClientVersion");
        __publicField(this, "host");
        __publicField(this, "headerBuilder");
        __publicField(this, "startPromise");
        __publicField(this, "protocol");
        Rl(r), this.config = r, this.env = r.env, this.inlineSchema = Sl(r.inlineSchema), this.inlineDatasources = r.inlineDatasources, this.inlineSchemaHash = r.inlineSchemaHash, this.clientVersion = r.clientVersion, this.engineHash = r.engineVersion, this.logEmitter = r.logEmitter, this.tracingHelper = r.tracingHelper;
      }
      apiKey() {
        return this.headerBuilder.apiKey;
      }
      version() {
        return this.engineHash;
      }
      async start() {
        this.startPromise !== void 0 && await this.startPromise, this.startPromise = (async () => {
          let { apiKey: r, url: t } = this.getURLAndAPIKey();
          this.host = t.host, this.protocol = t.protocol, this.headerBuilder = new Yn({ apiKey: r, tracingHelper: this.tracingHelper, logLevel: this.config.logLevel ?? "error", logQueries: this.config.logQueries, engineHash: this.engineHash }), this.remoteClientVersion = await Il(this.host, this.config), $t("host", this.host), $t("protocol", this.protocol);
        })(), await this.startPromise;
      }
      async stop() {
      }
      propagateResponseExtensions(r) {
        r?.logs?.length && r.logs.forEach((t) => {
          switch (t.level) {
            case "debug":
            case "trace":
              $t(t);
              break;
            case "error":
            case "warn":
            case "info": {
              this.logEmitter.emit(t.level, { timestamp: po(t.timestamp), message: t.attributes.message ?? "", target: t.target ?? "BinaryEngine" });
              break;
            }
            case "query": {
              this.logEmitter.emit("query", { query: t.attributes.query ?? "", timestamp: po(t.timestamp), duration: t.attributes.duration_ms ?? 0, params: t.attributes.params ?? "", target: t.target ?? "BinaryEngine" });
              break;
            }
            default:
              t.level;
          }
        }), r?.traces?.length && this.tracingHelper.dispatchEngineSpans(r.traces);
      }
      onBeforeExit() {
        throw new Error('"beforeExit" hook is not applicable to the remote query engine');
      }
      async url(r) {
        return await this.start(), `${this.protocol}//${this.host}/${this.remoteClientVersion}/${this.inlineSchemaHash}/${r}`;
      }
      async uploadSchema() {
        let r = { name: "schemaUpload", internal: true };
        return this.tracingHelper.runInChildSpan(r, async () => {
          let t = await dr(await this.url("schema"), { method: "PUT", headers: this.headerBuilder.build(), body: this.inlineSchema, clientVersion: this.clientVersion });
          t.ok || $t("schema response status", t.status);
          let n = await Ft(t, this.clientVersion);
          if (n)
            throw this.logEmitter.emit("warn", { message: `Error while uploading schema: ${n.message}`, timestamp: /* @__PURE__ */ new Date(), target: "" }), n;
          this.logEmitter.emit("info", { message: `Schema (re)uploaded (hash: ${this.inlineSchemaHash})`, timestamp: /* @__PURE__ */ new Date(), target: "" });
        });
      }
      request(r, { traceparent: t, interactiveTransaction: n, customDataProxyFetch: i }) {
        return this.requestInternal({ body: r, traceparent: t, interactiveTransaction: n, customDataProxyFetch: i });
      }
      async requestBatch(r, { traceparent: t, transaction: n, customDataProxyFetch: i }) {
        let o = n?.kind === "itx" ? n.options : void 0, s = Mr(r, n);
        return (await this.requestInternal({ body: s, customDataProxyFetch: i, interactiveTransaction: o, traceparent: t })).map((l) => (l.extensions && this.propagateResponseExtensions(l.extensions), "errors" in l ? this.convertProtocolErrorsToClientError(l.errors) : l));
      }
      requestInternal({ body: r, traceparent: t, customDataProxyFetch: n, interactiveTransaction: i }) {
        return this.withRetry({ actionGerund: "querying", callback: async ({ logHttpCall: o }) => {
          let s = i ? `${i.payload.endpoint}/graphql` : await this.url("graphql");
          o(s);
          let a = await dr(s, { method: "POST", headers: this.headerBuilder.build({ traceparent: t, transactionId: i?.id }), body: JSON.stringify(r), clientVersion: this.clientVersion }, n);
          a.ok || $t("graphql response status", a.status), await this.handleError(await Ft(a, this.clientVersion));
          let l = await a.json();
          if (l.extensions && this.propagateResponseExtensions(l.extensions), "errors" in l)
            throw this.convertProtocolErrorsToClientError(l.errors);
          return "batchResult" in l ? l.batchResult : l;
        } });
      }
      async transaction(r, t, n) {
        let i = { start: "starting", commit: "committing", rollback: "rolling back" };
        return this.withRetry({ actionGerund: `${i[r]} transaction`, callback: async ({ logHttpCall: o }) => {
          if (r === "start") {
            let s = JSON.stringify({ max_wait: n.maxWait, timeout: n.timeout, isolation_level: n.isolationLevel }), a = await this.url("transaction/start");
            o(a);
            let l = await dr(a, { method: "POST", headers: this.headerBuilder.build({ traceparent: t.traceparent }), body: s, clientVersion: this.clientVersion });
            await this.handleError(await Ft(l, this.clientVersion));
            let u = await l.json(), { extensions: c } = u;
            c && this.propagateResponseExtensions(c);
            let p = u.id, d = u["data-proxy"].endpoint;
            return { id: p, payload: { endpoint: d } };
          } else {
            let s = `${n.payload.endpoint}/${r}`;
            o(s);
            let a = await dr(s, { method: "POST", headers: this.headerBuilder.build({ traceparent: t.traceparent }), clientVersion: this.clientVersion });
            await this.handleError(await Ft(a, this.clientVersion));
            let l = await a.json(), { extensions: u } = l;
            u && this.propagateResponseExtensions(u);
            return;
          }
        } });
      }
      getURLAndAPIKey() {
        return vl({ clientVersion: this.clientVersion, env: this.env, inlineDatasources: this.inlineDatasources, overrideDatasources: this.config.overrideDatasources });
      }
      metrics() {
        throw new cr("Metrics are not yet supported for Accelerate", { clientVersion: this.clientVersion });
      }
      async withRetry(r) {
        for (let t = 0; ; t++) {
          let n = (i) => {
            this.logEmitter.emit("info", { message: `Calling ${i} (n=${t})`, timestamp: /* @__PURE__ */ new Date(), target: "" });
          };
          try {
            return await r.callback({ logHttpCall: n });
          } catch (i) {
            if (!(i instanceof oe) || !i.isRetryable)
              throw i;
            if (t >= Dl)
              throw i instanceof Br ? i.cause : i;
            this.logEmitter.emit("warn", { message: `Attempt ${t + 1}/${Dl} failed for ${r.actionGerund}: ${i.message ?? "(unknown)"}`, timestamp: /* @__PURE__ */ new Date(), target: "" });
            let o = await Tl(t);
            this.logEmitter.emit("warn", { message: `Retrying after ${o}ms`, timestamp: /* @__PURE__ */ new Date(), target: "" });
          }
        }
      }
      async handleError(r) {
        if (r instanceof pr)
          throw await this.uploadSchema(), new Br({ clientVersion: this.clientVersion, cause: r });
        if (r)
          throw r;
      }
      convertProtocolErrorsToClientError(r) {
        return r.length === 1 ? $r(r[0], this.config.clientVersion, this.config.activeProvider) : new V(JSON.stringify(r), { clientVersion: this.config.clientVersion });
      }
      applyPendingMigrations() {
        throw new Error("Method not implemented.");
      }
    };
    function Ol(e) {
      if (e?.kind === "itx")
        return e.options.id;
    }
    var wo = O(__require("os"));
    var kl = O(__require("path"));
    var Eo = Symbol("PrismaLibraryEngineCache");
    function ff() {
      let e = globalThis;
      return e[Eo] === void 0 && (e[Eo] = {}), e[Eo];
    }
    function gf(e) {
      let r = ff();
      if (r[e] !== void 0)
        return r[e];
      let t = kl.default.toNamespacedPath(e), n = { exports: {} }, i = 0;
      return process.platform !== "win32" && (i = wo.default.constants.dlopen.RTLD_LAZY | wo.default.constants.dlopen.RTLD_DEEPBIND), process.dlopen(n, t, i), r[e] = n.exports, n.exports;
    }
    var _l = { async loadLibrary(e) {
      let r = await fi(), t = await ml("library", e);
      try {
        return e.tracingHelper.runInChildSpan({ name: "loadLibrary", internal: true }, () => gf(t));
      } catch (n) {
        let i = Ai({ e: n, platformInfo: r, id: t });
        throw new P(i, e.clientVersion);
      }
    } };
    var xo;
    var Nl = { async loadLibrary(e) {
      let { clientVersion: r, adapter: t, engineWasm: n } = e;
      if (t === void 0)
        throw new P(`The \`adapter\` option for \`PrismaClient\` is required in this context (${Kn().prettyName})`, r);
      if (n === void 0)
        throw new P("WASM engine was unexpectedly `undefined`", r);
      xo === void 0 && (xo = (async () => {
        let o = await n.getRuntime(), s = await n.getQueryEngineWasmModule();
        if (s == null)
          throw new P("The loaded wasm module was unexpectedly `undefined` or `null` once loaded", r);
        let a = { "./query_engine_bg.js": o }, l = new WebAssembly.Instance(s, a), u = l.exports.__wbindgen_start;
        return o.__wbg_set_wasm(l.exports), u(), o.QueryEngine;
      })());
      let i = await xo;
      return { debugPanic() {
        return Promise.reject("{}");
      }, dmmf() {
        return Promise.resolve("{}");
      }, version() {
        return { commit: "unknown", version: "unknown" };
      }, QueryEngine: i };
    } };
    var hf = "P2036";
    var Re = N("prisma:client:libraryEngine");
    function yf(e) {
      return e.item_type === "query" && "query" in e;
    }
    function bf(e) {
      return "level" in e ? e.level === "error" && e.message === "PANIC" : false;
    }
    var Ll = [...li, "native"];
    var Ef = 0xffffffffffffffffn;
    var vo = 1n;
    function wf() {
      let e = vo++;
      return vo > Ef && (vo = 1n), e;
    }
    var Qr = class {
      constructor(r, t) {
        __publicField(this, "name", "LibraryEngine");
        __publicField(this, "engine");
        __publicField(this, "libraryInstantiationPromise");
        __publicField(this, "libraryStartingPromise");
        __publicField(this, "libraryStoppingPromise");
        __publicField(this, "libraryStarted");
        __publicField(this, "executingQueryPromise");
        __publicField(this, "config");
        __publicField(this, "QueryEngineConstructor");
        __publicField(this, "libraryLoader");
        __publicField(this, "library");
        __publicField(this, "logEmitter");
        __publicField(this, "libQueryEnginePath");
        __publicField(this, "binaryTarget");
        __publicField(this, "datasourceOverrides");
        __publicField(this, "datamodel");
        __publicField(this, "logQueries");
        __publicField(this, "logLevel");
        __publicField(this, "lastQuery");
        __publicField(this, "loggerRustPanic");
        __publicField(this, "tracingHelper");
        __publicField(this, "adapterPromise");
        __publicField(this, "versionInfo");
        this.libraryLoader = t ?? _l, r.engineWasm !== void 0 && (this.libraryLoader = t ?? Nl), this.config = r, this.libraryStarted = false, this.logQueries = r.logQueries ?? false, this.logLevel = r.logLevel ?? "error", this.logEmitter = r.logEmitter, this.datamodel = r.inlineSchema, this.tracingHelper = r.tracingHelper, r.enableDebugLogs && (this.logLevel = "debug");
        let n = Object.keys(r.overrideDatasources)[0], i = r.overrideDatasources[n]?.url;
        n !== void 0 && i !== void 0 && (this.datasourceOverrides = { [n]: i }), this.libraryInstantiationPromise = this.instantiateLibrary();
      }
      wrapEngine(r) {
        return { applyPendingMigrations: r.applyPendingMigrations?.bind(r), commitTransaction: this.withRequestId(r.commitTransaction.bind(r)), connect: this.withRequestId(r.connect.bind(r)), disconnect: this.withRequestId(r.disconnect.bind(r)), metrics: r.metrics?.bind(r), query: this.withRequestId(r.query.bind(r)), rollbackTransaction: this.withRequestId(r.rollbackTransaction.bind(r)), sdlSchema: r.sdlSchema?.bind(r), startTransaction: this.withRequestId(r.startTransaction.bind(r)), trace: r.trace.bind(r), free: r.free?.bind(r) };
      }
      withRequestId(r) {
        return async (...t) => {
          let n = wf().toString();
          try {
            return await r(...t, n);
          } finally {
            if (this.tracingHelper.isEnabled()) {
              let i = await this.engine?.trace(n);
              if (i) {
                let o = JSON.parse(i);
                this.tracingHelper.dispatchEngineSpans(o.spans);
              }
            }
          }
        };
      }
      async applyPendingMigrations() {
        throw new Error("Cannot call this method from this type of engine instance");
      }
      async transaction(r, t, n) {
        await this.start();
        let i = await this.adapterPromise, o = JSON.stringify(t), s;
        if (r === "start") {
          let l = JSON.stringify({ max_wait: n.maxWait, timeout: n.timeout, isolation_level: n.isolationLevel });
          s = await this.engine?.startTransaction(l, o);
        } else
          r === "commit" ? s = await this.engine?.commitTransaction(n.id, o) : r === "rollback" && (s = await this.engine?.rollbackTransaction(n.id, o));
        let a = this.parseEngineResponse(s);
        if (xf(a)) {
          let l = this.getExternalAdapterError(a, i?.errorRegistry);
          throw l ? l.error : new z2(a.message, { code: a.error_code, clientVersion: this.config.clientVersion, meta: a.meta });
        } else if (typeof a.message == "string")
          throw new V(a.message, { clientVersion: this.config.clientVersion });
        return a;
      }
      async instantiateLibrary() {
        if (Re("internalSetup"), this.libraryInstantiationPromise)
          return this.libraryInstantiationPromise;
        ai(), this.binaryTarget = await this.getCurrentBinaryTarget(), await this.tracingHelper.runInChildSpan("load_engine", () => this.loadEngine()), this.version();
      }
      async getCurrentBinaryTarget() {
        {
          if (this.binaryTarget)
            return this.binaryTarget;
          let r = await this.tracingHelper.runInChildSpan("detect_platform", () => ir());
          if (!Ll.includes(r))
            throw new P(`Unknown ${ce("PRISMA_QUERY_ENGINE_LIBRARY")} ${ce(W(r))}. Possible binaryTargets: ${qe(Ll.join(", "))} or a path to the query engine library.
You may have to run ${qe("prisma generate")} for your changes to take effect.`, this.config.clientVersion);
          return r;
        }
      }
      parseEngineResponse(r) {
        if (!r)
          throw new V("Response from the Engine was empty", { clientVersion: this.config.clientVersion });
        try {
          return JSON.parse(r);
        } catch {
          throw new V("Unable to JSON.parse response from engine", { clientVersion: this.config.clientVersion });
        }
      }
      async loadEngine() {
        if (!this.engine) {
          this.QueryEngineConstructor || (this.library = await this.libraryLoader.loadLibrary(this.config), this.QueryEngineConstructor = this.library.QueryEngine);
          try {
            let r = new WeakRef(this);
            this.adapterPromise || (this.adapterPromise = this.config.adapter?.connect()?.then(tn));
            let t = await this.adapterPromise;
            t && Re("Using driver adapter: %O", t), this.engine = this.wrapEngine(new this.QueryEngineConstructor({ datamodel: this.datamodel, env: process.env, logQueries: this.config.logQueries ?? false, ignoreEnvVarErrors: true, datasourceOverrides: this.datasourceOverrides ?? {}, logLevel: this.logLevel, configDir: this.config.cwd, engineProtocol: "json", enableTracing: this.tracingHelper.isEnabled() }, (n) => {
              r.deref()?.logger(n);
            }, t));
          } catch (r) {
            let t = r, n = this.parseInitError(t.message);
            throw typeof n == "string" ? t : new P(n.message, this.config.clientVersion, n.error_code);
          }
        }
      }
      logger(r) {
        let t = this.parseEngineResponse(r);
        t && (t.level = t?.level.toLowerCase() ?? "unknown", yf(t) ? this.logEmitter.emit("query", { timestamp: /* @__PURE__ */ new Date(), query: t.query, params: t.params, duration: Number(t.duration_ms), target: t.module_path }) : bf(t) ? this.loggerRustPanic = new ae(Po(this, `${t.message}: ${t.reason} in ${t.file}:${t.line}:${t.column}`), this.config.clientVersion) : this.logEmitter.emit(t.level, { timestamp: /* @__PURE__ */ new Date(), message: t.message, target: t.module_path }));
      }
      parseInitError(r) {
        try {
          return JSON.parse(r);
        } catch {
        }
        return r;
      }
      parseRequestError(r) {
        try {
          return JSON.parse(r);
        } catch {
        }
        return r;
      }
      onBeforeExit() {
        throw new Error('"beforeExit" hook is not applicable to the library engine since Prisma 5.0.0, it is only relevant and implemented for the binary engine. Please add your event listener to the `process` object directly instead.');
      }
      async start() {
        if (this.libraryInstantiationPromise || (this.libraryInstantiationPromise = this.instantiateLibrary()), await this.libraryInstantiationPromise, await this.libraryStoppingPromise, this.libraryStartingPromise)
          return Re(`library already starting, this.libraryStarted: ${this.libraryStarted}`), this.libraryStartingPromise;
        if (this.libraryStarted)
          return;
        let r = async () => {
          Re("library starting");
          try {
            let t = { traceparent: this.tracingHelper.getTraceParent() };
            await this.engine?.connect(JSON.stringify(t)), this.libraryStarted = true, this.adapterPromise || (this.adapterPromise = this.config.adapter?.connect()?.then(tn)), await this.adapterPromise, Re("library started");
          } catch (t) {
            let n = this.parseInitError(t.message);
            throw typeof n == "string" ? t : new P(n.message, this.config.clientVersion, n.error_code);
          } finally {
            this.libraryStartingPromise = void 0;
          }
        };
        return this.libraryStartingPromise = this.tracingHelper.runInChildSpan("connect", r), this.libraryStartingPromise;
      }
      async stop() {
        if (await this.libraryInstantiationPromise, await this.libraryStartingPromise, await this.executingQueryPromise, this.libraryStoppingPromise)
          return Re("library is already stopping"), this.libraryStoppingPromise;
        if (!this.libraryStarted) {
          await (await this.adapterPromise)?.dispose(), this.adapterPromise = void 0;
          return;
        }
        let r = async () => {
          await new Promise((n) => setImmediate(n)), Re("library stopping");
          let t = { traceparent: this.tracingHelper.getTraceParent() };
          await this.engine?.disconnect(JSON.stringify(t)), this.engine?.free && this.engine.free(), this.engine = void 0, this.libraryStarted = false, this.libraryStoppingPromise = void 0, this.libraryInstantiationPromise = void 0, await (await this.adapterPromise)?.dispose(), this.adapterPromise = void 0, Re("library stopped");
        };
        return this.libraryStoppingPromise = this.tracingHelper.runInChildSpan("disconnect", r), this.libraryStoppingPromise;
      }
      version() {
        return this.versionInfo = this.library?.version(), this.versionInfo?.version ?? "unknown";
      }
      debugPanic(r) {
        return this.library?.debugPanic(r);
      }
      async request(r, { traceparent: t, interactiveTransaction: n }) {
        Re(`sending request, this.libraryStarted: ${this.libraryStarted}`);
        let i = JSON.stringify({ traceparent: t }), o = JSON.stringify(r);
        try {
          await this.start();
          let s = await this.adapterPromise;
          this.executingQueryPromise = this.engine?.query(o, i, n?.id), this.lastQuery = o;
          let a = this.parseEngineResponse(await this.executingQueryPromise);
          if (a.errors)
            throw a.errors.length === 1 ? this.buildQueryError(a.errors[0], s?.errorRegistry) : new V(JSON.stringify(a.errors), { clientVersion: this.config.clientVersion });
          if (this.loggerRustPanic)
            throw this.loggerRustPanic;
          return { data: a };
        } catch (s) {
          if (s instanceof P)
            throw s;
          if (s.code === "GenericFailure" && s.message?.startsWith("PANIC:"))
            throw new ae(Po(this, s.message), this.config.clientVersion);
          let a = this.parseRequestError(s.message);
          throw typeof a == "string" ? s : new V(`${a.message}
${a.backtrace}`, { clientVersion: this.config.clientVersion });
        }
      }
      async requestBatch(r, { transaction: t, traceparent: n }) {
        Re("requestBatch");
        let i = Mr(r, t);
        await this.start();
        let o = await this.adapterPromise;
        this.lastQuery = JSON.stringify(i), this.executingQueryPromise = this.engine?.query(this.lastQuery, JSON.stringify({ traceparent: n }), Ol(t));
        let s = await this.executingQueryPromise, a = this.parseEngineResponse(s);
        if (a.errors)
          throw a.errors.length === 1 ? this.buildQueryError(a.errors[0], o?.errorRegistry) : new V(JSON.stringify(a.errors), { clientVersion: this.config.clientVersion });
        let { batchResult: l, errors: u } = a;
        if (Array.isArray(l))
          return l.map((c) => c.errors && c.errors.length > 0 ? this.loggerRustPanic ?? this.buildQueryError(c.errors[0], o?.errorRegistry) : { data: c });
        throw u && u.length === 1 ? new Error(u[0].error) : new Error(JSON.stringify(a));
      }
      buildQueryError(r, t) {
        if (r.user_facing_error.is_panic)
          return new ae(Po(this, r.user_facing_error.message), this.config.clientVersion);
        let n = this.getExternalAdapterError(r.user_facing_error, t);
        return n ? n.error : $r(r, this.config.clientVersion, this.config.activeProvider);
      }
      getExternalAdapterError(r, t) {
        if (r.error_code === hf && t) {
          let n = r.meta?.id;
          ln(typeof n == "number", "Malformed external JS error received from the engine");
          let i = t.consumeError(n);
          return ln(i, "External error with reported id was not registered"), i;
        }
      }
      async metrics(r) {
        await this.start();
        let t = await this.engine.metrics(JSON.stringify(r));
        return r.format === "prometheus" ? t : this.parseEngineResponse(t);
      }
    };
    function xf(e) {
      return typeof e == "object" && e !== null && e.error_code !== void 0;
    }
    function Po(e, r) {
      return El({ binaryTarget: e.binaryTarget, title: r, version: e.config.clientVersion, engineVersion: e.versionInfo?.commit, database: e.config.activeProvider, query: e.lastQuery });
    }
    function Fl({ url: e, adapter: r, copyEngine: t, targetBuildType: n }) {
      let i = [], o = [], s = (g) => {
        i.push({ _tag: "warning", value: g });
      }, a = (g) => {
        let I = g.join(`
`);
        o.push({ _tag: "error", value: I });
      }, l = !!e?.startsWith("prisma://"), u = an(e), c = !!r, p = l || u;
      !c && t && p && n !== "client" && n !== "wasm-compiler-edge" && s(["recommend--no-engine", "In production, we recommend using `prisma generate --no-engine` (See: `prisma generate --help`)"]);
      let d = p || !t;
      c && (d || n === "edge") && (p ? a(["You've provided both a driver adapter and an Accelerate database URL. Driver adapters currently cannot connect to Accelerate.", "Please provide either a driver adapter with a direct database URL or an Accelerate URL and no driver adapter."]) : t || a(["Prisma Client was configured to use the `adapter` option but `prisma generate` was run with `--no-engine`.", "Please run `prisma generate` without `--no-engine` to be able to use Prisma Client with the adapter."]));
      let f = { accelerate: d, ppg: u, driverAdapters: c };
      function h(g) {
        return g.length > 0;
      }
      return h(o) ? { ok: false, diagnostics: { warnings: i, errors: o }, isUsing: f } : { ok: true, diagnostics: { warnings: i }, isUsing: f };
    }
    function Ml({ copyEngine: e = true }, r) {
      let t;
      try {
        t = jr({ inlineDatasources: r.inlineDatasources, overrideDatasources: r.overrideDatasources, env: { ...r.env, ...process.env }, clientVersion: r.clientVersion });
      } catch {
      }
      let { ok: n, isUsing: i, diagnostics: o } = Fl({ url: t, adapter: r.adapter, copyEngine: e, targetBuildType: "library" });
      for (let p of o.warnings)
        at(...p.value);
      if (!n) {
        let p = o.errors[0];
        throw new Z(p.value, { clientVersion: r.clientVersion });
      }
      let s = Er(r.generator), a = s === "library"; (i.accelerate || i.ppg) && !i.driverAdapters;
      return i.accelerate ? new qt(r) : (i.driverAdapters, a ? new Qr(r) : (i.accelerate, new Qr(r)));
    }
    function $l({ generator: e }) {
      return e?.previewFeatures ?? [];
    }
    var ql = (e) => ({ command: e });
    var Vl = (e) => e.strings.reduce((r, t, n) => `${r}@P${n}${t}`);
    function Wr(e) {
      try {
        return jl(e, "fast");
      } catch {
        return jl(e, "slow");
      }
    }
    function jl(e, r) {
      return JSON.stringify(e.map((t) => Ul(t, r)));
    }
    function Ul(e, r) {
      if (Array.isArray(e))
        return e.map((t) => Ul(t, r));
      if (typeof e == "bigint")
        return { prisma__type: "bigint", prisma__value: e.toString() };
      if (vr(e))
        return { prisma__type: "date", prisma__value: e.toJSON() };
      if (Fe.isDecimal(e))
        return { prisma__type: "decimal", prisma__value: e.toJSON() };
      if (Buffer.isBuffer(e))
        return { prisma__type: "bytes", prisma__value: e.toString("base64") };
      if (vf(e))
        return { prisma__type: "bytes", prisma__value: Buffer.from(e).toString("base64") };
      if (ArrayBuffer.isView(e)) {
        let { buffer: t, byteOffset: n, byteLength: i } = e;
        return { prisma__type: "bytes", prisma__value: Buffer.from(t, n, i).toString("base64") };
      }
      return typeof e == "object" && r === "slow" ? Gl(e) : e;
    }
    function vf(e) {
      return e instanceof ArrayBuffer || e instanceof SharedArrayBuffer ? true : typeof e == "object" && e !== null ? e[Symbol.toStringTag] === "ArrayBuffer" || e[Symbol.toStringTag] === "SharedArrayBuffer" : false;
    }
    function Gl(e) {
      if (typeof e != "object" || e === null)
        return e;
      if (typeof e.toJSON == "function")
        return e.toJSON();
      if (Array.isArray(e))
        return e.map(Bl);
      let r = {};
      for (let t of Object.keys(e))
        r[t] = Bl(e[t]);
      return r;
    }
    function Bl(e) {
      return typeof e == "bigint" ? e.toString() : Gl(e);
    }
    var Pf = /^(\s*alter\s)/i;
    var Ql = N("prisma:client");
    function To(e, r, t, n) {
      if (!(e !== "postgresql" && e !== "cockroachdb") && t.length > 0 && Pf.exec(r))
        throw new Error(`Running ALTER using ${n} is not supported
Using the example below you can still execute your query with Prisma, but please note that it is vulnerable to SQL injection attacks and requires you to take care of input sanitization.

Example:
  await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)

More Information: https://pris.ly/d/execute-raw
`);
    }
    var So = ({ clientMethod: e, activeProvider: r }) => (t) => {
      let n = "", i;
      if (Vn(t))
        n = t.sql, i = { values: Wr(t.values), __prismaRawParameters__: true };
      else if (Array.isArray(t)) {
        let [o, ...s] = t;
        n = o, i = { values: Wr(s || []), __prismaRawParameters__: true };
      } else
        switch (r) {
          case "sqlite":
          case "mysql": {
            n = t.sql, i = { values: Wr(t.values), __prismaRawParameters__: true };
            break;
          }
          case "cockroachdb":
          case "postgresql":
          case "postgres": {
            n = t.text, i = { values: Wr(t.values), __prismaRawParameters__: true };
            break;
          }
          case "sqlserver": {
            n = Vl(t), i = { values: Wr(t.values), __prismaRawParameters__: true };
            break;
          }
          default:
            throw new Error(`The ${r} provider does not support ${e}`);
        }
      return i?.values ? Ql(`prisma.${e}(${n}, ${i.values})`) : Ql(`prisma.${e}(${n})`), { query: n, parameters: i };
    };
    var Wl = { requestArgsToMiddlewareArgs(e) {
      return [e.strings, ...e.values];
    }, middlewareArgsToRequestArgs(e) {
      let [r, ...t] = e;
      return new ie(r, t);
    } };
    var Jl = { requestArgsToMiddlewareArgs(e) {
      return [e];
    }, middlewareArgsToRequestArgs(e) {
      return e[0];
    } };
    function Ro(e) {
      return function(t, n) {
        let i, o = (s = e) => {
          try {
            return s === void 0 || s?.kind === "itx" ? i ?? (i = Kl(t(s))) : Kl(t(s));
          } catch (a) {
            return Promise.reject(a);
          }
        };
        return { get spec() {
          return n;
        }, then(s, a) {
          return o().then(s, a);
        }, catch(s) {
          return o().catch(s);
        }, finally(s) {
          return o().finally(s);
        }, requestTransaction(s) {
          let a = o(s);
          return a.requestTransaction ? a.requestTransaction(s) : a;
        }, [Symbol.toStringTag]: "PrismaPromise" };
      };
    }
    function Kl(e) {
      return typeof e.then == "function" ? e : Promise.resolve(e);
    }
    var Tf = xi.split(".")[0];
    var Sf = { isEnabled() {
      return false;
    }, getTraceParent() {
      return "00-10-10-00";
    }, dispatchEngineSpans() {
    }, getActiveContext() {
    }, runInChildSpan(e, r) {
      return r();
    } };
    var Ao = class {
      isEnabled() {
        return this.getGlobalTracingHelper().isEnabled();
      }
      getTraceParent(r) {
        return this.getGlobalTracingHelper().getTraceParent(r);
      }
      dispatchEngineSpans(r) {
        return this.getGlobalTracingHelper().dispatchEngineSpans(r);
      }
      getActiveContext() {
        return this.getGlobalTracingHelper().getActiveContext();
      }
      runInChildSpan(r, t) {
        return this.getGlobalTracingHelper().runInChildSpan(r, t);
      }
      getGlobalTracingHelper() {
        let r = globalThis[`V${Tf}_PRISMA_INSTRUMENTATION`], t = globalThis.PRISMA_INSTRUMENTATION;
        return r?.helper ?? t?.helper ?? Sf;
      }
    };
    function Hl() {
      return new Ao();
    }
    function Yl(e, r = () => {
    }) {
      let t, n = new Promise((i) => t = i);
      return { then(i) {
        return --e === 0 && t(r()), i?.(n);
      } };
    }
    function zl(e) {
      return typeof e == "string" ? e : e.reduce((r, t) => {
        let n = typeof t == "string" ? t : t.level;
        return n === "query" ? r : r && (t === "info" || r === "info") ? "info" : n;
      }, void 0);
    }
    function zn(e) {
      return typeof e.batchRequestIdx == "number";
    }
    function Zl(e) {
      if (e.action !== "findUnique" && e.action !== "findUniqueOrThrow")
        return;
      let r = [];
      return e.modelName && r.push(e.modelName), e.query.arguments && r.push(Co(e.query.arguments)), r.push(Co(e.query.selection)), r.join("");
    }
    function Co(e) {
      return `(${Object.keys(e).sort().map((t) => {
        let n = e[t];
        return typeof n == "object" && n !== null ? `(${t} ${Co(n)})` : t;
      }).join(" ")})`;
    }
    var Rf = { aggregate: false, aggregateRaw: false, createMany: true, createManyAndReturn: true, createOne: true, deleteMany: true, deleteOne: true, executeRaw: true, findFirst: false, findFirstOrThrow: false, findMany: false, findRaw: false, findUnique: false, findUniqueOrThrow: false, groupBy: false, queryRaw: false, runCommandRaw: true, updateMany: true, updateManyAndReturn: true, updateOne: true, upsertOne: true };
    function Io(e) {
      return Rf[e];
    }
    var Zn = class {
      constructor(r) {
        __publicField(this, "batches");
        __publicField(this, "tickActive", false);
        this.options = r;
        this.batches = {};
      }
      request(r) {
        let t = this.options.batchBy(r);
        return t ? (this.batches[t] || (this.batches[t] = [], this.tickActive || (this.tickActive = true, process.nextTick(() => {
          this.dispatchBatches(), this.tickActive = false;
        }))), new Promise((n, i) => {
          this.batches[t].push({ request: r, resolve: n, reject: i });
        })) : this.options.singleLoader(r);
      }
      dispatchBatches() {
        for (let r in this.batches) {
          let t = this.batches[r];
          delete this.batches[r], t.length === 1 ? this.options.singleLoader(t[0].request).then((n) => {
            n instanceof Error ? t[0].reject(n) : t[0].resolve(n);
          }).catch((n) => {
            t[0].reject(n);
          }) : (t.sort((n, i) => this.options.batchOrder(n.request, i.request)), this.options.batchLoader(t.map((n) => n.request)).then((n) => {
            if (n instanceof Error)
              for (let i = 0; i < t.length; i++)
                t[i].reject(n);
            else
              for (let i = 0; i < t.length; i++) {
                let o = n[i];
                o instanceof Error ? t[i].reject(o) : t[i].resolve(o);
              }
          }).catch((n) => {
            for (let i = 0; i < t.length; i++)
              t[i].reject(n);
          }));
        }
      }
      get [Symbol.toStringTag]() {
        return "DataLoader";
      }
    };
    function mr(e, r) {
      if (r === null)
        return r;
      switch (e) {
        case "bigint":
          return BigInt(r);
        case "bytes": {
          let { buffer: t, byteOffset: n, byteLength: i } = Buffer.from(r, "base64");
          return new Uint8Array(t, n, i);
        }
        case "decimal":
          return new Fe(r);
        case "datetime":
        case "date":
          return new Date(r);
        case "time":
          return /* @__PURE__ */ new Date(`1970-01-01T${r}Z`);
        case "bigint-array":
          return r.map((t) => mr("bigint", t));
        case "bytes-array":
          return r.map((t) => mr("bytes", t));
        case "decimal-array":
          return r.map((t) => mr("decimal", t));
        case "datetime-array":
          return r.map((t) => mr("datetime", t));
        case "date-array":
          return r.map((t) => mr("date", t));
        case "time-array":
          return r.map((t) => mr("time", t));
        default:
          return r;
      }
    }
    function Xn(e) {
      let r = [], t = Af(e);
      for (let n = 0; n < e.rows.length; n++) {
        let i = e.rows[n], o = { ...t };
        for (let s = 0; s < i.length; s++)
          o[e.columns[s]] = mr(e.types[s], i[s]);
        r.push(o);
      }
      return r;
    }
    function Af(e) {
      let r = {};
      for (let t = 0; t < e.columns.length; t++)
        r[e.columns[t]] = null;
      return r;
    }
    var Cf = N("prisma:client:request_handler");
    var ei = class {
      constructor(r, t) {
        __publicField(this, "client");
        __publicField(this, "dataloader");
        __publicField(this, "logEmitter");
        this.logEmitter = t, this.client = r, this.dataloader = new Zn({ batchLoader: rl(async ({ requests: n, customDataProxyFetch: i }) => {
          let { transaction: o, otelParentCtx: s } = n[0], a = n.map((p) => p.protocolQuery), l = this.client._tracingHelper.getTraceParent(s), u = n.some((p) => Io(p.protocolQuery.action));
          return (await this.client._engine.requestBatch(a, { traceparent: l, transaction: If(o), containsWrite: u, customDataProxyFetch: i })).map((p, d) => {
            if (p instanceof Error)
              return p;
            try {
              return this.mapQueryEngineResult(n[d], p);
            } catch (f) {
              return f;
            }
          });
        }), singleLoader: async (n) => {
          let i = n.transaction?.kind === "itx" ? Xl(n.transaction) : void 0, o = await this.client._engine.request(n.protocolQuery, { traceparent: this.client._tracingHelper.getTraceParent(), interactiveTransaction: i, isWrite: Io(n.protocolQuery.action), customDataProxyFetch: n.customDataProxyFetch });
          return this.mapQueryEngineResult(n, o);
        }, batchBy: (n) => n.transaction?.id ? `transaction-${n.transaction.id}` : Zl(n.protocolQuery), batchOrder(n, i) {
          return n.transaction?.kind === "batch" && i.transaction?.kind === "batch" ? n.transaction.index - i.transaction.index : 0;
        } });
      }
      async request(r) {
        try {
          return await this.dataloader.request(r);
        } catch (t) {
          let { clientMethod: n, callsite: i, transaction: o, args: s, modelName: a } = r;
          this.handleAndLogRequestError({ error: t, clientMethod: n, callsite: i, transaction: o, args: s, modelName: a, globalOmit: r.globalOmit });
        }
      }
      mapQueryEngineResult({ dataPath: r, unpacker: t }, n) {
        let i = n?.data, o = this.unpack(i, r, t);
        return process.env.PRISMA_CLIENT_GET_TIME ? { data: o } : o;
      }
      handleAndLogRequestError(r) {
        try {
          this.handleRequestError(r);
        } catch (t) {
          throw this.logEmitter && this.logEmitter.emit("error", { message: t.message, target: r.clientMethod, timestamp: /* @__PURE__ */ new Date() }), t;
        }
      }
      handleRequestError({ error: r, clientMethod: t, callsite: n, transaction: i, args: o, modelName: s, globalOmit: a }) {
        if (Cf(r), Df(r, i))
          throw r;
        if (r instanceof z2 && Of(r)) {
          let u = eu(r.meta);
          Nn({ args: o, errors: [u], callsite: n, errorFormat: this.client._errorFormat, originalMethod: t, clientVersion: this.client._clientVersion, globalOmit: a });
        }
        let l = r.message;
        if (n && (l = Tn({ callsite: n, originalMethod: t, isPanic: r.isPanic, showColors: this.client._errorFormat === "pretty", message: l })), l = this.sanitizeMessage(l), r.code) {
          let u = s ? { modelName: s, ...r.meta } : r.meta;
          throw new z2(l, { code: r.code, clientVersion: this.client._clientVersion, meta: u, batchRequestIdx: r.batchRequestIdx });
        } else {
          if (r.isPanic)
            throw new ae(l, this.client._clientVersion);
          if (r instanceof V)
            throw new V(l, { clientVersion: this.client._clientVersion, batchRequestIdx: r.batchRequestIdx });
          if (r instanceof P)
            throw new P(l, this.client._clientVersion);
          if (r instanceof ae)
            throw new ae(l, this.client._clientVersion);
        }
        throw r.clientVersion = this.client._clientVersion, r;
      }
      sanitizeMessage(r) {
        return this.client._errorFormat && this.client._errorFormat !== "pretty" ? wr(r) : r;
      }
      unpack(r, t, n) {
        if (!r || (r.data && (r = r.data), !r))
          return r;
        let i = Object.keys(r)[0], o = Object.values(r)[0], s = t.filter((u) => u !== "select" && u !== "include"), a = ao(o, s), l = i === "queryRaw" ? Xn(a) : Vr(a);
        return n ? n(l) : l;
      }
      get [Symbol.toStringTag]() {
        return "RequestHandler";
      }
    };
    function If(e) {
      if (e) {
        if (e.kind === "batch")
          return { kind: "batch", options: { isolationLevel: e.isolationLevel } };
        if (e.kind === "itx")
          return { kind: "itx", options: Xl(e) };
        ar(e, "Unknown transaction kind");
      }
    }
    function Xl(e) {
      return { id: e.id, payload: e.payload };
    }
    function Df(e, r) {
      return zn(e) && r?.kind === "batch" && e.batchRequestIdx !== r.index;
    }
    function Of(e) {
      return e.code === "P2009" || e.code === "P2012";
    }
    function eu(e) {
      if (e.kind === "Union")
        return { kind: "Union", errors: e.errors.map(eu) };
      if (Array.isArray(e.selectionPath)) {
        let [, ...r] = e.selectionPath;
        return { ...e, selectionPath: r };
      }
      return e;
    }
    var ru = xl;
    var su = O(Ki());
    var _ = class extends Error {
      constructor(r) {
        super(r + `
Read more at https://pris.ly/d/client-constructor`), this.name = "PrismaClientConstructorValidationError";
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientConstructorValidationError";
      }
    };
    x(_, "PrismaClientConstructorValidationError");
    var tu = ["datasources", "datasourceUrl", "errorFormat", "adapter", "log", "transactionOptions", "omit", "__internal"];
    var nu = ["pretty", "colorless", "minimal"];
    var iu = ["info", "query", "warn", "error"];
    var kf = { datasources: (e, { datasourceNames: r }) => {
      if (e) {
        if (typeof e != "object" || Array.isArray(e))
          throw new _(`Invalid value ${JSON.stringify(e)} for "datasources" provided to PrismaClient constructor`);
        for (let [t, n] of Object.entries(e)) {
          if (!r.includes(t)) {
            let i = Jr(t, r) || ` Available datasources: ${r.join(", ")}`;
            throw new _(`Unknown datasource ${t} provided to PrismaClient constructor.${i}`);
          }
          if (typeof n != "object" || Array.isArray(n))
            throw new _(`Invalid value ${JSON.stringify(e)} for datasource "${t}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
          if (n && typeof n == "object")
            for (let [i, o] of Object.entries(n)) {
              if (i !== "url")
                throw new _(`Invalid value ${JSON.stringify(e)} for datasource "${t}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
              if (typeof o != "string")
                throw new _(`Invalid value ${JSON.stringify(o)} for datasource "${t}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
            }
        }
      }
    }, adapter: (e, r) => {
      if (!e && Er(r.generator) === "client")
        throw new _('Using engine type "client" requires a driver adapter to be provided to PrismaClient constructor.');
      if (e !== null) {
        if (e === void 0)
          throw new _('"adapter" property must not be undefined, use null to conditionally disable driver adapters.');
        if (Er(r.generator) === "binary")
          throw new _('Cannot use a driver adapter with the "binary" Query Engine. Please use the "library" Query Engine.');
      }
    }, datasourceUrl: (e) => {
      if (typeof e < "u" && typeof e != "string")
        throw new _(`Invalid value ${JSON.stringify(e)} for "datasourceUrl" provided to PrismaClient constructor.
Expected string or undefined.`);
    }, errorFormat: (e) => {
      if (e) {
        if (typeof e != "string")
          throw new _(`Invalid value ${JSON.stringify(e)} for "errorFormat" provided to PrismaClient constructor.`);
        if (!nu.includes(e)) {
          let r = Jr(e, nu);
          throw new _(`Invalid errorFormat ${e} provided to PrismaClient constructor.${r}`);
        }
      }
    }, log: (e) => {
      if (!e)
        return;
      if (!Array.isArray(e))
        throw new _(`Invalid value ${JSON.stringify(e)} for "log" provided to PrismaClient constructor.`);
      function r(t) {
        if (typeof t == "string" && !iu.includes(t)) {
          let n = Jr(t, iu);
          throw new _(`Invalid log level "${t}" provided to PrismaClient constructor.${n}`);
        }
      }
      for (let t of e) {
        r(t);
        let n = { level: r, emit: (i) => {
          let o = ["stdout", "event"];
          if (!o.includes(i)) {
            let s = Jr(i, o);
            throw new _(`Invalid value ${JSON.stringify(i)} for "emit" in logLevel provided to PrismaClient constructor.${s}`);
          }
        } };
        if (t && typeof t == "object")
          for (let [i, o] of Object.entries(t))
            if (n[i])
              n[i](o);
            else
              throw new _(`Invalid property ${i} for "log" provided to PrismaClient constructor`);
      }
    }, transactionOptions: (e) => {
      if (!e)
        return;
      let r = e.maxWait;
      if (r != null && r <= 0)
        throw new _(`Invalid value ${r} for maxWait in "transactionOptions" provided to PrismaClient constructor. maxWait needs to be greater than 0`);
      let t = e.timeout;
      if (t != null && t <= 0)
        throw new _(`Invalid value ${t} for timeout in "transactionOptions" provided to PrismaClient constructor. timeout needs to be greater than 0`);
    }, omit: (e, r) => {
      if (typeof e != "object")
        throw new _('"omit" option is expected to be an object.');
      if (e === null)
        throw new _('"omit" option can not be `null`');
      let t = [];
      for (let [n, i] of Object.entries(e)) {
        let o = Nf(n, r.runtimeDataModel);
        if (!o) {
          t.push({ kind: "UnknownModel", modelKey: n });
          continue;
        }
        for (let [s, a] of Object.entries(i)) {
          let l = o.fields.find((u) => u.name === s);
          if (!l) {
            t.push({ kind: "UnknownField", modelKey: n, fieldName: s });
            continue;
          }
          if (l.relationName) {
            t.push({ kind: "RelationInOmit", modelKey: n, fieldName: s });
            continue;
          }
          typeof a != "boolean" && t.push({ kind: "InvalidFieldValue", modelKey: n, fieldName: s });
        }
      }
      if (t.length > 0)
        throw new _(Lf(e, t));
    }, __internal: (e) => {
      if (!e)
        return;
      let r = ["debug", "engine", "configOverride"];
      if (typeof e != "object")
        throw new _(`Invalid value ${JSON.stringify(e)} for "__internal" to PrismaClient constructor`);
      for (let [t] of Object.entries(e))
        if (!r.includes(t)) {
          let n = Jr(t, r);
          throw new _(`Invalid property ${JSON.stringify(t)} for "__internal" provided to PrismaClient constructor.${n}`);
        }
    } };
    function au(e, r) {
      for (let [t, n] of Object.entries(e)) {
        if (!tu.includes(t)) {
          let i = Jr(t, tu);
          throw new _(`Unknown property ${t} provided to PrismaClient constructor.${i}`);
        }
        kf[t](n, r);
      }
      if (e.datasourceUrl && e.datasources)
        throw new _('Can not use "datasourceUrl" and "datasources" options at the same time. Pick one of them');
    }
    function Jr(e, r) {
      if (r.length === 0 || typeof e != "string")
        return "";
      let t = _f(e, r);
      return t ? ` Did you mean "${t}"?` : "";
    }
    function _f(e, r) {
      if (r.length === 0)
        return null;
      let t = r.map((i) => ({ value: i, distance: (0, su.default)(e, i) }));
      t.sort((i, o) => i.distance < o.distance ? -1 : 1);
      let n = t[0];
      return n.distance < 3 ? n.value : null;
    }
    function Nf(e, r) {
      return ou(r.models, e) ?? ou(r.types, e);
    }
    function ou(e, r) {
      let t = Object.keys(e).find((n) => We(n) === r);
      if (t)
        return e[t];
    }
    function Lf(e, r) {
      let t = _r(e);
      for (let o of r)
        switch (o.kind) {
          case "UnknownModel":
            t.arguments.getField(o.modelKey)?.markAsError(), t.addErrorMessage(() => `Unknown model name: ${o.modelKey}.`);
            break;
          case "UnknownField":
            t.arguments.getDeepField([o.modelKey, o.fieldName])?.markAsError(), t.addErrorMessage(() => `Model "${o.modelKey}" does not have a field named "${o.fieldName}".`);
            break;
          case "RelationInOmit":
            t.arguments.getDeepField([o.modelKey, o.fieldName])?.markAsError(), t.addErrorMessage(() => 'Relations are already excluded by default and can not be specified in "omit".');
            break;
          case "InvalidFieldValue":
            t.arguments.getDeepFieldValue([o.modelKey, o.fieldName])?.markAsError(), t.addErrorMessage(() => "Omit field option value must be a boolean.");
            break;
        }
      let { message: n, args: i } = _n(t, "colorless");
      return `Error validating "omit" option:

${i}

${n}`;
    }
    function lu(e) {
      return e.length === 0 ? Promise.resolve([]) : new Promise((r, t) => {
        let n = new Array(e.length), i = null, o = false, s = 0, a = () => {
          o || (s++, s === e.length && (o = true, i ? t(i) : r(n)));
        }, l = (u) => {
          o || (o = true, t(u));
        };
        for (let u = 0; u < e.length; u++)
          e[u].then((c) => {
            n[u] = c, a();
          }, (c) => {
            if (!zn(c)) {
              l(c);
              return;
            }
            c.batchRequestIdx === u ? l(c) : (i || (i = c), a());
          });
      });
    }
    var rr = N("prisma:client");
    typeof globalThis == "object" && (globalThis.NODE_CLIENT = true);
    var Ff = { requestArgsToMiddlewareArgs: (e) => e, middlewareArgsToRequestArgs: (e) => e };
    var Mf = Symbol.for("prisma.client.transaction.id");
    var $f = { id: 0, nextId() {
      return ++this.id;
    } };
    function fu(e) {
      class r {
        constructor(n) {
          __publicField(this, "_originalClient", this);
          __publicField(this, "_runtimeDataModel");
          __publicField(this, "_requestHandler");
          __publicField(this, "_connectionPromise");
          __publicField(this, "_disconnectionPromise");
          __publicField(this, "_engineConfig");
          __publicField(this, "_accelerateEngineConfig");
          __publicField(this, "_clientVersion");
          __publicField(this, "_errorFormat");
          __publicField(this, "_tracingHelper");
          __publicField(this, "_previewFeatures");
          __publicField(this, "_activeProvider");
          __publicField(this, "_globalOmit");
          __publicField(this, "_extensions");
          __publicField(this, "_engine");
          __publicField(this, "_appliedParent");
          __publicField(this, "_createPrismaPromise", Ro());
          __publicField(this, "$metrics", new Lr(this));
          __publicField(this, "$extends", Wa);
          e = n?.__internal?.configOverride?.(e) ?? e, sl(e), n && au(n, e);
          let i = new du.EventEmitter().on("error", () => {
          });
          this._extensions = Nr.empty(), this._previewFeatures = $l(e), this._clientVersion = e.clientVersion ?? ru, this._activeProvider = e.activeProvider, this._globalOmit = n?.omit, this._tracingHelper = Hl();
          let o = e.relativeEnvPaths && { rootEnvPath: e.relativeEnvPaths.rootEnvPath && ri.default.resolve(e.dirname, e.relativeEnvPaths.rootEnvPath), schemaEnvPath: e.relativeEnvPaths.schemaEnvPath && ri.default.resolve(e.dirname, e.relativeEnvPaths.schemaEnvPath) }, s;
          if (n?.adapter) {
            s = n.adapter;
            let l = e.activeProvider === "postgresql" || e.activeProvider === "cockroachdb" ? "postgres" : e.activeProvider;
            if (s.provider !== l)
              throw new P(`The Driver Adapter \`${s.adapterName}\`, based on \`${s.provider}\`, is not compatible with the provider \`${l}\` specified in the Prisma schema.`, this._clientVersion);
            if (n.datasources || n.datasourceUrl !== void 0)
              throw new P("Custom datasource configuration is not compatible with Prisma Driver Adapters. Please define the database connection string directly in the Driver Adapter configuration.", this._clientVersion);
          }
          let a = !s && o && st(o, { conflictCheck: "none" }) || e.injectableEdgeEnv?.();
          try {
            let l = n ?? {}, u = l.__internal ?? {}, c = u.debug === true;
            c && N.enable("prisma:client");
            let p = ri.default.resolve(e.dirname, e.relativePath);
            mu.default.existsSync(p) || (p = e.dirname), rr("dirname", e.dirname), rr("relativePath", e.relativePath), rr("cwd", p);
            let d = u.engine || {};
            if (l.errorFormat ? this._errorFormat = l.errorFormat : process.env.NODE_ENV === "production" ? this._errorFormat = "minimal" : process.env.NO_COLOR ? this._errorFormat = "colorless" : this._errorFormat = "colorless", this._runtimeDataModel = e.runtimeDataModel, this._engineConfig = { cwd: p, dirname: e.dirname, enableDebugLogs: c, allowTriggerPanic: d.allowTriggerPanic, prismaPath: d.binaryPath ?? void 0, engineEndpoint: d.endpoint, generator: e.generator, showColors: this._errorFormat === "pretty", logLevel: l.log && zl(l.log), logQueries: l.log && !!(typeof l.log == "string" ? l.log === "query" : l.log.find((f) => typeof f == "string" ? f === "query" : f.level === "query")), env: a?.parsed ?? {}, flags: [], engineWasm: e.engineWasm, compilerWasm: e.compilerWasm, clientVersion: e.clientVersion, engineVersion: e.engineVersion, previewFeatures: this._previewFeatures, activeProvider: e.activeProvider, inlineSchema: e.inlineSchema, overrideDatasources: al(l, e.datasourceNames), inlineDatasources: e.inlineDatasources, inlineSchemaHash: e.inlineSchemaHash, tracingHelper: this._tracingHelper, transactionOptions: { maxWait: l.transactionOptions?.maxWait ?? 2e3, timeout: l.transactionOptions?.timeout ?? 5e3, isolationLevel: l.transactionOptions?.isolationLevel }, logEmitter: i, isBundled: e.isBundled, adapter: s }, this._accelerateEngineConfig = { ...this._engineConfig, accelerateUtils: { resolveDatasourceUrl: jr, getBatchRequestPayload: Mr, prismaGraphQLToJSError: $r, PrismaClientUnknownRequestError: V, PrismaClientInitializationError: P, PrismaClientKnownRequestError: z2, debug: N("prisma:client:accelerateEngine"), engineVersion: cu.version, clientVersion: e.clientVersion } }, rr("clientVersion", e.clientVersion), this._engine = Ml(e, this._engineConfig), this._requestHandler = new ei(this, i), l.log)
              for (let f of l.log) {
                let h = typeof f == "string" ? f : f.emit === "stdout" ? f.level : null;
                h && this.$on(h, (g) => {
                  nt.log(`${nt.tags[h] ?? ""}`, g.message || g.query);
                });
              }
          } catch (l) {
            throw l.clientVersion = this._clientVersion, l;
          }
          return this._appliedParent = Pt(this);
        }
        get [Symbol.toStringTag]() {
          return "PrismaClient";
        }
        $on(n, i) {
          return n === "beforeExit" ? this._engine.onBeforeExit(i) : n && this._engineConfig.logEmitter.on(n, i), this;
        }
        $connect() {
          try {
            return this._engine.start();
          } catch (n) {
            throw n.clientVersion = this._clientVersion, n;
          }
        }
        async $disconnect() {
          try {
            await this._engine.stop();
          } catch (n) {
            throw n.clientVersion = this._clientVersion, n;
          } finally {
            Uo();
          }
        }
        $executeRawInternal(n, i, o, s) {
          let a = this._activeProvider;
          return this._request({ action: "executeRaw", args: o, transaction: n, clientMethod: i, argsMapper: So({ clientMethod: i, activeProvider: a }), callsite: Ze(this._errorFormat), dataPath: [], middlewareArgsMapper: s });
        }
        $executeRaw(n, ...i) {
          return this._createPrismaPromise((o) => {
            if (n.raw !== void 0 || n.sql !== void 0) {
              let [s, a] = uu(n, i);
              return To(this._activeProvider, s.text, s.values, Array.isArray(n) ? "prisma.$executeRaw`<SQL>`" : "prisma.$executeRaw(sql`<SQL>`)"), this.$executeRawInternal(o, "$executeRaw", s, a);
            }
            throw new Z("`$executeRaw` is a tag function, please use it like the following:\n```\nconst result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`\n```\n\nOr read our docs at https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#executeraw\n", { clientVersion: this._clientVersion });
          });
        }
        $executeRawUnsafe(n, ...i) {
          return this._createPrismaPromise((o) => (To(this._activeProvider, n, i, "prisma.$executeRawUnsafe(<SQL>, [...values])"), this.$executeRawInternal(o, "$executeRawUnsafe", [n, ...i])));
        }
        $runCommandRaw(n) {
          if (e.activeProvider !== "mongodb")
            throw new Z(`The ${e.activeProvider} provider does not support $runCommandRaw. Use the mongodb provider.`, { clientVersion: this._clientVersion });
          return this._createPrismaPromise((i) => this._request({ args: n, clientMethod: "$runCommandRaw", dataPath: [], action: "runCommandRaw", argsMapper: ql, callsite: Ze(this._errorFormat), transaction: i }));
        }
        async $queryRawInternal(n, i, o, s) {
          let a = this._activeProvider;
          return this._request({ action: "queryRaw", args: o, transaction: n, clientMethod: i, argsMapper: So({ clientMethod: i, activeProvider: a }), callsite: Ze(this._errorFormat), dataPath: [], middlewareArgsMapper: s });
        }
        $queryRaw(n, ...i) {
          return this._createPrismaPromise((o) => {
            if (n.raw !== void 0 || n.sql !== void 0)
              return this.$queryRawInternal(o, "$queryRaw", ...uu(n, i));
            throw new Z("`$queryRaw` is a tag function, please use it like the following:\n```\nconst result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`\n```\n\nOr read our docs at https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#queryraw\n", { clientVersion: this._clientVersion });
          });
        }
        $queryRawTyped(n) {
          return this._createPrismaPromise((i) => {
            if (!this._hasPreviewFlag("typedSql"))
              throw new Z("`typedSql` preview feature must be enabled in order to access $queryRawTyped API", { clientVersion: this._clientVersion });
            return this.$queryRawInternal(i, "$queryRawTyped", n);
          });
        }
        $queryRawUnsafe(n, ...i) {
          return this._createPrismaPromise((o) => this.$queryRawInternal(o, "$queryRawUnsafe", [n, ...i]));
        }
        _transactionWithArray({ promises: n, options: i }) {
          let o = $f.nextId(), s = Yl(n.length), a = n.map((l, u) => {
            if (l?.[Symbol.toStringTag] !== "PrismaPromise")
              throw new Error("All elements of the array need to be Prisma Client promises. Hint: Please make sure you are not awaiting the Prisma client calls you intended to pass in the $transaction function.");
            let c = i?.isolationLevel ?? this._engineConfig.transactionOptions.isolationLevel, p = { kind: "batch", id: o, index: u, isolationLevel: c, lock: s };
            return l.requestTransaction?.(p) ?? l;
          });
          return lu(a);
        }
        async _transactionWithCallback({ callback: n, options: i }) {
          let o = { traceparent: this._tracingHelper.getTraceParent() }, s = { maxWait: i?.maxWait ?? this._engineConfig.transactionOptions.maxWait, timeout: i?.timeout ?? this._engineConfig.transactionOptions.timeout, isolationLevel: i?.isolationLevel ?? this._engineConfig.transactionOptions.isolationLevel }, a = await this._engine.transaction("start", o, s), l;
          try {
            let u = { kind: "itx", ...a };
            l = await n(this._createItxClient(u)), await this._engine.transaction("commit", o, a);
          } catch (u) {
            throw await this._engine.transaction("rollback", o, a).catch(() => {
            }), u;
          }
          return l;
        }
        _createItxClient(n) {
          return he(Pt(he(Qa(this), [re("_appliedParent", () => this._appliedParent._createItxClient(n)), re("_createPrismaPromise", () => Ro(n)), re(Mf, () => n.id)])), [Fr(Ya)]);
        }
        $transaction(n, i) {
          let o;
          typeof n == "function" ? this._engineConfig.adapter?.adapterName === "@prisma/adapter-d1" ? o = () => {
            throw new Error("Cloudflare D1 does not support interactive transactions. We recommend you to refactor your queries with that limitation in mind, and use batch transactions with `prisma.$transactions([])` where applicable.");
          } : o = () => this._transactionWithCallback({ callback: n, options: i }) : o = () => this._transactionWithArray({ promises: n, options: i });
          let s = { name: "transaction", attributes: { method: "$transaction" } };
          return this._tracingHelper.runInChildSpan(s, o);
        }
        _request(n) {
          n.otelParentCtx = this._tracingHelper.getActiveContext();
          let i = n.middlewareArgsMapper ?? Ff, o = { args: i.requestArgsToMiddlewareArgs(n.args), dataPath: n.dataPath, runInTransaction: !!n.transaction, action: n.action, model: n.model }, s = { operation: { name: "operation", attributes: { method: o.action, model: o.model, name: o.model ? `${o.model}.${o.action}` : o.action } } }, a = async (l) => {
            let { runInTransaction: u, args: c, ...p } = l, d = { ...n, ...p };
            c && (d.args = i.middlewareArgsToRequestArgs(c)), n.transaction !== void 0 && u === false && delete d.transaction;
            let f = await el(this, d);
            return d.model ? Ha({ result: f, modelName: d.model, args: d.args, extensions: this._extensions, runtimeDataModel: this._runtimeDataModel, globalOmit: this._globalOmit }) : f;
          };
          return this._tracingHelper.runInChildSpan(s.operation, () => new pu.AsyncResource("prisma-client-request").runInAsyncScope(() => a(o)));
        }
        async _executeRequest({ args: n, clientMethod: i, dataPath: o, callsite: s, action: a, model: l, argsMapper: u, transaction: c, unpacker: p, otelParentCtx: d, customDataProxyFetch: f }) {
          try {
            n = u ? u(n) : n;
            let h = { name: "serialize" }, g = this._tracingHelper.runInChildSpan(h, () => $n({ modelName: l, runtimeDataModel: this._runtimeDataModel, action: a, args: n, clientMethod: i, callsite: s, extensions: this._extensions, errorFormat: this._errorFormat, clientVersion: this._clientVersion, previewFeatures: this._previewFeatures, globalOmit: this._globalOmit }));
            return N.enabled("prisma:client") && (rr("Prisma Client call:"), rr(`prisma.${i}(${Na(n)})`), rr("Generated request:"), rr(JSON.stringify(g, null, 2) + `
`)), c?.kind === "batch" && await c.lock, this._requestHandler.request({ protocolQuery: g, modelName: l, action: a, clientMethod: i, dataPath: o, callsite: s, args: n, extensions: this._extensions, transaction: c, unpacker: p, otelParentCtx: d, otelChildCtx: this._tracingHelper.getActiveContext(), globalOmit: this._globalOmit, customDataProxyFetch: f });
          } catch (h) {
            throw h.clientVersion = this._clientVersion, h;
          }
        }
        _hasPreviewFlag(n) {
          return !!this._engineConfig.previewFeatures?.includes(n);
        }
        $applyPendingMigrations() {
          return this._engine.applyPendingMigrations();
        }
      }
      return r;
    }
    function uu(e, r) {
      return qf(e) ? [new ie(e, r), Wl] : [e, Jl];
    }
    function qf(e) {
      return Array.isArray(e) && Array.isArray(e.raw);
    }
    var Vf = /* @__PURE__ */ new Set(["toJSON", "$$typeof", "asymmetricMatch", Symbol.iterator, Symbol.toStringTag, Symbol.isConcatSpreadable, Symbol.toPrimitive]);
    function gu(e) {
      return new Proxy(e, { get(r, t) {
        if (t in r)
          return r[t];
        if (!Vf.has(t))
          throw new TypeError(`Invalid enum value: ${String(t)}`);
      } });
    }
    function hu(e) {
      st(e, { conflictCheck: "warn" });
    }
  }
});

// ../../node_modules/.prisma/client/index.js
var require_client = __commonJS({
  "../../node_modules/.prisma/client/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var {
      PrismaClientKnownRequestError: PrismaClientKnownRequestError2,
      PrismaClientUnknownRequestError: PrismaClientUnknownRequestError2,
      PrismaClientRustPanicError: PrismaClientRustPanicError2,
      PrismaClientInitializationError: PrismaClientInitializationError2,
      PrismaClientValidationError: PrismaClientValidationError2,
      getPrismaClient: getPrismaClient2,
      sqltag: sqltag2,
      empty: empty2,
      join: join2,
      raw: raw2,
      skip: skip2,
      Decimal: Decimal2,
      Debug: Debug2,
      objectEnumValues: objectEnumValues2,
      makeStrictEnum: makeStrictEnum2,
      Extensions: Extensions2,
      warnOnce: warnOnce2,
      defineDmmfProperty: defineDmmfProperty2,
      Public: Public2,
      getRuntime: getRuntime2,
      createParam: createParam2
    } = require_library();
    var Prisma = {};
    exports.Prisma = Prisma;
    exports.$Enums = {};
    Prisma.prismaVersion = {
      client: "6.16.2",
      engine: "1c57fdcd7e44b29b9313256c76699e91c3ac3c43"
    };
    Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError2;
    Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError2;
    Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError2;
    Prisma.PrismaClientInitializationError = PrismaClientInitializationError2;
    Prisma.PrismaClientValidationError = PrismaClientValidationError2;
    Prisma.Decimal = Decimal2;
    Prisma.sql = sqltag2;
    Prisma.empty = empty2;
    Prisma.join = join2;
    Prisma.raw = raw2;
    Prisma.validator = Public2.validator;
    Prisma.getExtensionContext = Extensions2.getExtensionContext;
    Prisma.defineExtension = Extensions2.defineExtension;
    Prisma.DbNull = objectEnumValues2.instances.DbNull;
    Prisma.JsonNull = objectEnumValues2.instances.JsonNull;
    Prisma.AnyNull = objectEnumValues2.instances.AnyNull;
    Prisma.NullTypes = {
      DbNull: objectEnumValues2.classes.DbNull,
      JsonNull: objectEnumValues2.classes.JsonNull,
      AnyNull: objectEnumValues2.classes.AnyNull
    };
    var path = __require("path");
    exports.Prisma.TransactionIsolationLevel = makeStrictEnum2({
      ReadUncommitted: "ReadUncommitted",
      ReadCommitted: "ReadCommitted",
      RepeatableRead: "RepeatableRead",
      Serializable: "Serializable"
    });
    exports.Prisma.UserScalarFieldEnum = {
      id: "id",
      email: "email",
      password: "password",
      firstName: "firstName",
      lastName: "lastName",
      phone: "phone",
      role: "role",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      merchantId: "merchantId",
      outletId: "outletId",
      deletedAt: "deletedAt"
    };
    exports.Prisma.MerchantScalarFieldEnum = {
      id: "id",
      name: "name",
      email: "email",
      phone: "phone",
      address: "address",
      city: "city",
      state: "state",
      zipCode: "zipCode",
      country: "country",
      businessType: "businessType",
      taxId: "taxId",
      website: "website",
      description: "description",
      planId: "planId",
      subscriptionStatus: "subscriptionStatus",
      totalRevenue: "totalRevenue",
      lastActiveAt: "lastActiveAt",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      pricingConfig: "pricingConfig",
      pricingType: "pricingType"
    };
    exports.Prisma.OutletScalarFieldEnum = {
      id: "id",
      name: "name",
      address: "address",
      description: "description",
      isActive: "isActive",
      isDefault: "isDefault",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      merchantId: "merchantId",
      phone: "phone",
      city: "city",
      country: "country",
      state: "state",
      zipCode: "zipCode"
    };
    exports.Prisma.CategoryScalarFieldEnum = {
      id: "id",
      name: "name",
      description: "description",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      merchantId: "merchantId"
    };
    exports.Prisma.ProductScalarFieldEnum = {
      id: "id",
      name: "name",
      description: "description",
      barcode: "barcode",
      totalStock: "totalStock",
      rentPrice: "rentPrice",
      salePrice: "salePrice",
      deposit: "deposit",
      images: "images",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      merchantId: "merchantId",
      categoryId: "categoryId"
    };
    exports.Prisma.OutletStockScalarFieldEnum = {
      id: "id",
      stock: "stock",
      available: "available",
      renting: "renting",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      productId: "productId",
      outletId: "outletId"
    };
    exports.Prisma.CustomerScalarFieldEnum = {
      id: "id",
      firstName: "firstName",
      lastName: "lastName",
      email: "email",
      phone: "phone",
      address: "address",
      city: "city",
      state: "state",
      zipCode: "zipCode",
      country: "country",
      dateOfBirth: "dateOfBirth",
      idNumber: "idNumber",
      idType: "idType",
      notes: "notes",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      merchantId: "merchantId"
    };
    exports.Prisma.OrderScalarFieldEnum = {
      id: "id",
      orderNumber: "orderNumber",
      orderType: "orderType",
      status: "status",
      totalAmount: "totalAmount",
      depositAmount: "depositAmount",
      securityDeposit: "securityDeposit",
      damageFee: "damageFee",
      lateFee: "lateFee",
      discountType: "discountType",
      discountValue: "discountValue",
      discountAmount: "discountAmount",
      pickupPlanAt: "pickupPlanAt",
      returnPlanAt: "returnPlanAt",
      pickedUpAt: "pickedUpAt",
      returnedAt: "returnedAt",
      rentalDuration: "rentalDuration",
      isReadyToDeliver: "isReadyToDeliver",
      collateralType: "collateralType",
      collateralDetails: "collateralDetails",
      notes: "notes",
      pickupNotes: "pickupNotes",
      returnNotes: "returnNotes",
      damageNotes: "damageNotes",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      outletId: "outletId",
      customerId: "customerId",
      createdById: "createdById"
    };
    exports.Prisma.OrderItemScalarFieldEnum = {
      id: "id",
      quantity: "quantity",
      unitPrice: "unitPrice",
      totalPrice: "totalPrice",
      deposit: "deposit",
      orderId: "orderId",
      productId: "productId",
      notes: "notes",
      rentalDays: "rentalDays"
    };
    exports.Prisma.PaymentScalarFieldEnum = {
      id: "id",
      amount: "amount",
      currency: "currency",
      method: "method",
      type: "type",
      status: "status",
      reference: "reference",
      transactionId: "transactionId",
      invoiceNumber: "invoiceNumber",
      description: "description",
      notes: "notes",
      failureReason: "failureReason",
      metadata: "metadata",
      processedAt: "processedAt",
      processedBy: "processedBy",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      orderId: "orderId",
      subscriptionId: "subscriptionId",
      merchantId: "merchantId"
    };
    exports.Prisma.PlanScalarFieldEnum = {
      id: "id",
      name: "name",
      description: "description",
      basePrice: "basePrice",
      currency: "currency",
      trialDays: "trialDays",
      limits: "limits",
      features: "features",
      isActive: "isActive",
      isPopular: "isPopular",
      sortOrder: "sortOrder",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deletedAt"
    };
    exports.Prisma.SubscriptionScalarFieldEnum = {
      id: "id",
      merchantId: "merchantId",
      planId: "planId",
      status: "status",
      currentPeriodStart: "currentPeriodStart",
      currentPeriodEnd: "currentPeriodEnd",
      trialStart: "trialStart",
      trialEnd: "trialEnd",
      cancelAtPeriodEnd: "cancelAtPeriodEnd",
      canceledAt: "canceledAt",
      cancelReason: "cancelReason",
      amount: "amount",
      currency: "currency",
      interval: "interval",
      intervalCount: "intervalCount",
      period: "period",
      discount: "discount",
      savings: "savings",
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    };
    exports.Prisma.SubscriptionActivityScalarFieldEnum = {
      id: "id",
      subscriptionId: "subscriptionId",
      type: "type",
      description: "description",
      metadata: "metadata",
      performedBy: "performedBy",
      createdAt: "createdAt",
      reason: "reason"
    };
    exports.Prisma.AuditLogScalarFieldEnum = {
      id: "id",
      entityType: "entityType",
      entityId: "entityId",
      action: "action",
      details: "details",
      userId: "userId",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      createdAt: "createdAt"
    };
    exports.Prisma.SortOrder = {
      asc: "asc",
      desc: "desc"
    };
    exports.Prisma.QueryMode = {
      default: "default",
      insensitive: "insensitive"
    };
    exports.Prisma.NullsOrder = {
      first: "first",
      last: "last"
    };
    exports.Prisma.ModelName = {
      User: "User",
      Merchant: "Merchant",
      Outlet: "Outlet",
      Category: "Category",
      Product: "Product",
      OutletStock: "OutletStock",
      Customer: "Customer",
      Order: "Order",
      OrderItem: "OrderItem",
      Payment: "Payment",
      Plan: "Plan",
      Subscription: "Subscription",
      SubscriptionActivity: "SubscriptionActivity",
      AuditLog: "AuditLog"
    };
    var config = {
      "generator": {
        "name": "client",
        "provider": {
          "fromEnvVar": null,
          "value": "prisma-client-js"
        },
        "output": {
          "value": "/Users/mac/Source-Code/rentalshop-nextjs/node_modules/@prisma/client",
          "fromEnvVar": null
        },
        "config": {
          "engineType": "library"
        },
        "binaryTargets": [
          {
            "fromEnvVar": null,
            "value": "darwin-arm64",
            "native": true
          },
          {
            "fromEnvVar": null,
            "value": "debian-openssl-3.0.x"
          },
          {
            "fromEnvVar": null,
            "value": "linux-musl-openssl-3.0.x"
          }
        ],
        "previewFeatures": [],
        "sourceFilePath": "/Users/mac/Source-Code/rentalshop-nextjs/prisma/schema.prisma"
      },
      "relativeEnvPaths": {
        "rootEnvPath": null,
        "schemaEnvPath": "../../../.env"
      },
      "relativePath": "../../../prisma",
      "clientVersion": "6.16.2",
      "engineVersion": "1c57fdcd7e44b29b9313256c76699e91c3ac3c43",
      "datasourceNames": [
        "db"
      ],
      "activeProvider": "postgresql",
      "postinstall": false,
      "inlineDatasources": {
        "db": {
          "url": {
            "fromEnvVar": "DATABASE_URL",
            "value": null
          }
        }
      },
      "inlineSchema": 'generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nmodel User {\n  id                     Int                    @id @default(autoincrement())\n  email                  String                 @unique\n  password               String\n  firstName              String\n  lastName               String\n  phone                  String?\n  role                   String                 @default("OUTLET_STAFF")\n  isActive               Boolean                @default(true)\n  createdAt              DateTime               @default(now())\n  updatedAt              DateTime               @updatedAt\n  merchantId             Int?\n  outletId               Int?\n  deletedAt              DateTime?\n  auditLogs              AuditLog[]\n  createdOrders          Order[]\n  subscriptionActivities SubscriptionActivity[]\n  merchant               Merchant?              @relation(fields: [merchantId], references: [id])\n  outlet                 Outlet?                @relation(fields: [outletId], references: [id])\n\n  @@unique([merchantId, email])\n  @@unique([merchantId, phone])\n  @@index([email])\n  @@index([merchantId])\n  @@index([outletId])\n  @@index([deletedAt])\n}\n\nmodel Merchant {\n  id                 Int           @id @default(autoincrement())\n  name               String\n  email              String        @unique\n  phone              String?\n  address            String?\n  city               String?\n  state              String?\n  zipCode            String?\n  country            String?\n  businessType       String?\n  taxId              String?\n  website            String?\n  description        String?\n  planId             Int?\n  subscriptionStatus String        @default("trial")\n  totalRevenue       Float         @default(0)\n  lastActiveAt       DateTime?\n  isActive           Boolean       @default(true)\n  createdAt          DateTime      @default(now())\n  updatedAt          DateTime      @updatedAt\n  pricingConfig      String?       @default("{\\"businessType\\":\\"GENERAL\\",\\"defaultPricingType\\":\\"FIXED\\",\\"businessRules\\":{\\"requireRentalDates\\":false,\\"showPricingOptions\\":false},\\"durationLimits\\":{\\"minDuration\\":1,\\"maxDuration\\":1,\\"defaultDuration\\":1}}")\n  pricingType        String?\n  categories         Category[]\n  customers          Customer[]\n  Plan               Plan?         @relation(fields: [planId], references: [id])\n  outlets            Outlet[]\n  payments           Payment[]\n  products           Product[]\n  subscription       Subscription?\n  users              User[]\n\n  @@index([name])\n  @@index([email])\n  @@index([subscriptionStatus])\n  @@index([planId])\n}\n\nmodel Outlet {\n  id          Int           @id @default(autoincrement())\n  name        String\n  address     String?\n  description String?\n  isActive    Boolean       @default(true)\n  isDefault   Boolean       @default(false)\n  createdAt   DateTime      @default(now())\n  updatedAt   DateTime      @updatedAt\n  merchantId  Int\n  phone       String?\n  city        String?\n  country     String?\n  state       String?\n  zipCode     String?\n  orders      Order[]\n  merchant    Merchant      @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  products    OutletStock[]\n  users       User[]\n\n  @@index([merchantId])\n  @@index([name])\n  @@index([isDefault])\n}\n\nmodel Category {\n  id          Int       @id @default(autoincrement())\n  name        String\n  description String?\n  isActive    Boolean   @default(true)\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  merchantId  Int\n  merchant    Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  products    Product[]\n\n  @@unique([merchantId, name])\n  @@index([merchantId])\n}\n\nmodel Product {\n  id          Int           @id @default(autoincrement())\n  name        String\n  description String?\n  barcode     String?       @unique\n  totalStock  Int           @default(0)\n  rentPrice   Float\n  salePrice   Float?\n  deposit     Float         @default(0)\n  images      String?\n  isActive    Boolean       @default(true)\n  createdAt   DateTime      @default(now())\n  updatedAt   DateTime      @updatedAt\n  merchantId  Int\n  categoryId  Int\n  orderItems  OrderItem[]\n  outletStock OutletStock[]\n  merchant    Merchant      @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  category    Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)\n\n  @@index([merchantId])\n  @@index([categoryId])\n  @@index([barcode])\n  @@index([name])\n}\n\nmodel OutletStock {\n  id        Int      @id @default(autoincrement())\n  stock     Int      @default(0)\n  available Int      @default(0)\n  renting   Int      @default(0)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  productId Int\n  outletId  Int\n  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)\n  outlet    Outlet   @relation(fields: [outletId], references: [id], onDelete: Cascade)\n\n  @@unique([productId, outletId])\n  @@index([outletId, available])\n  @@index([productId])\n}\n\nmodel Customer {\n  id          Int       @id @default(autoincrement())\n  firstName   String\n  lastName    String\n  email       String?\n  phone       String\n  address     String?\n  city        String?\n  state       String?\n  zipCode     String?\n  country     String?\n  dateOfBirth DateTime?\n  idNumber    String?\n  idType      String?\n  notes       String?\n  isActive    Boolean   @default(true)\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  merchantId  Int\n  merchant    Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  orders      Order[]\n\n  @@unique([merchantId, phone])\n  @@index([merchantId, firstName, lastName])\n}\n\nmodel Order {\n  id                Int         @id @default(autoincrement())\n  orderNumber       String      @unique\n  orderType         String\n  status            String      @default("RESERVED")\n  totalAmount       Float\n  depositAmount     Float       @default(0)\n  securityDeposit   Float       @default(0)\n  damageFee         Float       @default(0)\n  lateFee           Float       @default(0)\n  discountType      String?\n  discountValue     Float       @default(0)\n  discountAmount    Float       @default(0)\n  pickupPlanAt      DateTime?\n  returnPlanAt      DateTime?\n  pickedUpAt        DateTime?\n  returnedAt        DateTime?\n  rentalDuration    Int?\n  isReadyToDeliver  Boolean     @default(false)\n  collateralType    String?\n  collateralDetails String?\n  notes             String?\n  pickupNotes       String?\n  returnNotes       String?\n  damageNotes       String?\n  createdAt         DateTime    @default(now())\n  updatedAt         DateTime    @updatedAt\n  outletId          Int\n  customerId        Int?\n  createdById       Int\n  customer          Customer?   @relation(fields: [customerId], references: [id])\n  outlet            Outlet      @relation(fields: [outletId], references: [id])\n  createdBy         User        @relation(fields: [createdById], references: [id])\n  orderItems        OrderItem[]\n  payments          Payment[]\n\n  @@index([status, outletId])\n  @@index([customerId, createdAt(sort: Desc)])\n  @@index([pickupPlanAt, returnPlanAt])\n  @@index([orderNumber])\n  @@index([isReadyToDeliver, outletId])\n  @@index([createdAt])\n  @@index([outletId, createdAt])\n  @@index([orderType, status])\n  @@index([outletId, status, createdAt])\n  @@index([createdById, createdAt])\n  @@index([totalAmount])\n  @@index([status, orderType, createdAt])\n}\n\nmodel OrderItem {\n  id         Int     @id @default(autoincrement())\n  quantity   Int     @default(1)\n  unitPrice  Float\n  totalPrice Float\n  deposit    Float   @default(0)\n  orderId    Int\n  productId  Int\n  notes      String?\n  rentalDays Int?\n  product    Product @relation(fields: [productId], references: [id])\n  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@index([orderId, productId])\n}\n\nmodel Payment {\n  id             Int           @id @default(autoincrement())\n  amount         Float\n  currency       String        @default("USD")\n  method         String\n  type           String\n  status         String        @default("PENDING")\n  reference      String?\n  transactionId  String?\n  invoiceNumber  String?\n  description    String?\n  notes          String?\n  failureReason  String?\n  metadata       String?\n  processedAt    DateTime?\n  processedBy    String?\n  createdAt      DateTime      @default(now())\n  updatedAt      DateTime      @updatedAt\n  orderId        Int?\n  subscriptionId Int?\n  merchantId     Int?\n  order          Order?        @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  subscription   Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)\n  merchant       Merchant?     @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n\n  @@index([orderId, status])\n  @@index([subscriptionId, status])\n  @@index([merchantId, status])\n  @@index([status])\n  @@index([type])\n  @@index([method])\n  @@index([currency])\n}\n\nmodel Plan {\n  id            Int            @id @default(autoincrement())\n  name          String         @unique\n  description   String\n  basePrice     Float\n  currency      String         @default("USD")\n  trialDays     Int            @default(14)\n  limits        String         @default("{\\"outlets\\": 0, \\"users\\": 0, \\"products\\": 0, \\"customers\\": 0}")\n  features      String         @default("[]")\n  isActive      Boolean        @default(true)\n  isPopular     Boolean        @default(false)\n  sortOrder     Int            @default(0)\n  createdAt     DateTime       @default(now())\n  updatedAt     DateTime       @updatedAt\n  deletedAt     DateTime?\n  Merchant      Merchant[]\n  subscriptions Subscription[]\n\n  @@index([isActive])\n  @@index([sortOrder])\n  @@index([deletedAt])\n}\n\nmodel Subscription {\n  id                 Int                    @id @default(autoincrement())\n  merchantId         Int                    @unique\n  planId             Int\n  status             String                 @default("trial")\n  currentPeriodStart DateTime\n  currentPeriodEnd   DateTime\n  trialStart         DateTime?\n  trialEnd           DateTime?\n  cancelAtPeriodEnd  Boolean                @default(false)\n  canceledAt         DateTime?\n  cancelReason       String?\n  amount             Float\n  currency           String                 @default("USD")\n  interval           String                 @default("month")\n  intervalCount      Int                    @default(1)\n  period             Int                    @default(1)\n  discount           Float                  @default(0)\n  savings            Float                  @default(0)\n  createdAt          DateTime               @default(now())\n  updatedAt          DateTime               @updatedAt\n  payments           Payment[]\n  plan               Plan                   @relation(fields: [planId], references: [id])\n  merchant           Merchant               @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  activities         SubscriptionActivity[]\n\n  @@index([merchantId])\n  @@index([planId])\n  @@index([status])\n}\n\nmodel SubscriptionActivity {\n  id             Int          @id @default(autoincrement())\n  subscriptionId Int\n  type           String\n  description    String\n  metadata       String?\n  performedBy    Int?\n  createdAt      DateTime     @default(now())\n  reason         String?\n  user           User?        @relation(fields: [performedBy], references: [id])\n  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)\n\n  @@index([subscriptionId])\n  @@index([type])\n  @@index([createdAt])\n}\n\nmodel AuditLog {\n  id         Int      @id @default(autoincrement())\n  entityType String\n  entityId   String\n  action     String\n  details    String\n  userId     Int?\n  ipAddress  String?\n  userAgent  String?\n  createdAt  DateTime @default(now())\n  user       User?    @relation(fields: [userId], references: [id])\n\n  @@index([entityType, entityId])\n  @@index([userId])\n  @@index([action])\n  @@index([createdAt])\n}\n',
      "inlineSchemaHash": "8a32b01ae52b32d4b45b75fc94675c33e0a9c2b505343706a0346515c89a2910",
      "copyEngine": true
    };
    var fs = __require("fs");
    config.dirname = __dirname;
    if (!fs.existsSync(path.join(__dirname, "schema.prisma"))) {
      const alternativePaths = [
        "node_modules/.prisma/client",
        ".prisma/client"
      ];
      const alternativePath = alternativePaths.find((altPath) => {
        return fs.existsSync(path.join(process.cwd(), altPath, "schema.prisma"));
      }) ?? alternativePaths[0];
      config.dirname = path.join(process.cwd(), alternativePath);
      config.isBundled = true;
    }
    config.runtimeDataModel = JSON.parse('{"models":{"User":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"password","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"firstName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"lastName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"role","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"OUTLET_STAFF","isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"outletId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deletedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"auditLogs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"AuditLog","nativeType":null,"relationName":"AuditLogToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"createdOrders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionActivities","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubscriptionActivity","nativeType":null,"relationName":"SubscriptionActivityToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToUser","relationFromFields":["merchantId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OutletToUser","relationFromFields":["outletId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","email"],["merchantId","phone"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","email"]},{"name":null,"fields":["merchantId","phone"]}],"isGenerated":false},"Merchant":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"businessType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"taxId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"website","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"planId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionStatus","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"trial","isGenerated":false,"isUpdatedAt":false},{"name":"totalRevenue","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lastActiveAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"pricingConfig","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"{\\"businessType\\":\\"GENERAL\\",\\"defaultPricingType\\":\\"FIXED\\",\\"businessRules\\":{\\"requireRentalDates\\":false,\\"showPricingOptions\\":false},\\"durationLimits\\":{\\"minDuration\\":1,\\"maxDuration\\":1,\\"defaultDuration\\":1}}","isGenerated":false,"isUpdatedAt":false},{"name":"pricingType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"categories","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryToMerchant","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"customers","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Customer","nativeType":null,"relationName":"CustomerToMerchant","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"Plan","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Plan","nativeType":null,"relationName":"MerchantToPlan","relationFromFields":["planId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlets","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"MerchantToOutlet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"MerchantToPayment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"MerchantToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"MerchantToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"users","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"MerchantToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Outlet":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"isDefault","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToOutlet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToOutlet","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OutletStock","nativeType":null,"relationName":"OutletToOutletStock","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"users","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"OutletToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Category":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"CategoryToMerchant","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","name"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","name"]}],"isGenerated":false},"Product":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"barcode","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalStock","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"rentPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"salePrice","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"images","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"categoryId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orderItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"outletStock","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OutletStock","nativeType":null,"relationName":"OutletStockToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToProduct","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":["categoryId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"OutletStock":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"stock","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"available","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"renting","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"productId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"outletId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"OutletStockToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OutletToOutletStock","relationFromFields":["outletId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["productId","outletId"]],"uniqueIndexes":[{"name":null,"fields":["productId","outletId"]}],"isGenerated":false},"Customer":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"firstName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"lastName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"dateOfBirth","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idNumber","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"CustomerToMerchant","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"orders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"CustomerToOrder","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","phone"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","phone"]}],"isGenerated":false},"Order":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderNumber","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orderType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"RESERVED","isGenerated":false,"isUpdatedAt":false},{"name":"totalAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"depositAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"securityDeposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"damageFee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lateFee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"discountType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"discountValue","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"discountAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"pickupPlanAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnPlanAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"pickedUpAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"rentalDuration","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isReadyToDeliver","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"collateralType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"collateralDetails","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"pickupNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"damageNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"outletId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"customerId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdById","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"customer","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Customer","nativeType":null,"relationName":"CustomerToOrder","relationFromFields":["customerId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OrderToOutlet","relationFromFields":["outletId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"createdBy","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"OrderToUser","relationFromFields":["createdById"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"orderItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"OrderToPayment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"OrderItem":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"unitPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"productId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"rentalDays","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":["productId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Payment":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"method","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"reference","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"transactionId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"invoiceNumber","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"failureReason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"processedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"processedBy","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"orderId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToPayment","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"PaymentToSubscription","relationFromFields":["subscriptionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToPayment","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Plan":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"basePrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"trialDays","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":14,"isGenerated":false,"isUpdatedAt":false},{"name":"limits","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"{\\"outlets\\": 0, \\"users\\": 0, \\"products\\": 0, \\"customers\\": 0}","isGenerated":false,"isUpdatedAt":false},{"name":"features","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"isPopular","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"sortOrder","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"deletedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"Merchant","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToPlan","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"PlanToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Subscription":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"planId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"trial","isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodStart","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodEnd","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"trialStart","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"trialEnd","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"cancelAtPeriodEnd","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"canceledAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"cancelReason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"interval","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"month","isGenerated":false,"isUpdatedAt":false},{"name":"intervalCount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"period","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"discount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"savings","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"PaymentToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"plan","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Plan","nativeType":null,"relationName":"PlanToSubscription","relationFromFields":["planId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToSubscription","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"activities","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubscriptionActivity","nativeType":null,"relationName":"SubscriptionToSubscriptionActivity","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"SubscriptionActivity":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"performedBy","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"SubscriptionActivityToUser","relationFromFields":["performedBy"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"SubscriptionToSubscriptionActivity","relationFromFields":["subscriptionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"AuditLog":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"entityType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"entityId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"action","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"details","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"userId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"ipAddress","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"userAgent","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"AuditLogToUser","relationFromFields":["userId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false}},"enums":{},"types":{}}');
    defineDmmfProperty2(exports.Prisma, config.runtimeDataModel);
    config.engineWasm = void 0;
    config.compilerWasm = void 0;
    var { warnEnvConflicts: warnEnvConflicts2 } = require_library();
    warnEnvConflicts2({
      rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
      schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath)
    });
    var PrismaClient2 = getPrismaClient2(config);
    exports.PrismaClient = PrismaClient2;
    Object.assign(exports, Prisma);
    path.join(__dirname, "libquery_engine-darwin-arm64.dylib.node");
    path.join(process.cwd(), "node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node");
    path.join(__dirname, "libquery_engine-debian-openssl-3.0.x.so.node");
    path.join(process.cwd(), "node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node");
    path.join(__dirname, "libquery_engine-linux-musl-openssl-3.0.x.so.node");
    path.join(process.cwd(), "node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node");
    path.join(__dirname, "schema.prisma");
    path.join(process.cwd(), "node_modules/.prisma/client/schema.prisma");
  }
});

// ../../node_modules/.prisma/client/default.js
var require_default = __commonJS({
  "../../node_modules/.prisma/client/default.js"(exports, module) {
    module.exports = { ...require_client() };
  }
});

// ../../node_modules/@prisma/client/default.js
var require_default2 = __commonJS({
  "../../node_modules/@prisma/client/default.js"(exports, module) {
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
    const crypto2 = __require("crypto");
    const randomBytesNode = crypto2.randomBytes(length);
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
/*! Bundled license information:

@prisma/client/runtime/library.js:
  (*! Bundled license information:
  
  decimal.js/decimal.mjs:
    (*!
     *  decimal.js v10.5.0
     *  An arbitrary-precision Decimal type for JavaScript.
     *  https://github.com/MikeMcl/decimal.js
     *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
     *  MIT Licence
     *)
  *)
*/

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