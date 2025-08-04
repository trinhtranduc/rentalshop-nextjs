import { z } from 'zod';

// Environment type
type Environment = 'local' | 'development' | 'production';

// Get current environment
const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'development') return 'development';
  return 'local';
};

// Configuration schema
const configSchema = z.object({
  // Database
  database: z.object({
    url: z.string(),
  }),
  
  // JWT
  jwt: z.object({
    secret: z.string(),
    expiresIn: z.string(),
  }),
  
  // NextAuth
  nextAuth: z.object({
    secret: z.string(),
    url: z.string(),
  }),
  
  // URLs
  urls: z.object({
    client: z.string(),
    admin: z.string(),
    api: z.string(),
  }),
  
  // File Upload
  upload: z.object({
    provider: z.enum(['local', 'cloudinary']),
    path: z.string().optional(),
    cloudinary: z.object({
      cloudName: z.string().optional(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
    }).optional(),
  }),
  
  // Email
  email: z.object({
    provider: z.enum(['console', 'resend']),
    from: z.string(),
    resendApiKey: z.string().optional(),
  }),
  
  // Redis
  redis: z.object({
    url: z.string().optional(),
  }),
  
  // Logging
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    format: z.enum(['pretty', 'json']),
  }),
  
  // Security
  security: z.object({
    corsOrigin: z.string(),
  }),
  
  // Features
  features: z.object({
    emailVerification: z.boolean(),
    analytics: z.boolean(),
  }),
  
  // Rate Limiting
  rateLimit: z.object({
    window: z.string(),
    max: z.number(),
  }),
});

// Load configuration based on environment
const loadConfig = () => {
  const env = getEnvironment();
  const envSuffix = env.toUpperCase();
  
  const config = {
    database: {
      url: process.env[`DATABASE_URL_${envSuffix}`] || process.env.DATABASE_URL || '',
    },
    
    jwt: {
      secret: process.env[`JWT_SECRET_${envSuffix}`] || process.env.JWT_SECRET || '',
      expiresIn: process.env[`JWT_EXPIRES_IN_${envSuffix}`] || '7d',
    },
    
    nextAuth: {
      secret: process.env[`NEXTAUTH_SECRET_${envSuffix}`] || process.env.NEXTAUTH_SECRET || '',
      url: process.env[`NEXTAUTH_URL_${envSuffix}`] || process.env.NEXTAUTH_URL || '',
    },
    
    urls: {
      client: process.env[`CLIENT_URL_${envSuffix}`] || process.env.CLIENT_URL || '',
      admin: process.env[`ADMIN_URL_${envSuffix}`] || process.env.ADMIN_URL || '',
      api: process.env[`API_URL_${envSuffix}`] || process.env.API_URL || '',
    },
    
    upload: {
      provider: (process.env[`UPLOAD_PROVIDER_${envSuffix}`] || 'local') as 'local' | 'cloudinary',
      path: process.env[`UPLOAD_PATH_${envSuffix}`],
      cloudinary: {
        cloudName: process.env[`CLOUDINARY_CLOUD_NAME_${envSuffix}`],
        apiKey: process.env[`CLOUDINARY_API_KEY_${envSuffix}`],
        apiSecret: process.env[`CLOUDINARY_API_SECRET_${envSuffix}`],
      },
    },
    
    email: {
      provider: (process.env[`EMAIL_PROVIDER_${envSuffix}`] || 'console') as 'console' | 'resend',
      from: process.env[`EMAIL_FROM_${envSuffix}`] || 'noreply@localhost',
      resendApiKey: process.env[`RESEND_API_KEY_${envSuffix}`],
    },
    
    redis: {
      url: process.env[`REDIS_URL_${envSuffix}`],
    },
    
    logging: {
      level: (process.env[`LOG_LEVEL_${envSuffix}`] || 'info') as 'debug' | 'info' | 'warn' | 'error',
      format: (process.env[`LOG_FORMAT_${envSuffix}`] || 'pretty') as 'pretty' | 'json',
    },
    
    security: {
      corsOrigin: process.env[`CORS_ORIGIN_${envSuffix}`] || '*',
    },
    
    features: {
      emailVerification: process.env[`ENABLE_EMAIL_VERIFICATION_${envSuffix}`] === 'true',
      analytics: process.env[`ENABLE_ANALYTICS_${envSuffix}`] === 'true',
    },
    
    rateLimit: {
      window: process.env[`RATE_LIMIT_WINDOW_${envSuffix}`] || '15m',
      max: parseInt(process.env[`RATE_LIMIT_MAX_${envSuffix}`] || '100', 10),
    },
  };
  
  return configSchema.parse(config);
};

// Export configuration
export const config = loadConfig();

// Export environment helper
export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';
export const isLocal = () => getEnvironment() === 'local';

// Export environment type
export type Config = z.infer<typeof configSchema>; 