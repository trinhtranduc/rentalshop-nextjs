"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default,
  env: () => env,
  getCorsOrigins: () => getCorsOrigins,
  getDatabaseUrl: () => getDatabaseUrl,
  isDevelopment: () => isDevelopment,
  isProduction: () => isProduction,
  isTest: () => isTest,
  printEnvironmentInfo: () => printEnvironmentInfo
});
module.exports = __toCommonJS(src_exports);
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  // Node Environment
  NODE_ENV: import_zod.z.enum(["development", "production", "test"]).default("development"),
  // Database
  DATABASE_URL: import_zod.z.string().min(1, "DATABASE_URL is required"),
  // JWT
  JWT_SECRET: import_zod.z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: import_zod.z.string().default("7d"),
  // NextAuth
  NEXTAUTH_SECRET: import_zod.z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: import_zod.z.string().url("NEXTAUTH_URL must be a valid URL"),
  // API URLs
  CLIENT_URL: import_zod.z.string().url("CLIENT_URL must be a valid URL"),
  ADMIN_URL: import_zod.z.string().url("ADMIN_URL must be a valid URL"),
  API_URL: import_zod.z.string().url("API_URL must be a valid URL"),
  // CORS
  CORS_ORIGINS: import_zod.z.string().default(""),
  // File Upload
  UPLOAD_PROVIDER: import_zod.z.enum(["local", "cloudinary", "s3"]).default("local"),
  UPLOAD_PATH: import_zod.z.string().optional(),
  MAX_FILE_SIZE: import_zod.z.string().transform((val) => parseInt(val, 10)).default("10485760"),
  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: import_zod.z.string().optional(),
  CLOUDINARY_API_KEY: import_zod.z.string().optional(),
  CLOUDINARY_API_SECRET: import_zod.z.string().optional(),
  // Email
  EMAIL_PROVIDER: import_zod.z.enum(["console", "resend", "sendgrid"]).default("console"),
  EMAIL_FROM: import_zod.z.string().email("EMAIL_FROM must be a valid email").default("noreply@localhost"),
  RESEND_API_KEY: import_zod.z.string().optional(),
  // Redis (optional)
  REDIS_URL: import_zod.z.string().optional(),
  // Logging
  LOG_LEVEL: import_zod.z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FORMAT: import_zod.z.enum(["pretty", "json"]).default("json"),
  // Feature Flags
  ENABLE_EMAIL_VERIFICATION: import_zod.z.string().transform((val) => val === "true").default("false"),
  ENABLE_ANALYTICS: import_zod.z.string().transform((val) => val === "true").default("false"),
  ENABLE_DEBUG_LOGS: import_zod.z.string().transform((val) => val === "true").default("false"),
  // Rate Limiting
  RATE_LIMIT_WINDOW: import_zod.z.string().default("15m"),
  RATE_LIMIT_MAX: import_zod.z.string().transform((val) => parseInt(val, 10)).default("100"),
  // Stripe (optional)
  STRIPE_PUBLISHABLE_KEY: import_zod.z.string().optional(),
  STRIPE_SECRET_KEY: import_zod.z.string().optional(),
  STRIPE_WEBHOOK_SECRET: import_zod.z.string().optional(),
  // Monitoring (optional)
  SENTRY_DSN: import_zod.z.string().optional(),
  SENTRY_ENVIRONMENT: import_zod.z.string().optional()
});
function parseEnvironment() {
  try {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("\u274C Environment validation failed:");
      console.error(parsed.error.format());
      throw new Error("Invalid environment configuration. Check the errors above.");
    }
    const env2 = parsed.data;
    if (env2.NODE_ENV === "production") {
      if (env2.JWT_SECRET.includes("local") || env2.JWT_SECRET.includes("DO-NOT-USE")) {
        throw new Error("JWT_SECRET must be changed for production! Generate with: openssl rand -hex 32");
      }
      if (env2.NEXTAUTH_SECRET.includes("local") || env2.NEXTAUTH_SECRET.includes("DO-NOT-USE")) {
        throw new Error("NEXTAUTH_SECRET must be changed for production! Generate with: openssl rand -hex 32");
      }
      if (!env2.CLIENT_URL.startsWith("https://")) {
        throw new Error("CLIENT_URL must use HTTPS in production");
      }
      if (!env2.API_URL.startsWith("https://")) {
        throw new Error("API_URL must use HTTPS in production");
      }
      if (!env2.REDIS_URL) {
        console.warn("\u26A0\uFE0F  REDIS_URL not set - caching will be disabled");
      }
      if (!env2.SENTRY_DSN) {
        console.warn("\u26A0\uFE0F  SENTRY_DSN not set - error monitoring will be disabled");
      }
    }
    return env2;
  } catch (error) {
    console.error("\u{1F4A5} Failed to load environment configuration:");
    console.error(error);
    process.exit(1);
  }
}
var env = parseEnvironment();
var isDevelopment = () => env.NODE_ENV === "development";
var isProduction = () => env.NODE_ENV === "production";
var isTest = () => env.NODE_ENV === "test";
function getCorsOrigins() {
  return env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
}
function getDatabaseUrl() {
  const url = env.DATABASE_URL;
  if (url.startsWith("postgresql://") || url.startsWith("mysql://") || url.startsWith("mongodb://")) {
    return url;
  }
  if (url.startsWith("file:")) {
    return url;
  }
  return url;
}
function printEnvironmentInfo() {
  console.log("\u{1F527} Environment Configuration:");
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  DATABASE: ${env.DATABASE_URL.substring(0, 30)}...`);
  console.log(`  CLIENT_URL: ${env.CLIENT_URL}`);
  console.log(`  ADMIN_URL: ${env.ADMIN_URL}`);
  console.log(`  API_URL: ${env.API_URL}`);
  console.log(`  LOG_LEVEL: ${env.LOG_LEVEL}`);
  console.log(`  EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
  console.log(`  UPLOAD_PROVIDER: ${env.UPLOAD_PROVIDER}`);
  console.log(`  Features: Email=${env.ENABLE_EMAIL_VERIFICATION}, Analytics=${env.ENABLE_ANALYTICS}`);
  console.log("\u2705 Environment loaded successfully");
}
if (isDevelopment() && env.ENABLE_DEBUG_LOGS) {
  printEnvironmentInfo();
}
var src_default = env;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  env,
  getCorsOrigins,
  getDatabaseUrl,
  isDevelopment,
  isProduction,
  isTest,
  printEnvironmentInfo
});
//# sourceMappingURL=index.js.map