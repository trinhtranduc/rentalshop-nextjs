import { ApiConfig } from './index';

export const localConfig: ApiConfig = {
  database: {
    url: process.env.DATABASE_URL_LOCAL || 'file:./dev.db',
    type: 'sqlite'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET_LOCAL || 'local-jwt-secret-key-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN_LOCAL || '7d'
  },
  cors: {
    origins: [
      'http://localhost:3000',  // Client App
      'http://localhost:3001',  // Admin App
      'http://localhost:3002',  // API Server
      'http://localhost:3003'   // Mobile App (Future)
    ]
  },
  features: {
    emailVerification: false,
    analytics: false,
    rateLimiting: false
  },
  urls: {
    client: process.env.CLIENT_URL_LOCAL || 'http://localhost:3000',
    admin: process.env.ADMIN_URL_LOCAL || 'http://localhost:3001',
    api: process.env.API_URL_LOCAL || 'http://localhost:3002',
    mobile: process.env.MOBILE_URL_LOCAL || 'http://localhost:3003'
  },
  logging: {
    level: process.env.LOG_LEVEL_LOCAL || 'debug',
    format: process.env.LOG_FORMAT_LOCAL || 'pretty'
  },
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_LOCAL || '1000'),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_LOCAL || '15m'
  }
}; 