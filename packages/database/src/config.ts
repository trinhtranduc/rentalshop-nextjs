/**
 * Database configuration for different environments
 */

export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
}

export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'local';
  
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
  return process.env.NODE_ENV === 'local' || !process.env.NODE_ENV;
}

export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
} 