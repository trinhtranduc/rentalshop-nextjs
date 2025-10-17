// src/audit/audit.ts
import { getAuditLogger, extractAuditContext } from "@rentalshop/database";
import { prisma } from "@rentalshop/database";
import { verifyTokenSimple } from "@rentalshop/auth";
var defaultConfig = {
  methods: ["POST", "PUT", "PATCH", "DELETE"],
  includeRoutes: [/^\/api\//],
  excludeRoutes: [/^\/api\/health/, /^\/api\/docs/],
  logBodies: false,
  maxBodySize: 1024,
  // 1KB
  logSuccess: true,
  logErrors: true,
  severityMap: {
    200: "INFO",
    201: "INFO",
    400: "WARNING",
    401: "WARNING",
    403: "WARNING",
    404: "INFO",
    500: "ERROR",
    502: "ERROR",
    503: "ERROR"
  }
};
function createAuditMiddleware(config = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const auditLogger = getAuditLogger(prisma);
  return async function auditMiddleware(request, next) {
    const startTime = Date.now();
    let response;
    let user = null;
    let requestBody = null;
    let responseBody = null;
    try {
      if (!shouldAuditRequest(request, finalConfig)) {
        return await next();
      }
      try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (token) {
          user = await verifyTokenSimple(token);
        }
      } catch (error) {
      }
      if (finalConfig.logBodies && request.body) {
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.text();
          if (body.length <= finalConfig.maxBodySize) {
            requestBody = JSON.parse(body);
          }
        } catch (error) {
        }
      }
      response = await next();
      if (finalConfig.logBodies && response.body) {
        try {
          const clonedResponse = response.clone();
          const body = await clonedResponse.text();
          if (body.length <= finalConfig.maxBodySize) {
            responseBody = JSON.parse(body);
          }
        } catch (error) {
        }
      }
      await logAuditEventInternal(
        request,
        response,
        user,
        requestBody,
        responseBody,
        Date.now() - startTime,
        finalConfig,
        auditLogger
      );
      return response;
    } catch (error) {
      if (finalConfig.logErrors) {
        await logErrorEvent(
          request,
          error,
          user,
          requestBody,
          Date.now() - startTime,
          finalConfig,
          auditLogger
        );
      }
      throw error;
    }
  };
}
function shouldAuditRequest(request, config) {
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  if (config.methods && !config.methods.includes(method)) {
    return false;
  }
  if (config.includeRoutes) {
    const shouldInclude = config.includeRoutes.some((pattern) => pattern.test(pathname));
    if (!shouldInclude) {
      return false;
    }
  }
  if (config.excludeRoutes) {
    const shouldExclude = config.excludeRoutes.some((pattern) => pattern.test(pathname));
    if (shouldExclude) {
      return false;
    }
  }
  return true;
}
async function logAuditEventInternal(request, response, user, requestBody, responseBody, duration, config, auditLogger) {
  if (!config.logSuccess)
    return;
  const status = response.status;
  const severity = config.severityMap?.[status] || "INFO";
  const { entityType, action, entityId } = extractEntityInfo(request, requestBody);
  const context = extractAuditContext(request, user);
  context.metadata = {
    ...context.metadata,
    duration,
    status,
    requestBody: config.logBodies ? requestBody : void 0,
    responseBody: config.logBodies ? responseBody : void 0
  };
  await auditLogger.log({
    action,
    entityType,
    entityId,
    entityName: extractEntityName(request, requestBody, responseBody),
    newValues: config.logBodies ? requestBody : void 0,
    severity,
    category: getCategoryFromPath(request.nextUrl.pathname),
    description: `${request.method} ${request.nextUrl.pathname} - ${status}`,
    context
  });
}
async function logErrorEvent(request, error, user, requestBody, duration, config, auditLogger) {
  const { entityType, action, entityId } = extractEntityInfo(request, requestBody);
  const context = extractAuditContext(request, user);
  context.metadata = {
    ...context.metadata,
    duration,
    error: error.message,
    requestBody: config.logBodies ? requestBody : void 0
  };
  await auditLogger.log({
    action,
    entityType,
    entityId,
    entityName: extractEntityName(request, requestBody),
    severity: "ERROR",
    category: "SYSTEM",
    description: `Error in ${request.method} ${request.nextUrl.pathname}: ${error.message}`,
    context
  });
}
function extractEntityInfo(request, requestBody) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const pathParts = pathname.split("/").filter(Boolean);
  let entityType = "Unknown";
  let entityId = "unknown";
  if (pathParts.length >= 2) {
    entityType = pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
    if (pathParts.length >= 3) {
      entityId = pathParts[2];
    } else if (requestBody?.id) {
      entityId = requestBody.id;
    } else if (requestBody?.id) {
      entityId = requestBody.id;
    }
  }
  const actionMap = {
    "GET": "VIEW",
    "POST": "CREATE",
    "PUT": "UPDATE",
    "PATCH": "UPDATE",
    "DELETE": "DELETE"
  };
  const action = actionMap[method] || "CUSTOM";
  return { entityType, action, entityId };
}
function extractEntityName(request, requestBody, responseBody) {
  if (requestBody?.name)
    return requestBody.name;
  if (requestBody?.email)
    return requestBody.email;
  if (requestBody?.title)
    return requestBody.title;
  if (responseBody?.data?.name)
    return responseBody.data.name;
  if (responseBody?.data?.email)
    return responseBody.data.email;
  const pathParts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (pathParts.length >= 2) {
    return `${pathParts[1]} ${pathParts[2] || "operation"}`;
  }
  return "Unknown entity";
}
function getCategoryFromPath(pathname) {
  if (pathname.includes("/auth/") || pathname.includes("/login") || pathname.includes("/logout")) {
    return "SECURITY";
  }
  if (pathname.includes("/settings/") || pathname.includes("/admin/")) {
    return "SYSTEM";
  }
  if (pathname.includes("/orders/") || pathname.includes("/products/") || pathname.includes("/customers/")) {
    return "BUSINESS";
  }
  return "GENERAL";
}
function withAuditLogging(handler, config) {
  const auditMiddleware = createAuditMiddleware(config);
  return async function(request) {
    return auditMiddleware(request, () => handler(request));
  };
}
async function logAuditEvent(action, entityType, entityId, entityName, oldValues, newValues, request, user, description) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  await auditLogger.log({
    action,
    entityType,
    entityId,
    entityName,
    oldValues,
    newValues,
    description,
    context
  });
}

// src/audit/audit-context.ts
import { verifyTokenSimple as verifyTokenSimple2 } from "@rentalshop/auth";
var requestContexts = /* @__PURE__ */ new Map();
var currentContext;
function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
async function captureAuditContext(request) {
  const requestId = generateRequestId();
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const sessionId = request.headers.get("x-session-id") || "unknown";
  let context = {
    ipAddress,
    userAgent,
    sessionId,
    requestId,
    metadata: {
      method: request.method,
      url: request.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      const user = await verifyTokenSimple2(token);
      if (user) {
        context.userId = user.id;
        context.userEmail = user.email || void 0;
        context.userRole = user.role || void 0;
        context.merchantId = user.merchantId;
        context.outletId = user.outletId;
      }
    }
  } catch (error) {
    console.error("Error extracting user context for audit:", error);
  }
  requestContexts.set(requestId, context);
  currentContext = context;
  return context;
}
function getAuditContext() {
  return currentContext;
}
function getAuditContextById(requestId) {
  return requestContexts.get(requestId);
}
function clearAuditContext(requestId) {
  requestContexts.delete(requestId);
  if (currentContext?.requestId === requestId) {
    currentContext = void 0;
  }
}
setInterval(() => {
  const now = Date.now();
  for (const [requestId, context] of requestContexts.entries()) {
    const contextAge = now - parseInt(requestId.split("-")[1]);
    if (contextAge > 3e5) {
      requestContexts.delete(requestId);
    }
  }
}, 6e4);

// src/rate-limit/rate-limit.ts
import { NextResponse } from "next/server";
var rateLimitStore = {};
var createRateLimiter = (config) => {
  const {
    windowMs = 6e4,
    // 1 minute default
    maxRequests = 10,
    // 10 requests per minute default
    keyGenerator = (req) => {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0] : req.ip || "unknown";
      return `rate_limit:${ip}`;
    }
  } = config;
  return (request) => {
    const key = keyGenerator(request);
    const now = Date.now();
    if (!rateLimitStore[key] || now > rateLimitStore[key].resetTime) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      rateLimitStore[key].count++;
    }
    if (rateLimitStore[key].count > maxRequests) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1e3} seconds.`,
          retryAfter: Math.ceil((rateLimitStore[key].resetTime - now) / 1e3)
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitStore[key].resetTime - now) / 1e3).toString(),
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitStore[key].resetTime.toString()
          }
        }
      );
    }
    return null;
  };
};
var searchRateLimiter = createRateLimiter({
  windowMs: 3e4,
  // 30 seconds
  maxRequests: 20,
  // 20 requests per 30 seconds
  keyGenerator: (req) => {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.ip || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    return `search_rate_limit:${ip}:${userAgent}`;
  }
});
var apiRateLimiter = createRateLimiter({
  windowMs: 6e4,
  // 1 minute
  maxRequests: 100
  // 100 requests per minute
});
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1e3);

// src/auth/auth.ts
import { NextResponse as NextResponse2 } from "next/server";
import { verifyTokenSimple as verifyTokenSimple3, assertAnyRole } from "@rentalshop/auth";

// ../constants/src/validation.ts
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

// ../constants/src/environment.ts
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

// ../constants/src/api.ts
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

// ../constants/src/colors.ts
var ORDER_STATUS_COLORS = {
  RESERVED: {
    bg: "#DBEAFE",
    // Blue 100 - badge background
    text: "#1E40AF",
    // Blue 800 - badge text
    hex: "#3B82F6",
    // Blue 500 - primary color
    buttonBg: "#3B82F6",
    // Blue 500 - button background
    buttonHover: "#2563EB",
    // Blue 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  PICKUPED: {
    bg: "#FEF3C7",
    // Amber 100 - badge background
    text: "#92400E",
    // Amber 900 - badge text
    hex: "#F59E0B",
    // Amber 500 - primary color
    buttonBg: "#F59E0B",
    // Amber 500 - button background
    buttonHover: "#D97706",
    // Amber 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  RETURNED: {
    bg: "#D1FAE5",
    // Emerald 100 - badge background
    text: "#065F46",
    // Emerald 800 - badge text
    hex: "#10B981",
    // Emerald 500 - primary color
    buttonBg: "#10B981",
    // Emerald 500 - button background
    buttonHover: "#059669",
    // Emerald 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  COMPLETED: {
    bg: "#E0E7FF",
    // Indigo 100 - badge background
    text: "#3730A3",
    // Indigo 800 - badge text
    hex: "#6366F1",
    // Indigo 500 - primary color
    buttonBg: "#6366F1",
    // Indigo 500 - button background
    buttonHover: "#4F46E5",
    // Indigo 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  CANCELLED: {
    bg: "#FEE2E2",
    // Red 100 - badge background
    text: "#991B1B",
    // Red 800 - badge text
    hex: "#EF4444",
    // Red 500 - primary color
    buttonBg: "#EF4444",
    // Red 500 - button background
    buttonHover: "#DC2626",
    // Red 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  }
};
var ORDER_TYPE_COLORS = {
  RENT: {
    bg: "#DBEAFE",
    // Blue 100 - badge background
    text: "#1E40AF",
    // Blue 800 - badge text
    hex: "#3B82F6",
    // Blue 500 - primary color
    buttonBg: "#3B82F6",
    // Blue 500 - button background
    buttonHover: "#2563EB",
    // Blue 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  },
  SALE: {
    bg: "#D1FAE5",
    // Emerald 100 - badge background
    text: "#065F46",
    // Emerald 800 - badge text
    hex: "#10B981",
    // Emerald 500 - primary color
    buttonBg: "#10B981",
    // Emerald 500 - button background
    buttonHover: "#059669",
    // Emerald 600 - button hover
    buttonText: "#FFFFFF"
    // White - button text
  }
};

// ../constants/src/orders.ts
var ORDER_STATUS_BUTTON_COLORS = {
  RESERVED: ORDER_STATUS_COLORS.RESERVED,
  PICKUPED: ORDER_STATUS_COLORS.PICKUPED,
  RETURNED: ORDER_STATUS_COLORS.RETURNED,
  COMPLETED: ORDER_STATUS_COLORS.COMPLETED,
  CANCELLED: ORDER_STATUS_COLORS.CANCELLED
};
var ORDER_TYPE_BUTTON_COLORS = {
  RENT: ORDER_TYPE_COLORS.RENT,
  SALE: ORDER_TYPE_COLORS.SALE
};

// ../constants/src/currency.ts
var SUPPORTED_CURRENCIES = ["USD", "VND"];
var CURRENCY_SYMBOLS = {
  USD: "$",
  VND: "\u0111"
};
var CURRENCY_NAMES = {
  USD: "US Dollar",
  VND: "Vietnamese Dong"
};
var CURRENCY_LOCALES = {
  USD: "en-US",
  VND: "vi-VN"
};
var CURRENCY_DECIMALS = {
  USD: 2,
  VND: 0
};
var CURRENCY_SYMBOL_POSITION = {
  USD: "before",
  VND: "after"
};
var EXCHANGE_RATES = {
  USD: 1,
  VND: 24500
};
var CURRENCY_CONFIGS = {
  USD: {
    code: "USD",
    symbol: CURRENCY_SYMBOLS.USD,
    name: CURRENCY_NAMES.USD,
    locale: CURRENCY_LOCALES.USD,
    decimals: CURRENCY_DECIMALS.USD,
    symbolPosition: CURRENCY_SYMBOL_POSITION.USD,
    exchangeRate: EXCHANGE_RATES.USD
  },
  VND: {
    code: "VND",
    symbol: CURRENCY_SYMBOLS.VND,
    name: CURRENCY_NAMES.VND,
    locale: CURRENCY_LOCALES.VND,
    decimals: CURRENCY_DECIMALS.VND,
    symbolPosition: CURRENCY_SYMBOL_POSITION.VND,
    exchangeRate: EXCHANGE_RATES.VND
  }
};
var CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({
  value: code,
  label: `${CURRENCY_SYMBOLS[code]} ${code} - ${CURRENCY_NAMES[code]}`,
  symbol: CURRENCY_SYMBOLS[code],
  name: CURRENCY_NAMES[code]
}));

// src/auth/auth.ts
function createAuthMiddleware(config = {}) {
  const {
    requiredRoles = [],
    allowUnauthenticated = false,
    customAuth
  } = config;
  return async function authMiddleware(request, next) {
    try {
      const token = request.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) {
        if (allowUnauthenticated) {
          return await next();
        }
        return NextResponse2.json(
          { success: false, code: "ACCESS_TOKEN_REQUIRED", message: "Access token required" },
          { status: 401 }
        );
      }
      const user = await verifyTokenSimple3(token);
      if (!user) {
        return NextResponse2.json(
          { success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" },
          { status: 401 }
        );
      }
      if (requiredRoles.length > 0) {
        try {
          assertAnyRole(user, requiredRoles);
        } catch {
          return NextResponse2.json(
            { success: false, code: "INSUFFICIENT_PERMISSIONS", message: "Insufficient permissions" },
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }
      if (customAuth && !customAuth(user, request)) {
        return NextResponse2.json(
          { success: false, code: "ACCESS_DENIED", message: "Access denied" },
          { status: API.STATUS.FORBIDDEN }
        );
      }
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-user-email", user.email || "");
      requestHeaders.set("x-user-role", user.role || "");
      requestHeaders.set("x-user-merchant-id", user.merchantId?.toString() || "");
      requestHeaders.set("x-user-outlet-id", user.outletId?.toString() || "");
      return await next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse2.json(
        { success: false, code: "AUTHENTICATION_FAILED", message: "Authentication failed" },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  };
}
function withAuth(handler, config) {
  const authMiddleware = createAuthMiddleware(config);
  return async function(request) {
    return authMiddleware(request, () => handler(request));
  };
}
function getUserFromRequest(request) {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");
  const merchantId = request.headers.get("x-user-merchant-id");
  const outletId = request.headers.get("x-user-outlet-id");
  if (!userId)
    return null;
  return {
    id: userId,
    email: userEmail,
    role: userRole,
    merchantId: merchantId ? parseInt(merchantId) : void 0,
    outletId: outletId ? parseInt(outletId) : void 0
  };
}
var adminAuth = createAuthMiddleware({
  requiredRoles: ["ADMIN"]
});
var merchantAuth = createAuthMiddleware({
  requiredRoles: ["ADMIN", "MERCHANT"]
});
var outletAuth = createAuthMiddleware({
  requiredRoles: ["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]
});
var optionalAuth = createAuthMiddleware({
  allowUnauthenticated: true
});

// src/subscription-manager.ts
import { NextResponse as NextResponse3 } from "next/server";
import { prisma as prisma2 } from "@rentalshop/database";
var DEFAULT_CONFIG = {
  checkInterval: 60 * 60 * 1e3,
  // 1 hour
  gracePeriod: 0,
  // No grace period
  autoMarkExpired: true
};
var lastExpiryCheckTime = 0;
var isCheckingExpiry = false;
async function validateSubscriptionAccess(user, options = {}) {
  const {
    requireActiveSubscription = true,
    allowedStatuses = ["active"],
    checkMerchantStatus = true,
    checkSubscriptionStatus = true,
    autoUpdateExpired = true
  } = options;
  try {
    const merchant = await prisma2.merchant.findUnique({
      where: { id: user.merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionStatus: true,
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
    if (!merchant) {
      return {
        isValid: false,
        error: "Merchant not found",
        statusCode: API.STATUS.NOT_FOUND
      };
    }
    if (checkMerchantStatus) {
      const merchantStatus = merchant.subscriptionStatus?.toLowerCase();
      if (merchantStatus && !allowedStatuses.includes(merchantStatus)) {
        return {
          isValid: false,
          error: `Merchant subscription is ${merchantStatus}. Access denied.`,
          statusCode: API.STATUS.FORBIDDEN,
          merchant
        };
      }
    }
    if (checkSubscriptionStatus && requireActiveSubscription) {
      const subscription = merchant.subscription;
      if (!subscription) {
        return {
          isValid: false,
          error: "No active subscription found. Please subscribe to a plan.",
          statusCode: API.STATUS.FORBIDDEN,
          merchant
        };
      }
      const now = /* @__PURE__ */ new Date();
      const isExpired = subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now;
      if (isExpired && autoUpdateExpired) {
        try {
          await prisma2.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "expired",
              updatedAt: now
            }
          });
          console.log(`\u{1F504} Auto-updated expired subscription ${subscription.id}`);
          subscription.status = "expired";
        } catch (error) {
          console.error(`\u274C Failed to update expired subscription ${subscription.id}:`, error);
        }
      }
      const subscriptionStatus = subscription.status?.toLowerCase();
      if (isExpired) {
        return {
          isValid: false,
          error: "Subscription has expired. Please renew to continue.",
          statusCode: API.STATUS.FORBIDDEN,
          subscription,
          merchant,
          isExpired: true,
          needsStatusUpdate: true
        };
      }
      if (!allowedStatuses.includes(subscriptionStatus)) {
        return {
          isValid: false,
          error: `Subscription is ${subscriptionStatus}. Access denied.`,
          statusCode: API.STATUS.FORBIDDEN,
          subscription,
          merchant
        };
      }
    }
    return {
      isValid: true,
      subscription: merchant.subscription,
      merchant
    };
  } catch (error) {
    console.error("Subscription validation error:", error);
    return {
      isValid: false,
      error: "Failed to validate subscription",
      statusCode: API.STATUS.INTERNAL_SERVER_ERROR
    };
  }
}
async function checkSubscriptionExpiry(config = DEFAULT_CONFIG) {
  if (isCheckingExpiry) {
    return;
  }
  const now = Date.now();
  if (now - lastExpiryCheckTime < config.checkInterval) {
    return;
  }
  try {
    isCheckingExpiry = true;
    lastExpiryCheckTime = now;
    console.log("\u{1F50D} Running background subscription expiry check...");
    const expiredSubscriptions = await prisma2.subscription.findMany({
      where: {
        status: { in: ["active", "paused"] },
        currentPeriodEnd: { lt: /* @__PURE__ */ new Date() }
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    if (expiredSubscriptions.length === 0) {
      console.log("\u2705 No expired subscriptions found");
      return;
    }
    console.log(`\u26A0\uFE0F Found ${expiredSubscriptions.length} expired subscriptions`);
    for (const subscription of expiredSubscriptions) {
      try {
        if (config.autoMarkExpired) {
          await prisma2.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "expired",
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          console.log(`\u2705 Marked subscription ${subscription.id} as expired`);
        }
      } catch (error) {
        console.error(`\u274C Error processing expired subscription ${subscription.id}:`, error);
      }
    }
    console.log("\u2705 Background expiry check completed");
  } catch (error) {
    console.error("\u274C Error in background expiry check:", error);
  } finally {
    isCheckingExpiry = false;
  }
}
function withSubscriptionValidation(handler, options = {}) {
  return async (request, context) => {
    try {
      const user = request.user;
      if (!user) {
        return NextResponse3.json(
          { success: false, message: "Authentication required" },
          { status: API.STATUS.UNAUTHORIZED }
        );
      }
      const validation = await validateSubscriptionAccess(user, options);
      if (!validation.isValid) {
        return NextResponse3.json(
          {
            success: false,
            message: validation.error,
            error: "SUBSCRIPTION_ERROR",
            subscriptionStatus: validation.subscription?.status,
            merchantStatus: validation.merchant?.subscriptionStatus,
            isExpired: validation.isExpired,
            needsStatusUpdate: validation.needsStatusUpdate
          },
          { status: validation.statusCode || API.STATUS.FORBIDDEN }
        );
      }
      return await handler(request, context, validation);
    } catch (error) {
      console.error("Subscription validation middleware error:", error);
      return NextResponse3.json(
        { success: false, message: "Internal server error" },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  };
}
function canPerformOperation(subscriptionStatus, operation) {
  const status = subscriptionStatus.toLowerCase();
  switch (status) {
    case "active":
      return true;
    case "paused":
      return ["read"].includes(operation);
    case "expired":
    case "cancelled":
    case "past_due":
      return false;
    default:
      return false;
  }
}
function getSubscriptionErrorMessage(subscriptionStatus, merchantStatus) {
  const status = subscriptionStatus.toLowerCase();
  const merchant = merchantStatus?.toLowerCase();
  if (merchant && !["active"].includes(merchant)) {
    return `Merchant account is ${merchant}. Please contact support.`;
  }
  switch (status) {
    case "paused":
      return "Your subscription is paused. Some features may be limited.";
    case "expired":
      return "Your subscription has expired. Please renew to continue.";
    case "cancelled":
      return "Your subscription has been cancelled. Please choose a new plan.";
    case "past_due":
      return "Payment is past due. Please update your payment method.";
    default:
      return "Subscription status error. Please contact support.";
  }
}
function getAllowedOperations(subscriptionStatus) {
  const status = subscriptionStatus.toLowerCase();
  switch (status) {
    case "active":
      return ["create", "read", "update", "delete", "admin"];
    case "paused":
      return ["read"];
    case "expired":
    case "cancelled":
    case "past_due":
      return [];
    default:
      return [];
  }
}
async function manualExpiryCheck() {
  try {
    console.log("\u{1F50D} Running manual subscription expiry check...");
    const expiredSubscriptions = await prisma2.subscription.findMany({
      where: {
        status: { in: ["active", "paused"] },
        currentPeriodEnd: { lt: /* @__PURE__ */ new Date() }
      }
    });
    const results = {
      totalChecked: expiredSubscriptions.length,
      expiredFound: 0,
      markedAsExpired: 0,
      errors: []
    };
    for (const subscription of expiredSubscriptions) {
      try {
        results.expiredFound++;
        await prisma2.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "expired",
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        results.markedAsExpired++;
        console.log(`\u2705 Marked subscription ${subscription.id} as expired`);
      } catch (error) {
        const errorMsg = `Failed to mark subscription ${subscription.id} as expired: ${error}`;
        results.errors.push(errorMsg);
        console.error(`\u274C ${errorMsg}`);
      }
    }
    console.log("\u2705 Manual expiry check completed:", results);
    return results;
  } catch (error) {
    console.error("\u274C Manual expiry check failed:", error);
    throw error;
  }
}

// src/subscription-middleware.ts
import { NextResponse as NextResponse4 } from "next/server";
import { validateSubscriptionAccess as validateSubscriptionAccess2 } from "@rentalshop/utils";
var subscriptionRequiredRoutes = [
  "/api/orders",
  "/api/products",
  "/api/customers",
  "/api/payments",
  "/api/notifications",
  "/api/settings"
];
var subscriptionExemptRoutes = [
  "/api/auth",
  "/api/health",
  "/api/system",
  "/api/plans",
  "/api/subscriptions",
  "/api/users"
  // User management doesn't require subscription
];
function requiresSubscriptionValidation(pathname) {
  const requiresSubscription = subscriptionRequiredRoutes.some((route) => pathname.startsWith(route));
  const isSubscriptionExempt = subscriptionExemptRoutes.some((route) => pathname.startsWith(route));
  return requiresSubscription && !isSubscriptionExempt;
}
async function validateSubscriptionForRoute(user, pathname) {
  if (!requiresSubscriptionValidation(pathname)) {
    return { isValid: true };
  }
  console.log("\u{1F50D} SUBSCRIPTION MIDDLEWARE: Validating subscription for:", pathname);
  console.log("\u{1F50D} SUBSCRIPTION MIDDLEWARE: User:", {
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId
  });
  try {
    const subscriptionResult = await validateSubscriptionAccess2(user, {
      requireActiveSubscription: true,
      allowedStatuses: ["active"],
      checkMerchantStatus: true,
      checkSubscriptionStatus: true,
      autoUpdateExpired: true
    });
    if (!subscriptionResult.isValid) {
      console.log("\u{1F50D} SUBSCRIPTION MIDDLEWARE: Validation failed:", subscriptionResult.error);
      const errorResponse = NextResponse4.json(
        {
          success: false,
          message: subscriptionResult.error,
          error: "SUBSCRIPTION_ERROR",
          subscriptionStatus: subscriptionResult.subscription?.status,
          merchantStatus: subscriptionResult.merchant?.subscriptionStatus,
          isExpired: subscriptionResult.isExpired,
          needsStatusUpdate: subscriptionResult.needsStatusUpdate
        },
        { status: subscriptionResult.statusCode || API.STATUS.FORBIDDEN }
      );
      return { isValid: false, response: errorResponse };
    }
    console.log("\u{1F50D} SUBSCRIPTION MIDDLEWARE: Validation passed");
    return { isValid: true };
  } catch (error) {
    console.error("\u{1F50D} SUBSCRIPTION MIDDLEWARE: Validation error:", error);
    const errorResponse = NextResponse4.json(
      {
        success: false,
        message: "Failed to validate subscription",
        error: "SUBSCRIPTION_VALIDATION_ERROR"
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
    return { isValid: false, response: errorResponse };
  }
}
function withSubscriptionValidation2(handler) {
  return async (request, ...args) => {
    const pathname = request.nextUrl.pathname;
    if (!requiresSubscriptionValidation(pathname)) {
      return handler(request, ...args);
    }
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userRole = request.headers.get("x-user-role");
    if (!userId || !userEmail || !userRole) {
      return NextResponse4.json(
        { success: false, code: "USER_INFO_NOT_FOUND", message: "User information not found in request" },
        { status: API.STATUS.UNAUTHORIZED }
      );
    }
    const user = {
      id: parseInt(userId),
      email: userEmail,
      name: "",
      // Will be filled by subscription validation if needed
      role: userRole,
      merchantId: void 0,
      // Will be fetched during validation
      outletId: void 0,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validation = await validateSubscriptionForRoute(user, pathname);
    if (!validation.isValid) {
      return validation.response;
    }
    return handler(request, ...args);
  };
}
export {
  adminAuth,
  apiRateLimiter,
  canPerformOperation,
  captureAuditContext,
  checkSubscriptionExpiry,
  clearAuditContext,
  createAuditMiddleware,
  createAuthMiddleware,
  createRateLimiter,
  generateRequestId,
  getAllowedOperations,
  getAuditContext,
  getAuditContextById,
  getSubscriptionErrorMessage,
  getUserFromRequest,
  logAuditEvent,
  manualExpiryCheck,
  merchantAuth,
  optionalAuth,
  outletAuth,
  requiresSubscriptionValidation,
  searchRateLimiter,
  subscriptionExemptRoutes,
  subscriptionRequiredRoutes,
  validateSubscriptionAccess,
  validateSubscriptionForRoute,
  withAuditLogging,
  withAuth,
  withSubscriptionValidation,
  withSubscriptionValidation2 as withSubscriptionValidationWrapper
};
//# sourceMappingURL=index.mjs.map