import { localConfig } from './local';
import { developmentConfig } from './development';
import { productionConfig } from './production';

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
  
  switch (environment) {
    case 'local':
      return localConfig;
    case 'development':
      return developmentConfig;
    case 'production':
      return productionConfig;
    default:
      return localConfig;
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