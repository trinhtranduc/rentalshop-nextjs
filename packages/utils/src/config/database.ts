// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

import { Environment } from './environment';

export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
}

export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = (process.env.NODE_ENV || 'local') as 'local' | 'development' | 'production' | 'test';
  
  switch (nodeEnv) {
    case 'local':
      return {
        url: process.env.DATABASE_URL_LOCAL || 'file:./dev.db',
        provider: 'sqlite'
      };
    
    case 'development':
      return {
        url: process.env.DATABASE_URL || '',
        provider: 'postgresql'
      };
    
    case 'production':
      return {
        url: process.env.DATABASE_URL || '',
        provider: 'postgresql'
      };
    
    default:
      return {
        url: process.env.DATABASE_URL_LOCAL || 'file:./dev.db',
        provider: 'sqlite'
      };
  }
}

export function isLocalEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  return !nodeEnv || nodeEnv === 'development';
}

export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Export the config instance
export const databaseConfig = getDatabaseConfig();
