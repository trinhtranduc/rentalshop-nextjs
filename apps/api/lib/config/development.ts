import { ApiConfig } from './index';

export const developmentConfig: ApiConfig = {
  database: {
    url: process.env.DATABASE_URL_DEV || 'postgresql://username:password@localhost:5432/rentalshop_dev',
    type: 'postgresql'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET_DEV || 'dev-jwt-secret-key-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN_DEV || '7d'
  },
  cors: {
    origins: [
      'https://dev.rentalshop.com',
      'https://admin.dev.rentalshop.com',
      'https://mobile.dev.rentalshop.com'
    ]
  },
  features: {
    emailVerification: true,
    analytics: true,
    rateLimiting: true
  },
  urls: {
    client: process.env.CLIENT_URL_DEV || 'https://dev.rentalshop.com',
    admin: process.env.ADMIN_URL_DEV || 'https://admin.dev.rentalshop.com',
    api: process.env.API_URL_DEV || 'https://api.dev.rentalshop.com',
    mobile: process.env.MOBILE_URL_DEV || 'https://mobile.dev.rentalshop.com'
  },
  logging: {
    level: process.env.LOG_LEVEL_DEV || 'info',
    format: process.env.LOG_FORMAT_DEV || 'json'
  },
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_DEV || '500'),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_DEV || '15m'
  }
}; 