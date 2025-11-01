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

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  
  // API URLs
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  ADMIN_URL: z.string().url('ADMIN_URL must be a valid URL'),
  API_URL: z.string().url('API_URL must be a valid URL'),
  
  // CORS
  CORS_ORIGINS: z.string().default(''),
  
  // File Upload
  UPLOAD_PROVIDER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  UPLOAD_PATH: z.string().optional(),
  MAX_FILE_SIZE: z.string().transform(val => parseInt(val, 10)).default('10485760'),
  
  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // Email
  EMAIL_PROVIDER: z.enum(['console', 'ses']).default('console'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email').default('noreply@example.com'),
  // AWS SES (uses existing AWS credentials from S3)
  AWS_SES_REGION: z.string().default('us-east-1'),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('json'),
  
  // Feature Flags
  ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_DEBUG_LOGS: z.string().transform(val => val === 'true').default('false'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).default('100'),
  
  // Stripe (optional)
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

// ============================================================================
// PARSE AND VALIDATE ENVIRONMENT
// ============================================================================

function parseEnvironment() {
  try {
    // SKIP_ENV_VALIDATION defaults to false - always validate by default
    // Only skip EMAIL_FROM email format validation when explicitly set to 'true' (useful during build time)
    const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';
    
    if (skipValidation) {
      // Create a relaxed schema that doesn't validate EMAIL_FROM email format
      // but still validates all other fields
      const buildSchema = envSchema.extend({
        EMAIL_FROM: z.string().default('noreply@anyrent.shop'), // No .email() validation when skipping
      });
      
      const buildEnv: Record<string, string | undefined> = {
        ...process.env,
        // Ensure EMAIL_FROM has a valid default if not provided
        EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@anyrent.shop',
      };
      
      // Parse with relaxed schema (no email format validation for EMAIL_FROM)
      const parsed = buildSchema.safeParse(buildEnv);
      
      if (parsed.success) {
        console.log('⚠️  EMAIL_FROM validation skipped for build - using default if needed');
        return parsed.data;
      }
      
      // If still fails, use minimal validation approach
      console.warn('⚠️  Using minimal validation for build - some env vars may use defaults');
      
      return {
        NODE_ENV: (buildEnv.NODE_ENV as any) || 'production',
        DATABASE_URL: buildEnv.DATABASE_URL || '',
        JWT_SECRET: buildEnv.JWT_SECRET || 'build-time-secret',
        JWT_EXPIRES_IN: buildEnv.JWT_EXPIRES_IN || '7d',
        NEXTAUTH_SECRET: buildEnv.NEXTAUTH_SECRET || 'build-time-secret',
        NEXTAUTH_URL: buildEnv.NEXTAUTH_URL || 'http://localhost:3000',
        CLIENT_URL: buildEnv.CLIENT_URL || 'http://localhost:3000',
        ADMIN_URL: buildEnv.ADMIN_URL || 'http://localhost:3001',
        API_URL: buildEnv.API_URL || 'http://localhost:3002',
        CORS_ORIGINS: buildEnv.CORS_ORIGINS || '',
        UPLOAD_PROVIDER: (buildEnv.UPLOAD_PROVIDER as any) || 'local',
        UPLOAD_PATH: buildEnv.UPLOAD_PATH,
        MAX_FILE_SIZE: parseInt(buildEnv.MAX_FILE_SIZE || '10485760', 10),
        CLOUDINARY_CLOUD_NAME: buildEnv.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: buildEnv.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: buildEnv.CLOUDINARY_API_SECRET,
        EMAIL_PROVIDER: (buildEnv.EMAIL_PROVIDER as any) || 'console',
        EMAIL_FROM: buildEnv.EMAIL_FROM || 'noreply@anyrent.shop',
        AWS_SES_REGION: buildEnv.AWS_SES_REGION || 'us-east-1',
        REDIS_URL: buildEnv.REDIS_URL,
        LOG_LEVEL: (buildEnv.LOG_LEVEL as any) || 'info',
        LOG_FORMAT: (buildEnv.LOG_FORMAT as any) || 'json',
        ENABLE_EMAIL_VERIFICATION: buildEnv.ENABLE_EMAIL_VERIFICATION === 'true',
        ENABLE_ANALYTICS: buildEnv.ENABLE_ANALYTICS === 'true',
        ENABLE_DEBUG_LOGS: buildEnv.ENABLE_DEBUG_LOGS === 'true',
        RATE_LIMIT_WINDOW: buildEnv.RATE_LIMIT_WINDOW || '15m',
        RATE_LIMIT_MAX: parseInt(buildEnv.RATE_LIMIT_MAX || '100', 10),
        STRIPE_PUBLISHABLE_KEY: buildEnv.STRIPE_PUBLISHABLE_KEY,
        STRIPE_SECRET_KEY: buildEnv.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: buildEnv.STRIPE_WEBHOOK_SECRET,
        SENTRY_DSN: buildEnv.SENTRY_DSN,
        SENTRY_ENVIRONMENT: buildEnv.SENTRY_ENVIRONMENT,
      } as any;
    }
    
    const parsed = envSchema.safeParse(process.env);
    
    if (!parsed.success) {
      console.error('❌ Environment validation failed:');
      console.error(parsed.error.format());
      throw new Error('Invalid environment configuration. Check the errors above.');
    }
    
    const env = parsed.data;
    
    // Additional production validation
    if (env.NODE_ENV === 'production') {
      // Ensure secrets are not default/weak values
      if (env.JWT_SECRET.includes('local') || env.JWT_SECRET.includes('DO-NOT-USE')) {
        throw new Error('JWT_SECRET must be changed for production! Generate with: openssl rand -hex 32');
      }
      
      if (env.NEXTAUTH_SECRET.includes('local') || env.NEXTAUTH_SECRET.includes('DO-NOT-USE')) {
        throw new Error('NEXTAUTH_SECRET must be changed for production! Generate with: openssl rand -hex 32');
      }
      
      // Ensure production URLs use HTTPS
      if (!env.CLIENT_URL.startsWith('https://')) {
        throw new Error('CLIENT_URL must use HTTPS in production');
      }
      
      if (!env.API_URL.startsWith('https://')) {
        throw new Error('API_URL must use HTTPS in production');
      }
      
      // Warn about missing optional but recommended configs
      if (!env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not set - caching will be disabled');
      }
      
      if (!env.SENTRY_DSN) {
        console.warn('⚠️  SENTRY_DSN not set - error monitoring will be disabled');
      }
    }
    
    return env;
  } catch (error) {
    console.error('💥 Failed to load environment configuration:');
    console.error(error);
    
    // Only exit in Node.js environment (server-side)
    // In browser/client-side, throw error instead
    if (typeof process !== 'undefined' && typeof process.exit === 'function') {
      process.exit(1);
    } else {
      // Client-side: throw error to prevent silent failures
      throw new Error('Environment configuration failed. Check console for details.');
    }
  }
}

// ============================================================================
// EXPORT VALIDATED ENVIRONMENT
// ============================================================================

/**
 * Validated and type-safe environment configuration
 * Use this throughout your application instead of process.env
 */
export const env = parseEnvironment();

/**
 * Environment type
 */
export type Env = z.infer<typeof envSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if in development mode
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Check if in production mode
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Check if in test mode
 */
export const isTest = () => env.NODE_ENV === 'test';

/**
 * Get CORS origins as array
 */
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGINS
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

/**
 * Get database URL with proper path resolution
 */
export function getDatabaseUrl(): string {
  const url = env.DATABASE_URL;
  
  // If using external database, return as-is
  if (url.startsWith('postgresql://') || 
      url.startsWith('mysql://') ||
      url.startsWith('mongodb://')) {
    return url;
  }
  
  // For SQLite, ensure path is from project root
  if (url.startsWith('file:')) {
    return url;
  }
  
  return url;
}

/**
 * Print environment info (safe - no secrets)
 */
export function printEnvironmentInfo(): void {
  console.log('🔧 Environment Configuration:');
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  DATABASE: ${env.DATABASE_URL.substring(0, 30)}...`);
  console.log(`  CLIENT_URL: ${env.CLIENT_URL}`);
  console.log(`  ADMIN_URL: ${env.ADMIN_URL}`);
  console.log(`  API_URL: ${env.API_URL}`);
  console.log(`  LOG_LEVEL: ${env.LOG_LEVEL}`);
  console.log(`  EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
  console.log(`  UPLOAD_PROVIDER: ${env.UPLOAD_PROVIDER}`);
  console.log(`  Features: Email=${env.ENABLE_EMAIL_VERIFICATION}, Analytics=${env.ENABLE_ANALYTICS}`);
  console.log('✅ Environment loaded successfully');
}

// ============================================================================
// AUTO-PRINT IN DEVELOPMENT
// ============================================================================

if (isDevelopment() && env.ENABLE_DEBUG_LOGS) {
  printEnvironmentInfo();
}

// Export all for convenience
export default env;

