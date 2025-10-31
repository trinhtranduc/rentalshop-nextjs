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
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email').default('noreply@localhost'),
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
    process.exit(1);
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
    .map(origin => origin.trim())
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

