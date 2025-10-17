import CONSTANTS, { ENTITY_STATUS, getStatusColor, getStatusLabel, USER_ROLE } from '@rentalshop/constants';
import React, { createContext, forwardRef, createElement, useContext } from 'react';
import { z } from 'zod';
import { format, addDays, differenceInDays, isAfter, isBefore, isValid, parseISO } from 'date-fns';
import 'react/jsx-runtime';

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

// src/config/api.ts
var api_exports = {};
__export(api_exports, {
  API_BASE_URL: () => API_BASE_URL,
  apiConfig: () => apiConfig,
  apiEnvironment: () => apiEnvironment,
  apiUrls: () => apiUrls,
  buildApiUrl: () => buildApiUrl,
  getApiBaseUrl: () => getApiBaseUrl,
  getApiCorsOrigins: () => getApiCorsOrigins,
  getApiDatabaseUrl: () => getApiDatabaseUrl,
  getApiJwtSecret: () => getApiJwtSecret,
  getApiUrl: () => getApiUrl,
  getCurrentEnvironment: () => getCurrentEnvironment,
  isDevelopment: () => isDevelopment,
  isLocal: () => isLocal,
  isProduction: () => isProduction
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
      currency: `${base}/api/settings/currency`,
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
var apiConfig, apiEnvironment, apiUrls, getCurrentEnvironment, isLocal, isDevelopment, isProduction, getApiBaseUrl, buildApiUrl, getApiUrl, API_BASE_URL, getApiDatabaseUrl, getApiJwtSecret, getApiCorsOrigins;
var init_api = __esm({
  "src/config/api.ts"() {
    apiConfig = getApiConfig();
    apiEnvironment = getEnvironment();
    apiUrls = createApiUrls();
    getCurrentEnvironment = () => getEnvironment();
    isLocal = () => getEnvironment() === "local";
    isDevelopment = () => getEnvironment() === "development";
    isProduction = () => getEnvironment() === "production";
    getApiBaseUrl = () => getApiBaseUrlInternal();
    buildApiUrl = (endpoint) => {
      const base = getApiBaseUrl();
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
      return `${base}/${cleanEndpoint}`;
    };
    getApiUrl = () => getApiBaseUrl();
    API_BASE_URL = getApiBaseUrl();
    getApiDatabaseUrl = () => apiConfig.database.url;
    getApiJwtSecret = () => apiConfig.auth.jwtSecret;
    getApiCorsOrigins = () => apiConfig.cors.origins;
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
    var Do = (e2, r2) => () => (e2 && (r2 = e2(e2 = 0)), r2);
    var ue = (e2, r2) => () => (r2 || e2((r2 = { exports: {} }).exports, r2), r2.exports);
    var tr = (e2, r2) => {
      for (var t2 in r2)
        jt(e2, t2, { get: r2[t2], enumerable: true });
    };
    var Oo = (e2, r2, t2, n2) => {
      if (r2 && typeof r2 == "object" || typeof r2 == "function")
        for (let i of Eu(r2))
          !xu.call(e2, i) && i !== t2 && jt(e2, i, { get: () => r2[i], enumerable: !(n2 = bu(r2, i)) || n2.enumerable });
      return e2;
    };
    var O = (e2, r2, t2) => (t2 = e2 != null ? yu(wu(e2)) : {}, Oo(r2 || !e2 || !e2.__esModule ? jt(t2, "default", { value: e2, enumerable: true }) : t2, e2));
    var vu = (e2) => Oo(jt({}, "__esModule", { value: true }), e2);
    var hi = ue((_g, is) => {
      is.exports = (e2, r2 = process.argv) => {
        let t2 = e2.startsWith("-") ? "" : e2.length === 1 ? "-" : "--", n2 = r2.indexOf(t2 + e2), i = r2.indexOf("--");
        return n2 !== -1 && (i === -1 || n2 < i);
      };
    });
    var as = ue((Ng, ss) => {
      var Fc = __require("os"), os = __require("tty"), de = hi(), { env: G } = process, Qe;
      de("no-color") || de("no-colors") || de("color=false") || de("color=never") ? Qe = 0 : (de("color") || de("colors") || de("color=true") || de("color=always")) && (Qe = 1);
      "FORCE_COLOR" in G && (G.FORCE_COLOR === "true" ? Qe = 1 : G.FORCE_COLOR === "false" ? Qe = 0 : Qe = G.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(G.FORCE_COLOR, 10), 3));
      function yi(e2) {
        return e2 === 0 ? false : { level: e2, hasBasic: true, has256: e2 >= 2, has16m: e2 >= 3 };
      }
      function bi(e2, r2) {
        if (Qe === 0)
          return 0;
        if (de("color=16m") || de("color=full") || de("color=truecolor"))
          return 3;
        if (de("color=256"))
          return 2;
        if (e2 && !r2 && Qe === void 0)
          return 0;
        let t2 = Qe || 0;
        if (G.TERM === "dumb")
          return t2;
        if (process.platform === "win32") {
          let n2 = Fc.release().split(".");
          return Number(n2[0]) >= 10 && Number(n2[2]) >= 10586 ? Number(n2[2]) >= 14931 ? 3 : 2 : 1;
        }
        if ("CI" in G)
          return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((n2) => n2 in G) || G.CI_NAME === "codeship" ? 1 : t2;
        if ("TEAMCITY_VERSION" in G)
          return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(G.TEAMCITY_VERSION) ? 1 : 0;
        if (G.COLORTERM === "truecolor")
          return 3;
        if ("TERM_PROGRAM" in G) {
          let n2 = parseInt((G.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
          switch (G.TERM_PROGRAM) {
            case "iTerm.app":
              return n2 >= 3 ? 3 : 2;
            case "Apple_Terminal":
              return 2;
          }
        }
        return /-256(color)?$/i.test(G.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(G.TERM) || "COLORTERM" in G ? 1 : t2;
      }
      function Mc(e2) {
        let r2 = bi(e2, e2 && e2.isTTY);
        return yi(r2);
      }
      ss.exports = { supportsColor: Mc, stdout: yi(bi(true, os.isatty(1))), stderr: yi(bi(true, os.isatty(2))) };
    });
    var cs = ue((Lg, us) => {
      var $c = as(), br = hi();
      function ls(e2) {
        if (/^\d{3,4}$/.test(e2)) {
          let t2 = /(\d{1,2})(\d{2})/.exec(e2) || [];
          return { major: 0, minor: parseInt(t2[1], 10), patch: parseInt(t2[2], 10) };
        }
        let r2 = (e2 || "").split(".").map((t2) => parseInt(t2, 10));
        return { major: r2[0], minor: r2[1], patch: r2[2] };
      }
      function Ei(e2) {
        let { CI: r2, FORCE_HYPERLINK: t2, NETLIFY: n2, TEAMCITY_VERSION: i, TERM_PROGRAM: o2, TERM_PROGRAM_VERSION: s, VTE_VERSION: a, TERM: l } = process.env;
        if (t2)
          return !(t2.length > 0 && parseInt(t2, 10) === 0);
        if (br("no-hyperlink") || br("no-hyperlinks") || br("hyperlink=false") || br("hyperlink=never"))
          return false;
        if (br("hyperlink=true") || br("hyperlink=always") || n2)
          return true;
        if (!$c.supportsColor(e2) || e2 && !e2.isTTY)
          return false;
        if ("WT_SESSION" in process.env)
          return true;
        if (process.platform === "win32" || r2 || i)
          return false;
        if (o2) {
          let u = ls(s || "");
          switch (o2) {
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
      gs.exports = (e2) => {
        let r2 = e2.match(/^[ \t]*(?=\S)/gm);
        return r2 ? r2.reduce((t2, n2) => Math.min(t2, n2.length), 1 / 0) : 0;
      };
    });
    var Di = ue((kh, Es) => {
      Es.exports = (e2, r2 = 1, t2) => {
        if (t2 = { indent: " ", includeEmptyLines: false, ...t2 }, typeof e2 != "string")
          throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof e2}\``);
        if (typeof r2 != "number")
          throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof r2}\``);
        if (typeof t2.indent != "string")
          throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof t2.indent}\``);
        if (r2 === 0)
          return e2;
        let n2 = t2.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
        return e2.replace(n2, t2.indent.repeat(r2));
      };
    });
    var vs = ue((jh, tp) => {
      tp.exports = { name: "dotenv", version: "16.5.0", description: "Loads environment variables from .env file", main: "lib/main.js", types: "lib/main.d.ts", exports: { ".": { types: "./lib/main.d.ts", require: "./lib/main.js", default: "./lib/main.js" }, "./config": "./config.js", "./config.js": "./config.js", "./lib/env-options": "./lib/env-options.js", "./lib/env-options.js": "./lib/env-options.js", "./lib/cli-options": "./lib/cli-options.js", "./lib/cli-options.js": "./lib/cli-options.js", "./package.json": "./package.json" }, scripts: { "dts-check": "tsc --project tests/types/tsconfig.json", lint: "standard", pretest: "npm run lint && npm run dts-check", test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000", "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=lcov", prerelease: "npm test", release: "standard-version" }, repository: { type: "git", url: "git://github.com/motdotla/dotenv.git" }, homepage: "https://github.com/motdotla/dotenv#readme", funding: "https://dotenvx.com", keywords: ["dotenv", "env", ".env", "environment", "variables", "config", "settings"], readmeFilename: "README.md", license: "BSD-2-Clause", devDependencies: { "@types/node": "^18.11.3", decache: "^4.6.2", sinon: "^14.0.1", standard: "^17.0.0", "standard-version": "^9.5.0", tap: "^19.2.0", typescript: "^4.8.4" }, engines: { node: ">=12" }, browser: { fs: false } };
    });
    var As = ue((Bh, _e5) => {
      var Fi = __require("fs"), Mi = __require("path"), np = __require("os"), ip = __require("crypto"), op = vs(), Ts = op.version, sp = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
      function ap(e2) {
        let r2 = {}, t2 = e2.toString();
        t2 = t2.replace(/\r\n?/mg, `
`);
        let n2;
        for (; (n2 = sp.exec(t2)) != null; ) {
          let i = n2[1], o2 = n2[2] || "";
          o2 = o2.trim();
          let s = o2[0];
          o2 = o2.replace(/^(['"`])([\s\S]*)\1$/mg, "$2"), s === '"' && (o2 = o2.replace(/\\n/g, `
`), o2 = o2.replace(/\\r/g, "\r")), r2[i] = o2;
        }
        return r2;
      }
      function lp(e2) {
        let r2 = Rs(e2), t2 = B.configDotenv({ path: r2 });
        if (!t2.parsed) {
          let s = new Error(`MISSING_DATA: Cannot parse ${r2} for an unknown reason`);
          throw s.code = "MISSING_DATA", s;
        }
        let n2 = Ss(e2).split(","), i = n2.length, o2;
        for (let s = 0; s < i; s++)
          try {
            let a = n2[s].trim(), l = cp(t2, a);
            o2 = B.decrypt(l.ciphertext, l.key);
            break;
          } catch (a) {
            if (s + 1 >= i)
              throw a;
          }
        return B.parse(o2);
      }
      function up(e2) {
        console.log(`[dotenv@${Ts}][WARN] ${e2}`);
      }
      function ot(e2) {
        console.log(`[dotenv@${Ts}][DEBUG] ${e2}`);
      }
      function Ss(e2) {
        return e2 && e2.DOTENV_KEY && e2.DOTENV_KEY.length > 0 ? e2.DOTENV_KEY : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0 ? process.env.DOTENV_KEY : "";
      }
      function cp(e2, r2) {
        let t2;
        try {
          t2 = new URL(r2);
        } catch (a) {
          if (a.code === "ERR_INVALID_URL") {
            let l = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
            throw l.code = "INVALID_DOTENV_KEY", l;
          }
          throw a;
        }
        let n2 = t2.password;
        if (!n2) {
          let a = new Error("INVALID_DOTENV_KEY: Missing key part");
          throw a.code = "INVALID_DOTENV_KEY", a;
        }
        let i = t2.searchParams.get("environment");
        if (!i) {
          let a = new Error("INVALID_DOTENV_KEY: Missing environment part");
          throw a.code = "INVALID_DOTENV_KEY", a;
        }
        let o2 = `DOTENV_VAULT_${i.toUpperCase()}`, s = e2.parsed[o2];
        if (!s) {
          let a = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${o2} in your .env.vault file.`);
          throw a.code = "NOT_FOUND_DOTENV_ENVIRONMENT", a;
        }
        return { ciphertext: s, key: n2 };
      }
      function Rs(e2) {
        let r2 = null;
        if (e2 && e2.path && e2.path.length > 0)
          if (Array.isArray(e2.path))
            for (let t2 of e2.path)
              Fi.existsSync(t2) && (r2 = t2.endsWith(".vault") ? t2 : `${t2}.vault`);
          else
            r2 = e2.path.endsWith(".vault") ? e2.path : `${e2.path}.vault`;
        else
          r2 = Mi.resolve(process.cwd(), ".env.vault");
        return Fi.existsSync(r2) ? r2 : null;
      }
      function Ps(e2) {
        return e2[0] === "~" ? Mi.join(np.homedir(), e2.slice(1)) : e2;
      }
      function pp(e2) {
        !!(e2 && e2.debug) && ot("Loading env from encrypted .env.vault");
        let t2 = B._parseVault(e2), n2 = process.env;
        return e2 && e2.processEnv != null && (n2 = e2.processEnv), B.populate(n2, t2, e2), { parsed: t2 };
      }
      function dp(e2) {
        let r2 = Mi.resolve(process.cwd(), ".env"), t2 = "utf8", n2 = !!(e2 && e2.debug);
        e2 && e2.encoding ? t2 = e2.encoding : n2 && ot("No encoding is specified. UTF-8 is used by default");
        let i = [r2];
        if (e2 && e2.path)
          if (!Array.isArray(e2.path))
            i = [Ps(e2.path)];
          else {
            i = [];
            for (let l of e2.path)
              i.push(Ps(l));
          }
        let o2, s = {};
        for (let l of i)
          try {
            let u = B.parse(Fi.readFileSync(l, { encoding: t2 }));
            B.populate(s, u, e2);
          } catch (u) {
            n2 && ot(`Failed to load ${l} ${u.message}`), o2 = u;
          }
        let a = process.env;
        return e2 && e2.processEnv != null && (a = e2.processEnv), B.populate(a, s, e2), o2 ? { parsed: s, error: o2 } : { parsed: s };
      }
      function mp(e2) {
        if (Ss(e2).length === 0)
          return B.configDotenv(e2);
        let r2 = Rs(e2);
        return r2 ? B._configVault(e2) : (up(`You set DOTENV_KEY but you are missing a .env.vault file at ${r2}. Did you forget to build it?`), B.configDotenv(e2));
      }
      function fp(e2, r2) {
        let t2 = Buffer.from(r2.slice(-64), "hex"), n2 = Buffer.from(e2, "base64"), i = n2.subarray(0, 12), o2 = n2.subarray(-16);
        n2 = n2.subarray(12, -16);
        try {
          let s = ip.createDecipheriv("aes-256-gcm", t2, i);
          return s.setAuthTag(o2), `${s.update(n2)}${s.final()}`;
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
      function gp(e2, r2, t2 = {}) {
        let n2 = !!(t2 && t2.debug), i = !!(t2 && t2.override);
        if (typeof r2 != "object") {
          let o2 = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
          throw o2.code = "OBJECT_REQUIRED", o2;
        }
        for (let o2 of Object.keys(r2))
          Object.prototype.hasOwnProperty.call(e2, o2) ? (i === true && (e2[o2] = r2[o2]), n2 && ot(i === true ? `"${o2}" is already defined and WAS overwritten` : `"${o2}" is already defined and was NOT overwritten`)) : e2[o2] = r2[o2];
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
      cn.exports = (e2 = {}) => {
        let r2;
        if (e2.repoUrl)
          r2 = e2.repoUrl;
        else if (e2.user && e2.repo)
          r2 = `https://github.com/${e2.user}/${e2.repo}`;
        else
          throw new Error("You need to specify either the `repoUrl` option or both the `user` and `repo` options");
        let t2 = new URL(`${r2}/issues/new`), n2 = ["body", "title", "labels", "template", "milestone", "assignee", "projects"];
        for (let i of n2) {
          let o2 = e2[i];
          if (o2 !== void 0) {
            if (i === "labels" || i === "projects") {
              if (!Array.isArray(o2))
                throw new TypeError(`The \`${i}\` option should be an array`);
              o2 = o2.join(",");
            }
            t2.searchParams.set(i, o2);
          }
        }
        return t2.toString();
      };
      cn.exports.default = cn.exports;
    });
    var Ki = ue((vb, ea) => {
      ea.exports = /* @__PURE__ */ function() {
        function e2(r2, t2, n2, i, o2) {
          return r2 < t2 || n2 < t2 ? r2 > n2 ? n2 + 1 : r2 + 1 : i === o2 ? t2 : t2 + 1;
        }
        return function(r2, t2) {
          if (r2 === t2)
            return 0;
          if (r2.length > t2.length) {
            var n2 = r2;
            r2 = t2, t2 = n2;
          }
          for (var i = r2.length, o2 = t2.length; i > 0 && r2.charCodeAt(i - 1) === t2.charCodeAt(o2 - 1); )
            i--, o2--;
          for (var s = 0; s < i && r2.charCodeAt(s) === t2.charCodeAt(s); )
            s++;
          if (i -= s, o2 -= s, i === 0 || o2 < 3)
            return o2;
          var a = 0, l, u, c, p2, d2, f, h, g2, I2, T, S, b, D = [];
          for (l = 0; l < i; l++)
            D.push(l + 1), D.push(r2.charCodeAt(s + l));
          for (var me = D.length - 1; a < o2 - 3; )
            for (I2 = t2.charCodeAt(s + (u = a)), T = t2.charCodeAt(s + (c = a + 1)), S = t2.charCodeAt(s + (p2 = a + 2)), b = t2.charCodeAt(s + (d2 = a + 3)), f = a += 4, l = 0; l < me; l += 2)
              h = D[l], g2 = D[l + 1], u = e2(h, u, c, I2, g2), c = e2(u, c, p2, T, g2), p2 = e2(c, p2, d2, S, g2), f = e2(p2, d2, f, b, g2), D[l] = f, d2 = p2, p2 = c, c = u, u = h;
          for (; a < o2; )
            for (I2 = t2.charCodeAt(s + (u = a)), f = ++a, l = 0; l < me; l += 2)
              h = D[l], D[l] = f = e2(h, u, f, I2, D[l + 1]), u = h;
          return f;
        };
      }();
    });
    var oa = Do(() => {
    });
    var sa = Do(() => {
    });
    var jf = {};
    tr(jf, { DMMF: () => ct, Debug: () => N, Decimal: () => Fe, Extensions: () => ni, MetricsClient: () => Lr, PrismaClientInitializationError: () => P, PrismaClientKnownRequestError: () => z2, PrismaClientRustPanicError: () => ae, PrismaClientUnknownRequestError: () => V, PrismaClientValidationError: () => Z2, Public: () => ii, Sql: () => ie, createParam: () => va, defineDmmfProperty: () => Ca, deserializeJsonResponse: () => Vr, deserializeRawResult: () => Xn, dmmfToRuntimeDataModel: () => Ns, empty: () => Oa, getPrismaClient: () => fu, getRuntime: () => Kn, join: () => Da, makeStrictEnum: () => gu, makeTypedQueryFactory: () => Ia, objectEnumValues: () => On, raw: () => no, serializeJsonQuery: () => $n, skip: () => Mn, sqltag: () => io, warnEnvConflicts: () => hu, warnOnce: () => at });
    module.exports = vu(jf);
    var ni = {};
    tr(ni, { defineExtension: () => ko, getExtensionContext: () => _o });
    function ko(e2) {
      return typeof e2 == "function" ? e2 : (r2) => r2.$extends(e2);
    }
    function _o(e2) {
      return e2;
    }
    var ii = {};
    tr(ii, { validator: () => No });
    function No(...e2) {
      return (r2) => r2;
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
    function F2(e2, r2) {
      let t2 = new RegExp(`\\x1b\\[${r2}m`, "g"), n2 = `\x1B[${e2}m`, i = `\x1B[${r2}m`;
      return function(o2) {
        return !qo.enabled || o2 == null ? o2 : n2 + (~("" + o2).indexOf(i) ? o2.replace(t2, i + n2) : o2) + i;
      };
    }
    var Pu = F2(0, 0);
    var W = F2(1, 22);
    var Ce = F2(2, 22);
    var Tu = F2(3, 23);
    var Y = F2(4, 24);
    var Su = F2(7, 27);
    var Ru = F2(8, 28);
    var Au = F2(9, 29);
    var Cu = F2(30, 39);
    var ce = F2(31, 39);
    var qe = F2(32, 39);
    var Ie = F2(33, 39);
    var nr = F2(34, 39);
    var Iu = F2(35, 39);
    var De = F2(36, 39);
    var Du = F2(37, 39);
    var Hr = F2(90, 39);
    var Ou = F2(90, 39);
    var ku = F2(40, 49);
    var _u = F2(41, 49);
    var Nu = F2(42, 49);
    var Lu = F2(43, 49);
    var Fu = F2(44, 49);
    var Mu = F2(45, 49);
    var $u = F2(46, 49);
    var qu = F2(47, 49);
    var Vu = 100;
    var Vo = ["green", "yellow", "blue", "magenta", "cyan", "red"];
    var Yr = [];
    var jo = Date.now();
    var ju = 0;
    var si = typeof process < "u" ? process.env : {};
    globalThis.DEBUG ?? (globalThis.DEBUG = si.DEBUG ?? "");
    globalThis.DEBUG_COLORS ?? (globalThis.DEBUG_COLORS = si.DEBUG_COLORS ? si.DEBUG_COLORS === "true" : true);
    var zr = { enable(e2) {
      typeof e2 == "string" && (globalThis.DEBUG = e2);
    }, disable() {
      let e2 = globalThis.DEBUG;
      return globalThis.DEBUG = "", e2;
    }, enabled(e2) {
      let r2 = globalThis.DEBUG.split(",").map((i) => i.replace(/[.+?^${}()|[\]\\]/g, "\\$&")), t2 = r2.some((i) => i === "" || i[0] === "-" ? false : e2.match(RegExp(i.split("*").join(".*") + "$"))), n2 = r2.some((i) => i === "" || i[0] !== "-" ? false : e2.match(RegExp(i.slice(1).split("*").join(".*") + "$")));
      return t2 && !n2;
    }, log: (...e2) => {
      let [r2, t2, ...n2] = e2;
      (console.warn ?? console.log)(`${r2} ${t2}`, ...n2);
    }, formatters: {} };
    function Bu(e2) {
      let r2 = { color: Vo[ju++ % Vo.length], enabled: zr.enabled(e2), namespace: e2, log: zr.log, extend: () => {
      } }, t2 = (...n2) => {
        let { enabled: i, namespace: o2, color: s, log: a } = r2;
        if (n2.length !== 0 && Yr.push([o2, ...n2]), Yr.length > Vu && Yr.shift(), zr.enabled(o2) || i) {
          let l = n2.map((c) => typeof c == "string" ? c : Uu(c)), u = `+${Date.now() - jo}ms`;
          jo = Date.now(), globalThis.DEBUG_COLORS ? a(Bt[s](W(o2)), ...l, Bt[s](u)) : a(o2, ...l, u);
        }
      };
      return new Proxy(t2, { get: (n2, i) => r2[i], set: (n2, i, o2) => r2[i] = o2 });
    }
    var N = new Proxy(Bu, { get: (e2, r2) => zr[r2], set: (e2, r2, t2) => zr[r2] = t2 });
    function Uu(e2, r2 = 2) {
      let t2 = /* @__PURE__ */ new Set();
      return JSON.stringify(e2, (n2, i) => {
        if (typeof i == "object" && i !== null) {
          if (t2.has(i))
            return "[Circular *]";
          t2.add(i);
        } else if (typeof i == "bigint")
          return i.toString();
        return i;
      }, r2);
    }
    function Bo(e2 = 7500) {
      let r2 = Yr.map(([t2, ...n2]) => `${t2} ${n2.map((i) => typeof i == "string" ? i : JSON.stringify(i)).join(" ")}`).join(`
`);
      return r2.length < e2 ? r2 : r2.slice(-e2);
    }
    function Uo() {
      Yr.length = 0;
    }
    var gr = N;
    var Go = O(__require("fs"));
    function ai() {
      let e2 = process.env.PRISMA_QUERY_ENGINE_LIBRARY;
      if (!(e2 && Go.default.existsSync(e2)) && process.arch === "ia32")
        throw new Error('The default query engine type (Node-API, "library") is currently not supported for 32bit Node. Please set `engineType = "binary"` in the "generator" block of your "schema.prisma" file (or use the environment variables "PRISMA_CLIENT_ENGINE_TYPE=binary" and/or "PRISMA_CLI_QUERY_ENGINE_TYPE=binary".)');
    }
    var li = ["darwin", "darwin-arm64", "debian-openssl-1.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "rhel-openssl-1.0.x", "rhel-openssl-1.1.x", "rhel-openssl-3.0.x", "linux-arm64-openssl-1.1.x", "linux-arm64-openssl-1.0.x", "linux-arm64-openssl-3.0.x", "linux-arm-openssl-1.1.x", "linux-arm-openssl-1.0.x", "linux-arm-openssl-3.0.x", "linux-musl", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-1.1.x", "linux-musl-arm64-openssl-3.0.x", "linux-nixos", "linux-static-x64", "linux-static-arm64", "windows", "freebsd11", "freebsd12", "freebsd13", "freebsd14", "freebsd15", "openbsd", "netbsd", "arm"];
    var Ut = "libquery_engine";
    function Gt(e2, r2) {
      return e2.includes("windows") ? `query_engine-${e2}.dll.node` : e2.includes("darwin") ? `${Ut}-${e2}.dylib.node` : `${Ut}-${e2}.so.node`;
    }
    var Ko = O(__require("child_process"));
    var mi = O(__require("fs/promises"));
    var Ht = O(__require("os"));
    var Oe = Symbol.for("@ts-pattern/matcher");
    var Gu = Symbol.for("@ts-pattern/isVariadic");
    var Wt = "@ts-pattern/anonymous-select-key";
    var ui = (e2) => !!(e2 && typeof e2 == "object");
    var Qt = (e2) => e2 && !!e2[Oe];
    var Ee = (e2, r2, t2) => {
      if (Qt(e2)) {
        let n2 = e2[Oe](), { matched: i, selections: o2 } = n2.match(r2);
        return i && o2 && Object.keys(o2).forEach((s) => t2(s, o2[s])), i;
      }
      if (ui(e2)) {
        if (!ui(r2))
          return false;
        if (Array.isArray(e2)) {
          if (!Array.isArray(r2))
            return false;
          let n2 = [], i = [], o2 = [];
          for (let s of e2.keys()) {
            let a = e2[s];
            Qt(a) && a[Gu] ? o2.push(a) : o2.length ? i.push(a) : n2.push(a);
          }
          if (o2.length) {
            if (o2.length > 1)
              throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
            if (r2.length < n2.length + i.length)
              return false;
            let s = r2.slice(0, n2.length), a = i.length === 0 ? [] : r2.slice(-i.length), l = r2.slice(n2.length, i.length === 0 ? 1 / 0 : -i.length);
            return n2.every((u, c) => Ee(u, s[c], t2)) && i.every((u, c) => Ee(u, a[c], t2)) && (o2.length === 0 || Ee(o2[0], l, t2));
          }
          return e2.length === r2.length && e2.every((s, a) => Ee(s, r2[a], t2));
        }
        return Reflect.ownKeys(e2).every((n2) => {
          let i = e2[n2];
          return (n2 in r2 || Qt(o2 = i) && o2[Oe]().matcherType === "optional") && Ee(i, r2[n2], t2);
          var o2;
        });
      }
      return Object.is(r2, e2);
    };
    var Ge = (e2) => {
      var r2, t2, n2;
      return ui(e2) ? Qt(e2) ? (r2 = (t2 = (n2 = e2[Oe]()).getSelectionKeys) == null ? void 0 : t2.call(n2)) != null ? r2 : [] : Array.isArray(e2) ? Zr(e2, Ge) : Zr(Object.values(e2), Ge) : [];
    };
    var Zr = (e2, r2) => e2.reduce((t2, n2) => t2.concat(r2(n2)), []);
    function pe(e2) {
      return Object.assign(e2, { optional: () => Qu(e2), and: (r2) => q(e2, r2), or: (r2) => Wu(e2, r2), select: (r2) => r2 === void 0 ? Qo(e2) : Qo(r2, e2) });
    }
    function Qu(e2) {
      return pe({ [Oe]: () => ({ match: (r2) => {
        let t2 = {}, n2 = (i, o2) => {
          t2[i] = o2;
        };
        return r2 === void 0 ? (Ge(e2).forEach((i) => n2(i, void 0)), { matched: true, selections: t2 }) : { matched: Ee(e2, r2, n2), selections: t2 };
      }, getSelectionKeys: () => Ge(e2), matcherType: "optional" }) });
    }
    function q(...e2) {
      return pe({ [Oe]: () => ({ match: (r2) => {
        let t2 = {}, n2 = (i, o2) => {
          t2[i] = o2;
        };
        return { matched: e2.every((i) => Ee(i, r2, n2)), selections: t2 };
      }, getSelectionKeys: () => Zr(e2, Ge), matcherType: "and" }) });
    }
    function Wu(...e2) {
      return pe({ [Oe]: () => ({ match: (r2) => {
        let t2 = {}, n2 = (i, o2) => {
          t2[i] = o2;
        };
        return Zr(e2, Ge).forEach((i) => n2(i, void 0)), { matched: e2.some((i) => Ee(i, r2, n2)), selections: t2 };
      }, getSelectionKeys: () => Zr(e2, Ge), matcherType: "or" }) });
    }
    function A(e2) {
      return { [Oe]: () => ({ match: (r2) => ({ matched: !!e2(r2) }) }) };
    }
    function Qo(...e2) {
      let r2 = typeof e2[0] == "string" ? e2[0] : void 0, t2 = e2.length === 2 ? e2[1] : typeof e2[0] == "string" ? void 0 : e2[0];
      return pe({ [Oe]: () => ({ match: (n2) => {
        let i = { [r2 ?? Wt]: n2 };
        return { matched: t2 === void 0 || Ee(t2, n2, (o2, s) => {
          i[o2] = s;
        }), selections: i };
      }, getSelectionKeys: () => [r2 ?? Wt].concat(t2 === void 0 ? [] : Ge(t2)) }) });
    }
    function ye(e2) {
      return typeof e2 == "number";
    }
    function Ve(e2) {
      return typeof e2 == "string";
    }
    function je(e2) {
      return typeof e2 == "bigint";
    }
    pe(A(function(e2) {
      return true;
    }));
    var Be = (e2) => Object.assign(pe(e2), { startsWith: (r2) => {
      return Be(q(e2, (t2 = r2, A((n2) => Ve(n2) && n2.startsWith(t2)))));
      var t2;
    }, endsWith: (r2) => {
      return Be(q(e2, (t2 = r2, A((n2) => Ve(n2) && n2.endsWith(t2)))));
      var t2;
    }, minLength: (r2) => Be(q(e2, ((t2) => A((n2) => Ve(n2) && n2.length >= t2))(r2))), length: (r2) => Be(q(e2, ((t2) => A((n2) => Ve(n2) && n2.length === t2))(r2))), maxLength: (r2) => Be(q(e2, ((t2) => A((n2) => Ve(n2) && n2.length <= t2))(r2))), includes: (r2) => {
      return Be(q(e2, (t2 = r2, A((n2) => Ve(n2) && n2.includes(t2)))));
      var t2;
    }, regex: (r2) => {
      return Be(q(e2, (t2 = r2, A((n2) => Ve(n2) && !!n2.match(t2)))));
      var t2;
    } });
    Be(A(Ve));
    var be = (e2) => Object.assign(pe(e2), { between: (r2, t2) => be(q(e2, ((n2, i) => A((o2) => ye(o2) && n2 <= o2 && i >= o2))(r2, t2))), lt: (r2) => be(q(e2, ((t2) => A((n2) => ye(n2) && n2 < t2))(r2))), gt: (r2) => be(q(e2, ((t2) => A((n2) => ye(n2) && n2 > t2))(r2))), lte: (r2) => be(q(e2, ((t2) => A((n2) => ye(n2) && n2 <= t2))(r2))), gte: (r2) => be(q(e2, ((t2) => A((n2) => ye(n2) && n2 >= t2))(r2))), int: () => be(q(e2, A((r2) => ye(r2) && Number.isInteger(r2)))), finite: () => be(q(e2, A((r2) => ye(r2) && Number.isFinite(r2)))), positive: () => be(q(e2, A((r2) => ye(r2) && r2 > 0))), negative: () => be(q(e2, A((r2) => ye(r2) && r2 < 0))) });
    be(A(ye));
    var Ue = (e2) => Object.assign(pe(e2), { between: (r2, t2) => Ue(q(e2, ((n2, i) => A((o2) => je(o2) && n2 <= o2 && i >= o2))(r2, t2))), lt: (r2) => Ue(q(e2, ((t2) => A((n2) => je(n2) && n2 < t2))(r2))), gt: (r2) => Ue(q(e2, ((t2) => A((n2) => je(n2) && n2 > t2))(r2))), lte: (r2) => Ue(q(e2, ((t2) => A((n2) => je(n2) && n2 <= t2))(r2))), gte: (r2) => Ue(q(e2, ((t2) => A((n2) => je(n2) && n2 >= t2))(r2))), positive: () => Ue(q(e2, A((r2) => je(r2) && r2 > 0))), negative: () => Ue(q(e2, A((r2) => je(r2) && r2 < 0))) });
    Ue(A(je));
    pe(A(function(e2) {
      return typeof e2 == "boolean";
    }));
    pe(A(function(e2) {
      return typeof e2 == "symbol";
    }));
    pe(A(function(e2) {
      return e2 == null;
    }));
    pe(A(function(e2) {
      return e2 != null;
    }));
    var ci = class extends Error {
      constructor(r2) {
        let t2;
        try {
          t2 = JSON.stringify(r2);
        } catch {
          t2 = r2;
        }
        super(`Pattern matching error: no pattern matches value ${t2}`), this.input = void 0, this.input = r2;
      }
    };
    var pi = { matched: false, value: void 0 };
    function hr(e2) {
      return new di(e2, pi);
    }
    var di = class e2 {
      constructor(r2, t2) {
        this.input = void 0, this.state = void 0, this.input = r2, this.state = t2;
      }
      with(...r2) {
        if (this.state.matched)
          return this;
        let t2 = r2[r2.length - 1], n2 = [r2[0]], i;
        r2.length === 3 && typeof r2[1] == "function" ? i = r2[1] : r2.length > 2 && n2.push(...r2.slice(1, r2.length - 1));
        let o2 = false, s = {}, a = (u, c) => {
          o2 = true, s[u] = c;
        }, l = !n2.some((u) => Ee(u, this.input, a)) || i && !i(this.input) ? pi : { matched: true, value: t2(o2 ? Wt in s ? s[Wt] : s : this.input, this.input) };
        return new e2(this.input, l);
      }
      when(r2, t2) {
        if (this.state.matched)
          return this;
        let n2 = !!r2(this.input);
        return new e2(this.input, n2 ? { matched: true, value: t2(this.input, this.input) } : pi);
      }
      otherwise(r2) {
        return this.state.matched ? this.state.value : r2(this.input);
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
    function Jt(e2, ...r2) {
      Ku.warn() && console.warn(`${Ju.warn} ${e2}`, ...r2);
    }
    var Hu = (0, Ho.promisify)(Ko.default.exec);
    var ee = gr("prisma:get-platform");
    var Yu = ["1.0.x", "1.1.x", "3.0.x"];
    async function Yo() {
      let e2 = Ht.default.platform(), r2 = process.arch;
      if (e2 === "freebsd") {
        let s = await Yt("freebsd-version");
        if (s && s.trim().length > 0) {
          let l = /^(\d+)\.?/.exec(s);
          if (l)
            return { platform: "freebsd", targetDistro: `freebsd${l[1]}`, arch: r2 };
        }
      }
      if (e2 !== "linux")
        return { platform: e2, arch: r2 };
      let t2 = await Zu(), n2 = await sc(), i = ec({ arch: r2, archFromUname: n2, familyDistro: t2.familyDistro }), { libssl: o2 } = await rc(i);
      return { platform: "linux", libssl: o2, arch: r2, archFromUname: n2, ...t2 };
    }
    function zu(e2) {
      let r2 = /^ID="?([^"\n]*)"?$/im, t2 = /^ID_LIKE="?([^"\n]*)"?$/im, n2 = r2.exec(e2), i = n2 && n2[1] && n2[1].toLowerCase() || "", o2 = t2.exec(e2), s = o2 && o2[1] && o2[1].toLowerCase() || "", a = hr({ id: i, idLike: s }).with({ id: "alpine" }, ({ id: l }) => ({ targetDistro: "musl", familyDistro: l, originalDistro: l })).with({ id: "raspbian" }, ({ id: l }) => ({ targetDistro: "arm", familyDistro: "debian", originalDistro: l })).with({ id: "nixos" }, ({ id: l }) => ({ targetDistro: "nixos", originalDistro: l, familyDistro: "nixos" })).with({ id: "debian" }, { id: "ubuntu" }, ({ id: l }) => ({ targetDistro: "debian", familyDistro: "debian", originalDistro: l })).with({ id: "rhel" }, { id: "centos" }, { id: "fedora" }, ({ id: l }) => ({ targetDistro: "rhel", familyDistro: "rhel", originalDistro: l })).when(({ idLike: l }) => l.includes("debian") || l.includes("ubuntu"), ({ id: l }) => ({ targetDistro: "debian", familyDistro: "debian", originalDistro: l })).when(({ idLike: l }) => i === "arch" || l.includes("arch"), ({ id: l }) => ({ targetDistro: "debian", familyDistro: "arch", originalDistro: l })).when(({ idLike: l }) => l.includes("centos") || l.includes("fedora") || l.includes("rhel") || l.includes("suse"), ({ id: l }) => ({ targetDistro: "rhel", familyDistro: "rhel", originalDistro: l })).otherwise(({ id: l }) => ({ targetDistro: void 0, familyDistro: void 0, originalDistro: l }));
      return ee(`Found distro info:
${JSON.stringify(a, null, 2)}`), a;
    }
    async function Zu() {
      let e2 = "/etc/os-release";
      try {
        let r2 = await mi.default.readFile(e2, { encoding: "utf-8" });
        return zu(r2);
      } catch {
        return { targetDistro: void 0, familyDistro: void 0, originalDistro: void 0 };
      }
    }
    function Xu(e2) {
      let r2 = /^OpenSSL\s(\d+\.\d+)\.\d+/.exec(e2);
      if (r2) {
        let t2 = `${r2[1]}.x`;
        return zo(t2);
      }
    }
    function Wo(e2) {
      let r2 = /libssl\.so\.(\d)(\.\d)?/.exec(e2);
      if (r2) {
        let t2 = `${r2[1]}${r2[2] ?? ".0"}.x`;
        return zo(t2);
      }
    }
    function zo(e2) {
      let r2 = (() => {
        if (Xo(e2))
          return e2;
        let t2 = e2.split(".");
        return t2[1] = "0", t2.join(".");
      })();
      if (Yu.includes(r2))
        return r2;
    }
    function ec(e2) {
      return hr(e2).with({ familyDistro: "musl" }, () => (ee('Trying platform-specific paths for "alpine"'), ["/lib", "/usr/lib"])).with({ familyDistro: "debian" }, ({ archFromUname: r2 }) => (ee('Trying platform-specific paths for "debian" (and "ubuntu")'), [`/usr/lib/${r2}-linux-gnu`, `/lib/${r2}-linux-gnu`])).with({ familyDistro: "rhel" }, () => (ee('Trying platform-specific paths for "rhel"'), ["/lib64", "/usr/lib64"])).otherwise(({ familyDistro: r2, arch: t2, archFromUname: n2 }) => (ee(`Don't know any platform-specific paths for "${r2}" on ${t2} (${n2})`), []));
    }
    async function rc(e2) {
      let r2 = 'grep -v "libssl.so.0"', t2 = await Jo(e2);
      if (t2) {
        ee(`Found libssl.so file using platform-specific paths: ${t2}`);
        let o2 = Wo(t2);
        if (ee(`The parsed libssl version is: ${o2}`), o2)
          return { libssl: o2, strategy: "libssl-specific-path" };
      }
      ee('Falling back to "ldconfig" and other generic paths');
      let n2 = await Yt(`ldconfig -p | sed "s/.*=>s*//" | sed "s|.*/||" | grep libssl | sort | ${r2}`);
      if (n2 || (n2 = await Jo(["/lib64", "/usr/lib64", "/lib", "/usr/lib"])), n2) {
        ee(`Found libssl.so file using "ldconfig" or other generic paths: ${n2}`);
        let o2 = Wo(n2);
        if (ee(`The parsed libssl version is: ${o2}`), o2)
          return { libssl: o2, strategy: "ldconfig" };
      }
      let i = await Yt("openssl version -v");
      if (i) {
        ee(`Found openssl binary with version: ${i}`);
        let o2 = Xu(i);
        if (ee(`The parsed openssl version is: ${o2}`), o2)
          return { libssl: o2, strategy: "openssl-binary" };
      }
      return ee("Couldn't find any version of libssl or OpenSSL in the system"), {};
    }
    async function Jo(e2) {
      for (let r2 of e2) {
        let t2 = await tc(r2);
        if (t2)
          return t2;
      }
    }
    async function tc(e2) {
      try {
        return (await mi.default.readdir(e2)).find((t2) => t2.startsWith("libssl.so.") && !t2.startsWith("libssl.so.0"));
      } catch (r2) {
        if (r2.code === "ENOENT")
          return;
        throw r2;
      }
    }
    async function ir() {
      let { binaryTarget: e2 } = await Zo();
      return e2;
    }
    function nc(e2) {
      return e2.binaryTarget !== void 0;
    }
    async function fi() {
      let { memoized: e2, ...r2 } = await Zo();
      return r2;
    }
    var Kt = {};
    async function Zo() {
      if (nc(Kt))
        return Promise.resolve({ ...Kt, memoized: true });
      let e2 = await Yo(), r2 = ic(e2);
      return Kt = { ...e2, binaryTarget: r2 }, { ...Kt, memoized: false };
    }
    function ic(e2) {
      let { platform: r2, arch: t2, archFromUname: n2, libssl: i, targetDistro: o2, familyDistro: s, originalDistro: a } = e2;
      r2 === "linux" && !["x64", "arm64"].includes(t2) && Jt(`Prisma only officially supports Linux on amd64 (x86_64) and arm64 (aarch64) system architectures (detected "${t2}" instead). If you are using your own custom Prisma engines, you can ignore this warning, as long as you've compiled the engines for your system architecture "${n2}".`);
      let l = "1.1.x";
      if (r2 === "linux" && i === void 0) {
        let c = hr({ familyDistro: s }).with({ familyDistro: "debian" }, () => "Please manually install OpenSSL via `apt-get update -y && apt-get install -y openssl` and try installing Prisma again. If you're running Prisma on Docker, add this command to your Dockerfile, or switch to an image that already has OpenSSL installed.").otherwise(() => "Please manually install OpenSSL and try installing Prisma again.");
        Jt(`Prisma failed to detect the libssl/openssl version to use, and may not work as expected. Defaulting to "openssl-${l}".
${c}`);
      }
      let u = "debian";
      if (r2 === "linux" && o2 === void 0 && ee(`Distro is "${a}". Falling back to Prisma engines built for "${u}".`), r2 === "darwin" && t2 === "arm64")
        return "darwin-arm64";
      if (r2 === "darwin")
        return "darwin";
      if (r2 === "win32")
        return "windows";
      if (r2 === "freebsd")
        return o2;
      if (r2 === "openbsd")
        return "openbsd";
      if (r2 === "netbsd")
        return "netbsd";
      if (r2 === "linux" && o2 === "nixos")
        return "linux-nixos";
      if (r2 === "linux" && t2 === "arm64")
        return `${o2 === "musl" ? "linux-musl-arm64" : "linux-arm64"}-openssl-${i || l}`;
      if (r2 === "linux" && t2 === "arm")
        return `linux-arm-openssl-${i || l}`;
      if (r2 === "linux" && o2 === "musl") {
        let c = "linux-musl";
        return !i || Xo(i) ? c : `${c}-openssl-${i}`;
      }
      return r2 === "linux" && o2 && i ? `${o2}-openssl-${i}` : (r2 !== "linux" && Jt(`Prisma detected unknown OS "${r2}" and may not work as expected. Defaulting to "linux".`), i ? `${u}-openssl-${i}` : o2 ? `${o2}-openssl-${l}` : `${u}-openssl-${l}`);
    }
    async function oc(e2) {
      try {
        return await e2();
      } catch {
        return;
      }
    }
    function Yt(e2) {
      return oc(async () => {
        let r2 = await Hu(e2);
        return ee(`Command "${e2}" successfully returned "${r2.stdout}"`), r2.stdout;
      });
    }
    async function sc() {
      return typeof Ht.default.machine == "function" ? Ht.default.machine() : (await Yt("uname -m"))?.trim();
    }
    function Xo(e2) {
      return e2.startsWith("1.");
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
    var uc = (e2, r2) => {
      if (typeof e2 != "number")
        throw new TypeError("The `x` argument is required");
      return typeof r2 != "number" ? C + (e2 + 1) + "G" : C + (r2 + 1) + et + (e2 + 1) + "H";
    };
    var cc = (e2, r2) => {
      if (typeof e2 != "number")
        throw new TypeError("The `x` argument is required");
      let t2 = "";
      return e2 < 0 ? t2 += C + -e2 + "D" : e2 > 0 && (t2 += C + e2 + "C"), r2 < 0 ? t2 += C + -r2 + "A" : r2 > 0 && (t2 += C + r2 + "B"), t2;
    };
    var rs = (e2 = 1) => C + e2 + "A";
    var pc = (e2 = 1) => C + e2 + "B";
    var dc = (e2 = 1) => C + e2 + "C";
    var mc = (e2 = 1) => C + e2 + "D";
    var ts = C + "G";
    var fc = es ? "\x1B7" : C + "s";
    var gc = es ? "\x1B8" : C + "u";
    var hc = C + "6n";
    var yc = C + "E";
    var bc = C + "F";
    var Ec = C + "?25l";
    var wc = C + "?25h";
    var xc = (e2) => {
      let r2 = "";
      for (let t2 = 0; t2 < e2; t2++)
        r2 += ns + (t2 < e2 - 1 ? rs() : "");
      return e2 && (r2 += ts), r2;
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
    var _c = (e2, r2) => [rt, "8", et, et, r2, yr, e2, rt, "8", et, et, yr].join("");
    var Nc = (e2, r2 = {}) => {
      let t2 = `${rt}1337;File=inline=1`;
      return r2.width && (t2 += `;width=${r2.width}`), r2.height && (t2 += `;height=${r2.height}`), r2.preserveAspectRatio === false && (t2 += ";preserveAspectRatio=0"), t2 + ":" + Buffer.from(e2).toString("base64") + yr;
    };
    var Lc = { setCwd: (e2 = lc()) => `${rt}50;CurrentDir=${e2}${yr}`, annotation(e2, r2 = {}) {
      let t2 = `${rt}1337;`, n2 = r2.x !== void 0, i = r2.y !== void 0;
      if ((n2 || i) && !(n2 && i && r2.length !== void 0))
        throw new Error("`x`, `y` and `length` must be defined when `x` or `y` is defined");
      return e2 = e2.replaceAll("|", ""), t2 += r2.isHidden ? "AddHiddenAnnotation=" : "AddAnnotation=", r2.length > 0 ? t2 += (n2 ? [e2, r2.length, r2.x, r2.y] : [r2.length, e2]).join("|") : t2 += e2, t2 + yr;
    } };
    var en = O(cs(), 1);
    function or(e2, r2, { target: t2 = "stdout", ...n2 } = {}) {
      return en.default[t2] ? Xt.link(e2, r2) : n2.fallback === false ? e2 : typeof n2.fallback == "function" ? n2.fallback(e2, r2) : `${e2} (\u200B${r2}\u200B)`;
    }
    or.isSupported = en.default.stdout;
    or.stderr = (e2, r2, t2 = {}) => or(e2, r2, { target: "stderr", ...t2 });
    or.stderr.isSupported = en.default.stderr;
    function wi(e2) {
      return or(e2, e2, { fallback: Y });
    }
    var Vc = ps();
    var xi = Vc.version;
    function Er(e2) {
      let r2 = jc();
      return r2 || (e2?.config.engineType === "library" ? "library" : e2?.config.engineType === "binary" ? "binary" : e2?.config.engineType === "client" ? "client" : Bc());
    }
    function jc() {
      let e2 = process.env.PRISMA_CLIENT_ENGINE_TYPE;
      return e2 === "library" ? "library" : e2 === "binary" ? "binary" : e2 === "client" ? "client" : void 0;
    }
    function Bc() {
      return "library";
    }
    function vi(e2) {
      return e2.name === "DriverAdapterError" && typeof e2.cause == "object";
    }
    function rn(e2) {
      return { ok: true, value: e2, map(r2) {
        return rn(r2(e2));
      }, flatMap(r2) {
        return r2(e2);
      } };
    }
    function sr(e2) {
      return { ok: false, error: e2, map() {
        return sr(e2);
      }, flatMap() {
        return sr(e2);
      } };
    }
    var ds = N("driver-adapter-utils");
    var Pi = class {
      constructor() {
        __publicField(this, "registeredErrors", []);
      }
      consumeError(r2) {
        return this.registeredErrors[r2];
      }
      registerNewError(r2) {
        let t2 = 0;
        for (; this.registeredErrors[t2] !== void 0; )
          t2++;
        return this.registeredErrors[t2] = { error: r2 }, t2;
      }
    };
    var tn = (e2, r2 = new Pi()) => {
      let t2 = { adapterName: e2.adapterName, errorRegistry: r2, queryRaw: ke(r2, e2.queryRaw.bind(e2)), executeRaw: ke(r2, e2.executeRaw.bind(e2)), executeScript: ke(r2, e2.executeScript.bind(e2)), dispose: ke(r2, e2.dispose.bind(e2)), provider: e2.provider, startTransaction: async (...n2) => (await ke(r2, e2.startTransaction.bind(e2))(...n2)).map((o2) => Uc(r2, o2)) };
      return e2.getConnectionInfo && (t2.getConnectionInfo = Gc(r2, e2.getConnectionInfo.bind(e2))), t2;
    };
    var Uc = (e2, r2) => ({ adapterName: r2.adapterName, provider: r2.provider, options: r2.options, queryRaw: ke(e2, r2.queryRaw.bind(r2)), executeRaw: ke(e2, r2.executeRaw.bind(r2)), commit: ke(e2, r2.commit.bind(r2)), rollback: ke(e2, r2.rollback.bind(r2)) });
    function ke(e2, r2) {
      return async (...t2) => {
        try {
          return rn(await r2(...t2));
        } catch (n2) {
          if (ds("[error@wrapAsync]", n2), vi(n2))
            return sr(n2.cause);
          let i = e2.registerNewError(n2);
          return sr({ kind: "GenericJs", id: i });
        }
      };
    }
    function Gc(e2, r2) {
      return (...t2) => {
        try {
          return rn(r2(...t2));
        } catch (n2) {
          if (ds("[error@wrapSync]", n2), vi(n2))
            return sr(n2.cause);
          let i = e2.registerNewError(n2);
          return sr({ kind: "GenericJs", id: i });
        }
      };
    }
    O(on());
    var M2 = O(__require("path"));
    O(on());
    N("prisma:engines");
    function ms() {
      return M2.default.join(__dirname, "../");
    }
    M2.default.join(__dirname, "../query-engine-darwin");
    M2.default.join(__dirname, "../query-engine-darwin-arm64");
    M2.default.join(__dirname, "../query-engine-debian-openssl-1.0.x");
    M2.default.join(__dirname, "../query-engine-debian-openssl-1.1.x");
    M2.default.join(__dirname, "../query-engine-debian-openssl-3.0.x");
    M2.default.join(__dirname, "../query-engine-linux-static-x64");
    M2.default.join(__dirname, "../query-engine-linux-static-arm64");
    M2.default.join(__dirname, "../query-engine-rhel-openssl-1.0.x");
    M2.default.join(__dirname, "../query-engine-rhel-openssl-1.1.x");
    M2.default.join(__dirname, "../query-engine-rhel-openssl-3.0.x");
    M2.default.join(__dirname, "../libquery_engine-darwin.dylib.node");
    M2.default.join(__dirname, "../libquery_engine-darwin-arm64.dylib.node");
    M2.default.join(__dirname, "../libquery_engine-debian-openssl-1.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-debian-openssl-1.1.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-debian-openssl-3.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-1.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-1.1.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-linux-arm64-openssl-3.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-linux-musl.so.node");
    M2.default.join(__dirname, "../libquery_engine-linux-musl-openssl-3.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-rhel-openssl-1.0.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-rhel-openssl-1.1.x.so.node");
    M2.default.join(__dirname, "../libquery_engine-rhel-openssl-3.0.x.so.node");
    M2.default.join(__dirname, "../query_engine-windows.dll.node");
    O(__require("fs"));
    gr("chmodPlusX");
    function Ai(e2) {
      let r2 = e2.e, t2 = (a) => `Prisma cannot find the required \`${a}\` system library in your system`, n2 = r2.message.includes("cannot open shared object file"), i = `Please refer to the documentation about Prisma's system requirements: ${wi("https://pris.ly/d/system-requirements")}`, o2 = `Unable to require(\`${Ce(e2.id)}\`).`, s = hr({ message: r2.message, code: r2.code }).with({ code: "ENOENT" }, () => "File does not exist.").when(({ message: a }) => n2 && a.includes("libz"), () => `${t2("libz")}. Please install it and try again.`).when(({ message: a }) => n2 && a.includes("libgcc_s"), () => `${t2("libgcc_s")}. Please install it and try again.`).when(({ message: a }) => n2 && a.includes("libssl"), () => {
        let a = e2.platformInfo.libssl ? `openssl-${e2.platformInfo.libssl}` : "openssl";
        return `${t2("libssl")}. Please install ${a} and try again.`;
      }).when(({ message: a }) => a.includes("GLIBC"), () => `Prisma has detected an incompatible version of the \`glibc\` C standard library installed in your system. This probably means your system may be too old to run Prisma. ${i}`).when(({ message: a }) => e2.platformInfo.platform === "linux" && a.includes("symbol not found"), () => `The Prisma engines are not compatible with your system ${e2.platformInfo.originalDistro} on (${e2.platformInfo.archFromUname}) which uses the \`${e2.platformInfo.binaryTarget}\` binaryTarget by default. ${i}`).otherwise(() => `The Prisma engines do not seem to be compatible with your system. ${i}`);
      return `${o2}
${s}

Details: ${r2.message}`;
    }
    var ys = O(hs(), 1);
    function Ci(e2) {
      let r2 = (0, ys.default)(e2);
      if (r2 === 0)
        return e2;
      let t2 = new RegExp(`^[ \\t]{${r2}}`, "gm");
      return e2.replace(t2, "");
    }
    var bs = "prisma+postgres";
    var sn = `${bs}:`;
    function an(e2) {
      return e2?.toString().startsWith(`${sn}//`) ?? false;
    }
    function Ii(e2) {
      if (!an(e2))
        return false;
      let { host: r2 } = new URL(e2);
      return r2.includes("localhost") || r2.includes("127.0.0.1") || r2.includes("[::1]");
    }
    var ws = O(Di());
    function ki(e2) {
      return String(new Oi(e2));
    }
    var Oi = class {
      constructor(r2) {
        this.config = r2;
      }
      toString() {
        let { config: r2 } = this, t2 = r2.provider.fromEnvVar ? `env("${r2.provider.fromEnvVar}")` : r2.provider.value, n2 = JSON.parse(JSON.stringify({ provider: t2, binaryTargets: Kc(r2.binaryTargets) }));
        return `generator ${r2.name} {
${(0, ws.default)(Hc(n2), 2)}
}`;
      }
    };
    function Kc(e2) {
      let r2;
      if (e2.length > 0) {
        let t2 = e2.find((n2) => n2.fromEnvVar !== null);
        t2 ? r2 = `env("${t2.fromEnvVar}")` : r2 = e2.map((n2) => n2.native ? "native" : n2.value);
      } else
        r2 = void 0;
      return r2;
    }
    function Hc(e2) {
      let r2 = Object.keys(e2).reduce((t2, n2) => Math.max(t2, n2.length), 0);
      return Object.entries(e2).map(([t2, n2]) => `${t2.padEnd(r2)} = ${Yc(n2)}`).join(`
`);
    }
    function Yc(e2) {
      return JSON.parse(JSON.stringify(e2, (r2, t2) => Array.isArray(t2) ? `[${t2.map((n2) => JSON.stringify(n2)).join(", ")}]` : JSON.stringify(t2)));
    }
    var nt = {};
    tr(nt, { error: () => Xc, info: () => Zc, log: () => zc, query: () => ep, should: () => xs, tags: () => tt, warn: () => _i });
    var tt = { error: ce("prisma:error"), warn: Ie("prisma:warn"), info: De("prisma:info"), query: nr("prisma:query") };
    var xs = { warn: () => !process.env.PRISMA_DISABLE_WARNINGS };
    function zc(...e2) {
      console.log(...e2);
    }
    function _i(e2, ...r2) {
      xs.warn() && console.warn(`${tt.warn} ${e2}`, ...r2);
    }
    function Zc(e2, ...r2) {
      console.info(`${tt.info} ${e2}`, ...r2);
    }
    function Xc(e2, ...r2) {
      console.error(`${tt.error} ${e2}`, ...r2);
    }
    function ep(e2, ...r2) {
      console.log(`${tt.query} ${e2}`, ...r2);
    }
    function ln(e2, r2) {
      if (!e2)
        throw new Error(`${r2}. This should never happen. If you see this error, please, open an issue at https://pris.ly/prisma-prisma-bug-report`);
    }
    function ar(e2, r2) {
      throw new Error(r2);
    }
    function Ni({ onlyFirst: e2 = false } = {}) {
      let t2 = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
      return new RegExp(t2, e2 ? void 0 : "g");
    }
    var rp = Ni();
    function wr(e2) {
      if (typeof e2 != "string")
        throw new TypeError(`Expected a \`string\`, got \`${typeof e2}\``);
      return e2.replace(rp, "");
    }
    var it = O(__require("path"));
    function Li(e2) {
      return it.default.sep === it.default.posix.sep ? e2 : e2.split(it.default.sep).join(it.default.posix.sep);
    }
    var qi = O(As());
    var un = O(__require("fs"));
    var xr = O(__require("path"));
    function Cs(e2) {
      let r2 = e2.ignoreProcessEnv ? {} : process.env, t2 = (n2) => n2.match(/(.?\${(?:[a-zA-Z0-9_]+)?})/g)?.reduce(function(o2, s) {
        let a = /(.?)\${([a-zA-Z0-9_]+)?}/g.exec(s);
        if (!a)
          return o2;
        let l = a[1], u, c;
        if (l === "\\")
          c = a[0], u = c.replace("\\$", "$");
        else {
          let p2 = a[2];
          c = a[0].substring(l.length), u = Object.hasOwnProperty.call(r2, p2) ? r2[p2] : e2.parsed[p2] || "", u = t2(u);
        }
        return o2.replace(c, u);
      }, n2) ?? n2;
      for (let n2 in e2.parsed) {
        let i = Object.hasOwnProperty.call(r2, n2) ? r2[n2] : e2.parsed[n2];
        e2.parsed[n2] = t2(i);
      }
      for (let n2 in e2.parsed)
        r2[n2] = e2.parsed[n2];
      return e2;
    }
    var $i = gr("prisma:tryLoadEnv");
    function st({ rootEnvPath: e2, schemaEnvPath: r2 }, t2 = { conflictCheck: "none" }) {
      let n2 = Is(e2);
      t2.conflictCheck !== "none" && hp(n2, r2, t2.conflictCheck);
      let i = null;
      return Ds(n2?.path, r2) || (i = Is(r2)), !n2 && !i && $i("No Environment variables loaded"), i?.dotenvResult.error ? console.error(ce(W("Schema Env Error: ")) + i.dotenvResult.error) : { message: [n2?.message, i?.message].filter(Boolean).join(`
`), parsed: { ...n2?.dotenvResult?.parsed, ...i?.dotenvResult?.parsed } };
    }
    function hp(e2, r2, t2) {
      let n2 = e2?.dotenvResult.parsed, i = !Ds(e2?.path, r2);
      if (n2 && r2 && i && un.default.existsSync(r2)) {
        let o2 = qi.default.parse(un.default.readFileSync(r2)), s = [];
        for (let a in o2)
          n2[a] === o2[a] && s.push(a);
        if (s.length > 0) {
          let a = xr.default.relative(process.cwd(), e2.path), l = xr.default.relative(process.cwd(), r2);
          if (t2 === "error") {
            let u = `There is a conflict between env var${s.length > 1 ? "s" : ""} in ${Y(a)} and ${Y(l)}
Conflicting env vars:
${s.map((c) => `  ${W(c)}`).join(`
`)}

We suggest to move the contents of ${Y(l)} to ${Y(a)} to consolidate your env vars.
`;
            throw new Error(u);
          } else if (t2 === "warn") {
            let u = `Conflict for env var${s.length > 1 ? "s" : ""} ${s.map((c) => W(c)).join(", ")} in ${Y(a)} and ${Y(l)}
Env vars from ${Y(l)} overwrite the ones from ${Y(a)}
      `;
            console.warn(`${Ie("warn(prisma)")} ${u}`);
          }
        }
      }
    }
    function Is(e2) {
      if (yp(e2)) {
        $i(`Environment variables loaded from ${e2}`);
        let r2 = qi.default.config({ path: e2, debug: process.env.DOTENV_CONFIG_DEBUG ? true : void 0 });
        return { dotenvResult: Cs(r2), message: Ce(`Environment variables loaded from ${xr.default.relative(process.cwd(), e2)}`), path: e2 };
      } else
        $i(`Environment variables not found at ${e2}`);
      return null;
    }
    function Ds(e2, r2) {
      return e2 && r2 && xr.default.resolve(e2) === xr.default.resolve(r2);
    }
    function yp(e2) {
      return !!(e2 && un.default.existsSync(e2));
    }
    function Vi(e2, r2) {
      return Object.prototype.hasOwnProperty.call(e2, r2);
    }
    function pn(e2, r2) {
      let t2 = {};
      for (let n2 of Object.keys(e2))
        t2[n2] = r2(e2[n2], n2);
      return t2;
    }
    function ji(e2, r2) {
      if (e2.length === 0)
        return;
      let t2 = e2[0];
      for (let n2 = 1; n2 < e2.length; n2++)
        r2(t2, e2[n2]) < 0 && (t2 = e2[n2]);
      return t2;
    }
    function x(e2, r2) {
      Object.defineProperty(e2, "name", { value: r2, configurable: true });
    }
    var ks = /* @__PURE__ */ new Set();
    var at = (e2, r2, ...t2) => {
      ks.has(e2) || (ks.add(e2), _i(r2, ...t2));
    };
    var P = class e2 extends Error {
      constructor(r2, t2, n2) {
        super(r2);
        __publicField(this, "clientVersion");
        __publicField(this, "errorCode");
        __publicField(this, "retryable");
        this.name = "PrismaClientInitializationError", this.clientVersion = t2, this.errorCode = n2, Error.captureStackTrace(e2);
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientInitializationError";
      }
    };
    x(P, "PrismaClientInitializationError");
    var z2 = class extends Error {
      constructor(r2, { code: t2, clientVersion: n2, meta: i, batchRequestIdx: o2 }) {
        super(r2);
        __publicField(this, "code");
        __publicField(this, "meta");
        __publicField(this, "clientVersion");
        __publicField(this, "batchRequestIdx");
        this.name = "PrismaClientKnownRequestError", this.code = t2, this.clientVersion = n2, this.meta = i, Object.defineProperty(this, "batchRequestIdx", { value: o2, enumerable: false, writable: true });
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientKnownRequestError";
      }
    };
    x(z2, "PrismaClientKnownRequestError");
    var ae = class extends Error {
      constructor(r2, t2) {
        super(r2);
        __publicField(this, "clientVersion");
        this.name = "PrismaClientRustPanicError", this.clientVersion = t2;
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientRustPanicError";
      }
    };
    x(ae, "PrismaClientRustPanicError");
    var V = class extends Error {
      constructor(r2, { clientVersion: t2, batchRequestIdx: n2 }) {
        super(r2);
        __publicField(this, "clientVersion");
        __publicField(this, "batchRequestIdx");
        this.name = "PrismaClientUnknownRequestError", this.clientVersion = t2, Object.defineProperty(this, "batchRequestIdx", { value: n2, writable: true, enumerable: false });
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientUnknownRequestError";
      }
    };
    x(V, "PrismaClientUnknownRequestError");
    var Z2 = class extends Error {
      constructor(r2, { clientVersion: t2 }) {
        super(r2);
        __publicField(this, "name", "PrismaClientValidationError");
        __publicField(this, "clientVersion");
        this.clientVersion = t2;
      }
      get [Symbol.toStringTag]() {
        return "PrismaClientValidationError";
      }
    };
    x(Z2, "PrismaClientValidationError");
    var we = class {
      constructor() {
        __publicField(this, "_map", /* @__PURE__ */ new Map());
      }
      get(r2) {
        return this._map.get(r2)?.value;
      }
      set(r2, t2) {
        this._map.set(r2, { value: t2 });
      }
      getOrCreate(r2, t2) {
        let n2 = this._map.get(r2);
        if (n2)
          return n2.value;
        let i = t2();
        return this.set(r2, i), i;
      }
    };
    function We(e2) {
      return e2.substring(0, 1).toLowerCase() + e2.substring(1);
    }
    function _s(e2, r2) {
      let t2 = {};
      for (let n2 of e2) {
        let i = n2[r2];
        t2[i] = n2;
      }
      return t2;
    }
    function lt(e2) {
      let r2;
      return { get() {
        return r2 || (r2 = { value: e2() }), r2.value;
      } };
    }
    function Ns(e2) {
      return { models: Bi(e2.models), enums: Bi(e2.enums), types: Bi(e2.types) };
    }
    function Bi(e2) {
      let r2 = {};
      for (let { name: t2, ...n2 } of e2)
        r2[t2] = n2;
      return r2;
    }
    function vr(e2) {
      return e2 instanceof Date || Object.prototype.toString.call(e2) === "[object Date]";
    }
    function mn(e2) {
      return e2.toString() !== "Invalid Date";
    }
    var Pr = 9e15;
    var Ye = 1e9;
    var Ui = "0123456789abcdef";
    var hn = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058";
    var yn = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789";
    var Gi = { precision: 20, rounding: 4, modulo: 1, toExpNeg: -7, toExpPos: 21, minE: -Pr, maxE: Pr, crypto: false };
    var $s;
    var Ne;
    var w2 = true;
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
      var e2 = new this.constructor(this);
      return e2.s < 0 && (e2.s = 1), y(e2);
    };
    m.ceil = function() {
      return y(new this.constructor(this), this.e + 1, 2);
    };
    m.clampedTo = m.clamp = function(e2, r2) {
      var t2, n2 = this, i = n2.constructor;
      if (e2 = new i(e2), r2 = new i(r2), !e2.s || !r2.s)
        return new i(NaN);
      if (e2.gt(r2))
        throw Error(He + r2);
      return t2 = n2.cmp(e2), t2 < 0 ? e2 : n2.cmp(r2) > 0 ? r2 : new i(n2);
    };
    m.comparedTo = m.cmp = function(e2) {
      var r2, t2, n2, i, o2 = this, s = o2.d, a = (e2 = new o2.constructor(e2)).d, l = o2.s, u = e2.s;
      if (!s || !a)
        return !l || !u ? NaN : l !== u ? l : s === a ? 0 : !s ^ l < 0 ? 1 : -1;
      if (!s[0] || !a[0])
        return s[0] ? l : a[0] ? -u : 0;
      if (l !== u)
        return l;
      if (o2.e !== e2.e)
        return o2.e > e2.e ^ l < 0 ? 1 : -1;
      for (n2 = s.length, i = a.length, r2 = 0, t2 = n2 < i ? n2 : i; r2 < t2; ++r2)
        if (s[r2] !== a[r2])
          return s[r2] > a[r2] ^ l < 0 ? 1 : -1;
      return n2 === i ? 0 : n2 > i ^ l < 0 ? 1 : -1;
    };
    m.cosine = m.cos = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return t2.d ? t2.d[0] ? (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + Math.max(t2.e, t2.sd()) + E, n2.rounding = 1, t2 = Pp(n2, Js(n2, t2)), n2.precision = e2, n2.rounding = r2, y(Ne == 2 || Ne == 3 ? t2.neg() : t2, e2, r2, true)) : new n2(1) : new n2(NaN);
    };
    m.cubeRoot = m.cbrt = function() {
      var e2, r2, t2, n2, i, o2, s, a, l, u, c = this, p2 = c.constructor;
      if (!c.isFinite() || c.isZero())
        return new p2(c);
      for (w2 = false, o2 = c.s * U(c.s * c, 1 / 3), !o2 || Math.abs(o2) == 1 / 0 ? (t2 = J(c.d), e2 = c.e, (o2 = (e2 - t2.length + 1) % 3) && (t2 += o2 == 1 || o2 == -2 ? "0" : "00"), o2 = U(t2, 1 / 3), e2 = X((e2 + 1) / 3) - (e2 % 3 == (e2 < 0 ? -1 : 2)), o2 == 1 / 0 ? t2 = "5e" + e2 : (t2 = o2.toExponential(), t2 = t2.slice(0, t2.indexOf("e") + 1) + e2), n2 = new p2(t2), n2.s = c.s) : n2 = new p2(o2.toString()), s = (e2 = p2.precision) + 3; ; )
        if (a = n2, l = a.times(a).times(a), u = l.plus(c), n2 = L(u.plus(c).times(a), u.plus(l), s + 2, 1), J(a.d).slice(0, s) === (t2 = J(n2.d)).slice(0, s))
          if (t2 = t2.slice(s - 3, s + 1), t2 == "9999" || !i && t2 == "4999") {
            if (!i && (y(a, e2 + 1, 0), a.times(a).times(a).eq(c))) {
              n2 = a;
              break;
            }
            s += 4, i = 1;
          } else {
            (!+t2 || !+t2.slice(1) && t2.charAt(0) == "5") && (y(n2, e2 + 1, 1), r2 = !n2.times(n2).times(n2).eq(c));
            break;
          }
      return w2 = true, y(n2, e2, p2.rounding, r2);
    };
    m.decimalPlaces = m.dp = function() {
      var e2, r2 = this.d, t2 = NaN;
      if (r2) {
        if (e2 = r2.length - 1, t2 = (e2 - X(this.e / E)) * E, e2 = r2[e2], e2)
          for (; e2 % 10 == 0; e2 /= 10)
            t2--;
        t2 < 0 && (t2 = 0);
      }
      return t2;
    };
    m.dividedBy = m.div = function(e2) {
      return L(this, new this.constructor(e2));
    };
    m.dividedToIntegerBy = m.divToInt = function(e2) {
      var r2 = this, t2 = r2.constructor;
      return y(L(r2, new t2(e2), 0, 1, 1), t2.precision, t2.rounding);
    };
    m.equals = m.eq = function(e2) {
      return this.cmp(e2) === 0;
    };
    m.floor = function() {
      return y(new this.constructor(this), this.e + 1, 3);
    };
    m.greaterThan = m.gt = function(e2) {
      return this.cmp(e2) > 0;
    };
    m.greaterThanOrEqualTo = m.gte = function(e2) {
      var r2 = this.cmp(e2);
      return r2 == 1 || r2 === 0;
    };
    m.hyperbolicCosine = m.cosh = function() {
      var e2, r2, t2, n2, i, o2 = this, s = o2.constructor, a = new s(1);
      if (!o2.isFinite())
        return new s(o2.s ? 1 / 0 : NaN);
      if (o2.isZero())
        return a;
      t2 = s.precision, n2 = s.rounding, s.precision = t2 + Math.max(o2.e, o2.sd()) + 4, s.rounding = 1, i = o2.d.length, i < 32 ? (e2 = Math.ceil(i / 3), r2 = (1 / xn(4, e2)).toString()) : (e2 = 16, r2 = "2.3283064365386962890625e-10"), o2 = Tr(s, 1, o2.times(r2), new s(1), true);
      for (var l, u = e2, c = new s(8); u--; )
        l = o2.times(o2), o2 = a.minus(l.times(c.minus(l.times(c))));
      return y(o2, s.precision = t2, s.rounding = n2, true);
    };
    m.hyperbolicSine = m.sinh = function() {
      var e2, r2, t2, n2, i = this, o2 = i.constructor;
      if (!i.isFinite() || i.isZero())
        return new o2(i);
      if (r2 = o2.precision, t2 = o2.rounding, o2.precision = r2 + Math.max(i.e, i.sd()) + 4, o2.rounding = 1, n2 = i.d.length, n2 < 3)
        i = Tr(o2, 2, i, i, true);
      else {
        e2 = 1.4 * Math.sqrt(n2), e2 = e2 > 16 ? 16 : e2 | 0, i = i.times(1 / xn(5, e2)), i = Tr(o2, 2, i, i, true);
        for (var s, a = new o2(5), l = new o2(16), u = new o2(20); e2--; )
          s = i.times(i), i = i.times(a.plus(s.times(l.times(s).plus(u))));
      }
      return o2.precision = r2, o2.rounding = t2, y(i, r2, t2, true);
    };
    m.hyperbolicTangent = m.tanh = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return t2.isFinite() ? t2.isZero() ? new n2(t2) : (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + 7, n2.rounding = 1, L(t2.sinh(), t2.cosh(), n2.precision = e2, n2.rounding = r2)) : new n2(t2.s);
    };
    m.inverseCosine = m.acos = function() {
      var e2 = this, r2 = e2.constructor, t2 = e2.abs().cmp(1), n2 = r2.precision, i = r2.rounding;
      return t2 !== -1 ? t2 === 0 ? e2.isNeg() ? xe(r2, n2, i) : new r2(0) : new r2(NaN) : e2.isZero() ? xe(r2, n2 + 4, i).times(0.5) : (r2.precision = n2 + 6, r2.rounding = 1, e2 = new r2(1).minus(e2).div(e2.plus(1)).sqrt().atan(), r2.precision = n2, r2.rounding = i, e2.times(2));
    };
    m.inverseHyperbolicCosine = m.acosh = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return t2.lte(1) ? new n2(t2.eq(1) ? 0 : NaN) : t2.isFinite() ? (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + Math.max(Math.abs(t2.e), t2.sd()) + 4, n2.rounding = 1, w2 = false, t2 = t2.times(t2).minus(1).sqrt().plus(t2), w2 = true, n2.precision = e2, n2.rounding = r2, t2.ln()) : new n2(t2);
    };
    m.inverseHyperbolicSine = m.asinh = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return !t2.isFinite() || t2.isZero() ? new n2(t2) : (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + 2 * Math.max(Math.abs(t2.e), t2.sd()) + 6, n2.rounding = 1, w2 = false, t2 = t2.times(t2).plus(1).sqrt().plus(t2), w2 = true, n2.precision = e2, n2.rounding = r2, t2.ln());
    };
    m.inverseHyperbolicTangent = m.atanh = function() {
      var e2, r2, t2, n2, i = this, o2 = i.constructor;
      return i.isFinite() ? i.e >= 0 ? new o2(i.abs().eq(1) ? i.s / 0 : i.isZero() ? i : NaN) : (e2 = o2.precision, r2 = o2.rounding, n2 = i.sd(), Math.max(n2, e2) < 2 * -i.e - 1 ? y(new o2(i), e2, r2, true) : (o2.precision = t2 = n2 - i.e, i = L(i.plus(1), new o2(1).minus(i), t2 + e2, 1), o2.precision = e2 + 4, o2.rounding = 1, i = i.ln(), o2.precision = e2, o2.rounding = r2, i.times(0.5))) : new o2(NaN);
    };
    m.inverseSine = m.asin = function() {
      var e2, r2, t2, n2, i = this, o2 = i.constructor;
      return i.isZero() ? new o2(i) : (r2 = i.abs().cmp(1), t2 = o2.precision, n2 = o2.rounding, r2 !== -1 ? r2 === 0 ? (e2 = xe(o2, t2 + 4, n2).times(0.5), e2.s = i.s, e2) : new o2(NaN) : (o2.precision = t2 + 6, o2.rounding = 1, i = i.div(new o2(1).minus(i.times(i)).sqrt().plus(1)).atan(), o2.precision = t2, o2.rounding = n2, i.times(2)));
    };
    m.inverseTangent = m.atan = function() {
      var e2, r2, t2, n2, i, o2, s, a, l, u = this, c = u.constructor, p2 = c.precision, d2 = c.rounding;
      if (u.isFinite()) {
        if (u.isZero())
          return new c(u);
        if (u.abs().eq(1) && p2 + 4 <= Qi)
          return s = xe(c, p2 + 4, d2).times(0.25), s.s = u.s, s;
      } else {
        if (!u.s)
          return new c(NaN);
        if (p2 + 4 <= Qi)
          return s = xe(c, p2 + 4, d2).times(0.5), s.s = u.s, s;
      }
      for (c.precision = a = p2 + 10, c.rounding = 1, t2 = Math.min(28, a / E + 2 | 0), e2 = t2; e2; --e2)
        u = u.div(u.times(u).plus(1).sqrt().plus(1));
      for (w2 = false, r2 = Math.ceil(a / E), n2 = 1, l = u.times(u), s = new c(u), i = u; e2 !== -1; )
        if (i = i.times(l), o2 = s.minus(i.div(n2 += 2)), i = i.times(l), s = o2.plus(i.div(n2 += 2)), s.d[r2] !== void 0)
          for (e2 = r2; s.d[e2] === o2.d[e2] && e2--; )
            ;
      return t2 && (s = s.times(2 << t2 - 1)), w2 = true, y(s, c.precision = p2, c.rounding = d2, true);
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
    m.lessThan = m.lt = function(e2) {
      return this.cmp(e2) < 0;
    };
    m.lessThanOrEqualTo = m.lte = function(e2) {
      return this.cmp(e2) < 1;
    };
    m.logarithm = m.log = function(e2) {
      var r2, t2, n2, i, o2, s, a, l, u = this, c = u.constructor, p2 = c.precision, d2 = c.rounding, f = 5;
      if (e2 == null)
        e2 = new c(10), r2 = true;
      else {
        if (e2 = new c(e2), t2 = e2.d, e2.s < 0 || !t2 || !t2[0] || e2.eq(1))
          return new c(NaN);
        r2 = e2.eq(10);
      }
      if (t2 = u.d, u.s < 0 || !t2 || !t2[0] || u.eq(1))
        return new c(t2 && !t2[0] ? -1 / 0 : u.s != 1 ? NaN : t2 ? 0 : 1 / 0);
      if (r2)
        if (t2.length > 1)
          o2 = true;
        else {
          for (i = t2[0]; i % 10 === 0; )
            i /= 10;
          o2 = i !== 1;
        }
      if (w2 = false, a = p2 + f, s = Ke(u, a), n2 = r2 ? bn(c, a + 10) : Ke(e2, a), l = L(s, n2, a, 1), ut(l.d, i = p2, d2))
        do
          if (a += 10, s = Ke(u, a), n2 = r2 ? bn(c, a + 10) : Ke(e2, a), l = L(s, n2, a, 1), !o2) {
            +J(l.d).slice(i + 1, i + 15) + 1 == 1e14 && (l = y(l, p2 + 1, 0));
            break;
          }
        while (ut(l.d, i += 10, d2));
      return w2 = true, y(l, p2, d2);
    };
    m.minus = m.sub = function(e2) {
      var r2, t2, n2, i, o2, s, a, l, u, c, p2, d2, f = this, h = f.constructor;
      if (e2 = new h(e2), !f.d || !e2.d)
        return !f.s || !e2.s ? e2 = new h(NaN) : f.d ? e2.s = -e2.s : e2 = new h(e2.d || f.s !== e2.s ? f : NaN), e2;
      if (f.s != e2.s)
        return e2.s = -e2.s, f.plus(e2);
      if (u = f.d, d2 = e2.d, a = h.precision, l = h.rounding, !u[0] || !d2[0]) {
        if (d2[0])
          e2.s = -e2.s;
        else if (u[0])
          e2 = new h(f);
        else
          return new h(l === 3 ? -0 : 0);
        return w2 ? y(e2, a, l) : e2;
      }
      if (t2 = X(e2.e / E), c = X(f.e / E), u = u.slice(), o2 = c - t2, o2) {
        for (p2 = o2 < 0, p2 ? (r2 = u, o2 = -o2, s = d2.length) : (r2 = d2, t2 = c, s = u.length), n2 = Math.max(Math.ceil(a / E), s) + 2, o2 > n2 && (o2 = n2, r2.length = 1), r2.reverse(), n2 = o2; n2--; )
          r2.push(0);
        r2.reverse();
      } else {
        for (n2 = u.length, s = d2.length, p2 = n2 < s, p2 && (s = n2), n2 = 0; n2 < s; n2++)
          if (u[n2] != d2[n2]) {
            p2 = u[n2] < d2[n2];
            break;
          }
        o2 = 0;
      }
      for (p2 && (r2 = u, u = d2, d2 = r2, e2.s = -e2.s), s = u.length, n2 = d2.length - s; n2 > 0; --n2)
        u[s++] = 0;
      for (n2 = d2.length; n2 > o2; ) {
        if (u[--n2] < d2[n2]) {
          for (i = n2; i && u[--i] === 0; )
            u[i] = fe - 1;
          --u[i], u[n2] += fe;
        }
        u[n2] -= d2[n2];
      }
      for (; u[--s] === 0; )
        u.pop();
      for (; u[0] === 0; u.shift())
        --t2;
      return u[0] ? (e2.d = u, e2.e = wn(u, t2), w2 ? y(e2, a, l) : e2) : new h(l === 3 ? -0 : 0);
    };
    m.modulo = m.mod = function(e2) {
      var r2, t2 = this, n2 = t2.constructor;
      return e2 = new n2(e2), !t2.d || !e2.s || e2.d && !e2.d[0] ? new n2(NaN) : !e2.d || t2.d && !t2.d[0] ? y(new n2(t2), n2.precision, n2.rounding) : (w2 = false, n2.modulo == 9 ? (r2 = L(t2, e2.abs(), 0, 3, 1), r2.s *= e2.s) : r2 = L(t2, e2, 0, n2.modulo, 1), r2 = r2.times(e2), w2 = true, t2.minus(r2));
    };
    m.naturalExponential = m.exp = function() {
      return Wi(this);
    };
    m.naturalLogarithm = m.ln = function() {
      return Ke(this);
    };
    m.negated = m.neg = function() {
      var e2 = new this.constructor(this);
      return e2.s = -e2.s, y(e2);
    };
    m.plus = m.add = function(e2) {
      var r2, t2, n2, i, o2, s, a, l, u, c, p2 = this, d2 = p2.constructor;
      if (e2 = new d2(e2), !p2.d || !e2.d)
        return !p2.s || !e2.s ? e2 = new d2(NaN) : p2.d || (e2 = new d2(e2.d || p2.s === e2.s ? p2 : NaN)), e2;
      if (p2.s != e2.s)
        return e2.s = -e2.s, p2.minus(e2);
      if (u = p2.d, c = e2.d, a = d2.precision, l = d2.rounding, !u[0] || !c[0])
        return c[0] || (e2 = new d2(p2)), w2 ? y(e2, a, l) : e2;
      if (o2 = X(p2.e / E), n2 = X(e2.e / E), u = u.slice(), i = o2 - n2, i) {
        for (i < 0 ? (t2 = u, i = -i, s = c.length) : (t2 = c, n2 = o2, s = u.length), o2 = Math.ceil(a / E), s = o2 > s ? o2 + 1 : s + 1, i > s && (i = s, t2.length = 1), t2.reverse(); i--; )
          t2.push(0);
        t2.reverse();
      }
      for (s = u.length, i = c.length, s - i < 0 && (i = s, t2 = c, c = u, u = t2), r2 = 0; i; )
        r2 = (u[--i] = u[i] + c[i] + r2) / fe | 0, u[i] %= fe;
      for (r2 && (u.unshift(r2), ++n2), s = u.length; u[--s] == 0; )
        u.pop();
      return e2.d = u, e2.e = wn(u, n2), w2 ? y(e2, a, l) : e2;
    };
    m.precision = m.sd = function(e2) {
      var r2, t2 = this;
      if (e2 !== void 0 && e2 !== !!e2 && e2 !== 1 && e2 !== 0)
        throw Error(He + e2);
      return t2.d ? (r2 = Us(t2.d), e2 && t2.e + 1 > r2 && (r2 = t2.e + 1)) : r2 = NaN, r2;
    };
    m.round = function() {
      var e2 = this, r2 = e2.constructor;
      return y(new r2(e2), e2.e + 1, r2.rounding);
    };
    m.sine = m.sin = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return t2.isFinite() ? t2.isZero() ? new n2(t2) : (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + Math.max(t2.e, t2.sd()) + E, n2.rounding = 1, t2 = Sp(n2, Js(n2, t2)), n2.precision = e2, n2.rounding = r2, y(Ne > 2 ? t2.neg() : t2, e2, r2, true)) : new n2(NaN);
    };
    m.squareRoot = m.sqrt = function() {
      var e2, r2, t2, n2, i, o2, s = this, a = s.d, l = s.e, u = s.s, c = s.constructor;
      if (u !== 1 || !a || !a[0])
        return new c(!u || u < 0 && (!a || a[0]) ? NaN : a ? s : 1 / 0);
      for (w2 = false, u = Math.sqrt(+s), u == 0 || u == 1 / 0 ? (r2 = J(a), (r2.length + l) % 2 == 0 && (r2 += "0"), u = Math.sqrt(r2), l = X((l + 1) / 2) - (l < 0 || l % 2), u == 1 / 0 ? r2 = "5e" + l : (r2 = u.toExponential(), r2 = r2.slice(0, r2.indexOf("e") + 1) + l), n2 = new c(r2)) : n2 = new c(u.toString()), t2 = (l = c.precision) + 3; ; )
        if (o2 = n2, n2 = o2.plus(L(s, o2, t2 + 2, 1)).times(0.5), J(o2.d).slice(0, t2) === (r2 = J(n2.d)).slice(0, t2))
          if (r2 = r2.slice(t2 - 3, t2 + 1), r2 == "9999" || !i && r2 == "4999") {
            if (!i && (y(o2, l + 1, 0), o2.times(o2).eq(s))) {
              n2 = o2;
              break;
            }
            t2 += 4, i = 1;
          } else {
            (!+r2 || !+r2.slice(1) && r2.charAt(0) == "5") && (y(n2, l + 1, 1), e2 = !n2.times(n2).eq(s));
            break;
          }
      return w2 = true, y(n2, l, c.rounding, e2);
    };
    m.tangent = m.tan = function() {
      var e2, r2, t2 = this, n2 = t2.constructor;
      return t2.isFinite() ? t2.isZero() ? new n2(t2) : (e2 = n2.precision, r2 = n2.rounding, n2.precision = e2 + 10, n2.rounding = 1, t2 = t2.sin(), t2.s = 1, t2 = L(t2, new n2(1).minus(t2.times(t2)).sqrt(), e2 + 10, 0), n2.precision = e2, n2.rounding = r2, y(Ne == 2 || Ne == 4 ? t2.neg() : t2, e2, r2, true)) : new n2(NaN);
    };
    m.times = m.mul = function(e2) {
      var r2, t2, n2, i, o2, s, a, l, u, c = this, p2 = c.constructor, d2 = c.d, f = (e2 = new p2(e2)).d;
      if (e2.s *= c.s, !d2 || !d2[0] || !f || !f[0])
        return new p2(!e2.s || d2 && !d2[0] && !f || f && !f[0] && !d2 ? NaN : !d2 || !f ? e2.s / 0 : e2.s * 0);
      for (t2 = X(c.e / E) + X(e2.e / E), l = d2.length, u = f.length, l < u && (o2 = d2, d2 = f, f = o2, s = l, l = u, u = s), o2 = [], s = l + u, n2 = s; n2--; )
        o2.push(0);
      for (n2 = u; --n2 >= 0; ) {
        for (r2 = 0, i = l + n2; i > n2; )
          a = o2[i] + f[n2] * d2[i - n2 - 1] + r2, o2[i--] = a % fe | 0, r2 = a / fe | 0;
        o2[i] = (o2[i] + r2) % fe | 0;
      }
      for (; !o2[--s]; )
        o2.pop();
      return r2 ? ++t2 : o2.shift(), e2.d = o2, e2.e = wn(o2, t2), w2 ? y(e2, p2.precision, p2.rounding) : e2;
    };
    m.toBinary = function(e2, r2) {
      return Ji(this, 2, e2, r2);
    };
    m.toDecimalPlaces = m.toDP = function(e2, r2) {
      var t2 = this, n2 = t2.constructor;
      return t2 = new n2(t2), e2 === void 0 ? t2 : (ne(e2, 0, Ye), r2 === void 0 ? r2 = n2.rounding : ne(r2, 0, 8), y(t2, e2 + t2.e + 1, r2));
    };
    m.toExponential = function(e2, r2) {
      var t2, n2 = this, i = n2.constructor;
      return e2 === void 0 ? t2 = ve(n2, true) : (ne(e2, 0, Ye), r2 === void 0 ? r2 = i.rounding : ne(r2, 0, 8), n2 = y(new i(n2), e2 + 1, r2), t2 = ve(n2, true, e2 + 1)), n2.isNeg() && !n2.isZero() ? "-" + t2 : t2;
    };
    m.toFixed = function(e2, r2) {
      var t2, n2, i = this, o2 = i.constructor;
      return e2 === void 0 ? t2 = ve(i) : (ne(e2, 0, Ye), r2 === void 0 ? r2 = o2.rounding : ne(r2, 0, 8), n2 = y(new o2(i), e2 + i.e + 1, r2), t2 = ve(n2, false, e2 + n2.e + 1)), i.isNeg() && !i.isZero() ? "-" + t2 : t2;
    };
    m.toFraction = function(e2) {
      var r2, t2, n2, i, o2, s, a, l, u, c, p2, d2, f = this, h = f.d, g2 = f.constructor;
      if (!h)
        return new g2(f);
      if (u = t2 = new g2(1), n2 = l = new g2(0), r2 = new g2(n2), o2 = r2.e = Us(h) - f.e - 1, s = o2 % E, r2.d[0] = U(10, s < 0 ? E + s : s), e2 == null)
        e2 = o2 > 0 ? r2 : u;
      else {
        if (a = new g2(e2), !a.isInt() || a.lt(u))
          throw Error(He + a);
        e2 = a.gt(r2) ? o2 > 0 ? r2 : u : a;
      }
      for (w2 = false, a = new g2(J(h)), c = g2.precision, g2.precision = o2 = h.length * E * 2; p2 = L(a, r2, 0, 1, 1), i = t2.plus(p2.times(n2)), i.cmp(e2) != 1; )
        t2 = n2, n2 = i, i = u, u = l.plus(p2.times(i)), l = i, i = r2, r2 = a.minus(p2.times(i)), a = i;
      return i = L(e2.minus(t2), n2, 0, 1, 1), l = l.plus(i.times(u)), t2 = t2.plus(i.times(n2)), l.s = u.s = f.s, d2 = L(u, n2, o2, 1).minus(f).abs().cmp(L(l, t2, o2, 1).minus(f).abs()) < 1 ? [u, n2] : [l, t2], g2.precision = c, w2 = true, d2;
    };
    m.toHexadecimal = m.toHex = function(e2, r2) {
      return Ji(this, 16, e2, r2);
    };
    m.toNearest = function(e2, r2) {
      var t2 = this, n2 = t2.constructor;
      if (t2 = new n2(t2), e2 == null) {
        if (!t2.d)
          return t2;
        e2 = new n2(1), r2 = n2.rounding;
      } else {
        if (e2 = new n2(e2), r2 === void 0 ? r2 = n2.rounding : ne(r2, 0, 8), !t2.d)
          return e2.s ? t2 : e2;
        if (!e2.d)
          return e2.s && (e2.s = t2.s), e2;
      }
      return e2.d[0] ? (w2 = false, t2 = L(t2, e2, 0, r2, 1).times(e2), w2 = true, y(t2)) : (e2.s = t2.s, t2 = e2), t2;
    };
    m.toNumber = function() {
      return +this;
    };
    m.toOctal = function(e2, r2) {
      return Ji(this, 8, e2, r2);
    };
    m.toPower = m.pow = function(e2) {
      var r2, t2, n2, i, o2, s, a = this, l = a.constructor, u = +(e2 = new l(e2));
      if (!a.d || !e2.d || !a.d[0] || !e2.d[0])
        return new l(U(+a, u));
      if (a = new l(a), a.eq(1))
        return a;
      if (n2 = l.precision, o2 = l.rounding, e2.eq(1))
        return y(a, n2, o2);
      if (r2 = X(e2.e / E), r2 >= e2.d.length - 1 && (t2 = u < 0 ? -u : u) <= xp)
        return i = Gs(l, a, t2, n2), e2.s < 0 ? new l(1).div(i) : y(i, n2, o2);
      if (s = a.s, s < 0) {
        if (r2 < e2.d.length - 1)
          return new l(NaN);
        if ((e2.d[r2] & 1) == 0 && (s = 1), a.e == 0 && a.d[0] == 1 && a.d.length == 1)
          return a.s = s, a;
      }
      return t2 = U(+a, u), r2 = t2 == 0 || !isFinite(t2) ? X(u * (Math.log("0." + J(a.d)) / Math.LN10 + a.e + 1)) : new l(t2 + "").e, r2 > l.maxE + 1 || r2 < l.minE - 1 ? new l(r2 > 0 ? s / 0 : 0) : (w2 = false, l.rounding = a.s = 1, t2 = Math.min(12, (r2 + "").length), i = Wi(e2.times(Ke(a, n2 + t2)), n2), i.d && (i = y(i, n2 + 5, 1), ut(i.d, n2, o2) && (r2 = n2 + 10, i = y(Wi(e2.times(Ke(a, r2 + t2)), r2), r2 + 5, 1), +J(i.d).slice(n2 + 1, n2 + 15) + 1 == 1e14 && (i = y(i, n2 + 1, 0)))), i.s = s, w2 = true, l.rounding = o2, y(i, n2, o2));
    };
    m.toPrecision = function(e2, r2) {
      var t2, n2 = this, i = n2.constructor;
      return e2 === void 0 ? t2 = ve(n2, n2.e <= i.toExpNeg || n2.e >= i.toExpPos) : (ne(e2, 1, Ye), r2 === void 0 ? r2 = i.rounding : ne(r2, 0, 8), n2 = y(new i(n2), e2, r2), t2 = ve(n2, e2 <= n2.e || n2.e <= i.toExpNeg, e2)), n2.isNeg() && !n2.isZero() ? "-" + t2 : t2;
    };
    m.toSignificantDigits = m.toSD = function(e2, r2) {
      var t2 = this, n2 = t2.constructor;
      return e2 === void 0 ? (e2 = n2.precision, r2 = n2.rounding) : (ne(e2, 1, Ye), r2 === void 0 ? r2 = n2.rounding : ne(r2, 0, 8)), y(new n2(t2), e2, r2);
    };
    m.toString = function() {
      var e2 = this, r2 = e2.constructor, t2 = ve(e2, e2.e <= r2.toExpNeg || e2.e >= r2.toExpPos);
      return e2.isNeg() && !e2.isZero() ? "-" + t2 : t2;
    };
    m.truncated = m.trunc = function() {
      return y(new this.constructor(this), this.e + 1, 1);
    };
    m.valueOf = m.toJSON = function() {
      var e2 = this, r2 = e2.constructor, t2 = ve(e2, e2.e <= r2.toExpNeg || e2.e >= r2.toExpPos);
      return e2.isNeg() ? "-" + t2 : t2;
    };
    function J(e2) {
      var r2, t2, n2, i = e2.length - 1, o2 = "", s = e2[0];
      if (i > 0) {
        for (o2 += s, r2 = 1; r2 < i; r2++)
          n2 = e2[r2] + "", t2 = E - n2.length, t2 && (o2 += Je(t2)), o2 += n2;
        s = e2[r2], n2 = s + "", t2 = E - n2.length, t2 && (o2 += Je(t2));
      } else if (s === 0)
        return "0";
      for (; s % 10 === 0; )
        s /= 10;
      return o2 + s;
    }
    function ne(e2, r2, t2) {
      if (e2 !== ~~e2 || e2 < r2 || e2 > t2)
        throw Error(He + e2);
    }
    function ut(e2, r2, t2, n2) {
      var i, o2, s, a;
      for (o2 = e2[0]; o2 >= 10; o2 /= 10)
        --r2;
      return --r2 < 0 ? (r2 += E, i = 0) : (i = Math.ceil((r2 + 1) / E), r2 %= E), o2 = U(10, E - r2), a = e2[i] % o2 | 0, n2 == null ? r2 < 3 ? (r2 == 0 ? a = a / 100 | 0 : r2 == 1 && (a = a / 10 | 0), s = t2 < 4 && a == 99999 || t2 > 3 && a == 49999 || a == 5e4 || a == 0) : s = (t2 < 4 && a + 1 == o2 || t2 > 3 && a + 1 == o2 / 2) && (e2[i + 1] / o2 / 100 | 0) == U(10, r2 - 2) - 1 || (a == o2 / 2 || a == 0) && (e2[i + 1] / o2 / 100 | 0) == 0 : r2 < 4 ? (r2 == 0 ? a = a / 1e3 | 0 : r2 == 1 ? a = a / 100 | 0 : r2 == 2 && (a = a / 10 | 0), s = (n2 || t2 < 4) && a == 9999 || !n2 && t2 > 3 && a == 4999) : s = ((n2 || t2 < 4) && a + 1 == o2 || !n2 && t2 > 3 && a + 1 == o2 / 2) && (e2[i + 1] / o2 / 1e3 | 0) == U(10, r2 - 3) - 1, s;
    }
    function fn(e2, r2, t2) {
      for (var n2, i = [0], o2, s = 0, a = e2.length; s < a; ) {
        for (o2 = i.length; o2--; )
          i[o2] *= r2;
        for (i[0] += Ui.indexOf(e2.charAt(s++)), n2 = 0; n2 < i.length; n2++)
          i[n2] > t2 - 1 && (i[n2 + 1] === void 0 && (i[n2 + 1] = 0), i[n2 + 1] += i[n2] / t2 | 0, i[n2] %= t2);
      }
      return i.reverse();
    }
    function Pp(e2, r2) {
      var t2, n2, i;
      if (r2.isZero())
        return r2;
      n2 = r2.d.length, n2 < 32 ? (t2 = Math.ceil(n2 / 3), i = (1 / xn(4, t2)).toString()) : (t2 = 16, i = "2.3283064365386962890625e-10"), e2.precision += t2, r2 = Tr(e2, 1, r2.times(i), new e2(1));
      for (var o2 = t2; o2--; ) {
        var s = r2.times(r2);
        r2 = s.times(s).minus(s).times(8).plus(1);
      }
      return e2.precision -= t2, r2;
    }
    var L = /* @__PURE__ */ function() {
      function e2(n2, i, o2) {
        var s, a = 0, l = n2.length;
        for (n2 = n2.slice(); l--; )
          s = n2[l] * i + a, n2[l] = s % o2 | 0, a = s / o2 | 0;
        return a && n2.unshift(a), n2;
      }
      function r2(n2, i, o2, s) {
        var a, l;
        if (o2 != s)
          l = o2 > s ? 1 : -1;
        else
          for (a = l = 0; a < o2; a++)
            if (n2[a] != i[a]) {
              l = n2[a] > i[a] ? 1 : -1;
              break;
            }
        return l;
      }
      function t2(n2, i, o2, s) {
        for (var a = 0; o2--; )
          n2[o2] -= a, a = n2[o2] < i[o2] ? 1 : 0, n2[o2] = a * s + n2[o2] - i[o2];
        for (; !n2[0] && n2.length > 1; )
          n2.shift();
      }
      return function(n2, i, o2, s, a, l) {
        var u, c, p2, d2, f, h, g2, I2, T, S, b, D, me, se, Kr, j, te, Ae, K, fr, Vt = n2.constructor, ti = n2.s == i.s ? 1 : -1, H = n2.d, k2 = i.d;
        if (!H || !H[0] || !k2 || !k2[0])
          return new Vt(!n2.s || !i.s || (H ? k2 && H[0] == k2[0] : !k2) ? NaN : H && H[0] == 0 || !k2 ? ti * 0 : ti / 0);
        for (l ? (f = 1, c = n2.e - i.e) : (l = fe, f = E, c = X(n2.e / f) - X(i.e / f)), K = k2.length, te = H.length, T = new Vt(ti), S = T.d = [], p2 = 0; k2[p2] == (H[p2] || 0); p2++)
          ;
        if (k2[p2] > (H[p2] || 0) && c--, o2 == null ? (se = o2 = Vt.precision, s = Vt.rounding) : a ? se = o2 + (n2.e - i.e) + 1 : se = o2, se < 0)
          S.push(1), h = true;
        else {
          if (se = se / f + 2 | 0, p2 = 0, K == 1) {
            for (d2 = 0, k2 = k2[0], se++; (p2 < te || d2) && se--; p2++)
              Kr = d2 * l + (H[p2] || 0), S[p2] = Kr / k2 | 0, d2 = Kr % k2 | 0;
            h = d2 || p2 < te;
          } else {
            for (d2 = l / (k2[0] + 1) | 0, d2 > 1 && (k2 = e2(k2, d2, l), H = e2(H, d2, l), K = k2.length, te = H.length), j = K, b = H.slice(0, K), D = b.length; D < K; )
              b[D++] = 0;
            fr = k2.slice(), fr.unshift(0), Ae = k2[0], k2[1] >= l / 2 && ++Ae;
            do
              d2 = 0, u = r2(k2, b, K, D), u < 0 ? (me = b[0], K != D && (me = me * l + (b[1] || 0)), d2 = me / Ae | 0, d2 > 1 ? (d2 >= l && (d2 = l - 1), g2 = e2(k2, d2, l), I2 = g2.length, D = b.length, u = r2(g2, b, I2, D), u == 1 && (d2--, t2(g2, K < I2 ? fr : k2, I2, l))) : (d2 == 0 && (u = d2 = 1), g2 = k2.slice()), I2 = g2.length, I2 < D && g2.unshift(0), t2(b, g2, D, l), u == -1 && (D = b.length, u = r2(k2, b, K, D), u < 1 && (d2++, t2(b, K < D ? fr : k2, D, l))), D = b.length) : u === 0 && (d2++, b = [0]), S[p2++] = d2, u && b[0] ? b[D++] = H[j] || 0 : (b = [H[j]], D = 1);
            while ((j++ < te || b[0] !== void 0) && se--);
            h = b[0] !== void 0;
          }
          S[0] || S.shift();
        }
        if (f == 1)
          T.e = c, $s = h;
        else {
          for (p2 = 1, d2 = S[0]; d2 >= 10; d2 /= 10)
            p2++;
          T.e = p2 + c * f - 1, y(T, a ? o2 + T.e + 1 : o2, s, h);
        }
        return T;
      };
    }();
    function y(e2, r2, t2, n2) {
      var i, o2, s, a, l, u, c, p2, d2, f = e2.constructor;
      e:
        if (r2 != null) {
          if (p2 = e2.d, !p2)
            return e2;
          for (i = 1, a = p2[0]; a >= 10; a /= 10)
            i++;
          if (o2 = r2 - i, o2 < 0)
            o2 += E, s = r2, c = p2[d2 = 0], l = c / U(10, i - s - 1) % 10 | 0;
          else if (d2 = Math.ceil((o2 + 1) / E), a = p2.length, d2 >= a)
            if (n2) {
              for (; a++ <= d2; )
                p2.push(0);
              c = l = 0, i = 1, o2 %= E, s = o2 - E + 1;
            } else
              break e;
          else {
            for (c = a = p2[d2], i = 1; a >= 10; a /= 10)
              i++;
            o2 %= E, s = o2 - E + i, l = s < 0 ? 0 : c / U(10, i - s - 1) % 10 | 0;
          }
          if (n2 = n2 || r2 < 0 || p2[d2 + 1] !== void 0 || (s < 0 ? c : c % U(10, i - s - 1)), u = t2 < 4 ? (l || n2) && (t2 == 0 || t2 == (e2.s < 0 ? 3 : 2)) : l > 5 || l == 5 && (t2 == 4 || n2 || t2 == 6 && (o2 > 0 ? s > 0 ? c / U(10, i - s) : 0 : p2[d2 - 1]) % 10 & 1 || t2 == (e2.s < 0 ? 8 : 7)), r2 < 1 || !p2[0])
            return p2.length = 0, u ? (r2 -= e2.e + 1, p2[0] = U(10, (E - r2 % E) % E), e2.e = -r2 || 0) : p2[0] = e2.e = 0, e2;
          if (o2 == 0 ? (p2.length = d2, a = 1, d2--) : (p2.length = d2 + 1, a = U(10, E - o2), p2[d2] = s > 0 ? (c / U(10, i - s) % U(10, s) | 0) * a : 0), u)
            for (; ; )
              if (d2 == 0) {
                for (o2 = 1, s = p2[0]; s >= 10; s /= 10)
                  o2++;
                for (s = p2[0] += a, a = 1; s >= 10; s /= 10)
                  a++;
                o2 != a && (e2.e++, p2[0] == fe && (p2[0] = 1));
                break;
              } else {
                if (p2[d2] += a, p2[d2] != fe)
                  break;
                p2[d2--] = 0, a = 1;
              }
          for (o2 = p2.length; p2[--o2] === 0; )
            p2.pop();
        }
      return w2 && (e2.e > f.maxE ? (e2.d = null, e2.e = NaN) : e2.e < f.minE && (e2.e = 0, e2.d = [0])), e2;
    }
    function ve(e2, r2, t2) {
      if (!e2.isFinite())
        return Ws(e2);
      var n2, i = e2.e, o2 = J(e2.d), s = o2.length;
      return r2 ? (t2 && (n2 = t2 - s) > 0 ? o2 = o2.charAt(0) + "." + o2.slice(1) + Je(n2) : s > 1 && (o2 = o2.charAt(0) + "." + o2.slice(1)), o2 = o2 + (e2.e < 0 ? "e" : "e+") + e2.e) : i < 0 ? (o2 = "0." + Je(-i - 1) + o2, t2 && (n2 = t2 - s) > 0 && (o2 += Je(n2))) : i >= s ? (o2 += Je(i + 1 - s), t2 && (n2 = t2 - i - 1) > 0 && (o2 = o2 + "." + Je(n2))) : ((n2 = i + 1) < s && (o2 = o2.slice(0, n2) + "." + o2.slice(n2)), t2 && (n2 = t2 - s) > 0 && (i + 1 === s && (o2 += "."), o2 += Je(n2))), o2;
    }
    function wn(e2, r2) {
      var t2 = e2[0];
      for (r2 *= E; t2 >= 10; t2 /= 10)
        r2++;
      return r2;
    }
    function bn(e2, r2, t2) {
      if (r2 > vp)
        throw w2 = true, t2 && (e2.precision = t2), Error(qs);
      return y(new e2(hn), r2, 1, true);
    }
    function xe(e2, r2, t2) {
      if (r2 > Qi)
        throw Error(qs);
      return y(new e2(yn), r2, t2, true);
    }
    function Us(e2) {
      var r2 = e2.length - 1, t2 = r2 * E + 1;
      if (r2 = e2[r2], r2) {
        for (; r2 % 10 == 0; r2 /= 10)
          t2--;
        for (r2 = e2[0]; r2 >= 10; r2 /= 10)
          t2++;
      }
      return t2;
    }
    function Je(e2) {
      for (var r2 = ""; e2--; )
        r2 += "0";
      return r2;
    }
    function Gs(e2, r2, t2, n2) {
      var i, o2 = new e2(1), s = Math.ceil(n2 / E + 4);
      for (w2 = false; ; ) {
        if (t2 % 2 && (o2 = o2.times(r2), Fs(o2.d, s) && (i = true)), t2 = X(t2 / 2), t2 === 0) {
          t2 = o2.d.length - 1, i && o2.d[t2] === 0 && ++o2.d[t2];
          break;
        }
        r2 = r2.times(r2), Fs(r2.d, s);
      }
      return w2 = true, o2;
    }
    function Ls(e2) {
      return e2.d[e2.d.length - 1] & 1;
    }
    function Qs(e2, r2, t2) {
      for (var n2, i, o2 = new e2(r2[0]), s = 0; ++s < r2.length; ) {
        if (i = new e2(r2[s]), !i.s) {
          o2 = i;
          break;
        }
        n2 = o2.cmp(i), (n2 === t2 || n2 === 0 && o2.s === t2) && (o2 = i);
      }
      return o2;
    }
    function Wi(e2, r2) {
      var t2, n2, i, o2, s, a, l, u = 0, c = 0, p2 = 0, d2 = e2.constructor, f = d2.rounding, h = d2.precision;
      if (!e2.d || !e2.d[0] || e2.e > 17)
        return new d2(e2.d ? e2.d[0] ? e2.s < 0 ? 0 : 1 / 0 : 1 : e2.s ? e2.s < 0 ? 0 : e2 : NaN);
      for (r2 == null ? (w2 = false, l = h) : l = r2, a = new d2(0.03125); e2.e > -2; )
        e2 = e2.times(a), p2 += 5;
      for (n2 = Math.log(U(2, p2)) / Math.LN10 * 2 + 5 | 0, l += n2, t2 = o2 = s = new d2(1), d2.precision = l; ; ) {
        if (o2 = y(o2.times(e2), l, 1), t2 = t2.times(++c), a = s.plus(L(o2, t2, l, 1)), J(a.d).slice(0, l) === J(s.d).slice(0, l)) {
          for (i = p2; i--; )
            s = y(s.times(s), l, 1);
          if (r2 == null)
            if (u < 3 && ut(s.d, l - n2, f, u))
              d2.precision = l += 10, t2 = o2 = a = new d2(1), c = 0, u++;
            else
              return y(s, d2.precision = h, f, w2 = true);
          else
            return d2.precision = h, s;
        }
        s = a;
      }
    }
    function Ke(e2, r2) {
      var t2, n2, i, o2, s, a, l, u, c, p2, d2, f = 1, h = 10, g2 = e2, I2 = g2.d, T = g2.constructor, S = T.rounding, b = T.precision;
      if (g2.s < 0 || !I2 || !I2[0] || !g2.e && I2[0] == 1 && I2.length == 1)
        return new T(I2 && !I2[0] ? -1 / 0 : g2.s != 1 ? NaN : I2 ? 0 : g2);
      if (r2 == null ? (w2 = false, c = b) : c = r2, T.precision = c += h, t2 = J(I2), n2 = t2.charAt(0), Math.abs(o2 = g2.e) < 15e14) {
        for (; n2 < 7 && n2 != 1 || n2 == 1 && t2.charAt(1) > 3; )
          g2 = g2.times(e2), t2 = J(g2.d), n2 = t2.charAt(0), f++;
        o2 = g2.e, n2 > 1 ? (g2 = new T("0." + t2), o2++) : g2 = new T(n2 + "." + t2.slice(1));
      } else
        return u = bn(T, c + 2, b).times(o2 + ""), g2 = Ke(new T(n2 + "." + t2.slice(1)), c - h).plus(u), T.precision = b, r2 == null ? y(g2, b, S, w2 = true) : g2;
      for (p2 = g2, l = s = g2 = L(g2.minus(1), g2.plus(1), c, 1), d2 = y(g2.times(g2), c, 1), i = 3; ; ) {
        if (s = y(s.times(d2), c, 1), u = l.plus(L(s, new T(i), c, 1)), J(u.d).slice(0, c) === J(l.d).slice(0, c))
          if (l = l.times(2), o2 !== 0 && (l = l.plus(bn(T, c + 2, b).times(o2 + ""))), l = L(l, new T(f), c, 1), r2 == null)
            if (ut(l.d, c - h, S, a))
              T.precision = c += h, u = s = g2 = L(p2.minus(1), p2.plus(1), c, 1), d2 = y(g2.times(g2), c, 1), i = a = 1;
            else
              return y(l, T.precision = b, S, w2 = true);
          else
            return T.precision = b, l;
        l = u, i += 2;
      }
    }
    function Ws(e2) {
      return String(e2.s * e2.s / 0);
    }
    function gn(e2, r2) {
      var t2, n2, i;
      for ((t2 = r2.indexOf(".")) > -1 && (r2 = r2.replace(".", "")), (n2 = r2.search(/e/i)) > 0 ? (t2 < 0 && (t2 = n2), t2 += +r2.slice(n2 + 1), r2 = r2.substring(0, n2)) : t2 < 0 && (t2 = r2.length), n2 = 0; r2.charCodeAt(n2) === 48; n2++)
        ;
      for (i = r2.length; r2.charCodeAt(i - 1) === 48; --i)
        ;
      if (r2 = r2.slice(n2, i), r2) {
        if (i -= n2, e2.e = t2 = t2 - n2 - 1, e2.d = [], n2 = (t2 + 1) % E, t2 < 0 && (n2 += E), n2 < i) {
          for (n2 && e2.d.push(+r2.slice(0, n2)), i -= E; n2 < i; )
            e2.d.push(+r2.slice(n2, n2 += E));
          r2 = r2.slice(n2), n2 = E - r2.length;
        } else
          n2 -= i;
        for (; n2--; )
          r2 += "0";
        e2.d.push(+r2), w2 && (e2.e > e2.constructor.maxE ? (e2.d = null, e2.e = NaN) : e2.e < e2.constructor.minE && (e2.e = 0, e2.d = [0]));
      } else
        e2.e = 0, e2.d = [0];
      return e2;
    }
    function Tp(e2, r2) {
      var t2, n2, i, o2, s, a, l, u, c;
      if (r2.indexOf("_") > -1) {
        if (r2 = r2.replace(/(\d)_(?=\d)/g, "$1"), Bs.test(r2))
          return gn(e2, r2);
      } else if (r2 === "Infinity" || r2 === "NaN")
        return +r2 || (e2.s = NaN), e2.e = NaN, e2.d = null, e2;
      if (Ep.test(r2))
        t2 = 16, r2 = r2.toLowerCase();
      else if (bp.test(r2))
        t2 = 2;
      else if (wp.test(r2))
        t2 = 8;
      else
        throw Error(He + r2);
      for (o2 = r2.search(/p/i), o2 > 0 ? (l = +r2.slice(o2 + 1), r2 = r2.substring(2, o2)) : r2 = r2.slice(2), o2 = r2.indexOf("."), s = o2 >= 0, n2 = e2.constructor, s && (r2 = r2.replace(".", ""), a = r2.length, o2 = a - o2, i = Gs(n2, new n2(t2), o2, o2 * 2)), u = fn(r2, t2, fe), c = u.length - 1, o2 = c; u[o2] === 0; --o2)
        u.pop();
      return o2 < 0 ? new n2(e2.s * 0) : (e2.e = wn(u, c), e2.d = u, w2 = false, s && (e2 = L(e2, i, a * 4)), l && (e2 = e2.times(Math.abs(l) < 54 ? U(2, l) : Le.pow(2, l))), w2 = true, e2);
    }
    function Sp(e2, r2) {
      var t2, n2 = r2.d.length;
      if (n2 < 3)
        return r2.isZero() ? r2 : Tr(e2, 2, r2, r2);
      t2 = 1.4 * Math.sqrt(n2), t2 = t2 > 16 ? 16 : t2 | 0, r2 = r2.times(1 / xn(5, t2)), r2 = Tr(e2, 2, r2, r2);
      for (var i, o2 = new e2(5), s = new e2(16), a = new e2(20); t2--; )
        i = r2.times(r2), r2 = r2.times(o2.plus(i.times(s.times(i).minus(a))));
      return r2;
    }
    function Tr(e2, r2, t2, n2, i) {
      var o2, s, a, l, c = e2.precision, p2 = Math.ceil(c / E);
      for (w2 = false, l = t2.times(t2), a = new e2(n2); ; ) {
        if (s = L(a.times(l), new e2(r2++ * r2++), c, 1), a = i ? n2.plus(s) : n2.minus(s), n2 = L(s.times(l), new e2(r2++ * r2++), c, 1), s = a.plus(n2), s.d[p2] !== void 0) {
          for (o2 = p2; s.d[o2] === a.d[o2] && o2--; )
            ;
          if (o2 == -1)
            break;
        }
        o2 = a, a = n2, n2 = s, s = o2;
      }
      return w2 = true, s.d.length = p2 + 1, s;
    }
    function xn(e2, r2) {
      for (var t2 = e2; --r2; )
        t2 *= e2;
      return t2;
    }
    function Js(e2, r2) {
      var t2, n2 = r2.s < 0, i = xe(e2, e2.precision, 1), o2 = i.times(0.5);
      if (r2 = r2.abs(), r2.lte(o2))
        return Ne = n2 ? 4 : 1, r2;
      if (t2 = r2.divToInt(i), t2.isZero())
        Ne = n2 ? 3 : 2;
      else {
        if (r2 = r2.minus(t2.times(i)), r2.lte(o2))
          return Ne = Ls(t2) ? n2 ? 2 : 3 : n2 ? 4 : 1, r2;
        Ne = Ls(t2) ? n2 ? 1 : 4 : n2 ? 3 : 2;
      }
      return r2.minus(i).abs();
    }
    function Ji(e2, r2, t2, n2) {
      var i, o2, s, a, l, u, c, p2, d2, f = e2.constructor, h = t2 !== void 0;
      if (h ? (ne(t2, 1, Ye), n2 === void 0 ? n2 = f.rounding : ne(n2, 0, 8)) : (t2 = f.precision, n2 = f.rounding), !e2.isFinite())
        c = Ws(e2);
      else {
        for (c = ve(e2), s = c.indexOf("."), h ? (i = 2, r2 == 16 ? t2 = t2 * 4 - 3 : r2 == 8 && (t2 = t2 * 3 - 2)) : i = r2, s >= 0 && (c = c.replace(".", ""), d2 = new f(1), d2.e = c.length - s, d2.d = fn(ve(d2), 10, i), d2.e = d2.d.length), p2 = fn(c, 10, i), o2 = l = p2.length; p2[--l] == 0; )
          p2.pop();
        if (!p2[0])
          c = h ? "0p+0" : "0";
        else {
          if (s < 0 ? o2-- : (e2 = new f(e2), e2.d = p2, e2.e = o2, e2 = L(e2, d2, t2, n2, 0, i), p2 = e2.d, o2 = e2.e, u = $s), s = p2[t2], a = i / 2, u = u || p2[t2 + 1] !== void 0, u = n2 < 4 ? (s !== void 0 || u) && (n2 === 0 || n2 === (e2.s < 0 ? 3 : 2)) : s > a || s === a && (n2 === 4 || u || n2 === 6 && p2[t2 - 1] & 1 || n2 === (e2.s < 0 ? 8 : 7)), p2.length = t2, u)
            for (; ++p2[--t2] > i - 1; )
              p2[t2] = 0, t2 || (++o2, p2.unshift(1));
          for (l = p2.length; !p2[l - 1]; --l)
            ;
          for (s = 0, c = ""; s < l; s++)
            c += Ui.charAt(p2[s]);
          if (h) {
            if (l > 1)
              if (r2 == 16 || r2 == 8) {
                for (s = r2 == 16 ? 4 : 3, --l; l % s; l++)
                  c += "0";
                for (p2 = fn(c, i, r2), l = p2.length; !p2[l - 1]; --l)
                  ;
                for (s = 1, c = "1."; s < l; s++)
                  c += Ui.charAt(p2[s]);
              } else
                c = c.charAt(0) + "." + c.slice(1);
            c = c + (o2 < 0 ? "p" : "p+") + o2;
          } else if (o2 < 0) {
            for (; ++o2; )
              c = "0" + c;
            c = "0." + c;
          } else if (++o2 > l)
            for (o2 -= l; o2--; )
              c += "0";
          else
            o2 < l && (c = c.slice(0, o2) + "." + c.slice(o2));
        }
        c = (r2 == 16 ? "0x" : r2 == 2 ? "0b" : r2 == 8 ? "0o" : "") + c;
      }
      return e2.s < 0 ? "-" + c : c;
    }
    function Fs(e2, r2) {
      if (e2.length > r2)
        return e2.length = r2, true;
    }
    function Rp(e2) {
      return new this(e2).abs();
    }
    function Ap(e2) {
      return new this(e2).acos();
    }
    function Cp(e2) {
      return new this(e2).acosh();
    }
    function Ip(e2, r2) {
      return new this(e2).plus(r2);
    }
    function Dp(e2) {
      return new this(e2).asin();
    }
    function Op(e2) {
      return new this(e2).asinh();
    }
    function kp(e2) {
      return new this(e2).atan();
    }
    function _p(e2) {
      return new this(e2).atanh();
    }
    function Np(e2, r2) {
      e2 = new this(e2), r2 = new this(r2);
      var t2, n2 = this.precision, i = this.rounding, o2 = n2 + 4;
      return !e2.s || !r2.s ? t2 = new this(NaN) : !e2.d && !r2.d ? (t2 = xe(this, o2, 1).times(r2.s > 0 ? 0.25 : 0.75), t2.s = e2.s) : !r2.d || e2.isZero() ? (t2 = r2.s < 0 ? xe(this, n2, i) : new this(0), t2.s = e2.s) : !e2.d || r2.isZero() ? (t2 = xe(this, o2, 1).times(0.5), t2.s = e2.s) : r2.s < 0 ? (this.precision = o2, this.rounding = 1, t2 = this.atan(L(e2, r2, o2, 1)), r2 = xe(this, o2, 1), this.precision = n2, this.rounding = i, t2 = e2.s < 0 ? t2.minus(r2) : t2.plus(r2)) : t2 = this.atan(L(e2, r2, o2, 1)), t2;
    }
    function Lp(e2) {
      return new this(e2).cbrt();
    }
    function Fp(e2) {
      return y(e2 = new this(e2), e2.e + 1, 2);
    }
    function Mp(e2, r2, t2) {
      return new this(e2).clamp(r2, t2);
    }
    function $p(e2) {
      if (!e2 || typeof e2 != "object")
        throw Error(En + "Object expected");
      var r2, t2, n2, i = e2.defaults === true, o2 = ["precision", 1, Ye, "rounding", 0, 8, "toExpNeg", -Pr, 0, "toExpPos", 0, Pr, "maxE", 0, Pr, "minE", -Pr, 0, "modulo", 0, 9];
      for (r2 = 0; r2 < o2.length; r2 += 3)
        if (t2 = o2[r2], i && (this[t2] = Gi[t2]), (n2 = e2[t2]) !== void 0)
          if (X(n2) === n2 && n2 >= o2[r2 + 1] && n2 <= o2[r2 + 2])
            this[t2] = n2;
          else
            throw Error(He + t2 + ": " + n2);
      if (t2 = "crypto", i && (this[t2] = Gi[t2]), (n2 = e2[t2]) !== void 0)
        if (n2 === true || n2 === false || n2 === 0 || n2 === 1)
          if (n2)
            if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
              this[t2] = true;
            else
              throw Error(Vs);
          else
            this[t2] = false;
        else
          throw Error(He + t2 + ": " + n2);
      return this;
    }
    function qp(e2) {
      return new this(e2).cos();
    }
    function Vp(e2) {
      return new this(e2).cosh();
    }
    function Ks(e2) {
      var r2, t2, n2;
      function i(o2) {
        var s, a, l, u = this;
        if (!(u instanceof i))
          return new i(o2);
        if (u.constructor = i, Ms(o2)) {
          u.s = o2.s, w2 ? !o2.d || o2.e > i.maxE ? (u.e = NaN, u.d = null) : o2.e < i.minE ? (u.e = 0, u.d = [0]) : (u.e = o2.e, u.d = o2.d.slice()) : (u.e = o2.e, u.d = o2.d ? o2.d.slice() : o2.d);
          return;
        }
        if (l = typeof o2, l === "number") {
          if (o2 === 0) {
            u.s = 1 / o2 < 0 ? -1 : 1, u.e = 0, u.d = [0];
            return;
          }
          if (o2 < 0 ? (o2 = -o2, u.s = -1) : u.s = 1, o2 === ~~o2 && o2 < 1e7) {
            for (s = 0, a = o2; a >= 10; a /= 10)
              s++;
            w2 ? s > i.maxE ? (u.e = NaN, u.d = null) : s < i.minE ? (u.e = 0, u.d = [0]) : (u.e = s, u.d = [o2]) : (u.e = s, u.d = [o2]);
            return;
          }
          if (o2 * 0 !== 0) {
            o2 || (u.s = NaN), u.e = NaN, u.d = null;
            return;
          }
          return gn(u, o2.toString());
        }
        if (l === "string")
          return (a = o2.charCodeAt(0)) === 45 ? (o2 = o2.slice(1), u.s = -1) : (a === 43 && (o2 = o2.slice(1)), u.s = 1), Bs.test(o2) ? gn(u, o2) : Tp(u, o2);
        if (l === "bigint")
          return o2 < 0 ? (o2 = -o2, u.s = -1) : u.s = 1, gn(u, o2.toString());
        throw Error(He + o2);
      }
      if (i.prototype = m, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.EUCLID = 9, i.config = i.set = $p, i.clone = Ks, i.isDecimal = Ms, i.abs = Rp, i.acos = Ap, i.acosh = Cp, i.add = Ip, i.asin = Dp, i.asinh = Op, i.atan = kp, i.atanh = _p, i.atan2 = Np, i.cbrt = Lp, i.ceil = Fp, i.clamp = Mp, i.cos = qp, i.cosh = Vp, i.div = jp, i.exp = Bp, i.floor = Up, i.hypot = Gp, i.ln = Qp, i.log = Wp, i.log10 = Kp, i.log2 = Jp, i.max = Hp, i.min = Yp, i.mod = zp, i.mul = Zp, i.pow = Xp, i.random = ed, i.round = rd, i.sign = td, i.sin = nd, i.sinh = id, i.sqrt = od, i.sub = sd, i.sum = ad, i.tan = ld, i.tanh = ud, i.trunc = cd, e2 === void 0 && (e2 = {}), e2 && e2.defaults !== true)
        for (n2 = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], r2 = 0; r2 < n2.length; )
          e2.hasOwnProperty(t2 = n2[r2++]) || (e2[t2] = this[t2]);
      return i.config(e2), i;
    }
    function jp(e2, r2) {
      return new this(e2).div(r2);
    }
    function Bp(e2) {
      return new this(e2).exp();
    }
    function Up(e2) {
      return y(e2 = new this(e2), e2.e + 1, 3);
    }
    function Gp() {
      var e2, r2, t2 = new this(0);
      for (w2 = false, e2 = 0; e2 < arguments.length; )
        if (r2 = new this(arguments[e2++]), r2.d)
          t2.d && (t2 = t2.plus(r2.times(r2)));
        else {
          if (r2.s)
            return w2 = true, new this(1 / 0);
          t2 = r2;
        }
      return w2 = true, t2.sqrt();
    }
    function Ms(e2) {
      return e2 instanceof Le || e2 && e2.toStringTag === js || false;
    }
    function Qp(e2) {
      return new this(e2).ln();
    }
    function Wp(e2, r2) {
      return new this(e2).log(r2);
    }
    function Jp(e2) {
      return new this(e2).log(2);
    }
    function Kp(e2) {
      return new this(e2).log(10);
    }
    function Hp() {
      return Qs(this, arguments, -1);
    }
    function Yp() {
      return Qs(this, arguments, 1);
    }
    function zp(e2, r2) {
      return new this(e2).mod(r2);
    }
    function Zp(e2, r2) {
      return new this(e2).mul(r2);
    }
    function Xp(e2, r2) {
      return new this(e2).pow(r2);
    }
    function ed(e2) {
      var r2, t2, n2, i, o2 = 0, s = new this(1), a = [];
      if (e2 === void 0 ? e2 = this.precision : ne(e2, 1, Ye), n2 = Math.ceil(e2 / E), this.crypto)
        if (crypto.getRandomValues)
          for (r2 = crypto.getRandomValues(new Uint32Array(n2)); o2 < n2; )
            i = r2[o2], i >= 429e7 ? r2[o2] = crypto.getRandomValues(new Uint32Array(1))[0] : a[o2++] = i % 1e7;
        else if (crypto.randomBytes) {
          for (r2 = crypto.randomBytes(n2 *= 4); o2 < n2; )
            i = r2[o2] + (r2[o2 + 1] << 8) + (r2[o2 + 2] << 16) + ((r2[o2 + 3] & 127) << 24), i >= 214e7 ? crypto.randomBytes(4).copy(r2, o2) : (a.push(i % 1e7), o2 += 4);
          o2 = n2 / 4;
        } else
          throw Error(Vs);
      else
        for (; o2 < n2; )
          a[o2++] = Math.random() * 1e7 | 0;
      for (n2 = a[--o2], e2 %= E, n2 && e2 && (i = U(10, E - e2), a[o2] = (n2 / i | 0) * i); a[o2] === 0; o2--)
        a.pop();
      if (o2 < 0)
        t2 = 0, a = [0];
      else {
        for (t2 = -1; a[0] === 0; t2 -= E)
          a.shift();
        for (n2 = 1, i = a[0]; i >= 10; i /= 10)
          n2++;
        n2 < E && (t2 -= E - n2);
      }
      return s.e = t2, s.d = a, s;
    }
    function rd(e2) {
      return y(e2 = new this(e2), e2.e + 1, this.rounding);
    }
    function td(e2) {
      return e2 = new this(e2), e2.d ? e2.d[0] ? e2.s : 0 * e2.s : e2.s || NaN;
    }
    function nd(e2) {
      return new this(e2).sin();
    }
    function id(e2) {
      return new this(e2).sinh();
    }
    function od(e2) {
      return new this(e2).sqrt();
    }
    function sd(e2, r2) {
      return new this(e2).sub(r2);
    }
    function ad() {
      var e2 = 0, r2 = arguments, t2 = new this(r2[e2]);
      for (w2 = false; t2.s && ++e2 < r2.length; )
        t2 = t2.plus(r2[e2]);
      return w2 = true, y(t2, this.precision, this.rounding);
    }
    function ld(e2) {
      return new this(e2).tan();
    }
    function ud(e2) {
      return new this(e2).tanh();
    }
    function cd(e2) {
      return y(e2 = new this(e2), e2.e + 1, 1);
    }
    m[Symbol.for("nodejs.util.inspect.custom")] = m.toString;
    m[Symbol.toStringTag] = "Decimal";
    var Le = m.constructor = Ks(Gi);
    hn = new Le(hn);
    yn = new Le(yn);
    var Fe = Le;
    function Sr(e2) {
      return Le.isDecimal(e2) ? true : e2 !== null && typeof e2 == "object" && typeof e2.s == "number" && typeof e2.e == "number" && typeof e2.toFixed == "function" && Array.isArray(e2.d);
    }
    var ct = {};
    tr(ct, { ModelAction: () => Rr, datamodelEnumToSchemaEnum: () => pd });
    function pd(e2) {
      return { name: e2.name, values: e2.values.map((r2) => r2.name) };
    }
    var Rr = ((b) => (b.findUnique = "findUnique", b.findUniqueOrThrow = "findUniqueOrThrow", b.findFirst = "findFirst", b.findFirstOrThrow = "findFirstOrThrow", b.findMany = "findMany", b.create = "create", b.createMany = "createMany", b.createManyAndReturn = "createManyAndReturn", b.update = "update", b.updateMany = "updateMany", b.updateManyAndReturn = "updateManyAndReturn", b.upsert = "upsert", b.delete = "delete", b.deleteMany = "deleteMany", b.groupBy = "groupBy", b.count = "count", b.aggregate = "aggregate", b.findRaw = "findRaw", b.aggregateRaw = "aggregateRaw", b))(Rr || {});
    var Xs = O(Di());
    var Zs = O(__require("fs"));
    var Hs = { keyword: De, entity: De, value: (e2) => W(nr(e2)), punctuation: nr, directive: De, function: De, variable: (e2) => W(nr(e2)), string: (e2) => W(qe(e2)), boolean: Ie, number: De, comment: Hr };
    var dd = (e2) => e2;
    var vn = {};
    var md = 0;
    var v2 = { manual: vn.Prism && vn.Prism.manual, disableWorkerMessageHandler: vn.Prism && vn.Prism.disableWorkerMessageHandler, util: { encode: function(e2) {
      if (e2 instanceof ge) {
        let r2 = e2;
        return new ge(r2.type, v2.util.encode(r2.content), r2.alias);
      } else
        return Array.isArray(e2) ? e2.map(v2.util.encode) : e2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
    }, type: function(e2) {
      return Object.prototype.toString.call(e2).slice(8, -1);
    }, objId: function(e2) {
      return e2.__id || Object.defineProperty(e2, "__id", { value: ++md }), e2.__id;
    }, clone: function e2(r2, t2) {
      let n2, i, o2 = v2.util.type(r2);
      switch (t2 = t2 || {}, o2) {
        case "Object":
          if (i = v2.util.objId(r2), t2[i])
            return t2[i];
          n2 = {}, t2[i] = n2;
          for (let s in r2)
            r2.hasOwnProperty(s) && (n2[s] = e2(r2[s], t2));
          return n2;
        case "Array":
          return i = v2.util.objId(r2), t2[i] ? t2[i] : (n2 = [], t2[i] = n2, r2.forEach(function(s, a) {
            n2[a] = e2(s, t2);
          }), n2);
        default:
          return r2;
      }
    } }, languages: { extend: function(e2, r2) {
      let t2 = v2.util.clone(v2.languages[e2]);
      for (let n2 in r2)
        t2[n2] = r2[n2];
      return t2;
    }, insertBefore: function(e2, r2, t2, n2) {
      n2 = n2 || v2.languages;
      let i = n2[e2], o2 = {};
      for (let a in i)
        if (i.hasOwnProperty(a)) {
          if (a == r2)
            for (let l in t2)
              t2.hasOwnProperty(l) && (o2[l] = t2[l]);
          t2.hasOwnProperty(a) || (o2[a] = i[a]);
        }
      let s = n2[e2];
      return n2[e2] = o2, v2.languages.DFS(v2.languages, function(a, l) {
        l === s && a != e2 && (this[a] = o2);
      }), o2;
    }, DFS: function e2(r2, t2, n2, i) {
      i = i || {};
      let o2 = v2.util.objId;
      for (let s in r2)
        if (r2.hasOwnProperty(s)) {
          t2.call(r2, s, r2[s], n2 || s);
          let a = r2[s], l = v2.util.type(a);
          l === "Object" && !i[o2(a)] ? (i[o2(a)] = true, e2(a, t2, null, i)) : l === "Array" && !i[o2(a)] && (i[o2(a)] = true, e2(a, t2, s, i));
        }
    } }, plugins: {}, highlight: function(e2, r2, t2) {
      let n2 = { code: e2, grammar: r2, language: t2 };
      return v2.hooks.run("before-tokenize", n2), n2.tokens = v2.tokenize(n2.code, n2.grammar), v2.hooks.run("after-tokenize", n2), ge.stringify(v2.util.encode(n2.tokens), n2.language);
    }, matchGrammar: function(e2, r2, t2, n2, i, o2, s) {
      for (let g2 in t2) {
        if (!t2.hasOwnProperty(g2) || !t2[g2])
          continue;
        if (g2 == s)
          return;
        let I2 = t2[g2];
        I2 = v2.util.type(I2) === "Array" ? I2 : [I2];
        for (let T = 0; T < I2.length; ++T) {
          let S = I2[T], b = S.inside, D = !!S.lookbehind, me = !!S.greedy, se = 0, Kr = S.alias;
          if (me && !S.pattern.global) {
            let j = S.pattern.toString().match(/[imuy]*$/)[0];
            S.pattern = RegExp(S.pattern.source, j + "g");
          }
          S = S.pattern || S;
          for (let j = n2, te = i; j < r2.length; te += r2[j].length, ++j) {
            let Ae = r2[j];
            if (r2.length > e2.length)
              return;
            if (Ae instanceof ge)
              continue;
            if (me && j != r2.length - 1) {
              S.lastIndex = te;
              var p2 = S.exec(e2);
              if (!p2)
                break;
              var c = p2.index + (D ? p2[1].length : 0), d2 = p2.index + p2[0].length, a = j, l = te;
              for (let k2 = r2.length; a < k2 && (l < d2 || !r2[a].type && !r2[a - 1].greedy); ++a)
                l += r2[a].length, c >= l && (++j, te = l);
              if (r2[j] instanceof ge)
                continue;
              u = a - j, Ae = e2.slice(te, l), p2.index -= te;
            } else {
              S.lastIndex = 0;
              var p2 = S.exec(Ae), u = 1;
            }
            if (!p2) {
              if (o2)
                break;
              continue;
            }
            D && (se = p2[1] ? p2[1].length : 0);
            var c = p2.index + se, p2 = p2[0].slice(se), d2 = c + p2.length, f = Ae.slice(0, c), h = Ae.slice(d2);
            let K = [j, u];
            f && (++j, te += f.length, K.push(f));
            let fr = new ge(g2, b ? v2.tokenize(p2, b) : p2, Kr, p2, me);
            if (K.push(fr), h && K.push(h), Array.prototype.splice.apply(r2, K), u != 1 && v2.matchGrammar(e2, r2, t2, j, te, true, g2), o2)
              break;
          }
        }
      }
    }, tokenize: function(e2, r2) {
      let t2 = [e2], n2 = r2.rest;
      if (n2) {
        for (let i in n2)
          r2[i] = n2[i];
        delete r2.rest;
      }
      return v2.matchGrammar(e2, t2, r2, 0, 0, false), t2;
    }, hooks: { all: {}, add: function(e2, r2) {
      let t2 = v2.hooks.all;
      t2[e2] = t2[e2] || [], t2[e2].push(r2);
    }, run: function(e2, r2) {
      let t2 = v2.hooks.all[e2];
      if (!(!t2 || !t2.length))
        for (var n2 = 0, i; i = t2[n2++]; )
          i(r2);
    } }, Token: ge };
    v2.languages.clike = { comment: [{ pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/, lookbehind: true }, { pattern: /(^|[^\\:])\/\/.*/, lookbehind: true, greedy: true }], string: { pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/, greedy: true }, "class-name": { pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i, lookbehind: true, inside: { punctuation: /[.\\]/ } }, keyword: /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/, boolean: /\b(?:true|false)\b/, function: /\w+(?=\()/, number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i, operator: /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/, punctuation: /[{}[\];(),.:]/ };
    v2.languages.javascript = v2.languages.extend("clike", { "class-name": [v2.languages.clike["class-name"], { pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/, lookbehind: true }], keyword: [{ pattern: /((?:^|})\s*)(?:catch|finally)\b/, lookbehind: true }, { pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/, lookbehind: true }], number: /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/, function: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/, operator: /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/ });
    v2.languages.javascript["class-name"][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;
    v2.languages.insertBefore("javascript", "keyword", { regex: { pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*($|[\r\n,.;})\]]))/, lookbehind: true, greedy: true }, "function-variable": { pattern: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/, alias: "function" }, parameter: [{ pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/, lookbehind: true, inside: v2.languages.javascript }, { pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i, inside: v2.languages.javascript }, { pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/, lookbehind: true, inside: v2.languages.javascript }, { pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/, lookbehind: true, inside: v2.languages.javascript }], constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/ });
    v2.languages.markup && v2.languages.markup.tag.addInlined("script", "javascript");
    v2.languages.js = v2.languages.javascript;
    v2.languages.typescript = v2.languages.extend("javascript", { keyword: /\b(?:abstract|as|async|await|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|new|null|of|package|private|protected|public|readonly|return|require|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b/, builtin: /\b(?:string|Function|any|number|boolean|Array|symbol|console|Promise|unknown|never)\b/ });
    v2.languages.ts = v2.languages.typescript;
    function ge(e2, r2, t2, n2, i) {
      this.type = e2, this.content = r2, this.alias = t2, this.length = (n2 || "").length | 0, this.greedy = !!i;
    }
    ge.stringify = function(e2, r2) {
      return typeof e2 == "string" ? e2 : Array.isArray(e2) ? e2.map(function(t2) {
        return ge.stringify(t2, r2);
      }).join("") : fd(e2.type)(e2.content);
    };
    function fd(e2) {
      return Hs[e2] || dd;
    }
    function Ys(e2) {
      return gd(e2, v2.languages.javascript);
    }
    function gd(e2, r2) {
      return v2.tokenize(e2, r2).map((n2) => ge.stringify(n2)).join("");
    }
    function zs(e2) {
      return Ci(e2);
    }
    var Pn = class e2 {
      constructor(r2, t2) {
        __publicField(this, "firstLineNumber");
        __publicField(this, "lines");
        this.firstLineNumber = r2, this.lines = t2;
      }
      static read(r2) {
        let t2;
        try {
          t2 = Zs.default.readFileSync(r2, "utf-8");
        } catch {
          return null;
        }
        return e2.fromContent(t2);
      }
      static fromContent(r2) {
        let t2 = r2.split(/\r?\n/);
        return new e2(1, t2);
      }
      get lastLineNumber() {
        return this.firstLineNumber + this.lines.length - 1;
      }
      mapLineAt(r2, t2) {
        if (r2 < this.firstLineNumber || r2 > this.lines.length + this.firstLineNumber)
          return this;
        let n2 = r2 - this.firstLineNumber, i = [...this.lines];
        return i[n2] = t2(i[n2]), new e2(this.firstLineNumber, i);
      }
      mapLines(r2) {
        return new e2(this.firstLineNumber, this.lines.map((t2, n2) => r2(t2, this.firstLineNumber + n2)));
      }
      lineAt(r2) {
        return this.lines[r2 - this.firstLineNumber];
      }
      prependSymbolAt(r2, t2) {
        return this.mapLines((n2, i) => i === r2 ? `${t2} ${n2}` : `  ${n2}`);
      }
      slice(r2, t2) {
        let n2 = this.lines.slice(r2 - 1, t2).join(`
`);
        return new e2(r2, zs(n2).split(`
`));
      }
      highlight() {
        let r2 = Ys(this.toString());
        return new e2(this.firstLineNumber, r2.split(`
`));
      }
      toString() {
        return this.lines.join(`
`);
      }
    };
    var hd = { red: ce, gray: Hr, dim: Ce, bold: W, underline: Y, highlightSource: (e2) => e2.highlight() };
    var yd = { red: (e2) => e2, gray: (e2) => e2, dim: (e2) => e2, bold: (e2) => e2, underline: (e2) => e2, highlightSource: (e2) => e2 };
    function bd({ message: e2, originalMethod: r2, isPanic: t2, callArguments: n2 }) {
      return { functionName: `prisma.${r2}()`, message: e2, isPanic: t2 ?? false, callArguments: n2 };
    }
    function Ed({ callsite: e2, message: r2, originalMethod: t2, isPanic: n2, callArguments: i }, o2) {
      let s = bd({ message: r2, originalMethod: t2, isPanic: n2, callArguments: i });
      if (!e2 || typeof window < "u" || process.env.NODE_ENV === "production")
        return s;
      let a = e2.getLocation();
      if (!a || !a.lineNumber || !a.columnNumber)
        return s;
      let l = Math.max(1, a.lineNumber - 3), u = Pn.read(a.fileName)?.slice(l, a.lineNumber), c = u?.lineAt(a.lineNumber);
      if (u && c) {
        let p2 = xd(c), d2 = wd(c);
        if (!d2)
          return s;
        s.functionName = `${d2.code})`, s.location = a, n2 || (u = u.mapLineAt(a.lineNumber, (h) => h.slice(0, d2.openingBraceIndex))), u = o2.highlightSource(u);
        let f = String(u.lastLineNumber).length;
        if (s.contextLines = u.mapLines((h, g2) => o2.gray(String(g2).padStart(f)) + " " + h).mapLines((h) => o2.dim(h)).prependSymbolAt(a.lineNumber, o2.bold(o2.red("\u2192"))), i) {
          let h = p2 + f + 1;
          h += 2, s.callArguments = (0, Xs.default)(i, h).slice(h);
        }
      }
      return s;
    }
    function wd(e2) {
      let r2 = Object.keys(Rr).join("|"), n2 = new RegExp(String.raw`\.(${r2})\(`).exec(e2);
      if (n2) {
        let i = n2.index + n2[0].length, o2 = e2.lastIndexOf(" ", n2.index) + 1;
        return { code: e2.slice(o2, i), openingBraceIndex: i };
      }
      return null;
    }
    function xd(e2) {
      let r2 = 0;
      for (let t2 = 0; t2 < e2.length; t2++) {
        if (e2.charAt(t2) !== " ")
          return r2;
        r2++;
      }
      return r2;
    }
    function vd({ functionName: e2, location: r2, message: t2, isPanic: n2, contextLines: i, callArguments: o2 }, s) {
      let a = [""], l = r2 ? " in" : ":";
      if (n2 ? (a.push(s.red(`Oops, an unknown error occurred! This is ${s.bold("on us")}, you did nothing wrong.`)), a.push(s.red(`It occurred in the ${s.bold(`\`${e2}\``)} invocation${l}`))) : a.push(s.red(`Invalid ${s.bold(`\`${e2}\``)} invocation${l}`)), r2 && a.push(s.underline(Pd(r2))), i) {
        a.push("");
        let u = [i.toString()];
        o2 && (u.push(o2), u.push(s.dim(")"))), a.push(u.join("")), o2 && a.push("");
      } else
        a.push(""), o2 && a.push(o2), a.push("");
      return a.push(t2), a.join(`
`);
    }
    function Pd(e2) {
      let r2 = [e2.fileName];
      return e2.lineNumber && r2.push(String(e2.lineNumber)), e2.columnNumber && r2.push(String(e2.columnNumber)), r2.join(":");
    }
    function Tn(e2) {
      let r2 = e2.showColors ? hd : yd, t2;
      return t2 = Ed(e2, r2), vd(t2, r2);
    }
    var la = O(Ki());
    function na(e2, r2, t2) {
      let n2 = ia(e2), i = Td(n2), o2 = Rd(i);
      o2 ? Sn(o2, r2, t2) : r2.addErrorMessage(() => "Unknown error");
    }
    function ia(e2) {
      return e2.errors.flatMap((r2) => r2.kind === "Union" ? ia(r2) : [r2]);
    }
    function Td(e2) {
      let r2 = /* @__PURE__ */ new Map(), t2 = [];
      for (let n2 of e2) {
        if (n2.kind !== "InvalidArgumentType") {
          t2.push(n2);
          continue;
        }
        let i = `${n2.selectionPath.join(".")}:${n2.argumentPath.join(".")}`, o2 = r2.get(i);
        o2 ? r2.set(i, { ...n2, argument: { ...n2.argument, typeNames: Sd(o2.argument.typeNames, n2.argument.typeNames) } }) : r2.set(i, n2);
      }
      return t2.push(...r2.values()), t2;
    }
    function Sd(e2, r2) {
      return [...new Set(e2.concat(r2))];
    }
    function Rd(e2) {
      return ji(e2, (r2, t2) => {
        let n2 = ra(r2), i = ra(t2);
        return n2 !== i ? n2 - i : ta(r2) - ta(t2);
      });
    }
    function ra(e2) {
      let r2 = 0;
      return Array.isArray(e2.selectionPath) && (r2 += e2.selectionPath.length), Array.isArray(e2.argumentPath) && (r2 += e2.argumentPath.length), r2;
    }
    function ta(e2) {
      switch (e2.kind) {
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
      constructor(r2, t2) {
        __publicField(this, "isRequired", false);
        this.name = r2;
        this.value = t2;
      }
      makeRequired() {
        return this.isRequired = true, this;
      }
      write(r2) {
        let { colors: { green: t2 } } = r2.context;
        r2.addMarginSymbol(t2(this.isRequired ? "+" : "?")), r2.write(t2(this.name)), this.isRequired || r2.write(t2("?")), r2.write(t2(": ")), typeof this.value == "string" ? r2.write(t2(this.value)) : r2.write(this.value);
      }
    };
    sa();
    var Ar = class {
      constructor(r2 = 0, t2) {
        __publicField(this, "lines", []);
        __publicField(this, "currentLine", "");
        __publicField(this, "currentIndent", 0);
        __publicField(this, "marginSymbol");
        __publicField(this, "afterNextNewLineCallback");
        this.context = t2;
        this.currentIndent = r2;
      }
      write(r2) {
        return typeof r2 == "string" ? this.currentLine += r2 : r2.write(this), this;
      }
      writeJoined(r2, t2, n2 = (i, o2) => o2.write(i)) {
        let i = t2.length - 1;
        for (let o2 = 0; o2 < t2.length; o2++)
          n2(t2[o2], this), o2 !== i && this.write(r2);
        return this;
      }
      writeLine(r2) {
        return this.write(r2).newLine();
      }
      newLine() {
        this.lines.push(this.indentedCurrentLine()), this.currentLine = "", this.marginSymbol = void 0;
        let r2 = this.afterNextNewLineCallback;
        return this.afterNextNewLineCallback = void 0, r2?.(), this;
      }
      withIndent(r2) {
        return this.indent(), r2(this), this.unindent(), this;
      }
      afterNextNewline(r2) {
        return this.afterNextNewLineCallback = r2, this;
      }
      indent() {
        return this.currentIndent++, this;
      }
      unindent() {
        return this.currentIndent > 0 && this.currentIndent--, this;
      }
      addMarginSymbol(r2) {
        return this.marginSymbol = r2, this;
      }
      toString() {
        return this.lines.concat(this.indentedCurrentLine()).join(`
`);
      }
      getCurrentLineLength() {
        return this.currentLine.length;
      }
      indentedCurrentLine() {
        let r2 = this.currentLine.padStart(this.currentLine.length + 2 * this.currentIndent);
        return this.marginSymbol ? this.marginSymbol + r2.slice(1) : r2;
      }
    };
    oa();
    var Rn = class {
      constructor(r2) {
        this.value = r2;
      }
      write(r2) {
        r2.write(this.value);
      }
      markAsError() {
        this.value.markAsError();
      }
    };
    var An = (e2) => e2;
    var Cn = { bold: An, red: An, green: An, dim: An, enabled: false };
    var aa = { bold: W, red: ce, green: qe, dim: Ce, enabled: true };
    var Cr = { write(e2) {
      e2.writeLine(",");
    } };
    var Pe = class {
      constructor(r2) {
        __publicField(this, "isUnderlined", false);
        __publicField(this, "color", (r2) => r2);
        this.contents = r2;
      }
      underline() {
        return this.isUnderlined = true, this;
      }
      setColor(r2) {
        return this.color = r2, this;
      }
      write(r2) {
        let t2 = r2.getCurrentLineLength();
        r2.write(this.color(this.contents)), this.isUnderlined && r2.afterNextNewline(() => {
          r2.write(" ".repeat(t2)).writeLine(this.color("~".repeat(this.contents.length)));
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
      addItem(r2) {
        return this.items.push(new Rn(r2)), this;
      }
      getField(r2) {
        return this.items[r2];
      }
      getPrintWidth() {
        return this.items.length === 0 ? 2 : Math.max(...this.items.map((t2) => t2.value.getPrintWidth())) + 2;
      }
      write(r2) {
        if (this.items.length === 0) {
          this.writeEmpty(r2);
          return;
        }
        this.writeWithItems(r2);
      }
      writeEmpty(r2) {
        let t2 = new Pe("[]");
        this.hasError && t2.setColor(r2.context.colors.red).underline(), r2.write(t2);
      }
      writeWithItems(r2) {
        let { colors: t2 } = r2.context;
        r2.writeLine("[").withIndent(() => r2.writeJoined(Cr, this.items).newLine()).write("]"), this.hasError && r2.afterNextNewline(() => {
          r2.writeLine(t2.red("~".repeat(this.getPrintWidth())));
        });
      }
      asObject() {
      }
    };
    var Dr = class e2 extends ze {
      constructor() {
        super(...arguments);
        __publicField(this, "fields", {});
        __publicField(this, "suggestions", []);
      }
      addField(r2) {
        this.fields[r2.name] = r2;
      }
      addSuggestion(r2) {
        this.suggestions.push(r2);
      }
      getField(r2) {
        return this.fields[r2];
      }
      getDeepField(r2) {
        let [t2, ...n2] = r2, i = this.getField(t2);
        if (!i)
          return;
        let o2 = i;
        for (let s of n2) {
          let a;
          if (o2.value instanceof e2 ? a = o2.value.getField(s) : o2.value instanceof Ir && (a = o2.value.getField(Number(s))), !a)
            return;
          o2 = a;
        }
        return o2;
      }
      getDeepFieldValue(r2) {
        return r2.length === 0 ? this : this.getDeepField(r2)?.value;
      }
      hasField(r2) {
        return !!this.getField(r2);
      }
      removeAllFields() {
        this.fields = {};
      }
      removeField(r2) {
        delete this.fields[r2];
      }
      getFields() {
        return this.fields;
      }
      isEmpty() {
        return Object.keys(this.fields).length === 0;
      }
      getFieldValue(r2) {
        return this.getField(r2)?.value;
      }
      getDeepSubSelectionValue(r2) {
        let t2 = this;
        for (let n2 of r2) {
          if (!(t2 instanceof e2))
            return;
          let i = t2.getSubSelectionValue(n2);
          if (!i)
            return;
          t2 = i;
        }
        return t2;
      }
      getDeepSelectionParent(r2) {
        let t2 = this.getSelectionParent();
        if (!t2)
          return;
        let n2 = t2;
        for (let i of r2) {
          let o2 = n2.value.getFieldValue(i);
          if (!o2 || !(o2 instanceof e2))
            return;
          let s = o2.getSelectionParent();
          if (!s)
            return;
          n2 = s;
        }
        return n2;
      }
      getSelectionParent() {
        let r2 = this.getField("select")?.value.asObject();
        if (r2)
          return { kind: "select", value: r2 };
        let t2 = this.getField("include")?.value.asObject();
        if (t2)
          return { kind: "include", value: t2 };
      }
      getSubSelectionValue(r2) {
        return this.getSelectionParent()?.value.fields[r2].value;
      }
      getPrintWidth() {
        let r2 = Object.values(this.fields);
        return r2.length == 0 ? 2 : Math.max(...r2.map((n2) => n2.getPrintWidth())) + 2;
      }
      write(r2) {
        let t2 = Object.values(this.fields);
        if (t2.length === 0 && this.suggestions.length === 0) {
          this.writeEmpty(r2);
          return;
        }
        this.writeWithContents(r2, t2);
      }
      asObject() {
        return this;
      }
      writeEmpty(r2) {
        let t2 = new Pe("{}");
        this.hasError && t2.setColor(r2.context.colors.red).underline(), r2.write(t2);
      }
      writeWithContents(r2, t2) {
        r2.writeLine("{").withIndent(() => {
          r2.writeJoined(Cr, [...t2, ...this.suggestions]).newLine();
        }), r2.write("}"), this.hasError && r2.afterNextNewline(() => {
          r2.writeLine(r2.context.colors.red("~".repeat(this.getPrintWidth())));
        });
      }
    };
    var Q = class extends ze {
      constructor(t2) {
        super();
        this.text = t2;
      }
      getPrintWidth() {
        return this.text.length;
      }
      write(t2) {
        let n2 = new Pe(this.text);
        this.hasError && n2.underline().setColor(t2.context.colors.red), t2.write(n2);
      }
      asObject() {
      }
    };
    var pt = class {
      constructor() {
        __publicField(this, "fields", []);
      }
      addField(r2, t2) {
        return this.fields.push({ write(n2) {
          let { green: i, dim: o2 } = n2.context.colors;
          n2.write(i(o2(`${r2}: ${t2}`))).addMarginSymbol(i(o2("+")));
        } }), this;
      }
      write(r2) {
        let { colors: { green: t2 } } = r2.context;
        r2.writeLine(t2("{")).withIndent(() => {
          r2.writeJoined(Cr, this.fields).newLine();
        }).write(t2("}")).addMarginSymbol(t2("+"));
      }
    };
    function Sn(e2, r2, t2) {
      switch (e2.kind) {
        case "MutuallyExclusiveFields":
          Ad(e2, r2);
          break;
        case "IncludeOnScalar":
          Cd(e2, r2);
          break;
        case "EmptySelection":
          Id(e2, r2, t2);
          break;
        case "UnknownSelectionField":
          _d(e2, r2);
          break;
        case "InvalidSelectionValue":
          Nd(e2, r2);
          break;
        case "UnknownArgument":
          Ld(e2, r2);
          break;
        case "UnknownInputField":
          Fd(e2, r2);
          break;
        case "RequiredArgumentMissing":
          Md(e2, r2);
          break;
        case "InvalidArgumentType":
          $d(e2, r2);
          break;
        case "InvalidArgumentValue":
          qd(e2, r2);
          break;
        case "ValueTooLarge":
          Vd(e2, r2);
          break;
        case "SomeFieldsMissing":
          jd(e2, r2);
          break;
        case "TooManyFieldsGiven":
          Bd(e2, r2);
          break;
        case "Union":
          na(e2, r2, t2);
          break;
        default:
          throw new Error("not implemented: " + e2.kind);
      }
    }
    function Ad(e2, r2) {
      let t2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      t2 && (t2.getField(e2.firstField)?.markAsError(), t2.getField(e2.secondField)?.markAsError()), r2.addErrorMessage((n2) => `Please ${n2.bold("either")} use ${n2.green(`\`${e2.firstField}\``)} or ${n2.green(`\`${e2.secondField}\``)}, but ${n2.red("not both")} at the same time.`);
    }
    function Cd(e2, r2) {
      let [t2, n2] = Or(e2.selectionPath), i = e2.outputType, o2 = r2.arguments.getDeepSelectionParent(t2)?.value;
      if (o2 && (o2.getField(n2)?.markAsError(), i))
        for (let s of i.fields)
          s.isRelation && o2.addSuggestion(new le(s.name, "true"));
      r2.addErrorMessage((s) => {
        let a = `Invalid scalar field ${s.red(`\`${n2}\``)} for ${s.bold("include")} statement`;
        return i ? a += ` on model ${s.bold(i.name)}. ${dt(s)}` : a += ".", a += `
Note that ${s.bold("include")} statements only accept relation fields.`, a;
      });
    }
    function Id(e2, r2, t2) {
      let n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      if (n2) {
        let i = n2.getField("omit")?.value.asObject();
        if (i) {
          Dd(e2, r2, i);
          return;
        }
        if (n2.hasField("select")) {
          Od(e2, r2);
          return;
        }
      }
      if (t2?.[We(e2.outputType.name)]) {
        kd(e2, r2);
        return;
      }
      r2.addErrorMessage(() => `Unknown field at "${e2.selectionPath.join(".")} selection"`);
    }
    function Dd(e2, r2, t2) {
      t2.removeAllFields();
      for (let n2 of e2.outputType.fields)
        t2.addSuggestion(new le(n2.name, "false"));
      r2.addErrorMessage((n2) => `The ${n2.red("omit")} statement includes every field of the model ${n2.bold(e2.outputType.name)}. At least one field must be included in the result`);
    }
    function Od(e2, r2) {
      let t2 = e2.outputType, n2 = r2.arguments.getDeepSelectionParent(e2.selectionPath)?.value, i = n2?.isEmpty() ?? false;
      n2 && (n2.removeAllFields(), pa(n2, t2)), r2.addErrorMessage((o2) => i ? `The ${o2.red("`select`")} statement for type ${o2.bold(t2.name)} must not be empty. ${dt(o2)}` : `The ${o2.red("`select`")} statement for type ${o2.bold(t2.name)} needs ${o2.bold("at least one truthy value")}.`);
    }
    function kd(e2, r2) {
      let t2 = new pt();
      for (let i of e2.outputType.fields)
        i.isRelation || t2.addField(i.name, "false");
      let n2 = new le("omit", t2).makeRequired();
      if (e2.selectionPath.length === 0)
        r2.arguments.addSuggestion(n2);
      else {
        let [i, o2] = Or(e2.selectionPath), a = r2.arguments.getDeepSelectionParent(i)?.value.asObject()?.getField(o2);
        if (a) {
          let l = a?.value.asObject() ?? new Dr();
          l.addSuggestion(n2), a.value = l;
        }
      }
      r2.addErrorMessage((i) => `The global ${i.red("omit")} configuration excludes every field of the model ${i.bold(e2.outputType.name)}. At least one field must be included in the result`);
    }
    function _d(e2, r2) {
      let t2 = da(e2.selectionPath, r2);
      if (t2.parentKind !== "unknown") {
        t2.field.markAsError();
        let n2 = t2.parent;
        switch (t2.parentKind) {
          case "select":
            pa(n2, e2.outputType);
            break;
          case "include":
            Ud(n2, e2.outputType);
            break;
          case "omit":
            Gd(n2, e2.outputType);
            break;
        }
      }
      r2.addErrorMessage((n2) => {
        let i = [`Unknown field ${n2.red(`\`${t2.fieldName}\``)}`];
        return t2.parentKind !== "unknown" && i.push(`for ${n2.bold(t2.parentKind)} statement`), i.push(`on model ${n2.bold(`\`${e2.outputType.name}\``)}.`), i.push(dt(n2)), i.join(" ");
      });
    }
    function Nd(e2, r2) {
      let t2 = da(e2.selectionPath, r2);
      t2.parentKind !== "unknown" && t2.field.value.markAsError(), r2.addErrorMessage((n2) => `Invalid value for selection field \`${n2.red(t2.fieldName)}\`: ${e2.underlyingError}`);
    }
    function Ld(e2, r2) {
      let t2 = e2.argumentPath[0], n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      n2 && (n2.getField(t2)?.markAsError(), Qd(n2, e2.arguments)), r2.addErrorMessage((i) => ua(i, t2, e2.arguments.map((o2) => o2.name)));
    }
    function Fd(e2, r2) {
      let [t2, n2] = Or(e2.argumentPath), i = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      if (i) {
        i.getDeepField(e2.argumentPath)?.markAsError();
        let o2 = i.getDeepFieldValue(t2)?.asObject();
        o2 && ma(o2, e2.inputType);
      }
      r2.addErrorMessage((o2) => ua(o2, n2, e2.inputType.fields.map((s) => s.name)));
    }
    function ua(e2, r2, t2) {
      let n2 = [`Unknown argument \`${e2.red(r2)}\`.`], i = Jd(r2, t2);
      return i && n2.push(`Did you mean \`${e2.green(i)}\`?`), t2.length > 0 && n2.push(dt(e2)), n2.join(" ");
    }
    function Md(e2, r2) {
      let t2;
      r2.addErrorMessage((l) => t2?.value instanceof Q && t2.value.text === "null" ? `Argument \`${l.green(o2)}\` must not be ${l.red("null")}.` : `Argument \`${l.green(o2)}\` is missing.`);
      let n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      if (!n2)
        return;
      let [i, o2] = Or(e2.argumentPath), s = new pt(), a = n2.getDeepFieldValue(i)?.asObject();
      if (a) {
        if (t2 = a.getField(o2), t2 && a.removeField(o2), e2.inputTypes.length === 1 && e2.inputTypes[0].kind === "object") {
          for (let l of e2.inputTypes[0].fields)
            s.addField(l.name, l.typeNames.join(" | "));
          a.addSuggestion(new le(o2, s).makeRequired());
        } else {
          let l = e2.inputTypes.map(ca).join(" | ");
          a.addSuggestion(new le(o2, l).makeRequired());
        }
        if (e2.dependentArgumentPath) {
          n2.getDeepField(e2.dependentArgumentPath)?.markAsError();
          let [, l] = Or(e2.dependentArgumentPath);
          r2.addErrorMessage((u) => `Argument \`${u.green(o2)}\` is required because argument \`${u.green(l)}\` was provided.`);
        }
      }
    }
    function ca(e2) {
      return e2.kind === "list" ? `${ca(e2.elementType)}[]` : e2.name;
    }
    function $d(e2, r2) {
      let t2 = e2.argument.name, n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      n2 && n2.getDeepFieldValue(e2.argumentPath)?.markAsError(), r2.addErrorMessage((i) => {
        let o2 = In("or", e2.argument.typeNames.map((s) => i.green(s)));
        return `Argument \`${i.bold(t2)}\`: Invalid value provided. Expected ${o2}, provided ${i.red(e2.inferredType)}.`;
      });
    }
    function qd(e2, r2) {
      let t2 = e2.argument.name, n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      n2 && n2.getDeepFieldValue(e2.argumentPath)?.markAsError(), r2.addErrorMessage((i) => {
        let o2 = [`Invalid value for argument \`${i.bold(t2)}\``];
        if (e2.underlyingError && o2.push(`: ${e2.underlyingError}`), o2.push("."), e2.argument.typeNames.length > 0) {
          let s = In("or", e2.argument.typeNames.map((a) => i.green(a)));
          o2.push(` Expected ${s}.`);
        }
        return o2.join("");
      });
    }
    function Vd(e2, r2) {
      let t2 = e2.argument.name, n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject(), i;
      if (n2) {
        let s = n2.getDeepField(e2.argumentPath)?.value;
        s?.markAsError(), s instanceof Q && (i = s.text);
      }
      r2.addErrorMessage((o2) => {
        let s = ["Unable to fit value"];
        return i && s.push(o2.red(i)), s.push(`into a 64-bit signed integer for field \`${o2.bold(t2)}\``), s.join(" ");
      });
    }
    function jd(e2, r2) {
      let t2 = e2.argumentPath[e2.argumentPath.length - 1], n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject();
      if (n2) {
        let i = n2.getDeepFieldValue(e2.argumentPath)?.asObject();
        i && ma(i, e2.inputType);
      }
      r2.addErrorMessage((i) => {
        let o2 = [`Argument \`${i.bold(t2)}\` of type ${i.bold(e2.inputType.name)} needs`];
        return e2.constraints.minFieldCount === 1 ? e2.constraints.requiredFields ? o2.push(`${i.green("at least one of")} ${In("or", e2.constraints.requiredFields.map((s) => `\`${i.bold(s)}\``))} arguments.`) : o2.push(`${i.green("at least one")} argument.`) : o2.push(`${i.green(`at least ${e2.constraints.minFieldCount}`)} arguments.`), o2.push(dt(i)), o2.join(" ");
      });
    }
    function Bd(e2, r2) {
      let t2 = e2.argumentPath[e2.argumentPath.length - 1], n2 = r2.arguments.getDeepSubSelectionValue(e2.selectionPath)?.asObject(), i = [];
      if (n2) {
        let o2 = n2.getDeepFieldValue(e2.argumentPath)?.asObject();
        o2 && (o2.markAsError(), i = Object.keys(o2.getFields()));
      }
      r2.addErrorMessage((o2) => {
        let s = [`Argument \`${o2.bold(t2)}\` of type ${o2.bold(e2.inputType.name)} needs`];
        return e2.constraints.minFieldCount === 1 && e2.constraints.maxFieldCount == 1 ? s.push(`${o2.green("exactly one")} argument,`) : e2.constraints.maxFieldCount == 1 ? s.push(`${o2.green("at most one")} argument,`) : s.push(`${o2.green(`at most ${e2.constraints.maxFieldCount}`)} arguments,`), s.push(`but you provided ${In("and", i.map((a) => o2.red(a)))}. Please choose`), e2.constraints.maxFieldCount === 1 ? s.push("one.") : s.push(`${e2.constraints.maxFieldCount}.`), s.join(" ");
      });
    }
    function pa(e2, r2) {
      for (let t2 of r2.fields)
        e2.hasField(t2.name) || e2.addSuggestion(new le(t2.name, "true"));
    }
    function Ud(e2, r2) {
      for (let t2 of r2.fields)
        t2.isRelation && !e2.hasField(t2.name) && e2.addSuggestion(new le(t2.name, "true"));
    }
    function Gd(e2, r2) {
      for (let t2 of r2.fields)
        !e2.hasField(t2.name) && !t2.isRelation && e2.addSuggestion(new le(t2.name, "true"));
    }
    function Qd(e2, r2) {
      for (let t2 of r2)
        e2.hasField(t2.name) || e2.addSuggestion(new le(t2.name, t2.typeNames.join(" | ")));
    }
    function da(e2, r2) {
      let [t2, n2] = Or(e2), i = r2.arguments.getDeepSubSelectionValue(t2)?.asObject();
      if (!i)
        return { parentKind: "unknown", fieldName: n2 };
      let o2 = i.getFieldValue("select")?.asObject(), s = i.getFieldValue("include")?.asObject(), a = i.getFieldValue("omit")?.asObject(), l = o2?.getField(n2);
      return o2 && l ? { parentKind: "select", parent: o2, field: l, fieldName: n2 } : (l = s?.getField(n2), s && l ? { parentKind: "include", field: l, parent: s, fieldName: n2 } : (l = a?.getField(n2), a && l ? { parentKind: "omit", field: l, parent: a, fieldName: n2 } : { parentKind: "unknown", fieldName: n2 }));
    }
    function ma(e2, r2) {
      if (r2.kind === "object")
        for (let t2 of r2.fields)
          e2.hasField(t2.name) || e2.addSuggestion(new le(t2.name, t2.typeNames.join(" | ")));
    }
    function Or(e2) {
      let r2 = [...e2], t2 = r2.pop();
      if (!t2)
        throw new Error("unexpected empty path");
      return [r2, t2];
    }
    function dt({ green: e2, enabled: r2 }) {
      return "Available options are " + (r2 ? `listed in ${e2("green")}` : "marked with ?") + ".";
    }
    function In(e2, r2) {
      if (r2.length === 1)
        return r2[0];
      let t2 = [...r2], n2 = t2.pop();
      return `${t2.join(", ")} ${e2} ${n2}`;
    }
    var Wd = 3;
    function Jd(e2, r2) {
      let t2 = 1 / 0, n2;
      for (let i of r2) {
        let o2 = (0, la.default)(e2, i);
        o2 > Wd || o2 < t2 && (t2 = o2, n2 = i);
      }
      return n2;
    }
    var mt = class {
      constructor(r2, t2, n2, i, o2) {
        __publicField(this, "modelName");
        __publicField(this, "name");
        __publicField(this, "typeName");
        __publicField(this, "isList");
        __publicField(this, "isEnum");
        this.modelName = r2, this.name = t2, this.typeName = n2, this.isList = i, this.isEnum = o2;
      }
      _toGraphQLInputType() {
        let r2 = this.isList ? "List" : "", t2 = this.isEnum ? "Enum" : "";
        return `${r2}${t2}${this.typeName}FieldRefInput<${this.modelName}>`;
      }
    };
    function kr(e2) {
      return e2 instanceof mt;
    }
    var Dn = Symbol();
    var Yi = /* @__PURE__ */ new WeakMap();
    var Me = class {
      constructor(r2) {
        r2 === Dn ? Yi.set(this, `Prisma.${this._getName()}`) : Yi.set(this, `new Prisma.${this._getNamespace()}.${this._getName()}()`);
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
    function zi(e2, r2) {
      Object.defineProperty(e2, "name", { value: r2, configurable: true });
    }
    var fa = ": ";
    var kn = class {
      constructor(r2, t2) {
        __publicField(this, "hasError", false);
        this.name = r2;
        this.value = t2;
      }
      markAsError() {
        this.hasError = true;
      }
      getPrintWidth() {
        return this.name.length + this.value.getPrintWidth() + fa.length;
      }
      write(r2) {
        let t2 = new Pe(this.name);
        this.hasError && t2.underline().setColor(r2.context.colors.red), r2.write(t2).write(fa).write(this.value);
      }
    };
    var Zi = class {
      constructor(r2) {
        __publicField(this, "arguments");
        __publicField(this, "errorMessages", []);
        this.arguments = r2;
      }
      write(r2) {
        r2.write(this.arguments);
      }
      addErrorMessage(r2) {
        this.errorMessages.push(r2);
      }
      renderAllMessages(r2) {
        return this.errorMessages.map((t2) => t2(r2)).join(`
`);
      }
    };
    function _r(e2) {
      return new Zi(ga(e2));
    }
    function ga(e2) {
      let r2 = new Dr();
      for (let [t2, n2] of Object.entries(e2)) {
        let i = new kn(t2, ha(n2));
        r2.addField(i);
      }
      return r2;
    }
    function ha(e2) {
      if (typeof e2 == "string")
        return new Q(JSON.stringify(e2));
      if (typeof e2 == "number" || typeof e2 == "boolean")
        return new Q(String(e2));
      if (typeof e2 == "bigint")
        return new Q(`${e2}n`);
      if (e2 === null)
        return new Q("null");
      if (e2 === void 0)
        return new Q("undefined");
      if (Sr(e2))
        return new Q(`new Prisma.Decimal("${e2.toFixed()}")`);
      if (e2 instanceof Uint8Array)
        return Buffer.isBuffer(e2) ? new Q(`Buffer.alloc(${e2.byteLength})`) : new Q(`new Uint8Array(${e2.byteLength})`);
      if (e2 instanceof Date) {
        let r2 = mn(e2) ? e2.toISOString() : "Invalid Date";
        return new Q(`new Date("${r2}")`);
      }
      return e2 instanceof Me ? new Q(`Prisma.${e2._getName()}`) : kr(e2) ? new Q(`prisma.${We(e2.modelName)}.$fields.${e2.name}`) : Array.isArray(e2) ? Kd(e2) : typeof e2 == "object" ? ga(e2) : new Q(Object.prototype.toString.call(e2));
    }
    function Kd(e2) {
      let r2 = new Ir();
      for (let t2 of e2)
        r2.addItem(ha(t2));
      return r2;
    }
    function _n(e2, r2) {
      let t2 = r2 === "pretty" ? aa : Cn, n2 = e2.renderAllMessages(t2), i = new Ar(0, { colors: t2 }).write(e2).toString();
      return { message: n2, args: i };
    }
    function Nn({ args: e2, errors: r2, errorFormat: t2, callsite: n2, originalMethod: i, clientVersion: o2, globalOmit: s }) {
      let a = _r(e2);
      for (let p2 of r2)
        Sn(p2, a, s);
      let { message: l, args: u } = _n(a, t2), c = Tn({ message: l, callsite: n2, originalMethod: i, showColors: t2 === "pretty", callArguments: u });
      throw new Z2(c, { clientVersion: o2 });
    }
    function Te(e2) {
      return e2.replace(/^./, (r2) => r2.toLowerCase());
    }
    function ba(e2, r2, t2) {
      let n2 = Te(t2);
      return !r2.result || !(r2.result.$allModels || r2.result[n2]) ? e2 : Hd({ ...e2, ...ya(r2.name, e2, r2.result.$allModels), ...ya(r2.name, e2, r2.result[n2]) });
    }
    function Hd(e2) {
      let r2 = new we(), t2 = (n2, i) => r2.getOrCreate(n2, () => i.has(n2) ? [n2] : (i.add(n2), e2[n2] ? e2[n2].needs.flatMap((o2) => t2(o2, i)) : [n2]));
      return pn(e2, (n2) => ({ ...n2, needs: t2(n2.name, /* @__PURE__ */ new Set()) }));
    }
    function ya(e2, r2, t2) {
      return t2 ? pn(t2, ({ needs: n2, compute: i }, o2) => ({ name: o2, needs: n2 ? Object.keys(n2).filter((s) => n2[s]) : [], compute: Yd(r2, o2, i) })) : {};
    }
    function Yd(e2, r2, t2) {
      let n2 = e2?.[r2]?.compute;
      return n2 ? (i) => t2({ ...i, [r2]: n2(i) }) : t2;
    }
    function Ea(e2, r2) {
      if (!r2)
        return e2;
      let t2 = { ...e2 };
      for (let n2 of Object.values(r2))
        if (e2[n2.name])
          for (let i of n2.needs)
            t2[i] = true;
      return t2;
    }
    function wa(e2, r2) {
      if (!r2)
        return e2;
      let t2 = { ...e2 };
      for (let n2 of Object.values(r2))
        if (!e2[n2.name])
          for (let i of n2.needs)
            delete t2[i];
      return t2;
    }
    var Ln = class {
      constructor(r2, t2) {
        __publicField(this, "computedFieldsCache", new we());
        __publicField(this, "modelExtensionsCache", new we());
        __publicField(this, "queryCallbacksCache", new we());
        __publicField(this, "clientExtensions", lt(() => this.extension.client ? { ...this.previous?.getAllClientExtensions(), ...this.extension.client } : this.previous?.getAllClientExtensions()));
        __publicField(this, "batchCallbacks", lt(() => {
          let r2 = this.previous?.getAllBatchQueryCallbacks() ?? [], t2 = this.extension.query?.$__internalBatch;
          return t2 ? r2.concat(t2) : r2;
        }));
        this.extension = r2;
        this.previous = t2;
      }
      getAllComputedFields(r2) {
        return this.computedFieldsCache.getOrCreate(r2, () => ba(this.previous?.getAllComputedFields(r2), this.extension, r2));
      }
      getAllClientExtensions() {
        return this.clientExtensions.get();
      }
      getAllModelExtensions(r2) {
        return this.modelExtensionsCache.getOrCreate(r2, () => {
          let t2 = Te(r2);
          return !this.extension.model || !(this.extension.model[t2] || this.extension.model.$allModels) ? this.previous?.getAllModelExtensions(r2) : { ...this.previous?.getAllModelExtensions(r2), ...this.extension.model.$allModels, ...this.extension.model[t2] };
        });
      }
      getAllQueryCallbacks(r2, t2) {
        return this.queryCallbacksCache.getOrCreate(`${r2}:${t2}`, () => {
          let n2 = this.previous?.getAllQueryCallbacks(r2, t2) ?? [], i = [], o2 = this.extension.query;
          return !o2 || !(o2[r2] || o2.$allModels || o2[t2] || o2.$allOperations) ? n2 : (o2[r2] !== void 0 && (o2[r2][t2] !== void 0 && i.push(o2[r2][t2]), o2[r2].$allOperations !== void 0 && i.push(o2[r2].$allOperations)), r2 !== "$none" && o2.$allModels !== void 0 && (o2.$allModels[t2] !== void 0 && i.push(o2.$allModels[t2]), o2.$allModels.$allOperations !== void 0 && i.push(o2.$allModels.$allOperations)), o2[t2] !== void 0 && i.push(o2[t2]), o2.$allOperations !== void 0 && i.push(o2.$allOperations), n2.concat(i));
        });
      }
      getAllBatchQueryCallbacks() {
        return this.batchCallbacks.get();
      }
    };
    var Nr = class e2 {
      constructor(r2) {
        this.head = r2;
      }
      static empty() {
        return new e2();
      }
      static single(r2) {
        return new e2(new Ln(r2));
      }
      isEmpty() {
        return this.head === void 0;
      }
      append(r2) {
        return new e2(new Ln(r2, this.head));
      }
      getAllComputedFields(r2) {
        return this.head?.getAllComputedFields(r2);
      }
      getAllClientExtensions() {
        return this.head?.getAllClientExtensions();
      }
      getAllModelExtensions(r2) {
        return this.head?.getAllModelExtensions(r2);
      }
      getAllQueryCallbacks(r2, t2) {
        return this.head?.getAllQueryCallbacks(r2, t2) ?? [];
      }
      getAllBatchQueryCallbacks() {
        return this.head?.getAllBatchQueryCallbacks() ?? [];
      }
    };
    var Fn = class {
      constructor(r2) {
        this.name = r2;
      }
    };
    function xa(e2) {
      return e2 instanceof Fn;
    }
    function va(e2) {
      return new Fn(e2);
    }
    var Pa = Symbol();
    var bt = class {
      constructor(r2) {
        if (r2 !== Pa)
          throw new Error("Skip instance can not be constructed directly");
      }
      ifUndefined(r2) {
        return r2 === void 0 ? Mn : r2;
      }
    };
    var Mn = new bt(Pa);
    function Se(e2) {
      return e2 instanceof bt;
    }
    var zd = { findUnique: "findUnique", findUniqueOrThrow: "findUniqueOrThrow", findFirst: "findFirst", findFirstOrThrow: "findFirstOrThrow", findMany: "findMany", count: "aggregate", create: "createOne", createMany: "createMany", createManyAndReturn: "createManyAndReturn", update: "updateOne", updateMany: "updateMany", updateManyAndReturn: "updateManyAndReturn", upsert: "upsertOne", delete: "deleteOne", deleteMany: "deleteMany", executeRaw: "executeRaw", queryRaw: "queryRaw", aggregate: "aggregate", groupBy: "groupBy", runCommandRaw: "runCommandRaw", findRaw: "findRaw", aggregateRaw: "aggregateRaw" };
    var Ta = "explicitly `undefined` values are not allowed";
    function $n({ modelName: e2, action: r2, args: t2, runtimeDataModel: n2, extensions: i = Nr.empty(), callsite: o2, clientMethod: s, errorFormat: a, clientVersion: l, previewFeatures: u, globalOmit: c }) {
      let p2 = new Xi({ runtimeDataModel: n2, modelName: e2, action: r2, rootArgs: t2, callsite: o2, extensions: i, selectionPath: [], argumentPath: [], originalMethod: s, errorFormat: a, clientVersion: l, previewFeatures: u, globalOmit: c });
      return { modelName: e2, action: zd[r2], query: Et(t2, p2) };
    }
    function Et({ select: e2, include: r2, ...t2 } = {}, n2) {
      let i = t2.omit;
      return delete t2.omit, { arguments: Ra(t2, n2), selection: Zd(e2, r2, i, n2) };
    }
    function Zd(e2, r2, t2, n2) {
      return e2 ? (r2 ? n2.throwValidationError({ kind: "MutuallyExclusiveFields", firstField: "include", secondField: "select", selectionPath: n2.getSelectionPath() }) : t2 && n2.throwValidationError({ kind: "MutuallyExclusiveFields", firstField: "omit", secondField: "select", selectionPath: n2.getSelectionPath() }), tm(e2, n2)) : Xd(n2, r2, t2);
    }
    function Xd(e2, r2, t2) {
      let n2 = {};
      return e2.modelOrType && !e2.isRawAction() && (n2.$composites = true, n2.$scalars = true), r2 && em(n2, r2, e2), rm(n2, t2, e2), n2;
    }
    function em(e2, r2, t2) {
      for (let [n2, i] of Object.entries(r2)) {
        if (Se(i))
          continue;
        let o2 = t2.nestSelection(n2);
        if (eo(i, o2), i === false || i === void 0) {
          e2[n2] = false;
          continue;
        }
        let s = t2.findField(n2);
        if (s && s.kind !== "object" && t2.throwValidationError({ kind: "IncludeOnScalar", selectionPath: t2.getSelectionPath().concat(n2), outputType: t2.getOutputTypeDescription() }), s) {
          e2[n2] = Et(i === true ? {} : i, o2);
          continue;
        }
        if (i === true) {
          e2[n2] = true;
          continue;
        }
        e2[n2] = Et(i, o2);
      }
    }
    function rm(e2, r2, t2) {
      let n2 = t2.getComputedFields(), i = { ...t2.getGlobalOmit(), ...r2 }, o2 = wa(i, n2);
      for (let [s, a] of Object.entries(o2)) {
        if (Se(a))
          continue;
        eo(a, t2.nestSelection(s));
        let l = t2.findField(s);
        n2?.[s] && !l || (e2[s] = !a);
      }
    }
    function tm(e2, r2) {
      let t2 = {}, n2 = r2.getComputedFields(), i = Ea(e2, n2);
      for (let [o2, s] of Object.entries(i)) {
        if (Se(s))
          continue;
        let a = r2.nestSelection(o2);
        eo(s, a);
        let l = r2.findField(o2);
        if (!(n2?.[o2] && !l)) {
          if (s === false || s === void 0 || Se(s)) {
            t2[o2] = false;
            continue;
          }
          if (s === true) {
            l?.kind === "object" ? t2[o2] = Et({}, a) : t2[o2] = true;
            continue;
          }
          t2[o2] = Et(s, a);
        }
      }
      return t2;
    }
    function Sa(e2, r2) {
      if (e2 === null)
        return null;
      if (typeof e2 == "string" || typeof e2 == "number" || typeof e2 == "boolean")
        return e2;
      if (typeof e2 == "bigint")
        return { $type: "BigInt", value: String(e2) };
      if (vr(e2)) {
        if (mn(e2))
          return { $type: "DateTime", value: e2.toISOString() };
        r2.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: r2.getSelectionPath(), argumentPath: r2.getArgumentPath(), argument: { name: r2.getArgumentName(), typeNames: ["Date"] }, underlyingError: "Provided Date object is invalid" });
      }
      if (xa(e2))
        return { $type: "Param", value: e2.name };
      if (kr(e2))
        return { $type: "FieldRef", value: { _ref: e2.name, _container: e2.modelName } };
      if (Array.isArray(e2))
        return nm(e2, r2);
      if (ArrayBuffer.isView(e2)) {
        let { buffer: t2, byteOffset: n2, byteLength: i } = e2;
        return { $type: "Bytes", value: Buffer.from(t2, n2, i).toString("base64") };
      }
      if (im(e2))
        return e2.values;
      if (Sr(e2))
        return { $type: "Decimal", value: e2.toFixed() };
      if (e2 instanceof Me) {
        if (e2 !== On.instances[e2._getName()])
          throw new Error("Invalid ObjectEnumValue");
        return { $type: "Enum", value: e2._getName() };
      }
      if (om(e2))
        return e2.toJSON();
      if (typeof e2 == "object")
        return Ra(e2, r2);
      r2.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: r2.getSelectionPath(), argumentPath: r2.getArgumentPath(), argument: { name: r2.getArgumentName(), typeNames: [] }, underlyingError: `We could not serialize ${Object.prototype.toString.call(e2)} value. Serialize the object to JSON or implement a ".toJSON()" method on it` });
    }
    function Ra(e2, r2) {
      if (e2.$type)
        return { $type: "Raw", value: e2 };
      let t2 = {};
      for (let n2 in e2) {
        let i = e2[n2], o2 = r2.nestArgument(n2);
        Se(i) || (i !== void 0 ? t2[n2] = Sa(i, o2) : r2.isPreviewFeatureOn("strictUndefinedChecks") && r2.throwValidationError({ kind: "InvalidArgumentValue", argumentPath: o2.getArgumentPath(), selectionPath: r2.getSelectionPath(), argument: { name: r2.getArgumentName(), typeNames: [] }, underlyingError: Ta }));
      }
      return t2;
    }
    function nm(e2, r2) {
      let t2 = [];
      for (let n2 = 0; n2 < e2.length; n2++) {
        let i = r2.nestArgument(String(n2)), o2 = e2[n2];
        if (o2 === void 0 || Se(o2)) {
          let s = o2 === void 0 ? "undefined" : "Prisma.skip";
          r2.throwValidationError({ kind: "InvalidArgumentValue", selectionPath: i.getSelectionPath(), argumentPath: i.getArgumentPath(), argument: { name: `${r2.getArgumentName()}[${n2}]`, typeNames: [] }, underlyingError: `Can not use \`${s}\` value within array. Use \`null\` or filter out \`${s}\` values` });
        }
        t2.push(Sa(o2, i));
      }
      return t2;
    }
    function im(e2) {
      return typeof e2 == "object" && e2 !== null && e2.__prismaRawParameters__ === true;
    }
    function om(e2) {
      return typeof e2 == "object" && e2 !== null && typeof e2.toJSON == "function";
    }
    function eo(e2, r2) {
      e2 === void 0 && r2.isPreviewFeatureOn("strictUndefinedChecks") && r2.throwValidationError({ kind: "InvalidSelectionValue", selectionPath: r2.getSelectionPath(), underlyingError: Ta });
    }
    var Xi = class e2 {
      constructor(r2) {
        __publicField(this, "modelOrType");
        this.params = r2;
        this.params.modelName && (this.modelOrType = this.params.runtimeDataModel.models[this.params.modelName] ?? this.params.runtimeDataModel.types[this.params.modelName]);
      }
      throwValidationError(r2) {
        Nn({ errors: [r2], originalMethod: this.params.originalMethod, args: this.params.rootArgs ?? {}, callsite: this.params.callsite, errorFormat: this.params.errorFormat, clientVersion: this.params.clientVersion, globalOmit: this.params.globalOmit });
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
          return { name: this.params.modelName, fields: this.modelOrType.fields.map((r2) => ({ name: r2.name, typeName: "boolean", isRelation: r2.kind === "object" })) };
      }
      isRawAction() {
        return ["executeRaw", "queryRaw", "runCommandRaw", "findRaw", "aggregateRaw"].includes(this.params.action);
      }
      isPreviewFeatureOn(r2) {
        return this.params.previewFeatures.includes(r2);
      }
      getComputedFields() {
        if (this.params.modelName)
          return this.params.extensions.getAllComputedFields(this.params.modelName);
      }
      findField(r2) {
        return this.modelOrType?.fields.find((t2) => t2.name === r2);
      }
      nestSelection(r2) {
        let t2 = this.findField(r2), n2 = t2?.kind === "object" ? t2.type : void 0;
        return new e2({ ...this.params, modelName: n2, selectionPath: this.params.selectionPath.concat(r2) });
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
      nestArgument(r2) {
        return new e2({ ...this.params, argumentPath: this.params.argumentPath.concat(r2) });
      }
    };
    function Aa(e2) {
      if (!e2._hasPreviewFlag("metrics"))
        throw new Z2("`metrics` preview feature must be enabled in order to access metrics API", { clientVersion: e2._clientVersion });
    }
    var Lr = class {
      constructor(r2) {
        __publicField(this, "_client");
        this._client = r2;
      }
      prometheus(r2) {
        return Aa(this._client), this._client._engine.metrics({ format: "prometheus", ...r2 });
      }
      json(r2) {
        return Aa(this._client), this._client._engine.metrics({ format: "json", ...r2 });
      }
    };
    function Ca(e2, r2) {
      let t2 = lt(() => sm(r2));
      Object.defineProperty(e2, "dmmf", { get: () => t2.get() });
    }
    function sm(e2) {
      return { datamodel: { models: ro(e2.models), enums: ro(e2.enums), types: ro(e2.types) } };
    }
    function ro(e2) {
      return Object.entries(e2).map(([r2, t2]) => ({ name: r2, ...t2 }));
    }
    var to = /* @__PURE__ */ new WeakMap();
    var qn = "$$PrismaTypedSql";
    var wt = class {
      constructor(r2, t2) {
        to.set(this, { sql: r2, values: t2 }), Object.defineProperty(this, qn, { value: qn });
      }
      get sql() {
        return to.get(this).sql;
      }
      get values() {
        return to.get(this).values;
      }
    };
    function Ia(e2) {
      return (...r2) => new wt(e2, r2);
    }
    function Vn(e2) {
      return e2 != null && e2[qn] === qn;
    }
    var cu = O(Ti());
    var pu = __require("async_hooks");
    var du = __require("events");
    var mu = O(__require("fs"));
    var ri = O(__require("path"));
    var ie = class e2 {
      constructor(r2, t2) {
        if (r2.length - 1 !== t2.length)
          throw r2.length === 0 ? new TypeError("Expected at least 1 string") : new TypeError(`Expected ${r2.length} strings to have ${r2.length - 1} values`);
        let n2 = t2.reduce((s, a) => s + (a instanceof e2 ? a.values.length : 1), 0);
        this.values = new Array(n2), this.strings = new Array(n2 + 1), this.strings[0] = r2[0];
        let i = 0, o2 = 0;
        for (; i < t2.length; ) {
          let s = t2[i++], a = r2[i];
          if (s instanceof e2) {
            this.strings[o2] += s.strings[0];
            let l = 0;
            for (; l < s.values.length; )
              this.values[o2++] = s.values[l++], this.strings[o2] = s.strings[l];
            this.strings[o2] += a;
          } else
            this.values[o2++] = s, this.strings[o2] = a;
        }
      }
      get sql() {
        let r2 = this.strings.length, t2 = 1, n2 = this.strings[0];
        for (; t2 < r2; )
          n2 += `?${this.strings[t2++]}`;
        return n2;
      }
      get statement() {
        let r2 = this.strings.length, t2 = 1, n2 = this.strings[0];
        for (; t2 < r2; )
          n2 += `:${t2}${this.strings[t2++]}`;
        return n2;
      }
      get text() {
        let r2 = this.strings.length, t2 = 1, n2 = this.strings[0];
        for (; t2 < r2; )
          n2 += `$${t2}${this.strings[t2++]}`;
        return n2;
      }
      inspect() {
        return { sql: this.sql, statement: this.statement, text: this.text, values: this.values };
      }
    };
    function Da(e2, r2 = ",", t2 = "", n2 = "") {
      if (e2.length === 0)
        throw new TypeError("Expected `join([])` to be called with an array of multiple elements, but got an empty array");
      return new ie([t2, ...Array(e2.length - 1).fill(r2), n2], e2);
    }
    function no(e2) {
      return new ie([e2], []);
    }
    var Oa = no("");
    function io(e2, ...r2) {
      return new ie(e2, r2);
    }
    function xt(e2) {
      return { getKeys() {
        return Object.keys(e2);
      }, getPropertyValue(r2) {
        return e2[r2];
      } };
    }
    function re(e2, r2) {
      return { getKeys() {
        return [e2];
      }, getPropertyValue() {
        return r2();
      } };
    }
    function lr(e2) {
      let r2 = new we();
      return { getKeys() {
        return e2.getKeys();
      }, getPropertyValue(t2) {
        return r2.getOrCreate(t2, () => e2.getPropertyValue(t2));
      }, getPropertyDescriptor(t2) {
        return e2.getPropertyDescriptor?.(t2);
      } };
    }
    var jn = { enumerable: true, configurable: true, writable: true };
    function Bn(e2) {
      let r2 = new Set(e2);
      return { getPrototypeOf: () => Object.prototype, getOwnPropertyDescriptor: () => jn, has: (t2, n2) => r2.has(n2), set: (t2, n2, i) => r2.add(n2) && Reflect.set(t2, n2, i), ownKeys: () => [...r2] };
    }
    var ka = Symbol.for("nodejs.util.inspect.custom");
    function he(e2, r2) {
      let t2 = am(r2), n2 = /* @__PURE__ */ new Set(), i = new Proxy(e2, { get(o2, s) {
        if (n2.has(s))
          return o2[s];
        let a = t2.get(s);
        return a ? a.getPropertyValue(s) : o2[s];
      }, has(o2, s) {
        if (n2.has(s))
          return true;
        let a = t2.get(s);
        return a ? a.has?.(s) ?? true : Reflect.has(o2, s);
      }, ownKeys(o2) {
        let s = _a(Reflect.ownKeys(o2), t2), a = _a(Array.from(t2.keys()), t2);
        return [.../* @__PURE__ */ new Set([...s, ...a, ...n2])];
      }, set(o2, s, a) {
        return t2.get(s)?.getPropertyDescriptor?.(s)?.writable === false ? false : (n2.add(s), Reflect.set(o2, s, a));
      }, getOwnPropertyDescriptor(o2, s) {
        let a = Reflect.getOwnPropertyDescriptor(o2, s);
        if (a && !a.configurable)
          return a;
        let l = t2.get(s);
        return l ? l.getPropertyDescriptor ? { ...jn, ...l?.getPropertyDescriptor(s) } : jn : a;
      }, defineProperty(o2, s, a) {
        return n2.add(s), Reflect.defineProperty(o2, s, a);
      }, getPrototypeOf: () => Object.prototype });
      return i[ka] = function() {
        let o2 = { ...this };
        return delete o2[ka], o2;
      }, i;
    }
    function am(e2) {
      let r2 = /* @__PURE__ */ new Map();
      for (let t2 of e2) {
        let n2 = t2.getKeys();
        for (let i of n2)
          r2.set(i, t2);
      }
      return r2;
    }
    function _a(e2, r2) {
      return e2.filter((t2) => r2.get(t2)?.has?.(t2) ?? true);
    }
    function Fr(e2) {
      return { getKeys() {
        return e2;
      }, has() {
        return false;
      }, getPropertyValue() {
      } };
    }
    function Mr(e2, r2) {
      return { batch: e2, transaction: r2?.kind === "batch" ? { isolationLevel: r2.options.isolationLevel } : void 0 };
    }
    function Na(e2) {
      if (e2 === void 0)
        return "";
      let r2 = _r(e2);
      return new Ar(0, { colors: Cn }).write(r2).toString();
    }
    var lm = "P2037";
    function $r({ error: e2, user_facing_error: r2 }, t2, n2) {
      return r2.error_code ? new z2(um(r2, n2), { code: r2.error_code, clientVersion: t2, meta: r2.meta, batchRequestIdx: r2.batch_request_idx }) : new V(e2, { clientVersion: t2, batchRequestIdx: r2.batch_request_idx });
    }
    function um(e2, r2) {
      let t2 = e2.message;
      return (r2 === "postgresql" || r2 === "postgres" || r2 === "mysql") && e2.error_code === lm && (t2 += `
Prisma Accelerate has built-in connection pooling to prevent such errors: https://pris.ly/client/error-accelerate`), t2;
    }
    var vt = "<unknown>";
    function La(e2) {
      var r2 = e2.split(`
`);
      return r2.reduce(function(t2, n2) {
        var i = dm(n2) || fm(n2) || ym(n2) || xm(n2) || Em(n2);
        return i && t2.push(i), t2;
      }, []);
    }
    var cm = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|rsc|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
    var pm = /\((\S*)(?::(\d+))(?::(\d+))\)/;
    function dm(e2) {
      var r2 = cm.exec(e2);
      if (!r2)
        return null;
      var t2 = r2[2] && r2[2].indexOf("native") === 0, n2 = r2[2] && r2[2].indexOf("eval") === 0, i = pm.exec(r2[2]);
      return n2 && i != null && (r2[2] = i[1], r2[3] = i[2], r2[4] = i[3]), { file: t2 ? null : r2[2], methodName: r2[1] || vt, arguments: t2 ? [r2[2]] : [], lineNumber: r2[3] ? +r2[3] : null, column: r2[4] ? +r2[4] : null };
    }
    var mm = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|rsc|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
    function fm(e2) {
      var r2 = mm.exec(e2);
      return r2 ? { file: r2[2], methodName: r2[1] || vt, arguments: [], lineNumber: +r2[3], column: r2[4] ? +r2[4] : null } : null;
    }
    var gm = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|rsc|resource|\[native).*?|[^@]*bundle)(?::(\d+))?(?::(\d+))?\s*$/i;
    var hm = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
    function ym(e2) {
      var r2 = gm.exec(e2);
      if (!r2)
        return null;
      var t2 = r2[3] && r2[3].indexOf(" > eval") > -1, n2 = hm.exec(r2[3]);
      return t2 && n2 != null && (r2[3] = n2[1], r2[4] = n2[2], r2[5] = null), { file: r2[3], methodName: r2[1] || vt, arguments: r2[2] ? r2[2].split(",") : [], lineNumber: r2[4] ? +r2[4] : null, column: r2[5] ? +r2[5] : null };
    }
    var bm = /^\s*(?:([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
    function Em(e2) {
      var r2 = bm.exec(e2);
      return r2 ? { file: r2[3], methodName: r2[1] || vt, arguments: [], lineNumber: +r2[4], column: r2[5] ? +r2[5] : null } : null;
    }
    var wm = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
    function xm(e2) {
      var r2 = wm.exec(e2);
      return r2 ? { file: r2[2], methodName: r2[1] || vt, arguments: [], lineNumber: +r2[3], column: r2[4] ? +r2[4] : null } : null;
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
        let r2 = this._error.stack;
        if (!r2)
          return null;
        let n2 = La(r2).find((i) => {
          if (!i.file)
            return false;
          let o2 = Li(i.file);
          return o2 !== "<anonymous>" && !o2.includes("@prisma") && !o2.includes("/packages/client/src/runtime/") && !o2.endsWith("/runtime/binary.js") && !o2.endsWith("/runtime/library.js") && !o2.endsWith("/runtime/edge.js") && !o2.endsWith("/runtime/edge-esm.js") && !o2.startsWith("internal/") && !i.methodName.includes("new ") && !i.methodName.includes("getCallSite") && !i.methodName.includes("Proxy.") && i.methodName.split(".").length < 4;
        });
        return !n2 || !n2.file ? null : { fileName: n2.file, lineNumber: n2.lineNumber, columnNumber: n2.column };
      }
    };
    function Ze(e2) {
      return e2 === "minimal" ? typeof $EnabledCallSite == "function" && e2 !== "minimal" ? new $EnabledCallSite() : new oo() : new so();
    }
    var Fa = { _avg: true, _count: true, _sum: true, _min: true, _max: true };
    function qr(e2 = {}) {
      let r2 = Pm(e2);
      return Object.entries(r2).reduce((n2, [i, o2]) => (Fa[i] !== void 0 ? n2.select[i] = { select: o2 } : n2[i] = o2, n2), { select: {} });
    }
    function Pm(e2 = {}) {
      return typeof e2._count == "boolean" ? { ...e2, _count: { _all: e2._count } } : e2;
    }
    function Un(e2 = {}) {
      return (r2) => (typeof e2._count == "boolean" && (r2._count = r2._count._all), r2);
    }
    function Ma(e2, r2) {
      let t2 = Un(e2);
      return r2({ action: "aggregate", unpacker: t2, argsMapper: qr })(e2);
    }
    function Tm(e2 = {}) {
      let { select: r2, ...t2 } = e2;
      return typeof r2 == "object" ? qr({ ...t2, _count: r2 }) : qr({ ...t2, _count: { _all: true } });
    }
    function Sm(e2 = {}) {
      return typeof e2.select == "object" ? (r2) => Un(e2)(r2)._count : (r2) => Un(e2)(r2)._count._all;
    }
    function $a(e2, r2) {
      return r2({ action: "count", unpacker: Sm(e2), argsMapper: Tm })(e2);
    }
    function Rm(e2 = {}) {
      let r2 = qr(e2);
      if (Array.isArray(r2.by))
        for (let t2 of r2.by)
          typeof t2 == "string" && (r2.select[t2] = true);
      else
        typeof r2.by == "string" && (r2.select[r2.by] = true);
      return r2;
    }
    function Am(e2 = {}) {
      return (r2) => (typeof e2?._count == "boolean" && r2.forEach((t2) => {
        t2._count = t2._count._all;
      }), r2);
    }
    function qa(e2, r2) {
      return r2({ action: "groupBy", unpacker: Am(e2), argsMapper: Rm })(e2);
    }
    function Va(e2, r2, t2) {
      if (r2 === "aggregate")
        return (n2) => Ma(n2, t2);
      if (r2 === "count")
        return (n2) => $a(n2, t2);
      if (r2 === "groupBy")
        return (n2) => qa(n2, t2);
    }
    function ja(e2, r2) {
      let t2 = r2.fields.filter((i) => !i.relationName), n2 = _s(t2, "name");
      return new Proxy({}, { get(i, o2) {
        if (o2 in i || typeof o2 == "symbol")
          return i[o2];
        let s = n2[o2];
        if (s)
          return new mt(e2, o2, s.type, s.isList, s.kind === "enum");
      }, ...Bn(Object.keys(n2)) });
    }
    var Ba = (e2) => Array.isArray(e2) ? e2 : e2.split(".");
    var ao = (e2, r2) => Ba(r2).reduce((t2, n2) => t2 && t2[n2], e2);
    var Ua = (e2, r2, t2) => Ba(r2).reduceRight((n2, i, o2, s) => Object.assign({}, ao(e2, s.slice(0, o2)), { [i]: n2 }), t2);
    function Cm(e2, r2) {
      return e2 === void 0 || r2 === void 0 ? [] : [...r2, "select", e2];
    }
    function Im(e2, r2, t2) {
      return r2 === void 0 ? e2 ?? {} : Ua(r2, t2, e2 || true);
    }
    function lo(e2, r2, t2, n2, i, o2) {
      let a = e2._runtimeDataModel.models[r2].fields.reduce((l, u) => ({ ...l, [u.name]: u }), {});
      return (l) => {
        let u = Ze(e2._errorFormat), c = Cm(n2, i), p2 = Im(l, o2, c), d2 = t2({ dataPath: c, callsite: u })(p2), f = Dm(e2, r2);
        return new Proxy(d2, { get(h, g2) {
          if (!f.includes(g2))
            return h[g2];
          let T = [a[g2].type, t2, g2], S = [c, p2];
          return lo(e2, ...T, ...S);
        }, ...Bn([...f, ...Object.getOwnPropertyNames(d2)]) });
      };
    }
    function Dm(e2, r2) {
      return e2._runtimeDataModel.models[r2].fields.filter((t2) => t2.kind === "object").map((t2) => t2.name);
    }
    var Om = ["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "create", "update", "upsert", "delete"];
    var km = ["aggregate", "count", "groupBy"];
    function uo(e2, r2) {
      let t2 = e2._extensions.getAllModelExtensions(r2) ?? {}, n2 = [_m(e2, r2), Lm(e2, r2), xt(t2), re("name", () => r2), re("$name", () => r2), re("$parent", () => e2._appliedParent)];
      return he({}, n2);
    }
    function _m(e2, r2) {
      let t2 = Te(r2), n2 = Object.keys(Rr).concat("count");
      return { getKeys() {
        return n2;
      }, getPropertyValue(i) {
        let o2 = i, s = (a) => (l) => {
          let u = Ze(e2._errorFormat);
          return e2._createPrismaPromise((c) => {
            let p2 = { args: l, dataPath: [], action: o2, model: r2, clientMethod: `${t2}.${i}`, jsModelName: t2, transaction: c, callsite: u };
            return e2._request({ ...p2, ...a });
          }, { action: o2, args: l, model: r2 });
        };
        return Om.includes(o2) ? lo(e2, r2, s) : Nm(i) ? Va(e2, i, s) : s({});
      } };
    }
    function Nm(e2) {
      return km.includes(e2);
    }
    function Lm(e2, r2) {
      return lr(re("fields", () => {
        let t2 = e2._runtimeDataModel.models[r2];
        return ja(r2, t2);
      }));
    }
    function Ga(e2) {
      return e2.replace(/^./, (r2) => r2.toUpperCase());
    }
    var co = Symbol();
    function Pt(e2) {
      let r2 = [Fm(e2), Mm(e2), re(co, () => e2), re("$parent", () => e2._appliedParent)], t2 = e2._extensions.getAllClientExtensions();
      return t2 && r2.push(xt(t2)), he(e2, r2);
    }
    function Fm(e2) {
      let r2 = Object.getPrototypeOf(e2._originalClient), t2 = [...new Set(Object.getOwnPropertyNames(r2))];
      return { getKeys() {
        return t2;
      }, getPropertyValue(n2) {
        return e2[n2];
      } };
    }
    function Mm(e2) {
      let r2 = Object.keys(e2._runtimeDataModel.models), t2 = r2.map(Te), n2 = [...new Set(r2.concat(t2))];
      return lr({ getKeys() {
        return n2;
      }, getPropertyValue(i) {
        let o2 = Ga(i);
        if (e2._runtimeDataModel.models[o2] !== void 0)
          return uo(e2, o2);
        if (e2._runtimeDataModel.models[i] !== void 0)
          return uo(e2, i);
      }, getPropertyDescriptor(i) {
        if (!t2.includes(i))
          return { enumerable: false };
      } });
    }
    function Qa(e2) {
      return e2[co] ? e2[co] : e2;
    }
    function Wa(e2) {
      if (typeof e2 == "function")
        return e2(this);
      if (e2.client?.__AccelerateEngine) {
        let t2 = e2.client.__AccelerateEngine;
        this._originalClient._engine = new t2(this._originalClient._accelerateEngineConfig);
      }
      let r2 = Object.create(this._originalClient, { _extensions: { value: this._extensions.append(e2) }, _appliedParent: { value: this, configurable: true }, $on: { value: void 0 } });
      return Pt(r2);
    }
    function Ja({ result: e2, modelName: r2, select: t2, omit: n2, extensions: i }) {
      let o2 = i.getAllComputedFields(r2);
      if (!o2)
        return e2;
      let s = [], a = [];
      for (let l of Object.values(o2)) {
        if (n2) {
          if (n2[l.name])
            continue;
          let u = l.needs.filter((c) => n2[c]);
          u.length > 0 && a.push(Fr(u));
        } else if (t2) {
          if (!t2[l.name])
            continue;
          let u = l.needs.filter((c) => !t2[c]);
          u.length > 0 && a.push(Fr(u));
        }
        $m(e2, l.needs) && s.push(qm(l, he(e2, s)));
      }
      return s.length > 0 || a.length > 0 ? he(e2, [...s, ...a]) : e2;
    }
    function $m(e2, r2) {
      return r2.every((t2) => Vi(e2, t2));
    }
    function qm(e2, r2) {
      return lr(re(e2.name, () => e2.compute(r2)));
    }
    function Gn({ visitor: e2, result: r2, args: t2, runtimeDataModel: n2, modelName: i }) {
      if (Array.isArray(r2)) {
        for (let s = 0; s < r2.length; s++)
          r2[s] = Gn({ result: r2[s], args: t2, modelName: i, runtimeDataModel: n2, visitor: e2 });
        return r2;
      }
      let o2 = e2(r2, i, t2) ?? r2;
      return t2.include && Ka({ includeOrSelect: t2.include, result: o2, parentModelName: i, runtimeDataModel: n2, visitor: e2 }), t2.select && Ka({ includeOrSelect: t2.select, result: o2, parentModelName: i, runtimeDataModel: n2, visitor: e2 }), o2;
    }
    function Ka({ includeOrSelect: e2, result: r2, parentModelName: t2, runtimeDataModel: n2, visitor: i }) {
      for (let [o2, s] of Object.entries(e2)) {
        if (!s || r2[o2] == null || Se(s))
          continue;
        let l = n2.models[t2].fields.find((c) => c.name === o2);
        if (!l || l.kind !== "object" || !l.relationName)
          continue;
        let u = typeof s == "object" ? s : {};
        r2[o2] = Gn({ visitor: i, result: r2[o2], args: u, modelName: l.type, runtimeDataModel: n2 });
      }
    }
    function Ha({ result: e2, modelName: r2, args: t2, extensions: n2, runtimeDataModel: i, globalOmit: o2 }) {
      return n2.isEmpty() || e2 == null || typeof e2 != "object" || !i.models[r2] ? e2 : Gn({ result: e2, args: t2 ?? {}, modelName: r2, runtimeDataModel: i, visitor: (a, l, u) => {
        let c = Te(l);
        return Ja({ result: a, modelName: c, select: u.select, omit: u.select ? void 0 : { ...o2?.[c], ...u.omit }, extensions: n2 });
      } });
    }
    var Vm = ["$connect", "$disconnect", "$on", "$transaction", "$extends"];
    var Ya = Vm;
    function za(e2) {
      if (e2 instanceof ie)
        return jm(e2);
      if (Vn(e2))
        return Bm(e2);
      if (Array.isArray(e2)) {
        let t2 = [e2[0]];
        for (let n2 = 1; n2 < e2.length; n2++)
          t2[n2] = Tt(e2[n2]);
        return t2;
      }
      let r2 = {};
      for (let t2 in e2)
        r2[t2] = Tt(e2[t2]);
      return r2;
    }
    function jm(e2) {
      return new ie(e2.strings, e2.values);
    }
    function Bm(e2) {
      return new wt(e2.sql, e2.values);
    }
    function Tt(e2) {
      if (typeof e2 != "object" || e2 == null || e2 instanceof Me || kr(e2))
        return e2;
      if (Sr(e2))
        return new Fe(e2.toFixed());
      if (vr(e2))
        return /* @__PURE__ */ new Date(+e2);
      if (ArrayBuffer.isView(e2))
        return e2.slice(0);
      if (Array.isArray(e2)) {
        let r2 = e2.length, t2;
        for (t2 = Array(r2); r2--; )
          t2[r2] = Tt(e2[r2]);
        return t2;
      }
      if (typeof e2 == "object") {
        let r2 = {};
        for (let t2 in e2)
          t2 === "__proto__" ? Object.defineProperty(r2, t2, { value: Tt(e2[t2]), configurable: true, enumerable: true, writable: true }) : r2[t2] = Tt(e2[t2]);
        return r2;
      }
      ar(e2, "Unknown value");
    }
    function Xa(e2, r2, t2, n2 = 0) {
      return e2._createPrismaPromise((i) => {
        let o2 = r2.customDataProxyFetch;
        return "transaction" in r2 && i !== void 0 && (r2.transaction?.kind === "batch" && r2.transaction.lock.then(), r2.transaction = i), n2 === t2.length ? e2._executeRequest(r2) : t2[n2]({ model: r2.model, operation: r2.model ? r2.action : r2.clientMethod, args: za(r2.args ?? {}), __internalParams: r2, query: (s, a = r2) => {
          let l = a.customDataProxyFetch;
          return a.customDataProxyFetch = nl(o2, l), a.args = s, Xa(e2, a, t2, n2 + 1);
        } });
      });
    }
    function el(e2, r2) {
      let { jsModelName: t2, action: n2, clientMethod: i } = r2, o2 = t2 ? n2 : i;
      if (e2._extensions.isEmpty())
        return e2._executeRequest(r2);
      let s = e2._extensions.getAllQueryCallbacks(t2 ?? "$none", o2);
      return Xa(e2, r2, s);
    }
    function rl(e2) {
      return (r2) => {
        let t2 = { requests: r2 }, n2 = r2[0].extensions.getAllBatchQueryCallbacks();
        return n2.length ? tl(t2, n2, 0, e2) : e2(t2);
      };
    }
    function tl(e2, r2, t2, n2) {
      if (t2 === r2.length)
        return n2(e2);
      let i = e2.customDataProxyFetch, o2 = e2.requests[0].transaction;
      return r2[t2]({ args: { queries: e2.requests.map((s) => ({ model: s.modelName, operation: s.action, args: s.args })), transaction: o2 ? { isolationLevel: o2.kind === "batch" ? o2.isolationLevel : void 0 } : void 0 }, __internalParams: e2, query(s, a = e2) {
        let l = a.customDataProxyFetch;
        return a.customDataProxyFetch = nl(i, l), tl(a, r2, t2 + 1, n2);
      } });
    }
    var Za = (e2) => e2;
    function nl(e2 = Za, r2 = Za) {
      return (t2) => e2(r2(t2));
    }
    var il = N("prisma:client");
    var ol = { Vercel: "vercel", "Netlify CI": "netlify" };
    function sl({ postinstall: e2, ciName: r2, clientVersion: t2, generator: n2 }) {
      if (il("checkPlatformCaching:postinstall", e2), il("checkPlatformCaching:ciName", r2), e2 === true && !(n2?.output && typeof (n2.output.fromEnvVar ?? n2.output.value) == "string") && r2 && r2 in ol) {
        let i = `Prisma has detected that this project was built on ${r2}, which caches dependencies. This leads to an outdated Prisma Client because Prisma's auto-generation isn't triggered. To fix this, make sure to run the \`prisma generate\` command during the build process.

Learn how: https://pris.ly/d/${ol[r2]}-build`;
        throw console.error(i), new P(i, t2);
      }
    }
    function al(e2, r2) {
      return e2 ? e2.datasources ? e2.datasources : e2.datasourceUrl ? { [r2[0]]: { url: e2.datasourceUrl } } : {} : {};
    }
    var dl = O(__require("fs"));
    var St = O(__require("path"));
    function Qn(e2) {
      let { runtimeBinaryTarget: r2 } = e2;
      return `Add "${r2}" to \`binaryTargets\` in the "schema.prisma" file and run \`prisma generate\` after saving it:

${Um(e2)}`;
    }
    function Um(e2) {
      let { generator: r2, generatorBinaryTargets: t2, runtimeBinaryTarget: n2 } = e2, i = { fromEnvVar: null, value: n2 }, o2 = [...t2, i];
      return ki({ ...r2, binaryTargets: o2 });
    }
    function Xe(e2) {
      let { runtimeBinaryTarget: r2 } = e2;
      return `Prisma Client could not locate the Query Engine for runtime "${r2}".`;
    }
    function er(e2) {
      let { searchedLocations: r2 } = e2;
      return `The following locations have been searched:
${[...new Set(r2)].map((i) => `  ${i}`).join(`
`)}`;
    }
    function ll(e2) {
      let { runtimeBinaryTarget: r2 } = e2;
      return `${Xe(e2)}

This happened because \`binaryTargets\` have been pinned, but the actual deployment also required "${r2}".
${Qn(e2)}

${er(e2)}`;
    }
    function Wn(e2) {
      return `We would appreciate if you could take the time to share some information with us.
Please help us by answering a few questions: https://pris.ly/${e2}`;
    }
    function Jn(e2) {
      let { errorStack: r2 } = e2;
      return r2?.match(/\/\.next|\/next@|\/next\//) ? `

We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.` : "";
    }
    function ul(e2) {
      let { queryEngineName: r2 } = e2;
      return `${Xe(e2)}${Jn(e2)}

This is likely caused by a bundler that has not copied "${r2}" next to the resulting bundle.
Ensure that "${r2}" has been copied next to the bundle or in "${e2.expectedLocation}".

${Wn("engine-not-found-bundler-investigation")}

${er(e2)}`;
    }
    function cl(e2) {
      let { runtimeBinaryTarget: r2, generatorBinaryTargets: t2 } = e2, n2 = t2.find((i) => i.native);
      return `${Xe(e2)}

This happened because Prisma Client was generated for "${n2?.value ?? "unknown"}", but the actual deployment required "${r2}".
${Qn(e2)}

${er(e2)}`;
    }
    function pl(e2) {
      let { queryEngineName: r2 } = e2;
      return `${Xe(e2)}${Jn(e2)}

This is likely caused by tooling that has not copied "${r2}" to the deployment folder.
Ensure that you ran \`prisma generate\` and that "${r2}" has been copied to "${e2.expectedLocation}".

${Wn("engine-not-found-tooling-investigation")}

${er(e2)}`;
    }
    var Gm = N("prisma:client:engines:resolveEnginePath");
    var Qm = () => new RegExp("runtime[\\\\/]library\\.m?js$");
    async function ml(e2, r2) {
      let t2 = { binary: process.env.PRISMA_QUERY_ENGINE_BINARY, library: process.env.PRISMA_QUERY_ENGINE_LIBRARY }[e2] ?? r2.prismaPath;
      if (t2 !== void 0)
        return t2;
      let { enginePath: n2, searchedLocations: i } = await Wm(e2, r2);
      if (Gm("enginePath", n2), n2 !== void 0)
        return r2.prismaPath = n2;
      let o2 = await ir(), s = r2.generator?.binaryTargets ?? [], a = s.some((d2) => d2.native), l = !s.some((d2) => d2.value === o2), u = __filename.match(Qm()) === null, c = { searchedLocations: i, generatorBinaryTargets: s, generator: r2.generator, runtimeBinaryTarget: o2, queryEngineName: fl(e2, o2), expectedLocation: St.default.relative(process.cwd(), r2.dirname), errorStack: new Error().stack }, p2;
      throw a && l ? p2 = cl(c) : l ? p2 = ll(c) : u ? p2 = ul(c) : p2 = pl(c), new P(p2, r2.clientVersion);
    }
    async function Wm(e2, r2) {
      let t2 = await ir(), n2 = [], i = [r2.dirname, St.default.resolve(__dirname, ".."), r2.generator?.output?.value ?? __dirname, St.default.resolve(__dirname, "../../../.prisma/client"), "/tmp/prisma-engines", r2.cwd];
      __filename.includes("resolveEnginePath") && i.push(ms());
      for (let o2 of i) {
        let s = fl(e2, t2), a = St.default.join(o2, s);
        if (n2.push(o2), dl.default.existsSync(a))
          return { enginePath: a, searchedLocations: n2 };
      }
      return { enginePath: void 0, searchedLocations: n2 };
    }
    function fl(e2, r2) {
      return Gt(r2) ;
    }
    function gl(e2) {
      return e2 ? e2.replace(/".*"/g, '"X"').replace(/[\s:\[]([+-]?([0-9]*[.])?[0-9]+)/g, (r2) => `${r2[0]}5`) : "";
    }
    function hl(e2) {
      return e2.split(`
`).map((r2) => r2.replace(/^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)\s*/, "").replace(/\+\d+\s*ms$/, "")).join(`
`);
    }
    var yl = O(Os());
    function bl({ title: e2, user: r2 = "prisma", repo: t2 = "prisma", template: n2 = "bug_report.yml", body: i }) {
      return (0, yl.default)({ user: r2, repo: t2, template: n2, title: e2, body: i });
    }
    function El({ version: e2, binaryTarget: r2, title: t2, description: n2, engineVersion: i, database: o2, query: s }) {
      let a = Bo(6e3 - (s?.length ?? 0)), l = hl(wr(a)), u = n2 ? `# Description
\`\`\`
${n2}
\`\`\`` : "", c = wr(`Hi Prisma Team! My Prisma Client just crashed. This is the report:
## Versions

| Name            | Version            |
|-----------------|--------------------|
| Node            | ${process.version?.padEnd(19)}| 
| OS              | ${r2?.padEnd(19)}|
| Prisma Client   | ${e2?.padEnd(19)}|
| Query Engine    | ${i?.padEnd(19)}|
| Database        | ${o2?.padEnd(19)}|

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
`), p2 = bl({ title: t2, body: c });
      return `${t2}

This is a non-recoverable error which probably happens when the Prisma Query Engine has a panic.

${Y(p2)}

If you want the Prisma team to look into it, please open the link above \u{1F64F}
To increase the chance of success, please post your schema and a snippet of
how you used Prisma Client in the issue. 
`;
    }
    function wl(e2, r2) {
      throw new Error(r2);
    }
    function Jm(e2) {
      return e2 !== null && typeof e2 == "object" && typeof e2.$type == "string";
    }
    function Km(e2, r2) {
      let t2 = {};
      for (let n2 of Object.keys(e2))
        t2[n2] = r2(e2[n2], n2);
      return t2;
    }
    function Vr(e2) {
      return e2 === null ? e2 : Array.isArray(e2) ? e2.map(Vr) : typeof e2 == "object" ? Jm(e2) ? Hm(e2) : e2.constructor !== null && e2.constructor.name !== "Object" ? e2 : Km(e2, Vr) : e2;
    }
    function Hm({ $type: e2, value: r2 }) {
      switch (e2) {
        case "BigInt":
          return BigInt(r2);
        case "Bytes": {
          let { buffer: t2, byteOffset: n2, byteLength: i } = Buffer.from(r2, "base64");
          return new Uint8Array(t2, n2, i);
        }
        case "DateTime":
          return new Date(r2);
        case "Decimal":
          return new Le(r2);
        case "Json":
          return JSON.parse(r2);
        default:
          wl(r2, "Unknown tagged value");
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
      return [[ef, "netlify"], [rf, "edge-light"], [tf, "workerd"], [Xm, "deno"], [Zm, "bun"], [zm, "node"]].flatMap((t2) => t2[0]() ? [t2[1]] : []).at(0) ?? "";
    }
    var of = { node: "Node.js", workerd: "Cloudflare Workers", deno: "Deno and Deno Deploy", netlify: "Netlify Edge Functions", "edge-light": "Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)" };
    function Kn() {
      let e2 = nf();
      return { id: e2, prettyName: of[e2] || e2, isEdge: ["workerd", "deno", "netlify", "edge-light"].includes(e2) };
    }
    function jr({ inlineDatasources: e2, overrideDatasources: r2, env: t2, clientVersion: n2 }) {
      let i, o2 = Object.keys(e2)[0], s = e2[o2]?.url, a = r2[o2]?.url;
      if (o2 === void 0 ? i = void 0 : a ? i = a : s?.value ? i = s.value : s?.fromEnvVar && (i = t2[s.fromEnvVar]), s?.fromEnvVar !== void 0 && i === void 0)
        throw new P(`error: Environment variable not found: ${s.fromEnvVar}.`, n2);
      if (i === void 0)
        throw new P("error: Missing URL environment variable, value, or override.", n2);
      return i;
    }
    var Hn = class extends Error {
      constructor(r2, t2) {
        super(r2);
        __publicField(this, "clientVersion");
        __publicField(this, "cause");
        this.clientVersion = t2.clientVersion, this.cause = t2.cause;
      }
      get [Symbol.toStringTag]() {
        return this.name;
      }
    };
    var oe = class extends Hn {
      constructor(r2, t2) {
        super(r2, t2);
        __publicField(this, "isRetryable");
        this.isRetryable = t2.isRetryable ?? true;
      }
    };
    function R(e2, r2) {
      return { ...e2, isRetryable: r2 };
    }
    var ur = class extends oe {
      constructor(r2, t2) {
        super(r2, R(t2, false));
        __publicField(this, "name", "InvalidDatasourceError");
        __publicField(this, "code", "P6001");
      }
    };
    x(ur, "InvalidDatasourceError");
    function vl(e2) {
      let r2 = { clientVersion: e2.clientVersion }, t2 = Object.keys(e2.inlineDatasources)[0], n2 = jr({ inlineDatasources: e2.inlineDatasources, overrideDatasources: e2.overrideDatasources, clientVersion: e2.clientVersion, env: { ...e2.env, ...typeof process < "u" ? process.env : {} } }), i;
      try {
        i = new URL(n2);
      } catch {
        throw new ur(`Error validating datasource \`${t2}\`: the URL must start with the protocol \`prisma://\``, r2);
      }
      let { protocol: o2, searchParams: s } = i;
      if (o2 !== "prisma:" && o2 !== sn)
        throw new ur(`Error validating datasource \`${t2}\`: the URL must start with the protocol \`prisma://\` or \`prisma+postgres://\``, r2);
      let a = s.get("api_key");
      if (a === null || a.length < 1)
        throw new ur(`Error validating datasource \`${t2}\`: the URL must contain a valid API key`, r2);
      let l = Ii(i) ? "http:" : "https:";
      process.env.TEST_CLIENT_ENGINE_REMOTE_EXECUTOR && i.searchParams.has("use_http") && (l = "http:");
      let u = new URL(i.href.replace(o2, l));
      return { apiKey: a, url: u };
    }
    var Pl = O(on());
    var _e4, e_fn, _a5;
    var Yn = (_a5 = class {
      constructor({ apiKey: r2, tracingHelper: t2, logLevel: n2, logQueries: i, engineHash: o2 }) {
        __privateAdd(this, _e4);
        __publicField(this, "apiKey");
        __publicField(this, "tracingHelper");
        __publicField(this, "logLevel");
        __publicField(this, "logQueries");
        __publicField(this, "engineHash");
        this.apiKey = r2, this.tracingHelper = t2, this.logLevel = n2, this.logQueries = i, this.engineHash = o2;
      }
      build({ traceparent: r2, transactionId: t2 } = {}) {
        let n2 = { Accept: "application/json", Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "Prisma-Engine-Hash": this.engineHash, "Prisma-Engine-Version": Pl.enginesVersion };
        this.tracingHelper.isEnabled() && (n2.traceparent = r2 ?? this.tracingHelper.getTraceParent()), t2 && (n2["X-Transaction-Id"] = t2);
        let i = __privateMethod(this, _e4, e_fn).call(this);
        return i.length > 0 && (n2["X-Capture-Telemetry"] = i.join(", ")), n2;
      }
    }, _e4 = new WeakSet(), e_fn = function() {
      let r2 = [];
      return this.tracingHelper.isEnabled() && r2.push("tracing"), this.logLevel && r2.push(this.logLevel), this.logQueries && r2.push("query"), r2;
    }, _a5);
    function sf(e2) {
      return e2[0] * 1e3 + e2[1] / 1e6;
    }
    function po(e2) {
      return new Date(sf(e2));
    }
    var Br = class extends oe {
      constructor(r2) {
        super("This request must be retried", R(r2, true));
        __publicField(this, "name", "ForcedRetryError");
        __publicField(this, "code", "P5001");
      }
    };
    x(Br, "ForcedRetryError");
    var cr = class extends oe {
      constructor(r2, t2) {
        super(r2, R(t2, false));
        __publicField(this, "name", "NotImplementedYetError");
        __publicField(this, "code", "P5004");
      }
    };
    x(cr, "NotImplementedYetError");
    var $ = class extends oe {
      constructor(r2, t2) {
        super(r2, t2);
        __publicField(this, "response");
        this.response = t2.response;
        let n2 = this.response.headers.get("prisma-request-id");
        if (n2) {
          let i = `(The request id was: ${n2})`;
          this.message = this.message + " " + i;
        }
      }
    };
    var pr = class extends $ {
      constructor(r2) {
        super("Schema needs to be uploaded", R(r2, true));
        __publicField(this, "name", "SchemaMissingError");
        __publicField(this, "code", "P5005");
      }
    };
    x(pr, "SchemaMissingError");
    var mo = "This request could not be understood by the server";
    var Rt = class extends $ {
      constructor(r2, t2, n2) {
        super(t2 || mo, R(r2, false));
        __publicField(this, "name", "BadRequestError");
        __publicField(this, "code", "P5000");
        n2 && (this.code = n2);
      }
    };
    x(Rt, "BadRequestError");
    var At = class extends $ {
      constructor(r2, t2) {
        super("Engine not started: healthcheck timeout", R(r2, true));
        __publicField(this, "name", "HealthcheckTimeoutError");
        __publicField(this, "code", "P5013");
        __publicField(this, "logs");
        this.logs = t2;
      }
    };
    x(At, "HealthcheckTimeoutError");
    var Ct = class extends $ {
      constructor(r2, t2, n2) {
        super(t2, R(r2, true));
        __publicField(this, "name", "EngineStartupError");
        __publicField(this, "code", "P5014");
        __publicField(this, "logs");
        this.logs = n2;
      }
    };
    x(Ct, "EngineStartupError");
    var It = class extends $ {
      constructor(r2) {
        super("Engine version is not supported", R(r2, false));
        __publicField(this, "name", "EngineVersionNotSupportedError");
        __publicField(this, "code", "P5012");
      }
    };
    x(It, "EngineVersionNotSupportedError");
    var fo = "Request timed out";
    var Dt = class extends $ {
      constructor(r2, t2 = fo) {
        super(t2, R(r2, false));
        __publicField(this, "name", "GatewayTimeoutError");
        __publicField(this, "code", "P5009");
      }
    };
    x(Dt, "GatewayTimeoutError");
    var af = "Interactive transaction error";
    var Ot = class extends $ {
      constructor(r2, t2 = af) {
        super(t2, R(r2, false));
        __publicField(this, "name", "InteractiveTransactionError");
        __publicField(this, "code", "P5015");
      }
    };
    x(Ot, "InteractiveTransactionError");
    var lf = "Request parameters are invalid";
    var kt = class extends $ {
      constructor(r2, t2 = lf) {
        super(t2, R(r2, false));
        __publicField(this, "name", "InvalidRequestError");
        __publicField(this, "code", "P5011");
      }
    };
    x(kt, "InvalidRequestError");
    var go = "Requested resource does not exist";
    var _t = class extends $ {
      constructor(r2, t2 = go) {
        super(t2, R(r2, false));
        __publicField(this, "name", "NotFoundError");
        __publicField(this, "code", "P5003");
      }
    };
    x(_t, "NotFoundError");
    var ho = "Unknown server error";
    var Ur = class extends $ {
      constructor(r2, t2, n2) {
        super(t2 || ho, R(r2, true));
        __publicField(this, "name", "ServerError");
        __publicField(this, "code", "P5006");
        __publicField(this, "logs");
        this.logs = n2;
      }
    };
    x(Ur, "ServerError");
    var yo = "Unauthorized, check your connection string";
    var Nt = class extends $ {
      constructor(r2, t2 = yo) {
        super(t2, R(r2, false));
        __publicField(this, "name", "UnauthorizedError");
        __publicField(this, "code", "P5007");
      }
    };
    x(Nt, "UnauthorizedError");
    var bo = "Usage exceeded, retry again later";
    var Lt = class extends $ {
      constructor(r2, t2 = bo) {
        super(t2, R(r2, true));
        __publicField(this, "name", "UsageExceededError");
        __publicField(this, "code", "P5008");
      }
    };
    x(Lt, "UsageExceededError");
    async function uf(e2) {
      let r2;
      try {
        r2 = await e2.text();
      } catch {
        return { type: "EmptyError" };
      }
      try {
        let t2 = JSON.parse(r2);
        if (typeof t2 == "string")
          switch (t2) {
            case "InternalDataProxyError":
              return { type: "DataProxyError", body: t2 };
            default:
              return { type: "UnknownTextError", body: t2 };
          }
        if (typeof t2 == "object" && t2 !== null) {
          if ("is_panic" in t2 && "message" in t2 && "error_code" in t2)
            return { type: "QueryEngineError", body: t2 };
          if ("EngineNotStarted" in t2 || "InteractiveTransactionMisrouted" in t2 || "InvalidRequestError" in t2) {
            let n2 = Object.values(t2)[0].reason;
            return typeof n2 == "string" && !["SchemaMissing", "EngineVersionNotSupported"].includes(n2) ? { type: "UnknownJsonError", body: t2 } : { type: "DataProxyError", body: t2 };
          }
        }
        return { type: "UnknownJsonError", body: t2 };
      } catch {
        return r2 === "" ? { type: "EmptyError" } : { type: "UnknownTextError", body: r2 };
      }
    }
    async function Ft(e2, r2) {
      if (e2.ok)
        return;
      let t2 = { clientVersion: r2, response: e2 }, n2 = await uf(e2);
      if (n2.type === "QueryEngineError")
        throw new z2(n2.body.message, { code: n2.body.error_code, clientVersion: r2 });
      if (n2.type === "DataProxyError") {
        if (n2.body === "InternalDataProxyError")
          throw new Ur(t2, "Internal Data Proxy error");
        if ("EngineNotStarted" in n2.body) {
          if (n2.body.EngineNotStarted.reason === "SchemaMissing")
            return new pr(t2);
          if (n2.body.EngineNotStarted.reason === "EngineVersionNotSupported")
            throw new It(t2);
          if ("EngineStartupError" in n2.body.EngineNotStarted.reason) {
            let { msg: i, logs: o2 } = n2.body.EngineNotStarted.reason.EngineStartupError;
            throw new Ct(t2, i, o2);
          }
          if ("KnownEngineStartupError" in n2.body.EngineNotStarted.reason) {
            let { msg: i, error_code: o2 } = n2.body.EngineNotStarted.reason.KnownEngineStartupError;
            throw new P(i, r2, o2);
          }
          if ("HealthcheckTimeout" in n2.body.EngineNotStarted.reason) {
            let { logs: i } = n2.body.EngineNotStarted.reason.HealthcheckTimeout;
            throw new At(t2, i);
          }
        }
        if ("InteractiveTransactionMisrouted" in n2.body) {
          let i = { IDParseError: "Could not parse interactive transaction ID", NoQueryEngineFoundError: "Could not find Query Engine for the specified host and transaction ID", TransactionStartError: "Could not start interactive transaction" };
          throw new Ot(t2, i[n2.body.InteractiveTransactionMisrouted.reason]);
        }
        if ("InvalidRequestError" in n2.body)
          throw new kt(t2, n2.body.InvalidRequestError.reason);
      }
      if (e2.status === 401 || e2.status === 403)
        throw new Nt(t2, Gr(yo, n2));
      if (e2.status === 404)
        return new _t(t2, Gr(go, n2));
      if (e2.status === 429)
        throw new Lt(t2, Gr(bo, n2));
      if (e2.status === 504)
        throw new Dt(t2, Gr(fo, n2));
      if (e2.status >= 500)
        throw new Ur(t2, Gr(ho, n2));
      if (e2.status >= 400)
        throw new Rt(t2, Gr(mo, n2));
    }
    function Gr(e2, r2) {
      return r2.type === "EmptyError" ? e2 : `${e2}: ${JSON.stringify(r2)}`;
    }
    function Tl(e2) {
      let r2 = Math.pow(2, e2) * 50, t2 = Math.ceil(Math.random() * r2) - Math.ceil(r2 / 2), n2 = r2 + t2;
      return new Promise((i) => setTimeout(() => i(n2), n2));
    }
    var $e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function Sl(e2) {
      let r2 = new TextEncoder().encode(e2), t2 = "", n2 = r2.byteLength, i = n2 % 3, o2 = n2 - i, s, a, l, u, c;
      for (let p2 = 0; p2 < o2; p2 = p2 + 3)
        c = r2[p2] << 16 | r2[p2 + 1] << 8 | r2[p2 + 2], s = (c & 16515072) >> 18, a = (c & 258048) >> 12, l = (c & 4032) >> 6, u = c & 63, t2 += $e[s] + $e[a] + $e[l] + $e[u];
      return i == 1 ? (c = r2[o2], s = (c & 252) >> 2, a = (c & 3) << 4, t2 += $e[s] + $e[a] + "==") : i == 2 && (c = r2[o2] << 8 | r2[o2 + 1], s = (c & 64512) >> 10, a = (c & 1008) >> 4, l = (c & 15) << 2, t2 += $e[s] + $e[a] + $e[l] + "="), t2;
    }
    function Rl(e2) {
      if (!!e2.generator?.previewFeatures.some((t2) => t2.toLowerCase().includes("metrics")))
        throw new P("The `metrics` preview feature is not yet available with Accelerate.\nPlease remove `metrics` from the `previewFeatures` in your schema.\n\nMore information about Accelerate: https://pris.ly/d/accelerate", e2.clientVersion);
    }
    var Al = { "@prisma/engines-version": "6.16.1-1.bb420e667c1820a8c05a38023385f6cc7ef8e83a"};
    var Mt = class extends oe {
      constructor(r2, t2) {
        super(`Cannot fetch data from service:
${r2}`, R(t2, true));
        __publicField(this, "name", "RequestError");
        __publicField(this, "code", "P5010");
      }
    };
    x(Mt, "RequestError");
    async function dr(e2, r2, t2 = (n2) => n2) {
      let { clientVersion: n2, ...i } = r2, o2 = t2(fetch);
      try {
        return await o2(e2, i);
      } catch (s) {
        let a = s.message ?? "Unknown error";
        throw new Mt(a, { clientVersion: n2, cause: s });
      }
    }
    var pf = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
    var Cl = N("prisma:client:dataproxyEngine");
    async function df(e2, r2) {
      let t2 = Al["@prisma/engines-version"], n2 = r2.clientVersion ?? "unknown";
      if (process.env.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION || globalThis.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION)
        return process.env.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION || globalThis.PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION;
      if (e2.includes("accelerate") && n2 !== "0.0.0" && n2 !== "in-memory")
        return n2;
      let [i, o2] = n2?.split("-") ?? [];
      if (o2 === void 0 && pf.test(i))
        return i;
      if (o2 !== void 0 || n2 === "0.0.0" || n2 === "in-memory") {
        let [s] = t2.split("-") ?? [], [a, l, u] = s.split("."), c = mf(`<=${a}.${l}.${u}`), p2 = await dr(c, { clientVersion: n2 });
        if (!p2.ok)
          throw new Error(`Failed to fetch stable Prisma version, unpkg.com status ${p2.status} ${p2.statusText}, response body: ${await p2.text() || "<empty body>"}`);
        let d2 = await p2.text();
        Cl("length of body fetched from unpkg.com", d2.length);
        let f;
        try {
          f = JSON.parse(d2);
        } catch (h) {
          throw console.error("JSON.parse error: body fetched from unpkg.com: ", d2), h;
        }
        return f.version;
      }
      throw new cr("Only `major.minor.patch` versions are supported by Accelerate.", { clientVersion: n2 });
    }
    async function Il(e2, r2) {
      let t2 = await df(e2, r2);
      return Cl("version", t2), t2;
    }
    function mf(e2) {
      return encodeURI(`https://unpkg.com/prisma@${e2}/package.json`);
    }
    var Dl = 3;
    var $t = N("prisma:client:dataproxyEngine");
    var qt = class {
      constructor(r2) {
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
        Rl(r2), this.config = r2, this.env = r2.env, this.inlineSchema = Sl(r2.inlineSchema), this.inlineDatasources = r2.inlineDatasources, this.inlineSchemaHash = r2.inlineSchemaHash, this.clientVersion = r2.clientVersion, this.engineHash = r2.engineVersion, this.logEmitter = r2.logEmitter, this.tracingHelper = r2.tracingHelper;
      }
      apiKey() {
        return this.headerBuilder.apiKey;
      }
      version() {
        return this.engineHash;
      }
      async start() {
        this.startPromise !== void 0 && await this.startPromise, this.startPromise = (async () => {
          let { apiKey: r2, url: t2 } = this.getURLAndAPIKey();
          this.host = t2.host, this.protocol = t2.protocol, this.headerBuilder = new Yn({ apiKey: r2, tracingHelper: this.tracingHelper, logLevel: this.config.logLevel ?? "error", logQueries: this.config.logQueries, engineHash: this.engineHash }), this.remoteClientVersion = await Il(this.host, this.config), $t("host", this.host), $t("protocol", this.protocol);
        })(), await this.startPromise;
      }
      async stop() {
      }
      propagateResponseExtensions(r2) {
        r2?.logs?.length && r2.logs.forEach((t2) => {
          switch (t2.level) {
            case "debug":
            case "trace":
              $t(t2);
              break;
            case "error":
            case "warn":
            case "info": {
              this.logEmitter.emit(t2.level, { timestamp: po(t2.timestamp), message: t2.attributes.message ?? "", target: t2.target ?? "BinaryEngine" });
              break;
            }
            case "query": {
              this.logEmitter.emit("query", { query: t2.attributes.query ?? "", timestamp: po(t2.timestamp), duration: t2.attributes.duration_ms ?? 0, params: t2.attributes.params ?? "", target: t2.target ?? "BinaryEngine" });
              break;
            }
            default:
              t2.level;
          }
        }), r2?.traces?.length && this.tracingHelper.dispatchEngineSpans(r2.traces);
      }
      onBeforeExit() {
        throw new Error('"beforeExit" hook is not applicable to the remote query engine');
      }
      async url(r2) {
        return await this.start(), `${this.protocol}//${this.host}/${this.remoteClientVersion}/${this.inlineSchemaHash}/${r2}`;
      }
      async uploadSchema() {
        let r2 = { name: "schemaUpload", internal: true };
        return this.tracingHelper.runInChildSpan(r2, async () => {
          let t2 = await dr(await this.url("schema"), { method: "PUT", headers: this.headerBuilder.build(), body: this.inlineSchema, clientVersion: this.clientVersion });
          t2.ok || $t("schema response status", t2.status);
          let n2 = await Ft(t2, this.clientVersion);
          if (n2)
            throw this.logEmitter.emit("warn", { message: `Error while uploading schema: ${n2.message}`, timestamp: /* @__PURE__ */ new Date(), target: "" }), n2;
          this.logEmitter.emit("info", { message: `Schema (re)uploaded (hash: ${this.inlineSchemaHash})`, timestamp: /* @__PURE__ */ new Date(), target: "" });
        });
      }
      request(r2, { traceparent: t2, interactiveTransaction: n2, customDataProxyFetch: i }) {
        return this.requestInternal({ body: r2, traceparent: t2, interactiveTransaction: n2, customDataProxyFetch: i });
      }
      async requestBatch(r2, { traceparent: t2, transaction: n2, customDataProxyFetch: i }) {
        let o2 = n2?.kind === "itx" ? n2.options : void 0, s = Mr(r2, n2);
        return (await this.requestInternal({ body: s, customDataProxyFetch: i, interactiveTransaction: o2, traceparent: t2 })).map((l) => (l.extensions && this.propagateResponseExtensions(l.extensions), "errors" in l ? this.convertProtocolErrorsToClientError(l.errors) : l));
      }
      requestInternal({ body: r2, traceparent: t2, customDataProxyFetch: n2, interactiveTransaction: i }) {
        return this.withRetry({ actionGerund: "querying", callback: async ({ logHttpCall: o2 }) => {
          let s = i ? `${i.payload.endpoint}/graphql` : await this.url("graphql");
          o2(s);
          let a = await dr(s, { method: "POST", headers: this.headerBuilder.build({ traceparent: t2, transactionId: i?.id }), body: JSON.stringify(r2), clientVersion: this.clientVersion }, n2);
          a.ok || $t("graphql response status", a.status), await this.handleError(await Ft(a, this.clientVersion));
          let l = await a.json();
          if (l.extensions && this.propagateResponseExtensions(l.extensions), "errors" in l)
            throw this.convertProtocolErrorsToClientError(l.errors);
          return "batchResult" in l ? l.batchResult : l;
        } });
      }
      async transaction(r2, t2, n2) {
        let i = { start: "starting", commit: "committing", rollback: "rolling back" };
        return this.withRetry({ actionGerund: `${i[r2]} transaction`, callback: async ({ logHttpCall: o2 }) => {
          if (r2 === "start") {
            let s = JSON.stringify({ max_wait: n2.maxWait, timeout: n2.timeout, isolation_level: n2.isolationLevel }), a = await this.url("transaction/start");
            o2(a);
            let l = await dr(a, { method: "POST", headers: this.headerBuilder.build({ traceparent: t2.traceparent }), body: s, clientVersion: this.clientVersion });
            await this.handleError(await Ft(l, this.clientVersion));
            let u = await l.json(), { extensions: c } = u;
            c && this.propagateResponseExtensions(c);
            let p2 = u.id, d2 = u["data-proxy"].endpoint;
            return { id: p2, payload: { endpoint: d2 } };
          } else {
            let s = `${n2.payload.endpoint}/${r2}`;
            o2(s);
            let a = await dr(s, { method: "POST", headers: this.headerBuilder.build({ traceparent: t2.traceparent }), clientVersion: this.clientVersion });
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
      async withRetry(r2) {
        for (let t2 = 0; ; t2++) {
          let n2 = (i) => {
            this.logEmitter.emit("info", { message: `Calling ${i} (n=${t2})`, timestamp: /* @__PURE__ */ new Date(), target: "" });
          };
          try {
            return await r2.callback({ logHttpCall: n2 });
          } catch (i) {
            if (!(i instanceof oe) || !i.isRetryable)
              throw i;
            if (t2 >= Dl)
              throw i instanceof Br ? i.cause : i;
            this.logEmitter.emit("warn", { message: `Attempt ${t2 + 1}/${Dl} failed for ${r2.actionGerund}: ${i.message ?? "(unknown)"}`, timestamp: /* @__PURE__ */ new Date(), target: "" });
            let o2 = await Tl(t2);
            this.logEmitter.emit("warn", { message: `Retrying after ${o2}ms`, timestamp: /* @__PURE__ */ new Date(), target: "" });
          }
        }
      }
      async handleError(r2) {
        if (r2 instanceof pr)
          throw await this.uploadSchema(), new Br({ clientVersion: this.clientVersion, cause: r2 });
        if (r2)
          throw r2;
      }
      convertProtocolErrorsToClientError(r2) {
        return r2.length === 1 ? $r(r2[0], this.config.clientVersion, this.config.activeProvider) : new V(JSON.stringify(r2), { clientVersion: this.config.clientVersion });
      }
      applyPendingMigrations() {
        throw new Error("Method not implemented.");
      }
    };
    function Ol(e2) {
      if (e2?.kind === "itx")
        return e2.options.id;
    }
    var wo = O(__require("os"));
    var kl = O(__require("path"));
    var Eo = Symbol("PrismaLibraryEngineCache");
    function ff() {
      let e2 = globalThis;
      return e2[Eo] === void 0 && (e2[Eo] = {}), e2[Eo];
    }
    function gf(e2) {
      let r2 = ff();
      if (r2[e2] !== void 0)
        return r2[e2];
      let t2 = kl.default.toNamespacedPath(e2), n2 = { exports: {} }, i = 0;
      return process.platform !== "win32" && (i = wo.default.constants.dlopen.RTLD_LAZY | wo.default.constants.dlopen.RTLD_DEEPBIND), process.dlopen(n2, t2, i), r2[e2] = n2.exports, n2.exports;
    }
    var _l = { async loadLibrary(e2) {
      let r2 = await fi(), t2 = await ml("library", e2);
      try {
        return e2.tracingHelper.runInChildSpan({ name: "loadLibrary", internal: true }, () => gf(t2));
      } catch (n2) {
        let i = Ai({ e: n2, platformInfo: r2, id: t2 });
        throw new P(i, e2.clientVersion);
      }
    } };
    var xo;
    var Nl = { async loadLibrary(e2) {
      let { clientVersion: r2, adapter: t2, engineWasm: n2 } = e2;
      if (t2 === void 0)
        throw new P(`The \`adapter\` option for \`PrismaClient\` is required in this context (${Kn().prettyName})`, r2);
      if (n2 === void 0)
        throw new P("WASM engine was unexpectedly `undefined`", r2);
      xo === void 0 && (xo = (async () => {
        let o2 = await n2.getRuntime(), s = await n2.getQueryEngineWasmModule();
        if (s == null)
          throw new P("The loaded wasm module was unexpectedly `undefined` or `null` once loaded", r2);
        let a = { "./query_engine_bg.js": o2 }, l = new WebAssembly.Instance(s, a), u = l.exports.__wbindgen_start;
        return o2.__wbg_set_wasm(l.exports), u(), o2.QueryEngine;
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
    function yf(e2) {
      return e2.item_type === "query" && "query" in e2;
    }
    function bf(e2) {
      return "level" in e2 ? e2.level === "error" && e2.message === "PANIC" : false;
    }
    var Ll = [...li, "native"];
    var Ef = 0xffffffffffffffffn;
    var vo = 1n;
    function wf() {
      let e2 = vo++;
      return vo > Ef && (vo = 1n), e2;
    }
    var Qr = class {
      constructor(r2, t2) {
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
        this.libraryLoader = t2 ?? _l, r2.engineWasm !== void 0 && (this.libraryLoader = t2 ?? Nl), this.config = r2, this.libraryStarted = false, this.logQueries = r2.logQueries ?? false, this.logLevel = r2.logLevel ?? "error", this.logEmitter = r2.logEmitter, this.datamodel = r2.inlineSchema, this.tracingHelper = r2.tracingHelper, r2.enableDebugLogs && (this.logLevel = "debug");
        let n2 = Object.keys(r2.overrideDatasources)[0], i = r2.overrideDatasources[n2]?.url;
        n2 !== void 0 && i !== void 0 && (this.datasourceOverrides = { [n2]: i }), this.libraryInstantiationPromise = this.instantiateLibrary();
      }
      wrapEngine(r2) {
        return { applyPendingMigrations: r2.applyPendingMigrations?.bind(r2), commitTransaction: this.withRequestId(r2.commitTransaction.bind(r2)), connect: this.withRequestId(r2.connect.bind(r2)), disconnect: this.withRequestId(r2.disconnect.bind(r2)), metrics: r2.metrics?.bind(r2), query: this.withRequestId(r2.query.bind(r2)), rollbackTransaction: this.withRequestId(r2.rollbackTransaction.bind(r2)), sdlSchema: r2.sdlSchema?.bind(r2), startTransaction: this.withRequestId(r2.startTransaction.bind(r2)), trace: r2.trace.bind(r2), free: r2.free?.bind(r2) };
      }
      withRequestId(r2) {
        return async (...t2) => {
          let n2 = wf().toString();
          try {
            return await r2(...t2, n2);
          } finally {
            if (this.tracingHelper.isEnabled()) {
              let i = await this.engine?.trace(n2);
              if (i) {
                let o2 = JSON.parse(i);
                this.tracingHelper.dispatchEngineSpans(o2.spans);
              }
            }
          }
        };
      }
      async applyPendingMigrations() {
        throw new Error("Cannot call this method from this type of engine instance");
      }
      async transaction(r2, t2, n2) {
        await this.start();
        let i = await this.adapterPromise, o2 = JSON.stringify(t2), s;
        if (r2 === "start") {
          let l = JSON.stringify({ max_wait: n2.maxWait, timeout: n2.timeout, isolation_level: n2.isolationLevel });
          s = await this.engine?.startTransaction(l, o2);
        } else
          r2 === "commit" ? s = await this.engine?.commitTransaction(n2.id, o2) : r2 === "rollback" && (s = await this.engine?.rollbackTransaction(n2.id, o2));
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
          let r2 = await this.tracingHelper.runInChildSpan("detect_platform", () => ir());
          if (!Ll.includes(r2))
            throw new P(`Unknown ${ce("PRISMA_QUERY_ENGINE_LIBRARY")} ${ce(W(r2))}. Possible binaryTargets: ${qe(Ll.join(", "))} or a path to the query engine library.
You may have to run ${qe("prisma generate")} for your changes to take effect.`, this.config.clientVersion);
          return r2;
        }
      }
      parseEngineResponse(r2) {
        if (!r2)
          throw new V("Response from the Engine was empty", { clientVersion: this.config.clientVersion });
        try {
          return JSON.parse(r2);
        } catch {
          throw new V("Unable to JSON.parse response from engine", { clientVersion: this.config.clientVersion });
        }
      }
      async loadEngine() {
        if (!this.engine) {
          this.QueryEngineConstructor || (this.library = await this.libraryLoader.loadLibrary(this.config), this.QueryEngineConstructor = this.library.QueryEngine);
          try {
            let r2 = new WeakRef(this);
            this.adapterPromise || (this.adapterPromise = this.config.adapter?.connect()?.then(tn));
            let t2 = await this.adapterPromise;
            t2 && Re("Using driver adapter: %O", t2), this.engine = this.wrapEngine(new this.QueryEngineConstructor({ datamodel: this.datamodel, env: process.env, logQueries: this.config.logQueries ?? false, ignoreEnvVarErrors: true, datasourceOverrides: this.datasourceOverrides ?? {}, logLevel: this.logLevel, configDir: this.config.cwd, engineProtocol: "json", enableTracing: this.tracingHelper.isEnabled() }, (n2) => {
              r2.deref()?.logger(n2);
            }, t2));
          } catch (r2) {
            let t2 = r2, n2 = this.parseInitError(t2.message);
            throw typeof n2 == "string" ? t2 : new P(n2.message, this.config.clientVersion, n2.error_code);
          }
        }
      }
      logger(r2) {
        let t2 = this.parseEngineResponse(r2);
        t2 && (t2.level = t2?.level.toLowerCase() ?? "unknown", yf(t2) ? this.logEmitter.emit("query", { timestamp: /* @__PURE__ */ new Date(), query: t2.query, params: t2.params, duration: Number(t2.duration_ms), target: t2.module_path }) : bf(t2) ? this.loggerRustPanic = new ae(Po(this, `${t2.message}: ${t2.reason} in ${t2.file}:${t2.line}:${t2.column}`), this.config.clientVersion) : this.logEmitter.emit(t2.level, { timestamp: /* @__PURE__ */ new Date(), message: t2.message, target: t2.module_path }));
      }
      parseInitError(r2) {
        try {
          return JSON.parse(r2);
        } catch {
        }
        return r2;
      }
      parseRequestError(r2) {
        try {
          return JSON.parse(r2);
        } catch {
        }
        return r2;
      }
      onBeforeExit() {
        throw new Error('"beforeExit" hook is not applicable to the library engine since Prisma 5.0.0, it is only relevant and implemented for the binary engine. Please add your event listener to the `process` object directly instead.');
      }
      async start() {
        if (this.libraryInstantiationPromise || (this.libraryInstantiationPromise = this.instantiateLibrary()), await this.libraryInstantiationPromise, await this.libraryStoppingPromise, this.libraryStartingPromise)
          return Re(`library already starting, this.libraryStarted: ${this.libraryStarted}`), this.libraryStartingPromise;
        if (this.libraryStarted)
          return;
        let r2 = async () => {
          Re("library starting");
          try {
            let t2 = { traceparent: this.tracingHelper.getTraceParent() };
            await this.engine?.connect(JSON.stringify(t2)), this.libraryStarted = true, this.adapterPromise || (this.adapterPromise = this.config.adapter?.connect()?.then(tn)), await this.adapterPromise, Re("library started");
          } catch (t2) {
            let n2 = this.parseInitError(t2.message);
            throw typeof n2 == "string" ? t2 : new P(n2.message, this.config.clientVersion, n2.error_code);
          } finally {
            this.libraryStartingPromise = void 0;
          }
        };
        return this.libraryStartingPromise = this.tracingHelper.runInChildSpan("connect", r2), this.libraryStartingPromise;
      }
      async stop() {
        if (await this.libraryInstantiationPromise, await this.libraryStartingPromise, await this.executingQueryPromise, this.libraryStoppingPromise)
          return Re("library is already stopping"), this.libraryStoppingPromise;
        if (!this.libraryStarted) {
          await (await this.adapterPromise)?.dispose(), this.adapterPromise = void 0;
          return;
        }
        let r2 = async () => {
          await new Promise((n2) => setImmediate(n2)), Re("library stopping");
          let t2 = { traceparent: this.tracingHelper.getTraceParent() };
          await this.engine?.disconnect(JSON.stringify(t2)), this.engine?.free && this.engine.free(), this.engine = void 0, this.libraryStarted = false, this.libraryStoppingPromise = void 0, this.libraryInstantiationPromise = void 0, await (await this.adapterPromise)?.dispose(), this.adapterPromise = void 0, Re("library stopped");
        };
        return this.libraryStoppingPromise = this.tracingHelper.runInChildSpan("disconnect", r2), this.libraryStoppingPromise;
      }
      version() {
        return this.versionInfo = this.library?.version(), this.versionInfo?.version ?? "unknown";
      }
      debugPanic(r2) {
        return this.library?.debugPanic(r2);
      }
      async request(r2, { traceparent: t2, interactiveTransaction: n2 }) {
        Re(`sending request, this.libraryStarted: ${this.libraryStarted}`);
        let i = JSON.stringify({ traceparent: t2 }), o2 = JSON.stringify(r2);
        try {
          await this.start();
          let s = await this.adapterPromise;
          this.executingQueryPromise = this.engine?.query(o2, i, n2?.id), this.lastQuery = o2;
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
      async requestBatch(r2, { transaction: t2, traceparent: n2 }) {
        Re("requestBatch");
        let i = Mr(r2, t2);
        await this.start();
        let o2 = await this.adapterPromise;
        this.lastQuery = JSON.stringify(i), this.executingQueryPromise = this.engine?.query(this.lastQuery, JSON.stringify({ traceparent: n2 }), Ol(t2));
        let s = await this.executingQueryPromise, a = this.parseEngineResponse(s);
        if (a.errors)
          throw a.errors.length === 1 ? this.buildQueryError(a.errors[0], o2?.errorRegistry) : new V(JSON.stringify(a.errors), { clientVersion: this.config.clientVersion });
        let { batchResult: l, errors: u } = a;
        if (Array.isArray(l))
          return l.map((c) => c.errors && c.errors.length > 0 ? this.loggerRustPanic ?? this.buildQueryError(c.errors[0], o2?.errorRegistry) : { data: c });
        throw u && u.length === 1 ? new Error(u[0].error) : new Error(JSON.stringify(a));
      }
      buildQueryError(r2, t2) {
        if (r2.user_facing_error.is_panic)
          return new ae(Po(this, r2.user_facing_error.message), this.config.clientVersion);
        let n2 = this.getExternalAdapterError(r2.user_facing_error, t2);
        return n2 ? n2.error : $r(r2, this.config.clientVersion, this.config.activeProvider);
      }
      getExternalAdapterError(r2, t2) {
        if (r2.error_code === hf && t2) {
          let n2 = r2.meta?.id;
          ln(typeof n2 == "number", "Malformed external JS error received from the engine");
          let i = t2.consumeError(n2);
          return ln(i, "External error with reported id was not registered"), i;
        }
      }
      async metrics(r2) {
        await this.start();
        let t2 = await this.engine.metrics(JSON.stringify(r2));
        return r2.format === "prometheus" ? t2 : this.parseEngineResponse(t2);
      }
    };
    function xf(e2) {
      return typeof e2 == "object" && e2 !== null && e2.error_code !== void 0;
    }
    function Po(e2, r2) {
      return El({ binaryTarget: e2.binaryTarget, title: r2, version: e2.config.clientVersion, engineVersion: e2.versionInfo?.commit, database: e2.config.activeProvider, query: e2.lastQuery });
    }
    function Fl({ url: e2, adapter: r2, copyEngine: t2, targetBuildType: n2 }) {
      let i = [], o2 = [], s = (g2) => {
        i.push({ _tag: "warning", value: g2 });
      }, a = (g2) => {
        let I2 = g2.join(`
`);
        o2.push({ _tag: "error", value: I2 });
      }, l = !!e2?.startsWith("prisma://"), u = an(e2), c = !!r2, p2 = l || u;
      !c && t2 && p2 && n2 !== "client" && n2 !== "wasm-compiler-edge" && s(["recommend--no-engine", "In production, we recommend using `prisma generate --no-engine` (See: `prisma generate --help`)"]);
      let d2 = p2 || !t2;
      c && (d2 || n2 === "edge") && (p2 ? a(["You've provided both a driver adapter and an Accelerate database URL. Driver adapters currently cannot connect to Accelerate.", "Please provide either a driver adapter with a direct database URL or an Accelerate URL and no driver adapter."]) : t2 || a(["Prisma Client was configured to use the `adapter` option but `prisma generate` was run with `--no-engine`.", "Please run `prisma generate` without `--no-engine` to be able to use Prisma Client with the adapter."]));
      let f = { accelerate: d2, ppg: u, driverAdapters: c };
      function h(g2) {
        return g2.length > 0;
      }
      return h(o2) ? { ok: false, diagnostics: { warnings: i, errors: o2 }, isUsing: f } : { ok: true, diagnostics: { warnings: i }, isUsing: f };
    }
    function Ml({ copyEngine: e2 = true }, r2) {
      let t2;
      try {
        t2 = jr({ inlineDatasources: r2.inlineDatasources, overrideDatasources: r2.overrideDatasources, env: { ...r2.env, ...process.env }, clientVersion: r2.clientVersion });
      } catch {
      }
      let { ok: n2, isUsing: i, diagnostics: o2 } = Fl({ url: t2, adapter: r2.adapter, copyEngine: e2, targetBuildType: "library" });
      for (let p2 of o2.warnings)
        at(...p2.value);
      if (!n2) {
        let p2 = o2.errors[0];
        throw new Z2(p2.value, { clientVersion: r2.clientVersion });
      }
      let s = Er(r2.generator), a = s === "library"; (i.accelerate || i.ppg) && !i.driverAdapters;
      return i.accelerate ? new qt(r2) : (i.driverAdapters, a ? new Qr(r2) : (i.accelerate, new Qr(r2)));
    }
    function $l({ generator: e2 }) {
      return e2?.previewFeatures ?? [];
    }
    var ql = (e2) => ({ command: e2 });
    var Vl = (e2) => e2.strings.reduce((r2, t2, n2) => `${r2}@P${n2}${t2}`);
    function Wr(e2) {
      try {
        return jl(e2, "fast");
      } catch {
        return jl(e2, "slow");
      }
    }
    function jl(e2, r2) {
      return JSON.stringify(e2.map((t2) => Ul(t2, r2)));
    }
    function Ul(e2, r2) {
      if (Array.isArray(e2))
        return e2.map((t2) => Ul(t2, r2));
      if (typeof e2 == "bigint")
        return { prisma__type: "bigint", prisma__value: e2.toString() };
      if (vr(e2))
        return { prisma__type: "date", prisma__value: e2.toJSON() };
      if (Fe.isDecimal(e2))
        return { prisma__type: "decimal", prisma__value: e2.toJSON() };
      if (Buffer.isBuffer(e2))
        return { prisma__type: "bytes", prisma__value: e2.toString("base64") };
      if (vf(e2))
        return { prisma__type: "bytes", prisma__value: Buffer.from(e2).toString("base64") };
      if (ArrayBuffer.isView(e2)) {
        let { buffer: t2, byteOffset: n2, byteLength: i } = e2;
        return { prisma__type: "bytes", prisma__value: Buffer.from(t2, n2, i).toString("base64") };
      }
      return typeof e2 == "object" && r2 === "slow" ? Gl(e2) : e2;
    }
    function vf(e2) {
      return e2 instanceof ArrayBuffer || e2 instanceof SharedArrayBuffer ? true : typeof e2 == "object" && e2 !== null ? e2[Symbol.toStringTag] === "ArrayBuffer" || e2[Symbol.toStringTag] === "SharedArrayBuffer" : false;
    }
    function Gl(e2) {
      if (typeof e2 != "object" || e2 === null)
        return e2;
      if (typeof e2.toJSON == "function")
        return e2.toJSON();
      if (Array.isArray(e2))
        return e2.map(Bl);
      let r2 = {};
      for (let t2 of Object.keys(e2))
        r2[t2] = Bl(e2[t2]);
      return r2;
    }
    function Bl(e2) {
      return typeof e2 == "bigint" ? e2.toString() : Gl(e2);
    }
    var Pf = /^(\s*alter\s)/i;
    var Ql = N("prisma:client");
    function To(e2, r2, t2, n2) {
      if (!(e2 !== "postgresql" && e2 !== "cockroachdb") && t2.length > 0 && Pf.exec(r2))
        throw new Error(`Running ALTER using ${n2} is not supported
Using the example below you can still execute your query with Prisma, but please note that it is vulnerable to SQL injection attacks and requires you to take care of input sanitization.

Example:
  await prisma.$executeRawUnsafe(\`ALTER USER prisma WITH PASSWORD '\${password}'\`)

More Information: https://pris.ly/d/execute-raw
`);
    }
    var So = ({ clientMethod: e2, activeProvider: r2 }) => (t2) => {
      let n2 = "", i;
      if (Vn(t2))
        n2 = t2.sql, i = { values: Wr(t2.values), __prismaRawParameters__: true };
      else if (Array.isArray(t2)) {
        let [o2, ...s] = t2;
        n2 = o2, i = { values: Wr(s || []), __prismaRawParameters__: true };
      } else
        switch (r2) {
          case "sqlite":
          case "mysql": {
            n2 = t2.sql, i = { values: Wr(t2.values), __prismaRawParameters__: true };
            break;
          }
          case "cockroachdb":
          case "postgresql":
          case "postgres": {
            n2 = t2.text, i = { values: Wr(t2.values), __prismaRawParameters__: true };
            break;
          }
          case "sqlserver": {
            n2 = Vl(t2), i = { values: Wr(t2.values), __prismaRawParameters__: true };
            break;
          }
          default:
            throw new Error(`The ${r2} provider does not support ${e2}`);
        }
      return i?.values ? Ql(`prisma.${e2}(${n2}, ${i.values})`) : Ql(`prisma.${e2}(${n2})`), { query: n2, parameters: i };
    };
    var Wl = { requestArgsToMiddlewareArgs(e2) {
      return [e2.strings, ...e2.values];
    }, middlewareArgsToRequestArgs(e2) {
      let [r2, ...t2] = e2;
      return new ie(r2, t2);
    } };
    var Jl = { requestArgsToMiddlewareArgs(e2) {
      return [e2];
    }, middlewareArgsToRequestArgs(e2) {
      return e2[0];
    } };
    function Ro(e2) {
      return function(t2, n2) {
        let i, o2 = (s = e2) => {
          try {
            return s === void 0 || s?.kind === "itx" ? i ?? (i = Kl(t2(s))) : Kl(t2(s));
          } catch (a) {
            return Promise.reject(a);
          }
        };
        return { get spec() {
          return n2;
        }, then(s, a) {
          return o2().then(s, a);
        }, catch(s) {
          return o2().catch(s);
        }, finally(s) {
          return o2().finally(s);
        }, requestTransaction(s) {
          let a = o2(s);
          return a.requestTransaction ? a.requestTransaction(s) : a;
        }, [Symbol.toStringTag]: "PrismaPromise" };
      };
    }
    function Kl(e2) {
      return typeof e2.then == "function" ? e2 : Promise.resolve(e2);
    }
    var Tf = xi.split(".")[0];
    var Sf = { isEnabled() {
      return false;
    }, getTraceParent() {
      return "00-10-10-00";
    }, dispatchEngineSpans() {
    }, getActiveContext() {
    }, runInChildSpan(e2, r2) {
      return r2();
    } };
    var Ao = class {
      isEnabled() {
        return this.getGlobalTracingHelper().isEnabled();
      }
      getTraceParent(r2) {
        return this.getGlobalTracingHelper().getTraceParent(r2);
      }
      dispatchEngineSpans(r2) {
        return this.getGlobalTracingHelper().dispatchEngineSpans(r2);
      }
      getActiveContext() {
        return this.getGlobalTracingHelper().getActiveContext();
      }
      runInChildSpan(r2, t2) {
        return this.getGlobalTracingHelper().runInChildSpan(r2, t2);
      }
      getGlobalTracingHelper() {
        let r2 = globalThis[`V${Tf}_PRISMA_INSTRUMENTATION`], t2 = globalThis.PRISMA_INSTRUMENTATION;
        return r2?.helper ?? t2?.helper ?? Sf;
      }
    };
    function Hl() {
      return new Ao();
    }
    function Yl(e2, r2 = () => {
    }) {
      let t2, n2 = new Promise((i) => t2 = i);
      return { then(i) {
        return --e2 === 0 && t2(r2()), i?.(n2);
      } };
    }
    function zl(e2) {
      return typeof e2 == "string" ? e2 : e2.reduce((r2, t2) => {
        let n2 = typeof t2 == "string" ? t2 : t2.level;
        return n2 === "query" ? r2 : r2 && (t2 === "info" || r2 === "info") ? "info" : n2;
      }, void 0);
    }
    function zn(e2) {
      return typeof e2.batchRequestIdx == "number";
    }
    function Zl(e2) {
      if (e2.action !== "findUnique" && e2.action !== "findUniqueOrThrow")
        return;
      let r2 = [];
      return e2.modelName && r2.push(e2.modelName), e2.query.arguments && r2.push(Co(e2.query.arguments)), r2.push(Co(e2.query.selection)), r2.join("");
    }
    function Co(e2) {
      return `(${Object.keys(e2).sort().map((t2) => {
        let n2 = e2[t2];
        return typeof n2 == "object" && n2 !== null ? `(${t2} ${Co(n2)})` : t2;
      }).join(" ")})`;
    }
    var Rf = { aggregate: false, aggregateRaw: false, createMany: true, createManyAndReturn: true, createOne: true, deleteMany: true, deleteOne: true, executeRaw: true, findFirst: false, findFirstOrThrow: false, findMany: false, findRaw: false, findUnique: false, findUniqueOrThrow: false, groupBy: false, queryRaw: false, runCommandRaw: true, updateMany: true, updateManyAndReturn: true, updateOne: true, upsertOne: true };
    function Io(e2) {
      return Rf[e2];
    }
    var Zn = class {
      constructor(r2) {
        __publicField(this, "batches");
        __publicField(this, "tickActive", false);
        this.options = r2;
        this.batches = {};
      }
      request(r2) {
        let t2 = this.options.batchBy(r2);
        return t2 ? (this.batches[t2] || (this.batches[t2] = [], this.tickActive || (this.tickActive = true, process.nextTick(() => {
          this.dispatchBatches(), this.tickActive = false;
        }))), new Promise((n2, i) => {
          this.batches[t2].push({ request: r2, resolve: n2, reject: i });
        })) : this.options.singleLoader(r2);
      }
      dispatchBatches() {
        for (let r2 in this.batches) {
          let t2 = this.batches[r2];
          delete this.batches[r2], t2.length === 1 ? this.options.singleLoader(t2[0].request).then((n2) => {
            n2 instanceof Error ? t2[0].reject(n2) : t2[0].resolve(n2);
          }).catch((n2) => {
            t2[0].reject(n2);
          }) : (t2.sort((n2, i) => this.options.batchOrder(n2.request, i.request)), this.options.batchLoader(t2.map((n2) => n2.request)).then((n2) => {
            if (n2 instanceof Error)
              for (let i = 0; i < t2.length; i++)
                t2[i].reject(n2);
            else
              for (let i = 0; i < t2.length; i++) {
                let o2 = n2[i];
                o2 instanceof Error ? t2[i].reject(o2) : t2[i].resolve(o2);
              }
          }).catch((n2) => {
            for (let i = 0; i < t2.length; i++)
              t2[i].reject(n2);
          }));
        }
      }
      get [Symbol.toStringTag]() {
        return "DataLoader";
      }
    };
    function mr(e2, r2) {
      if (r2 === null)
        return r2;
      switch (e2) {
        case "bigint":
          return BigInt(r2);
        case "bytes": {
          let { buffer: t2, byteOffset: n2, byteLength: i } = Buffer.from(r2, "base64");
          return new Uint8Array(t2, n2, i);
        }
        case "decimal":
          return new Fe(r2);
        case "datetime":
        case "date":
          return new Date(r2);
        case "time":
          return /* @__PURE__ */ new Date(`1970-01-01T${r2}Z`);
        case "bigint-array":
          return r2.map((t2) => mr("bigint", t2));
        case "bytes-array":
          return r2.map((t2) => mr("bytes", t2));
        case "decimal-array":
          return r2.map((t2) => mr("decimal", t2));
        case "datetime-array":
          return r2.map((t2) => mr("datetime", t2));
        case "date-array":
          return r2.map((t2) => mr("date", t2));
        case "time-array":
          return r2.map((t2) => mr("time", t2));
        default:
          return r2;
      }
    }
    function Xn(e2) {
      let r2 = [], t2 = Af(e2);
      for (let n2 = 0; n2 < e2.rows.length; n2++) {
        let i = e2.rows[n2], o2 = { ...t2 };
        for (let s = 0; s < i.length; s++)
          o2[e2.columns[s]] = mr(e2.types[s], i[s]);
        r2.push(o2);
      }
      return r2;
    }
    function Af(e2) {
      let r2 = {};
      for (let t2 = 0; t2 < e2.columns.length; t2++)
        r2[e2.columns[t2]] = null;
      return r2;
    }
    var Cf = N("prisma:client:request_handler");
    var ei = class {
      constructor(r2, t2) {
        __publicField(this, "client");
        __publicField(this, "dataloader");
        __publicField(this, "logEmitter");
        this.logEmitter = t2, this.client = r2, this.dataloader = new Zn({ batchLoader: rl(async ({ requests: n2, customDataProxyFetch: i }) => {
          let { transaction: o2, otelParentCtx: s } = n2[0], a = n2.map((p2) => p2.protocolQuery), l = this.client._tracingHelper.getTraceParent(s), u = n2.some((p2) => Io(p2.protocolQuery.action));
          return (await this.client._engine.requestBatch(a, { traceparent: l, transaction: If(o2), containsWrite: u, customDataProxyFetch: i })).map((p2, d2) => {
            if (p2 instanceof Error)
              return p2;
            try {
              return this.mapQueryEngineResult(n2[d2], p2);
            } catch (f) {
              return f;
            }
          });
        }), singleLoader: async (n2) => {
          let i = n2.transaction?.kind === "itx" ? Xl(n2.transaction) : void 0, o2 = await this.client._engine.request(n2.protocolQuery, { traceparent: this.client._tracingHelper.getTraceParent(), interactiveTransaction: i, isWrite: Io(n2.protocolQuery.action), customDataProxyFetch: n2.customDataProxyFetch });
          return this.mapQueryEngineResult(n2, o2);
        }, batchBy: (n2) => n2.transaction?.id ? `transaction-${n2.transaction.id}` : Zl(n2.protocolQuery), batchOrder(n2, i) {
          return n2.transaction?.kind === "batch" && i.transaction?.kind === "batch" ? n2.transaction.index - i.transaction.index : 0;
        } });
      }
      async request(r2) {
        try {
          return await this.dataloader.request(r2);
        } catch (t2) {
          let { clientMethod: n2, callsite: i, transaction: o2, args: s, modelName: a } = r2;
          this.handleAndLogRequestError({ error: t2, clientMethod: n2, callsite: i, transaction: o2, args: s, modelName: a, globalOmit: r2.globalOmit });
        }
      }
      mapQueryEngineResult({ dataPath: r2, unpacker: t2 }, n2) {
        let i = n2?.data, o2 = this.unpack(i, r2, t2);
        return process.env.PRISMA_CLIENT_GET_TIME ? { data: o2 } : o2;
      }
      handleAndLogRequestError(r2) {
        try {
          this.handleRequestError(r2);
        } catch (t2) {
          throw this.logEmitter && this.logEmitter.emit("error", { message: t2.message, target: r2.clientMethod, timestamp: /* @__PURE__ */ new Date() }), t2;
        }
      }
      handleRequestError({ error: r2, clientMethod: t2, callsite: n2, transaction: i, args: o2, modelName: s, globalOmit: a }) {
        if (Cf(r2), Df(r2, i))
          throw r2;
        if (r2 instanceof z2 && Of(r2)) {
          let u = eu(r2.meta);
          Nn({ args: o2, errors: [u], callsite: n2, errorFormat: this.client._errorFormat, originalMethod: t2, clientVersion: this.client._clientVersion, globalOmit: a });
        }
        let l = r2.message;
        if (n2 && (l = Tn({ callsite: n2, originalMethod: t2, isPanic: r2.isPanic, showColors: this.client._errorFormat === "pretty", message: l })), l = this.sanitizeMessage(l), r2.code) {
          let u = s ? { modelName: s, ...r2.meta } : r2.meta;
          throw new z2(l, { code: r2.code, clientVersion: this.client._clientVersion, meta: u, batchRequestIdx: r2.batchRequestIdx });
        } else {
          if (r2.isPanic)
            throw new ae(l, this.client._clientVersion);
          if (r2 instanceof V)
            throw new V(l, { clientVersion: this.client._clientVersion, batchRequestIdx: r2.batchRequestIdx });
          if (r2 instanceof P)
            throw new P(l, this.client._clientVersion);
          if (r2 instanceof ae)
            throw new ae(l, this.client._clientVersion);
        }
        throw r2.clientVersion = this.client._clientVersion, r2;
      }
      sanitizeMessage(r2) {
        return this.client._errorFormat && this.client._errorFormat !== "pretty" ? wr(r2) : r2;
      }
      unpack(r2, t2, n2) {
        if (!r2 || (r2.data && (r2 = r2.data), !r2))
          return r2;
        let i = Object.keys(r2)[0], o2 = Object.values(r2)[0], s = t2.filter((u) => u !== "select" && u !== "include"), a = ao(o2, s), l = i === "queryRaw" ? Xn(a) : Vr(a);
        return n2 ? n2(l) : l;
      }
      get [Symbol.toStringTag]() {
        return "RequestHandler";
      }
    };
    function If(e2) {
      if (e2) {
        if (e2.kind === "batch")
          return { kind: "batch", options: { isolationLevel: e2.isolationLevel } };
        if (e2.kind === "itx")
          return { kind: "itx", options: Xl(e2) };
        ar(e2, "Unknown transaction kind");
      }
    }
    function Xl(e2) {
      return { id: e2.id, payload: e2.payload };
    }
    function Df(e2, r2) {
      return zn(e2) && r2?.kind === "batch" && e2.batchRequestIdx !== r2.index;
    }
    function Of(e2) {
      return e2.code === "P2009" || e2.code === "P2012";
    }
    function eu(e2) {
      if (e2.kind === "Union")
        return { kind: "Union", errors: e2.errors.map(eu) };
      if (Array.isArray(e2.selectionPath)) {
        let [, ...r2] = e2.selectionPath;
        return { ...e2, selectionPath: r2 };
      }
      return e2;
    }
    var ru = xl;
    var su = O(Ki());
    var _ = class extends Error {
      constructor(r2) {
        super(r2 + `
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
    var kf = { datasources: (e2, { datasourceNames: r2 }) => {
      if (e2) {
        if (typeof e2 != "object" || Array.isArray(e2))
          throw new _(`Invalid value ${JSON.stringify(e2)} for "datasources" provided to PrismaClient constructor`);
        for (let [t2, n2] of Object.entries(e2)) {
          if (!r2.includes(t2)) {
            let i = Jr(t2, r2) || ` Available datasources: ${r2.join(", ")}`;
            throw new _(`Unknown datasource ${t2} provided to PrismaClient constructor.${i}`);
          }
          if (typeof n2 != "object" || Array.isArray(n2))
            throw new _(`Invalid value ${JSON.stringify(e2)} for datasource "${t2}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
          if (n2 && typeof n2 == "object")
            for (let [i, o2] of Object.entries(n2)) {
              if (i !== "url")
                throw new _(`Invalid value ${JSON.stringify(e2)} for datasource "${t2}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
              if (typeof o2 != "string")
                throw new _(`Invalid value ${JSON.stringify(o2)} for datasource "${t2}" provided to PrismaClient constructor.
It should have this form: { url: "CONNECTION_STRING" }`);
            }
        }
      }
    }, adapter: (e2, r2) => {
      if (!e2 && Er(r2.generator) === "client")
        throw new _('Using engine type "client" requires a driver adapter to be provided to PrismaClient constructor.');
      if (e2 !== null) {
        if (e2 === void 0)
          throw new _('"adapter" property must not be undefined, use null to conditionally disable driver adapters.');
        if (Er(r2.generator) === "binary")
          throw new _('Cannot use a driver adapter with the "binary" Query Engine. Please use the "library" Query Engine.');
      }
    }, datasourceUrl: (e2) => {
      if (typeof e2 < "u" && typeof e2 != "string")
        throw new _(`Invalid value ${JSON.stringify(e2)} for "datasourceUrl" provided to PrismaClient constructor.
Expected string or undefined.`);
    }, errorFormat: (e2) => {
      if (e2) {
        if (typeof e2 != "string")
          throw new _(`Invalid value ${JSON.stringify(e2)} for "errorFormat" provided to PrismaClient constructor.`);
        if (!nu.includes(e2)) {
          let r2 = Jr(e2, nu);
          throw new _(`Invalid errorFormat ${e2} provided to PrismaClient constructor.${r2}`);
        }
      }
    }, log: (e2) => {
      if (!e2)
        return;
      if (!Array.isArray(e2))
        throw new _(`Invalid value ${JSON.stringify(e2)} for "log" provided to PrismaClient constructor.`);
      function r2(t2) {
        if (typeof t2 == "string" && !iu.includes(t2)) {
          let n2 = Jr(t2, iu);
          throw new _(`Invalid log level "${t2}" provided to PrismaClient constructor.${n2}`);
        }
      }
      for (let t2 of e2) {
        r2(t2);
        let n2 = { level: r2, emit: (i) => {
          let o2 = ["stdout", "event"];
          if (!o2.includes(i)) {
            let s = Jr(i, o2);
            throw new _(`Invalid value ${JSON.stringify(i)} for "emit" in logLevel provided to PrismaClient constructor.${s}`);
          }
        } };
        if (t2 && typeof t2 == "object")
          for (let [i, o2] of Object.entries(t2))
            if (n2[i])
              n2[i](o2);
            else
              throw new _(`Invalid property ${i} for "log" provided to PrismaClient constructor`);
      }
    }, transactionOptions: (e2) => {
      if (!e2)
        return;
      let r2 = e2.maxWait;
      if (r2 != null && r2 <= 0)
        throw new _(`Invalid value ${r2} for maxWait in "transactionOptions" provided to PrismaClient constructor. maxWait needs to be greater than 0`);
      let t2 = e2.timeout;
      if (t2 != null && t2 <= 0)
        throw new _(`Invalid value ${t2} for timeout in "transactionOptions" provided to PrismaClient constructor. timeout needs to be greater than 0`);
    }, omit: (e2, r2) => {
      if (typeof e2 != "object")
        throw new _('"omit" option is expected to be an object.');
      if (e2 === null)
        throw new _('"omit" option can not be `null`');
      let t2 = [];
      for (let [n2, i] of Object.entries(e2)) {
        let o2 = Nf(n2, r2.runtimeDataModel);
        if (!o2) {
          t2.push({ kind: "UnknownModel", modelKey: n2 });
          continue;
        }
        for (let [s, a] of Object.entries(i)) {
          let l = o2.fields.find((u) => u.name === s);
          if (!l) {
            t2.push({ kind: "UnknownField", modelKey: n2, fieldName: s });
            continue;
          }
          if (l.relationName) {
            t2.push({ kind: "RelationInOmit", modelKey: n2, fieldName: s });
            continue;
          }
          typeof a != "boolean" && t2.push({ kind: "InvalidFieldValue", modelKey: n2, fieldName: s });
        }
      }
      if (t2.length > 0)
        throw new _(Lf(e2, t2));
    }, __internal: (e2) => {
      if (!e2)
        return;
      let r2 = ["debug", "engine", "configOverride"];
      if (typeof e2 != "object")
        throw new _(`Invalid value ${JSON.stringify(e2)} for "__internal" to PrismaClient constructor`);
      for (let [t2] of Object.entries(e2))
        if (!r2.includes(t2)) {
          let n2 = Jr(t2, r2);
          throw new _(`Invalid property ${JSON.stringify(t2)} for "__internal" provided to PrismaClient constructor.${n2}`);
        }
    } };
    function au(e2, r2) {
      for (let [t2, n2] of Object.entries(e2)) {
        if (!tu.includes(t2)) {
          let i = Jr(t2, tu);
          throw new _(`Unknown property ${t2} provided to PrismaClient constructor.${i}`);
        }
        kf[t2](n2, r2);
      }
      if (e2.datasourceUrl && e2.datasources)
        throw new _('Can not use "datasourceUrl" and "datasources" options at the same time. Pick one of them');
    }
    function Jr(e2, r2) {
      if (r2.length === 0 || typeof e2 != "string")
        return "";
      let t2 = _f(e2, r2);
      return t2 ? ` Did you mean "${t2}"?` : "";
    }
    function _f(e2, r2) {
      if (r2.length === 0)
        return null;
      let t2 = r2.map((i) => ({ value: i, distance: (0, su.default)(e2, i) }));
      t2.sort((i, o2) => i.distance < o2.distance ? -1 : 1);
      let n2 = t2[0];
      return n2.distance < 3 ? n2.value : null;
    }
    function Nf(e2, r2) {
      return ou(r2.models, e2) ?? ou(r2.types, e2);
    }
    function ou(e2, r2) {
      let t2 = Object.keys(e2).find((n2) => We(n2) === r2);
      if (t2)
        return e2[t2];
    }
    function Lf(e2, r2) {
      let t2 = _r(e2);
      for (let o2 of r2)
        switch (o2.kind) {
          case "UnknownModel":
            t2.arguments.getField(o2.modelKey)?.markAsError(), t2.addErrorMessage(() => `Unknown model name: ${o2.modelKey}.`);
            break;
          case "UnknownField":
            t2.arguments.getDeepField([o2.modelKey, o2.fieldName])?.markAsError(), t2.addErrorMessage(() => `Model "${o2.modelKey}" does not have a field named "${o2.fieldName}".`);
            break;
          case "RelationInOmit":
            t2.arguments.getDeepField([o2.modelKey, o2.fieldName])?.markAsError(), t2.addErrorMessage(() => 'Relations are already excluded by default and can not be specified in "omit".');
            break;
          case "InvalidFieldValue":
            t2.arguments.getDeepFieldValue([o2.modelKey, o2.fieldName])?.markAsError(), t2.addErrorMessage(() => "Omit field option value must be a boolean.");
            break;
        }
      let { message: n2, args: i } = _n(t2, "colorless");
      return `Error validating "omit" option:

${i}

${n2}`;
    }
    function lu(e2) {
      return e2.length === 0 ? Promise.resolve([]) : new Promise((r2, t2) => {
        let n2 = new Array(e2.length), i = null, o2 = false, s = 0, a = () => {
          o2 || (s++, s === e2.length && (o2 = true, i ? t2(i) : r2(n2)));
        }, l = (u) => {
          o2 || (o2 = true, t2(u));
        };
        for (let u = 0; u < e2.length; u++)
          e2[u].then((c) => {
            n2[u] = c, a();
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
    var Ff = { requestArgsToMiddlewareArgs: (e2) => e2, middlewareArgsToRequestArgs: (e2) => e2 };
    var Mf = Symbol.for("prisma.client.transaction.id");
    var $f = { id: 0, nextId() {
      return ++this.id;
    } };
    function fu(e2) {
      class r2 {
        constructor(n2) {
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
          e2 = n2?.__internal?.configOverride?.(e2) ?? e2, sl(e2), n2 && au(n2, e2);
          let i = new du.EventEmitter().on("error", () => {
          });
          this._extensions = Nr.empty(), this._previewFeatures = $l(e2), this._clientVersion = e2.clientVersion ?? ru, this._activeProvider = e2.activeProvider, this._globalOmit = n2?.omit, this._tracingHelper = Hl();
          let o2 = e2.relativeEnvPaths && { rootEnvPath: e2.relativeEnvPaths.rootEnvPath && ri.default.resolve(e2.dirname, e2.relativeEnvPaths.rootEnvPath), schemaEnvPath: e2.relativeEnvPaths.schemaEnvPath && ri.default.resolve(e2.dirname, e2.relativeEnvPaths.schemaEnvPath) }, s;
          if (n2?.adapter) {
            s = n2.adapter;
            let l = e2.activeProvider === "postgresql" || e2.activeProvider === "cockroachdb" ? "postgres" : e2.activeProvider;
            if (s.provider !== l)
              throw new P(`The Driver Adapter \`${s.adapterName}\`, based on \`${s.provider}\`, is not compatible with the provider \`${l}\` specified in the Prisma schema.`, this._clientVersion);
            if (n2.datasources || n2.datasourceUrl !== void 0)
              throw new P("Custom datasource configuration is not compatible with Prisma Driver Adapters. Please define the database connection string directly in the Driver Adapter configuration.", this._clientVersion);
          }
          let a = !s && o2 && st(o2, { conflictCheck: "none" }) || e2.injectableEdgeEnv?.();
          try {
            let l = n2 ?? {}, u = l.__internal ?? {}, c = u.debug === true;
            c && N.enable("prisma:client");
            let p2 = ri.default.resolve(e2.dirname, e2.relativePath);
            mu.default.existsSync(p2) || (p2 = e2.dirname), rr("dirname", e2.dirname), rr("relativePath", e2.relativePath), rr("cwd", p2);
            let d2 = u.engine || {};
            if (l.errorFormat ? this._errorFormat = l.errorFormat : process.env.NODE_ENV === "production" ? this._errorFormat = "minimal" : process.env.NO_COLOR ? this._errorFormat = "colorless" : this._errorFormat = "colorless", this._runtimeDataModel = e2.runtimeDataModel, this._engineConfig = { cwd: p2, dirname: e2.dirname, enableDebugLogs: c, allowTriggerPanic: d2.allowTriggerPanic, prismaPath: d2.binaryPath ?? void 0, engineEndpoint: d2.endpoint, generator: e2.generator, showColors: this._errorFormat === "pretty", logLevel: l.log && zl(l.log), logQueries: l.log && !!(typeof l.log == "string" ? l.log === "query" : l.log.find((f) => typeof f == "string" ? f === "query" : f.level === "query")), env: a?.parsed ?? {}, flags: [], engineWasm: e2.engineWasm, compilerWasm: e2.compilerWasm, clientVersion: e2.clientVersion, engineVersion: e2.engineVersion, previewFeatures: this._previewFeatures, activeProvider: e2.activeProvider, inlineSchema: e2.inlineSchema, overrideDatasources: al(l, e2.datasourceNames), inlineDatasources: e2.inlineDatasources, inlineSchemaHash: e2.inlineSchemaHash, tracingHelper: this._tracingHelper, transactionOptions: { maxWait: l.transactionOptions?.maxWait ?? 2e3, timeout: l.transactionOptions?.timeout ?? 5e3, isolationLevel: l.transactionOptions?.isolationLevel }, logEmitter: i, isBundled: e2.isBundled, adapter: s }, this._accelerateEngineConfig = { ...this._engineConfig, accelerateUtils: { resolveDatasourceUrl: jr, getBatchRequestPayload: Mr, prismaGraphQLToJSError: $r, PrismaClientUnknownRequestError: V, PrismaClientInitializationError: P, PrismaClientKnownRequestError: z2, debug: N("prisma:client:accelerateEngine"), engineVersion: cu.version, clientVersion: e2.clientVersion } }, rr("clientVersion", e2.clientVersion), this._engine = Ml(e2, this._engineConfig), this._requestHandler = new ei(this, i), l.log)
              for (let f of l.log) {
                let h = typeof f == "string" ? f : f.emit === "stdout" ? f.level : null;
                h && this.$on(h, (g2) => {
                  nt.log(`${nt.tags[h] ?? ""}`, g2.message || g2.query);
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
        $on(n2, i) {
          return n2 === "beforeExit" ? this._engine.onBeforeExit(i) : n2 && this._engineConfig.logEmitter.on(n2, i), this;
        }
        $connect() {
          try {
            return this._engine.start();
          } catch (n2) {
            throw n2.clientVersion = this._clientVersion, n2;
          }
        }
        async $disconnect() {
          try {
            await this._engine.stop();
          } catch (n2) {
            throw n2.clientVersion = this._clientVersion, n2;
          } finally {
            Uo();
          }
        }
        $executeRawInternal(n2, i, o2, s) {
          let a = this._activeProvider;
          return this._request({ action: "executeRaw", args: o2, transaction: n2, clientMethod: i, argsMapper: So({ clientMethod: i, activeProvider: a }), callsite: Ze(this._errorFormat), dataPath: [], middlewareArgsMapper: s });
        }
        $executeRaw(n2, ...i) {
          return this._createPrismaPromise((o2) => {
            if (n2.raw !== void 0 || n2.sql !== void 0) {
              let [s, a] = uu(n2, i);
              return To(this._activeProvider, s.text, s.values, Array.isArray(n2) ? "prisma.$executeRaw`<SQL>`" : "prisma.$executeRaw(sql`<SQL>`)"), this.$executeRawInternal(o2, "$executeRaw", s, a);
            }
            throw new Z2("`$executeRaw` is a tag function, please use it like the following:\n```\nconst result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`\n```\n\nOr read our docs at https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#executeraw\n", { clientVersion: this._clientVersion });
          });
        }
        $executeRawUnsafe(n2, ...i) {
          return this._createPrismaPromise((o2) => (To(this._activeProvider, n2, i, "prisma.$executeRawUnsafe(<SQL>, [...values])"), this.$executeRawInternal(o2, "$executeRawUnsafe", [n2, ...i])));
        }
        $runCommandRaw(n2) {
          if (e2.activeProvider !== "mongodb")
            throw new Z2(`The ${e2.activeProvider} provider does not support $runCommandRaw. Use the mongodb provider.`, { clientVersion: this._clientVersion });
          return this._createPrismaPromise((i) => this._request({ args: n2, clientMethod: "$runCommandRaw", dataPath: [], action: "runCommandRaw", argsMapper: ql, callsite: Ze(this._errorFormat), transaction: i }));
        }
        async $queryRawInternal(n2, i, o2, s) {
          let a = this._activeProvider;
          return this._request({ action: "queryRaw", args: o2, transaction: n2, clientMethod: i, argsMapper: So({ clientMethod: i, activeProvider: a }), callsite: Ze(this._errorFormat), dataPath: [], middlewareArgsMapper: s });
        }
        $queryRaw(n2, ...i) {
          return this._createPrismaPromise((o2) => {
            if (n2.raw !== void 0 || n2.sql !== void 0)
              return this.$queryRawInternal(o2, "$queryRaw", ...uu(n2, i));
            throw new Z2("`$queryRaw` is a tag function, please use it like the following:\n```\nconst result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`\n```\n\nOr read our docs at https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#queryraw\n", { clientVersion: this._clientVersion });
          });
        }
        $queryRawTyped(n2) {
          return this._createPrismaPromise((i) => {
            if (!this._hasPreviewFlag("typedSql"))
              throw new Z2("`typedSql` preview feature must be enabled in order to access $queryRawTyped API", { clientVersion: this._clientVersion });
            return this.$queryRawInternal(i, "$queryRawTyped", n2);
          });
        }
        $queryRawUnsafe(n2, ...i) {
          return this._createPrismaPromise((o2) => this.$queryRawInternal(o2, "$queryRawUnsafe", [n2, ...i]));
        }
        _transactionWithArray({ promises: n2, options: i }) {
          let o2 = $f.nextId(), s = Yl(n2.length), a = n2.map((l, u) => {
            if (l?.[Symbol.toStringTag] !== "PrismaPromise")
              throw new Error("All elements of the array need to be Prisma Client promises. Hint: Please make sure you are not awaiting the Prisma client calls you intended to pass in the $transaction function.");
            let c = i?.isolationLevel ?? this._engineConfig.transactionOptions.isolationLevel, p2 = { kind: "batch", id: o2, index: u, isolationLevel: c, lock: s };
            return l.requestTransaction?.(p2) ?? l;
          });
          return lu(a);
        }
        async _transactionWithCallback({ callback: n2, options: i }) {
          let o2 = { traceparent: this._tracingHelper.getTraceParent() }, s = { maxWait: i?.maxWait ?? this._engineConfig.transactionOptions.maxWait, timeout: i?.timeout ?? this._engineConfig.transactionOptions.timeout, isolationLevel: i?.isolationLevel ?? this._engineConfig.transactionOptions.isolationLevel }, a = await this._engine.transaction("start", o2, s), l;
          try {
            let u = { kind: "itx", ...a };
            l = await n2(this._createItxClient(u)), await this._engine.transaction("commit", o2, a);
          } catch (u) {
            throw await this._engine.transaction("rollback", o2, a).catch(() => {
            }), u;
          }
          return l;
        }
        _createItxClient(n2) {
          return he(Pt(he(Qa(this), [re("_appliedParent", () => this._appliedParent._createItxClient(n2)), re("_createPrismaPromise", () => Ro(n2)), re(Mf, () => n2.id)])), [Fr(Ya)]);
        }
        $transaction(n2, i) {
          let o2;
          typeof n2 == "function" ? this._engineConfig.adapter?.adapterName === "@prisma/adapter-d1" ? o2 = () => {
            throw new Error("Cloudflare D1 does not support interactive transactions. We recommend you to refactor your queries with that limitation in mind, and use batch transactions with `prisma.$transactions([])` where applicable.");
          } : o2 = () => this._transactionWithCallback({ callback: n2, options: i }) : o2 = () => this._transactionWithArray({ promises: n2, options: i });
          let s = { name: "transaction", attributes: { method: "$transaction" } };
          return this._tracingHelper.runInChildSpan(s, o2);
        }
        _request(n2) {
          n2.otelParentCtx = this._tracingHelper.getActiveContext();
          let i = n2.middlewareArgsMapper ?? Ff, o2 = { args: i.requestArgsToMiddlewareArgs(n2.args), dataPath: n2.dataPath, runInTransaction: !!n2.transaction, action: n2.action, model: n2.model }, s = { operation: { name: "operation", attributes: { method: o2.action, model: o2.model, name: o2.model ? `${o2.model}.${o2.action}` : o2.action } } }, a = async (l) => {
            let { runInTransaction: u, args: c, ...p2 } = l, d2 = { ...n2, ...p2 };
            c && (d2.args = i.middlewareArgsToRequestArgs(c)), n2.transaction !== void 0 && u === false && delete d2.transaction;
            let f = await el(this, d2);
            return d2.model ? Ha({ result: f, modelName: d2.model, args: d2.args, extensions: this._extensions, runtimeDataModel: this._runtimeDataModel, globalOmit: this._globalOmit }) : f;
          };
          return this._tracingHelper.runInChildSpan(s.operation, () => new pu.AsyncResource("prisma-client-request").runInAsyncScope(() => a(o2)));
        }
        async _executeRequest({ args: n2, clientMethod: i, dataPath: o2, callsite: s, action: a, model: l, argsMapper: u, transaction: c, unpacker: p2, otelParentCtx: d2, customDataProxyFetch: f }) {
          try {
            n2 = u ? u(n2) : n2;
            let h = { name: "serialize" }, g2 = this._tracingHelper.runInChildSpan(h, () => $n({ modelName: l, runtimeDataModel: this._runtimeDataModel, action: a, args: n2, clientMethod: i, callsite: s, extensions: this._extensions, errorFormat: this._errorFormat, clientVersion: this._clientVersion, previewFeatures: this._previewFeatures, globalOmit: this._globalOmit }));
            return N.enabled("prisma:client") && (rr("Prisma Client call:"), rr(`prisma.${i}(${Na(n2)})`), rr("Generated request:"), rr(JSON.stringify(g2, null, 2) + `
`)), c?.kind === "batch" && await c.lock, this._requestHandler.request({ protocolQuery: g2, modelName: l, action: a, clientMethod: i, dataPath: o2, callsite: s, args: n2, extensions: this._extensions, transaction: c, unpacker: p2, otelParentCtx: d2, otelChildCtx: this._tracingHelper.getActiveContext(), globalOmit: this._globalOmit, customDataProxyFetch: f });
          } catch (h) {
            throw h.clientVersion = this._clientVersion, h;
          }
        }
        _hasPreviewFlag(n2) {
          return !!this._engineConfig.previewFeatures?.includes(n2);
        }
        $applyPendingMigrations() {
          return this._engine.applyPendingMigrations();
        }
      }
      return r2;
    }
    function uu(e2, r2) {
      return qf(e2) ? [new ie(e2, r2), Wl] : [e2, Jl];
    }
    function qf(e2) {
      return Array.isArray(e2) && Array.isArray(e2.raw);
    }
    var Vf = /* @__PURE__ */ new Set(["toJSON", "$$typeof", "asymmetricMatch", Symbol.iterator, Symbol.toStringTag, Symbol.isConcatSpreadable, Symbol.toPrimitive]);
    function gu(e2) {
      return new Proxy(e2, { get(r2, t2) {
        if (t2 in r2)
          return r2[t2];
        if (!Vf.has(t2))
          throw new TypeError(`Invalid enum value: ${String(t2)}`);
      } });
    }
    function hu(e2) {
      st(e2, { conflictCheck: "warn" });
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
    exports.Prisma.UserSessionScalarFieldEnum = {
      id: "id",
      userId: "userId",
      sessionId: "sessionId",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      isActive: "isActive",
      createdAt: "createdAt",
      expiresAt: "expiresAt",
      invalidatedAt: "invalidatedAt"
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
      currency: "currency",
      planId: "planId",
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
      UserSession: "UserSession",
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
      "inlineSchema": 'generator client {\n  provider      = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nmodel User {\n  id                     Int                    @id @default(autoincrement())\n  email                  String                 @unique\n  password               String\n  firstName              String\n  lastName               String\n  phone                  String?\n  role                   String                 @default("OUTLET_STAFF")\n  isActive               Boolean                @default(true)\n  createdAt              DateTime               @default(now())\n  updatedAt              DateTime               @updatedAt\n  merchantId             Int?\n  outletId               Int?\n  deletedAt              DateTime?\n  auditLogs              AuditLog[]\n  createdOrders          Order[]\n  subscriptionActivities SubscriptionActivity[]\n  sessions               UserSession[]\n  merchant               Merchant?              @relation(fields: [merchantId], references: [id])\n  outlet                 Outlet?                @relation(fields: [outletId], references: [id])\n\n  @@unique([merchantId, email])\n  @@unique([merchantId, phone])\n  @@index([email])\n  @@index([merchantId])\n  @@index([outletId])\n  @@index([deletedAt])\n}\n\nmodel UserSession {\n  id            Int       @id @default(autoincrement())\n  userId        Int\n  sessionId     String    @unique\n  ipAddress     String?\n  userAgent     String?\n  isActive      Boolean   @default(true)\n  createdAt     DateTime  @default(now())\n  expiresAt     DateTime\n  invalidatedAt DateTime?\n  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId, isActive])\n  @@index([sessionId])\n  @@index([expiresAt])\n}\n\nmodel Merchant {\n  id            Int           @id @default(autoincrement())\n  name          String\n  email         String        @unique\n  phone         String?\n  address       String?\n  city          String?\n  state         String?\n  zipCode       String?\n  country       String?\n  businessType  String?\n  taxId         String?\n  website       String?\n  description   String?\n  currency      String        @default("USD")\n  planId        Int?\n  totalRevenue  Float         @default(0)\n  lastActiveAt  DateTime?\n  isActive      Boolean       @default(true)\n  createdAt     DateTime      @default(now())\n  updatedAt     DateTime      @updatedAt\n  pricingConfig String?       @default("{\\"businessType\\":\\"GENERAL\\",\\"defaultPricingType\\":\\"FIXED\\",\\"businessRules\\":{\\"requireRentalDates\\":false,\\"showPricingOptions\\":false},\\"durationLimits\\":{\\"minDuration\\":1,\\"maxDuration\\":1,\\"defaultDuration\\":1}}")\n  pricingType   String?\n  categories    Category[]\n  customers     Customer[]\n  Plan          Plan?         @relation(fields: [planId], references: [id])\n  outlets       Outlet[]\n  payments      Payment[]\n  products      Product[]\n  subscription  Subscription?\n  users         User[]\n\n  @@index([name])\n  @@index([email])\n  @@index([planId])\n}\n\nmodel Outlet {\n  id          Int           @id @default(autoincrement())\n  name        String\n  address     String?\n  description String?\n  isActive    Boolean       @default(true)\n  isDefault   Boolean       @default(false)\n  createdAt   DateTime      @default(now())\n  updatedAt   DateTime      @updatedAt\n  merchantId  Int\n  phone       String?\n  city        String?\n  country     String?\n  state       String?\n  zipCode     String?\n  orders      Order[]\n  merchant    Merchant      @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  products    OutletStock[]\n  users       User[]\n\n  @@index([merchantId])\n  @@index([name])\n  @@index([isDefault])\n}\n\nmodel Category {\n  id          Int       @id @default(autoincrement())\n  name        String\n  description String?\n  isActive    Boolean   @default(true)\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  merchantId  Int\n  merchant    Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  products    Product[]\n\n  @@unique([merchantId, name])\n  @@index([merchantId])\n}\n\nmodel Product {\n  id          Int           @id @default(autoincrement())\n  name        String\n  description String?\n  barcode     String?       @unique\n  totalStock  Int           @default(0)\n  rentPrice   Float\n  salePrice   Float?\n  deposit     Float         @default(0)\n  images      String?\n  isActive    Boolean       @default(true)\n  createdAt   DateTime      @default(now())\n  updatedAt   DateTime      @updatedAt\n  merchantId  Int\n  categoryId  Int\n  orderItems  OrderItem[]\n  outletStock OutletStock[]\n  merchant    Merchant      @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  category    Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)\n\n  @@index([merchantId])\n  @@index([categoryId])\n  @@index([barcode])\n  @@index([name])\n}\n\nmodel OutletStock {\n  id        Int      @id @default(autoincrement())\n  stock     Int      @default(0)\n  available Int      @default(0)\n  renting   Int      @default(0)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  productId Int\n  outletId  Int\n  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)\n  outlet    Outlet   @relation(fields: [outletId], references: [id], onDelete: Cascade)\n\n  @@unique([productId, outletId])\n  @@index([outletId, available])\n  @@index([productId])\n}\n\nmodel Customer {\n  id          Int       @id @default(autoincrement())\n  firstName   String\n  lastName    String\n  email       String?\n  phone       String\n  address     String?\n  city        String?\n  state       String?\n  zipCode     String?\n  country     String?\n  dateOfBirth DateTime?\n  idNumber    String?\n  idType      String?\n  notes       String?\n  isActive    Boolean   @default(true)\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  merchantId  Int\n  merchant    Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  orders      Order[]\n\n  @@unique([merchantId, phone])\n  @@index([merchantId, firstName, lastName])\n}\n\nmodel Order {\n  id                Int         @id @default(autoincrement())\n  orderNumber       String      @unique\n  orderType         String\n  status            String      @default("RESERVED")\n  totalAmount       Float\n  depositAmount     Float       @default(0)\n  securityDeposit   Float       @default(0)\n  damageFee         Float       @default(0)\n  lateFee           Float       @default(0)\n  discountType      String?\n  discountValue     Float       @default(0)\n  discountAmount    Float       @default(0)\n  pickupPlanAt      DateTime?\n  returnPlanAt      DateTime?\n  pickedUpAt        DateTime?\n  returnedAt        DateTime?\n  rentalDuration    Int?\n  isReadyToDeliver  Boolean     @default(false)\n  collateralType    String?\n  collateralDetails String?\n  notes             String?\n  pickupNotes       String?\n  returnNotes       String?\n  damageNotes       String?\n  createdAt         DateTime    @default(now())\n  updatedAt         DateTime    @updatedAt\n  outletId          Int\n  customerId        Int?\n  createdById       Int\n  customer          Customer?   @relation(fields: [customerId], references: [id])\n  outlet            Outlet      @relation(fields: [outletId], references: [id])\n  createdBy         User        @relation(fields: [createdById], references: [id])\n  orderItems        OrderItem[]\n  payments          Payment[]\n\n  @@index([status, outletId])\n  @@index([customerId, createdAt(sort: Desc)])\n  @@index([pickupPlanAt, returnPlanAt])\n  @@index([orderNumber])\n  @@index([isReadyToDeliver, outletId])\n  @@index([createdAt])\n  @@index([outletId, createdAt])\n  @@index([orderType, status])\n  @@index([outletId, status, createdAt])\n  @@index([createdById, createdAt])\n  @@index([totalAmount])\n  @@index([status, orderType, createdAt])\n}\n\nmodel OrderItem {\n  id         Int     @id @default(autoincrement())\n  quantity   Int     @default(1)\n  unitPrice  Float\n  totalPrice Float\n  deposit    Float   @default(0)\n  orderId    Int\n  productId  Int\n  notes      String?\n  rentalDays Int?\n  product    Product @relation(fields: [productId], references: [id])\n  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@index([orderId, productId])\n}\n\nmodel Payment {\n  id             Int           @id @default(autoincrement())\n  amount         Float\n  currency       String        @default("USD")\n  method         String\n  type           String\n  status         String        @default("PENDING")\n  reference      String?\n  transactionId  String?\n  invoiceNumber  String?\n  description    String?\n  notes          String?\n  failureReason  String?\n  metadata       String?\n  processedAt    DateTime?\n  processedBy    String?\n  createdAt      DateTime      @default(now())\n  updatedAt      DateTime      @updatedAt\n  orderId        Int?\n  subscriptionId Int?\n  merchantId     Int?\n  order          Order?        @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  subscription   Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)\n  merchant       Merchant?     @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n\n  @@index([orderId, status])\n  @@index([subscriptionId, status])\n  @@index([merchantId, status])\n  @@index([status])\n  @@index([type])\n  @@index([method])\n  @@index([currency])\n}\n\nmodel Plan {\n  id            Int            @id @default(autoincrement())\n  name          String         @unique\n  description   String\n  basePrice     Float\n  currency      String         @default("USD")\n  trialDays     Int            @default(14)\n  limits        String         @default("{\\"outlets\\": 0, \\"users\\": 0, \\"products\\": 0, \\"customers\\": 0}")\n  features      String         @default("[]")\n  isActive      Boolean        @default(true)\n  isPopular     Boolean        @default(false)\n  sortOrder     Int            @default(0)\n  createdAt     DateTime       @default(now())\n  updatedAt     DateTime       @updatedAt\n  deletedAt     DateTime?\n  Merchant      Merchant[]\n  subscriptions Subscription[]\n\n  @@index([isActive])\n  @@index([sortOrder])\n  @@index([deletedAt])\n}\n\nmodel Subscription {\n  id                 Int                    @id @default(autoincrement())\n  merchantId         Int                    @unique\n  planId             Int\n  status             String                 @default("trial")\n  currentPeriodStart DateTime\n  currentPeriodEnd   DateTime\n  trialStart         DateTime?\n  trialEnd           DateTime?\n  cancelAtPeriodEnd  Boolean                @default(false)\n  canceledAt         DateTime?\n  cancelReason       String?\n  amount             Float\n  currency           String                 @default("USD")\n  interval           String                 @default("month")\n  intervalCount      Int                    @default(1)\n  period             Int                    @default(1)\n  discount           Float                  @default(0)\n  savings            Float                  @default(0)\n  createdAt          DateTime               @default(now())\n  updatedAt          DateTime               @updatedAt\n  payments           Payment[]\n  plan               Plan                   @relation(fields: [planId], references: [id])\n  merchant           Merchant               @relation(fields: [merchantId], references: [id], onDelete: Cascade)\n  activities         SubscriptionActivity[]\n\n  @@index([merchantId])\n  @@index([planId])\n  @@index([status])\n}\n\nmodel SubscriptionActivity {\n  id             Int          @id @default(autoincrement())\n  subscriptionId Int\n  type           String\n  description    String\n  metadata       String?\n  performedBy    Int?\n  createdAt      DateTime     @default(now())\n  reason         String?\n  user           User?        @relation(fields: [performedBy], references: [id])\n  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)\n\n  @@index([subscriptionId])\n  @@index([type])\n  @@index([createdAt])\n}\n\nmodel AuditLog {\n  id         Int      @id @default(autoincrement())\n  entityType String\n  entityId   String\n  action     String\n  details    String\n  userId     Int?\n  ipAddress  String?\n  userAgent  String?\n  createdAt  DateTime @default(now())\n  user       User?    @relation(fields: [userId], references: [id])\n\n  @@index([entityType, entityId])\n  @@index([userId])\n  @@index([action])\n  @@index([createdAt])\n}\n',
      "inlineSchemaHash": "eeee57c8bd14a8bb046a762ec2bbb0c3430a6f40f5c7daca625e1e1e7e664a8a",
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
    config.runtimeDataModel = JSON.parse('{"models":{"User":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"password","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"firstName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"lastName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"role","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"OUTLET_STAFF","isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"outletId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deletedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"auditLogs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"AuditLog","nativeType":null,"relationName":"AuditLogToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"createdOrders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionActivities","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubscriptionActivity","nativeType":null,"relationName":"SubscriptionActivityToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"sessions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"UserSession","nativeType":null,"relationName":"UserToUserSession","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToUser","relationFromFields":["merchantId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OutletToUser","relationFromFields":["outletId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","email"],["merchantId","phone"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","email"]},{"name":null,"fields":["merchantId","phone"]}],"isGenerated":false},"UserSession":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"sessionId","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"ipAddress","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"userAgent","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"expiresAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"invalidatedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"UserToUserSession","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Merchant":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"businessType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"taxId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"website","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"planId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalRevenue","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lastActiveAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"pricingConfig","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"{\\"businessType\\":\\"GENERAL\\",\\"defaultPricingType\\":\\"FIXED\\",\\"businessRules\\":{\\"requireRentalDates\\":false,\\"showPricingOptions\\":false},\\"durationLimits\\":{\\"minDuration\\":1,\\"maxDuration\\":1,\\"defaultDuration\\":1}}","isGenerated":false,"isUpdatedAt":false},{"name":"pricingType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"categories","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryToMerchant","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"customers","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Customer","nativeType":null,"relationName":"CustomerToMerchant","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"Plan","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Plan","nativeType":null,"relationName":"MerchantToPlan","relationFromFields":["planId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlets","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"MerchantToOutlet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"MerchantToPayment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"MerchantToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"MerchantToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"users","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"MerchantToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Outlet":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"isDefault","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToOutlet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToOutlet","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OutletStock","nativeType":null,"relationName":"OutletToOutletStock","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"users","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"OutletToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Category":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"CategoryToMerchant","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","name"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","name"]}],"isGenerated":false},"Product":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"barcode","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalStock","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"rentPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"salePrice","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"images","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"categoryId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orderItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"outletStock","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OutletStock","nativeType":null,"relationName":"OutletStockToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToProduct","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":["categoryId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"OutletStock":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"stock","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"available","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"renting","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"productId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"outletId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"OutletStockToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OutletToOutletStock","relationFromFields":["outletId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["productId","outletId"]],"uniqueIndexes":[{"name":null,"fields":["productId","outletId"]}],"isGenerated":false},"Customer":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"firstName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"lastName","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"state","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"zipCode","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"dateOfBirth","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idNumber","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"CustomerToMerchant","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"orders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"CustomerToOrder","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["merchantId","phone"]],"uniqueIndexes":[{"name":null,"fields":["merchantId","phone"]}],"isGenerated":false},"Order":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderNumber","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"orderType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"RESERVED","isGenerated":false,"isUpdatedAt":false},{"name":"totalAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"depositAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"securityDeposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"damageFee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lateFee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"discountType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"discountValue","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"discountAmount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"pickupPlanAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnPlanAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"pickedUpAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"rentalDuration","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isReadyToDeliver","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"collateralType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"collateralDetails","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"pickupNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"returnNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"damageNotes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"outletId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"customerId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdById","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"customer","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Customer","nativeType":null,"relationName":"CustomerToOrder","relationFromFields":["customerId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"outlet","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Outlet","nativeType":null,"relationName":"OrderToOutlet","relationFromFields":["outletId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"createdBy","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"OrderToUser","relationFromFields":["createdById"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"orderItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"OrderToPayment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"OrderItem":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"unitPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalPrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deposit","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"productId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"rentalDays","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":["productId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Payment":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"method","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"reference","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"transactionId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"invoiceNumber","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"failureReason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"processedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"processedBy","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"orderId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToPayment","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"PaymentToSubscription","relationFromFields":["subscriptionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToPayment","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Plan":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"basePrice","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"trialDays","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":14,"isGenerated":false,"isUpdatedAt":false},{"name":"limits","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"{\\"outlets\\": 0, \\"users\\": 0, \\"products\\": 0, \\"customers\\": 0}","isGenerated":false,"isUpdatedAt":false},{"name":"features","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"[]","isGenerated":false,"isUpdatedAt":false},{"name":"isActive","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"isPopular","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"sortOrder","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"deletedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"Merchant","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToPlan","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"PlanToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Subscription":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"merchantId","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"planId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"trial","isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodStart","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currentPeriodEnd","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"trialStart","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"trialEnd","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"cancelAtPeriodEnd","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"canceledAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"cancelReason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Float","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"USD","isGenerated":false,"isUpdatedAt":false},{"name":"interval","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"month","isGenerated":false,"isUpdatedAt":false},{"name":"intervalCount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"period","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"discount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"savings","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Float","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"PaymentToSubscription","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"plan","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Plan","nativeType":null,"relationName":"PlanToSubscription","relationFromFields":["planId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"merchant","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Merchant","nativeType":null,"relationName":"MerchantToSubscription","relationFromFields":["merchantId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"activities","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubscriptionActivity","nativeType":null,"relationName":"SubscriptionToSubscriptionActivity","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"SubscriptionActivity":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subscriptionId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"performedBy","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"SubscriptionActivityToUser","relationFromFields":["performedBy"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false},{"name":"subscription","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Subscription","nativeType":null,"relationName":"SubscriptionToSubscriptionActivity","relationFromFields":["subscriptionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"AuditLog":{"dbName":null,"schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":{"name":"autoincrement","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"entityType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"entityId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"action","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"details","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"userId","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"ipAddress","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"userAgent","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"AuditLogToUser","relationFromFields":["userId"],"relationToFields":["id"],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false}},"enums":{},"types":{}}');
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

// src/core/string-utils.ts
var formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};
var generateSlug = (text) => {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
};
var truncateText = (text, maxLength) => {
  if (text.length <= maxLength)
    return text;
  return text.slice(0, maxLength) + "...";
};
var isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
var isValidPhone = (phone) => {
  const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};
var capitalizeWords = (text) => {
  return text.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};
var normalizeWhitespace = (text) => {
  return text.replace(/\s+/g, " ").trim();
};
var generateRandomString = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
var isEmpty = (text) => {
  return !text || text.trim().length === 0;
};
var getInitials = (name) => {
  return name.split(" ").map((word) => word.charAt(0).toUpperCase()).join("").slice(0, 2);
};

// src/core/function-utils.ts
var debounce = (func, wait) => {
  let timeout2;
  return (...args) => {
    clearTimeout(timeout2);
    timeout2 = setTimeout(() => func(...args), wait);
  };
};
var throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
var memoize = (func, keyGenerator) => {
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
var retry = async (fn, maxAttempts = 3, baseDelay = 1e3) => {
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
var once = (func) => {
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
var delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var timeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Operation timed out")), ms)
    )
  ]);
};
var API = CONSTANTS.API;
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
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
})(ErrorCode || {});
function isSuccessResponse(response) {
  return response.success === true;
}
function isErrorResponse(response) {
  return response.success === false;
}
var ERROR_MESSAGES = {
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
var ERROR_STATUS_CODES = {
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
var ApiError = class extends Error {
  constructor(code, message, details, field) {
    const errorMessage = message || ERROR_MESSAGES[code];
    super(errorMessage);
    this.name = "ApiError";
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
};
var ValidationError = class extends ApiError {
  constructor(message, details, field) {
    super("VALIDATION_ERROR" /* VALIDATION_ERROR */, message, details, field);
    this.name = "ValidationError";
  }
};
var DuplicateError = class extends ApiError {
  constructor(code, message, details, field) {
    super(code, message, details, field);
    this.name = "DuplicateError";
  }
};
var NotFoundError = class extends ApiError {
  constructor(code, message, details) {
    super(code, message, details);
    this.name = "NotFoundError";
  }
};
var UnauthorizedError = class extends ApiError {
  constructor(message, details) {
    super("UNAUTHORIZED" /* UNAUTHORIZED */, message, details);
    this.name = "UnauthorizedError";
  }
};
var ForbiddenError = class extends ApiError {
  constructor(message, details) {
    super("FORBIDDEN" /* FORBIDDEN */, message, details);
    this.name = "ForbiddenError";
  }
};
var PlanLimitError = class extends ApiError {
  constructor(message, details) {
    super("PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */, message, details);
    this.name = "PlanLimitError";
  }
};
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
        return new ApiError(
          "EMAIL_EXISTS" /* EMAIL_EXISTS */,
          `Email address is already registered`,
          `Field: ${field}`,
          "email"
        );
      }
      if (field?.includes("phone")) {
        return new ApiError(
          "PHONE_EXISTS" /* PHONE_EXISTS */,
          `Phone number is already registered`,
          `Field: ${field}`,
          "phone"
        );
      }
      return new ApiError(
        "DUPLICATE_ENTRY" /* DUPLICATE_ENTRY */,
        "Record with this information already exists",
        `Field: ${field}`
      );
    }
    case "P2003": {
      const fieldName = error.meta?.field_name;
      return new ApiError(
        "FOREIGN_KEY_CONSTRAINT" /* FOREIGN_KEY_CONSTRAINT */,
        `Invalid reference: ${fieldName}`,
        `Field: ${fieldName}`
      );
    }
    case "P2025": {
      return new ApiError(
        "NOT_FOUND" /* NOT_FOUND */,
        "Record not found",
        error.message
      );
    }
    case "P2014": {
      return new ApiError(
        "BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */,
        "Cannot perform this operation due to existing relationships",
        error.message
      );
    }
    default: {
      return new ApiError(
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
    return new ApiError(
      "VALIDATION_ERROR" /* VALIDATION_ERROR */,
      firstError.message,
      `Field: ${field}`,
      field
    );
  }
  return new ApiError(
    "INVALID_INPUT" /* INVALID_INPUT */,
    error.message || "Validation failed"
  );
}
function handleBusinessError(error) {
  if (error instanceof ApiError) {
    return error;
  }
  if (error.message?.includes("not found")) {
    if (error.message.includes("Merchant")) {
      return new ApiError("MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Outlet")) {
      return new ApiError("OUTLET_NOT_FOUND" /* OUTLET_NOT_FOUND */, error.message);
    }
    if (error.message.includes("User")) {
      return new ApiError("USER_NOT_FOUND" /* USER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Product")) {
      return new ApiError("PRODUCT_NOT_FOUND" /* PRODUCT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Order")) {
      return new ApiError("ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Customer")) {
      return new ApiError("CUSTOMER_NOT_FOUND" /* CUSTOMER_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Category")) {
      return new ApiError("CATEGORY_NOT_FOUND" /* CATEGORY_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Plan")) {
      return new ApiError("PLAN_NOT_FOUND" /* PLAN_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Subscription")) {
      return new ApiError("SUBSCRIPTION_NOT_FOUND" /* SUBSCRIPTION_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Payment")) {
      return new ApiError("PAYMENT_NOT_FOUND" /* PAYMENT_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Audit log")) {
      return new ApiError("AUDIT_LOG_NOT_FOUND" /* AUDIT_LOG_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Billing cycle")) {
      return new ApiError("BILLING_CYCLE_NOT_FOUND" /* BILLING_CYCLE_NOT_FOUND */, error.message);
    }
    if (error.message.includes("Plan variant")) {
      return new ApiError("PLAN_VARIANT_NOT_FOUND" /* PLAN_VARIANT_NOT_FOUND */, error.message);
    }
  }
  if (error.message?.includes("already registered")) {
    if (error.message.includes("Email")) {
      return new ApiError("EMAIL_EXISTS" /* EMAIL_EXISTS */, error.message);
    }
    if (error.message.includes("Phone")) {
      return new ApiError("PHONE_EXISTS" /* PHONE_EXISTS */, error.message);
    }
  }
  if (error.message?.includes("already exists")) {
    if (error.message.includes("order")) {
      return new ApiError("ORDER_ALREADY_EXISTS" /* ORDER_ALREADY_EXISTS */, error.message);
    }
  }
  if (error.message?.includes("Plan limit")) {
    return new ApiError("PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */, error.message);
  }
  if (error.message?.includes("permission")) {
    return new ApiError("INSUFFICIENT_PERMISSIONS" /* INSUFFICIENT_PERMISSIONS */, error.message);
  }
  if (error.message?.includes("deactivated")) {
    return new ApiError("ACCOUNT_DEACTIVATED" /* ACCOUNT_DEACTIVATED */, error.message);
  }
  if (error.message?.includes("subscription")) {
    if (error.message.includes("expired")) {
      return new ApiError("SUBSCRIPTION_EXPIRED" /* SUBSCRIPTION_EXPIRED */, error.message);
    }
    if (error.message.includes("cancelled")) {
      return new ApiError("SUBSCRIPTION_CANCELLED" /* SUBSCRIPTION_CANCELLED */, error.message);
    }
    if (error.message.includes("paused")) {
      return new ApiError("SUBSCRIPTION_PAUSED" /* SUBSCRIPTION_PAUSED */, error.message);
    }
  }
  if (error.message?.includes("trial")) {
    if (error.message.includes("expired")) {
      return new ApiError("TRIAL_EXPIRED" /* TRIAL_EXPIRED */, error.message);
    }
  }
  if (error.message?.includes("out of stock")) {
    return new ApiError("PRODUCT_OUT_OF_STOCK" /* PRODUCT_OUT_OF_STOCK */, error.message);
  }
  if (error.message?.includes("payment")) {
    if (error.message.includes("failed")) {
      return new ApiError("PAYMENT_FAILED" /* PAYMENT_FAILED */, error.message);
    }
    if (error.message.includes("invalid")) {
      return new ApiError("INVALID_PAYMENT_METHOD" /* INVALID_PAYMENT_METHOD */, error.message);
    }
  }
  if (error.message?.includes("invalid order status")) {
    return new ApiError("INVALID_ORDER_STATUS" /* INVALID_ORDER_STATUS */, error.message);
  }
  return new ApiError(
    "BUSINESS_RULE_VIOLATION" /* BUSINESS_RULE_VIOLATION */,
    error.message || "Business rule violation"
  );
}
function handleApiError(error) {
  console.error("\u{1F6A8} API Error:", error);
  let apiError;
  if (error instanceof ApiError) {
    apiError = error;
  } else if (error.code && error.code.startsWith("P")) {
    apiError = handlePrismaError(error);
  } else if (error.name === "ZodError") {
    apiError = handleValidationError(error);
  } else {
    apiError = handleBusinessError(error);
  }
  const response = {
    success: false,
    code: apiError.code,
    message: apiError.message,
    error: apiError.details || apiError.message
  };
  return {
    response,
    statusCode: apiError.statusCode
  };
}
function getErrorTranslationKey(errorCode) {
  return errorCode;
}
function isValidErrorCode(code) {
  return Object.values(ErrorCode).includes(code);
}
var isAuthError = (error) => {
  return error?.message?.includes("Authentication required") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid token") || error?.message?.includes("Token expired") || error?.status === API.STATUS.UNAUTHORIZED || error?.status === 401;
};
var isPermissionError = (error) => {
  return error?.message?.includes("Forbidden") || error?.message?.includes("Access denied") || error?.message?.includes("Insufficient permissions") || error?.status === API.STATUS.FORBIDDEN || error?.status === 403;
};
var isSubscriptionErrorNew = (error) => {
  if (!error)
    return false;
  const message = error.message || error.error || "";
  const code = error.code || "";
  return code === "PLAN_LIMIT_EXCEEDED" || message.toLowerCase().includes("subscription") || message.toLowerCase().includes("plan limit") || message.toLowerCase().includes("trial expired") || message.toLowerCase().includes("cancelled") || message.toLowerCase().includes("expired") || message.toLowerCase().includes("suspended") || message.toLowerCase().includes("past due") || message.toLowerCase().includes("paused");
};
var isNetworkError = (error) => {
  return error?.message?.includes("Network Error") || error?.message?.includes("Failed to fetch") || error?.message?.includes("Connection failed") || error?.status === API.STATUS.SERVICE_UNAVAILABLE || error?.status === 503;
};
var isValidationError = (error) => {
  return error?.message?.includes("Validation failed") || error?.message?.includes("Invalid input") || error?.message?.includes("Required field") || error?.status === API.STATUS.BAD_REQUEST || error?.status === 400;
};
var analyzeError = (error) => {
  console.log("\u{1F50D} analyzeError called with:", error);
  if (isAuthError(error)) {
    console.log("\u{1F50D} analyzeError: Detected auth error, clearing auth data");
    clearAuthData();
    return {
      type: "auth",
      message: "Your session has expired. Please log in again.",
      title: "Session Expired",
      showLoginButton: true,
      originalError: error
    };
  }
  if (isPermissionError(error)) {
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
  if (isNetworkError(error)) {
    return {
      type: "network",
      message: "Network connection failed. Please check your internet connection and try again.",
      title: "Connection Error",
      showLoginButton: false,
      originalError: error
    };
  }
  if (isValidationError(error)) {
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

// src/core/common.ts
var API2 = CONSTANTS.API;
var createApiUrl = (endpoint) => {
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
var publicFetch = async (url, options = {}) => {
  console.log("\u{1F50D} FRONTEND: publicFetch called with URL:", url);
  console.log("\u{1F50D} FRONTEND: publicFetch options:", options);
  if (!url || typeof url !== "string") {
    console.log("\u{1F50D} FRONTEND: URL validation failed");
    throw new Error("URL is required and must be a string");
  }
  const headers = {
    [API2.HEADERS.CONTENT_TYPE]: API2.CONTENT_TYPES.JSON,
    [API2.HEADERS.ACCEPT]: API2.CONTENT_TYPES.JSON,
    // Platform detection headers for web clients
    "X-Client-Platform": "web",
    "X-App-Version": "1.0.0",
    "X-Device-Type": "browser"
  };
  const fullUrl = createApiUrl(url);
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
var authenticatedFetch = async (url, options = {}) => {
  console.log("\u{1F50D} FRONTEND: authenticatedFetch called with URL:", url);
  console.log("\u{1F50D} FRONTEND: authenticatedFetch options:", options);
  if (!url || typeof url !== "string") {
    console.log("\u{1F50D} FRONTEND: URL validation failed");
    throw new Error("URL is required and must be a string");
  }
  const token = getAuthToken();
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
          clearAuthData();
          throw new Error("Token expired - please log in again");
        }
      }
    } catch (error) {
      console.log("\u{1F50D} FRONTEND: Token validation failed:", error);
      clearAuthData();
      throw new Error("Invalid token - please log in again");
    }
  }
  if (!token && typeof window !== "undefined") {
    console.log("\u{1F50D} FRONTEND: No token found, cleaning up and redirecting to login");
    clearAuthData();
    setTimeout(() => {
    }, 100);
    throw new Error("Authentication required");
  }
  const headers = {
    [API2.HEADERS.CONTENT_TYPE]: API2.CONTENT_TYPES.JSON,
    [API2.HEADERS.ACCEPT]: API2.CONTENT_TYPES.JSON,
    // Platform detection headers for web clients
    "X-Client-Platform": "web",
    "X-App-Version": "1.0.0",
    "X-Device-Type": "browser",
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
        clearAuthData();
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
var parseApiResponse = async (response) => {
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
        } catch (e2) {
          console.error("\u{1F512} parseApiResponse - Could not read response body:", e2);
        }
        clearAuthData();
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
var isAuthenticated = () => {
  if (typeof window === "undefined")
    return false;
  const token = getAuthToken();
  return !!token;
};
var getAuthToken = () => {
  if (typeof window === "undefined")
    return null;
  const authData = localStorage.getItem("authData");
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      if (parsed.token && parsed.expiresAt) {
        if (Date.now() > parsed.expiresAt) {
          console.log("\u{1F50D} Token is expired, clearing auth data");
          clearAuthData();
          return null;
        }
        return parsed.token;
      }
    } catch (error) {
      console.warn("Failed to parse authData:", error);
      clearAuthData();
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
            clearAuthData();
            return null;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to decode JWT token for expiration check:", error);
      clearAuthData();
      return null;
    }
    return token;
  }
  return null;
};
var getStoredUser = () => {
  if (typeof window === "undefined")
    return null;
  try {
    const authData = localStorage.getItem("authData");
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.user) {
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          clearAuthData();
          return null;
        }
        return parsed.user;
      }
    }
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.expiresAt && Date.now() > user.expiresAt) {
        clearAuthData();
        return null;
      }
      return user;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse stored user data:", error);
    clearAuthData();
    return null;
  }
};
var storeAuthData = (token, user) => {
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
      outletId: user.outletId ? Number(user.outletId) : void 0,
      // ✅ Store merchant and outlet objects (optional)
      merchant: user.merchant || void 0,
      outlet: user.outlet || void 0
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
var clearAuthData = () => {
  if (typeof window === "undefined")
    return;
  console.log("\u{1F9F9} Clearing auth data from localStorage");
  localStorage.removeItem("authData");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("userData");
  console.log("\u2705 All auth data cleared");
};
var getCurrentUser = () => {
  return getStoredUser();
};
var handleApiResponse = async (response) => {
  return await parseApiResponse(response);
};
var getToastType = (errorType) => {
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
var withErrorHandlingForUI = async (apiCall) => {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    return { error };
  }
};
var handleApiErrorForUI = (error) => {
  const errorInfo = analyzeError(error);
  return {
    message: errorInfo.message,
    type: errorInfo.type
  };
};

// src/core/pricing-calculator.ts
var DiscountCalculator = class {
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
var BillingIntervalCalculator = class {
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
var ProrationCalculator = class {
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
var PricingComparisonEngine = class {
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
var PricingCalculator = class {
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
var DEFAULT_PRICING_CONFIG = {
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
var pricingCalculator = new PricingCalculator();
var calculateSubscriptionPrice = (plan, billingInterval) => pricingCalculator.calculateSubscriptionPrice(plan, billingInterval);
var getPricingBreakdown = (plan, billingInterval) => pricingCalculator.getPricingBreakdown(plan, billingInterval);
var getAllPricingOptions = (plan) => pricingCalculator.getAllPricingOptions(plan);
var getPricingComparison = (plan1, plan2, billingInterval) => pricingCalculator.getPricingComparison(plan1, plan2, billingInterval);
var calculateProratedAmount = (currentPlan, newPlan, billingInterval, daysRemaining) => pricingCalculator.calculateProratedAmount(currentPlan, newPlan, billingInterval, daysRemaining);
var formatBillingCycle = (billingInterval) => {
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
var getBillingCycleDiscount = (billingInterval) => {
  return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
};
var calculateRenewalPrice = (plan, billingInterval) => {
  return calculateSubscriptionPrice(plan, billingInterval);
};
var calculateSavings = (originalPrice, discountedPrice) => {
  return Math.max(0, originalPrice - discountedPrice);
};
var getDiscountPercentage = (billingInterval) => {
  return DEFAULT_PRICING_CONFIG.discounts[billingInterval] || 0;
};
var calculateDiscountedPrice = (originalPrice, discountPercentage) => {
  const discountAmount = originalPrice * (discountPercentage / 100);
  return Math.max(0, originalPrice - discountAmount);
};
var PricingResolver = class {
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
var PricingValidator = class {
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

// ../database/src/client.ts
var import_client = __toESM(require_default2());
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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
          email: true
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

// ../database/src/audit.ts
var AuditLogger = class {
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

// src/core/subscription-manager.ts
var SubscriptionManager = class {
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
          return new PlanLimitError("Invalid merchant ID", "SUBSCRIPTION_NOT_FOUND");
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
        return new PlanLimitError("No active subscription found", "SUBSCRIPTION_NOT_FOUND");
      }
      const status = subscription.status?.toLowerCase();
      const errorStatuses = ["cancelled", "expired", "suspended", "past_due", "paused"];
      if (errorStatuses.includes(status)) {
        console.log("\u{1F50D} SUBSCRIPTION: Subscription status is error status:", status);
        return new PlanLimitError(
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
          return new PlanLimitError(
            "Your subscription has expired. Please renew to continue using our services.",
            "SUBSCRIPTION_EXPIRED"
          );
        }
      }
      console.log("\u{1F50D} SUBSCRIPTION: Subscription is valid");
      return null;
    } catch (error) {
      console.error("\u{1F50D} SUBSCRIPTION: Error checking subscription status:", error);
      return new PlanLimitError("Unable to verify subscription status", "SUBSCRIPTION_ACCESS_DENIED");
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
var checkSubscriptionStatus = SubscriptionManager.checkStatus;
var shouldThrowPlanLimitError = SubscriptionManager.shouldThrowError;
var getPlanLimitError = SubscriptionManager.getError;
var getSubscriptionError = SubscriptionManager.getError;
var validateSubscriptionAccess = SubscriptionManager.validateAccess;
var canPerformOperation = SubscriptionManager.canPerformOperation;
var getPlanLimitErrorMessage = SubscriptionManager.getErrorMessage;
var getAllowedOperations = SubscriptionManager.getAllowedOperations;
var calculateSubscriptionPeriod = SubscriptionManager.calculatePeriod;
var formatSubscriptionPeriod = SubscriptionManager.formatPeriod;
var getSubscriptionStatusBadge = SubscriptionManager.getStatusBadge;
var calculateNewBillingDate = SubscriptionManager.calculateNewBillingDate;
var isSubscriptionExpired = SubscriptionManager.isExpired;
var isGracePeriodExceeded = SubscriptionManager.isGracePeriodExceeded;
var validateForRenewal = SubscriptionManager.validateForRenewal;
var getSubscriptionStatusPriority = SubscriptionManager.getStatusPriority;
var sortSubscriptionsByStatus = SubscriptionManager.sortByStatus;
var subscriptionNeedsAttention = SubscriptionManager.needsAttention;

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

// ../../node_modules/lucide-react/dist/esm/defaultAttributes.mjs
var defaultAttributes = {
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

// ../../node_modules/lucide-react/dist/esm/createLucideIcon.mjs
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var createLucideIcon = (iconName, iconNode) => {
  const Component = forwardRef(
    ({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, children, ...rest }, ref) => createElement(
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
        ...iconNode.map(([tag, attrs]) => createElement(tag, attrs)),
        ...(Array.isArray(children) ? children : [children]) || []
      ]
    )
  );
  Component.displayName = `${iconName}`;
  return Component;
};
var createLucideIcon$1 = createLucideIcon;

// ../../node_modules/lucide-react/dist/esm/icons/alert-triangle.mjs
var AlertTriangle = createLucideIcon$1("AlertTriangle", [
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

// ../../node_modules/lucide-react/dist/esm/icons/building-2.mjs
var Building2 = createLucideIcon$1("Building2", [
  ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
  ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
  ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
  ["path", { d: "M10 6h4", key: "1itunk" }],
  ["path", { d: "M10 10h4", key: "tcdvrf" }],
  ["path", { d: "M10 14h4", key: "kelpxr" }],
  ["path", { d: "M10 18h4", key: "1ulq68" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/check-circle.mjs
var CheckCircle = createLucideIcon$1("CheckCircle", [
  ["path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14", key: "g774vq" }],
  ["polyline", { points: "22 4 12 14.01 9 11.01", key: "6xbx8j" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/dollar-sign.mjs
var DollarSign = createLucideIcon$1("DollarSign", [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
  [
    "path",
    { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }
  ]
]);

// ../../node_modules/lucide-react/dist/esm/icons/file-text.mjs
var FileText = createLucideIcon$1("FileText", [
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

// ../../node_modules/lucide-react/dist/esm/icons/map-pin.mjs
var MapPin = createLucideIcon$1("MapPin", [
  [
    "path",
    { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", key: "2oe9fu" }
  ],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/package.mjs
var Package = createLucideIcon$1("Package", [
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

// ../../node_modules/lucide-react/dist/esm/icons/shield.mjs
var Shield = createLucideIcon$1("Shield", [
  ["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", key: "3xmgem" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/shopping-cart.mjs
var ShoppingCart = createLucideIcon$1("ShoppingCart", [
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

// ../../node_modules/lucide-react/dist/esm/icons/store.mjs
var Store = createLucideIcon$1("Store", [
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

// ../../node_modules/lucide-react/dist/esm/icons/trending-down.mjs
var TrendingDown = createLucideIcon$1("TrendingDown", [
  ["polyline", { points: "22 17 13.5 8.5 8.5 13.5 2 7", key: "1r2t7k" }],
  ["polyline", { points: "16 17 22 17 22 11", key: "11uiuu" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/trending-up.mjs
var TrendingUp = createLucideIcon$1("TrendingUp", [
  ["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17", key: "126l90" }],
  ["polyline", { points: "16 7 22 7 22 13", key: "kwv8wd" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/user-check.mjs
var UserCheck = createLucideIcon$1("UserCheck", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["polyline", { points: "16 11 18 13 22 9", key: "1pwet4" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/user-x.mjs
var UserX = createLucideIcon$1("UserX", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["line", { x1: "17", x2: "22", y1: "8", y2: "13", key: "3nzzx3" }],
  ["line", { x1: "22", x2: "17", y1: "8", y2: "13", key: "1swrse" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/user.mjs
var User = createLucideIcon$1("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);

// ../../node_modules/lucide-react/dist/esm/icons/x-circle.mjs
var XCircle = createLucideIcon$1("XCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
]);
var getStatusBadgeConfig = (isActive, entityType = "entity") => {
  const status = isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  const colorClass = getStatusColor(status, entityType);
  const label = getStatusLabel(status, entityType);
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
var getStatusBadge = ({ isActive, entityType = "entity" }) => {
  const config = getStatusBadgeConfig(isActive, entityType);
  const Icon = config.icon;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getRoleBadgeConfig = (role) => {
  const roleConfig = {
    [USER_ROLE.ADMIN]: { color: "bg-red-100 text-red-800", icon: Shield, text: "Admin" },
    [USER_ROLE.MERCHANT]: { color: "bg-blue-100 text-blue-800", icon: Building2, text: "Merchant" },
    [USER_ROLE.OUTLET_ADMIN]: { color: "bg-green-100 text-green-800", icon: Store, text: "Outlet Admin" },
    [USER_ROLE.OUTLET_STAFF]: { color: "bg-gray-100 text-gray-800", icon: User, text: "Outlet Staff" }
  };
  return roleConfig[role] || {
    color: "bg-gray-100 text-gray-800",
    icon: User,
    text: role
  };
};
var getRoleBadge = ({ role }) => {
  const config = getRoleBadgeConfig(role);
  const Icon = config.icon;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getLocationBadgeConfig = (city, state) => {
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
var getLocationBadge = ({ city, state }) => {
  const config = getLocationBadgeConfig(city, state);
  if (!config) {
    return /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500" }, /* @__PURE__ */ React.createElement(MapPin, { className: "w-3 h-3 mr-1" }), "No location");
  }
  const Icon = config.icon;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getAvailabilityBadgeConfig = (available, totalStock) => {
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
var getAvailabilityBadge = ({ available, totalStock }) => {
  const config = getAvailabilityBadgeConfig(available, totalStock);
  const Icon = config.icon;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getPriceTrendBadgeConfig = (currentPrice, previousPrice) => {
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
var getPriceTrendBadge = (currentPrice, previousPrice) => {
  const config = getPriceTrendBadgeConfig(currentPrice, previousPrice);
  const Icon = config.icon;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getCustomerStatusBadge = (isActive) => getStatusBadge({ isActive, entityType: "entity" });
var getUserStatusBadge = (isActive) => getStatusBadge({ isActive, entityType: "entity" });
var getProductStatusBadge = (isActive) => getStatusBadge({ isActive, entityType: "availability" });
var getCustomerLocationBadge = (city, state) => {
  return getLocationBadge({ city, state });
};
var getCustomerIdTypeBadge = (idType) => {
  if (!idType) {
    return /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-3 h-3 mr-1" }), "No ID");
  }
  const idTypeConfig = {
    "passport": { color: "bg-purple-100 text-purple-800", text: "Passport" },
    "drivers_license": { color: "bg-blue-100 text-blue-800", text: "Driver License" },
    "national_id": { color: "bg-green-100 text-green-800", text: "National ID" },
    "other": { color: "bg-gray-100 text-gray-800", text: "Other" }
  };
  const config = idTypeConfig[idType] || idTypeConfig.other;
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(FileText, { className: "w-3 h-3 mr-1" }), config.text);
};
var calculateCustomerStats = (customers) => {
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
var filterCustomers = (customers, searchTerm, filters) => {
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
var getCustomerFullName = (customer) => {
  return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
};
var getCustomerAddress = (customer) => {
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
    customer.country
  ].filter(Boolean);
  return parts.join(", ") || "No address provided";
};
var getCustomerContactInfo = (customer) => {
  return {
    email: customer.email || "No email",
    phone: customer.phone || "No phone",
    hasEmail: !!(customer.email && customer.email.trim() !== ""),
    hasPhone: !!(customer.phone && customer.phone.trim() !== ""),
    hasAddress: !!(customer.address && customer.address.trim() !== "")
  };
};
var formatCustomerForDisplay = (customer) => {
  return {
    ...customer,
    fullName: getCustomerFullName(customer),
    displayAddress: getCustomerAddress(customer),
    contactInfo: getCustomerContactInfo(customer),
    statusBadge: getCustomerStatusBadge(customer.isActive),
    locationBadge: getCustomerLocationBadge(customer.city, customer.state),
    idTypeBadge: getCustomerIdTypeBadge(customer.idType)
  };
};
var validateCustomer = (customer) => {
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
var getCustomerAge = (dateOfBirth) => {
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
var getProductAvailabilityBadge = (available, totalStock) => {
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
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var getProductTypeBadge = (product) => {
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
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}` }, /* @__PURE__ */ React.createElement(Icon, { className: "w-3 h-3 mr-1" }), config.text);
};
var calculateProductStats = (products) => {
  const productsArray = products || [];
  const totalProducts = productsArray.length;
  const activeProducts = productsArray.filter((p2) => p2.isActive).length;
  const inactiveProducts = productsArray.filter((p2) => !p2.isActive).length;
  const inStockProducts = productsArray.filter((p2) => p2.available > 0).length;
  const outOfStockProducts = productsArray.filter((p2) => p2.available === 0).length;
  const lowStockProducts = productsArray.filter((p2) => p2.available > 0 && p2.available < 5).length;
  const totalStockValue = productsArray.reduce((sum, product) => {
    const stockValue = product.available * (product.rentPrice || 0);
    return sum + stockValue;
  }, 0);
  const productsWithPrice = productsArray.filter((p2) => p2.rentPrice && p2.rentPrice > 0);
  const averagePrice = productsWithPrice.length > 0 ? productsWithPrice.reduce((sum, p2) => sum + (p2.rentPrice || 0), 0) / productsWithPrice.length : 0;
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
var filterProducts = (products, searchTerm, categoryFilter, outletFilter, availabilityFilter, statusFilter) => {
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
var formatProductPrice = (price, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(price);
};
var getProductImageUrl = (product) => {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  return "/images/product-placeholder.png";
};
var calculateStockPercentage = (available, totalStock) => {
  if (totalStock === 0)
    return 0;
  return Math.round(available / totalStock * 100);
};
var getProductStockStatus = (available, totalStock) => {
  if (available === 0)
    return "Out of Stock";
  if (available < 5)
    return "Low Stock";
  if (available < totalStock * 0.5)
    return "Limited Stock";
  return "In Stock";
};
var canRentProduct = (product) => {
  return product.isActive && product.available > 0 && product.rentPrice > 0;
};
var canSellProduct = (product) => {
  return product.isActive && product.available > 0 && product.salePrice && product.salePrice > 0;
};
var getProductDisplayName = (product) => {
  return product.name || "Unnamed Product";
};
var getProductCategoryName = (product) => {
  return "category" in product ? product.category?.name || "Uncategorized" : "Uncategorized";
};
var getProductOutletName = (product) => {
  return "outlet" in product ? product.outlet?.name || "No Outlet" : "No Outlet";
};
var sortProducts = (products, sortBy, sortOrder = "asc") => {
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

// src/core/user-utils.tsx
var getUserRoleBadge = (role) => {
  return getRoleBadge({ role });
};
var calculateUserStats = (users) => {
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
var filterUsers = (users, searchTerm, roleFilter, statusFilter) => {
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
var getUserFullName = (user) => {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim();
};
var canCreateUsers = (userRole) => {
  return userRole === "ADMIN" || userRole === "MERCHANT" || userRole === "OUTLET_ADMIN";
};
var loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
var registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Support both name formats for flexibility
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional(),
  role: z.enum(["CLIENT", "SHOP_OWNER", "ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]).optional(),
  // For merchant registration
  businessName: z.string().optional(),
  // Business configuration (required for merchants)
  businessType: z.enum(["CLOTHING", "VEHICLE", "EQUIPMENT", "GENERAL"]).optional(),
  pricingType: z.enum(["FIXED", "HOURLY", "DAILY", "WEEKLY"]).optional(),
  // Address fields for merchant registration
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().min(2, "Please select a valid country").optional(),
  // For outlet staff registration
  merchantCode: z.string().optional(),
  outletCode: z.string().optional()
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
var outletStockItemSchema = z.object({
  outletId: z.coerce.number().int().positive("Outlet is required"),
  stock: z.number().int().min(0, "Stock must be non-negative")
});
var productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  rentPrice: z.number().nonnegative("Rent price must be non-negative"),
  salePrice: z.number().nonnegative("Sale price must be non-negative"),
  deposit: z.number().nonnegative("Deposit must be non-negative").default(0),
  categoryId: z.coerce.number().int().positive().optional(),
  // Optional - will use default category if not provided
  totalStock: z.number().int().min(0, "Total stock must be non-negative"),
  images: z.union([z.string(), z.array(z.string())]).optional(),
  // Allow both string and array for testing
  merchantId: z.coerce.number().int().positive().optional(),
  // Optional - required for ADMIN users, auto-assigned for others
  outletStock: z.array(outletStockItemSchema).min(1, "At least one outlet stock entry is required")
  // Required - every product must have outlet stock
});
var productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rentPrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
  deposit: z.number().nonnegative().optional(),
  images: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  totalStock: z.number().int().min(0).optional()
});
var productsQuerySchema = z.object({
  q: z.string().optional(),
  // Search query parameter (consistent with orders)
  search: z.string().optional(),
  // Keep for backward compatibility
  categoryId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  outletId: z.coerce.number().int().positive().optional(),
  // Add outlet filtering
  available: z.coerce.boolean().optional(),
  // Add availability filter
  minPrice: z.coerce.number().nonnegative().optional(),
  // Add price range filters
  maxPrice: z.coerce.number().nonnegative().optional(),
  // Add price range filters
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  // Add offset for pagination consistency
  sortBy: z.string().optional(),
  // Add sorting support
  sortOrder: z.enum(["asc", "desc"]).optional()
  // Add sorting support
});
var rentalSchema = z.object({
  productId: z.coerce.number().int().positive("Product is required"),
  // Changed from string to number
  startDate: z.date(),
  endDate: z.date(),
  notes: z.string().optional()
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"]
});
var customerCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  merchantId: z.coerce.number().int().positive().optional(),
  // Optional - only required for ADMIN users, auto-assigned for MERCHANT/OUTLET from JWT
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().optional(),
  idType: z.enum(["passport", "drivers_license", "national_id", "other"]).optional(),
  notes: z.string().optional()
});
var customerUpdateSchema = customerCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  idType: z.enum(["passport", "drivers_license", "national_id", "other"]).optional()
});
var customersQuerySchema = z.object({
  q: z.string().optional(),
  // Search query parameter (consistent with orders)
  search: z.string().optional(),
  // Keep for backward compatibility
  merchantId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  isActive: z.union([z.string(), z.boolean()]).transform((v2) => {
    if (typeof v2 === "boolean")
      return v2;
    if (v2 === void 0)
      return void 0;
    return v2 === "true";
  }).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  idType: z.enum(["passport", "drivers_license", "national_id", "other"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  // Add offset for pagination consistency
  sortBy: z.string().optional(),
  // Add sorting support
  sortOrder: z.enum(["asc", "desc"]).optional()
  // Add sorting support
});
var orderTypeEnum = z.enum(["RENT", "SALE"]);
var orderStatusEnum = z.enum(["RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED"]);
var ordersQuerySchema = z.object({
  q: z.string().optional(),
  outletId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  customerId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  userId: z.coerce.number().int().positive().optional(),
  // Changed from string to number
  productId: z.coerce.number().int().positive().optional(),
  // Add product filtering support
  orderType: orderTypeEnum.optional(),
  status: orderStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickupDate: z.coerce.date().optional(),
  returnDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // ✅ Use page instead of offset
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  // Add sortBy support
  sortOrder: z.enum(["asc", "desc"]).optional()
  // Add sortOrder support
});
var orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  // Changed from string to number
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().default(0),
  totalPrice: z.coerce.number().nonnegative().optional(),
  // Made optional since server calculates it
  deposit: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  daysRented: z.coerce.number().int().nonnegative().optional()
});
var baseOrderSchema = z.object({
  // Optional fields for updates (backend generates if missing)
  orderId: z.coerce.number().int().positive().optional(),
  orderNumber: z.string().optional(),
  // Core order fields
  orderType: orderTypeEnum,
  customerId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive(),
  pickupPlanAt: z.coerce.date().optional(),
  returnPlanAt: z.coerce.date().optional(),
  rentalDuration: z.coerce.number().int().positive().optional(),
  subtotal: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(["amount", "percentage"]).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().nonnegative(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  securityDeposit: z.coerce.number().nonnegative().optional(),
  damageFee: z.coerce.number().nonnegative().optional(),
  lateFee: z.coerce.number().nonnegative().optional(),
  collateralType: z.string().optional(),
  collateralDetails: z.string().optional(),
  notes: z.string().optional(),
  pickupNotes: z.string().optional(),
  returnNotes: z.string().optional(),
  damageNotes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  isReadyToDeliver: z.boolean().optional(),
  // Order items management
  orderItems: z.array(orderItemSchema)
});
var orderCreateSchema = baseOrderSchema;
var orderUpdateSchema = baseOrderSchema.partial().extend({
  // Update-specific fields (not present in create)
  status: orderStatusEnum.optional(),
  pickedUpAt: z.coerce.date().optional(),
  returnedAt: z.coerce.date().optional()
});
var userRoleEnum = z.enum(["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]);
var usersQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v2) => {
    if (typeof v2 === "boolean")
      return v2;
    if (v2 === void 0)
      return void 0;
    return v2 === "true";
  }).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional()
});
var userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1).or(z.literal("")),
  // Allow empty string for lastName
  phone: z.string().min(1, "Phone number is required"),
  // Phone is now required
  role: userRoleEnum.optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional()
});
var userUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).or(z.literal("")).optional(),
  // Allow empty string for lastName
  email: z.string().email().optional(),
  phone: z.string().min(1, "Phone number is required").optional(),
  // Phone is required when provided
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  outletId: z.coerce.number().int().positive().optional()
});
var outletsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v2) => {
    if (typeof v2 === "boolean")
      return v2;
    if (v2 === void 0)
      return void 0;
    if (v2 === "all")
      return "all";
    return v2 === "true";
  }).optional(),
  q: z.string().optional(),
  // Search by outlet name (primary)
  search: z.string().optional(),
  // Alias for q (backward compatibility)
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).optional()
});
var categoriesQuerySchema = z.object({
  q: z.string().optional(),
  // Search by category name
  search: z.string().optional(),
  // Alias for backward compatibility
  merchantId: z.coerce.number().int().positive().optional(),
  isActive: z.union([z.string(), z.boolean()]).transform((v2) => {
    if (typeof v2 === "boolean")
      return v2;
    if (v2 === void 0)
      return void 0;
    if (v2 === "all")
      return "all";
    return v2 === "true";
  }).optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("name").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).optional()
});
var outletCreateSchema = z.object({
  name: z.string().min(1, "Outlet name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]).default("ACTIVE")
});
var outletUpdateSchema = z.object({
  name: z.string().min(1, "Outlet name is required").optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "CLOSED", "SUSPENDED"]).optional()
});
var planCreateSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().min(1, "Plan description is required"),
  basePrice: z.number().nonnegative("Base price must be non-negative"),
  currency: z.string().default("USD"),
  trialDays: z.number().int().min(0, "Trial days must be non-negative"),
  limits: z.object({
    outlets: z.number().int().min(-1, "Max outlets must be -1 (unlimited) or positive"),
    users: z.number().int().min(-1, "Max users must be -1 (unlimited) or positive"),
    products: z.number().int().min(-1, "Max products must be -1 (unlimited) or positive"),
    customers: z.number().int().min(-1, "Max customers must be -1 (unlimited) or positive")
  }),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});
var planUpdateSchema = planCreateSchema.partial();
var plansQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(["name", "price", "basePrice", "createdAt", "sortOrder"]).default("sortOrder"),
  // ✅ Updated to support basePrice
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});
var planVariantCreateSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  name: z.string().min(1, "Variant name is required"),
  duration: z.number().int().positive("Duration must be positive"),
  price: z.number().nonnegative("Price must be non-negative").optional(),
  basePrice: z.number().nonnegative("Base price must be non-negative").optional(),
  discount: z.number().min(0).max(100, "Discount must be between 0 and 100").default(0),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});
var planVariantUpdateSchema = planVariantCreateSchema.partial().extend({
  planId: z.string().min(1, "Plan ID is required").optional()
  // Optional for updates
});
var planVariantsQuerySchema = z.object({
  planId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  duration: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(["name", "price", "duration", "discount", "createdAt", "sortOrder"]).default("sortOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});
var subscriptionCreateSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  planVariantId: z.string().min(1, "Plan variant ID is required"),
  merchantId: z.coerce.number().int().positive("Merchant ID is required"),
  status: z.enum(["trial", "active", "past_due", "cancelled", "paused", "expired"]).default("active"),
  billingInterval: z.enum(["month", "quarter", "semiAnnual", "year"]).default("month"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  currency: z.string().default("USD"),
  trialStartDate: z.coerce.date().optional(),
  trialEndDate: z.coerce.date().optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  cancelledAt: z.coerce.date().optional(),
  notes: z.string().optional()
});
var subscriptionUpdateSchema = subscriptionCreateSchema.partial().extend({
  id: z.coerce.number().int().positive().optional()
});
var subscriptionsQuerySchema = z.object({
  merchantId: z.coerce.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "cancelled", "expired", "suspended", "past_due", "paused"]).optional(),
  planId: z.string().optional(),
  planVariantId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(["createdAt", "currentPeriodEnd", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
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
    throw new ApiError("DATABASE_ERROR" /* DATABASE_ERROR */, "Failed to get entity counts");
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
      throw new ApiError("MERCHANT_NOT_FOUND" /* MERCHANT_NOT_FOUND */, "Merchant not found");
    }
    if (!merchant.subscription) {
      throw new ApiError("NOT_FOUND" /* NOT_FOUND */, "No subscription found for merchant");
    }
    const plan = await prisma.plan.findUnique({
      where: { id: merchant.subscription.planId }
    });
    if (!plan) {
      throw new ApiError("NOT_FOUND" /* NOT_FOUND */, "Plan not found");
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */, "Failed to get plan limits information");
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
    throw new ApiError("INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */, "Failed to validate plan limits");
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
      throw new ApiError(
        "PLAN_LIMIT_EXCEEDED" /* PLAN_LIMIT_EXCEEDED */,
        validation.error || `Plan limit exceeded for ${entityType}`
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      "INTERNAL_SERVER_ERROR" /* INTERNAL_SERVER_ERROR */,
      `Failed to validate plan limits for ${entityType}`
    );
  }
}

// src/core/currency.ts
var DEFAULT_CURRENCIES = [
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
var DEFAULT_CURRENCY_SETTINGS = {
  currentCurrency: "USD",
  // Default to USD
  baseCurrency: "USD",
  availableCurrencies: DEFAULT_CURRENCIES,
  showSymbol: true,
  showCode: false
};
function getCurrency(code) {
  return DEFAULT_CURRENCIES.find((currency) => currency.code === code);
}
function getCurrentCurrency(settings) {
  const currentSettings = settings || DEFAULT_CURRENCY_SETTINGS;
  const currency = getCurrency(currentSettings.currentCurrency);
  if (!currency) {
    return DEFAULT_CURRENCIES.find((c) => c.code === "USD");
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
  const currentSettings = settings || DEFAULT_CURRENCY_SETTINGS;
  const currencyCode = options.currency || currentSettings.currentCurrency;
  const currency = getCurrency(currencyCode);
  if (!currency) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  const locale = "en-US";
  const showSymbol = options.showSymbol ?? currentSettings.showSymbol;
  const showCode = options.showCode ?? currentSettings.showCode;
  const hasDecimals = amount % 1 !== 0;
  let minDecimals;
  let maxDecimals;
  if (currency.code === "VND") {
    minDecimals = 0;
    maxDecimals = 0;
  } else if (hasDecimals) {
    minDecimals = 0;
    maxDecimals = 2;
  } else {
    minDecimals = 0;
    maxDecimals = 0;
  }
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
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
  return formatCurrencyAdvanced(amount, { currency});
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
var d = createContext(void 0);
function v() {
  const e2 = useContext(d);
  if (!e2)
    throw new Error(void 0);
  return e2;
}
function Z() {
  return v().locale;
}

// src/core/date.ts
var toDate = (date) => {
  if (!date)
    return null;
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
var formatDate = (date, formatString = "dd/MM/yyyy") => {
  const dateObj = toDate(date);
  if (!dateObj)
    return "Invalid Date";
  try {
    return format(dateObj, formatString);
  } catch {
    return "Invalid Date";
  }
};
var formatDateTime = (date) => {
  const dateObj = toDate(date);
  if (!dateObj)
    return "Invalid Date";
  try {
    return format(dateObj, "dd/MM/yyyy HH:mm");
  } catch {
    return "Invalid Date";
  }
};
var addDaysToDate = (date, days) => {
  return addDays(date, days);
};
var getDaysDifference = (startDate, endDate) => {
  return differenceInDays(endDate, startDate);
};
var isDateAfter = (date1, date2) => {
  return isAfter(date1, date2);
};
var isDateBefore = (date1, date2) => {
  return isBefore(date1, date2);
};
var getCurrentDate = () => {
  return /* @__PURE__ */ new Date();
};
var getTomorrow = () => {
  return addDaysToDate(getCurrentDate(), 1);
};
var formatDateLong = (date) => {
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
var formatDateTimeLong = (date) => {
  const dateObj = toDate(date);
  if (!dateObj)
    return "Invalid Date";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(dateObj);
  } catch {
    return "Invalid Date";
  }
};
var formatDateShort = (date) => {
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
var formatDateTimeShort = (date) => {
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
var formatDateWithLocale = (date, locale = "en", options = {
  year: "numeric",
  month: "long",
  day: "numeric"
}) => {
  const dateObj = toDate(date);
  if (!dateObj)
    return "Invalid Date";
  try {
    const localeCode = locale === "vi" ? "vi-VN" : "en-US";
    return new Intl.DateTimeFormat(localeCode, options).format(dateObj);
  } catch {
    return "Invalid Date";
  }
};
function getDateLocale(locale) {
  return locale === "vi" ? "vi-VN" : "en-US";
}
function formatDateByLocale(date, locale, options = { month: "short", year: "numeric" }) {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return date.toString();
    }
    const dateLocale = getDateLocale(locale);
    return dateObj.toLocaleDateString(dateLocale, options);
  } catch (error) {
    console.warn("Date formatting error:", error);
    return date.toString();
  }
}
function formatChartPeriod(date, locale) {
  if (locale === "vi") {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime()))
      return date.toString();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  }
  return formatDateByLocale(date, locale, { month: "short", year: "numeric" });
}
function formatFullDateByLocale(date, locale) {
  if (locale === "vi") {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime()))
      return date.toString();
    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }
  return formatDateByLocale(date, locale, { day: "numeric", month: "short", year: "numeric" });
}
function formatMonthOnlyByLocale(date, locale) {
  if (locale === "vi") {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime()))
      return date.toString();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  }
  return formatDateByLocale(date, locale, { month: "short", year: "numeric" });
}
function formatDailyByLocale(date, locale) {
  if (locale === "vi") {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime()))
      return date.toString();
    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  }
  return formatDateByLocale(date, locale, { day: "numeric", month: "short" });
}
function formatTimeByLocale(date, locale) {
  return formatDateByLocale(date, locale, { hour: "2-digit", minute: "2-digit" });
}
function formatDateTimeByLocale(date, locale) {
  if (locale === "vi") {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime()))
      return date.toString();
    const hours = dateObj.getHours().toString().padStart(2, "0");
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }
  return formatDateByLocale(date, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function useFormattedDate(date, options = { month: "short", year: "numeric" }) {
  const locale = Z();
  return formatDateByLocale(date, locale, options);
}
function useFormattedChartPeriod(date) {
  const locale = Z();
  return formatChartPeriod(date, locale);
}
function useFormattedFullDate(date) {
  const locale = Z();
  return formatFullDateByLocale(date, locale);
}
function useFormattedDateTime(date) {
  const locale = Z();
  return formatDateTimeByLocale(date, locale);
}
function useFormattedMonthOnly(date) {
  const locale = Z();
  return formatMonthOnlyByLocale(date, locale);
}
function useFormattedDaily(date) {
  const locale = Z();
  return formatDailyByLocale(date, locale);
}

// src/core/audit-config.ts
var defaultAuditConfig = {
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
function getAuditConfig() {
  const config = { ...defaultAuditConfig };
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
var AuditPerformanceMonitor = class {
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
var auditPerformanceMonitor = new AuditPerformanceMonitor();

// src/core/audit-helper.ts
var AuditHelper = class {
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
    const timer = auditPerformanceMonitor.startTimer();
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
      auditPerformanceMonitor.recordFailure();
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
    const timer = auditPerformanceMonitor.startTimer();
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
      auditPerformanceMonitor.recordFailure();
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
function createAuditHelper(prisma2) {
  return new AuditHelper(prisma2);
}
async function quickAuditLog(prisma2, operation, entityType, entityId, context, options) {
  const auditHelper = new AuditHelper(prisma2);
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

// src/api/auth.ts
init_api();
var authApi = {
  /**
   * Login user
   */
  async login(credentials) {
    try {
      const response = await publicFetch(apiUrls.auth.login, {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      return await parseApiResponse(response);
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Failed to login");
    }
  },
  /**
   * Register new user
   */
  async register(userData) {
    const response = await publicFetch(apiUrls.auth.register, {
      method: "POST",
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Verify authentication token
   */
  async verifyToken() {
    const response = await authenticatedFetch(apiUrls.auth.verify);
    return await parseApiResponse(response);
  },
  /**
   * Refresh authentication token
   */
  async refreshToken() {
    const response = await authenticatedFetch(apiUrls.auth.refresh);
    return await parseApiResponse(response);
  },
  /**
   * Logout user
   */
  async logout() {
    const response = await authenticatedFetch(apiUrls.auth.logout, {
      method: "POST"
    });
    return await parseApiResponse(response);
  },
  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const response = await fetch(apiUrls.auth.forgotPassword, {
      method: "POST",
      body: JSON.stringify({ email })
    });
    return await parseApiResponse(response);
  },
  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const response = await fetch(apiUrls.auth.resetPassword, {
      method: "POST",
      body: JSON.stringify({ token, newPassword })
    });
    return await parseApiResponse(response);
  },
  /**
   * Change password (authenticated)
   */
  async changePassword(currentPassword, newPassword) {
    const response = await authenticatedFetch(apiUrls.auth.changePassword, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return await parseApiResponse(response);
  }
};

// src/api/products.ts
init_api();
var productsApi = {
  /**
   * Get all products
   */
  async getProducts() {
    const response = await authenticatedFetch(apiUrls.products.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.products.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.products.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.merchants.products.list(merchantId)}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get product by ID
   */
  async getProduct(productId) {
    const response = await authenticatedFetch(apiUrls.products.update(productId));
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(apiUrls.products.create, {
      method: "POST",
      body: JSON.stringify(productData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing product
   */
  async updateProduct(productId, productData) {
    const response = await authenticatedFetch(apiUrls.products.update(productId), {
      method: "PUT",
      body: JSON.stringify(productData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a product
   */
  async deleteProduct(productId) {
    const response = await authenticatedFetch(apiUrls.products.delete(productId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId) {
    const response = await authenticatedFetch(`${apiUrls.products.list}?categoryId=${categoryId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get products by outlet
   */
  async getProductsByOutlet(outletId) {
    const response = await authenticatedFetch(`${apiUrls.products.list}?outletId=${outletId}`);
    return await parseApiResponse(response);
  },
  /**
   * Update product stock
   */
  async updateProductStock(productId, stock) {
    const response = await authenticatedFetch(apiUrls.products.updateStock(productId), {
      method: "PATCH",
      body: JSON.stringify({ stock })
    });
    return await parseApiResponse(response);
  },
  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates) {
    const response = await authenticatedFetch(apiUrls.products.bulkUpdate, {
      method: "PATCH",
      body: JSON.stringify({ updates })
    });
    return await parseApiResponse(response);
  }
};

// src/api/customers.ts
init_api();
var customersApi = {
  // ============================================================================
  // CUSTOMER CRUD OPERATIONS
  // ============================================================================
  /**
   * Get all customers
   */
  async getCustomers() {
    const response = await authenticatedFetch(apiUrls.customers.list);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.customers.list}?${params.toString()}`);
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get customer by ID
   */
  async getCustomerById(customerId) {
    const response = await authenticatedFetch(apiUrls.customers.update(customerId));
    return await parseApiResponse(response);
  },
  /**
   * Create new customer
   */
  async createCustomer(customerData) {
    const response = await authenticatedFetch(apiUrls.customers.create, {
      method: "POST",
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update customer
   */
  async updateCustomer(customerId, customerData) {
    const response = await authenticatedFetch(`${apiUrls.customers.list}?id=${customerId}`, {
      method: "PUT",
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete customer
   */
  async deleteCustomer(customerId) {
    const response = await authenticatedFetch(apiUrls.customers.delete(customerId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  // ============================================================================
  // TESTING AND DEBUG ENDPOINTS
  // ============================================================================
  /**
   * Test customer creation payload validation
   */
  async testCustomerPayload(customerData) {
    const response = await authenticatedFetch("/api/customers/test", {
      method: "POST",
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Debug customer creation payload
   */
  async debugCustomerPayload(customerData) {
    const response = await authenticatedFetch("/api/customers/debug", {
      method: "POST",
      body: JSON.stringify(customerData)
    });
    return await parseApiResponse(response);
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

// src/api/orders.ts
init_api();
var ordersApi = {
  /**
   * Get all orders
   */
  async getOrders() {
    const response = await authenticatedFetch(apiUrls.orders.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.orders.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.orders.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    const response = await authenticatedFetch(apiUrls.orders.update(orderId));
    return await parseApiResponse(response);
  },
  /**
   * Get order by order number (e.g., "ORD-2110")
   */
  async getOrderByNumber(orderNumber) {
    const response = await authenticatedFetch(apiUrls.orders.getByNumber(orderNumber));
    return await parseApiResponse(response);
  },
  /**
   * Create a new order
   */
  async createOrder(orderData) {
    const response = await authenticatedFetch(apiUrls.orders.create, {
      method: "POST",
      body: JSON.stringify(orderData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing order
   */
  async updateOrder(orderId, orderData) {
    const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
      method: "PUT",
      body: JSON.stringify(orderData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete an order
   */
  async deleteOrder(orderId) {
    const response = await authenticatedFetch(apiUrls.orders.delete(orderId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(customerId) {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?customerId=${customerId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get orders by outlet
   */
  async getOrdersByOutlet(outletId) {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?outletId=${outletId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get orders by product ID
   */
  async getOrdersByProduct(productId) {
    const response = await authenticatedFetch(`${apiUrls.orders.list}?productId=${productId}`);
    return await parseApiResponse(response);
  },
  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    const response = await authenticatedFetch(apiUrls.orders.updateStatus(orderId), {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(apiUrls.orders.update(orderId), {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    return await parseApiResponse(response);
  },
  /**
   * Get order statistics
   */
  async getOrderStats() {
    const response = await authenticatedFetch(apiUrls.orders.stats);
    return await parseApiResponse(response);
  }
};

// src/api/outlets.ts
init_api();
var outletsApi = {
  /**
   * Get all outlets
   */
  async getOutlets() {
    const response = await authenticatedFetch(apiUrls.outlets.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Search outlets by name with filters
   */
  async searchOutlets(filters) {
    const params = new URLSearchParams();
    const searchQuery = filters.q || filters.search;
    if (searchQuery)
      params.append("q", searchQuery);
    if (filters.merchantId)
      params.append("merchantId", filters.merchantId.toString());
    if (filters.isActive !== void 0)
      params.append("isActive", filters.isActive.toString());
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
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get outlet by ID
   */
  async getOutlet(outletId) {
    const response = await authenticatedFetch(apiUrls.outlets.get(outletId));
    return await parseApiResponse(response);
  },
  /**
   * Create a new outlet
   */
  async createOutlet(outletData) {
    const response = await authenticatedFetch(apiUrls.outlets.create, {
      method: "POST",
      body: JSON.stringify(outletData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing outlet
   */
  async updateOutlet(outletId, outletData) {
    const response = await authenticatedFetch(apiUrls.outlets.update(outletId), {
      method: "PUT",
      body: JSON.stringify(outletData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete an outlet
   */
  async deleteOutlet(outletId) {
    const response = await authenticatedFetch(apiUrls.outlets.delete(outletId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get outlets by shop
   */
  async getOutletsByShop(shopId) {
    const response = await authenticatedFetch(`${apiUrls.outlets.list}?shopId=${shopId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get outlets by merchant
   */
  async getOutletsByMerchant(merchantId) {
    console.log("\u{1F50D} Outlets API Client: Calling getOutletsByMerchant with merchantId:", merchantId);
    console.log("\u{1F50D} Outlets API Client: API URL:", apiUrls.merchants.outlets.list(merchantId));
    const response = await authenticatedFetch(apiUrls.merchants.outlets.list(merchantId));
    console.log("\u{1F50D} Outlets API Client: Raw response:", response);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(apiUrls.outlets.stats);
    return await parseApiResponse(response);
  }
};

// src/api/merchants.ts
init_api();
var merchantsApi = {
  /**
   * Get all merchants
   */
  async getMerchants() {
    const response = await authenticatedFetch(apiUrls.merchants.list);
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get merchants with pagination
   */
  async getMerchantsPaginated(page = 1, limit = 50) {
    const response = await authenticatedFetch(`${apiUrls.merchants.list}?page=${page}&limit=${limit}`);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.merchants.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get merchant by ID
   */
  async getMerchantById(id) {
    const response = await authenticatedFetch(apiUrls.merchants.get(id));
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get merchant detail with full data (subscriptions, outlets, users, etc.)
   */
  async getMerchantDetail(id) {
    const response = await authenticatedFetch(apiUrls.merchants.get(id));
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Create new merchant
   */
  async createMerchant(merchantData) {
    const response = await authenticatedFetch(apiUrls.merchants.create, {
      method: "POST",
      body: JSON.stringify(merchantData)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Register new merchant (public endpoint)
   */
  async register(data) {
    const response = await fetch(apiUrls.merchants.register, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update merchant
   */
  async updateMerchant(id, merchantData) {
    const response = await authenticatedFetch(apiUrls.merchants.update(id), {
      method: "PUT",
      body: JSON.stringify(merchantData)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Delete merchant
   */
  async deleteMerchant(id) {
    const response = await authenticatedFetch(apiUrls.merchants.delete(id), {
      method: "DELETE"
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get merchant statistics
   */
  async getMerchantStats() {
    const response = await authenticatedFetch(`${apiUrls.merchants.list}/stats`);
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Update merchant plan
   */
  async updateMerchantPlan(merchantId, planData) {
    const response = await authenticatedFetch(apiUrls.merchants.updatePlan(merchantId), {
      method: "PUT",
      body: JSON.stringify(planData)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get merchant plan history
   */
  async getMerchantPlanHistory(merchantId) {
    const response = await authenticatedFetch(apiUrls.merchants.getPlan(merchantId));
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Disable merchant plan
   */
  async disableMerchantPlan(merchantId, subscriptionId, reason) {
    const response = await authenticatedFetch(apiUrls.merchants.extendPlan(merchantId), {
      method: "PATCH",
      body: JSON.stringify({
        action: "disable",
        subscriptionId,
        reason
      })
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Delete merchant plan
   */
  async deleteMerchantPlan(merchantId, subscriptionId, reason) {
    const response = await authenticatedFetch(apiUrls.merchants.cancelPlan(merchantId), {
      method: "PATCH",
      body: JSON.stringify({
        action: "delete",
        subscriptionId,
        reason
      })
    });
    const result = await parseApiResponse(response);
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
      return authenticatedFetch(apiUrls.merchants.products.list(merchantId));
    },
    get: async (merchantId, productId) => {
      return authenticatedFetch(apiUrls.merchants.products.get(merchantId, productId));
    },
    create: async (merchantId, data) => {
      return authenticatedFetch(apiUrls.merchants.products.create(merchantId), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (merchantId, productId, data) => {
      return authenticatedFetch(apiUrls.merchants.products.update(merchantId, productId), {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (merchantId, productId) => {
      return authenticatedFetch(apiUrls.merchants.products.delete(merchantId, productId), {
        method: "DELETE"
      });
    }
  },
  /**
   * Merchant Orders
   */
  orders: {
    list: async (merchantId, queryParams) => {
      const url = queryParams ? `${apiUrls.merchants.orders.list(merchantId)}?${queryParams}` : apiUrls.merchants.orders.list(merchantId);
      return authenticatedFetch(url);
    },
    get: async (merchantId, orderId) => {
      return authenticatedFetch(apiUrls.merchants.orders.get(merchantId, orderId));
    },
    create: async (merchantId, data) => {
      return authenticatedFetch(apiUrls.merchants.orders.create(merchantId), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (merchantId, orderId, data) => {
      return authenticatedFetch(apiUrls.merchants.orders.update(merchantId, orderId), {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (merchantId, orderId) => {
      return authenticatedFetch(apiUrls.merchants.orders.delete(merchantId, orderId), {
        method: "DELETE"
      });
    }
  },
  /**
   * Merchant Users
   */
  users: {
    list: async (merchantId) => {
      return authenticatedFetch(apiUrls.merchants.users.list(merchantId));
    },
    get: async (merchantId, userId) => {
      return authenticatedFetch(apiUrls.merchants.users.get(merchantId, userId));
    },
    create: async (merchantId, data) => {
      return authenticatedFetch(apiUrls.merchants.users.create(merchantId), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (merchantId, userId, data) => {
      return authenticatedFetch(apiUrls.merchants.users.update(merchantId, userId), {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (merchantId, userId) => {
      return authenticatedFetch(apiUrls.merchants.users.delete(merchantId, userId), {
        method: "DELETE"
      });
    }
  },
  /**
   * Merchant Outlets
   */
  outlets: {
    list: async (merchantId, queryParams) => {
      const url = queryParams ? `${apiUrls.merchants.outlets.list(merchantId)}?${queryParams}` : apiUrls.merchants.outlets.list(merchantId);
      return authenticatedFetch(url);
    },
    get: async (merchantId, outletId) => {
      return authenticatedFetch(apiUrls.merchants.outlets.get(merchantId, outletId));
    },
    create: async (merchantId, data) => {
      return authenticatedFetch(apiUrls.merchants.outlets.create(merchantId), {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    update: async (merchantId, outletId, data) => {
      return authenticatedFetch(apiUrls.merchants.outlets.update(merchantId, outletId), {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    delete: async (merchantId, outletId) => {
      return authenticatedFetch(apiUrls.merchants.outlets.delete(merchantId, outletId), {
        method: "DELETE"
      });
    }
  },
  /**
   * Get merchant pricing configuration
   */
  async getPricingConfig(merchantId) {
    const response = await authenticatedFetch(apiUrls.merchants.pricing.get(merchantId));
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Update merchant pricing configuration
   */
  async updatePricingConfig(merchantId, config) {
    const response = await authenticatedFetch(apiUrls.merchants.pricing.update(merchantId), {
      method: "PUT",
      body: JSON.stringify(config)
    });
    const result = await parseApiResponse(response);
    return result;
  }
};

// src/api/analytics.ts
init_api();
var analyticsApi = {
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
    const response = await authenticatedFetch(`${apiUrls.analytics.revenue}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.orders}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.topProducts}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.topCustomers}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.inventory}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get dashboard summary
   */
  async getDashboardSummary() {
    const response = await authenticatedFetch(apiUrls.analytics.dashboard);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.system}?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.recentActivities}?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = queryString ? `${apiUrls.analytics.income}?${queryString}` : apiUrls.analytics.income;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get order analytics summary
   */
  async getOrderAnalyticsSummary() {
    const response = await authenticatedFetch(apiUrls.analytics.orders);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.topProducts}${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.topCustomers}${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.recentOrders}${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.outletPerformance}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.seasonalTrends}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.analytics.export}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get today's operational metrics
   */
  async getTodayMetrics() {
    const url = `${apiUrls.analytics.todayMetrics}?t=${Date.now()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.growthMetrics}?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
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
    const url = `${apiUrls.analytics.enhancedDashboard}?${params.toString()}`;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  }
};

// src/api/categories.ts
init_api();
var categoriesApi = {
  /**
   * Get all categories
   */
  async getCategories() {
    const response = await authenticatedFetch(apiUrls.categories.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.categories.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Search categories by name with filters
   */
  async searchCategories(filters) {
    const params = new URLSearchParams();
    const searchQuery = filters.q || filters.search;
    if (searchQuery)
      params.append("q", searchQuery);
    if (filters.merchantId)
      params.append("merchantId", filters.merchantId.toString());
    if (filters.isActive !== void 0)
      params.append("isActive", filters.isActive.toString());
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
    const response = await authenticatedFetch(`${apiUrls.categories.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Create a new category
   */
  async createCategory(categoryData) {
    const response = await authenticatedFetch(apiUrls.categories.create, {
      method: "POST",
      body: JSON.stringify(categoryData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing category
   */
  async updateCategory(categoryId, categoryData) {
    const response = await authenticatedFetch(apiUrls.categories.update(categoryId), {
      method: "PUT",
      body: JSON.stringify(categoryData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a category
   */
  async deleteCategory(categoryId) {
    const response = await authenticatedFetch(apiUrls.categories.delete(categoryId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  }
};

// src/api/notifications.ts
init_api();
var notificationsApi = {
  /**
   * Get all notifications
   */
  async getNotifications() {
    const response = await authenticatedFetch(apiUrls.notifications.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.notifications.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.notifications.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get notification by ID
   */
  async getNotification(notificationId) {
    const response = await authenticatedFetch(apiUrls.notifications.get(notificationId));
    return await parseApiResponse(response);
  },
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    const response = await authenticatedFetch(apiUrls.notifications.markRead(notificationId), {
      method: "PATCH"
    });
    return await parseApiResponse(response);
  },
  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId) {
    const response = await authenticatedFetch(apiUrls.notifications.markUnread(notificationId), {
      method: "PATCH"
    });
    return await parseApiResponse(response);
  },
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const response = await authenticatedFetch(apiUrls.notifications.markAllRead, {
      method: "PATCH"
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    const response = await authenticatedFetch(apiUrls.notifications.delete(notificationId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete all read notifications
   */
  async deleteAllRead() {
    const response = await authenticatedFetch(apiUrls.notifications.deleteAllRead, {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get unread count
   */
  async getUnreadCount() {
    const response = await authenticatedFetch(apiUrls.notifications.unreadCount);
    return await parseApiResponse(response);
  },
  /**
   * Get notification preferences
   */
  async getPreferences() {
    const response = await authenticatedFetch(apiUrls.notifications.preferences);
    return await parseApiResponse(response);
  },
  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    const response = await authenticatedFetch(apiUrls.notifications.preferences, {
      method: "PUT",
      body: JSON.stringify(preferences)
    });
    return await parseApiResponse(response);
  },
  /**
   * Send test notification
   */
  async sendTestNotification() {
    const response = await authenticatedFetch(apiUrls.notifications.test, {
      method: "POST"
    });
    return await parseApiResponse(response);
  }
};

// src/api/profile.ts
init_api();
var profileApi = {
  /**
   * Get current user profile
   */
  async getProfile() {
    const response = await authenticatedFetch(apiUrls.settings.user);
    return await parseApiResponse(response);
  },
  /**
   * Update current user profile
   */
  async updateProfile(profileData) {
    const response = await authenticatedFetch(apiUrls.settings.user, {
      method: "PUT",
      body: JSON.stringify(profileData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Change current user password
   */
  async changePassword(passwordData) {
    const response = await authenticatedFetch(apiUrls.settings.changePassword, {
      method: "PATCH",
      body: JSON.stringify(passwordData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append("profilePicture", file);
    const response = await authenticatedFetch(apiUrls.settings.uploadPicture, {
      method: "POST",
      body: formData
      // Don't set Content-Type header for FormData
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete profile picture
   */
  async deleteProfilePicture() {
    const response = await authenticatedFetch(apiUrls.settings.deletePicture, {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get user preferences
   */
  async getPreferences() {
    const response = await authenticatedFetch(apiUrls.settings.preferences);
    return await parseApiResponse(response);
  },
  /**
   * Update user preferences
   */
  async updatePreferences(preferences) {
    const response = await authenticatedFetch(apiUrls.settings.preferences, {
      method: "PUT",
      body: JSON.stringify(preferences)
    });
    return await parseApiResponse(response);
  },
  /**
   * Get user activity log
   */
  async getActivityLog(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await authenticatedFetch(`${apiUrls.settings.activityLog}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get user notifications
   */
  async getNotifications(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await authenticatedFetch(`${apiUrls.settings.profileNotifications}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    const response = await authenticatedFetch(apiUrls.settings.markNotificationRead(notificationId), {
      method: "PATCH"
    });
    return await parseApiResponse(response);
  },
  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead() {
    const response = await authenticatedFetch(apiUrls.settings.markAllNotificationsRead, {
      method: "PATCH"
    });
    return await parseApiResponse(response);
  }
};

// src/api/users.ts
init_api();
var usersApi = {
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
    const url = queryString ? `${apiUrls.users.list}?${queryString}` : apiUrls.users.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get users with pagination
   */
  async getUsersPaginated(page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await authenticatedFetch(`${apiUrls.users.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const url = queryString ? `${apiUrls.users.list}?${queryString}` : apiUrls.users.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const response = await authenticatedFetch(apiUrls.users.update(userId));
    return await parseApiResponse(response);
  },
  /**
   * Create new user
   */
  async createUser(userData) {
    const response = await authenticatedFetch(apiUrls.users.create, {
      method: "POST",
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update user
   */
  async updateUser(userId, userData) {
    const response = await authenticatedFetch(apiUrls.users.update(userId), {
      method: "PUT",
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete user
   */
  async deleteUser(userId) {
    const response = await authenticatedFetch(apiUrls.users.delete(userId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  // ============================================================================
  // USER MANAGEMENT OPERATIONS
  // ============================================================================
  /**
   * Update user by public ID
   */
  async updateUserByPublicId(userId, userData) {
    const response = await authenticatedFetch(apiUrls.users.updateByPublicId(userId), {
      method: "PUT",
      body: JSON.stringify(userData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Activate user by public ID
   */
  async activateUserByPublicId(userId) {
    const response = await authenticatedFetch(apiUrls.users.activateByPublicId(userId), {
      method: "PUT"
    });
    return await parseApiResponse(response);
  },
  /**
   * Deactivate user by public ID
   */
  async deactivateUserByPublicId(userId) {
    const response = await authenticatedFetch(apiUrls.users.deactivateByPublicId(userId), {
      method: "PUT"
    });
    return await parseApiResponse(response);
  },
  /**
   * Activate user
   */
  async activateUser(userId) {
    const response = await authenticatedFetch(`${apiUrls.users.update(userId)}/activate`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: true })
    });
    return await parseApiResponse(response);
  },
  /**
   * Deactivate user
   */
  async deactivateUser(userId) {
    const response = await authenticatedFetch(`${apiUrls.users.update(userId)}/deactivate`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false })
    });
    return await parseApiResponse(response);
  },
  /**
   * Change user password
   */
  async changePassword(userId, newPassword) {
    const response = await authenticatedFetch(`${apiUrls.users.update(userId)}/change-password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword })
    });
    return await parseApiResponse(response);
  }
};

// src/api/plans.ts
init_api();
var publicFetch2 = async (url, options = {}) => {
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
var plansApi = {
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
    const url = queryString ? `${apiUrls.plans.list}?${queryString}` : apiUrls.plans.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId) {
    const response = await authenticatedFetch(apiUrls.plans.get(planId));
    return await parseApiResponse(response);
  },
  /**
   * Create a new plan
   */
  async createPlan(planData) {
    const response = await authenticatedFetch(apiUrls.plans.create, {
      method: "POST",
      body: JSON.stringify(planData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing plan
   */
  async updatePlan(planId, planData) {
    const response = await authenticatedFetch(apiUrls.plans.update(planId), {
      method: "PUT",
      body: JSON.stringify(planData)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a plan (soft delete)
   */
  async deletePlan(planId) {
    const response = await authenticatedFetch(apiUrls.plans.delete(planId), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get plan statistics
   */
  async getPlanStats() {
    const response = await authenticatedFetch(apiUrls.plans.stats);
    return await parseApiResponse(response);
  },
  /**
   * Get public plans (for display to users)
   */
  async getPublicPlans() {
    const response = await authenticatedFetch(apiUrls.plans.public);
    return await parseApiResponse(response);
  }
};
var publicPlansApi = {
  /**
   * Get public plans with variants (no authentication required)
   */
  async getPublicPlansWithVariants() {
    const response = await publicFetch2(apiUrls.plans.public);
    return await parseApiResponse(response);
  }
};

// src/api/billing-cycles.ts
init_api();
var billingCyclesApi = {
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
    const url = queryString ? `${apiUrls.billingCycles.list}?${queryString}` : apiUrls.billingCycles.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get a specific billing cycle by ID
   */
  async getBillingCycle(id) {
    const response = await authenticatedFetch(apiUrls.billingCycles.get(id));
    return await parseApiResponse(response);
  },
  /**
   * Create a new billing cycle
   */
  async createBillingCycle(input) {
    const response = await authenticatedFetch(apiUrls.billingCycles.create, {
      method: "POST",
      body: JSON.stringify(input)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing billing cycle
   */
  async updateBillingCycle(id, input) {
    const response = await authenticatedFetch(apiUrls.billingCycles.update(id), {
      method: "PUT",
      body: JSON.stringify(input)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a billing cycle
   */
  async deleteBillingCycle(id) {
    const response = await authenticatedFetch(apiUrls.billingCycles.delete(id), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
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

// src/api/payments.ts
init_api();
var paymentsApi = {
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
    const url = queryString ? `${apiUrls.payments.list}?${queryString}` : apiUrls.payments.list;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  },
  /**
   * Get a specific payment by ID
   */
  async getPayment(id) {
    const response = await authenticatedFetch(apiUrls.payments.get(id));
    return await parseApiResponse(response);
  },
  /**
   * Create a new payment
   */
  async createPayment(input) {
    const response = await authenticatedFetch(apiUrls.payments.create, {
      method: "POST",
      body: JSON.stringify(input)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update an existing payment
   */
  async updatePayment(id, input) {
    const response = await authenticatedFetch(apiUrls.payments.update(id), {
      method: "PUT",
      body: JSON.stringify(input)
    });
    return await parseApiResponse(response);
  },
  /**
   * Create a manual payment
   */
  async createManualPayment(input) {
    const response = await authenticatedFetch(apiUrls.payments.manual, {
      method: "POST",
      body: JSON.stringify(input)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a payment
   */
  async deletePayment(id) {
    const response = await authenticatedFetch(apiUrls.payments.delete(id), {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Process payment
   */
  async processPayment(id) {
    const response = await authenticatedFetch(apiUrls.payments.process(id), {
      method: "POST"
    });
    return await parseApiResponse(response);
  },
  /**
   * Refund payment
   */
  async refundPayment(id, reason) {
    const response = await authenticatedFetch(apiUrls.payments.refund(id), {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    return await parseApiResponse(response);
  },
  /**
   * Get payment statistics
   */
  async getPaymentStats() {
    const response = await authenticatedFetch(apiUrls.payments.stats);
    return await parseApiResponse(response);
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
    const url = queryString ? `${apiUrls.payments.export}?${queryString}` : apiUrls.payments.export;
    const response = await authenticatedFetch(url);
    return await parseApiResponse(response);
  }
};

// src/api/audit-logs.ts
init_api();
async function getAuditLogs(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.list}?${queryString}` : apiUrls.auditLogs.list;
  const response = await authenticatedFetch(url);
  return await parseApiResponse(response);
}
async function getAuditLogStats(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.stats}?${queryString}` : apiUrls.auditLogs.stats;
  const response = await authenticatedFetch(url);
  return await parseApiResponse(response);
}
async function exportAuditLogs(filter = {}) {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== void 0 && value !== "") {
      params.append(key, value.toString());
    }
  });
  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.export}?${queryString}` : apiUrls.auditLogs.export;
  const response = await authenticatedFetch(url, {
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

// src/api/settings.ts
init_api();
var settingsApi = {
  /**
   * Update merchant settings
   */
  async updateMerchantSettings(data) {
    const response = await authenticatedFetch(apiUrls.settings.merchant, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(apiUrls.settings.user);
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Update user profile
   */
  async updateUserProfile(data) {
    const response = await authenticatedFetch(apiUrls.settings.user, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Update outlet information
   */
  async updateOutletInfo(data) {
    const response = await authenticatedFetch(apiUrls.settings.outlet, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get billing settings
   */
  async getBillingSettings() {
    const response = await authenticatedFetch(apiUrls.settings.billing);
    return await parseApiResponse(response);
  },
  /**
   * Update billing settings
   */
  async updateBillingSettings(data) {
    const response = await authenticatedFetch(apiUrls.settings.billing, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Get billing intervals
   */
  async getBillingIntervals() {
    const response = await authenticatedFetch(`${apiUrls.settings.billing}/intervals`);
    return await parseApiResponse(response);
  },
  /**
   * Update billing intervals
   */
  async updateBillingIntervals(intervals) {
    const response = await authenticatedFetch(`${apiUrls.settings.billing}/intervals`, {
      method: "POST",
      body: JSON.stringify({ intervals })
    });
    return await parseApiResponse(response);
  },
  /**
   * Update merchant currency
   */
  async updateMerchantCurrency(data) {
    const response = await authenticatedFetch(apiUrls.settings.currency, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    const result = await parseApiResponse(response);
    return result;
  },
  /**
   * Get merchant currency
   */
  async getMerchantCurrency() {
    const response = await authenticatedFetch(apiUrls.settings.currency);
    const result = await parseApiResponse(response);
    return result;
  }
};

// src/api/subscriptions.ts
init_api();
var subscriptionsApi = {
  /**
   * Get all subscriptions
   */
  async getSubscriptions() {
    const response = await authenticatedFetch(apiUrls.subscriptions.list);
    const result = await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?${params.toString()}`);
    return await parseApiResponse(response);
  },
  /**
   * Get subscription by ID
   */
  async getById(id) {
    const response = await authenticatedFetch(apiUrls.subscriptions.get(id));
    return await parseApiResponse(response);
  },
  /**
   * Create new subscription
   */
  async create(data) {
    const response = await authenticatedFetch(apiUrls.subscriptions.create, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update subscription
   */
  async update(id, data) {
    const response = await authenticatedFetch(apiUrls.subscriptions.update(id), {
      method: "PUT",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Cancel subscription (soft delete)
   */
  async cancel(id, reason) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    return await parseApiResponse(response);
  },
  /**
   * Change subscription plan
   */
  async changePlan(id, newPlanId) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.update(id)}/change-plan`, {
      method: "PATCH",
      body: JSON.stringify({ newPlanId })
    });
    return await parseApiResponse(response);
  },
  /**
   * Extend subscription
   */
  async extend(id, data) {
    const response = await authenticatedFetch(apiUrls.subscriptions.extend(id), {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Get subscription status for current user
   * Returns computed subscription status with single source of truth
   */
  async getCurrentUserSubscriptionStatus() {
    const response = await authenticatedFetch(apiUrls.subscriptions.status);
    return await parseApiResponse(response);
  },
  /**
   * Get subscription status by merchant ID
   */
  async getSubscriptionStatus(merchantId) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.status}?merchantId=${merchantId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get subscriptions by merchant
   */
  async getSubscriptionsByMerchant(merchantId) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.list}?merchantId=${merchantId}`);
    return await parseApiResponse(response);
  },
  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const response = await authenticatedFetch(apiUrls.subscriptions.stats);
    return await parseApiResponse(response);
  },
  /**
   * Pause/Suspend subscription
   */
  async suspend(id, data = {}) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/pause`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Resume subscription
   */
  async resume(id, data = {}) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/resume`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await parseApiResponse(response);
  },
  /**
   * Get subscription activities
   */
  async getActivities(id, limit = 20) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/activities?limit=${limit}`);
    return await parseApiResponse(response);
  },
  /**
   * Get subscription payments
   */
  async getPayments(id, limit = 20) {
    const response = await authenticatedFetch(`${apiUrls.subscriptions.get(id)}/payments?limit=${limit}`);
    return await parseApiResponse(response);
  }
};

// src/api/system.ts
init_api();
var systemApi = {
  /**
   * Get all backups
   */
  async getBackups() {
    const response = await authenticatedFetch(apiUrls.system?.backup || "/api/system/backup");
    return await parseApiResponse(response);
  },
  /**
   * Create a new backup
   */
  async createBackup(type = "full") {
    const response = await authenticatedFetch(apiUrls.system?.backup || "/api/system/backup", {
      method: "POST",
      body: JSON.stringify({ type })
    });
    return await parseApiResponse(response);
  },
  /**
   * Download a backup
   */
  async downloadBackup(backupId) {
    return await authenticatedFetch(`${apiUrls.system?.backup || "/api/system/backup"}/${backupId}/download`);
  },
  /**
   * Delete a backup
   */
  async deleteBackup(backupId) {
    const response = await authenticatedFetch(`${apiUrls.system?.backup || "/api/system/backup"}/${backupId}`, {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Get backup schedules
   */
  async getBackupSchedules() {
    const response = await authenticatedFetch(apiUrls.system?.backupSchedule || "/api/system/backup/schedule");
    return await parseApiResponse(response);
  },
  /**
   * Create a backup schedule
   */
  async createBackupSchedule(schedule) {
    const response = await authenticatedFetch(apiUrls.system?.backupSchedule || "/api/system/backup/schedule", {
      method: "POST",
      body: JSON.stringify(schedule)
    });
    return await parseApiResponse(response);
  },
  /**
   * Update a backup schedule
   */
  async updateBackupSchedule(scheduleId, schedule) {
    const response = await authenticatedFetch(`${apiUrls.system?.backupSchedule || "/api/system/backup/schedule"}/${scheduleId}`, {
      method: "PUT",
      body: JSON.stringify(schedule)
    });
    return await parseApiResponse(response);
  },
  /**
   * Delete a backup schedule
   */
  async deleteBackupSchedule(scheduleId) {
    const response = await authenticatedFetch(`${apiUrls.system?.backupSchedule || "/api/system/backup/schedule"}/${scheduleId}`, {
      method: "DELETE"
    });
    return await parseApiResponse(response);
  },
  /**
   * Verify a backup
   */
  async verifyBackup(backupId) {
    const response = await authenticatedFetch(`${apiUrls.system?.backupVerify || "/api/system/backup/verify"}`, {
      method: "POST",
      body: JSON.stringify({ backupId })
    });
    return await parseApiResponse(response);
  },
  /**
   * Get system statistics
   */
  async getSystemStats() {
    const response = await authenticatedFetch(apiUrls.system?.stats || "/api/system/stats");
    return await parseApiResponse(response);
  },
  /**
   * Get system health status
   */
  async getSystemHealth() {
    const response = await authenticatedFetch(apiUrls.system?.health || "/api/system/health");
    return await parseApiResponse(response);
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
    const response = await authenticatedFetch(`${apiUrls.system?.logs || "/api/system/logs"}?${params.toString()}`);
    return await parseApiResponse(response);
  }
};

// src/api/calendar.ts
init_api();
var calendarApi = {
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
    const response = await authenticatedFetch(`${apiUrls.calendar.orders}?${searchParams}`);
    const result = await parseApiResponse(response);
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

// src/api/upload.ts
var DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
var DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
var WARNING_SIZE_THRESHOLD = 2 * 1024 * 1024;
var MIN_FILE_SIZE = 100;
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
    xhr.upload.addEventListener("progress", (e2) => {
      if (e2.lengthComputable && onProgress) {
        onProgress({
          loaded: e2.loaded,
          total: e2.total,
          percentage: Math.round(e2.loaded / e2.total * 100),
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

// src/api/response-builder.ts
var ERROR_MESSAGES2 = {
  // Authentication & Authorization
  "INVALID_CREDENTIALS": "Invalid email or password",
  "ACCOUNT_DEACTIVATED": "Account is deactivated. Please contact support.",
  "CURRENT_PASSWORD_REQUIRED": "Current password is required",
  "CURRENT_PASSWORD_INCORRECT": "Current password is incorrect",
  "PASSWORD_MIN_LENGTH": "New password must be at least 6 characters",
  "PASSWORD_MISMATCH": "Passwords do not match",
  "CROSS_MERCHANT_ACCESS_DENIED": "Cannot access data from other merchants",
  "USER_NOT_ASSIGNED": "User not assigned to merchant/outlet",
  "MERCHANT_ASSOCIATION_REQUIRED": "User must be associated with a merchant",
  "NO_MERCHANT_ACCESS": "User does not have merchant access",
  "NO_OUTLET_ACCESS": "User does not have outlet access",
  "MERCHANT_ACCESS_REQUIRED": "Merchant access required",
  "DELETE_USER_OUT_OF_SCOPE": "Cannot delete user outside your scope",
  "UPDATE_USER_OUT_OF_SCOPE": "Cannot update user outside your scope",
  "DELETE_OWN_ACCOUNT_ONLY": "You can only delete your own account",
  // Validation Errors
  "INVALID_QUERY": "Invalid query parameters",
  "INVALID_PAYLOAD": "Invalid request payload",
  "INVALID_USER_DATA": "Invalid user data",
  "INVALID_UPDATE_DATA": "Invalid update data",
  "BUSINESS_NAME_REQUIRED": "Business name is required",
  "CATEGORY_NAME_REQUIRED": "Category name is required",
  "OUTLET_NAME_ADDRESS_REQUIRED": "Outlet name and address are required",
  "USER_ID_REQUIRED": "User ID is required",
  "CUSTOMER_ID_REQUIRED": "Customer ID is required",
  "ORDER_ID_REQUIRED": "Order ID is required",
  "PRODUCT_ID_REQUIRED": "Product ID is required",
  "MERCHANT_ID_REQUIRED": "Merchant ID is required",
  "OUTLET_ID_REQUIRED": "Outlet ID is required",
  "PLAN_ID_REQUIRED": "Plan ID is required",
  "INVALID_AMOUNT": "Amount must be greater than 0",
  "INVALID_CUSTOMER_ID_FORMAT": "Invalid customer ID format",
  "INVALID_PRODUCT_ID_FORMAT": "Invalid product ID format",
  "INVALID_ORDER_ID_FORMAT": "Invalid order ID format",
  "INVALID_MERCHANT_ID_FORMAT": "Invalid merchant ID format",
  "INVALID_USER_ID_FORMAT": "Invalid user ID format",
  "INVALID_PLAN_ID_FORMAT": "Invalid plan ID format",
  "INVALID_AUDIT_LOG_ID_FORMAT": "Invalid audit log ID format",
  "INVALID_DATE_FORMAT": "Invalid date format",
  "INVALID_BUSINESS_TYPE": "Invalid business type",
  "INVALID_PRICING_TYPE": "Invalid pricing type",
  "INVALID_PLATFORM": 'Invalid platform. Must be "ios" or "android"',
  "INVALID_END_DATE": "End date must be in the future",
  "INVALID_INTERVAL_CONFIG": "Invalid interval configuration",
  "INVALID_BILLING_CONFIG": "Invalid billing configuration",
  "ADMIN_OUTLET_ID_REQUIRED": "Admin users need to specify outlet ID for outlet updates",
  "INVALID_CATEGORY_ID": "Invalid category ID",
  "INVALID_SUBSCRIPTION_ID": "Invalid subscription ID",
  // Not Found Errors
  "USER_NOT_FOUND": "User not found",
  "MERCHANT_NOT_FOUND": "Merchant not found",
  "OUTLET_NOT_FOUND": "Outlet not found",
  "PRODUCT_NOT_FOUND": "Product not found",
  "ORDER_NOT_FOUND": "Order not found",
  "CUSTOMER_NOT_FOUND": "Customer not found",
  "CATEGORY_NOT_FOUND": "Category not found",
  "PLAN_NOT_FOUND": "Plan not found",
  "SUBSCRIPTION_NOT_FOUND": "Subscription not found",
  "PAYMENT_NOT_FOUND": "Payment not found",
  "AUDIT_LOG_NOT_FOUND": "Audit log not found",
  "NO_OUTLETS_FOUND": "No outlets found for merchant",
  "NO_SUBSCRIPTION_FOUND": "No subscription found for this merchant",
  "NO_DATA_AVAILABLE": "No data available - user not assigned to merchant/outlet",
  // Conflict Errors
  "EMAIL_EXISTS": "Email address is already registered",
  "PHONE_EXISTS": "Phone number is already registered",
  "CUSTOMER_DUPLICATE": "A customer with this email or phone already exists",
  "OUTLET_NAME_EXISTS": "An outlet with this name already exists for this merchant",
  "CATEGORY_NAME_EXISTS": "Category with this name already exists",
  // Business Rules
  "PRODUCT_NO_STOCK_ENTRY": "Product must have at least one outlet stock entry",
  "ACCOUNT_ALREADY_DELETED": "Account is already deleted",
  "ORDER_PAYMENT_REQUIRED": "Order ID, amount, and method are required",
  "SUBSCRIPTION_END_DATE_REQUIRED": "Subscription ID, end date, and amount are required",
  "DEVICE_INFO_REQUIRED": "Missing required fields: deviceId, pushToken, platform",
  "API_KEY_NAME_REQUIRED": "API key name is required",
  "VALID_USER_ID_REQUIRED": "Valid user ID is required",
  // System Errors
  "INTERNAL_SERVER_ERROR": "Internal server error",
  "FETCH_MERCHANTS_FAILED": "Failed to fetch merchants",
  "FETCH_OUTLETS_FAILED": "Failed to fetch outlets",
  "FETCH_PRODUCTS_FAILED": "Failed to fetch products",
  "FETCH_ORDERS_FAILED": "Failed to fetch orders",
  "CREATE_CUSTOMER_FAILED": "Failed to create customer",
  "UPDATE_USER_FAILED": "Failed to update user",
  "DELETE_USER_FAILED": "Failed to delete user",
  "FEATURE_NOT_IMPLEMENTED": "This feature is not yet implemented",
  // Default
  "UNKNOWN_ERROR": "An unknown error occurred"
};
var SUCCESS_MESSAGES = {
  // Authentication
  "LOGIN_SUCCESS": "Login successful",
  "LOGOUT_SUCCESS": "Logged out successfully",
  "PASSWORD_CHANGED_SUCCESS": "Password changed successfully",
  "PASSWORD_RESET_SUCCESS": "Password has been reset successfully",
  "PASSWORD_RESET_LINK_SENT": "If an account with that email exists, a password reset link has been sent",
  // Create Operations
  "USER_CREATED_SUCCESS": "User created successfully",
  "CUSTOMER_CREATED_SUCCESS": "Customer created successfully",
  "PRODUCT_CREATED_SUCCESS": "Product created successfully",
  "ORDER_CREATED_SUCCESS": "Order created successfully",
  "CATEGORY_CREATED_SUCCESS": "Category created successfully",
  "OUTLET_CREATED_SUCCESS": "Outlet created successfully",
  "PLAN_CREATED_SUCCESS": "Plan created successfully",
  "MERCHANT_CREATED_SUCCESS": "Merchant created successfully with default outlet",
  // Update Operations
  "USER_UPDATED_SUCCESS": "User updated successfully",
  "CUSTOMER_UPDATED_SUCCESS": "Customer updated successfully",
  "PRODUCT_UPDATED_SUCCESS": "Product updated successfully",
  "ORDER_UPDATED_SUCCESS": "Order updated successfully",
  "CATEGORY_UPDATED_SUCCESS": "Category updated successfully",
  "OUTLET_UPDATED_SUCCESS": "Outlet updated successfully",
  "MERCHANT_UPDATED_SUCCESS": "Merchant updated successfully",
  "PROFILE_UPDATED_SUCCESS": "Profile updated successfully",
  "MERCHANT_INFO_UPDATED_SUCCESS": "Merchant information updated successfully",
  "OUTLET_INFO_UPDATED_SUCCESS": "Outlet information updated successfully",
  "CURRENCY_UPDATED_SUCCESS": "Currency updated successfully",
  // Delete Operations
  "USER_DELETED_SUCCESS": "User deleted successfully",
  "CUSTOMER_DELETED_SUCCESS": "Customer deleted successfully",
  "PRODUCT_DELETED_SUCCESS": "Product deleted successfully",
  "CATEGORY_DELETED_SUCCESS": "Category deleted successfully",
  "OUTLET_DELETED_SUCCESS": "Outlet deleted successfully",
  "MERCHANT_DELETED_SUCCESS": "Merchant deleted successfully",
  "USER_DEACTIVATED_SUCCESS": "User deactivated successfully",
  // Retrieve Operations
  "USER_RETRIEVED_SUCCESS": "User retrieved successfully",
  "CUSTOMER_RETRIEVED_SUCCESS": "Customer retrieved successfully",
  "PRODUCT_RETRIEVED_SUCCESS": "Product retrieved successfully",
  "ORDER_RETRIEVED_SUCCESS": "Order retrieved successfully",
  "CATEGORY_RETRIEVED_SUCCESS": "Category retrieved successfully",
  "MERCHANT_RETRIEVED_SUCCESS": "Merchant retrieved successfully",
  // Special Operations
  "DASHBOARD_DATA_SUCCESS": "Enhanced dashboard data retrieved successfully",
  "GROWTH_METRICS_SUCCESS": "Growth metrics retrieved successfully",
  "TODAY_METRICS_SUCCESS": "Today metrics retrieved successfully",
  "MERCHANT_REGISTERED_TRIAL_SUCCESS": "Merchant registered successfully with 14-day free trial",
  "MERCHANT_ACCOUNT_CREATED_SUCCESS": "Merchant account created successfully with default outlet and trial subscription",
  "USER_ACCOUNT_CREATED_SUCCESS": "User account created successfully"
};
function getDefaultMessage(code) {
  return ERROR_MESSAGES2[code] || SUCCESS_MESSAGES[code] || code;
}
var ResponseBuilder = class {
  /**
   * Build success response
   * @param code - Success code (e.g., 'USER_CREATED_SUCCESS')
   * @param data - Response data
   * @param meta - Optional metadata (pagination, etc.)
   */
  static success(code, data, meta) {
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
   * @param error - Optional error details
   */
  static error(code, error) {
    return {
      success: false,
      code,
      message: getDefaultMessage(code),
      error
    };
  }
  /**
   * Build paginated success response
   * @param code - Success code
   * @param data - Array of items
   * @param pagination - Pagination info
   */
  static paginated(code, data, pagination) {
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
   * Build validation error response
   * @param validationErrors - Zod validation errors
   */
  static validationError(validationErrors) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Input validation failed",
      error: validationErrors
    };
  }
};
function getErrorCode(error) {
  if (typeof error === "string")
    return error;
  if (error?.code)
    return error.code;
  if (error?.name === "ZodError")
    return "VALIDATION_ERROR";
  if (error?.message?.includes("not found"))
    return "NOT_FOUND";
  if (error?.message?.includes("already exists"))
    return "DUPLICATE_ENTRY";
  return "UNKNOWN_ERROR";
}
function createErrorResponse(error) {
  if (error?.name === "ZodError") {
    return ResponseBuilder.validationError(error.flatten());
  }
  if (error?.code) {
    return ResponseBuilder.error(error.code, error.details);
  }
  const code = getErrorCode(error);
  return ResponseBuilder.error(code, {
    message: error?.message,
    stack: process.env.NODE_ENV === "development" ? error?.stack : void 0
  });
}
function getErrorStatusCode(error, defaultCode = 500) {
  const code = getErrorCode(error);
  if (error?.name === "ZodError")
    return 400;
  if (code === "VALIDATION_ERROR")
    return 400;
  if (code === "INVALID_INPUT")
    return 400;
  if (code === "INVALID_PAYLOAD")
    return 400;
  if (code === "INVALID_QUERY")
    return 400;
  if (code?.includes("_REQUIRED"))
    return 400;
  if (code?.includes("INVALID_"))
    return 400;
  if (code === "UNAUTHORIZED")
    return 401;
  if (code === "INVALID_TOKEN")
    return 401;
  if (code === "TOKEN_EXPIRED")
    return 401;
  if (code === "INVALID_CREDENTIALS")
    return 401;
  if (code === "FORBIDDEN")
    return 403;
  if (code === "ACCOUNT_DEACTIVATED")
    return 403;
  if (code === "INSUFFICIENT_PERMISSIONS")
    return 403;
  if (code?.includes("ACCESS_DENIED"))
    return 403;
  if (code?.includes("_OUT_OF_SCOPE"))
    return 403;
  if (code?.includes("_NOT_FOUND"))
    return 404;
  if (code === "NOT_FOUND")
    return 404;
  if (code?.includes("_EXISTS"))
    return 409;
  if (code?.includes("_DUPLICATE"))
    return 409;
  if (code === "DUPLICATE_ENTRY")
    return 409;
  if (code === "BUSINESS_RULE_VIOLATION")
    return 422;
  if (code?.includes("PRODUCT_NO_STOCK"))
    return 422;
  if (code === "PLAN_LIMIT_EXCEEDED")
    return 422;
  if (code === "SERVICE_UNAVAILABLE")
    return 503;
  return defaultCode;
}

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
var databaseConfig = getDatabaseConfig();

// src/config/environment.ts
var getClientUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.CLIENT_URL_PROD || process.env.NEXT_PUBLIC_CLIENT_URL || "https://rentalshop.com";
  }
  if (process.env.NODE_ENV === "development") {
    return process.env.CLIENT_URL_DEV || process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";
  }
  return process.env.CLIENT_URL_LOCAL || process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";
};
var getAdminUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.ADMIN_URL_PROD || process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.rentalshop.com";
  }
  if (process.env.NODE_ENV === "development") {
    return process.env.ADMIN_URL_DEV || process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
  }
  return process.env.ADMIN_URL_LOCAL || process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
};
var getMobileUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.MOBILE_URL_PROD || process.env.NEXT_PUBLIC_MOBILE_URL || "https://mobile.rentalshop.com";
  }
  if (process.env.NODE_ENV === "development") {
    return process.env.MOBILE_URL_DEV || process.env.NEXT_PUBLIC_MOBILE_URL || "http://localhost:3003";
  }
  return process.env.MOBILE_URL_LOCAL || process.env.NEXT_PUBLIC_MOBILE_URL || "http://localhost:3003";
};
var getEnvironmentUrls = () => ({
  client: getClientUrl(),
  admin: getAdminUrl(),
  mobile: getMobileUrl()
});
var isBrowser = () => {
  return typeof window !== "undefined";
};
var isServer = () => {
  return typeof window === "undefined";
};
var isDev = () => {
  return process.env.NODE_ENV === "development";
};
var isProd = () => {
  return process.env.NODE_ENV === "production";
};
var isTest = () => {
  return process.env.NODE_ENV === "test";
};

// src/core/error-display.ts
function getDisplayErrorKey(error) {
  if (error?.error && typeof error.error === "string") {
    return error.error;
  }
  if (error?.code && isValidErrorCode(error.code)) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}
function hasTranslatableError(error) {
  const errorKey = getDisplayErrorKey(error);
  return errorKey !== "UNKNOWN_ERROR";
}
function getErrorDetails(error) {
  return error?.details || error?.message;
}

// src/breadcrumbs.ts
var productBreadcrumbs = {
  // Home > Products
  list: () => [
    { label: "Products" }
  ],
  // Home > Products > Product Name
  detail: (productName, productId) => [
    { label: "Products", href: "/products" },
    { label: productName }
  ],
  // Home > Products > Product Name > Edit
  edit: (productName, productId) => [
    { label: "Products", href: "/products" },
    { label: productName, href: `/products/${productId}` },
    { label: "Edit" }
  ],
  // Home > Products > Product Name > Orders
  orders: (productName, productId) => [
    { label: "Products", href: "/products" },
    { label: productName, href: `/products/${productId}` },
    { label: "Orders" }
  ]
};
var orderBreadcrumbs = {
  // Home > Orders
  list: () => [
    { label: "Orders" }
  ],
  // Home > Orders > ORD-XXX-XXXX
  detail: (orderNumber) => [
    { label: "Orders", href: "/orders" },
    { label: orderNumber }
  ],
  // Home > Orders > ORD-XXX-XXXX > Edit
  edit: (orderNumber, orderId) => [
    { label: "Orders", href: "/orders" },
    { label: orderNumber, href: `/orders/${orderId}` },
    { label: "Edit" }
  ],
  // Home > Orders > Create
  create: () => [
    { label: "Orders", href: "/orders" },
    { label: "Create" }
  ]
};
var customerBreadcrumbs = {
  // Home > Customers
  list: () => [
    { label: "Customers" }
  ],
  // Home > Customers > Customer Name
  detail: (customerName, customerId) => [
    { label: "Customers", href: "/customers" },
    { label: customerName }
  ],
  // Home > Customers > Customer Name > Edit
  edit: (customerName, customerId) => [
    { label: "Customers", href: "/customers" },
    { label: customerName, href: `/customers/${customerId}` },
    { label: "Edit" }
  ],
  // Home > Customers > Customer Name > Orders
  orders: (customerName, customerId) => [
    { label: "Customers", href: "/customers" },
    { label: customerName, href: `/customers/${customerId}` },
    { label: "Orders" }
  ]
};
var userBreadcrumbs = {
  // Home > Dashboard > Users
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Users" }
  ],
  // Home > Dashboard > Users > User Name
  detail: (userName, userId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Users", href: "/users" },
    { label: userName }
  ],
  // Home > Dashboard > Users > User Name > Edit
  edit: (userName, userId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Users", href: "/users" },
    { label: userName, href: `/users/${userId}` },
    { label: "Edit" }
  ]
};
var outletBreadcrumbs = {
  // Home > Dashboard > Outlets
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Outlets" }
  ],
  // Home > Dashboard > Outlets > Outlet Name
  detail: (outletName, outletId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Outlets", href: "/outlets" },
    { label: outletName }
  ]
};
var subscriptionBreadcrumbs = {
  // Home > Dashboard > Subscriptions
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Subscriptions" }
  ],
  // Home > Dashboard > Subscriptions > #ID - Merchant Name
  detail: (subscriptionId, merchantName) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Subscriptions", href: "/subscriptions" },
    { label: `#${subscriptionId}${merchantName ? ` - ${merchantName}` : ""}` }
  ]
};
var merchantBreadcrumbs = {
  // Home > Dashboard > Merchants
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Merchants" }
  ],
  // Home > Dashboard > Merchants > Merchant Name
  detail: (merchantName, merchantId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Merchants", href: "/merchants" },
    { label: merchantName }
  ],
  // Home > Dashboard > Merchants > Merchant Name > Orders
  orders: (merchantName, merchantId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Merchants", href: "/merchants" },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: "Orders" }
  ],
  // Home > Dashboard > Merchants > Merchant Name > Orders > ORD-XXX
  orderDetail: (merchantName, merchantId, orderNumber, orderId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Merchants", href: "/merchants" },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: "Orders", href: `/merchants/${merchantId}/orders` },
    { label: orderNumber }
  ],
  // Home > Dashboard > Merchants > Merchant Name > Orders > ORD-XXX > Edit
  orderEdit: (merchantName, merchantId, orderNumber, orderId) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Merchants", href: "/merchants" },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: "Orders", href: `/merchants/${merchantId}/orders` },
    { label: orderNumber, href: `/merchants/${merchantId}/orders/${orderId}` },
    { label: "Edit" }
  ]
};
var categoryBreadcrumbs = {
  // Home > Dashboard > Categories
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Categories" }
  ]
};
var reportBreadcrumbs = {
  // Home > Dashboard > Reports
  list: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Reports" }
  ],
  // Home > Dashboard > Reports > Report Type
  detail: (reportType) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Reports", href: "/reports" },
    { label: reportType }
  ]
};
var settingsBreadcrumbs = {
  // Home > Dashboard > Settings
  main: () => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings" }
  ],
  // Home > Dashboard > Settings > Section Name
  section: (sectionName) => [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: sectionName }
  ]
};

// src/performance.ts
var PerformanceMonitor = class {
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
PerformanceMonitor.metrics = [];
PerformanceMonitor.slowQueryThreshold = 1e3;
// 1 second
PerformanceMonitor.maxMetrics = 1e3;
var DatabaseMonitor = class {
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
DatabaseMonitor.connectionCount = 0;
DatabaseMonitor.activeQueries = 0;
var MemoryMonitor = class {
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
var APIMonitor = class {
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

export { APIMonitor, API_BASE_URL, ApiError, AuditHelper, AuditPerformanceMonitor, DEFAULT_CURRENCIES, DEFAULT_CURRENCY_SETTINGS, DatabaseMonitor, DuplicateError, ERROR_MESSAGES, ERROR_STATUS_CODES, ErrorCode, ForbiddenError, MemoryMonitor, NotFoundError, PerformanceMonitor, PlanLimitError, PricingResolver, PricingValidator, ResponseBuilder, SubscriptionManager, UnauthorizedError, ValidationError, addDaysToDate, analyticsApi, analyzeError, apiConfig, apiEnvironment, apiUrls, assertPlanLimit, auditPerformanceMonitor, authApi, authenticatedFetch, billingCyclesApi, buildApiUrl, calculateCustomerStats, calculateDiscountedPrice, calculateNewBillingDate, calculateProductStats, calculateProratedAmount, calculateProration, calculateRenewalPrice, calculateSavings, calculateStockPercentage, calculateSubscriptionPeriod, calculateSubscriptionPrice, calculateUserStats, calendarApi, canCreateUsers, canPerformOperation, canRentProduct, canSellProduct, capitalizeWords, categoriesApi, categoriesQuerySchema, categoryBreadcrumbs, checkSubscriptionStatus, clearAuthData, compareOrderNumberFormats, convertCurrency, createApiUrl, createAuditHelper, createErrorResponse, createPaymentGatewayManager, createUploadController, customerBreadcrumbs, customerCreateSchema, customerUpdateSchema, customersApi, customersQuerySchema, databaseConfig, debounce, defaultAuditConfig, delay, exportAuditLogs, fileToBase64, filterCustomers, filterProducts, filterUsers, formatBillingCycle, formatChartPeriod, formatCurrency, formatCurrencyAdvanced, formatCustomerForDisplay, formatDailyByLocale, formatDate, formatDateByLocale, formatDateLong, formatDateShort, formatDateTime, formatDateTimeByLocale, formatDateTimeLong, formatDateTimeShort, formatDateWithLocale, formatFullDateByLocale, formatMonthOnlyByLocale, formatPhoneNumber, formatProductPrice, formatProration, formatSubscriptionPeriod, formatTimeByLocale, generateRandomString, generateSlug, getAdminUrl, getAllPricingOptions, getAllowedOperations, getApiBaseUrl, getApiCorsOrigins, getApiDatabaseUrl, getApiJwtSecret, getApiUrl, getAuditConfig, getAuditEntityConfig, getAuditLogStats, getAuditLogs, getAuthToken, getAvailabilityBadge, getAvailabilityBadgeConfig, getBillingCycleDiscount, getClientUrl, getCurrency, getCurrencyDisplay, getCurrentCurrency, getCurrentDate, getCurrentEntityCounts, getCurrentEnvironment, getCurrentUser, getCustomerAddress, getCustomerAge, getCustomerContactInfo, getCustomerFullName, getCustomerIdTypeBadge, getCustomerLocationBadge, getCustomerStatusBadge, getDatabaseConfig, getDateLocale, getDaysDifference, getDiscountPercentage, getDisplayErrorKey, getEnvironmentUrls, getErrorCode, getErrorDetails, getErrorStatusCode, getErrorTranslationKey, getExchangeRate, getFormatRecommendations, getImageDimensions, getInitials, getLocationBadge, getLocationBadgeConfig, getMobileUrl, getOutletStats, getPlanLimitError, getPlanLimitErrorMessage, getPlanLimitsInfo, getPriceTrendBadge, getPriceTrendBadgeConfig, getPricingBreakdown, getPricingComparison, getProductAvailabilityBadge, getProductCategoryName, getProductDisplayName, getProductImageUrl, getProductOutletName, getProductStatusBadge, getProductStockStatus, getProductTypeBadge, getRoleBadge, getRoleBadgeConfig, getStatusBadge, getStatusBadgeConfig, getStoredUser, getSubscriptionError, getSubscriptionStatusBadge, getSubscriptionStatusPriority, getToastType, getTomorrow, getUserFullName, getUserRoleBadge, getUserStatusBadge, handleApiError, handleApiErrorForUI, handleApiResponse, handleBusinessError, handlePrismaError, handleValidationError, hasTranslatableError, isAuthError, isAuthenticated, isBrowser, isDateAfter, isDateBefore, isDev, isDevelopment, isDevelopmentEnvironment, isEmpty, isErrorResponse, isGracePeriodExceeded, isLocal, isLocalEnvironment, isNetworkError, isPermissionError, isProd, isProduction, isProductionEnvironment, isServer, isSubscriptionExpired, isSuccessResponse, isTest, isValidCurrencyCode, isValidEmail, isValidErrorCode, isValidPhone, isValidationError, loginSchema, memoize, merchantBreadcrumbs, merchantsApi, migrateOrderNumbers, normalizeWhitespace, notificationsApi, once, orderBreadcrumbs, orderCreateSchema, orderUpdateSchema, ordersApi, ordersQuerySchema, outletBreadcrumbs, outletCreateSchema, outletUpdateSchema, outletsApi, outletsQuerySchema, parseApiResponse, parseCurrency, paymentsApi, planCreateSchema, planUpdateSchema, planVariantCreateSchema, planVariantUpdateSchema, planVariantsQuerySchema, plansApi, plansQuerySchema, pricingCalculator, productBreadcrumbs, productCreateSchema, productUpdateSchema, productsApi, productsQuerySchema, profileApi, publicFetch, publicPlansApi, quickAuditLog, registerSchema, rentalSchema, reportBreadcrumbs, resizeImage, retry, sanitizeFieldValue, settingsApi, settingsBreadcrumbs, shouldApplyProration, shouldLogEntity, shouldLogField, shouldSample, shouldThrowPlanLimitError, sortProducts, sortSubscriptionsByStatus, storeAuthData, subscriptionBreadcrumbs, subscriptionCreateSchema, subscriptionNeedsAttention, subscriptionUpdateSchema, subscriptionsApi, subscriptionsQuerySchema, systemApi, throttle, timeout, truncateText, uploadImage, uploadImages, useFormattedChartPeriod, useFormattedDaily, useFormattedDate, useFormattedDateTime, useFormattedFullDate, useFormattedMonthOnly, userBreadcrumbs, userCreateSchema, userUpdateSchema, usersApi, usersQuerySchema, validateCustomer, validateForRenewal, validateImage, validateOrderNumberFormat, validatePlanLimits, validatePlatformAccess, validateProductPublicCheckAccess, validateSubscriptionAccess, withErrorHandlingForUI };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.mjs.map