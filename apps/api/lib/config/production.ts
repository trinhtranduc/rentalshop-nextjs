import { ApiConfig } from './index';

export const productionConfig: ApiConfig = {
  database: {
    url: process.env.DATABASE_URL_PROD || 'postgresql://username:password@your-prod-host:5432/rentalshop_prod',
    type: 'postgresql'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET_PROD || 'your-super-secure-jwt-secret-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN_PROD || '1d'
  },
  cors: {
    origins: [
      'https://rentalshop.com',
      'https://admin.rentalshop.com',
      'https://mobile.rentalshop.com'
    ]
  },
  features: {
    emailVerification: true,
    analytics: true,
    rateLimiting: true
  },
  urls: {
    client: process.env.CLIENT_URL_PROD || 'https://rentalshop.com',
    admin: process.env.ADMIN_URL_PROD || 'https://admin.rentalshop.com',
    api: process.env.API_URL_PROD || 'https://api.rentalshop.com',
    mobile: process.env.MOBILE_URL_PROD || 'https://mobile.rentalshop.com'
  },
  logging: {
    level: process.env.LOG_LEVEL_PROD || 'warn',
    format: process.env.LOG_FORMAT_PROD || 'json'
  },
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_PROD || '100'),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_PROD || '15m'
  }
}; 