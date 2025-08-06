export type Environment = 'local' | 'development' | 'production';

export interface ApiConfig {
  database: {
    url: string;
    type: 'sqlite' | 'postgresql';
  };
  auth: {
    jwtSecret: string;
    expiresIn: string;
  };
  cors: {
    origins: string[];
  };
  features: {
    emailVerification: boolean;
    analytics: boolean;
    rateLimiting: boolean;
  };
  urls: {
    client: string;
    admin: string;
    api: string;
    mobile?: string;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    rateLimitMax: number;
    rateLimitWindow: string;
  };
}

function getEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'local':
      return 'local';
    case 'development':
      return 'development';
    case 'production':
      return 'production';
    default:
      return 'local';
  }
}

function getConfig(): ApiConfig {
  const environment = getEnvironment();
  
  // Base configuration
  const baseConfig: Partial<ApiConfig> = {
    cors: {
      origins: []
    },
    features: {
      emailVerification: false,
      analytics: false,
      rateLimiting: false
    },
    logging: {
      level: 'info',
      format: 'json'
    },
    security: {
      rateLimitMax: 1000,
      rateLimitWindow: '15m'
    }
  };

  // Environment-specific configurations
  switch (environment) {
    case 'local':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
          type: 'sqlite'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'local-jwt-secret-key-change-this',
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
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
          client: process.env.CLIENT_URL || 'http://localhost:3000',
          admin: process.env.ADMIN_URL || 'http://localhost:3001',
          api: process.env.API_URL || 'http://localhost:3002',
          mobile: process.env.MOBILE_URL || 'http://localhost:3003'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'debug',
          format: process.env.LOG_FORMAT || 'pretty'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    case 'development':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/rentalshop_dev',
          type: 'postgresql'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-this',
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
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
          client: process.env.CLIENT_URL || 'https://dev.rentalshop.com',
          admin: process.env.ADMIN_URL || 'https://admin.dev.rentalshop.com',
          api: process.env.API_URL || 'https://api.dev.rentalshop.com',
          mobile: process.env.MOBILE_URL || 'https://mobile.dev.rentalshop.com'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: process.env.LOG_FORMAT || 'json'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '500'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    case 'production':
      return {
        ...baseConfig,
        database: {
          url: process.env.DATABASE_URL || 'postgresql://username:password@your-prod-host:5432/rentalshop_prod',
          type: 'postgresql'
        },
        auth: {
          jwtSecret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-here',
          expiresIn: process.env.JWT_EXPIRES_IN || '1d'
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
          client: process.env.CLIENT_URL || 'https://rentalshop.com',
          admin: process.env.ADMIN_URL || 'https://admin.rentalshop.com',
          api: process.env.API_URL || 'https://api.rentalshop.com',
          mobile: process.env.MOBILE_URL || 'https://mobile.rentalshop.com'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'warn',
          format: process.env.LOG_FORMAT || 'json'
        },
        security: {
          rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
          rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m'
        }
      };

    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

export const config = getConfig();
export const environment = getEnvironment();

// Helper functions
export const isLocal = () => environment === 'local';
export const isDevelopment = () => environment === 'development';
export const isProduction = () => environment === 'production';

export const getDatabaseUrl = () => config.database.url;
export const getJwtSecret = () => config.auth.jwtSecret;
export const getCorsOrigins = () => config.cors.origins;
export const getApiUrl = () => config.urls.api; 