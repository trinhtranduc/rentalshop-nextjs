import { z } from 'zod';

/**
 * ============================================================================
 * CENTRALIZED ENVIRONMENT CONFIGURATION
 * ============================================================================
 *
 * Type-safe environment variable management for the entire monorepo.
 * Single source of truth for all apps (client, admin, API).
 *
 * Usage:
 *   import { env } from '@rentalshop/env';
 *   const dbUrl = env.DATABASE_URL; // Type-safe!
 *
 * Best Practices:
 * - All environment variables are validated on import
 * - Type-safe access throughout the application
 * - Fails fast with clear error messages
 * - Production validation ensures security
 */

declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    DATABASE_URL: z.ZodString;
    JWT_SECRET: z.ZodString;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    NEXTAUTH_SECRET: z.ZodString;
    NEXTAUTH_URL: z.ZodString;
    CLIENT_URL: z.ZodString;
    ADMIN_URL: z.ZodString;
    API_URL: z.ZodString;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    UPLOAD_PROVIDER: z.ZodDefault<z.ZodEnum<["local", "cloudinary", "s3"]>>;
    UPLOAD_PATH: z.ZodOptional<z.ZodString>;
    MAX_FILE_SIZE: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    CLOUDINARY_CLOUD_NAME: z.ZodOptional<z.ZodString>;
    CLOUDINARY_API_KEY: z.ZodOptional<z.ZodString>;
    CLOUDINARY_API_SECRET: z.ZodOptional<z.ZodString>;
    EMAIL_PROVIDER: z.ZodDefault<z.ZodEnum<["console", "ses"]>>;
    EMAIL_FROM: z.ZodDefault<z.ZodString>;
    AWS_SES_REGION: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    LOG_FORMAT: z.ZodDefault<z.ZodEnum<["pretty", "json"]>>;
    ENABLE_EMAIL_VERIFICATION: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_ANALYTICS: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_DEBUG_LOGS: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    RATE_LIMIT_WINDOW: z.ZodDefault<z.ZodString>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    STRIPE_PUBLISHABLE_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_SECRET_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    SENTRY_DSN: z.ZodOptional<z.ZodString>;
    SENTRY_ENVIRONMENT: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    CLIENT_URL: string;
    ADMIN_URL: string;
    API_URL: string;
    CORS_ORIGINS: string;
    UPLOAD_PROVIDER: "local" | "cloudinary" | "s3";
    MAX_FILE_SIZE: number;
    EMAIL_PROVIDER: "console" | "ses";
    EMAIL_FROM: string;
    AWS_SES_REGION: string;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    LOG_FORMAT: "pretty" | "json";
    ENABLE_EMAIL_VERIFICATION: boolean;
    ENABLE_ANALYTICS: boolean;
    ENABLE_DEBUG_LOGS: boolean;
    RATE_LIMIT_WINDOW: string;
    RATE_LIMIT_MAX: number;
    UPLOAD_PATH?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    REDIS_URL?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    SENTRY_DSN?: string | undefined;
    SENTRY_ENVIRONMENT?: string | undefined;
}, {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    CLIENT_URL: string;
    ADMIN_URL: string;
    API_URL: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    JWT_EXPIRES_IN?: string | undefined;
    CORS_ORIGINS?: string | undefined;
    UPLOAD_PROVIDER?: "local" | "cloudinary" | "s3" | undefined;
    UPLOAD_PATH?: string | undefined;
    MAX_FILE_SIZE?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    EMAIL_PROVIDER?: "console" | "ses" | undefined;
    EMAIL_FROM?: string | undefined;
    AWS_SES_REGION?: string | undefined;
    REDIS_URL?: string | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    LOG_FORMAT?: "pretty" | "json" | undefined;
    ENABLE_EMAIL_VERIFICATION?: string | undefined;
    ENABLE_ANALYTICS?: string | undefined;
    ENABLE_DEBUG_LOGS?: string | undefined;
    RATE_LIMIT_WINDOW?: string | undefined;
    RATE_LIMIT_MAX?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    SENTRY_DSN?: string | undefined;
    SENTRY_ENVIRONMENT?: string | undefined;
}>;
/**
 * Validated and type-safe environment configuration
 * Use this throughout your application instead of process.env
 */
declare const env: {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    CLIENT_URL: string;
    ADMIN_URL: string;
    API_URL: string;
    CORS_ORIGINS: string;
    UPLOAD_PROVIDER: "local" | "cloudinary" | "s3";
    MAX_FILE_SIZE: number;
    EMAIL_PROVIDER: "console" | "ses";
    EMAIL_FROM: string;
    AWS_SES_REGION: string;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    LOG_FORMAT: "pretty" | "json";
    ENABLE_EMAIL_VERIFICATION: boolean;
    ENABLE_ANALYTICS: boolean;
    ENABLE_DEBUG_LOGS: boolean;
    RATE_LIMIT_WINDOW: string;
    RATE_LIMIT_MAX: number;
    UPLOAD_PATH?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
    REDIS_URL?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    SENTRY_DSN?: string | undefined;
    SENTRY_ENVIRONMENT?: string | undefined;
};
/**
 * Environment type
 */
type Env = z.infer<typeof envSchema>;
/**
 * Check if in development mode
 */
declare const isDevelopment: () => boolean;
/**
 * Check if in production mode
 */
declare const isProduction: () => boolean;
/**
 * Check if in test mode
 */
declare const isTest: () => boolean;
/**
 * Get CORS origins as array
 */
declare function getCorsOrigins(): string[];
/**
 * Get database URL with proper path resolution
 */
declare function getDatabaseUrl(): string;
/**
 * Print environment info (safe - no secrets)
 */
declare function printEnvironmentInfo(): void;

export { type Env, env as default, env, getCorsOrigins, getDatabaseUrl, isDevelopment, isProduction, isTest, printEnvironmentInfo };
